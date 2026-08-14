sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, UIComponent, Spreadsheet, formatter) => {
    "use strict";
    var oGModel, that;
    return Controller.extend("vcpapp.vcpplanningrelevantpid.controller.Home", {
        formatter: formatter,
        onInit() {
            that = this;
            that.skip = 0;
            that.oGModel = that.getOwnerComponent().getModel("oGModel");
            this.viewDetails = new JSONModel();
            this.variantModel = new JSONModel();
            that.viewDetails.setSizeLimit(5000);
            that.variantModel.setSizeLimit(5000);
            that.oLoc1 = that.byId("idLocationPID");
            that.oProd = that.byId("idProductPID");
            that.oType = that.byId("idPrpIdTypePID")
            that.oLocList = sap.ui.getCore().byId("locPID");
            that.oProdList = sap.ui.getCore().byId("prodPID");
            that.allData = [];
            if (!that._locFrag) {
                that._locFrag = sap.ui.xmlfragment("vcpapp.vcpplanningrelevantpid.fragments.loc", that);
                that.getView().addDependent(that._locFrag);
            }

            if (!that._prodFrag) {
                that._prodFrag = sap.ui.xmlfragment("vcpapp.vcpplanningrelevantpid.fragments.prod", that);
                that.getView().addDependent(that._prodFrag);
            }
            that.getUser();

        },
        getUser: function () {
            let vUser;
            if (!sap.ushell) {
                vUser = "";
            }
            else if (sap.ushell.Container) {
                let email = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
                vUser = (email) ? email : "";
            }
             if(!vUser){
                vUser='null';
            }
            return vUser;
        },

        /*Getting variant view data*/
        getVariantData: function () {
            var ndData = [];
            var dData = [], uniqueName = [];
            that.uniqueName = [];
            sap.ui.core.BusyIndicator.show();
            var variantUser = that.getUser();
            variantUser = variantUser.toLowerCase();
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
                filters: [oFilterAppName1, oFilterUser],
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
                filters: [oFinalFilter],
                success: function (oData) {
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
                        that.oGModel.setProperty("/viewNames", uniqueName);
                        that.oGModel.setProperty("/defaultDetails", "");
                        that.viewDetails.setData({
                            items12: uniqueName
                        });
                        that.varianNames = uniqueName;
                        that.byId("idMatList123PID").setModel(that.viewDetails);
                        that.UniqueDefKey = uniqueName[0].VARIANTID;
                        that.byId("idMatList123PID").setDefaultKey(uniqueName[0].VARIANTID);
                        that.byId("idMatList123PID").setSelectedKey(uniqueName[0].VARIANTID);
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
                                that.byId("idMatList123PID").setDefaultKey((oData.results[i].VARIANTID));
                                that.byId("idMatList123PID").setSelectedKey((oData.results[i].VARIANTID))
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
                        that.oGModel.setProperty("/viewNames", uniqueName);
                        that.variantModel.setData({
                            items12: uniqueName
                        });
                        that.varianNames = uniqueName;
                        that.oGModel.setProperty("/defaultDetails", defaultDetails);
                        that.byId("idMatList123PID").setModel(that.variantModel);
                        if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                            var newVariant = that.oGModel.getProperty("/newVariant");
                            that.handleSelectPress(newVariant[0].VARIANTNAME);
                            if (newVariant[0].DEFAULT === "Y") {
                                that.UniqueDefKey = newVariant[0].VARIANTID;
                                that.byId("idMatList123PID").setDefaultKey((newVariant[0].VARIANTID));
                            }
                            that.byId("idMatList123PID").setSelectedKey((newVariant[0].VARIANTID))
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
                        that.oGModel.setProperty("/viewNames", uniqueName);
                        that.oGModel.setProperty("/defaultDetails", "");

                        that.viewDetails.setData({
                            items12: uniqueName
                        });
                        that.varianNames = uniqueName;
                        that.byId("idMatList123PID").setModel(that.viewDetails);
                        var Default = "Standard";
                        if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                            var newVariant = that.oGModel.getProperty("/newVariant");
                            that.handleSelectPress(newVariant[0].VARIANTNAME);
                            if (newVariant[0].DEFAULT === "Y") {
                                that.UniqueDefKey = newVariant[0].VARIANTID;
                                that.byId("idMatList123PID").setDefaultKey((newVariant[0].VARIANTID));
                            }
                            that.byId("idMatList123PID").setSelectedKey((newVariant[0].VARIANTID))
                            that.oGModel.setProperty("/newVaraintFlag", "");
                        } else {
                            that.UniqueDefKey = uniqueName[0].VARIANTID;
                            that.byId("idMatList123PID").setDefaultKey((uniqueName[0].VARIANTID));
                            that.byId("idMatList123PID").setSelectedKey((uniqueName[0].VARIANTID));
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
            // that.oLoc1 = that.byId("idLocationPID")
            // that.oProd = that.byId("idProductPID")
            var oLoc, oProd, oType, oTokens = {}, custToken = [];
            that.locProdFilters = [];
            that.finaloTokens = [];
            var oTableItems = that.oGModel.getProperty("/variantDetails");
            that.byId("idMatList123PID").setModified(false);
            var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            that.oGModel.setProperty("/setCust", []);
            that.oGModel.setProperty("/setLocation", '');
            that.oGModel.setProperty("/setProduct", '');
            that.oGModel.setProperty("/defaultLocation", "");
            that.oGModel.setProperty("/defaultProduct", "");
            that.oGModel.setProperty("/defaultType", "");
            that.oGModel.setProperty("/defaultCustomer", []);
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
                        if (oTableItems[i].FIELD.includes("Location")) {
                            oLoc = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultLocation", oLoc);
                            var sFilter = new sap.ui.model.Filter({
                                path: "LOCATION_ID",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }
                        else if (oTableItems[i].FIELD.includes("Product")) {
                            oProd = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultProduct", oProd);
                            var sFilter = new sap.ui.model.Filter({
                                path: "PRODUCT_ID",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }
                        else if (oTableItems[i].FIELD.includes("Type")) {
                            oType = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultType", oType);
                            var sFilter = new sap.ui.model.Filter({
                                path: "Type",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }


                    }
                }


                that.oProd.setValue(oProd);


                if (oLoc) {
                    that.oLoc1.setValue(oLoc);
                    that.oGModel.setProperty("/setLocation", oLoc);
                } else {
                    that.oLoc1.setValue("");
                }
                if (oProd) {
                    that.oProd.setValue(oProd);
                    that.oGModel.setProperty("/setProduct", oProd);

                } else {
                    that.oProd.setValue("");
                }
                if (oType) {
                    that.oType.setValue(oType)
                    that.oGModel.getProperty("/defaultType", oType);
                }
                else {
                    that.oType.setValue("");
                }

                sap.ui.core.BusyIndicator.hide();
            }
            else {
                let headerDetails = that.oGModel.getProperty("/headerDetails").filter(id => id.APPLICATION_NAME == "DefaultSingle" && id.VARIANTNAME == "defaultSingle");
                if (!that.oGModel.getProperty("/fieldDetails")) {
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }

                if (headerDetails.length) {
                var oTableItems = that.oGModel.getProperty("/fieldDetails").filter(id => id.VARIANTID == headerDetails[0].VARIANTID);
                    for (var i = 0; i < oTableItems.length; i++) {
                        if (oTableItems[i].FIELD.includes("Location")) {
                            oLoc = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultLocation", oLoc);
                            var sFilter = new sap.ui.model.Filter({
                                path: "LOCATION_ID",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }
                        else if (oTableItems[i].FIELD.includes("Product")) {
                            oProd = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultProduct", oProd);
                            var sFilter = new sap.ui.model.Filter({
                                path: "PRODUCT_ID",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }
                        else if (oTableItems[i].FIELD.includes("Type")) {
                            oType = oTableItems[i].VALUE;
                            that.oGModel.setProperty("/defaultType", oType);
                            var sFilter = new sap.ui.model.Filter({
                                path: "Type",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oTableItems[i].VALUE,
                            });
                            that.locProdFilters.push(sFilter);

                        }
                    }
                    that.oProd.setValue(oProd);


                    if (oLoc) {
                        that.oLoc1.setValue(oLoc);
                        that.oGModel.setProperty("/setLocation", oLoc);
                    } else {
                        that.oLoc1.setValue("");
                    }
                    if (oProd) {
                        that.oProd.setValue(oProd);
                        that.oGModel.setProperty("/setProduct", oProd);

                    } else {
                        that.oProd.setValue("");
                    }
                    if (oType) {
                        that.oType.setSelectedKey(oType)
                        that.oGModel.getProperty("/defaultType", oType);
                    }
                    else {
                        that.oType.setValue("");
                    }

                    sap.ui.core.BusyIndicator.hide();
                }
                else {
                    sap.ui.core.BusyIndicator.hide();
                    //do nothing
                    that.byId("idProductPID").setValue();
                    that.byId("idLocationPID").setValue();
                    //  that.byId("idCustGrp").removeAllTokens();
                    that.onReset();
                }
            }


        },

        onReset: function () {
            that.byId("idLocationPID").setValue("");
            that.byId("idProductPID").setValue("");
            that.byId("idPrpIdTypePID").setSelectedKey("3");
            // var existingDiv = document.querySelector(`[id*=mainDivPID]`);
            // var newDiv = document.createElement("div");
            // newDiv.id = `pivotGrid`;
            // newDiv.textContent = "";
            var excel = document.querySelector("[id*=mainDivPID]");
            excel.innerHTML = " ";
            that.byId("idcluCountPID").setText("Clustering Count : 0");
        },
        /**
          * Saving the VIEW on press of save in NameVariant fragment
          * @param {*} oEvent 
          */
        onCreate: function (oEvent) {
            sap.ui.core.BusyIndicator.show();
            var array = [];
            var details = {};
            var sLocation = that.byId("idLocationPID").getValue();
            var Field1 = that.byId("idLocPID").getText();
            var sProduct = that.byId("idProductPID").getValue();
            var Field2 = that.byId("idProdPID").getText();
            var sType = that.byId("idPrpIdTypePID").getSelectedKey()
            var Field3 = that.byId("idTypePID").getText()
            var varName = oEvent.getParameters().name;
            var sDefault = oEvent.getParameters().def;
            var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            if (!sLocation && !sProduct && sType.length === 0) {
                sap.ui.core.BusyIndicator.hide();
                return MessageToast.show("No values selected in filters Configurable Product,Demand Location & Customer Group")
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
                if (sLocation) {
                    details = {
                        Field: Field1,
                        FieldCenter: (1).toString(),
                        Value: sLocation,
                        Default: defaultChecked
                    }
                    array.push(details);
                }
                if (sProduct) {
                    details = {
                        Field: Field2,
                        FieldCenter: (1).toString(),
                        Value: sProduct,
                        Default: defaultChecked
                    }
                    array.push(details);
                }
                if (sType) {
                    details = {
                        Field: Field3,
                        FieldCenter: (1).toString(),
                        Value: sType,
                        Default: defaultChecked
                    }
                    array.push(details);
                }
                // for (var s = 0; s < sCust.length; s++) {
                //     details = {
                //         Field: Field3,
                //         FieldCenter: sCust[s].getKey(),
                //         Value: sCust[s].getText(),
                //         Default: defaultChecked
                //     }
                //     array.push(details);
                // }
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
                        that.byId("idMatList123PID").setModified(false);
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
            var variantUser = that.getUser();
             variantUser = variantUser.toLowerCase();
            if (selected.def) {
                totalVariantData.filter(item1 => {
                    if (JSON.parse(selected.def) === item1.VARIANTID && item1.USER !== variantUser) {
                        count++
                    }
                })
            }
            if (count > 0) {
                sap.ui.core.BusyIndicator.hide();
                that.viewDetails.setData({
                    items12: that.varianNames
                });
                that.byId("idMatList123PID").setModel(that.viewDetails);
                that.byId("idMatList123PID").setDefaultKey(that.UniqueDefKey);
                return MessageToast.show("Variant doesn't belong to logged in user. Cannot make changes to this Variant");
            }
            //Delete the selected variant names
            if (selected.deleted) {
                selected.deleted.forEach(item1 => {
                    totalVariantData.forEach(item2 => {
                        if (JSON.parse(item1) === item2.VARIANTID) {
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
                if (JSON.parse(selected.def) !== 0) {
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
                                var newDefault = totalVariantData.filter(item => item.VARIANTID === JSON.parse(selected.def));
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
                        var selectedVariant = totalVariantData.filter(item => item.VARIANTID === JSON.parse(selected.def));
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


        onAfterRendering: function () {
            that.skip = 0;
            that.byId("idcluCountPID").setText("Clustering Count : 0");

            sap.ui.core.BusyIndicator.show();
            that.getOwnerComponent().getModel("BModel").read("/getUserPreferences", {
                filters: [
                    new Filter("PARAMETER", FilterOperator.EQ, "MAX_RECORDS")
                ],
                success: function (oData) {
                    that.oGModel.setProperty("/MaxCount", oData.results[0].PARAMETER_VALUE);
                    // that.getVariantData();
                    that.getLocation()
                },
                error: function (oData, error) {
                    console.log(error)
                },
            });
            oGModel = that.getOwnerComponent().getModel("oGModel");

        },

        getLocation: function () {
            var topCount = that.oGModel.getProperty("/MaxCount");
            that.aLocData = []
            that.getOwnerComponent().getModel("BModel").read("/getRolesLocProd", {
                filters:  [new Filter(
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
                        that.skip += (topCount);
                        that.aLocData = that.aLocData.concat(oData.results);
                        that.getLocation();
                    } else {
                        that.skip = 0;
                        that.aLocData = that.aLocData.concat(oData.results);
                        var locData = that.removeDuplicate(that.aLocData, 'DEMAND_LOC')
                        locData = locData.sort((a, b) => a.DEMAND_LOC.localeCompare(b.DEMAND_LOC, undefined, { numeric: true, sensitivity: 'base' }));
                        that.LocModel = new JSONModel();
                        that.LocModel.setData({
                            LocModel: locData
                        })
                        sap.ui.getCore().byId("locPID").setModel(that.LocModel);
                        sap.ui.core.BusyIndicator.hide();
                        // that.getProduct()


                    }
                    // that.aLocData = oData.results;
                    // that.LocModel = new JSONModel();
                    // that.LocModel.setData({
                    //     LocModel: that.aLocData
                    // })
                    // sap.ui.getCore().byId("loc").setModel(that.LocModel);
                    // sap.ui.core.BusyIndicator.hide();
                    // that.getProduct()

                },
                error: function (oData, error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("error");
                },
            });
        },

        getProduct: function () {
            var topCount = parseInt(30000)
            sap.ui.core.BusyIndicator.show();
            // that.getOwnerComponent().getModel("BModel").read("/genPartialProd", {
            //     urlParameters: {
            //         "$skip": that.skip,
            //         "$top": topCount
            //     },
            //     success: function (oData) {
            //         sap.ui.core.BusyIndicator.hide();
            //         if (topCount == oData.results.length) {
            //             that.skip += topCount;
            //             that.allData = that.allData.concat(oData.results);
            //             that.getProduct();
            //         } else {
            //             that.skip = 0;
            // that.allData = that.allData.concat(oData.results);
            // oData.results = that.allData;
            // that.ProdData = that.allData;
            // that.ProdModel = new JSONModel();
            // that.prodData = oData.results;
            // that.ProdModel.setData({
            //     ProdModel: oData.results
            // });
            // }
            // },
            //     error: function (oData, error) {
            //         sap.ui.core.BusyIndicator.hide();
            //         MessageToast.show("error");
            //     },
            // });
        },

        onClose: function (oEvent) {
            that._prodFrag.close();
        },

        onValueHelp: function (oEvent) {
            var oEv = oEvent.getSource().sId;
            if (oEv.includes("idLocationPID")) {
                sap.ui.getCore().byId("locPID").getBinding("items").filter([])
                that._locFrag.open()

            } else {
                if (that.byId("idLocationPID").getValue().length > 0) {
                    if (sap.ui.getCore().byId("prodPID").getItems().length > 0) {
                        sap.ui.getCore().byId("prodPID").getBinding("items").filter([])
                        that._prodFrag.open()
                    } else {
                        that.onLocationSelect(oEvent);
                        that._prodFrag.open()
                    }

                } else {
                    MessageToast.show("Please Select a Location")
                }

            }


            // var oLoc = that.oGModel.getProperty("/setLocation");
            // var oProd = that.oGModel.getProperty("/setProduct");

            // var oLocation = that.aLocData;
            // var oProduct = that.prodData;

            // if (oEv.includes("idLocationPID")) {

            //     for (var k = 0; k < oLocation.length; k++) {
            //         if (oLocation[k].LOCATION_ID === oLoc) {
            //             oLocation[k].setSelected(true);
            //         }
            //     }
            //     that._locFrag.open();
            //     // Prod Dialog
            // }
            // else if (that.byId("idLocationPID").getValue().length > 0) {

            //     var oLoc = that.oGModel.getProperty("/setLocation");
            //     for (var k = 0; k < oProduct.length; k++) {
            //         if (oProduct[k].PRODUCT_ID === oProd) {
            //             oProduct[k].setSelected(true);
            //         }
            //     }
            //     that._prodFrag.open();
            // }
            // else {
            //     MessageToast.show("Please Select a Location");
            // }
        },

        onLocationSelect: function (oEvent) {
            var oEv = oEvent.getParameter("selectedItem");
            if (!oEv) {
                that.aProd = that.aLocData.filter((e) => e.DEMAND_LOC == that.byId("idLocationPID").getValue());
                that.ProdModel = new JSONModel();
                that.ProdModel.setData({
                    ProdModel: that.aProd
                });
                sap.ui.getCore().byId("prodPID").setModel(that.ProdModel)
                return;
            }
            that.aProd = that.aLocData.filter((e) => e.DEMAND_LOC == oEv.getTitle());
            that.aProd = that.removeDuplicate(that.aProd, 'PRODUCT_ID')
            that.ProdModel = new JSONModel();
            that.ProdModel.setData({
                ProdModel: that.aProd
            });
            sap.ui.getCore().byId("prodPID").setModel(that.ProdModel)
            that.byId("idLocationPID").setValue(oEv.getTitle());
            var selectedLocItem = oEv.getTitle()
            if (that.oGModel.getProperty("/defaultLocation") !== selectedLocItem) {
                that.byId("idMatList123PID").setModified(true);
            }
            that.byId("idProductPID").setValue("")
            // that._locFrag.close()
        },
        onProdSelect: function (oEvent) {
            var oEv = oEvent.getParameter("selectedItem");
            if (!oEv) {
                return
            }
            var selectedLocItem = oEv.getTitle()
            that.byId("idProductPID").setValue(oEv.getTitle());
            if (that.oGModel.getProperty("/defaultLocation") !== selectedLocItem) {
                that.byId("idMatList123PID").setModified(true);
            }
            // that.onGetData()

        },

        handleSearch: function (oEvent) {
            var sQuery =
                oEvent.getParameter("value") || oEvent.getParameter("newValue"),
                sId = oEvent.getParameter("id"),
                oFilters = [];
            sQuery = sQuery ? sQuery.trim() : "";
            if (sId.includes("locPID")) {
                if (sQuery !== "") {
                    oFilters.push(
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("DEMAND_LOC", sap.ui.model.FilterOperator.Contains, sQuery),
                                new sap.ui.model.Filter("DEMAND_DESC", sap.ui.model.FilterOperator.Contains, sQuery)
                            ],
                            and: false
                        })
                    );
                }


                sap.ui.getCore().byId("locPID").getBinding("items").filter(oFilters);

            }
            else if (sId.includes("prodPID")) {
                if (sQuery !== "") {
                    oFilters.push(
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("PRODUCT_ID", sap.ui.model.FilterOperator.Contains, sQuery),
                                new sap.ui.model.Filter("PROD_DESC", sap.ui.model.FilterOperator.Contains, sQuery)
                            ],
                            and: false
                        })
                    );
                }
                sap.ui.getCore().byId("prodPID").getBinding("items").filter(oFilters);
            }


        },
        onSelectionofPrpType: function (oEvent) {
            that.selLoc = that.byId("idLocationPID").getValue();
            that.oSelProd = that.byId("idProductPID").getValue();
            if (that.selLoc.length > 0 && that.oSelProd.length > 0) {
                // var oEv = oEvent.getSource()
                // var oSelId = that.byId("idPrpIdTypePID").getSelectedKey();
                that.onGetData()
                // var data  = that.oPrimKeys.filter((e) => e.PRP_PID_TYPE == parseInt(oSelId))
                // if (data.length > 0) {
                //     that.pivotTable(data);
                // } else {
                // var excel = document.querySelector("[id*=mainDivPID]");
                // excel.innerHTML = " ";
                // MessageToast.show("No Data for Selected Primary ID Type");

                // }
            } else {
                MessageToast.show("Please Select Mandatory Fields")
                return;
            }
        },
        onGetData: function () {
            that.selLoc = that.byId("idLocationPID").getValue();
            that.oSelProd = that.byId("idProductPID").getValue();
            if (that.selLoc.length > 0 && that.oSelProd.length > 0) {
                sap.ui.core.BusyIndicator.show();
                that.getOwnerComponent().getModel("BModel").callFunction("/getClusterPRPid", {
                    method: "GET",
                    urlParameters: {
                        LOCATION_ID: that.selLoc,
                        PRODUCT_ID: that.oSelProd,
                    },
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        that.oPrimKeys = JSON.parse(oData.getClusterPRPid);
                        that.getOwnerComponent().getModel("oGModel").setProperty("/DownLoadData", that.oPrimKeys);

                        oGModel = that.getOwnerComponent().getModel("oGModel");
                        var sKey = that.byId("idPrpIdTypePID").getSelectedKey();
                        if (sKey) {
                            var data = that.oPrimKeys.filter((e) => e.PRP_PID_TYPE == parseInt(sKey))
                        }
                        else {
                            var data = that.oPrimKeys;
                        }
                        if (data.length > 0) {
                            that.pivotTable(data);
                        } else {
                            MessageToast.show("No Data for Selected Fields");
                            var excel = document.querySelector("[id*=mainDivPID]");
                            excel.innerHTML = " ";
                            that.byId("idcluCountPID").setText("Clustering Count : 0");
                        }
                        // var count = data.map(item => item.CLUSTER_ID);

                        var count = that.removeDuplicate(data, "CLUSTER_ID");

                        that.byId("idcluCountPID").setText("Clustering Count : " + " " + count.length);

                        if (that.oSelProd.length || that.selLoc.length > 0) {
                            that.saveDefaultVariant();
                        }


                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("error");
                    },
                })
            } else {
                MessageToast.show("Please Select Mandatory Fields")
                return;
            }




        },
        removeDuplicate: function (array, key) {
            var check = new Set();
            return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
        },
        // Pivot table functions
        jsonToPivotData: function (data) {
            const headers = [];
            const keys = Object.keys(data[0]);
            keys.forEach(key => {
                let label;
                switch (key) {
                    case "CLUSTER_ID":
                        label = "Cluster_ID";
                        break;
                    case "PROFILE":
                        label = "Profile";
                        break;

                    case "PID":
                        label = "Primary_ID";
                        break;
                    case "PRPID":
                        label = "PRP_ID";
                        break;

                    case "PRP_PID_TYPE":
                        label = "Prp Pid Type";
                        break;

                    case "CHARVAL_DESC":
                        label = "Char Desc";
                        break;
                    case "CHAR_NAME":
                        label = "Char Name";
                        break;
                    case "CHAR_VALUE":
                        label = "Char Val";
                        break;
                    case "REF_PRODID":
                        label = "Ref Prod ID";
                        break;
                    case "WEIGHTAGE":
                        label = "Weightage";
                        break;
                    case "GROUP_NAME":
                        label = "Group Name";
                        break;
                    default:
                        label = key;
                        break;
                }
                headers.push(label);
            });
            that.headers = headers;
            const data1 = data.map(item => Object.values(item));
            return [headers, ...data1];
        },
        addScrollEvent: function () {
            var oPivotDiv = that.byId("mainDivPID").getDomRef();

            // Track previous scroll position
            var lastScrollTop = 0;
            var isEventTriggered = false;

            if (oPivotDiv) {
                oPivotDiv.addEventListener("scroll", function (e) {
                    var currentScrollTop = oPivotDiv.scrollTop;
                    var scrollHeight = oPivotDiv.scrollHeight;
                    var clientHeight = oPivotDiv.clientHeight;

                    // Check if the user has scrolled vertically (ignores horizontal scroll)
                    if (currentScrollTop > lastScrollTop) {
                        // User is scrolling vertically
                        // Check if scrolled to the bottom and the event hasn't already triggered
                        if (!isEventTriggered && that.hasMoreData && currentScrollTop + clientHeight >= scrollHeight - 1) {
                            // Trigger the event only once
                            isEventTriggered = true;

                            // Load more data
                            // that.skip += that.topCount;
                            // that.loadData(that.skip, that.topCount);

                            // Reset the flag after data loading is done (example: simulate data load completion)
                            setTimeout(function () {
                                isEventTriggered = false;
                            }, 1000); // Adjust the timeout according to data loading time
                        }
                    }

                    // Update last scroll position
                    lastScrollTop = currentScrollTop;
                });
            }
        },
        pivotTable: function (data) {
            that.pivotData = data
            that.PData = data.map(item => item.PRIMARY_ID);
            that.PRIMARY_ID = [];
            that.aUnSelected = [];

            // data = data.sort((a, b) => a.QUANTITY - b.QUANTITY);

            that.selLoc = data[0].LOCATION_ID;
            that.selProd = data[0].PRODUCT_ID;

            var existingDiv = document.querySelector(`[id*=mainDivPID]`);
            var newDiv = document.createElement("div");
            newDiv.id = `pivotGrid`;
            newDiv.textContent = "";
            var existingDiv = document.querySelector(`[id*='mainDivPID']`);

            existingDiv.appendChild(newDiv);
            var pivotDiv = document.querySelector(`[id*='pivotGrid']`);

            if (window.jQuery && window.jQuery.fn.pivot) {
                var pivotDiv = that.byId("mainDivPID").getDomRef();
                var pivotData = that.jsonToPivotData(data);
                // that.pivotData = pivotData;

                if (!rows) {
                    var rows = ["PRP_ID", "Profile", "Cluster_ID", "Primary_ID"]; //common rows
                }
                that.curRows = rows;
                if (!cols) {
                    var cols = ["Group Name", "Char Name"];
                }
                if (!val) {
                    var val = ["Char Val"];
                }
                that.curVal = val;
                // var sum = $.pivotUtilities.aggregatorTemplates.sum;                
                // var numberFormat = $.pivotUtilities.numberFormat;
                // var intFormat = numberFormat({digitsAfterDecimal: 0});
                // $("#output").pivotUI(
                //     $.pivotUtilities.tipsData, {
                //       rows: ["sex", "smoker", "Age"],
                //       cols: ["day", "time"],
                //       vals: ["tip", "total_bill"],
                //       aggregatorName: "Sum over Sum",
                //       rendererName: "Table"
                //     });
                $(pivotDiv).pivot(pivotData, {
                    rows: rows,
                    cols: cols,
                    // aggregator: sum(intFormat)(["val"]),
                    // aggregator: $.pivotUtilities.aggregators["Sum"](val),
                    aggregator: $.pivotUtilities.aggregators["List Unique Values"](val),
                    renderer: $.pivotUtilities.renderers["Table"],
                    // rendererOptions: {
                    //     // table: {
                    //     clickCallback: function (e, value, filters, pivotData) {
                    //         var names = [];
                    //         that.cellD = filters;
                    //         that.sPresVal = that.cellD["Primary ID"];




                    //     }
                    //     // },

                    // },

                    sorters: {
                        // "Primary ID": function (a, b) {
                        //     if (!that.sortCols || !that.sortCols.length) return 0;

                        //     const getCharValue = (id, col) =>
                        //         that.pivotData.find(o => o.PID === id && o.CHAR_NAME === col)?.CHAR_VALUE;

                        //     const compareValues = (valA, valB) => {
                        //         if (typeof valA === "number" && typeof valB === "number") {
                        //             return valA - valB;
                        //         } else {
                        //             return String(valA).localeCompare(String(valB));
                        //         }
                        //     };

                        //     for (let i = 0; i < that.sortCols.length; i++) {
                        //         const col = that.sortCols[i];
                        //         const valA = getCharValue(a, col);
                        //         const valB = getCharValue(b, col);

                        //         if (valA !== undefined && valB !== undefined) {
                        //             const result = compareValues(valA, valB);
                        //             if (result !== 0) return result;
                        //         } else {
                        //             return 0; // Stop comparison if any value is undefined
                        //         }
                        //     }

                        //     return 0; // All columns are equal
                        // },
                        "PRP_ID": function (a, b) {
                            return 0;
                        },
                        "Profile": function (a, b) {
                            return 0;
                        },
                        "Cluster_ID": function (a, b) {
                            const compareValues = (valA, valB) => {
                                if (typeof valA === "number" && typeof valB === "number") {
                                    return valA - valB;
                                } else {
                                    return String(valB).localeCompare(String(valA));
                                }
                            };
                            const result = compareValues(a, b);
                            return result;
                        },
                        "Group Name": function (a, b) {

                            const getCharValue = (id) =>
                                that.pivotData.find(o => o.GROUP_NAME === id)?.WEIGHTAGE;

                            const compareValues = (valA, valB) => {
                                if (typeof valA === "number" && typeof valB === "number") {
                                    return valB - valA;
                                } else {
                                    return String(valB).localeCompare(String(valA));
                                }
                            };
                            const valA = getCharValue(a);
                            const valB = getCharValue(b);
                            const result = compareValues(parseInt(valA), parseInt(valB));
                            return result
                        }

                    }
                });
                $(pivotDiv).ready(function () {
                    $(pivotDiv).find('tbody th').each(function (i) {
                        that.index = i;
                        $(this).on('click', function (value, filters) {
                            let tr2 = $(pivotDiv).find('thead tr')[1];
                            let cellIn = $(this).index();

                            var temp = that.PData.filter(el => el == $(this).text());

                            if (temp.length > 0) {
                                if ($(this)[0].className.includes("colorGreen") === true) {
                                    $(this).removeClass("colorGreen");
                                    $(this).addClass("colorRed");
                                    var obj = { pid: $(this).text() };
                                    that.aUnSelected.push(obj);


                                } else if ($(this)[0].className.includes("colorYellow") === true) {
                                    $(this).removeClass("colorYellow");
                                    var index = that.PRIMARY_ID.findIndex(el => el.pid === $(this).text());
                                    that.PRIMARY_ID.splice(index, 1);
                                } else if ($(this)[0].className.includes("colorRed") === true) {
                                    $(this).removeClass("colorRed");
                                    $(this).addClass("colorGreen");
                                    var index = that.aUnSelected.findIndex(el => el.pid === $(this).text());
                                    that.aUnSelected.splice(index, 1);

                                } else {
                                    $(this).addClass('colorYellow');
                                    var obj = { pid: $(this).text() };
                                    that.PRIMARY_ID.push(obj);
                                }


                            }

                            // if($(this).rowspan <10 && cellIn >0){
                            //     cellIn +=2
                            // }
                            // let label = $(tr2).find('th')[cellIn].textContent

                            // // var clickedText = $(this).text(); // Get the text of the clicked <th>
                            // // var rowIndex = $(this).closest('tr').index()
                            // // that.sPivotText = clickedText
                            // // var rowHeader = $(pivotDiv).find('tbody .pvtRowLabel').eq(rowIndex).text().trim();
                            // // console.log(rowHeader)
                            // // alert("TH Clicked:\n" + clickedText);
                        })
                    })
                    // $(pivotDiv).find('thead th').each(function () {
                    //     $(this).on('click', function () {
                    //         var colHeader = $(this).text().trim();
                    //         alert("Column Header Clicked: " + colHeader);
                    //     });
                    // });
                    $(pivotDiv).find("tr:last").hide();
                    $(pivotDiv).find('thead:first tr:first th:last-child').hide();
                    $(pivotDiv).find('tbody tr').each(function () {
                        $(this).find('td:last-child').hide();
                    })
                }, 0);







                $(pivotDiv).ready(function () {
                    $(pivotDiv).find("tr:last").hide();
                    $(pivotDiv).find('th[rowspan]').each(function () {
                        if (parseInt($(this).attr('rowspan')) > 7) {
                            $(this).css('vertical-align', 'top');
                        }
                    });
                    // let sSelPri = that.PrpidsPrimaryIds;

                    // let aLoop = $(pivotDiv).find('tbody th')
                    // for (var i = 2; i < aLoop.length; i++) {
                    //     for (var j = 0; j < sSelPri.length; j++) {
                    //         if (aLoop[i].innerHTML == sSelPri[j].PRIMARY_ID) {
                    //             $(aLoop[i]).addClass('colorGreen');
                    //         }
                    //     }
                    // }


                    // $(pivotDiv).find('tbody th').each(function (){
                    //     $(pivotDiv).find('tbody th')[2].innerHTML
                    // })
                    //For THead
                    // let firstTrLength = $(pivotDiv).find('thead').find('tr:first').find('th').length;

                    //COMMENTED BELOW CODE

                    // let widthsHead = [0];
                    // for (let i = 0; i < 2; i++) {
                    //     let w = $(pivotDiv).find('thead').find('tr:first').find(`th:eq(${i})`).outerWidth();
                    //     widthsHead.push(widthsHead[i] + w);
                    // }
                    // const secondTr = $(pivotDiv).find('thead').find('tr')[1]
                    // let secondTrLength = $(secondTr).find('th').length;
                    // let widthsHead2 = [0];
                    // for (let i = 0; i < secondTrLength; i++) {
                    //     const secondTr = $(pivotDiv).find('thead').find('tr')[1]
                    //     let w = $(secondTr).find(`th:eq(${i})`).outerWidth();
                    //     widthsHead2.push(widthsHead2[i] + w);
                    // }

                    // $(pivotDiv).find('thead').find('tr').each(function (e) {
                    //     if (e == 0) {
                    //         $(this).find('th').each(function (e) {
                    //             if (e == 0 || e === 1) {
                    //                 $(this).addClass('frezzThead');
                    //                 $(this).css('left', `${widthsHead[e]}px`);
                    //                 // if()
                    //             }

                    //         });
                    //     }
                    //     if (e == 1) {
                    //         $(this).find('th').each(function (e) {
                    //             $(this).addClass('frezzThead');
                    //             $(this).css('left', `${widthsHead2[e]}px`);

                    //         });
                    //     }
                    // });





























                    var tr1 = $(pivotDiv).find('thead').find('tr')[0];
                    var th1 = $(tr1).find('th')[0];
                    $(th1).attr("rowspan", 1);

                    var tr2 = $(pivotDiv).find('thead').find('tr')[1];
                    $(tr2).prepend('<th colspan="4" rowspan="1"></th>');



                    var widthsHeadnew = [0];
                    for (let i = 0; i < 2; i++) {
                        let w = $(pivotDiv).find('thead').find('tr:first').find(`th:eq(${i})`).outerWidth();
                        widthsHeadnew.push(widthsHeadnew[i] + w);
                    }

                    // let widthsHead21 = widthsHeadnew;
                    // const secondTr1 = $(pivotDiv).find('thead').find('tr')[1]
                    // let secondTrLength1 = $(secondTr1).find('th').length;
                    // let widthsHead21 = [widthsHeadnew[1]];
                    // // for (let i = 1; i < 2; i++) {
                    //     // const secondTr1 = $(pivotDiv).find('thead').find('tr')[1]
                    //     let w = $(secondTr1).find(`th:eq(${0})`).outerWidth();
                    //     widthsHead21[0] = widthsHead21[0] + w
                    //     // widthsHead21.push(widthsHead21[i] + w);
                    // // }


                    const thirTr1 = $(pivotDiv).find('thead').find('tr')[2]
                    let ThirTrLength1 = $(thirTr1).find('th').length;
                    let widthsHeadnew1 = [0];
                    for (let i = 0; i < 4; i++) {
                        const thirTr1 = $(pivotDiv).find('thead').find('tr')[2]
                        let w = $(thirTr1).find(`th:eq(${i})`).outerWidth();
                        widthsHeadnew1.push(widthsHeadnew1[i] + w);
                    }

                    $(pivotDiv).find('thead').find('tr').each(function (e) {
                        if (e == 0) {
                            $(this).find('th').each(function (e) {
                                if (e == 0 || e === 1) {
                                    $(this).addClass('frezzThead1');
                                    $(this).css('left', `${widthsHeadnew[e]}px`);
                                    // if()
                                }

                            });
                        }
                        if (e == 1) {
                            $(this).find('th').each(function (e) {
                                if (e == 0 || e === 1) {
                                    $(this).addClass('frezzThead2');
                                    $(this).css('left', `${widthsHeadnew[e]}px`);
                                    // if()
                                }

                            });
                        }

                        if (e == 2) {
                            $(this).find('th').each(function (e) {
                                $(this).addClass('frezzThead3');
                                $(this).css('left', `${widthsHeadnew1[e]}px`);

                            });
                        }

                        // if (e == 3) {
                        //     $(this).find('th').each(function (e) {
                        //         $(this).addClass('frezzThead');
                        //         $(this).css('left', `${widthsHead21[e]}px`);

                        //     });
                        // }
                    });














                    // for TBody
                    let firstTrLength = $(pivotDiv).find('tbody').find('tr:first').find('th').length;
                    let widths = [0];
                    for (let i = 0; i < firstTrLength; i++) {
                        let w = $(pivotDiv).find('tbody').find('tr:first').find(`th:eq(${i})`).outerWidth();
                        widths.push(widths[i] + w);
                    }
                    $(pivotDiv).find('tbody').find('tr').each(function () {
                        let currentTrLength = $(this).find('th').length;
                        let diff = firstTrLength - currentTrLength;
                        if (diff < 0) {
                            firstTrLength = currentTrLength;
                        }
                        $(this).find('th').each(function (e) {
                            let diff = firstTrLength - currentTrLength;
                            if (diff > 0)
                                e += diff;
                            $(this).addClass('frezz');
                            $(this).css('left', `${widths[e]}px`);

                        });
                    });

                    $(pivotDiv).find('td').each(function () {
                        // Get the current cell text
                        let cellText = $(this).text();

                        // Check if there is a decimal and remove everything after it
                        if (cellText.includes('.')) {
                            $(this).text(cellText.split('.')[0]); // Keep only the part before the decimal
                        } else if (!cellText) {
                            $(this).text(0);
                        }
                    });
                }, 0);
                // that.byId('pivotPage').setBusy(false);
            } else {
                console.error("Pivot.js or jQuery is not loaded yet.");
                that.byId('pivotPage').setBusy(false);
            }

        },
        onDownLoad: function () {
            that.selLoc = that.byId("idLocationPID").getValue();
            that.oSelProd = that.byId("idProductPID").getValue();
            var excel = document.querySelector("[id*=mainDivPID]");
            if (excel.innerHTML == "" || excel.innerHTML == " ") {
                MessageToast.show("No Data is not displaying for download");
                return;
            }

            var aCols, oSettings, oSheet;
            var sFileName = "Planning Relevant PID"
            var aCols = [];
            var oStore = [];
            var aDownLoad = that.getOwnerComponent().getModel("oGModel").getProperty("/DownLoadData");


            var aDown = Object.values(aDownLoad)
            for (var j = 0; j < Object.keys(aDown[0]).length; j++) {
                aCols.push({
                    property: Object.keys(aDown[0])[j]
                });
            }
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: aDownLoad,
                fileName: sFileName,
                worker: true
            };
            var oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });



        },
        saveDefaultVariant: function () {
            sap.ui.core.BusyIndicator.show();
            var array = [];
            var details = {};
            var sLocation = that.byId("idLocationPID").getValue();
            var Field1 = that.byId("idLocPID").getText();
            var sProduct = that.byId("idProductPID").getValue();
            var Field2 = that.byId("idProdPID").getText();
            var sType = that.byId("idPrpIdTypePID").getSelectedKey()
            var Field3 = that.byId("idTypePID").getText()

            if (!sLocation && !sProduct && sType.length === 0) {
                sap.ui.core.BusyIndicator.hide();
                return MessageToast.show("No values selected in filters Partial  Product,Demand Location")
            }


            if (sLocation) {
                details = {
                    Field: Field1,
                    FieldCenter: (1).toString(),
                    Value: sLocation,
                    // Default: defaultChecked
                }
                array.push(details);
            }
            if (sProduct) {
                details = {
                    Field: Field2,
                    FieldCenter: (1).toString(),
                    Value: sProduct,
                    // Default: defaultChecked
                }
                array.push(details);
            }
            if (sType) {
                details = {
                    Field: Field3,
                    FieldCenter: (1).toString(),
                    Value: sType,
                    // Default: defaultChecked
                }
                array.push(details);
            }



            for (var j = 0; j < array.length; j++) {
                array[j].IDNAME = "defaultSingle";
                array[j].App_Name = "DefaultSingle";
                array[j].SCOPE = "Global";
            }

            //    console.log(JSON.stringify(array));
            this.getOwnerComponent().getModel("BModel").callFunction("/createVariant", {
                method: "GET",
                urlParameters: {
                    Flag: "N",
                    USER: (that.oGModel.getProperty("/UserId")),
                    VARDATA: JSON.stringify(array)
                },
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                },
                error: function (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to create variant");
                },
            });
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
                oStorage.put("nodeId", 85);
                //Generate a  URL for the second application
                var url = window.location.href.split('#')[0] + hash;
                //Navigate to second app
                sap.m.URLHelper.redirect(url, true);
            }
        },

    });
});