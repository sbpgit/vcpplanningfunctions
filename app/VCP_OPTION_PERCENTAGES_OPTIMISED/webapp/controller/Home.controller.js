
sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/Token",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/BusyIndicator",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "../model/formatter"
    ],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        Controller,
        JSONModel,
        Token,
        Filter,
        FilterOperator,
        BusyIndicator,
        MessageToast,
        MessageBox,
        formatter

    ) {
        "use strict";



        var that, HandsontableKey;
        return Controller.extend("vcp.vcpoptionpercentagesoptimised.controller.Home", {
            formatter: formatter,
            onInit: function () {
                that = this;
                this._bGraphMinimized = false;
                this._bTableMinimized = false;

                var jQueryScript = document.createElement('script');

                jQueryScript.setAttribute('src', 'https://d3js.org/d3.v7.min.js');
                document.head.appendChild(jQueryScript);



                that.viewDetails = new JSONModel();
                that.viewDetails.setSizeLimit(5000);
                that.variantModel = new JSONModel();
                that.variantModel.setSizeLimit(5000);
                that.oCore = sap.ui.getCore();
                that.loadFragments();
                const oDateRange = this.byId("idWeekDateOPMIXP");
                if (oDateRange) {
                    // Create today's date
                    var oToday = new Date();

                    // Create date for two years from today
                    var oTwoYearsLater = new Date();
                    oTwoYearsLater.setFullYear(oToday.getFullYear() + 2);

                    // Set the default date range
                    oDateRange.setDateValue(oToday);
                    oDateRange.setSecondDateValue(oTwoYearsLater);
                    oDateRange.setEnabled(false);
                }
                // variantManagement.setShowShare(true);
                // that.oGModel.setProperty("/defaultModel", "Active");


                that.sUser = that.getUserDetails(); 
                that.oTree = that.getView().byId("idTreeOPMIXP");
                that.oModel = that.getOwnerComponent().getModel("oModel");
                that.aModel = that.getOwnerComponent().getModel("aModel");
                that.oGModel = that.getOwnerComponent().getModel("oGModel");

                that.fieldLabels = [
                    "Location",
                    "Product",
                    "Customer Group",
                    "Characteristic",
                    "Characteristic Value",
                ];

                that.staticColumns = [
                    "Location",
                    "Product",
                    "Customer Group",
                    "Characteristic",
                    "Characteristic Value",
                    "Key Figure",
                ];
                // if (!this.valueHelpSimualtionDialog) {
                //     this.valueHelpSimualtionDialog = sap.ui.xmlfragment(
                //         "vcp.vcpoptionpercentagesoptimised.view.Simulation",
                //         this
                //     );
                //     this.getView().addDependent(this.valueHelpSimualtionDialog);
                // }
                // that.staticRows = [
                //     { data: "LOCATION", readOnly: false, wordWrap: true },
                //     { data: "PRODUCT", readOnly: false, wordWrap: true },
                //     { data: "CUSTOMER_GROUP", readOnly: false, wordWrap: true },
                //     { data: "CHAR", readOnly: false, wordWrap: true },
                //     { data: "CHARVAL", readOnly: false, wordWrap: true },
                //     { data: "KEY_FIG_DESC", readOnly: false, wordWrap: true },
                // ];


                that.oGModel.setProperty("/subDataChanges", []);
                that.oGModel.setProperty("/hasCustomerGroup", false);

                that.loadHotKey();


            },


            // Dag Controller Code starts

            onCloseSimulation: function () {
                that.isColumnSelected = false;
                var nTableModel = new JSONModel();
                nTableModel.setData({
                    results: []
                })
                that.byId("classListCHACON").setModel(nTableModel)
                that.finalArray = [];
                that.oCustomerSim = [];
                // that.oGModel.setProperty("/oConfigPrd", "");
                that.oGModel.setProperty("/aColDate", "");
                // that.oGModel.setProperty("/selectedCustomerGroup", "");

                that.valueHelpSimulationDialog.close();
                // that.byId("idSimualteOPMIX").setEnabled(false);
            },



            oCreation: function () {

                var that = this;
                var oRef_Prd = that.oGModel.getProperty("/oConfigPrd");

                var oDgModel = this.getOwnerComponent().getModel("oDgModel");

                var payload = {
                    productId: oRef_Prd,
                    regionId: "ALL",
                    planMode: "PROBABILISTIC"
                };

                sap.ui.core.BusyIndicator.show();

                oDgModel.create("/createSession", payload, {

                    success: function (oData) {

                        sap.ui.core.BusyIndicator.hide();

                        console.log("Success:", oData);

                        // that.oGModel.setProperty("/sessionData", oData);

                        that.oGModel.setProperty("/sessionData", oData);

                        that.oGModel.setProperty(
                            "/sessionId",
                            oData.createSession.sessionId
                        );

                        sap.m.MessageToast.show("Session Created Successfully");



                    },

                    error: function (oError) {

                        sap.ui.core.BusyIndicator.hide();

                        console.log(oError);

                        sap.m.MessageToast.show("Error While Creating Session");

                    }

                });

            },

            onReset: function () {
                that._buildProbInputs();
                // that.onMinTable();
                var nTableModel = new JSONModel();
                nTableModel.setData({
                    results: []
                })
                var oTable = that.byId("classListCHACON");
                oTable.setModel(nTableModel);
            },

            onSimulateConfirm: function () {
                // var selected = that.hot.getSelectedLast();

                // if (selected) {

                //     var colStart = selected[1];
                //     var colEnd = selected[3];

                //     if (Math.abs(colEnd - colStart) > 0) {
                //         MessageToast.show("Please select a single column for simulation.");
                //         return;
                //     }
                // }

                var selected = that.lastSelection;

                if (!selected) {
                    MessageToast.show("Please select a column.");
                    return;
                }

                var colStart = selected[1];
                var colEnd = selected[3];

                if (colStart !== colEnd) {
                    MessageBox.show("Please select a single column for simulation.", MessageBox.Icon.WARNING, "Warning");
                    return;
                }
                var oCustFragItems = that.removeDuplicates(that.allData, ["CUSTOMER_GROUP"]);
                oCustFragItems = oCustFragItems.filter(e => e.CUSTOMER_GROUP !== null && e.CUSTOMER_GROUP !== undefined);
                var sCustDist = oCustFragItems.filter((obj, index, self) =>
                    index === self.findIndex((t) => t.CUSTOMER_GROUP === obj.CUSTOMER_GROUP));
                // if(sCustDist){
                if (sCustDist.length > 1) {
                    var aCstGrpMsg = new JSONModel()
                    aCstGrpMsg.setData({
                        items: sCustDist
                    })
                    sap.ui.getCore().byId("idMsgForCustGrpDialogOPMIXP").setModel(aCstGrpMsg);
                    that.oCustomerDialogForMsg.open();
                } else {
                    that.oGModel.setProperty("/selectedCustomerGroup", sCustDist[0].CUSTOMER_GROUP);
                    that.oCustomerSim = [];
                    that.onSimulate();

                }
                // }
            },

            onConfirmToSimulate: function (oEvent) {

                var oEv = sap.ui.getCore().byId("custList").getSelectedItem();
                if (oEv) {
                    that.oCustomerSim = oEv.getBindingContext().getObject().CUSTOMER_GROUP;
                    that.oGModel.setProperty("/selectedCustomerGroup", that.oCustomerSim);
                    that.oCustomerDialogForMsg.close();
                    that.onSimulate();
                }

            },

            onCloseDialog: function () {
                that.oCustomerDialogForMsg.close();
            },


            onSimulate: async function () {

                var that = this;

                if (!that.isColumnSelected) {
                    MessageToast.show("Please Select a column");
                    return;
                }

                // Create fragment only once
                if (!that.valueHelpSimulationDialog) {

                    that.valueHelpSimulationDialog = await sap.ui.core.Fragment.load({
                        id: that.getView().getId(),
                        name: "vcp.vcpoptionpercentagesoptimised.view.Simulation",
                        controller: that
                    });

                    that.getView().addDependent(that.valueHelpSimulationDialog);
                }

                // Remove previous handler
                if (that._afterOpenHandler) {
                    that.valueHelpSimulationDialog.detachAfterOpen(that._afterOpenHandler);
                }

                // Create new handler
                that._afterOpenHandler = function () {

                    that.oVBox = sap.ui.core.Fragment.byId(
                        that.getView().getId(),
                        "chartVBox"
                    );

                    if (!that.oVBox) {
                        console.error("chartVBox not found");
                        return;
                    }

                    that.oVBox.destroyItems();

                    const oHtml = new sap.ui.core.HTML({
                        content:
                            "<div id='graph_div' style='width:100%; min-height:600px; margin-bottom:8px;'></div>"
                    });

                    that.oVBox.addItem(oHtml);

                    setTimeout(function () {
                        that.getDerivedNodes();
                    }, 100);
                };

                // Attach event
                that.valueHelpSimulationDialog.attachAfterOpen(that._afterOpenHandler);

                // Open dialog
                that.valueHelpSimulationDialog.open();

                // Product Demand
                var oClickedweek = that.oGModel.getProperty("/aColDate");
                var oProddmnd = that.oGModel.getProperty("/AboveTable");

                var oMatch = oProddmnd?.[0] || {};
                var sWeekValue = oMatch[oClickedweek] || 0;

                that.oGModel.setProperty(
                    "/SelectedWeekValue",
                    "Product Demand : " + sWeekValue
                );

            },

            _buildProbInputs: function (sProduct) {
                var aChars = that.oRslts;

                var oWeek_Data = that.oGModel.getProperty("/aWeekData");
                // var customerGroups = [...new Set(oWeek_Data.map(o => o.CUSTOMER_GROUP))];
                // var oModel = new sap.ui.model.json.JSONModel({
                //     customerGroups: customerGroups.map(g => ({
                //         key: g,
                //         text: g
                //     }))
                // });

                // that.getView().setModel(oModel);
                var LevelZero = that.derivedNodes.filter(e => e.LEVEL == 0);
                // oWeek_Data = oWeek_Data.filter(p =>
                //     LevelZero.some(t =>
                //         t.CHAR_VALUE == p.CHAR_VALUE &&
                //         t.CHAR_NAME == p.CHARACTERISTIC
                //     )
                // );

                LevelZero = that.removeDuplicates(LevelZero, ["CHAR_NAME"]);
                aChars = aChars.filter(p =>
                    LevelZero.some(t =>

                        t.CHAR_NAME == p.key
                    )
                );


                var oProbInputs = this._convertToProbInput(oWeek_Data);
                that._oProbInputs = oProbInputs;
                if (that.oCustomerSim.length > 1) {
                    oProbInputs = that._oProbInputs.filter(p => p.CUSTOMER_GROUP === that.oCustomerSim)
                }
                var sProd = that.oGModel.getProperty("/oConfigPrd");
                var oWdate = that.oGModel.getProperty("/aColDate");
                var sCustSim = that.oGModel.getProperty("/selectedCustomerGroup");
                that.byId("idSimulationProd").setTitle(
                    "Product : " + sProd +
                    "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0" +
                    oWdate +
                    "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0" +
                    "Customer Group : " + sCustSim
                );
                // that.byId("idSimulationProd").setTitle("Product : " + sProd + "            " +    oWdate       + "            " + "Customer Group : " + sCustSim); 
                //  oState.setProperty("/probInputs", oProbInputs);
                var bValid = this._validateProbInputs(oProbInputs);

                var oBtn = sap.ui.core.Fragment.byId(this.getView().getId(), "oGraphOPMIXP");

                // if (oBtn) {
                //     oBtn.setEnabled(bValid);
                // }


                // ── NEW: Populate probList control ───────────────────
                var oProbList = this.byId("probList");
                oProbList.removeAllItems();
                // PRODUCT DEMAND VALUE
                var sDemandText = that.oGModel.getProperty("/SelectedWeekValue") || "";

                // REMOVE TEXT AND GET NUMBER
                var nProductDemand = parseFloat(
                    sDemandText.toString().replace("Product Demand : ", "")
                ) || 0;

                var aCharOrder = that.derivedNodes
                    .filter(function (x) {
                        return x.LEVEL == 0;
                    })
                    .map(function (x) {
                        return x.CHAR_NAME;
                    });

                aChars.sort(function (a, b) {
                    return aCharOrder.indexOf(a.key) -
                        aCharOrder.indexOf(b.key);
                });

                var aCharOrder = that.derivedNodes
                    .filter(function (x) {
                        return x.LEVEL == 0;
                    })
                    .map(function (x) {
                        return x.CHAR_NAME;
                    });

                aChars.sort(function (a, b) {
                    return aCharOrder.indexOf(a.key) -
                        aCharOrder.indexOf(b.key);
                });

                aChars.forEach(function (oChar) {

                    oProbList.addItem(new sap.m.GroupHeaderListItem({
                        title: oChar.label,
                        upperCase: false
                    }));

                    var aValueOrder = that.derivedNodes
                        .filter(function (x) {
                            return x.CHAR_NAME === oChar.key;
                        })
                        .map(function (x) {
                            return x.CHAR_VALUE;
                        });

                    oChar.values.sort(function (a, b) {

                        return aValueOrder.indexOf(a.CHAR_VALUE) -
                            aValueOrder.indexOf(b.CHAR_VALUE);

                    });

                    oChar.values.forEach(function (oValObj) {

                        // NEW OBJECT STRUCTURE
                        var sVal = oValObj.CHAR_VALUE;
                        var sPercent = oValObj.VALUE;

                        // FIND matching record
                        var oMatch = oProbInputs.find(function (item) {
                            return item.CHARACTERISTIC === oChar.key &&
                                item.CHAR_VALUE === sVal;
                        });

                        // VALUE
                        var nVal = oMatch
                            ? parseFloat(oMatch.VALUE)
                            : parseFloat(sPercent) || 0;

                        // INITIAL QTY
                        var nQty = ((nVal * nProductDemand) / 100).toFixed(2);
                        // nVal = Math.round(nVal);

                        var oInput = new sap.m.Input({
                            value: nVal,
                            width: "7rem",
                            type: "Number",
                            description: "%", // optional nice UI

                            liveChange: function (oEvent) {

                                var nNew = parseFloat(oEvent.getParameter("value")) || 0;

                                //  0–100 validation
                                if (nNew > 100) nNew = 100;
                                if (nNew < 0) nNew = 0;

                                // nNew = Math.round(nNew);

                                //  UPDATE ARRAY (no *100)
                                if (oMatch) {
                                    oMatch.VALUE = nNew;
                                    that.onLocS(oMatch)
                                }

                                oSlider.setValue(nNew);
                                oInput.setValue(nNew);

                                // UPDATE QTY
                                var nQty = ((nNew * nProductDemand) / 100).toFixed(2);
                                oQtyText.setText(nQty);



                                var bValid = that._validateProbInputs(oProbInputs);

                                var oBtn = sap.ui.core.Fragment.byId(that.getView().getId(), "oGraphOPMIXP");
                                // if (oBtn) {
                                //     oBtn.setEnabled(bValid);
                                // }
                                // if (oBtn) oBtn.setEnabled(bValid);
                            }
                        });
                        var oQtyText = new sap.m.Text({
                            text: nQty,
                            width: "4rem",
                            textAlign: "End"
                        }).addStyleClass("sapUiTinyMarginBegin");

                        var oSlider = new sap.m.Slider({
                            value: nVal,
                            min: 0,
                            max: 100,   // changed
                            step: 0.01,    // changed
                            width: "100%",


                            liveChange: function (oEvent) {

                                var nNew = parseFloat(oEvent.getParameter("value")) || 0;

                                // 0–100 validation
                                if (nNew > 100) nNew = 100;
                                if (nNew < 0) nNew = 0;

                                // UPDATE ARRAY
                                if (oMatch) {
                                    // oMatch.VALUE = nNew;
                                    oMatch.VALUE = parseFloat(nNew);
                                    that.onLocS(oMatch);
                                }

                                // UPDATE INPUT + SLIDER
                                oSlider.setValue(nNew);
                                oInput.setValue(nNew);

                                // UPDATE QTY
                                var nQty = ((nNew * nProductDemand) / 100).toFixed(2);
                                oQtyText.setText(nQty);

                                var bValid = that._validateProbInputs(oProbInputs);

                                var oBtn = sap.ui.core.Fragment.byId(
                                    that.getView().getId(),
                                    "oGraphOPMIXP"
                                );

                                // if (oBtn) {
                                //     oBtn.setEnabled(bValid);
                                // }

                                // if (oBtn) oBtn.setEnabled(bValid);
                            }
                        });

                        var oHBox = new sap.m.HBox({
                            alignItems: "Center",

                            items: [
                                new sap.m.Label({
                                    text: sVal.replace(/_/g, " "),
                                    width: "6rem"
                                }),

                                oSlider,

                                oInput,

                                oQtyText
                            ]
                        });

                        oProbList.addItem(new sap.m.CustomListItem({
                            content: [oHBox]
                        }));

                    });
                });
            },

            _validateProbInputs: function (oProbInputs) {

                var bValid = true;

                var oGrouped = {};

                oProbInputs.forEach(function (item) {

                    var key = item.CHARACTERISTIC;

                    if (!oGrouped[key]) {
                        oGrouped[key] = [];
                    }

                    oGrouped[key].push(parseFloat(item.VALUE) || 0);
                });

                Object.keys(oGrouped).forEach(function (groupKey) {

                    var values = oGrouped[groupKey];

                    var total = values.reduce(function (sum, val) {
                        return sum + val;
                    }, 0);

                    total = parseFloat(total.toFixed(2));

                    console.log(groupKey, total);

                    var isValid = total === 100;

                    if (!isValid) {
                        bValid = false;
                    }

                });

                return bValid;
            },


            _convertToProbInput: function (oData) {

                var oMap = {};

                // Group by CHARACTERISTIC + CUSTOMER_GROUP + CHAR_VALUE
                oData.forEach(function (item) {

                    // ONLY take Option Percentage %
                    if (item.KEY_FIGURE !== "Option Percentage") {
                        return;
                    }

                    var uniqueKey =
                        item.CHARACTERISTIC +
                        "|" +
                        item.CUSTOMER_GROUP +
                        "|" +
                        item.CHAR_VALUE;

                    if (!oMap[uniqueKey]) {

                        oMap[uniqueKey] = {
                            CHARACTERISTIC: item.CHARACTERISTIC,
                            CUSTOMER_GROUP: item.CUSTOMER_GROUP,
                            CHAR_VALUE: item.CHAR_VALUE,
                            VALUE: parseFloat(item.VALUE) || 0,
                            CHAR_NUM: item.CHAR_NUM
                        };
                    }

                });

                // Convert object -> array
                var aResult = Object.values(oMap);

                console.log("Converted Prob Input:", aResult);

                return aResult;
            },

            onMaxGraph: function () {

                var panes = this.byId("graphTableSplitter").getContentAreas();

                if (that.bGraphPriority) {

                    panes[0].getLayoutData().setSize("10%");
                    panes[1].getLayoutData().setSize("90%");

                } else {

                    panes[0].getLayoutData().setSize("90%");
                    panes[1].getLayoutData().setSize("10%");
                }

                that.bGraphPriority = !that.bGraphPriority;
            },

            onMaxTable: function () {

                var panes = this.byId("graphTableSplitter").getContentAreas();

                if (that.bGraphPriority) {

                    panes[0].getLayoutData().setSize("10%");
                    panes[1].getLayoutData().setSize("90%");

                } else {

                    panes[0].getLayoutData().setSize("90%");
                    panes[1].getLayoutData().setSize("10%");
                }

                that.bGraphPriority = !that.bGraphPriority;
            },

            setGraphDefault: function () {

                var panes = this.byId("graphTableSplitter").getContentAreas();

                panes[0].getLayoutData().setSize("90%");
                panes[1].getLayoutData().setSize("10%");

                that.bGraphPriority = true;
            },

            _colorGroupHeaders: function () {
                var oTable = this.byId("classListCHACON");
                if (!oTable) { return; }
                var aHdr = ["levelHeader0", "levelHeader1", "levelHeader2", "levelHeader3", "levelHeader4", "levelHeader5"];
                var aRow = ["levelRow0", "levelRow1", "levelRow2", "levelRow3", "levelRow4", "levelRow5"];
                var nCurrent = 0;
                oTable.getItems().forEach(function (oItem) {
                    aHdr.concat(aRow).forEach(function (c) { oItem.removeStyleClass(c); });
                    if (oItem.isA("sap.m.GroupHeaderListItem")) {
                        nCurrent = parseInt((oItem.getTitle() || "").replace(/.*?(\d+).*/, "$1")) || 0;
                        oItem.addStyleClass(aHdr[nCurrent % aHdr.length]);
                    } else {
                        oItem.addStyleClass(aRow[nCurrent % aRow.length]);
                    }
                });
            },

            getDerivedNodes: function () {
                var selProd = that.oGModel.getProperty("/oConfigPrd");
                that.getOwnerComponent().getModel("oModel").read("/getDerivedNodes", {
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        selProd
                    )
                    ],
                    success: function (oData) {
                        that.derivedNodes = oData.results;

                        that._buildProbInputs();
                        that.getGraphData();
                        that.bGraphPriority = false;
                        that.onMaxGraph();
                        // that.onMinTable();
                    },
                    error: function (error) { }
                })
            },

            onOpenGraphFullscreen: function () {
                var L0 = that.oGModel.getProperty("/L0data");
                var lMap = that.oGModel.getProperty("/levMap");
                // var oVBox = that.byId("chartVBox");
                var oDialogContainer = sap.ui.getCore().byId("fullScreenGraphContainer");

                // 1. Store the parent AND the name of the aggregation (usually "items" or "content")
                that._graphParent = that.oVBox.getParent();
                that._graphParentAggregation = that.oVBox.sParentAggregationName;

                // 2. Move to Dialog
                oDialogContainer.addItem(that.oVBox);

                that._oGraphDialog.open();
                setTimeout(function () {
                    that.drawGraph(L0, lMap, that._probMap);
                }.bind(this), 300);

                // 3. Optional: D3 needs a nudge to realize the container size changed
                // this.drawGraph(this.lastL0Nodes, this.lastLevelMap);
            },

            onCloseGraphFullscreen: function () {
                // var oVBox = that.byId("chartVBox");
                var oParent = that._graphParent;
                var sAggregation = that._graphParentAggregation;

                // if (oParent && sAggregation) {
                //     // 4. Use addAggregation to put it back exactly where it came from
                //     oParent.addAggregation(sAggregation, oVBox);
                // }

                if (oParent && sAggregation) {
                    // 4. Use addAggregation to put it back exactly where it came from
                    oParent.addAggregation(sAggregation, that.oVBox, 0);
                    const graphDivs = document.querySelectorAll('#graph_div');

                    graphDivs.forEach((el, i) => {
                        if (i === graphDivs.length - 1) {
                            el.style.display = 'block';
                        } else {
                            el.style.display = 'none';
                        }
                    });
                }

                that._oGraphDialog.close();

            },


            getGraphData: function () {
                var maxLevel = Math.max(...that.derivedNodes.map(o => o.LEVEL));
                var levelMap = {};
                var L0Nodes = [];
                var probMap = {};

                that.derivedNodes.filter(e => {
                    if (e.LEVEL == 0) {
                        L0Nodes.push(e.ROOT_KEY)
                    }
                });
                that.derivedNodes.forEach(o => {
                    if (o.PROBABILITY && o.NODE_KEY) {
                        try {
                            // Probability Checker
                            let parsed = JSON.parse(o.PROBABILITY);

                            let outerObj = Object.values(parsed)[0];

                            let probability =
                                Number(Object.values(outerObj)[0]);

                            // FULL UNIQUE PATH
                            let fullKey;
                            if (o.LEVEL === 0) {
                                fullKey = o.NODE_KEY;
                            } else {
                                fullKey =
                                    (
                                        o.PARENT_CHAIN
                                            ? o.PARENT_CHAIN.replaceAll(",", "->")
                                            : o.PARENT_KEY
                                    )
                                    + "->" +
                                    o.NODE_KEY;
                            }
                            probMap[fullKey] = probability;

                        } catch (e) {

                            console.error(e);
                        }
                    }
                });
                for (let level = 1; level <= maxLevel; level++) {
                    levelMap[level] = that.derivedNodes
                        .filter(o => o.LEVEL === level)
                        .map(o => ({

                            parent: o.PARENT_CHAIN
                                ? o.PARENT_CHAIN.replaceAll(",", "->")
                                : o.PARENT_KEY,

                            childNode: o.NODE_KEY,

                            fullPath: o.PARENT_CHAIN
                                ? o.PARENT_CHAIN.replaceAll(",", "->") +
                                "->" +
                                o.NODE_KEY
                                : o.NODE_KEY
                        }));
                }

                that.oGModel.setProperty("/L0data", L0Nodes);
                that.oGModel.setProperty("/levMap", levelMap);
                that._probMap = probMap;
                that.drawGraph(L0Nodes, levelMap, probMap);
            },

            drawGraph: function (L0Nodes, levelMap, probMap) {
                var vboxDomRef = that.byId("chartVBox").getDomRef();
                var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
                function buildAdjacency(levelMap) {

                    const map = {};

                    Object.keys(levelMap).forEach(level => {

                        levelMap[level].forEach(edge => {

                            if (!map[edge.parent]) {
                                map[edge.parent] = [];
                            }

                            map[edge.parent].push({
                                nodeKey: edge.childNode,
                                fullPath: edge.fullPath
                            });
                        });
                    });

                    return map;
                }
                var adjacency = buildAdjacency(levelMap);
                function createNode(
                    key,
                    isAttribute,
                    parentKey = "",
                    level = 0,
                    fullPath = ""
                ) {

                    var prob = null;

                    if (!isAttribute) {

                        if (level === 0) {

                            prob = probMap[key];

                        } else {

                            prob = probMap[fullPath || key];
                            // let uniqueKey = parentKey + "->" + key;
                            // prob = probMap[uniqueKey];
                        }
                    }

                    return {

                        id: fullPath || key,

                        key: key,

                        fullPath: fullPath,

                        parentKey: parentKey,

                        name: isAttribute
                            ? key
                            : key.split("|")[1],

                        isAttribute: isAttribute,

                        probability: prob,

                        hasChildren: !!adjacency[fullPath || key],

                        children: null,

                        _children: null
                    };
                }


                var groups = {};
                L0Nodes.forEach(nodeKey => {
                    var attr = nodeKey.split("|")[0];
                    if (!groups[attr]) groups[attr] = [];
                    groups[attr].push(nodeKey);
                });

                var treeData = {
                    name: "ROOT",
                    key: "ROOT",
                    children: Object.keys(groups).map(attrKey => {
                        // 1. Get the color for this specific attribute group
                        var groupColor = colorScale(attrKey);

                        // 2. Create the Attribute node and assign color
                        var attrNode = createNode(attrKey, true);
                        attrNode.color = groupColor;

                        // 3. Create Value nodes and assign the SAME group color
                        attrNode.children = groups[attrKey].map(fullKey => {
                            // var valNode = createNode(fullKey, false, attrKey, 0);
                            // var valNode = createNode(fullKey, false, attrKey, 0, fullKey);
                            var valNode = createNode(
                                fullKey,
                                false,
                                attrKey,
                                0,
                                fullKey
                            );
                            valNode.color = groupColor;
                            return valNode;
                        });

                        return attrNode;
                    })
                };
                function loadChildren(d) {

                    if (d.children || d._children || d.data.isAttribute) {
                        return;
                    }
                    var currentPath = d.data.fullPath || d.data.key;
                    var kids = adjacency[currentPath];

                    if ((!kids || kids.length === 0) && !d.data.isAttribute) {

                        var nodeKey = d.data.key;

                        var allKids = [];

                        Object.keys(adjacency).forEach(function (path) {

                            var parts = path.split("->");

                            var lastNode = parts[parts.length - 1];

                            // Same node value found elsewhere
                            if (lastNode === nodeKey) {

                                adjacency[path].forEach(function (child) {

                                    allKids.push({
                                        nodeKey: child.nodeKey,
                                        fullPath: child.fullPath
                                    });

                                });

                            }

                        });

                        // Remove duplicates
                        var seen = {};

                        kids = allKids.filter(function (child) {

                            var key = child.nodeKey;

                            if (seen[key]) {
                                return false;
                            }

                            seen[key] = true;

                            return true;
                        });

                        // console.log("Current Node:", nodeKey);
                        // console.log("Matched Children:", kids);

                    }

                    if (!kids || kids.length === 0) {
                        return;
                    }

                    if (!kids || kids.length === 0) {
                        return;
                    }

                    var childGroups = {};

                    kids.forEach(obj => {

                        var attr = obj.nodeKey.split("|")[0];

                        if (!childGroups[attr]) {
                            childGroups[attr] = [];
                        }

                        childGroups[attr].push(obj);
                    });

                    d._children = Object.keys(childGroups).map(attrKey => {

                        var groupColor = colorScale(attrKey);

                        var attrNodeData = createNode(
                            attrKey,
                            true
                        );

                        var attrNode = d3.hierarchy(attrNodeData);

                        attrNode.depth = d.depth + 1;

                        attrNode.parent = d;

                        attrNode.color = groupColor;

                        attrNode.children = childGroups[attrKey].map(obj => {

                            var valNodeData = createNode(
                                obj.nodeKey,
                                false,
                                d.data.key,
                                d.depth,
                                obj.fullPath
                            );

                            var valNode = d3.hierarchy(valNodeData);

                            valNode.depth = attrNode.depth + 1;

                            valNode.parent = attrNode;

                            valNode.color = groupColor;

                            return valNode;
                        });

                        return attrNode;
                    });
                }


                var margin = { top: 20, right: 200, bottom: 30, left: 15 };
                var width = 1000 - margin.left - margin.right;
                var height = 300 - margin.top - margin.bottom;

                // d3.select("#graph_div").selectAll("*").remove();
                // d3.select("#graph_div svg").remove();

                var svgWidth = 3200;
                var svgHeight = 1000;

                var svg = d3.select("#graph_div")
                    .append("svg")
                    .attr("width", svgWidth)
                    .attr("height", svgHeight)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var treemap = d3.tree().nodeSize([30, 200]); // 30px vertical per node, 200px per level
                // 
                var i = 0, duration = 0;

                var root = d3.hierarchy(treeData);
                root.x0 = 0;
                root.y0 = 0;

                update(root);

                function update(source) {

                    var treeData = treemap(root);
                    var nodes = treeData.descendants().filter(d => d.depth > 0); // Filter out the dummy ROOT
                    var links = treeData.links().filter(d => d.source.depth > 0); // Filter out links from ROOT
                    nodes.forEach(d => {
                        d.y = (d.depth - 1) * 200;
                    });

                    // Dynamically resize SVG and re-centre the tree as nodes expand/collapse
                    if (nodes.length > 0) {
                        var minX = d3.min(nodes, d => d.x);
                        var maxX = d3.max(nodes, d => d.x);
                        var newSvgHeight = Math.max(svgHeight, maxX - minX + margin.top + margin.bottom + 80);
                        d3.select("#graph_div svg").attr("height", newSvgHeight);
                        d3.select("#graph_div").style("min-height", newSvgHeight + "px");
                        svg.attr("transform", "translate(" + margin.left + "," + (margin.top - minX + 20) + ")");
                    }



                    /* NODES */
                    var node = svg.selectAll("g.node")
                        // .data(nodes, d => d.id || (d.id = ++i));
                        .data(nodes, d => d.data.id);


                    var nodeEnter = node.enter().append("g")
                        .attr("class", "node")
                        // Start at the parent's previous position
                        .attr("transform", d => "translate(" + source.y0 + "," + source.x0 + ")")
                        .on("click", click);


                    // Inside the update function:
                    nodeEnter.append("circle")
                        .attr("r", d => d.data.isAttribute ? 9 : 7)
                        .style("fill", d => d.data.isAttribute ? "#546E7A" : "#90CAF9"); // Dark for Attr, Light for Value

                    nodeEnter.append("text")
                        .attr("class", "name-label")
                        .attr("dy", ".35em")
                        .attr("x", 10)
                        .style("font-weight", d => d.data.isAttribute ? "bold" : "normal")
                        .text(d => d.data.name);

                    nodeEnter.append("text")
                        .attr("class", "prob-label")
                        .attr("dy", "1.6em")
                        .attr("x", 10)
                        .style("font-size", "10px")
                        .style("fill", "#777")
                        .text(d => (d.data.probability !== null && d.data.probability !== undefined) ? d.data.probability : "");

                    // Inside update(source)
                    nodeEnter.style("opacity", d => d.depth === 0 ? 0 : 1); // Hide root circle/text

                    var nodeUpdate = nodeEnter.merge(node);
                    nodeUpdate.transition().duration(duration)
                    //     .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
                    nodeUpdate
                        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

                    nodeUpdate.select("circle")
                        .attr("r", 8)
                        .style("fill", d => {
                            // If the node has a color assigned, use it.
                            // If not (like the dummy Root), use a default.
                            return d.color || d.data.color || "#ccc";
                        });




                    nodeUpdate.select("text.name-label")
                        .style("font-weight", d => d.data.isAttribute ? "bold" : "normal")
                        .style("fill", d => d.data.isAttribute ? "#555" : "black");

                    nodeUpdate.select("text.prob-label")
                        .text(d => (d.data.probability !== null && d.data.probability !== undefined) ? d.data.probability : "");

                    node.exit().remove();

                    /* LINKS */
                    var link = svg.selectAll("path.link")
                        .data(links, d => d.target.id); // Use d.target.id for consistency

                    link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("fill", "none")
                        .attr("stroke", "#ccc")
                        .attr("stroke-width", 2)
                        .attr("d", d => {
                            var o = { x: source.x0, y: source.y0 };
                            return diagonal(o, o);
                        })
                        // .merge(link)
                        // .transition().duration(duration)
                        // .attr("d", d => diagonal(d.source, d.target)); // Source to Target
                        .merge(link)
                        .attr("d", d => diagonal(d.source, d.target));

                    // Remove exiting links
                    link.exit().transition().duration(duration)
                        .attr("d", d => {
                            var o = { x: source.x, y: source.y };
                            return diagonal(o, o);
                        })
                        .remove();

                    nodes.forEach(d => {
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });
                }

                function diagonal(s, d) {
                    // If there is no parent (the root), don't draw a link
                    if (!s || !d) return null;

                    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
                }
                function click(event, d) {
                    // Load the two-level structure (Attribute -> Values)
                    loadChildren(d);

                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    update(d);
                }


            },



            onLocS: function (oMatch) {

                // var id = oEvent.getParameter("id");
                // var data = oEvent.getParameters(id);
                var sChangedData = oMatch;
                var obj = {
                    CUSTOMER_GROUP: sChangedData.CUSTOMER_GROUP,
                    CHAR_NAME: sChangedData.CHARACTERISTIC,
                    CHAR_VALUE: sChangedData.CHAR_VALUE,
                    OPT_PERCENT: sChangedData.VALUE,
                    CHAR_NUM: sChangedData.CHAR_NUM
                }
                var index = that.finalArray.findIndex(el => el.CHAR_NAME === obj.CHAR_NAME && el.CHAR_VALUE === obj.CHAR_VALUE);

                if (index === -1) {
                    that.finalArray.push(obj);
                } else {
                    that.finalArray[index].CUSTOMER_GROUP = obj.CUSTOMER_GROUP;
                    that.finalArray[index].CHAR_NAME = obj.CHAR_NAME;
                    that.finalArray[index].CHAR_VALUE = obj.CHAR_VALUE;
                    that.finalArray[index].OPT_PERCENT = obj.OPT_PERCENT
                }
            },


            oAllDerivedNodes: function () {
                var selProd = that.oGModel.getProperty("/oConfigPrd");
                that.getOwnerComponent().getModel("oModel").read("/getDerivedNodes", {
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        selProd
                    )
                    ],
                    success: function (oData) {
                        that.getderivedData = oData.results;

                    },
                    error: function (error) {
                        sap.m.MessageToast.show("Error While getting Derived Data");
                    }
                })
            },

            _handleWeekSelection: function (colIndex, sHeader) {
                // Example: "CW16 2026"
                that.isColumnSelected = true
                that.oGModel.setProperty("/aColDate", sHeader);

                var sWeek = sHeader.split(" ")[0];
                var sYear = sHeader.split(" ")[1];


                console.log("Week:", sWeek, "Year:", sYear);

                var aData = that.oTalData//that.allData; // your main data
                // aData.filter(item => (item.TYPE == 1000 && item.TELESCOPIC_WEEK  == sHeader));
                // var aFilteredData = aData.filter(item =>
                //     item.TYPE == 1000 || item.TYPE == 3
                // );
                var aFilteredData = aData.filter(item =>
                    item.TYPE == 1000 && item.TELESCOPIC_WEEK == sHeader
                );


                var aWeekData = aFilteredData.map(function (row) {
                    return {
                        PRODUCT: row.PRODUCT_ID,
                        CHARACTERISTIC: row.CHAR_NAME,
                        CHAR_VALUE: row.CHARVAL_NUM,
                        KEY_FIGURE: row.KEY_FIG_DESC,
                        VALUE: parseFloat(row.OPT_PERCENT),
                        OPT_QTY: parseFloat(row.OPT_QTY),
                        // VALUE: row[sHeader],  //  dynamic week value
                        CUSTOMER_GROUP: row.CUSTOMER_GROUP,
                        CHAR_NUM: row.CHAR_NUM
                    };
                });

                const WEEKDATEObj = that.oGModel
                    .getProperty("/totalWeekTypes")
                    .filter((w) => w[that.weekType] === sHeader);
                // const WEEKDATEObj = totalDates.filter(w => w[that.weekType] === colHeader);
                let WEEKDATE = WEEKDATEObj[0].WEEK_STARTDATE;

                // var forSave = aFilteredData.map(function (row) {

                //     var sOldValue = parseFloat(
                //         (row[sHeader] || "0").replace("%", "")
                //     );

                //     return {
                //         LOCATION_ID: row.LOCATION_ID,
                //         PRODUCT_ID: row.PRODUCT_ID,
                //         CUSTOMER_GROUP: row.CUSTOMER_GROUP,
                //         CLASS_NUM: "NA",
                //         CHAR_NUM: row.CHAR_NUM,
                //         CHARVAL_NUM: row.CHARVAL_NUM,
                //         CHAR_NAME: row.CHAR_NAME,
                //         CHAR_VALUE: row.CHARVAL_NUM, //row.CHARVAL,
                //         VERSION: row.VERSION,
                //         SCENARIO: row.SCENARIO,
                //         MODEL_VERSION: row.MODEL_VERSION,
                //         TYPE: 3,
                //         // OPT_PERCENT: 50,
                //         COMMENTS: "",
                //         OLD_VALUE: sOldValue,
                //         USER: that.sUser,
                //         // USER: "rajeshramagiri@sbpcorp.in",
                //         DATE_TIME: new Date(
                //             sHeader.replace("CW ", "").replace(/\//g, "-")
                //         ).toISOString(),
                //         TELESCOPIC_WEEK: WEEKDATEObj[0].TELESCOPIC_WEEK,
                //         LOCK: false,
                //         // OPT_QTY: 80,
                //         WEEK_STARTDATE: WEEKDATEObj[0]['WEEK_STARTDATE'].toLocaleDateString("en-CA"),
                //         WEEK_ENDDATE: WEEKDATEObj[0]['WEEK_ENDDATE'].toLocaleDateString("en-CA")

                //     };
                // });

                var forSave = aFilteredData.map(function (row) {

                    var sOldValue = parseFloat(row['OPT_QTY'])
                    //  parseFloat(
                    //     (row[sHeader] || "0").replace("%", "")
                    // );

                    // Handle both CW dates and FY periods/quarters
                    var sDateTime = null;

                    if (sHeader.startsWith("CW ")) {
                        var oDate = new Date(
                            sHeader.replace("CW ", "").replace(/\//g, "-")
                        );

                        if (!isNaN(oDate.getTime())) {
                            sDateTime = oDate.toISOString();
                        }
                    } else if (WEEKDATEObj.length && WEEKDATEObj[0].WEEK_STARTDATE) {
                        sDateTime = new Date(
                            WEEKDATEObj[0].WEEK_STARTDATE
                        ).toISOString();
                    }

                    return {
                        LOCATION_ID: row.LOCATION_ID,
                        PRODUCT_ID: row.PRODUCT_ID,
                        CUSTOMER_GROUP: row.CUSTOMER_GROUP,
                        CLASS_NUM: "NA",
                        CHAR_NUM: row.CHAR_NUM,
                        CHARVAL_NUM: row.CHARVAL_NUM,
                        CHAR_NAME: row.CHAR_NAME,
                        CHAR_VALUE: row.CHARVAL_NUM,
                        VERSION: row.VERSION,
                        SCENARIO: row.SCENARIO,
                        MODEL_VERSION: row.MODEL_VERSION,
                        TYPE: 3,
                        COMMENTS: "",
                        OLD_VALUE: sOldValue,
                        USER: that.sUser,

                        DATE_TIME: sDateTime,

                        TELESCOPIC_WEEK: WEEKDATEObj[0].TELESCOPIC_WEEK,
                        LOCK: false,
                        WEEK_STARTDATE: WEEKDATEObj[0].WEEK_STARTDATE.toLocaleDateString("en-CA"),
                        WEEK_ENDDATE: WEEKDATEObj[0].WEEK_ENDDATE.toLocaleDateString("en-CA")
                    };
                });

                that.oGModel.setProperty("/forSave", forSave);
                // console.log("Week Data:", aWeekData);
                that.oGModel.setProperty("/aWeekData", aWeekData);
                this._convertToCharFormat(aWeekData);

            },

            onConfirmCompute: function () {
                var that = this;
                // var oProbInputs = that._oProbInputs || {};
                var oProbInputs = that._oProbInputs || [];
                var oProddmnd = that.oGModel.getProperty("/AboveTable");

                that.oSaveData = that.oGModel.getProperty("/forSave");

                var aFilteredData = [];

                that.finalArray.forEach(function (item) {

                    var aMatch = that.oSaveData.filter(function (obj) {
                        return obj.CHAR_NAME === item.CHAR_NAME;
                    });
                    aFilteredData = aFilteredData.concat(aMatch);

                });

                var aUniqueData = aFilteredData.filter(
                    (item, index, self) =>
                        index === self.findIndex(obj => obj.CHAR_VALUE === item.CHAR_VALUE)
                );

                aUniqueData.forEach(function (item) {

                    var oMatch = oProbInputs.find(function (prob) {

                        return prob.CHARACTERISTIC === item.CHAR_NAME &&
                            prob.CHAR_VALUE === item.CHAR_VALUE;

                    });

                    item.OPT_PERCENT = oMatch ? oMatch.VALUE : 0;

                });

                // aUniqueData.forEach(function (item) {
                //     delete item.CHAR_NAME;
                //     delete item.CHAR_VALUE;
                // });

                aUniqueData.forEach(function (item) {

                    var oMatch = oProddmnd.find(function (prod) {

                        return prod.LOCATION === item.LOCATION_ID &&
                            prod.PRODUCT === item.PRODUCT_ID &&
                            prod.CUSTOMER_GROUP === item.CUSTOMER_GROUP;

                    });

                    if (oMatch) {

                        var demandValue = parseFloat(
                            oMatch[item.TELESCOPIC_WEEK] || 0
                        );

                        item.OPT_QTY = (demandValue * item.OPT_PERCENT) / 100;
                    }
                    else {
                        item.OPT_QTY = 0;
                    }

                });


                var aType3Data = aUniqueData.filter(function (oItem) {
                    return oItem.TYPE === 3;
                });

                aType3Data.forEach(function (oItem) {

                    var oNewItem = Object.assign({}, oItem);
                    oNewItem.TYPE = 2;
                    aUniqueData.push(oNewItem);

                });

                console.log(aUniqueData);


                var oCurrentDate = that.oGModel.getProperty("/aColDate")
                var aData = that.allData; // your main data

                var aFilteredData = aData.filter(item =>
                    item.TYPE == 3 && item.TELESCOPIC_WEEK == oCurrentDate
                );



                var aDerivedtabData = that.oGModel.getProperty("/oDerivedtabledata");
                var aNewDerivedData = [];
                var oUniqueMap = {}; // prevent duplicates

                // FOR LOOP
                for (var i = 0; i < aDerivedtabData.length; i++) {

                    var oItem = aDerivedtabData[i];

                    // UNIQUE KEY
                    var sKey =
                        oItem.CHAR_NUM + "|" +
                        oItem.CHAR_NAME + "|" +
                        oItem.CHAR_VALUE;

                    // Skip if already added
                    if (oUniqueMap[sKey]) {
                        continue;
                    }

                    // Mark as added
                    oUniqueMap[sKey] = true;

                    // Take first object as reference for common fields
                    var oBase = aUniqueData[0];

                    that.oPlannedData = oBase;

                    aNewDerivedData.push({
                        LOCATION_ID: oBase.LOCATION_ID,
                        PRODUCT_ID: oBase.PRODUCT_ID,
                        CUSTOMER_GROUP: oBase.CUSTOMER_GROUP,
                        CLASS_NUM: "NA",
                        CHAR_NUM: oItem.CHAR_NUM,
                        CHARVAL_NUM: oItem.CHAR_VALUE,
                        VERSION: oBase.VERSION,
                        SCENARIO: oBase.SCENARIO,
                        MODEL_VERSION: oBase.MODEL_VERSION,
                        TYPE: 2,
                        COMMENTS: "",
                        OLD_VALUE: parseInt(oItem.OLD_QTY),
                        // USER: "rajeshramagiri@sbpcorp.in",
                        USER: that.sUser,
                        DATE_TIME: oBase.DATE_TIME,
                        TELESCOPIC_WEEK: oBase.TELESCOPIC_WEEK,
                        LOCK: false,
                        WEEK_STARTDATE: oBase.WEEK_STARTDATE,
                        WEEK_ENDDATE: oBase.WEEK_ENDDATE,

                        OPT_PERCENT: parseFloat(oItem.DERIVED_PERCENTAGE),
                        OPT_QTY: parseInt(oItem.OPT_QTY)
                    });
                }

                // Final array
                var aFinalData = aUniqueData.concat(aNewDerivedData);

                // var oSeen = {};
                // var oFinalData = aFinalData.filter(function (item) {

                //     var sKey = item.CHAR_NUM + "|" + item.CHARVAL_NUM;

                //     if (oSeen[sKey]) {
                //         return false;
                //     }

                //     oSeen[sKey] = true;
                //     return true;
                // });

                // console.log(oFinalData);

                // console.log(aFinalData);
                aFinalData.forEach(function (item) {
                    delete item.CHAR_NAME;
                    delete item.CHAR_VALUE;
                });


                that.oModel.callFunction("/saveOptionPercentData", {

                    urlParameters: { optData: JSON.stringify(aFinalData) },
                    success: function (oData) {
                        var obj = that.oPlannedData;
                        const oDateRange = that.byId("idWeekDateOPMIXP");
                        const values = oDateRange.getValue().split(" - ");
                        const fromDate = that.convertDate(values[0], "-");
                        const toDate = that.convertDate(values[1], "-");
                        that.oModel.callFunction("/getPlannedOptionPercentage", {
                            urlParameters: {
                                LOCATION_ID: obj.LOCATION_ID,
                                PRODUCT_ID: JSON.stringify([obj.PRODUCT_ID]),
                                FROM_DATE: fromDate,
                                TO_DATE: toDate,
                                VERSION: obj.VERSION,
                                SCENARIO: obj.SCENARIO,
                                MODEL_VERSION: obj.MODEL_VERSION,
                            },
                            success: function (oData) {
                            },
                            error: function (err) {
                                sap.ui.core.BusyIndicator.hide();
                                MessageToast.show("Error while saving data");
                            }
                        });

                        that.oConfirm = true;
                        that.onGo();
                        that.onCloseSimulation();
                        MessageToast.show("Success");

                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error while saving data");
                    }

                });

            },

            onCompute: function () {

                var that = this;
                var oClickedweek = that.oGModel.getProperty("/aColDate");
                var oProddmnd = that.oGModel.getProperty("/AboveTable");
                var oDgModel = this.getOwnerComponent().getModel("oDgModel");
                var sSessionId = that.oGModel.getProperty("/sessionId");
                var oProbInputs = that._oProbInputs || {};
                var sLoc = that.oGModel.getProperty("/oProduct");
                var sProd = that.oGModel.getProperty("/oConfigPrd");
                var sVer = that.oGModel.getProperty("/finalVersion");
                var sScen = that.oGModel.getProperty("/finalScenario");
                var sModel = that.oGModel.getProperty("/defaultModel");
                var sWeek = that.oGModel.getProperty("/aColDate");
                var aInputs = [];
                var aValid = [];
                var aInvalid = [];
                that.finalArray;
                aInputs = oProbInputs;
                if (aInputs.length > 0) {
                    if (aInputs.length > 0) {
                        var oGrouped = {};
                        aInputs.forEach(function (item) {
                            var sKey =
                                item.CHARACTERISTIC + "|" +
                                item.CHAR_NUM + "|" +
                                item.CUSTOMER_GROUP;
                            if (!oGrouped[sKey]) {
                                oGrouped[sKey] = {
                                    total: 0,
                                    items: []
                                };
                            }
                            oGrouped[sKey].total += Number(item.VALUE || 0);
                            oGrouped[sKey].items.push(item);
                        });

                        // Object.keys(oGrouped).forEach(function (key) {
                        //     var total = Number(oGrouped[key].total.toFixed(2));
                        //     if (Math.abs(total - 100) <= 0.01) {
                        //         total = 100;
                        //     }
                        //     if (total === 100) {
                        //         aValid.push(...oGrouped[key].items);
                        //     } else {
                        //         aInvalid.push({
                        //             key: key,
                        //             total: total,
                        //             items: oGrouped[key].items
                        //         });
                        //     }
                        // });

                        Object.keys(oGrouped).forEach(function (key) {

                            var total = Number(oGrouped[key].total.toFixed(2));

                            // Accept rounding differences
                            if (total >= 99.99 && total <= 100.01) {
                                total = 100;
                            }

                            if (total === 100) {
                                aValid.push(...oGrouped[key].items);
                            } else {
                                aInvalid.push({
                                    key: key,
                                    total: total,
                                    items: oGrouped[key].items
                                });
                            }
                        });

                        if (aInvalid.length > 0) {

                            var sMsg = "The following entries do not sum up to 100%:\n\n";

                            aInvalid.forEach(function (grp) {

                                var oFirst = grp.items[0];

                                sMsg += oFirst.CHARACTERISTIC + " = " + grp.total + "%\n";
                            });

                            MessageToast.show(sMsg);

                            return false;
                        } else {
                            aValid = that.finalArray;
                            if (aValid.length === 0) {
                                MessageToast.show("No changes to compute");
                            }
                        }

                    }
                    sap.ui.core.BusyIndicator.show();
                    that.oModel.callFunction("/simulateDerivedValues", {
                        urlParameters: {
                            LOCATION_ID: sLoc[0].PLAN_LOC,
                            PRODUCT_ID: sProd,
                            VERSION: sVer,
                            SCENARIO: sScen,
                            MODEL_VERSION: sModel,
                            WEEK: sWeek,
                            Data: JSON.stringify(aValid)
                        },



                        success: function (oData) {

                            sap.ui.core.BusyIndicator.hide();

                            var aDerivedData = JSON.parse(oData.simulateDerivedValues);

                            // SORT DATA
                            aDerivedData.sort(function (a, b) {

                                // LEVEL SORT
                                var levelA = parseInt((a.LEVEL || "").replace("L", "")) || 999;
                                var levelB = parseInt((b.LEVEL || "").replace("L", "")) || 999;

                                if (levelA !== levelB) {
                                    return levelA - levelB;
                                }

                                // GROUP SORT
                                var groupDiff = (a.CHAR_DESC || "")
                                    .localeCompare((b.CHAR_DESC || ""));

                                if (groupDiff !== 0) {
                                    return groupDiff;
                                }

                                // CHAR VALUE SORT
                                return String(a.CHAR_VALUE || "")
                                    .localeCompare(
                                        String(b.CHAR_VALUE || ""),
                                        undefined,
                                        {
                                            numeric: true,
                                            sensitivity: "base"
                                        }
                                    );
                            });

                            // Product demand object
                            var oDemandData = oProddmnd[0] || {};

                            // Get clicked week value dynamically
                            var nDemandQty = parseFloat(oDemandData[oClickedweek]) || 0;




                            // ==========================================
                            // CARRY DECIMALS FROM HIGHER TO LOWER VALUES
                            // ==========================================

                            // var oGroupedData = {};

                            // // GROUP DATA
                            // aDerivedData.forEach(function (oItem) {

                            //     var sGroup = oItem.CHAR_NAME || "";

                            //     if (!oGroupedData[sGroup]) {
                            //         oGroupedData[sGroup] = [];
                            //     }

                            //     var nQty = parseFloat(oItem.OPT_QTY) || 0;

                            //     oGroupedData[sGroup].push({
                            //         ref: oItem,
                            //         originalQty: nQty,
                            //         floorQty: Math.floor(nQty),
                            //         decimalQty: nQty - Math.floor(nQty)
                            //     });

                            // });

                            // // PROCESS EACH GROUP
                            // var nCarryForward = 0;

                            // Object.keys(oGroupedData).forEach(function (sGroup) {

                            //     var aGroup = oGroupedData[sGroup];

                            //     var nTotalDecimal = nCarryForward;

                            //     aGroup.forEach(function (oRow) {
                            //         nTotalDecimal += oRow.decimalQty;
                            //     });

                            //     var nExtraQty = Math.round(nTotalDecimal);

                            //     // Remaining decimal carried to next group
                            //     nCarryForward = nTotalDecimal - nExtraQty;

                            //     aGroup.sort(function (a, b) {
                            //         return a.floorQty - b.floorQty;
                            //     });

                            //     aGroup.forEach(function (oRow, index) {

                            //         var nFinalQty = oRow.floorQty;

                            //         if (index < nExtraQty) {
                            //             nFinalQty += 1;
                            //         }

                            //         oRow.ref.OPT_QTY = nFinalQty;

                            //         if (nDemandQty > 0) {
                            //             oRow.ref.DERIVED_PERCENTAGE =
                            //                 ((nFinalQty / nDemandQty) * 100).toFixed(2);
                            //         } else {
                            //             oRow.ref.DERIVED_PERCENTAGE = "0.00";
                            //         }
                            //     });
                            // });

                            var oGroupedData = {};

                            aDerivedData.forEach(function (oItem) {

                                var sGroup = oItem.CHAR_NAME || "";

                                if (!oGroupedData[sGroup]) {
                                    oGroupedData[sGroup] = [];
                                }

                                var nQty = parseFloat(oItem.OPT_QTY) || 0;

                                oGroupedData[sGroup].push({
                                    ref: oItem,
                                    originalQty: nQty,
                                    floorQty: Math.floor(nQty),
                                    decimalQty: nQty - Math.floor(nQty)
                                });

                            });

                            Object.keys(oGroupedData).forEach(function (sGroup) {

                                var aGroup = oGroupedData[sGroup];

                                // Sum of original values
                                var nOriginalTotal = aGroup.reduce(function (sum, row) {
                                    return sum + row.originalQty;
                                }, 0);

                                // Expected total
                                var nTargetTotal = Math.round(nOriginalTotal);

                                // Floor total
                                var nFloorTotal = aGroup.reduce(function (sum, row) {
                                    return sum + row.floorQty;
                                }, 0);

                                // Quantity to distribute
                                var nRemaining = nTargetTotal - nFloorTotal;

                                // Highest decimal gets priority
                                aGroup.sort(function (a, b) {
                                    return b.decimalQty - a.decimalQty;
                                });

                                aGroup.forEach(function (oRow, index) {

                                    var nFinalQty = oRow.floorQty;

                                    if (index < nRemaining) {
                                        nFinalQty += 1;
                                    }

                                    oRow.ref.OPT_QTY = nFinalQty;

                                    if (nDemandQty > 0) {
                                        oRow.ref.DERIVED_PERCENTAGE =
                                            ((nFinalQty / nDemandQty) * 100).toFixed(2);
                                    } else {
                                        oRow.ref.DERIVED_PERCENTAGE = "0.00";
                                    }

                                });

                            });

                            console.log("Updated Derived Data", aDerivedData);

                            var nTableModel = new JSONModel();

                            that.oGModel.setProperty("/oDerivedtabledata", aDerivedData);

                            that.oDerivedtabledata = aDerivedData;

                            nTableModel.setData({
                                results: aDerivedData
                            });

                            var oTable = that.byId("classListCHACON");

                            oTable.setModel(nTableModel);

                            // LEVEL GROUPING
                            var oSorterLevel = new sap.ui.model.Sorter(
                                "LEVEL",
                                false,
                                function (oCtx) {

                                    var sLevel = oCtx.getProperty("LEVEL");

                                    return {
                                        key: sLevel,
                                        text: "Level: " + sLevel
                                    };
                                }
                            );

                            // GROUP SORTER
                            var oSorterGroup = new sap.ui.model.Sorter(
                                "CHAR_DESC",
                                false
                            );

                            // CHAR VALUE SORTER
                            var oSorterChar = new sap.ui.model.Sorter(
                                "CHAR_VALUE",
                                false
                            );

                            // APPLY SORTERS
                            oTable.getBinding("items").sort([
                                oSorterLevel,
                                oSorterGroup,
                                oSorterChar
                            ]);

                            oTable.attachEventOnce(
                                "updateFinished",
                                that._colorGroupHeaders.bind(that)
                            );
                            // that.onMinGraph();
                            that.onMaxTable();

                        },

                        error: function (err) {

                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("Error Loading Derived Characteristics");
                        }
                    });

                } else {

                    MessageToast.show("No changes to Compute");
                }
            },

            _convertToCharFormat: function (aWeekData) {

                var oMap = {};

                aWeekData.forEach(function (item) {

                    // Only Option Percentage %
                    // if (item.KEY_FIGURE !== "Option Percentage %") {
                    //     return;
                    // }
                    if (item.KEY_FIGURE !== "Option Percentage") {
                        return;
                    }

                    var key = item.CHARACTERISTIC;

                    if (!oMap[key]) {
                        oMap[key] = {
                            key: key,
                            label: key,
                            values: []
                        };
                    }

                    // Ignore empty percentages
                    if (
                        item.VALUE !== null &&
                        item.VALUE !== undefined &&
                        item.VALUE !== "" &&
                        item.VALUE !== 0 &&
                        item.VALUE !== "0%"
                    ) {

                        oMap[key].values.push({
                            CHAR_VALUE: item.CHAR_VALUE,
                            VALUE: item.VALUE
                        });
                    }

                });

                var aResult = Object.values(oMap);

                that.oRslts = aResult;

                console.log("Final Converted Data:", aResult);

                return aResult;
            },

            _state: function () {
                return this.getOwnerComponent().getModel("state");
            },

            onAfterRendering: function () {
                this.byId("idVersionOPMIXP").setValue("Base Version")
                this.byId("idScenarioOPMIXP").setValue("_PLAN")
                that.skip = 0
                that.oGModel.setProperty("/SelectedLocations", []);
                that.oGModel.setProperty("/SelectedProducts", []);
                that.oGModel.setProperty("/SelectedCustGroups", []);
                that.oGModel.setProperty("/SelectedChars", []);
                that.oGModel.setProperty("/SelectedCharVals", []);
                that.oGModel.setProperty("/TreeItemSelectForSel", "");
                that.finalArray = []
                that.isColumnSelected = false;
                that._IconFilters = false;
                // that.initVariantManagement();
                that.loadFilters();
                that.oPartialProducts()
                that.generateColSettings();

                that.storedDecimalSums = 0;
                that.oGModel.setProperty("/defaultVariant", "Y");
            },

            removeDuplicatesFilters: function (array, key) {
                var check = new Set();
                return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
            },

            loadFilters: function () {
                that.oFiltsDat = [];
                var topCount = 50000
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("oModel").read("/getRolesLocProd", {
                    filters: [new Filter(
                        "USER",
                        FilterOperator.EQ,
                        // "rajeshramagiri@sbpcorp.in"
                        that.sUser
                    )],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
                        // "$apply": "groupby((LOCATION_ID,LOCATION_DESC))"
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {

                            that.skip += parseInt(topCount);
                            that.oFiltsDat = that.oFiltsDat.concat(oData.results);
                            that.loadFilters();
                        } else {
                            that.skip = 0;
                            that.oFiltsDat = that.oFiltsDat.concat(oData.results);

                            that.oGModel.setProperty("/oFilterData", that.oFiltsDat)

                            /////////////////// Independence Locations Binding Starts /////////////////
                            let aLocItems = that.removeDuplicatesFilters(that.oFiltsDat, "DEMAND_LOC")
                            that.oGModel.setProperty("/oLocation", aLocItems)

                            var aLocModel = new JSONModel()
                            aLocModel.setData({
                                items: aLocItems
                            })
                            sap.ui.getCore().byId("idlocDialogOPMIXP").setModel(aLocModel)
                            /////////////////// Independence Locations Binding Ends /////////////////

                            // /////////////////// Independence Products Binding Starts //////////////////
                            // let aProdItems = that.removeDuplicatesFilters(aLocItems, "PRODUCT_ID")
                            // that.oGModel.setProperty("/oProduct", aProdItems)

                            // var aProdModel = new JSONModel()
                            // aProdModel.setData({
                            //     items: aProdItems
                            // })
                            // sap.ui.getCore().byId("idprodDialogOPMIXP").setModel(aProdModel)
                            //  that.oProdDialog.open();
                            // ///////////////// Independence Products Binding Ends /////////////////

                            /////////////////// Independence Customer Group Binding Starts /////////////
                            // let aCgroup = that.removeDuplicatesFilters(that.oFiltsDat, "CUSTOMER_GROUP")
                            // that.oGModel.setProperty("/ocgroup", aCgroup)

                            // var aCgModel = new JSONModel()
                            // aCgModel.setData({
                            //     items: aCgroup
                            // })
                            // sap.ui.getCore().byId("idCusDialogOPMIXP").setModel(aCgModel)
                            /////////////////// Independence Customer Group Binding Ends /////////////////

                            // /////////////////// Independence Char Num Binding Starts //////////////////
                            // let aChar = that.removeDuplicatesFilters(that.oFiltsDat, "CHAR_NUM")
                            // that.oGModel.setProperty("/oChar", aChar)
                            // var aCharModel = new JSONModel()
                            // aCharModel.setData({
                            //     items: aChar
                            // })
                            // sap.ui.getCore().byId("idcharDialogOPMIXP").setModel(aCharModel)
                            // /////////////////// Independence Char Num Binding Ends /////////////////

                            // /////////////////// Independence Char Valu Binding Starts //////////////////
                            // let aCharVal = that.removeDuplicatesFilters(that.oFiltsDat, "CHAR_VALUE")
                            // that.oGModel.setProperty("/oCharVal", aCharVal)

                            // var aCharValModel = new JSONModel()
                            // aCharValModel.setData({
                            //     items: that.oFiltsDat
                            // })
                            // sap.ui.getCore().byId("idcharValDialogOPMIXP").setModel(aCharValModel)
                            // /////////////////// Independence Char Valu Binding Ends /////////////////

                            that.initVariantManagement();
                        }
                        sap.ui.core.BusyIndicator.hide();

                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Location Data");
                    }
                });
            },

            loadChars: function () {
                var oRef_Prd = that.oGModel.getProperty("/oConfigPrd");
                sap.ui.core.BusyIndicator.show();
                that.oModel.callFunction("/getCharGroupWeightage", {
                    // that.oModel.callFunction
                    urlParameters: {
                        PRODUCT_ID: oRef_Prd,
                    },
                    success: function (oData) {
                        var oCharPData = JSON.parse(oData.getCharGroupWeightage)
                        var oPCharDat = oCharPData.filter(item => (item.CHAR_TYPE === "P"))
                        that.oGModel.setProperty("/oCharData", oPCharDat)
                        that.oLoadChars();

                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Characteristics Data");
                    }
                });
            },

            oLoadChars: function () {
                that.CharData = [];
                var topCount = 50000
                var oRef_Prd = that.oGModel.getProperty("/oConfigPrd");
                if (oRef_Prd === undefined) {
                    that.oSeqOrder();
                }
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("oModel").read("/getProdClsChar", {
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        oRef_Prd
                    ),
                    ],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount

                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.CharData = that.CharData.concat(oData.results);
                            that.oLoadChars();
                        } else {
                            that.skip = 0;
                            that.CharData = that.CharData.concat(oData.results);
                            const finalArray = [];
                            // Build lookup from seqData
                            const seqMap = new Map();
                            const seqData = that.oGModel.getProperty("/oCharData") || [];

                            seqData.forEach(seq => {
                                const key = `${seq.PRODUCT_ID}_${seq.CHAR_NUM}`;
                                seqMap.set(key, seq);
                            });

                            // Build final array based on oData.results
                            that.CharData.forEach(item => {
                                const key = `${item.PRODUCT_ID}_${item.CHAR_NUM}`;
                                const seq = seqMap.get(key);

                                if (seq) {
                                    finalArray.push({
                                        PRODUCT_ID: item.PRODUCT_ID,
                                        CHAR_NUM: item.CHAR_NUM,
                                        CHAR_DESC: item.CHAR_DESC,
                                        CHARVAL_DESC: item.CHARVAL_DESC?.trim(),
                                        CHARVAL_NUM: item.CHARVAL_NUM?.trim(),
                                        CHAR_VALUE: item.CHAR_VALUE?.trim(),
                                        SEQUENCE: seq?.SEQUENCE,
                                        WEIGHTAGE: seq?.WEIGHTAGE
                                    });
                                }
                            });


                            let aChar = that.removeDuplicatesFilters(finalArray, "CHAR_NUM");
                            that.oGModel.setProperty("/oChar", aChar)

                            that.oGModel.setProperty("/oFinalChar", finalArray)
                            var aCharModel = new JSONModel()
                            aCharModel.setData({
                                items: aChar
                            })
                            sap.ui.getCore().byId("idcharDialogOPMIXP").setModel(aCharModel)
                            var aTokens = that.byId("idCharOPMIXP").getTokens()
                            var aItems = sap.ui.getCore().byId("idcharDialogOPMIXP").getItems();

                            if (aTokens.length > 0 && aItems.length > 0) {
                                aTokens.forEach(function (oToken) {
                                    var sKey = oToken.getText();

                                    aItems.forEach(function (oItem) {
                                        if (oItem.getCells()[0].getTitle() === sKey) {
                                            oItem.setSelected(true)
                                        }
                                    });
                                });
                            }

                            that.oCharDialog.open();

                            sap.ui.core.BusyIndicator.hide();

                        }


                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Characteristics Data");
                    }
                });


            },


            onAllSearch: function (oEvent) {
                const sQuery = (oEvent.getParameter("value") || "").trim();
                const sId = oEvent.getParameter("id");
                let oFilters = [];

                //  LOCATION SEARCH
                if (sId.includes("idlocDialogOPMIXP")) {

                    const oList = sap.ui.getCore().byId("idlocDialogOPMIXP");

                    if (sQuery) {
                        oFilters = [
                            new Filter({
                                filters: [
                                    new Filter("DEMAND_LOC", FilterOperator.Contains, sQuery),
                                    new Filter("DEMAND_DESC", FilterOperator.Contains, sQuery)
                                ],
                                and: false
                            })
                        ];
                    } else {
                        // Reset data
                        const aLocItems = this.oGModel.getProperty("/oLocation");
                        oList.setModel(new JSONModel({ items: aLocItems }));
                    }

                    oList.getBinding("items").filter(oFilters);
                    if (oList.getItems().length === 0) oList.setNoDataText("No Data");
                    return;   //  STOP HERE; prevent running product logic
                }

                //   PRODUCTSEARCH
                if (sId.includes("idprodDialogOPMIXP")) {

                    const oList = sap.ui.getCore().byId("idprodDialogOPMIXP");

                    if (sQuery) {
                        oFilters = [
                            new Filter({
                                filters: [
                                    new Filter("PRODUCT_ID", FilterOperator.Contains, sQuery),
                                    new Filter("PROD_DESC", FilterOperator.Contains, sQuery)
                                ],
                                and: false
                            })
                        ];
                    } else {
                        // Reset product list
                        const aProdItems = this.oGModel.getProperty("/oProduct");
                        oList.setModel(new JSONModel({ items: aProdItems }));
                    }

                    oList.getBinding("items").filter(oFilters);
                    if (oList.getItems().length === 0) oList.setNoDataText("No Data");
                    return;
                }

                //  Characteristic SEARCH
                if (sId.includes("idcharDialogOPMIXP")) {

                    const oList = sap.ui.getCore().byId("idcharDialogOPMIXP");

                    if (sQuery) {
                        oFilters = [
                            new Filter({
                                filters: [
                                    new Filter("CHAR_NUM", FilterOperator.Contains, sQuery),
                                    new Filter("CHAR_DESC", FilterOperator.Contains, sQuery),
                                    new Filter("CHAR_NAME", FilterOperator.Contains, sQuery)
                                ],
                                and: false
                            })
                        ];
                    } else {
                        // Reset product list
                        const aCharItems = that.oGModel.getProperty("/oChar")
                        oList.setModel(new JSONModel({ items: aCharItems }));
                    }

                    oList.getBinding("items").filter(oFilters);
                    if (oList.getItems().length === 0) oList.setNoDataText("No Data");
                    return;
                }

                // Characteristic SEARCH
                if (sId.includes("idcharValDialogOPMIXP")) {

                    const oCharValList = sap.ui.getCore().byId("idcharValDialogOPMIXP");

                    if (sQuery) {
                        oFilters = [
                            new Filter({
                                filters: [
                                    new Filter("CHARVAL_DESC", FilterOperator.Contains, sQuery),
                                    new Filter("CHARVAL_NUM", FilterOperator.Contains, sQuery)
                                ],
                                and: false
                            })
                        ];
                    } else {

                        let aChar = that.removeDuplicatesFilters(that.oFiltsDat, "CHAR_NUM")
                        // that.oGModel.setProperty("/oChar", aChar)
                        // Reset product list
                        const aCharValItems = aChar// that.oGModel.getProperty("/oCharVal")
                        oCharValList.setModel(new JSONModel({ items: aCharValItems }));
                    }

                    oCharValList.getBinding("items").filter(oFilters);
                    if (oCharValList.getItems().length === 0) oCharValList.setNoDataText("No Data");
                    return;
                }
            },

            loadFragments: function () {
                if (!that.oLocDialog) {
                    that.oLocDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Location",
                        that
                    );
                    that.getView().addDependent(that.oLocDialog);
                }
                if (!that.oProdDialog) {
                    that.oProdDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Product",
                        that
                    );
                    that.getView().addDependent(that.oProdDialog);
                }
                if (!that.oCustomerDialog) {
                    that.oCustomerDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Customer",
                        that
                    );
                    that.getView().addDependent(that.oCustomerDialog);
                }
                if (!that.oCharDialog) {
                    that.oCharDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Char",
                        that
                    );
                    that.getView().addDependent(that.oCharDialog);
                }
                if (!that.oCharValDialog) {
                    that.oCharValDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Charval",
                        that
                    );
                    that.getView().addDependent(that.oCharValDialog);
                }
                if (!that.oVersionDialog) {
                    that.oVersionDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Version",
                        that
                    );
                    that.getView().addDependent(that.oVersionDialog);
                }
                if (!that.oScenarioDialog) {
                    that.oScenarioDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Scenario",
                        that
                    );
                    that.getView().addDependent(that.oScenarioDialog);
                }
                if (!that.oSettingDialog) {
                    that.oSettingDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.Settings",
                        that
                    );
                    that.getView().addDependent(that.oSettingDialog);
                }
                if (!this._oKeyFigPopup) {
                    this._oKeyFigPopup = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.KeyFigures",
                        that
                    );
                    that.getView().addDependent(this._oKeyFigPopup);
                }
                if (!that.oCustomerDialogForMsg) {
                    that.oCustomerDialogForMsg = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.MessageCustomerGrp",
                        that
                    );
                    that.getView().addDependent(that.oCustomerDialogForMsg);
                }

                if (!that._oGraphDialog) {
                    that._oGraphDialog = sap.ui.xmlfragment(
                        "vcp.vcpoptionpercentagesoptimised.fragments.fullScreenGraph",
                        that
                    );
                    that.getView().addDependent(this._oGraphDialog);
                }
            },

            oHandleValuehelp: function (oEvent) {
                var oLoc = that.byId("idLocOPMIXP").getTokens().length;
                var oProd = that.byId("idProdOPMIXP").getValue();

                var oSid = oEvent.getParameter("id");

                if (oSid.includes("idLocOPMIXP")) {
                    this._resetSelectDialog(that.oLocDialog);
                    that.oLocDialog.open();
                }
                else if (oSid.includes("idProdOPMIXP")) {
                    if (oLoc === 0) {
                        sap.m.MessageToast.show("select mandatory fileds");
                        return false;
                    }
                    this._resetSelectDialog(that.oProdDialog);

                    const aTokens = this.byId("idLocOPMIXP").getTokens();
                    const aDemandLocs = aTokens.map(t => t.getKey());

                    if (aDemandLocs.length === 0) {
                        var aProdItems = that.removeDuplicatesFilters(that.oFiltsDat, "PRODUCT_ID");
                        that.oGModel.setProperty("/oProduct", aProdItems);
                        that.oPProduct = aProdItems;

                        var aProdModel = new JSONModel()
                        aProdModel.setData({
                            items: aProdItems
                        })
                        sap.ui.getCore().byId("idprodDialogOPMIXP").setModel(aProdModel);
                        that.oProdDialog.open();
                        /////////////////  Products Binding Ends /////////////////
                    } else {
                        // that.loadFilters();

                        // var oloc = that.oGModel.getProperty("/oLocation")

                        const aFiltered = that.oFiltsDat.filter(o =>
                            aDemandLocs.includes(o.DEMAND_LOC)
                        );


                        // let aLocItems = that.removeDuplicatesFilters(oDmdloc, "that.oFiltsDat")
                        let aProdItems = that.removeDuplicatesFilters(aFiltered, "PRODUCT_ID")
                        that.oGModel.setProperty("/oProduct", aProdItems)
                        that.oPProduct = aProdItems;

                        var aProdModel = new JSONModel()
                        aProdModel.setData({
                            items: aProdItems
                        })
                        sap.ui.getCore().byId("idprodDialogOPMIXP").setModel(aProdModel);
                        that.oProdDialog.open();
                    }


                }
                else if (oSid.includes("idCustOPMIXP")) {


                    if (!oProd) {
                        sap.m.MessageToast.show("please select mandatory fields");
                        return false;
                    }
                    this._resetSelectDialog(that.oCustomerDialog);
                    that.oCustGrp();

                    // Restore selection AFTER open
                    setTimeout(() => {
                        that._restoreCustomerSelection();
                    }, 0);
                }
                else if (oSid.includes("idCharOPMIXP")) {
                    this._resetSelectDialog(that.oCharDialog);
                    if (!oProd) {
                        sap.m.MessageToast.show("please select mandatory fields");
                        return false;
                    }
                    that.loadChars();

                }
                else if (oSid.includes("idCharValuOPMIXP")) {
                    this._resetSelectDialog(that.oCharValDialog);
                    if (!oProd) {
                        sap.m.MessageToast.show("please select mandatory fields");
                        return false;
                    }

                    // that.oGModel.setProperty("/oCharVal", aCharVal)

                    var oCharvals = that.oGModel.getProperty("/oCharVals") || [];

                    if (oCharvals.length > 0) {
                        var aCharVal = that.removeDuplicatesFilters(oCharvals, "CHARVAL_DESC");
                        that.oGModel.setProperty("/oCharVal", aCharVal);

                    } else {

                        var aCharValue = that.oGModel.getProperty("/oFinalChar"); //that.oGModel.getProperty("/oChar")
                        var aCharVal = that.removeDuplicatesFilters(aCharValue, "CHARVAL_DESC");
                        that.oGModel.setProperty("/oCharVal", aCharVal);
                    }

                    var aCharValModel = new JSONModel()
                    aCharValModel.setData({
                        items: aCharVal
                    })
                    sap.ui.getCore().byId("idcharValDialogOPMIXP").setModel(aCharValModel);

                    that.oCharValDialog.open();
                }
                else if (oSid.includes("idVersionOPMIXP")) {
                    if (!oProd) {
                        MessageToast.show("Please select mandatory fields");
                        return false;
                    }
                    this._resetSelectDialog(that.oVersionDialog);

                    that.loadVerscen();
                    // that.oVersionDialog.open();
                }
                else if (oSid.includes("idScenarioOPMIXP")) {
                    if (!oProd) {
                        MessageToast.show("Please select mandatory fields");
                        return false;
                    }
                    this._resetSelectDialog(that.oScenarioDialog);
                    /////////////////// Scenario Binding Starts //////////////////
                    var oScen = that.oGModel.getProperty("/aVersion")
                    let aScenario = that.removeDuplicatesFilters(oScen, "SCENARIO_NAME")
                    that.oGModel.setProperty("/aScenario", aScenario)

                    var aScenModel = new JSONModel()
                    aScenModel.setData({
                        items: aScenario
                    })
                    sap.ui.getCore().byId("idsceDialogOPMIXP").setModel(aScenModel)
                    /////////////////// Scenario Binding Ends /////////////////
                    that.oScenarioDialog.open();
                }
            },


            oCustGrp: function () {
                that.oCgr = [];
                var topCount = 50000
                sap.ui.core.BusyIndicator.show();
                var oPrd = that.byId("idProdOPMIXP").getValue();
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("oModel").read("/getCustomerGroups", {
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        oPrd
                    ),
                    ],

                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount

                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.oCgr = that.oCgr.concat(oData.results);
                            that.oCustGrp();
                        } else {
                            that.skip = 0;
                            that.oCgr = that.oCgr.concat(oData.results);

                            let aCgroup = that.removeDuplicatesFilters(that.oCgr, "CUSTOMER_GROUP")
                            that.oGModel.setProperty("/ocgroup", aCgroup)

                            var aCgModel = new JSONModel()
                            aCgModel.setData({
                                items: aCgroup
                            })
                            sap.ui.getCore().byId("idCusDialogOPMIXP").setModel(aCgModel);
                            that.oCustomerDialog.open();

                            sap.ui.core.BusyIndicator.hide();


                        }
                        sap.ui.core.BusyIndicator.hide();

                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Customer Data");
                    }
                });
            },

            loadVerscen: function () {
                that.Verscn = [];
                var topCount = 50000
                sap.ui.core.BusyIndicator.show();
                var oPrd = that.byId("idProdOPMIXP").getValue();
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("oModel").read("/getFutureDemandVersionScn", {
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        oPrd
                    ),
                    ],

                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount

                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {

                            that.skip += parseInt(topCount);
                            that.Verscn = that.Verscn.concat(oData.results);
                            that.loadVerscen();
                        } else {
                            that.skip = 0;
                            that.Verscn = that.Verscn.concat(oData.results);

                            that.oGModel.setProperty("/oVerscen", that.Verscn);

                            /////////////////// Version Binding Starts //////////////////
                            let aVersion = that.removeDuplicatesFilters(that.Verscn, "VERSION");
                            that.oGModel.setProperty("/aVersion", aVersion)

                            var aVersModel = new JSONModel()
                            aVersModel.setData({
                                items: aVersion
                            })
                            sap.ui.getCore().byId("idverDialogOPMIXP").setModel(aVersModel)
                            that.oVersionDialog.open();
                            sap.ui.core.BusyIndicator.hide();
                            ///////////////////  Version Binding Ends /////////////////

                        }
                        sap.ui.core.BusyIndicator.hide();

                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Location Data");
                    }
                });
            },


            _resetSelectDialog: function (oDialog) {

                //  Clear search field text
                if (oDialog.setSearchValue) {
                    oDialog.setSearchValue("");
                }

                //  Clear applied filters on items binding
                const oBinding = oDialog.getBinding("items");
                if (oBinding) {
                    oBinding.filter([]);
                }
            },

            _restoreCustomerSelection: function () {

                const oDialog = sap.ui.getCore().byId("idCusDialogOPMIXP");
                if (!oDialog) return;

                //  Get selected CUSTOMER_GROUPs from MultiInput tokens
                const aSelectedKeys = this.byId("idCustOPMIXP")
                    .getTokens()
                    .map(t => t.getKey());

                //  Clear previous selection SAFELY
                oDialog.getItems().forEach(function (oItem) {
                    oItem.setSelected(false);
                });

                if (!aSelectedKeys.length) return;

                //  Re-apply selection
                oDialog.getItems().forEach(function (oItem) {
                    const sKey = oItem.getTitle(); // CUSTOMER_GROUP
                    if (aSelectedKeys.includes(sKey)) {
                        oItem.setSelected(true);
                    }
                });
            },

            onConfirmSelection: function (oEvent) {
                var oSid = oEvent.getParameter("id")
                if (oSid.includes("idlocDialogOPMIXP")) {

                    // Clear dependent fields (NOT version & scenario)
                    this._clearField("idProdOPMIXP", false);
                    this._clearField("idCustOPMIXP", true);
                    this._clearField("idCharOPMIXP", true);
                    this._clearField("idCharValuOPMIXP", true);

                    const aSelectedLocItems = oEvent.getParameter("selectedItems");
                    const oMultiInput = this.byId("idLocOPMIXP");
                    oMultiInput.removeAllTokens();

                    aSelectedLocItems.forEach(item => {
                        oMultiInput.addToken(new sap.m.Token({
                            key: item.getTitle(),
                            text: item.getTitle()
                        }));
                    });

                    const aSelectedLocIDs = oMultiInput.getTokens().map(t => t.getKey());

                    const oFilData = that.oGModel.getProperty("/oFilterData");
                    const matchedProducts = oFilData.filter(item =>
                        aSelectedLocIDs.includes(item.DEMAND_LOC)
                    );

                    const oProducts = that.removeDuplicatesFilters(matchedProducts, "PRODUCT_ID");

                    sap.ui.getCore()
                        .byId("idprodDialogOPMIXP")
                        .setModel(new JSONModel({ items: oProducts }));
                }
                else if (oSid.includes("idprodDialogOPMIXP")) {

                    const oPdInput = oEvent.getParameter("selectedItems")[0].getTitle();
                    that.byId("idProdOPMIXP").setValue(oPdInput);
                    that.oPrd = oPdInput
                    that.oSeqOrder();

                    // Clear dependent fields (NOT version & scenario)
                    this._clearField("idCustOPMIXP", true);
                    this._clearField("idCharOPMIXP", true);
                    this._clearField("idCharValuOPMIXP", true);

                    const oFilData = that.oGModel.getProperty("/oFilterData");
                    const matchedChar = oFilData.filter(item =>
                        oPdInput.includes(item.PRODUCT_ID)
                    );

                    const oChar = that.removeDuplicatesFilters(matchedChar, "CHAR_NUM");

                    sap.ui.getCore()
                        .byId("idcharDialogOPMIXP")
                        .setModel(new JSONModel({ items: oChar }));
                }
                else if (oSid.includes("idCusDialogOPMIXP")) {

                    const oCustInput = this.byId("idCustOPMIXP");
                    oCustInput.removeAllTokens();

                    const aSelectedItems = oEvent.getParameter("selectedItems") || [];

                    aSelectedItems.forEach(function (oItem) {
                        oCustInput.addToken(new sap.m.Token({
                            key: oItem.getTitle(),
                            text: oItem.getTitle()
                        }));
                    });

                    // Clear dependent fields
                    this._clearField("idCharOPMIXP", true);
                    this._clearField("idCharValuOPMIXP", true);
                }

                else if (oSid.includes("idcharDialogOPMIXP")) {

                    const oMultiCharInput = this.byId("idCharOPMIXP");
                    oMultiCharInput.removeAllTokens();

                    const aFilterData = that.oGModel.getProperty("/oFinalChar") //that.oGModel.getProperty("/oFilterData") || [];
                    const sProduct = that.oGModel.getProperty("/oConfigPrd")  //that.byId("idProdOPMIXP").getValue();

                    const aSelectedItems = oEvent.getParameter("selectedItems") || [];

                    aSelectedItems.forEach(oItem => {

                        const oCtx = oItem.getBindingContext();
                        if (!oCtx) {
                            return;
                        }

                        const oObj = oCtx.getObject();

                        const sCharNum = String(oObj.CHAR_NUM);   //  backend key
                        const sCharDesc = oObj.CHAR_DESC;          //  UI text

                        oMultiCharInput.addToken(new sap.m.Token({
                            key: sCharNum,
                            text: sCharDesc
                        }));
                    });

                    // Clear Char Value field
                    this._clearField("idCharValuOPMIXP", true);

                    const aSelectedCharNums = oMultiCharInput
                        .getTokens()
                        .map(t => String(t.getKey()));

                    //  Filter Char Values by PRODUCT + CHAR_NUM
                    const matchedChar = aFilterData.filter(item =>
                        item.PRODUCT_ID === sProduct &&
                        aSelectedCharNums.includes(String(item.CHAR_NUM))
                    );

                    const oCharVal = that.removeDuplicatesFilters(
                        matchedChar,
                        "CHARVAL_NUM"
                    );
                    that.oGModel.setProperty("/oCharVals", oCharVal);

                    oCharVal.forEach(item => {
                        if (!item.CHARVAL_DESC || item.CHARVAL_DESC.trim() === "") {
                            item.CHARVAL_DESC = item.CHARVAL_NUM;
                        }
                    });

                    sap.ui.getCore()
                        .byId("idcharValDialogOPMIXP")
                        .setModel(new JSONModel({ items: oCharVal }));
                }

                else if (oSid.includes("idcharValDialogOPMIXP")) {

                    const oMultiCharValInput = this.byId("idCharValuOPMIXP");
                    oMultiCharValInput.removeAllTokens();

                    oEvent.getParameter("selectedItems").forEach(item => {
                        oMultiCharValInput.addToken(new sap.m.Token({
                            key: item.getDescription(), //  CHARVAL_NUM
                            text: item.getTitle()       // CHARVAL_DESC
                        }));
                    });

                    // -------- Version logic stays same ----------
                    const osProd = that.byId("idProdOPMIXP").getValue();
                    // const oFilData = that.oGModel.getProperty("/oFilterData");
                    const aFilterData = that.oGModel.getProperty("/oFilterData") || [];



                    const matchedChar = aFilterData.filter(item =>
                        osProd.includes(item.PRODUCT_ID)
                    );

                    const oVersion = that.removeDuplicatesFilters(matchedChar, "VERSION");

                    sap.ui.getCore()
                        .byId("idverDialogOPMIXP")
                        .setModel(new JSONModel({ items: oVersion }));
                }

                else if (oSid.includes("idverDialogOPMIXP")) {

                    const aSelectedItems = oEvent.getParameter("selectedItems");
                    if (!aSelectedItems || !aSelectedItems.length) {
                        return;
                    }

                    // Version is SINGLE value → Input / Select
                    const oVersionInput = this.byId("idVersionOPMIXP");

                    const oSelectedItem = aSelectedItems[0];

                    const sVersion = oSelectedItem.getTitle();        // display
                    const sVersionKey = oSelectedItem.getDescription(); // backend key (if needed)

                    //  Set value directly (NO TOKENS)
                    oVersionInput.setValue(sVersion);

                    // -------- Scenario logic ----------
                    const oFilData = that.oGModel.getProperty("/oFilterData") || [];

                    const matchedChar = oFilData.filter(item =>
                        item.VERSION === sVersion || item.VERSION === sVersionKey
                    );

                    const oVersion = that.removeDuplicatesFilters(matchedChar, "VERSION");

                    oVersion.forEach(item => {
                        if (!item.VERSION_NAME || item.VERSION_NAME === "") {
                            item.VERSION_NAME = item.VERSION;
                        }
                    });

                    const aVersionModel = new JSONModel({
                        items: oVersion
                    });

                    sap.ui.getCore()
                        .byId("idsceDialogOPMIXP")
                        .setModel(aVersionModel);
                }
                else if (oSid.includes("idsceDialogOPMIXP")) {

                    const aSelectedItems = oEvent.getParameter("selectedItems");
                    if (!aSelectedItems || !aSelectedItems.length) {
                        return;
                    }

                    // Scenario is SINGLE value → Input / Select
                    const oScenarioInput = this.byId("idScenarioOPMIXP");

                    const oSelectedItem = aSelectedItems[0];

                    const sScenarioName = oSelectedItem.getTitle();        // display
                    const sScenarioKey = oSelectedItem.getDescription();  // backend key

                    // Set value directly
                    oScenarioInput.setValue(sScenarioName);

                    // (Optional) store backend key if required later
                    oScenarioInput.data("SCENARIO", sScenarioKey);
                }

            },




            _clearField: function (sControlId, bIsMultiInput) {
                const oControl = this.byId(sControlId);
                if (!oControl) return;

                if (bIsMultiInput && oControl.removeAllTokens) {
                    oControl.removeAllTokens();
                } else if (oControl.setValue) {
                    oControl.setValue("");
                }
            },


            // oSeqOrder: function () {
            //     var oPartailProd = that.oPrd
            //     // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
            //     that.getOwnerComponent().getModel("oModel").read("/getPartialProduct", {
            //         // urlParameters: {
            //         //     PRODUCT_ID: oPartailProd
            //         // },
            //         filters: [new Filter(
            //             "PRODUCT_ID",
            //             FilterOperator.EQ,
            //             oPartailProd
            //         ),
            //         ],

            //         success: function (oData) {
            //             that.oGModel.setProperty("/oConf_ParProd", oData.results);
            //             var oConfigPrd = oData.results[0].REF_PRODID;
            //             that.oGModel.setProperty("/oConfigPrd", oConfigPrd);
            //             that.oModel.callFunction("/getCharGroupWeightage", {
            //                 urlParameters: {
            //                     PRODUCT_ID: oConfigPrd
            //                 },
            //                 success: function (oData) {
            //                     var oSeqData = JSON.parse(oData.getCharGroupWeightage)
            //                     oSeqData = oSeqData.filter(item => (item.CHAR_TYPE === "P"))

            //                     that.oGModel.setProperty("/oSeqData", oSeqData)

            //                 },
            //                 error: function (oData, error) {
            //                     sap.ui.core.BusyIndicator.hide();
            //                     MessageToast.show("error");
            //                 },
            //             });
            //         },
            //     });

            // },


            // 🔹 Called after internal model updates, small safe delay (or immediate)
            _applyDefaultsLater: function () {
                this._applyDefaults();
                that.onClear()
            },

            // 🔹 The real static default handler
            _applyDefaults: function () {
                var oSFB = this.byId("smartFilterBar");
                if (!oSFB) return;

                function setFixed(sKey, sValue) {
                    var oCtrl = oSFB.getControlByKey(sKey);
                    if (!oCtrl) return;

                    // --- For dropdowns (Select / ComboBox) ---
                    if (oCtrl.isA("sap.m.Select") || oCtrl.isA("sap.m.ComboBox")) {
                        if (oCtrl.getItems().length === 0) {
                            // Wait until dropdown items are ready
                            oCtrl.attachEventOnce("updateFinished", function () {
                                oCtrl.setSelectedKey(sValue);
                                // No fireChange() here — avoids recursion
                            });
                        } else {
                            oCtrl.setSelectedKey(sValue);
                        }
                    }
                    // --- For input fields (text) ---
                    else if (oCtrl.setValue) {
                        oCtrl.setValue(sValue);
                        // Trigger change once so SFB validates and marks as filled
                        oCtrl.fireChange({ value: sValue });
                    }
                }


                setFixed("VERSION_NAME", "Base Version");
                setFixed("SCENARIO_NAME", "_PLAN");
                setFixed("MODEL_VERSION", "Active");
            },

            onBeforeRendering: async function () {
                const that = this;

                // Load key figure master in parallel (independent)
                await that.oModel.read("/getKeyFigureMaster", {
                    success: function (oData) {
                        let data = oData.results;
                        that.oGModel.setProperty("/keyFigData", data);
                        that.ManualKeyArr = data.filter(f => f.KEY_FIG_ID == 3);
                    },
                    error: function (err) {
                        sap.m.MessageToast.show(err.message);
                    },
                });

                // Load global planning config
                await that.oModel.callFunction("/getGlobalPlanningConfig", {
                    success: function (oData) {
                        const data = JSON.parse(oData.getGlobalPlanningConfig);
                        if (data.MONTHS == 0 && data.QUARTER == 0) {
                            that.byId("idWeekTypeOPMIXP").setSelectedKey("CALENDAR_WEEK");
                        }
                    },
                    error: function (err) {
                        sap.m.MessageToast.show(err.message);
                    },
                });
            },


            /**
             * Utility: wrap OData read() in a Promise
             */
            _readAsync: function (model, path, urlParameters) {
                return new Promise((resolve, reject) => {
                    model.read(path, {
                        urlParameters,
                        success: resolve,
                        error: reject,
                    });
                });
            },

            /**
             * Utility: wrap OData callFunction() in a Promise
             */
            _callFunctionAsync: function (model, functionName, params) {
                return new Promise((resolve, reject) => {
                    model.callFunction(functionName, {
                        urlParameters: params,
                        success: resolve,
                        error: reject,
                    });
                });
            },


            loadHotKey: async function () {
                HandsontableKey = await that.getHandsontableKey();
            },

            getHandsontableKey: function () {
                var promise = new Promise((resolve, reject) => {
                    that.oModel.callFunction("/getHandsontableKey", {
                        success: function (params) {
                            resolve(params.getHandsontableKey);
                        },
                        error: function (err) {
                            reject(err.message);
                        },
                    });
                });
                return promise;
            },

            generateColSettings: function () {
                const table = sap.ui.getCore().byId("idDataTableOPMIXP");
                if (!that.settingData) {
                    that.settingData = that.fieldLabels.map((field) => {
                        const obj = {
                            field: field,
                            option: [
                                {
                                    key: "ID",
                                    text: "ID",
                                },
                                {
                                    key: "Description",
                                    text: "Description",
                                },
                                {
                                    key: "ID-Description",
                                    text: "ID-Description",
                                },
                            ],
                            select: that.staticColumns.includes(field),
                        };
                        if (field === "Customer Group") {
                            obj.option = [];
                        }
                        return obj;
                    });
                }
                var oModel = new JSONModel({
                    data: that.settingData,
                });
                table.setModel(oModel);
                that.checkSelect();
            },

            onCloseColSettings: function (params) {
                const selectItems = sap.ui
                    .getCore()
                    .byId("idDataTableOPMIXP")
                    .getSelectedItems(),
                    selectedFields = [],
                    selectedFieldsLabel = []
                if (params) {
                    var reason = params.getSource().getText();
                } else {
                    var reason = undefined
                }


                if ((reason == "OK") || (reason === undefined)) {
                    that.selectItems = selectItems;
                    selectItems.forEach((item) => {
                        let field = item.getBindingContext().getObject().field;
                        selectedFieldsLabel.push(field);
                        switch (field) {
                            case "Location":
                                field = "LOCATION";
                                break;
                            case "Product":
                                field = "PRODUCT";
                                break;
                            case "Class":
                                field = "CLASS";
                                break;
                            case "Characteristic":
                                field = "CHAR";
                                break;
                            case "Characteristic Value":
                                field = "CHARVAL";
                                break;
                            case "Version":
                                field = "VER";
                                break;
                            case "Scenario":
                                field = "SCEN";
                                break;
                            case "Type":
                                field = "TYPE";
                                break;
                            case "Customer Group":
                                field = "CUSTOMER_GROUP";
                            default:
                                break;
                        }
                        selectedFields.push({
                            data: field,
                            readOnly: false,
                            wordWrap: true,
                        });
                    });
                    selectedFieldsLabel.push("Key Figure");
                    selectedFields.push({
                        data: "KEY_FIG_DESC",
                        readOnly: false,
                        wordWrap: true,
                    });
                    if (selectedFields[2].data == "CUSTOMER_GROUP") {
                        var oCGroup = "Customer Group"
                        var oSelected = true
                        that.oGModel.setProperty("/CGroup", oCGroup)
                        that.oGModel.setProperty("/oSelected", oSelected)
                    } else {
                        var oCGroup = "Customer Group"
                        var oSelected = false
                        that.oGModel.setProperty("/CGroup", oCGroup)
                        that.oGModel.setProperty("/oSelected", oSelected)
                    }
                    that.staticColumns = selectedFieldsLabel;
                    that.staticRows = selectedFields;

                    var norKeyFig = that.oGModel.getProperty("/norKeyFig");
                    var calKeyFig = that.oGModel.getProperty("/calKeyFig");


                    // Extract labels dynamically -------------------------------------
                    function getDisableNorLabels(norData) {
                        return norData.items
                            .filter(item =>
                                item.label.includes("Forecast Order") ||
                                item.label.includes("Unconsumed")
                            )
                            .map(item => item.label);
                    }

                    function getDisableCalLabels(calData) {
                        return calData.items
                            .filter(item =>
                                item.label.includes("Forecast Order") ||
                                item.label.includes("Unconsumed")
                            )
                            .map(item => item.label);
                    }


                    // Read model data first
                    const norData = norKeyFig.oModels["$p13n"].getData();
                    const calData = calKeyFig.oModels["$p13n"].getData();


                    //  CREATE ARRAYS BEFORE USING THEM
                    const disableNorLabels = getDisableNorLabels(norData);
                    const disableCalLabels = getDisableCalLabels(calData);
                    that._originalNorVisibility = [];
                    that._originalCalVisibility = [];

                    // if (!that._originalNorVisibility) {
                    that._originalNorVisibility = norData.items.map(i => ({
                        label: i.label,
                        visible: i.visible,
                        enabled: i.enabled
                    }));
                    // }

                    // if (!that._originalCalVisibility) {
                    that._originalCalVisibility = calData.items.map(i => ({
                        label: i.label,
                        visible: i.visible,
                        enabled: i.enabled
                    }));
                    // }

                    function handleCustomerGroupNotPresent(NorKeyFigData, CalKeyFigData) {

                        // Restore NOR
                        NorKeyFigData.items.forEach(item => {
                            const orig = that._originalNorVisibility.find(o => o.label === item.label);
                            if (orig) {
                                item.visible = orig.visible;
                                item.enabled = orig.enabled;
                            }
                        });

                        NorKeyFigData.selectedItems =
                            NorKeyFigData.items.filter(i => i.visible).length;


                        // Restore CAL
                        CalKeyFigData.items.forEach(item => {
                            const orig = that._originalCalVisibility.find(o => o.label === item.label);
                            if (orig) {
                                item.visible = orig.visible;
                                item.enabled = orig.enabled;
                            }
                        });

                        CalKeyFigData.selectedItems =
                            CalKeyFigData.items.filter(i => i.visible).length;
                    }

                    function handleNoCustomerGroup(NorKeyFigData, CalKeyFigData) {

                        // Hide specific NOR labels
                        NorKeyFigData.items.forEach(item => {
                            if (disableNorLabels.includes(item.label)) {
                                item.visible = false;
                                item.enabled = false;
                            }
                        });

                        NorKeyFigData.selectedItems =
                            NorKeyFigData.items.filter(i => i.visible).length;


                        // Hide specific CAL labels
                        CalKeyFigData.items.forEach(item => {
                            if (disableCalLabels.includes(item.label)) {
                                item.visible = false;
                                item.enabled = false;
                            }
                        });

                        CalKeyFigData.selectedItems =
                            CalKeyFigData.items.filter(i => i.visible).length;
                    }


                    if (that.staticRows[2].data === "CUSTOMER_GROUP") {
                        handleNoCustomerGroup(norData, calData);
                    } else {
                        var oSelected = false

                        that.oGModel.setProperty("/oSelected", oSelected)
                        handleCustomerGroupNotPresent(norData, calData);
                    }

                    norKeyFig.oModels["$p13n"].setData(norData);
                    calKeyFig.oModels["$p13n"].setData(calData);

                    let rowCount = that.oFreshData.length;


                    // if (that.hot && that.hot.getSourceData().length > 0) {
                    // if (rowCount > 0) {
                    //     that.oSettingDialog.close();
                    //     if (that.anyVisible && !that.keyVisible) {

                    //         // that.onCloseColSettings();
                    //         // that.checkSelect();
                    //         that.loadData();

                    //     } else {
                    //         that.onTreeItemSelect();
                    //     }
                    // }

                    function shouldTriggerLoadData(norData, calData) {
                        const NOR_KEYS = [101, 102, 103, 151, 152, 153];
                        const CAL_KEYS = [994, 995, 998];

                        const norVisible = norData.items.some(item =>
                            NOR_KEYS.includes(item.key) && item.visible === true
                        );

                        const calVisible = calData.items.some(item =>
                            CAL_KEYS.includes(item.key) && item.visible === true
                        );

                        return norVisible || calVisible;
                    }


                    const triggerLoad =
                        shouldTriggerLoadData(norData, calData) &&
                        !that._loadDataTriggered;

                    if (triggerLoad) {
                        that._loadDataTriggered = true;   // 🔒 fire only once
                        // that.onTreeItemSelect();
                        var oAllKeyfigs = that.oCore.byId("idNorKeyFigureOPTMIXP").getP13nData();
                        var oCalcKeyfigs = that.oCore.byId("idCalKeyFigureOPMIXP").getP13nData();
                        // Combine both Normal and Calculated Key Figures
                        const allVisibleKeys = [...oAllKeyfigs, ...oCalcKeyfigs]
                            .filter(k => k.visible)
                            .map(k => k.key);
                        // const visibleKeys = oAllKeyfigs
                        //     .filter(k => k.visible)
                        //     .map(k => k.key);

                        const service1Keys = [
                            1, 51,
                            2, 52,
                            3,
                            1000, 1100,
                            1001, 1101
                        ];

                        const service2Keys = [
                            101, 151,
                            102, 152,
                            103, 153,
                            994, 995,
                            996, 998
                        ];

                        //    const ProdCalKeys = [
                        //     101, 151,
                        //     102, 152,
                        //     103, 153,
                        //     994, 995, 
                        //     996, 998
                        // ];

                        // const hasService1Keys =
                        //     visibleKeys.some(k => service1Keys.includes(k));

                        // const hasService2Keys =
                        //     visibleKeys.some(k => service2Keys.includes(k));

                        const hasService1Keys =
                            allVisibleKeys.some(k => service1Keys.includes(k));

                        const hasService2Keys =
                            allVisibleKeys.some(k => service2Keys.includes(k));
                        if (hasService1Keys && hasService2Keys) {

                            that.loadData();

                        } else {
                            that.onTreeItemSelect();
                        }

                        // let processedData = that.getOptPerData(that.oTalData);
                        // that.generateExcel(processedData, that.dates);
                        // that.loadData();
                        // that.byId("idDynamicPage2OPMIXP").setBusy(true);
                        // that.oTree.setBusy(true);
                    } else {
                        that.onTreeItemSelect();
                    }

                    that.oSettingDialog.close();
                } else {
                    that.oSettingDialog.close();
                }
            },

            onCloseColSettings1: function (params) {
                const selectItems = sap.ui
                    .getCore()
                    .byId("idDataTableOPMIXP")
                    .getSelectedItems(),
                    selectedFields = [],
                    selectedFieldsLabel = []
                if (params) {
                    var reason = params.getSource().getText();
                } else {
                    var reason = undefined
                }


                if ((reason == "OK") || (reason === undefined)) {
                    that.selectItems = selectItems;
                    selectItems.forEach((item) => {
                        let field = item.getBindingContext().getObject().field;
                        selectedFieldsLabel.push(field);
                        switch (field) {
                            case "Location":
                                field = "LOCATION";
                                break;
                            case "Product":
                                field = "PRODUCT";
                                break;
                            case "Class":
                                field = "CLASS";
                                break;
                            case "Characteristic":
                                field = "CHAR";
                                break;
                            case "Characteristic Value":
                                field = "CHARVAL";
                                break;
                            case "Version":
                                field = "VER";
                                break;
                            case "Scenario":
                                field = "SCEN";
                                break;
                            case "Type":
                                field = "TYPE";
                                break;
                            case "Customer Group":
                                field = "CUSTOMER_GROUP";
                            default:
                                break;
                        }
                        selectedFields.push({
                            data: field,
                            readOnly: false,
                            wordWrap: true,
                        });
                    });
                    selectedFieldsLabel.push("Key Figure");
                    selectedFields.push({
                        data: "KEY_FIG_DESC",
                        readOnly: false,
                        wordWrap: true,
                    });
                    if (selectedFields[2] == "Customer Group") {
                        var oCGroup = "Customer Group"
                        var oSelected = false
                        that.oGModel.setProperty("/CGroup", oCGroup)
                        that.oGModel.setProperty("/oSelected", oSelected)
                    }
                    that.staticColumns = selectedFieldsLabel;
                    that.staticRows = selectedFields;

                    var norKeyFig = that.oGModel.getProperty("/norKeyFig");
                    var calKeyFig = that.oGModel.getProperty("/calKeyFig");


                    // Extract labels dynamically -------------------------------------
                    function getDisableNorLabels(norData) {
                        return norData.items
                            .filter(item =>
                                item.label.includes("Forecast Order") ||
                                item.label.includes("Unconsumed")
                            )
                            .map(item => item.label);
                    }

                    function getDisableCalLabels(calData) {
                        return calData.items
                            .filter(item =>
                                item.label.includes("Forecast Order") ||
                                item.label.includes("Unconsumed")
                            )
                            .map(item => item.label);
                    }


                    // Read model data first
                    const norData = norKeyFig.oModels["$p13n"].getData();
                    const calData = calKeyFig.oModels["$p13n"].getData();


                    //  CREATE ARRAYS BEFORE USING THEM
                    const disableNorLabels = getDisableNorLabels(norData);
                    const disableCalLabels = getDisableCalLabels(calData);
                    that._originalNorVisibility = [];
                    that._originalCalVisibility = [];

                    // if (!that._originalNorVisibility) {
                    that._originalNorVisibility = norData.items.map(i => ({
                        label: i.label,
                        visible: i.visible,
                        enabled: i.enabled
                    }));
                    // }

                    // if (!that._originalCalVisibility) {
                    that._originalCalVisibility = calData.items.map(i => ({
                        label: i.label,
                        visible: i.visible,
                        enabled: i.enabled
                    }));
                    // }

                    function handleCustomerGroupNotPresent(NorKeyFigData, CalKeyFigData) {

                        // Restore NOR
                        NorKeyFigData.items.forEach(item => {
                            const orig = that._originalNorVisibility.find(o => o.label === item.label);
                            if (orig) {
                                item.visible = orig.visible;
                                item.enabled = orig.enabled;
                            }
                        });

                        NorKeyFigData.selectedItems =
                            NorKeyFigData.items.filter(i => i.visible).length;


                        // Restore CAL
                        CalKeyFigData.items.forEach(item => {
                            const orig = that._originalCalVisibility.find(o => o.label === item.label);
                            if (orig) {
                                item.visible = orig.visible;
                                item.enabled = orig.enabled;
                            }
                        });

                        CalKeyFigData.selectedItems =
                            CalKeyFigData.items.filter(i => i.visible).length;
                    }

                    function handleNoCustomerGroup(NorKeyFigData, CalKeyFigData) {

                        // Hide specific NOR labels
                        NorKeyFigData.items.forEach(item => {
                            if (disableNorLabels.includes(item.label)) {
                                item.visible = false;
                                item.enabled = false;
                            }
                        });

                        NorKeyFigData.selectedItems =
                            NorKeyFigData.items.filter(i => i.visible).length;


                        // Hide specific CAL labels
                        CalKeyFigData.items.forEach(item => {
                            if (disableCalLabels.includes(item.label)) {
                                item.visible = false;
                                item.enabled = false;
                            }
                        });

                        CalKeyFigData.selectedItems =
                            CalKeyFigData.items.filter(i => i.visible).length;
                    }


                    if (that.staticRows[2].data === "CUSTOMER_GROUP") {
                        handleNoCustomerGroup(norData, calData);
                    } else {
                        var oSelected = false

                        that.oGModel.setProperty("/oSelected", oSelected)
                        handleCustomerGroupNotPresent(norData, calData);
                    }

                    norKeyFig.oModels["$p13n"].setData(norData);
                    calKeyFig.oModels["$p13n"].setData(calData);

                    let rowCount = that.oFreshData.length;

                    // if (that.hot && that.hot.getSourceData().length > 0) {
                    if (rowCount > 0) {
                        that.oSettingDialog.close();

                        that.onTreeItemSelect();

                    }
                    that.oSettingDialog.close();
                } else {
                    that.oSettingDialog.close();
                }
            },

            onIconPress: function (oEvent) {
                const item = oEvent.getSource().getParent().getParent();
                const path = Number(item.getBindingContext().getPath().split("/")[2]);
                const icon = oEvent.getSource().getTooltip();
                ``;
                let newIndex;
                switch (icon) {
                    case "up":
                        newIndex = path - 1;
                        break;
                    case "top":
                        newIndex = 0;
                        break;
                    case "down":
                        newIndex = path + 1;
                        break;
                    case "bottom":
                        newIndex = that.settingData.length - 1;
                        break;
                    default:
                        console.log("Error");
                }
                const model = oEvent.getSource().getModel().getData();
                const newData = that.changeIndexPosition(model.data, path, newIndex);
                that.settingData = newData;
                var oModel = new JSONModel({
                    data: that.settingData,
                });
                sap.ui.getCore().byId("idDataTableOPMIXP").setModel(oModel);
                that.checkSelect();
            },

            changeIndexPosition: function (arr, oldIndex, newIndex) {
                // Check for valid indices
                if (newIndex >= arr.length) {
                    let k = newIndex - arr.length + 1;
                    while (k--) {
                        arr.push(undefined); // Add undefined values for out-of-bounds
                    }
                }
                // Remove the item from the old index and store it
                const [movedItem] = arr.splice(oldIndex, 1);

                // Insert the item at the new index
                arr.splice(newIndex, 0, movedItem);
                return arr;
            },

            // oTreeValues: function () {
            //     // debugger;
            //     that.TestData = [];
            //     var oPrd = that.byId("idProdOPMIXP").getValue();
            //     that.oModel.callFunction("/getCharLevelData", {
            //         urlParameters: {
            //             PRODUCT_ID: oPrd,
            //         },
            //         success: function (oData) {
            //             // debugger;
            //             that.TreeData = JSON.parse(oData.getCharLevelData);
            //         },
            //         error: function (err) {
            //             sap.ui.core.BusyIndicator.hide();
            //             MessageToast.show("Error Loading Characteristics Data");
            //         }
            //     });
            // },

            oTreeValues: function () {
                // debugger;
                that.TestData = [];
                var oPrd = that.byId("idProdOPMIXP").getValue();
                that.oModel.callFunction("/getCharLevelData", {
                    urlParameters: {
                        PRODUCT_ID: oPrd,
                    },
                    success: function (oData) {
                        // debugger;
                        that.TreeData = JSON.parse(oData.getCharLevelData);
                        that.oCharLvlData = [];
                        that.oCharLvlData = JSON.parse(oData.getCharLevelData);
                        if (that.TreeData.length === 0) {
                            that.byId("Independent").setEnabled(false);
                            that.byId("Dependent").setEnabled(false);
                            that.byId("Numeric").setEnabled(false);
                            that.byId("MultiSelect").setEnabled(false);
                            that.byId("Refresh").setEnabled(false);
                            var oPartailProd = that.oPrd
                            // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
                            that.getOwnerComponent().getModel("oModel").read("/getPartialProduct", {
                                // urlParameters: {
                                //     PRODUCT_ID: oPartailProd
                                // },
                                filters: [new Filter(
                                    "PRODUCT_ID",
                                    FilterOperator.EQ,
                                    oPartailProd
                                ),
                                ],

                                success: function (oData) {
                                    that.oGModel.setProperty("/oConf_ParProd", oData.results);
                                    var oConfigPrd = oData.results[0].REF_PRODID;
                                    that.oGModel.setProperty("/oConfigPrd", oConfigPrd);
                                    that.oModel.callFunction("/getCharGroupWeightage", {
                                        urlParameters: {
                                            PRODUCT_ID: oConfigPrd
                                        },
                                        success: function (oData) {
                                            var oSeqData = JSON.parse(oData.getCharGroupWeightage)
                                            oSeqData = oSeqData.filter(item => (item.CHAR_TYPE === "P"))

                                            that.oGModel.setProperty("/oSeqData", oSeqData)

                                            that.TreeData = oSeqData

                                            var aCharValues = that.oGModel.getProperty("/oCharVals");
                                            if (aCharValues && aCharValues.length > 0) {
                                                that.TreeData = that.TreeData.filter(r => {
                                                    var matched = aCharValues.find(c =>
                                                        r.CHAR_NUM === c.CHAR_NUM && r.CHAR_VALUE === c.CHAR_VALUE
                                                    );
                                                    if (matched) {
                                                        r.CHAR_VALUE = matched.CHAR_VALUE;
                                                        return true;
                                                    }
                                                    return false;
                                                });
                                            }

                                        },
                                        error: function (oData, error) {
                                            sap.ui.core.BusyIndicator.hide();
                                            MessageToast.show("error");
                                        },
                                    });
                                },
                            });
                        }
                        else {
                            that.byId("Independent").setEnabled(true);
                            that.byId("Dependent").setEnabled(true);
                            that.byId("Numeric").setEnabled(true);
                            that.byId("MultiSelect").setEnabled(true);
                            that.byId("Refresh").setEnabled(true);
                            var aCharValues = that.oGModel.getProperty("/oCharVals");
                            if (aCharValues && aCharValues.length > 0) {
                                that.TreeData = that.TreeData.filter(r => {
                                    var matched = aCharValues.find(c =>
                                        r.CHAR_NUM === c.CHAR_NUM && r.CHAR_VALUE === c.CHAR_VALUE
                                    );
                                    if (matched) {
                                        r.CHAR_VALUE = matched.CHAR_VALUE;
                                        return true;
                                    }
                                    return false;
                                });
                            }
                        }
                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Characteristics Data");
                    }
                });
            },

            oSeqOrder: function () {
                var oPartailProd = that.oPrd
                // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
                that.getOwnerComponent().getModel("oModel").read("/getPartialProduct", {
                    // urlParameters: {
                    //     PRODUCT_ID: oPartailProd
                    // },
                    filters: [new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        oPartailProd
                    ),
                    ],

                    success: function (oData) {
                        that.oGModel.setProperty("/oConf_ParProd", oData.results);
                        var oConfigPrd = oData.results[0].REF_PRODID;
                        that.oGModel.setProperty("/oConfigPrd", oConfigPrd);
                        that.oModel.callFunction("/getCharGroupWeightage", {
                            urlParameters: {
                                PRODUCT_ID: oConfigPrd
                            },
                            success: function (oData) {
                                var oSeqData = JSON.parse(oData.getCharGroupWeightage)
                                oSeqData = oSeqData.filter(item => (item.CHAR_TYPE === "P"))

                                that.oGModel.setProperty("/oSeqData", oSeqData)

                            },
                            error: function (oData, error) {
                                sap.ui.core.BusyIndicator.hide();
                                MessageToast.show("error");
                            },
                        });
                    },
                });

            },



            onGo: async function (evt) {
                try {
                    // Reset all data first
                    that.skip = 0;
                    that.oFlg = "";          
                    that.ocIbp = [];        
                    that.subAllData = [];    
                    that.oTalData = [];      
                    that.allData = [];  
                    that.oGo = true
                    that._loadDataTriggered = false; //  allow reload
                    // that.KeyfigsVisible = false
                    // that.keyVisible = false;
                    // that.Flag === ""

                    var oPrdVal = that.byId("idProdOPMIXP").getValue()
                    if (!oPrdVal) {
                        sap.m.MessageToast.show("Please select mandatory fields")
                        return false;
                    }
                    that.oTreeValues();
                    that.allData = [];
                    that.allSubData = [];
                    that.savedData = [];
                    that.cellChanges = [];
                    that.deleteChanges = [];
                    that.subCellChanges = [];
                    that.commentChanges = [];
                    that.staticColumns = [
                        "Location",
                        "Product",
                        "Customer Group",
                        "Characteristic",
                        "Characteristic Value",
                        "Key Figure",
                    ];
                    that.staticRows = [
                        { data: "LOCATION", readOnly: false, wordWrap: true },
                        { data: "PRODUCT", readOnly: false, wordWrap: true },
                        { data: "CUSTOMER_GROUP", readOnly: false, wordWrap: true },
                        { data: "CHAR", readOnly: false, wordWrap: true },
                        { data: "CHARVAL", readOnly: false, wordWrap: true },
                        { data: "KEY_FIG_DESC", readOnly: false, wordWrap: true },
                    ];

                    // var existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                    // if (existingDiv.children.length > 0) {
                    //     while (existingDiv.firstChild) {
                    //         existingDiv.removeChild(existingDiv.firstChild);
                    //     }
                    // }
                    // var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                    // if (existingDiv.children.length > 0) {
                    //     while (existingDiv.firstChild) {
                    //         existingDiv.removeChild(existingDiv.firstChild);
                    //     }
                    // }
                    if (that.byId("idCharOPMIXP").getTokens().length == 0) {
                        that.oGModel.setProperty("/oCharVals", []);
                    }
                    that.byId("idSearchFieldOPMIXP").setValue("");
                    // that.byId("idPri").setEnabled(true);
                    that.byId("idWeekTypeOPMIXP").setEnabled(true);
                    // var filters = that.byId("smartFilterBar").getFilters();
                    var versionValue = this.byId("idVersionOPMIXP").getValue();
                    var scenarioValue = this.byId("idScenarioOPMIXP").getValue();

                    that.byId("idVerInputOPMIXP").setValue(versionValue);
                    that.byId("idScenInputOPMIXP").setValue(scenarioValue);
                    that.oPrd = that.byId("idProdOPMIXP").getValue() //productValue
                    that.oSeqOrder();


                    this.oTree.setBusy(true);
                    this.byId("idDynamicPage2OPMIXP").setBusy(true);


                    // Execute functions sequentially
                    console.log("Starting loadFirmFrozenData...");
                    await that.loadFirmFrozenData();
                    // that.loadFirmFrozenData()
                    console.log("loadFirmFrozenData completed");
                    that.o_MRols();
                    that.oCustomerGrp();
                    // if (that.oConfirm) {
                    that.generateKeyFigSettings();
                    // }

                    // that.onCloseColSettings();



                    console.log("Starting loadSubData...");
                    await that.loadSubData();
                    console.log("loadSubData completed");

                    console.log("Starting loadLockComments...");
                    await that.loadLockComments();
                    console.log("loadLockComments completed");

                    console.log("Starting loadData...");
                    that.oGModel.setProperty("/TreeItemSelectForSel", "");
                    // that.loadData(evt);
                    // console.log("loadData completed");

                    that.oAllDerivedNodes();



                    // that.saveDefaultVariant();
                    console.log("All functions completed successfully");
                } catch (error) {
                    console.error("Error in onGo:", error);
                    MessageToast.show("Error: " + error.message);
                }
            },

            o_MRols: function () {
                that.oMRoles = [];
                // var oLoc = that.byId("idLocOPMIXP").getValue()
                function getTokenKeys(aTokens) {
                    return aTokens.map(function (token) {
                        return token.getKey();   // or token.getText()
                    });
                }
                var oLoc = getTokenKeys(that.byId("idLocOPMIXP").getTokens());
                var oPrd = that.byId("idProdOPMIXP").getValue()
                var fFilter = new Filter({
                    filters: [
                        // new Filter("USER", FilterOperator.EQ, "rajeshramagiri@sbpcorp.in"),
                        new Filter("USER", FilterOperator.EQ, that.sUser),
                        new Filter("DEMAND_LOC", FilterOperator.EQ, oLoc),
                        new Filter("PRODUCT_ID", FilterOperator.EQ, oPrd)
                    ],
                    and: true
                });
                that.getOwnerComponent().getModel("oModel").read("/getRolesAccess", {
                    filters: [fFilter],
                    success: function (oData) {
                        that.oMRoles = oData.results;
                        if (that.oMRoles && that.oMRoles.length > 0) {
                            if (that.oMRoles[0].CREATE == true || that.oMRoles[0].UPDATE == true) {
                                that.byId("idSaveOPMIXP").setVisible(true);
                            } else {
                                that.byId("idSaveOPMIXP").setVisible(false);
                            }
                        }


                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Products Data");
                    }
                });
            },

            oCustomerGrp: function () {
                const Customertable = sap.ui.getCore().byId("idDataTableOPMIXP");
                var oSelections = [
                    {
                        "field": "Location",
                        "option": [
                            {
                                "key": "ID",
                                "text": "ID"
                            },
                            {
                                "key": "Description",
                                "text": "Description"
                            },
                            {
                                "key": "ID-Description",
                                "text": "ID-Description"
                            }
                        ],
                        "select": true
                    },
                    {
                        "field": "Product",
                        "option": [
                            {
                                "key": "ID",
                                "text": "ID"
                            },
                            {
                                "key": "Description",
                                "text": "Description"
                            },
                            {
                                "key": "ID-Description",
                                "text": "ID-Description"
                            }
                        ],
                        "select": true
                    },
                    {
                        "field": "Customer Group",
                        "option": [],
                        "select": true
                    },
                    {
                        "field": "Characteristic",
                        "option": [
                            {
                                "key": "ID",
                                "text": "ID"
                            },
                            {
                                "key": "Description",
                                "text": "Description"
                            },
                            {
                                "key": "ID-Description",
                                "text": "ID-Description"
                            }
                        ],
                        "select": true
                    },
                    {
                        "field": "Characteristic Value",
                        "option": [
                            {
                                "key": "ID",
                                "text": "ID"
                            },
                            {
                                "key": "Description",
                                "text": "Description"
                            },
                            {
                                "key": "ID-Description",
                                "text": "ID-Description"
                            }
                        ],
                        "select": true
                    }
                ]
                var oModel = new JSONModel({
                    data: oSelections,
                });
                Customertable.setModel(oModel);
            },

            oPartialProducts: function () {
                that.oPProduct = [];
                var topCount = 50000;
                that.getOwnerComponent().getModel("oModel").read("/getfactorylocdesc", {
                    // filters: [fFilter],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
                        //  $apply:
                        //     "groupby((FACTORY_LOC,LOCATION_DESC,PRODUCT_ID,PROD_DESC))"

                    },
                    success: function (oData) {
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.oPProduct = that.oPProduct.concat(oData.results);
                            that.oPartialProducts(that.fFilter);
                        } else {
                            that.skip = 0;
                            that.oPProduct = that.oPProduct.concat(oData.results);
                        }
                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Products Data");
                    }
                });
            },

            loadFirmFrozenData: async function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                        const oWeekTypeKey = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                        const oFilters = [
                            new Filter("PARAMETER_ID", FilterOperator.EQ, 1), // Frozen Horizon
                            new Filter("PARAMETER_ID", FilterOperator.EQ, 9), // Firm Horizon
                        ];
                        // var oSmartFilterBar = that.byId("smartFilterBar");
                        var aProductVal = that.byId("idProdOPMIXP").getValue();


                        // Example usage
                        var productValue = aProductVal//getProductValue(aFilters);

                        // Step 2: Filter Prods array
                        let filteredProds = that.oPProduct.filter(p => p.PRODUCT_ID === productValue);

                        // Step 3: Remove duplicates by LOCATION_ID
                        let uniqueProds = filteredProds.filter(
                            (item, index, self) =>
                                index === self.findIndex(
                                    (t) => t.FACTORY_LOC === item.FACTORY_LOC && t.PRODUCT_ID === item.PRODUCT_ID
                                )
                        );

                        // Step 4: You now have unique list
                        // console.log("Unique products by location:", uniqueProds);

                        let results = await getFirmFrozenData(oFilters);
                        const locations = uniqueProds || []
                        // that.smartFilterBar.getFilterData().LOCATION_ID?.items || [];
                        if (locations.length === 0) {
                            resolve();
                            return;
                        }

                        // Map to group data by LOCATION_ID
                        const groupedData = locations.map((loc) => {
                            const locationData = results.filter(
                                (f) => f.LOCATION_ID === loc.FACTORY_LOC //loc.key
                            );
                            const firmHorizon =
                                locationData.find((f) => f.PARAMETER_ID === 9)?.VALUE || "0";
                            const frozenHorizon =
                                locationData.find((f) => f.PARAMETER_ID === 1)?.VALUE || "0";
                            return {
                                LOCATION_ID: loc.FACTORY_LOC, //loc.key,
                                FIRM_HORIZON: firmHorizon,
                                FROZEN_HORIZON: frozenHorizon,
                            };
                        });

                        // Find the LOCATION_ID with the maximum Frozen Horizon
                        const maxFrozenHorizonData = groupedData.reduce(
                            (max, current) =>
                                parseInt(current.FROZEN_HORIZON, 10) >
                                    parseInt(max.FROZEN_HORIZON, 10)
                                    ? current
                                    : max,
                            groupedData[0]
                        );
                        const fozenMonDay = that.giveNextMondays(
                            new Date(),
                            Number(maxFrozenHorizonData.FROZEN_HORIZON),
                            0
                        );
                        const firmMonDay = that.giveNextMondays(
                            new Date(),
                            Number(maxFrozenHorizonData.FIRM_HORIZON),
                            0
                        );

                        // Convert fozenMonDay forEach to for loop
                        for (let i = 0; i < fozenMonDay.length; i++) {
                            let foundObj = totalDates.find((f) => that.convertDate(f.WEEK_STARTDATE, "-") <= fozenMonDay[i] && that.convertDate(f.WEEK_ENDDATE, "-") >= fozenMonDay[i]);
                            fozenMonDay[i] = foundObj[oWeekTypeKey];
                        }

                        // Convert firmMonDay forEach to for loop
                        for (let i = 0; i < firmMonDay.length; i++) {
                            let foundObj = totalDates.find((f) => that.convertDate(f.WEEK_STARTDATE, "-") <= firmMonDay[i] && that.convertDate(f.WEEK_ENDDATE, "-") >= firmMonDay[i]);
                            firmMonDay[i] = foundObj[oWeekTypeKey];
                        }

                        maxFrozenHorizonData.fozenMonDay = fozenMonDay;
                        maxFrozenHorizonData.firmMonDay = firmMonDay;
                        // Optionally, update your model with the result
                        that.oGModel.setProperty("/firmFrozenData", maxFrozenHorizonData);
                        resolve();
                    } catch (error) {
                        console.error("Error in loadFirmFrozenData:", error);
                        MessageToast.show(error);
                        reject(error);
                    }
                });

                function getFirmFrozenData(oFilters) {
                    return new Promise((resolve, reject) => {
                        that.oModel.read("/V_Parameters", {
                            filters: oFilters,
                            success(oData) {
                                resolve(oData.results);
                            },
                            error(err) {
                                reject(
                                    new Error(err.message || "Failed to load firm frozen data")
                                );
                            },
                        });
                    });
                }
            },

            loadSubData: async function () {
                return new Promise(async (resolve, reject) => {
                    try {

                        // --- Build base query ---
                        function getTokenKeys(aTokens) {
                            return aTokens.map(function (token) {
                                return token.getKey();   // or token.getText()
                            });
                        }
                        var oLocation = getTokenKeys(that.byId("idLocOPMIXP").getTokens());
                        var oProduct = that.byId("idProdOPMIXP").getValue();
                        var oCustomer = getTokenKeys(that.byId("idCustOPMIXP").getTokens());
                        var oVersionname = that.byId("idVersionOPMIXP").getValue()
                        var oScenarioname = that.byId("idScenarioOPMIXP").getValue()


                        // var aVersionData = that.oGModel.getProperty("/aVersion")

                        // var matchedVersion = aVersionData.find(function (item) {
                        //     return item.VERSION_NAME === oVersionname;
                        // });
                        // var finalVersion = matchedVersion ? matchedVersion.VERSION : null;
                        // that.oGModel.setProperty("/finalVersion", finalVersion);

                        // // var matchedVersion = aVersionData.find(v => v.VERSION_NAME === oVersionname);
                        // var aScenarioData = that.oGModel.getProperty("/aScenario")
                        // var matchedScenario = aScenarioData.find(function (item) {
                        //     return item.SCENARIO_NAME === oScenarioname;
                        // });

                        // var finalScenario = matchedScenario ? matchedScenario.SCENARIO : null;
                        // that.oGModel.setProperty("/finalScenario", finalScenario);
                        // var matchedVersion = aScenarioData.find(v => v.VERSION_NAME === oScenarioname);

                        const aVersionData = that.oGModel.getProperty("/aVersion") || [];
                        const aScenarioData = that.oGModel.getProperty("/aScenario") || [];

                        const finalVersion =
                            aVersionData.find(v => v.VERSION_NAME === oVersionname)?.VERSION || "__BASELINE";

                        const finalScenario =
                            aScenarioData.find(s => s.SCENARIO_NAME === oScenarioname)?.SCENARIO || "_PLAN";

                        that.oGModel.setProperty("/finalVersion", finalVersion);
                        that.oGModel.setProperty("/finalScenario", finalScenario);

                        that.oChangedFilters = {
                            LOCATION_ID: oLocation,     // array of location IDs
                            PRODUCT_ID: oProduct ? [oProduct] : [],   // convert to array
                            CUSTOMER_GROUP: oCustomer,  // array
                            VERSION: finalVersion,          // array
                            SCENARIO: finalScenario         // array
                        };

                        // that.oGModel.setProperty("/oFilterspas", that.oChangedFilters)

                        let groupbyFields = [
                            "LOCATION_ID",
                            "PRODUCT_ID",
                            "CUSTOMER_GROUP",
                            "VERSION",
                            "SCENARIO",
                            "WEEK_STARTDATE"
                        ],
                            measures = [{ field: "OPT_QTY", operation: "sum" }];

                        let baseApplyQuery = that.getApplyQueryForFields(groupbyFields, measures);

                        // --- Build final apply query with filters ---
                        let finalApplyQuery = this.buildFinalApplyQuery(that.oChangedFilters, baseApplyQuery);

                        let urlparams = {
                            $apply: finalApplyQuery,
                        };

                        that.urlparams = urlparams;


                        // --- Proceed with data loading ---
                        that.getFilteredSubData();

                        resolve();
                    } catch (error) {
                        console.error("Error in loadSubData:", error);
                        MessageToast.show(error);
                        reject(error);
                    }
                });
            },

            // getFilteredSubData: function () {
            //     // return new Promise((resolve, reject) => {
            //     var topCount = 50000
            //     if (that.oFlg === "more") {
            //         // do nothing
            //     } else { that.ocIbp = [] }

            //     var urlparams = that.urlparams
            //     // var urlparams = { "$apply": "filter(TYPE eq 997 and LOCATION_ID eq '1600' and PRODUCT_ID eq 'VCP_1600' and VERSION eq '__BASELINE' and SCENARIO eq '_PLAN')/groupby((LOCATION_ID,PRODUCT_ID,CUSTOMER_GROUP,VERSION,SCENARIO,WEEK_STARTDATE),aggregate(OPT_QTY with sum as OPT_QTY_SUM))" }
            //     const oUrlParams = Object.assign({}, urlparams, {
            //         "$skip": that.skip,
            //         "$top": topCount  // default top value for safety
            //     });
            //     that.aModel.read("/getFinalOptionPercentages", {
            //         urlParameters: oUrlParams,
            //         success: function (oData) {
            //             // resolve(oData.results);
            //             if (topCount == oData.results.length) {
            //                 that.oFlg = "more"

            //                 that.skip += (topCount);
            //                 that.ocIbp = that.ocIbp.concat(oData.results);
            //                 that.getFilteredSubData();
            //             } else {
            //                 that.skip = 0;

            //                 that.ocIbp = that.ocIbp.concat(oData.results);
            //                 that.subAllData = that.ocIbp
            //                 that.subAllData.map((d) => {
            //                     // Only rename OPT_QTY_SUM if it exists
            //                     if (d.hasOwnProperty("OPT_QTY_SUM")) {
            //                         d.OPT_QTY = d.OPT_QTY_SUM;
            //                         delete d.OPT_QTY_SUM;
            //                     }
            //                 });
            //                 //  resolve(that.ocIbp);

            //             }
            //         },
            //         error: function (err) {
            //             reject(new Error(err.message || "Failed to load sub data"));
            //         },
            //     });
            //     // });
            // },

              getFilteredSubData: function () {
 
                var topCount = 50000;
 
                that.subAllData = [];
 
                // Fresh GO/request
                if (that.skip === 0) {
                    that.ocIbp = [];
                    that.oFlg = "";
                }
 
                var urlparams = that.urlparams;
 
                const oUrlParams = Object.assign({}, urlparams, {
                    "$skip": that.skip,
                    "$top": topCount
                });
 
                that.aModel.read("/getFinalOptionPercentages", {
                    urlParameters: oUrlParams,
 
                    success: function (oData) {
 
                        if (topCount == oData.results.length) {
 
                            that.oFlg = "more";
 
                            that.skip += topCount;
 
                            that.ocIbp = that.ocIbp.concat(oData.results);
 
                            that.getFilteredSubData();
 
                        } else {
 
                            that.skip = 0;
 
                            that.ocIbp = that.ocIbp.concat(oData.results);
 
                            that.subAllData = that.ocIbp;
 
                            that.subAllData.map((d) => {
                                if (d.hasOwnProperty("OPT_QTY_SUM")) {
                                    d.OPT_QTY = d.OPT_QTY_SUM;
                                    delete d.OPT_QTY_SUM;
                                }
                            });
                        }
                    },
 
                    error: function (err) {
                        reject(new Error(err.message || "Failed to load sub data"));
                    }
                });
            },
 


            loadLockComments: async function (params) {
                return new Promise(async (resolve, reject) => {
                    try {
                        const changeFilter = that.removeWeekStartDate(
                            that.oGModel.getProperty("/oFilterspas") //  this.byId("smartFilterBar").getFilters()
                        );
                        const lockComments = await getFilteredData(changeFilter);
                        that.lockComments = lockComments;
                        that.oGModel.setProperty("/manualOptionData", lockComments);
                        resolve();
                    } catch (error) {
                        console.error("Failed to load lock comments:", error);
                        reject(error);
                    }
                });

                function getFilteredData(filters) {
                    return new Promise((resolve, reject) => {
                        var topCount = 50000;
                        that.oModel.read("/getManualOptionData", {
                            // filters,
                            filters: [
                                new sap.ui.model.Filter(
                                    "LOCATION_ID",
                                    sap.ui.model.FilterOperator.EQ,
                                    that.byId("idLocOPMIXP").getTokens()[0].getKey()
                                ),
                                new sap.ui.model.Filter(
                                    "PRODUCT_ID",
                                    sap.ui.model.FilterOperator.EQ,
                                    that.byId("idProdOPMIXP").getValue()
                                )
                            ],
                            urlParameters: {
                                "$skip": that.skip,
                                "$top": topCount
                                // LOCATION_ID: that.byId("idLocOPMIXP").getTokens()[0].getText(),
                                // PRODUCT_ID: that.byId("idProdOPMIXP").getValue()

                            },
                            success: function (oData) {
                                resolve(oData.results);
                                var oLocation = that.byId("idLocOPMIXP").getTokens()[0].getText();
                                var oProduct = that.byId("idProdOPMIXP").getValue();
                                var oType2 = oData.results.filter(item =>
                                    (item.TYPE === 2 || item.TYPE === "2") &&
                                    item.LOCATION_ID === oLocation &&
                                    item.PRODUCT_ID === oProduct
                                );
                                var oDateRange = that.byId("idWeekDateOPMIXP")
                                var from_date = oDateRange.getValue().split(" - ")[0];
                                var to_date = oDateRange.getValue().split(" - ")[1];
                                var oVersion = that.oGModel.getProperty("/finalVersion");
                                var oScenario = that.oGModel.getProperty("/finalScenario");
                                var oModelVersion = that.byId("idModelVerOPMIXP").getSelectedKey()

                                if (oType2.length === 0) {
                                    that.oModel.callFunction("/getStaticToDerivedData", {
                                        method: "GET",
                                        urlParameters: {
                                            LOCATION_ID: oLocation,
                                            PRODUCT_ID: oProduct,
                                            FROM_DATE: from_date,
                                            TO_DATE: to_date,
                                            VERSION: oVersion,
                                            SCENARIO: oScenario,
                                            MODEL_VERSION: oModelVersion
                                        },
                                        success: function (oData) {
                                            // that.onGo();

                                            that.loadData();
                                            console.log("loadData completed");
                                        }
                                    });
                                } else {
                                    that.loadData();
                                    console.log("loadData completed");
                                }

                            },
                            error: function (err) {
                                reject(
                                    new Error(err.message || "Failed to load lock comments")
                                );
                            },
                        });
                    });
                }
            },


            giveNextMondays(startDate, count, skip = 0) {
                if (count == 0) return [];
                // Validate inputs
                if (!startDate || isNaN(new Date(startDate).getTime())) {
                    throw new Error("Invalid start date");
                }
                if (!Number.isInteger(count) || count < 1) {
                    throw new Error("Count must be a positive integer");
                }
                if (!Number.isInteger(skip) || skip < 0) {
                    throw new Error("Skip must be a non-negative integer");
                }

                const result = [];
                let currentDate = new Date(startDate);

                // // Find the next Monday from the start date
                // while (currentDate.getDay() !== 1) {
                //     // 1 represents Monday
                //     currentDate.setDate(currentDate.getDate() + 1);
                // }

                // Skip the specified number of Mondays
                currentDate.setDate(currentDate.getDate() + 7 * skip);

                // Get the specified number of Mondays
                for (let i = 0; i < count; i++) {
                    result.push(new Date(currentDate));
                    // Move to next Monday
                    currentDate.setDate(currentDate.getDate() + 7);
                }

                // Format dates to readable strings
                return result.map((date) => date.toISOString().split("T")[0]);
            },

            selectPriorityChek() {
                that.saveTreeState();
                that.loadData();
            },

            removeWeekStartDate(obj) {
                // Handle arrays
                if (Array.isArray(obj)) {
                    const filteredArray = obj
                        .map((item) => that.removeWeekStartDate(item))
                        .filter((item) => item !== null);
                    return filteredArray;
                }

                // Handle objects
                if (obj && typeof obj === "object") {
                    // If this object has sPath: "WEEK_STARTDATE", remove it entirely
                    if (obj.sPath === "WEEK_STARTDATE") {
                        return null;
                    }

                    const newObj = {};

                    for (const [key, value] of Object.entries(obj)) {
                        const processedValue = that.removeWeekStartDate(value);

                        // Handle aFilters array specifically - if it becomes empty, remove the entire filter object
                        if (
                            key === "aFilters" &&
                            Array.isArray(processedValue) &&
                            processedValue.length === 0
                        ) {
                            return null;
                        }

                        // Only add the key-value pair if the processed value is not null
                        if (processedValue !== null) {
                            newObj[key] = processedValue;
                        }
                    }

                    return newObj;
                }

                // Return primitive values as-is
                return obj;
            },

            handleVerScenFilter: function (aFilters) {
                var oVersionFilter = null;
                var oScenarioFilter = null;
                var oModelVersionFilter = null;
                var aCleanedFilters = [];

                if (aFilters && aFilters.length > 0) {
                    // Safely remove unwanted filters and store special ones
                    aFilters[0].aFilters.forEach(function (oFilter) {
                        if (oFilter.sPath === "VERSION") {
                            oVersionFilter = oFilter;
                        } else if (oFilter.sPath === "SCENARIO") {
                            oScenarioFilter = oFilter;
                        } else if (oFilter.sPath === "MODEL_VERSION") {
                            oModelVersionFilter = oFilter;
                        } else if (oFilter.sPath !== "VERSION_NAME" && oFilter.sPath !== "SCENARIO_NAME") {
                            // Remove VERSION_NAME and SCENARIO_NAME filters
                            aCleanedFilters.push(oFilter);
                        }
                    });
                }

                // Create the cleaned base filter
                var oMainFilter = new Filter({
                    filters: aCleanedFilters,
                    and: true,
                });

                // Additional filters array
                var aAdditionalFilters = [];

                // VERSION filter (add EMPTY_VER)
                if (oVersionFilter) {
                    aAdditionalFilters.push(
                        new Filter({
                            filters: [
                                oVersionFilter,
                                new Filter("VERSION", FilterOperator.EQ, "EMPTY_VER"),
                            ],
                            and: false,
                        })
                    );
                }

                // SCENARIO filter (add EMPTY_SCEN)
                if (oScenarioFilter) {
                    aAdditionalFilters.push(
                        new Filter({
                            filters: [
                                oScenarioFilter,
                                new Filter("SCENARIO", FilterOperator.EQ, "EMPTY_SCEN"),
                            ],
                            and: false,
                        })
                    );
                }

                // MODEL_VERSION filter (add EMPTY_MV)
                if (oModelVersionFilter) {
                    aAdditionalFilters.push(
                        new Filter({
                            filters: [
                                oModelVersionFilter,
                                new Filter("MODEL_VERSION", FilterOperator.EQ, "EMPTY_MV"),
                            ],
                            and: false,
                        })
                    );
                }

                // Combine all filters (AND between groups)
                var aFinalFilters = [oMainFilter].concat(aAdditionalFilters);
                var oCombinedFilter = new Filter({
                    filters: aFinalFilters,
                    and: true,
                });

                return oCombinedFilter;
            },

            getApplyQueryForFields(groupbyFields, measures) {
                // Build groupby clause
                let groupByClause = groupbyFields.join(",");

                // Build aggregate clause with proper lowercase operations
                let aggregateClause = measures
                    .map((measure) => {
                        // Ensure operation is lowercase as per OData standard
                        let operation = measure.operation.toLowerCase();
                        return `${measure.field} with ${operation} as ${measure.field
                            }_${operation.toUpperCase()}`;
                    })
                    .join(",");

                // Build base apply query
                let applyQuery = `groupby((${groupByClause}),aggregate(${aggregateClause}))`;

                return applyQuery;
            },

            getFilterApplyQuery(filtersToApply) {
                const FilterOperator = {
                    EQ: "EQ",
                    NE: "NE",
                    LT: "LT",
                    LE: "LE",
                    GT: "GT",
                    GE: "GE",
                    BT: "BT", // Between
                    Contains: "Contains",
                    StartsWith: "StartsWith",
                    EndsWith: "EndsWith",
                };

                // Main logic for getFinalApply
                let finalQuery = "";

                // Handle different filter input formats
                let processedFilters = [];
                if (filtersToApply && filtersToApply.length > 0) {
                    // If it's a single combined filter object with aFilters property
                    if (filtersToApply.length === 1 && filtersToApply[0].aFilters) {
                        processedFilters = filtersToApply[0].aFilters;
                    } else {
                        processedFilters = filtersToApply;
                    }

                    let filterString = buildFilterString(processedFilters, true);
                    if (filterString) {
                        // Only add filter part if a filter string was generated
                        finalQuery = `filter(${filterString})`;
                    }
                }

                return finalQuery;

                /**
                 * Recursively builds filter string with proper connector logic
                 * @param {Array} currentLevelFilters - Array of filter objects at current level
                 * @param {boolean} isTopLevel - Whether this is the top level
                 * @returns {string} - Built filter string
                 */
                function buildFilterString(currentLevelFilters, isTopLevel = false) {
                    if (!currentLevelFilters || currentLevelFilters.length === 0) {
                        return "";
                    }

                    let filterExpressions = [];

                    for (let i = 0; i < currentLevelFilters.length; i++) {
                        let filter = currentLevelFilters[i];

                        // Check if this filter has nested filters (aFilters property)
                        if (filter.aFilters && filter.aFilters.length > 0) {
                            // Handle nested filters recursively
                            let nestedFilterString = buildFilterString(
                                filter.aFilters,
                                false
                            );

                            if (nestedFilterString) {
                                // FIXED: Proper connector logic based on bAnd property
                                // If bAnd is explicitly false, use OR; otherwise default to AND
                                let groupConnector = filter.bAnd === false ? " or " : " and ";

                                // For nested groups with multiple conditions, determine if wrapping is needed
                                let needsWrapping = false;
                                if (filter.aFilters.length > 1) {
                                    // Always wrap multiple conditions in parentheses
                                    needsWrapping = true;
                                } else if (
                                    nestedFilterString.includes(" and ") ||
                                    nestedFilterString.includes(" or ")
                                ) {
                                    // Wrap if the nested string already contains connectors
                                    needsWrapping = true;
                                }

                                if (needsWrapping) {
                                    filterExpressions.push(`(${nestedFilterString})`);
                                } else {
                                    filterExpressions.push(nestedFilterString);
                                }
                            }
                        } else {
                            // Handle single filter condition (leaf node)
                            let singleExpression = buildSingleFilterExpression(filter);
                            if (singleExpression) {
                                filterExpressions.push(singleExpression);
                            }
                        }
                    }

                    // Join expressions at current level
                    if (filterExpressions.length === 0) {
                        return "";
                    } else if (filterExpressions.length === 1) {
                        return filterExpressions[0];
                    } else {
                        // FIXED: For multiple expressions at the same level
                        // At top level, always use AND unless explicitly specified otherwise
                        let connector = " and ";

                        // Check if we need to use OR at this level
                        // This would happen if all filters at this level are for the same field
                        // and should be OR'ed together
                        let fieldsAtThisLevel = filterExpressions
                            .map((expr, idx) => {
                                let filter = currentLevelFilters[idx];
                                return filter && filter.sPath ? filter.sPath : null;
                            })
                            .filter((path) => path !== null);

                        // If we have multiple filters for the same field at this level, use OR
                        let uniqueFields = [...new Set(fieldsAtThisLevel)];
                        if (
                            fieldsAtThisLevel.length > 1 &&
                            uniqueFields.length < fieldsAtThisLevel.length
                        ) {
                            connector = " or ";
                        }

                        return filterExpressions.join(connector);
                    }
                }

                /**
                 * Builds a single filter expression for leaf-level filters
                 * @param {Object} filter - Single filter object
                 * @returns {string} - OData filter expression
                 */
                function buildSingleFilterExpression(filter) {
                    // Skip if essential properties are missing
                    if (!filter.sPath || filter.sOperator === undefined) {
                        console.warn(
                            "Skipping filter due to missing sPath or sOperator:",
                            filter
                        );
                        return "";
                    }

                    let operator = getODataOperator(filter.sOperator);
                    let value1 = filter.oValue1;
                    let value2 = filter.oValue2; // Get the second value for BT operator
                    let path = filter.sPath;

                    // Skip if primary value is missing (except for certain operators that might not need values)
                    if (value1 === undefined || value1 === null) {
                        console.warn("Skipping filter due to missing oValue1:", filter);
                        return "";
                    }

                    // Format the first value
                    let formattedValue1 = formatValue(value1);

                    // Special handling for BT (Between) operator
                    if (filter.sOperator === FilterOperator.BT) {
                        if (value2 === undefined || value2 === null) {
                            console.error(
                                `Between operator requires two values. Missing oValue2 for path: ${path}`
                            );
                            return "";
                        }
                        let formattedValue2 = formatValue(value2);
                        // For Between, we need to create: (path ge value1 and path le value2)
                        return `(${path} ge ${formattedValue1} and ${path} le ${formattedValue2})`;
                    }

                    // Special handling for OData functions
                    if (operator === "contains") {
                        return `contains(${path}, ${formattedValue1})`;
                    } else if (operator === "startswith") {
                        return `startswith(${path}, ${formattedValue1})`;
                    } else if (operator === "endswith") {
                        return `endswith(${path}, ${formattedValue1})`;
                    }

                    // Standard operators (eq, ne, lt, le, gt, ge)
                    return `${path} ${operator} ${formattedValue1}`;
                }

                /**
                 * Maps internal filter operators to OData operators
                 * @param {string} sOperator - Internal operator
                 * @returns {string} - OData operator
                 */
                function getODataOperator(sOperator) {
                    switch (sOperator) {
                        case FilterOperator.EQ:
                            return "eq";
                        case FilterOperator.NE:
                            return "ne";
                        case FilterOperator.LT:
                            return "lt";
                        case FilterOperator.LE:
                            return "le";
                        case FilterOperator.GT:
                            return "gt";
                        case FilterOperator.GE:
                            return "ge";
                        case FilterOperator.BT:
                            return "bt"; // This is handled specially in buildSingleFilterExpression
                        case FilterOperator.Contains:
                            return "contains";
                        case FilterOperator.StartsWith:
                            return "startswith";
                        case FilterOperator.EndsWith:
                            return "endswith";
                        default:
                            console.warn(
                                `Unknown operator: ${sOperator}, defaulting to 'eq'`
                            );
                            return "eq"; // Default operator
                    }
                }

                function formatValue(value) {
                    if (value instanceof Date) {
                        value.setDate(value.getDate() - 7)
                        // Format date for OData - use datetime'...' format for better compatibility
                        return that.convertDate(value, "-");
                    } else if (typeof value === "string") {
                        // Check if string is a date format (YYYY-MM-DD or ISO format)
                        if (isDateString(value)) {
                            // Format as datetime for OData
                            return that.convertDate(value, "-");
                        } else {
                            // Escape single quotes for OData strings
                            return `'${value.replace(/'/g, "''")}'`;
                        }
                    } else if (typeof value === "boolean") {
                        return value.toString().toLowerCase(); // OData expects lowercase boolean
                    } else if (typeof value === "number") {
                        return value.toString();
                    }
                    // For other types, convert to string
                    return `'${String(value).replace(/'/g, "''")}'`;
                }

                // Helper function to check if a string is a date
                function isDateString(str) {
                    // Check for common date formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, etc.
                    const dateRegex =
                        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
                    return dateRegex.test(str);
                }
            },

            // Single function to build final apply query with specific field filters
            buildFinalApplyQuery: function (filterData, baseApplyQuery) {
                const filterFields = [
                    "LOCATION_ID",
                    "PRODUCT_ID",
                    "CUSTOMER_GROUP",
                    "VERSION",
                    "SCENARIO",
                ];
                let filterConditions = [];

                // Always add TYPE filter first
                filterConditions.push("TYPE eq 997");

                // Process each filter field
                filterFields.forEach((field) => {
                    if (filterData && filterData[field]) {
                        let fieldFilter = filterData[field];
                        let values = [];

                        // Extract values from different filter structures
                        if (Array.isArray(fieldFilter)) {
                            values = fieldFilter.filter((v) => v != null && v !== "");
                        } else if (fieldFilter.items && Array.isArray(fieldFilter.items)) {
                            values = fieldFilter.items
                                .map((item) => {
                                    if (typeof item === "string") return item;
                                    return item.key || item.value || item.text || item;
                                })
                                .filter((v) => v != null && v !== "");
                        } else if (
                            fieldFilter.selectedKeys &&
                            Array.isArray(fieldFilter.selectedKeys)
                        ) {
                            values = fieldFilter.selectedKeys.filter(
                                (v) => v != null && v !== ""
                            );
                        } else if (
                            fieldFilter.tokens &&
                            Array.isArray(fieldFilter.tokens)
                        ) {
                            values = fieldFilter.tokens
                                .map((token) => {
                                    return token.key || token.value || token.text || token;
                                })
                                .filter((v) => v != null && v !== "");
                        } else if (
                            fieldFilter.value !== undefined &&
                            fieldFilter.value !== ""
                        ) {
                            values = [fieldFilter.value];
                        } else if (
                            typeof fieldFilter === "string" ||
                            typeof fieldFilter === "number"
                        ) {
                            if (fieldFilter !== "") {
                                values = [fieldFilter];
                            }
                        } else if (typeof fieldFilter === "object") {
                            const possibleProps = ["values", "selection", "data", "keys"];
                            for (let prop of possibleProps) {
                                if (fieldFilter[prop] && Array.isArray(fieldFilter[prop])) {
                                    values = fieldFilter[prop]
                                        .map((item) => {
                                            if (typeof item === "string") return item;
                                            return item.key || item.value || item.text || item;
                                        })
                                        .filter((v) => v != null && v !== "");
                                    break;
                                }
                            }
                        }

                        // Build condition from extracted values
                        if (values.length > 0) {
                            if (values.length === 1) {
                                // Single value - use eq operator
                                let formattedValue = this.formatODataValue(values[0]);
                                filterConditions.push(`${field} eq ${formattedValue}`);
                            } else {
                                // Multiple values - use OR conditions instead of IN operator
                                // This is more compatible across different OData implementations
                                let orConditions = values.map((value) => {
                                    let formattedValue = this.formatODataValue(value);
                                    return `${field} eq ${formattedValue}`;
                                });
                                filterConditions.push(`(${orConditions.join(" or ")})`);
                            }
                        }
                    }
                });

                // Build and return final query
                let filterQuery = filterConditions.join(" and ");
                if (baseApplyQuery) {
                    return `filter(${filterQuery})/${baseApplyQuery}`;
                } else {
                    return `filter(${filterQuery})`;
                }
            },

            // Helper function to properly format OData values
            formatODataValue: function (value) {
                if (value === null || value === undefined) {
                    return "null";
                }

                // Check if it's a number
                if (
                    typeof value === "number" ||
                    (!isNaN(value) && !isNaN(parseFloat(value)))
                ) {
                    let stringValue = value.toString();
                    return `'${stringValue}'`;
                }

                // Check if it's a boolean
                if (typeof value === "boolean") {
                    return value.toString();
                }

                // Check if it's a date (basic check)
                if (
                    value instanceof Date ||
                    (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/))
                ) {
                    return `datetime'${value}'`;
                }

                // Default to string - escape single quotes
                let stringValue = value.toString().replace(/'/g, "''");
                return `'${stringValue}'`;
            },

            ResetTree() {
                if (!that.allExpandNode?.length) return;

                // First select the node
                if (that.preSelNode) that.oTree.setSelectedItem(that.preSelNode);

                // Find the path to selected node
                // const selectedPath = that.selPath;

                // // Store the path segments for comparison
                // const pathSegments = selectedPath.split('/').filter(segment => segment.length > 0);

                // Get all items
                const allItems = that.oTree.getItems();

                // For each item, determine if it should be expanded or collapsed
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];

                    if (!item.getBindingContext) {
                        continue; // Skip items that don't have binding context
                    }

                    // const itemPath = item.getBindingContext().getPath();
                    // const itemSegments = itemPath.split('/').filter(segment => segment.length > 0);

                    // // Check if this item is in the path to the selected node
                    // let isInPath = false;

                    // If the item's path is a prefix of the selected item's path, it's in the path
                    // if (itemSegments.length < pathSegments.length) {
                    //     isInPath = pathSegments.slice(0, itemSegments.length).join('/') === itemSegments.join('/');
                    // }

                    // Expand or collapse based on whether it's in the path
                    // if (isInPath) {
                    //     // This is part of the path to our selected node, expand it
                    //     that.oTree.onItemExpanderPressed(item, true); // or that.oTree.expandItem(item) depending on your API
                    // } else {
                    //     // Not in the path, collapse it
                    //     that.oTree.onItemExpanderPressed(item, false); // or that.oTree.collapseItem(item) depending on your API
                    // }

                    if (that.allExpandNode.includes(item.getHighlightText())) {
                        that.oTree.onItemExpanderPressed(item, true);
                    } else {
                        that.oTree.onItemExpanderPressed(item, false);
                    }
                }
                that.allExpandNode = [];
            },


            onClear: function () {
                that.allData = [];
                that.hot = undefined;
                that.preSelNode = that.selPath = undefined;
                that.allExpandNode = [];
                that.TreeData = [];
                that.oGModel.setProperty("/oCharVals", []);
                that.oGModel.setProperty("/TreeItemSelectForSel", "");
                that.byId("idLocOPMIXP").removeAllTokens();
                that.byId("idProdOPMIXP").setValue("");
                that.byId("idCustOPMIXP").removeAllTokens();
                that.byId("idCharOPMIXP").removeAllTokens();
                that.byId("idCharValuOPMIXP").removeAllTokens();


                that.oLocDialog
                    .getAggregation("_dialog")
                    .getContent()[1]
                    .removeSelections();

                that.oCustomerDialog
                    .getAggregation("_dialog")
                    .getContent()[1]
                    .removeSelections();

                that.oCharDialog
                    .getAggregation("_dialog")
                    .getContent()[1]
                    .removeSelections();

                that.oCharValDialog
                    .getAggregation("_dialog")
                    .getContent()[1]
                    .removeSelections();


                that.byId("idVersionOPMIXP").setValue("Base Version");
                that.byId("idScenarioOPMIXP").setValue("_PLAN");
                that.byId("idVerInputOPMIXP").setValue("");
                that.byId("idScenInputOPMIXP").setValue("");

                // getFilters()[0].aFilters[1].setValue("Base Version")
                that.oTree.setModel(new JSONModel([]), "treeModel");
                that.oCore.byId("idNorKeyFigureOPTMIXP").setP13nData([]);
                that.isKeyFigureAlreadyGenerate = false;
                that.byId("idDynamicPage2OPMIXP").setShowFooter(false);
                that.oGModel.setProperty("/hasCustomerGroup", false);
                that.oGModel.setProperty("/subDataChanges", []);
                // that.byId("idPri").setEnabled(false);
                that.byId("idWeekTypeOPMIXP").setEnabled(false);
                that.oGModel.refresh(true);
                that.byId("idSearchFieldOPMIXP").setValue("");
                var existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                let key = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                const oDateRange = this.byId("idWeekDateOPMIXP");
                if (oDateRange) {
                    // Create today's date
                    var oToday = new Date();
                    // Create date for two years from today
                    var oTwoYearsLater = new Date();
                    if (key == 'TELESCOPIC_WEEK') {
                        oTwoYearsLater.setFullYear(oToday.getFullYear() + 2);
                    }
                    else {
                        oTwoYearsLater.setMonth(oToday.getMonth() + 2);
                    }
                    // Set the default date range
                    oDateRange.setDateValue(oToday);
                    oDateRange.setSecondDateValue(oTwoYearsLater);
                    oDateRange.setEnabled(false);
                }
                that.byId("idDynamicPage").setHeaderExpanded(true);
                //  var oBv = that.byId("Vers").getLow()
                // that.byId("Vers").setLow(oBv)
            },

            onTreeItemSelect: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                // if (oEvent != undefined) {
                //     var sTitle = oEvent.getParameters()['listItem'].getTitle();
                //     var sCharName = sTitle.split(" - ")[0] || sTitle;
                // }

                // that.oSelectCharname = sCharName;
                if (oEvent != undefined) {
                    if (oEvent.getParameters().id.includes("__button2") || oEvent.getParameters().id.includes("__button3") || oEvent.getParameters().id.includes("__button4") || oEvent.getParameters().id.includes("__button5")) {

                    } else {
                        var sTitle = oEvent.getParameters()['listItem'].getTitle();
                        var sCharName = sTitle.split(" - ")[0] || sTitle;
                    }
                }

                that.oSelectCharname = sCharName;
                that.oGModel.setProperty(
                    "/hasCustomerGroup",
                    that.staticColumns.includes("Customer Group")
                );
                that.oGModel.setProperty("/subDataChanges", []);
                that.oGModel.refresh(true);
                that.readOnlySub = true;
                that.allSubData = [];
                that.isProgrammaticChange = false;
                var oTree = this.getView().byId("idTreeOPMIXP");
                var item = oTree.getSelectedItem();
                // var aFilterArr = $.extend(true, [], that.allData);
                var aFilterArr = $.extend(true, [], that.oTalData);
                var locArr = [],
                    proArr = [],
                    chrArr = [],
                    chrValArr = [];
                that.byId("idDynamicPage2OPMIXP").setBusy(true);


                // Validate selected context paths
                if (oEvent) {
                    if (oEvent.sId === "press") {
                        if (oEvent.oSource.mAggregations.tooltip === "Dependent" || oEvent.oSource.mAggregations.tooltip === "Independent") {
                            oTree.removeSelections();
                            var sItemFil = oEvent.getSource().mAggregations.tooltip;
                            if (sItemFil === "Dependent") {
                                var sUrl = `/items/0/products/0/nodes/${1}`
                            }
                            else if (sItemFil === "Independent") {
                                var sUrl = `/items/0/products/0/nodes/${0}`
                            }
                            // var sCharItems = oTree.getModel("treeModel").getProperty(sUrl).children;
                            // if (sCharItems.length > 0) {
                            //     for (let i = 0; i < sCharItems.length; i++) {
                            //         chrArr.push(sCharItems[i].name)
                            //     }

                            // }
                            that.TreeData.forEach(e => {

                                if (e.LEVEL === sItemFil) {

                                    if (!chrArr.includes(e.CHAR_NUM)) {
                                        chrArr.push(e.CHAR_NUM);
                                    }

                                }
                            })
                            that.FilterTreeData = that.TreeData.filter(e =>
                                chrArr && chrArr.includes(e.CHAR_NUM) && e.LEVEL === sItemFil
                            );
                            that._IconFilters = true
                            // that.generateTree()
                            if (that.oCharLvlData.length == 0) {
                                that.generatePTree(that.oTalData);
                            } else {
                                that.generateTree(that.oTalData);
                            }
                        }
                        else if (oEvent.oSource.mAggregations.tooltip == "Multi Select") {
                            that.TreeData.filter((e) => {
                                if (e.MULTI_CHAR === "X") {
                                    chrArr.push(e.CHAR_NUM)
                                }
                            })
                            if (chrArr.length === 0) {
                                that.onClearTreeItems();
                                sap.ui.core.BusyIndicator.hide();
                                return;
                            }
                        } else if (oEvent.oSource.mAggregations.tooltip == "Numeric") {
                            that.TreeData.filter((r) => {
                                if (r.CHAR_TYPE === "INT" || r.CHAR_TYPE === "NUM") {
                                    chrArr.push(r.CHAR_NUM)
                                }
                            })
                            if (chrArr.length === 0) {
                                that.onClearTreeItems();
                                sap.ui.core.BusyIndicator.hide();
                                return;
                            }
                        } else if (oEvent.oSource.mAggregations.tooltip == "Standard") {
                            that.TreeData.filter((t) => {
                                if (t.STANDARD === "X") {
                                    chrArr.push(t.CHAR_NUM);
                                }
                            })
                            if (chrArr.length === 0) {
                                that.onClearTreeItems();
                                sap.ui.core.BusyIndicator.hide();
                                return;
                            }
                        }
                    }
                    else if (oEvent.sId === "selectionChange") {
                        that.aProcessingTreeData(oTree, locArr, proArr, chrArr, chrValArr, item);
                    }
                }
                else {
                    if (that.oTree.getSelectedItem() != null) {
                        var item = that.oTree.getSelectedItem()
                        if (item) {
                            that.oGModel.setProperty("/TreeItemSelectForSel", {
                                title: item.getTitle ? item.getTitle() : "",
                                text: item.getHighlightText ? item.getHighlightText() : "",
                                expanded: item.getExpanded ? item.getExpanded() : false,
                                path: item.getBindingContext("treeModel")
                                    ? item.getBindingContext("treeModel").getPath()
                                    : ""
                            });

                        }
                    }
                    else {
                        var oSavedItem = that.oGModel.getProperty("/TreeItemSelectForSel");

                        // Default values
                        var sPath = "";
                        var sTitle = "";

                        if (oSavedItem) {

                            that.selectedTreeText = oSavedItem.text || "";
                            that.isTreeNodeExpanded = oSavedItem.expanded || false;

                            sPath = oSavedItem.path || "";
                            sTitle = oSavedItem.title || "";

                            item = oSavedItem;

                        } else {

                            item = null;
                        }
                    }


                    that.aProcessingTreeData(oTree, locArr, proArr, chrArr, chrValArr, item);

                }
                // Common filter function
                function applyFilter(key, values) {
                    if (values.length > 0) {
                        aFilterArr = aFilterArr.filter((el) => values.includes(el[key]));
                    }
                }

                // Apply filters
                applyFilter("LOCATION_ID", locArr);
                applyFilter("PRODUCT_ID", proArr);
                applyFilter("CHAR_NUM", chrArr);
                applyFilter("CHARVAL_NUM", chrValArr);




                // applyFilter(node,[true])
                // applyFilter("Dependent")
                that.isCharItemPressed = chrArr.length > 0 || chrValArr.length > 0;
                if (aFilterArr && aFilterArr.length > 0) {
                    that.byId("idDynamicPage").setHeaderExpanded(false);
                    let processedData;
                    if (that.oGModel.getProperty("/hasCustomerGroup")) {
                        if (!that.isCharItemPressed) {
                            for (let index = 0; index < aFilterArr.length; index++) {
                                const item = aFilterArr[index];
                                if (!item.CHAR_NUM) {
                                    item.LOCK = true;
                                    that.allSubData.push(item);
                                }
                            }
                            let modifiedData = that.getSubExcelData(that.allSubData);
                            that.generateSubExcel(modifiedData, that.dates);
                        }
                        processedData = that.getOptPerData(aFilterArr);
                        sap.ui.core.BusyIndicator.hide();
                    } else {
                        let mData = that.avgQuantities(aFilterArr, that.staticColumns);
                        processedData = that.getOptPerData(mData);
                    }
                    that.generateExcel(processedData, that.dates);
                } else {
                    sap.m.MessageToast.show("No Option Percentages");
                    this._resetUI();
                }
                if (that.oMRoles[0].CREATE == false) {
                    //   that.byId("idSaveOPMIXP").setVisible(false);
                    that.oGModel.setProperty("/hasCustomerGroup", false);
                }
                else if (that.oMRoles[0].CREATE == true && that.oGModel.getProperty("/hasCustomerGroup")) {
                    that.byId("idSaveOPMIXP").setVisible(true);
                    that.oGModel.setProperty("/hasCustomerGroup", true);
                }


                sap.ui.core.BusyIndicator.hide();
            },

            generatePTree: function (params) {

                var sProd = that.oGModel.getProperty("/oConfigPrd") //that.byId("idProdOPMIXP").getValue();    //productValue


                // params = params.filter((f) => f.CHAR_NUM);
                // var model = new sap.ui.model.json.JSONModel();
                // var tree = [];
                // var unqLocs = that.removeDuplicate(params, "LOCATION_ID");
                // for (let i = 0; i < unqLocs.length; i++) {
                //     var locObj = {
                //         name: unqLocs[i].LOCATION_ID,
                //         description: unqLocs[i].LOCATION_DESC
                //             ? unqLocs[i].LOCATION_ID + " - " + unqLocs[i].LOCATION_DESC
                //             : unqLocs[i].LOCATION_ID,
                //         products: [],
                //     };
                //     var prods = params.filter(
                //         (el) => el.LOCATION_ID === unqLocs[i].LOCATION_ID
                //     );
                //     var unqProds = that.removeDuplicate(prods, "PRODUCT_ID");
                //     // var unqProds = that.oGModel.getProperty("/oConfigPrd");

                //     if (!Array.isArray(unqProds)) {
                //         unqProds = [unqProds];
                //     }

                //     for (let j = 0; j < unqProds.length; j++) {
                //         var prodObj = {
                //             name: unqProds[j].PRODUCT_ID,
                //             description: unqProds[j].PROD_DESC
                //                 ? unqProds[j].PRODUCT_ID + " - " + unqProds[j].PROD_DESC
                //                 : unqProds[j].PRODUCT_ID,
                //             chars: [],
                //         };
                //         locObj.products.push(prodObj);
                //         var chars = params.filter(
                //             (el) =>
                //                 el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
                //                 el.PRODUCT_ID === unqProds[j].PRODUCT_ID
                //         );
                //         var unqChars = that.removeDuplicate(chars, "CHAR_NUM");
                //         for (let l = 0; l < unqChars.length; l++) {
                //             var charObj = {
                //                 name: unqChars[l].CHAR_NUM,
                //                 description: unqChars[l].CHAR_DESC
                //                     ? unqChars[l].CHAR_NAME + " - " + unqChars[l].CHAR_DESC
                //                     : unqChars[l].CHAR_NAME,
                //                 charvals: [],
                //             };
                //             prodObj.chars.push(charObj);
                //             var charvals = params.filter(
                //                 (el) =>
                //                     el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
                //                     el.PRODUCT_ID === unqProds[j].PRODUCT_ID &&
                //                     el.CHAR_NUM === unqChars[l].CHAR_NUM
                //             );
                //             var unqCharVal = that.removeDuplicate(charvals, "CHARVAL_NUM");
                //             for (let m = 0; m < unqCharVal.length; m++) {
                //                 var charvalObj = {
                //                     name: unqCharVal[m].CHARVAL_NUM,
                //                     description: unqCharVal[m].CHARVAL_DESC
                //                         ? unqCharVal[m].CHARVAL_NUM +
                //                         " - " +
                //                         unqCharVal[m].CHARVAL_DESC
                //                         : unqCharVal[m].CHARVAL_NUM,
                //                 };
                //                 charObj.charvals.push(charvalObj);
                //             }
                //         }
                //     }
                //     tree.push(locObj);
                // }


                params = params.filter((f) => f.CHAR_NUM);

                var model = new sap.ui.model.json.JSONModel();
                var tree = [];

                var unqLocs = that.removeDuplicate(params, "LOCATION_ID");

                for (let i = 0; i < unqLocs.length; i++) {

                    var locObj = {
                        name: unqLocs[i].LOCATION_ID,
                        description: unqLocs[i].LOCATION_DESC
                            ? unqLocs[i].LOCATION_ID + " - " + unqLocs[i].LOCATION_DESC
                            : unqLocs[i].LOCATION_ID,
                        products: []
                    };

                    var prods = params.filter(
                        (el) => el.LOCATION_ID === unqLocs[i].LOCATION_ID
                    );

                    var unqProds = that.removeDuplicate(prods, "PRODUCT_ID");

                    if (!Array.isArray(unqProds)) {
                        unqProds = [unqProds];
                    }

                    for (let j = 0; j < unqProds.length; j++) {

                        var prodObj = {
                            name: unqProds[j].PRODUCT_ID,
                            description: unqProds[j].PROD_DESC
                                ? unqProds[j].PRODUCT_ID + " - " + unqProds[j].PROD_DESC
                                : unqProds[j].PRODUCT_ID,
                            nodes: [{
                                name: "Characteristics",
                                description: "Characteristics",
                                children: []
                            }]
                        };

                        locObj.products.push(prodObj);

                        var chars = params.filter(
                            (el) =>
                                el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
                                el.PRODUCT_ID === unqProds[j].PRODUCT_ID
                        );

                        var unqChars = that.removeDuplicate(chars, "CHAR_NUM");

                        for (let l = 0; l < unqChars.length; l++) {

                            var charObj = {
                                name: unqChars[l].CHAR_NUM,
                                description: unqChars[l].CHAR_DESC
                                    ? unqChars[l].CHAR_NAME + " - " + unqChars[l].CHAR_DESC
                                    : unqChars[l].CHAR_NAME,
                                charvals: []
                            };

                            prodObj.nodes[0].children.push(charObj);

                            var charvals = params.filter(
                                (el) =>
                                    el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
                                    el.PRODUCT_ID === unqProds[j].PRODUCT_ID &&
                                    el.CHAR_NUM === unqChars[l].CHAR_NUM
                            );

                            var unqCharVal = that.removeDuplicate(charvals, "CHARVAL_NUM");

                            for (let m = 0; m < unqCharVal.length; m++) {

                                var charvalObj = {
                                    name: unqCharVal[m].CHARVAL_NUM,
                                    description: unqCharVal[m].CHARVAL_DESC
                                        ? unqCharVal[m].CHARVAL_NUM + " - " + unqCharVal[m].CHARVAL_DESC
                                        : unqCharVal[m].CHARVAL_NUM
                                };

                                charObj.charvals.push(charvalObj);
                            }
                        }
                    }

                    tree.push(locObj);
                }




                function normalizeArray(data) {
                    if (!data) return [];
                    if (Array.isArray(data)) return data;
                    if (data.results && Array.isArray(data.results)) return data.results;
                    return [];
                }

                var oSeqData = normalizeArray(that.oGModel.getProperty("/oSeqData"));
                var oConfig = normalizeArray(that.oGModel.getProperty("/oConf_ParProd"));


                var refMap = {};
                oConfig.forEach(item => {
                    refMap[item.REF_PRODID] = item.PRODUCT_ID;
                });

                // Replace product Ids in seq data
                oSeqData.forEach(item => {
                    if (refMap[item.PRODUCT_ID]) {
                        item.PRODUCT_ID = refMap[item.PRODUCT_ID];
                    }
                });

                // function reorderTree(tree, oSeqData) {

                //     const orderMap = new Map();

                //     oSeqData.forEach(item => {
                //         orderMap.set(
                //             `${item.PRODUCT_ID}|${item.CHAR_NUM}`,
                //             {
                //                 weight: Number(item.WEIGHTAGE) || 0,
                //                 seq: Number(item.SEQUENCE) || Infinity
                //             }
                //         );
                //     });

                //     const newTree = JSON.parse(JSON.stringify(tree));

                //     newTree.forEach(loc => {
                //         loc.products.forEach(product => {

                //             const prodId = product.name;

                //             // FILTER
                //             product.chars = product.chars.filter(char =>
                //                 orderMap.has(`${prodId}|${char.name}`)
                //             );

                //             // SORT
                //             product.chars.sort((a, b) => {
                //                 const aMeta = orderMap.get(`${prodId}|${a.name}`);
                //                 const bMeta = orderMap.get(`${prodId}|${b.name}`);

                //                 if (aMeta.weight !== bMeta.weight) {
                //                     return bMeta.weight - aMeta.weight;
                //                 }

                //                 return aMeta.seq - bMeta.seq;
                //             });

                //         });
                //     });

                //     return newTree;
                // }

                function reorderTree(tree, oSeqData) {

                    const orderMap = new Map();

                    oSeqData.forEach(item => {
                        orderMap.set(
                            `${item.PRODUCT_ID}|${item.CHAR_NUM}`,
                            {
                                weight: Number(item.WEIGHTAGE) || 0,
                                seq: Number(item.SEQUENCE) || Infinity
                            }
                        );
                    });

                    const newTree = JSON.parse(JSON.stringify(tree));

                    newTree.forEach(loc => {

                        loc.products.forEach(product => {

                            const prodId = product.name;

                            product.nodes.forEach(node => {

                                node.children = node.children.filter(char =>
                                    orderMap.has(`${prodId}|${char.name}`)
                                );

                                node.children.sort((a, b) => {

                                    const aMeta = orderMap.get(`${prodId}|${a.name}`);
                                    const bMeta = orderMap.get(`${prodId}|${b.name}`);

                                    if (aMeta.weight !== bMeta.weight) {
                                        return bMeta.weight - aMeta.weight;
                                    }

                                    return aMeta.seq - bMeta.seq;
                                });

                            });

                            product.nodes = product.nodes.filter(node =>
                                node.children.length > 0
                            );

                        });

                    });

                    return newTree;
                }

                const reorderedTree = reorderTree(tree, oSeqData);




                // const reorderedTree = reorderTree(tree, oFinalSeq);
                model.setData({
                    items: reorderedTree
                });
                that.oTree.setModel(model, "treeModel");

                // },
                // error: function (oData, error) {
                //     sap.ui.core.BusyIndicator.hide();
                //     MessageToast.show("error");
                // },
                // });

            },


            generateTree: function () {
                if (that._IconFilters === true) {
                    var params = that.FilterTreeData
                    that._IconFilters = false;

                } else {
                    var params = that._IconFilters
                        ? that.FilterTreeData
                        : that.TreeData;
                }
                var sProd = that.oGModel.getProperty("/oConfigPrd") //that.byId("idProdOPMIXP").getValue();    //productValue
                // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
                // that.oModel.callFunction("/getCharGroupWeightage", {
                //     urlParameters: {
                //         PRODUCT_ID: sProd
                //     },
                //     success: function (oData) {
                // var oSeqData = JSON.parse(oData.getCharGroupWeightage)
                // oSeqData = oSeqData.filter(item => (item.CHAR_TYPE === "P"))

                params = params.filter((f) => f.CHAR_NUM && f.CHAR_VALUE);
                //  params = params.filter((f) => f.CHAR_NUM);
                var model = new sap.ui.model.json.JSONModel();
                var tree = [];
                var unqLocs = []
                unqLocs = that.byId("idLocOPMIXP").getTokens().map(t => t.mProperties.key) //that.removeDuplicate(params, "LOCATION_ID");

                for (let i = 0; i < unqLocs.length; i++) {
                    // var locObj = {
                    //     name: unqLocs[i].LOCATION_ID,
                    //     description: unqLocs[i].LOCATION_DESC
                    //         ? unqLocs[i].LOCATION_ID + " - " + unqLocs[i].LOCATION_DESC
                    //         : unqLocs[i].LOCATION_ID,
                    //     products: [],
                    // };
                    var locObj = {
                        name: unqLocs[i],
                        description: unqLocs[i].LOCATION_DESC
                            ? unqLocs[i] + " - " + unqLocs[i].LOCATION_DESC
                            : unqLocs[i],
                        products: [],
                    };
                    var prods = params.filter(
                        (el) => el.LOCATION_ID === unqLocs[i].LOCATION_ID
                    );
                    var unqProds = that.removeDuplicate(prods, "PRODUCT_ID");
                    // var unqProds = that.oGModel.getProperty("/oConfigPrd");

                    if (!Array.isArray(unqProds)) {
                        unqProds = [unqProds];
                    }

                    for (let j = 0; j < unqProds.length; j++) {
                        var prodObj = {
                            name: unqProds[j].PRODUCT_ID,
                            description: unqProds[j].PROD_DESC
                                ? unqProds[j].PRODUCT_ID + " - " + unqProds[j].PROD_DESC
                                : unqProds[j].PRODUCT_ID,
                            chars: [],
                            nodes: [
                                {
                                    name: "Independent",
                                    description: "Independent",
                                    children: []
                                },
                                {
                                    name: "Dependent",
                                    description: "Dependent",
                                    children: []
                                }

                            ]
                        };
                        locObj.products.push(prodObj);
                        var chars = params.filter(
                            (el) =>
                                el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
                                el.PRODUCT_ID === unqProds[j].PRODUCT_ID
                        );
                        var unqChars = that.removeDuplicates(chars, ["CHAR_NUM", "LEVEL"]);
                        for (let l = 0; l < unqChars.length; l++) {
                            var charObj = {
                                name: unqChars[l].CHAR_NUM,
                                description: unqChars[l].CHAR_DESC
                                    ? unqChars[l].CHAR_NAME + " - " + unqChars[l].CHAR_DESC
                                    : unqChars[l].CHAR_NAME,
                                charvals: [],
                            };
                            if (unqChars[l].LEVEL === "Dependent") {
                                // prodObj.chars.push(charObj.CHAR_NAME)
                                prodObj.nodes[1].children.push(charObj); // Dependent
                            } else if (unqChars[l].LEVEL === "Independent") {
                                prodObj.nodes[0].children.push(charObj);
                                // prodObj.chars.push(charObj.CHAR_NAME) // Independent
                            }

                            var charvals = params.filter(
                                (el) =>

                                    el.PRODUCT_ID === unqProds[j].PRODUCT_ID &&
                                    el.CHAR_NUM === unqChars[l].CHAR_NUM &&
                                    el.LEVEL === unqChars[l].LEVEL
                            );
                            var unqCharVal = that.removeDuplicate(charvals, "CHAR_VALUE");
                            for (let m = 0; m < unqCharVal.length; m++) {

                                var charvalObj = {
                                    name: unqCharVal[m].CHAR_VALUE,
                                    description: unqCharVal[m].CHAR_DESC ? unqCharVal[m].CHAR_VALUE + " - " + unqCharVal[m].CHAR_DESC : unqCharVal[m].CHAR_VALUE,
                                };
                                charObj.charvals.push(charvalObj);
                            }
                        }
                    }
                    tree.push(locObj);
                }



                function normalizeArray(data) {
                    if (!data) return [];
                    if (Array.isArray(data)) return data;
                    if (data.results && Array.isArray(data.results)) return data.results;
                    return [];
                }

                var oSeqData = normalizeArray(that.oGModel.getProperty("/oSeqData"));
                var oConfig = normalizeArray(that.oGModel.getProperty("/oConf_ParProd"));


                var refMap = {};
                oConfig.forEach(item => {
                    refMap[item.REF_PRODID] = item.PRODUCT_ID;
                });

                // Replace product Ids in seq data
                oSeqData.forEach(item => {
                    if (refMap[item.PRODUCT_ID]) {
                        item.PRODUCT_ID = refMap[item.PRODUCT_ID];
                    }
                });

                function reorderTree(tree, oSeqData) {

                    const orderMap = new Map();

                    oSeqData.forEach(item => {
                        orderMap.set(
                            `${item.PRODUCT_ID}|${item.CHAR_NUM}`,
                            {
                                weight: Number(item.WEIGHTAGE) || 0,
                                seq: Number(item.SEQUENCE) || Infinity
                            }
                        );
                    });

                    const newTree = JSON.parse(JSON.stringify(tree));

                    newTree.forEach(loc => {

                        loc.products.forEach(product => {

                            const prodId = product.name;

                            product.nodes.forEach(node => {

                                // FILTER
                                node.children = node.children.filter(char =>
                                    orderMap.has(`${prodId}|${char.name}`)
                                );

                                // SORT
                                node.children.sort((a, b) => {

                                    const aMeta = orderMap.get(`${prodId}|${a.name}`);
                                    const bMeta = orderMap.get(`${prodId}|${b.name}`);

                                    if (aMeta.weight !== bMeta.weight) {
                                        return bMeta.weight - aMeta.weight;
                                    }

                                    return aMeta.seq - bMeta.seq;

                                });

                            });

                            // OPTIONAL:
                            // remove empty Independent/Dependent nodes
                            product.nodes = product.nodes.filter(node =>
                                node.children.length > 0
                            );

                        });

                    });

                    return newTree;
                }

                const reorderedTree = reorderTree(tree, oSeqData);
                that.oGModel.setProperty("/tree", reorderedTree);
                // const reorderedTree = reorderTree(tree, oFinalSeq);
                model.setData({
                    items: reorderedTree
                });
                that.oTree.setModel(model, "treeModel");
            },


            // generateTree: function () {
            //     if (that._IconFilters === true) {
            //         var params = that.FilterTreeData
            //         that._IconFilters = false;

            //     } else {
            //         var params = that._IconFilters
            //             ? that.FilterTreeData
            //             : that.TreeData;
            //     }

            //     const oTalMap = new Map();

            //     that.oTalData.forEach(item => {
            //         oTalMap.set(
            //             `${item.CHAR_NUM}|${item.CHARVAL_NUM}`,
            //             item.CHARVAL_DESC
            //         );
            //     });

            //     params.forEach(item => {
            //         const key = `${item.CHAR_NUM}|${item.CHAR_VALUE}`;

            //         if (oTalMap.has(key)) {
            //             item.CHARVAL_DESC = oTalMap.get(key);
            //         }
            //     });
            //     var sProd = that.oGModel.getProperty("/oConfigPrd") //that.byId("idProdOPMIXP").getValue();    //productValue


            //     params = params.filter((f) => f.CHAR_NUM && f.CHAR_VALUE);
            //     var model = new sap.ui.model.json.JSONModel();
            //     var tree = [];
            //     var unqLocs = []
            //     unqLocs = that.byId("idLocOPMIXP").getTokens().map(t => t.mProperties.key) //that.removeDuplicate(params, "LOCATION_ID");

            //     for (let i = 0; i < unqLocs.length; i++) {

            //         var locObj = {
            //             name: unqLocs[i],
            //             description: unqLocs[i].LOCATION_DESC
            //                 ? unqLocs[i] + " - " + unqLocs[i].LOCATION_DESC
            //                 : unqLocs[i],
            //             products: [],
            //         };
            //         var prods = params.filter(
            //             (el) => el.LOCATION_ID === unqLocs[i].LOCATION_ID
            //         );
            //         var unqProds = that.removeDuplicate(prods, "PRODUCT_ID");
            //         // var unqProds = that.oGModel.getProperty("/oConfigPrd");

            //         if (!Array.isArray(unqProds)) {
            //             unqProds = [unqProds];
            //         }

            //         for (let j = 0; j < unqProds.length; j++) {
            //             var prodObj = {
            //                 name: unqProds[j].PRODUCT_ID,
            //                 description: unqProds[j].PROD_DESC
            //                     ? unqProds[j].PRODUCT_ID + " - " + unqProds[j].PROD_DESC
            //                     : unqProds[j].PRODUCT_ID,
            //                 chars: [],
            //                 nodes: [
            //                     {
            //                         name: "Independent",
            //                         description: "Independent",
            //                         children: []
            //                     },
            //                     {
            //                         name: "Dependent",
            //                         description: "Dependent",
            //                         children: []
            //                     }

            //                 ]
            //             };
            //             locObj.products.push(prodObj);
            //             var chars = params.filter(
            //                 (el) =>
            //                     el.LOCATION_ID === unqLocs[i].LOCATION_ID &&
            //                     el.PRODUCT_ID === unqProds[j].PRODUCT_ID
            //             );
            //             var unqChars = that.removeDuplicates(chars, ["CHAR_NUM", "LEVEL"]);
            //             for (let l = 0; l < unqChars.length; l++) {
            //                 var charObj = {
            //                     name: unqChars[l].CHAR_NUM,
            //                     description: unqChars[l].CHAR_DESC
            //                         ? unqChars[l].CHAR_NAME + " - " + unqChars[l].CHAR_DESC
            //                         : unqChars[l].CHAR_NAME,
            //                     charvals: [],
            //                 };
            //                 if (unqChars[l].LEVEL === "Dependent") {
            //                     // prodObj.chars.push(charObj.CHAR_NAME)
            //                     prodObj.nodes[1].children.push(charObj); // Dependent
            //                 } else if (unqChars[l].LEVEL === "Independent") {
            //                     prodObj.nodes[0].children.push(charObj);
            //                     // prodObj.chars.push(charObj.CHAR_NAME) // Independent
            //                 }

            //                 var charvals = params.filter(
            //                     (el) =>

            //                         el.PRODUCT_ID === unqProds[j].PRODUCT_ID &&
            //                         el.CHAR_NUM === unqChars[l].CHAR_NUM &&
            //                         el.LEVEL === unqChars[l].LEVEL
            //                 );
            //                 var unqCharVal = that.removeDuplicate(charvals, "CHAR_VALUE");
            //                 unqCharVal.sort((a, b) =>
            //                     (a.CHAR_VALUE || "").localeCompare(
            //                         b.CHAR_VALUE || "",
            //                         undefined,
            //                         { sensitivity: "base" }
            //                     )
            //                 );
            //                 for (let m = 0; m < unqCharVal.length; m++) {

            //                     var charvalObj = {
            //                         name: unqCharVal[m].CHAR_VALUE,
            //                         description: unqCharVal[m].CHARVAL_DESC ? unqCharVal[m].CHAR_VALUE + " - " + unqCharVal[m].CHARVAL_DESC : unqCharVal[m].CHAR_VALUE,
            //                     };
            //                     charObj.charvals.push(charvalObj);


            //                 }
            //             }
            //         }
            //         tree.push(locObj);
            //     }



            //     function normalizeArray(data) {
            //         if (!data) return [];
            //         if (Array.isArray(data)) return data;
            //         if (data.results && Array.isArray(data.results)) return data.results;
            //         return [];
            //     }

            //     var oSeqData = normalizeArray(that.oGModel.getProperty("/oSeqData"));
            //     var oConfig = normalizeArray(that.oGModel.getProperty("/oConf_ParProd"));


            //     var refMap = {};
            //     oConfig.forEach(item => {
            //         refMap[item.REF_PRODID] = item.PRODUCT_ID;
            //     });

            //     // Replace product Ids in seq data
            //     oSeqData.forEach(item => {
            //         if (refMap[item.PRODUCT_ID]) {
            //             item.PRODUCT_ID = refMap[item.PRODUCT_ID];
            //         }
            //     });

            //     function reorderTree(tree, oSeqData) {

            //         const orderMap = new Map();

            //         oSeqData.forEach(item => {
            //             orderMap.set(
            //                 `${item.PRODUCT_ID}|${item.CHAR_NUM}`,
            //                 {
            //                     weight: Number(item.WEIGHTAGE) || 0,
            //                     seq: Number(item.SEQUENCE) || Infinity
            //                 }
            //             );
            //         });

            //         const newTree = JSON.parse(JSON.stringify(tree));

            //         newTree.forEach(loc => {

            //             loc.products.forEach(product => {

            //                 const prodId = product.name;

            //                 product.nodes.forEach(node => {

            //                     // FILTER
            //                     node.children = node.children.filter(char =>
            //                         orderMap.has(`${prodId}|${char.name}`)
            //                     );

            //                     // SORT
            //                     // node.children.sort((a, b) => {

            //                     //     const aMeta = orderMap.get(`${prodId}|${a.name}`);
            //                     //     const bMeta = orderMap.get(`${prodId}|${b.name}`);

            //                     //     if (aMeta.weight !== bMeta.weight) {
            //                     //         return bMeta.weight - aMeta.weight;
            //                     //     }

            //                     //     return aMeta.seq - bMeta.seq;

            //                     // });

            //                 });

            //                 // OPTIONAL:
            //                 // remove empty Independent/Dependent nodes
            //                 product.nodes = product.nodes.filter(node =>
            //                     node.children.length > 0
            //                 );

            //             });

            //         });

            //         return newTree;
            //     }

            //     const reorderedTree = reorderTree(tree, oSeqData);
            //     that.oGModel.setProperty("/tree", reorderedTree);
            //     // const reorderedTree = reorderTree(tree, oFinalSeq);
            //     model.setData({
            //         items: reorderedTree
            //     });
            //     that.oTree.setModel(model, "treeModel");
            // },


            onSearch: function (oEvent) {
                var sQuery = oEvent.getSource().getValue();
                var oTree = this.byId("idTreeOPMIXP");
                var oBinding = oTree.getBinding("items");
                var aFilter = [];
                // Create a filter only if there is a query
                if (sQuery && sQuery.length > 0) {
                    var sPath = "description"; // Path to search within
                    var oFilter = new sap.ui.model.Filter(
                        sPath,
                        sap.ui.model.FilterOperator.Contains,
                        sQuery
                    );
                    aFilter.push(oFilter);
                } else {
                    oBinding.filter([]);
                    return;
                }

                if (aFilter && aFilter.length > 0) {
                    // Apply the filter to the tree binding
                    oBinding.filter(aFilter);
                }

                // Expand tree to maximum level to ensure all potential matches are visible
                var maxLevel = 5; // Assuming a maximum of 5 levels of hierarchy
                this.oTree.expandToLevel(maxLevel);

                // Function to find the level of a given item based on its context path
                function getItemLevel(oItem) {
                    var sPath = oItem.getBindingContext().getPath();
                    return sPath.split("/").length - 2; // Subtract 2 to get the level (since '/items/0' starts at level 0)
                }

                // After expanding, check and highlight the matching items
                var oItems = oTree.getItems();
                for (var i = 0; i < oItems.length; i++) {
                    var oItem = oItems[i];
                    var bVisible = oItem.getVisible(); // Check if the item is visible

                    // If the item matches the search and is visible
                    if (bVisible) {
                        var iLevel = getItemLevel(oItem); // Determine the level of the item
                        // Ensure all levels up to the item's level are expanded
                        this.oTree.expandToLevel(iLevel + 1); // Expand all levels up to the matched item's level
                    }
                }
            },


            generateKeyFigSettings: function () {
                const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");

                const norKeyFig = that.oCore.byId("idNorKeyFigureOPTMIXP"),
                    calKeyFig = that.oCore.byId("idCalKeyFigureOPMIXP");

                // Reset personalization data
                norKeyFig.setP13nData([]);
                calKeyFig.setP13nData([]);

                // --- Step 1: Determine if Customer Group is present ---
                let isCustomerGroupPresent = false;
                let customerGroupValue = null;

                // Try to read from SmartFilterBar (preferred)
                const oSmartFilterBar = that.byId("smartFilterBarId"); // Replace with your actual SmartFilterBar ID
                if (oSmartFilterBar && oSmartFilterBar.getFilterData) {
                    const filterData = oSmartFilterBar.getFilterData();
                    if (filterData && filterData.CUSTOMER_GROUP) {
                        customerGroupValue = filterData.CUSTOMER_GROUP;
                        isCustomerGroupPresent = !!customerGroupValue;
                    }
                }

                // If SmartFilterBar not found, fallback to model data (/oFilterspas)
                if (!isCustomerGroupPresent) {
                    that.oGModel.refresh(true); // Ensure latest filters before reading
                    const oFiltersPas = that.oGModel.getProperty("/oFilterspas") || [];

                    const findCustomerGroup = (filters) => {
                        if (!filters) return;
                        filters.forEach((f) => {
                            if (f.aFilters) {
                                findCustomerGroup(f.aFilters);
                            } else if (f.sPath === "CUSTOMER_GROUP" && f.oValue1) {
                                isCustomerGroupPresent = true;
                                customerGroupValue = f.oValue1;
                            }
                        });
                    };
                    findCustomerGroup(oFiltersPas);
                }

                // console.log("Customer Group Found:", customerGroupValue || "None");

                // --- Step 2: Split data into normal & calculated ---
                const nKfs = maintainedKeyFigs.filter(
                    (item) =>
                        (item.KEY_FIG_ID >= 0 && item.KEY_FIG_ID <= 99) ||
                        (item.KEY_FIG_ID >= 100 && item.KEY_FIG_ID <= 200)
                );

                const cKfs = maintainedKeyFigs.filter(
                    (item) => item.KEY_FIG_ID > 200 && item.KEY_FIG_ID < 999
                );

                const selectedNorKeys = [1, 1000, 1100, 1001, 1101];
                const selectedCalKeys = [997];
                const oSavedVisibility = that.oGModel.getProperty("/KeyFigVisible") || {};


                // --- Step 3: Build key figure data ---
                const buildData = (arr, selectedKeys) =>
                    arr.map((u) => {
                        const desc = u.KEY_FIG_DESC?.toLowerCase() || "";
                        const isPlannedOrForecast =
                            // desc.includes("planned option qty") ||
                            // desc.includes("planned option %") ||
                            desc.includes("forecast order qty at vc") ||
                            desc.includes("forecast order qty") ||
                            desc.includes("forecast order % at vc")
                        // desc.includes("unconsumed quantity");

                        return {
                            key: u.KEY_FIG_ID,
                            label: u.KEY_FIG_DESC,
                            // visible: selectedKeys.includes(u.KEY_FIG_ID),
                            visible:
                                oSavedVisibility[u.KEY_FIG_ID] !== undefined
                                    ? oSavedVisibility[u.KEY_FIG_ID]
                                    : selectedKeys.includes(u.KEY_FIG_ID),
                            enabled: isCustomerGroupPresent
                                ? !isPlannedOrForecast // disable planned/forecast if customer group exists
                                : true // otherwise everything enabled
                        };
                    });

                let norData = buildData(nKfs, selectedNorKeys);
                let calData = buildData(cKfs, selectedCalKeys);

                // --- Step 4: Handle Manual Key Figures ---
                // if (nKfs.some((f) => f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC)) {
                //     norData.push(
                //         { key: 1001, label: "Effective Option %", visible: false, enabled: true },
                //         { key: 1101, label: "Effective Option Qty", visible: false, enabled: true },
                //         { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
                //         { key: 1100, label: "Option Quantity", visible: true, enabled: true }
                //     );
                // } else {
                //     norData.push(
                //         {
                //             key: that.ManualKeyArr[0].KEY_FIG_ID,
                //             label: that.ManualKeyArr[0].KEY_FIG_DESC,
                //             visible: true,
                //             enabled: true
                //         },
                //         { key: 1001, label: "Effective Option %", visible: true, enabled: true },
                //         { key: 1101, label: "Effective Option Qty", visible: true, enabled: true },
                //         { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
                //         { key: 1100, label: "Option Quantity", visible: true, enabled: true }
                //     );
                // }

                // --- Step 4: Handle Manual Key Figures ---
                if (nKfs.some((f) => f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC)) {

                    norData.push(
                        {
                            key: 1001,
                            label: "Effective Option %",
                            visible: oSavedVisibility[1001] !== undefined ? oSavedVisibility[1001] : false,
                            enabled: true
                        },
                        {
                            key: 1101,
                            label: "Effective Option Qty",
                            visible: oSavedVisibility[1101] !== undefined ? oSavedVisibility[1101] : false,
                            enabled: true
                        },
                        {
                            key: 1000,
                            label: "Option Percentage %",
                            visible: oSavedVisibility[1000] !== undefined ? oSavedVisibility[1000] : true,
                            enabled: true
                        },
                        {
                            key: 1100,
                            label: "Option Quantity",
                            visible: oSavedVisibility[1100] !== undefined ? oSavedVisibility[1100] : true,
                            enabled: true
                        }
                    );

                } else {

                    norData.push(
                        {
                            key: that.ManualKeyArr[0].KEY_FIG_ID,
                            label: that.ManualKeyArr[0].KEY_FIG_DESC,
                            visible:
                                oSavedVisibility[that.ManualKeyArr[0].KEY_FIG_ID] !== undefined
                                    ? oSavedVisibility[that.ManualKeyArr[0].KEY_FIG_ID]
                                    : true,
                            enabled: true
                        },
                        {
                            key: 1001,
                            label: "Effective Option %",
                            visible: oSavedVisibility[1001] !== undefined ? oSavedVisibility[1001] : true,
                            enabled: true
                        },
                        {
                            key: 1101,
                            label: "Effective Option Qty",
                            visible: oSavedVisibility[1101] !== undefined ? oSavedVisibility[1101] : true,
                            enabled: true
                        },
                        {
                            key: 1000,
                            label: "Option Percentage %",
                            visible: oSavedVisibility[1000] !== undefined ? oSavedVisibility[1000] : true,
                            enabled: true
                        },
                        {
                            key: 1100,
                            label: "Option Quantity",
                            visible: oSavedVisibility[1100] !== undefined ? oSavedVisibility[1100] : true,
                            enabled: true
                        }
                    );
                }

                // --- Step 5: Sorting logic ---
                // const customSort = (a, b) => {
                //     if (a.key === 1) return -1;
                //     if (b.key === 1) return 1;
                //     if (a.visible && !b.visible) return -1;
                //     if (!a.visible && b.visible) return 1;
                //     return a.label.localeCompare(b.label);
                // };

                const keyOrder = [
                    1,
                    1000, // Option Percentage %
                    1100, // Option Quantity
                    997,  // Product Demand
                    3,//  Derived Characteristics %
                    2, //Derived Characteristics %
                    52, //Derived Characteristics qty
                    1001, // Effective Option %
                    1101  // Effective Option Qty
                ];

                const customSort = (a, b) => {

                    const aIndex = keyOrder.indexOf(a.key);
                    const bIndex = keyOrder.indexOf(b.key);

                    // Both in custom order
                    if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex;
                    }

                    // One in custom order
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;

                    // Remaining KFs alphabetical
                    return a.label.localeCompare(b.label);
                };
                norData.sort(customSort);
                calData.sort(customSort);

                // --- Step 6: Apply data & re-render ---
                norKeyFig.setP13nData(norData);
                calKeyFig.setP13nData(calData);
                that.isCustomerGroupPresent = isCustomerGroupPresent

                that.oGModel.setProperty("/norKeyFig", norKeyFig)
                that.oGModel.setProperty("/calKeyFig", calKeyFig)

                // Force re-render to ensure fade logic applies correctly
                norKeyFig.invalidate();
                calKeyFig.invalidate();

                //  console.log("Customer Group Present:", isCustomerGroupPresent, "Value:", customerGroupValue);

            },

            onNorSelect: function (oEvent) {
                const that = this;

                const oParams = oEvent.getParameters();
                const oItem = oParams.item;
                const sReason = oParams.reason;

                if (
                    sReason === "Remove" &&
                    oItem &&
                    [102, 103, 152, 153].includes(oItem.key)
                ) {
                    that.oCustomerGrp();
                }
            },

            onCalSelect: function (oEvent) {
                const that = this;

                const oParams = oEvent.getParameters();
                const oItem = oParams.item;
                const sReason = oParams.reason;

                if (
                    sReason === "Remove" &&
                    oItem &&
                    [994, 995,].includes(oItem.key)
                ) {
                    that.oCustomerGrp();
                }
            },

            checkSelect: function (oEvent) {
                const table = sap.ui.getCore().byId("idDataTableOPMIXP");
                table.getItems().forEach((item, index) => {
                    const obj = item.getBindingContext().getObject();
                    if (!["Customer Group"].includes(obj.field)) {
                        if (!obj.select) {
                            obj.select = true;
                            MessageToast.show("Selected field cannot be removed");
                        }
                    }
                    if (obj.select) item.addStyleClass("selectItem");
                    else item.removeStyleClass("selectItem");
                    const icons = item.getCells()[2].getItems();
                    if (index === 0) {
                        icons[0].setVisible(false);
                        icons[2].setVisible(false);
                    } else {
                        icons[0].setVisible(true);
                        icons[2].setVisible(true);
                    }
                    if (index === that.settingData.length - 1) {
                        icons[1].setVisible(false);
                        icons[3].setVisible(false);
                    } else {
                        icons[1].setVisible(true);
                        icons[3].setVisible(true);
                    }
                });


                if (oEvent) {
                    var oCGroup = oEvent.getSource().getItems()[2].getCells()[0].getText()
                    var oSelected = oEvent.getSource().getItems()[2].getSelected()
                    that.oGModel.setProperty("/CGroup", oCGroup)
                    that.oGModel.setProperty("/oSelected", oSelected)
                    // if (oCGroup === "Customer Group" && oSelected === false) {
                    //     that.oGModel.setProperty("/CGroup", oCGroup)
                    //     that.oGModel.setProperty("/oSelected", oSelected)
                    //     that.generateKeyFigSettings()
                    // } else {

                    //     that.oGModel.setProperty("/CGroup", oCGroup)
                    //     that.oGModel.setProperty("/oSelected", oSelected)
                    //     // do nothing
                    // }

                }

            },

            onOpenKeyFigPopup: function (oEvent) {
                var isCustomerGroupPresent = that.isCustomerGroupPresent;
                var norKeyFig = that.oGModel.getProperty("/norKeyFig");
                var calKeyFig = that.oGModel.getProperty("/calKeyFig");

                // --- Step 7: Apply fade effect only when Customer Group exists ---
                const fadeDisabledTexts = (panel) => {
                    const data = panel.getP13nData();

                    panel.addEventDelegate({
                        onAfterRendering: function () {
                            const $panel = panel.$();
                            data.forEach((entry, index) => {
                                const item = $panel.find(
                                    `.sapMListItems li:nth-child(${index + 1}), .sapMLIB:nth-child(${index + 1})`
                                );

                                if (!entry.enabled) {
                                    item.addClass("sapUiDisabledText");
                                    item.removeClass("sapUiNormalText");
                                    item.attr("title", "Disabled for Planned/Forecast Key Figures");
                                } else {
                                    item.addClass("sapUiNormalText");
                                    item.removeClass("sapUiDisabledText");
                                    item.removeAttr("title");
                                }
                            });
                        }
                    });
                };

                var oCGroup = that.oGModel.getProperty("/CGroup");
                var oSelected = that.oGModel.getProperty("/oSelected");

                if (isCustomerGroupPresent) {

                    // --------------------------
                    // CUSTOMER GROUP PRESENT CASE
                    // --------------------------

                    var oCGroup = that.oGModel.getProperty("/CGroup");
                    var oSelected = that.oGModel.getProperty("/oSelected");

                    if ((oCGroup === "Customer Group" && oSelected === true) ||
                        (oCGroup === undefined && oSelected === undefined)) {

                        const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
                        const disableLabels = [
                            "Forecast Order % at VC",
                            "Forecast Order Qty at VC",
                            "Unconsumed Qty % at VC",
                            "Unconsumed Qty at VC"
                        ];

                        oNorKeyFigData.items.forEach(item => {
                            if (disableLabels.includes(item.label)) {
                                item.enabled = false;
                            }
                        });

                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
                        const ocaldisableLabels = [
                            "Forecast Order Qty",
                            "Unconsumed Quantity"
                        ];

                        oCalKeyFigData.items.forEach(item => {
                            if (ocaldisableLabels.includes(item.label)) {
                                item.enabled = false;
                            }
                        });

                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        // --- SORT ORDER LOGIC ---
                        const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Manual Option % "];
                        const mandatoryFirstCal = ["Product Demand"]; // Always top

                        // Nor tab sorting
                        let norItems = oNorKeyFigData.items;
                        norItems.sort((a, b) => {
                            const indexA = mandatoryOrderNor.indexOf(a.label);
                            const indexB = mandatoryOrderNor.indexOf(b.label);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.label.localeCompare(b.label);
                        });
                        oNorKeyFigData.items = norItems;
                        norKeyFig.oModels["$p13n"].setData(oNorKeyFigData);

                        // Cal tab sorting
                        let calItems = oCalKeyFigData.items;
                        calItems.sort((a, b) => {
                            const indexA = mandatoryFirstCal.indexOf(a.label);
                            const indexB = mandatoryFirstCal.indexOf(b.label);

                            if (indexA !== -1 && indexB === -1) return -1;
                            if (indexA === -1 && indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });
                        oCalKeyFigData.items = calItems;
                        calKeyFig.oModels["$p13n"].setData(oCalKeyFigData);

                        fadeDisabledTexts(norKeyFig);
                        fadeDisabledTexts(calKeyFig);

                    } else if (oCGroup === "Customer Group" && oSelected === false) {

                        // (This block unchanged)
                        const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
                        const disableLabels = [
                            "Forecast Order % at VC",
                            "Forecast Order Qty at VC",
                            "Unconsumed Qty % at VC",
                            "Unconsumed Qty at VC"
                        ];

                        oNorKeyFigData.items.forEach(item => {
                            if (disableLabels.includes(item.label)) {
                                item.enabled = true;
                            }
                        });
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
                        const ocaldisableLabels = [
                            "Forecast Order Qty",
                            "Unconsumed Quantity"
                        ];

                        oCalKeyFigData.items.forEach(item => {
                            if (ocaldisableLabels.includes(item.label)) {
                                item.enabled = true;
                            }
                        });
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        // Sorting logic same as above
                        const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Manual Option % "];
                        const mandatoryFirstCal = ["Product Demand"];

                        let norItems = oNorKeyFigData.items;
                        norItems.sort((a, b) => {
                            const indexA = mandatoryOrder.indexOf(a.label);
                            const indexB = mandatoryOrder.indexOf(b.label);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.label.localeCompare(b.label);
                        });
                        oNorKeyFigData.items = norItems;
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        let calItems = oCalKeyFigData.items;
                        calItems.sort((a, b) => {
                            const indexA = mandatoryFirstCal.indexOf(a.label);
                            const indexB = mandatoryFirstCal.indexOf(b.label);

                            if (indexA !== -1 && indexB === -1) return -1;
                            if (indexA === -1 && indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });
                        oCalKeyFigData.items = calItems;
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        fadeDisabledTexts(norKeyFig);
                        fadeDisabledTexts(calKeyFig);
                    }

                } else {

                    // -------------------------------------
                    // CUSTOMER GROUP **NOT PRESENT** CASE
                    // -------------------------------------

                    if (oCGroup === "Customer Group" && oSelected === true) {

                        // Disable logic (unchanged)
                        const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
                        const disableLabels = [
                            "Forecast Order % at VC",
                            "Forecast Order Qty at VC",
                            "Unconsumed Qty % at VC",
                            "Unconsumed Qty at VC"
                        ];
                        oNorKeyFigData.items.forEach(item => {
                            if (disableLabels.includes(item.label)) item.enabled = false;
                        });
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
                        const ocaldisableLabels = [
                            "Forecast Order Qty",
                            "Unconsumed Quantity"
                        ];
                        oCalKeyFigData.items.forEach(item => {
                            if (ocaldisableLabels.includes(item.label)) item.enabled = false;
                        });
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        // --- SORT ORDER LOGIC ---
                        const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Manual Option % "];
                        const mandatoryFirstCal = ["Product Demand"];   // FIX APPLIED

                        // Nor sorting
                        let norItems = oNorKeyFigData.items;
                        norItems.sort((a, b) => {
                            const indexA = mandatoryOrderNor.indexOf(a.label);
                            const indexB = mandatoryOrderNor.indexOf(b.label);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.label.localeCompare(b.label);
                        });
                        oNorKeyFigData.items = norItems;
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        // FIX: Product Demand First
                        let calItems = oCalKeyFigData.items;
                        calItems.sort((a, b) => {
                            const indexA = mandatoryFirstCal.indexOf(a.label);
                            const indexB = mandatoryFirstCal.indexOf(b.label);

                            if (indexA !== -1 && indexB === -1) return -1;
                            if (indexA === -1 && indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });
                        oCalKeyFigData.items = calItems;
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        fadeDisabledTexts(norKeyFig);
                        fadeDisabledTexts(calKeyFig);

                    }
                    else if (oCGroup === "Customer Group" && oSelected === false) {

                        // (unchanged enable logic)
                        const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
                        const disableLabels = [
                            "Forecast Order % at VC",
                            "Forecast Order Qty at VC",
                            "Unconsumed Qty % at VC",
                            "Unconsumed Qty at VC"
                        ];
                        oNorKeyFigData.items.forEach(item => {
                            if (disableLabels.includes(item.label)) item.enabled = true;
                        });
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
                        const ocaldisableLabels = [
                            "Forecast Order Qty",
                            "Unconsumed Quantity"
                        ];
                        oCalKeyFigData.items.forEach(item => {
                            if (ocaldisableLabels.includes(item.label)) item.enabled = true;
                        });
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        // Sorting logic
                        const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Manual Option % "];
                        const mandatoryFirstCal = ["Product Demand"];

                        let norItems = oNorKeyFigData.items;
                        norItems.sort((a, b) => {
                            const indexA = mandatoryOrder.indexOf(a.label);
                            const indexB = mandatoryOrder.indexOf(b.label);
                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;
                            return a.label.localeCompare(b.label);
                        });
                        oNorKeyFigData.items = norItems;
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        let calItems = oCalKeyFigData.items;
                        calItems.sort((a, b) => {
                            const indexA = mandatoryFirstCal.indexOf(a.label);
                            const indexB = mandatoryFirstCal.indexOf(b.label);

                            if (indexA !== -1 && indexB === -1) return -1;
                            if (indexA === -1 && indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });
                        oCalKeyFigData.items = calItems;
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        fadeDisabledTexts(norKeyFig);
                        fadeDisabledTexts(calKeyFig);

                    }
                    else if (oCGroup === undefined && oSelected === undefined) {

                        const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
                        const disableLabels = [
                            "Forecast Order % at VC",
                            "Forecast Order Qty at VC",
                            "Unconsumed Qty % at VC",
                            "Unconsumed Qty at VC"
                        ];

                        oNorKeyFigData.items.forEach(item => {
                            if (disableLabels.includes(item.label)) item.enabled = false;
                        });

                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
                        const ocaldisableLabels = [
                            "Forecast Order Qty",
                            "Unconsumed Quantity"
                        ];

                        oCalKeyFigData.items.forEach(item => {
                            if (ocaldisableLabels.includes(item.label)) item.enabled = false;
                        });

                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        // --- SORT ORDER LOGIC ---
                        // const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Manual Option % ",
                        //     "Derived Characteristics %", "Derived Characteristics Qty"
                        // ];

                        const mandatoryOrderNor = [
                            1,     // Statistical Forecast %
                            1000,  // Option Percentage %
                            1100,  // Option Quantity
                            3,     // Manual Option %
                            52,    // Derived Characteristic Qty
                            2,     // Derived Characteristics %
                            1001,  // Effective Option %
                            1101   // Effective Option Qty
                        ];
                        const mandatoryFirstCal = ["Product Demand"];  // FIX HERE TOO

                        // Nor sorting
                        let norItems = oNorKeyFigData.items;
                        norItems.sort((a, b) => {
                            const indexA = mandatoryOrderNor.indexOf(a.key);
                            const indexB = mandatoryOrderNor.indexOf(b.key);

                            if (indexA !== -1 && indexB !== -1) {
                                return indexA - indexB;
                            }
                            if (indexA !== -1) return -1;
                            if (indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });
                        // norItems.sort((a, b) => {
                        //     const indexA = mandatoryOrderNor.indexOf(a.label);
                        //     const indexB = mandatoryOrderNor.indexOf(b.label);
                        //     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        //     if (indexA !== -1) return -1;
                        //     if (indexB !== -1) return 1;
                        //     return a.label.localeCompare(b.label);
                        // });
                        oNorKeyFigData.items = norItems;
                        norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

                        // FIX: Product Demand First in Calculation tab
                        let calItems = oCalKeyFigData.items;
                        calItems.sort((a, b) => {
                            const indexA = mandatoryFirstCal.indexOf(a.label);
                            const indexB = mandatoryFirstCal.indexOf(b.label);

                            if (indexA !== -1 && indexB === -1) return -1;
                            if (indexA === -1 && indexB !== -1) return 1;

                            return a.label.localeCompare(b.label);
                        });

                        oCalKeyFigData.items = calItems;
                        calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

                        fadeDisabledTexts(norKeyFig);
                        fadeDisabledTexts(calKeyFig);
                    }
                }

                this._oKeyFigPopup.open();
                this._oKeyFigPopup._oPopup.setContentHeight("26rem");
                this._oKeyFigPopup._oPopup.setContentWidth("26rem");
            },

            onCloseKeyFig: function (event) {
                const reason = event.getParameters().reason;
                sap.ui.core.BusyIndicator.show();

                if (reason === "Ok" || reason === undefined) {

                    // --------------------------------------------
                    //   LOAD P13N DATA (Normal + Calculated)
                    // --------------------------------------------
                    let p13Data1 = that.oCore.byId("idNorKeyFigureOPTMIXP").getP13nData(); // Normal
                    let p13Data2 = that.oCore.byId("idCalKeyFigureOPMIXP").getP13nData(); // Calculated

                    const SnorKeyFig = that.oCore.byId("idNorKeyFigureOPTMIXP"),
                        ScalKeyFig = that.oCore.byId("idCalKeyFigureOPMIXP");

                    SnorKeyFig.setP13nData(p13Data1);
                    ScalKeyFig.setP13nData(p13Data2);

                    // --------------------------------------------
                    // STORE KEY FIGURE VISIBILITY
                    // --------------------------------------------

                    let oKeyFigVisible = {};

                    // Normal
                    p13Data1.forEach(function (item) {
                        oKeyFigVisible[item.key] = item.visible;
                    });

                    // Calculated
                    p13Data2.forEach(function (item) {
                        oKeyFigVisible[item.key] = item.visible;
                    });

                    // store globally
                    that.oGModel.setProperty("/KeyFigVisible", oKeyFigVisible);

                    console.log(oKeyFigVisible);

                    // --------------------------------------------
                    //   CHECK KEY FIGS SELECTED
                    // --------------------------------------------
                    const oNrmcheckKeys = [102, 152, 103, 153]; // special normal
                    const oCalcheckKeys = [994, 995];           // special calculated

                    const selectedNormalKF = p13Data1.filter(f => f.visible).map(f => f.key);
                    const selectedCalcKF = p13Data2.filter(f => f.visible).map(f => f.key);

                    const allSelected = [...selectedNormalKF, ...selectedCalcKF];

                    // special KF logic
                    const isSpecialSelected =
                        allSelected.some(k => oNrmcheckKeys.includes(k)) ||
                        allSelected.some(k => oCalcheckKeys.includes(k));

                    // any KF visible (your existing logic)
                    const anyNormVisible = p13Data1.some(item => item.visible);
                    const anyCalVisible = p13Data2.some(item => item.visible);

                    const anyVisible = anyNormVisible || anyCalVisible;

                    that.anyVisible = anyVisible;
                    that.KeyfigsVisible = anyVisible;

                    // --------------------------------------------
                    //   UPDATE FILTERS (Customer Group logic)
                    // --------------------------------------------
                    const table = sap.ui.getCore().byId("idDataTableOPMIXP");
                    let filters = table.getModel().getData().data;

                    filters = filters.map(f => {

                        if (f.field === "Customer Group") {

                            // 1️⃣ Special key figs selected → force select = false
                            if (isSpecialSelected) {
                                f.select = false;
                                return f;
                            }

                            // 2️⃣ Otherwise → KEEP USER'S ORIGINAL VALUE
                            // Do not override select = true/false
                            return f;
                        }

                        return f;
                    });

                    table.setModel(new JSONModel({ data: filters }));

                    // --------------------------------------------
                    //   STORE SELECTED KEY FIGS
                    // --------------------------------------------
                    that.oGModel.setProperty("/selectedNormalKF", selectedNormalKF);
                    that.oGModel.setProperty("/selectedCalcKF", selectedCalcKF);

                    // --------------------------------------------
                    //   REFRESH TABLE
                    // --------------------------------------------
                    let rowCount = that.oFreshData.length;



                    if (rowCount > 0) {
                        if (anyVisible && !that.keyVisible) {
                            that.oGo = false;
                            var item = that.oTree.getSelectedItem();

                            if (item) {
                                that.oGModel.setProperty("/TreeItemSelectForSel", {
                                    title: item.getTitle ? item.getTitle() : "",
                                    text: item.getHighlightText ? item.getHighlightText() : "",
                                    expanded: item.getExpanded ? item.getExpanded() : false,
                                    path: item.getBindingContext("treeModel")
                                        ? item.getBindingContext("treeModel").getPath()
                                        : ""
                                });
                            }
                            that.onCloseColSettings();
                            // that.loadData();
                        } else {
                            that.onCloseColSettings();
                        }
                    }


                } else if (reason === "Cancel") {

                    sap.ui.core.BusyIndicator.hide();
                    // no action
                }
            },

            getExpandLevel: function () {
                var mulInpLoc = that.getView().byId("mlLoc");
                var mulInpPro = that.getView().byId("mlProd");
                var mulInpCls = that.getView().byId("mlCls");
                var mulInpChar = that.getView().byId("mlChar");
                var mulInpCharVal = that.getView().byId("mlCharVal");
                if (mulInpLoc.getTokens().length > 0) {
                    this.oTree.expandToLevel(1);
                }
                if (mulInpPro.getTokens().length > 0) {
                    this.oTree.expandToLevel(2);
                }
                if (mulInpChar.getTokens().length > 0) {
                    this.oTree.expandToLevel(3);
                }
                if (mulInpCharVal.getTokens().length > 0) {
                    this.oTree.expandToLevel(4);
                }
            },

            getOptPerData: function (data) {
                console.time("getOptPerData");
                let resultMap = new Map();
                that.commentsMap = new Map();
                const weekDates = that.dates;
                const weekIndex = that.staticColumns.length;
                const manualKey = that.ManualKeyArr[0];
                let toggleCharFlag = false;
                let toggleCharValFlag = false;
                let previousCharNum = "";
                let previousCharValNum = "";


                if (that.Flag === "M") {

                    var normalKeyFig = sap.ui.getCore().byId("idNorKeyFigureOPTMIXP")
                    var oNkfig = normalKeyFig.oModels.$p13n.getData().items


                    var oTotalNkfig = that.oGModel.getProperty("/oMnulSv_Kfg");

                    var onormalMap = new Map(oNkfig.map(item => [item.label, item]));
                    var totalNormMap = new Map(oTotalNkfig.map(item => [item.label, item]));

                    // Get union of all labels
                    var allLabels = Array.from(new Set([
                        ...oNkfig.map(i => i.label),
                        ...oTotalNkfig.map(i => i.label)
                    ]));

                    // Build the final array
                    var NormergedArray = allLabels.map(label => {
                        var normalItem = onormalMap.get(label);
                        var totalItem = totalNormMap.get(label);

                        // Merge if exists in both
                        if (normalItem && totalItem) {
                            return {
                                key: totalItem.key ?? normalItem.key,
                                label: label,
                                visible: true,
                                enabled: true
                            };
                        } else {
                            // Exists in only one array → visible/enabled false
                            return {
                                key: (normalItem?.key ?? totalItem?.key) || null,
                                label: label,
                                visible: false,
                                enabled: true
                            };
                        }
                    });

                    var CalKeyFig = sap.ui.getCore().byId("idCalKeyFigureOPMIXP")
                    var oCalfig = CalKeyFig.oModels.$p13n.getData().items


                    var oTotalCalkeyfig = that.oGModel.getProperty("/oCalu_Kfg");

                    var oCalcMap = new Map(oCalfig.map(item => [item.label, item]));
                    var totalCalMap = new Map(oTotalCalkeyfig.map(item => [item.label, item]));

                    // Get union of all labels
                    var allCalLabels = Array.from(new Set([
                        ...oCalfig.map(i => i.label),
                        ...oTotalCalkeyfig.map(i => i.label)
                    ]));

                    // Build the final array
                    var CalmergedArray = allCalLabels.map(label => {
                        var calItem = oCalcMap.get(label);
                        var totalcalItem = totalCalMap.get(label);

                        // Merge if exists in both
                        if (calItem && totalcalItem) {
                            return {
                                key: totalcalItem.key ?? calItem.key,
                                label: label,
                                visible: true,
                                enabled: true
                            };
                        } else {
                            // Exists in only one array → visible/enabled false
                            return {
                                key: (calItem?.key ?? totalcalItem?.key) || null,
                                label: label,
                                visible: false,
                                enabled: true
                            };
                        }
                    });

                    normalKeyFig.setP13nData(NormergedArray);
                    CalKeyFig.setP13nData(CalmergedArray);

                    var totalKeyFigs = [
                        ...NormergedArray.filter(fig => fig.visible),
                        ...CalmergedArray.filter(fig => fig.visible)
                    ];

                    // Update the model with new values
                    that.oGModel.setProperty("/normalKeyFig", normalKeyFig);
                    that.oGModel.setProperty("/CalKeyFig", CalKeyFig);
                    that.Flag = ""

                } else {
                    // that.Flag = ""
                    var totalKeyFigs = [
                        ...that.oCore
                            .byId("idNorKeyFigureOPTMIXP")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                        ...that.oCore
                            .byId("idCalKeyFigureOPMIXP")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                    ];
                }

                //  var totalKeyFigs = [
                //         ...that.oCore
                //             .byId("idNorKeyFigureOPTMIXP")
                //             .getP13nData()
                //             .filter((fig) => fig.visible),
                //         ...that.oCore
                //             .byId("idCalKeyFigureOPMIXP")
                //             .getP13nData()
                //             .filter((fig) => fig.visible),
                //     ];


                var visibleKeyFigs = totalKeyFigs.filter(
                    (f) => f.key <= 200 || f.key >= 999
                )

                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                that.oCharObj = {};
                that.comments = [];
                // Step 1: Group data by key combination including TYPE
                // Create once before loop
                const weekMap = new Map(
                    totalDates.map(w => [w[that.weekType], w.WEEK_STARTDATE])
                );

                console.time("createLockMap");
                const lockMap = new Map();

                that.lockComments.forEach(lock => {
                    const key =
                        `${lock.LOCATION_ID}|${lock.PRODUCT_ID}|${lock.CUSTOMER_GROUP}|` +
                        `${lock.CHAR_NUM}|${lock.CHARVAL_NUM}|${lock.VERSION}|` +
                        `${lock.SCENARIO}|${lock.MODEL_VERSION}|${lock.TYPE}|` +
                        new Date(lock.WEEK_DATE).toLocaleDateString("en-CA");

                    lockMap.set(key, lock);
                });
                for (let index = 0; index < data.length; index++) {
                    const item = data[index];
                    if (!item.CHAR_NUM) {
                        continue;
                    }
                    // item.WEEKDATE = totalDates.find(
                    //     (w) => w[that.weekType] === item[that.weekType]
                    // ).WEEK_STARTDATE;

                    item.WEEKDATE = weekMap.get(item[that.weekType]);
                    // const lockItem = that.lockComments.find(
                    //     (lock) =>
                    //         item.LOCATION_ID === lock.LOCATION_ID &&
                    //         item.PRODUCT_ID === lock.PRODUCT_ID &&
                    //         item.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
                    //         item.CHAR_NUM === lock.CHAR_NUM &&
                    //         item.CHARVAL_NUM === lock.CHARVAL_NUM &&
                    //         item.VERSION === lock.VERSION &&
                    //         item.SCENARIO === lock.SCENARIO &&
                    //         item.MODEL_VERSION === lock.MODEL_VERSION &&
                    //         item.TYPE == lock.TYPE &&
                    //         item.WEEKDATE.toLocaleDateString("en-CA") ===
                    //         lock.WEEK_DATE.toLocaleDateString("en-CA")
                    // );
                    // FAST lock lookup
                    const lockKey =
                        `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|` +
                        `${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.VERSION}|` +
                        `${item.SCENARIO}|${item.MODEL_VERSION}|${item.TYPE}|` +
                        new Date(item.WEEKDATE).toLocaleDateString("en-CA");

                    const lockItem = lockMap.get(lockKey);

                    if (lockItem) {
                        item.LOCK = lockItem.LOCK;
                        item.TYPE = lockItem.TYPE;
                        if (lockItem.COMMENTS) {
                            item.COMMENTS = lockItem.COMMENTS;
                        }
                    }
                    let baseKey = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}`;

                    const baseData = mapBaseFields(item);
                    if (index === 0 || item.CHAR_NUM !== previousCharNum) {
                        toggleCharFlag = !toggleCharFlag;
                        previousCharNum = item.CHAR_NUM;
                    }
                    baseData.FLAG = toggleCharFlag;
                    if (index === 0 || item.CHARVAL_NUM !== previousCharValNum) {
                        toggleCharValFlag = !toggleCharValFlag;
                        previousCharValNum = item.CHARVAL_NUM;
                    }
                    baseData.FLAG_CV = toggleCharValFlag;

                    const emptyWeekObj = {};

                    weekDates.forEach(date => {
                        emptyWeekObj[date] = "";
                    });
                    // Initialize all week dates with empty strings for all the key figures
                    for (let j = 0; j < visibleKeyFigs.length; j++) {
                        const keyFig = visibleKeyFigs[j];
                        let keyWithType = `${baseKey}|${keyFig.key}`;
                        if (!resultMap.has(keyWithType)) {
                            resultMap.set(keyWithType, {
                                ...baseData,
                                LOCATION_ID: item.LOCATION_ID,
                                PRODUCT_ID: item.PRODUCT_ID,
                                CUSTOMER_GROUP: item.CUSTOMER_GROUP,
                                // CLASS_NUM: item.CLASS_NUM,
                                CHAR_NUM: item.CHAR_NUM,
                                CHAR_NAME: item.CHAR_NAME,
                                CHARVAL_NUM: item.CHARVAL_NUM,
                                VERSION: item.VERSION,
                                SCENARIO: item.SCENARIO,
                                MODEL_VERSION: item.MODEL_VERSION,
                                TYPE: keyFig.key,
                                KEY_FIG_ID: keyFig.key,
                                KEY_FIG_DESC: keyFig.label,
                                DISPLAY_ORDER: keyFig.key,
                                PRIORITY_ORDER: keyFig.key,
                                ...emptyWeekObj
                                // ...weekDates.reduce((acc, date) => {
                                //     acc[date] = "";
                                //     return acc;
                                // }, {}),
                            });
                        }
                        // Assign the OPT_PERCENT and OPT_QTY to the correct week column for key figures less than 50
                        if (item.TYPE == keyFig.key && item.TYPE < 50) {
                            if (item.COMMENTS && lockItem) {
                                const key = `${item[that.weekType]}_COMMENTS`;
                                resultMap.get(keyWithType)[key] = lockItem.COMMENTS;
                                ``;
                            }
                            item.OPT_PERCENT = parseFloat(item.OPT_PERCENT)
                                .toFixed(2)
                                .toString();
                            let percentValue = item.OPT_PERCENT.includes("%")
                                ? item.OPT_PERCENT
                                : item.OPT_PERCENT + "%";
                            resultMap.get(keyWithType)[item[that.weekType]] = item.LOCK
                                ? `🔒${percentValue}`
                                : percentValue;
                        }
                        else if (keyFig.key > 50 && keyFig.key < 100) {
                            let value = keyFig.key - 50;
                            if (item.TYPE == value) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(item.OPT_QTY)
                                    : 0;
                            }
                        }
                        else if (item.TYPE > 100 && item.TYPE <= 150 && item.TYPE == keyFig.key) {
                            resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT + "%"}`;
                        }
                        else if (keyFig.key > 150 && keyFig.key < 200) {
                            let value = keyFig.key - 50;
                            if (item.TYPE == value) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(item.OPT_QTY)
                                    : 0;
                            }
                        }
                        else if (item.TYPE == 1000) {
                            if (keyFig.key == 1000) {
                                item.OPT_PERCENT = `${item.OPT_PERCENT}`
                                    ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
                                    : parseFloat(`${item.OPT_PERCENT}`) || 0;
                                resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
                                    ? item.OPT_PERCENT
                                    : item.OPT_PERCENT + "%"
                                    }`;
                            } else if (keyFig.key == 1100) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
                                    : Math.round(item.OPT_QTY) || 0;
                            }
                        } else if (item.TYPE == 1001) {
                            if (keyFig.key == 1001) {
                                item.OPT_PERCENT = `${item.OPT_PERCENT}`
                                    ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
                                    : parseFloat(`${item.OPT_PERCENT}`) || 0;
                                resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
                                    ? item.OPT_PERCENT
                                    : item.OPT_PERCENT + "%"
                                    }`;
                            } else if (keyFig.key == 1101) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
                                    : Math.round(item.OPT_QTY) || 0;
                            }
                        }
                    }
                }


                that.commentsMap = resultMap
                console.timeEnd("getOptPerData");
                return Array.from(resultMap.values());

                // Helper Functions
                function mapBaseFields(item) {
                    return {
                        LOCATION:
                            that.getFieldCategory("Location", item) || item.LOCATION_ID,
                        PRODUCT: that.getFieldCategory("Product", item) || item.PRODUCT_ID,
                        // CLASS: that.getFieldCategory("Class", item) || item.CLASS_NUM,
                        CHAR:
                            that.getFieldCategory("Characteristic", item) || item.CHAR_NAME,
                        CHARVAL:
                            that.getFieldCategory("Characteristic Value", item) ||
                            item.CHARVAL_NUM,
                        VER: that.getFieldCategory("Version", item) || item.VERSION,
                        SCEN: that.getFieldCategory("Scenario", item) || item.SCENARIO,
                    };
                }
            },

            getOptPerDataOriginal: function (data) {
                let resultMap = new Map();
                that.commentsMap = new Map();
                const weekDates = that.dates;
                const weekIndex = that.staticColumns.length;
                const manualKey = that.ManualKeyArr[0];
                let toggleCharFlag = false;
                let toggleCharValFlag = false;
                let previousCharNum = "";
                let previousCharValNum = "";


                if (that.Flag === "M") {

                    var normalKeyFig = sap.ui.getCore().byId("idNorKeyFigureOPTMIXP")
                    var oNkfig = normalKeyFig.oModels.$p13n.getData().items


                    var oTotalNkfig = that.oGModel.getProperty("/oMnulSv_Kfg");

                    var onormalMap = new Map(oNkfig.map(item => [item.label, item]));
                    var totalNormMap = new Map(oTotalNkfig.map(item => [item.label, item]));

                    // Get union of all labels
                    var allLabels = Array.from(new Set([
                        ...oNkfig.map(i => i.label),
                        ...oTotalNkfig.map(i => i.label)
                    ]));

                    // Build the final array
                    var NormergedArray = allLabels.map(label => {
                        var normalItem = onormalMap.get(label);
                        var totalItem = totalNormMap.get(label);

                        // Merge if exists in both
                        if (normalItem && totalItem) {
                            return {
                                key: totalItem.key ?? normalItem.key,
                                label: label,
                                visible: true,
                                enabled: true
                            };
                        } else {
                            // Exists in only one array → visible/enabled false
                            return {
                                key: (normalItem?.key ?? totalItem?.key) || null,
                                label: label,
                                visible: false,
                                enabled: true
                            };
                        }
                    });

                    var CalKeyFig = sap.ui.getCore().byId("idCalKeyFigureOPMIXP")
                    var oCalfig = CalKeyFig.oModels.$p13n.getData().items


                    var oTotalCalkeyfig = that.oGModel.getProperty("/oCalu_Kfg");

                    var oCalcMap = new Map(oCalfig.map(item => [item.label, item]));
                    var totalCalMap = new Map(oTotalCalkeyfig.map(item => [item.label, item]));

                    // Get union of all labels
                    var allCalLabels = Array.from(new Set([
                        ...oCalfig.map(i => i.label),
                        ...oTotalCalkeyfig.map(i => i.label)
                    ]));

                    // Build the final array
                    var CalmergedArray = allCalLabels.map(label => {
                        var calItem = oCalcMap.get(label);
                        var totalcalItem = totalCalMap.get(label);

                        // Merge if exists in both
                        if (calItem && totalcalItem) {
                            return {
                                key: totalcalItem.key ?? calItem.key,
                                label: label,
                                visible: true,
                                enabled: true
                            };
                        } else {
                            // Exists in only one array → visible/enabled false
                            return {
                                key: (calItem?.key ?? totalcalItem?.key) || null,
                                label: label,
                                visible: false,
                                enabled: true
                            };
                        }
                    });

                    normalKeyFig.setP13nData(NormergedArray);
                    CalKeyFig.setP13nData(CalmergedArray);

                    var totalKeyFigs = [
                        ...NormergedArray.filter(fig => fig.visible),
                        ...CalmergedArray.filter(fig => fig.visible)
                    ];

                    // Update the model with new values
                    that.oGModel.setProperty("/normalKeyFig", normalKeyFig);
                    that.oGModel.setProperty("/CalKeyFig", CalKeyFig);
                    that.Flag = ""

                } else {
                    // that.Flag = ""
                    var totalKeyFigs = [
                        ...that.oCore
                            .byId("idNorKeyFigureOPTMIXP")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                        ...that.oCore
                            .byId("idCalKeyFigureOPMIXP")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                    ];
                }

                //  var totalKeyFigs = [
                //         ...that.oCore
                //             .byId("idNorKeyFigureOPTMIXP")
                //             .getP13nData()
                //             .filter((fig) => fig.visible),
                //         ...that.oCore
                //             .byId("idCalKeyFigureOPMIXP")
                //             .getP13nData()
                //             .filter((fig) => fig.visible),
                //     ];


                var visibleKeyFigs = totalKeyFigs.filter(
                    (f) => f.key <= 200 || f.key >= 999
                )

                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                that.oCharObj = {};
                that.comments = [];
                // Step 1: Group data by key combination including TYPE
                for (let index = 0; index < data.length; index++) {
                    const item = data[index];
                    if (!item.CHAR_NUM) {
                        continue;
                    }
                    item.WEEKDATE = totalDates.find(
                        (w) => w[that.weekType] === item[that.weekType]
                    ).WEEK_STARTDATE;
                    const lockItem = that.lockComments.find(
                        (lock) =>
                            item.LOCATION_ID === lock.LOCATION_ID &&
                            item.PRODUCT_ID === lock.PRODUCT_ID &&
                            item.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
                            item.CHAR_NUM === lock.CHAR_NUM &&
                            item.CHARVAL_NUM === lock.CHARVAL_NUM &&
                            item.VERSION === lock.VERSION &&
                            item.SCENARIO === lock.SCENARIO &&
                            item.MODEL_VERSION === lock.MODEL_VERSION &&
                            item.TYPE == lock.TYPE &&
                            item.WEEKDATE.toLocaleDateString("en-CA") ===
                            lock.WEEK_DATE.toLocaleDateString("en-CA")
                    );
                    if (lockItem) {
                        item.LOCK = lockItem.LOCK;
                        item.TYPE = lockItem.TYPE;
                        if (lockItem.COMMENTS) {
                            item.COMMENTS = lockItem.COMMENTS;
                        }
                    }
                    let baseKey = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}`;

                    const baseData = mapBaseFields(item);
                    if (index === 0 || item.CHAR_NUM !== previousCharNum) {
                        toggleCharFlag = !toggleCharFlag;
                        previousCharNum = item.CHAR_NUM;
                    }
                    baseData.FLAG = toggleCharFlag;
                    if (index === 0 || item.CHARVAL_NUM !== previousCharValNum) {
                        toggleCharValFlag = !toggleCharValFlag;
                        previousCharValNum = item.CHARVAL_NUM;
                    }
                    baseData.FLAG_CV = toggleCharValFlag;
                    // Initialize all week dates with empty strings for all the key figures
                    for (let j = 0; j < visibleKeyFigs.length; j++) {
                        const keyFig = visibleKeyFigs[j];
                        let keyWithType = `${baseKey}|${keyFig.key}`;
                        if (!resultMap.has(keyWithType)) {
                            resultMap.set(keyWithType, {
                                ...baseData,
                                LOCATION_ID: item.LOCATION_ID,
                                PRODUCT_ID: item.PRODUCT_ID,
                                CUSTOMER_GROUP: item.CUSTOMER_GROUP,
                                // CLASS_NUM: item.CLASS_NUM,
                                CHAR_NUM: item.CHAR_NUM,
                                CHAR_NAME: item.CHAR_NAME,
                                CHARVAL_NUM: item.CHARVAL_NUM,
                                VERSION: item.VERSION,
                                SCENARIO: item.SCENARIO,
                                MODEL_VERSION: item.MODEL_VERSION,
                                TYPE: keyFig.key,
                                KEY_FIG_ID: keyFig.key,
                                KEY_FIG_DESC: keyFig.label,
                                DISPLAY_ORDER: keyFig.key,
                                PRIORITY_ORDER: keyFig.key,
                                ...weekDates.reduce((acc, date) => {
                                    acc[date] = "";
                                    return acc;
                                }, {}),
                            });
                        }
                        // Assign the OPT_PERCENT and OPT_QTY to the correct week column for key figures less than 50
                        if (item.TYPE == keyFig.key && item.TYPE < 50) {
                            if (item.COMMENTS && lockItem) {
                                const key = `${item[that.weekType]}_COMMENTS`;
                                resultMap.get(keyWithType)[key] = lockItem.COMMENTS;
                                ``;
                            }
                            item.OPT_PERCENT = parseFloat(item.OPT_PERCENT)
                                .toFixed(2)
                                .toString();
                            let percentValue = item.OPT_PERCENT.includes("%")
                                ? item.OPT_PERCENT
                                : item.OPT_PERCENT + "%";
                            resultMap.get(keyWithType)[item[that.weekType]] = item.LOCK
                                ? `🔒${percentValue}`
                                : percentValue;
                        }
                        else if (keyFig.key > 50 && keyFig.key < 100) {
                            let value = keyFig.key - 50;
                            if (item.TYPE == value) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(item.OPT_QTY)
                                    : 0;
                            }
                        }
                        else if (item.TYPE > 100 && item.TYPE <= 150 && item.TYPE == keyFig.key) {
                            resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT + "%"}`;
                        }
                        else if (keyFig.key > 150 && keyFig.key < 200) {
                            let value = keyFig.key - 50;
                            if (item.TYPE == value) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(item.OPT_QTY)
                                    : 0;
                            }
                        }
                        else if (item.TYPE == 1000) {
                            if (keyFig.key == 1000) {
                                item.OPT_PERCENT = `${item.OPT_PERCENT}`
                                    ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
                                    : parseFloat(`${item.OPT_PERCENT}`) || 0;
                                resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
                                    ? item.OPT_PERCENT
                                    : item.OPT_PERCENT + "%"
                                    }`;
                            } else if (keyFig.key == 1100) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
                                    : Math.round(item.OPT_QTY) || 0;
                            }
                        } else if (item.TYPE == 1001) {
                            if (keyFig.key == 1001) {
                                item.OPT_PERCENT = `${item.OPT_PERCENT}`
                                    ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
                                    : parseFloat(`${item.OPT_PERCENT}`) || 0;
                                resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
                                    ? item.OPT_PERCENT
                                    : item.OPT_PERCENT + "%"
                                    }`;
                            } else if (keyFig.key == 1101) {
                                resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
                                    ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
                                    : Math.round(item.OPT_QTY) || 0;
                            }
                        }
                    }
                }

                // let index = 0;
                // resultMap.forEach((value, key) => {
                //     let keyType = value.TYPE;
                //     for (let k = 0; k < weekDates.length; k++) {
                //         const date = weekDates[k];
                //         if (keyType === manualKey.KEY_FIG_ID) {
                //             if (value[`${date}_COMMENTS`]) {
                //                 that.comments.push({
                //                     row: index,
                //                     col: k + weekIndex,
                //                     comment: { value: value[`${date}_COMMENTS`] },
                //                 });
                //             }
                //         }
                //     }
                //     index++;
                // });

                that.commentsMap = resultMap
                return Array.from(resultMap.values());

                // Helper Functions
                function mapBaseFields(item) {
                    return {
                        LOCATION:
                            that.getFieldCategory("Location", item) || item.LOCATION_ID,
                        PRODUCT: that.getFieldCategory("Product", item) || item.PRODUCT_ID,
                        // CLASS: that.getFieldCategory("Class", item) || item.CLASS_NUM,
                        CHAR:
                            that.getFieldCategory("Characteristic", item) || item.CHAR_NAME,
                        CHARVAL:
                            that.getFieldCategory("Characteristic Value", item) ||
                            item.CHARVAL_NUM,
                        VER: that.getFieldCategory("Version", item) || item.VERSION,
                        SCEN: that.getFieldCategory("Scenario", item) || item.SCENARIO,
                    };
                }
            },

            getFieldCategory: function (field, object) {
                const items = that.selectItems;
                if (!items) return undefined;
                const selectField = items.find(
                    (item) => item.getBindingContext().getObject().field === field
                );
                if (selectField) {
                    let key = selectField.getCells()[1].getSelectedKey();
                    if (field === "Location") {
                        if (key === "ID") {
                            field = object.LOCATION_ID;
                        } else if (key === "Description") {
                            field = object.LOCATION_DESC;
                        } else if (key === "ID-Description") {
                            field = object.LOCATION_DESC + " - " + object.LOCATION_ID;
                        }
                    }
                    if (field === "Product") {
                        if (key === "ID") {
                            field = object.PRODUCT_ID;
                        } else if (key === "Description") {
                            field = object.PROD_DESC;
                        } else if (key === "ID-Description") {
                            field = object.PROD_DESC + " - " + object.PRODUCT_ID;
                        }
                    }
                    if (field === "Customer Group") {
                        field = object.CUSTOMER_GROUP;
                    }
                    if (field === "Class") {
                        if (key === "ID") {
                            field = object.CLASS_NUM;
                        } else if (key === "Description") {
                            field = object.CLASS_DESC;
                        } else if (key === "ID-Description") {
                            field = object.CLASS_DESC + " - " + object.CLASS_NUM;
                        }
                    }
                    if (field === "Characteristic") {
                        if (key === "ID") {
                            field = object.CHAR_NAME;
                        } else if (key === "Description") {
                            field = object.CHAR_DESC;
                        } else if (key === "ID-Description") {
                            field = object.CHAR_DESC + " - " + object.CHAR_NAME;
                        }
                    }
                    if (field === "Characteristic Value") {
                        if (key === "ID") {
                            field = object.CHARVAL_NUM;
                        } else if (key === "Description") {
                            field = object.CHARVAL_DESC;
                        } else if (key === "ID-Description") {
                            field = object.CHARVAL_DESC + " - " + object.CHARVAL_NUM;
                        }
                    }
                    if (field === "Version") {
                        if (key === "ID") {
                            field = object.VERSION;
                        } else if (key === "Description") {
                            field = object.VERSION_NAME;
                        } else if (key === "ID-Description") {
                            field = object.VERSION_NAME + " - " + object.VERSION;
                        }
                    }
                    if (field === "Scenario") {
                        if (key === "ID") {
                            field = object.SCENARIO;
                        } else if (key === "Description") {
                            field = object.SCENARIO_NAME;
                        } else if (key === "ID-Description") {
                            field = object.SCENARIO_NAME + " - " + object.SCENARIO;
                        }
                    }
                    return field;
                }
            },

            getSubExcelData: function (params) {
                let emptyDataFlag = false;
                if (params.length == 0) {
                    if (that.allData.length > 0) {
                        emptyDataFlag = true;
                        params = that.removeDuplicates(that.allData, [
                            "LOCATION_ID",
                            "PRODUCT_ID",
                            "CUSTOMER_GROUP",
                        ]);
                    }
                }
                let resultMap = new Map();
                const weekDates = that.dates;
                let fieldNames = that.convertFieldNames([...that.staticColumns]);
                const totalKeyFigs = [
                    ...that.oCore
                        .byId("idNorKeyFigureOPTMIXP")
                        .getP13nData()
                        .filter((fig) => fig.visible),
                    ...that.oCore
                        .byId("idCalKeyFigureOPMIXP")
                        .getP13nData()
                        .filter((fig) => fig.visible),
                ];
                let visibleKeyFigs = totalKeyFigs.filter(
                    (f) => f.key > 200 && f.key < 999
                );
                if (emptyDataFlag) {
                    visibleKeyFigs = visibleKeyFigs.filter((f) => f.key == 997);
                }
                // Remove specific elements
                fieldNames = fieldNames.filter(
                    (item) => !["CHAR_NUM", "CHARVAL_NUM", that.weekType].includes(item)
                );
                for (let index = 0; index < params.length; index++) {
                    const item = params[index];
                    let key = fieldNames.map((fieldName) => item[fieldName]).join("|");
                    let baseKey = key.split("|").slice(0, -1).join("|");
                    for (let j = 0; j < visibleKeyFigs.length; j++) {
                        const keyFig = visibleKeyFigs[j];
                        key = `${baseKey}|${keyFig.key}`;
                        if (!resultMap.has(key)) {
                            resultMap.set(key, {
                                LOCATION: item.LOCATION_ID,
                                PRODUCT: item.PRODUCT_ID,
                                CUSTOMER_GROUP: item.CUSTOMER_GROUP,
                                TYPE: keyFig.key,
                                VERSION: item.VERSION,
                                SCENARIO: item.SCENARIO,
                                TYPE: keyFig.key,
                                KEY_FIG_ID: keyFig.key,
                                KEY_FIG_DESC: keyFig.label,
                                DISPLAY_ORDER: keyFig.key,
                                PRIORITY_ORDER: keyFig.key,
                                ...weekDates.reduce((acc, date) => {
                                    acc[date] = emptyDataFlag ? 0 : "";
                                    return acc;
                                }, {}), // Initialize week dates with 0
                            });
                        }
                        if (item.TYPE == keyFig.key && item.OPT_QTY) {
                            if (resultMap.get(key)[item[that.weekType]]) {
                                resultMap.get(key)[item[that.weekType]] = parseFloat(
                                    resultMap.get(key)[item[that.weekType]]
                                );
                            }
                            resultMap.get(key)[item[that.weekType]] =
                                resultMap.get(key)[item[that.weekType]] +
                                parseFloat(item.OPT_QTY);
                        }
                    }
                }
                return Array.from(resultMap.values());
            },

            generateExcel: function (data, mondays) {
                var columns = $.extend(true, [], that.staticColumns);
                var excelRows = $.extend(true, [], that.staticRows);
                for (var index = 0; index < mondays.length; index++) {
                    columns.push(mondays[index]);
                    excelRows.push({
                        data: mondays[index],
                        readOnly: false,
                        wordWrap: true,
                    });
                }
                that.loadExcel(data, excelRows, columns);
            },

            generateSubExcel: function (data, mondays) {
                var columns = $.extend(true, [], that.staticColumns);
                columns = columns.filter(
                    (s) => s != "Characteristic" && s != "Characteristic Value"
                );
                var excelRows = $.extend(true, [], that.staticRows);
                excelRows = excelRows.filter(
                    (s) => s.data != "CHAR" && s.data !== "CHARVAL"
                );
                for (var index = 0; index < mondays.length; index++) {
                    columns.push(mondays[index]);
                    excelRows.push({
                        data: mondays[index],
                        readOnly: false,
                        wordWrap: true,
                    });
                }
                this.loadSubExcel(data, excelRows, columns);
            },


            buildUI5Filters: function (oFilterObj) {
                let aMainFilters = [];

                Object.keys(oFilterObj).forEach(key => {

                    // Skip date range (we handle later)
                    if (key === "DATE_RANGE") return;

                    let values = oFilterObj[key];

                    // Multiple values → OR group
                    if (Array.isArray(values) && values.length > 1) {

                        let aSubFilters = values.map(v => {
                            return new sap.ui.model.Filter(key, sap.ui.model.FilterOperator.EQ, v);
                        });

                        aMainFilters.push(
                            new sap.ui.model.Filter({
                                filters: aSubFilters,
                                and: false      // OR condition
                            })
                        );
                    }
                    // Single value → EQ filter
                    else if (Array.isArray(values) && values.length === 1) {
                        aMainFilters.push(
                            new sap.ui.model.Filter(key, sap.ui.model.FilterOperator.EQ, values[0])
                        );
                    }
                });

                // DATE RANGE (BT)
                if (oFilterObj.DATE_RANGE) {
                    let d = oFilterObj.DATE_RANGE;

                    aMainFilters.push(
                        new sap.ui.model.Filter(
                            d.sPath,
                            sap.ui.model.FilterOperator.BT,
                            d.oValue1,
                            d.oValue2
                        )
                    );
                }

                // Wrap into MultiFilter (AND all props)
                return new sap.ui.model.Filter({
                    filters: aMainFilters,
                    and: true
                });
            },


            loadData: async function (evt) {
                const that = this;

                try {
                    // Wait for /totalWeekTypes to be ready
                    if (this._totalWeekPromise) {
                        await this._totalWeekPromise;
                    }

                    const totalDatesData = that.oGModel.getProperty("/totalWeekTypes");

                    if (!totalDatesData || !Array.isArray(totalDatesData) || totalDatesData.length === 0) {
                        sap.m.MessageToast.show("Week data not yet loaded. Please wait and try again.");
                        return;
                    }

                    //  Now proceed with your existing logic
                    const oWeekTypeKey = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                    const oSmartFilterBar = this.byId("smartFilterBar");

                    const oDateRange = this.byId("idWeekDateOPMIXP");
                    const dateValues = oDateRange.getValue().split(" - ");

                    const currentWeek = totalDatesData.find(f =>
                        dateValues[0] >= that.convertDate(f.WEEK_STARTDATE, '-') &&
                        dateValues[0] <= that.convertDate(f.WEEK_ENDDATE, '-')
                    );

                    if (!currentWeek) {
                        sap.m.MessageToast.show("Selected date range does not match any week.");
                        return;
                    }

                    const oValue1 = that.convertDate(currentWeek.WEEK_STARTDATE, '-');
                    const oValue2 = dateValues[1];
                    const weekFilter = new sap.ui.model.Filter("WEEK_STARTDATE", sap.ui.model.FilterOperator.BT, oValue1, oValue2);

                    //  Continue your original filter and service logic

                    var aFilters;
                    function getTokenKeys(aTokens) {
                        return aTokens.map(function (token) {
                            return token.getKey();   // or token.getText()
                        });
                    }
                    var oLocation = getTokenKeys(that.byId("idLocOPMIXP").getTokens());
                    var oProduct = that.byId("idProdOPMIXP").getValue();
                    var oCustomer = getTokenKeys(that.byId("idCustOPMIXP").getTokens());
                    var oChar = []; //getTokenKeys(that.byId("idCharOPMIXP").getTokens());
                    var oCharValnum = getTokenKeys(that.byId("idCharValuOPMIXP").getTokens());
                    var oVersion = that.oGModel.getProperty("/finalVersion");  //getTokenKeys(that.byId("idVersionOPMIXP").getTokens());
                    var oScenario = that.oGModel.getProperty("/finalScenario")  //getTokenKeys(that.byId("idScenarioOPMIXP").getTokens());
                    var oModelVersion = that.byId("idModelVerOPMIXP").getSelectedKey()


                    // var norKeyFig = that.oGModel.getProperty("/norKeyFig") || []
                    // var calKeyFig = that.oGModel.getProperty("/calKeyFig");
                    var aDefaultData = that.oGModel.getProperty("/oSeqData");
                    // If nothing selected → assign all CHAR_NUM
                    if (!oChar || oChar.length === 0) {
                        oChar = aDefaultData.map(o => o.CHAR_NUM);
                    }
                    // If selected → keep only selected CHAR_NUM
                    else {
                        oChar = oChar; // already contains selected CHAR_NUM
                    }

                    aFilters = {
                        LOCATION_ID: oLocation,     // array of location IDs
                        PRODUCT_ID: oProduct ? [oProduct] : [],   // convert to array
                        CUSTOMER_GROUP: oCustomer,// array
                        CHAR_NUM: oChar,
                        CHARVAL_NUM: oCharValnum,        // array
                        VERSION: [oVersion],          // array
                        SCENARIO: [oScenario],
                        MODEL_VERSION: [oModelVersion],
                        DATE_RANGE: weekFilter

                        // TYPE: TYPE // array
                    };

                    let oBaseFilter = this.buildUI5Filters(aFilters);

                    // FIX: wrap inside array!
                    let aFilterArray = [oBaseFilter];

                    let oCombinedFilter = this.handleVerScenFilter(aFilterArray);

                    that.weekType = oWeekTypeKey;
                    let topCount = 50000;
                    let urlparams = "";
                    let entity = "";
                    let serviceModel = "";

                    // sap.ui.core.BusyIndicator.show(0);
                    // var oAllKeyfigs = that.oCore.byId("idNorKeyFigureOPTMIXP").getP13nData();

                    if (oWeekTypeKey === "TELESCOPIC_WEEK") {
                        if (!that.oGo) {
                            if (that.KeyfigsVisible === true) {
                                sap.ui.core.BusyIndicator.show(0);
                                that.keyVisible = true;
                                serviceModel = that.oModel;
                                entity = "/getTelescopicFinalPlanNew1"
                                let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
                                const updatedFilter = finalApplyQuery
                                    .replace(/WEEK_STARTDATE/g, "PERIODSTART")
                                    .replace(/WEEK_ENDDATE/g, "PERIODEND");
                                const modifiedCharValFilter = addNullChecksToFilter(updatedFilter);

                                urlparams = {
                                    $skip: that.skip,
                                    $top: topCount,
                                    $apply: modifiedCharValFilter
                                    // $orderby:
                                    //     "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,PERIODSTART asc",
                                };
                            }
                        } else {
                            that.oTalData = [];
                            that.keyVisible = false;
                            serviceModel = that.oModel;
                            entity = "/getTelescopicFinalPlanNew";           //getTelescopicFinalPlanNew"
                            let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
                            const updatedFilter = finalApplyQuery
                                .replace(/WEEK_STARTDATE/g, "PERIODSTART")
                                .replace(/WEEK_ENDDATE/g, "PERIODEND");
                            const modifiedCharValFilter = addNullChecksToFilter(updatedFilter);

                            urlparams = {
                                $skip: that.skip,
                                $top: topCount,
                                $apply: modifiedCharValFilter
                                //     $orderby:
                                //         "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,PERIODSTART asc",
                            };
                        }
                    } else {
                        serviceModel = that.aModel;
                        entity = "/getFinalOptionPercentages";
                        let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
                        const modifiedCharValFilter = addNullChecksToFilter(finalApplyQuery);

                        urlparams = {
                            $skip: that.skip,
                            $top: topCount,
                            $apply: modifiedCharValFilter
                            // $orderby:
                            //     "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,WEEK_STARTDATE asc",
                        };
                    }

                    // Proceed to your existing service call
                    serviceModel.read(entity, {
                        urlParameters: urlparams,
                        success: function (oData) {


                            const tokenKeys = getTokenKeys(that.byId("idCharOPMIXP").getTokens());

                            let cleanedData = oData.results;
                            let allCharData = oData.results;

                            if (tokenKeys && tokenKeys.length > 0) {
                                cleanedData = cleanedData.filter(item =>
                                    tokenKeys.includes(item.CHAR_NUM)
                                );
                            }


                            // Check if more data needs to be loaded
                            if (topCount === cleanedData.length) {
                                that.skip += topCount;
                                that.oTalData = [...(that.oTalData || []), ...allCharData];
                                that.allData = [...(that.allData || []), ...cleanedData];
                                that.loadData(); // Recursively load more data
                            } else {
                                // sap.ui.core.BusyIndicator.hide();
                                sap.ui.core.BusyIndicator.show();
                                // Reset skip and finalize data
                                that.skip = 0;
                                that.oTalData = [...(that.oTalData || []), ...allCharData];
                                that.allData = [...(that.allData || []), ...cleanedData];

                                that.allData = that.removeDuplicates(that.allData, [
                                    "LOCATION_ID",
                                    "PRODUCT_ID",
                                    "CUSTOMER_GROUP",
                                    "CHAR_NUM",
                                    "CHARVAL_NUM",
                                    "VERSION",
                                    "SCENARIO",
                                    "MODEL_VERSION",
                                    oWeekTypeKey,
                                    "TYPE",
                                ]);



                                if (oWeekTypeKey == 'TELESCOPIC_WEEK') {
                                    that.allData.sort((a, b) => new Date(a.PERIODSTART) - new Date(b.PERIODSTART))
                                } else {
                                    that.allData.sort((a, b) => new Date(a.WEEK_STARTDATE) - new Date(b.WEEK_STARTDATE))
                                }
                                // Extract unique, sorted dates
                                that.dates = Array.from(
                                    new Set(
                                        that.allData.map((d) => {
                                            // Only rename OPT_PERCENT_AVERAGE if it exists
                                            if (d.hasOwnProperty("OPT_PERCENT_AVERAGE")) {
                                                d.OPT_PERCENT = d.OPT_PERCENT_AVERAGE;
                                                delete d.OPT_PERCENT_AVERAGE;
                                            }

                                            // Only rename OPT_QTY_SUM if it exists
                                            if (d.hasOwnProperty("OPT_QTY_SUM")) {
                                                d.OPT_QTY = d.OPT_QTY_SUM;
                                                delete d.OPT_QTY_SUM;
                                            }

                                            // Return the date field used for Set and sorting
                                            return d[oWeekTypeKey];
                                        })
                                    )
                                );

                                // Generate required views
                                if (that.oCharLvlData.length == 0) {
                                    that.generatePTree(that.oTalData);
                                } else {
                                    that.generateTree(that.oTalData);
                                }

                                that.oTree.setBusy(false);
                                if (that.allExpandNode && that.allExpandNode.length)
                                    that.oTree.expandToLevel(3);
                                if (that.selPath) {
                                    that.preSelNode = that.oTree
                                        .getItems()
                                        .find(
                                            (item) => item.getHighlightText() === that.selectedTreeText
                                        );
                                    if (that.preSelNode) {
                                        that.oTree.setSelectedItem(that.preSelNode);
                                    }
                                }
                                if (!that.isKeyFigureAlreadyGenerate) {
                                    that.generateKeyFigSettings(that.allData);
                                    that.isKeyFigureAlreadyGenerate = true;
                                }
                                // that.onCloseColSettings();
                                that.onTreeItemSelect();
                                that.ResetTree();

                                // Show success message if triggered by refresh
                                if (evt === "refreshData") {
                                    // that.FLAG = ""
                                    MessageToast.show("Successfully Saved Data");
                                }
                            }

                            // Update UI status
                            that.byId("idDynamicPage2OPMIXP").setBusy(false);
                            that.oTree.setBusy(false);
                            if (that.oTree.getSelectedItem() != null) {
                                var item = that.oTree.getSelectedItem()
                                if (item) {
                                    that.oGModel.setProperty("/TreeItemSelectForSel", {
                                        title: item.getTitle ? item.getTitle() : "",
                                        text: item.getHighlightText ? item.getHighlightText() : "",
                                        expanded: item.getExpanded ? item.getExpanded() : false,
                                        path: item.getBindingContext("treeModel")
                                            ? item.getBindingContext("treeModel").getPath()
                                            : ""
                                    });

                                }
                            }
                        },
                        error: function (err) {
                            that.oTree.setBusy(false);
                            that.byId("idDynamicPage2OPMIXP").setBusy(false);
                            sap.m.MessageToast.show("Error Loading Option Percentages Data");
                        },
                    });

                    function addNullChecksToFilter(filterString) {
                        if (!filterString || typeof filterString !== "string") return filterString;

                        let modified = filterString;

                        const wrapWithNull = (field) => {
                            const regex = new RegExp(`(${field}\\s+eq\\s+[^)\\s]+)`, "g");
                            modified = modified.replace(regex, `($1 or ${field} eq null)`);
                        };

                        wrapWithNull("CHAR_NUM");
                        wrapWithNull("CHARVAL_NUM");
                        wrapWithNull("CUSTOMER_GROUP");

                        // Always append CHAR_TYPE check
                        const inner = modified.replace(/^filter\(/, "").replace(/\)$/, "");
                        const finalInner = `(${inner}) and (CHAR_TYPE eq 'P' or CHAR_TYPE eq null)`;
                        return `filter(${finalInner})`;
                    }
                } catch (err) {
                    console.error("loadData error:", err);
                    sap.m.MessageToast.show("Error waiting for week data: " + err.message);
                }
            },


            mergeKeyFigData: function (defaultData, typeData) {
                if (!Array.isArray(defaultData)) defaultData = [];
                if (!Array.isArray(typeData)) typeData = [];

                const map = new Map();

                // Add old/default data
                defaultData.forEach(item => {
                    const key = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.KEY_FIG_ID}`;
                    map.set(key, item);
                });

                // Add or override with new TYPE-based data
                typeData.forEach(item => {
                    const key = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.KEY_FIG_ID}`;
                    map.set(key, item);
                });

                // Return merged list
                return Array.from(map.values());
            },

            onExportExcel: function () {

                const exportPlugin = this.hot.getPlugin("exportFile");

                exportPlugin.downloadFile("csv", {
                    bom: true,
                    columnHeaders: true,
                    rowHeaders: false,
                    exportHiddenColumns: false,
                    exportHiddenRows: false,
                    filename: "OptionMix_[YYYY]-[MM]-[DD]",
                    fileExtension: "csv"
                });

            },


            loadExcel: function (data, rows, columns) {
                const weekType = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                const ffData = that.oGModel.getProperty("/firmFrozenData");
                // Optimize DOM Manipulation
                let existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                existingDiv.innerHTML = '<div id="excelGrid"></div>'; // Faster than removing children

                let excel = document.getElementById("excelGrid");
                let menu = {
                    items: {
                        commentsAddEdit: {},
                        commentsRemove: {
                            callback: function () {
                                let selectedRange = that.hot.getSelectedLast();
                                if (selectedRange) {
                                    const [row, col] = selectedRange;
                                    that.hot.getPlugin("comments").removeComment();
                                    that.onRemoveComment({ row, col });
                                }
                            },
                        },
                        // line: "---------",
                        "eq-dist": {
                            name: "Equal Distribution",
                            callback: that.handleContextMenu.bind(that),
                        },
                        "pro-dist": {
                            name: "Prorate Distribution",
                            callback: that.handleContextMenu.bind(that),
                        },
                        "lock-cell": {
                            name: "Lock",
                            callback: that.handleContextMenu.bind(that),
                        },
                        "unlock-cell": {
                            name: "Unlock",
                            callback: that.handleContextMenu.bind(that),
                        },
                    },
                };
                let numberOfColumns = columns.length;
                that.lastWeek = columns[columns.length - 1];

                if (columns[0] == "Location" && columns[1] == "Product" && columns[2] == "Customer Group" && columns[3] == "Characteristic" &&
                    columns[4] == "Characteristic Value" && columns[5] == "Key Figure") {
                    var defaultWidths = [60, 140, 105, 140, 140, 165];
                    // let defaultWidths = [60, 140, 105, 140, 140];
                    var defaultWidthFromFourth = 120;
                    var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                        return index < 6 ? defaultWidths[index] : defaultWidthFromFourth;
                    });
                } else {
                    var defaultWidths = [60, 140, 105, 140, 205];
                    // let defaultWidths = [60, 140, 105, 140, 140];
                    var defaultWidthFromFourth = 120;
                    var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                        return index < 5 ? defaultWidths[index] : defaultWidthFromFourth;
                    });
                }


                // Step 1: Identify Manual Option rows first
                var oManual = data.filter(item => item.KEY_FIG_DESC === "Manual Option % ");
                var hasManual = oManual.length > 0;



                function arrangeRowsByGroup(data) {
                    if (!Array.isArray(data) || data.length === 0) return [];

                    // Identify week fields dynamically (CW and FY columns)
                    // const weekFields = Object.keys(data[0]).filter(k => k.startsWith("CW") || k.startsWith("FY"));

                    const weekFields = Object.keys(data[0]).filter(k => k.includes("CW") || k.startsWith("FY"));


                    //  Key figures that are treated specially (manual or demand)
                    const SPECIAL_KFS = [
                        "Manual Option % ",
                        "Actual Demand % at VC",
                        "Actual Demand Qty at VC"
                    ];

                    //  Function to check if row has any non-empty week value
                    const hasNonEmptyWeeks = (row) =>
                        weekFields.some(f => row[f] !== "" && row[f] !== null && row[f] !== undefined);

                    // Determine if the row should be kept
                    const hasValues = (row) => {
                        const kf = row.KEY_FIG_DESC;
                        const hasWeeks = hasNonEmptyWeeks(row);

                        //  If it's a special key figure (Manual or Actual Demand)
                        if (SPECIAL_KFS.includes(kf)) {
                            // Keep if has values OR has customer group
                            // Remove only if CUSTOMER_GROUP is null AND all weeks empty
                            if (hasWeeks) return true;
                            if (row.CUSTOMER_GROUP) return true;
                            return false;
                        }

                        //  For all other key figures, keep only if has week values
                        return hasWeeks;
                    };

                    //  Define display order
                    const ORDER = {
                        "Statistical Forecast %": 1,
                        "Option Percentage %": 2,
                        "Option Quantity": 3,
                        "Manual Option % ": 4,
                        "Derived Characteristics %": 5,
                        "Derived Characteristic Qty": 6,
                        "Effective Option %": 7,
                        "Effective Option Qty": 8,
                        "Forecast Order % at VC": 9,
                        "Forecast Order Qty at VC": 10,
                        "Actual Demand % at VC": 11,
                        "Actual Demand Qty at VC": 12
                    };

                    //  Identify VC-type key figures
                    const isVC = (kf) =>
                        kf === "Forecast Order % at VC" ||
                        kf === "Forecast Order Qty at VC" ||
                        kf === "Actual Demand % at VC" ||
                        kf === "Actual Demand Qty at VC";

                    //  Group key (unique for product/char)
                    const keyOf = (r) => [
                        r.LOCATION_ID ?? r.LOCATION,
                        r.PRODUCT_ID ?? r.PRODUCT,
                        r.CHAR_NAME ?? r.CHAR ?? r.CHAR_NUM,
                        r.CHARVAL_NUM ?? r.CHARVAL,
                        r.VERSION ?? r.VER
                    ].join("|");

                    const groups = new Map();

                    for (const row of data) {
                        if (!hasValues(row)) continue; //  Skip invalid rows

                        const key = keyOf(row);
                        if (!groups.has(key)) groups.set(key, { cg: [], vc: [] });

                        //  Separate CG (customer group) and VC (no customer group)
                        if (row.CUSTOMER_GROUP) {
                            groups.get(key).cg.push(row);
                        } else {
                            groups.get(key).vc.push(row);
                        }
                    }

                    //  Sort within groups
                    const sortByOrder = (a, b) => {
                        const oa = ORDER[a.KEY_FIG_DESC] ?? (a.DISPLAY_ORDER ?? 99999);
                        const ob = ORDER[b.KEY_FIG_DESC] ?? (b.DISPLAY_ORDER ?? 99999);
                        return oa - ob;
                    };

                    //  Flatten groups back into one array
                    const result = [];
                    for (const [, g] of groups) {
                        g.cg.sort(sortByOrder);
                        g.vc.sort(sortByOrder);
                        result.push(...g.cg, ...g.vc);
                    }

                    return result;
                }

                // Step 2: Apply the grouping / ordering first
                data = arrangeRowsByGroup(data);

                // Step 3: Post-filtering for Manual
                data = data.filter(item => {
                    const isManual = item.KEY_FIG_DESC === "Manual Option % ";

                    if (isManual) {
                        return hasManual; //  Include manual only if backend gave manual
                    }

                    //  Everything else stays because arrangeRowsByGroup already removed empty ones
                    return true;
                });

                var oCGroup = that.oGModel.getProperty("/CGroup")
                var oSelected = that.oGModel.getProperty("/oSelected")


                if (oCGroup === "Customer Group" && oSelected === true) {
                    data = data.filter(item =>
                        !(
                            item.KEY_FIG_DESC === "Forecast Order % at VC" ||
                            item.KEY_FIG_DESC === "Forecast Order Qty at VC" ||
                            item.KEY_FIG_DESC === "Unconsumed Qty % at VC" ||
                            item.KEY_FIG_DESC === "Unconsumed Qty at VC"
                        )
                    );
                }

                data = data.filter(item => (item.CUSTOMER_GROUP != "..."))

                var oSeqData = that.oGModel.getProperty("/oSeqData")

                // Step 1️1: Create a quick lookup map from CHAR_NUM → { weightage, sequence }
                const seqMap = new Map(
                    oSeqData.map(item => [
                        item.CHAR_NUM,
                        {
                            weightage: Number(item.WEIGHTAGE),
                            sequence: Number(item.SEQUENCE)
                        }
                    ])
                );

                const KF_ORDER = {
                    "Statistical Forecast %": 1,
                    "Option Percentage %": 2,
                    "Option Quantity": 3,
                    "Manual Option % ": 4,
                    "Derived characteristics %": 5,
                    "Derived Characteristic Qty": 6,
                    "Forecast Order % at VC": 7,
                    "Forecast Order Qty at VC": 8,
                    "Actual Demand % at VC": 9,
                    "Actual Demand Qty at VC": 10
                };

                // const treeMap = new Map();

                // that.TreeData.forEach((item, index) => {
                //     if (!treeMap.has(item.CHAR_NUM)) {
                //         treeMap.set(item.CHAR_NUM, {
                //             deriveLevel: item.DERIVELEVEL,
                //             index: index
                //         });
                //     }
                // });



                // const charOrderMap = new Map();

                // let seq = 0;

                // that.TreeData.forEach(item => {

                //     if (!charOrderMap.has(item.CHAR_NUM)) {

                //         charOrderMap.set(item.CHAR_NUM, seq++);

                //     }

                // });

                // const orderedData = data.sort((a, b) => {

                //     const aOrder = charOrderMap.get(a.CHAR_NUM) ?? 9999;
                //     const bOrder = charOrderMap.get(b.CHAR_NUM) ?? 9999;

                //     if (aOrder !== bOrder) {
                //         return aOrder - bOrder;
                //     }

                //     // Same characteristic
                //     if (a.CHARVAL_NUM !== b.CHARVAL_NUM) {

                //         return String(a.CHARVAL_NUM).localeCompare(
                //             String(b.CHARVAL_NUM),
                //             undefined,
                //             {
                //                 numeric: true,
                //                 sensitivity: "base"
                //             }
                //         );
                //     }

                //     return (KF_ORDER[a.KEY_FIG_DESC] || 999) -
                //         (KF_ORDER[b.KEY_FIG_DESC] || 999);

                // });


                // const charOrderMap = new Map();

                // let order = 1;

                // // Independent first
                // that.TreeData
                //     .filter(x => x.LEVEL === "Independent")
                //     .forEach(x => {
                //         if (!charOrderMap.has(x.CHAR_NUM)) {
                //             charOrderMap.set(x.CHAR_NUM, order++);
                //         }
                //     });

                // // Dependent next
                // that.TreeData
                //     .filter(x => x.LEVEL === "Dependent")
                //     .forEach(x => {
                //         if (!charOrderMap.has(x.CHAR_NUM)) {
                //             charOrderMap.set(x.CHAR_NUM, order++);
                //         }
                //     });


                if (that.oCharLvlData.length > 0) {
                    const charOrderMap = new Map();

                    let order = 1;

                    // Independent first
                    that.TreeData
                        .filter(x => x.LEVEL === "Independent")
                        .forEach(x => {
                            if (!charOrderMap.has(x.CHAR_NUM)) {
                                charOrderMap.set(x.CHAR_NUM, order++);
                            }
                        });

                    // Dependent next
                    that.TreeData
                        .filter(x => x.LEVEL === "Dependent")
                        .forEach(x => {
                            if (!charOrderMap.has(x.CHAR_NUM)) {
                                charOrderMap.set(x.CHAR_NUM, order++);
                            }
                        });

                    var orderedData = data.sort((a, b) => {

                        const aOrder = charOrderMap.get(a.CHAR_NUM) ?? 9999;
                        const bOrder = charOrderMap.get(b.CHAR_NUM) ?? 9999;

                        if (aOrder !== bOrder) {
                            return aOrder - bOrder;
                        }

                        // Keep characteristic values grouped
                        if (a.CHARVAL_NUM !== b.CHARVAL_NUM) {
                            return String(a.CHARVAL_NUM).localeCompare(
                                String(b.CHARVAL_NUM),
                                undefined,
                                { numeric: true }
                            );
                        }

                        return (KF_ORDER[a.KEY_FIG_DESC] || 999) -
                            (KF_ORDER[b.KEY_FIG_DESC] || 999);
                    });
                } else {
                    var orderedData = data.sort((a, b) => {
                        const aMeta = seqMap.get(a.CHAR_NUM) || { weightage: 0, sequence: 9999 };
                        const bMeta = seqMap.get(b.CHAR_NUM) || { weightage: 0, sequence: 9999 };

                        //  Weightage (DESC)
                        if (aMeta.weightage !== bMeta.weightage) {
                            return bMeta.weightage - aMeta.weightage;
                        }

                        //  Sequence (ASC)
                        if (aMeta.sequence !== bMeta.sequence) {
                            return aMeta.sequence - bMeta.sequence;
                        }

                        // CHARVAL_NUM (ASC)
                        const aCharVal = (a.CHARVAL_NUM || "").trim();
                        const bCharVal = (b.CHARVAL_NUM || "").trim();

                        return aCharVal.localeCompare(bCharVal, undefined, {
                            numeric: true,
                            sensitivity: "base"
                        });
                    });
                }




                //Comments Section
                const commentsMap = new Map();
                orderedData.forEach(item => {
                    const key = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.KEY_FIG_ID}`;
                    const obj = that.commentsMap.get(key);
                    const value = {
                        TYPE: item.TYPE
                    };
                    if (obj) {
                        const commentEntries = Object.entries(obj).filter(([key]) =>
                            key.toLowerCase().includes("_comments")
                        );

                        if (commentEntries.length > 0) {
                            const commentFields = Object.fromEntries(commentEntries);
                            Object.assign(value, commentFields);
                        }
                    }
                    commentsMap.set(key, value);
                });
                that.commentsMap = commentsMap;
                let index = 0;
                const manualKey = that.ManualKeyArr[0];
                that.commentsMap.forEach((value, key) => {
                    let keyType = value.TYPE;
                    for (let k = 0; k < that.dates.length; k++) {
                        const date = that.dates[k];
                        if (keyType === manualKey.KEY_FIG_ID) {
                            if (value[`${date}_COMMENTS`]) {
                                that.comments.push({
                                    row: index,
                                    col: k + that.staticColumns.length,
                                    comment: { value: value[`${date}_COMMENTS`] },
                                });
                            }
                        }
                    }
                    index++;
                });
                //End of Comments Section



                if (orderedData && orderedData.length !== 0) {

                    // this.drawChartOPMIXP(orderedData);

                    that.oFreshData = orderedData

                    that.hot = new Handsontable(excel, {
                        data: orderedData,
                        selectionMode: 'range',
                        fillHandle: false,
                        columns: rows,
                        colWidths: colWidths,
                        rowHeaders: false,
                        colHeaders: columns,
                        contextMenu: menu,
                        comments: true,
                        // rowHeights: 32,
                        width: "auto",
                        fixedColumnsStart: that.staticColumns.length,
                        autoColumnSize: true,
                        manualRowMove: true,
                        autoWrapRow: true,
                        autoWrapCol: true,
                        manualColumnResize: true,
                        licenseKey: HandsontableKey,
                        afterGetColHeader(col, TH) {
                            let totalDates = that.oGModel.getProperty("/totalWeekTypes");
                            if (weekType !== "TELESCOPIC_WEEK") {
                                TH.className = "applyHeader";
                                if (col >= that.staticColumns.length) {
                                    let weekObj = totalDates.find(
                                        (f) => f[weekType] == TH.textContent
                                    );
                                    let pStart = that.convertDate(weekObj.PERIODSTART, "/");
                                    let pEnd = that.convertDate(weekObj.PERIODEND, "/");
                                    let title = `${pStart} - ${pEnd}`;
                                    TH.title = title;
                                }
                            } else {
                                if (col < that.staticColumns.length) {
                                    TH.className = "applyHeader";
                                }
                                if (col >= that.staticColumns.length) {
                                    let weekObj = totalDates.find(
                                        (f) => f[weekType] == TH.textContent
                                    );
                                    let pStart = that.convertDate(weekObj.PERIODSTART, "/");
                                    let pEnd = that.convertDate(weekObj.PERIODEND, "/");
                                    let title = `${pStart} - ${pEnd}`;
                                    if (that.telWeek.includes(TH.textContent)) {
                                        TH.title = title;
                                        TH.className = "applyWeek";
                                    } else if (that.telMonth.includes(TH.textContent)) {
                                        TH.title = title;
                                        TH.className = "applyMonth";
                                    } else if (that.telQ.includes(TH.textContent)) {
                                        TH.title = title;
                                        TH.className = "applyQ";
                                    }
                                    if (TH.textContent === that.lastWeek) {
                                        TH.title = title;
                                        TH.className = "applyQ";
                                    }
                                }
                            }
                        },

                        afterOnCellMouseDown: function (event, coords) {
                            that.byId("idSimualteOPMIX").setEnabled(true);

                            that.staticColumnCount = columns.findIndex(col => /\d/.test(col));

                            if (coords.row === -1 && coords.col >= that.staticColumnCount) {

                                var colIndex = coords.col;
                                var sHeader = this.getColHeader(colIndex);

                                that._handleWeekSelection(colIndex, sHeader);
                                return;
                            }

                            if (event.ctrlKey && coords.row >= 0 && coords.col >= 0) {
                                that.handleClickSum(coords);
                            } else {
                                that.dragStartCoords = coords;
                                that.totalSum = 0;
                            }
                        },

                        afterSelectionEnd: function (row, col, row2, col2) {

                            that.lastSelection = [row, col, row2, col2];

                            console.log("Stored Selection:", that.lastSelection);
                        },

                        // ADD THIS
                        // beforeSetRangeEnd: function (coords) {

                        //     var selected = this.getSelectedLast();

                        //     if (selected) {
                        //         // lock drag to the same column
                        //         coords.col = selected[1];
                        //     }
                        // },
                        // afterOnCellMouseDown: function (event, coords) {
                        //     that.byId("idSimualteOPMIX").setEnabled(true);


                        //     // DO NOT override that

                        //     that.staticColumnCount = columns.findIndex(col => /\d/.test(col));

                        //     if (coords.row === -1 && coords.col >= that.staticColumnCount) {

                        //         var colIndex = coords.col;

                        //         //  use THIS (Handsontable instance)
                        //         var sHeader = this.getColHeader(colIndex);

                        //         console.log("Clicked Dynamic Column:", sHeader);

                        //         that._handleWeekSelection(colIndex, sHeader); // controller method
                        //         return;
                        //     }

                        //     if (event.ctrlKey && coords.row >= 0 && coords.col >= 0) {
                        //         that.handleClickSum(coords);
                        //     } else {
                        //         that.dragStartCoords = coords;
                        //         that.totalSum = 0;
                        //     }
                        // },

                        // afterOnCellMouseDown: function (event, coords) {
                        //     if (event.ctrlKey && coords.row >= 0 && coords.col >= 0) {
                        //         that.handleClickSum(coords);
                        //     } else {
                        //         that.dragStartCoords = coords;
                        //         that.totalSum = 0;
                        //     }
                        // },
                        afterOnCellMouseUp: function (_, coords) {
                            if (!that.dragStartCoords) return;
                            that.sumonDrag(that.dragStartCoords, coords);
                            that.dragStartCoords = null;
                        },
                    });
                } else {
                    sap.m.MessageToast.show("No Option Percentages")
                    sap.ui.core.BusyIndicator.hide();
                    this._resetUI();
                }


                // Modified method to set comments programmatically after data refresh
                let isProgrammaticUpdate = true;
                setTimeout(() => {
                    that.comments.forEach(({ row, col, comment }) => {
                        that.hot.setCellMeta(row, col, "comment", { value: comment.value });
                    });
                    that.hot.render();
                    isProgrammaticUpdate = false;
                }, 100);

                that
                    .getView()
                    .byId("idSumTagOPMIXP")
                    .setModel(new JSONModel({ sum: "0" }), "sumModel");

                // Efficient Hooks
                that.hot.addHook("beforeChange", that.beforeExcelCellChange.bind(that));
                that.hot.addHook(
                    "afterDocumentKeyDown",
                    that.afterDocumentKeyDown.bind(that)
                );


                // function getWeekStartEnd(weekLabel) {
                //     // expected: "2026 CW05"
                //     if (!weekLabel || !weekLabel.includes("CW")) {
                //         return { WEEK_STARTDATE: "", WEEK_ENDDATE: "" };
                //     }

                //     const [yearStr, cwStr] = weekLabel.split(" CW");
                //     const year = parseInt(yearStr);
                //     const week = parseInt(cwStr);

                //     // Calculate Monday (ISO 8601)
                //     const simple = new Date(year, 0, 1 + (week - 1) * 7);
                //     const dow = simple.getDay();
                //     const ISOweekStart = new Date(simple);

                //     if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                //     else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

                //     const ISOweekEnd = new Date(ISOweekStart);
                //     ISOweekEnd.setDate(ISOweekStart.getDate() + 6);

                //     return {
                //         WEEK_STARTDATE: ISOweekStart.toISOString().split("T")[0],
                //         WEEK_ENDDATE: ISOweekEnd.toISOString().split("T")[0],
                //     };
                // }



                // that.hot.addHook("afterSetCellMeta", function (row, col, key, value) {
                //     if (key === "comment") {
                //         const rowData = that.hot.getSourceDataAtRow(row);
                //         const meta = that.hot.getCellMeta(row, col);
                //         const isLocked = !!meta.readOnly;
                //         const commentText = value?.value || value || "";
                //         const colHeader = that.hot.getColHeader(col); // e.g. "2025 CW46"

                //         // 🔹 Calculate week range
                //         const { WEEK_STARTDATE, WEEK_ENDDATE } = getWeekStartEnd(colHeader);

                //         const record = {
                //             LOCATION_ID: rowData.LOCATION_ID,
                //             PRODUCT_ID: rowData.PRODUCT_ID,
                //             CUSTOMER_GROUP: rowData.CUSTOMER_GROUP,
                //             CHAR_NAME: rowData.CHAR_NAME,
                //             CHARVAL_NUM: rowData.CHARVAL_NUM,
                //             VERSION: rowData.VERSION,
                //             SCENARIO: rowData.SCENARIO,
                //             MODEL_VERSION: rowData.MODEL_VERSION,
                //             // TYPE: rowData.TYPE,
                //             KEY_FIG_ID: rowData.KEY_FIG_ID,
                //             KEY_FIG_DESC: rowData.KEY_FIG_DESC,
                //             WEEK_STARTDATE,   // ✅ auto-calculated
                //             WEEK_ENDDATE,     // ✅ auto-calculated
                //             LOCK: isLocked,
                //             COMMENTS: commentText,
                //             OLD_VALUE: rowData[colHeader]?.replace("🔒", "").replace("%", "") || "",
                //             NEW_VALUE: rowData[colHeader]?.replace("🔒", "").replace("%", "") || ""
                //             // row,
                //             // col,
                //         };

                //         // update your storage
                //         that.commentInfo = that.commentInfo || [];
                //         that.commentInfo = that.commentInfo.filter(
                //             (r) => !(r.row === row && r.col === col)
                //         );
                //         that.commentInfo.push(record);

                //         console.log("💾 Comment info with week dates:", record);
                //     }
                // });


                that.hot.addHook("afterSetCellMeta", function (row, col, key, comment) {
                    if (key === "comment" && comment && !isProgrammaticUpdate) {
                        that.onAddOrEditComment(
                            { row, col, comment: comment.value },
                            comment.value
                        );
                    }
                });

                that.hot.addHook("beforeOnCellContextMenu", function (event, coords) {
                    var contextMenuPlugin = that.hot.getPlugin("contextMenu");

                    // ❗ coords can be null (header / empty space)
                    if (!coords || coords.row < 0 || coords.col < 0) {
                        contextMenuPlugin.disablePlugin();
                        return;
                    }

                    var selection = that.hot.getSelectedRange();

                    // ❗ selection can be undefined initially / after filtering
                    if (!selection || selection.length !== 1) {
                        contextMenuPlugin.disablePlugin();
                        return;
                    }

                    let rowInd = coords.row;
                    let colInd = coords.col;

                    let cellMeta = that.hot.getCellMeta(rowInd, colInd);
                    let rowData = that.hot.getSourceDataAtRow(rowInd);

                    // safety checks
                    if (!cellMeta || !rowData) {
                        contextMenuPlugin.disablePlugin();
                        return;
                    }

                    let isReadOnly = cellMeta.readOnly;
                    let isValidColumn = colInd > that.staticColumns.length - 1;

                    if (
                        isReadOnly &&
                        rowData.KEY_FIG_DESC !== that.ManualKeyArr?.[0]?.KEY_FIG_DESC
                    ) {
                        contextMenuPlugin.disablePlugin();
                    } else if (isValidColumn) {
                        contextMenuPlugin.enablePlugin();
                    } else {
                        contextMenuPlugin.disablePlugin();
                    }
                });


                // that.hot.addHook("beforeOnCellContextMenu", function (event, coords) {
                //     var contextMenuPlugin = that.hot.getPlugin("contextMenu");
                //     var selection = that.hot.getSelectedRange();
                //     if (selection.length === 1) {
                //         let rowInd = coords.row,
                //             colInd = coords.col,
                //             cellMeta = that.hot.getCellMeta(rowInd, colInd);
                //         let isReadOnly = cellMeta.readOnly,
                //             rowData = that.hot.getSourceDataAtRow(rowInd);
                //         let isValidColumn = colInd > that.staticColumns.length - 1;

                //         if (
                //             isReadOnly &&
                //             rowData?.KEY_FIG_DESC !== that.ManualKeyArr[0].KEY_FIG_DESC
                //         ) {
                //             contextMenuPlugin.disablePlugin();
                //         } else if (isValidColumn) {
                //             contextMenuPlugin.enablePlugin();
                //         } else {
                //             contextMenuPlugin.disablePlugin();
                //         }
                //     } else {
                //         contextMenuPlugin.disablePlugin();
                //     }
                // });

                // Get the container element
                // let container = that.hot.rootElement;
                // container.addEventListener('mousedown', function (event) {
                //     const isLeftClick = event.button == 0;
                //     const isCtrlPressed = event.ctrlKey;
                //     if (isLeftClick && isCtrlPressed) {
                //         var cellRange = that.hot.getSelectedRange();
                //         if (cellRange) {
                //             cellRange.forEach((cell, i) => {
                //                 if (cell.from.row == cell.to.row && cell.from.col == cell.to.col) {
                //                     if (cell && cell.highlight.col >= that.staticColumns.length) {
                //                         cellRange[i].row = cellRange[i].from.row;
                //                         cellRange[i].col = cellRange[i].from.col;
                //                     }
                //                 }
                //             });
                //             that.handleSumTag();
                //         }
                //     }
                // });

                // good working
                // that.hot.updateSettings({
                //     cells: function (row, col, prop) {
                //         if (!that.hot) return;

                //         const rowData = that.hot.getSourceDataAtRow(row);
                //         const cellProperties = {};
                //         cellProperties.readOnly = true;

                //         // --- 1️⃣ Build CHAR_NAME → color map (only once) ---
                //         if (!that._charNameColorMapStable) {
                //             const allData = that.hot.getSourceData();

                //             // Get unique CHAR_NAME values in order of first appearance
                //             const uniqueCharNames = [];
                //             allData.forEach(item => {
                //                 if (item.CHAR_NAME && !uniqueCharNames.includes(item.CHAR_NAME)) {
                //                     uniqueCharNames.push(item.CHAR_NAME);
                //                 }
                //             });

                //             // Alternate colors (white/grey) for each CHAR_NAME
                //             that._charNameColorMapStable = {};
                //             uniqueCharNames.forEach((charName, idx) => {
                //                 that._charNameColorMapStable[charName] =
                //                     idx % 2 === 0 ? "rowWhite" : "rowGrey";
                //             });
                //         }

                //         // --- 2️⃣ Determine background based on CHAR_NAME ---
                //         let bgColorClass = "rowWhite";
                //         if (
                //             rowData &&
                //             rowData.CHAR_NAME &&
                //             that._charNameColorMapStable[rowData.CHAR_NAME]
                //         ) {
                //             bgColorClass = that._charNameColorMapStable[rowData.CHAR_NAME];
                //         }

                //         // --- 3️⃣ Existing logic with preserved CHAR_NAME-based color ---
                //         const requiredColumns = [
                //             "Location",
                //             "Product",
                //             "Customer Group",
                //             "Characteristic",
                //             "Characteristic Value",
                //             "Key Figure",
                //         ];

                //         const isWeekColumn =
                //             /\d{4}-\d{2}-\d{2}/.test(prop) ||
                //             /\bCW\d{2}\b/.test(prop) ||
                //             /\bFY\d{2}\b/.test(prop) ||
                //             /\bQ\d\b/.test(prop);

                //         // Apply base background to all columns (static + dynamic)
                //         cellProperties.className = bgColorClass;

                //         // Apply custom styles only on top of the base color
                //         if (rowData && rowData.FLAG == false) {
                //             cellProperties.className = bgColorClass + " manualBg";
                //             if (col > that.staticColumns.length - 1) {
                //                 cellProperties.className = bgColorClass + " manualBgAlign";
                //             }
                //         }

                //         if (
                //             rowData &&
                //             col > that.staticColumns.length - 1 &&
                //             rowData.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                //         ) {
                //             const fObj = findObject(
                //                 that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                //                 {
                //                     ...rowData,
                //                     [that.weekType]: prop,
                //                     KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                //                 }
                //             );

                //             cellProperties.readOnly = fObj ? fObj.LOCK : false;
                //             if (fObj && fObj.LOCK) {
                //                 cellProperties.className = bgColorClass + " editableFirm";
                //             } else {
                //                 cellProperties.className = bgColorClass + " editable";
                //             }
                //         }

                //         // Option Percentage rows
                //         if (
                //             rowData &&
                //             col > that.staticColumns.length - 1 &&
                //             rowData.KEY_FIG_DESC === "Option Percentage %"
                //         ) {
                //             if (rowData.FLAG == false) {
                //                 cellProperties.className = bgColorClass + " finalKeyFigF";
                //             } else {
                //                 cellProperties.className = bgColorClass + " finalKeyFigT";
                //             }
                //         }

                //         // Handle 🔒 locked week cells
                //         if (
                //             isWeekColumn &&
                //             rowData[prop] &&
                //             typeof rowData[prop] === "string" &&
                //             rowData[prop].includes("🔒")
                //         ) {
                //             cellProperties.readOnly = true;
                //         }

                //         // --- 4️⃣ Add separator when CHAR_NAME changes ---
                //         const prevRowData = that.hot.getSourceDataAtRow(row - 1);
                //         if (rowData && prevRowData && rowData.CHAR_NAME !== prevRowData.CHAR_NAME) {
                //             cellProperties.className += " lastCharVal";
                //         }

                //         return cellProperties;
                //     }.bind(that),
                // });

                function buildCharNameColorMap(that) {
                    const allData = that.hot.getSourceData();
                    const uniqueCharNames = new Set();

                    allData.forEach(item => {
                        if (item.CHAR_NAME) {
                            uniqueCharNames.add(item.CHAR_NAME);
                        }
                    });

                    // Build alternating color map
                    that._charNameColorMapStable = {};
                    Array.from(uniqueCharNames).forEach((charName, idx) => {
                        that._charNameColorMapStable[charName] =
                            idx % 2 === 0 ? "rowWhite" : "rowGrey";
                    });
                }
                that.hot.loadData(that.oFreshData);
                buildCharNameColorMap(that);
                that.hot.render();

                that.hot.updateSettings({
                    cells: function (row, col, prop) {
                        if (!that.hot) return;

                        const rowData = that.hot.getSourceDataAtRow(row);
                        const cellProperties = {};
                        cellProperties.readOnly = true;

                        // ---  Build CHAR_NAME → color map (only once) ---
                        // if (!that._charNameColorMapStable) {
                        //     const allData = that.hot.getSourceData();
                        //     const uniqueCharNames = [];
                        //     allData.forEach(item => {
                        //         if (item.CHAR_NAME && !uniqueCharNames.includes(item.CHAR_NAME)) {
                        //             uniqueCharNames.push(item.CHAR_NAME);
                        //         }
                        //     });

                        //     that._charNameColorMapStable = {};
                        //     uniqueCharNames.forEach((charName, idx) => {
                        //         that._charNameColorMapStable[charName] =
                        //             idx % 2 === 0 ? "rowWhite" : "rowGrey";
                        //     });
                        // }

                        // ---  Determine background based on CHAR_NAME ---
                        let bgColorClass = "rowWhite";
                        if (rowData && rowData.CHAR_NAME && that._charNameColorMapStable[rowData.CHAR_NAME]) {
                            bgColorClass = that._charNameColorMapStable[rowData.CHAR_NAME];
                        }

                        // --- Apply background ---
                        cellProperties.className = bgColorClass;

                        // Existing FLAG + editable logic preserved
                        if (rowData && rowData.FLAG == false) {
                            cellProperties.className = bgColorClass + " manualBg";
                            if (col > that.staticColumns.length - 1) {
                                cellProperties.className = bgColorClass + " manualBgAlign";
                            }
                        }

                        // --- Existing Manual key figure logic ---
                        if (
                            rowData &&
                            col > that.staticColumns.length - 1 &&
                            rowData.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                        ) {
                            const fObj = findObject(
                                that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                                {
                                    ...rowData,
                                    [that.weekType]: prop,
                                    KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                                }
                            );

                            cellProperties.readOnly = fObj ? fObj.LOCK : false;
                            if (fObj && fObj.LOCK) {
                                cellProperties.className = bgColorClass + " editableFirm";
                            } else {
                                cellProperties.className = bgColorClass + " editable";
                            }
                        }

                        // Main condition to check KEY_FIG_DESC
                        if (
                            rowData &&
                            col > that.staticColumns.length - 1 &&
                            rowData.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                        ) {

                            if (ffData) {
                                if (new Date(prop) < new Date()) {
                                    cellProperties.readOnly = true;
                                }
                                else if (
                                    ffData.fozenMonDay.includes(prop) ||
                                    ffData.firmMonDay.includes(prop)
                                ) {
                                    cellProperties.readOnly = true;
                                    cellProperties.className =
                                        (cellProperties.className || "") + " readOnlyGrey";

                                    return cellProperties;
                                }
                                // else if (ffData.fozenMonDay.includes(prop)) {
                                //     cellProperties.readOnly = true;
                                //     cellProperties.className = (cellProperties.className || "") + " readOnlyGrey";
                                //     return cellProperties; //  stop further override
                                // }


                                // else if (ffData.firmMonDay.includes(prop)) {
                                //     const fObj = findObject(
                                //         that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                                //         {
                                //             ...rowData,
                                //             [that.weekType]: prop,
                                //             KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                                //         }
                                //     )
                                //     cellProperties.readOnly = fObj ? fObj.LOCK : false;
                                //     cellProperties.className = (cellProperties.className || "") + " editableFirm";
                                // } 
                                else {
                                    const fObj = findObject(
                                        that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                                        {
                                            ...rowData,
                                            [that.weekType]: prop,
                                            KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                                        }
                                    );
                                    cellProperties.readOnly = fObj ? fObj.LOCK : false;
                                    cellProperties.className = (cellProperties.className || "") + " editable";
                                }
                            } else {
                                const fObj = findObject(
                                    that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                                    {
                                        ...rowData,
                                        [that.weekType]: prop,
                                        KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                                    }
                                );
                                cellProperties.readOnly = fObj ? fObj.LOCK : false;
                                cellProperties.className = (cellProperties.className || "") + " editable";
                            }

                            // Additional condition only for "Manual Option % "
                            if (rowData.KEY_FIG_DESC === "Manual Option % ") {
                                // Set read-only based on date conditions
                                if (new Date(prop) < new Date() || (ffData && ffData.fozenMonDay.includes(prop))) {
                                    cellProperties.readOnly = true;
                                    cellProperties.className = (cellProperties.className || "") + " readOnlyGrey";
                                } else {
                                    // Keep editable but visibly distinct
                                    cellProperties.className = (cellProperties.className || "") + " editableManual";
                                }
                            }


                            // if (ffData) {
                            //     if (new Date(prop) < new Date()) {
                            //         cellProperties.readOnly = true;
                            //     } else if (ffData.fozenMonDay.includes(prop)) {
                            //         cellProperties.readOnly = true;
                            //     } else if (ffData.firmMonDay.includes(prop)) {
                            //         const fObj = findObject(
                            //             that.cellChanges.length > 0
                            //                 ? that.cellChanges
                            //                 : that.allData,
                            //             {
                            //                 ...rowData,
                            //                 [that.weekType]: prop,
                            //                 KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                            //             }
                            //         );

                            //         cellProperties.readOnly = fObj ? fObj.LOCK : false;
                            //         cellProperties.className = cellProperties.className
                            //             ? cellProperties.className + " editableFirm"
                            //             : "editableFirm"; // Append class
                            //     } else {
                            //         const fObj = findObject(
                            //             that.cellChanges.length > 0
                            //                 ? that.cellChanges
                            //                 : that.allData,
                            //             {
                            //                 ...rowData,
                            //                 [that.weekType]: prop,
                            //                 KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                            //             }
                            //         );

                            //         cellProperties.readOnly = fObj ? fObj.LOCK : false;
                            //         cellProperties.className = cellProperties.className
                            //             ? cellProperties.className + " editable"
                            //             : "editable"; // Append class
                            //     }
                            // } else {
                            //     const fObj = findObject(
                            //         that.cellChanges.length > 0
                            //             ? that.cellChanges
                            //             : that.allData,
                            //         {
                            //             ...rowData,
                            //             [that.weekType]: prop,
                            //             KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                            //         }
                            //     );

                            //     cellProperties.readOnly = fObj ? fObj.LOCK : false;
                            //     cellProperties.className = cellProperties.className
                            //         ? cellProperties.className + " editable"
                            //         : "editable"; // Append class
                            // }
                        }

                        // --- Option Percentage rows ---
                        if (
                            rowData &&
                            col > that.staticColumns.length - 1 &&
                            rowData.KEY_FIG_DESC === "Option Percentage %"
                        ) {
                            if (rowData.FLAG == false) {
                                cellProperties.className = bgColorClass + " finalKeyFigF";
                            } else {
                                cellProperties.className = bgColorClass + " finalKeyFigT";
                            }
                        }


                        if (
                            rowData &&
                            rowData.KEY_FIG_DESC === "Manual Option % " &&
                            col > that.staticColumns.length - 1
                        ) {
                            // Get global model flags
                            var oCGroup = that.oGModel.getProperty("/CGroup");
                            var oSelected = that.oGModel.getProperty("/oSelected");

                            // Check if CUSTOMER_GROUP exists (not null / empty)
                            const hasCustomerGroup = rowData.CUSTOMER_GROUP && rowData.CUSTOMER_GROUP.trim() !== "";

                            //  Case 1: Customer Group present AND not restricted by global flags → Editable
                            if (hasCustomerGroup && !(oCGroup === "Customer Group" && oSelected === false)) {
                                cellProperties.readOnly = false;
                                cellProperties.className = "manualOptionWhite";
                            }
                            //  Case 2: Customer Group missing OR restricted by global flags → Read-only
                            else {
                                cellProperties.readOnly = true;
                                cellProperties.className = "rowGrey1"; // keep normal color (no edit)
                            }
                        }




                        // --- 🔒 locked week cells ---
                        const isWeekColumn =
                            /\d{4}-\d{2}-\d{2}/.test(prop) ||
                            /\bCW\d{2}\b/.test(prop) ||
                            /\bFY\d{2}\b/.test(prop) ||
                            /\bQ\d\b/.test(prop);

                        if (
                            isWeekColumn &&
                            rowData[prop] &&
                            typeof rowData[prop] === "string" &&
                            rowData[prop].includes("🔒")
                        ) {
                            cellProperties.readOnly = true;
                        }

                        // --- 4️ Add separator when CHAR_NAME changes ---
                        const prevRowData = that.hot.getSourceDataAtRow(row - 1);
                        if (rowData && prevRowData && rowData.CHAR_NAME !== prevRowData.CHAR_NAME) {
                            cellProperties.className += " lastCharVal";
                        }

                        // --- 5️ Add border when CHARVAL_NUM changes but CHAR_NAME same ---
                        if (
                            rowData &&
                            prevRowData &&
                            rowData.CHAR_NAME === prevRowData.CHAR_NAME &&
                            rowData.CHARVAL_NUM !== prevRowData.CHARVAL_NUM
                        ) {
                            cellProperties.className += " charValDivider"; // new CSS class
                        }

                        return cellProperties;
                    }.bind(that),
                });

                that.addScrollAlign();
                if (!that.oGModel.getProperty("/hotHeight")) {
                    that.hot.updateSettings({ height: "83vh" });
                } else {
                    let height = that.oGModel.getProperty("/hotHeight");
                    that.hot.updateSettings({ height: height });
                }
                that.byId("idDynamicPage2OPMIXP").setBusy(false);
                that.byId("idDynamicPage2OPMIXP").setShowFooter(true);
                that.oTree.setBusy(false);
                // console.log("EndLoadExcel", new Date());
                // Helper function to find the object from a data array
                function findObject(dataArray, criteria) {
                    return dataArray.find(
                        (item) =>
                            item.LOCATION_ID === criteria.LOCATION_ID &&
                            item.PRODUCT_ID === criteria.PRODUCT_ID &&
                            item.CUSTOMER_GROUP === criteria.CUSTOMER_GROUP &&
                            // item.CLASS_NUM === criteria.CLASS_NUM &&
                            item.CHAR_NUM === criteria.CHAR_NUM &&
                            item.CHARVAL_NUM === criteria.CHARVAL_NUM &&
                            item.VERSION === criteria.VERSION &&
                            item.SCENARIO === criteria.SCENARIO &&
                            item.MODEL_VERSION === criteria.MODEL_VERSION &&
                            item[that.weekType] === criteria[that.weekType] &&
                            (item.KEY_FIG_ID === criteria.KEY_FIG_ID ||
                                criteria.KEY_FIG_ID === undefined)
                    );
                }

                // after Handsontable rendering
                // const chartData = this.prepareChartData(that.oFreshData);

                // console.log("Chart Data:", chartData); // Debugging

                // // const chartData = this.prepareChartData(that.oFreshData);

                // this.buildChart("combination", chartData);

                // that.byId("idDynamicPage2OPMIXP").setBusy(false);


            },


            handleClickSum(cell) {
                let cellValue = that.hot.getDataAtCell(cell.row, cell.col);
                let tag = that.getView().byId("idSumTagOPMIXP");
                let sum = 0;
                if (!cellValue) cellValue = 0;
                if (typeof cellValue == "string") {
                    if (cellValue.includes("%")) {
                        if (cellValue.toString().startsWith("🔒")) {
                            sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                        } else {
                            sum = parseFloat(sum) + parseFloat(cellValue.split("%")[0]);
                        }
                    } else if (cellValue.toString().startsWith("🔒")) {
                        sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                    } else {
                        sum = parseFloat(sum) + parseFloat(cellValue);
                    }
                } else {
                    sum = Math.round(parseFloat(sum) + parseFloat(cellValue));
                }

                // if(that.dragSum && that.dragSum >0){
                //     that.dragSum =  sum = that.dragSum + sum;
                // }else if(that.clickSum && that.clickSum >0){
                //     sum = that.clickSum + sum;
                // }
                // that.clickSum = sum;
                that.totalSum = sum = that.totalSum + sum;
                tag.getModel("sumModel").setProperty("/sum", Math.round(sum));
            },

            sumonDrag(startPoint, endPoint) {
                let allCells = getCellsBetween(startPoint, endPoint),
                    tag = that.getView().byId("idSumTagOPMIXP"),
                    sum = 0;
                allCells.forEach((cell) => {
                    var cellValue = that.hot.getDataAtCell(cell.row, cell.col);
                    if (!cellValue) cellValue = 0;
                    if (typeof cellValue == "string") {
                        if (cellValue.includes("%")) {
                            if (cellValue.toString().startsWith("🔒")) {
                                sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                            } else {
                                sum = parseFloat(sum) + parseFloat(cellValue.split("%")[0]);
                            }
                        } else if (cellValue.toString().startsWith("🔒")) {
                            sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                        } else {
                            sum = parseFloat(sum) + parseFloat(cellValue);
                        }
                    } else {
                        sum = Math.round(parseFloat(sum) + parseFloat(cellValue));
                    }
                });
                tag.getModel("sumModel").setProperty("/sum", Math.round(sum));
                that.totalSum = sum;

                function getCellsBetween(startCell, endCell) {
                    const cells = [],
                        startRow = Math.min(startCell.row, endCell.row),
                        endRow = Math.max(startCell.row, endCell.row),
                        startCol = Math.min(startCell.col, endCell.col),
                        endCol = Math.max(startCell.col, endCell.col);
                    for (let row = startRow; row <= endRow; row++) {
                        for (let col = startCol; col <= endCol; col++) {
                            cells.push({ row, col });
                        }
                    }

                    return cells;
                }
            },

            loadSubExcel: function (data, rows, columns) {
                that.oGModel.setProperty("/AboveTable", data);

                // data = data.filter(f => f.CUSTOMER_GROUP !== null || f.TYPE == 995 && f.CUSTOMER_GROUP !== null)

                const weekType = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                const ffData = that.oGModel.getProperty("/firmFrozenData");
                var newDiv = document.createElement("div");
                newDiv.id = "excelSubGrid";
                newDiv.className = "excelStyle";
                newDiv.textContent = "";
                var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                existingDiv.appendChild(newDiv);
                var excel = document.querySelector('[id*="excelSubGrid"]');
                let numberOfColumns = columns.length;
                that.lastWeek = columns[columns.length - 1];

                var oCGroup = that.oGModel.getProperty("/CGroup")
                var oSelected = that.oGModel.getProperty("/oSelected")

                if (columns[0] == "Location" && columns[1] == "Product" && columns[2] == "Customer Group" && columns[3] == "Key Figure") {
                    var defaultWidths = [60, 140, 105, 445];

                    var defaultWidthFromFourth = 120;
                    var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                        return index < that.staticColumns.length - 2
                            ? defaultWidths[index]
                            : defaultWidthFromFourth;
                    });
                } else {
                    var defaultWidths = [60, 140, 450];

                    var defaultWidthFromFourth = 120;
                    var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                        return index < that.staticColumns.length - 2
                            ? defaultWidths[index]
                            : defaultWidthFromFourth;
                    });
                }




                function hasAnyValidValue(item) {
                    const skipKeys = [
                        "LOCATION", "PRODUCT", "CUSTOMER_GROUP",
                        "TYPE", "VERSION", "SCENARIO",
                        "KEY_FIG_ID", "KEY_FIG_DESC",
                        "DISPLAY_ORDER", "PRIORITY_ORDER"
                    ];

                    return Object.keys(item).some(key => {
                        if (skipKeys.includes(key)) return false;

                        const val = item[key];

                        return val !== "" && val !== "0" && val !== 0 && val !== null && val !== undefined;
                    });


                }

                var filteredData = data.filter(item => hasAnyValidValue(item));



                var oCGroup = that.oGModel.getProperty("/CGroup")
                var oSelected = that.oGModel.getProperty("/oSelected")
                if (oCGroup === "Customer Group" && oSelected === true) {

                    filteredData = filteredData.filter(item =>
                        !(
                            item.CUSTOMER_GROUP === null &&
                            (
                                item.KEY_FIG_DESC === "Forecast Order Qty" ||
                                item.KEY_FIG_DESC === "Unconsumed Quantity"
                            )
                        )
                    );
                }

                //  data = data.filter(item => item.CUSTOMER_GROUP && item.CUSTOMER_GROUP != "02");
                that.subhot = new Handsontable(excel, {
                    data: filteredData,
                    columns: rows,
                    colWidths: colWidths,
                    rowHeaders: false,
                    colHeaders: columns,
                    contextMenu: false,
                    comments: false,
                    rowHeights: 32,
                    width: "auto",
                    height: "16vh",
                    fixedColumnsStart: that.staticColumns.length - 2,
                    autoColumnSize: true,
                    autoWrapRow: true,
                    autoWrapCol: true,
                    manualColumnResize: true,
                    // afterGetColHeader(col, TH) {
                    //     let totalDates = that.oGModel.getProperty("/totalWeekTypes");
                    //     let colLength = that.staticColumns.filter(
                    //         (s) => s != "Characteristic" && s != "Characteristic Value"
                    //     );
                    //     if (weekType !== "TELESCOPIC_WEEK") {
                    //         TH.className = "applyHeader";
                    //         if (col >= colLength.length) {
                    //             let weekObj = totalDates.find(
                    //                 (f) => f[weekType] == TH.textContent
                    //             );
                    //             let pStart = that.convertDate(weekObj.WEEK_STARTDATE, "/");
                    //             let pEnd = that.convertDate(weekObj.WEEK_ENDDATE, "/");
                    //             let title = `${pStart} - ${pEnd}`;
                    //             TH.title = title;
                    //         }
                    //     } else {
                    //         if (col < colLength.length) {
                    //             TH.className = "applyHeader";
                    //         }
                    //         if (col >= colLength.length) {
                    //             let weekObj = totalDates.find(
                    //                 (f) => f[weekType] == TH.textContent
                    //             );
                    //             let pStart = that.convertDate(weekObj.PERIODSTART, "/");
                    //             let pEnd = that.convertDate(weekObj.PERIODEND, "/");
                    //             let title = `${pStart} - ${pEnd}`;
                    //             if (that.telWeek.includes(TH.textContent)) {
                    //                 TH.title = title;
                    //                 TH.className = "applyWeek";
                    //             } else if (that.telMonth.includes(TH.textContent)) {
                    //                 TH.title = title;
                    //                 TH.className = "applyMonth";
                    //             } else if (that.telQ.includes(TH.textContent)) {
                    //                 TH.title = title;
                    //                 TH.className = "applyQ";
                    //             }
                    //             if (TH.textContent === that.lastWeek) {
                    //                 TH.title = title;
                    //                 TH.className = "applyQ";
                    //             }
                    //         }
                    //     }
                    // },

                    afterGetColHeader(col, TH) {

                        let totalDates = that.oGModel.getProperty("/totalWeekTypes");
                        let colLength = that.staticColumns.filter(
                            (s) => s !== "Characteristic" && s !== "Characteristic Value"
                        );

                        // Remove previous custom classes
                        TH.classList.remove("applyHeader", "applyWeek", "applyMonth", "applyQ");

                        if (weekType !== "TELESCOPIC_WEEK") {

                            TH.classList.add("applyHeader");

                            if (col >= colLength.length) {
                                let weekObj = totalDates.find(
                                    (f) => f[weekType] === TH.textContent
                                );

                                if (weekObj) {
                                    let pStart = that.convertDate(weekObj.WEEK_STARTDATE, "/");
                                    let pEnd = that.convertDate(weekObj.WEEK_ENDDATE, "/");
                                    TH.title = `${pStart} - ${pEnd}`;
                                }
                            }

                        } else {

                            if (col < colLength.length) {
                                TH.classList.add("applyHeader");
                            }

                            if (col >= colLength.length) {

                                let weekObj = totalDates.find(
                                    (f) => f[weekType] === TH.textContent
                                );

                                if (weekObj) {
                                    let pStart = that.convertDate(weekObj.PERIODSTART, "/");
                                    let pEnd = that.convertDate(weekObj.PERIODEND, "/");
                                    TH.title = `${pStart} - ${pEnd}`;
                                }

                                if (that.telWeek.includes(TH.textContent)) {
                                    TH.classList.add("applyWeek");
                                }
                                else if (that.telMonth.includes(TH.textContent)) {
                                    TH.classList.add("applyMonth");
                                }
                                else if (that.telQ.includes(TH.textContent)) {
                                    TH.classList.add("applyQ");
                                }

                                if (TH.textContent === that.lastWeek) {
                                    TH.classList.remove("applyWeek", "applyMonth");
                                    TH.classList.add("applyQ");
                                }
                            }
                        }
                    },

                    cells: function (row, col, prop) {
                        if (!that.subhot) return;
                        const rowData = that.subhot.getSourceDataAtRow(row);
                        const cellProperties = {};
                        // if (ffData) {
                        //     if (new Date(prop) < new Date()) {
                        //         cellProperties.readOnly = true;
                        //         cellProperties.className = "hotAlign";
                        //     } else if (ffData.fozenMonDay.includes(prop)) {
                        //         cellProperties.readOnly = true;
                        //         cellProperties.className = "hotAlign";
                        //     } else if (ffData.firmMonDay.includes(prop)) {
                        //         cellProperties.readOnly = that.readOnlySub
                        //             ? that.readOnlySub
                        //             : false;
                        //         cellProperties.className = "editableFirm";
                        //     } else {
                        //         cellProperties.readOnly = that.readOnlySub
                        //             ? that.readOnlySub
                        //             : false;
                        //         cellProperties.className = "editable";
                        //     }
                        // } else {
                        //     cellProperties.readOnly = that.readOnlySub
                        //         ? that.readOnlySub
                        //         : false;
                        //     cellProperties.className = "editable";
                        // }
                        if (ffData) {
                            if (
                                new Date(prop) < new Date() ||
                                ffData.fozenMonDay.includes(prop) ||
                                ffData.firmMonDay.includes(prop)
                            ) {
                                cellProperties.readOnly = true;
                                cellProperties.className = "hotAlign readOnlyGrey";
                            } else {
                                cellProperties.readOnly = that.readOnlySub
                                    ? that.readOnlySub
                                    : false;
                                cellProperties.className = "editable";
                            }
                        } else {
                            cellProperties.readOnly = that.readOnlySub
                                ? that.readOnlySub
                                : false;
                            cellProperties.className = "editable";
                        }

                        if (!/\d/.test(prop)) {
                            cellProperties.readOnly = true;
                            cellProperties.className = "rightAlign";
                        }
                        if (rowData && rowData.KEY_FIG_ID !== 997) {
                            cellProperties.readOnly = true;
                        }
                        return cellProperties;
                    },
                    licenseKey: HandsontableKey,
                });

                that.subhot.addHook(
                    "beforeChange",
                    that.beforeSubExcelCellChange.bind(that)
                );
            },


            addScrollAlign: function () {
                if (!(that.hot && that.subhot)) return;
                var mainTable = that.hot.rootElement.querySelector(".wtHolder");
                var subTable = that.subhot.rootElement.querySelector(".wtHolder");

                let isSyncing = false;

                function syncScroll(source, target) {
                    if (!isSyncing) {
                        isSyncing = true;
                        target.scrollLeft = source.scrollLeft; // Sync only horizontal scroll
                        isSyncing = false;
                    }
                }

                mainTable.addEventListener("scroll", function () {
                    syncScroll(mainTable, subTable);
                });

                subTable.addEventListener("scroll", function () {
                    syncScroll(subTable, mainTable);
                });
            },




            onPanelExpand: function (params) {
                const isExpanded = params.getParameters().expand;

                if (that.hot) {
                    let newHeight = isExpanded ? "60vh" : "83vh";

                    // Update the height property in the model
                    that.oGModel.setProperty("/hotHeight", newHeight);

                    // Convert 'vh' to pixels dynamically
                    let computedHeight = window.innerHeight * (parseInt(newHeight) / 100);

                    // Update Handsontable settings dynamically
                    that.hot.updateSettings({
                        height: computedHeight, //"auto",
                    });

                    // Re-render Handsontable
                    that.hot.render();
                }
            },

            onWeekTypeChange: function () {
                sap.m.MessageToast.show("Please click on Go button");
                const oWeekTypeKey = this.byId("idWeekTypeOPMIXP").getSelectedKey();
                that.modifyFilterWeek(oWeekTypeKey);
                // that.onGo();
                that.oTree.setModel(new JSONModel([]), "treeModel");
                var existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
            },

            modifyFilterWeek: function (params) {
                const oDateRange = this.byId("idWeekDateOPMIXP");

                // Get today's date
                const oToday = new Date();
                // Create date for two years from today
                const oLater = new Date();

                // Calculate the end date based on parameter
                if (params === "CALENDAR_WEEK") {
                    // Calculate the date two months from today
                    oLater.setMonth(oToday.getMonth() + 2);
                    oDateRange.setEnabled(true);
                } else if (params === "TELESCOPIC_WEEK") {
                    // Calculate the date two years from today
                    oLater.setFullYear(oToday.getFullYear() + 2);
                    oDateRange.setEnabled(false);
                }

                // Set the default date range
                oDateRange.setDateValue(oToday);
                oDateRange.setSecondDateValue(oLater);
            },

            afterDocumentKeyDown: function (event) {

                if (event.key !== "Enter") return;

                const sel = that.hot.getSelected();
                if (!sel || !sel.length) return;

                event.preventDefault();

                const [row, col] = sel[0];

                const r = row - 1; // your logic
                if (r < 0) return;

                const currentValue = that.hot.getDataAtCell(r, col);
                const cellMeta = that.hot.getCellMeta(r, col);

                if (cellMeta.readOnly) return;
                if (currentValue === null || currentValue === undefined || currentValue === "") return;

                const valueStr = String(currentValue);

                // 🔒 already locked
                if (valueStr.startsWith("🔒")) return;

                that.hot.setDataAtCell(r, col, `🔒${valueStr}`, "lock");
            },


            // afterDocumentKeyDown: function (event) {
            //     if (event.key === "Enter" && that.hot.getSelected()) {
            //         event.preventDefault();
            //         const [row, col] = that.hot.getSelected()[0];
            //         const currentValue = that.hot.getDataAtCell(row - 1, col);
            //         const cellMeta = that.hot.getCellMeta(row - 1, col);
            //         if (
            //             !currentValue.includes("🔒") &&
            //             currentValue &&
            //             !cellMeta.readOnly
            //         )
            //             that.hot.setDataAtCell(row - 1, col, `🔒${currentValue}`);
            //     }
            // },

            onAddOrEditComment: function (cell, value) {
                if (value) {
                    if (that.commentChanges.length > 0) {
                        var foundObj = that.commentChanges.find(
                            (o) => o.col == cell.col && o.row == cell.row
                        );
                        if (foundObj) {
                            const index = that.commentChanges.indexOf(foundObj);
                            if (index !== -1) {
                                Object.assign(foundObj, cell);
                            }
                        } else {
                            that.commentChanges.push(cell);
                        }
                    } else {
                        that.commentChanges.push(cell);
                    }
                }
            },


            //New function for removing commnets 12-02-2026
            onRemoveComment: function (cell) {

                const that = this;

                if (!cell || !Number.isInteger(cell.row) || !Number.isInteger(cell.col)) {
                    return;
                }

                cell.comment = null;

                const index = that.commentChanges.findIndex(
                    o => o.row === cell.row && o.col === cell.col
                );

                if (index !== -1) {
                    // Update existing entry
                    that.commentChanges[index].comment = null;
                } else {
                    // Add new delete-comment entry
                    that.commentChanges.push({
                        row: cell.row,
                        col: cell.col,
                        comment: null
                    });
                }
            },

            // onRemoveComment: function (cell) {
            //     if (that.commentChanges.length > 0) {
            //         var foundObj = that.commentChanges.find(
            //             (o) => o.col == cell.col && o.row == cell.row
            //         );
            //         if (foundObj) {
            //             const index = that.commentChanges.indexOf(foundObj);
            //             if (index !== -1) {
            //                 // that.commentChanges.splice(index, 1);
            //                 foundObj.comment = null;
            //             }
            //         } else {
            //             cell.comment = null;
            //             that.commentChanges.push(cell);
            //         }
            //     } else {
            //         cell.comment = null;
            //         that.commentChanges.push(cell);
            //     }
            // },

            handleSumTag: function () {
                var tag = that.getView().byId("idSumTagOPMIXP");
                var sum = 0;
                var cellRange = that.hot.getSelectedRange();
                cellRange = that.removeDuplicates(cellRange, ["row", "col"]);
                cellRange.forEach((cell) => {
                    var cellValue = that.hot.getDataAtCell(cell.from.row, cell.from.col);
                    if (typeof cellValue == "string") {
                        if (cellValue.includes("%")) {
                            if (cellValue.toString().startsWith("🔒")) {
                                sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                            } else {
                                sum = parseFloat(sum) + parseFloat(cellValue.split("%")[0]);
                            }
                        } else if (cellValue.toString().startsWith("🔒")) {
                            sum = parseFloat(sum) + parseFloat(cellValue.split("🔒")[1]);
                        } else {
                            sum = parseFloat(sum) + parseFloat(cellValue);
                        }
                    } else {
                        sum = Math.round(parseFloat(sum) + parseFloat(cellValue));
                    }
                });
                tag.getModel("sumModel").setProperty("/sum", Math.round(sum));
            },

            handleContextMenu: function (key, selection) {
                switch (key) {
                    case "lock-cell":
                        that.handleLockCell(selection, that.hot);
                        break;
                    case "unlock-cell":
                        that.handleUnLockCell(selection, that.hot);
                        break;
                    case "eq-dist":
                        that.handleEqualDistribute(selection, that.hot);
                        break;
                    case "pro-dist":
                        that.handleProrateDistribute(selection, that.hot);
                        break;
                    default:
                        break;
                }
            },

            handleEditMenu: function (key, selection) {
                that.readOnlySub = false;
                that.subhot.render();
            },

            handleLockCell: function (selection, hot) {
                if (selection.length <= 1) {
                    const obj = selection[0];
                    if (obj.start.row === obj.end.row && obj.start.col === obj.end.col) {
                        let row = obj.start.row;
                        let col = obj.start.col;
                        let cellValue = hot.getDataAtCell(row, col);
                        if (cellValue && !cellValue.toString().startsWith("🔒")) {
                            hot.setDataAtCell(row, col, "🔒" + cellValue);
                        }
                    }
                }
            },

            handleUnLockCell: function (selection, hot) {
                if (selection.length <= 1) {
                    const obj = selection[0];
                    if (obj.start.row === obj.end.row && obj.start.col === obj.end.col) {
                        let row = obj.start.row;
                        let col = obj.start.col;
                        let cellValue = hot.getDataAtCell(row, col);
                        if (cellValue && cellValue.startsWith("🔒")) {
                            hot.setDataAtCell(row, col, cellValue.slice(2));
                        }
                    }
                }
            },

            handleEqualDistribute1: function (selection, hot) {

                if (!selection || selection.length === 0) return;

                const obj = selection[0];

                // single cell only
                if (obj.start.row !== obj.end.row || obj.start.col !== obj.end.col) {
                    sap.m.MessageToast.show("Select single cell");
                    return;
                }

                let row = obj.start.row;
                let col = obj.start.col;

                let physicalRow = hot.toPhysicalRow(row);
                let rowData = hot.getSourceDataAtRow(physicalRow);

                if (!rowData) return;

                // only Manual Option %
                if (rowData.KEY_FIG_DESC !== "Manual Option % ") {
                    sap.m.MessageToast.show("Select Manual Option % row only");
                    return;
                }

                // ----------------------------------
                // selected cell value (supports 🔒15)
                // ----------------------------------
                let txt = String(hot.getDataAtCell(row, col)).trim();

                let enteredValue = parseFloat(
                    txt.replace(/[^\d.-]/g, "")
                );

                enteredValue = isNaN(enteredValue) ? 0 : enteredValue;

                if (enteredValue < 0 || enteredValue > 100) {
                    sap.m.MessageToast.show("Value must be between 0 and 100");
                    return;
                }

                let cellMeta = hot.getCellMeta(row, col);
                let weekProp = cellMeta.prop;

                let allRows = hot.getSourceData();

                // ----------------------------------
                // same characteristics group
                // ----------------------------------
                let groupRows = allRows.filter(f =>
                    f.LOCATION_ID === rowData.LOCATION_ID &&
                    f.PRODUCT_ID === rowData.PRODUCT_ID &&
                    f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                    f.CHAR_NUM === rowData.CHAR_NUM &&
                    f.VERSION === rowData.VERSION &&
                    f.SCENARIO === rowData.SCENARIO &&
                    f.KEY_FIG_DESC === "Manual Option % "
                );

                if (!groupRows.length) return;

                let lockedSum = 0;
                let editableRows = [];

                groupRows.forEach(item => {

                    let sourceIndex = allRows.findIndex(x =>
                        x.LOCATION_ID === item.LOCATION_ID &&
                        x.PRODUCT_ID === item.PRODUCT_ID &&
                        x.CUSTOMER_GROUP === item.CUSTOMER_GROUP &&
                        x.CHAR_NUM === item.CHAR_NUM &&
                        x.CHARVAL_NUM === item.CHARVAL_NUM &&
                        x.VERSION === item.VERSION &&
                        x.SCENARIO === item.SCENARIO &&
                        x.KEY_FIG_DESC === "Manual Option % "
                    );

                    if (sourceIndex < 0) return;

                    let vRow = hot.toVisualRow(sourceIndex);
                    if (vRow == null || vRow < 0) return;

                    let txt = String(hot.getDataAtCell(vRow, col)).trim();

                    let val = parseFloat(txt.replace(/[^\d.-]/g, ""));
                    val = isNaN(val) ? 0 : val;

                    let isLocked = txt.indexOf("🔒") > -1;

                    // selected row locked => count only
                    if (vRow === row && isLocked) {
                        lockedSum += val;
                        return;
                    }

                    // selected row unlocked => keep user value
                    if (vRow === row) {
                        return;
                    }

                    // any locked row never touch
                    if (isLocked) {
                        lockedSum += val;
                        return;
                    }

                    // only free rows editable
                    editableRows.push(vRow);

                });

                // ----------------------------------
                // remaining for unlocked rows
                // ----------------------------------
                let remaining = 100 - enteredValue - lockedSum;

                if (remaining < 0) {
                    sap.m.MessageToast.show("Entered + Locked exceeds 100");
                    return;
                }

                if (editableRows.length === 0) return;

                // ----------------------------------
                // equal distribution exact 100
                // ----------------------------------
                let each = remaining / editableRows.length;
                let used = 0;

                that.isProgrammaticChange = true;

                editableRows.forEach((r, i) => {

                    let val;

                    if (i === editableRows.length - 1) {
                        val = (remaining - used).toFixed(2);
                    } else {
                        val = each.toFixed(2);
                        used += parseFloat(val);
                    }

                    hot.setDataAtCell(r, col, val);

                });

                that.isProgrammaticChange = false;
            },


            handleEqualDistribute: function (selection, hot) {

                if (!selection || selection.length === 0) return;

                const obj = selection[0];

                // single cell only
                if (obj.start.row !== obj.end.row || obj.start.col !== obj.end.col) {
                    sap.m.MessageToast.show("Select single cell");
                    return;
                }

                let row = obj.start.row;
                let col = obj.start.col;

                let physicalRow = hot.toPhysicalRow(row);
                let rowData = hot.getSourceDataAtRow(physicalRow);

                if (!rowData) return;

                // only Manual Option %
                if (rowData.KEY_FIG_DESC !== "Manual Option % ") {
                    sap.m.MessageToast.show("Select Manual Option % row only");
                    return;
                }

                // ----------------------------------
                // selected cell value (supports 🔒15)
                // ----------------------------------
                let txt = String(hot.getDataAtCell(row, col)).trim();

                let enteredValue = parseFloat(
                    txt.replace(/[^\d.-]/g, "")
                );

                enteredValue = isNaN(enteredValue) ? 0 : enteredValue;

                if (enteredValue < 0 || enteredValue > 100) {
                    sap.m.MessageToast.show("Value must be between 0 and 100");
                    return;
                }

                let cellMeta = hot.getCellMeta(row, col);
                let weekProp = cellMeta.prop;

                let allRows = hot.getSourceData();

                // ----------------------------------
                // same characteristics group
                // ----------------------------------
                let groupRows = allRows.filter(f =>
                    f.LOCATION_ID === rowData.LOCATION_ID &&
                    f.PRODUCT_ID === rowData.PRODUCT_ID &&
                    f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                    f.CHAR_NUM === rowData.CHAR_NUM &&
                    f.VERSION === rowData.VERSION &&
                    f.SCENARIO === rowData.SCENARIO &&
                    f.KEY_FIG_DESC === "Manual Option % "
                );

                if (!groupRows.length) return;

                let lockedSum = 0;
                let editableRows = [];

                groupRows.forEach(item => {

                    let sourceIndex = allRows.findIndex(x =>
                        x.LOCATION_ID === item.LOCATION_ID &&
                        x.PRODUCT_ID === item.PRODUCT_ID &&
                        x.CUSTOMER_GROUP === item.CUSTOMER_GROUP &&
                        x.CHAR_NUM === item.CHAR_NUM &&
                        x.CHARVAL_NUM === item.CHARVAL_NUM &&
                        x.VERSION === item.VERSION &&
                        x.SCENARIO === item.SCENARIO &&
                        x.KEY_FIG_DESC === "Manual Option % "
                    );

                    if (sourceIndex < 0) return;

                    let vRow = hot.toVisualRow(sourceIndex);
                    if (vRow == null || vRow < 0) return;

                    let txt = String(hot.getDataAtCell(vRow, col)).trim();

                    let val = parseFloat(txt.replace(/[^\d.-]/g, ""));
                    val = isNaN(val) ? 0 : val;

                    // ----------------------------------
                    // detect lock from 3 sources
                    // ----------------------------------
                    let lockFound = that.cellChanges && that.cellChanges.some(c =>
                        c.LOCATION_ID === item.LOCATION_ID &&
                        c.PRODUCT_ID === item.PRODUCT_ID &&
                        c.CUSTOMER_GROUP === item.CUSTOMER_GROUP &&
                        c.CHAR_NUM === item.CHAR_NUM &&
                        c.CHARVAL_NUM === item.CHARVAL_NUM &&
                        c.VERSION === item.VERSION &&
                        c.SCENARIO === item.SCENARIO &&
                        c[that.weekType] === weekProp &&
                        c.LOCK === true
                    );

                    let isLocked =
                        txt.indexOf("🔒") > -1 ||
                        item.LOCK === true ||
                        lockFound;

                    // ----------------------------------
                    // selected row locked => count only
                    // ----------------------------------


                    // selected row handling
                    if (vRow === row) {

                        // if selected row locked -> do NOT use enteredValue
                        if (isLocked) {
                            lockedSum += val;
                            enteredValue = 0;
                        }

                        return;
                    }

                    // locked rows never touch
                    if (isLocked) {
                        lockedSum += val;
                        return;
                    }

                    // free rows only distribute
                    editableRows.push(vRow);

                });

                // ----------------------------------
                // remaining for unlocked rows
                // ----------------------------------
                let remaining = 100 - enteredValue - lockedSum;

                if (remaining < 0) {
                    sap.m.MessageToast.show("Entered + Locked exceeds 100");
                    return;
                }

                if (editableRows.length === 0) return;

                // ----------------------------------
                // equal distribution exact 100
                // ----------------------------------
                let each = remaining / editableRows.length;
                let used = 0;

                that.isProgrammaticChange = true;

                editableRows.forEach((r, i) => {

                    let val;

                    if (i === editableRows.length - 1) {
                        val = (remaining - used).toFixed(2);
                    } else {
                        val = each.toFixed(2);
                        used += parseFloat(val);
                    }

                    hot.setDataAtCell(r, col, val);

                });

                that.isProgrammaticChange = false;
            },

            handleProrateDistribute: function (selection, hot) {
                const that = this;

                sap.ui.core.BusyIndicator.show(0);

                setTimeout(() => {
                    that._handleProrateCore(selection, hot);
                }, 0);
            },


            _handleProrateCore: function (selection, hot) {


                const that = this;
                try {
                    console.log("------ PRORATE START ------");

                    if (!selection || selection.length !== 1) return;

                    const obj = selection[0];
                    if (obj.start.row !== obj.end.row || obj.start.col !== obj.end.col) return;

                    const visualRow = obj.start.row;
                    const visualCol = obj.start.col;

                    console.log("Clicked visual row:", visualRow, "col:", visualCol);

                    if (!Number.isInteger(visualRow) || visualRow < 0) return;

                    const physicalRow = hot.toPhysicalRow(visualRow);
                    console.log("Physical row:", physicalRow);

                    if (!Number.isInteger(physicalRow) || physicalRow < 0) return;

                    // SAFE SET FUNCTION
                    const safeSet = function (vRow, col, value) {

                        if (!Number.isInteger(vRow) || vRow < 0) return;

                        const pRow = hot.toPhysicalRow(vRow);
                        if (!Number.isInteger(pRow) || pRow < 0) return;

                        try {
                            hot.setDataAtCell(pRow, col, value, "prorate");
                        } catch (e) {
                            console.error("Crash in setDataAtCell:", e);
                        }
                    };


                    const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData") || [];

                    const sortedKeyFigs = maintainedKeyFigs
                        .filter(fig =>
                            fig.KEY_FIG_ID !== that.ManualKeyArr[0].KEY_FIG_ID &&
                            parseInt(fig.KEY_FIG_ID) <= 50
                        )
                        .sort((a, b) => b.PRIORITY_ORDER - a.PRIORITY_ORDER);

                    if (!sortedKeyFigs.length) {
                        console.error("No key figures found.");
                        return;
                    }

                    const mainData = $.extend(true, [], that.allData);

                    // keep visual index aligned
                    const hotData = [];
                    for (let r = 0; r < hot.countRows(); r++) {
                        hotData.push(hot.getSourceDataAtRow(hot.toPhysicalRow(r)));
                    }

                    const rowData = hotData[visualRow];
                    if (!rowData) return;

                    const cellMeta = hot.getCellMeta(visualRow, visualCol);

                    let rawVal = hot.getDataAtCell(visualRow, visualCol);
                    let isLocked = rawVal && rawVal.toString().startsWith("🔒");

                    let clickedVal = isLocked
                        ? parseFloat(rawVal.toString().slice(2))
                        : parseFloat(rawVal);

                    if (isNaN(clickedVal) || clickedVal > 100) return;

                    console.log("Clicked value:", clickedVal, "Locked:", isLocked);

                    // ------------------------------
                    // GET GROUP ROWS
                    // ------------------------------

                    const charvals = mainData.filter(f =>
                        f.LOCATION_ID === rowData.LOCATION_ID &&
                        f.PRODUCT_ID === rowData.PRODUCT_ID &&
                        f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                        f.CHAR_NUM === rowData.CHAR_NUM &&
                        f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                        f.VERSION === rowData.VERSION &&
                        f.SCENARIO === rowData.SCENARIO &&
                        f[that.weekType] === cellMeta.prop &&
                        parseInt(f.KEY_FIG_ID) === sortedKeyFigs[0].KEY_FIG_ID
                    );

                    const lockedCells = [];
                    const unlockedCells = [];

                    if (isLocked) {
                        lockedCells.push({ index: visualRow, value: clickedVal });
                    } else {
                        unlockedCells.push({ index: visualRow, value: clickedVal });
                    }

                    charvals.forEach(c => {

                        const foundInd = hotData.findIndex(f =>
                            f &&
                            f.LOCATION_ID === c.LOCATION_ID &&
                            f.PRODUCT_ID === c.PRODUCT_ID &&
                            f.CHARVAL_NUM === c.CHARVAL_NUM &&
                            f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                        );

                        if (!Number.isInteger(foundInd) || foundInd < 0) return;

                        let valRaw = hot.getDataAtCell(foundInd, visualCol);
                        let lock = valRaw && valRaw.toString().startsWith("🔒");

                        let val = lock
                            ? parseFloat(valRaw.toString().slice(2))
                            : parseFloat(valRaw);

                        if (isNaN(val)) val = 0;

                        if (lock) {
                            lockedCells.push({ index: foundInd, value: val });
                        } else {
                            unlockedCells.push({ index: foundInd, value: val });
                        }
                    });

                    // ------------------------------
                    // CALCULATE REMAINING
                    // ------------------------------

                    const sumLocked = lockedCells.reduce((s, c) => s + c.value, 0);
                    const remaining = 100 - (sumLocked + (isLocked ? 0 : clickedVal));

                    console.log("Sum Locked:", sumLocked);
                    console.log("Remaining:", remaining);

                    if (remaining < 0) {
                        sap.m.MessageToast.show("Total exceeds 100%");
                        return;
                    }

                    // ------------------------------
                    // SET CLICKED VALUE
                    // ------------------------------

                    safeSet(
                        visualRow,
                        visualCol,
                        isLocked
                            ? `🔒${clickedVal.toFixed(2)}`
                            : clickedVal.toFixed(2)
                    );

                    // ------------------------------
                    // PROPORTIONAL DISTRIBUTION
                    // ------------------------------

                    const proportionalBase = [];

                    unlockedCells.forEach(c => {

                        if (c.index === visualRow) return;

                        const rowObj = hotData[c.index];
                        if (!rowObj) return;

                        const original = mainData.find(f =>
                            f.LOCATION_ID === rowObj.LOCATION_ID &&
                            f.PRODUCT_ID === rowObj.PRODUCT_ID &&
                            f.CUSTOMER_GROUP === rowObj.CUSTOMER_GROUP &&
                            f.CHAR_NUM === rowObj.CHAR_NUM &&
                            f.CHARVAL_NUM === rowObj.CHARVAL_NUM &&
                            f.VERSION === rowObj.VERSION &&
                            f.SCENARIO === rowObj.SCENARIO &&
                            f[that.weekType] === cellMeta.prop &&
                            parseInt(f.KEY_FIG_ID) === sortedKeyFigs[0].KEY_FIG_ID
                        );

                        const baseVal = parseFloat(original?.OPT_PERCENT);

                        proportionalBase.push({
                            index: c.index,
                            base: isNaN(baseVal) ? 0 : baseVal
                        });
                    });

                    const sumPool = proportionalBase.reduce((s, o) => s + o.base, 0);

                    console.log("Sum Pool:", sumPool);

                    proportionalBase.forEach(o => {

                        let newVal;

                        if (sumPool === 0) {
                            newVal = remaining / proportionalBase.length;
                        } else {
                            newVal = (o.base / sumPool) * remaining;
                        }

                        if (isNaN(newVal)) newVal = 0;

                        safeSet(o.index, visualCol, newVal.toFixed(2));
                    });

                    // ------------------------------
                    // ROUNDING CORRECTION
                    // ------------------------------

                    let totalNow = 0;

                    lockedCells.forEach(c => totalNow += c.value);
                    totalNow += (isLocked ? 0 : clickedVal);

                    proportionalBase.forEach(o => {
                        const v = parseFloat(hot.getDataAtCell(o.index, visualCol));
                        totalNow += isNaN(v) ? 0 : v;
                    });

                    let diffFix = 100 - totalNow;
                    diffFix = parseFloat(diffFix.toFixed(2));

                    console.log("Final Total:", totalNow);
                    console.log("Diff Fix:", diffFix);

                    if (proportionalBase.length > 0 && !isNaN(diffFix)) {

                        const lastIdx = proportionalBase[proportionalBase.length - 1].index;
                        const lastVal = parseFloat(hot.getDataAtCell(lastIdx, visualCol)) || 0;

                        safeSet(lastIdx, visualCol, (lastVal + diffFix).toFixed(2));
                    }

                    // ------------------------------
                    // RESTORE LOCK ICONS
                    // ------------------------------

                    lockedCells.forEach(c => {
                        safeSet(c.index, visualCol, `🔒${c.value.toFixed(2)}`);
                    });

                    console.log("------ PRORATE END ------");
                } catch (e) {
                    console.error(e);
                } finally {
                    sap.ui.core.BusyIndicator.hide(); //  IMPORTANT
                }

            },

            beforeExcelCellChange: function (changes, source) {


                const that = this;

                const totalDates = that.oGModel.getProperty("/totalWeekTypes") || [];
                const checkData = $.extend(true, [], that.allData || []);
                const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData") || [];

                const filteredData = maintainedKeyFigs
                    .filter(fig =>
                        fig.KEY_FIG_ID !== that.ManualKeyArr[0].KEY_FIG_ID &&
                        fig.KEY_FIG_ID <= 50
                    )
                    .sort((a, b) => b.PRIORITY_ORDER - a.PRIORITY_ORDER);

                const sortedKeyFigs = filteredData.filter(function (item) {
                    return item.KEY_FIG_ID === 1;
                });
                if (
                    source === "edit" ||
                    source === "CopyPaste.paste" ||
                    source === "Autofill.fill" ||
                    source === "prorate"
                ) {

                    for (let i = 0; i < changes.length; i++) {

                        const oldVal = changes[i][2];
                        const newVal = changes[i][3];

                        //  BLOCK DELETE ON LOCKED CELL
                        if (
                            oldVal &&
                            String(oldVal).startsWith("🔒") &&
                            (newVal === "" || newVal === null || newVal === undefined)
                        ) {
                            //  cancel this change
                            changes[i] = null;
                            continue; //  valid here
                        }

                        const rowIndex = changes[i][0];
                        const colHeader = changes[i][1];
                        const oldValue = changes[i][2];
                        let newValue = changes[i][3];

                        //  SAFETY
                        if (!Number.isInteger(rowIndex) || rowIndex < 0) {
                            changes[i] = null;
                            continue;
                        }

                        const rowData = that.hot.getSourceDataAtRow(rowIndex);
                        if (!rowData) {
                            changes[i] = null;
                            continue;
                        }

                        //  LOCK HANDLING
                        let lock = false;
                        if (newValue && newValue.toString().startsWith("🔒")) {
                            lock = true;
                            newValue = newValue.replace("🔒", "");
                        }
                        //  VALIDATE
                        if (source !== "prorate") {
                            newValue = isNaN(parseFloat(newValue)) ? "" : parseFloat(newValue);
                        } else {
                            newValue = parseFloat(newValue);
                        }

                        const startWeeks = totalDates.filter(
                            f => f[that.weekType] == colHeader
                        );

                        for (let w = 0; w < startWeeks.length; w++) {

                            const week = startWeeks[w];

                            const obj = {
                                LOCATION_ID: rowData.LOCATION_ID,
                                PRODUCT_ID: rowData.PRODUCT_ID,
                                CUSTOMER_GROUP: rowData.CUSTOMER_GROUP,
                                CHAR_NUM: rowData.CHAR_NUM,
                                CHAR_NAME: rowData.CHAR_NAME,
                                CHARVAL_NUM: rowData.CHARVAL_NUM,
                                VERSION: rowData.VERSION,
                                MODEL_VERSION: rowData.MODEL_VERSION,
                                SCENARIO: rowData.SCENARIO,
                                WEEK_STARTDATE: that.convertDate(week.WEEK_STARTDATE, "-"),
                                WEEK_ENDDATE: that.convertDate(week.WEEK_ENDDATE, "-"),
                                LOCK: lock,
                                OLD_VALUE: oldValue,
                                NEW_VALUE: newValue,
                                OPT_PERCENT: newValue,
                                COMMENTS: "",
                                CFLAG: source === "prorate"
                            };

                            const foundObj = checkData.find(f =>
                                f.LOCATION_ID == obj.LOCATION_ID &&
                                f.PRODUCT_ID == obj.PRODUCT_ID &&
                                f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
                                f.CHAR_NUM == obj.CHAR_NUM &&
                                f.CHARVAL_NUM == obj.CHARVAL_NUM &&
                                f[that.weekType] == colHeader &&
                                f.VERSION == obj.VERSION &&
                                f.SCENARIO == obj.SCENARIO &&
                                f.MODEL_VERSION == obj.MODEL_VERSION &&
                                f.TYPE == sortedKeyFigs[0]?.KEY_FIG_ID
                            );

                            if (foundObj) obj.OLD_VALUE = foundObj.OPT_PERCENT;

                            //  REMOVE OLD ENTRY FROM cellChanges (OLD BEHAVIOR)
                            const existingIndex = that.cellChanges.findIndex(f =>
                                f.LOCATION_ID == obj.LOCATION_ID &&
                                f.PRODUCT_ID == obj.PRODUCT_ID &&
                                f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
                                f.CHAR_NUM == obj.CHAR_NUM &&
                                f.CHARVAL_NUM == obj.CHARVAL_NUM &&
                                f.VERSION == obj.VERSION &&
                                f.SCENARIO == obj.SCENARIO &&
                                f.MODEL_VERSION == obj.MODEL_VERSION &&
                                f.WEEK_STARTDATE == obj.WEEK_STARTDATE
                            );

                            if (existingIndex !== -1) {
                                that.cellChanges.splice(existingIndex, 1);
                            }


                            if (newValue === "" || newValue === null || isNaN(newValue)) {
                                that.deleteChanges.push(obj);
                            } else {
                                that.cellChanges.push(obj);
                            }
                        }
                    }
                }
            },


            beforeSubExcelCellChange: function (changes, source) {
                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                if (source === "edit") {
                    for (let i = 0; i < changes.length; i++) {
                        var colHeader = changes[i][1];
                        var rowIndex = changes[i][0];
                        var oldValue = changes[i][2];
                        var newValue = changes[i][3];
                        let startWeeks = totalDates.filter(
                            (f) => f[that.weekType] == colHeader
                        );
                        if (oldValue != newValue) {
                            newValue = isNaN(parseFloat(newValue))
                                ? ""
                                : parseFloat(newValue);
                            let location = that.subhot.getSourceDataAtRow(rowIndex).LOCATION;
                            let product = that.subhot.getSourceDataAtRow(rowIndex).PRODUCT;
                            let customerGrp =
                                that.subhot.getSourceDataAtRow(rowIndex).CUSTOMER_GROUP;
                            let version = that.subhot.getSourceDataAtRow(rowIndex).VERSION;
                            let scenario = that.subhot.getSourceDataAtRow(rowIndex).SCENARIO;
                            let mv = "";
                            if (that.smartFilterBar && that.smartFilterBar.getFilterData()) {
                                mv = that.smartFilterBar.getFilterData()["MODEL_VERSION"];
                            } else {
                                mv = "Active";
                            }
                            for (let index = 0; index < startWeeks.length; index++) {
                                const obj = {};
                                const week = startWeeks[index];
                                // const weekStart = new Date(week.WEEK_STARTDATE);
                                // const mondayFromWeek = new Date(weekStart.getTime() + (1 - weekStart.getDay()) * 24 * 60 * 60 * 1000);
                                const weekdate = that.convertDate(week.WEEK_STARTDATE, "-");
                                obj.LOCATION_ID = location;
                                obj.PRODUCT_ID = product;
                                obj.CUSTOMER_GROUP = customerGrp;
                                obj.VERSION = version;
                                obj.SCENARIO = scenario;
                                obj.MODEL_VERSION = mv;
                                obj[that.weekType] = colHeader;
                                obj.QUANTITY = newValue;
                                obj.WEEK_STARTDATE = that.convertDate(week.WEEK_STARTDATE, "-");
                                obj.WEEK_ENDDATE = that.convertDate(week.WEEK_ENDDATE, "-");
                                let foundItem = that.subAllData.find(
                                    (f) =>
                                        f.LOCATION_ID == obj.LOCATION_ID &&
                                        f.PRODUCT_ID == obj.PRODUCT_ID &&
                                        f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
                                        f.VERSION == obj.VERSION &&
                                        f.SCENARIO == obj.SCENARIO &&
                                        that.convertDate(f.WEEK_STARTDATE, "-") ==
                                        obj.WEEK_STARTDATE
                                );
                                let weekProdDem = foundItem.OPT_QTY; // const filteredData = that.subAllData.filter(f=>f.LOCATION_ID == location && f.PRODUCT_ID == product && f.CUSTOMER_GROUP == customerGrp && f.WEEK_STARTDATE == weekdate);
                                if (that.subCellChanges.length > 0) {
                                    var foundObject = that.compareData(
                                        obj,
                                        that.subCellChanges,
                                        "find",
                                        [
                                            "LOCATION_ID",
                                            "PRODUCT_ID",
                                            "CUSTOMER_GROUP",
                                            "WEEK_STARTDATE",
                                        ]
                                    );
                                    if (foundObject) {
                                        if (newValue || newValue === 0) {
                                            if (
                                                (newValue && typeof newValue !== "string") ||
                                                newValue == 0
                                            ) {
                                                if (startWeeks.length > 1) {
                                                    // obj.QUANTITY = newValue * weekProdDem / parseFloat(oldValue);
                                                    const q =
                                                        (newValue * weekProdDem) / parseFloat(oldValue);
                                                    obj.QUANTITY = that.processValue(
                                                        q,
                                                        index,
                                                        startWeeks.length,
                                                        "d"
                                                    );
                                                }
                                                Object.assign(foundObject, obj);
                                            } else {
                                                MessageToast.show("Enter a Valid Number");
                                            }
                                        } else {
                                            const index = that.subCellChanges.indexOf(foundObject);
                                            if (index !== -1) {
                                                that.subCellChanges.splice(index, 1);
                                            }
                                        }
                                    } else {
                                        if (
                                            (newValue && typeof newValue !== "string") ||
                                            newValue == 0
                                        ) {
                                            if (startWeeks.length > 1) {
                                                // obj.QUANTITY = newValue * weekProdDem / parseFloat(oldValue);
                                                const q =
                                                    (newValue * weekProdDem) / parseFloat(oldValue);
                                                obj.QUANTITY = that.processValue(
                                                    q,
                                                    index,
                                                    startWeeks.length,
                                                    "e"
                                                );
                                            }
                                            that.subCellChanges.push(obj);
                                        } else if (newValue === 0) {
                                            if (startWeeks.length > 1) {
                                                // obj.QUANTITY = newValue * weekProdDem / parseFloat(oldValue);
                                                const q =
                                                    (newValue * weekProdDem) / parseFloat(oldValue);
                                                obj.QUANTITY = that.processValue(
                                                    q,
                                                    index,
                                                    startWeeks.length,
                                                    "a"
                                                );
                                            }
                                            that.subCellChanges.push(obj);
                                        } else {
                                            MessageToast.show("Enter a Valid Number");
                                        }
                                    }
                                } else {
                                    if (
                                        (newValue && typeof newValue !== "string") ||
                                        newValue == 0
                                    ) {
                                        if (startWeeks.length > 1) {
                                            // obj.QUANTITY = newValue * weekProdDem / parseFloat(oldValue);
                                            const q = (newValue * weekProdDem) / parseFloat(oldValue);
                                            obj.QUANTITY = that.processValue(
                                                q,
                                                index,
                                                startWeeks.length,
                                                "b"
                                            );
                                        }
                                        that.subCellChanges.push(obj);
                                    } else if (newValue === 0) {
                                        if (startWeeks.length > 1) {
                                            // obj.QUANTITY = newValue * weekProdDem / parseFloat(oldValue);
                                            const q = (newValue * weekProdDem) / parseFloat(oldValue);
                                            obj.QUANTITY = that.processValue(
                                                q,
                                                index,
                                                startWeeks.length,
                                                "c"
                                            );
                                        }
                                        that.subCellChanges.push(obj);
                                    } else {
                                        MessageToast.show("Enter a Valid Number");
                                        that.subhot.render();
                                    }
                                }
                            }
                        }
                    }
                }
                that.oGModel.setProperty("/subDataChanges", that.subCellChanges);
                that.oGModel.refresh(true);
            },

            processValue(value, index, weekLength) {
                if (!that.storedDecimalSums) {
                    that.storedDecimalSums = 0;
                }

                const decimalPart = value - Math.floor(value);

                if (index !== weekLength - 1) {
                    that.storedDecimalSums += decimalPart;
                    return Math.floor(value);
                } else {
                    const finalValue = value + that.storedDecimalSums;
                    that.storedDecimalSums = 0;
                    return Math.round(finalValue);
                }
            },

            updateExcelData: function () {
                if (that.cellChanges.length > 0) {
                    var hotData = that.hot.getSourceData();
                    that.cellChanges.forEach((f) => {
                        var foundInd = hotData.findIndex(
                            (item) =>
                                item.LOCATION_ID === f.LOCATION_ID &&
                                item.PRODUCT_ID === f.PRODUCT_ID &&
                                item.CUSTOMER_GROUP === f.CUSTOMER_GROUP &&
                                // && item.CLASS_NUM === f.CLASS_NUM
                                item.CHAR_NUM === f.CHAR_NUM &&
                                item.CHARVAL_NUM === f.CHARVAL_NUM &&
                                item.VERSION === f.VERSION &&
                                item.SCENARIO === f.SCENARIO &&
                                item.MODEL_VERSION === f.MODEL_VERSION &&
                                item.KEY_FIG_ID === that.ManualKeyArr[0].KEY_FIG_ID
                        );
                        if (foundInd !== -1) {
                            hotData[foundInd][that.weekType] = f.NEW_VALUE;
                        }
                    });
                    that.hot.updateSettings({ data: hotData });
                }
            },

            avgQuantities: function (data, keys) {
                const aData = [...data];
                const fieldNames = that.convertFieldNames([...keys]);
                const aggregatedData = new Map();
                // Build lookup map once
                const totalQtyMap = new Map();

                aData.forEach(item => {

                    if (item.TYPE == 1000) {

                        const key =
                            `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CHAR_NUM}|${item[that.weekType]}`;

                        totalQtyMap.set(
                            key,
                            (totalQtyMap.get(key) || 0) + (parseFloat(item.OPT_QTY) || 0)
                        );
                    }

                });
                that.allSubData = [];

                // Sort aData based on CUSTOMER_GROUP
                aData.sort(that.dynamicSort("CUSTOMER_GROUP"));

                for (let index = 0; index < aData.length; index++) {
                    const item = aData[index];
                    if (!item.CHAR_NUM) {
                        item.LOCK = true;
                        that.allSubData.push(item);
                        continue;
                    }
                    const key = fieldNames.map((fieldName) => item[fieldName]).join("?");
                    aggregatedData[key] = aggregatedData[key] || {
                        ...item,
                        OPT_FQTY: 0,
                    };
                    aggregatedData[key].OPT_FQTY += parseFloat(item.OPT_QTY) || 0;
                }

                if (
                    Object.values(aggregatedData).length !=
                    data.length - that.allSubData.length
                ) {
                    const result = Object.values(aggregatedData).map((item) => {
                        if (
                            item.TYPE !== that.ManualKeyArr[0].KEY_FIG_ID &&
                            item.TYPE < 50
                        ) {
                            // var totalCharOptQty = "";
                            //             const filteredData = aData.filter(
                            //                 (f) =>
                            //                     f.LOCATION_ID == item.LOCATION_ID &&
                            //                     f.PRODUCT_ID == item.PRODUCT_ID &&
                            //   /* f.CLASS_NUM == item.CLASS_NUM && */ f.CHAR_NUM ==
                            //                     item.CHAR_NUM &&
                            //                     f[that.weekType] == item[that.weekType] &&
                            //                     f.TYPE == 1000
                            //             );
                            // totalCharOptQty = that.getSumOptQty(filteredData);
                            const lookupKey =
                                `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CHAR_NUM}|${item[that.weekType]}`;

                            const totalCharOptQty = totalQtyMap.get(lookupKey) || 0;
                            let OPT_PERCENT = 0;
                            let OPT_QTY = 0;
                            if (totalCharOptQty && totalCharOptQty > 0) {
                                OPT_PERCENT = parseFloat(
                                    ((item.OPT_FQTY / totalCharOptQty) * 100).toFixed(2)
                                );
                                OPT_QTY = Math.round((OPT_PERCENT * totalCharOptQty) / 100);
                            }
                            return {
                                ...item,
                                OPT_PERCENT,
                                OPT_QTY,
                            };
                        } else {
                            return {
                                ...item,
                            };
                        }
                    });
                    if (!that.isCharItemPressed) {
                        let modifiedData = that.getSubExcelData(that.allSubData);
                        that.generateSubExcel(modifiedData, that.dates);
                    }
                    return result;
                } else {
                    if (!that.isCharItemPressed) {
                        let modifiedData = that.getSubExcelData(that.allSubData);
                        that.generateSubExcel(modifiedData, that.dates);
                    }
                    return Object.values(aggregatedData);
                }
            },


            avgQuantitiesoriginal: function (data, keys) {
                const aData = [...data];
                const fieldNames = that.convertFieldNames([...keys]);
                const aggregatedData = new Map();
                that.allSubData = [];

                // Sort aData based on CUSTOMER_GROUP
                aData.sort(that.dynamicSort("CUSTOMER_GROUP"));

                for (let index = 0; index < aData.length; index++) {
                    const item = aData[index];
                    if (!item.CHAR_NUM) {
                        item.LOCK = true;
                        that.allSubData.push(item);
                        continue;
                    }
                    const key = fieldNames.map((fieldName) => item[fieldName]).join("?");
                    aggregatedData[key] = aggregatedData[key] || {
                        ...item,
                        OPT_FQTY: 0,
                    };
                    aggregatedData[key].OPT_FQTY += parseFloat(item.OPT_QTY) || 0;
                }

                if (
                    Object.values(aggregatedData).length !=
                    data.length - that.allSubData.length
                ) {
                    const result = Object.values(aggregatedData).map((item) => {
                        if (
                            item.TYPE !== that.ManualKeyArr[0].KEY_FIG_ID &&
                            item.TYPE < 50
                        ) {
                            var totalCharOptQty = "";
                            const filteredData = aData.filter(
                                (f) =>
                                    f.LOCATION_ID == item.LOCATION_ID &&
                                    f.PRODUCT_ID == item.PRODUCT_ID &&
                  /* f.CLASS_NUM == item.CLASS_NUM && */ f.CHAR_NUM ==
                                    item.CHAR_NUM &&
                                    f[that.weekType] == item[that.weekType] &&
                                    f.TYPE == 1000
                            );
                            totalCharOptQty = that.getSumOptQty(filteredData);
                            let OPT_PERCENT = 0;
                            let OPT_QTY = 0;
                            if (totalCharOptQty && totalCharOptQty > 0) {
                                OPT_PERCENT = parseFloat(
                                    ((item.OPT_FQTY / totalCharOptQty) * 100).toFixed(2)
                                );
                                OPT_QTY = Math.round((OPT_PERCENT * totalCharOptQty) / 100);
                            }
                            return {
                                ...item,
                                OPT_PERCENT,
                                OPT_QTY,
                            };
                        } else {
                            return {
                                ...item,
                            };
                        }
                    });
                    if (!that.isCharItemPressed) {
                        let modifiedData = that.getSubExcelData(that.allSubData);
                        that.generateSubExcel(modifiedData, that.dates);
                    }
                    return result;
                } else {
                    if (!that.isCharItemPressed) {
                        let modifiedData = that.getSubExcelData(that.allSubData);
                        that.generateSubExcel(modifiedData, that.dates);
                    }
                    return Object.values(aggregatedData);
                }
            },


            groupData: function (data) {
                const groupedData = new Map();

                data.forEach((item) => {
                    const key = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP
                        }|${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.VERSION}|${item.SCENARIO
                        }|${item.MODEL_VERSION}|${item[that.weekType]}`;
                    // const key = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CLASS_NUM}|${item.CHAR_NUM}|${item.CHARVAL_NUM}|${item.VERSION}|${item.SCENARIO}|${item.MODEL_VERSION}|${item.WEEK_DATE}`;

                    if (!groupedData.has(key)) {
                        groupedData.set(key, []);
                    }

                    groupedData.get(key).push(item);
                });

                // Convert Map to an object
                return Object.fromEntries(groupedData);
            },

            processGroupedData: function (groupedData) {
                return Object.values(groupedData)
                    .map((items) => items.filter((item) => item.TYPE < 50))
                    .filter((filteredItems) => filteredItems.length > 0)
                    .map((filteredItems) =>
                        filteredItems.reduce((maxItem, currentItem) =>
                            currentItem.TYPE > maxItem.TYPE ? currentItem : maxItem
                        )
                    );
            },

            convertFieldNames: function (fields) {
                fields.forEach((field, i) => {
                    switch (field) {
                        case "Location":
                            fields[i] = "LOCATION_ID";
                            break;
                        case "Product":
                            fields[i] = "PRODUCT_ID";
                            break;
                        case "Customer Group":
                            fields[i] = "CUSTOMER_GROUP";
                            break;
                        case "Class":
                            fields[i] = "CLASS_NUM";
                            break;
                        case "Characteristic":
                            fields[i] = "CHAR_NUM";
                            break;
                        case "Characteristic Value":
                            fields[i] = "CHARVAL_NUM";
                            break;
                        case "Version":
                            fields[i] = "VERSION";
                            break;
                        case "Scenario":
                            fields[i] = "SCENARIO";
                            break;
                        case "Key Figure":
                            fields[i] = "TYPE";
                        // fields.splice(i, 1);
                        default:
                            break;
                    }
                });
                if (fields.includes(that.weekType)) {
                    return fields;
                } else {
                    fields.push(that.weekType);
                    return fields;
                }
            },




            onClearToolBar: function () {
                // that.generateTree(that.allData);
                if (that.oCharLvlData.length == 0) {
                    that.generatePTree(that.oTalData);
                } else {
                    that.generateTree(that.oTalData);
                }
                that.oGModel.setProperty("/TreeItemSelectForSel", "");
                that.onTreeItemSelect()

            },



            onClearTreeItems: function () {
                var existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                that.oTree.setModel(new JSONModel([]), "treeModel");
                that.byId("idDynamicPage2OPMIXP").setBusy(false);
                sap.ui.core.BusyIndicator.hide();
                return;
            },

            aProcessingTreeData: function (oTree, locArr, proArr, chrArr, chrValArr, item) {
                var sPath = item && item.path
                    ? item.path
                    : oTree.getSelectedContextPaths()[0];

                that.selPath = sPath;

                if (item) {

                    // Handle saved object
                    if (item.path !== undefined) {

                        that.selectedTreeText = item.text || "";
                        that.isTreeNodeExpanded = item.expanded || false;

                        var oSelectedItem = oTree.getItems().find(function (oItem) {
                            var oCtx = oItem.mProperties.title;
                            return oCtx === that.selectedTreeText;
                            // var oCtx = oItem.getBindingContext("treeModel");
                            // return oCtx && oCtx.getPath() === item.path;
                        });

                        if (oSelectedItem) {
                            oTree.setSelectedItem(oSelectedItem, true);
                            if (item.expanded) {
                                if (oSelectedItem.getExpanded() === false) {
                                    oSelectedItem.setExpanded(true);
                                }

                            }
                        }

                    }

                    // Handle actual TreeItem
                    else {

                        that.selectedTreeText =
                            typeof item.getHighlightText === "function"
                                ? item.getHighlightText()
                                : "";

                        that.isTreeNodeExpanded =
                            typeof item.getExpanded === "function"
                                ? item.getExpanded()
                                : false;
                    }
                }


                if (sPath) {
                    var segments = sPath.split("/");
                    var apath = "";

                    // Build filter arrays based on segments
                    if (segments.includes("items")) {
                        apath = `/items/${segments[2]}`;
                        locArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("products")) {
                        apath += `/products/${segments[4]}`;
                        proArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("nodes")) {
                        var node = oTree.getModel("treeModel").getProperty(sPath).name;
                    }
                    if (segments.includes("children")) {
                        apath += `/nodes/${segments[6]}` + `/children/${segments[8]}`;
                        chrArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("charvals")) {
                        apath += `/charvals/${segments[10]}`;
                        chrValArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (that.selectedTreeText === "Dependent" || that.selectedTreeText === "Independent" || that.selectedTreeText === "Multi Select" || that.selectedTreeText === "Numeric") {
                        var sCharItems = oTree.getModel("treeModel").getProperty(sPath).children;
                        if (sCharItems.length > 0) {
                            for (let i = 0; i < sCharItems.length; i++) {
                                chrArr.push(sCharItems[i].name)
                            }

                        }
                    }



                }
            },





            _resetUI: function () {
                that.oTree.setBusy(false);
                that.byId("idDynamicPage2OPMIXP").setBusy(false);
                that.byId("idDynamicPage2OPMIXP").setShowFooter(false);
                that.oTree.setModel(new JSONModel([]), "treeModel");

                var existingDiv = document.querySelector('[id*="mainDivOPMIXP"]');
                if (existingDiv && existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDivOPMIXP"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                that.byId("idDynamicPage").setHeaderExpanded(true);
            },

            onSimulateChanges: async function (flag) {
                let eMessage = "";
                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                // checks changes data matches 100% or not if matched changed data quantites are calculated and applied
                const checkData = await that.checkTotalQty();
                const uniqueArray = removeDuplicates(checkData);
                const manulObj = that.ManualKeyArr[0];
                if (uniqueArray.length <= 0) {
                    if (that.savedData.length > 0) {
                        if (that.commentChanges.length > 0) {
                            that.commentChanges.forEach((c) => {
                                const rowData = that.hot.getSourceDataAtRow(c.row);
                                const colHeader = that.hot.getCellMeta(c.row, c.col).prop;
                                const WEEKDATEObj = totalDates.filter(
                                    (w) => w[that.weekType] === colHeader
                                );
                                let WEEKDATE = WEEKDATEObj[0].WEEK_STARTDATE;
                                const foundObj = that.savedData.find(
                                    (f) =>
                                        f.LOCATION_ID === rowData.LOCATION_ID &&
                                        f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                        f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                                        // f.CLASS_NUM === rowData.CLASS_NUM &&
                                        f.CHAR_NUM === rowData.CHAR_NUM &&
                                        f.CHARVAL_NUM === rowData.CHARVAL_NUM &&
                                        f.VERSION === rowData.VERSION &&
                                        f.SCENARIO === rowData.SCENARIO &&
                                        f.TYPE === rowData.KEY_FIG_ID &&
                                        // f[that.weekType] === colHeader
                                        f.WEEK_STARTDATE === WEEKDATE.toLocaleDateString("en-CA")
                                );
                                if (foundObj) {
                                    foundObj.COMMENTS = c.comment;
                                } else {
                                    let fObj = that.allData.find(
                                        (f) =>
                                            f.LOCATION_ID === rowData.LOCATION_ID &&
                                            f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                            f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                                            // f.CLASS_NUM === rowData.CLASS_NUM &&
                                            f.CHAR_NUM === rowData.CHAR_NUM &&
                                            f.CHARVAL_NUM === rowData.CHARVAL_NUM &&
                                            f.VERSION === rowData.VERSION &&
                                            f.SCENARIO === rowData.SCENARIO &&
                                            f.TYPE === rowData.KEY_FIG_ID &&
                                            f[that.weekType] === colHeader
                                    );
                                    if (fObj) {
                                        let obj = {
                                            LOCATION_ID: fObj.LOCATION_ID,
                                            PRODUCT_ID: fObj.PRODUCT_ID,
                                            CUSTOMER_GROUP: fObj.CUSTOMER_GROUP,
                                            // CLASS_NUM: fObj.CLASS_NUM,
                                            CHAR_NUM: fObj.CHAR_NUM,
                                            CHARVAL_NUM: fObj.CHARVAL_NUM,
                                            VERSION: fObj.VERSION,
                                            SCENARIO: fObj.SCENARIO,
                                            MODEL_VERSION: fObj.MODEL_VERSION,
                                            [that.weekType]: colHeader,
                                            TYPE: fObj.KEY_FIG_ID,
                                            OPT_PERCENT: fObj.OPT_PERCENT,
                                            OPT_QTY: fObj.OPT_QTY,
                                            LOCK: fObj.LOCK,
                                            COMMENTS: c.comment,
                                            WEEK_DATE: that.weekLookupMap.get(colHeader).monday,
                                        };
                                        that.savedData.push(obj);
                                    }
                                }
                            });
                        }
                        that.savedData.forEach((item) => {
                            let weekObj = totalDates.find(
                                (f) =>
                                    that.convertDate(f.WEEK_STARTDATE, "-") == item.WEEK_STARTDATE
                            );
                            let weekDesc = weekObj[that.weekType];
                            let startWeeks = totalDates.filter(
                                (f) => f[that.weekType] == weekDesc
                            );
                            var obj = $.extend(true, {}, item);
                            obj.KEY_FIG_ID = manulObj.KEY_FIG_ID;
                            obj.KEY_FIG_DESC = manulObj.KEY_FIG_DESC;
                            obj.PRIORITY_ORDER = manulObj.PRIORITY_ORDER;
                            obj.DISPLAY_ORDER = manulObj.DISPLAY_ORDER;
                            var foundObj = that.allData.findIndex(
                                (f) =>
                                    f.LOCATION_ID == item.LOCATION_ID &&
                                    f.PRODUCT_ID == item.PRODUCT_ID &&
                                    f.CUSTOMER_GROUP == item.CUSTOMER_GROUP &&
                                    f.CHAR_NUM == item.CHAR_NUM &&
                                    f.CHARVAL_NUM == item.CHARVAL_NUM &&
                                    f[that.weekType] == weekDesc &&
                                    f.TYPE == item.TYPE
                            );
                            if (foundObj == -1) {
                                that.allData.push(obj);
                            } else {
                                if (startWeeks.length <= 1) {
                                    Object.assign(that.allData[foundObj], obj);
                                } else {
                                    let item = that.allData[foundObj];
                                    obj.OPT_QTY += item.OPT_QTY;
                                    Object.assign(that.allData[foundObj], obj);
                                }
                            }
                        });
                        if (flag != 'Save') {
                            that.onTreeItemSelect();
                        }
                        return "Y";
                    } else {
                        if (that.commentChanges.length > 0) {
                            return "Y";
                        } else if (that.deleteChanges.length > 0) {
                            return "Y";
                        } else if (that.subCellChanges.length > 0) {
                            return "Y";
                        } else {
                            MessageToast.show("No changes to Preview");
                            return "N";
                        }
                    }
                } else {
                    eMessage = "Options should match upto 100%" + ":" + uniqueArray;
                    MessageBox.error(eMessage);
                    return "N";
                }

                //Helper Function
                function removeDuplicates(inputArray) {
                    // Create a new Set with the input array to remove duplicates
                    const uniqueArray = [...new Set(inputArray)];
                    return uniqueArray;
                }
            },



            checkTotalQty: function () {
                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                const hotData = that.hot.getSourceData();
                const manualKey = that.ManualKeyArr[0];
                const oData = $.extend(true, [], that.allData);
                // Getting data where changes made in handsontable
                var changesArr = $.extend(true, [], that.cellChanges);
                // if (changesArr.length === 0) {
                //     var oArr = []
                //     oArr.push(that.commentInfo[that.commentInfo.length - 1])
                //     changesArr = oArr
                // }
                const errorDates = [];
                that.savedData = [];
                //Removing duplicates with customer group, characteristic and weekdate so that we get unique data with respect to characteristic and weekdate
                const uChangesArr = that.removeDuplicates(changesArr, [
                    "LOCATION_ID",
                    "PRODUCT_ID",
                    "CUSTOMER_GROUP",
                    "CHAR_NUM",
                    "WEEK_STARTDATE",
                ]);
                //Looping changed characteristic data
                uChangesArr.forEach((c) => {
                    var sum = 0;
                    //Getting characteristic value data for changed characteristic and specific customer group
                    var charValData = that.compareData(c, hotData, "filter", [
                        "LOCATION_ID",
                        "PRODUCT_ID",
                        "CUSTOMER_GROUP",
            /* "CLASS_NUM", */ "CHAR_NUM",
                        "VERSION",
                        "SCENARIO",
                    ]);

                    //Getting Manul and option percentage data from characteristic value data
                    var manualOptData = charValData.filter(
                        (item) =>
                            item.KEY_FIG_DESC == "Option Percentage %" ||
                            item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
                    );
                    for (let index = 0; index < manualOptData.length; index++) {
                        const element = manualOptData[index];
                        let weekObj = totalDates.find(
                            (f) => that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
                        );
                        let weekDesc = weekObj[that.weekType];
                        //Looping manul data to calculate total option percentages
                        if (element.KEY_FIG_DESC == manualKey.KEY_FIG_DESC) {
                            if (element[weekDesc] && element[weekDesc] != NaN) {
                                if (element[weekDesc].toString().startsWith("🔒")) {
                                    let value = element[weekDesc].split("🔒")[1];
                                    sum += parseFloat(value);
                                } else {
                                    sum += parseFloat(element[weekDesc]);
                                }
                            }
                        }
                    }
                    if (Math.round(sum) == 100 || Math.round(sum) == 0) {
                        //If 100% getting manul data where changes are made
                        const mData = manualOptData.filter(
                            (item) => item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
                        );
                        for (let i = 0; i < mData.length; i++) {
                            const m = mData[i];
                            let weekObj = totalDates.find(
                                (f) =>
                                    that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
                            );
                            let weekDesc = weekObj[that.weekType];
                            const obj = {};
                            obj.LOCATION_ID = m.LOCATION_ID;
                            obj.PRODUCT_ID = m.PRODUCT_ID;
                            obj.CUSTOMER_GROUP = m.CUSTOMER_GROUP;
                            obj.CLASS_NUM = "NA";
                            obj.CHAR_NAME = m.CHAR_NAME
                            obj.CHAR_NUM = m.CHAR_NUM;
                            obj.CHARVAL_NUM = m.CHARVAL_NUM;
                            obj.VERSION = m.VERSION;
                            obj.SCENARIO = m.SCENARIO;
                            obj.MODEL_VERSION = m.MODEL_VERSION;
                            obj.TYPE = m.KEY_FIG_ID;
                            obj.OPT_PERCENT = m[weekDesc];
                            obj.COMMENTS = "";
                            obj.OLD_VALUE = "";
                            obj.DATE_TIME = new Date();
                            obj.USER = that.sUser,
                                // obj.USER = "rajeshramagiri@sbpcorp.in",
                                obj[that.weekType] = weekDesc;
                            var foundDemandObj = that.subAllData.find(
                                (f) =>
                                    f.LOCATION_ID == obj.LOCATION_ID &&
                                    f.PRODUCT_ID == obj.PRODUCT_ID &&
                                    f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
                                    f.VERSION == obj.VERSION &&
                                    f.SCENARIO == obj.SCENARIO &&
                                    that.convertDate(weekObj.WEEK_STARTDATE, "-") ==
                                    that.convertDate(f.WEEK_STARTDATE, "-")
                            );
                            //Getting Total Characteristic value data for changed date irrespective of key figure
                            var oldValue = that.compareData(m, that.cellChanges, "find", [
                                "LOCATION_ID",
                                "PRODUCT_ID",
                                "CUSTOMER_GROUP",
                /* "CLASS_NUM", */ "CHAR_NUM",
                                "CHARVAL_NUM",
                                "VERSION",
                                "SCENARIO",
                                "MODEL_VERSION",
                            ]);
                            if (oldValue) {
                                obj.OLD_VALUE = oldValue.OLD_VALUE;
                            } else {
                                obj.OLD_VALUE = "";
                            }
                            var totalCharOptQty = foundDemandObj.OPT_QTY;
                            if (obj.OPT_PERCENT.startsWith("🔒")) {
                                obj.OPT_PERCENT = obj.OPT_PERCENT.split("🔒")[1];
                                obj.LOCK = true;
                            } else {
                                obj.LOCK = false;
                            }
                            obj.OPT_PERCENT = parseFloat(obj.OPT_PERCENT);
                            obj.OPT_QTY = parseFloat(
                                (obj.OPT_PERCENT * totalCharOptQty) / 100
                            );
                            obj.WEEK_STARTDATE = that.convertDate(
                                weekObj.WEEK_STARTDATE,
                                "-"
                            );
                            obj.WEEK_ENDDATE = that.convertDate(weekObj.WEEK_ENDDATE, "-");
                            const isComment = that.lockComments.find(
                                (lock) =>
                                    obj.LOCATION_ID === lock.LOCATION_ID &&
                                    obj.PRODUCT_ID === lock.PRODUCT_ID &&
                                    obj.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
                                    obj.CHAR_NUM === lock.CHAR_NUM &&
                                    obj.CHARVAL_NUM === lock.CHARVAL_NUM &&
                                    obj.VERSION === lock.VERSION &&
                                    obj.SCENARIO === lock.SCENARIO &&
                                    obj.MODEL_VERSION === lock.MODEL_VERSION &&
                                    obj.TYPE === lock.TYPE &&
                                    obj.WEEK_STARTDATE ===
                                    lock.WEEK_DATE.toLocaleDateString("en-CA")
                            );

                            if (isComment) {
                                obj.COMMENTS = isComment.COMMENTS;
                            }

                            that.savedData.push(obj);
                        }
                    } else {
                        // errorDates.push(that.getWeekNumber(c[that.weekType]));
                        errorDates.push(c[that.weekType]);
                    }
                });
                return errorDates;
            },

            getThreshold: function (obj) {
                return new Promise((resolve, reject) => {
                    let oFilters = [
                        new Filter("PRODUCT_ID", FilterOperator.EQ, obj.PRODUCT_ID),
                        new Filter("CHAR_NAME", FilterOperator.EQ, obj.CHAR_NAME),
                    ];
                    that.oModel.read("/getOptPercentThreshold", {
                        filters: oFilters,
                        success: (odata) => {
                            resolve(odata.results || []);
                        },
                        error: (err) => {
                            reject(new Error(err.message));
                        },
                    });
                });
            },


            onSaveExcel: async function () {
                try {
                    const flag = await that.onSimulateChanges('Save');
                    if (flag === "N") return;

                    MessageBox.confirm("Would you like to save data?", {
                        actions: ["OK", MessageBox.Action.CANCEL],
                        emphasizedAction: "OK",
                        onClose: async function (sAction) {
                            if (sAction == "OK") {
                                try {
                                    // Track if any data operation was performed
                                    let dataChanged = false;

                                    // Process deletion changes
                                    if (that.deleteChanges.length > 0) {
                                        let deleteCheck = that.deleteCheckData(that.deleteChanges);
                                        if (deleteCheck.length == 0) {
                                            await that.handleDeleteObjects(that.deleteChanges);
                                            await that.handlePlanOptionPercentages(
                                                that.deleteChanges
                                            );
                                            dataChanged = true;
                                        } else {
                                            let eMessage =
                                                "Options should match upto 100%" + ":" + deleteCheck;
                                            MessageBox.error(eMessage);
                                        }
                                    }

                                    // Process saved data changes
                                    if (that.savedData.length > 0 || that.commentChanges.length > 0) {
                                        await that.onSaveComments();
                                        // await that.handleSaveDataChanges(that.savedData);
                                        await that.handlePlanOptionPercentages(that.savedData);
                                        // that.refreshData();
                                        dataChanged = true;
                                    }

                                    // Process subcell changes
                                    if (that.subCellChanges.length > 0) {
                                        await that.handleProductDemandSave(that.subCellChanges);
                                        await that.handlePlanOptionPercentages(that.subCellChanges);
                                        dataChanged = true;
                                    }

                                    // Process comment changes
                                    // if (
                                    //     that.commentChanges.length > 0 &&
                                    //     that.cellChanges.length === 0
                                    // ) {
                                    //     await that.onSaveComments();
                                    // }

                                    // Refresh the data display only once if needed
                                    if (dataChanged) {
                                        that.refreshData();
                                        that.Flag = "M"
                                        var oNormal_Kfg = [
                                            ...that.oCore
                                                .byId("idNorKeyFigureOPTMIXP")
                                                .getP13nData()
                                                .filter((fig) => fig.visible)
                                            // ...that.oCore
                                            //     .byId("idCalKeyFigureOPMIXP")
                                            //     .getP13nData()
                                            //     .filter((fig) => fig.visible),
                                        ];
                                        that.oGModel.setProperty("/oMnulSv_Kfg", oNormal_Kfg);

                                        var oCal_Kfg = [

                                            ...that.oCore
                                                .byId("idCalKeyFigureOPMIXP")
                                                .getP13nData()
                                                .filter((fig) => fig.visible)
                                        ];
                                        that.oGModel.setProperty("/oCalu_Kfg", oCal_Kfg);
                                    }
                                } catch (error) {
                                    console.error("Error processing changes:", error);
                                    // Implement appropriate error handling (e.g., show user notification)
                                }
                            } else {
                                // that.Flag = ""
                            }
                        },
                    });
                } catch (err) {
                    MessageToast.show("Error saving data");
                    console.error(err);
                }
            },

            onSaveComments: async function () {
                const sData = $.extend(true, [], that.savedData); // Cloning saved data
                const oData = $.extend(true, [], that.allData);

                try {
                    // Process comment changes
                    for (let c of that.commentChanges) {
                        const rowData = that.hot.getSourceDataAtRow(c.row);
                        const colHeader = that.hot.getCellMeta(c.row, c.col).prop;

                        const foundObj = oData.find(
                            (f) =>
                                f.LOCATION_ID === rowData.LOCATION_ID &&
                                f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                                f.CHAR_NUM === rowData.CHAR_NUM &&
                                f.CHARVAL_NUM === rowData.CHARVAL_NUM &&
                                f.VERSION === rowData.VERSION &&
                                f.SCENARIO === rowData.SCENARIO &&
                                f.KEY_FIG_ID === JSON.stringify(rowData.KEY_FIG_ID) && //rowData.KEY_FIG_ID &&
                                f[that.weekType] === colHeader
                        );
                        const WEEKDATEObj = that.oGModel
                            .getProperty("/totalWeekTypes")
                            .filter((w) => w[that.weekType] === colHeader);
                        // const WEEKDATEObj = totalDates.filter(w => w[that.weekType] === colHeader);
                        let WEEKDATE = WEEKDATEObj[0].WEEK_STARTDATE;
                        // const WEEK_DATEObj = that.weekLookupMap.get(colHeader);

                        if (foundObj && WEEKDATE) {
                            const obj = {
                                LOCATION_ID: foundObj.LOCATION_ID,
                                PRODUCT_ID: foundObj.PRODUCT_ID,
                                CUSTOMER_GROUP: foundObj.CUSTOMER_GROUP,
                                CLASS_NUM: "NA",
                                CHAR_NUM: foundObj.CHAR_NUM,
                                CHARVAL_NUM: foundObj.CHARVAL_NUM,
                                VERSION: foundObj.VERSION,
                                SCENARIO: foundObj.SCENARIO,
                                MODEL_VERSION: foundObj.MODEL_VERSION,
                                [that.weekType]: colHeader,
                                WEEK_STARTDATE: WEEKDATE.toLocaleDateString("en-CA"),
                                TYPE: foundObj.KEY_FIG_ID,
                                OPT_PERCENT: foundObj.OPT_PERCENT,
                                OPT_QTY: foundObj.OPT_QTY,
                                LOCK: foundObj.LOCK,
                                COMMENTS: c.comment,
                                OLD_VALUE: foundObj.OPT_PERCENT,
                                DATE_TIME: new Date(),
                                USER: that.sUser,
                            };
                            const cellMeta = { row: c.row, col: c.col };
                            const cellValue = that.hot.getDataAtCell(cellMeta.row, cellMeta.col);
                            if (typeof cellValue === "string" && cellValue.includes("🔒")) {
                                obj.LOCK = true;
                            }
                            else {
                                obj.LOCK = false;
                            }
                            // if (!obj.LOCK) {
                            //     const matchlockComments = that.lockComments.find(
                            //         (item) =>
                            //             item.LOCATION_ID === foundObj.LOCATION_ID &&
                            //             item.PRODUCT_ID === foundObj.PRODUCT_ID &&
                            //             item.CUSTOMER_GROUP === foundObj.CUSTOMER_GROUP &&
                            //             item.CHAR_NUM === foundObj.CHAR_NUM &&
                            //             item.CHARVAL_NUM === foundObj.CHARVAL_NUM &&
                            //             item.VERSION === foundObj.VERSION &&
                            //             item.SCENARIO === foundObj.SCENARIO &&
                            //             item.MODEL_VERSION === foundObj.MODEL_VERSION &&
                            //             item.TYPE === foundObj.TYPE
                            //     );
                            //     if (matchlockComments) obj.LOCK = matchlockComments.LOCK;
                            // }

                            sData.push(obj);
                        }
                    }

                    if (sData.length > 0) {
                        // await this.handleSaveDataChanges(sData);

                        that.oModel.callFunction(
                            "/saveOptionPercentData",
                            {

                                urlParameters: {
                                    optData:
                                        JSON.stringify(sData)
                                },

                                success: function () {
                                    if (that.oCharLvlData.length > 0) {
                                        that.handleSaveDataChanges(sData);
                                    } else {
                                        that.handleSaveDataChangesP(sData);
                                    }

                                    // that.onGo();

                                },

                                error: function () {

                                    MessageToast.show(
                                        "Error while saving Comments data"
                                    );
                                }
                            }
                        );
                        // that.refreshData();
                    }
                } catch (err) {
                    MessageToast.show("Error saving comments");
                    console.error(err);
                }
            },

            handleSaveDataChangesP: async function (sData) {
                try {
                    const compareKeys = [
                        "LOCATION_ID",
                        "PRODUCT_ID",
                        "CUSTOMER_GROUP",
                        "CHAR_NUM",
                        "CHARVAL_NUM",
                        "VERSION",
                        "SCENARIO",
                        "MODEL_VERSION",
                        "TYPE",
                        "OPT_PERCENT",
                        "OPT_QTY",
                        "WEEK_STARTDATE",
                    ];

                    var merged = [];

                    sData.forEach((obj) => {
                        const match = merged.find((item) =>
                            compareKeys.every((key) => item[key] === obj[key])
                        );

                        if (match) {
                            // Merge additional info if available
                            if (obj.COMMENTS && obj.COMMENTS.trim())
                                match.COMMENTS = obj.COMMENTS;
                            if (obj.LOCK) match.LOCK = obj.LOCK;
                        } else {
                            merged.push({ ...obj });
                        }
                    });
                    that.oTree.setBusy(true);
                    that.byId("idDynamicPage2OPMIXP").setBusy(true);

                    var type2Data = merged
                        .filter(item => item.TYPE === 3)
                        .map(item => ({
                            ...item,
                            TYPE: 2,
                            LOCK: false,
                            COMMENTS: ""
                        }));

                    merged.push(...type2Data);
                    // var type2Data = merged
                    //     .filter(item => item.TYPE === 3)
                    //     .map(item => ({
                    //         ...item,
                    //         TYPE: 2
                    //     }));

                    // merged.push(...type2Data);
                    return new Promise((resolve, reject) => {
                        that.oModel.callFunction("/saveOptionPercentData", {
                            urlParameters: { optData: JSON.stringify(merged) },
                            success: resolve,
                            error: (err) => {
                                reject(err);
                                MessageToast.show("Error saving data");
                            },
                        });
                    });
                } catch (err) {
                    that.oTree.setBusy(false);
                    that.byId("idDynamicPage2OPMIXP").setBusy(false);
                    console.error(err);
                    throw err;
                } finally {
                    that.byId("idDynamicPage2OPMIXP").setBusy(false);
                }
            },



            handleSaveDataChanges: async function (sData) {
                try {
                    const compareKeys = [
                        "LOCATION_ID",
                        "PRODUCT_ID",
                        "CUSTOMER_GROUP",
                        "CHAR_NUM",
                        "CHARVAL_NUM",
                        "VERSION",
                        "SCENARIO",
                        "MODEL_VERSION",
                        "TYPE",
                        "OPT_PERCENT",
                        "OPT_QTY",
                        "WEEK_STARTDATE",
                    ];

                    const merged = [];

                    sData.forEach((obj) => {
                        const match = merged.find((item) =>
                            compareKeys.every((key) => item[key] === obj[key])
                        );

                        if (match) {
                            // Merge additional info if available
                            if (obj.COMMENTS && obj.COMMENTS.trim())
                                match.COMMENTS = obj.COMMENTS;
                            if (obj.LOCK) match.LOCK = obj.LOCK;
                        } else {
                            merged.push({ ...obj });
                        }
                    });
                    that.oTree.setBusy(true);
                    that.byId("idDynamicPage2OPMIXP").setBusy(true);
                    // that.getderivedData
                    const aLevel0CharNames = that.getderivedData
                        .filter(item => item.LEVEL === 0)
                        .map(item => item.CHAR_NAME);

                    var aMatchedData = merged.filter(item =>
                        aLevel0CharNames.includes(item.CHAR_NAME)
                    );
                    if (aMatchedData.length > 0) {
                        const omdData = aMatchedData
                            .filter(item => item.TYPE === 3)
                            .map(item => ({
                                ...item,
                                TYPE: 2
                            }));
                        var oResult = [...aMatchedData, ...omdData];
                    } else {
                        var oResult = merged;
                    }


                    // const result = merged;
                    const groups = {};

                    oResult.forEach(item => {

                        const key = [
                            item.LOCATION_ID,
                            item.PRODUCT_ID,
                            item.CUSTOMER_GROUP,
                            item.CHAR_NUM,
                            item.TYPE,
                            item.TELESCOPIC_WEEK
                        ].join("|");

                        if (!groups[key]) {
                            groups[key] = [];
                        }

                        groups[key].push(item);
                    });

                    Object.values(groups).forEach(group => {

                        let total = 0;

                        group.forEach(item => {
                            total += Number(item.OPT_QTY);
                        });

                        let roundedTotal = Math.round(total);

                        let runningTotal = 0;
                        let runningRounded = 0;

                        group.forEach((item, index) => {

                            runningTotal += Number(item.OPT_QTY);

                            if (index === group.length - 1) {

                                item.OPT_QTY = roundedTotal - runningRounded;

                            } else {

                                let rounded = Math.round(runningTotal) - runningRounded;

                                item.OPT_QTY = rounded;

                                runningRounded += rounded;
                            }
                        });

                    });

                    that.oGModel.setProperty("/oManDerdata", oResult);

                    var mUnique = {};

                    oResult.forEach(function (oItem) {
                        var sKey = [
                            oItem.CUSTOMER_GROUP,
                            oItem.CHAR_NAME,
                            oItem.CHARVAL_NUM,
                            oItem.CHAR_NUM
                        ].join("|");

                        if (!mUnique[sKey]) {
                            mUnique[sKey] = {
                                CUSTOMER_GROUP: oItem.CUSTOMER_GROUP,
                                CHAR_NAME: oItem.CHAR_NAME,
                                CHAR_VALUE: oItem.CHARVAL_NUM,
                                OPT_PERCENT: oItem.OPT_PERCENT,
                                CHAR_NUM: oItem.CHAR_NUM
                            };
                        }
                    });

                    // var aValid = Object.values(mUnique);
                    // Get unique weeks
                    var aWeeks = [...new Set(oResult.map(item => item.TELESCOPIC_WEEK))];
                    var aAllDerivedData = [];
                    var completedCalls = 0;

                    aWeeks.forEach(function (sWeek) {

                        // Data only for current week
                        var aWeekData = oResult.filter(item =>
                            item.TELESCOPIC_WEEK === sWeek
                        );

                        // Create aValid for this week
                        var mUnique = {};

                        aWeekData.forEach(function (oItem) {
                            var sKey = [
                                oItem.CUSTOMER_GROUP,
                                oItem.CHAR_NAME,
                                oItem.CHARVAL_NUM,
                                oItem.CHAR_NUM
                            ].join("|");

                            if (!mUnique[sKey]) {
                                mUnique[sKey] = {
                                    CUSTOMER_GROUP: oItem.CUSTOMER_GROUP,
                                    CHAR_NAME: oItem.CHAR_NAME,
                                    CHAR_VALUE: oItem.CHARVAL_NUM,
                                    OPT_PERCENT: oItem.OPT_PERCENT,
                                    CHAR_NUM: oItem.CHAR_NUM
                                };
                            }
                        });

                        var aValid = Object.values(mUnique);

                        that.oModel.callFunction("/simulateDerivedValues", {
                            urlParameters: {
                                LOCATION_ID: aWeekData[0].LOCATION_ID,
                                PRODUCT_ID: aWeekData[0].PRODUCT_ID,
                                VERSION: aWeekData[0].VERSION,
                                SCENARIO: aWeekData[0].SCENARIO,
                                MODEL_VERSION: aWeekData[0].MODEL_VERSION,
                                WEEK: sWeek,
                                Data: JSON.stringify(aValid)
                            },
                            success: function (oData) {
                                console.log("Success for week:", sWeek, oData);
                                sap.ui.core.BusyIndicator.hide();
                                var oProddmnd = that.oGModel.getProperty("/AboveTable");
                                var oCurrent_Week = sWeek //that.oGModel.getProperty("/oCurrentweek");

                                var oDemandData = oProddmnd[0] || {};

                                // Get clicked week value dynamically
                                var nDemandQty = parseFloat(oDemandData[oCurrent_Week]) || 0;

                                var aDerivedData = JSON.parse(oData.simulateDerivedValues);

                                var nTotal = 0;

                                aDerivedData.forEach(function (item) {

                                    item.OPT_QTY = Math.round(item.OPT_QTY);

                                    nTotal += item.OPT_QTY;
                                });

                                var nDiff = nDemandQty - nTotal;

                                // Only correct rounding difference
                                if (Math.abs(nDiff) <= aDerivedData.length) {

                                    var oHighest = aDerivedData.reduce(function (a, b) {
                                        return b.OPT_QTY > a.OPT_QTY ? b : a;
                                    });

                                    oHighest.OPT_QTY += nDiff;
                                }

                                // var nDiff = nDemandQty - nTotal;

                                // if (nDiff !== 0) {

                                //     var oLowest = aDerivedData.reduce(function (a, b) {

                                //         return b.OPT_QTY < a.OPT_QTY
                                //             ? b
                                //             : a;

                                //     });

                                //     oLowest.OPT_QTY += nDiff;
                                // }
                                // Add week information if needed
                                aDerivedData.forEach(function (item) {
                                    item.TELESCOPIC_WEEK = sWeek;
                                });

                                // Store all weeks data
                                aAllDerivedData = aAllDerivedData.concat(aDerivedData);

                                completedCalls++;

                                // All weeks finished
                                if (completedCalls === aWeeks.length) {

                                    console.log("All Weeks Data", aAllDerivedData);

                                    // Continue your processing here
                                    // processDerivedData(aAllDerivedData);
                                    that._processAllWeeks(
                                        aAllDerivedData,
                                        oResult
                                    );
                                }


                            },
                            error: function (err) {
                                console.error("Error for week:", sWeek, err);
                            }
                        });

                    });



                } catch (err) {
                    that.oTree.setBusy(false);
                    that.byId("idDynamicPage2OPMIXP").setBusy(false);
                    console.error(err);
                    throw err;
                } finally {
                    that.byId("idDynamicPage2OPMIXP").setBusy(false);
                }
            },


            _processAllWeeks: function (
                aAllDerivedData,
                aUniqueData
            ) {

                var that = this;

                var aNewDerivedData = [];
                var oUniqueMap = {};

                aAllDerivedData.forEach(function (oItem) {

                    var sKey =
                        oItem.CHAR_NUM + "|" +
                        oItem.CHAR_NAME + "|" +
                        oItem.CHAR_VALUE + "|" +
                        oItem.TELESCOPIC_WEEK;

                    if (oUniqueMap[sKey]) {
                        return;
                    }

                    oUniqueMap[sKey] = true;

                    var oBase = aUniqueData.find(function (x) {

                        return x.TELESCOPIC_WEEK ===
                            oItem.TELESCOPIC_WEEK;

                    });

                    if (!oBase) {
                        return;
                    }

                    aNewDerivedData.push({

                        LOCATION_ID: oBase.LOCATION_ID,
                        PRODUCT_ID: oBase.PRODUCT_ID,
                        CUSTOMER_GROUP: oBase.CUSTOMER_GROUP,

                        CLASS_NUM: "NA",

                        CHAR_NUM: oItem.CHAR_NUM,
                        CHARVAL_NUM: oItem.CHAR_VALUE,

                        VERSION: oBase.VERSION,
                        SCENARIO: oBase.SCENARIO,
                        MODEL_VERSION: oBase.MODEL_VERSION,

                        TYPE: 2,

                        COMMENTS: "",
                        USER: that.sUser,

                        DATE_TIME: oBase.DATE_TIME,

                        TELESCOPIC_WEEK:
                            oItem.TELESCOPIC_WEEK,

                        WEEK_STARTDATE:
                            oBase.WEEK_STARTDATE,

                        WEEK_ENDDATE:
                            oBase.WEEK_ENDDATE,

                        LOCK: false,

                        OLD_VALUE:
                            parseInt(oItem.OLD_QTY),

                        OPT_PERCENT:
                            parseFloat(
                                oItem.DERIVED_PERCENTAGE || 0
                            ),

                        OPT_QTY:
                            parseInt(
                                oItem.OPT_QTY || 0
                            )
                    });
                });

                var aFinalData =
                    aUniqueData.concat(aNewDerivedData);

                aFinalData.forEach(function (item) {
                    delete item.CHAR_NAME;
                    delete item.CHAR_VALUE;
                });

                aFinalData.forEach(item => {
                    if (item.TYPE === 2 || item.TYPE === "2") {
                        item.LOCK = false;
                    }
                });

                console.log(
                    [...new Set(
                        aFinalData.map(
                            x => x.TELESCOPIC_WEEK
                        )
                    )]
                );

                that._saveFinalData(aFinalData);
            },

            _saveFinalData: function (
                aFinalData
            ) {

                var that = this;

                that.oModel.callFunction(
                    "/saveOptionPercentData",
                    {

                        urlParameters: {
                            optData:
                                JSON.stringify(aFinalData)
                        },

                        success: function () {

                            var obj = aFinalData[0];

                            const oDateRange =
                                that.byId(
                                    "idWeekDateOPMIXP"
                                );

                            const values =
                                oDateRange
                                    .getValue()
                                    .split(" - ");

                            const fromDate =
                                that.convertDate(
                                    values[0],
                                    "-"
                                );

                            const toDate =
                                that.convertDate(
                                    values[1],
                                    "-"
                                );

                            that.oModel.callFunction(
                                "/getPlannedOptionPercentage",
                                {

                                    urlParameters: {

                                        LOCATION_ID:
                                            obj.LOCATION_ID,

                                        PRODUCT_ID:
                                            JSON.stringify([
                                                obj.PRODUCT_ID
                                            ]),

                                        FROM_DATE:
                                            fromDate,

                                        TO_DATE:
                                            toDate,

                                        VERSION:
                                            obj.VERSION,

                                        SCENARIO:
                                            obj.SCENARIO,

                                        MODEL_VERSION:
                                            obj.MODEL_VERSION
                                    },

                                    success: function () {

                                        // that.oConfirm = true;

                                        that.onGo();



                                        MessageToast.show(
                                            "Success"
                                        );
                                    },

                                    error: function () {

                                        MessageToast.show(
                                            "Error loading data"
                                        );
                                    }
                                }
                            );
                        },

                        error: function () {

                            MessageToast.show(
                                "Error while saving data"
                            );
                        }
                    }
                );
            },



            // handleDeleteObjects: async function (changes) {
            //     try {
            //         that.oTree.setBusy(true);
            //         that.byId("idDynamicPage2OPMIXP").setBusy(true);
            //         let deleteCheck = that.deleteCheckData(changes);
            //         await new Promise((resolve, reject) => {
            //             that.oModel.callFunction("/deleteOptionPerData", {
            //                 urlParameters: { dData: JSON.stringify(changes) },
            //                 success: resolve,
            //                 error: (err) => reject(err),
            //             });
            //         });
            //     } catch (err) {
            //         that.oTree.setBusy(false);
            //         that.byId("idDynamicPage2OPMIXP").setBusy(false);
            //         console.error(err);
            //         throw err;
            //     }
            // },

            handleDeleteObjects: function (changes) {

                var that = this;

                that.oTree.setBusy(true);
                that.byId("idDynamicPage2OPMIXP").setBusy(true);

                that.oModel.callFunction("/deleteOptionPerData", {

                    urlParameters: {
                        dData: JSON.stringify(changes)
                    },

                    success: function () {

                        // Unique weeks
                        var aWeeks = [];

                        changes.forEach(function (item) {

                            var sKey =
                                item.WEEK_STARTDATE + "|" +
                                item.WEEK_ENDDATE;

                            if (!aWeeks.some(function (w) {
                                return w.key === sKey;
                            })) {

                                aWeeks.push({
                                    key: sKey,
                                    WEEK_STARTDATE: item.WEEK_STARTDATE,
                                    WEEK_ENDDATE: item.WEEK_ENDDATE
                                });
                            }
                        });

                        var completedCalls = 0;

                        aWeeks.forEach(function (oWeek) {

                            that.oModel.callFunction(
                                "/getStaticToDerivedData",
                                {

                                    urlParameters: {
                                        LOCATION_ID: changes[0].LOCATION_ID,
                                        PRODUCT_ID: changes[0].PRODUCT_ID,
                                        FROM_DATE: oWeek.WEEK_STARTDATE,
                                        TO_DATE: oWeek.WEEK_ENDDATE,
                                        VERSION: changes[0].VERSION,
                                        SCENARIO: changes[0].SCENARIO,
                                        MODEL_VERSION: changes[0].MODEL_VERSION
                                    },

                                    success: function () {

                                        completedCalls++;

                                        if (
                                            completedCalls ===
                                            aWeeks.length
                                        ) {

                                            that.onGo();

                                            that.oTree.setBusy(false);
                                            that.byId(
                                                "idDynamicPage2OPMIXP"
                                            ).setBusy(false);

                                            MessageToast.show(
                                                "Deleted Successfully"
                                            );
                                        }
                                    },

                                    error: function () {

                                        completedCalls++;

                                        if (
                                            completedCalls ===
                                            aWeeks.length
                                        ) {

                                            that.oTree.setBusy(false);
                                            that.byId(
                                                "idDynamicPage2OPMIXP"
                                            ).setBusy(false);

                                            MessageToast.show(
                                                "Error loading derived data"
                                            );
                                        }
                                    }
                                }
                            );
                        });

                    },

                    error: function () {

                        that.oTree.setBusy(false);
                        that.byId("idDynamicPage2OPMIXP")
                            .setBusy(false);

                        MessageToast.show(
                            "Error while deleting data"
                        );
                    }
                });
            },

            deleteCheckData: function (changes) {
                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                const hotData = that.hot.getSourceData();
                const manualKey = that.ManualKeyArr[0];
                const oData = $.extend(true, [], that.allData);
                // Getting data where changes made in handsontable
                const errorDates = [];
                //Removing duplicates with customer group, characteristic and weekdate so that we get unique data with respect to characteristic and weekdate
                const uChangesArr = that.removeDuplicates(changes, [
                    "LOCATION_ID",
                    "PRODUCT_ID",
                    "CUSTOMER_GROUP",
                    "CHAR_NUM",
                    "WEEK_STARTDATE",
                    that.weekType,
                ]);
                //Looping changed characteristic data
                uChangesArr.forEach((c) => {
                    var sum = 0;
                    //Getting characteristic value data for changed characteristic and specific customer group
                    var charValData = that.compareData(c, hotData, "filter", [
                        "LOCATION_ID",
                        "PRODUCT_ID",
                        "CUSTOMER_GROUP",
            /* "CLASS_NUM", */ "CHAR_NUM",
                        "VERSION",
                        "SCENARIO",
                    ]);

                    //Getting Manul and option percentage data from characteristic value data
                    var manualOptData = charValData.filter(
                        (item) =>
                            item.KEY_FIG_DESC == "Option Percentage %" ||
                            item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
                    );
                    for (let index = 0; index < manualOptData.length; index++) {
                        const element = manualOptData[index];
                        let weekObj = totalDates.find(
                            (f) => that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
                        );
                        let weekDesc = weekObj[that.weekType];
                        //Looping manul data to calculate total option percentages
                        if (element.KEY_FIG_DESC == manualKey.KEY_FIG_DESC) {
                            if (element[weekDesc] && element[weekDesc] != NaN) {
                                if (element[weekDesc].toString().startsWith("🔒")) {
                                    let value = element[weekDesc].split("🔒")[1];
                                    sum += parseFloat(value);
                                } else {
                                    sum += parseFloat(element[weekDesc]);
                                }
                            }
                        }
                    }
                    if (Math.round(sum) == 100 || Math.round(sum) == 0) {
                        return [];
                    } else {
                        // errorDates.push(that.getWeekNumber(c[that.weekType]));
                        errorDates.push(c.WEEK_STARTDATE);
                    }
                });
                const uniqueArray = removeDuplicates(errorDates);
                return uniqueArray;

                //Helper Function
                function removeDuplicates(inputArray) {
                    // Create a new Set with the input array to remove duplicates
                    const uniqueArray = [...new Set(inputArray)];
                    return uniqueArray;
                }
            },

            handleProductDemandSave: async function (demandChanges) {
                try {
                    that.oTree.setBusy(true);
                    that.byId("idDynamicPage2OPMIXP").setBusy(true);
                    await new Promise((resolve, reject) => {
                        that.oModel.callFunction("/saveProductDemandData", {
                            urlParameters: { demData: JSON.stringify(demandChanges) },
                            success: resolve,
                            error: (err) => {
                                reject(err);
                                MessageToast.show(err.message);
                            },
                        });
                    });
                    that.oGModel.setProperty("/subDataChanges", []);
                    that.oGModel.refresh(true);
                } catch (err) {
                    that.oTree.setBusy(false);
                    that.byId("idDynamicPage2OPMIXP").setBusy(false);
                    throw err;
                }
            },

            handlePlanOptionPercentages: async function (sData) {
                try {
                    let unqData = that.removeDuplicates(sData, ["LOCATION_ID"]);
                    const oDateRange = this.byId("idWeekDateOPMIXP");
                    const values = oDateRange.getValue().split(" - ");

                    if (oDateRange && oDateRange.getValue()) {
                        const fromDate = that.convertDate(values[0], "-");
                        const toDate = that.convertDate(values[1], "-");
                        const products = [...new Set(sData.map((o) => o.PRODUCT_ID))];

                        // Create an array of promises
                        let promises = unqData.map(async (item) => {
                            const obj = {
                                LOCATION_ID: item.LOCATION_ID,
                                PRODUCT_ID: JSON.stringify(products),
                                FROM_DATE: fromDate,
                                TO_DATE: toDate,
                                VERSION: item.VERSION,
                                SCENARIO: item.SCENARIO,
                                MODEL_VERSION: item.MODEL_VERSION,
                            };
                            return that.onPlanOptPercentages(obj);
                        });

                        await Promise.all(promises);
                        console.log("All service calls completed successfully.");
                    }
                } catch (err) {
                    console.error("Error in processing plan option percentages:", err);
                }
            },

            onPlanOptPercentages: function (obj) {
                // return new Promise((resolve, reject) => {
                that.oModel.callFunction("/getPlannedOptionPercentage", {
                    urlParameters: {
                        LOCATION_ID: obj.LOCATION_ID,
                        PRODUCT_ID: obj.PRODUCT_ID,
                        FROM_DATE: obj.FROM_DATE,
                        TO_DATE: obj.TO_DATE,
                        VERSION: obj.VERSION,
                        SCENARIO: obj.SCENARIO,
                        MODEL_VERSION: obj.MODEL_VERSION,
                    },
                    success: function (oData) {
                        var opayload = JSON.parse(obj.PRODUCT_ID);
                        // that.oModel.callFunction("/getStaticToDerivedData", {
                        //     urlParameters: {
                        //         LOCATION_ID: obj.LOCATION_ID,
                        //         PRODUCT_ID: opayload[0],
                        //         FROM_DATE: obj.FROM_DATE,
                        //         TO_DATE: obj.TO_DATE,
                        //         VERSION: obj.VERSION,
                        //         SCENARIO: obj.SCENARIO,
                        //         MODEL_VERSION: obj.MODEL_VERSION,
                        //     },
                        //     success: function (oData) {
                        //         that.onGo();
                        //     },
                        //     error: function (err) {
                        //         sap.ui.core.BusyIndicator.hide();
                        //         MessageToast.show("Error while saving data");
                        //     }
                        // });
                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error while saving data");
                    }
                    // success: resolve,
                    // error: reject,
                });
                // });
            },


            // onPlanOptPercentages: function (obj) {
            //     return new Promise((resolve, reject) => {
            //         that.oModel.callFunction("/getPlannedOptionPercentage", {
            //             urlParameters: {
            //                 LOCATION_ID: obj.LOCATION_ID,
            //                 PRODUCT_ID: obj.PRODUCT_ID,
            //                 FROM_DATE: obj.FROM_DATE,
            //                 TO_DATE: obj.TO_DATE,
            //                 VERSION: obj.VERSION,
            //                 SCENARIO: obj.SCENARIO,
            //                 MODEL_VERSION: obj.MODEL_VERSION,
            //             },
            //             success: resolve,
            //             error: reject,
            //         });
            //     });
            // },

            getSumOptQty: function (data) {
                let sum = 0;
                for (let index = 0; index < data.length; index++) {
                    const element = data[index];
                    sum += parseFloat(element.OPT_QTY);
                }
                return sum;
            },

            refreshData: function () {
                that.saveTreeState();
                that.onGo("refreshData");
            },

            handleFullScreen: function () {
                var page = that.getView().byId("idMasterPage");
                var fBtn = that.getView().byId("idFullScreenOPMIXP");
                if (page.getSize() == "25%") {
                    page.setSize("0%");
                    fBtn.setIcon("sap-icon://exit-full-screen");
                } else {
                    page.setSize("25%");
                    fBtn.setIcon("sap-icon://full-screen");
                }
            },

            // onRefreshExcel: function () {
            //     if (that.cellChanges.length > 0) {
            //         that.cellChanges.forEach((item) => {
            //             let ind = that.allData.findIndex(
            //                 (f) =>
            //                     f.LOCATION_ID == item.LOCATION_ID &&
            //                     f.PRODUCT_ID == item.PRODUCT_ID &&
            //                     f.CUSTOMER_GROUP == item.CUSTOMER_GROUP &&
            //                     // f.CLASS_NUM == item.CLASS_NUM &&
            //                     f.CHAR_NUM == item.CHAR_NUM &&
            //                     f.CHARVAL_NUM == item.CHARVAL_NUM &&
            //                     f.MODEL_VERSION == item.MODEL_VERSION &&
            //                     f.VERSION == item.VERSION &&
            //                     f.SCENARIO == item.SCENARIO &&
            //                     f[that.weekType] == item[that.weekType] &&
            //                     f.KEY_FIG_ID == that.ManualKeyArr[0].KEY_FIG_ID
            //             );
            //             if (ind != -1) {
            //                 that.allData.splice(ind, 1);
            //             }
            //         });
            //         that.cellChanges = [];
            //         that.commentChanges = [];
            //     }
            //     that.saveTreeState();
            //     //  that.onGo();
            // },

            onRefreshExcel: async function () {
                const oView = this.getView();

                try {
                    // SHOW BUSY
                    oView.setBusy(true);
                    sap.ui.core.BusyIndicator.show();


                    if (that.cellChanges.length > 0) {
                        that.cellChanges.forEach((item) => {
                            let ind = that.allData.findIndex(
                                (f) =>
                                    f.LOCATION_ID == item.LOCATION_ID &&
                                    f.PRODUCT_ID == item.PRODUCT_ID &&
                                    f.CUSTOMER_GROUP == item.CUSTOMER_GROUP &&
                                    f.CHAR_NUM == item.CHAR_NUM &&
                                    f.CHARVAL_NUM == item.CHARVAL_NUM &&
                                    f.MODEL_VERSION == item.MODEL_VERSION &&
                                    f.VERSION == item.VERSION &&
                                    f.SCENARIO == item.SCENARIO &&
                                    f[that.weekType] == item[that.weekType] &&
                                    f.KEY_FIG_ID == that.ManualKeyArr[0].KEY_FIG_ID
                            );

                            if (ind !== -1) {
                                that.allData.splice(ind, 1);
                            }
                        });

                        that.cellChanges = [];
                        that.commentChanges = [];
                    }

                    // WAIT for saveTreeState
                    await that.saveTreeState();
                    that.onTreeItemSelect()

                } catch (e) {
                    console.error("Refresh Excel failed", e);
                } finally {
                    // HIDE BUSY (always)
                    sap.ui.core.BusyIndicator.hide();
                    oView.setBusy(false);
                }
            },


            saveTreeState() {
                const allExpandNode = [],
                    items = that.oTree.getItems();
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.getExpanded()) {
                        allExpandNode.push(item.getHighlightText());
                    }
                }
                that.allExpandNode = allExpandNode;
            },

            onColSettings: function () {
                that.oSettingDialog.open();
            },



            convertDate: function (inputFormat, joinBy) {
                function pad(s) {
                    return s < 10 ? "0" + s : s;
                }

                var d = new Date(inputFormat);

                // Get local time zone offset in minutes
                var timezoneOffset = d.getTimezoneOffset();

                // Adjust for the timezone offset
                d.setMinutes(d.getMinutes() - timezoneOffset);

                // Convert to UTC
                var utcYear = d.getUTCFullYear();
                var utcMonth = d.getUTCMonth() + 1; // Months are zero-based, so add 1
                var utcDate = d.getUTCDate();

                return [utcYear, pad(utcMonth), pad(utcDate)].join(joinBy);
            },

            onDateRangeChange: function (oStartDate, oEndDate) {
                var aAllDates = [];

                // Ensure start and end dates are in UTC
                var oCurrentDate = new Date(
                    Date.UTC(
                        oStartDate.getFullYear(),
                        oStartDate.getMonth(),
                        oStartDate.getDate()
                    )
                );
                var oEndDateUTC = new Date(
                    Date.UTC(
                        oEndDate.getFullYear(),
                        oEndDate.getMonth(),
                        oEndDate.getDate()
                    )
                );

                while (oCurrentDate <= oEndDateUTC) {
                    if (oCurrentDate.getUTCDay() === 1) {
                        // Check if it's Monday (UTC)
                        aAllDates.push(that.convertDate(new Date(oCurrentDate), "-")); // Add date to the array
                    }
                    oCurrentDate.setUTCDate(oCurrentDate.getUTCDate() + 1); // Move to the next day
                }

                return aAllDates;
            },

            removeDuplicates: function (array, keys) {
                const filtered = array.filter(
                    (
                        (s) => (o) =>
                            ((k) => !s.has(k) && s.add(k))(keys.map((k) => o[k]).join("|"))
                    )(new Set())
                );
                return filtered;
            },

            removeDuplicate: function (array, key) {
                var check = new Set();
                return array.filter(
                    (obj) => !check.has(obj[key]) && check.add(obj[key])
                );
            },

            getMondays: function () {
                var startDate = new Date(); // Current date in local time
                var endDate = new Date();
                endDate.setUTCMonth(endDate.getUTCMonth() + 2); // Set end date to 2 months ahead in UTC

                // Convert start date to UTC with time set to midnight
                var currentDate = new Date(
                    Date.UTC(
                        startDate.getUTCFullYear(),
                        startDate.getUTCMonth(),
                        startDate.getUTCDate()
                    )
                );
                var mondays = [];

                while (currentDate <= endDate) {
                    if (currentDate.getUTCDay() === 1) {
                        // Check if it's Monday (UTC)
                        var formattedDate = this.convertDate(
                            currentDate.toISOString().split("T")[0],
                            "-"
                        );
                        mondays.push(formattedDate);
                    }
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Move to the next day in UTC
                }

                return mondays;
            },

            dynamicSortMultiple: function () {
                let props = arguments;
                const that = this;
                return function (obj1, obj2) {
                    var i = 0,
                        result = 0,
                        numberOfProperties = props.length;
                    while (result === 0 && i < numberOfProperties) {
                        result = that.dynamicSort(props[i])(obj1, obj2);
                        i++;
                    }
                    return result;
                };
            },

            dynamicSort: function (property) {
                var sortOrder = 1;
                if (property[0] === "-") {
                    sortOrder = -1;
                    property = property.substr(1);
                }
                return function (a, b) {
                    var result =
                        a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
                    return result * sortOrder;
                };
            },

            getCalenderWeek: function () {
                that
                    .getOwnerComponent()
                    .getModel("oModel")
                    .read("/getIBPCalenderWeek", {
                        success: function (oData) {
                            that.oGModel.setProperty("/IBPWeekNumbers", oData.results);
                        },
                        error: function (oData, error) {
                            MessageToast.show("error");
                        },
                    });
            },

            getWeekNumber: function (dCurrDate) {
                var dReqDate = new Date(dCurrDate);
                var aCalenderWeek = that.oGModel.getProperty("/IBPWeekNumbers");
                for (var i = 0; i < aCalenderWeek.length; i++) {
                    if (
                        dReqDate >= aCalenderWeek[i].WEEK_STARTDATE &&
                        dReqDate <= aCalenderWeek[i].WEEK_ENDDATE
                    ) {
                        return aCalenderWeek[i].PERIODDESC;
                        break;
                    }
                }
            },

            getUserDetails: function () {
                // let vUser = 'Test'
                let vUser;
                if (sap.ushell) {
                    if (sap.ushell.Container) {
                        let email = sap.ushell.Container.getService("UserInfo")
                            .getUser()
                            .getEmail();
                        vUser = email ? email : "";
                    }
                }

                return vUser;
            },

            compareData: function (obj, array, method, fields) {
                function compareObjects(obj1, obj2) {
                    return fields.every((field) => obj1[field] === obj2[field]);
                }
                if (method === "find") {
                    return array.find((item) => compareObjects(obj, item));
                } else if (method === "filter") {
                    return array.filter((item) => compareObjects(obj, item));
                } else if (method === "findIndex") {
                    return array.findIndex((item) => compareObjects(obj, item));
                } else {
                    throw new Error("Invalid method. Please use 'find' or 'filter'.");
                }
            },

            getMondaysBetween(startDateStr, endDateStr) {
                let startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);

                // Ensure startDate is before endDate
                if (startDate > endDate) {
                    [startDate, endDate] = [endDate, startDate];
                }

                // Loop from start to end, checking for Mondays
                while (startDate <= endDate) {
                    if (startDate.getDay() === 1) {
                        return startDate.toLocaleDateString("en-CA");
                    }
                    startDate.setDate(startDate.getDate() + 1);
                }

                return undefined;
            },

            findLevelByPath(path) {
                // Split the path into components
                const components = path
                    .split("/")
                    .filter((component) => component !== "");

                // Check the path for components in priority order
                if (components.includes("charvals")) {
                    return 3;
                } else if (components.includes("chars")) {
                    return 2;
                } else if (components.includes("products")) {
                    return 1;
                } else {
                    return 0; // Default case if none match
                }
            },

            /**
             * Configuration object - Override this in your extending controller
             */
            getVariantConfig: function () {
                return {
                    // Model configuration
                    modelName: "oModel",
                    globalModelName: "oGModel",

                    // Service endpoints
                    endpoints: {
                        getVariantHeader: "/getVariantHeader",
                        getVariant: "/getVariant",
                        createVariant: "/createVariant",
                        updateVariant: "/updateVariant",
                    },

                    // UI Control IDs
                    controlIds: {
                        smartFilterBar: "smartFilterBar",
                        variantManagement: "idMatList123OPR",
                    },

                    // Field mappings - Map your filter fields to variant fields
                    fieldMappings: [
                        {
                            filterField: "LOCATION_ID",
                            variantField: "Demand Location",
                            modelProperty: "/defaultLocation",
                        },
                        // {
                        //     filterField: "PRODUCT_ID",
                        //     variantField: "Partial Product",
                        //     modelProperty: "/defaultProduct",
                        // },
                        {
                            filterField: "CUSTOMER_GROUP",
                            variantField: "Customer Group",
                            modelProperty: "/defaultCustomer",
                        },
                        {
                            filterField: "CHAR_NUM",
                            variantField: "Characteristic Description",
                            modelProperty: "/defaultCharNum",
                        },
                        {
                            filterField: "CHARVAL_NUM",
                            variantField: "Characteristic Value Description",
                            modelProperty: "/defaultCharValNum",
                        },
                    ],

                    // Range fields (single value fields like dropdowns)
                    rangeFields: [
                        {
                            filterField: "MODEL_VERSION",
                            variantField: "Model Version",
                            modelProperty: "/defaultModel",
                            defaultValue: "Active",
                        },
                        {
                            filterField: "PRODUCT_ID",
                            variantField: "Products",
                            modelProperty: "/defaultProduct",
                            defaultValue: " ",
                        },
                        { filterField: "VERSION_NAME", defaultValue: "Base Version", variantField: "Version Name", },
                        { filterField: "SCENARIO_NAME", defaultValue: "_PLAN", variantField: "Scenario Name", },
                    ],

                    // Standard variant configuration
                    standardVariant: {
                        name: "Standard",
                        id: "0",
                        user: "SAP",
                        REMOVE: false,
                        CHANGE: false,
                    },
                };
            },

            /**
             * Initialize variant management
             */
            initVariantManagement: function () {
                this.config = this.getVariantConfig();
                this.appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                this.variantModel = new sap.ui.model.json.JSONModel();
                this.viewDetails = new sap.ui.model.json.JSONModel();

                // Initialize default values
                this._initializeDefaultValues();

                sap.ui.core.BusyIndicator.show(0);
                // Load variants
                this._totalWeekPromise = new Promise((resolve, reject) => {
                    // that.aModel.read("/getFinalOptionPercentages", {
                    that.oModel.read("/getWeeks", {
                        // urlParameters: {
                        //     $apply:
                        //         "groupby((CALENDAR_WEEK,TELESCOPIC_WEEK,PERIODSTART,PERIODEND,WEEK_STARTDATE,WEEK_ENDDATE))",
                        //     $orderby:
                        //         "PERIODSTART asc,WEEK_STARTDATE asc,CALENDAR_WEEK asc,TELESCOPIC_WEEK asc",
                        // },
                        success: function (oData) {
                            const data = oData.results;
                            that.oGModel.setProperty("/totalWeekTypes", data);
                            const weekLookupMap = new Map();
                            const dateToWeekMap = new Map();
                            that.telWeek = [];
                            that.telMonth = [];
                            that.telQ = [];

                            for (let i = 0; i < data.length; i++) {
                                const item = data[i];
                                if (!item.TELESCOPIC_WEEK && !item.CALENDAR_WEEK) continue;

                                const monday = that.getMondaysBetween(item.WEEK_STARTDATE, item.WEEK_ENDDATE);
                                item.monday = monday;

                                if (
                                    !that.telWeek.includes(item.TELESCOPIC_WEEK) &&
                                    !that.telMonth.includes(item.TELESCOPIC_WEEK) &&
                                    !that.telQ.includes(item.TELESCOPIC_WEEK)
                                ) {
                                    const found = data.filter(o => o.TELESCOPIC_WEEK === item.TELESCOPIC_WEEK);
                                    const len = found.length;
                                    if (len === 1) that.telWeek.push(item.TELESCOPIC_WEEK);
                                    else if (len > 2 && len <= 6) that.telMonth.push(item.TELESCOPIC_WEEK);
                                    else if (len > 6) that.telQ.push(item.TELESCOPIC_WEEK);
                                }

                                weekLookupMap.set(item.TELESCOPIC_WEEK, item);
                                weekLookupMap.set(item.CALENDAR_WEEK, item);
                                dateToWeekMap.set(monday, item);
                            }

                            that.weekLookupMap = weekLookupMap;
                            that.dateToWeekMap = dateToWeekMap;

                            sap.ui.core.BusyIndicator.hide();
                            that._isTotalWeekLoaded = true;
                            console.log("off")
                            that.getVariantData();
                            resolve(data); //  resolve promise
                        },
                        error: function (err) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show(err.message);
                            that.getVariantData();
                            reject(err); //  reject promise
                        },
                    });
                });

            },

            /**
             * Initialize default model properties
             */
            _initializeDefaultValues: function () {
                this.config.fieldMappings.forEach((field) => {
                    this.oGModel.setProperty(field.modelProperty, []);
                });

                this.config.rangeFields.forEach((field) => {
                    if (field.modelProperty) {
                        this.oGModel.setProperty(
                            field.modelProperty,
                            field.defaultValue || ""
                        );
                    }
                });
            },

            /**
             * Get current user
             */
            getCurrentUser: function () {
                // Override this method in your controller if needed
                let vUser;
                if (sap.ushell.Container) {
                    let email = sap.ushell.Container.getService("UserInfo")
                        .getUser()
                        .getEmail();
                    vUser = email ? email : "";
                }
                return vUser;

            },

            onNavPress: function () {
                if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
                    var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                    // generate the Hash to display 
                    var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "VCPDocument",
                            action: "Display"
                        }
                    })) || "";
                    var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
                    oStorage.put("nodeId", 87);
                    //Generate a  URL for the second application
                    var url = window.location.href.split('#')[0] + hash;
                    //Navigate to second app
                    sap.m.URLHelper.redirect(url, true);
                }
            },


            /*Getting variant view data*/
            getVariantData: function () {
                var ndData = [];
                var dData = [],
                    uniqueName = [];
                that.uniqueName = [];
                sap.ui.core.BusyIndicator.show();
                var variantUser = this.getUserDetails()?.toLowerCase();
                var appName =
                    this.getOwnerComponent().getManifestEntry("/sap.app/id");
                that.oGModel.setProperty("/UserId", variantUser);
                // Define the filters
                // var oFilterAppName1 = new sap.ui.model.Filter(
                //     "APPLICATION_NAME",
                //     sap.ui.model.FilterOperator.EQ,
                //     appName
                // );
                // var oFilterUser = new sap.ui.model.Filter(
                //     "USER",
                //     sap.ui.model.FilterOperator.EQ,
                //     variantUser
                // );

                // var oFilterAppName2 = new sap.ui.model.Filter(
                //     "APPLICATION_NAME",
                //     sap.ui.model.FilterOperator.EQ,
                //     appName
                // );
                // var oFilterScope = new sap.ui.model.Filter(
                //     "SCOPE",
                //     sap.ui.model.FilterOperator.EQ,
                //     "Public"
                // );

                //   var oFilterAppName3 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, 'DefaultSingle');
                //   var oFilterUser1 = new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, variantUser);

                // var oFilterCondition1 = new sap.ui.model.Filter({
                //     filters: [oFilterAppName1, oFilterUser],
                //     and: true // Combine with AND
                // });

                // var oFilterCondition2 = new sap.ui.model.Filter({
                //     filters: [oFilterAppName2, oFilterScope],
                //     and: true // Combine with AND
                // });
                //   var oFilterCondition3 = new sap.ui.model.Filter({
                //     filters: [oFilterAppName3, oFilterUser1],
                //     and: true // Combine with AND
                //   });

                // var oFinalFilter = new sap.ui.model.Filter({
                //     filters: [oFilterCondition1, oFilterCondition2],
                //     and: false // Combine with OR
                // });

                this.getView()
                    .getModel("oModel")
                    .read("/getVariantHeader", {
                        // filters: [oFinalFilter],
                        headers: {
                            "x-user-id": variantUser,
                            "x-app-name": appName
                        },

                        success: function (oData) {
                            that.oGModel.setProperty("/headerDetails", oData.results);
                            if (oData.results.length === 0) {
                                that.oGModel.setProperty("/variantDetails", "");
                                that.oGModel.setProperty("/fromFunction", "X");
                                uniqueName.unshift({
                                    VARIANTNAME: "Standard",
                                    VARIANTID: "0",
                                    DEFAULT: "Y",
                                    REMOVE: false,
                                    CHANGE: false,
                                    USER: "SAP",
                                    SCOPE: "Public",
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);
                                that.oGModel.setProperty("/defaultDetails", "");
                                uniqueName = that.normalizeVariantItems(uniqueName);
                                that.viewDetails.setData({
                                    items12: uniqueName,
                                });
                                that.varianNames = uniqueName;
                                that.byId("idMatList123OPR").setModel(that.viewDetails);
                                that.UniqueDefKey = uniqueName[0].VARIANTID;
                                that
                                    .byId("idMatList123OPR")
                                    .setDefaultKey(uniqueName[0].VARIANTID);
                                that
                                    .byId("idMatList123OPR")
                                    .setSelectedKey(uniqueName[0].VARIANTID);
                                var Default = "Standard";
                                if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                    var newVariant = that.oGModel.getProperty("/newVariant");
                                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                                    that.oGModel.setProperty("/newVaraintFlag", "");
                                } else {
                                    that.handleSelectPress(Default);
                                }
                            } else {
                                for (var i = 0; i < oData.results.length; i++) {
                                    if (
                                        oData.results[i].DEFAULT === "Y" &&
                                        oData.results[i].USER === variantUser
                                    ) {
                                        dData.push(oData.results[i]);
                                        that.UniqueDefKey = oData.results[i].VARIANTID;
                                        that
                                            .byId("idMatList123OPR")
                                            .setDefaultKey(oData.results[i].VARIANTID);
                                        that
                                            .byId("idMatList123OPR")
                                            .setSelectedKey(oData.results[i].VARIANTID);
                                    }
                                    if (oData.results[i].USER !== variantUser) {
                                        oData.results[i].CHANGE = false;
                                        oData.results[i].REMOVE = false;
                                        oData.results[i].ENABLE = false;
                                    }
                                    ndData.push(oData.results[i]);
                                }

                                if (dData.length > 0) {
                                    that.oGModel.setProperty("/defaultVariant", dData);
                                }
                                that.oGModel.setProperty("/VariantData", ndData);

                                that.getTotalVariantDetails();
                            }
                        },
                        error: function (oData, error) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("error while loading variant details");
                        },
                    });
            },

            normalizeVariantItems: function (aVariants) {
                return aVariants.map(function (v) {
                    return {
                        ...v,

                        key: String(v.VARIANTID),
                        title: v.VARIANTNAME,
                        author: v.USER || "SAP",
                        visible: true,
                        sharing: v.SCOPE === "Public"
                            ? sap.m.SharingMode.Public
                            : sap.m.SharingMode.Private,
                        remove: !!v.REMOVE,
                        changeable: !!v.CHANGE,
                        enabled: v.ENABLE !== false
                    };
                });
            },

            getTotalVariantDetails: function () {
                var aData = [],
                    uniqueName = [],
                    details = {},
                    defaultDetails = [],
                    oFilters = [];
                var headerData = that.oGModel.getProperty("/VariantData");
                if (headerData.length > 0) {
                    for (var i = 0; i < headerData.length; i++) {
                        oFilters.push(
                            new Filter(
                                "VARIANTID",
                                FilterOperator.EQ,
                                headerData[i].VARIANTID
                            )
                        );
                    }
                }
                var userVariant = that.oGModel.getProperty("/UserId");
                this.getOwnerComponent()
                    .getModel("oModel")
                    .read("/getVariant", {
                        filters: [oFilters],
                        success: function (oData) {
                            that.oGModel.setProperty("/fieldDetails", oData.results);
                            var variantNewData = oData.results;
                            aData = variantNewData.map((item1) => {
                                const item2 = headerData.find(
                                    (item2) => item2.VARIANTID === item1.VARIANTID
                                );
                                return item2
                                    ? {
                                        ...item1,
                                        ...item2,
                                    }
                                    : {
                                        ...item1,
                                    };
                            });
                            that.oGModel.setProperty("/variantDetails", aData);
                            if (aData.length > 0) {
                                aData = aData.filter(id => id.VARIANTNAME !== "defaultSingle" && id.APPLICATION_NAME !== "DefaultSingle");
                                uniqueName = that.removeDuplicate(aData, "VARIANTNAME");
                                that.oGModel.setProperty("/saveBtn", "");
                                for (var k = 0; k < uniqueName.length; k++) {
                                    if (
                                        uniqueName[k].DEFAULT === "Y" &&
                                        uniqueName[k].USER === userVariant
                                    ) {
                                        var Default = uniqueName[k].VARIANTNAME;
                                        details = {
                                            VARIANTNAME: uniqueName[k].VARIANTNAME,
                                            VARIANTID: uniqueName[k].VARIANTID,
                                            USER: uniqueName[k].USER,
                                            DEFAULT: "N"
                                            // DEFAULT:  uniqueName[k].DEFAULT,
                                        };
                                        defaultDetails.push(details);
                                        details = {};
                                    }
                                }
                            }

                            that.oGModel.setProperty("/fromFunction", "X");
                            if (Default) {
                                uniqueName.unshift({
                                    VARIANTNAME: "Standard",
                                    VARIANTID: "0",
                                    DEFAULT: "N",
                                    REMOVE: false,
                                    CHANGE: false,
                                    USER: "SAP",
                                    SCOPE: "Public",
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);
                                uniqueName = that.normalizeVariantItems(uniqueName);
                                that.variantModel.setData({
                                    items12: uniqueName,
                                });
                                that.varianNames = uniqueName;
                                that.oGModel.setProperty("/defaultDetails", defaultDetails);
                                that.byId("idMatList123OPR").setModel(that.variantModel);
                                if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                    var newVariant = that.oGModel.getProperty("/newVariant");
                                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                                    if (newVariant[0].DEFAULT === "Y") {
                                        that.UniqueDefKey = newVariant[0].VARIANTID;
                                        that
                                            .byId("idMatList123OPR")
                                            .setDefaultKey(newVariant[0].VARIANTID);
                                    }
                                    that
                                        .byId("idMatList123OPR")
                                        .setSelectedKey(newVariant[0].VARIANTID);
                                    that.oGModel.setProperty("/newVaraintFlag", "");
                                } else {
                                    that.handleSelectPress(Default);
                                }
                            } else {
                                uniqueName.unshift({
                                    VARIANTNAME: "Standard",
                                    VARIANTID: "0",
                                    DEFAULT: "Y",
                                    REMOVE: false,
                                    CHANGE: false,
                                    USER: "SAP",
                                    SCOPE: "Public",
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);

                                that.oGModel.setProperty("/defaultDetails", "");
                                uniqueName = that.normalizeVariantItems(uniqueName);
                                that.viewDetails.setData({
                                    items12: uniqueName,
                                });
                                that.varianNames = uniqueName;
                                that.byId("idMatList123OPR").setModel(that.viewDetails);
                                var Default = "Standard";
                                if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                    var newVariant = that.oGModel.getProperty("/newVariant");
                                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                                    if (newVariant[0].DEFAULT === "Y") {
                                        that.UniqueDefKey = newVariant[0].VARIANTID;
                                        that
                                            .byId("idMatList123OPR")
                                            .setDefaultKey(newVariant[0].VARIANTID);
                                    }
                                    that
                                        .byId("idMatList123OPR")
                                        .setSelectedKey(newVariant[0].VARIANTID);
                                    that.oGModel.setProperty("/newVaraintFlag", "");
                                } else {
                                    that.UniqueDefKey = uniqueName[0].VARIANTID;
                                    that
                                        .byId("idMatList123OPR")
                                        .setDefaultKey(uniqueName[0].VARIANTID);
                                    that
                                        .byId("idMatList123OPR")
                                        .setSelectedKey(uniqueName[0].VARIANTID);
                                    that.handleSelectPress(Default);
                                }
                            }
                        },
                        error: function (oData, error) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("error while loading variant details");
                        },
                    });
            },
            /**
             * On selection of VIEW in POPOVER fragment.
             * @param {*} oEvent
             */
            handleSelectPress: function (oEvent) {
                that.refProdArr = []
                var oTokens = {};
                that.finaloTokens = [];
                var oTableItems = that.oGModel.getProperty("/variantDetails");
                that.byId("idLocOPMIXP").removeAllTokens();
                that.byId("idProdOPMIXP").setValue();
                that.byId("idCustOPMIXP").removeAllTokens();
                that.byId("idCharOPMIXP").removeAllTokens();
                that.byId("idCharValuOPMIXP").removeAllTokens();
                that.byId("idVersionOPMIXP").setValue();
                that.byId("idScenarioOPMIXP").setValue();
                that.byId("idModelVerOPMIXP").setSelectedKey("Active");
                sap.ui.getCore().byId("idlocDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idprodDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idcharValDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idCusDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idsceDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idverDialogOPMIXP").clearSelection();
                sap.ui.getCore().byId("idlocDialogOPMIXP").clearSelection();
                if (that.oGModel.getProperty("/fromFunction") === "X") {
                    that.oGModel.setProperty("/fromFunction", "");
                    if (typeof oEvent == "string") {
                        that.selectedApp = oEvent;
                    } else {
                        that.selectedApp = oEvent.getSource().getTitle().getText();
                    }
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                } else {
                    that.selectedApp = oEvent.getSource().getTitle().getText();
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                }
                that.byId("idMatList123OPR").setModified(false)
                var appName =
                    this.getOwnerComponent().getManifestEntry("/sap.app/id");
                //   const verSce = that.oGModel.getProperty("/oVerscena");
                if (that.selectedApp !== "Standard") {
                    var filteredData = oTableItems.filter(
                        (a) =>
                            a.VARIANTNAME === that.selectedApp &&
                            a.APPLICATION_NAME === appName
                    );
                    var demLocData,
                        prodData,
                        versData,
                        scenData,
                        modverData,
                        aCharData,
                        aCharValData, aCustData;
                    demLocData = filteredData.filter((a) =>
                        a.FIELD === "Demand Location"
                    );
                    prodData = filteredData.filter((a) => a.FIELD === ("Products"));
                    versData = filteredData.filter((a) =>
                        a.FIELD === "Version"
                    );
                    scenData = filteredData.filter((a) =>
                        a.FIELD === ("Scenario")
                    );
                    modverData = filteredData.filter((a) =>
                        a.FIELD === ("Model Version")
                    );
                    aCharValData = filteredData.filter((a) => a.FIELD === ("Characteristic Value"));
                    aCharData = filteredData.filter((a) =>
                        a.FIELD === ("Characteristic")
                    );
                    aCustData = filteredData.filter((a) => a.FIELD === ("Customer Group"));

                    if (demLocData.length > 0) {
                        for (var i = 0; i < demLocData.length; i++) {
                            var oDemandLocTemplate = new sap.m.Token({
                                key: demLocData[i].FIELD_CENTER,
                                text: demLocData[i].VALUE,
                                editable: false,
                            });
                            that.byId("idLocOPMIXP").addToken(oDemandLocTemplate);
                            oDemandLocTemplate = {};
                            oTokens = {
                                FIELD: demLocData[i].FIELD,
                                VALUE: demLocData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }

                    if (prodData.length > 0) {
                        for (var i = 0; i < prodData.length; i++) {
                            that.byId("idProdOPMIXP").setValue(prodData[i].VALUE);
                            oTokens = {
                                FIELD: prodData[i].FIELD,
                                VALUE: prodData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }

                    if (aCharValData.length > 0) {
                        for (var i = 0; i < aCharValData.length; i++) {
                            var oUnqiueTemplate = new sap.m.Token({
                                key: aCharValData[i].FIELD_CENTER,
                                text: aCharValData[i].VALUE,
                                editable: false
                            });
                            that.byId("idCharValuOPMIXP").addToken(oUnqiueTemplate);
                            oUnqiueTemplate = {};
                            oTokens = {
                                FIELD: aCharValData[i].FIELD,
                                VALUE: aCharValData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    if (aCharData.length > 0) {
                        for (var i = 0; i < aCharData.length; i++) {
                            var oCharTemplate = new sap.m.Token({
                                key: aCharData[i].FIELD_CENTER,
                                text: aCharData[i].VALUE,
                                editable: false
                            });
                            that.byId("idCharOPMIXP").addToken(oCharTemplate);
                            oCharTemplate = {};
                            oTokens = {
                                FIELD: aCharData[i].FIELD,
                                VALUE: aCharData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    if (aCustData.length > 0) {
                        for (var i = 0; i < aCustData.length; i++) {
                            var oCustTemplate = new sap.m.Token({
                                key: aCustData[i].FIELD_CENTER,
                                text: aCustData[i].VALUE,
                                editable: false
                            });
                            that.byId("idCustOPMIXP").addToken(oCustTemplate);
                            oCustTemplate = {};
                            oTokens = {
                                FIELD: aCustData[i].FIELD,
                                VALUE: aCustData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }

                    if (versData.length > 0) {
                        for (var i = 0; i < versData.length; i++) {
                            that.byId("idVersionOPMIXP").setValue(versData[i].VALUE);
                            oTokens = {
                                FIELD: versData[i].FIELD,
                                VALUE: versData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    else {
                        that.byId("idVersionOPMIXP").setValue("Base Version");
                    }
                    if (scenData.length > 0) {
                        for (var i = 0; i < scenData.length; i++) {
                            that.byId("idScenarioOPMIXP").setValue(scenData[i].VALUE);
                            oTokens = {
                                FIELD: scenData[i].FIELD,
                                VALUE: scenData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    else {
                        that.byId("idScenarioOPMIXP").setValue("_PLAN");
                    }
                    if (modverData.length > 0) {
                        that.byId("idModelVerOPMIXP").setSelectedKey(modverData[0].VALUE);
                        oTokens = {
                            FIELD: modverData[0].FIELD,
                            VALUE: modverData[0].VALUE,
                        };
                        that.finaloTokens.push(oTokens);
                        oTokens = {};
                    }

                    sap.ui.core.BusyIndicator.hide();
                } else {
                    //do nothing
                    that.onClear();
                    that.byId("idVersionOPMIXP").setValue("Base Version");
                    that.byId("idScenarioOPMIXP").setValue("_PLAN");
                    sap.ui.core.BusyIndicator.hide();
                }

            },

            /**
                 * Saving the VIEW on press of save in NameVariant fragment
                 * @param {*} oEvent
                 */
            onCreate: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var array = [];
                var details = {};
                var sDemLocation = that.byId("idLocOPMIXP").getTokens();
                var Field1 = "Demand Location";
                var sProduct = that.byId("idProdOPMIXP").getValue();
                var Field2 = "Products";
                var sVersion = that.byId("idVersionOPMIXP").getValue();
                var Field3 = "Version";
                var sScen = that.byId("idScenarioOPMIXP").getValue();
                var Field4 = "Scenario";
                var sModVers = that.byId("idModelVerOPMIXP").getSelectedKey();
                var Field5 = "Model Version";
                var sChars = that.byId("idCharOPMIXP").getTokens();
                var Field6 = "Characteristic";
                var sCharValue = that.byId("idCharValuOPMIXP").getTokens();
                var Field7 = "Characteristic Value";
                var sCustGrp = that.byId("idCustOPMIXP").getTokens();
                var Field8 = "Customer Group";
                var varName = oEvent.getParameters().name;
                var sDefault = oEvent.getParameters().def;
                var appName =
                    this.getOwnerComponent().getManifestEntry("/sap.app/id");
                if (
                    sDemLocation.length === 0 &&
                    sProduct.length === 0
                ) {
                    sap.ui.core.BusyIndicator.hide();
                    return MessageToast.show(
                        "No values selected in required filters"
                    );
                }

                if (varName) {
                    if (
                        sDefault &&
                        that.oGModel.getProperty("/defaultDetails").length > 0
                    ) {
                        var defaultChecked = "Y";
                        this.getOwnerComponent()
                            .getModel("oModel")
                            .callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(
                                        that.oGModel.getProperty("/defaultDetails")
                                    ),
                                },
                                success: function (oData) { },
                                error: function (error) {
                                    MessageToast.show("Failed to create variant");
                                },
                            });
                    } else if (
                        sDefault &&
                        that.oGModel.getProperty("/defaultDetails").length === 0
                    ) {
                        var defaultChecked = "Y";
                    } else {
                        var defaultChecked = "N";
                    }
                    if (oEvent.getParameters()?.public) {
                        var Scope = "Public";
                    } else {
                        var Scope = "Private";
                    }
                    for (var k = 0; k < sDemLocation.length; k++) {
                        details = {
                            Field: Field1,
                            FieldCenter: sDemLocation[k].getKey(),
                            Value: sDemLocation[k].getText(),
                            Default: defaultChecked,
                        };
                        array.push(details);
                    }

                    details = {
                        Field: Field2,
                        FieldCenter: (1).toString(),
                        Value: sProduct,
                        Default: defaultChecked,
                    };
                    array.push(details);

                    details = {
                        Field: Field3,
                        FieldCenter: (1).toString(),
                        Value: sVersion,
                        Default: defaultChecked,
                    };
                    array.push(details);

                    details = {
                        Field: Field4,
                        FieldCenter: (1).toString(),
                        Value: sScen,
                        Default: defaultChecked,
                    };
                    array.push(details);


                    for (var k = 0; k < sChars.length; k++) {
                        details = {
                            Field: Field6,
                            FieldCenter: sChars[k].getKey(),
                            Value: sChars[k].getKey(),
                            Default: defaultChecked,
                        };
                        array.push(details);
                    }
                    for (var k = 0; k < sCharValue.length; k++) {
                        details = {
                            Field: Field7,
                            FieldCenter: sCharValue[k].getKey(),
                            Value: sCharValue[k].getKey(),
                            Default: defaultChecked,
                        };
                        array.push(details);
                    }
                    for (var k = 0; k < sCustGrp.length; k++) {
                        details = {
                            Field: Field8,
                            FieldCenter: sCustGrp[k].getKey(),
                            Value: sCustGrp[k].getKey(),
                            Default: defaultChecked,
                        };
                        array.push(details);
                    }

                    details = {
                        Field: Field5,
                        FieldCenter: (1).toString(),
                        Value: sModVers,
                        Default: defaultChecked,
                    };
                    array.push(details);
                    if (!oEvent.getParameters().overwrite) {
                        for (var j = 0; j < array.length; j++) {
                            array[j].IDNAME = varName;
                            array[j].App_Name = appName;
                            array[j].SCOPE = Scope;
                        }
                        var flag = "X";
                    } else {
                        var flag = "E";
                        for (var j = 0; j < array.length; j++) {
                            array[j].ID = oEvent.getParameters().key;
                            array[j].IDNAME = varName;
                            array[j].App_Name = appName;
                            array[j].SCOPE = Scope;
                        }
                    }
                    //    console.log(JSON.stringify(array));
                    this.getOwnerComponent()
                        .getModel("oModel")
                        .callFunction("/createVariant", {
                            method: "GET",
                            urlParameters: {
                                Flag: flag,
                                USER: that.oGModel.getProperty("/UserId"),
                                VARDATA: JSON.stringify(array),
                            },
                            success: function (oData) {
                                that.oGModel.setProperty("/newVariant", oData.results);
                                that.oGModel.setProperty("/newVaraintFlag", "X");
                                that.byId("idMatList123OPR").setModified(false);
                                that.onAfterRendering();
                            },
                            error: function (error) {
                                sap.ui.core.BusyIndicator.hide();
                                MessageToast.show("Failed to create variant");
                            },
                        });
                } else {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Please fill View Name");
                }
            },
            /**On press of save in manage fragment */
            onManage: async function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var oDelted = {},
                    deletedArray = [],
                    count = 0;
                var totalVariantData = that.oGModel.getProperty("/VariantData");
                var selected = oEvent.getParameters();
                var variantUser = this.getUserDetails()?.toLowerCase();
                if (selected.def) {
                    totalVariantData.filter((item1) => {
                        if (
                            JSON.parse(selected.def) === item1.VARIANTID &&
                            item1.USER !== variantUser
                        ) {
                            count++;
                        }
                    });
                }
                if (count > 0) {
                    sap.ui.core.BusyIndicator.hide();
                    that.viewDetails.setData({
                        items12: that.varianNames,
                    });
                    that.byId("idMatList123OPR").setModel(that.viewDetails);
                    that.byId("idMatList123OPR").setDefaultKey(that.UniqueDefKey);
                    return MessageToast.show(
                        "Variant doesn't belong to logged in user. Cannot make changes to this Variant"
                    );
                }
                //Delete the selected variant names
                if (selected.deleted) {
                    selected.deleted.forEach((item1) => {
                        totalVariantData.forEach((item2) => {
                            if (JSON.parse(item1) === item2.VARIANTID) {
                                oDelted = {
                                    ID: item2.VARIANTID,
                                    NAME: item2.VARIANTNAME,
                                };
                                deletedArray.push(oDelted);
                            }
                        });
                    });
                    if (deletedArray.length > 0) {
                        await that.deleteVariant(deletedArray);
                    }
                }
                //Updating the default variants
                if (selected.def) {
                    //If selected default is not standard
                    if (JSON.parse(selected.def) !== 0) {
                        //Update the existing default to a new default
                        var defaultVariant = totalVariantData.filter(
                            (item) => item.DEFAULT === "Y"
                        );
                        if (defaultVariant.length > 0) {
                            defaultVariant[0].DEFAULT = "N";
                            that
                                .getView()
                                .getModel("oModel")
                                .callFunction("/updateVariant", {
                                    method: "GET",
                                    urlParameters: {
                                        VARDATA: JSON.stringify(defaultVariant),
                                    },
                                    success: function (oData) {
                                        var newDefault = totalVariantData.filter(
                                            (item) => item.VARIANTID === JSON.parse(selected.def)
                                        );
                                        newDefault[0].DEFAULT = "Y";
                                        that
                                            .getView()
                                            .getModel("oModel")
                                            .callFunction("/updateVariant", {
                                                method: "GET",
                                                urlParameters: {
                                                    VARDATA: JSON.stringify(newDefault),
                                                },
                                                success: function (oData) {
                                                    that.onAfterRendering();
                                                },
                                                error: function (error) {
                                                    MessageToast.show("Failed to update variant");
                                                },
                                            });
                                    },
                                    error: function (error) {
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageToast.show("Failed to update variant");
                                    },
                                });
                        } else {
                            var selectedVariant = totalVariantData.filter(
                                (item) => item.VARIANTID === JSON.parse(selected.def)
                            );
                            selectedVariant[0].DEFAULT = "Y";
                            that
                                .getView()
                                .getModel("oModel")
                                .callFunction("/updateVariant", {
                                    method: "GET",
                                    urlParameters: {
                                        VARDATA: JSON.stringify(selectedVariant),
                                    },
                                    success: function (oData) {
                                        that.onAfterRendering();
                                    },
                                    error: function (error) {
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageToast.show("Failed to update variant");
                                    },
                                });
                        }
                    }
                    //If selected default is standard then remove the existing default variant
                    else {
                        var defaultItem = totalVariantData.filter(
                            (item) => item.DEFAULT === "Y"
                        );
                        defaultItem[0].DEFAULT = "N";
                        that
                            .getView()
                            .getModel("oModel")
                            .callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(defaultItem),
                                },
                                success: function (oData) {
                                    that.onAfterRendering();
                                },
                                error: function (error) {
                                    sap.ui.core.BusyIndicator.hide();
                                    MessageToast.show("Failed to update variant");
                                },
                            });
                    }
                }
                else if (selected.deleted) {
                    that.onAfterRendering();
                }
                sap.ui.core.BusyIndicator.hide();
            },

            deleteVariant: function (deletedArray) {
                that
                    .getView()
                    .getModel("oModel")
                    .callFunction("/createVariant", {
                        method: "GET",
                        urlParameters: {
                            Flag: "D",
                            USER: that.oGModel.getProperty("/UserId"),
                            VARDATA: JSON.stringify(deletedArray),
                        },
                        success: function () {
                            that.deletedArray = [];
                        },
                        error: function () {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("Failed to delete variant");
                        },
                    });
            },

            removeDuplicate: function (array, key) {
                //Function to remove duplicates in an array
                var check = new Set();
                return array.filter(
                    (obj) => !check.has(obj[key]) && check.add(obj[key])
                );
            },


        });
    }
);
