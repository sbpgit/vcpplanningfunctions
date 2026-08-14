sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "./BaseController",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/ui/export/library",
        "sap/ui/export/Spreadsheet"
    ],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        Controller,
        BaseController,
        JSONModel,
        Filter,
        FilterOperator,
        MessageToast,
        MessageBox,
        exportLibrary,
        Spreadsheet
    ) {
        "use strict";
        var EdmType = exportLibrary.EdmType;
        var oGModel, that;
        return BaseController.extend("vcpapp.vcpforecastingordersbeta.controller.View1", {
            onInit: function () {
                that = this;
                var oRouter;
                MessageToast.show("Unique Characteristics Details");

                oGModel = that.getOwnerComponent().getModel("oGModel");

                that.allCharsModel = new JSONModel();
                that.allCharsModel.setSizeLimit(5000);

                that.locProdCharModel = new JSONModel();
                that.locProdCharModel.setSizeLimit(5000);

                that.weeklyCIRModel = new JSONModel();
                that.weeklyCIRModel.setSizeLimit(5000);

                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");

                oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.getRoute("View1").attachMatched(this._onRouteMatched, this);
            },
            /**
             * 
             * @param {*} oEvent 
             */
            onAfterRendering: function (oEvent) {
                var oSelectEQ = that.byId("idUniqueCharDetailsEQ");
                var oPickerEQ = oSelectEQ.syncPickerContent();
                if (oPickerEQ) {
                    oPickerEQ.attachBeforeOpen(function () {
                        oPickerEQ.addStyleClass("multiComboInpt");
                    });
                }

                var oSelectNEQ = that.byId("idUniqueCharDetailsNEQ");
                var oPickerNEQ = oSelectNEQ.syncPickerContent();
                if (oPickerNEQ) {
                    oPickerNEQ.attachBeforeOpen(function () {
                        oPickerNEQ.addStyleClass("multiComboInpt");
                    });
                }
                // Set Visible Row Count
                that.handleVisibleRowCountU(0);
            },

            /**
            * This function is to get all the close unique ids for the selected unique id
            */
            getUniqueCharacteristics: function (oEvent) {
                var location = oGModel.getProperty("/SelDemandLocation"),
                    UniqueID = oGModel.getProperty("/SelectedUniqueId"),
                    products = oGModel.getProperty("/SelectedProd"),
                    uCharArr = [],
                    count = 0;
                // sap.ui.core.BusyIndicator.show();
                this.getView().byId("_IDGenUPage1").setBusy(true);
                oGModel = that.getOwnerComponent().getModel('oGModel');
                products.forEach(p => {
                    that.getModel("oModel").callFunction("/getUniqueChars", {
                        method: "GET",
                        urlParameters: {
                            UNIQUE_ID: UniqueID,
                            PRODUCT_ID: p,
                            LOCATION_ID: location
                        },
                        success: function (oData) {
                            that.getView().byId("_IDGenUPage1").setBusy(false);
                            count++;
                            uCharArr = uCharArr.concat(oData.results)
                            if (count === products.length) {
                                // sap.ui.core.BusyIndicator.hide();
                                that.generateCloseUIDsTable(uCharArr);
                            }

                        },
                        error: function (data) {
                            // sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show("Error While fetching data");
                        },
                    });
                });
            },
            /**
             * 
             */
            generateCloseUIDsTable: function (aUniqueChars) {
                oGModel = that.getOwnerComponent().getModel('oGModel');
                var aDates = oGModel.getProperty("/TDates");
                var sDateInd = aDates.findIndex(f => f == that.SEL_DATE);
                sDateInd++;
                var aUniqueIdsChars = aUniqueChars;
                var oColumn = {},
                    oRowData = {},
                    aColumns = [],
                    aRowData = [];
                var aConfig = [];
                var aFilteredUniqueChars = [];
                var iCounter = 0, iTotal = 0, iCIRQty = 0;
                var columnName;
                var bVisible = true;
                var sCellIcon = "";
                var sCellIconPath;
                var sColumnName,
                    sColDesc,
                    sCharValPath,
                    sCharValDescPath;
                var sWidth = "auto";
                var aCIRData = oGModel.getProperty("/CIRQtys");
                var aFilCIRData = [];
                var dSelDate = that.SEL_DATE;

                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");

                if (aUniqueIdsChars.length > 0) {
                    // Looping through the data to generate columns
                    for (var i = 0; i < aUniqueIdsChars.length; i++) {
                        oColumn = {};

                        if (i === 0) {
                            aConfig = aUniqueIdsChars[i].CONFIG;
                            oColumn.UNIQUE_CHAR = 'Characteristic';
                            oColumn.TOTAL = aUniqueIdsChars[i].TOTAL;
                            oColumn.CIRQTY = '';
                            aColumns.push(oColumn);
                            oColumn = {};
                        }

                        // Get Weekly Quantity


                        const ObindingData = oGModel.getProperty("/ObindingData");

                        const
                            {
                                sSelDmndLoc,
                                sSelProdId,
                                iSelUniqueId, ver, scenario
                            }
                                = ObindingData;


                        const sCompKey = `${sSelDmndLoc}|${sSelProdId}|${ver}|${scenario}`;
                        const sTargetId = aUniqueIdsChars[i].UNIQUE_ID.toString();
                        const aDateKeys = Object.keys(aCIRData);
                        const sDateKey = aDateKeys[sDateInd - 1];

                        const oHit = aCIRData?.[sDateKey]?.[sCompKey]?.data?.[sTargetId];
                        oColumn.CIRQTY = oHit ? oHit.forecast : 0;

                        // Columns (UNIQUE_IDs)
                        oColumn.UNIQUE_CHAR = aUniqueIdsChars[i].UNIQUE_ID;
                        oColumn.UNIQUE_DESC = aUniqueIdsChars[i].UNIQUE_DESC;
                        oColumn.TOTAL = aUniqueIdsChars[i].TOTAL;
                        aColumns.push(oColumn);
                    }
                    for (var j = 0; j < aConfig.length; j++) { // Base Configurations
                        oRowData = {};
                        oRowData['Characteristic'] = [{ CHAR_NAME: aConfig[j].CHAR_NAME, CHAR_DESC: aConfig[j].CHAR_DESC }];

                        for (var k = 1; k < aColumns.length; k++) {

                            aFilteredUniqueChars = [];
                            aFilteredUniqueChars = aUniqueIdsChars.filter(function (aUniqChar) {
                                return aUniqChar.UNIQUE_ID === aColumns[k].UNIQUE_CHAR;
                            });
                            aFilteredUniqueChars = aFilteredUniqueChars[0].CONFIG;

                            for (var l = 0; l < aFilteredUniqueChars.length; l++) {
                                sCellIcon = "";
                                if (aConfig[j].CHAR_NAME === aFilteredUniqueChars[l].CHAR_NAME &&
                                    aConfig[j].CHAR_DESC === aFilteredUniqueChars[l].CHAR_DESC &&
                                    aConfig[j].CHAR_NUM === aFilteredUniqueChars[l].CHAR_NUM
                                ) {
                                    if (aConfig[j].CHARVAL_NUM !== aFilteredUniqueChars[l].CHARVAL_NUM) {
                                        sCellIcon = "sap-icon://sys-cancel-2";
                                    }
                                    oRowData[aColumns[k].UNIQUE_CHAR] = [{ CHAR_VALUE: aFilteredUniqueChars[l].CHAR_VALUE, CHARVAL_DESC: aFilteredUniqueChars[l].CHARVAL_DESC, CHAR_NUM: aFilteredUniqueChars[l].CHAR_NUM, CHARVAL_NUM: aFilteredUniqueChars[l].CHARVAL_NUM, CELL_COLOR: sCellIcon }];

                                    //   oRowData[aColumns[k].UNIQUE_CHAR] = [aConfig[j].CHAR_VALUE, aConfig[j].CHARVAL_DESC];    
                                    break;
                                }
                            }
                        }
                        aRowData.push(oRowData);
                        oRowData = {};
                    }

                    // Adding rows and columns data to JSON Model
                    var selectId = oGModel.getProperty("/SelectedUniqueId"),
                        characteristicColumn = aColumns[0],
                        selectColumn = aColumns.find(obj => obj.UNIQUE_CHAR == selectId);
                    aColumns = aColumns.filter(c => {
                        if (c.UNIQUE_CHAR == "Characteristic" || c.UNIQUE_CHAR == selectId)
                            return false
                        else
                            return true
                    })
                    var newaColumn = [characteristicColumn, selectColumn, ...aColumns.sort((a, b) => b.TOTAL - a.TOTAL)];
                    var oModel = new sap.ui.model.json.JSONModel();
                    oModel.setData({
                        rows: aRowData,
                        columns: newaColumn,
                    });
                    that.wholeDAta = oModel.getData();
                    that.oUniqueCharTable.setModel(oModel);
                    // Checking column names and applying sap.m.Link to column values
                    that.oUniqueCharTable.bindColumns("/columns", function (sId, oContext) {
                        iTotal = 0;
                        iCounter = iCounter + 1;
                        columnName = oContext.getObject().UNIQUE_CHAR;

                        iTotal = oContext.getObject().TOTAL;
                        iCIRQty = oContext.getObject().CIRQTY;
                        // sColumnName = columnName.toString() + " (" + iTotal + ")";
                        sColumnName = columnName.toString();
                        sColDesc = oContext.getObject().UNIQUE_CHAR + " (" + iTotal + ")" + " - (" + iCIRQty + ")";

                        if (columnName === 'Characteristic') {
                            sCharValPath = columnName + "/0/CHAR_NAME";
                            sCharValDescPath = columnName + "/0/CHAR_DESC";
                            return new sap.ui.table.Column({
                                width: "10rem",
                                label: sColumnName,
                                // filterProperty: columnName,
                                template: new sap.m.ObjectIdentifier({
                                    title: "{" + sCharValDescPath + "}",
                                    text: "{" + sCharValPath + "}"
                                })
                            });

                        } else {
                            if (iCounter > 7) {
                                bVisible = false;
                            }

                            if (iCounter === 2) {
                                sWidth = "14rem";
                            } else {
                                sWidth = "auto";
                            }

                            sCharValPath = columnName + "/0/CHAR_VALUE";
                            sCharValDescPath = columnName + "/0/CHARVAL_DESC";
                            sCellIconPath = columnName + "/0/CELL_COLOR";

                            return new sap.ui.table.Column({
                                width: sWidth,
                                name: sColumnName,
                                label: sColDesc,
                                visible: bVisible,
                                template: new sap.m.HBox({
                                    alignItems: "Center",
                                    justifyContent: "SpaceBetween",
                                    items: [
                                        new sap.m.ObjectIdentifier({
                                            title: "{" + sCharValDescPath + "}",
                                            text: "{" + sCharValPath + "}"
                                        }),
                                        new sap.ui.core.Icon({ src: "{" + sCellIconPath + "}", color: "Critical" })

                                    ]
                                })


                            });
                        }
                    });

                    that.oUniqueCharTable.bindRows("/rows");

                }

            },

            /**
             * This function is called to filter Unique characteristics which are not equal to selected characteristics in filters
             */
            getUniqueIdsNESelChars: function (aSelectedItems) {
                var aUniqueChars = [];
                var aFilterUniqueIds = [];
                // var aSelectedItems = [];
                var sCharVal_Num = '';
                var sCharNum = '';
                var sUniqueId = '';
                var iCount = 0;
                var aUniqueIdFilter = [];
                var aFilter = [];
                var aColumns = [];
                var sFilterType = '';
                var scolumnName = '';
                var iCounter = 0;
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();

                aUniqueChars = that.allCharsModel.getData().charDetails;
                var aFilteredUniqueChars = aUniqueChars;
                for (var i = 0; i < aSelectedItems.length; i++) {
                    sCharNum = aSelectedItems[i].getKey().split(':')[0];
                    sCharVal_Num = aSelectedItems[i].getKey().split(':')[1];

                    if (aUniqueIdFilter.length > 0) {
                        const ids = aUniqueIdFilter.map(o => o.UNIQUE_ID)
                        // aFilteredUniqueChars = aUniqueChars.filter(({ UNIQUE_ID }, index) => !ids.includes(UNIQUE_ID,index + 1));
                        aFilteredUniqueChars = aUniqueChars.filter((i) => ids.indexOf(i.UNIQUE_ID) !== -1);
                    }
                    aUniqueIdFilter = [];
                    for (var j = 0; j < aFilteredUniqueChars.length; j++) {

                        if (aFilteredUniqueChars[j].CHAR_NUM === sCharNum &&
                            aFilteredUniqueChars[j].CHARVAL_NUM !== sCharVal_Num) {

                            sUniqueId = aFilteredUniqueChars[j].UNIQUE_ID;
                            if (aUniqueIdFilter.includes(sUniqueId) === false) {
                                aUniqueIdFilter.push({ UNIQUE_ID: sUniqueId });
                            }
                        }
                    }

                }
                if (aUniqueIdFilter.length > 0) {
                    return aUniqueIdFilter;
                    // for (var k = 2; k < aColumns.length; k++) {
                    //     scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                    //     aFilterUniqueIds = aUniqueIdFilter.filter(function (aUniqChar) {
                    //         return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                    //     });
                    //     if (aFilterUniqueIds.length > 0) {
                    //         iCounter = iCounter + 1;
                    //         if (iCounter >= 5) {
                    //             aColumns[k].setVisible(false);
                    //         } else {
                    //             aColumns[k].setVisible(true)
                    //         }
                    //     } else {
                    //         aColumns[k].setVisible(false);
                    //     }

                    // }

                }

            },
            /**
              * This function is called to filter Unique characteristics which are equal to selected characteristics in filters
              */
            getUniqueIdsEQSelChars: function (aSelectedItems) {
                var aUniqueChars = [];
                var aFilterUniqueIds = [];
                // var aSelectedItems = [];
                var sCharVal_Num = '';
                var sCharNum = '';
                var sUniqueId = '';
                var iCount = 0;
                var aUniqueIdFilter = [];
                var aFilter = [];
                var aColumns = [];
                var sFilterType = '';
                var iCounter = 0;
                var scolumnName = '';
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();

                aUniqueChars = that.allCharsModel.getData().charDetails;
                var aFilteredUniqueChars = aUniqueChars;
                for (var i = 0; i < aSelectedItems.length; i++) {
                    sCharNum = aSelectedItems[i].getKey().split(':')[0];
                    sCharVal_Num = aSelectedItems[i].getKey().split(':')[1];

                    if (aUniqueIdFilter.length > 0) {
                        const ids = aUniqueIdFilter.map(o => o.UNIQUE_ID)
                        // aFilteredUniqueChars = aUniqueChars.filter(({ UNIQUE_ID }, index) => !ids.includes(UNIQUE_ID,index + 1));
                        aFilteredUniqueChars = aUniqueChars.filter((i) => ids.indexOf(i.UNIQUE_ID) !== -1);
                    }
                    aUniqueIdFilter = [];
                    for (var j = 0; j < aFilteredUniqueChars.length; j++) {

                        if (aFilteredUniqueChars[j].CHAR_NUM === sCharNum &&
                            aFilteredUniqueChars[j].CHARVAL_NUM === sCharVal_Num) {

                            sUniqueId = aFilteredUniqueChars[j].UNIQUE_ID;
                            if (aUniqueIdFilter.includes(sUniqueId) === false) {
                                aUniqueIdFilter.push({ UNIQUE_ID: sUniqueId });
                            }
                        }
                    }

                }
                if (aUniqueIdFilter.length > 0) {
                    return aUniqueIdFilter;
                    // for (var k = 2; k < aColumns.length; k++) {
                    //     scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                    //     aFilterUniqueIds = aUniqueIdFilter.filter(function (aUniqChar) {
                    //         return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                    //     });
                    //     if (aFilterUniqueIds.length > 0) {
                    //         iCounter = iCounter + 1;
                    //         if (iCounter >= 5) {
                    //             aColumns[k].setVisible(false);
                    //         } else {
                    //             aColumns[k].setVisible(true)
                    //         }
                    //     } else {
                    //         aColumns[k].setVisible(false);
                    //     }

                    // }

                }

            },

            /**
             * 
             */
            onUniqueIdsFilter: function () {
                // var oSource = oEvent.getSource();
                var aColumns = that.oUniqueCharTable.getColumns();
                var aIndices = that.oUniqueCharTable.getBinding().aIndices;
                var aList = that.oUniqueCharTable.getBinding().oList;
                var aFilteredList = [];
                var sColLabel = " ";
                var iTotalQty = 0;
                var sColumnName = "";
                aFilteredList = aList.filter((el, i) => aIndices.some(j => i === j));
                for (var i = 2; i < aColumns.length; i++) {
                    sColLabel = aColumns[i].getLabel().getText().split(" ");
                    iTotalQty = 0;
                    for (var j = 0; j < aFilteredList.length; j++) {
                        iTotalQty = iTotalQty + aFilteredList[j][sColLabel[0]];
                    }
                    sColumnName = sColLabel[0] + " (" + iTotalQty + ")";
                    aColumns[i].setLabel(sColumnName);
                }
            },
            /**
             * This function is called on selection of radio buttons for characteristics filter
             */
            onSelectRBCharFilter: function (oEvent) {
                var aFilter = [];
                var sSelText = oEvent.getSource().getSelectedButton().getText();
                var oTable = that.byId("idUniqueIdChars");
                var aColumns = oTable.getColumns();
                var iColLength = aColumns.length;
                var aFilterUniqueIds = [];
                var sColLabel = '';
                var sPath = "";
                let { rows, columns } = that.wholeDAta;

                const newarUID = columns.map(o => o.UNIQUE_CHAR).slice(2, 7).map(u => String(u));// 4 Id


                let updateRows = [];
                switch (sSelText) {
                    case 'All':
                        // oTable.getBinding("rows").filter(aFilter);
                        oTable.getModel().setData(that.wholeDAta)
                        break;
                    case 'Matched':

                        rows.forEach(row => {
                            const r = {};
                            Object.keys(row).forEach(key => {
                                if (key === 'Characteristic' || key === that.UniqueId) {
                                    r[key] = row[key];
                                }
                                if (row[key][0].CELL_COLOR !== "sap-icon://sys-cancel-2") {
                                    r[key] = row[key];
                                }
                            })
                            if (Object.keys(r).some(k => newarUID.includes(k)))
                                updateRows.push(r);
                        })

                        oTable.getModel().setData({ rows: updateRows, columns: columns })
                        // aFilterUniqueIds = [];

                        // for (var i = 2; i < aColumns.length; i++) {
                        //     sPath = aColumns[i].getName() + "/0/CELL_COLOR";
                        //     aFilterUniqueIds.push(
                        //         new Filter(sPath,
                        //             FilterOperator.NE,
                        //             "sap-icon://sys-cancel-2")
                        //     );
                        // }

                        // aFilter = new Filter(aFilterUniqueIds, true); // AND
                        // oTable.getBinding("rows").filter(aFilter);
                        break;

                    case 'UnMatched':
                        rows.forEach(row => {
                            const r = {};
                            Object.keys(row).forEach(key => {
                                if (key === 'Characteristic' || key === that.UniqueId) {
                                    r[key] = row[key];
                                }
                                if (row[key][0].CELL_COLOR === "sap-icon://sys-cancel-2") {
                                    r[key] = row[key];
                                }
                            })
                            if (Object.keys(r).some(k => newarUID.includes(k)))
                                updateRows.push(r);
                        })

                        oTable.getModel().setData({ rows: updateRows, columns: columns })
                        // aFilterUniqueIds = [];

                        // for (var i = 2; i < aColumns.length; i++) {
                        //     sPath = aColumns[i].getName() + "/0/CELL_COLOR";
                        //     aFilterUniqueIds.push(
                        //         new Filter(sPath,
                        //             FilterOperator.EQ,
                        //             "sap-icon://sys-cancel-2")
                        //     );
                        // }

                        // aFilter = new Filter(aFilterUniqueIds, false); // OR
                        // oTable.getBinding("rows").filter(aFilter);
                        break;
                    default:
                        oTable.getBinding().filter(aFilter);
                        break;

                }

            },
            /**
             * This function is triggered on selection change event for fiter type (Equal)
             * @param {*} oEvent 
             */
            onCharEQSelectionChange: function (oEvent) {
                var aSelectedItemsEQ = [];
                var oMulCombBoxEQ;
                var aSelCharNum = [];
                var sCharNum = '';
                oMulCombBoxEQ = that.getView().byId("idUniqueCharDetailsEQ");
                aSelectedItemsEQ = oMulCombBoxEQ.getSelectedItems();
                for (var i = 0; i < aSelectedItemsEQ.length; i++) {
                    sCharNum = aSelectedItemsEQ[i].getKey().split(':')[0];
                    // sCharVal_Num = aSelectedItemsEQ[i].getKey().split(':')[1];
                    if (aSelCharNum.length > 0) {
                        if (aSelCharNum.includes(sCharNum) === true) {
                            MessageToast.show("Cannot select multiple values for each characteristic!",
                                { width: "25rem" });
                            oMulCombBoxEQ.removeSelectedItem(aSelectedItemsEQ[i]);
                            break;
                        } else {
                            aSelCharNum.push(sCharNum);
                        }
                    } else {
                        aSelCharNum.push(sCharNum);
                    }
                }
            },
            /**
             * This function is triggered on selection change event for fiter type (Not Equal)
             * @param {*} oEvent 
             */
            onCharNEQSelectionChange: function (oEvent) {
                var aSelectedItemsNEQ = [];
                var oMulCombBoxNEQ;
                var aSelCharNum = [];
                var sCharNum = '';
                // oMulCombBoxNEQ = that.getView().byId("idUniqueCharDetailsNEQ");
                // aSelectedItemsNEQ = oMulCombBoxNEQ.getSelectedItems();
                // for (var i = 0; i < aSelectedItemsNEQ.length; i++) {
                //     sCharNum = aSelectedItemsNEQ[i].getKey().split(':')[0];
                //     // sCharVal_Num = aSelectedItemsEQ[i].getKey().split(':')[1];
                //     if (aSelCharNum.length > 0) {
                //         if (aSelCharNum.includes(sCharNum) === true) {
                //             MessageToast.show("Cannot select multiple values for each characteristic!",
                //                 { width: "25rem" });
                //             oMulCombBoxNEQ.removeSelectedItem(aSelectedItemsNEQ[i]);
                //             break;
                //         } else {
                //             aSelCharNum.push(sCharNum);
                //         }
                //     } else {
                //         aSelCharNum.push(sCharNum);
                //     }
                // }
            },
            /**
             * This function is triggered on click of 'Go' button.
             * -- It filters the Unique Id  characteristics based on selected filters
             * @param {*} oEvent 
             */
            onFilterData: function (oEvent) {
                var aSelectedItemsEQ = [], aSelectedItemsNEQ = [];
                var oMulCombBoxEQ, oMulCombBoxNEQ;
                var aEQUniqueChars = [],
                    aNEQUniqueChars = [],
                    aFilterUniqueIds = [],
                    aFilterUniqueIdsNEQ = [],
                    aColumns = [];
                var scolumnName = '';
                var iCounter = 0;
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();
                oMulCombBoxEQ = that.getView().byId("idUniqueCharDetailsEQ");
                oMulCombBoxNEQ = that.getView().byId("idUniqueCharDetailsNEQ");
                aSelectedItemsEQ = oMulCombBoxEQ.getSelectedItems();
                aSelectedItemsNEQ = oMulCombBoxNEQ.getSelectedItems();

                if (aSelectedItemsEQ.length > 0) {
                    aEQUniqueChars = that.getUniqueIdsEQSelChars(aSelectedItemsEQ);
                    if (aEQUniqueChars === undefined) {
                        aEQUniqueChars = [];
                    }
                }

                if (aSelectedItemsNEQ.length > 0) {
                    aNEQUniqueChars = that.getUniqueIdsNESelChars(aSelectedItemsNEQ);
                    if (aNEQUniqueChars === undefined) {
                        aNEQUniqueChars = [];
                    }
                }

                if (aEQUniqueChars.length > 0 && aNEQUniqueChars.length > 0) {
                    for (var k = 2; k < aColumns.length; k++) {
                        // scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                        scolumnName = aColumns[k].getName();
                        aFilterUniqueIds = aEQUniqueChars.filter(function (aUniqChar) {
                            return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                        });
                        aFilterUniqueIdsNEQ = aNEQUniqueChars.filter(function (aUniqChar) {
                            return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                        });
                        if (aFilterUniqueIds.length > 0 && aFilterUniqueIdsNEQ.length > 0) {
                            iCounter = iCounter + 1;
                            if (iCounter > 5) {
                                aColumns[k].setVisible(false);
                            } else {
                                aColumns[k].setVisible(true);
                            }
                        } else {
                            aColumns[k].setVisible(false);
                        }

                    }

                } else if (aEQUniqueChars.length > 0 && aNEQUniqueChars.length === 0) {
                    for (var k = 2; k < aColumns.length; k++) {
                        // scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                        scolumnName = aColumns[k].getName();
                        aFilterUniqueIds = aEQUniqueChars.filter(function (aUniqChar) {
                            return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                        });
                        if (aFilterUniqueIds.length > 0) {
                            iCounter = iCounter + 1;
                            if (iCounter > 5) {
                                aColumns[k].setVisible(false);
                            } else {
                                aColumns[k].setVisible(true);
                            }
                        } else {
                            aColumns[k].setVisible(false);
                        }

                    }

                } else if (aEQUniqueChars.length === 0 && aNEQUniqueChars.length > 0) {
                    for (var k = 2; k < aColumns.length; k++) {
                        // scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                        scolumnName = aColumns[k].getName();
                        aFilterUniqueIds = aNEQUniqueChars.filter(function (aUniqChar) {
                            return aUniqChar.UNIQUE_ID === parseInt(scolumnName);
                        });
                        if (aFilterUniqueIds.length > 0) {
                            iCounter = iCounter + 1;
                            if (iCounter > 5) {
                                aColumns[k].setVisible(false);
                            } else {
                                aColumns[k].setVisible(true);
                            }
                        } else {
                            aColumns[k].setVisible(false);
                        }

                    }

                } else {
                    for (var k = 2; k < aColumns.length; k++) {
                        // scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                        scolumnName = aColumns[k].getName();
                        iCounter = iCounter + 1;
                        if (iCounter > 5) {
                            aColumns[k].setVisible(false);
                        } else {
                            aColumns[k].setVisible(true);
                        }
                    }
                }
            },
            /**
             * This function is to handle the rows count visibilty based on header expansion / collapsed
             */
            onChangeHeaderPinStatusU: function (oEvent) {
                if (oEvent.getSource()._bHeaderExpanded === true) {
                    that.handleVisibleRowCountU(5);
                } else {
                    that.handleVisibleRowCountU(0);
                }

            },
            /**
             * This function is to handle the visible row count of sap.ui.table.Table data
             */
            handleVisibleRowCountU: function (iCount) {
                var iWinH = window.innerHeight;
                if (iWinH > 750 && iWinH < 800) {
                    that.byId("idUniqueIdChars").setVisibleRowCount(9 + iCount);
                } else if (iWinH > 800 && iWinH < 900) {
                    that.byId("idUniqueIdChars").setVisibleRowCount(10 + iCount);
                } else if (iWinH > 900 && iWinH < 1000) {
                    that.byId("idUniqueIdChars").setVisibleRowCount(12 + iCount);
                } else if (iWinH > 1000 && iWinH < 1100) {
                    that.byId("idUniqueIdChars").setVisibleRowCount(14 + iCount);
                } else {
                    that.byId("idUniqueIdChars").setVisibleRowCount(7 + iCount);
                }
            },
            /**
             * This fuction is to reset all the filters and display data as initial load
             */
            onResetFilters: function () {
                var aColumns = [];
                var scolumnName = '';
                var iCounter = 0;
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();

                that.getView().byId("idUniqueCharDetailsEQ").removeAllSelectedItems();
                that.getView().byId("idUniqueCharDetailsNEQ").removeAllSelectedItems();

                for (var k = 2; k < aColumns.length; k++) {
                    // scolumnName = aColumns[k].getLabel().getText().split(' (')[0];
                    scolumnName = aColumns[k].getName();
                    iCounter = iCounter + 1;
                    if (iCounter > 5) {
                        aColumns[k].setVisible(false);
                    } else {
                        aColumns[k].setVisible(true)
                    }
                }
            },
            /**
             * This function is to set binding for weekdates drop-down  and selected key as firm horizon date
             * @param {*} oEvent 
             */
            setWeekDates: function (oEvent) {
                oGModel = that.getOwnerComponent().getModel("oGModel");
                var aDates = oGModel.getProperty("/TDates");
                var dFrozenHorizonDate = oGModel.getProperty("/dFrozenHorizonDate");
                // var dFirmHorizonDate = oGModel.getProperty("/dFirmHorizonDate");
                var oWeekDates = {},
                    aWeekDates = [];
                var bFlag = false;
                var dWeekDate;
                var iWeekIndex;

                for (var i = 0; i < aDates.length; i++) {
                    oWeekDates = {};
                    dWeekDate = new Date(aDates[i]);
                    if ((aDates[i]).includes("-") === true) {
                        oWeekDates.WEEK_DATE = aDates[i];
                        if (dWeekDate >= dFrozenHorizonDate) {

                            if (bFlag === false) {
                                that.SEL_DATE = aDates[i];
                                bFlag = true;
                            }
                        }
                        iWeekIndex = that.getWeekNumber(aDates[i]);
                        oWeekDates.WEEK_INDEX = "W" + iWeekIndex;
                        aWeekDates.push(oWeekDates);
                    }

                }
                if (aWeekDates.length > 0) {
                    that.weeklyCIRModel.setData({
                        weeks: aWeekDates
                    });

                    that.getView().byId("_IDWeekDtSel").setModel(that.weeklyCIRModel);
                    that.getView().byId("_IDWeekDtSel").setSelectedKey(that.SEL_DATE);
                }

            },
            /**
             * This function is to change display of weekly quantity for each unique id based on selection of week date
             * @param {*} oEvent 
             */
            onChangeWeekDate: function (oEvent) {
                var aDates = oGModel.getProperty("/TDates");
                that.SEL_DATE = oEvent.getParameter('selectedItem').getKey();
                var sDateInd = aDates.findIndex(f => f == that.SEL_DATE);
                sDateInd++;
                var aColumns = [];
                var scolumnName = '';
                var sColLabel = '';
                var iCIRQty = 0;
                var aCIRData = oGModel.getProperty("/CIRQtys");
                var aFilCIRData = [];
                var sColumnLabel = '';
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();

                for (var k = 1; k < aColumns.length; k++) {
                    scolumnName = aColumns[k].getName();

                    // iCounter = iCounter + 1;
                    // if (iCounter > 5) {
                    //     aColumns[k].setVisible(false);
                    // } else {
                    //     aColumns[k].setVisible(true)
                    // }

                    sColLabel = aColumns[k].getLabel().getText().split(' ');
                    iCIRQty = 0;



                    const ObindingData = oGModel.getProperty("/ObindingData");

                    const
                        {
                            sSelDmndLoc,
                            sSelProdId,
                            iSelUniqueId, ver, scenario
                        }
                            = ObindingData;
                    // Get Weekly Quantity

                    const sCompKey = `${sSelDmndLoc}|${sSelProdId}|${ver}|${scenario}`;
                    const sTargetId = scolumnName.toString();
                    const aDateKeys = Object.keys(aCIRData);
                    const sDateKey = aDateKeys[sDateInd - 1];

                    const oHit = aCIRData?.[sDateKey]?.[sCompKey]?.data?.[sTargetId];
                    iCIRQty = oHit ? oHit.forecast : 0;

                    sColumnLabel = sColLabel[0] + " " + sColLabel[1] + " - (" + iCIRQty + ")";
                    aColumns[k].setLabel(sColumnLabel);

                }

            },
            /**
             * 
             * @param {*} oEvent 
             */
            onPressUniqueDescEdit: function (oEvent) {
                var oModel = that.getOwnerComponent().getModel('oModel');
                var sUniqueDescUpdt = that.getView().byId("idUniqueIdDesc").getValue();
                var sUniqueDesc = that.getView().byId("idUniqueIdDesc").getPlaceholder();

                if (sUniqueDescUpdt !== sUniqueDesc) {
                    if (!that.oSubmitDialog) {
                        that.oSubmitDialog = new sap.m.Dialog({
                            type: sap.m.DialogType.Message,
                            title: "Confirmation",
                            content: [
                                new sap.m.Label({
                                    text: "Do you want to update unique id description?"
                                })

                            ],
                            beginButton: new sap.m.Button({
                                type: sap.m.ButtonType.Emphasized,
                                text: "Yes",
                                enabled: true,
                                press: function () {
                                    sUniqueDescUpdt = that.getView().byId("idUniqueIdDesc").getValue();
                                    oModel.callFunction("/changeUniqueIdDesc", {
                                        method: "GET",
                                        urlParameters: {
                                            // LOCATION_ID: that.LocationId,
                                            PRODUCT_ID: that.ProductId,        // Partial Product
                                            UNIQUE_ID: that.UniqueId,
                                            UNIQUE_DESC: sUniqueDescUpdt
                                        },
                                        success: function (oData, oResponse) {
                                            that.getView().byId("idUniqueIdDesc").setPlaceholder(sUniqueDescUpdt);
                                            that.changeUniqueDescColumnLabel(sUniqueDescUpdt);
                                            oGModel = that.getOwnerComponent().getModel("oGModel");
                                            oGModel.setProperty("/BackToHome", true);
                                            sap.m.MessageToast.show(oResponse.data.changeUniqueIdDesc);

                                        },
                                        error: function (oResponse) {
                                            sap.m.MessageToast.show("Failed to Update Unique Description!");
                                        },
                                    });
                                    that.oSubmitDialog.close();

                                }.bind(this)
                            }),
                            endButton: new sap.m.Button({
                                text: "No",
                                press: function () {
                                    that.oSubmitDialog.close();
                                }.bind(this)
                            })
                        });
                    }

                    that.oSubmitDialog.open();
                } else {
                    sap.m.MessageToast.show("No Change in Unique Description! ");
                }
            },

            /**
             * 
             * @param {*} oEvent 
             */
            changeUniqueDescColumnLabel: function (sUniqueDesc) {
                var aColumns = [];
                var scolumnName = '';
                var sColLabel = '';
                var sColumnLabel = '';
                that.oUniqueCharTable = that.getView().byId("idUniqueIdChars");
                aColumns = that.oUniqueCharTable.getColumns();

                sColLabel = aColumns[1].getLabel().getText().split('(');

                sColumnLabel = sUniqueDesc + " (" + sColLabel[1] + " (" + sColLabel[2];
                aColumns[1].setLabel(sColumnLabel);

            },
            /**
             * 
             * @param {*} oEvent 
             */
            onNavBackToHome: function (oEvent) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                // oGModel = that.getOwnerComponent().getModel("oGModel");
                // oGModel.setProperty("/BackToHome", true);

                oRouter.navTo("Home", {}, true);
            },

            /**
             * This function is always called when app is navigated from CIR quantity view to Close Unique Ids view
             * @param {*} oEvent 
             */
            _onRouteMatched: function (oEvent) {
                that.getView().byId("idRBGChars").setSelectedIndex(0);
                oGModel = that.getOwnerComponent().getModel("oGModel");
                that.LocationId = oGModel.getProperty("/SelDemandLocation");
                that.ProductId = oGModel.getProperty("/SelProduct");
                that.UniqueId = oGModel.getProperty("/SelectedUniqueId");
                that.UniqueIdDesc = oGModel.getProperty("/SelectedUniqueIdDesc");
                that.ExternalId = oGModel.getProperty("/SelectedExternalId");
                that.aFilteredChars = oGModel.getProperty("/aFilteredChar");
                that.aAllUniqueChars = oGModel.getProperty("/AllUniqueChars");

                that.getView().byId("idlocU").setValue(that.LocationId);
                that.getView().byId("idprodListU").setValue(that.ProductId);
                that.getView().byId("idUniqueId").setValue(that.UniqueId);
                that.getView().byId("idUniqueIdDesc").setValue(that.UniqueIdDesc);
                that.getView().byId("idExtId").setValue(that.ExternalId);
                that.getView().byId("idUniqueIdDesc").setPlaceholder(that.UniqueIdDesc);


                that.getView().byId("idUniqueCharDetailsEQ").removeAllSelectedItems();
                that.getView().byId("idUniqueCharDetailsNEQ").removeAllSelectedItems();

                that.allCharsModel.setData({
                    charDetails: that.aAllUniqueChars,
                });

                that.locProdCharModel.setData({
                    charDetails: that.aFilteredChars,
                });


                that.getView().byId("idUniqueCharDetailsEQ").setModel(that.locProdCharModel);
                that.getView().byId("idUniqueCharDetailsNEQ").setModel(that.locProdCharModel);

                that.setWeekDates();

                that.getUniqueCharacteristics();

            }
        });
    }
);