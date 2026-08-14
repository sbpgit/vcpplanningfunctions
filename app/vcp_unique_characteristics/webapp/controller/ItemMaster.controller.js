sap.ui.define(
    [
        "vcpapp/vcpuniquecharacteristics/controller/BaseController",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageBox",
        "sap/ui/Device",
        "../model/formatter"
    ],
    function (
        BaseController,
        MessageToast,
        JSONModel,
        Filter,
        FilterOperator,
        MessageBox,
        Device,
        formatter
    ) {
        "use strict";
        var that, oGModel;
        var aResults;

        return BaseController.extend("vcpapp.vcpuniquecharacteristics.controller.ItemMaster", {
            formatter: formatter,
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             */
            onInit: function () {
                that = this;
                that.selectedArray = [];
                that.indexArray = [];
                that.oIndexArray = [];
                that.aAllProd = [];
                //   that.aAllGetData = [];
                // Declaring JSON Model and size limit
                that.oModel = new JSONModel();
                this.locModel = new JSONModel();
                this.prodModel = new JSONModel();
                // that.variantModel = new JSONModel();
                that.viewDetails = new JSONModel({
                    items12: []
                });
                that.byId("idMatList123UC").setModel(that.viewDetails);
                that.oGModel = that.getOwnerComponent().getModel("oGModel");
                that.oGModel.setProperty("/createFlag", false);
                that.oGModel.setProperty("/updateFlag", false);
                that.oGModel.setProperty("/deleteFlag", false);

                // Declaring JSON Models and size limit
                that.oCharModel = new JSONModel();
                that.charnameModel = new JSONModel();
                that.charvalueModel = new JSONModel();

                // that.locModel.setSizeLimit(1000);
                // that.prodModel.setSizeLimit(1000);
                this.oModel.setSizeLimit(1000);
                // that.variantModel.setSizeLimit(5000);
                that.viewDetails.setSizeLimit(5000);
                this.bus = sap.ui.getCore().getEventBus();
                this.bus.subscribe("data", "refreshMaster", this.refreshMaster, this);
                this.bus.publish("nav", "toBeginPage", {
                    viewName: this.getView().getProperty("viewName"),
                });
                var oHBox1 = new sap.m.HBox({
                    alignItems: "Center",
                    items: [
                        new sap.m.CheckBox("checkHBox1", {
                            select: (params) => {
                                that.handleCheckboxChange(params);
                            }
                        }),
                        new sap.m.Title("checkHB", {
                            text: "Select All",
                            titleStyle: "Auto",
                        }),
                    ],
                });


                // Declaring value help dialogs
                this._oCore = sap.ui.getCore();

                if (!this._CharacteristicsDialog) {
                    this._CharacteristicsDialog = sap.ui.xmlfragment("vcpapp.vcpuniquecharacteristics.view.CharacteristicsDialog", this);
                    // title = "Select All"
                    // oHBox1.getItems()[1].setText(title);
                    // this._CharacteristicsDialog.insertContent(oHBox1.clone(), 1);
                    this.getView().addDependent(this._CharacteristicsDialog);
                }
                if (!this._valueHelpDialogLoc) {
                    this._valueHelpDialogLoc = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.LocDialog",
                        this
                    );
                    this.getView().addDependent(this._valueHelpDialogLoc);
                }
                if (!this._valueHelpDialogProd) {
                    this._valueHelpDialogProd = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.ProdDialog",
                        this
                    );
                    this.getView().addDependent(this._valueHelpDialogProd);
                }

                if (!this._valueHelpDialogDescUpdate) {
                    this._valueHelpDialogDescUpdate = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.UniqueDescUpdate",
                        this
                    );
                    this.getView().addDependent(this._valueHelpDialogDescUpdate);
                }

                if (!this._addCharacteristic) {
                    this._addCharacteristic = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.AddCharacterstics",
                        this
                    );
                    this.getView().addDependent(this._addCharacteristic);
                }

                if (!this._createCharacterstics) {
                    this._createCharacterstics = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.CreateChar",
                        this
                    );
                    this.getView().addDependent(this._createCharacterstics);
                }

                if (!this._copyCharacterstics) {
                    this._copyCharacterstics = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.CopyChar",
                        this
                    );
                    this.getView().addDependent(this._copyCharacterstics);
                }

                if (!this._valueHelpDialogclassName) {
                    this._valueHelpDialogclassName = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.className",
                        this
                    );
                    this.getView().addDependent(this._valueHelpDialogclassName);
                }


                if (!this.invalidCharDialog) {
                    this.invalidCharDialog = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.invalidCharacteristics",
                        this
                    );
                    this.getView().addDependent(this.invalidCharDialog);
                }
                //   that.onSalesHistory();
                //  that.getUserInfo();

            },


            /**
             * This function is to refreshing Master page data.
             */
            refreshMaster: function () {
                this.onAfterRendering();
            },

            /**
             * Called after the view has been rendered
             */
            onAfterRendering: function () {
                that.skip = 0
                that.allData = [];
                that = this;
                that.deletedArray = [];
                that.oUniqueData = [];
                // that.oPUIDData = [];
                // that.oLoc = this.byId("idloc");
                that.oProd = this.byId("prodInputUC");
                that._valueHelpDialogLoc.setTitleAlignment("Center");
                that._valueHelpDialogProd.setTitleAlignment("Center");


                that.oTableData = [];
                sap.ui.getCore().byId("idUniqDesc1UC").setValue("");
                // var oCharTable = sap.ui.getCore().byId("idCharItemUC");
                that.ListModel = new JSONModel();

                that.ListModel.setData({
                    results: that.oTableData
                });
                sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                // this.oProdList = this._oCore.byId(
                //     this._valueHelpDialogProd.getId() + "-list"
                // );
                // this.oLocList = this._oCore.byId(
                //     this._valueHelpDialogLoc.getId() + "-list"
                // );

                this.oProdList = sap.ui.getCore().byId("prodSlctListUC");
                this.oLocList = sap.ui.getCore().byId("LocSlctListUC");

                oGModel = this.getModel("oGModel");
                oGModel.setProperty("/New", "");
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("BModel").read("/getUserPreferences", {
                    filters: [
                        new Filter("PARAMETER", FilterOperator.EQ, "MAX_RECORDS")
                    ],
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        that.getModel("oGModel").setProperty("/MaxCount", oData.results[0].PARAMETER_VALUE);
                        that.getVariantData();
                        that.getData();
                    },
                    error: function (oData, error) {
                        console.log(error)
                    },
                });
            },

            /*Getting variant view data*/
            getData: function () {
                var aData = [];
                var bData = [];
                var dData = [];
                var publicData = [];
                var details = {};
                var defaultDetails = [];
                var uniqueName = [];
                //adding skip and top for the getLocations entity
                that.getAllLocs()
                // Get Products
                that.loadProducts()

            },

            /*Getting variant view data*/
            getVariantData: function () {
                var ndData = [];
                var dData = [], uniqueName = [];
                that.uniqueName = [];
                sap.ui.core.BusyIndicator.show();
                var variantUser = this.getUser();
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                that.oGModel.setProperty("/UserId", variantUser);
                // Define the filters
                var oFilterAppName1 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, appName);
                var oFilterUser = new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, variantUser);

                var oFilterAppName2 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, appName);
                var oFilterScope = new sap.ui.model.Filter("SCOPE", sap.ui.model.FilterOperator.EQ, "Public");

                var oFilterAppName3 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, 'DefaultSingle');
                var oFilterUser1 = new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, variantUser);

                var oFilterCondition1 = new sap.ui.model.Filter({
                    filters: [oFilterAppName1, oFilterUser,],
                    and: true // Combine with AND
                });

                var oFilterCondition2 = new sap.ui.model.Filter({
                    filters: [oFilterAppName2, oFilterScope],
                    and: true // Combine with AND
                });
                var oFilterCondition3 = new sap.ui.model.Filter({
                    filters: [oFilterAppName3, oFilterUser1],
                    and: true // Combine with AND
                });
                var oFinalFilter = new sap.ui.model.Filter({
                    filters: [oFilterCondition1, oFilterCondition2, oFilterCondition3],
                    and: false // Combine with OR
                });

                this.getView().getModel("BModel").read("/getVariantHeader", {
                    // filters: [oFinalFilter],
                    headers: {
                        "x-user-id": variantUser,
                        "x-app-name": appName
                    },
                    success: function (oData) {
                        oData.results = oData.results.map(item => ({
                            ...item,
                            VARIANTID: String(item.VARIANTID)
                        }));
                        that.oGModel.setProperty("/headerDetails", oData.results);
                        if (oData.results.length === 0) {
                            that.oGModel.setProperty("/variantDetails", "");
                            that.oGModel.setProperty("/fromFunction", "X");
                            uniqueName.unshift({
                                "VARIANTNAME": "Standard",
                                "VARIANTID": "0",
                                "DEFAULT": "Y",
                                "REMOVE": false,
                                "CHANGE": false,
                                "USER": "SAP",
                                "SCOPE": "Public"
                            })
                            // uniqueName = that.normalizeVariantItems(uniqueName);
                            that.oGModel.setProperty("/viewNames", uniqueName);
                            that.oGModel.setProperty("/defaultDetails", "");
                            that.viewDetails.setData({
                                items12: uniqueName
                            });
                            that.varianNames = uniqueName;
                            // that.byId("idMatList123UC").setModel(that.viewDetails);
                            that.UniqueDefKey = uniqueName[0].VARIANTID;
                            that.byId("idMatList123UC").setDefaultKey(uniqueName[0].VARIANTID);
                            that.byId("idMatList123UC").setSelectedKey(uniqueName[0].VARIANTID);
                            var Default = "Standard";
                            if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                var newVariant = that.oGModel.getProperty("/newVariant");
                                that.handleSelectPress(newVariant[0].VARIANTNAME);
                                that.oGModel.setProperty("/newVaraintFlag", "");
                            } else {
                                that.handleSelectPress(Default);
                            }
                        }
                        else {
                            for (var i = 0; i < oData.results.length; i++) {
                                if (oData.results[i].DEFAULT === "Y" && oData.results[i].USER === variantUser) {
                                    dData.push(oData.results[i]);
                                    that.UniqueDefKey = oData.results[i].VARIANTID;
                                    that.byId("idMatList123UC").setDefaultKey((oData.results[i].VARIANTID));
                                    that.byId("idMatList123UC").setSelectedKey((oData.results[i].VARIANTID))
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



            getTotalVariantDetails: function () {
                var aData = [], uniqueName = [], details = {}, defaultDetails = [], oFilters = [];
                var headerData = that.oGModel.getProperty("/VariantData");
                if (headerData.length > 0) {
                    for (var i = 0; i < headerData.length; i++) {
                        oFilters.push(new Filter("VARIANTID", FilterOperator.EQ, headerData[i].VARIANTID));
                    }
                }
                var userVariant = that.oGModel.getProperty("/UserId");
                this.getOwnerComponent().getModel("BModel").read("/getVariant", {
                    filters: [oFilters],
                    success: function (oData) {
                        oData.results = oData.results.map(item => ({
                            ...item,
                            VARIANTID: String(item.VARIANTID)
                        }));
                        that.oGModel.setProperty("/fieldDetails", oData.results);
                        var variantNewData = oData.results;
                        aData = variantNewData.map(item1 => {
                            const item2 = headerData.find(item2 => item2.VARIANTID === item1.VARIANTID);
                            return item2 ? { ...item1, ...item2 } : { ...item1 };
                        });
                        that.oGModel.setProperty("/variantDetails", aData);
                        if (aData.length > 0) {
                            aData = aData.filter(id => id.VARIANTNAME !== "defaultSingle" && id.APPLICATION_NAME !== "DefaultSingle")
                            uniqueName = that.removeDuplicate(aData, "VARIANTNAME");
                            that.oGModel.setProperty("/saveBtn", "");
                            for (var k = 0; k < uniqueName.length; k++) {
                                if (uniqueName[k].DEFAULT === "Y" && uniqueName[k].USER === userVariant) {
                                    var Default = uniqueName[k].VARIANTNAME;
                                    details = {
                                        "VARIANTNAME": uniqueName[k].VARIANTNAME,
                                        "VARIANTID": uniqueName[k].VARIANTID,
                                        "USER": uniqueName[k].USER,
                                        "DEFAULT": "N"
                                    };
                                    defaultDetails.push(details);
                                    details = {};
                                }
                            }
                        }

                        that.oGModel.setProperty("/fromFunction", "X");
                        if (Default) {
                            uniqueName.unshift({
                                "VARIANTNAME": "Standard",
                                "VARIANTID": "0",
                                "DEFAULT": "N",
                                "REMOVE": false,
                                "CHANGE": false,
                                "USER": "SAP",
                                "SCOPE": "Public"
                            })
                            // uniqueName = that.normalizeVariantItems(uniqueName);
                            that.oGModel.setProperty("/viewNames", uniqueName);
                            that.viewDetails.setData({
                                items12: uniqueName
                            });
                            that.varianNames = uniqueName;
                            that.oGModel.setProperty("/defaultDetails", defaultDetails);
                            // that.byId("idMatList123UC").setModel(that.variantModel);
                            if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                var newVariant = that.oGModel.getProperty("/newVariant");
                                that.handleSelectPress(newVariant[0].VARIANTNAME);
                                if (newVariant[0].DEFAULT === "Y") {
                                    that.UniqueDefKey = newVariant[0].VARIANTID;
                                    that.byId("idMatList123UC").setDefaultKey((newVariant[0].VARIANTID));
                                }
                                that.byId("idMatList123UC").setSelectedKey((newVariant[0].VARIANTID))
                                that.oGModel.setProperty("/newVaraintFlag", "");
                            } else {
                                that.handleSelectPress(Default);
                            }
                        } else {
                            uniqueName.unshift({
                                "VARIANTNAME": "Standard",
                                "VARIANTID": "0",
                                "DEFAULT": "Y",
                                "REMOVE": false,
                                "CHANGE": false,
                                "USER": "SAP",
                                "SCOPE": "Public"
                            })
                            // uniqueName = that.normalizeVariantItems(uniqueName);
                            that.oGModel.setProperty("/viewNames", uniqueName);
                            that.oGModel.setProperty("/defaultDetails", "");

                            that.viewDetails.setData({
                                items12: uniqueName
                            });
                            that.varianNames = uniqueName;
                            // that.byId("idMatList123UC").setModel(that.viewDetails);
                            var Default = "Standard";
                            if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                var newVariant = that.oGModel.getProperty("/newVariant");
                                that.handleSelectPress(newVariant[0].VARIANTNAME);
                                if (newVariant[0].DEFAULT === "Y") {
                                    that.UniqueDefKey = newVariant[0].VARIANTID;
                                    that.byId("idMatList123UC").setDefaultKey((newVariant[0].VARIANTID));
                                }
                                that.byId("idMatList123UC").setSelectedKey((newVariant[0].VARIANTID))
                                that.oGModel.setProperty("/newVaraintFlag", "");
                            } else {
                                that.UniqueDefKey = uniqueName[0].VARIANTID;
                                that.byId("idMatList123UC").setDefaultKey((uniqueName[0].VARIANTID));
                                that.byId("idMatList123UC").setSelectedKey((uniqueName[0].VARIANTID));
                                that.handleSelectPress(Default);
                            }
                        }

                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide()
                        MessageToast.show("error while loading variant details");
                    },
                });
            },

            /**On Press of Variant Name */
            handleSelectPress: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                that.oUnique = that.byId("idUniqueUC")
                var oProd, oUnique, oTokens = {}, custToken = [];
                that.locProdFilters = [];
                that.finaloTokens = [];
                var oTableItems = that.oGModel.getProperty("/variantDetails");
                that.byId("idMatList123UC").setModified(false);
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");

                that.oGModel.setProperty("/setProduct", '');
                that.oGModel.setProperty("/setUnique", '');
                that.oGModel.setProperty("/defaultProduct", "");
                that.oGModel.setProperty("/defaultUnique", "");
                if (that.oGModel.getProperty("/fromFunction") === "X") {
                    that.oGModel.setProperty("/fromFunction", "");
                    that.selectedApp = oEvent;
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                }
                else {
                    that.selectedApp = oEvent.getSource().getTitle().getText();
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                }
                if (that.selectedApp !== "Standard") {
                    for (var i = 0; i < oTableItems.length; i++) {
                        if (that.selectedApp === oTableItems[i].VARIANTNAME && oTableItems[i].APPLICATION_NAME === appName) {
                            if (oTableItems[i].FIELD.includes("Config Product")) {
                                oProd = oTableItems[i].VALUE;
                                that.oGModel.setProperty("/defaultProduct", oProd);
                                var sFilter = new sap.ui.model.Filter({
                                    path: "PRODUCT_ID",
                                    operator: sap.ui.model.FilterOperator.EQ,
                                    value1: oTableItems[i].VALUE,
                                });
                                that.locProdFilters.push(sFilter);

                            }

                            else if (oTableItems[i].FIELD.includes("Unique Type")) {
                                oUnique = oTableItems[i].VALUE;
                                that.oGModel.setProperty("/defaultUnique", oUnique);
                                var sFilter = new sap.ui.model.Filter({
                                    path: "UID_TYPE",
                                    operator: sap.ui.model.FilterOperator.EQ,
                                    value1: oTableItems[i].VALUE,
                                });
                                that.locProdFilters.push(sFilter);
                            }
                        }
                    }

                    if (oProd) {
                        that.oProd.setValue(oProd);
                        that.oGModel.setProperty("/setProduct", oProd);

                    }
                    // else {
                    //     that.oProd.setValue("oProd");
                    // }
                    if (oUnique === "U") {
                        that.oUnique.setValue("Unique")
                        that.oGModel.getProperty("/defaultType", oUnique);
                    }
                    else if (oUnique === "P") {
                        that.oUnique.setValue("Primary")
                        that.oGModel.getProperty("/defaultType", oUnique);
                    }
                    else {
                        that.oUnique.setValue("All");
                    }
                    // if (oUnique) {
                    //     that.oUnique.setValue(oUnique)
                    //     that.oGModel.getProperty("/defaultType", oUnique);
                    // } else {
                    //     that.oUnique.setValue("All");
                    // }
                    sap.ui.core.BusyIndicator.hide();
                }
                else {
                    // let headerDetails = that.oGModel.getProperty("/headerDetails").filter(id => id.APPLICATION_NAME == "DefaultSingle" && id.VARIANTNAME == "defaultSingle");
                    // if (headerDetails.length) {
                    //     var oTableItems = that.oGModel.getProperty("/fieldDetails").filter(id => id.VARIANTID == headerDetails[0].VARIANTID);
                    //     for (var i = 0; i < oTableItems.length; i++) {
                    //         if (oTableItems[i].FIELD.includes("Config Product")) {
                    //             oProd = oTableItems[i].VALUE;
                    //             that.oGModel.setProperty("/defaultProduct", oProd);
                    //             var sFilter = new sap.ui.model.Filter({
                    //                 path: "PRODUCT_ID",
                    //                 operator: sap.ui.model.FilterOperator.EQ,
                    //                 value1: oTableItems[i].VALUE,
                    //             });
                    //             that.locProdFilters.push(sFilter);

                    //         }

                    //         else if (oTableItems[i].FIELD.includes("Unique Type")) {
                    //             oUnique = oTableItems[i].VALUE;
                    //             that.oGModel.setProperty("/defaultUnique", oUnique);
                    //             var sFilter = new sap.ui.model.Filter({
                    //                 path: "UID_TYPE",
                    //                 operator: sap.ui.model.FilterOperator.EQ,
                    //                 value1: oTableItems[i].VALUE,
                    //             });
                    //             that.locProdFilters.push(sFilter);
                    //         }
                    //     }


                    //     if (oProd) {
                    //         that.oProd.setValue(oProd);
                    //         that.oGModel.setProperty("/setProduct", oProd);

                    //     }
                    //     // else {
                    //     //     that.oProd.setValue("oProd");
                    //     // }
                    //     if (oUnique === "U") {
                    //         that.oUnique.setValue("Unique")
                    //         that.oGModel.getProperty("/defaultType", oUnique);
                    //     }
                    //     else if (oUnique === "P") {
                    //         that.oUnique.setValue("Primary")
                    //         that.oGModel.getProperty("/defaultType", oUnique);
                    //     }
                    //     else {
                    //         that.oUnique.setValue("All");
                    //     }
                    // }

                    //do nothing
                    // else {
                    that.byId("prodInputUC").setValue("")
                    that.byId("idUniqueUC").setSelectedKey("All");
                    // }
                    sap.ui.core.BusyIndicator.hide();
                    //   that.onReset();
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
                var sProduct = that.byId("prodInputUC").getValue();
                var Field1 = that.byId("LabelProdUC").getText();

                var sUniq = that.byId("idUniqueUC").getSelectedKey()
                var Field2 = that.byId("oIdUniqUC").getText()
                // if (sUniq === "U") {
                //     var Field2 = "Unique"
                // }
                // else if (sUniq === "P") {
                //     var Field2 = "Primary"
                // }
                // else {
                //     var Field2 = "All"
                // }

                var varName = oEvent.getParameters().name;
                var sDefault = oEvent.getParameters().def;
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                if (!sProduct && sUniq.length === 0) {
                    sap.ui.core.BusyIndicator.hide();
                    return MessageToast.show("No values selected in filters Config Product,Demand Location & Customer Group")
                }

                if (varName) {
                    if (sDefault && that.oGModel.getProperty("/defaultDetails").length > 0) {
                        var defaultChecked = "Y";
                        this.getOwnerComponent().getModel("BModel").callFunction("/updateVariant", {
                            method: "GET",
                            urlParameters: {
                                VARDATA: JSON.stringify(that.oGModel.getProperty("/defaultDetails"))
                            },
                            success: function (oData) {
                            },
                            error: function (error) {
                                MessageToast.show("Failed to create variant");
                            },
                        });

                    }
                    else if (sDefault && that.oGModel.getProperty("/defaultDetails").length === 0) {
                        var defaultChecked = "Y";
                    }
                    else {
                        var defaultChecked = "N";
                    }
                    if (oEvent.getParameters().public) {
                        var Scope = "Public";
                    }
                    else {
                        var Scope = "Private";
                    }
                    if (sProduct) {
                        details = {
                            Field: Field1,
                            FieldCenter: (1).toString(),
                            Value: sProduct,
                            Default: defaultChecked
                        }
                        array.push(details);
                    }

                    if (sUniq) {
                        details = {
                            Field: Field2,
                            FieldCenter: (1).toString(),
                            Value: sUniq,
                            Default: defaultChecked
                        }
                        array.push(details);
                    }

                    if (!oEvent.getParameters().overwrite) {
                        for (var j = 0; j < array.length; j++) {
                            array[j].IDNAME = varName;
                            array[j].App_Name = appName;
                            array[j].SCOPE = Scope;
                        }
                        var flag = "X";
                    }
                    else {
                        var flag = "E";
                        for (var j = 0; j < array.length; j++) {
                            array[j].ID = oEvent.getParameters().key;
                            array[j].IDNAME = varName;
                            array[j].App_Name = appName;
                            array[j].SCOPE = Scope;
                        }
                    }
                    //    console.log(JSON.stringify(array));
                    this.getOwnerComponent().getModel("BModel").callFunction("/createVariant", {
                        method: "GET",
                        urlParameters: {
                            Flag: flag,
                            USER: (that.oGModel.getProperty("/UserId")),
                            VARDATA: JSON.stringify(array)
                        },
                        success: function (oData) {
                            that.oGModel.setProperty("/newVariant", oData.results);
                            that.oGModel.setProperty("/newVaraintFlag", "X");
                            that.byId("idMatList123UC").setModified(false);
                            that.onAfterRendering();
                        },
                        error: function (error) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("Failed to create variant");
                        },
                    });
                }
                else {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Please fill View Name");
                }
            },
            /**On press of save in manage fragment */
            onManage: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var oDelted = {}, deletedArray = [], count = 0;
                var totalVariantData = that.oGModel.getProperty("/VariantData");
                var selected = oEvent.getParameters();
                var variantUser = this.getUser();
                if (selected.def) {
                    totalVariantData.filter(item1 => {
                        if (JSON.parse(selected.def) == item1.VARIANTID && item1.USER !== variantUser) {
                            count++
                        }
                    })
                }
                if (count > 0) {
                    sap.ui.core.BusyIndicator.hide();
                    that.viewDetails.setData({
                        items12: that.varianNames
                    });
                    // that.byId("idMatList123UC").setModel(that.viewDetails);
                    that.byId("idMatList123UC").setDefaultKey(that.UniqueDefKey);
                    return MessageToast.show("Variant doesn't belong to logged in user. Cannot make changes to this Variant");
                }
                //Delete the selected variant names
                if (selected.deleted) {
                    selected.deleted.forEach(item1 => {
                        totalVariantData.forEach(item2 => {
                            if (JSON.parse(item1) == item2.VARIANTID) {
                                oDelted = {
                                    ID: item2.VARIANTID,
                                    NAME: item2.VARIANTNAME
                                };
                                deletedArray.push(oDelted);
                            }
                        })
                    });
                    if (deletedArray.length > 0) {
                        that.deleteVariant(deletedArray)
                    }
                }
                //Updating the default variants
                if (selected.def) {
                    //If selected default is not standard
                    if (JSON.parse(selected.def) != 0) {
                        //Update the existing default to a new default
                        var defaultVariant = totalVariantData.filter(item => item.DEFAULT === "Y");
                        if (defaultVariant.length > 0) {
                            defaultVariant[0].DEFAULT = "N";
                            that.getView().getModel("BModel").callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(defaultVariant)
                                },
                                success: function (oData) {
                                    var newDefault = totalVariantData.filter(item => item.VARIANTID == JSON.parse(selected.def));
                                    newDefault[0].DEFAULT = "Y";
                                    that.getView().getModel("BModel").callFunction("/updateVariant", {
                                        method: "GET",
                                        urlParameters: {
                                            VARDATA: JSON.stringify(newDefault)
                                        },
                                        success: function (oData) {
                                            that.onAfterRendering();
                                            // sap.ui.core.BusyIndicator.hide();
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

                        }
                        else {
                            var selectedVariant = totalVariantData.filter(item => item.VARIANTID == JSON.parse(selected.def));
                            selectedVariant[0].DEFAULT = "Y";
                            that.getView().getModel("BModel").callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(selectedVariant)
                                },
                                success: function (oData) {
                                    that.onAfterRendering();
                                    // sap.ui.core.BusyIndicator.hide();
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
                        var defaultItem = totalVariantData.filter(item => item.DEFAULT === "Y");
                        defaultItem[0].DEFAULT = "N";
                        that.getView().getModel("BModel").callFunction("/updateVariant", {
                            method: "GET",
                            urlParameters: {
                                VARDATA: JSON.stringify(defaultItem)
                            },
                            success: function (oData) {
                                that.onAfterRendering();
                                // sap.ui.core.BusyIndicator.hide();
                            },
                            error: function (error) {
                                sap.ui.core.BusyIndicator.hide();
                                MessageToast.show("Failed to update variant");
                            },
                        });
                    }
                } else {
                    that.onAfterRendering();
                }
                sap.ui.core.BusyIndicator.hide();
            },

            deleteVariant: function (oEvent) {
                var deletedItems = JSON.stringify(oEvent);
                that.getView().getModel("BModel").callFunction("/createVariant", {
                    method: "GET",
                    urlParameters: {
                        Flag: "D",
                        USER: that.oGModel.getProperty("/UserId"),
                        VARDATA: deletedItems
                    },
                    success: function (oData) {
                        that.deletedArray = [];
                        // MessageToast.show("Variant deleted succesfully");
                        // that.onAfterRendering();
                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Failed to delete variant");
                    },
                });
            },


            /**
             * This function is called when click on Input box Value Help.
             * Dialogs will be open based on sId.
             * @param {object} oEvent -the event information.
             */
            handleValueHelp: function (oEvent) {
                // oGModel = this.getModel("oGModel");
                var sId = oEvent.getParameter("id");
                oGModel.setProperty("/mainSID", sId);
                // Loc Dialog
                if (sId.includes("loc")) {
                    that._valueHelpDialogLoc.open();
                    // Prod Dialog
                } else if (sId.includes("prod")) {
                    //     this.getModel("BModel").read("/getProducts", {
                    //         success: function (oData) {
                    // that.prodModel.setData(oData);
                    // that.oProdList.setModel(that.prodModel);
                    // that._valueHelpDialogProd.open();
                    //         },
                    //         error: function (oData, error) {
                    //             MessageToast.show("error");
                    //         }
                    // });
                    let oData = []
                    oData.results = that.oGModel.getProperty("/getProd")

                    that.prodModel.setData(oData);
                    that.oProdList.setModel(that.prodModel);
                    that._valueHelpDialogProd.open();

                    // if (that.byId("idloc").getValue() !== "") {
                    //     that._valueHelpDialogProd.open();
                    // } else {
                    //     MessageToast.show("Select Location");
                    // }
                }
            },

            /**
             * Called when 'Close/Cancel' button in any dialog is pressed.
             * Dialogs will be closed based on sId
             */
            handleClose: function (oEvent) {
                // var sId = oEvent.getParameter("id");
                var sId = oEvent.getSource().getParent().mAssociations.initialFocus.split("-")[0];
                // Loc Dialog
                if (sId.includes("Loc")) {
                    sap.ui.getCore().byId("LocSearchUC").setValue("");
                    // that._oCore.byId(this._valueHelpDialogLoc.getId() + "-searchField").setValue("");
                    if (that.oLocList.getBinding("items")) {
                        that.oLocList.getBinding("items").filter([]);
                    }
                    sap.ui.getCore().byId("LocSlctListUC").removeSelections();
                    that._valueHelpDialogLoc.close();
                    // Prod Dialog
                } else if (sId.includes("Prod")) {
                    sap.ui.getCore().byId("ProdSearchUC").setValue("");
                    // that._oCore.byId(this._valueHelpDialogProd.getId() + "-searchField").setValue("");
                    if (that.oProdList.getBinding("items")) {
                        that.oProdList.getBinding("items").filter([]);
                    }
                    sap.ui.getCore().byId("prodSlctListUC").removeSelections();
                    that._valueHelpDialogProd.close();
                }
            },

            /**
             * Called when something is entered into the search field.
             * @param {object} oEvent -the event information.
             */
            handleSearch1: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var sQuery =
                    oEvent.getParameter("value") || oEvent.getParameter("newValue"),
                    sId = oEvent.getParameter("id"),
                    oFilters = [];
                // Check if search filter is to be applied
                sQuery = sQuery ? sQuery.trim() : "";
                // Location
                if (sId.includes("Loc")) {
                    if (sQuery !== "") {
                        oFilters.push(
                            new Filter({
                                filters: [
                                    new Filter("LOCATION_ID", FilterOperator.Contains, sQuery),
                                    new Filter("LOCATION_DESC", FilterOperator.Contains, sQuery),
                                ],
                                and: false,
                            })
                        );
                    }
                    that.oLocList.getBinding("items").filter(oFilters);
                    sap.ui.core.BusyIndicator.hide();
                    // Product
                } else if (sId.includes("Prod")) {

                    var sProdQuery = sap.ui.getCore().byId("ProdSearchUC").getValue();
                    if (sProdQuery !== "") {
                        // this.getModel("BModel").read("/getProducts", {
                        //     filters: [
                        //         new Filter(
                        //             "PRODUCT_ID",
                        //             FilterOperator.Contains,
                        //             sProdQuery.toUpperCase()
                        //         ),
                        //     ],
                        //     success: function (oData) {
                        //         that.prodModel.setData(oData);
                        //         that.oProdList.setModel(that.prodModel);
                        //         sap.ui.core.BusyIndicator.hide();
                        //     },
                        //     error: function (oData, error) {
                        //         sap.ui.core.BusyIndicator.hide();
                        //         MessageToast.show("error");
                        //     },
                        // });
                        oFilters.push(
                            new Filter({
                                filters: [
                                    new Filter("REF_PRODID", FilterOperator.Contains, sQuery),
                                    new Filter("REFPROD_DESC", FilterOperator.Contains, sQuery),
                                ],
                                and: false,
                            })
                        );
                        that.oProdList.getBinding("items").filter(oFilters);
                        sap.ui.core.BusyIndicator.hide();
                    }
                    else {

                        that.oProdList.getBinding("items").filter([]);
                        sap.ui.core.BusyIndicator.hide();
                        // this.getModel("BModel").read("/getProducts", {
                        //     success: function (oData) {
                        //         that.prodModel.setData(oData);
                        //         that.oProdList.setModel(that.prodModel);
                        //         sap.ui.core.BusyIndicator.hide();
                        //     },
                        //     error: function (oData, error) {
                        //         sap.ui.core.BusyIndicator.hide();
                        //         MessageToast.show("error");
                        //     },
                        // });
                    }
                    // that.oProdList.getBinding("items").filter(oFilters);
                } else if (sId.includes("GenSearch")) {
                    if (sQuery !== "") {
                        oFilters.push(
                            new Filter({
                                filters: [
                                    new Filter("VARIANTNAME", FilterOperator.Contains, sQuery),
                                    new Filter("USER", FilterOperator.Contains, sQuery),
                                    // new Filter("SCOPE", FilterOperator.Contains, sQuery)
                                ],
                                and: false,
                            })
                        );
                    }
                    sap.ui.getCore().byId("varNameListUC").getBinding("items").filter(oFilters);
                }
            },

            /**
             * This function is called when selection of values in dialogs.
             * after selecting value, based on selection get data of other filters.
             * @param {object} oEvent -the event information.
             */
            handleSelection: function (oEvent) {
                // oGModel = this.getModel("oGModel");
                var sId = oEvent.getParameter("id"),
                    mainSID = oGModel.getProperty("/mainSID"),
                    oItem = oEvent.getParameter("selectedItems"),
                    aSelectedItems,
                    aODdata = [];
                // this.oLoc = that.byId("idloc");
                this.oProd = that.byId("prodInputUC");
                //Location list
                if (sId.includes("Loc")) {

                    // aSelectedItems = oEvent.getParameter("selectedItems");

                    // // that.oLoc.setValue(oEvent.getParameters().listItem.getCells()[0].getTitle());
                    // that.oProd.setValue("");

                    // this.getModel("BModel").read("/getLocProdDet", {
                    //     filters: [
                    //         new Filter(
                    //             "LOCATION_ID",
                    //             FilterOperator.EQ,
                    //             oEvent.getParameters().listItem.getCells()[0].getTitle()
                    //         ),
                    //     ],
                    //     success: function (oData) {
                    //         that.prodModel.setData(oData);

                    //         that.oProdList.setModel(that.prodModel);

                    //     },
                    //     error: function (oData, error) {
                    //         MessageToast.show("error");
                    //     },
                    // });

                    // Prod list
                } else if (sId.includes("prod")) {
                    // this.oProd = that.byId("prodInputUC");
                    aSelectedItems = oEvent.getParameter("selectedItems");
                    that.oProd.setValue(oEvent.getParameters().listItem.getCells()[0].getTitle());

                    var selectedProdItem = oEvent.getParameters().listItem.getCells()[0].getTitle()

                    if (that.oGModel.getProperty("/defaultProduct") !== selectedProdItem) {
                        that.byId("idMatList123UC").setModified(true);
                    }
                    that.onCharacteristicsPress();

                    // if (mainSID === "__xmlview1--prodInputUC") {
                    //     that.oProd.setValue(aSelectedItems[0].getTitle());
                    // }
                    // else if (mainSID === "prodId1") {
                    //     sap.ui.getCore().byId("prodId1").setValue(aSelectedItems[0].getTitle());
                    // }
                    // else if (mainSID === "prodIdCC") {
                    //     sap.ui.getCore().byId("prodIdCC").setValue(aSelectedItems[0].getTitle());
                    // }
                }
                that.handleClose(oEvent);
            },
            onUnqChange: function (oEvent) {
                var selectedProdItem = that.byId("idUniqueUC").getSelectedKey()
                if (that.oGModel.getProperty("/defaultUnique") !== selectedProdItem) {
                    that.byId("idMatList123UC").setModified(true);
                }
            },
            /**
             * This function is called when click on Go button.
             * @param {object} oEvent -the event information.
             */
            // onGetData: function (oEvent) {
            //     // var oSloc = that.oLoc.getValue();
            //     if (that.oProd.getValue() === "" || that.oProd.getValue() === "null" || that.oProd.getValue() === undefined) {
            //         return MessageToast.show("Please select Product");
            //     }
            //     //   that.onSalesHistory();
            //     var oSprod = that.oProd.getValue() || that.oProd.getTokens()[0].getText(),
            //         oSUniq = that.byId("idUniqueUC").getSelectedKey();

            //     oGModel.setProperty("/prdId", "");
            //     // oGModel.setProperty("/locId", "");
            //     oGModel.setProperty("/uniqId", "");
            //     oGModel.setProperty("/uniqIdDesc", "");

            //     var oFilters = [];
            //     // that.byId("idMatSearchUC").getBinding("items").filter(oFilters);
            //     // getting the filters
            //     oFilters.push(
            //         new Filter({
            //             filters: [
            //                 // new Filter("LOCATION_ID", FilterOperator.EQ, oSloc),
            //                 new Filter("PRODUCT_ID", FilterOperator.EQ, oSprod),
            //             ],
            //             and: true,
            //         })
            //     );

            //     if (oSUniq !== "A") {
            //         oFilters.push(
            //             new Filter({
            //                 filters: [
            //                     new Filter("UID_TYPE", FilterOperator.EQ, oSUniq)
            //                 ],
            //                 and: true,
            //             })
            //         );
            //     }
            //     // if (oSloc !== "" && oSprod !== "") {
            //     if (oSprod !== "") {
            //         this.byId("idMatSearchUC").setValue("");
            //         if (that.byId("idMatVHeadUC").getItems().length) {
            //             that.byId("idMatVHeadUC").getBinding("items").filter(oFilters);
            //         }
            //         sap.ui.core.BusyIndicator.show();
            //         this.getModel("BModel").read("/getUniqueHeader", {
            //             filters: [oFilters],
            //             success: function (oData) {

            //                 sap.ui.core.BusyIndicator.hide();
            //                 if (oData.results.length) {
            //                     that.newJModel = new JSONModel();
            //                     that.byId("idMatVHeadUC").setModel(that.newJModel);

            //                     oData.results.forEach(function (row) {
            //                         // Calling function to Unique ID Description
            //                         if (row.EX_IDENTIFICATION !== ' ' && row.EX_IDENTIFICATION !== null && row.EX_IDENTIFICATION !== undefined) {
            //                             row.UNIQUEID_DESC = row.EX_IDENTIFICATION + ":" + row.UNIQUE_DESC;
            //                         } else {
            //                             row.UNIQUEID_DESC = row.UNIQUE_DESC;
            //                         }

            //                     }, that);


            //                     that.oModel.setData({
            //                         results: oData.results,
            //                     });
            //                     oGModel.setProperty("/uniqueData", oData.results);
            //                     that.byId("idMatVHeadUC").setModel(that.oModel);
            //                     that.onIconHide();
            //                     // oGModel.setProperty("/locId", oData.results[0].LOCATION_ID);
            //                     oGModel.setProperty("/prdId", oData.results[0].PRODUCT_ID);
            //                     oGModel.setProperty("/uniqId", oData.results[0].UNIQUE_ID);
            //                     oGModel.setProperty("/uniqIdDesc", oData.results[0].UNIQUEID_DESC);
            //                     oGModel.setProperty("/uid_rate", oData.results[0].UID_RATE);
            //                     // Setting the default selected item for table
            //                     that.byId("idMatVHeadUC").setSelectedItem(that.byId("idMatVHeadUC").getItems()[0], true);
            //                     that.byId("idCreateBtnUC").setVisible(true);
            //                     that.byId("idCopyBtnUC").setVisible(true);
            //                     // Calling function to navigate to Item detail page
            //                     // that.onhandlePress();
            //                 } else {
            //                     that.oModel.setData({
            //                         results: [],
            //                     });
            //                     oGModel.setProperty("/uniqueData", oData.results);
            //                     that.byId("idMatVHeadUC").setModel(that.oModel);
            //                     MessageToast.show("No data for the selected Product");
            //                 }
            //                 that.byId("idCreateBtnUC").setVisible(true);
            //                 that.byId("idCopyBtnUC").setVisible(true);
            //                 // Calling function to navigate to Item detail page
            //                 that.onhandlePress();
            //             },
            //             error: function () {
            //                 sap.ui.core.BusyIndicator.hide();
            //                 MessageToast.show("Failed to get data");
            //             },
            //         });
            //     }
            // },
            // onIconHide: function () {
            //     var oTable = this.byId("idMatVHeadUC");
            //     var aItems = oTable.getItems();
            //     var oLoc = that.byId("prodInputUC").getValue();
            //     var oFilters = [];
            //     that.irecPerPage = 1000;
            //     that.iSkipRecords = 0;
            //     var sFilter = new sap.ui.model.Filter({
            //         path: "REF_PRODID",
            //         operator: sap.ui.model.FilterOperator.EQ,
            //         value1: oLoc,
            //     });
            //     oFilters.push(sFilter);

            //     that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
            //         filters: oFilters,
            //         urlParameters: {
            //             $top: that.irecPerPage, // First 1000 entries	
            //             $skip: that.iSkipRecords
            //         },
            //         success: function (oData) {
            //             var oDummydata = oData.results
            //             // Preprocess oDummydata to avoid redundant iterations
            //             var dummyValues = oDummydata.map(function (item) {
            //                 return item.UNIQUE_ID;
            //             });
            //             for (var i = 0; i < aItems.length; i++) {
            //                 var row = aItems[i];
            //                 var cells = row.getCells();

            //                 // Set editable property for cells in the row
            //                 for (var k = 0; k < cells.length; k++) {
            //                     if (k === 0) {
            //                         var cellValue = parseInt(cells[0].getTitle());
            //                         if (oDummydata.length > 0 && dummyValues.includes(cellValue)) {
            //                             cells[5].setEnabled(false);
            //                             //   cells[4].setVisible(false);
            //                         } 
            //                         else if(cells[2].getText() === "Primary"){
            //                             cells[5].setEnabled(false);
            //                         }
            //                         else {
            //                             cells[5].setEnabled(true);
            //                         }
            //                     }
            //                 }
            //             }

            //         },
            //         error: function (oRes) {
            //             MessageToast.show("error");
            //             that.buttonPressed = false;
            //             sap.ui.core.BusyIndicator.hide();
            //         },
            //     });
            // },

            onGetData: function (oEvent) {

                that.oModel.setData({
                    results: []
                });

                that.byId("idMatVHeadUC").setModel(that.oModel);

                // var oSloc = that.oLoc.getValue();
                if (that.oFlagCount === "X") {
                    //do nothing
                }
                else {
                    that.aAllGetData = [];
                }

                if (that.oProd.getValue() === "" || that.oProd.getValue() === "null" || that.oProd.getValue() === undefined) {
                    return MessageToast.show("Please select Product");
                }
                else {
                    var aFilters = [
                        new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, that.getUser()),
                        new sap.ui.model.Filter("REF_PRODID", sap.ui.model.FilterOperator.EQ, that.oProd.getValue())
                    ];
                    sap.ui.core.BusyIndicator.show();

                    this.getOwnerComponent().getModel("BModel").read("/getRolesAccess", {
                        filters: aFilters,
                        success: function (oData) {
                            let bCreate = false, bUpdate = false, bDelete = false;
                            if (oData.results.findIndex(ind => ind.CREATE == true) != -1) {//Any of them has CREATE as true
                                bCreate = true;
                            }
                            if (oData.results.findIndex(ind => ind.UPDATE == true) != -1) {//Any of them has UPDATE as true
                                bUpdate = true;
                            }
                            if (oData.results.findIndex(ind => ind.DELETE == true) != -1) {//Any of them has DELETE as true
                                bDelete = true;
                            }
                            that.oGModel.setProperty("/createFlag", bCreate);
                            that.oGModel.setProperty("/updateFlag", bUpdate);
                            that.oGModel.setProperty("/deleteFlag", bDelete);

                            var oSprod = that.oProd.getValue() || that.oProd.getTokens()[0].getText(),
                                oSUniq = that.byId("idUniqueUC").getSelectedKey();

                            oGModel.setProperty("/prdId", "");
                            oGModel.setProperty("/uniqId", "");
                            oGModel.setProperty("/uniqIdDesc", "");

                            var oFilters = [];
                            oFilters.push(
                                new Filter({
                                    filters: [
                                        new Filter("PRODUCT_ID", FilterOperator.EQ, oSprod),
                                    ],
                                    and: true,
                                })
                            );

                            if (oSUniq !== "A") {
                                oFilters.push(
                                    new Filter({
                                        filters: [
                                            new Filter("UID_TYPE", FilterOperator.EQ, oSUniq)
                                        ],
                                        and: true,
                                    })
                                );
                            }

                            if (oSprod !== "") {
                                this.byId("idMatSearchUC").setValue("");
                                if (that.byId("idMatVHeadUC").getItems().length) {
                                    that.byId("idMatVHeadUC").getBinding("items").filter(oFilters);
                                }
                                that.getModel("oGModel").getProperty("/MaxCount");
                                // sap.ui.core.BusyIndicator.show();
                                var topCount = that.getModel("oGModel").getProperty("/MaxCount");
                                this.getModel("BModel").read("/getUniqueHeader", {
                                    filters: [oFilters],
                                    urlParameters: {
                                        "$skip": that.skip,
                                        "$top": topCount
                                    },
                                    success: function (oData) {
                                        sap.ui.core.BusyIndicator.hide();

                                        if (topCount == oData.results.length) {
                                            that.oFlagCount = "X"

                                            that.skip += parseInt(topCount);
                                            that.aAllGetData = that.aAllGetData.concat(oData.results);
                                            that.onGetData();
                                        } else {
                                            that.skip = 0;
                                            that.aAllGetData = that.aAllGetData.concat(oData.results);
                                        }
                                        var oVBox = that.getView().byId("countUC");
                                        // var sCount = that.aAllGetData.length
                                        // that.byId("idUCuc").setText("Unique ID's" + "(" + sCount + ")")
                                        // sap.ui.getCore().byId("idCharTable").removeSelections();
                                        that._storedCharPayload = []



                                        // oVBox.setVisible(true);

                                        // sap.ui.core.BusyIndicator.hide();
                                        // oData.results = that.aAllGetData
                                        var oUniqData = that.aAllGetData
                                        if (oUniqData.length) {
                                            that.newJModel = new JSONModel();
                                            that.newJModel.setSizeLimit(oUniqData.length);
                                            that.byId("idMatVHeadUC").setModel(that.newJModel);

                                            oUniqData.forEach(function (row) {
                                                if (row.EX_IDENTIFICATION !== ' ' && row.EX_IDENTIFICATION !== null && row.EX_IDENTIFICATION !== undefined) {
                                                    row.UNIQUEID_DESC = row.EX_IDENTIFICATION + ":" + row.UNIQUE_DESC;
                                                } else {
                                                    row.UNIQUEID_DESC = row.UNIQUE_DESC;
                                                }
                                            }, that);

                                            let pCount = oUniqData.filter(item => item.UID_TYPE === "P").length;
                                            let UCount = oUniqData.filter(item => item.UID_TYPE === "U").length;
                                            that.byId("pCountTextUC").setText("Primary Count: " + pCount + " " + " ");
                                            that.byId("oUniqueCountTextUC").setText("  Unique Count: " + UCount)
                                            //   let oUniqueCount = pCount + pSCount

                                            // let pCountText = that.getView().byId("pCountTextUC");
                                            // let oUniqueCountText = that.getView().byId("oUniqueCountTextUC");

                                            // if (pCountText) {
                                            //     pCountText.setText("Primary Count: " + pCount + " " + " ");
                                            // } else {
                                            //     console.error("pCountText not found in the view!");
                                            // }

                                            // if (oUniqueCountText) {
                                            //     oUniqueCountText.setText("  Unique Count: " + UCount);
                                            // } else {
                                            //     console.error("oUniqueCountText not found in the view!");
                                            // }

                                            // that.getView().byId("countUC").removeStyleClass("hiddenBox");

                                            // that.getView().byId("count").setVisible(true);

                                            const removeDuplicates = (array) => {
                                                const uniqueObjects = [];
                                                array.forEach((obj) => {
                                                    // Check if there is an object with the same char name and char value
                                                    const isDuplicate = uniqueObjects.some(
                                                        (uniqueObj) =>
                                                            uniqueObj.UNIQUE_ID === obj.UNIQUE_ID &&
                                                            uniqueObj.UID_TYPE === obj.UID_TYPE
                                                    );
                                                    // If not a duplicate, add it to the uniqueObjects array
                                                    if (!isDuplicate) {
                                                        uniqueObjects.push(obj);
                                                    }
                                                });
                                                return uniqueObjects;
                                            };
                                            var result = removeDuplicates(oUniqData);


                                            that.oModel.setData({
                                                results: result,
                                            });
                                            oGModel.setProperty("/uniqueData", oUniqData);
                                            that.byId("idMatVHeadUC").setModel(that.oModel);
                                            // that.onIconHide();
                                            // that.updateIconStates();
                                            that.getFutureDemand();
                                            // that.getPUIDs();
                                            oGModel.setProperty("/prdId", oUniqData[0].PRODUCT_ID);
                                            oGModel.setProperty("/uniqId", oUniqData[0].UNIQUE_ID);
                                            oGModel.setProperty("/uniqIdDesc", oUniqData[0].UNIQUEID_DESC);
                                            oGModel.setProperty("/uid_rate", oUniqData[0].UID_RATE);
                                            that.byId("idMatVHeadUC").setSelectedItem(that.byId("idMatVHeadUC").getItems()[0], true);
                                            // that.byId("idCreateBtnUC").setVisible(true);
                                            // that.byId("idCopyBtnUC").setVisible(true);
                                        } else {
                                            that.oModel.setData({
                                                results: [],
                                            });
                                            oGModel.setProperty("/uniqueData", oUniqData);
                                            that.byId("idMatVHeadUC").setModel(that.oModel);
                                            MessageToast.show("No data for the selected Product");
                                        }
                                        // that.byId("idCreateBtnUC").setVisible(true);
                                        // that.byId("idCopyBtnUC").setVisible(true);
                                        if (that.byId("idUComb").getSelectedItems().length > 0) {
                                            that.onSelectCharacteristic()
                                        }
                                        else {
                                            oGModel.setProperty("/CharName", [])
                                            oGModel.setProperty("/setTable", oUniqData)
                                            that.onhandlePress();
                                        }

                                        // that.saveDefaultVariant();
                                    },
                                    error: function () {
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageToast.show("Failed to get data");
                                    },
                                });
                            }
                            sap.ui.core.BusyIndicator.hide();
                        }.bind(this),
                        error: function () {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show("Error while fetching roles access");
                        }
                    });


                }


            },

            onIconHide: function () {
                var oTable = this.byId("idMatVHeadUC");
                var aItems = oTable.getItems();
                var oLoc = that.byId("prodInputUC").getValue();
                var oFilters = [];
                that.irecPerPage = 30000;
                that.iSkipRecords = 0;
                var sFilter = new sap.ui.model.Filter({
                    path: "REF_PRODID",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: oLoc,
                });
                oFilters.push(sFilter);

                that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
                    filters: oFilters,
                    urlParameters: {
                        $top: that.irecPerPage,
                        $skip: that.iSkipRecords
                    },
                    success: function (oData) {
                        var oDummydata = oData.results;
                        var dummyValues = oDummydata.map(function (item) {
                            return item.UNIQUE_ID;
                        });
                        for (var i = 0; i < aItems.length; i++) {
                            var row = aItems[i];
                            var cells = row.getCells();

                            for (var k = 0; k < cells.length; k++) {
                                if (k === 0) {
                                    var cellValue = parseInt(cells[0].getTitle());
                                    if (oDummydata.length > 0 && dummyValues.includes(cellValue)) {
                                        cells[5].setEnabled(false);
                                    } else if (cells[2].getText() === "Primary") {
                                        cells[4].setEnabled(false);
                                        cells[5].setEnabled(false);
                                    } else {
                                        cells[4].setEnabled(true);
                                        cells[5].setEnabled(true);
                                    }
                                }
                            }
                        }
                    },
                    error: function (oRes) {
                        MessageToast.show("Error");
                        that.buttonPressed = false;
                        sap.ui.core.BusyIndicator.hide();
                    },
                });
            },

            onPressDelete: function (oEvent) {
                that.byId("idMatSearchUC").setValue("")
                that.oDelFlag = true;
                var oTable = that.getView().byId("idMatVHeadUC");
                var oModel = oTable.getModel();
                var aItems = oTable.getItems();
                that.oCells = [];
                var obj = oEvent.getSource().getBindingContext().getObject();

                if (obj != undefined) {
                    var sText = "Do you want to delete UNIQUE_ID: " + parseInt(obj.UNIQUE_ID);
                    sap.m.MessageBox.warning(sText, {
                        title: "Delete",
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.YES) {
                                // Perform the delete operation
                                this.getOwnerComponent().getModel("BModel").callFunction("/changeUnique", {
                                    method: "GET",
                                    urlParameters: {
                                        PRODUCT_ID: obj.PRODUCT_ID,
                                        UNIQUE_ID: parseInt(obj.UNIQUE_ID),
                                        UID_TYPE: obj.UID_TYPE,
                                        UNIQUE_DESC: obj.UNIQUE_DESC,
                                        ACTIVE: obj.ACTIVE,
                                        FLAG: "D",
                                        EX_IDENTIFICATION: obj.EX_IDENTIFICATION,
                                        VALID_FROM: obj.VALID_FROM,
                                        VALID_TO: obj.VALID_TO
                                    },
                                    success: function (oData) {
                                        that.oDeleteid = oData.results;

                                        // Remove the item from the model immediately
                                        var oItem = oEvent.getSource().getParent(); // Assuming the delete icon is inside a row
                                        var sPath = oItem.getBindingContext().getPath();

                                        // Remove the data from the model's data
                                        var aData = oModel.getProperty("/results");
                                        var iIndex = sPath.split("/").pop();
                                        aData.splice(iIndex, 1);

                                        // Refresh the model to reflect the changes
                                        oModel.refresh();

                                        // Optionally update the model and set it to the table again
                                        var oTModel = new sap.ui.model.json.JSONModel({
                                            results: aData
                                        });
                                        oTable.setModel(oTModel);
                                        //   that.onGetData();
                                        that.updateIconStates();
                                        MessageToast.show("Succesfully deleted.")

                                        // Select the first item in the table and show its details
                                        var aItems = oTable.getItems();
                                        if (aItems.length > 0) {
                                            oTable.setSelectedItem(aItems[0], true);
                                            // Directly call onhandlePress with the first item
                                            that.onhandlePress({
                                                getSource: function () {
                                                    return aItems[0];
                                                }
                                            });
                                        }
                                    },
                                    error: function (oData, error) {
                                        MessageToast.show("Error while deleting.");
                                    }
                                });
                            }
                        }.bind(this)
                    });
                }
            },

            onhandlePress: function (oEvent) {
                oGModel = this.getModel("oGModel");
                var sSelItem;

                if (oEvent || that.Flag === "S") {
                    if (oEvent) {
                        var oSelectedItem = oEvent.getSource().getSelectedItem ? oEvent.getSource().getSelectedItem() : oEvent.getSource();
                        sSelItem = oSelectedItem.getBindingContext().getObject();

                        // Set the selected values to get the details
                        oGModel.setProperty("/prdId", sSelItem.PRODUCT_ID);
                        oGModel.setProperty("/uniqId", sSelItem.UNIQUE_ID);
                        oGModel.setProperty("/uniqIdDesc", sSelItem.UNIQUEID_DESC);
                        oGModel.setProperty("/uid_rate", sSelItem.UID_RATE);
                        oGModel.setProperty("/uid_active", sSelItem.ACTIVE);
                    } else {
                        var oLocationList = that.byId("idMatVHeadUC");
                        var oFirstItem = oLocationList.getModel().getData().results[0]
                        // Set the selected values to get the details
                        oGModel.setProperty("/prdId", oFirstItem.PRODUCT_ID);
                        oGModel.setProperty("/uniqId", oFirstItem.UNIQUE_ID);
                        oGModel.setProperty("/uniqIdDesc", oFirstItem.UNIQUEID_DESC);
                        oGModel.setProperty("/uid_rate", oFirstItem.UID_RATE);
                        oGModel.setProperty("/uid_active", oFirstItem.ACTIVE);
                    }

                }

                // Calling Item Detail page
                that.getOwnerComponent().runAsOwner(function () {
                    if (!that.oDetailView) {
                        try {
                            that.oDetailView = sap.ui.view({
                                viewName: "vcpapp.vcpuniquecharacteristics.view.ItemDetail",
                                type: "XML",
                            });
                            that.bus.publish("flexible", "addDetailPage", that.oDetailView);
                            that.bus.publish("nav", "toDetailPage", {
                                viewName: that.oDetailView.getViewName(),
                            });
                        } catch (e) {
                            that.oDetailView.onAfterRendering();
                        }
                    } else {
                        that.bus.publish("nav", "toDetailPage", {
                            viewName: that.oDetailView.getViewName(),
                        });
                    }
                });
            },



            // onPressDelete: function (oEvent) {
            //     that.oDelFlag = true;
            //     var oTable = that.getView().byId("idMatVHeadUC");
            //     var oModel = oTable.getModel();
            //     var aItems = oTable.getItems();
            //     that.oCells = [];
            //     var obj = oEvent.getSource().getBindingContext().getObject();

            //     if (obj != undefined) {
            //         var sText = "Do you want to delete UNIQUE_ID: " + parseInt(obj.UNIQUE_ID);
            //         sap.m.MessageBox.warning(sText, {
            //             title: "Delete",
            //             actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
            //             onClose: function (oAction) {
            //                 if (oAction === sap.m.MessageBox.Action.YES) {
            //                     // Perform the delete operation
            //                     this.getOwnerComponent().getModel("BModel").callFunction("/changeUnique", {
            //                         method: "GET",
            //                         urlParameters: {
            //                             PRODUCT_ID: obj.PRODUCT_ID,
            //                             UNIQUE_ID: parseInt(obj.UNIQUE_ID),
            //                             UID_TYPE: obj.UID_TYPE,
            //                             UNIQUE_DESC: obj.UNIQUE_DESC,
            //                             ACTIVE: obj.ACTIVE,
            //                             FLAG: "D",
            //                             EX_IDENTIFICATION: obj.EX_IDENTIFICATION,
            //                             VALID_FROM: obj.VALID_FROM,
            //                             VALID_TO: obj.VALID_TO
            //                         },
            //                         success: function (oData) {
            //                             that.oDeleteid = oData.results;

            //                             // Remove the item from the model immediately
            //                             var oItem = oEvent.getSource().getParent(); // Assuming the delete icon is inside a row
            //                             var sPath = oItem.getBindingContext().getPath();

            //                             // Remove the data from the model's data
            //                             var aData = oModel.getProperty("/results");
            //                             var iIndex = sPath.split("/").pop();
            //                             aData.splice(iIndex, 1);

            //                             // Refresh the model to reflect the changes
            //                             oModel.refresh();

            //                             // Optionally update the model and set it to the table again
            //                             var oTModel = new sap.ui.model.json.JSONModel({
            //                                 results: aData
            //                             });
            //                             oTable.setModel(oTModel);

            //                             // Select the first item in the table
            //                             var aItems = oTable.getItems();
            //                             if (aItems.length > 0) {
            //                                 oTable.setSelectedItem(aItems[0], true);
            //                                 // Call the handle press function with the event of the first item
            //                                 var oFirstItemEvent = {
            //                                     getSource: function () {
            //                                         return aItems[0];
            //                                     }
            //                                 };
            //                                 that.onhandlePress(oFirstItemEvent);
            //                                 that.onhandlePress();
            //                             }

            //                             // Optionally perform additional actions after deletion
            //                         },
            //                         error: function (oData, error) {
            //                             MessageToast.show("Error while deleting.");
            //                         }
            //                     });
            //                 }
            //             }.bind(this)
            //         });
            //     }
            // },


            // onPressDelete: function (oEvent) {
            //     that.oDelFlag = true;
            //     var oTable = that.getView().byId("idMatVHeadUC");
            //     var oModel = oTable.getModel();
            //     var aItems = oTable.getItems();
            //     that.oCells = [];
            //     var obj = oEvent.getSource().getBindingContext().getObject();

            //     if (obj != undefined) {
            //         var sText = "Do you want to delete UNIQUE_ID: " + parseInt(obj.UNIQUE_ID);
            //         sap.m.MessageBox.warning(sText, {
            //             title: "Delete",
            //             actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
            //             onClose: function (oAction) {
            //                 if (oAction === sap.m.MessageBox.Action.YES) {
            //                     // Perform the delete operation
            //                     this.getOwnerComponent().getModel("BModel").callFunction("/changeUnique", {
            //                         method: "GET",
            //                         urlParameters: {
            //                             PRODUCT_ID: obj.PRODUCT_ID,
            //                             UNIQUE_ID: parseInt(obj.UNIQUE_ID),
            //                             UID_TYPE: obj.UID_TYPE,
            //                             UNIQUE_DESC: obj.UNIQUE_DESC,
            //                             ACTIVE: obj.ACTIVE,
            //                             FLAG: "D",
            //                             EX_IDENTIFICATION: obj.EX_IDENTIFICATION,
            //                             VALID_FROM: obj.VALID_FROM,
            //                             VALID_TO: obj.VALID_TO
            //                         },
            //                         success: function (oData) {
            //                             that.oDeleteid = oData.results;

            //                             // Remove the item from the model immediately
            //                             var oItem = oEvent.getSource().getParent(); // Assuming the delete icon is inside a row
            //                             var sPath = oItem.getBindingContext().getPath();

            //                             // Remove the data from the model's data
            //                             var aData = oModel.getProperty("/results");
            //                             var iIndex = sPath.split("/").pop();
            //                             aData.splice(iIndex, 1);

            //                             // Refresh the model to reflect the changes
            //                             oModel.refresh();

            //                             // Optionally update the model and set it to the table again
            //                             var oTModel = new sap.ui.model.json.JSONModel({
            //                                 results: aData
            //                             });
            //                             oTable.setModel(oTModel);
            //                             that.onhandlePress();
            //                             // Update icon states asynchronously to avoid blocking UI updates
            //                             // setTimeout(function () {
            //                             //     that.onGetData();
            //                             // }, 0);
            //                         },
            //                         error: function (oData, error) {
            //                             MessageToast.show("Error while deleting.");
            //                         }
            //                     });
            //                 }
            //             }.bind(this)
            //         });
            //     }
            // },


            // onPressDelete: function (oEvent) {
            //     //      that.byId("save").setEnabled(true);
            //     that.oDelFlag = true
            //     var oTable = that.getView().byId("idMatVHeadUC");
            //     var oModel = oTable.getModel();
            //     var aItems = oTable.getItems();
            //     that.oCells = []
            //     var obj = {};
            //     obj = oEvent.getSource().getBindingContext().getObject()
            //     //    var obj = oEvent.getSource().getBindingContext().getObject();
            //     if (obj != undefined) {
            //         var sText = "Do you want to delete UNIQUE_ID: " + parseInt(obj.UNIQUE_ID);
            //         sap.m.MessageBox.warning(sText, {
            //             title: "Delete",
            //             actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
            //             onClose: function (oAction) {
            //                 if (oAction === sap.m.MessageBox.Action.YES) {
            //                     this.getOwnerComponent().getModel("BModel").callFunction("/changeUnique", {
            //                         method: "GET",
            //                         urlParameters: {
            //                             PRODUCT_ID: obj.PRODUCT_ID,
            //                             UNIQUE_ID: parseInt(obj.UNIQUE_ID),
            //                             UID_TYPE: obj.UID_TYPE,
            //                             UNIQUE_DESC: obj.UNIQUE_DESC,
            //                             ACTIVE: obj.ACTIVE,
            //                             FLAG: "D",
            //                             EX_IDENTIFICATION: obj.EX_IDENTIFICATION,
            //                             VALID_FROM: obj.VALID_FROM,
            //                             VALID_TO: obj.VALID_TO
            //                         },
            //                         success: function (oData) {
            //                             that.oDeleteid = oData.results;
            //                             var oTable = that.getView().byId("idMatVHeadUC");
            //                             var oModel = oTable.getModel();
            //                             var oItem = oEvent.getSource().getParent(); // Assuming the delete icon is inside a row
            //                             var sPath = oItem.getBindingContext().getPath();

            //                             // Remove the data from the model's data
            //                             oModel.getProperty("/results").splice(sPath.split("/").pop(), 1);

            //                             // Refresh the table to reflect the changes
            //                             oTable.getModel().refresh();

            //                             // Optionally update the model and set it to the table again
            //                             var oDat = oTable.getModel().getData().results;
            //                             var oTModel = new sap.ui.model.json.JSONModel({
            //                                 results: oDat
            //                             });
            //                             that.getView().byId("idMatVHeadUC").setModel(oTModel);
            //                             that.onGetData()
            //                          //   that.onAfterRendering();

            //                             // Optionally perform additional actions after deletion
            //                         },
            //                         error: function (oData, error) {
            //                             MessageToast.show("Error while deleting.");
            //                         }
            //                     });
            //                 }
            //                 // Handle NO action if needed
            //             }.bind(this) // Ensure the context of 'this' inside onClose function is correct
            //         });
            //     }

            //     // if (obj.length === 1) {
            //     //     var sText = "Do you want to UNIQUE_ID:" + " " + (parseInt(obj.UNIQUE_ID))
            //     // }
            //     // sap.m.MessageBox.warning(sText, {
            //     //     title: "Delete",
            //     //     sText: sText,
            //     //     actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
            //     //     onClose: function (oAction) {
            //     //         if (oAction === sap.m.MessageBox.Action.YES) {
            //     //             this.getOwnerComponent().getModel("BModel").callFunction("/changeUnique", {
            //     //                 method: "GET",
            //     //                 urlParameters: {
            //     //                     PRODUCT_ID: obj.PRODUCT_ID,
            //     //                     UNIQUE_ID: parseInt(obj.UNIQUE_ID),
            //     //                     UID_TYPE: obj.UID_TYPE,
            //     //                     UNIQUE_DESC: obj.UNIQUE_DESC,
            //     //                     ACTIVE: obj.ACTIVE,
            //     //                     FLAG: "D",
            //     //                     EX_IDENTIFICATION: obj.EX_IDENTIFICATION,
            //     //                     VALID_FROM: obj.VALID_FROM,
            //     //                     VALID_TO: obj.VALID_TO
            //     //                 },

            //     //                 success: function (oData) {
            //     //                     that.oDeleteid = oData.results
            //     //                     var oTable = that.getView().byId("idMatVHeadUC");
            //     //                     that.oTab = that.getView().byId("idMatVHeadUC")
            //     //                     var oModel = oTable.getModel();

            //     //                     var oItem = oEvent.getSource().getParent(); // Assuming the delete icon is inside a row

            //     //                     // Get the binding context of the row
            //     //                     var sPath = oItem.getBindingContext().getPath();

            //     //                     // Remove the data from the model's data
            //     //                     oModel.getProperty("/results").splice(sPath.split("/").pop(), 1);

            //     //                     // Refresh the table to reflect the changes
            //     //                     oTable.getModel().refresh();
            //     //                     var oDat = oTable.getModel().getData().results

            //     //                     var oTModel = new sap.ui.model.json.JSONModel({
            //     //                         results: oDat
            //     //                     });

            //     //                     that.getView().byId("idMatVHeadUC").setModel(oTModel);
            //     //                     //      that.onDel();

            //     //                 },
            //     //                 error: function (oData, error) {
            //     //                     MessageToast.show("error");
            //     //                 },
            //     //             });
            //     //         }
            //     //     }
            //     // })

            // },


            onDel: function () {
                var oTable = that.getView().byId("idMatVHeadUC");
                var oDat = oTable.getModel().getData().results
                var oCModel = that.getOwnerComponent().getModel("BModel");
                var obj = that.oDeleteid
                var sFilters = [];
                var sFilter = new sap.ui.model.Filter({
                    path: "UNIQUE_ID",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: obj.UNIQUE_ID
                });
                sFilters.push(sFilter);
                oCModel.callFunction("/maintainUniqueChar", {
                    filters: sFilters,
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        //  sap.m.MessageToast.show(oData.maintainUniqueChar);
                        that.onGetData();

                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Error");
                    },
                });

            },


            // onIconHide: function () {
            //     var oTable = this.byId("mytable");
            //     var aItems = oTable.getItems();
            //     var oEFilters = [];
            //     var oDummydata
            //  //   var oValue = that.oGModel.getProperty("/ClikedData");

            //     for (var i = 0; i < aItems.length; i++) {
            //         var row = aItems[i];
            //         var cells = row.getCells();
            //         var eFilter = new sap.ui.model.Filter({
            //             path: "CHAR_VALUE",
            //             operator: sap.ui.model.FilterOperator.EQ,
            //             value1: cells[2].getValue(),
            //         });
            //         oEFilters.push(eFilter);
            //     }

            //     eFilter = new sap.ui.model.Filter({
            //         path: "CHAR_NAME",
            //         operator: sap.ui.model.FilterOperator.EQ,
            //         value1: oValue['CHAR_NAME']
            //     });
            //     oEFilters.push(eFilter);
            //     this.getOwnerComponent().getModel("BModel").read("/getSalesh", {
            //         filters: oEFilters,
            //         success: function (oData) {
            //             oDummydata = oData.results
            //             // Preprocess oDummydata to avoid redundant iterations
            //             var dummyValues = oDummydata.map(function (item) {
            //                 return item.CHAR_VALUE;
            //             });

            //             // Iterate through each row in the table
            //             for (var i = 0; i < aItems.length; i++) {
            //                 var row = aItems[i];
            //                 var cells = row.getCells();

            //                 // Set editable property for cells in the row
            //                 for (var k = 0; k < cells.length; k++) {
            //                     if (k === 2) {
            //                         var cellValue = cells[2].getValue();
            //                         if (oDummydata.length > 0 && dummyValues.includes(cellValue)) {
            //                             cells[4].setEnabled(false);
            //                             //   cells[4].setVisible(false);
            //                         } else {
            //                             cells[4].setEnabled(true);
            //                         }
            //                     }
            //                 }
            //             }

            //         },
            //         error: function (oData, error) {
            //             MessageToast.show("error");
            //         },
            //     });
            // },

            /**
             * Called when it routes to a page containing the item details.
             */
            // onhandlePress: function (oEvent) {
            //     oGModel = this.getModel("oGModel");
            //     var sSelItem;
            //     if (oEvent) {
            //         sSelItem = oEvent.getSource().getSelectedItem().getBindingContext().getObject();
            //         // oEvent.getSource().getBindingContext().getObject();
            //         // Set the selected values to get the details
            //         oGModel.setProperty("/prdId", sSelItem.PRODUCT_ID);
            //         // oGModel.setProperty("/locId", sSelItem.LOCATION_ID);
            //         oGModel.setProperty("/uniqId", sSelItem.UNIQUE_ID);
            //         oGModel.setProperty("/uniqIdDesc", sSelItem.UNIQUEID_DESC);
            //         oGModel.setProperty("/uid_rate", sSelItem.UID_RATE);
            //         oGModel.setProperty("/uid_active", sSelItem.ACTIVE);
            //     }
            //     // Calling Item Detail page
            //     that.getOwnerComponent().runAsOwner(function () {
            //         if (!that.oDetailView) {
            //             try {
            //                 that.oDetailView = sap.ui.view({
            //                     viewName: "vcpapp.vcpuniquecharacteristics.view.ItemDetail",
            //                     type: "XML",
            //                 });
            //                 that.bus.publish("flexible", "addDetailPage", that.oDetailView);
            //                 that.bus.publish("nav", "toDetailPage", {
            //                     viewName: that.oDetailView.getViewName(),
            //                 });
            //             } catch (e) {
            //                 that.oDetailView.onAfterRendering();
            //             }
            //         } else {
            //             that.bus.publish("nav", "toDetailPage", {
            //                 viewName: that.oDetailView.getViewName(),
            //             });
            //         }
            //     });
            // },


            // onhandlePress: function (oEvent) {
            //     oGModel = this.getModel("oGModel");
            //     if (oEvent) {
            //         var sSelItem = oEvent.getSource().getSelectedItem().getBindingContext().getObject();
            //         // Set the selected values to get the details
            //         oGModel.setProperty("/prdId", sSelItem.PRODUCT_ID);
            //         // oGModel.setProperty("/locId", sSelItem.LOCATION_ID);
            //         oGModel.setProperty("/uniqId", sSelItem.UNIQUE_ID);
            //         oGModel.setProperty("/uniqIdDesc", sSelItem.UNIQUEID_DESC);
            //         oGModel.setProperty("/uid_rate", sSelItem.UID_RATE);
            //         oGModel.setProperty("/uid_active", sSelItem.ACTIVE);
            //     }
            //     // Calling Item Detail page
            //     that.getOwnerComponent().runAsOwner(function () {
            //         if (!that.oDetailView) {
            //             try {
            //                 that.oDetailView = sap.ui.view({
            //                     viewName: "vcpapp.vcpuniquecharacteristics.view.ItemDetail",
            //                     type: "XML",
            //                 });
            //                 that.bus.publish("flexible", "addDetailPage", that.oDetailView);
            //                 that.bus.publish("nav", "toDetailPage", {
            //                     viewName: that.oDetailView.getViewName(),
            //                 });
            //             } catch (e) {
            //                 that.oDetailView.onAfterRendering();
            //             }
            //         } else {
            //             that.bus.publish("nav", "toDetailPage", {
            //                 viewName: that.oDetailView.getViewName(),
            //             });
            //         }
            //     });
            // },

            /**
             * Called when something is entered into the search field.
             * @param {object} oEvent -the event information.
             */
            onSearch: function (oEvent) {
                var sQuery = oEvent.getParameter("value") || oEvent.getParameter("newValue"),
                    oFilters = [];
                var uCount = 0; var pCount = 0;
                let pCountText = that.getView().byId("pCountTextUC");
                let oUniqueCountText = that.getView().byId("oUniqueCountTextUC");
                //   sap.ui.core.BusyIndicator.show()
                if (sQuery !== "") {
                    oFilters.push(
                        new Filter({
                            filters: [
                                new Filter("UNIQUE_ID", FilterOperator.EQ, sQuery),
                                new Filter("UNIQUE_DESC", FilterOperator.Contains, sQuery)
                            ],
                            and: false,
                        })
                    );
                    that.byId("idMatVHeadUC").getBinding("items").filter(oFilters);
                    
                    var sUnique = that.byId("idMatVHeadUC").getItems()
                    sUnique.map((e => {
                        if (e.getCells()[2].mProperties.text.includes("U")) {
                            uCount++
                        } else {
                            pCount++
                        }
                    }))

                } else {
                    that.byId("idMatVHeadUC").getBinding("items").filter(oFilters);
                    var oTableId = that.byId("idMatVHeadUC");

                    // Clear any previous selection first
                    oTableId.removeSelections();

                    // Get the first item in the table
                    var oTableIstItem = oTableId.getItems()[0];

                    // Select the first item
                    if (oTableIstItem) {
                        oTableId.setSelectedItem(oTableIstItem);
                        that.Flag = "S"
                        that.onhandlePress();
                    }
                    
                   var pCount = that.aAllGetData.filter(item => item.UID_TYPE === "P").length;
                   var uCount = that.aAllGetData.filter(item => item.UID_TYPE === "U").length;

               

                }
                // that.oGModel.setProperty("/scQuery", sQuery)
                // that.oGModel.setPropery("/oSearchFilters",oFilters)
                 if (pCountText) {
                    pCountText.setText("Primary Count: " + pCount + " " + " ");
                } else {
                }

                if (oUniqueCountText) {
                    oUniqueCountText.setText("  Unique Count: " + uCount);
                } else {
                }

                // that.updateIconStates();
                // Select the first item in the table and show its deta ils

            },


            updateIconStates: function () {
                var oTable = this.byId("idMatVHeadUC");
                var aItems = oTable.getItems();
                var oLoc = this.byId("prodInputUC").getValue();
                var oFilters = [];
                var that = this;

                that.irecPerPage = 20000;
                that.iSkipRecords = 0;
                var allResults = [];

                var sFilter = new sap.ui.model.Filter({
                    path: "REF_PRODID",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: oLoc,
                });
                oFilters.push(sFilter);

                function readData() {
                    that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
                        filters: oFilters,
                        urlParameters: {
                            $skip: that.iSkipRecords,
                            $top: that.irecPerPage

                        },
                        success: function (oData) {
                            allResults = allResults.concat(oData.results);

                            if (oData.results.length === that.irecPerPage) {
                                // If the number of records retrieved equals the batch size, fetch the next batch
                                that.iSkipRecords += that.irecPerPage;
                                readData();
                            } else {
                                // All data is retrieved, process the items
                                processItems(allResults);
                            }
                        },
                        error: function (oRes) {
                            MessageToast.show("Error retrieving data");
                            sap.ui.core.BusyIndicator.hide();
                        }
                    });
                }

                function processItems(data) {
                    var dummyValues = data.map(function (item) {
                        return item.UNIQUE_ID;
                    });

                    var changes = [];

                    aItems.forEach(function (row) {
                        var cells = row.getCells();
                        if (cells.length > 0) {
                            var cellTitle = cells[0].getTitle();
                            if (cellTitle) {
                                var cellValue = parseInt(cellTitle);
                                // var currentState4 = cells[4].getEnabled();
                                var currentState5 = cells[5].getEnabled();

                                var newState = !(dummyValues.includes(cellValue) || cells[2].getText() === "Primary");

                                if (currentState5 !== newState) {
                                    // changes.push({ cell: cells[4], enabled: newState });
                                    changes.push({ cell: cells[5], enabled: newState });
                                }
                            }
                        }
                    });

                    // Apply changes in a batch
                    changes.forEach(function (change) {
                        change.cell.setEnabled(change.enabled);
                    });

                    sap.ui.core.BusyIndicator.hide();
                }

                // Start the data retrieval process
                sap.ui.core.BusyIndicator.show();
                readData();
            },



            // updateIconStates: function () {
            //     var oTable = this.byId("idMatVHeadUC");
            //     var aItems = oTable.getItems();
            //     var oLoc = that.byId("prodInputUC").getValue();
            //     var oFilters = [];
            //     that.irecPerPage = 1000;
            //     that.iSkipRecords = 0;
            //     var sFilter = new sap.ui.model.Filter({
            //         path: "REF_PRODID",
            //         operator: sap.ui.model.FilterOperator.EQ,
            //         value1: oLoc,
            //     });
            //     oFilters.push(sFilter);
            // //    sap.ui.core.BusyIndicator.show();

            //     that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
            //         filters: oFilters,
            //         urlParameters: {
            //             $top: that.irecPerPage,
            //             $skip: that.iSkipRecords
            //         },
            //         success: function (oData) {
            //             var oDummydata = oData.results;
            //             var dummyValues = oDummydata.map(function (item) {
            //                 return item.UNIQUE_ID;
            //             });

            //             // Create a batch update to minimize DOM interactions
            //         //    oTable.getModel().setUseBatch(true);
            //             var changes = [];

            //             aItems.forEach(function (row) {
            //                 var cells = row.getCells();
            //                 if (cells.length > 0) {
            //                     var cellTitle = cells[0].getTitle();
            //                     if (cellTitle) {
            //                         var cellValue = parseInt(cellTitle);
            //                         var currentState4 = cells[4].getEnabled();
            //                         var currentState5 = cells[5].getEnabled();

            //                         var newState = !(dummyValues.includes(cellValue) || cells[2].getText() === "Primary");

            //                         if (currentState4 !== newState || currentState5 !== newState ) {
            //                             changes.push({ cell: cells[4], enabled: newState });
            //                             changes.push({ cell: cells[5], enabled: newState });
            //                         }
            //                     }
            //                 }
            //             });


            //             // Apply changes in a batch
            //             changes.forEach(function(change) {
            //                 change.cell.setEnabled(change.enabled);
            //             });

            //             sap.ui.core.BusyIndicator.hide();
            //            // oTable.getModel().setUseBatch(false);
            //         },
            //         error: function (oRes) {
            //             MessageToast.show("Error");
            //             that.buttonPressed = false;
            //             sap.ui.core.BusyIndicator.hide();
            //             oTable.getModel().setUseBatch(false);
            //         },
            //     });
            // },


            // onSearch: function (oEvent) {
            //     var sQuery =
            //         oEvent.getParameter("value") || oEvent.getParameter("newValue"),
            //         oFilters = [];

            //     if (sQuery !== "") {
            //         oFilters.push(
            //             new Filter({
            //                 filters: [
            //                     new Filter("UNIQUE_ID", FilterOperator.EQ, sQuery),
            //                     new Filter("UNIQUE_DESC", FilterOperator.Contains, sQuery)
            //                 ],
            //                 and: false,
            //             })
            //         );
            //     }
            //     that.byId("idMatVHeadUC").getBinding("items").filter(oFilters);
            //   //  that.onIconHide();
            //    // that.onhandlePress();
            //     this.updateIconStates();
            // },

            // updateIconStates: function () {
            //     var oTable = this.byId("idMatVHeadUC");
            //     var aItems = oTable.getItems();
            //     var oLoc = that.byId("prodInputUC").getValue();
            //     var oFilters = [];
            //     that.irecPerPage = 1000;
            //     that.iSkipRecords = 0;
            //     var sFilter = new sap.ui.model.Filter({
            //         path: "REF_PRODID",
            //         operator: sap.ui.model.FilterOperator.EQ,
            //         value1: oLoc,
            //     });
            //     oFilters.push(sFilter);
            //     sap.ui.core.BusyIndicator.show();

            //     that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
            //         filters: oFilters,
            //         urlParameters: {
            //             $top: that.irecPerPage,
            //             $skip: that.iSkipRecords
            //         },
            //         success: function (oData) {
            //             var oDummydata = oData.results;
            //             var dummyValues = oDummydata.map(function (item) {
            //                 return item.UNIQUE_ID;
            //             });

            //             aItems.forEach(function (row) {
            //                 var cells = row.getCells();
            //                 if (cells.length > 0) {
            //                     var cellTitle = cells[0].getTitle();
            //                     if (cellTitle) {
            //                         var cellValue = parseInt(cellTitle);

            //                         if (dummyValues.includes(cellValue) || cells[2].getText() === "Primary") {
            //                             cells[5].setEnabled(false);
            //                         } else {
            //                             cells[5].setEnabled(true);
            //                         }
            //                     }
            //                 }
            //             });
            //             sap.ui.core.BusyIndicator.hide();
            //         },
            //         error: function (oRes) {
            //             MessageToast.show("Error");
            //             that.buttonPressed = false;
            //             sap.ui.core.BusyIndicator.hide();
            //         },
            //     });
            // },
            // updateIconStates: function () {
            //     var oTable = this.byId("idMatVHeadUC");
            //     var aItems = oTable.getItems();
            //     var oLoc = that.byId("prodInputUC").getValue();
            //     var oFilters = [];
            //     that.irecPerPage = 1000;
            //     that.iSkipRecords = 0;
            //     var sFilter = new sap.ui.model.Filter({
            //         path: "REF_PRODID",
            //         operator: sap.ui.model.FilterOperator.EQ,
            //         value1: oLoc,
            //     });
            //     oFilters.push(sFilter);
            //     sap.ui.core.BusyIndicator.show()

            //     that.getOwnerComponent().getModel("BModel").read("/getSalesh", {
            //         filters: oFilters,
            //         urlParameters: {
            //             $top: that.irecPerPage,
            //             $skip: that.iSkipRecords
            //         },
            //         success: function (oData) {

            //             var oDummydata = oData.results;
            //             var dummyValues = oDummydata.map(function (item) {
            //                 return item.UNIQUE_ID;
            //             });

            //             aItems.forEach(function (row) {
            //                 var cells = row.getCells();
            //                 var cellValue = parseInt(cells[0].getTitle());

            //                 if (dummyValues.includes(cellValue) || cells[2].getText() === "Primary") {
            //                     cells[5].setEnabled(false);
            //                 } else {
            //                     cells[5].setEnabled(true);
            //                 }
            //             });
            //             sap.ui.core.BusyIndicator.hide()
            //         },
            //         error: function (oRes) {
            //             MessageToast.show("Error");
            //             that.buttonPressed = false;
            //             sap.ui.core.BusyIndicator.hide();
            //         },
            //     });
            // },

            /**
             * Called when Edit button is clicked in the table.
             * @param {object} oEvent -the event information.
             */

            onEditDesc: function (oEvent) {
                sap.ui.getCore().byId("DPEditUC").setValue();
                var oSelected = oEvent.getSource().getParent().getBindingContext().getObject();
                oGModel.setProperty("/SelectedData", oSelected);
                oGModel.setProperty("/SelectedId", oSelected.UNIQUE_ID);
                oGModel.setProperty("/SelectedDesc", oSelected.UNIQUE_DESC);
                oGModel.setProperty("/SelectedIden", oSelected.EX_IDENTIFICATION);
                oGModel.setProperty("/SelectedURate", oSelected.UID_RATE);
                sap.ui.getCore().byId("DPEditUC").setFrom(oSelected.VALID_FROM);
                sap.ui.getCore().byId("DPEditUC").setTo(oSelected.VALID_TO);
                this._valueHelpDialogDescUpdate.open();
            },

            onCloseDesc: function () {
                this._valueHelpDialogDescUpdate.close();
            },

            onUpdateUniqueDesc: function () {
                var oItem = oGModel.getProperty("/SelectedData");
                var oDesc = sap.ui.getCore().byId("idUniqDescUC").getValue();
                var oIden = sap.ui.getCore().byId("idUniqIdenUC").getValue();
                var sDatesFrom = sap.ui.getCore().byId("DPEditUC").getFrom();
                var sDatesTo = sap.ui.getCore().byId("DPEditUC").getTo();
                var sFromDt = null, sToDt = null;

                sFromDt = '2000-01-01';
                sToDt = '9999-12-31';
                if (oIden == "" || oIden == null || oIden == undefined) {
                    return sap.m.MessageToast.show("Please enter External Identification.")
                }
                // if (sFromDt === '' || sFromDt === null || sFromDt === undefined || 
                // sToDt === '' || sToDt === null || sToDt === undefined) {
                //     return sap.m.MessageToast.show("Please enter Valid From/To dates.")
                // }
                var oActive;
                if (oItem.ACTIVE === true) {
                    oActive = ''; //true;
                } else {
                    oActive = 'X'; //false;
                }
                that.getModel("BModel").callFunction("/changeUnique", {
                    method: "GET",
                    urlParameters: {
                        // LOCATION_ID: oItem.LOCATION_ID,
                        PRODUCT_ID: oItem.PRODUCT_ID,
                        UNIQUE_ID: parseInt(oItem.UNIQUE_ID),
                        UID_TYPE: oItem.UID_TYPE,
                        // UID_RATE: oUniqRate,
                        UNIQUE_DESC: oDesc,
                        ACTIVE: oActive,
                        FLAG: "E",
                        EX_IDENTIFICATION: oIden,
                        VALID_FROM: sFromDt,
                        VALID_TO: sToDt,
                        IS_PLANNING: false
                    },
                    success: function (oData) {
                        that.updateIconStates();
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(oData.changeUnique);
                        that.onCloseDesc();
                        that.onGetData();
                    },
                    error: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Failed to changes the status");
                    },
                });
            },
            // onPressDelete:function(){
            //     var oItem = oGModel.getProperty("/SelectedData");
            //     var oDesc = sap.ui.getCore().byId("idUniqDescUC").getValue();
            //     var oIden = sap.ui.getCore().byId("idUniqIdenUC").getValue();
            //     var sDatesFrom = sap.ui.getCore().byId("DPEditUC").getFrom();
            //     var sDatesTo = sap.ui.getCore().byId("DPEditUC").getTo();
            //     var sFromDt = null, sToDt = null;

            //     sFromDt = '2000-01-01';
            //     sToDt = '9999-12-31';
            //     if (oIden == "" || oIden == null || oIden == undefined) {
            //         return sap.m.MessageToast.show("Please enter External Identification.")
            //     }
            //     var oActive;
            //     if (oItem.ACTIVE === true) {
            //         oActive = ''; //true;
            //     } else {
            //         oActive = 'X'; //false;
            //     }
            //     that.getModel("BModel").callFunction("/changeUnique", {
            //         method: "GET",
            //         urlParameters: {
            //             PRODUCT_ID: oItem.PRODUCT_ID,
            //             UNIQUE_ID: parseInt(oItem.UNIQUE_ID),
            //             UID_TYPE: oItem.UID_TYPE,
            //             // UID_RATE: oUniqRate,
            //             UNIQUE_DESC: oDesc,
            //             ACTIVE: oActive,
            //             FLAG: "D",
            //             EX_IDENTIFICATION: oIden,
            //             VALID_FROM: sFromDt,
            //             VALID_TO: sToDt
            //         },
            //         success: function (oData) {
            //             sap.ui.core.BusyIndicator.hide();
            //             MessageToast.show(oData.changeUnique);
            //             that.onCloseDesc();
            //             that.onGetData();
            //         },
            //         error: function (oData) {
            //             sap.ui.core.BusyIndicator.hide();
            //             MessageToast.show("Failed to changes the status");
            //         },
            //     });
            // },

            onChange: function (oEvent) {
                that.is_Planning = oEvent.getSource().getParent().getCells()[4].getEnabled();

                var oItem = oEvent.getSource().getBindingContext().getObject();
                var oActive;
                if (oItem.ACTIVE === true) {
                    oActive = 'X'; //false;
                    // if(oItem.UID_TYPE === 'P'){
                    //     var uids = that.oPUIDData.filter(id=>id.PRIMARY_ID === parseInt(oItem.UNIQUE_ID));
                    //     uids = that.removeDuplicatevariant(uids,"UNIQUE_ID");
                    //     var uniqueIDdata = that.oUniqueData.filter(obj1 => 
                    //         uids.some(obj2 => obj1.UNIQUE_ID === obj2.UNIQUE_ID && obj1.CIR_QTY>0)
                    //       );
                    // }else{
                    var uniqueIDdata = that.oUniqueData.filter(id => id.UNIQUE_ID === parseInt(oItem.UNIQUE_ID) &&
                        id.CIR_QTY > 0);
                    // }                                          
                    if (uniqueIDdata.length) {
                        var sText = "Forecast orders already exists for the UNIQUE_ID: " + parseInt(oItem.UNIQUE_ID) + ".  Please re-run all planning steps agian.";
                        sap.m.MessageBox.warning(sText, {
                            title: "Confirmation",
                            actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
                            emphasizedAction: sap.m.MessageBox.Action.YES,
                            onClose: function (oAction) {
                                if (oAction === sap.m.MessageBox.Action.YES) {
                                    that.changeUnique(oItem, oActive);
                                }
                                else {
                                    oEvent.getSource().setState(true);
                                }
                            }.bind(this)
                        });
                    }
                    else {
                        that.changeUnique(oItem, oActive);
                    }
                } else {
                    oActive = ''; //true;
                    that.changeUnique(oItem, oActive);
                }
            },

            changeUnique: function (oItem, oActive) {
                that.getModel("BModel").callFunction("/changeUnique", {
                    method: "GET",
                    urlParameters: {
                        // LOCATION_ID: oItem.LOCATION_ID,
                        PRODUCT_ID: oItem.PRODUCT_ID,
                        UNIQUE_ID: parseInt(oItem.UNIQUE_ID),
                        UID_TYPE: oItem.UID_TYPE,
                        UNIQUE_DESC: oItem.UNIQUE_DESC,
                        ACTIVE: oActive,
                        FLAG: "E",
                        EX_IDENTIFICATION: oItem.EX_IDENTIFICATION,
                        VALID_FROM: oItem.VALID_FROM,
                        VALID_TO: oItem.VALID_TO,
                        IS_PLANNING: !that.is_Planning
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(oData.changeUnique);
                        that.onGetData();
                    },
                    error: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Failed to changes the status");
                    },
                });
            },

            onCreateBtn: function () {
                that.selectedArray = [];
                that.oTableData = [];
                sap.ui.getCore().byId("idUniqDesc1UC").setValue("");
                that.ListModel = new JSONModel();
                that.ListModel.setData({
                    results: that.oTableData
                });
                sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                // var oLoctid = this.byId("idloc").getValue();
                var oProdid = this.byId("prodInputUC").getValue(),
                    ouidType = this.byId("idUniqueUC").getSelectedKey();
                // sap.ui.getCore().byId("locId1UC").setValue(oLoctid);
                sap.ui.getCore().byId("prodId1UC").setValue(oProdid);
                oGModel.setProperty("/New", "N");
                sap.ui.getCore().byId("idUniqDesc1UC").setValue("");
                sap.ui.getCore().byId("IDindenUC").setValue("");
                that.oTableData = [];
                that.ListModel = new JSONModel();
                that.ListModel.setData({
                    results: that.oTableData
                });
                sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                if (oProdid) {
                    that._createCharacterstics.open();

                } else {
                    MessageToast.show("Please select  Product");
                }
            },

            onCopyBtn: function (oEvent) {
                // that.selectedArray = [];
                var oData = that.byId("idMatVHeadUC").getSelectedItem();
                if (oData) {
                    var selUniq = oData.getBindingContext().getProperty();
                    // sap.ui.getCore().byId("locId1UC").setValue(selUniq.LOCATION_ID);
                    sap.ui.getCore().byId("prodId1UC").setValue(selUniq.PRODUCT_ID);
                    sap.ui.getCore().byId("idUniqDesc1UC").setValue(selUniq.UNIQUE_DESC);
                    sap.ui.getCore().byId("IDindenUC").setValue(selUniq.EX_IDENTIFICATION);
                    oGModel.setProperty("/New", "C");
                    that.oGModel.setProperty("/copy", "X");
                    that.oGModel.setProperty("/DialogOpen", "X");
                    that.oGModel.setProperty("/setData", "X");
                    that.CharData();
                    that._createCharacterstics.open();
                } else {
                    MessageToast.show("Please select a uniq id to copy");
                }
            },

            CharData: function () {
                sap.ui.core.BusyIndicator.show();
                var adata = [];
                that.oCharData = [];
                that.selectedArray = [];
                var topCount = that.oGModel.getProperty("/MaxCount");
                var sPrdId = this.byId("prodInputUC").getValue();
                if (sPrdId) {
                    this.getModel("BModel").read("/getProdClsChar", {
                        filters: [
                            new Filter("PRODUCT_ID", FilterOperator.EQ, sPrdId),
                        ],
                        urlParameters: {
                            "$skip": that.skip,
                            "$top": topCount
                        },
                        success: function (oData) {
                            if (topCount == oData.results.length) {
                                that.skip += parseInt(topCount);
                                that.oCharData = that.oCharData.concat(oData.results);
                                that.CharData();
                            } else {
                                that.skip = 0;
                                that.oCharData = that.oCharData.concat(oData.results);

                                // that.byId("classSearch").setValue("")
                                // let aItems = that.removeDuplicateforProdClas(that.oclassIbp, "PRODUCT_ID")
                                // var aModel = new JSONModel()
                                // aModel.setData({
                                //     aItems: aItems
                                // })
                                // sap.ui.getCore().byId("idClasProd").setModel(aModel)

                                var array = [];

                                for (i = 0; i < 11; i++) {
                                    array.push(oData.results[i]);
                                }

                                that.oGModel.setProperty("/child", "Y");
                                // that.classNameData = oData.results;
                                // var newClassModel = new JSONModel();
                                // newClassModel.setData({
                                //     results: that.classNameData
                                // });
                                // sap.ui.getCore().byId("classNameList").setModel(newClassModel);

                                // for (var i = 0; i < oData.results.length; i++) {
                                //     adata.push({
                                //         "Description": oData.results[i].CLASS_NAME,
                                //         "Class_Desc": oData.results[i].CLASS_DESC,

                                //     });
                                // }
                                // var filadata = adata.filter((obj, pos, arr) => {
                                //     return (
                                //         arr.map((mapObj) => mapObj.Description).indexOf(obj.Description) == pos
                                //     );
                                // });
                                // var class_names = filadata;
                                // var new_names;
                                // var charData = [];
                                // var flat = {};
                                // var newData = [];

                                // var root = [];
                                // for (var i = 0; i < filadata.length; i++) {
                                //     for (var j = 0; j < oData.results.length; j++) {
                                //         if (filadata[i].Description === oData.results[j].CLASS_NAME) {
                                //             newData.push(oData.results[j]);
                                //             var key = filadata[i].Description;
                                //             flat[key] = newData;
                                //         }
                                //     }

                                //     newData = [];
                                // }
                                // charData = flat;
                                // root = charData;
                                // for (var i in class_names) {
                                //     class_names[i].children = [];
                                // }

                                // for (var k = 0; k < filadata.length; k++) {
                                //     var newFlat = [];
                                //     var newKey = filadata[k].Description;
                                //     for (var s = 0; s < flat[newKey].length; s++) {
                                //         var skey = flat[newKey][s].CHAR_NAME;
                                //         var Char_Desc = flat[newKey][s].CHAR_DESC
                                //         var Char_type = flat[newKey][s].CHAR_TYPE
                                //         newFlat.push({
                                //             "Description": skey,
                                //             "CHAR_DESC": Char_Desc,
                                //             "Char_type": Char_type

                                //         });
                                //     }
                                //     newFlat = newFlat.filter((obj, pos, arr) => {
                                //         return (
                                //             arr.map((mapObj) => mapObj.Description).indexOf(obj.Description) == pos
                                //         );
                                //     });

                                //     // add children container
                                //     for (var i in newFlat) {
                                //         newFlat[i].nodes = [];
                                //     }
                                //     // populate the child container arrays  
                                //     for (var h = 0; h < newFlat.length; h++) {
                                //         for (var l = 0; l < flat[newKey].length; l++) {
                                //             if (newFlat[h].Description === flat[newKey][l].CHAR_NAME) {
                                //                 newFlat[h].nodes.push({
                                //                     "CLASS_NAME": flat[newKey][l].CLASS_NAME,
                                //                     "CHAR_VALUE": flat[newKey][l].CHAR_VALUE,
                                //                     "CHARVAL_DESC": flat[newKey][l].CHARVAL_DESC,
                                //                     "CHAR_NAME": flat[newKey][l].CHAR_NAME,
                                //                     "CHAR_DESC": flat[newKey][l].CHAR_DESC,
                                //                     "CHAR_NUM": flat[newKey][l].CHAR_NUM,
                                //                     "CHARVAL_NUM": flat[newKey][l].CHARVAL_NUM,
                                //                     "Description": flat[newKey][l].CHAR_VALUE,
                                //                     "Class_Desc": flat[newKey][l].CLASS_DESC,
                                //                     "MULTI_CHAR": flat[newKey][l].MULTI_CHAR,
                                //                     "REF_CHAR_NAME": flat[newKey][l].REF_CHAR_NAME,
                                //                     "CHAR_TYPE": flat[newKey][l].CHAR_TYPE,
                                //                     "Selection": false
                                //                 });
                                //             }
                                //         }
                                //     }
                                //     class_names[k].children = newFlat;
                                //     new_names = newFlat;
                                // }

                                // Create an object to hold the hierarchical data
                                const transformedData = {};

                                // Iterate over each item in the flat data
                                oData.results.forEach(item => {
                                    const classKey = item.CLASS_NAME;

                                    // Initialize the class if not already present
                                    if (!transformedData[classKey]) {
                                        transformedData[classKey] = {
                                            CLASS_NAME: item.CLASS_NAME,
                                            CLASS_DESC: item.CLASS_DESC,
                                            CHAR_TYPEGroups: {}
                                        };
                                    }

                                    const charTypeKey = item.CHAR_TYPE;

                                    // Initialize the CHAR_TYPE group if not already present
                                    if (!transformedData[classKey].CHAR_TYPEGroups[charTypeKey]) {
                                        transformedData[classKey].CHAR_TYPEGroups[charTypeKey] = {
                                            CHAR_TYPE: item.CHAR_TYPE,
                                            CHAR_NUMs: {}
                                        };
                                    }

                                    const charNumKey = item.CHAR_NUM;

                                    // Initialize the CHAR_NUM group if not already present
                                    if (!transformedData[classKey].CHAR_TYPEGroups[charTypeKey].CHAR_NUMs[charNumKey]) {
                                        transformedData[classKey].CHAR_TYPEGroups[charTypeKey].CHAR_NUMs[charNumKey] = {
                                            CHAR_NUM: item.CHAR_NUM,
                                            CHAR_NAME: item.CHAR_NAME,
                                            CHAR_DESC: item.CHAR_DESC,
                                            nodes: []
                                        };
                                    }

                                    // Add the characteristic value to the nodes array
                                    transformedData[classKey].CHAR_TYPEGroups[charTypeKey].CHAR_NUMs[charNumKey].nodes.push({
                                        CHAR_VALUE: item.CHAR_VALUE,
                                        CHAR_DESC: item.CHAR_DESC,
                                        Selection: false, // Default selection state, modify if needed
                                        CLASS_NAME: item.CLASS_NAME,
                                        CHARVAL_DESC: item.CHARVAL_DESC,
                                        CHAR_NAME: item.CHAR_NAME,
                                        CHAR_NUM: item.CHAR_NUM,
                                        CHARVAL_NUM: item.CHARVAL_NUM,
                                        Description: item.CHAR_VALUE,
                                        Class_Desc: item.CLASS_DESC,
                                        MULTI_CHAR: item.MULTI_CHAR,
                                        REF_CHAR_NAME: item.REF_CHAR_NAME,
                                        CHAR_TYPE: item.CHAR_TYPE,
                                    });
                                });

                                // Convert the transformed object to an array structure for compatibility with the XML view
                                const hierarchicalData = Object.values(transformedData).map(classItem => ({
                                    ...classItem,
                                    CHAR_TYPEGroups: Object.values(classItem.CHAR_TYPEGroups).map(charTypeGroup => ({
                                        ...charTypeGroup,
                                        CHAR_NUMs: Object.values(charTypeGroup.CHAR_NUMs)
                                    }))
                                }));

                                that.newClassModel = new JSONModel();
                                that.newClassModel.setData(hierarchicalData);
                                that._valueHelpDialogclassName.setModel(that.newClassModel, "oModel");
                                that.newVaryClassModel = new JSONModel();
                                that.newVaryClassModel.setData({ results: hierarchicalData });
                                that.oGModel.setProperty("/mainData", that.newVaryClassModel);
                                sap.ui.core.BusyIndicator.hide();

                                //**Copy Button */
                                if (that.oGModel.getProperty("/copy") === "X") {
                                    var tableDetails = {};
                                    that.oTableData = oGModel.getProperty("/CharData");
                                    that.ListModel = new JSONModel();
                                    var oFilterData = that.oTableData
                                    const removeDuplicates = (array) => {
                                        const uniqueObjects = [];
                                        array.forEach((obj) => {
                                            // Check if there is an object with the same char name and char value
                                            const isDuplicate = uniqueObjects.some(
                                                (uniqueObj) =>
                                                    uniqueObj.CHAR_NAME === obj.CHAR_NAME && uniqueObj.CHAR_VALUE === obj.CHAR_VALUE &&
                                                    uniqueObj.CHARVAL_NUM === obj.CHARVAL_NUM && uniqueObj.CHAR_NUM === obj.CHAR_NUM
                                            );
                                            // If not a duplicate, add it to the uniqueObjects array
                                            if (!isDuplicate) {
                                                uniqueObjects.push(obj);
                                            }
                                        });
                                        return uniqueObjects;
                                    };
                                    var result = removeDuplicates(oFilterData);
                                    oData.results.forEach(item1 => {
                                        result.forEach(item2 => {
                                            if (item2.CHAR_NUM === item1.CHAR_NUM &&
                                                item2.CHAR_VALUE === item1.CHAR_VALUE && item2.CHARVAL_NUM === item1.CHARVAL_NUM
                                            ) {
                                                item2.CHAR_TYPE = item1.CHAR_TYPE;
                                                item2.CLASS_NAME = item1.CLASS_NAME;
                                            }
                                        })
                                    })
                                    that.ListModel.setData({
                                        results: result
                                    });
                                    sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                                    var oItemTable = sap.ui.getCore().byId("idCharItemUC").getModel().getData().results;
                                    for (var i = 0; i < oItemTable.length; i++) {
                                        tableDetails = {
                                            "CHAR_NAME": oItemTable[i].CHAR_NAME,
                                            "CHAR_DESC": oItemTable[i].CHAR_DESC,
                                            "CHAR_NUM": oItemTable[i].CHAR_NUM,
                                            "CHAR_VALUE": oItemTable[i].CHAR_VALUE,
                                            "CHARVAL_DESC": oItemTable[i].CHARVAL_DESC,
                                            "CHARVAL_NUM": oItemTable[i].CHARVAL_NUM,
                                            "CLASS_NAME": oItemTable[i].CLASS_NAME,
                                            "CHAR_TYPE": oItemTable[i].CHAR_TYPE
                                        }
                                        that.selectedArray.push(tableDetails);
                                    }
                                    that.oGModel.setProperty("/copy", "");
                                    var fullData = that.oGModel.getProperty("/mainData");
                                    var oData = that._valueHelpDialogclassName.oModels.oModel.getData();
                                    that.selectedArray.forEach(selectedItem => {
                                        oData.forEach(dataItem => {
                                            if (dataItem.CLASS_NAME === selectedItem.CLASS_NAME) {
                                                dataItem.CHAR_TYPEGroups.forEach(charTypeGroup => {
                                                    if (selectedItem.CHAR_TYPE === charTypeGroup.CHAR_TYPE) {
                                                        charTypeGroup.CHAR_NUMs.forEach(charNum => {
                                                            if (selectedItem.CHAR_NUM === charNum.CHAR_NUM && selectedItem.CHAR_NAME === charNum.CHAR_NAME) {
                                                                charNum.nodes.forEach(node => {
                                                                    if (selectedItem.CHAR_VALUE === node.CHAR_VALUE) {
                                                                        node.Selection = true;
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    });


                                    var newModel1 = new JSONModel();
                                    newModel1.setData(oData);
                                    var charModel = new JSONModel();
                                    charModel.setData({ results: oData });
                                    that._valueHelpDialogclassName.setModel(newModel1, "oModel");
                                    that.oGModel.setProperty("/mainData", charModel);
                                    that._valueHelpDialogclassName.oModels.oModel.refresh();
                                }
                                // else if(that.oGModel.getProperty("/SetModel") === ""){


                                if (that.oGModel.getProperty("/DialogOpen") !== "X") {
                                    that._valueHelpDialogclassName.open();
                                }
                            }

                        },
                        error: function (oData, error) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show("error");
                        },
                    });
                } else {
                    MessageToast.show("Please select product");
                }
            },
            /**
             * 
             */
            onCloseCreate: function () {
                this._createCharacterstics.close();
                sap.ui.getCore().byId("DRS1UC").setValue();
                that.oGModel.setProperty("/setData", "");
                sap.ui.getCore().byId("idCharSearchUC").setValue();
            },

            onCloseCopy: function () {
                this._copyCharacterstics.close();
                sap.ui.getCore().byId("DRS1UC").setValue();
            },


            onAddChar: function () {

                if (that.oGModel.getProperty("/setData") === "" || that.oGModel.getProperty("/setData") === undefined) {
                    that.oGModel.setProperty("/DialogOpen", "");
                    that.oGModel.setProperty("/SetModel", "Y");
                    that.CharData();
                    sap.ui.getCore().byId("_IDGenPanel1UC").setExpanded(true);
                    sap.ui.getCore().byId("_IDGenPanel2UC").setExpanded(true);
                    sap.ui.getCore().byId("idCharSearchUC").setValue();
                }
                else {
                    that._valueHelpDialogclassName.oModels.oModel.refresh();
                    that._valueHelpDialogclassName.open();
                }
                // sap.ui.getCore().byId("idCharSearchUC").setValue();

                // jQuery.sap.delayedCall(300, null, function () {
                //     sap.ui.getCore().byId("idCharSearchUC").focus();
                // })
            },

            handleCharSelection: function (oEvent) {
                that.oGModel = that.getModel("oGModel");
                var tableDetails = {};
                var selectedItems = that.selectedArray;
                that.ListModel = new JSONModel();
                that.ListModel.setData({
                    results: selectedItems
                });
                sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);

                that.oGModel.setProperty("/setData", "X");
                that.oGModel.setProperty("/arrayFlag", "X");
                that._valueHelpDialogclassName.close();
            },

            onClassClose: function () {
                var newModel = new JSONModel();
                newModel.setData([]);
                that._valueHelpDialogclassName.setModel(newModel);
                this._valueHelpDialogclassName.close();
                that.classSelClose();
            },

            handleCharSearch: function (oEvent) {
                let sQuery = oEvent.getSource().getValue();
                if (sQuery.length > 0) {
                    sap.ui.getCore().byId("_IDGenPanel2UC").setExpanded(true);
                    let originalModel = that.oGModel.getProperty("/mainData");
                    let originalDataCopy = JSON.parse(JSON.stringify(originalModel.oData.results));
                    let filtered = originalDataCopy.filter(topGroup => {
                        // Filter second level groups
                        let filteredMidGroups = topGroup.CHAR_TYPEGroups.filter(midGroup => {
                            // Filter last Level
                            let filteredChareElements = midGroup.CHAR_NUMs.filter(singleElement => {
                                let filtFinalEl = singleElement.nodes.filter(finalEl => {
                                    let search = sQuery.toLowerCase();
                                    let valueFound = (
                                        finalEl.CLASS_NAME.toLowerCase().includes(search) ||
                                        finalEl.CHAR_NAME.toLowerCase().includes(search) ||
                                        finalEl.CHAR_VALUE.toLowerCase().includes(search)
                                    );
                                    return valueFound;
                                });
                                singleElement.nodes = filtFinalEl;
                                return (filtFinalEl.length > 0);
                            });
                            midGroup.CHAR_NUMs = filteredChareElements;
                            return (filteredChareElements.length > 0);
                        });
                        topGroup.children = filteredMidGroups;
                        return (filteredMidGroups.length > 0);
                    });
                    var classnames = filtered;
                    let newModel = new JSONModel();
                    newModel.setData(classnames);
                    that._valueHelpDialogclassName.setModel(newModel, "oModel");
                } else {
                    sap.ui.getCore().byId("_IDGenPanel2UC").setExpanded(true);
                    let newModel = new JSONModel();
                    newModel.setData(that.oGModel.getProperty("/mainData").oData.results);
                    that._valueHelpDialogclassName.setModel(newModel, "oModel");
                }
            },

            handleCharClose: function (oEvent) {
                var sId = oEvent.getParameter("id");
                if (sId.includes("className")) {
                    that._oCore.byId(this.getId() + "-searchField").setValue("");
                    if (that.oClassnameList.getBinding("items")) {
                        that.oClassnameList.getBinding("items").filter([]);
                    }
                } else if (sId.includes("charName")) {
                    that._oCore
                        .byId(this._valueHelpDialogcharName.getId() + "-searchField")
                        .setValue("");
                    if (that.oCharnameList.getBinding("items")) {
                        that.oCharnameList.getBinding("items").filter([]);
                    }
                } else if (sId.includes("charVal")) {
                    that._oCore
                        .byId(this._valueHelpDialogcharValue.getId() + "-searchField")
                        .setValue("");
                    if (that.oCharvalueList.getBinding("items")) {
                        that.oCharvalueList.getBinding("items").filter([]);
                    }
                }
            },

            onCloseRestItem: function () {
                sap.ui.getCore().byId("idClassname2UC").setValue("");
                sap.ui.getCore().byId("idCharname2UC").setValue("");
                sap.ui.getCore().byId("idCharval2UC").setValue("");
                that._addCharacteristic.close();
            },

            onAdd: function () {
                var charName = sap.ui.getCore().byId("idCharname2UC").getValue(),
                    charNum = sap.ui.getCore().byId("idCharno2UC").getValue(),
                    charVal_Name = sap.ui.getCore().byId("idCharval2UC").getValue(),
                    charVal_Num = sap.ui.getCore().byId("idCharvalno2UC").getValue(),
                    className = sap.ui.getCore().byId("idClassname2UC").getValue();
                if (charName !== "" && charVal_Name !== "" && className !== "") {
                    this.oData = {
                        "CLASS_NAME": className,
                        "CHAR_NAME": charName,
                        "CHAR_NUM": charNum,
                        "CHAR_VALUE": charVal_Name,
                        "CHARVAL_NUM": charVal_Num,
                        "OFLAG": "X",
                    };
                    var oItemTable = sap.ui.getCore().byId("idCharItemUC").getItems();
                    var count = 0;
                    for (var i = 0; i < oItemTable.length; i++) {
                        if (oItemTable[i].getCells()[1].getText() === charNum &&
                            oItemTable[i].getCells()[3].getText() === charVal_Num) {
                            count = count + 1;
                        }
                    }
                    if (count === 0) {
                        // Add entry to the table model
                        that.oTableData.push(that.oData);
                        that.ListModel = new JSONModel();
                        that.ListModel.setData({
                            results: that.oTableData
                        });
                        sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                        that._addCharacteristic.close();
                    } else {
                        sap.m.MessageToast.show("Characterstic is already maintained");
                    }
                } else {
                    MessageToast.show("Please fill all inputs");
                }
            },

            onTabDel: function (oEvent) {
                var selItem = oEvent.getSource().getParent().getBindingContext().getObject();
                var model = that.oGModel.getProperty("/mainData");

                // for (var i = 0; i < model.oData.length; i++) {
                //     if (model.oData[i].Description === selItem.CLASS_NAME) {
                //         for (var j = 0; j < model.oData[i].children.length; j++) {
                //             if (model.oData[i].children[j].Description === selItem.CHAR_NAME) {
                //                 for (var k = 0; k < model.oData[i].children[j].nodes.length; k++) {
                //                     if (model.oData[i].children[j].nodes[k].CHAR_VALUE === selItem.CHAR_VALUE
                //                         && model.oData[i].children[j].nodes[k].CHAR_NUM === selItem.CHAR_NUM
                //                         && model.oData[i].children[j].nodes[k].CLASS_NAME === selItem.CLASS_NAME
                //                     ) {
                //                         model.oData[i].children[j].nodes[k].Selection = false;
                //                         break;
                //                     }
                //                 }
                //                 break;
                //             }
                //         }
                //         break;
                //     }
                // }
                model.oData.results.forEach(classItem => {
                    if (classItem.CLASS_NAME === selItem.CLASS_NAME) {
                        classItem.CHAR_TYPEGroups.forEach(charTypeGroup => {
                            if (charTypeGroup.CHAR_TYPE === selItem.CHAR_TYPE) {
                                charTypeGroup.CHAR_NUMs.forEach(charNum => {
                                    if (charNum.CHAR_NUM === selItem.CHAR_NUM) {
                                        charNum.nodes.forEach(node => {
                                            if (node.CHAR_VALUE === selItem.CHAR_VALUE) {
                                                node.Selection = false;
                                                return; // Exit loop when a match is found
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });


                var i = 0;
                while (i < that.selectedArray.length) {
                    if (that.selectedArray[i].CHAR_VALUE === selItem.CHAR_VALUE && that.selectedArray[i].CHAR_DESC === selItem.CHAR_DESC &&
                        that.selectedArray[i].CHAR_NUM === selItem.CHAR_NUM &&
                        that.selectedArray[i].CLASS_NAME === selItem.CLASS_NAME
                    ) {
                        that.selectedArray.splice(i, 1);
                    } else {
                        ++i;
                    }
                }
                that.ListModel.setData({ results: that.selectedArray });
                sap.ui.getCore().byId("idCharItemUC").setModel(that.ListModel);
                that.oGModel.setProperty("/mainData", model);
                that.oGModel.setProperty("/setData", "X");
                that._valueHelpDialogclassName.oModels.oModel.refresh();

            },

            onCreateUniq: function () {
                var Charlist;
                var oEntry = {
                    RTRCHAR: []
                };
                var
                    //  olocID = sap.ui.getCore().byId("locId1UC").getValue(),
                    oprodID = sap.ui.getCore().byId("prodId1UC").getValue(),
                    ouniqID = 1,
                    ouniqDesc = sap.ui.getCore().byId("idUniqDesc1UC").getValue(),
                    ouniqTID = sap.ui.getCore().byId("idComboBox1UC").getValue(),
                    ouniqRID = sap.ui.getCore().byId("uidRId1UC").getValue(),
                    oactID = sap.ui.getCore().byId("idComboBoxUC").getValue(),
                    oIdentification = sap.ui.getCore().byId("IDindenUC").getValue(),
                    flag = 'C',
                    count = 0;
                var sDates = sap.ui.getCore().byId("DRS1UC").getValue(), sFromDt = null, sToDt = null;
                // if (sDates) {
                //     function convertDate(inputFormat, joinBy) {
                //         function pad(s) {
                //             return (s < 10) ? '0' + s : s;
                //         }
                //         var d = new Date(inputFormat)
                //         return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(joinBy)
                //     }
                //     sFromDt = convertDate(sDates.split("-")[0].trim(), '-');
                //     sToDt = convertDate(sDates.split("-")[1].trim(), '-');
                // }
                sFromDt = '2000-01-01';
                sToDt = '9999-12-31';
                if (oactID === "True") {
                    oactID = '';
                } else {
                    oactID = 'X';
                }
                var aTabledata = sap.ui.getCore().byId("idCharItemUC").getItems();
                var Flag = oGModel.getProperty("/New");
                //   return false;
                if (aTabledata.length === 0) {
                    return sap.m.MessageToast.show("Please select atleast one characteristic")
                }
                if (oIdentification === '' || oIdentification === null || oIdentification === undefined) {
                    return sap.m.MessageToast.show("Please enter External Identification.")
                }
                // if (sDates === '' || sDates === null || sDates === undefined) {
                //     return sap.m.MessageToast.show("Please enter Valid From/To dates.")
                // }
                var count = 0;
                for (var i = 0; i < aTabledata.length; i++) {
                    var aData = aTabledata[i].getBindingContext().getObject();
                    if (aData.CHAR_TYPE === "P") {
                        count++;
                    }
                    Charlist = {
                        // LOCATION_ID: olocID,
                        PRODUCT_ID: oprodID,
                        UNIQUE_ID: ouniqID,
                        UNIQUE_DESC: ouniqDesc,
                        CHAR_NUM: aData.CHAR_NUM,
                        CHARVAL_NUM: aData.CHARVAL_NUM,
                        CHAR_VALUE: aData.CHAR_VALUE,
                        externalIdentification: oIdentification,
                        validFrom: sFromDt,
                        validTo: sToDt,
                        MULTI_CHAR: aData.MULTI_CHAR,
                        REF_CHAR_NAME: aData.REF_CHAR_NAME,
                        characteristic: aData.CHAR_NUM,
                        characteristicValue: aData.CHARVAL_NUM,
                        UID_TYPE: aData.CHAR_TYPE
                    }
                    oEntry.RTRCHAR.push(Charlist);
                }
                sap.ui.core.BusyIndicator.show();
                if (count === 0) {
                    sap.ui.core.BusyIndicator.hide();
                    return MessageToast.show("No Primary Characteristics Selected. Please select atleast one primary characteristic")
                }
                that.getModel("BModel").callFunction("/maintainUniqueChar", {
                    method: "GET",
                    urlParameters: {
                        FLAG: Flag,
                        UNIQUECHAR: JSON.stringify(oEntry.RTRCHAR)
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show(oData.maintainUniqueChar);
                        that.onGetData();
                        that.onCloseCreate();
                        that.onClassClose();
                        that.selectedArray = [];
                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Error");
                    },
                });
            },

            onCopyUniqueDesc: function () {
                var uniqueData = oGModel.getProperty("/uniqueData");
                var
                    //  olocID = sap.ui.getCore().byId("locIdCCUC").getValue(),
                    oprodID = sap.ui.getCore().byId("prodIdCCUC").getValue(),
                    ouniqID = 1,
                    ouniqDesc = sap.ui.getCore().byId("idUniqDescCCUC").getValue(),
                    ouniqTID = sap.ui.getCore().byId("idComboBoxCCUC").getSelectedKey(),
                    ouniqRID = sap.ui.getCore().byId("uidRIdCCUC").getValue(),
                    oactID = sap.ui.getCore().byId("idComboBoxACUC").getValue(),
                    flag = 'C',
                    count = 0;
                var sDates = sap.ui.getCore().byId("DRS1UC").getValue(), sFromDt = null, sToDt = null;
                if (sDates) {
                    function convertDate(inputFormat, joinBy) {
                        function pad(s) {
                            return (s < 10) ? '0' + s : s;
                        }
                        var d = new Date(inputFormat)
                        return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(joinBy)
                    }
                    sFromDt = convertDate(sDates.split("-")[0].trim(), '-');
                    sToDt = convertDate(sDates.split("-")[1].trim(), '-');
                }
                if (oactID === "True") {
                    oactID = '';
                } else {
                    oactID = 'X';
                }
                if (sDates === '' || sDates === null || sDates === undefined) {
                    return sap.m.MessageToast.show("Please enter Valid From/To dates.")
                }
                var aTabledata = sap.ui.getCore().byId("idCharItemUC").getItems();
                var Flag = oGModel.getProperty("/New");
                for (var i = 0; i < aTabledata.length; i++) {
                    var aData = aTabledata[i].getBindingContext().getObject();
                    Charlist = {
                        // LOCATION_ID: olocID,
                        PRODUCT_ID: oprodID,
                        UNIQUE_ID: ouniqID,
                        UNIQUE_DESC: ouniqDesc,
                        CHAR_NUM: aData.CHAR_NUM,
                        CHARVAL_NUM: aData.CHARVAL_NUM,
                        VALID_FROM: sFromDt,
                        VALID_TO: sToDt
                    }
                    oEntry.RTRCHAR.push(Charlist);
                }
                sap.ui.core.BusyIndicator.show();
                that.getModel("BModel").callFunction("/maintainUniqueChar", {
                    method: "GET",
                    urlParameters: {
                        FLAG: Flag,
                        UNIQUECHAR: JSON.stringify(oEntry.RTRCHAR)
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show(oData.maintainUniqueChar);
                        that.onGetData();
                        that.onCloseCreate();
                        that.onClassClose();

                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Error");
                    },
                });
                // if (olocID === "" || oprodID === "") {
                if (oprodID === "") {
                    sap.m.MessageToast.show("Please select Product")
                } else {
                    sap.ui.core.BusyIndicator.show();
                    var bModel = that.getView().getModel("BModel");
                    bModel.callFunction("/maintainUniqueChar", {
                        method: "GET",
                        urlParameters: {
                            // LOCATION_ID: olocID,
                            PRODUCT_ID: oprodID,
                            UNIQUE_ID: ouniqID,
                            UID_TYPE: ouniqTID,
                            UNIQUE_DESC: ouniqDesc,
                            ACTIVE: oactID,
                            FLAG: "C"
                        },
                        success: function (oData) {
                            sap.m.MessageToast.show(oData.changeUnique);
                            that.onAfterRendering();
                            that._copyCharacterstics.close();
                            that.onGetData();
                            sap.ui.core.BusyIndicator.hide();
                        },
                        error(e) {
                            sap.m.MessageToast.show("Failed to Create");
                            sap.ui.core.BusyIndicator.hide();
                        }
                    });
                }
            },

            onSelect: function (oEvent) {
                that.oIndexArray = [];
                var selectedData = that.oGModel.getProperty("/mainData").oData.results;
                if (that.oGModel.getProperty("/arrayFlag") === "X") {
                    // that.selectedArray = [];
                    that.indexArray = [];
                    that.oGModel.setProperty("/arrayFlag", "");
                }
                var selectedItems = oEvent.getSource().getSelectedButton().getBindingContext("oModel").getObject();
                var count = 0;
                var charName = selectedItems.CHAR_NAME,
                    charDesc = selectedItems.CHAR_DESC,
                    charNum = selectedItems.CHAR_NUM,
                    charVal_Name = selectedItems.CHAR_VALUE,
                    charvalDesc = selectedItems.CHARVAL_DESC,
                    charVal_Num = selectedItems.CHARVAL_NUM,
                    class_Name = selectedItems.CLASS_NAME,
                    char_type = selectedItems.CHAR_TYPE;
                that.selectedDetails = {
                    "CHAR_NAME": charName,
                    "CHAR_DESC": charDesc,
                    "CHAR_NUM": charNum,
                    "CHAR_VALUE": charVal_Name,
                    "CHARVAL_DESC": charvalDesc,
                    "CHARVAL_NUM": charVal_Num,
                    "CLASS_NAME": class_Name,
                    "MULTI_CHAR": selectedItems.MULTI_CHAR,
                    "REF_CHAR_NAME": selectedItems.REF_CHAR_NAME,
                    "CHAR_TYPE": char_type
                };
                if (that.selectedArray.length === 0) {
                    that.selectedArray.push(that.selectedDetails);
                } else {
                    for (var i = 0; i < that.selectedArray.length; i++) {
                        if (that.selectedArray[i].CHAR_NAME === charName && that.selectedArray[i].CLASS_NAME === class_Name
                        ) {
                            var index = that.selectedArray.indexOf(that.selectedArray[i]);
                            that.oIndexArray.push(index);
                        }
                    }
                    if (that.oIndexArray.length > 0) {
                        for (var i in that.oIndexArray) {
                            that.selectedArray.splice(that.oIndexArray[i], 1);
                        }
                    }
                    that.selectedArray.push(that.selectedDetails);
                }
                selectedData.forEach(classItem => {
                    if (classItem.CLASS_NAME === selectedItems.CLASS_NAME) {
                        classItem.CHAR_TYPEGroups.forEach(charTypeGroup => {
                            if (charTypeGroup.CHAR_TYPE === selectedItems.CHAR_TYPE) {
                                charTypeGroup.CHAR_NUMs.forEach(charNum => {
                                    if (charNum.CHAR_NUM === selectedItems.CHAR_NUM) {
                                        charNum.nodes.forEach(node => {
                                            if (node.CHAR_VALUE === selectedItems.CHAR_VALUE) {
                                                node.Selection = true;
                                                return; // Exit loop when a match is found
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                that.newClassModel = new JSONModel();
                that.newClassModel.setData({ results: selectedData });
                that.oGModel.setProperty("/mainData", that.newClassModel);
            },

            removeDuplicatevariant: function (array, key) {
                var check = new Set();
                return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
            },
            /**
             * 
             */
            // getUserInfo: function (oEvent) {
            //     var oModel1 = that.getOwnerComponent().getModel('BModel');
            //     oModel1.callFunction("/getUserInfo", {
            //         method: "GET",
            //         success: function (oData, oResponse) {
            //             // sap.m.MessageToast.show(oResponse.data.getUserInfo);
            //             that.sUserId = oResponse.data.getUserInfo;
            //             that.oGModel.setProperty("/UserId", that.sUserId);
            //         },
            //         error: function (oResponse) {
            //             sap.m.MessageToast.show("Failed to get User Info!");
            //         },
            //     });
            // },
            uploadData: function (e) {
                sap.m.MessageToast.show("File Import in-Process");
                this.importJson(e.getParameter("files") && e.getParameter("files")[0]);
            },
            importJson: function (file) {
                if (file.type.includes("application/json") == false) {
                    return sap.m.MessageToast.show("Please upload only files of type Json");
                }
                sap.m.MessageToast.show("Please wait while we validate the data to upload.");
                // sap.ui.core.BusyIndicator.show();
                if (file && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        try {
                            var data = JSON.parse(e.target.result);
                            //Create Job
                            if (data.vcRulesList) {
                                that.getModel("BModel").callFunction("/getUniqueData", {
                                    method: "GET",
                                    urlParameters: {
                                        vcRulesList: JSON.stringify(data.vcRulesList)
                                    },
                                    success: function (oData) {
                                        sap.ui.core.BusyIndicator.hide();
                                        if (oData.getUniqueData.Description.includes("invalid Product Configurations:")) {
                                            let aConfigs = JSON.parse(oData.getUniqueData.Description.split("invalid Product Configurations:")[1]);
                                            if (aConfigs && aConfigs.length > 0) {
                                                let charList = sap.ui.getCore().byId("idCharTableUC");
                                                let oModel = new JSONModel();
                                                oModel.setData({
                                                    results: aConfigs,
                                                });
                                                charList.setModel(oModel);
                                                that.invalidCharDialog.open();
                                                that.toggleButtons(false);
                                            }
                                        }
                                        else {
                                            sap.m.MessageToast.show(oData.getUniqueData.Description)
                                        }
                                    },
                                    error: function () {
                                        sap.ui.core.BusyIndicator.hide();
                                        sap.m.MessageToast.show("Error while uploading!");
                                    },
                                });

                                // //Scenario - Same Product&identification but diff config,then show error msg.
                                // var keys = ['product', 'externalIdentification'];
                                // var aDistinctData = that.removeDuplicatemultiple(data.uniqueID, keys);
                                // if (aDistinctData.length != data.uniqueID.length) {
                                //     sap.ui.core.BusyIndicator.hide();
                                //     return sap.m.MessageToast.show("Cannot upload,Duplicate entries exists!")
                                // }
                                // var uniqueList = [];

                                // function removeSOleadzeros(num) {
                                //     num = num.toString();
                                //     num = num.replace(/^0+/, '');
                                //     return num;

                                // }
                                // Array.from(data.uniqueID).forEach(el => {
                                //     let numberCheck = /^\d+$/.test(el.product);
                                //     if (numberCheck == true) { //It is Only number with no special characteristics
                                //         el.product = removeSOleadzeros(el.product);
                                //     }
                                //     el.characteristics = that.removeDuplicate(el.characteristics, "characteristic");
                                //     //Remove characteristics with blank characteristic or characteristicValue
                                //     el.characteristics = el.characteristics.filter(f => f.characteristic != '' && f.characteristicValue != '')
                                //     const obj = {
                                //         PRODUCT_ID: el.product,
                                //         EX_IDENTIFICATION: el.externalIdentification,
                                //         UNIQUE_DESC: el.uniqueIDDescription,
                                //     }
                                //     if (uniqueList.findIndex(u => u.PRODUCT_ID == el.product && u.EX_IDENTIFICATION == el.externalIdentification) == -1) {
                                //         uniqueList.push(obj);
                                //     }
                                // })
                                // that.uniqueData = [];
                                // that.jsonData = data.uniqueID;
                                // that.getModel("BModel").callFunction("/getUniqueData", {
                                //     method: "GET",
                                //     urlParameters: {
                                //         UniqueData: JSON.stringify(uniqueList)
                                //     },
                                //     success: function (oData) {
                                //         //For product validation
                                //         if (oData.getUniqueData.flag == 'NP') {
                                //             sap.ui.core.BusyIndicator.hide();
                                //             return sap.m.MessageToast.show("The following are invalid product(s): " + oData.getUniqueData.data.toString())
                                //         } else if (oData.getUniqueData.flag == 'S') {
                                //             that.uniqueData = JSON.parse(oData.getUniqueData.data);
                                //             if (that.uniqueData.length > 0) {
                                //                 that.validateJson();
                                //             } else {
                                //                 sap.ui.core.BusyIndicator.hide();
                                //             }
                                //         }
                                //     },
                                //     error: function (error) {
                                //         sap.ui.core.BusyIndicator.hide();
                                //         sap.m.MessageToast.show("Error");
                                //     },
                                // });
                            } else {
                                sap.ui.core.BusyIndicator.hide();
                            }
                        } catch (ex) { //If json is invalid
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show(ex.message);
                        }

                    };
                    reader.onerror = function (ex) {
                        sap.ui.core.BusyIndicator.hide();
                        console.log(ex);

                    };
                    reader.readAsBinaryString(file);
                } else {
                    sap.ui.core.BusyIndicator.hide();
                }
            },
            validateJson: function () {
                //First check if characteristics are valid or not,throw error if any of them is invalid
                var aInvalidChar = [],
                    aProducts = [],
                    aInvalidProd = [];
                that.aProdHeader = [];
                that.jsonData.forEach(el => {
                    //Modify JsonData to overwrite productID 
                    let iRec = that.uniqueData.findIndex(u => u.JSONPRODUCT_ID == el.product);
                    if (iRec != -1) {
                        el.product = that.uniqueData[iRec].PRODUCT_ID;
                    }
                    var oItems = that.uniqueData.filter(f => f.PRODUCT_ID == el.product);
                    var aProdConfig = that.uniqueData.filter(f => f.PRODUCT_ID == el.product && f.EX_IDENTIFICATION == el.externalIdentification);
                    if (oItems.length > 0) {
                        // const isDataInJson = (a, b) => a.characteristic === b.CHAR_NUM && a.characteristicValue === b.CHARVAL_NUM;
                        const isDataInJson = (a, b) => a.characteristic === b.CHAR_NAME && a.characteristicValue === b.CHAR_VALUE;
                        const onlyInLeft = (left, right, compareFunction) =>
                            left.filter(leftValue =>
                                !right.some(rightValue =>
                                    compareFunction(leftValue, rightValue)));

                        const onlyInB = onlyInLeft(el.characteristics, oItems[0].prodCharacteristics, isDataInJson);

                        const result = onlyInB;
                        if (result.length > 0) {
                            result.forEach(r => {
                                if (aInvalidChar.filter(f => f.PRODUCT_ID == el.product && f.EX_IDENTIFICATION == el.externalIdentification).length == 0) {
                                    r.PRODUCT_ID = el.product;
                                    r.EX_IDENTIFICATION = el.externalIdentification;
                                    aInvalidChar.push(r);
                                }
                            })
                        }
                    }

                    // 
                    if (aInvalidChar.length == 0 && aProdConfig.length > 0) { //No need for product level config checking if any of uploaded file config is invalid
                        var bFLag = false;
                        const isDataInDB2 = (a, b) => a.CHAR_NAME === b.characteristic && a.CHAR_VALUE === b.characteristicValue;
                        const isDataInJson2 = (a, b) => a.characteristic === b.CHAR_NAME && a.characteristicValue === b.CHAR_VALUE;
                        const onlyInLeft2 = (left, right, compareFunction) =>
                            left.filter(leftValue =>
                                !right.some(rightValue =>
                                    compareFunction(leftValue, rightValue)));
                        const onlyInA2 = onlyInLeft2(aProdConfig[0].characteristics, el.characteristics, isDataInDB2);
                        const onlyInB2 = onlyInLeft2(el.characteristics, aProdConfig[0].characteristics, isDataInJson2);
                        const result2 = [...onlyInA2];


                        if (result2.length > 0) {
                            if (bFLag == false) {
                                result2.forEach(r => {
                                    r.PRODUCT_ID = el.product;
                                    r.EX_IDENTIFICATION = el.externalIdentification;
                                    //Use only UNIQUEID for aInvalidProd array ,Using UNIQUE_ID also modifying array aProdConfig[0].characteristics
                                    r.UNIQUEID = aProdConfig[0].UNIQUE_ID;
                                    if (aInvalidProd.filter(f => f.PRODUCT_ID == el.product && f.EX_IDENTIFICATION == el.externalIdentification).length == 0) {
                                        aInvalidProd.push(r);
                                    }
                                })
                                if (el.characteristics.length > 0) {
                                    el.characteristics.forEach(c => {
                                        // Get CHAR_NUM and CHARVAL_NUM
                                        let aFilProdConfig = aProdConfig[0].prodCharacteristics.filter(function (aConfig) {
                                            return aConfig.CHAR_NAME === c.characteristic && aConfig.CHAR_VALUE === c.characteristicValue;
                                        });
                                        const obj = {
                                            CHARVAL_NUM: aFilProdConfig[0].CHARVAL_NUM,
                                            CHAR_NUM: aFilProdConfig[0].CHAR_NUM,
                                            LOCATION_ID: aProdConfig[0].LOCATION_ID,
                                            PRODUCT_ID: aProdConfig[0].PRODUCT_ID,
                                            UNIQUE_ID: aProdConfig[0].UNIQUE_ID,
                                            EX_IDENTIFICATION: aProdConfig[0].EX_IDENTIFICATION,
                                            characteristics: aProdConfig[0].characteristics,
                                            itemCharacteristics: aProdConfig[0].itemCharacteristics,
                                            validFrom: el.validFrom,
                                            validTo: el.validTo
                                        }
                                        aProducts.push(obj);

                                        c.characteristicValue = aFilProdConfig[0].CHARVAL_NUM;
                                        c.characteristic = aFilProdConfig[0].CHAR_NUM;
                                    })
                                }
                            }

                        } else if (onlyInB2.length > 0) { //This condition gets executed if new products are getting added
                            if (el.characteristics.length > 0) {
                                el.characteristics.forEach(c => {
                                    // Get CHAR_NUM and CHARVAL_NUM
                                    let aFilProdConfig = aProdConfig[0].prodCharacteristics.filter(function (aConfig) {
                                        return aConfig.CHAR_NAME === c.characteristic && aConfig.CHAR_VALUE === c.characteristicValue;
                                    });
                                    const obj = {
                                        CHARVAL_NUM: aFilProdConfig[0].CHARVAL_NUM,
                                        CHAR_NUM: aFilProdConfig[0].CHAR_NUM,
                                        LOCATION_ID: aProdConfig[0].LOCATION_ID,
                                        PRODUCT_ID: aProdConfig[0].PRODUCT_ID,
                                        UNIQUE_ID: aProdConfig[0].UNIQUE_ID,
                                        EX_IDENTIFICATION: aProdConfig[0].EX_IDENTIFICATION,
                                        characteristics: aProdConfig[0].characteristics,
                                        itemCharacteristics: aProdConfig[0].itemCharacteristics,
                                        validFrom: el.validFrom,
                                        validTo: el.validTo
                                    }
                                    aProducts.push(obj);

                                    c.characteristicValue = aFilProdConfig[0].CHARVAL_NUM;
                                    c.characteristic = aFilProdConfig[0].CHAR_NUM;
                                })
                            }
                        }
                    }
                })
                //uncomment this for prod config validations
                if (aInvalidChar.length > 0) {
                    let charList = sap.ui.getCore().byId("idCharTableUC");
                    let oModel = new JSONModel();
                    oModel.setData({
                        results: aInvalidChar,
                    });
                    charList.setModel(oModel);
                    sap.ui.core.BusyIndicator.hide();
                    that.invalidCharDialog.open();
                    that.toggleButtons(false);
                    return sap.m.MessageToast.show("Cannot upload due to invalid Product Configurations.")
                }

                //Scenario- Same Product & characteristics but different identification then replace old identification with new one
                if (aProducts.length > 0) {
                    let aResult = that.sameProdConfigCheck(aProducts);
                    aProducts = aResult.filter(f => !f.header);
                    that.aProdHeader = aResult.filter(f => f.header);
                }
                // return sap.ui.core.BusyIndicator.hide();
                //All configurations from json file are valid and now proceed to data insertion
                that.ProdConfigs = [];
                if (aProducts.length > 0) {
                    that.ProdConfigs = aProducts;
                    let aExisting = aInvalidProd.filter(f => f.UNIQUEID != "");
                    if (aExisting.length > 0) {
                        var str = "";
                        aExisting.forEach(a => {
                            str = str + ` (${a.PRODUCT_ID}/${a.EX_IDENTIFICATION})`
                        })

                        let charList = sap.ui.getCore().byId("idCharTableUC");
                        let oModel = new JSONModel();
                        oModel.setData({
                            results: aExisting,
                        });
                        charList.setModel(oModel);
                        sap.ui.core.BusyIndicator.hide();
                        that.invalidCharDialog.open();
                        that.toggleButtons(true);
                    } else {
                        that.onConfirmNo();
                    }
                } else if (that.aProdHeader.length > 0) {
                    // that.onConfirmNo();
                    that.onConfirmYes();
                } else {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Same Data already exists!")
                }
            },
            sameProdConfigCheck: function (aData) {
                var aGroupedChar = [],
                    aMatchedConfig = [];
                //first Step to groupBy Product with the charactersitics from JSON
                aData.forEach(el => {
                    let iRec = aGroupedChar.findIndex(f => f.PRODUCT_ID == el.PRODUCT_ID);
                    if (iRec == -1) {
                        const obj = Object.assign({}, el);
                        obj.jsonChar = [{
                            "CHAR_NUM": el.CHAR_NUM,
                            "CHARVAL_NUM": el.CHARVAL_NUM,
                            "EX_IDENTIFICATION": el.EX_IDENTIFICATION
                        }]
                        aGroupedChar.push(obj);
                    } else {
                        const obj = {
                            "CHAR_NUM": el.CHAR_NUM,
                            "CHARVAL_NUM": el.CHARVAL_NUM,
                            "EX_IDENTIFICATION": el.EX_IDENTIFICATION
                        }
                        if (el.characteristics.length > 0) {
                            el.characteristics.forEach(e => {
                                if (aGroupedChar[iRec].characteristics.filter(c => c.UNIQUE_ID == e.UNIQUE_ID).length == 0) {
                                    aGroupedChar[iRec].characteristics.push(e);
                                }
                            })
                        }
                        if (el.itemCharacteristics.length > 0) {
                            el.itemCharacteristics.forEach(e => {
                                if (aGroupedChar[iRec].itemCharacteristics.filter(c => c.UNIQUE_ID == e.UNIQUE_ID
                                    && c.CHAR_NUM == e.CHAR_NUM && c.CHARVAL_NUM == e.CHARVAL_NUM).length == 0) {
                                    aGroupedChar[iRec].itemCharacteristics.push(e);
                                }
                            })
                        }
                        aGroupedChar[iRec].jsonChar.push(obj);
                    }
                })
                //Next find the items with matching config count for uniqueID
                if (aGroupedChar.length > 0) {
                    aGroupedChar.forEach(g => {
                        var checkInDB = false;
                        if (g.itemCharacteristics.length > 0) {
                            checkInDB = true;
                        }
                        const aFiltered = that.dynamicFilter(g.characteristics, g.jsonChar, checkInDB, g.itemCharacteristics, g.validFrom, g.validTo);
                        if (aFiltered.length > 0) {
                            aFiltered.forEach(a => {
                                const obj = {
                                    CHARVAL_NUM: a.CHARVAL_NUM,
                                    CHAR_NUM: a.CHAR_NUM,
                                    LOCATION_ID: g.LOCATION_ID,
                                    EX_IDENTIFICATION: (a.New_EX_IDENTIFICATION) ? a.New_EX_IDENTIFICATION : a.EX_IDENTIFICATION,
                                    PRODUCT_ID: g.PRODUCT_ID,
                                    product: g.PRODUCT_ID,
                                    header: (a.header) ? true : false,
                                    externalIdentification: (a.New_EX_IDENTIFICATION) ? a.New_EX_IDENTIFICATION : a.EX_IDENTIFICATION,
                                    // UNIQUE_ID: (a.UNIQUE_ID)?a.UNIQUE_ID :g.UNIQUE_ID
                                    UNIQUE_ID: '',
                                    validFrom: g.validFrom,
                                    validTo: g.validTo
                                }
                                if (a.UNIQUE_ID) {
                                    obj.UNIQUE_ID = a.UNIQUE_ID
                                }
                                else if (g.characteristics.length > 0) {//Find from characteristics
                                    let aChar = g.characteristics.filter(ch => ch.EX_IDENTIFICATION == obj.EX_IDENTIFICATION)
                                    if (aChar.length > 0) {
                                        obj.UNIQUE_ID = aChar[0].UNIQUE_ID;
                                    }
                                }
                                aMatchedConfig.push(obj);
                            })
                        }
                    })
                }
                return aMatchedConfig;
            },
            dynamicFilter: function (array, jsonData, checkInDB, itemCharacteristics, validFrom, validTo) {
                //If all config in products are having same identification then return [] 
                // var sIdentification = jsonData[0].EX_IDENTIFICATION;
                // if (jsonData.filter(f => f.EX_IDENTIFICATION != sIdentification).length == 0) {
                //     return jsonData;
                // }
                //First check in Json Products,if same config exists,then change identification Number, Group by Identifications as  aGroupedConfigs
                var aGroupedConfigs = [];
                jsonData.forEach((el, i) => {
                    let iRec = aGroupedConfigs.findIndex(f => f.EX_IDENTIFICATION == el.EX_IDENTIFICATION);
                    if (iRec == -1) {
                        const obj = Object.assign({});
                        obj.EX_IDENTIFICATION = el.EX_IDENTIFICATION;
                        obj.configs = [{
                            "CHAR_NUM": el.CHAR_NUM,
                            "CHARVAL_NUM": el.CHARVAL_NUM,
                            "rowIndex": i
                        }]
                        aGroupedConfigs.push(obj);
                    } else {
                        const obj = {
                            "CHAR_NUM": el.CHAR_NUM,
                            "CHARVAL_NUM": el.CHARVAL_NUM,
                            "rowIndex": i
                        }
                        aGroupedConfigs[iRec].configs.push(obj);
                    }
                })
                //Next check if same configs exists for different identifications
                aGroupedConfigs.forEach((el, i) => {
                    var sIdentification = el.EX_IDENTIFICATION;
                    var iCount = el.configs.length;
                    let aFiltered = aGroupedConfigs.filter(f => f.configs.length == iCount && f.EX_IDENTIFICATION != sIdentification);
                    if (aFiltered.length > 0 && i == 0) { //Now check if configs are same or not
                        aFiltered.forEach(x => {
                            const isDataInJson = (a, b) => a.CHAR_NUM === b.CHAR_NUM && a.CHARVAL_NUM === b.CHARVAL_NUM;
                            const onlyInLeft = (left, right, compareFunction) =>
                                left.filter(leftValue =>
                                    !right.some(rightValue =>
                                        compareFunction(leftValue, rightValue)));

                            const aDiff = onlyInLeft(x.configs, el.configs, isDataInJson);
                            if (aDiff.length == 0) {//Same Config,Now replace identification number in jsonData and splice from jsonData
                                /*Scenario -
                                 if the config which is getting replaced & which will replace both exists in DB,
                                 Don't update identification Number
                                */
                                if (array.length > 0) {
                                    let aCheckOldExists = array.filter(ar => ar.EX_IDENTIFICATION == el.EX_IDENTIFICATION);
                                    let aCheckNewExists = array.filter(ar => ar.EX_IDENTIFICATION == x.EX_IDENTIFICATION);
                                    if (aCheckOldExists.length > 0 && aCheckNewExists.length > 0) {
                                        return;
                                    }
                                }
                                el.configs.forEach(co => {
                                    if (jsonData[co.rowIndex]) {
                                        jsonData[co.rowIndex].New_EX_IDENTIFICATION = x.EX_IDENTIFICATION;
                                        jsonData[co.rowIndex].iden = x.EX_IDENTIFICATION;
                                        //if this record exists in DB
                                        if (array.length > 0) {
                                            if (array.filter(ar => ar.CHAR_NUM == co.CHAR_NUM && ar.CHARVAL_NUM == co.CHARVAL_NUM && ar.EX_IDENTIFICATION == sIdentification).length > 0) {
                                                jsonData[co.rowIndex].iden = jsonData[co.rowIndex].EX_IDENTIFICATION;
                                            }
                                        }
                                    }
                                })
                                x.configs.forEach(co => {
                                    let ind = jsonData.findIndex(f => f.CHAR_NUM == co.CHAR_NUM && f.CHARVAL_NUM == co.CHARVAL_NUM && f.EX_IDENTIFICATION == x.EX_IDENTIFICATION)
                                    jsonData.splice(ind, 1)
                                })
                            }
                        })
                    }
                })
                //Now check if this Product has configs in DB
                if (array.length > 0) {
                    array.forEach(a => {
                        jsonData.forEach(b => {
                            if (a.CHAR_NUM == b.CHAR_NUM && a.CHARVAL_NUM == b.CHARVAL_NUM && a.EX_IDENTIFICATION == b.iden) {
                                b.UNIQUE_ID = a.UNIQUE_ID;
                                b.header = true;
                            }
                            else if (a.CHAR_NUM == b.CHAR_NUM && a.CHARVAL_NUM == b.CHARVAL_NUM && a.EX_IDENTIFICATION == b.EX_IDENTIFICATION) {
                                b.UNIQUE_ID = a.UNIQUE_ID;
                            }
                        })
                    })
                }
                ///
                if (checkInDB == true && itemCharacteristics.length > 0) {
                    var aGroupedUniqueID = [];
                    itemCharacteristics.forEach((el, i) => {
                        let iRec = aGroupedUniqueID.findIndex(f => f.UNIQUE_ID == el.UNIQUE_ID);
                        if (iRec == -1) {
                            const obj = Object.assign({});
                            obj.UNIQUE_ID = el.UNIQUE_ID;
                            obj.configs = [{
                                "CHAR_NUM": el.CHAR_NUM,
                                "CHARVAL_NUM": el.CHARVAL_NUM
                            }]
                            aGroupedUniqueID.push(obj);
                        } else {
                            const obj = {
                                "CHAR_NUM": el.CHAR_NUM,
                                "CHARVAL_NUM": el.CHARVAL_NUM
                            }
                            aGroupedUniqueID[iRec].configs.push(obj);
                        }
                    })
                    //
                    //Next check if same configs exists for different identifications
                    aGroupedConfigs.forEach((el, i) => {
                        let aFiltered = aGroupedUniqueID.filter(it => it.configs.length == el.configs.length);
                        //if same Count,check if all configs are same or not
                        if (aFiltered.length > 0) {
                            aFiltered.forEach(x => {
                                const isDataInJson = (a, b) => a.CHAR_NUM === b.CHAR_NUM && a.CHARVAL_NUM === b.CHARVAL_NUM;
                                const onlyInLeft = (left, right, compareFunction) =>
                                    left.filter(leftValue =>
                                        !right.some(rightValue =>
                                            compareFunction(leftValue, rightValue)));

                                const aDiff = onlyInLeft(x.configs, el.configs, isDataInJson);
                                if (aDiff.length == 0) {//Same Config,Now replace identification number in jsonData and splice from jsonData
                                    /*Scenario -
                                     if the config which is getting replaced & which will replace both exists in DB,
                                     Don't update identification Number
                                    */
                                    if (array.length > 0) {
                                        let bDatesChanged = false;
                                        let aCheckOldExists = array.filter(ar => ar.EX_IDENTIFICATION == el.EX_IDENTIFICATION);
                                        let aDt = that.uniqueData.filter(fi => fi.UNIQUE_ID == x.UNIQUE_ID);
                                        var sIden = '';
                                        if (aDt.length > 0) {
                                            sIden = aDt[0].EX_IDENTIFICATION;
                                        }
                                        let aCheckNewExists = array.filter(ar => ar.EX_IDENTIFICATION == sIden);
                                        ///check if valid from and To are different
                                        if (aDt.length > 0) {
                                            if (aDt[0].VALID_FROM && aDt[0].VALID_TO && validFrom && validTo) {
                                                if (new Date(aDt[0].VALID_FROM).getTime() != new Date(validFrom).getTime() ||
                                                    new Date(aDt[0].VALID_TO).getTime() != new Date(validTo).getTime()) {
                                                    //Update The dates
                                                    bDatesChanged = true;
                                                }
                                            }
                                        }
                                        if (aCheckOldExists.length > 0 && aCheckNewExists.length > 0 && bDatesChanged == false) {
                                            return;
                                        }
                                    }
                                    el.configs.forEach(co => {
                                        if (jsonData[co.rowIndex]) {
                                            jsonData[co.rowIndex].header = true;
                                            jsonData[co.rowIndex].UNIQUE_ID = x.UNIQUE_ID
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
                return jsonData;
            },
            onConfirmYes: function () {
                var aData = [];
                let aExistingProd = that.ProdConfigs.filter(f => f.UNIQUE_ID != "");
                if (aExistingProd.length > 0) {
                    aExistingProd.forEach(el => {
                        const index = that.jsonData.findIndex(f => f.product == el.PRODUCT_ID && f.externalIdentification == el.EX_IDENTIFICATION);
                        if (index != -1) {
                            var rec = that.jsonData[index];
                            rec.UNIQUE_ID = el.UNIQUE_ID;
                            if (aData.filter(a => a.product == rec.product && a.externalIdentification == rec.externalIdentification).length == 0) {
                                aData.push(rec);
                            }
                        }
                    })
                }

                let aNewProd = that.ProdConfigs.filter(f => f.UNIQUE_ID == "");
                if (aNewProd.length > 0) {
                    aNewProd.forEach(el => {
                        const index = that.jsonData.findIndex(f => f.product == el.PRODUCT_ID && f.externalIdentification == el.EX_IDENTIFICATION);
                        if (index != -1) {
                            var rec = that.jsonData[index];
                            rec.UNIQUE_ID = '';
                            if (aData.filter(a => a.product == rec.product && a.externalIdentification == rec.externalIdentification).length == 0) {
                                aData.push(rec);
                            }
                        }
                    })
                }
                if (that.aProdHeader.length > 0) { //These are the records which have to update in Header table
                    that.aProdHeader.forEach(p => {
                        p.header = true;
                        aData.push(p);
                    })
                }
                sap.ui.core.BusyIndicator.hide();
                that.uploadJson(aData, 'D');
                that.invalidCharDialog.close();

            },
            onConfirmNo: function () { //Insert the new Records and save the aExisting in error Log 
                var aData = [];
                let aNewProd = that.ProdConfigs.filter(f => f.UNIQUE_ID == "");
                if (aNewProd.length > 0) {
                    aNewProd.forEach(el => {
                        const index = that.jsonData.findIndex(f => f.product == el.PRODUCT_ID && f.externalIdentification == el.EX_IDENTIFICATION);
                        if (index != -1) {
                            var rec = that.jsonData[index];
                            rec.UNIQUE_ID = '';

                            if (aData.filter(a => a.product == rec.product && a.externalIdentification == rec.externalIdentification).length == 0) {
                                aData.push(rec);
                            }
                        }
                    })
                }
                sap.ui.core.BusyIndicator.hide();
                that.uploadJson(aData, 'B');

                that.invalidCharDialog.close();
            },
            uploadJson: function (aData, flag) {
                if (aData.length === 0) {
                    return;
                }
                sap.ui.core.BusyIndicator.show();
                that.getModel("BModel").callFunction("/maintainUniqueChar", {
                    method: "GET",
                    urlParameters: {
                        FLAG: flag,
                        UNIQUECHAR: JSON.stringify(aData)
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show(oData.maintainUniqueChar);
                        that.onGetData();
                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Error");
                    },
                });
            },
            toggleButtons: function (flag) {
                sap.ui.getCore().byId("HConfirm_YUC").setVisible(flag);
                sap.ui.getCore().byId("HConfirm_NUC").setVisible(flag);
                sap.ui.getCore().byId("confirmtxtUC").setVisible(flag);
                sap.ui.getCore().byId("idcloseUC").setVisible(!flag);
                if (flag) {
                    sap.ui.getCore().byId("idInvalidCharUC").setTitle("Confirmation");
                    sap.ui.getCore().byId("confirmtxtUC").setText("Data already exists for the following Product/externalIdentification.Would you like to replace?")
                } else {
                    sap.ui.getCore().byId("idInvalidCharUC").setTitle("Invalid Characteristics");
                }

            },
            onCloseChar: function () {
                sap.ui.core.BusyIndicator.hide();
                that.invalidCharDialog.close();
            },
            removeDuplicate(array, key) {
                var check = new Set();
                return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
            },
            removeDuplicatemultiple: function (array, keys) {
                const filtered = array.filter(
                    (s => o =>
                        (k => !s.has(k) && s.add(k))
                            (keys.map(k => o[k]).join('|'))
                    )
                        (new Set)
                );
                return filtered;
            },

            classSelClose: function () {
                var selectedObject = {};
                var tableItems = sap.ui.getCore().byId("idCharItemUC").getItems();
                var selData = that.oGModel.getProperty("/mainData").oData.results;
                for (var i = 0; i < selData.length; i++) {
                    for (var j = 0; j < selData[i].CHAR_TYPEGroups.length; j++) {
                        for (var s = 0; s < selData[i].CHAR_TYPEGroups[j].CHAR_NUMs.length; s++) {
                            for (var l = 0; l < selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes.length; l++) {
                                var count = 0;
                                for (var k = 0; k < tableItems.length; k++) {
                                    if (selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].CLASS_NAME !== tableItems[k].getCells()[0].getText() ||
                                        selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].CHAR_NAME !== tableItems[k].getCells()[1].getText() ||
                                        selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].CHAR_NUM !== tableItems[k].getCells()[3].getText() ||
                                        selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].CHAR_VALUE !== tableItems[k].getCells()[4].getText()) {
                                        count++;
                                    }
                                    else {
                                        selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].Selection = true;
                                    }
                                }
                                if (count === tableItems.length) {
                                    selData[i].CHAR_TYPEGroups[j].CHAR_NUMs[s].nodes[l].Selection = false;
                                }
                            }
                        }
                    }
                }
                that.selectedArray = [];
                for (var e = 0; e < tableItems.length; e++) {
                    //    that.selectedArray.push(tableItems[e].getCells()[0].getBindingContext().getObject());
                    selectedObject.CHAR_NAME = tableItems[e].getCells()[1].getText();
                    selectedObject.CHAR_DESC = tableItems[e].getCells()[2].getText();
                    selectedObject.CHAR_VALUE = tableItems[e].getCells()[4].getText();
                    selectedObject.CHARVAL_DESC = tableItems[e].getCells()[5].getText();
                    selectedObject.CHAR_NUM = tableItems[e].getCells()[3].getText();
                    selectedObject.CHARVAL_NUM = tableItems[e].getCells()[6].getText();
                    selectedObject.CLASS_NAME = tableItems[e].getCells()[0].getText();
                    selectedObject.CHAR_TYPE = tableItems[e].getCells()[9].getText()
                    that.selectedArray.push(selectedObject);
                    selectedObject = {};

                }
                that.ListModel.setData({ results: that.selectedArray });
                that.newIModel = new JSONModel();
                that.newIModel.setData({ results: selData });
                that.oGModel.setProperty("/mainData", that.newIModel);
                sap.ui.getCore().byId("idCharSearchUC").setValue();
                let newModel = new JSONModel();
                newModel.setData(selData);
                that._valueHelpDialogclassName.setModel(newModel, "oModel");
            },

            loadProducts: function () {

                var topCount = that.getModel("oGModel").getProperty("/MaxCount");
                that.getOwnerComponent().getModel("BModel").read("/getRolesLocProd", {
                    filters: [new Filter(
                        "USER",
                        FilterOperator.EQ,
                        that.getUser()
                    )],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.aAllProd = that.aAllProd.concat(oData.results);
                            that.loadProducts();
                        } else {
                            that.skip = 0;
                            that.aAllProd = that.aAllProd.concat(oData.results);
                            that.oGModel.setProperty("/fullData", that.aAllProd);
                            that.aNewProds = that.aAllProd.sort((a, b) => a.REF_PRODID.localeCompare(b.REF_PRODID, undefined, { numeric: true, sensitivity: 'base' }));
                            that.aNewProds = that.removeDuplicate(that.aNewProds, "REF_PRODID");
                            that.oGModel.setProperty("/getProd", that.aNewProds);
                            that.prodModel.setData(that.aNewProds);
                            that.prodModel.setSizeLimit(that.aNewProds);
                            that.oProdList.setModel(that.prodModel);
                        }
                    },
                    error: function (err) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error Loading Products Data");
                    }
                });
            },

            getAllLocs: function () {
                var topCount = that.getModel("oGModel").getProperty("/MaxCount");
                this.getModel("BModel").read("/getLocation", {
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.allData = that.allData.concat(oData.results);
                            that.getAllLocs();
                        } else {
                            that.skip = 0;
                            that.allData = that.allData.concat(oData.results);
                            sap.ui.core.BusyIndicator.hide();
                            oData = that.allData
                            that.allData = []
                            that.locModel.setData(oData);
                            that.oLocList.setModel(that.locModel);
                        }
                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("error");
                    },
                });
            },
            /**Function to retrieve future demand for product & unique id -Pradeep 02/04/2025 */
            getFutureDemand: function () {
                var oSprod = that.oProd.getValue() || that.oProd.getTokens()[0].getText();
                var oFilters = [];
                oFilters.push(
                    new Filter({
                        filters: [
                            new Filter("PRODUCT_ID", FilterOperator.EQ, oSprod),
                        ],
                        and: true,
                    })
                );
                var sQuryProd = `PRODUCT_ID eq '${oSprod}'`
                that.getModel("oGModel").getProperty("/MaxCount");
                var topCount = that.getModel("oGModel").getProperty("/MaxCount");
                that.getModel("BModel").read("/getCIRGenerated", {
                    // filters: [oFilters],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount,
                        $apply: `filter(${sQuryProd})/groupby((UNIQUE_ID,CIR_QTY))`,
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        if (topCount == oData.results.length) {
                            that.skip += parseInt(topCount);
                            that.oUniqueData = that.oUniqueData.concat(oData.results);
                            that.getFutureDemand();
                        }
                        else {
                            that.skip = 0;
                            that.oUniqueData = that.oUniqueData.concat(oData.results);
                        }
                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Failed to get data");
                    }
                });
            },
            // getPUIDs:function(filters){
            //     var oSprod = that.oProd.getValue() || that.oProd.getTokens()[0].getText();
            //     var oFilters = [];
            //     oFilters.push(
            //         new Filter({
            //             filters: [
            //                 new Filter("REF_PRODID", FilterOperator.EQ, oSprod),
            //             ],
            //             and: true,
            //         })
            //     );
            //     that.getModel("oGModel").getProperty("/MaxCount");
            //     var topCount = that.getModel("oGModel").getProperty("/MaxCount");
            //     that.getModel("BModel").read("/getSalesh", {
            //         filters: [oFilters],
            //         urlParameters: {
            //             "$skip": that.skip,
            //             "$top": topCount
            //         },
            //         success: function (oData) {
            //             if (topCount == oData.results.length) {
            //                 that.skip += parseInt(topCount);
            //                 that.oPUIDData = that.oPUIDData.concat(oData.results);
            //                 that.getPUIDs();
            //             } 
            //             else{
            //                 that.skip = 0;
            //                 that.oPUIDData = that.oPUIDData.concat(oData.results);
            //             }
            //         },
            //         error: function (error) {
            //             sap.ui.core.BusyIndicator.hide();
            //             MessageToast.show("Failed to get data");
            //         }
            //     });
            // }
            saveDefaultVariant: function () {
                sap.ui.core.BusyIndicator.show();
                var array = [];
                var details = {};
                var sProduct = that.byId("prodInputUC").getValue();
                var Field1 = that.byId("LabelProdUC").getText();

                var sUniq = that.byId("idUniqueUC").getSelectedKey()
                var Field2 = that.byId("oIdUniqUC").getText()
                // if (sUniq === "U") {
                //     var Field2 = "Unique"
                // }
                // else if (sUniq === "P") {
                //     var Field2 = "Primary"
                // }
                // else {
                //     var Field2 = "All"
                // }
                if (!sProduct && sUniq.length === 0) {
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }

                if (sProduct) {
                    details = {
                        Field: Field1,
                        FieldCenter: (1).toString(),
                        Value: sProduct
                    }
                    array.push(details);
                }

                if (sUniq) {
                    details = {
                        Field: Field2,
                        FieldCenter: (1).toString(),
                        Value: sUniq
                    }
                    array.push(details);
                }
                var flag = "N";
                for (var j = 0; j < array.length; j++) {
                    array[j].IDNAME = "defaultSingle";
                    array[j].App_Name = "DefaultSingle";
                    array[j].SCOPE = "Global";
                }
                //    console.log(JSON.stringify(array));
                this.getOwnerComponent().getModel("BModel").callFunction("/createVariant", {
                    method: "GET",
                    urlParameters: {
                        Flag: flag,
                        USER: (that.oGModel.getProperty("/UserId")),
                        VARDATA: JSON.stringify(array)
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                    },
                    error: function (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Failed to create global variant");
                    },
                });
            },
            onCharacteristicsPress: function () {
                var that = this;
                sap.ui.core.BusyIndicator.show();
                var sProductId = that.byId("prodInputUC").getValue();
                var sUniqueType = that.byId("idUniqueUC").getSelectedKey();

                if (!sProductId) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Please select a Product first");
                    return;
                }

                var oODataModel = this.getOwnerComponent().getModel("BModel");
                var topCount = that.getModel("oGModel").getProperty("/MaxCount") || 1000;
                var aFilters = [
                    new sap.ui.model.Filter("PRODUCT_ID", sap.ui.model.FilterOperator.EQ, sProductId)
                ];

                if (sUniqueType && sUniqueType !== "A") {
                    aFilters.push(new sap.ui.model.Filter("UID_TYPE", sap.ui.model.FilterOperator.EQ, sUniqueType));
                }
                var sQuryProd = `PRODUCT_ID eq '${sProductId}'`



                // oODataModel.read("/getUniqueItems", {
                oODataModel.read("/getprodChar", {
                    filters: aFilters,
                    urlParameters: {
                        "$skip": 0,
                        "$top": 50000


                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        var uniqueList = oData.results
                        // var uniqueList = that.removeDuplicatemultiple(oData.results,
                        //     ['CHAR_NAME', 'CHAR_NUM', 'CHAR_VALUE','CHAR_DESC']);

                        // uniqueList.push({
                        //     CHAR_NAME: "Characteristic Name",
                        //     CHAR_VALUE: "Characteristic Value"
                        // });


                        // that.oCharModel = new sap.ui.model.json.JSONModel({
                        //     getUniqueItem: uniqueList
                        // });




                        // if (!that._CharacteristicsDialog) {
                        //     that._CharacteristicsDialog = new sap.ui.xmlfragment(
                        //         "your.namespace.CharacteristicsDialog",
                        //         that
                        //     );
                        //     that.getView().addDependent(that._CharacteristicsDialog);
                        // }

                        // that._CharacteristicsDialog.setModel(that.oCharModel);
                        var sModel = new JSONModel();
                        sModel.setSizeLimit(uniqueList.length);
                        sModel.setData({
                            resultsCombos: uniqueList
                        })
                        that.byId("idUComb").setModel(sModel)
                        that.byId("idUComb").setFilterFunction(function (sTerm, oItem) {
                            // A case-insensitive 'string contains' filter
                            var sItemText = oItem.getText().toLowerCase(),
                                sSearchTerm = sTerm.toLowerCase();

                            return sItemText.indexOf(sSearchTerm) > -1;
                        });
                        sap.ui.getCore().byId("idUCSchar").setValue();
                        // that._CharacteristicsDialog.open();
                        if (that._storedCharPayload) {
                            that._restoreFromStoredPayload();
                        }
                    },
                    error: function () {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("Error loading characteristics data");
                    }
                });
            },
            _storeCurrentPayload: function (sProductId, sUidType, aCharNums, aCharValues) {
                this._storedCharPayload = {
                    PRODUCT_ID: sProductId,
                    UID_TYPE: sUidType,
                    CHAR_NUM: aCharNums,
                    CHAR_VALUE: aCharValues
                };
            },
            _restoreFromStoredPayload: function () {
                var oTable = sap.ui.getCore().byId("idCharTable");
                var oBinding = oTable.getItems();
                var aCharNums = this._storedCharPayload.CHAR_NUM;
                var aCharValues = this._storedCharPayload.CHAR_VALUE;
                // var aContexts = oBinding.getContexts();
                if (aCharNums) {
                    for (var i = 0; i < oBinding.length; i++) {
                        var oData = oBinding[i].getBindingContext().getObject();
                        for (var j = 0; j < aCharNums.length; j++) {
                            if (oData.CHAR_NUM === aCharNums[j] && oData.CHAR_VALUE === aCharValues[j]) {
                                oTable.setSelectedItem(oTable.getItems()[i], true, true);
                                break;
                            }
                        }
                    }
                }

            },
            onSelectCharacteristic: function () {
                var that = this;
                var oTable = that.byId("idUComb");
                var aSelectedItems = oTable.getSelectedItems();
                if (!aSelectedItems || aSelectedItems.length === 0) {
                    // MessageToast.show("Please select at least one characteristic");
                    // return;
                    var sProd = that.byId("prodInputUC").getValue();
                    var sUniq = that.byId("idUniqueUC").getSelectedKey();
                    that._storeCurrentPayload(sProd, sUniq, [], [])
                    that.onCloseCharacteristicsDialog();
                    oGModel.setProperty("/CharName", [])
                    var oTable = that.byId("idMatVHeadUC");
                    var aItems = oTable.getItems();
                    that.onGetData()
                    // if (aItems.length > 0) {
                    //     oTable.setSelectedItem(aItems[0], true);
                    //     oTable.fireItemPress({
                    //         listItem: aItems[0]
                    //     });
                    // }

                } else {
                    var oFirstRow = aSelectedItems[0].getBindingContext().getObject();
                    var sProductId = that.byId("prodInputUC").getValue();
                    var sUidType = that.byId("idUniqueUC").getSelectedKey()
                    if (sUidType == "A") {
                        sUidType = ""
                    }
                    var aCharNums = [];
                    var aCharValues = [];
                    var aSelected = [];
                    aSelectedItems.forEach(function (item) {
                        var row = item.getBindingContext().getObject();
                        aSelected.push(row)
                        aCharNums.push(row.CHAR_NUM);
                        aCharValues.push(row.CHAR_VALUE);
                    });
                    oGModel.setProperty("/CharName", aSelected)
                    const result = Object.values(
                        aSelected.reduce((a, { CHAR_NAME, CHAR_VALUE }) =>
                            ((a[CHAR_NAME] ??= { CharName: CHAR_NAME, CharVal: [] }).CharVal.push(CHAR_VALUE), a), {})
                    );
                    that._storeCurrentPayload(sProductId, sUidType, aCharNums, aCharValues);
                    var oPayload = that._storedCharPayload;
                    var data = [];
                    data = {
                        PRODUCT_ID: [that._storedCharPayload.PRODUCT_ID],
                        UID_TYPE: that._storedCharPayload.UID_TYPE,
                        data: result


                    };
                    that.oModel.setData({
                        results: []
                    });
                    that.byId("idMatVHeadUC").setModel(that.oModel);
                    var oODataModel = this.getOwnerComponent().getModel("BModel");
                    sap.ui.core.BusyIndicator.show();
                    oODataModel.callFunction("/getCharacteristicUniques", {
                        method: "GET",
                        urlParameters: {
                            UNIQUEDATA: JSON.stringify(data)
                        },
                        success: function (oData) {
                            var aParsedData = JSON.parse(oData.getCharacteristicUniques);


                            that.finalProcess(aParsedData);
                        },
                        error: function () {
                            MessageToast.show("Error fetching characteristics");
                            that.finalProcess([]);
                        }
                    });
                }


            },
            onCloseCharacteristicsDialog: function () {
                if (this._CharacteristicsDialog) {
                    this._CharacteristicsDialog.close();
                }
            },
            finalProcess: function (aAllResults) {
                var that = this;
                sap.ui.core.BusyIndicator.hide();
                that.onCloseCharacteristicsDialog();
                if (!Array.isArray(aAllResults)) {
                    MessageToast.show("Invalid data format received");
                    return;
                }
                if (aAllResults.length === 0) {
                    oGModel.setProperty("/setTable", [])
                    sap.ui.controller("vcpapp.vcpuniquecharacteristics.controller.ItemDetail").onAfterRendering()

                    MessageToast.show("No data found");


                    return;
                }
                for (var i = 0; i < aAllResults.length; i++) {
                    oGModel.setProperty("/setTable", aAllResults)
                    var r = aAllResults[i];
                    if (r && typeof r === 'object') {
                        if (r.ACTIVE === 1) {
                            r.ACTIVE = true;
                        } else if (r.ACTIVE === 0) {
                            r.ACTIVE = false;
                        }
                        if (r.EX_IDENTIFICATION && r.EX_IDENTIFICATION.trim() !== "") {
                            r.UNIQUEID_DESC = r.EX_IDENTIFICATION + ":" + r.UNIQUE_DESC;
                        } else {
                            r.UNIQUEID_DESC = r.UNIQUE_DESC;
                        }
                    }
                }


                var unique = that.removeDuplicatemultiple(aAllResults, ['UNIQUE_ID', 'UID_TYPE']);
                that.oModel.setData({ results: unique });
                that.byId("idMatVHeadUC").setModel(that.oModel);
                // var sCount =  unique.length
                //  that.byId("idUCuc").setText("Unique ID's" +"(" + sCount  + ")")
                let pCount = unique.filter(item => item.UID_TYPE === "P").length;
                let UCount = unique.filter(item => item.UID_TYPE === "U").length;
                //   let oUniqueCount = pCount + pSCount

                let pCountText = that.getView().byId("pCountTextUC");
                let oUniqueCountText = that.getView().byId("oUniqueCountTextUC");

                if (pCountText) {
                    pCountText.setText("Primary Count: " + pCount + " " + " ");
                } else {
                    console.error("pCountText not found in the view!");
                }

                if (oUniqueCountText) {
                    oUniqueCountText.setText("  Unique Count: " + UCount);
                } else {
                    console.error("oUniqueCountText not found in the view!");
                }


                var oTable = that.byId("idMatVHeadUC");
                var aItems = oTable.getItems();
                if (aItems.length > 0) {
                    oTable.setSelectedItem(aItems[0], true);
                    oTable.fireItemPress({
                        listItem: aItems[0]
                    });
                }
            },
            onSelectCharFrag: function (oEvent) {
                var oEv = oEvent.getSource();
                // that._restoreFromStoredPayload()
                that._storeCurrentPayload("", "", [], [])


            },
            onCharSearch: function (oEvent) {
                var sValue = oEvent.getSource().getValue();
                var oTable = sap.ui.getCore().byId("idCharTable");
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    var aFilters = [];
                    if (sValue) {
                        aFilters.push(new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("CHAR_NAME", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("CHAR_DESC", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("CHARVAL_NUM", sap.ui.model.FilterOperator.Contains, sValue)
                            ],
                            and: false
                        }));
                    }
                    oBinding.filter(aFilters);
                }
            },
            onDialogClose: function () {
                if (this._CharacteristicsDialog) {
                    this._CharacteristicsDialog.close();
                }
            },
            onSelectAll: function (oEvent) {
                var oEv = oEvent.getSource();

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
        })
    }) 