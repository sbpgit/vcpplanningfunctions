sap.ui.define(
    [
        "vcpapp/vcpuniquecharacteristics/controller/BaseController",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/Device",
        "sap/ui/core/Fragment",
        "vcpapp/vcpuniquecharacteristics/model/formatter"
    ],
    function (
        BaseController,
        MessageToast,
        MessageBox,
        JSONModel,
        Filter,
        FilterOperator,
        Device,
        Fragment,
        formatter

    ) {
        "use strict";
        var that, oGModel;
        var aResults;


        return BaseController.extend("vcpapp.vcpuniquecharacteristics.controller.ItemDetail", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             */
            onInit: function () {
                that = this;
                this.bus = sap.ui.getCore().getEventBus();
                // Declaring JSON Models and size limit
                that.oCharModel = new JSONModel();
                this.oCharModel.setSizeLimit(5000);
                that.charnameModel = new JSONModel();
                that.custGrpnameModel = new JSONModel();
                that.charvalueModel = new JSONModel();
                that.oTableData = [];
                that.ListModel = new JSONModel();
                that.custModel = new JSONModel();
                that.locModel = new JSONModel();
                that._oCore = sap.ui.getCore();

            },

            /**
             * Called after the view has been rendered.
             * Calls the service to get Data.
             */
            onAfterRendering: function () {
                
                oGModel = that.getOwnerComponent().getModel("oGModel");
                var arr = oGModel.getProperty("/setTable")
                if(arr.length == 0){
                    var sModel = new JSONModel()
                    sModel.setData({
                        results:arr
                    })
                    that.byId("idMatvarItemUC").setModel(sModel)
                    return 
                }
                sap.ui.core.BusyIndicator.show();
                var sPrdId = oGModel.getProperty("/prdId");
                // var sLocId = oGModel.getProperty("/locId");
                var sUniqId = oGModel.getProperty("/uniqId");
                that.skip = 0;
                that.aData = [];

                oGModel.setProperty("/CharData", "");

                that.oCharModel.setData({
                    results: [],
                });
                that.byId("idMatvarItemUC").setModel(that.oCharModel);
                if (!this.custGroup) {
                    this.custGroup = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.CustomerGroup",
                        this
                    );
                    this.getView().addDependent(this.custGroup);
                }
                if (!this.locationGroup) {
                    this.locationGroup = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.LocDialogNew",
                        this
                    );
                    this.getView().addDependent(this.locationGroup);
                }


                that.allUniqueItems()
                that.allCustGrps()
                // this.getModel("BModel").read("/getUniqueItem", {
                //     filters: [
                //         // new Filter("LOCATION_ID", FilterOperator.EQ, sLocId),
                //         new Filter("PRODUCT_ID", FilterOperator.EQ, sPrdId),
                //         new Filter("UNIQUE_ID", FilterOperator.EQ, sUniqId),
                //     ],
                //     success: function (oData) {
                //         sap.ui.core.BusyIndicator.hide();
                //         oGModel.setProperty("/CharData", oData.results);
                //         var oFilterData = oData.results
                //         const removeDuplicates = (array) => {
                //             const uniqueObjects = [];

                //             array.forEach((obj) => {
                //                 // Check if there is an object with the same char name and char value
                //                 const isDuplicate = uniqueObjects.some(
                //                     (uniqueObj) =>
                //                         uniqueObj.CHAR_NAME === obj.CHAR_NAME && uniqueObj.CHAR_VALUE === obj.CHAR_VALUE
                //                 );

                //                 // If not a duplicate, add it to the uniqueObjects array
                //                 if (!isDuplicate) {
                //                     uniqueObjects.push(obj);
                //                 }
                //             });

                //             return uniqueObjects;
                //         };

                //         const result = removeDuplicates(oFilterData);

                //         that.oCharModel.setData({
                //             results: result,
                //         });
                //         that.byId("idMatvarItemUC").setModel(that.oCharModel);
                //     },
                //     error: function () {
                //         sap.ui.core.BusyIndicator.hide();
                //         MessageToast.show("No data");
                //     },
                // });

                // this.getModel("BModel").read("/getCustgroup", {

                //     success: function (oData) {
                //         // sap.ui.core.BusyIndicator.hide();
                //         that.custData = oData.results;
                //         that.custModel.setData({ item1: oData.results });
                //         sap.ui.getCore().byId("CustGrpUC").setModel(that.custModel);
                //     },
                //     error: function (oData, error) {
                //         // sap.ui.core.BusyIndicator.hide();
                //         MessageToast.show("error");
                //     },
                // });
            },

            /**
             * Called when something is entered into the search field.
             * @param {object} oEvent -the event information.
             */
            onCharSearch: function (oEvent) {
                var sQuery = "",
                    oFilters = [];
                if (oEvent) {
                    sQuery =
                        oEvent.getParameter("value") || oEvent.getParameter("newValue");
                }
                if (sQuery !== "") {
                    oFilters.push(
                        new Filter({
                            filters: [
                                new Filter("CHAR_NAME", FilterOperator.Contains, sQuery),
                                new Filter("CHAR_VALUE", FilterOperator.Contains, sQuery),
                                new Filter("CHAR_DESC", FilterOperator.Contains, sQuery)
                            ],
                            and: false,
                        })
                    );
                }
                that.byId("idMatvarItemUC").getBinding("items").filter(oFilters);
                var uCount = that.byId("idMatvarItemUC").getBinding("items").filter(oFilters).aIndices.length
                that.byId("idUCCC").setText("Characteristics Count: " +   uCount )
            },
            /**
             * Open Create Seed Order fragment and setting up default values
             **/
            onOrderCreate: function () {

                if (!this._CreateSO) {
                    this._CreateSO = sap.ui.xmlfragment(
                        "vcpapp.vcpuniquecharacteristics.view.CreateSeedOrder",
                        this
                    );
                    this.getView().addDependent(this._CreateSO);
                }

                this._CreateSO.open();
                // sap.ui.getCore().byId("idlocIdSOUC").setValue(oGModel.getProperty("/locId"));
                sap.ui.getCore().byId("idprodIdSOUC").setValue(oGModel.getProperty("/prdId"));
                sap.ui.getCore().byId("idUniqSOUC").setValue(oGModel.getProperty("/uniqId"));
                sap.ui.getCore().byId("idUniqSODescUC").setValue(oGModel.getProperty("/uniqIdDesc"));
            },
            /**
             * Close Create Seed Order fragment
             **/
            onCloseSO: function () {
                this._CreateSO.close();

                sap.ui.getCore().byId("idOrdQtySOUC").setValueState("None");
                sap.ui.getCore().byId("idCustUC").setValue("");
                sap.ui.getCore().byId("idOrdQtySOUC").setValue("");
                sap.ui.getCore().byId("DP1SOUC").setValue("");

            },

            onNumChange: function () {
                var squan = sap.ui.getCore().byId("idOrdQtySOUC").getValue();
                // squan =parseInt(squan);
                sap.ui.getCore().byId("idOrdQtySOUC").setValueState("None");

                if (squan < 1) {

                    sap.ui.getCore().byId("idOrdQtySOUC").setValue("");
                    sap.ui.getCore().byId("idOrdQtySOUC").setValueState("Error");
                    sap.ui.getCore().byId("idOrdQtySOUC").setValueStateText("Can not be add 0 quantity");
                }
                //  else {
                //     sap.ui.getCore().byId("idOrdQtySOUC").setValue(squan);
                // }

                if (squan.includes(".")) {
                    sap.ui.getCore().byId("idOrdQtySOUC").setValueState("Error");
                    sap.ui.getCore().byId("idOrdQtySOUC").setValueStateText("Decimals are not allowed");
                }


            },
            /**
             * Creating new Seed Order for respective Location, Product
             **/
            onCreateSO: function () {
                var sLoc = sap.ui.getCore().byId("idlocIdSOUC").getValue(),
                    sProd = sap.ui.getCore().byId("idprodIdSOUC").getValue(),
                    sUniq = parseInt(sap.ui.getCore().byId("idUniqSOUC").getValue()),
                    squan = sap.ui.getCore().byId("idOrdQtySOUC").getValue(),
                    sCustGrp = sap.ui.getCore().byId("idCustUC").getValue(),
                    sDate = sap.ui.getCore().byId("DP1SOUC").getValue();

                var oEntry = {
                    SEEDDATA: [],
                },
                    vRuleslist,
                    oFlag = "C";
                vRuleslist = {
                    LOCATION_ID: sLoc,
                    PRODUCT_ID: sProd,
                    UNIQUE_ID: sUniq,
                    CUSTOMER_GROUP: sCustGrp,
                    ORD_QTY: squan,
                    MAT_AVAILDATE: sDate
                };
                oEntry.SEEDDATA.push(vRuleslist);

                if (squan !== NaN && sDate !== "" && sUniq !== NaN) {
                    if (sap.ui.getCore().byId("idOrdQtySOUC").getValueState() !== "Error") {
                        that.getModel("BModel").callFunction("/maintainSeedOrder", {
                            method: "GET",
                            urlParameters: {
                                FLAG: oFlag,
                                SEEDDATA: JSON.stringify(oEntry.SEEDDATA)
                            },
                            success: function (oData) {
                                sap.ui.core.BusyIndicator.hide();
                                sap.m.MessageToast.show(oData.maintainSeedOrder);

                                that.onCloseSO();
                                that.onAfterRendering();
                            },
                            error: function (error) {
                                sap.ui.core.BusyIndicator.hide();
                                sap.m.MessageToast.show("Error creating a Seed Order");
                            },
                        });
                    } else {
                        sap.m.MessageToast.show("Decimals are not allowed");
                    }
                } else {
                    sap.m.MessageToast.show("Please fill all fields");
                }
            },
            handleValueHelp: function (oEvent) {
                var sId = oEvent.getSource().getId();
                if (sId.includes("idCust")) {
                    that.custGroup.open();
                }
                else if (sId.includes("idlocIdSO")) {
                    that.allLoc()

                    // this.getModel("BModel").read("/getLocProdDet", {
                    //     filters: [
                    //         new Filter(
                    //             "PRODUCT_ID",
                    //             FilterOperator.EQ,
                    //             sap.ui.getCore().byId("idprodIdSOUC").getValue()
                    //         ),
                    //     ],
                    //     success: function (oData) {
                    //         that.locModel.setData(oData);
                    //         sap.ui.getCore().byId("LocSlctList1UC").setModel(that.locModel);
                    //     },
                    //     error: function (oData, error) {
                    //         MessageToast.show("error");
                    //     },
                    // });

                }
            },
            handleSelection: function (oEvent) {
                var sID = oEvent.getSource().getId();

                if (sID.includes("LocSlctList1UC")) {
                    var selectedItem = oEvent.getParameters().listItem.getCells()[0].getTitle();
                    sap.ui.getCore().byId("idlocIdSOUC").setValue(selectedItem);
                    that.locationGroup.close();
                }
                else {
                    var selectedItem = oEvent.getParameters().selectedItem.getTitle();
                    sap.ui.getCore().byId("idCustUC").setValue(selectedItem);
                }
            },
            handleClose: function () {
                that.locationGroup.close();
            },
            handleSearch1: function (oEvent) {
                var oLocList = sap.ui.getCore().byId("LocSlctList1UC");
                var sQuery =
                    oEvent.getParameter("value") || oEvent.getParameter("newValue"),
                    sId = oEvent.getParameter("id"),
                    oFilters = [];
                // Check if search filter is to be applied
                sQuery = sQuery ? sQuery.trim() : "";
                if (sId.includes("Loc")) {
                    if (sQuery !== "") {
                        oFilters.push(
                            new Filter({
                                filters: [
                                    new Filter("LOCATION_ID", FilterOperator.Contains, sQuery),
                                    new Filter("LOCATION_DESC", FilterOperator.Contains, sQuery)

                                ],
                                and: false,
                            })
                        );
                    }
                    oLocList.getBinding("items").filter(oFilters);

                }
                else if (sId.includes("CustGrp")) {
                    if (sQuery !== "") {
                        oFilters.push(
                            new Filter({
                                filters: [
                                    new Filter("CUSTOMER_GROUP", FilterOperator.Contains, sQuery),
                                    new Filter("CUSTOMER_DESC", FilterOperator.Contains, sQuery)
                                ],
                                and: false,
                            })
                        );
                    }
                    sap.ui.getCore().byId("CustGrpUC").getBinding("items").filter(oFilters);
                }
            },
            allUniqueItems: function () {
                var topCount = that.getModel("oGModel").getProperty("/MaxCount")
                var sPrdId = oGModel.getProperty("/prdId");
                var sUniqId = oGModel.getProperty("/uniqId");
                this.getModel("BModel").callFunction("/getUniqueIdItemsNew", {
                    // filters: [
                    //     new Filter("PRODUCT_ID", FilterOperator.EQ, sPrdId),
                    //     new Filter("UNIQUE_ID", FilterOperator.EQ, sUniqId),
                    // ],
                    method: "GET",
                    urlParameters: {
                        // "$skip": that.skip,
                        // "$top": topCount
                        PRODUCT_ID: sPrdId,
                        UNIQUE_ID: sUniqId
                    },
                    success: function (oData) {
                        var data = JSON.parse(oData.getUniqueIdItemsNew);
                        // if (topCount ==data.length) {
                        //     that.skip += topCount;
                        //     that.aData = that.aData.concat(data);
                        //     that.allUniqueItems();
                        // }
                        if (data.length === 0) {
                            MessageToast.show("No data available for unique id");
                            let sCharC = data.length
                            that.byId("idUCCC").setText("Characteristics Count: " +   sCharC );
                        }
                        else {
                            // that.skip = 0;
                            that.aData = that.aData.concat(data);
                            sap.ui.core.BusyIndicator.hide();
                            data = that.aData
                            that.aData = [];
                            oGModel.setProperty("/CharData", data);
                            var oFilterData = data
                            const removeDuplicates = (array) => {
                                const uniqueObjects = [];
                                array.forEach((obj) => {
                                    // Check if there is an object with the same char name and char value
                                    const isDuplicate = uniqueObjects.some(
                                        (uniqueObj) =>
                                            uniqueObj.CHAR_NAME === obj.CHAR_NAME && uniqueObj.CHAR_VALUE === obj.CHAR_VALUE
                                    );
                                    // If not a duplicate, add it to the uniqueObjects array
                                    if (!isDuplicate) {
                                        uniqueObjects.push(obj);
                                    }
                                });
                                return uniqueObjects;
                            };
                            const result = removeDuplicates(oFilterData);


                            let sCharC = result.length
                            that.byId("idUCCC").setText("Characteristics Count: " +   sCharC )
                            that.oCharModel.setData({
                                results: result,
                            });
                            that.byId("idCharSearchUC1").setValue()
                            that.byId("idMatvarItemUC").getBinding("items").filter([]);
                            that.byId("idMatvarItemUC").setModel(that.oCharModel);
                            var sSelected = oGModel.getProperty("/CharName")
                            if (sSelected) {
                                var sSelectionItem = that.byId("idMatvarItemUC").getItems();
                                sSelectionItem.map(e => e.setSelected(false));
                                // sSelectionItem.forEach((j)=>{
                                //      sSelected.forEach((e)=>{
                                //     if(j.getBindingContext().getObject().CHAR_NAME == e.CHAR_NAME &&  j.getBindingContext().getObject().CHAR_VALUE == e.CHAR_VALUE){
                                //         // that.byId("idMatvarItemUC").setSelectedItem(j,true)
                                //         j.setSelected(true)
                                //     }else{
                                //         j.setSelected(false)
                                //     }
                                // })
                                // })
                                sSelectionItem.forEach(item => {
                                    var obj = item.getBindingContext().getObject();

                                    // Check if this row exists in sSelected
                                    var match = sSelected.find(e =>
                                        e.CHAR_NAME === obj.CHAR_NAME &&
                                        e.CHAR_VALUE === obj.CHAR_VALUE
                                    );

                                    if (match) {
                                        item.setSelected(true);     // <-- correctly selecting the row
                                    }
                                });

                            }
                            else {
                            }
                            // that.byId("idMatvarItemUC").getBinding("items").refresh(true);
                        }
                    },
                    error: function () {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("No data");
                    },
                });
            },

            highlightRow: function (sCharValue) {
                var aList = that.getView().getModel("HL")?.getProperty("/highlightList") || [];

                if (aList.includes(sCharValue)) {
                    return "Information";   // highlight color
                }
                return "None";
            },
            allCustGrps: function () {
                var topCount = that.getModel("oGModel").getProperty("/MaxCount")
                this.getModel("BModel").read("/getCustgroup", {
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
                    },
                    success: function (oData) {
                        if (topCount == oData.results.length) {
                            that.skip += topCount;
                            that.aData = that.aData.concat(oData.results);
                            that.allCustGrps();
                        }
                        else {
                            that.skip = 0;
                            that.aData = that.aData.concat(oData.results);
                            sap.ui.core.BusyIndicator.hide();
                            oData.results = that.aData
                            that.aData = []
                            that.custData = oData.results;
                            that.custModel.setData({ item1: oData.results });
                            sap.ui.getCore().byId("CustGrpUC").setModel(that.custModel);
                        }
                    },
                    error: function () {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("No data");
                    },
                });
            },
            allLoc: function () {
                var topCount = that.getModel("oGModel").getProperty("/MaxCount")
                // this.getModel("BModel").read("/getLocProdDet", {
                //     filters: [
                //         new Filter(
                //             "PRODUCT_ID",
                //             FilterOperator.EQ,
                //             sap.ui.getCore().byId("idprodIdSOUC").getValue()
                //         ),
                //     ],
                //     urlParameters: {
                //         "$skip": that.skip,
                //         "$top": topCount
                //     },
                //     success: function (oData) {
                //         if (topCount == oData.results.length) {
                //             that.skip += topCount;
                //             that.aData = that.aData.concat(oData.results);
                //             that.allLoc();
                //         }
                //         else {
                //             that.skip = 0;
                //             that.aData = that.aData.concat(oData.results);
                const removeDuplicate = (array, key) => {
                    var check = new Set();
                    return array.filter(obj => !check.has(obj[key]) && check.add(obj[key]));
                }
                var prodSelected = sap.ui.getCore().byId("idprodIdSOUC").getValue();
                var locData = oGModel.getProperty("/fullData");
                locData = locData.filter(id => id.REF_PRODID == prodSelected);
                locData = removeDuplicate(locData, 'DEMAND_LOC');
                sap.ui.core.BusyIndicator.hide();
                // oData.results = that.aData
                // that.aData = []
                that.locModel.setData({ results: locData });
                sap.ui.getCore().byId("LocSlctList1UC").setModel(that.locModel);
                // that.locationGroup.open();  
                //         }   
                //     },
                //     error: function () {
                //         sap.ui.core.BusyIndicator.hide();
                //         MessageToast.show("No data");
                //     },
                // });
                that.locationGroup.open();

            }

        });
    });
