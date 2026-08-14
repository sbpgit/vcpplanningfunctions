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
        "../model/formatter",
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
        return Controller.extend("vcpapp.vcpoptionpercentage.controller.Home", {
            formatter: formatter,
            onInit: function () {
                that = this;
                that.viewDetails = new JSONModel();
                that.viewDetails.setSizeLimit(5000);
                that.variantModel = new JSONModel();
                that.variantModel.setSizeLimit(5000);
                that.oCore = sap.ui.getCore();
                that.loadFragments();
                that.sUser = that.getUserDetails();
                that.oTree = that.getView().byId("idTree");
                that.oModel = that.getOwnerComponent().getModel("oModel");
                that.aModel = that.getOwnerComponent().getModel("aModel");
                that.getView().byId("smartFilterBar").setModel(that.aModel);
                that.oGModel = that.getOwnerComponent().getModel("oGModel");
                that.smartFilterBar = that.getView().byId("smartFilterBar");

                // var oSFB = this.byId("smartFilterBar");
                // if (!oSFB) return;

                // // Apply defaults when app loads
                // this._applyDefaults();

                // // Reapply defaults when filters are cleared, changed, or searched
                // oSFB.attachClear(this._applyDefaultsLater, this);
                // oSFB.attachSearch(this._applyDefaultsLater, this);

                // // Listen for model updates (covers async internal rebuilds)
                // if (oSFB.getModel()) {
                //     oSFB.getModel().attachEvent("propertyChange", this._applyDefaultsLater, this);
                // }
                // this._applyStaticFilters();

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
                that.staticRows = [
                    { data: "LOCATION", readOnly: false, wordWrap: true },
                    { data: "PRODUCT", readOnly: false, wordWrap: true },
                    { data: "CUSTOMER_GROUP", readOnly: false, wordWrap: true },
                    { data: "CHAR", readOnly: false, wordWrap: true },
                    { data: "CHARVAL", readOnly: false, wordWrap: true },
                    { data: "KEY_FIG_DESC", readOnly: false, wordWrap: true },
                ];
                that.oGModel.setProperty("/subDataChanges", []);
                that.oGModel.setProperty("/hasCustomerGroup", false);

                that.loadHotKey();
                that.onIbpVerScen();
                that.getTimeZone();
                var oMetaModel = that.aModel.getMetaModel();
                oMetaModel.loaded().then(function () {
                    that.updateValueListConstantMail(oMetaModel, "getOptFilterdata", "LOCATION_ID", that.sUser);
                    that.updateValueListConstantMail(oMetaModel, "getOptFilterdata", "PRODUCT_ID", that.sUser);
                });
            },
            updateValueListConstantMail(oMetaModel, entityName, propertyName, userId) {
                const entities = oMetaModel.getObject("/dataServices/schema/0/entityType");
                const entity = entities?.find(e => e.name === entityName);
                const prop = entity?.property?.find(p => p.name === propertyName);
                const valList = prop?.["com.sap.vocabularies.Common.v1.ValueList"];
                const constantParam = valList?.Parameters?.find(
                    p => p.RecordType === "com.sap.vocabularies.Common.v1.ValueListParameterConstant"
                );

                if (constantParam) {
                    constantParam.Constant.String = userId;
                    return constantParam;
                }

                throw new Error("ValueList constant parameter not found");
            },

            oSeqOrder: function () {
                var sProd = that.oPrd
                // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
                that.oModel.callFunction("/getCharGroupWeightage", {
                    urlParameters: {
                        PRODUCT_ID: sProd
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



            onFilterChange: function (oEvent) {
                if (!oEvent) return false;

                const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
                const filterData = smartFilterBar.getFilterData();
                let unchangedCount = 0;

                if (!Object.keys(filterData).length) return;

                // Check token-based fields
                this.config.fieldMappings.forEach((fieldConfig) => {
                    if (filterData[fieldConfig.filterField]) {
                        const currentItems =
                            filterData[fieldConfig.filterField].items || [];
                        const defaultItems =
                            this.oGModel.getProperty(fieldConfig.modelProperty) || [];

                        if (this._areArraysEqual(currentItems, defaultItems)) {
                            unchangedCount++;
                        } else {
                            this.byId(this.config.controlIds.variantManagement).setModified(
                                true
                            );
                            return;
                        }
                    }
                });

                // Check range fields
                this.config.rangeFields.forEach((fieldConfig) => {
                    if (
                        fieldConfig.modelProperty &&
                        filterData[fieldConfig.filterField]
                    ) {
                        const currentValue =
                            filterData[fieldConfig.filterField].ranges?.[0]?.value1;
                        const defaultValue = this.oGModel.getProperty(
                            fieldConfig.modelProperty
                        );

                        if (currentValue === defaultValue) {
                            unchangedCount++;
                        } else {
                            this.byId(this.config.controlIds.variantManagement).setModified(
                                true
                            );
                            return;
                        }
                    }
                });

                // If all fields match defaults, set as unmodified
                const totalFields =
                    this.config.fieldMappings.length +
                    this.config.rangeFields.filter((f) => f.modelProperty).length;

                if (unchangedCount === totalFields) {
                    this.byId(this.config.controlIds.variantManagement).setModified(
                        false
                    );
                }

                // ✅ Reapply static filters after your logic completes
                // this._applyDefaults();


            },



            onBeforeRendering: async function () {
                const that = this;
                // sap.ui.core.BusyIndicator.show();

                // 👉 Create a promise that resolves when /totalWeekTypes is ready
                // this._totalWeekPromise = new Promise((resolve, reject) => {
                //     that.aModel.read("/getFinalOptionPercentages", {
                //         urlParameters: {
                //             $apply:
                //                 "groupby((CALENDAR_WEEK,TELESCOPIC_WEEK,PERIODSTART,PERIODEND,WEEK_STARTDATE,WEEK_ENDDATE))",
                //             $orderby:
                //                 "PERIODSTART asc,WEEK_STARTDATE asc,CALENDAR_WEEK asc,TELESCOPIC_WEEK asc",
                //         },
                //         success: function (oData) {
                //             const data = oData.results;
                //             that.oGModel.setProperty("/totalWeekTypes", data);

                //             const weekLookupMap = new Map();
                //             const dateToWeekMap = new Map();
                //             that.telWeek = [];
                //             that.telMonth = [];
                //             that.telQ = [];

                //             for (let i = 0; i < data.length; i++) {
                //                 const item = data[i];
                //                 if (!item.TELESCOPIC_WEEK && !item.CALENDAR_WEEK) continue;

                //                 const monday = that.getMondaysBetween(item.WEEK_STARTDATE, item.WEEK_ENDDATE);
                //                 item.monday = monday;

                //                 if (
                //                     !that.telWeek.includes(item.TELESCOPIC_WEEK) &&
                //                     !that.telMonth.includes(item.TELESCOPIC_WEEK) &&
                //                     !that.telQ.includes(item.TELESCOPIC_WEEK)
                //                 ) {
                //                     const found = data.filter(o => o.TELESCOPIC_WEEK === item.TELESCOPIC_WEEK);
                //                     const len = found.length;
                //                     if (len === 1) that.telWeek.push(item.TELESCOPIC_WEEK);
                //                     else if (len > 2 && len <= 6) that.telMonth.push(item.TELESCOPIC_WEEK);
                //                     else if (len > 6) that.telQ.push(item.TELESCOPIC_WEEK);
                //                 }

                //                 weekLookupMap.set(item.TELESCOPIC_WEEK, item);
                //                 weekLookupMap.set(item.CALENDAR_WEEK, item);
                //                 dateToWeekMap.set(monday, item);
                //             }

                //             that.weekLookupMap = weekLookupMap;
                //             that.dateToWeekMap = dateToWeekMap;

                //             sap.ui.core.BusyIndicator.hide();
                //             that._isTotalWeekLoaded = true;
                //             resolve(data); // ✅ resolve promise
                //         },
                //         error: function (err) {
                //             sap.ui.core.BusyIndicator.hide();
                //             sap.m.MessageToast.show(err.message);
                //             reject(err); // ❌ reject promise
                //         },
                //     });
                // });

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
                            that.byId("idWeekType").setSelectedKey("CALENDAR_WEEK");
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

            onAfterRendering: function () {
                that.skip = 0
                that.oPartialProducts()
                that.generateColSettings();
                that.initVariantManagement();
                that.storedDecimalSums = 0;
                that.oGModel.setProperty("/defaultVariant", "Y");
            },

            onFilterBarInit: function () {
                const oSmartFilterBar = this.byId("smartFilterBar");
                const variantManagement = oSmartFilterBar.getVariantManagement();
                const oDateRange = this.byId("idWeekDate");
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
                variantManagement.setShowShare(true);
                that.oGModel.setProperty("/defaultModel", "Active");
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
                const table = sap.ui.getCore().byId("idDataTable");
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
                    .byId("idDataTable")
                    .getSelectedItems(),
                    selectedFields = [],
                    selectedFieldsLabel = [],
                    reason = params.getSource().getText();
                if (reason == "OK") {
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
                    that.staticColumns = selectedFieldsLabel;
                    that.staticRows = selectedFields;
                    if (that.hot && that.hot.getSourceData().length > 0) {
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
                sap.ui.getCore().byId("idDataTable").setModel(oModel);
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


            loadFragments: function () {
                if (!that.oSettingDialog) {
                    that.oSettingDialog = sap.ui.xmlfragment(
                        "vcpapp.vcpoptionpercentage.fragments.Settings",
                        that
                    );
                    that.getView().addDependent(that.oSettingDialog);
                }
                if (!this._oKeyFigPopup) {
                    this._oKeyFigPopup = sap.ui.xmlfragment(
                        "vcpapp.vcpoptionpercentage.fragments.KeyFigures",
                        that
                    );
                    that.getView().addDependent(this._oKeyFigPopup);
                }
            },

            onIbpVerScen: function () {
                that.oModel.read("/getIbpVerScn", {
                    success: function (oData) {
                        var Overs = oData.results;

                        // Fill null values: if VERSION is null, take VERSION_NAME, and vice versa
                        Overs.forEach(item => {
                            if (!item.VERSION && item.VERSION_NAME) item.VERSION = item.VERSION_NAME;
                            if (!item.VERSION_NAME && item.VERSION) item.VERSION_NAME = item.VERSION;
                            if (!item.SCENARIO && item.SCENARIO_NAME) item.SCENARIO = item.SCENARIO_NAME;
                            if (!item.SCENARIO_NAME && item.SCENARIO) item.SCENARIO_NAME = item.SCENARIO;
                        });

                        // Deduplicate based on VERSION + VERSION_NAME + SCENARIO + SCENARIO_NAME
                        var uniqueMap = {};
                        var oVerscn = [];

                        Overs.forEach(item => {
                            var key = item.VERSION + "|" + item.VERSION_NAME + "|" + item.SCENARIO + "|" + item.SCENARIO_NAME;
                            if (!uniqueMap[key]) {
                                uniqueMap[key] = true;
                                oVerscn.push(item);
                            }
                        });

                        that.oGModel.setProperty("/oVerscena", oVerscn);
                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("error");
                    },
                });

            },
            //Time Zone 
            getTimeZone: function () {
                that.oModel.read("/getUserPreferences ", {
                    success: function (oData) {
                        var fullData = oData.results;

                        // Fill null values: if VERSION is null, take VERSION_NAME, and vice versa
                        var TimeZone = fullData.filter(id => id.PARAMETER === "TIMEZONE");
                        that.oGModel.setProperty("/timeZone", TimeZone);
                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageToast.show("error getting timezone");
                    },
                });

            },

            onGo: async function (evt) {
                try {
                    // Reset all data first
                    that.skip = 0;

                    // that.Flag === ""
                    that.allData = [];
                    that.allSubData = [];
                    that.savedData = [];
                    that.cellChanges = [];
                    that.deleteChanges = [];
                    that.subCellChanges = [];
                    that.commentChanges = [];
                    that.byId("idSearchField").setValue("");
                    // that.byId("idPri").setEnabled(true);
                    that.byId("idWeekType").setEnabled(true);
                    var filters = that.byId("smartFilterBar").getFilters();
                    var versionValue = "";
                    var scenarioValue = "";
                    var productValue = "";

                    // Recursive function to extract VERSION and SCENARIO from filters
                    function extractVersionScenario(filters) {
                        filters.forEach(f => {
                            if (f.aFilters && f.aFilters.length > 0) {
                                // Recursively handle nested filters
                                extractVersionScenario(f.aFilters);
                            } else {
                                // Match version, scenario, and product filters
                                if (f.sPath === "VERSION_NAME") {
                                    versionValue = f.oValue1;
                                }
                                if (f.sPath === "SCENARIO_NAME") {
                                    scenarioValue = f.oValue1;
                                }
                                if (f.sPath === "PRODUCT_ID" || f.sPath === "PRODUCT") {
                                    productValue = f.oValue1;
                                }
                            }
                        });
                    }

                    extractVersionScenario(filters);

                    // Set values to inputs
                    that.byId("idVerInput").setValue(versionValue);
                    that.byId("idScenInput").setValue(scenarioValue);
                    that.oPrd = productValue
                    that.oSeqOrder();
                    // that.byId("idVerInput").setValue(that.smartFilterBar.getControlByKey("VERSION").getValue());
                    // that.byId("idScenInput").setValue(that.smartFilterBar.getControlByKey("SCENARIO").getValue());

                    this.oTree.setBusy(true);
                    this.byId("idDynamicPage2").setBusy(true);


                    // Execute functions sequentially
                    console.log("Starting loadFirmFrozenData...");
                    await that.loadFirmFrozenData();
                    // that.loadFirmFrozenData()
                    console.log("loadFirmFrozenData completed");

                    console.log("Starting loadSubData...");
                    await that.loadSubData();
                    console.log("loadSubData completed");

                    console.log("Starting loadLockComments...");
                    await that.loadLockComments();
                    console.log("loadLockComments completed");

                    console.log("Starting loadData...");
                    that.loadData(evt);
                    console.log("loadData completed");
                    // that.saveDefaultVariant();
                    console.log("All functions completed successfully");
                } catch (error) {
                    console.error("Error in onGo:", error);
                    MessageToast.show("Error: " + error.message);
                }
            },

            oPartialProducts: function () {
                that.oPProduct = [];
                var topCount = "30000";
                that.getOwnerComponent().getModel("oModel").read("/getfactorylocdesc", {
                    // filters: [fFilter],
                    urlParameters: {
                        "$skip": that.skip,
                        "$top": topCount
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
                        const oWeekTypeKey = this.byId("idWeekType").getSelectedKey();
                        const oFilters = [
                            new Filter("PARAMETER_ID", FilterOperator.EQ, 1), // Frozen Horizon
                            new Filter("PARAMETER_ID", FilterOperator.EQ, 9), // Firm Horizon
                        ];
                        var oSmartFilterBar = that.byId("smartFilterBar");
                        var aFilters = oSmartFilterBar.getFilters(); // <-- this gives your filters array

                        // Recursive function to get PRODUCT_ID value
                        function getProductValue(filterArray) {
                            for (const filter of filterArray) {
                                if (filter.sPath === "PRODUCT_ID") {
                                    return filter.oValue1;
                                }
                                if (filter.aFilters) {
                                    const result = getProductValue(filter.aFilters);
                                    if (result) return result;
                                }
                            }
                            return null;
                        }

                        // var productValue = getProductValue(aFilters);
                        // let Prods = that.oPProduct

                        // Step 1: Extract Product value from filters
                        // function getProductValue(aFilters) {
                        //     const productFilter = aFilters.find(f => f.sPath === "PRODUCT_ID");
                        //     return productFilter ? productFilter.oValue1 : null;
                        // }

                        // Example usage
                        var productValue = getProductValue(aFilters);

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

            // loadSubData: async function () {
            //     return new Promise(async (resolve, reject) => {
            //         try {

            //             // for version and scenario filters are changed
            //             function mapFiltersWithVerscena(filters, oVerscena) {
            //                 filters.forEach(f => {
            //                     // If nested filters, recurse
            //                     if (f.aFilters && f.aFilters.length > 0) {
            //                         mapFiltersWithVerscena(f.aFilters, oVerscena);
            //                     }

            //                     // VERSION_NAME → VERSION
            //                     if (f.sPath === "VERSION_NAME") {
            //                         let match = oVerscena.find(v => v.VERSION_NAME === f.oValue1);
            //                         if (match) {
            //                             f.sPath = "VERSION";
            //                             f.oValue1 = match.VERSION;
            //                         }
            //                     }

            //                     // SCENARIO_NAME → SCENARIO
            //                     if (f.sPath === "SCENARIO_NAME") {
            //                         let match = oVerscena.find(v => v.SCENARIO_NAME === f.oValue1);
            //                         if (match) {
            //                             f.sPath = "SCENARIO";
            //                             f.oValue1 = match.SCENARIO;
            //                         }
            //                     }
            //                 });
            //             }

            //             // Usage
            //             var filters = that.byId("smartFilterBar").getFilters();
            //             var oVerscena = that.oGModel.getProperty("/oVerscena");

            //             mapFiltersWithVerscena(filters, oVerscena);

            //             console.log(filters);
            //             that.oGModel.setProperty("/oFilterspas", filters)
            //             function transformFilters(filters) {
            //                 let result = {};

            //                 function parseFilters(aFilters) {
            //                     aFilters.forEach(f => {
            //                         if (f.aFilters && f.aFilters.length > 0) {
            //                             parseFilters(f.aFilters);
            //                         } else {
            //                             switch (f.sPath) {
            //                                 case "LOCATION_ID":
            //                                     if (!result["LOCATION_ID"]) {
            //                                         result["LOCATION_ID"] = { value: null, ranges: [], items: [] };
            //                                     }
            //                                     if (!result["LOCATION_ID"].items.some(item => item.key === f.oValue1)) {
            //                                         result["LOCATION_ID"].items.push({ key: f.oValue1, text: f.oValue1 });
            //                                     }
            //                                     break;

            //                                 case "PRODUCT_ID":
            //                                     if (!result["PRODUCT_ID"]) {
            //                                         result["PRODUCT_ID"] = { value: null, ranges: [], items: [] };
            //                                     }
            //                                     if (!result["PRODUCT_ID"].items.some(item => item.key === f.oValue1)) {
            //                                         result["PRODUCT_ID"].items.push({ key: f.oValue1, text: f.oValue1 });
            //                                     }
            //                                     break;


            //                                 case "VERSION":
            //                                 case "VERSION_NAME":
            //                                     result["VERSION"] = f.oValue1;
            //                                     break;

            //                                 case "SCENARIO_NAME":
            //                                 case "SCENARIO":   // <-- add this
            //                                     result["SCENARIO"] = f.oValue1;
            //                                     break;

            //                                 case "MODEL_VERSION":
            //                                     result["MODEL_VERSION"] = f.oValue1;
            //                                     break;
            //                             }
            //                         }
            //                     });
            //                 }

            //                 parseFilters(filters);
            //                 return result;
            //             }

            //             // Example usage:
            //             const oTransformedFilters = transformFilters(filters);
            //             that.oChangedFilters = oTransformedFilters; //oTransformedFilters //filters

            //             // const oSmartFilterBar =  this.byId("smartFilterBar");
            //             const filterData = that.oChangedFilters //oSmartFilterBar.getFilterData();
            //             let groupbyFields = [
            //                 "LOCATION_ID",
            //                 "PRODUCT_ID",
            //                 "CUSTOMER_GROUP",
            //                 "VERSION",
            //                 "SCENARIO",
            //                 "WEEK_STARTDATE"
            //             ],
            //                 measures = [{ field: "OPT_QTY", operation: "sum" }];
            //             let baseApplyQuery = that.getApplyQueryForFields(
            //                 groupbyFields,
            //                 measures
            //             );

            //             // Build final query with filters
            //             let finalApplyQuery = this.buildFinalApplyQuery(
            //                 filterData,
            //                 baseApplyQuery
            //             );

            //             let urlparams = {
            //                 $apply: finalApplyQuery,
            //             };

            //             filters.forEach(group => {
            //                 if (Array.isArray(group.aFilters)) {
            //                     group.aFilters = group.aFilters.filter(f => {
            //                         // Remove nested filters like: { aFilters: [ { sPath: "VERSION" ... } ] }
            //                         if (f._bMultiFilter && Array.isArray(f.aFilters)) {
            //                             const inner = f.aFilters[0];
            //                             if (inner && (inner.sPath === "VERSION" || inner.sPath === "SCENARIO")) {
            //                                 return false; // ❌ remove this filter block
            //                             }
            //                         }
            //                         return true; // ✅ keep all others
            //                     });
            //                 }
            //             });

            //             console.log(filters);

            //             // Extract version and scenario from filters
            //             const versionFilter = filters.find(f => f.sPath === "VERSION");
            //             const scenarioFilter = filters.find(f => f.sPath === "SCENARIO");


            //             applyStr = urlparams
            //                 .replace(/VERSION eq '.*?'/, `VERSION eq '${versionValue}'`)
            //                 .replace(/SCENARIO eq '.*?'/, `SCENARIO eq '${scenarioValue}'`);

            //             // Assign back to URL params
            //             urlParams["$apply"] = applyStr;


            //             that.urlparams = urlparams
            //             that.getFilteredSubData();
            //             // that.subAllData = await getFilteredSubData(urlparams);
            //             // that.subAllData = await that.getFilteredSubData(urlparams);
            //             // that.subAllData.map((d) => {
            //             //     // Only rename OPT_QTY_SUM if it exists
            //             //     if (d.hasOwnProperty("OPT_QTY_SUM")) {
            //             //         d.OPT_QTY = d.OPT_QTY_SUM;
            //             //         delete d.OPT_QTY_SUM;
            //             //     }
            //             // });
            //             resolve();
            //         } catch (error) {
            //             console.error("Error in loadSubData:", error);
            //             MessageToast.show(error);
            //             reject(error);
            //         }
            //     });


            // },

            loadSubData: async function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // --- Map filters ---
                        function mapFiltersWithVerscena(filters, oVerscena) {
                            filters.forEach(f => {
                                if (f.aFilters && f.aFilters.length > 0) {
                                    mapFiltersWithVerscena(f.aFilters, oVerscena);
                                }

                                // VERSION_NAME → VERSION
                                if (f.sPath === "VERSION_NAME") {
                                    let match = oVerscena.find(v => v.VERSION_NAME === f.oValue1);
                                    if (match) {
                                        f.sPath = "VERSION";
                                        f.oValue1 = match.VERSION;
                                    }
                                }

                                // SCENARIO_NAME → SCENARIO
                                if (f.sPath === "SCENARIO_NAME") {
                                    let match = oVerscena.find(v => v.SCENARIO_NAME === f.oValue1);
                                    if (match) {
                                        f.sPath = "SCENARIO";
                                        f.oValue1 = match.SCENARIO;
                                    }
                                }
                            });
                        }

                        // --- Get filters from SmartFilterBar ---
                        var filters = that.byId("smartFilterBar").getFilters();
                        var oVerscena = that.oGModel.getProperty("/oVerscena");
                        mapFiltersWithVerscena(filters, oVerscena);

                        // --- Transform filters into key-value map ---
                        function transformFilters(filters) {
                            let result = {};

                            function parseFilters(aFilters) {
                                aFilters.forEach(f => {
                                    if (f.aFilters && f.aFilters.length > 0) {
                                        parseFilters(f.aFilters);
                                    } else {
                                        switch (f.sPath) {
                                            case "LOCATION_ID":
                                            case "PRODUCT_ID":
                                                if (!result[f.sPath]) {
                                                    result[f.sPath] = { value: null, ranges: [], items: [] };
                                                }
                                                if (!result[f.sPath].items.some(item => item.key === f.oValue1)) {
                                                    result[f.sPath].items.push({ key: f.oValue1, text: f.oValue1 });
                                                }
                                                break;

                                            case "VERSION":
                                            case "VERSION_NAME":
                                                result["VERSION"] = f.oValue1;
                                                break;

                                            case "SCENARIO":
                                            case "SCENARIO_NAME":
                                                result["SCENARIO"] = f.oValue1;
                                                break;

                                            case "MODEL_VERSION":
                                                result["MODEL_VERSION"] = f.oValue1;
                                                break;
                                        }
                                    }
                                });
                            }

                            parseFilters(filters);
                            return result;
                        }

                        const oTransformedFilters = transformFilters(filters);
                        that.oChangedFilters = oTransformedFilters;

                        // --- Build base query ---
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

                        // --- Clean nested VERSION/SCENARIO filters ---
                        // filters.forEach(group => {
                        //     if (Array.isArray(group.aFilters)) {
                        //         group.aFilters = group.aFilters.filter(f => {
                        //             if (f._bMultiFilter && Array.isArray(f.aFilters)) {
                        //                 const inner = f.aFilters[0];
                        //                 if (inner && (inner.sPath === "VERSION" || inner.sPath === "SCENARIO")) {
                        //                     return false;
                        //                 }
                        //             }
                        //             return true;
                        //         });
                        //     }
                        // });

                        // // --- Extract version and scenario from transformed filters ---
                        // const versionValue = filters[0].aFilters[1].oValue1 //oTransformedFilters?.VERSION || "__BASELINE";
                        // const scenarioValue = filters[0].aFilters[2].oValue1 //oTransformedFilters?.SCENARIO || "_PLAN";


                        // let versionValue = null;
                        // let scenarioValue = null;

                        // --- Loop through all filters (after cleanup) ---
                        // filters.forEach(group => {
                        //     if (Array.isArray(group.aFilters)) {
                        //         group.aFilters.forEach(f => {
                        //             if (f.sPath === "VERSION") {
                        //                 versionValue = f.oValue1;
                        //             } else if (f.sPath === "SCENARIO") {
                        //                 scenarioValue = f.oValue1;
                        //             }

                        //             // If it's a MultiFilter, check its inner filters
                        //             if (f._bMultiFilter && Array.isArray(f.aFilters)) {
                        //                 f.aFilters.forEach(inner => {
                        //                     if (inner.sPath === "VERSION") {
                        //                         versionValue = inner.oValue1;
                        //                     } else if (inner.sPath === "SCENARIO") {
                        //                         scenarioValue = inner.oValue1;
                        //                     }
                        //                 });
                        //             }
                        //         });
                        //     }
                        // });

                        // console.log("VERSION:", versionValue);
                        // console.log("SCENARIO:", scenarioValue);

                        // // --- Replace inside $apply ---
                        // let applyStr = urlparams.$apply;
                        // applyStr = applyStr
                        //     .replace(/VERSION eq '.*?'/, `VERSION eq '${versionValue}'`)
                        //     .replace(/SCENARIO eq '.*?'/, `SCENARIO eq '${scenarioValue}'`);

                        // // --- Assign back ---
                        // urlparams.$apply = applyStr;
                        // that.urlparams = urlparams;

                        let versionValue = "";
                        let scenarioValue = "";

                        // ✅ Step 2: Extract values dynamically
                        filters.forEach(group => {
                            if (Array.isArray(group.aFilters)) {
                                group.aFilters.forEach(f => {
                                    if (f.sPath === "VERSION") {
                                        versionValue = f.oValue1;
                                    } else if (f.sPath === "SCENARIO") {
                                        scenarioValue = f.oValue1;
                                    }
                                });
                            }
                        });

                        // ✅ Step 3: Log for debugging
                        console.log("VERSION:", versionValue);
                        console.log("SCENARIO:", scenarioValue);

                        // ✅ Step 4: Replace inside $apply
                        let applyStr = urlparams.$apply;

                        applyStr = applyStr
                            .replace(/VERSION eq '.*?'/, `VERSION eq '${versionValue}'`)
                            .replace(/SCENARIO eq '.*?'/, `SCENARIO eq '${scenarioValue}'`);

                        // ✅ Step 5: Assign back
                        urlparams.$apply = applyStr;
                        that.urlparams = urlparams;

                        console.log("✅ Final URL Params:", urlparams);

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

            getFilteredSubData: function () {
                // return new Promise((resolve, reject) => {
                var topCount = 30000
                if (that.oFlg === "more") {
                    // do nothing
                } else { that.ocIbp = [] }

                var urlparams = that.urlparams
                // var urlparams = { "$apply": "filter(TYPE eq 997 and LOCATION_ID eq '1600' and PRODUCT_ID eq 'VCP_1600' and VERSION eq '__BASELINE' and SCENARIO eq '_PLAN')/groupby((LOCATION_ID,PRODUCT_ID,CUSTOMER_GROUP,VERSION,SCENARIO,WEEK_STARTDATE),aggregate(OPT_QTY with sum as OPT_QTY_SUM))" }
                const oUrlParams = Object.assign({}, urlparams, {
                    "$skip": that.skip,
                    "$top": topCount  // default top value for safety
                });
                that.aModel.read("/getFinalOptionPercentages", {
                    urlParameters: oUrlParams,
                    success: function (oData) {
                        // resolve(oData.results);
                        if (topCount == oData.results.length) {
                            that.oFlg = "more"

                            that.skip += (topCount);
                            that.ocIbp = that.ocIbp.concat(oData.results);
                            that.getFilteredSubData();
                        } else {
                            that.skip = 0;

                            that.ocIbp = that.ocIbp.concat(oData.results);
                            that.subAllData = that.ocIbp
                            that.subAllData.map((d) => {
                                // Only rename OPT_QTY_SUM if it exists
                                if (d.hasOwnProperty("OPT_QTY_SUM")) {
                                    d.OPT_QTY = d.OPT_QTY_SUM;
                                    delete d.OPT_QTY_SUM;
                                }
                            });
                            //  resolve(that.ocIbp);

                        }
                    },
                    error: function (err) {
                        reject(new Error(err.message || "Failed to load sub data"));
                    },
                });
                // });
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
                        that.oModel.read("/getManualOptionData", {
                            filters,
                            success: function (oData) {
                                resolve(oData.results);
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
                    const oWeekTypeKey = this.byId("idWeekType").getSelectedKey();
                    const oSmartFilterBar = this.byId("smartFilterBar");

                    const oDateRange = this.byId("idWeekDate");
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
                    const filt = oSmartFilterBar.getFilters();

                    //////////////////////////////////
                    // working filters

                    // const aFilters = filt

                    // function mapFiltersWithVerscena(filters, oVerscena) {
                    //     filters.forEach(f => {
                    //         // If nested filters, recurse
                    //         if (f.aFilters && f.aFilters.length > 0) {
                    //             mapFiltersWithVerscena(f.aFilters, oVerscena);
                    //         }

                    //         // VERSION_NAME → VERSION
                    //         if (f.sPath === "VERSION_NAME") {
                    //             let match = oVerscena.find(v => v.VERSION_NAME === f.oValue1);
                    //             if (match) {
                    //                 f.sPath = "VERSION";
                    //                 f.oValue1 = match.VERSION;
                    //             }
                    //         }

                    //         // SCENARIO_NAME → SCENARIO
                    //         if (f.sPath === "SCENARIO_NAME") {
                    //             let match = oVerscena.find(v => v.SCENARIO_NAME === f.oValue1);
                    //             if (match) {
                    //                 f.sPath = "SCENARIO";
                    //                 f.oValue1 = match.SCENARIO;
                    //             }
                    //         }
                    //     });
                    // }

                    // // Usage
                    // var filters = that.byId("smartFilterBar").getFilters();
                    // var oVerscena = that.oGModel.getProperty("/oVerscena");

                    // mapFiltersWithVerscena(aFilters, oVerscena);
                    //////////////////////////////////////////////////////////////////
                    // function normalizeFiltersForOData(filters) {
                    //     if (!Array.isArray(filters) || filters.length === 0) return [];

                    //     // We'll produce a single cleaned group (matching your example shape)
                    //     const newGroup = {
                    //         aFilters: [],
                    //         bAnd: true,
                    //         _bMultiFilter: true
                    //     };

                    //     const seen = new Set(); // to dedupe by key

                    //     // helper to create dedupe key
                    //     function keyOf(f) {
                    //         return [
                    //             f.sPath || (f.aFilters && f.aFilters[0] && f.aFilters[0].sPath) || "",
                    //             f.sOperator || (f.aFilters && f.aFilters[0] && f.aFilters[0].sOperator) || "",
                    //             f.oValue1 === undefined ? "" : String(f.oValue1),
                    //             f.oValue2 === undefined ? "" : String(f.oValue2)
                    //         ].join("|");
                    //     }

                    //     // iterate over groups (support multiple groups defensively)
                    //     (filters || []).forEach(group => {
                    //         (group.aFilters || []).forEach(f => {
                    //             // Skip explicit unwanted names
                    //             if (f.sPath === "VERSION_NAME" || f.sPath === "SCENARIO_NAME") return;

                    //             // Case: nested aFilters (usual for LOCATION_ID, PRODUCT_ID, CHAR_NUM, VERSION, SCENARIO)
                    //             if (Array.isArray(f.aFilters) && f.aFilters.length > 0) {
                    //                 const inner = f.aFilters[0];
                    //                 if (!inner || !inner.sPath) return;

                    //                 // Skip VERSION_NAME / SCENARIO_NAME if they ever appear nested
                    //                 if (inner.sPath === "VERSION_NAME" || inner.sPath === "SCENARIO_NAME") return;

                    //                 // ignore empty values
                    //                 if (inner.sOperator === "BT") {
                    //                     if (!inner.oValue1 || !inner.oValue2) return;
                    //                 } else {
                    //                     if (inner.oValue1 === null || inner.oValue1 === "" || inner.oValue1 === undefined) return;
                    //                 }

                    //                 // Unwrap VERSION and SCENARIO -> keep them as direct filters
                    //                 if (inner.sPath === "VERSION" || inner.sPath === "SCENARIO") {
                    //                     const flat = {
                    //                         sPath: inner.sPath,
                    //                         sOperator: inner.sOperator,
                    //                         oValue1: inner.oValue1,
                    //                         // include oValue2 for BT if present
                    //                         ...(inner.sOperator === "BT" && inner.oValue2 ? { oValue2: inner.oValue2 } : {}),
                    //                         _bMultiFilter: false
                    //                     };
                    //                     const key = keyOf(flat);
                    //                     if (!seen.has(key)) {
                    //                         seen.add(key);
                    //                         newGroup.aFilters.push(flat);
                    //                     }
                    //                 }
                    //                 // For other inner filters (e.g., LOCATION_ID, PRODUCT_ID, CHAR_NUM) keep nested structure
                    //                 else {
                    //                     const nested = {
                    //                         aFilters: [inner],
                    //                         bAnd: false,
                    //                         _bMultiFilter: true
                    //                     };
                    //                     const key = keyOf(inner);
                    //                     if (!seen.has(key)) {
                    //                         seen.add(key);
                    //                         newGroup.aFilters.push(nested);
                    //                     }
                    //                 }
                    //             }
                    //             // Case: flat filter already (e.g., MODEL_VERSION, VERSION_NAME, SCENARIO_NAME, WEEK_STARTDATE)
                    //             else if (f.sPath) {
                    //                 // Skip unwanted name filters
                    //                 if (f.sPath === "VERSION_NAME" || f.sPath === "SCENARIO_NAME") return;

                    //                 // ignore empty values (handle BT)
                    //                 if (f.sOperator === "BT") {
                    //                     if (!f.oValue1 || !f.oValue2) return;
                    //                 } else {
                    //                     if (f.oValue1 === null || f.oValue1 === "" || f.oValue1 === undefined) return;
                    //                 }

                    //                 // Keep flat filters as-is
                    //                 const flat = {
                    //                     sPath: f.sPath,
                    //                     sOperator: f.sOperator,
                    //                     oValue1: f.oValue1,
                    //                     ...(f.sOperator === "BT" && f.oValue2 ? { oValue2: f.oValue2 } : {}),
                    //                     _bMultiFilter: false
                    //                 };
                    //                 const key = keyOf(flat);
                    //                 if (!seen.has(key)) {
                    //                     seen.add(key);
                    //                     newGroup.aFilters.push(flat);
                    //                 }
                    //             }
                    //         });
                    //     });

                    //     // return as an array with single group (matches your expected shape)
                    //     return [newGroup];
                    // }

                    // // ----- How to use with your model -----
                    // // const oldFilters = that.oGModel.getProperty("/oFilterspas");
                    // const cleaned = normalizeFiltersForOData(filt);

                    // console.log("Cleaned filters ->", JSON.stringify(cleaned, null, 4));


                    function mapFiltersWithVerscena(filters, oVerscena) {
                        filters.forEach(f => {
                            // If nested filters, recurse
                            if (f.aFilters && f.aFilters.length > 0) {
                                mapFiltersWithVerscena(f.aFilters, oVerscena);
                            }

                            // VERSION_NAME → VERSION
                            if (f.sPath === "VERSION_NAME") {
                                let match = oVerscena.find(v => v.VERSION_NAME === f.oValue1);
                                if (match) {
                                    f.sPath = "VERSION";
                                    f.oValue1 = match.VERSION;
                                }
                            }

                            // SCENARIO_NAME → SCENARIO
                            if (f.sPath === "SCENARIO_NAME") {
                                let match = oVerscena.find(v => v.SCENARIO_NAME === f.oValue1);
                                if (match) {
                                    f.sPath = "SCENARIO";
                                    f.oValue1 = match.SCENARIO;
                                }
                            }
                        });
                    }

                    // Usage
                    var filters = that.byId("smartFilterBar").getFilters();
                    var oVerscena = that.oGModel.getProperty("/oVerscena");

                    mapFiltersWithVerscena(filters, oVerscena);

                    const aFilters = filters // cleaned



                    if (aFilters) {
                        aFilters[0].aFilters.push(weekFilter);
                    }
                    // const checkCharNum = that.byId("idPri").getSelected();
                    const oCombinedFilter = that.handleVerScenFilter(aFilters);
                    that.weekType = oWeekTypeKey;
                    let topCount = 30000;
                    let urlparams = "";
                    let entity = "";
                    let serviceModel = "";

                    if (oWeekTypeKey === "TELESCOPIC_WEEK") {
                        serviceModel = that.oModel;
                        entity = "/getTelescopicFinalPlan";
                        let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
                        const updatedFilter = finalApplyQuery
                            .replace(/WEEK_STARTDATE/g, "PERIODSTART")
                            .replace(/WEEK_ENDDATE/g, "PERIODEND");
                        const modifiedCharValFilter = addNullChecksToFilter(updatedFilter);
                        var cleanedApply = modifiedCharValFilter
                            .replace(/\s*and\s*VERSION eq '__BASELINE'/, "")
                            .replace(/\s*and\s*SCENARIO eq '_PLAN'/, "");
                        urlparams = {
                            $skip: that.skip,
                            $top: topCount,
                            $apply: cleanedApply, //       modifiedCharValFilter,
                            $orderby:
                                "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,PERIODSTART asc",
                        };
                    } else {
                        serviceModel = that.aModel;
                        entity = "/getFinalOptionPercentages";
                        let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
                        const modifiedCharValFilter = addNullChecksToFilter(finalApplyQuery);
                        var cleanedApply = modifiedCharValFilter
                            .replace(/\s*and\s*VERSION eq '__BASELINE'/, "")
                            .replace(/\s*and\s*SCENARIO eq '_PLAN'/, "");
                        urlparams = {
                            $skip: that.skip,
                            $top: topCount,
                            $apply: cleanedApply, //modifiedCharValFilter,
                            $orderby:
                                "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,WEEK_STARTDATE asc",
                        };
                    }



                    // Proceed to your existing service call
                    serviceModel.read(entity, {
                        urlParameters: urlparams,
                        success: function (oData) {
                            function removeMetadata(data) {
                                if (!Array.isArray(data)) return data;

                                return data.map(item => {
                                    const { __metadata, ...rest } = item;
                                    return rest;
                                });
                            }

                            const cleanedData = removeMetadata(oData.results);


                            // Check if more data needs to be loaded
                            if (topCount === cleanedData.length) {
                                that.skip += topCount;
                                that.allData = [...(that.allData || []), ...cleanedData];
                                that.loadData(); // Recursively load more data
                            } else {
                                // Reset skip and finalize data
                                that.skip = 0;
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
                                that.generateTree(that.allData);
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
                                that.onTreeItemSelect();
                                that.ResetTree();

                                // Show success message if triggered by refresh
                                if (evt === "refreshData") {
                                    // that.FLAG = ""
                                    MessageToast.show("Successfully Saved Data");
                                }
                            }

                            // Update UI status
                            that.byId("idDynamicPage2").setBusy(false);
                            that.oTree.setBusy(false);
                        },
                        error: function (err) {
                            that.oTree.setBusy(false);
                            that.byId("idDynamicPage2").setBusy(false);
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

            // handleVerScenFilter: function (aFilters) {
            //     // Get and remove VERSION and SCENARIO filters, storing their values
            //     var oVersionFilter = null;
            //     var oScenarioFilter = null;
            //     var oModelVersionFilter = null;
            //     var aCleanedFilters = [];

            //     if (aFilters && aFilters.length > 0) {
            //         // Process each filter in the main filters array
            //         aFilters[0].aFilters.forEach(function (oFilter) {
            //             if (oFilter.sPath === "VERSION") {
            //                 oVersionFilter = oFilter;
            //             } else if (oFilter.sPath === "SCENARIO") {
            //                 oScenarioFilter = oFilter;
            //             } else if (oFilter.sPath === "MODEL_VERSION") {
            //                 oModelVersionFilter = oFilter;
            //             } else {
            //                 aCleanedFilters.push(oFilter);
            //             }
            //         });
            //     }

            //     // Create a new main filter with the cleaned filters
            //     var oMainFilter = new Filter({
            //         filters: aCleanedFilters,
            //         and: true,
            //     });

            //     // Create additional filters array
            //     var aAdditionalFilters = [];

            //     // Handle VERSION filters
            //     if (oVersionFilter) {
            //         // If VERSION was selected, add both selected version and EMPTY_VER
            //         aAdditionalFilters.push(
            //             new Filter({
            //                 filters: [
            //                     oVersionFilter,
            //                     new Filter("VERSION", FilterOperator.EQ, "EMPTY_VER"),
            //                 ],
            //                 and: false, // OR condition between selected version and EMPTY_VER
            //             })
            //         );
            //     }
            //     // Handle SCENARIO filters
            //     if (oScenarioFilter) {
            //         // If SCENARIO was selected, add both selected scenario and EMPTY_SCEN
            //         aAdditionalFilters.push(
            //             new Filter({
            //                 filters: [
            //                     oScenarioFilter,
            //                     new Filter("SCENARIO", FilterOperator.EQ, "EMPTY_SCEN"),
            //                 ],
            //                 and: false, // OR condition between selected scenario and EMPTY_SCEN
            //             })
            //         );
            //     }

            //     // Handle Model_Version filters
            //     if (oModelVersionFilter) {
            //         // If MODEL_VERSION was selected, add both selected scenario and EMPTY_MV
            //         aAdditionalFilters.push(
            //             new Filter({
            //                 filters: [
            //                     oModelVersionFilter,
            //                     new Filter("MODEL_VERSION", FilterOperator.EQ, "EMPTY_MV"),
            //                 ],
            //                 and: false, // OR condition between selected scenario and EMPTY_MV
            //             })
            //         );
            //     }

            //     // Combine all filters
            //     var aFinalFilters = [oMainFilter].concat(aAdditionalFilters);
            //     var oCombinedFilter = new Filter({
            //         filters: aFinalFilters,
            //         and: true,
            //     });

            //     return oCombinedFilter;
            // },

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
                that.byId("idVerInput").setValue("");
                that.byId("idScenInput").setValue("");

                // getFilters()[0].aFilters[1].setValue("Base Version")
                that.oTree.setModel(new JSONModel([]), "treeModel");
                that.oCore.byId("idNorKeyFigure").setP13nData([]);
                that.isKeyFigureAlreadyGenerate = false;
                that.byId("idDynamicPage2").setShowFooter(false);
                that.oGModel.setProperty("/hasCustomerGroup", false);
                that.oGModel.setProperty("/subDataChanges", []);
                // that.byId("idPri").setEnabled(false);
                that.byId("idWeekType").setEnabled(false);
                that.oGModel.refresh(true);
                that.byId("idSearchField").setValue("");
                var existingDiv = document.querySelector('[id*="mainDiv"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDiv"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                let key = this.byId("idWeekType").getSelectedKey();
                const oDateRange = this.byId("idWeekDate");
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

            generateTree: function (params) {
                var versionValue = "";
                var scenarioValue = "";
                var productValue = "";

                // Recursive function to extract VERSION and SCENARIO from filters
                function extractVersionScenario(filters) {
                    filters.forEach(f => {
                        if (f.aFilters && f.aFilters.length > 0) {
                            // Recursively handle nested filters
                            extractVersionScenario(f.aFilters);
                        } else {
                            // Match version, scenario, and product filters
                            if (f.sPath === "VERSION_NAME") {
                                versionValue = f.oValue1;
                            }
                            if (f.sPath === "SCENARIO_NAME") {
                                scenarioValue = f.oValue1;
                            }
                            if (f.sPath === "PRODUCT_ID" || f.sPath === "PRODUCT") {
                                productValue = f.oValue1;
                            }
                        }
                    });
                }
                var sProd = productValue
                // that.getModel("oModel").callFunction("/getCharGroupWeightage", {
                that.oModel.callFunction("/getCharGroupWeightage", {
                    urlParameters: {
                        PRODUCT_ID: sProd
                    },
                    success: function (oData) {
                        var oSeqData = JSON.parse(oData.getCharGroupWeightage)
                        oSeqData = oSeqData.filter(item => (item.CHAR_TYPE === "P"))

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
                                products: [],
                            };
                            var prods = params.filter(
                                (el) => el.LOCATION_ID === unqLocs[i].LOCATION_ID
                            );
                            var unqProds = that.removeDuplicate(prods, "PRODUCT_ID");
                            for (let j = 0; j < unqProds.length; j++) {
                                var prodObj = {
                                    name: unqProds[j].PRODUCT_ID,
                                    description: unqProds[j].PROD_DESC
                                        ? unqProds[j].PRODUCT_ID + " - " + unqProds[j].PROD_DESC
                                        : unqProds[j].PRODUCT_ID,
                                    chars: [],
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
                                        charvals: [],
                                    };
                                    prodObj.chars.push(charObj);
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
                                                ? unqCharVal[m].CHARVAL_NUM +
                                                " - " +
                                                unqCharVal[m].CHARVAL_DESC
                                                : unqCharVal[m].CHARVAL_NUM,
                                        };
                                        charObj.charvals.push(charvalObj);
                                    }
                                }
                            }
                            tree.push(locObj);
                        }

                        // function reorderTree(tree, oSeqData) {

                        //     const orderMap = new Map(oSeqData.map((item, index) => [item.CHAR_NUM, index]));

                        //     const newTree = JSON.parse(JSON.stringify(tree));

                        //     newTree.forEach(node => {
                        //         node.products.forEach(product => {
                        //             product.chars.sort((a, b) => {
                        //                 const aOrder = orderMap.has(a.name) ? orderMap.get(a.name) : Infinity;
                        //                 const bOrder = orderMap.has(b.name) ? orderMap.get(b.name) : Infinity;
                        //                 return aOrder - bOrder;
                        //             });
                        //         });
                        //     });

                        //     return newTree;
                        // }
                        // const reorderedTree = reorderTree(tree, oSeqData);
                        // console.log(reorderedTree[0].products[0].chars.map(c => c.name));
                        var oSeqData = that.oGModel.getProperty("/oSeqData")

                        function reorderTree(tree, oSeqData) {
                            // Create a lookup map for quick CHAR_NUM → { WEIGHTAGE, SEQUENCE }
                            const orderMap = new Map(
                                oSeqData.map(item => [
                                    item.CHAR_NUM,
                                    {
                                        weight: Number(item.WEIGHTAGE),
                                        seq: Number(item.SEQUENCE)
                                    }
                                ])
                            );

                            // Deep copy to avoid mutating original tree
                            const newTree = JSON.parse(JSON.stringify(tree));

                            // Reorder chars in each product
                            newTree.forEach(node => {
                                node.products.forEach(product => {
                                    product.chars.sort((a, b) => {
                                        const aMeta = orderMap.get(a.name) || { weight: 0, seq: Infinity };
                                        const bMeta = orderMap.get(b.name) || { weight: 0, seq: Infinity };

                                        // First compare weightage (descending)
                                        if (aMeta.weight !== bMeta.weight) {
                                            return bMeta.weight - aMeta.weight;
                                        }
                                        // Then compare sequence (ascending)
                                        return aMeta.seq - bMeta.seq;
                                    });
                                });
                            });

                            return newTree;
                        }

                        // ✅ Example usage:
                        const reorderedTree = reorderTree(tree, oSeqData);


                        model.setData({
                            items: reorderedTree,
                        });

                        // model.setData({
                        //     items: tree,
                        // });
                        that.oTree.setModel(model, "treeModel");

                    },
                    error: function (oData, error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("error");
                    },
                });

            },

            onSearch: function (oEvent) {
                var sQuery = oEvent.getSource().getValue();
                var oTree = this.byId("idTree");
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

                const norKeyFig = that.oCore.byId("idNorKeyFigure"),
                    calKeyFig = that.oCore.byId("idCalKeyFigure");

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
                            visible: selectedKeys.includes(u.KEY_FIG_ID),
                            enabled: isCustomerGroupPresent
                                ? !isPlannedOrForecast // disable planned/forecast if customer group exists
                                : true // otherwise everything enabled
                        };
                    });

                let norData = buildData(nKfs, selectedNorKeys);
                let calData = buildData(cKfs, selectedCalKeys);

                // --- Step 4: Handle Manual Key Figures ---
                if (nKfs.some((f) => f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC)) {
                    norData.push(
                        { key: 1001, label: "Effective Option %", visible: false, enabled: true },
                        { key: 1101, label: "Effective Option Qty", visible: false, enabled: true },
                        { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
                        { key: 1100, label: "Option Quantity", visible: true, enabled: true }
                    );
                } else {
                    norData.push(
                        {
                            key: that.ManualKeyArr[0].KEY_FIG_ID,
                            label: that.ManualKeyArr[0].KEY_FIG_DESC,
                            visible: true,
                            enabled: true
                        },
                        { key: 1001, label: "Effective Option %", visible: true, enabled: true },
                        { key: 1101, label: "Effective Option Qty", visible: true, enabled: true },
                        { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
                        { key: 1100, label: "Option Quantity", visible: true, enabled: true }
                    );
                }

                // --- Step 5: Sorting logic ---
                const customSort = (a, b) => {
                    if (a.key === 1) return -1;
                    if (b.key === 1) return 1;
                    if (a.visible && !b.visible) return -1;
                    if (!a.visible && b.visible) return 1;
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



            onNorSelect: function () {
                const oCGroup = this.oGModel.getProperty("/CGroup");
                const oSelected = this.oGModel.getProperty("/oSelected");
                const oPanel = sap.ui.getCore().byId("idNorKeyFigure"),
                    calKeyFig = that.oCore.byId("idCalKeyFigure");

                // Condition for disabling/hiding forecast key figures
                const bShouldHide =
                    (oCGroup === "Customer Group" && oSelected === true) ||
                    (oCGroup === undefined && oSelected === undefined);

                if (bShouldHide === false) {
                    return false
                }
                if (oPanel) {
                    this._toggleNorForecastKeyFigures(oPanel, bShouldHide);
                }
            },


            _toggleNorForecastKeyFigures: function (oPanel, bHide) {
                setTimeout(() => {
                    const aP13nData = oPanel.getP13nData ? oPanel.getP13nData() : [];

                    // Target key figure descriptions
                    const aTargetDescs = ["Forecast Order % at VC", "Forecast Order Qty at VC",
                        "Unconsumed Qty % at VC", "Unconsumed Qty at VC"];

                    aP13nData.forEach(oEntry => {
                        if (aTargetDescs.includes(oEntry.label)) {
                            // 👇 unselect before hiding
                            oEntry.selected = false;

                            // 👇 hide/disable
                            oEntry.visible = !bHide;
                            oEntry.enabled = !bHide;
                        }
                    });

                    // Update the panel with new data
                    if (typeof oPanel.setP13nData === "function") {
                        oPanel.setP13nData(aP13nData);
                    }

                    // Force re-render
                    if (typeof oPanel.invalidate === "function") {
                        oPanel.invalidate();
                    }
                }, 100);
            },


            onCalSelect: function () {
                const oCGroup = this.oGModel.getProperty("/CGroup");
                const oSelected = this.oGModel.getProperty("/oSelected");
                const oPanel = sap.ui.getCore().byId("idCalKeyFigure");


                // Condition for disabling/hiding forecast key figures
                const bShouldHide =
                    (oCGroup === "Customer Group" && oSelected === true) ||
                    (oCGroup === undefined && oSelected === undefined);

                if (bShouldHide === false) {
                    return false
                }
                if (oPanel) {
                    this._toggleCalForecastKeyFigures(oPanel, bShouldHide);
                }
            },

            _toggleCalForecastKeyFigures: function (oPanel, bHide) {
                // Wait a tick to ensure panel is rendered
                setTimeout(() => {
                    // Get personalization data array
                    const aP13nData = oPanel.getP13nData ? oPanel.getP13nData() : [];

                    // Target key figure descriptions
                    const aTargetDescs = ["Forecast Order Qty", "Unconsumed Quantity"];

                    // Loop and update only those two entries
                    aP13nData.forEach(oEntry => {
                        if (aTargetDescs.includes(oEntry.label)) {
                            oEntry.visible = !bHide;   // hide/show row
                            oEntry.enabled = !bHide;   // disable/enable checkbox
                        }
                    });

                    // Push the updated array back to panel
                    if (typeof oPanel.setP13nData === "function") {
                        oPanel.setP13nData(aP13nData);
                    }

                    // Force re-rendering
                    if (typeof oPanel.invalidate === "function") {
                        oPanel.invalidate();
                    }
                }, 100);
            },


            checkSelect: function (oEvent) {
                const table = sap.ui.getCore().byId("idDataTable");
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


            //all workign code
            // onOpenKeyFigPopup: function (oEvent) {
            //     var isCustomerGroupPresent = that.isCustomerGroupPresent;
            //     var norKeyFig = that.oGModel.getProperty("/norKeyFig");
            //     var calKeyFig = that.oGModel.getProperty("/calKeyFig");

            //     // --- Step 7: Apply fade effect only when Customer Group exists ---
            //     const fadeDisabledTexts = (panel) => {
            //         const data = panel.getP13nData();

            //         panel.addEventDelegate({
            //             onAfterRendering: function () {
            //                 const $panel = panel.$();
            //                 data.forEach((entry, index) => {
            //                     const item = $panel.find(
            //                         `.sapMListItems li:nth-child(${index + 1}), .sapMLIB:nth-child(${index + 1})`
            //                     );

            //                     if (!entry.enabled) {
            //                         // Apply fade effect
            //                         item.addClass("sapUiDisabledText");
            //                         item.removeClass("sapUiNormalText");
            //                         item.attr("title", "Disabled for Planned/Forecast Key Figures");
            //                     } else {
            //                         // Restore normal appearance
            //                         item.addClass("sapUiNormalText");
            //                         item.removeClass("sapUiDisabledText");
            //                         item.removeAttr("title");
            //                     }
            //                 });
            //             }
            //         });
            //     };

            //     var oCGroup = that.oGModel.getProperty("/CGroup");
            //     var oSelected = that.oGModel.getProperty("/oSelected");

            //     if (isCustomerGroupPresent) {
            //         var oCGroup = that.oGModel.getProperty("/CGroup");
            //         var oSelected = that.oGModel.getProperty("/oSelected");

            //         if ((oCGroup === "Customer Group" && oSelected === true) ||
            //             (oCGroup === undefined && oSelected === undefined)) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //             ];

            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             const ocaldisableLabels = [
            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"
            //             ];

            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             // --- SORT ORDER LOGIC ---
            //             // const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];

            //             // let norItems = oNorKeyFigData.items;
            //             // norItems.sort((a, b) => {
            //             //     const indexA = mandatoryOrder.indexOf(a.label);
            //             //     const indexB = mandatoryOrder.indexOf(b.label);
            //             //     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //             //     if (indexA !== -1) return -1;
            //             //     if (indexB !== -1) return 1;
            //             //     return a.label.localeCompare(b.label);
            //             // });
            //             // oNorKeyFigData.items = norItems;
            //             // norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             // let calItems = oCalKeyFigData.items;
            //             // calItems.sort((a, b) => {
            //             //     const indexA = mandatoryOrder.indexOf(a.label);
            //             //     const indexB = mandatoryOrder.indexOf(b.label);
            //             //     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //             //     if (indexA !== -1) return -1;
            //             //     if (indexB !== -1) return 1;
            //             //     return a.label.localeCompare(b.label);
            //             // });
            //             // oCalKeyFigData.items = calItems;
            //             // calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---

            //             // --- SORT ORDER LOGIC ---
            //             const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
            //             const mandatoryFirstCal = ["Product Demand"]; // Always first in Calculation tab

            //             // --- Normal KeyFig sorting ---
            //             let norItems = oNorKeyFigData.items;
            //             norItems.sort((a, b) => {
            //                 const indexA = mandatoryOrderNor.indexOf(a.label);
            //                 const indexB = mandatoryOrderNor.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oNorKeyFigData.items = norItems;
            //             norKeyFig.oModels["$p13n"].setData(oNorKeyFigData);

            //             // --- Calculation KeyFig sorting ---
            //             let calItems = oCalKeyFigData.items;
            //             calItems.sort((a, b) => {
            //                 const indexA = mandatoryFirstCal.indexOf(a.label);
            //                 const indexB = mandatoryFirstCal.indexOf(b.label);

            //                 // Product Demand first
            //                 if (indexA !== -1 && indexB === -1) return -1;
            //                 if (indexA === -1 && indexB !== -1) return 1;

            //                 // Alphabetical for the rest
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oCalKeyFigData.items = calItems;
            //             calKeyFig.oModels["$p13n"].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---


            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);

            //         } else if (oCGroup === "Customer Group" && oSelected === false) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //             ];

            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
            //             const ocaldisableLabels = [
            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"
            //             ];

            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             // --- SORT ORDER LOGIC ---
            //             const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];

            //             let norItems = oNorKeyFigData.items;
            //             norItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oNorKeyFigData.items = norItems;
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             let calItems = oCalKeyFigData.items;
            //             calItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oCalKeyFigData.items = calItems;
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);
            //         }
            //     } else {
            //         if (oCGroup === "Customer Group" && oSelected === true) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //             ];

            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             const ocaldisableLabels = [
            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"
            //             ];

            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             // --- SORT ORDER LOGIC ---
            //             const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
            //             let norItems = oNorKeyFigData.items;
            //             norItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oNorKeyFigData.items = norItems;
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             let calItems = oCalKeyFigData.items;
            //             calItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oCalKeyFigData.items = calItems;
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);

            //         } else if (oCGroup === "Customer Group" && oSelected === false) {
            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //             ];

            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
            //             const ocaldisableLabels = [
            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"
            //             ];

            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             // --- SORT ORDER LOGIC ---
            //             const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
            //             let norItems = oNorKeyFigData.items;
            //             norItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oNorKeyFigData.items = norItems;
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             let calItems = oCalKeyFigData.items;
            //             calItems.sort((a, b) => {
            //                 const indexA = mandatoryOrder.indexOf(a.label);
            //                 const indexB = mandatoryOrder.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oCalKeyFigData.items = calItems;
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);

            //         } else if (oCGroup === undefined && oSelected === undefined) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //             ];

            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();
            //             const ocaldisableLabels = [
            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"
            //             ];

            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             // --- SORT ORDER LOGIC ---
            //             const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
            //             const mandatoryOrderCal = ["Statistical Forecast %", "Option Percentage %", "Option Quantity", "Product Demand"];

            //             // --- Nor KeyFig sorting ---
            //             let norItems = oNorKeyFigData.items;
            //             norItems.sort((a, b) => {
            //                 const indexA = mandatoryOrderNor.indexOf(a.label);
            //                 const indexB = mandatoryOrderNor.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oNorKeyFigData.items = norItems;
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             // --- Cal KeyFig sorting ---
            //             let calItems = oCalKeyFigData.items;
            //             calItems.sort((a, b) => {
            //                 const indexA = mandatoryOrderCal.indexOf(a.label);
            //                 const indexB = mandatoryOrderCal.indexOf(b.label);
            //                 if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //                 if (indexA !== -1) return -1;
            //                 if (indexB !== -1) return 1;
            //                 return a.label.localeCompare(b.label);
            //             });
            //             oCalKeyFigData.items = calItems;
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // --- END SORT ORDER LOGIC ---


            //             // // --- SORT ORDER LOGIC ---
            //             // const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
            //             // let norItems = oNorKeyFigData.items;
            //             // norItems.sort((a, b) => {
            //             //     const indexA = mandatoryOrder.indexOf(a.label);
            //             //     const indexB = mandatoryOrder.indexOf(b.label);
            //             //     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //             //     if (indexA !== -1) return -1;
            //             //     if (indexB !== -1) return 1;
            //             //     return a.label.localeCompare(b.label);
            //             // });
            //             // oNorKeyFigData.items = norItems;
            //             // norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             // let calItems = oCalKeyFigData.items;
            //             // calItems.sort((a, b) => {
            //             //     const indexA = mandatoryOrder.indexOf(a.label);
            //             //     const indexB = mandatoryOrder.indexOf(b.label);
            //             //     if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            //             //     if (indexA !== -1) return -1;
            //             //     if (indexB !== -1) return 1;
            //             //     return a.label.localeCompare(b.label);
            //             // });
            //             // oCalKeyFigData.items = calItems;
            //             // calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             // // --- END SORT ORDER LOGIC ---

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);
            //         }
            //     }

            //     this._oKeyFigPopup.open();
            //     this._oKeyFigPopup._oPopup.setContentHeight("26rem");
            //     this._oKeyFigPopup._oPopup.setContentWidth("26rem");
            // },




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
                        const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
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
                        const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
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
                        const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
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
                        const mandatoryOrder = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
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
                        const mandatoryOrderNor = ["Statistical Forecast %", "Option Percentage %", "Option Quantity"];
                        const mandatoryFirstCal = ["Product Demand"];  // FIX HERE TOO

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





            // old code
            // onOpenKeyFigPopup: function (oEvent) {
            //     var isCustomerGroupPresent = that.isCustomerGroupPresent
            //     var norKeyFig = that.oGModel.getProperty("/norKeyFig")
            //     var calKeyFig = that.oGModel.getProperty("/calKeyFig")

            //     // --- Step 7: Apply fade effect only when Customer Group exists ---
            //     const fadeDisabledTexts = (panel) => {
            //         const data = panel.getP13nData();

            //         panel.addEventDelegate({
            //             onAfterRendering: function () {
            //                 const $panel = panel.$();
            //                 data.forEach((entry, index) => {
            //                     const item = $panel.find(
            //                         `.sapMListItems li:nth-child(${index + 1}), .sapMLIB:nth-child(${index + 1})`
            //                     );

            //                     if (!entry.enabled) {
            //                         // Apply fade effect
            //                         item.addClass("sapUiDisabledText");
            //                         item.removeClass("sapUiNormalText");
            //                         item.attr("title", "Disabled for Planned/Forecast Key Figures");
            //                     } else {
            //                         // Restore normal appearance
            //                         item.addClass("sapUiNormalText");
            //                         item.removeClass("sapUiDisabledText");
            //                         item.removeAttr("title");
            //                     }
            //                 });
            //             }
            //         });
            //     };
            //     var oCGroup = that.oGModel.getProperty("/CGroup")
            //     var oSelected = that.oGModel.getProperty("/oSelected")
            //     if (isCustomerGroupPresent) {
            //         // fadeDisabledTexts(norKeyFig);
            //         // fadeDisabledTexts(calKeyFig);
            //         var oCGroup = that.oGModel.getProperty("/CGroup")
            //         var oSelected = that.oGModel.getProperty("/oSelected")
            //         if ((oCGroup === "Customer Group" && oSelected === true) ||
            //             (oCGroup === undefined && oSelected === undefined)) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //                 // "Planned Option %",
            //                 // "Planned Option Qty"
            //             ];

            //             // Update enabled property to false for matching labels
            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const ocaldisableLabels = [

            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"

            //             ];


            //             // Update enabled property to false for matching labels
            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);

            //         } else if (oCGroup === "Customer Group" && oSelected === false) {
            //             // Get personalization data from your P13n model
            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //                 // "Planned Option %",
            //                 // "Planned Option Qty"
            //             ];

            //             // Update enabled property to false for matching labels
            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);


            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const ocaldisableLabels = [

            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"

            //             ];


            //             // Update enabled property to false for matching labels
            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);
            //         }
            //     } else {
            //         if (oCGroup === "Customer Group" && oSelected === true) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //                 // "Planned Option %",
            //                 // "Planned Option Qty"
            //             ];

            //             // Update enabled property to false for matching labels
            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const ocaldisableLabels = [

            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"

            //             ];


            //             // Update enabled property to false for matching labels
            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);

            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);

            //         }
            //         else if (oCGroup === "Customer Group" && oSelected === false) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //                 // "Planned Option %",
            //                 // "Planned Option Qty"
            //             ];

            //             // Update enabled property to false for matching labels
            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const ocaldisableLabels = [

            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"

            //             ];


            //             // Update enabled property to false for matching labels
            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = true;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);
            //         }

            //         else if (oCGroup === undefined && oSelected === undefined) {

            //             const oNorKeyFigData = norKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const disableLabels = [
            //                 "Forecast Order % at VC",
            //                 "Forecast Order Qty at VC",
            //                 "Unconsumed Qty % at VC",
            //                 "Unconsumed Qty at VC"
            //                 // "Planned Option %",
            //                 // "Planned Option Qty"
            //             ];

            //             // Update enabled property to false for matching labels
            //             oNorKeyFigData.items.forEach(item => {
            //                 if (disableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             norKeyFig.oModels['$p13n'].setData(oNorKeyFigData);

            //             const oCalKeyFigData = calKeyFig.oModels['$p13n'].getData();

            //             // Define labels to disable
            //             const ocaldisableLabels = [

            //                 "Forecast Order Qty",
            //                 "Unconsumed Quantity"

            //             ];


            //             // Update enabled property to false for matching labels
            //             oCalKeyFigData.items.forEach(item => {
            //                 if (ocaldisableLabels.includes(item.label)) {
            //                     item.enabled = false;
            //                 }
            //             });

            //             // Apply updated data back to model
            //             calKeyFig.oModels['$p13n'].setData(oCalKeyFigData);
            //             fadeDisabledTexts(norKeyFig);
            //             fadeDisabledTexts(calKeyFig);
            //         }
            //     }
            //     this._oKeyFigPopup.open();
            //     this._oKeyFigPopup._oPopup.setContentHeight("26rem");
            //     this._oKeyFigPopup._oPopup.setContentWidth("26rem");
            // },




            ///==========================//////////////////







            onCloseKeyFig: function (event) {
                const reason = event.getParameters().reason;
                if (reason == "Ok" || reason == undefined) {
                    let p13Data1 = that.oCore.byId("idNorKeyFigure").getP13nData();
                    let p13Data2 = that.oCore.byId("idCalKeyFigure").getP13nData();
                    if (
                        p13Data1.filter((f) => f.visible).length > 0 ||
                        p13Data2.filter((f) => f.visible).length > 0
                    ) {
                        if (that.hot && that.hot.getSourceData().length > 0) {
                            that.onTreeItemSelect();
                        }
                    }
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


            /// 11-11-2025 commented code
            // getOptPerData: function (data) {
            //     let resultMap = new Map();
            //     const weekDates = that.dates;
            //     const weekIndex = that.staticColumns.length;
            //     const manualKey = that.ManualKeyArr[0];
            //     let toggleCharFlag = false;
            //     let toggleCharValFlag = false;
            //     let previousCharNum = "";
            //     let previousCharValNum = "";


            //     if (that.Flag === "M") {

            //         var normalKeyFig = sap.ui.getCore().byId("idNorKeyFigure")
            //         var oNkfig = normalKeyFig.oModels.$p13n.getData().items


            //         var oTotalNkfig = that.oGModel.getProperty("/oMnulSv_Kfg");

            //         var onormalMap = new Map(oNkfig.map(item => [item.label, item]));
            //         var totalNormMap = new Map(oTotalNkfig.map(item => [item.label, item]));

            //         // Get union of all labels
            //         var allLabels = Array.from(new Set([
            //             ...oNkfig.map(i => i.label),
            //             ...oTotalNkfig.map(i => i.label)
            //         ]));

            //         // Build the final array
            //         var NormergedArray = allLabels.map(label => {
            //             var normalItem = onormalMap.get(label);
            //             var totalItem = totalNormMap.get(label);

            //             // Merge if exists in both
            //             if (normalItem && totalItem) {
            //                 return {
            //                     key: totalItem.key ?? normalItem.key,
            //                     label: label,
            //                     visible: true,
            //                     enabled: true
            //                 };
            //             } else {
            //                 // Exists in only one array → visible/enabled false
            //                 return {
            //                     key: (normalItem?.key ?? totalItem?.key) || null,
            //                     label: label,
            //                     visible: false,
            //                     enabled: true
            //                 };
            //             }
            //         });

            //         var CalKeyFig = sap.ui.getCore().byId("idCalKeyFigure")
            //         var oCalfig = CalKeyFig.oModels.$p13n.getData().items


            //         var oTotalCalkeyfig = that.oGModel.getProperty("/oCalu_Kfg");

            //         var oCalcMap = new Map(oCalfig.map(item => [item.label, item]));
            //         var totalCalMap = new Map(oTotalCalkeyfig.map(item => [item.label, item]));

            //         // Get union of all labels
            //         var allCalLabels = Array.from(new Set([
            //             ...oCalfig.map(i => i.label),
            //             ...oTotalCalkeyfig.map(i => i.label)
            //         ]));

            //         // Build the final array
            //         var CalmergedArray = allCalLabels.map(label => {
            //             var calItem = oCalcMap.get(label);
            //             var totalcalItem = totalCalMap.get(label);

            //             // Merge if exists in both
            //             if (calItem && totalcalItem) {
            //                 return {
            //                     key: totalcalItem.key ?? calItem.key,
            //                     label: label,
            //                     visible: true,
            //                     enabled: true
            //                 };
            //             } else {
            //                 // Exists in only one array → visible/enabled false
            //                 return {
            //                     key: (calItem?.key ?? totalcalItem?.key) || null,
            //                     label: label,
            //                     visible: false,
            //                     enabled: true
            //                 };
            //             }
            //         });

            //         normalKeyFig.setP13nData(NormergedArray);
            //         CalKeyFig.setP13nData(CalmergedArray);

            //         var totalKeyFigs = [
            //             ...NormergedArray.filter(fig => fig.visible),
            //             ...CalmergedArray.filter(fig => fig.visible)
            //         ];

            //         // Update the model with new values
            //         that.oGModel.setProperty("/normalKeyFig", normalKeyFig);
            //         that.oGModel.setProperty("/CalKeyFig", CalKeyFig);
            //         that.Flag = ""

            //     } else {
            //         // that.Flag = ""
            //         var totalKeyFigs = [
            //             ...that.oCore
            //                 .byId("idNorKeyFigure")
            //                 .getP13nData()
            //                 .filter((fig) => fig.visible),
            //             ...that.oCore
            //                 .byId("idCalKeyFigure")
            //                 .getP13nData()
            //                 .filter((fig) => fig.visible),
            //         ];
            //     }

            //     //  var totalKeyFigs = [
            //     //         ...that.oCore
            //     //             .byId("idNorKeyFigure")
            //     //             .getP13nData()
            //     //             .filter((fig) => fig.visible),
            //     //         ...that.oCore
            //     //             .byId("idCalKeyFigure")
            //     //             .getP13nData()
            //     //             .filter((fig) => fig.visible),
            //     //     ];


            //     var visibleKeyFigs = totalKeyFigs.filter(
            //         (f) => f.key <= 200 || f.key >= 999
            //     )

            //     const totalDates = that.oGModel.getProperty("/totalWeekTypes");
            //     that.oCharObj = {};
            //     that.comments = [];
            //     // Step 1: Group data by key combination including TYPE
            //     for (let index = 0; index < data.length; index++) {
            //         const item = data[index];
            //         if (!item.CHAR_NUM) {
            //             continue;
            //         }
            //         item.WEEKDATE = totalDates.find(
            //             (w) => w[that.weekType] === item[that.weekType]
            //         ).WEEK_STARTDATE;
            //         const lockItem = that.lockComments.find(
            //             (lock) =>
            //                 item.LOCATION_ID === lock.LOCATION_ID &&
            //                 item.PRODUCT_ID === lock.PRODUCT_ID &&
            //                 item.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
            //                 item.CHAR_NUM === lock.CHAR_NUM &&
            //                 item.CHARVAL_NUM === lock.CHARVAL_NUM &&
            //                 item.VERSION === lock.VERSION &&
            //                 item.SCENARIO === lock.SCENARIO &&
            //                 item.MODEL_VERSION === lock.MODEL_VERSION &&
            //                 item.TYPE == lock.TYPE &&
            //                 item.WEEKDATE.toLocaleDateString("en-CA") ===
            //                 lock.WEEK_DATE.toLocaleDateString("en-CA")
            //         );
            //         if (lockItem) {
            //             item.LOCK = lockItem.LOCK;
            //             if (lockItem.COMMENTS) {
            //                 item.COMMENTS = lockItem.COMMENTS;
            //             }
            //         }
            //         let baseKey = `${item.LOCATION_ID}|${item.PRODUCT_ID}|${item.CUSTOMER_GROUP}|${item.CHAR_NUM}|${item.CHARVAL_NUM}`;

            //         const baseData = mapBaseFields(item);
            //         if (index === 0 || item.CHAR_NUM !== previousCharNum) {
            //             toggleCharFlag = !toggleCharFlag;
            //             previousCharNum = item.CHAR_NUM;
            //         }
            //         baseData.FLAG = toggleCharFlag;
            //         if (index === 0 || item.CHARVAL_NUM !== previousCharValNum) {
            //             toggleCharValFlag = !toggleCharValFlag;
            //             previousCharValNum = item.CHARVAL_NUM;
            //         }
            //         baseData.FLAG_CV = toggleCharValFlag;
            //         // Initialize all week dates with empty strings for all the key figures
            //         for (let j = 0; j < visibleKeyFigs.length; j++) {
            //             const keyFig = visibleKeyFigs[j];
            //             let keyWithType = `${baseKey}|${keyFig.key}`;
            //             if (!resultMap.has(keyWithType)) {
            //                 resultMap.set(keyWithType, {
            //                     ...baseData,
            //                     LOCATION_ID: item.LOCATION_ID,
            //                     PRODUCT_ID: item.PRODUCT_ID,
            //                     CUSTOMER_GROUP: item.CUSTOMER_GROUP,
            //                     // CLASS_NUM: item.CLASS_NUM,
            //                     CHAR_NUM: item.CHAR_NUM,
            //                     CHAR_NAME: item.CHAR_NAME,
            //                     CHARVAL_NUM: item.CHARVAL_NUM,
            //                     VERSION: item.VERSION,
            //                     SCENARIO: item.SCENARIO,
            //                     MODEL_VERSION: item.MODEL_VERSION,
            //                     TYPE: keyFig.key,
            //                     KEY_FIG_ID: keyFig.key,
            //                     KEY_FIG_DESC: keyFig.label,
            //                     DISPLAY_ORDER: keyFig.key,
            //                     PRIORITY_ORDER: keyFig.key,
            //                     ...weekDates.reduce((acc, date) => {
            //                         acc[date] = "";
            //                         return acc;
            //                     }, {}),
            //                 });
            //             }
            //             // Assign the OPT_PERCENT and OPT_QTY to the correct week column for key figures less than 50
            //             if (item.TYPE == keyFig.key && item.TYPE < 50) {
            //                 if (item.COMMENTS && lockItem) {
            //                     const key = `${item[that.weekType]}_COMMENTS`;
            //                     resultMap.get(keyWithType)[key] = lockItem.COMMENTS;
            //                     ``;
            //                 }
            //                 item.OPT_PERCENT = parseFloat(item.OPT_PERCENT)
            //                     .toFixed(2)
            //                     .toString();
            //                 let percentValue = item.OPT_PERCENT.includes("%")
            //                     ? item.OPT_PERCENT
            //                     : item.OPT_PERCENT + "%";
            //                 resultMap.get(keyWithType)[item[that.weekType]] = item.LOCK
            //                     ? `🔒${percentValue}`
            //                     : percentValue;
            //             }
            //             else if (keyFig.key > 50 && keyFig.key < 100) {
            //                 let value = keyFig.key - 50;
            //                 if (item.TYPE == value) {
            //                     resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
            //                         ? Math.round(item.OPT_QTY)
            //                         : 0;
            //                 }
            //             }
            //             else if (item.TYPE > 100 && item.TYPE <= 150 && item.TYPE == keyFig.key) {
            //                 resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT + "%"}`;
            //             }
            //             else if (keyFig.key > 150 && keyFig.key < 200) {
            //                 let value = keyFig.key - 50;
            //                 if (item.TYPE == value) {
            //                     resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
            //                         ? Math.round(item.OPT_QTY)
            //                         : 0;
            //                 }
            //             }
            //             else if (item.TYPE == 1000) {
            //                 if (keyFig.key == 1000) {
            //                     item.OPT_PERCENT = `${item.OPT_PERCENT}`
            //                         ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
            //                         : parseFloat(`${item.OPT_PERCENT}`) || 0;
            //                     resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
            //                         ? item.OPT_PERCENT
            //                         : item.OPT_PERCENT + "%"
            //                         }`;
            //                 } else if (keyFig.key == 1100) {
            //                     resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
            //                         ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
            //                         : Math.round(item.OPT_QTY) || 0;
            //                 }
            //             } else if (item.TYPE == 1001) {
            //                 if (keyFig.key == 1001) {
            //                     item.OPT_PERCENT = `${item.OPT_PERCENT}`
            //                         ? parseFloat(`${item.OPT_PERCENT}`).toFixed(2)
            //                         : parseFloat(`${item.OPT_PERCENT}`) || 0;
            //                     resultMap.get(keyWithType)[item[that.weekType]] = `${item.OPT_PERCENT.includes("%")
            //                         ? item.OPT_PERCENT
            //                         : item.OPT_PERCENT + "%"
            //                         }`;
            //                 } else if (keyFig.key == 1101) {
            //                     resultMap.get(keyWithType)[item[that.weekType]] = item.OPT_QTY
            //                         ? Math.round(parseFloat(item.OPT_QTY).toFixed(2))
            //                         : Math.round(item.OPT_QTY) || 0;
            //                 }
            //             }
            //         }
            //     }

            //     let index = 0;
            //     resultMap.forEach((value, key) => {
            //         let keyType = value.TYPE;
            //         for (let k = 0; k < weekDates.length; k++) {
            //             const date = weekDates[k];
            //             if (keyType === manualKey.KEY_FIG_ID) {
            //                 if (value[`${date}_COMMENTS`]) {
            //                     that.comments.push({
            //                         row: index,
            //                         col: k + weekIndex,
            //                         comment: { value: value[`${date}_COMMENTS`] },
            //                     });
            //                 }
            //             }
            //         }
            //         index++;
            //     });
            //     // adding code
            //     that.oGModel.setProperty("/resultMap", resultMap)

            //     return Array.from(resultMap.values());



            //     // Helper Functions
            //     function mapBaseFields(item) {
            //         return {
            //             LOCATION:
            //                 that.getFieldCategory("Location", item) || item.LOCATION_ID,
            //             PRODUCT: that.getFieldCategory("Product", item) || item.PRODUCT_ID,
            //             // CLASS: that.getFieldCategory("Class", item) || item.CLASS_NUM,
            //             CHAR:
            //                 that.getFieldCategory("Characteristic", item) || item.CHAR_NAME,
            //             CHARVAL:
            //                 that.getFieldCategory("Characteristic Value", item) ||
            //                 item.CHARVAL_NUM,
            //             VER: that.getFieldCategory("Version", item) || item.VERSION,
            //             SCEN: that.getFieldCategory("Scenario", item) || item.SCENARIO,
            //         };
            //     }

            // },


            getOptPerData: function (data) {
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

                    var normalKeyFig = sap.ui.getCore().byId("idNorKeyFigure")
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

                    var CalKeyFig = sap.ui.getCore().byId("idCalKeyFigure")
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
                            .byId("idNorKeyFigure")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                        ...that.oCore
                            .byId("idCalKeyFigure")
                            .getP13nData()
                            .filter((fig) => fig.visible),
                    ];
                }

                //  var totalKeyFigs = [
                //         ...that.oCore
                //             .byId("idNorKeyFigure")
                //             .getP13nData()
                //             .filter((fig) => fig.visible),
                //         ...that.oCore
                //             .byId("idCalKeyFigure")
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
                        .byId("idNorKeyFigure")
                        .getP13nData()
                        .filter((fig) => fig.visible),
                    ...that.oCore
                        .byId("idCalKeyFigure")
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

            loadExcel: function (data, rows, columns) {
                const weekType = this.byId("idWeekType").getSelectedKey();
                const ffData = that.oGModel.getProperty("/firmFrozenData");
                // Optimize DOM Manipulation
                let existingDiv = document.querySelector('[id*="mainDiv"]');
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
                        line: "---------",
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
                var defaultWidths = [60, 140, 105, 140, 140, 165];
                // let defaultWidths = [60, 140, 105, 140, 140];
                var defaultWidthFromFourth = 100;
                var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                    return index < 6 ? defaultWidths[index] : defaultWidthFromFourth;
                });



                var oCGroup = that.oGModel.getProperty("/CGroup")
                var oSelected = that.oGModel.getProperty("/oSelected")
                if ((oCGroup === "Customer Group" && oSelected === false)) {
                    var defaultWidths = [60, 140, 105, 140, 180];
                    // let defaultWidths = [60, 140, 105, 140, 140];
                    var defaultWidthFromFourth = 100;
                    var colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                        return index < 5 ? defaultWidths[index] : defaultWidthFromFourth;
                    });
                    // colWidths[2] = 105

                }
                // else{
                //     colWidths[2] = 105
                // }

                // Step 1: Identify Manual Option rows first
                var oManual = data.filter(item => item.KEY_FIG_DESC === "Manual Option % ");
                var hasManual = oManual.length > 0;



                function arrangeRowsByGroup(data) {
                    if (!Array.isArray(data) || data.length === 0) return [];

                    // Identify week fields dynamically (CW and FY columns)
                    // const weekFields = Object.keys(data[0]).filter(k => k.startsWith("CW") || k.startsWith("FY"));

                    const weekFields = Object.keys(data[0]).filter(k => k.includes("CW") || k.startsWith("FY"));


                    // ✅ Key figures that are treated specially (manual or demand)
                    const SPECIAL_KFS = [
                        "Manual Option % ",
                        "Actual Demand % at VC",
                        "Actual Demand Qty at VC"
                    ];

                    // ✅ Function to check if row has any non-empty week value
                    const hasNonEmptyWeeks = (row) =>
                        weekFields.some(f => row[f] !== "" && row[f] !== null && row[f] !== undefined);

                    // ✅ Determine if the row should be kept
                    const hasValues = (row) => {
                        const kf = row.KEY_FIG_DESC;
                        const hasWeeks = hasNonEmptyWeeks(row);

                        // ✅ If it's a special key figure (Manual or Actual Demand)
                        if (SPECIAL_KFS.includes(kf)) {
                            // Keep if has values OR has customer group
                            // Remove only if CUSTOMER_GROUP is null AND all weeks empty
                            if (hasWeeks) return true;
                            if (row.CUSTOMER_GROUP) return true;
                            return false;
                        }

                        // ✅ For all other key figures, keep only if has week values
                        return hasWeeks;
                    };

                    // ✅ Define display order
                    const ORDER = {
                        "Statistical Forecast %": 1,
                        "Option Percentage %": 2,
                        "Option Quantity": 3,
                        "Manual Option % ": 4,
                        "Forecast Order % at VC": 5,
                        "Forecast Order Qty at VC": 6,
                        "Actual Demand % at VC": 7,
                        "Actual Demand Qty at VC": 8
                    };

                    // ✅ Identify VC-type key figures
                    const isVC = (kf) =>
                        kf === "Forecast Order % at VC" ||
                        kf === "Forecast Order Qty at VC" ||
                        kf === "Actual Demand % at VC" ||
                        kf === "Actual Demand Qty at VC";

                    // ✅ Group key (unique for product/char)
                    const keyOf = (r) => [
                        r.LOCATION_ID ?? r.LOCATION,
                        r.PRODUCT_ID ?? r.PRODUCT,
                        r.CHAR_NAME ?? r.CHAR ?? r.CHAR_NUM,
                        r.CHARVAL_NUM ?? r.CHARVAL,
                        r.VERSION ?? r.VER
                    ].join("|");

                    const groups = new Map();

                    for (const row of data) {
                        if (!hasValues(row)) continue; // ⛔ Skip invalid rows

                        const key = keyOf(row);
                        if (!groups.has(key)) groups.set(key, { cg: [], vc: [] });

                        // ✅ Separate CG (customer group) and VC (no customer group)
                        if (row.CUSTOMER_GROUP) {
                            groups.get(key).cg.push(row);
                        } else {
                            groups.get(key).vc.push(row);
                        }
                    }

                    // ✅ Sort within groups
                    const sortByOrder = (a, b) => {
                        const oa = ORDER[a.KEY_FIG_DESC] ?? (a.DISPLAY_ORDER ?? 99999);
                        const ob = ORDER[b.KEY_FIG_DESC] ?? (b.DISPLAY_ORDER ?? 99999);
                        return oa - ob;
                    };

                    // ✅ Flatten groups back into one array
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
                        return hasManual; // ✅ Include manual only if backend gave manual
                    }

                    // ✅ Everything else stays because arrangeRowsByGroup already removed empty ones
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

                // Step 2 Sort your data array
                const orderedData = data.sort((a, b) => {
                    const aMeta = seqMap.get(a.CHAR_NUM) || { weightage: 0, sequence: 9999 };
                    const bMeta = seqMap.get(b.CHAR_NUM) || { weightage: 0, sequence: 9999 };

                    // 1️1 Sort by weightage (descending)
                    if (aMeta.weightage !== bMeta.weightage) {
                        return bMeta.weightage - aMeta.weightage;
                    }

                    // 2️2 If same weightage, sort by sequence (ascending)
                    return aMeta.sequence - bMeta.sequence;
                });




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

                    that.oFreshData = orderedData

                    that.hot = new Handsontable(excel, {
                        data: orderedData,
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
                            if (event.ctrlKey && coords.row >= 0 && coords.col >= 0) {
                                that.handleClickSum(coords);
                            } else {
                                that.dragStartCoords = coords;
                                that.totalSum = 0;
                            }
                        },
                        afterOnCellMouseUp: function (_, coords) {
                            if (!that.dragStartCoords) return;
                            that.sumonDrag(that.dragStartCoords, coords);
                            that.dragStartCoords = null;
                        },
                    });
                } else {
                    sap.m.MessageToast.show("No Option Percentages")
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
                    .byId("idSumTag")
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
                    var selection = that.hot.getSelectedRange();
                    if (selection.length === 1) {
                        let rowInd = coords.row,
                            colInd = coords.col,
                            cellMeta = that.hot.getCellMeta(rowInd, colInd);
                        let isReadOnly = cellMeta.readOnly,
                            rowData = that.hot.getSourceDataAtRow(rowInd);
                        let isValidColumn = colInd > that.staticColumns.length - 1;

                        if (
                            isReadOnly &&
                            rowData?.KEY_FIG_DESC !== that.ManualKeyArr[0].KEY_FIG_DESC
                        ) {
                            contextMenuPlugin.disablePlugin();
                        } else if (isValidColumn) {
                            contextMenuPlugin.enablePlugin();
                        } else {
                            contextMenuPlugin.disablePlugin();
                        }
                    } else {
                        contextMenuPlugin.disablePlugin();
                    }
                });


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
                                } else if (ffData.fozenMonDay.includes(prop)) {
                                    cellProperties.readOnly = true;
                                    cellProperties.className = (cellProperties.className || "") + " readOnlyGrey";
                                    return cellProperties; // ✅ stop further override
                                }


                                else if (ffData.firmMonDay.includes(prop)) {
                                    const fObj = findObject(
                                        that.cellChanges.length > 0 ? that.cellChanges : that.allData,
                                        {
                                            ...rowData,
                                            [that.weekType]: prop,
                                            KEY_FIG_ID: that.ManualKeyArr[0].KEY_FIG_ID,
                                        }
                                    );
                                    cellProperties.readOnly = fObj ? fObj.LOCK : false;
                                    cellProperties.className = (cellProperties.className || "") + " editableFirm";
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
                that.byId("idDynamicPage2").setBusy(false);
                that.byId("idDynamicPage2").setShowFooter(true);
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
            },



            handleClickSum(cell) {
                let cellValue = that.hot.getDataAtCell(cell.row, cell.col);
                let tag = that.getView().byId("idSumTag");
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
                    tag = that.getView().byId("idSumTag"),
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
                // data = data.filter(f => f.CUSTOMER_GROUP !== null || f.TYPE == 995 && f.CUSTOMER_GROUP !== null)

                const weekType = this.byId("idWeekType").getSelectedKey();
                const ffData = that.oGModel.getProperty("/firmFrozenData");
                var newDiv = document.createElement("div");
                newDiv.id = "excelSubGrid";
                newDiv.className = "excelStyle";
                newDiv.textContent = "";
                var existingDiv = document.querySelector('[id*="subDiv"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                existingDiv.appendChild(newDiv);
                var excel = document.querySelector('[id*="excelSubGrid"]');
                let numberOfColumns = columns.length;
                that.lastWeek = columns[columns.length - 1];
                let defaultWidths = [60, 140, 105, 445];

                let defaultWidthFromFourth = 100;
                let colWidths = Array.from({ length: numberOfColumns }, (_, index) => {
                    return index < that.staticColumns.length - 2
                        ? defaultWidths[index]
                        : defaultWidthFromFourth;
                });
                // if (colWidths.length === 21) {
                //     colWidths[2] = 380
                //     //   defaultWidths = [60, 140, 440];
                // }
                var oCGroup = that.oGModel.getProperty("/CGroup")
                var oSelected = that.oGModel.getProperty("/oSelected")
                if ((oCGroup === "Customer Group" && oSelected === false)) {
                    colWidths[2] = 425

                }



                // --- ✅ Keep object if at least one CW/FY has value, remove only empty CW/FY keys ---
                // var filteredData = data
                //     .map(obj => {
                //         const newObj = { ...obj };

                //         // Remove only empty CW/FY keys
                //         Object.keys(newObj).forEach(key => {
                //             if (/^\d{4}\s*(CW|FY)/.test(key)) {
                //                 const val = newObj[key];
                //                 if (
                //                     val === "" ||
                //                     val === null ||
                //                     val === undefined ||
                //                     val === "0" ||
                //                     val === 0 ||
                //                     (typeof val === "string" && val.trim() === "")
                //                 ) {
                //                     delete newObj[key];
                //                 }
                //             }
                //         });

                //         return newObj;
                //     })
                //     .filter(obj => {
                //         // ✅ Keep the object if it has *any* CW/FY key left after cleanup
                //         return Object.keys(obj).some(key => /^\d{4}\s*(CW|FY)/.test(key));
                //     });

                // let filteredData = data.filter(obj => {

                //     // Universal regex for all date formats
                //     const dateRegex = /^(CW\s?\d{4}\/\d{2}\/\d{2}|CW\s?\d{4}\s?CW?\d{2}|\d{4}\s?CW\d{2}|FY\d{2}\s?P\d{1,2}|FY\d{2}\s?Q\d)$/;

                //     // Find keys matching the regex
                //     const dateKeys = Object.keys(obj).filter(k => dateRegex.test(k));

                //     // Check if all date fields are empty
                //     const allEmpty = dateKeys.every(k =>
                //         obj[k] === "" || obj[k] === null || obj[k] === undefined
                //     );

                //     return !allEmpty; // keep only if NOT all empty
                // });

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
                    afterGetColHeader(col, TH) {
                        let totalDates = that.oGModel.getProperty("/totalWeekTypes");
                        let colLength = that.staticColumns.filter(
                            (s) => s != "Characteristic" && s != "Characteristic Value"
                        );
                        if (weekType !== "TELESCOPIC_WEEK") {
                            TH.className = "applyHeader";
                            if (col >= colLength.length) {
                                let weekObj = totalDates.find(
                                    (f) => f[weekType] == TH.textContent
                                );
                                let pStart = that.convertDate(weekObj.WEEK_STARTDATE, "/");
                                let pEnd = that.convertDate(weekObj.WEEK_ENDDATE, "/");
                                let title = `${pStart} - ${pEnd}`;
                                TH.title = title;
                            }
                        } else {
                            if (col < colLength.length) {
                                TH.className = "applyHeader";
                            }
                            if (col >= colLength.length) {
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

                    cells: function (row, col, prop) {
                        if (!that.subhot) return;
                        const rowData = that.subhot.getSourceDataAtRow(row);
                        const cellProperties = {};
                        if (ffData) {
                            if (new Date(prop) < new Date()) {
                                cellProperties.readOnly = true;
                                cellProperties.className = "hotAlign";
                            } else if (ffData.fozenMonDay.includes(prop)) {
                                cellProperties.readOnly = true;
                                cellProperties.className = "hotAlign";
                            } else if (ffData.firmMonDay.includes(prop)) {
                                cellProperties.readOnly = that.readOnlySub
                                    ? that.readOnlySub
                                    : false;
                                cellProperties.className = "editableFirm";
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
                        height: computedHeight,
                    });

                    // Re-render Handsontable
                    that.hot.render();
                }
            },

            onWeekTypeChange: function () {
                const oWeekTypeKey = this.byId("idWeekType").getSelectedKey();
                that.modifyFilterWeek(oWeekTypeKey);
                // that.onGo();
                that.oTree.setModel(new JSONModel([]), "treeModel");
                var existingDiv = document.querySelector('[id*="mainDiv"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDiv"]');
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
            },

            modifyFilterWeek: function (params) {
                const oDateRange = this.byId("idWeekDate");

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
                if (event.key === "Enter" && that.hot.getSelected()) {
                    event.preventDefault();
                    const [row, col] = that.hot.getSelected()[0];
                    const currentValue = that.hot.getDataAtCell(row - 1, col);
                    const cellMeta = that.hot.getCellMeta(row - 1, col);
                    if (
                        !currentValue.includes("🔒") &&
                        currentValue &&
                        !cellMeta.readOnly
                    )
                        that.hot.setDataAtCell(row - 1, col, `🔒${currentValue}`);
                }
            },

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

            onRemoveComment: function (cell) {
                if (that.commentChanges.length > 0) {
                    var foundObj = that.commentChanges.find(
                        (o) => o.col == cell.col && o.row == cell.row
                    );
                    if (foundObj) {
                        const index = that.commentChanges.indexOf(foundObj);
                        if (index !== -1) {
                            // that.commentChanges.splice(index, 1);
                            foundObj.comment = null;
                        }
                    } else {
                        cell.comment = null;
                        that.commentChanges.push(cell);
                    }
                } else {
                    cell.comment = null;
                    that.commentChanges.push(cell);
                }
            },

            handleSumTag: function () {
                var tag = that.getView().byId("idSumTag");
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

            handleEqualDistribute: function (selection, hot) {
                const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");
                const sortedKeyFigs = maintainedKeyFigs
                    .filter(
                        (fig) =>
                            fig.KEY_FIG_ID !== that.ManualKeyArr[0].KEY_FIG_ID &&
                            fig.KEY_FIG_ID <= 50
                    )
                    .sort((a, b) => b.PRIORITY_ORDER - a.PRIORITY_ORDER);
                var mainData = $.extend(true, [], that.allData);
                if (selection.length <= 1) {
                    const obj = selection[0];
                    if (obj.start.row === obj.end.row && obj.start.col === obj.end.col) {
                        let row = obj.start.row;
                        let col = obj.start.col;
                        // let rowData = hot.getSourceDataAtRow(row);
                        // let hotData = hot.getSourceData();
                        let hotData = hot
                            .getData()
                            .map((_, rowIndex) =>
                                hot.getSourceDataAtRow(hot.toPhysicalRow(rowIndex))
                            )
                            .filter((row) => row !== null);
                        let rowData = hotData[row];
                        let cellValue = hot.getDataAtCell(row, col);
                        let cellMeta = hot.getCellMeta(row, col);
                        if (cellValue && cellValue.startsWith("🔒")) {
                            cellValue = parseFloat(cellValue.slice(2));
                        }
                        cellValue = isNaN(parseFloat(cellValue))
                            ? ""
                            : parseFloat(cellValue);
                        // Function to check if two objects are equal (based on all 8 fields)
                        function isObjectEqual(obj1, obj2) {
                            return (
                                obj1.LOCATION_ID === obj2.LOCATION_ID &&
                                obj1.PRODUCT_ID === obj2.PRODUCT_ID &&
                                obj1.CUSTOMER_GROUP === obj2.CUSTOMER_GROUP &&
                                // obj1.CLASS_NUM === obj2.CLASS_NUM &&
                                obj1.CHAR_NUM === obj2.CHAR_NUM &&
                                obj1.CHARVAL_NUM === obj2.CHARVAL_NUM &&
                                obj1.VERSION === obj2.VERSION &&
                                obj1[that.weekType] === obj2[that.weekType] &&
                                obj1.SCENARIO === obj2.SCENARIO
                            );
                        }
                        if (cellValue && cellValue <= 100) {
                            let sumOfLockedCells = 0;
                            let diffValue = 100 - cellValue;
                            let charvals = mainData.filter(
                                (f) =>
                                    f.LOCATION_ID === rowData.LOCATION_ID &&
                                    f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                    f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                  /* f.CLASS_NUM === rowData.CLASS_NUM && */ f.CHAR_NUM ===
                                    rowData.CHAR_NUM &&
                                    f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                                    f.VERSION === rowData.VERSION &&
                                    f.SCENARIO == rowData.SCENARIO &&
                                    f[that.weekType] === cellMeta.prop &&
                                    f.KEY_FIG_ID == sortedKeyFigs[0].KEY_FIG_ID
                            );
                            let lockedCells = that.cellChanges.filter(
                                (f) =>
                                    f.LOCATION_ID === rowData.LOCATION_ID &&
                                    f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                    f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                  /* f.CLASS_NUM === rowData.CLASS_NUM && */ f.CHAR_NUM ===
                                    rowData.CHAR_NUM &&
                                    f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                                    f.VERSION === rowData.VERSION &&
                                    f.SCENARIO == rowData.SCENARIO &&
                                    f[that.weekType] === cellMeta.prop &&
                                    f.LOCK === true
                            );
                            let numberOfCharVals = charvals.length;
                            if (lockedCells.length > 0) {
                                let lockedCellsFromAllData = mainData.filter(
                                    (f) =>
                                        f.LOCATION_ID === rowData.LOCATION_ID &&
                                        f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                        f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                                        /* f.CLASS_NUM === rowData.CLASS_NUM && */
                                        f.CHAR_NUM === rowData.CHAR_NUM &&
                                        f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                                        f.VERSION === rowData.VERSION &&
                                        f.SCENARIO == rowData.SCENARIO &&
                                        f[that.weekType] === cellMeta.prop &&
                                        f.LOCK === true
                                );
                                if (
                                    lockedCellsFromAllData &&
                                    lockedCellsFromAllData.length > 0
                                ) {
                                    lockedCells = lockedCells.concat(lockedCellsFromAllData);
                                    lockedCells = that.removeDuplicates(lockedCells, [
                                        "LOCATION_ID",
                                        "PRODUCT_ID",
                                        "CUSTOMER_GROUP",
                                        "CLASS_NUM",
                                        "CHAR_NUM",
                                        "CHARVAL_NUM",
                                        "VERSION",
                                        "SCENARIO",
                                        that.weekType,
                                    ]);
                                }
                                // Remove objects from arr1 that are present in arr2
                                charvals = charvals.filter(
                                    (obj1) =>
                                        !lockedCells.some((obj2) => isObjectEqual(obj1, obj2))
                                );
                                lockedCells.forEach((c) => {
                                    sumOfLockedCells =
                                        sumOfLockedCells + parseFloat(c.OPT_PERCENT);
                                });
                                diffValue = diffValue - sumOfLockedCells;
                                numberOfCharVals = numberOfCharVals - lockedCells.length;
                            }
                            if (lockedCells.length == 0) {
                                let lockedCells = mainData.filter(
                                    (f) =>
                                        f.LOCATION_ID === rowData.LOCATION_ID &&
                                        f.PRODUCT_ID === rowData.PRODUCT_ID &&
                                        f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                    /* f.CLASS_NUM === rowData.CLASS_NUM && */ f.CHAR_NUM ===
                                        rowData.CHAR_NUM &&
                                        f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                                        f.VERSION === rowData.VERSION &&
                                        f.SCENARIO == rowData.SCENARIO &&
                                        f[that.weekType] === cellMeta.prop &&
                                        f.LOCK === true
                                );
                                if (lockedCells.length > 0) {
                                    // Remove objects from arr1 that are present in arr2
                                    charvals = charvals.filter(
                                        (obj1) =>
                                            !lockedCells.some((obj2) => isObjectEqual(obj1, obj2))
                                    );
                                    lockedCells.forEach((c) => {
                                        sumOfLockedCells =
                                            sumOfLockedCells + parseFloat(c.OPT_PERCENT);
                                    });
                                    diffValue = diffValue - sumOfLockedCells;
                                    numberOfCharVals = numberOfCharVals - lockedCells.length;
                                }
                            }
                            charvals.forEach((value) => {
                                let distQty = "";
                                let foundInd = hotData.findIndex(
                                    (f) =>
                                        f.LOCATION_ID === value.LOCATION_ID &&
                                        f.PRODUCT_ID === value.PRODUCT_ID &&
                                        f.CUSTOMER_GROUP ===
                                        value.CUSTOMER_GROUP /* && f.CLASS_NUM === value.CLASS_NUM */ &&
                                        f.CHAR_NUM === value.CHAR_NUM &&
                                        f.CHARVAL_NUM === value.CHARVAL_NUM &&
                                        f.VERSION === value.VERSION &&
                                        f.SCENARIO == value.SCENARIO &&
                                        f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                                );
                                let cellMeta = hot.getCellMeta(foundInd, col);
                                let cellValue = hot.getDataAtCell(foundInd, col);
                                if (cellValue && cellValue.startsWith("🔒")) {
                                    cellValue = parseFloat(cellValue.slice(2));
                                }
                                let lock = cellMeta.readOnly;
                                if (!lock) {
                                    distQty = (diffValue / numberOfCharVals).toFixed(2);
                                } else {
                                    distQty = cellValue;
                                }
                                that.isProgrammaticChange = true;
                                hot.setDataAtCell(foundInd, col, distQty);
                                that.isProgrammaticChange = false;
                            });
                        }
                    }
                }
            },

            handleProrateDistribute: function (selection, hot) {

                const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");
                const sortedKeyFigs = maintainedKeyFigs
                    .filter(fig => fig.KEY_FIG_ID !== that.ManualKeyArr[0].KEY_FIG_ID && fig.KEY_FIG_ID <= 50)
                    .sort((a, b) => b.PRIORITY_ORDER - a.PRIORITY_ORDER);

                const mainData = $.extend(true, [], that.allData);

                if (selection.length === 1) {

                    const obj = selection[0];
                    if (obj.start.row !== obj.end.row || obj.start.col !== obj.end.col) return;

                    const row = obj.start.row;
                    const col = obj.start.col;

                    const hotData = hot.getData()
                        .map((_, rowIndex) => hot.getSourceDataAtRow(hot.toPhysicalRow(rowIndex)))
                        .filter(r => r !== null);

                    const rowData = hotData[row];
                    const cellMeta = hot.getCellMeta(row, col);

                    let rawClickedVal = hot.getDataAtCell(row, col);
                    let clickedIsLocked = rawClickedVal && rawClickedVal.toString().startsWith("🔒");

                    let clickedVal = clickedIsLocked
                        ? parseFloat(rawClickedVal.toString().slice(2))
                        : parseFloat(rawClickedVal);

                    if (isNaN(clickedVal) || clickedVal > 100) return;


                    // -------------------------------
                    // IDENTIFY ALL CELLS IN THE GROUP
                    // -------------------------------

                    const charvals = mainData.filter(f =>
                        f.LOCATION_ID === rowData.LOCATION_ID &&
                        f.PRODUCT_ID === rowData.PRODUCT_ID &&
                        f.CUSTOMER_GROUP === rowData.CUSTOMER_GROUP &&
                        f.CHAR_NUM === rowData.CHAR_NUM &&
                        f.CHARVAL_NUM !== rowData.CHARVAL_NUM &&
                        f.VERSION === rowData.VERSION &&
                        f.SCENARIO === rowData.SCENARIO &&
                        f[that.weekType] === cellMeta.prop &&
                        f.KEY_FIG_ID === sortedKeyFigs[0].KEY_FIG_ID
                    );


                    // ----------------------------
                    // SPLIT INTO LOCKED/UNLOCKED
                    // ----------------------------

                    const lockedCells = [];
                    const unlockedCells = [];

                    // include clicked cell
                    if (clickedIsLocked) {
                        lockedCells.push({ index: row, value: clickedVal });
                    } else {
                        unlockedCells.push({ index: row, value: clickedVal });
                    }

                    // other rows
                    charvals.forEach(c => {

                        const foundInd = hotData.findIndex(f =>
                            f.LOCATION_ID === c.LOCATION_ID &&
                            f.PRODUCT_ID === c.PRODUCT_ID &&
                            f.CUSTOMER_GROUP === c.CUSTOMER_GROUP &&
                            f.CHAR_NUM === c.CHAR_NUM &&
                            f.CHARVAL_NUM === c.CHARVAL_NUM &&
                            f.VERSION === c.VERSION &&
                            f.SCENARIO === c.SCENARIO &&
                            f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC
                        );

                        if (foundInd === -1) return;

                        let valRaw = hot.getDataAtCell(foundInd, col);
                        let isLocked = valRaw && valRaw.toString().startsWith("🔒");

                        let val = isLocked
                            ? parseFloat(valRaw.toString().slice(2))
                            : parseFloat(valRaw);

                        if (isLocked) {
                            lockedCells.push({ index: foundInd, value: isNaN(val) ? 0 : val });
                        } else {
                            unlockedCells.push({ index: foundInd, value: isNaN(val) ? 0 : val });
                        }
                    });


                    // -----------------------------------------
                    // STEP 1: COMPUTE REMAINING AFTER LOCK + CLICKED
                    // -----------------------------------------

                    const sumLocked = lockedCells.reduce((s, c) => s + c.value, 0);
                    const remaining = 100 - (sumLocked + (clickedIsLocked ? 0 : clickedVal));

                    if (remaining < 0) {
                        sap.m.MessageToast.show("Total exceeds 100%. Cannot prorate.");
                        return;
                    }


                    // -----------------------------------------
                    // STEP 2: BUILD PROPORTIONAL BASE
                    // Only unlocked rows EXCEPT the clicked row
                    // -----------------------------------------

                    const proportionalBase = [];

                    unlockedCells.forEach(c => {

                        if (c.index === row) return; // skip clicked

                        const rowObj = hotData[c.index];

                        const original = mainData.find(f =>
                            f.LOCATION_ID === rowObj.LOCATION_ID &&
                            f.PRODUCT_ID === rowObj.PRODUCT_ID &&
                            f.CUSTOMER_GROUP === rowObj.CUSTOMER_GROUP &&
                            f.CHAR_NUM === rowObj.CHAR_NUM &&
                            f.CHARVAL_NUM === rowObj.CHARVAL_NUM &&
                            f.VERSION === rowObj.VERSION &&
                            f.SCENARIO === rowObj.SCENARIO &&
                            f[that.weekType] === cellMeta.prop &&
                            f.KEY_FIG_ID === sortedKeyFigs[0].KEY_FIG_ID
                        );

                        const baseVal = parseFloat(original?.OPT_PERCENT);

                        proportionalBase.push({
                            index: c.index,
                            base: isNaN(baseVal) ? 0 : baseVal
                        });
                    });

                    const sumPool = proportionalBase.reduce((s, o) => s + o.base, 0);


                    // -----------------------------------------
                    // STEP 3: SET CLICKED CELL TO NEW VALUE
                    // -----------------------------------------

                    that.isProgrammaticChange = true;
                    hot.setDataAtCell(
                        row,
                        col,
                        clickedIsLocked
                            ? `🔒${clickedVal.toFixed(2)}`
                            : clickedVal.toFixed(2)
                    );
                    that.isProgrammaticChange = false;


                    // -----------------------------------------
                    // STEP 4: PRORATE TO OTHER UNLOCKED CELLS
                    // -----------------------------------------

                    proportionalBase.forEach(o => {
                        const newVal = (sumPool === 0)
                            ? remaining / proportionalBase.length
                            : (o.base / sumPool) * remaining;

                        that.isProgrammaticChange = true;
                        hot.setDataAtCell(o.index, col, newVal.toFixed(2));
                        that.isProgrammaticChange = false;
                    });


                    // -----------------------------------------
                    // STEP 5: ENSURE TOTAL = EXACTLY 100
                    // -----------------------------------------

                    let totalNow = 0;

                    lockedCells.forEach(c => totalNow += c.value);
                    totalNow += (clickedIsLocked ? 0 : clickedVal);

                    proportionalBase.forEach(o => {
                        const v = parseFloat(hot.getDataAtCell(o.index, col));
                        totalNow += isNaN(v) ? 0 : v;
                    });

                    const diffFix = (100 - totalNow).toFixed(2);

                    if (proportionalBase.length > 0) {
                        const lastIdx = proportionalBase[proportionalBase.length - 1].index;
                        const lastVal = parseFloat(hot.getDataAtCell(lastIdx, col));
                        const corrected = (lastVal + parseFloat(diffFix)).toFixed(2);

                        that.isProgrammaticChange = true;
                        hot.setDataAtCell(lastIdx, col, corrected);
                        that.isProgrammaticChange = false;
                    }


                    // -----------------------------------------
                    // STEP 6: RESTORE LOCKED ICONS
                    // -----------------------------------------

                    lockedCells.forEach(c => {
                        const lockedDisplay = `🔒${c.value.toFixed(2)}`;
                        that.isProgrammaticChange = true;
                        hot.setDataAtCell(c.index, col, lockedDisplay);
                        that.isProgrammaticChange = false;
                    });

                }
            },

            beforeExcelCellChange: function (changes, source) {
                const totalDates = that.oGModel.getProperty("/totalWeekTypes");
                const checkData = $.extend(true, [], that.allData);
                const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");
                const sortedKeyFigs = maintainedKeyFigs
                    .filter(
                        (fig) =>
                            fig.KEY_FIG_ID !== that.ManualKeyArr[0].KEY_FIG_ID &&
                            fig.KEY_FIG_ID <= 50
                    )
                    .sort((a, b) => b.PRIORITY_ORDER - a.PRIORITY_ORDER);
                if (
                    source === "edit" ||
                    source == "CopyPaste.paste" ||
                    source == "Autofill.fill"
                ) {
                    for (let i = 0; i < changes.length; i++) {
                        var colHeader = changes[i][1];
                        var rowIndex = changes[i][0];
                        var colIndex = that.hot
                            .getCellMetaAtRow(rowIndex)
                            .findIndex((f) => f.prop == colHeader);
                        var oldValue = changes[i][2];
                        var newValue = changes[i][3];
                        let startWeeks = totalDates.filter(
                            (f) => f[that.weekType] == colHeader
                        );
                        var lock = true;
                        if (newValue && newValue.toString().startsWith("🔒")) {
                            lock = true;
                            newValue = newValue.split("🔒")[1];
                        } else {
                            lock = false;
                        }
                        var commentMeta = that.hot.getCellMeta(rowIndex, colIndex);
                        var comment = commentMeta?.comment?.value || "";
                        if (oldValue !== newValue || lock == true) {
                            newValue = isNaN(parseFloat(newValue))
                                ? ""
                                : parseFloat(newValue);
                            for (let index = 0; index < startWeeks.length; index++) {
                                const obj = {};
                                const week = startWeeks[index];
                                var rowData = that.hot.getSourceDataAtRow(rowIndex);
                                var {
                                    LOCATION_ID: location,
                                    PRODUCT_ID: product,
                                    CUSTOMER_GROUP: customerGrp,
                                    CHAR_NUM: char,
                                    CHAR_NAME: charName,
                                    CHARVAL_NUM: charVal,
                                    VERSION: version,
                                    SCENARIO: scenario,
                                    MODEL_VERSION: modelVersion,
                                } = rowData;
                                obj.LOCATION_ID = location;
                                obj.PRODUCT_ID = product;
                                obj.CUSTOMER_GROUP = customerGrp;
                                obj.CHAR_NUM = char;
                                obj.CHAR_NAME = charName;
                                obj.CHARVAL_NUM = charVal;
                                obj.VERSION = version;
                                obj.MODEL_VERSION = modelVersion;
                                obj.SCENARIO = scenario;
                                obj.WEEK_STARTDATE = that.convertDate(week.WEEK_STARTDATE, "-");
                                obj.WEEK_ENDDATE = that.convertDate(week.WEEK_ENDDATE, "-");
                                obj.LOCK = lock;
                                obj.OLD_VALUE = oldValue;
                                obj.NEW_VALUE = newValue;
                                obj.COMMENTS = comment;
                                obj.OPT_PERCENT = newValue;
                                obj.CFLAG = that.isProgrammaticChange;
                                const foundObj = checkData.find(
                                    (f) =>
                                        f.LOCATION_ID == location &&
                                        f.PRODUCT_ID == product &&
                                        f.CUSTOMER_GROUP == customerGrp &&
                                        f.CHAR_NUM == char &&
                                        f.CHARVAL_NUM == charVal &&
                                        f[that.weekType] == colHeader &&
                                        f.VERSION == version &&
                                        f.SCENARIO == scenario &&
                                        f.MODEL_VERSION == modelVersion &&
                                        f.TYPE == sortedKeyFigs[0].KEY_FIG_ID
                                );
                                if (foundObj) obj.OLD_VALUE = foundObj.OPT_PERCENT;
                                if (that.cellChanges.length > 0) {
                                    var foundObject = that.compareData(
                                        obj,
                                        that.cellChanges,
                                        "find",
                                        [
                                            "LOCATION_ID",
                                            "PRODUCT_ID",
                                            "CUSTOMER_GROUP",
                                            "CHAR_NUM",
                                            "CHARVAL_NUM",
                                            "VERSION",
                                            "SCENARIO",
                                            "MODEL_VERSION",
                                            "WEEK_STARTDATE",
                                        ]
                                    );
                                    if (foundObject) {
                                        if (newValue || newValue === 0) {
                                            if (newValue && typeof newValue !== "string") {
                                                Object.assign(foundObject, obj);
                                            } else if (newValue === 0) {
                                                Object.assign(foundObject, obj);
                                            } else if (newValue == "") {
                                                that.deleteChanges.push(obj);
                                            } else {
                                                MessageToast.show("Enter a Valid Number");
                                            }
                                        } else {
                                            const index = that.cellChanges.indexOf(foundObject);
                                            if (index !== -1) {
                                                that.cellChanges.splice(index, 1);
                                            }
                                            if (newValue == "") {
                                                that.deleteChanges.push(obj);
                                            }
                                        }
                                    } else {
                                        if (newValue && typeof newValue !== "string") {
                                            that.cellChanges.push(obj);
                                        } else if (newValue === 0) {
                                            that.cellChanges.push(obj);
                                        } else if (newValue == "") {
                                            that.deleteChanges.push(obj);
                                        } else {
                                            MessageToast.show("Enter a Valid Number");
                                        }
                                    }
                                } else {
                                    if (newValue && typeof newValue !== "string") {
                                        that.cellChanges.push(obj);
                                    } else if (newValue === 0) {
                                        that.cellChanges.push(obj);
                                    } else if (newValue == "") {
                                        that.deleteChanges.push(obj);
                                    } else {
                                        MessageToast.show("Enter a Valid Number");
                                        that.hot.render();
                                    }
                                }
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

            // onTreeItemSelect: function () {
            //     that.oGModel.setProperty(
            //         "/hasCustomerGroup",
            //         that.staticColumns.includes("Customer Group")
            //     );
            //     that.oGModel.setProperty("/subDataChanges", []);
            //     that.oGModel.refresh(true);
            //     that.readOnlySub = true;
            //     that.allSubData = [];
            //     that.isProgrammaticChange = false;
            //     var oTree = this.getView().byId("idTree");
            //     var aFilterArr = $.extend(true, [], that.allData);
            //     var locArr = [],
            //         proArr = [],
            //         chrArr = [],
            //         chrValArr = [];
            //     that.byId("idDynamicPage2").setBusy(true);

            //     // Validate selected context paths
            //     var sPath = oTree.getSelectedContextPaths()[0];

            //     const item = oTree.getSelectedItem();
            //     that.selPath = sPath;
            //     if (item) {
            //         that.selectedTreeText = item.getHighlightText();
            //         that.isTreeNodeExpanded = item.getExpanded();
            //     }

            //     if (sPath) {
            //         var segments = sPath.split("/");
            //         var apath = "";

            //         // Build filter arrays based on segments
            //         if (segments.includes("items")) {
            //             apath = `/items/${segments[2]}`;
            //             locArr.push(oTree.getModel("treeModel").getProperty(apath).name);
            //         }
            //         if (segments.includes("products")) {
            //             apath += `/products/${segments[4]}`;
            //             proArr.push(oTree.getModel("treeModel").getProperty(apath).name);
            //         }
            //         if (segments.includes("chars")) {
            //             apath += `/chars/${segments[6]}`;
            //             chrArr.push(oTree.getModel("treeModel").getProperty(apath).name);
            //         }
            //         if (segments.includes("charvals")) {
            //             apath += `/charvals/${segments[8]}`;
            //             chrValArr.push(oTree.getModel("treeModel").getProperty(apath).name);
            //         }
            //     }

            //     // Common filter function
            //     function applyFilter(key, values) {
            //         if (values.length > 0) {
            //             aFilterArr = aFilterArr.filter((el) => values.includes(el[key]));
            //         }
            //     }

            //     // Apply filters
            //     applyFilter("LOCATION_ID", locArr);
            //     applyFilter("PRODUCT_ID", proArr);
            //     applyFilter("CHAR_NUM", chrArr);
            //     applyFilter("CHARVAL_NUM", chrValArr);
            //     that.isCharItemPressed = chrArr.length > 0 || chrValArr.length > 0;
            //     if (aFilterArr && aFilterArr.length > 0) {
            //         that.byId("idDynamicPage").setHeaderExpanded(false);
            //         // let processedData;
            //         // if (that.oGModel.getProperty("/hasCustomerGroup")) {
            //         //     // if (!that.isCharItemPressed) {
            //         //         for (let index = 0; index < that.allData.length; index++) {
            //         //             const item = that.allData[index];
            //         //             if (!item.CHAR_NUM) {
            //         //                 item.LOCK = true;
            //         //                 that.allSubData.push(item);
            //         //             }
            //         //         }
            //         //         let modifiedData = that.getSubExcelData(that.allSubData);
            //         //         that.generateSubExcel(modifiedData, that.dates);
            //         //     // }
            //         //     processedData = that.getOptPerData(aFilterArr);
            //         // }

            //         let processedData;

            //         if (that.oGModel.getProperty("/hasCustomerGroup")) {

            //             that.allSubData = []; 

            //             for (var oIndex = 0; oIndex < that.allData.length; oIndex++) {
            //                 const item = that.allData[oIndex];

            //                 if (!item.CHAR_NUM) {  
            //                     item.LOCK = true;
            //                     that.allSubData.push(item);
            //                 }
            //             }

            //             let modifiedData = that.getSubExcelData(that.allSubData);
            //             that.generateSubExcel(modifiedData, that.dates);

            //             processedData = that.getOptPerData(aFilterArr);
            //         }


            //         else {
            //             let mData = that.avgQuantities(aFilterArr, that.staticColumns);
            //             processedData = that.getOptPerData(mData);
            //         }
            //         that.generateExcel(processedData, that.dates);
            //     } else {
            //         sap.m.MessageToast.show("No Option Percentages");
            //         this._resetUI();
            //     }
            // },


            onTreeItemSelect: function () {
                const that = this;

                that.oGModel.setProperty(
                    "/hasCustomerGroup",
                    that.staticColumns.includes("Customer Group")
                );
                that.oGModel.setProperty("/subDataChanges", []);
                that.oGModel.refresh(true);

                that.readOnlySub = true;
                that.isProgrammaticChange = false;
                that.byId("idDynamicPage2").setBusy(true);

                const oTree = this.getView().byId("idTree");

                /* =====================================================
                   🚨 CRITICAL FIX: WAIT UNTIL allData IS READY
                   ===================================================== */
                if (!Array.isArray(that.allData) || that.allData.length === 0) {
                    console.warn("allData not ready yet, retrying...");

                    setTimeout(() => {
                        that.onTreeItemSelect();
                    }, 200);

                    return;
                }

                let aFilterArr = $.extend(true, [], that.allData);

                let locArr = [],
                    proArr = [],
                    chrArr = [],
                    chrValArr = [];

                const sPath = oTree.getSelectedContextPaths()[0];
                const oItem = oTree.getSelectedItem();

                if (oItem) {
                    that.selectedTreeText = oItem.getHighlightText();
                    that.isTreeNodeExpanded = oItem.getExpanded();
                }

                if (sPath) {
                    const segments = sPath.split("/");
                    let apath = "";

                    if (segments.includes("items")) {
                        apath = `/items/${segments[2]}`;
                        locArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("products")) {
                        apath += `/products/${segments[4]}`;
                        proArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("chars")) {
                        apath += `/chars/${segments[6]}`;
                        chrArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                    if (segments.includes("charvals")) {
                        apath += `/charvals/${segments[8]}`;
                        chrValArr.push(oTree.getModel("treeModel").getProperty(apath).name);
                    }
                }

                function applyFilter(key, values) {
                    if (values.length > 0) {
                        aFilterArr = aFilterArr.filter(el => values.includes(el[key]));
                    }
                }

                applyFilter("LOCATION_ID", locArr);
                applyFilter("PRODUCT_ID", proArr);
                applyFilter("CHAR_NUM", chrArr);
                applyFilter("CHARVAL_NUM", chrValArr);

                that.isCharItemPressed = chrArr.length > 0 || chrValArr.length > 0;

                if (!aFilterArr || aFilterArr.length === 0) {
                    sap.m.MessageToast.show("No Option Percentages");
                    that._resetUI();
                    that.byId("idDynamicPage2").setBusy(false);
                    return;
                }

                that.byId("idDynamicPage").setHeaderExpanded(false);

                let processedData;

                /* =========================
                   CUSTOMER GROUP LOGIC
                   ========================= */
                if (that.oGModel.getProperty("/hasCustomerGroup")) {

                    that.allSubData = [];

                    const clonedAllData = that.allData.map(item => ({
                        ...item,
                        LOCK: false
                    }));

                    for (let i = 0; i < clonedAllData.length; i++) {
                        const item = clonedAllData[i];

                        const isCharEmpty =
                            item.CHAR_NUM == null ||
                            String(item.CHAR_NUM).trim() === "" ||
                            (typeof item.CHAR_NUM === "string" && /^0+$/.test(item.CHAR_NUM));

                        if (isCharEmpty) {
                            item.LOCK = true;
                            that.allSubData.push(item);
                        }
                    }

                    const modifiedData = that.getSubExcelData(that.allSubData);
                    that.generateSubExcel(modifiedData, that.dates);

                    processedData = that.getOptPerData(aFilterArr);

                } else {
                    const mData = that.avgQuantities(aFilterArr, that.staticColumns);
                    processedData = that.getOptPerData(mData);
                }

                that.generateExcel(processedData, that.dates);
                that.byId("idDynamicPage2").setBusy(false);
            },


            // _processCustomerGroupAfterData: function (aFilterArr) {

            //     if (!this.oGModel.getProperty("/hasCustomerGroup")) {
            //         return;
            //     }

            //     if (!Array.isArray(this.allData) || this.allData.length === 0) {
            //         return;
            //     }

            //     this.allSubData = [];

            //     const clonedAllData = this.allData.map(item => ({
            //         ...item,
            //         LOCK: false
            //     }));

            //     for (let i = 0; i < clonedAllData.length; i++) {
            //         const item = clonedAllData[i];

            //         const isCharEmpty =
            //             item.CHAR_NUM == null ||
            //             String(item.CHAR_NUM).trim() === "" ||
            //             (typeof item.CHAR_NUM === "string" && /^0+$/.test(item.CHAR_NUM));

            //         if (isCharEmpty) {
            //             item.LOCK = true;
            //             this.allSubData.push(item);
            //         }
            //     }

            //     const modifiedData = this.getSubExcelData(this.allSubData);
            //     this.generateSubExcel(modifiedData, this.dates);
            // },


            _resetUI: function () {
                that.oTree.setBusy(false);
                that.byId("idDynamicPage2").setBusy(false);
                that.byId("idDynamicPage2").setShowFooter(false);
                that.oTree.setModel(new JSONModel([]), "treeModel");

                var existingDiv = document.querySelector('[id*="mainDiv"]');
                if (existingDiv && existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }
                var existingDiv = document.querySelector('[id*="subDiv"]');
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

            // checkTotalQty: function () {
            //     const totalDates = that.oGModel.getProperty("/totalWeekTypes");
            //     const hotData = that.hot.getSourceData();
            //     const manualKey = that.ManualKeyArr[0];
            //     const oData = $.extend(true, [], that.allData);
            //     // Getting data where changes made in handsontable
            //     const changesArr = $.extend(true, [], that.cellChanges);
            //     const errorDates = [];
            //     that.savedData = [];
            //     //Removing duplicates with customer group, characteristic and weekdate so that we get unique data with respect to characteristic and weekdate
            //     const uChangesArr = that.removeDuplicates(changesArr, [
            //         "LOCATION_ID",
            //         "PRODUCT_ID",
            //         "CUSTOMER_GROUP",
            //         "CHAR_NUM",
            //         "WEEK_STARTDATE",
            //     ]);
            //     //Looping changed characteristic data
            //     uChangesArr.forEach((c) => {
            //         var sum = 0;
            //         //Getting characteristic value data for changed characteristic and specific customer group
            //         var charValData = that.compareData(c, hotData, "filter", [
            //             "LOCATION_ID",
            //             "PRODUCT_ID",
            //             "CUSTOMER_GROUP",
            // /* "CLASS_NUM", */ "CHAR_NUM",
            //             "VERSION",
            //             "SCENARIO",
            //         ]);

            //         //Getting Manul and option percentage data from characteristic value data
            //         var manualOptData = charValData.filter(
            //             (item) =>
            //                 item.KEY_FIG_DESC == "Option Percentage %" ||
            //                 item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
            //         );
            //         for (let index = 0; index < manualOptData.length; index++) {
            //             const element = manualOptData[index];
            //             let weekObj = totalDates.find(
            //                 (f) => that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
            //             );
            //             let weekDesc = weekObj[that.weekType];
            //             //Looping manul data to calculate total option percentages
            //             if (element.KEY_FIG_DESC == manualKey.KEY_FIG_DESC) {
            //                 if (element[weekDesc] && element[weekDesc] != NaN) {
            //                     if (element[weekDesc].toString().startsWith("🔒")) {
            //                         let value = element[weekDesc].split("🔒")[1];
            //                         sum += parseFloat(value);
            //                     } else {
            //                         sum += parseFloat(element[weekDesc]);
            //                     }
            //                 }
            //             }
            //         }

            //         if (Math.round(sum) == 100 || Math.round(sum) == 0) {
            //             // If 100% getting manual data where changes are made
            //             const mData = manualOptData.filter(
            //                 (item) => item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
            //             );

            //             for (let i = 0; i < mData.length; i++) {
            //                 const m = mData[i];
            //                 let weekObj = totalDates.find(
            //                     (f) => that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
            //                 );
            //                 if (!weekObj) continue;

            //                 let weekDesc = weekObj[that.weekType];
            //                 const optValue = m[weekDesc];

            //                 // ✅ Skip rows where OPT_PERCENT is empty or null
            //                 if (optValue === null || optValue === "" || isNaN(optValue)) {
            //                     continue;
            //                 }

            //                 const obj = {};
            //                 obj.LOCATION_ID = m.LOCATION_ID;
            //                 obj.PRODUCT_ID = m.PRODUCT_ID;
            //                 obj.CUSTOMER_GROUP = m.CUSTOMER_GROUP;
            //                 obj.CLASS_NUM = "NA";
            //                 obj.CHAR_NUM = m.CHAR_NUM;
            //                 obj.CHARVAL_NUM = m.CHARVAL_NUM;
            //                 obj.VERSION = m.VERSION;
            //                 obj.SCENARIO = m.SCENARIO;
            //                 obj.MODEL_VERSION = m.MODEL_VERSION;
            //                 obj.TYPE = m.KEY_FIG_ID;
            //                 obj.COMMENTS = "";
            //                 obj.OLD_VALUE = "";
            //                 obj.DATE_TIME = new Date();
            //                 obj.USER = that.sUser;
            //                 obj[that.weekType] = weekDesc;

            //                 // ✅ Find related demand
            //                 const foundDemandObj = that.subAllData.find(
            //                     (f) =>
            //                         f.LOCATION_ID == obj.LOCATION_ID &&
            //                         f.PRODUCT_ID == obj.PRODUCT_ID &&
            //                         f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
            //                         f.VERSION == obj.VERSION &&
            //                         f.SCENARIO == obj.SCENARIO &&
            //                         that.convertDate(f.WEEK_STARTDATE, "-") ===
            //                         that.convertDate(weekObj.WEEK_STARTDATE, "-")
            //                 );

            //                 const totalCharOptQty = foundDemandObj?.OPT_QTY ?? 0;

            //                 // ✅ Handle 🔒 case
            //                 if (optValue.toString().startsWith("🔒")) {
            //                     obj.OPT_PERCENT = parseFloat(optValue.split("🔒")[1]);
            //                     obj.LOCK = true;
            //                 } else {
            //                     obj.OPT_PERCENT = parseFloat(optValue);
            //                     obj.LOCK = false;
            //                 }

            //                 // ✅ Only push if OPT_PERCENT is valid
            //                 if (!isNaN(obj.OPT_PERCENT)) {
            //                     obj.OPT_QTY = parseFloat((obj.OPT_PERCENT * totalCharOptQty) / 100);
            //                     obj.WEEK_STARTDATE = that.convertDate(weekObj.WEEK_STARTDATE, "-");
            //                     obj.WEEK_ENDDATE = that.convertDate(weekObj.WEEK_ENDDATE, "-");

            //                     const isComment = that.lockComments.find(
            //                         (lock) =>
            //                             obj.LOCATION_ID === lock.LOCATION_ID &&
            //                             obj.PRODUCT_ID === lock.PRODUCT_ID &&
            //                             obj.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
            //                             obj.CHAR_NUM === lock.CHAR_NUM &&
            //                             obj.CHARVAL_NUM === lock.CHARVAL_NUM &&
            //                             obj.VERSION === lock.VERSION &&
            //                             obj.SCENARIO === lock.SCENARIO &&
            //                             obj.MODEL_VERSION === lock.MODEL_VERSION &&
            //                             obj.TYPE === lock.TYPE &&
            //                             obj.WEEK_STARTDATE ===
            //                             lock.WEEK_DATE.toLocaleDateString("en-CA")
            //                     );

            //                     if (isComment) {
            //                         obj.COMMENTS = isComment.COMMENTS;
            //                     }

            //                     // ✅ Push only valid entries
            //                     that.savedData.push(obj);
            //                 }
            //             }
            //         } else {
            //             errorDates.push(c[that.weekType]);
            //         }

            //         //     if (Math.round(sum) == 100 || Math.round(sum) == 0) {
            //         //         //If 100% getting manul data where changes are made
            //         //         const mData = manualOptData.filter(
            //         //             (item) => item.KEY_FIG_DESC == manualKey.KEY_FIG_DESC
            //         //         );
            //         //         for (let i = 0; i < mData.length; i++) {
            //         //             const m = mData[i];
            //         //             let weekObj = totalDates.find(
            //         //                 (f) =>
            //         //                     that.convertDate(f.WEEK_STARTDATE, "-") == c.WEEK_STARTDATE
            //         //             );
            //         //             let weekDesc = weekObj[that.weekType];
            //         //             const obj = {};
            //         //             obj.LOCATION_ID = m.LOCATION_ID;
            //         //             obj.PRODUCT_ID = m.PRODUCT_ID;
            //         //             obj.CUSTOMER_GROUP = m.CUSTOMER_GROUP;
            //         //             obj.CLASS_NUM = "NA";
            //         //             obj.CHAR_NUM = m.CHAR_NUM;
            //         //             obj.CHARVAL_NUM = m.CHARVAL_NUM;
            //         //             obj.VERSION = m.VERSION;
            //         //             obj.SCENARIO = m.SCENARIO;
            //         //             obj.MODEL_VERSION = m.MODEL_VERSION;
            //         //             obj.TYPE = m.KEY_FIG_ID;
            //         //             obj.OPT_PERCENT = m[weekDesc];
            //         //             obj.COMMENTS = "";
            //         //             obj.OLD_VALUE = "";
            //         //             obj.DATE_TIME = new Date();
            //         //             obj.USER = that.sUser;
            //         //             obj[that.weekType] = weekDesc;
            //         //             var foundDemandObj = that.subAllData.find(
            //         //                 (f) =>
            //         //                     f.LOCATION_ID == obj.LOCATION_ID &&
            //         //                     f.PRODUCT_ID == obj.PRODUCT_ID &&
            //         //                     f.CUSTOMER_GROUP == obj.CUSTOMER_GROUP &&
            //         //                     f.VERSION == obj.VERSION &&
            //         //                     f.SCENARIO == obj.SCENARIO &&
            //         //                     that.convertDate(weekObj.WEEK_STARTDATE, "-") ==
            //         //                     that.convertDate(f.WEEK_STARTDATE, "-")
            //         //             );
            //         //             //Getting Total Characteristic value data for changed date irrespective of key figure
            //         //             var oldValue = that.compareData(m, that.cellChanges, "find", [
            //         //                 "LOCATION_ID",
            //         //                 "PRODUCT_ID",
            //         //                 "CUSTOMER_GROUP",
            //         // /* "CLASS_NUM", */ "CHAR_NUM",
            //         //                 "CHARVAL_NUM",
            //         //                 "VERSION",
            //         //                 "SCENARIO",
            //         //                 "MODEL_VERSION",
            //         //             ]);
            //         //             if (oldValue) {
            //         //                 obj.OLD_VALUE = oldValue.OLD_VALUE;
            //         //             } else {
            //         //                 obj.OLD_VALUE = "";
            //         //             }
            //         //             var totalCharOptQty = foundDemandObj.OPT_QTY;
            //         //             if (obj.OPT_PERCENT.startsWith("🔒")) {
            //         //                 obj.OPT_PERCENT = obj.OPT_PERCENT.split("🔒")[1];
            //         //                 obj.LOCK = true;
            //         //             } else {
            //         //                 obj.LOCK = false;
            //         //             }
            //         //             obj.OPT_PERCENT = parseFloat(obj.OPT_PERCENT);
            //         //             obj.OPT_QTY = parseFloat(
            //         //                 (obj.OPT_PERCENT * totalCharOptQty) / 100
            //         //             );
            //         //             obj.WEEK_STARTDATE = that.convertDate(
            //         //                 weekObj.WEEK_STARTDATE,
            //         //                 "-"
            //         //             );
            //         //             obj.WEEK_ENDDATE = that.convertDate(weekObj.WEEK_ENDDATE, "-");
            //         //             const isComment = that.lockComments.find(
            //         //                 (lock) =>
            //         //                     obj.LOCATION_ID === lock.LOCATION_ID &&
            //         //                     obj.PRODUCT_ID === lock.PRODUCT_ID &&
            //         //                     obj.CUSTOMER_GROUP === lock.CUSTOMER_GROUP &&
            //         //                     obj.CHAR_NUM === lock.CHAR_NUM &&
            //         //                     obj.CHARVAL_NUM === lock.CHARVAL_NUM &&
            //         //                     obj.VERSION === lock.VERSION &&
            //         //                     obj.SCENARIO === lock.SCENARIO &&
            //         //                     obj.MODEL_VERSION === lock.MODEL_VERSION &&
            //         //                     obj.TYPE === lock.TYPE &&
            //         //                     obj.WEEK_STARTDATE ===
            //         //                     lock.WEEK_DATE.toLocaleDateString("en-CA")
            //         //             );

            //         //             if (isComment) {
            //         //                 obj.COMMENTS = isComment.COMMENTS;
            //         //             }

            //         //             that.savedData.push(obj);
            //         //         }
            //         //     } else {
            //         //         // errorDates.push(that.getWeekNumber(c[that.weekType]));
            //         //         errorDates.push(c[that.weekType]);
            //         //     }
            //     });
            //     return errorDates;
            // },


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
                            obj.USER = that.sUser;
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
                                        that.refreshData();
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
                                                .byId("idNorKeyFigure")
                                                .getP13nData()
                                                .filter((fig) => fig.visible)
                                            // ...that.oCore
                                            //     .byId("idCalKeyFigure")
                                            //     .getP13nData()
                                            //     .filter((fig) => fig.visible),
                                        ];
                                        that.oGModel.setProperty("/oMnulSv_Kfg", oNormal_Kfg);

                                        var oCal_Kfg = [

                                            ...that.oCore
                                                .byId("idCalKeyFigure")
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
                                f.KEY_FIG_ID === rowData.KEY_FIG_ID &&
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
                        await this.handleSaveDataChanges(sData);
                        // that.refreshData();
                    }
                } catch (err) {
                    MessageToast.show("Error saving comments");
                    console.error(err);
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
                    that.byId("idDynamicPage2").setBusy(true);
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
                    that.byId("idDynamicPage2").setBusy(false);
                    console.error(err);
                    throw err;
                } finally {
                    that.byId("idDynamicPage2").setBusy(false);
                }
            },

            handleDeleteObjects: async function (changes) {
                try {
                    that.oTree.setBusy(true);
                    that.byId("idDynamicPage2").setBusy(true);
                    let deleteCheck = that.deleteCheckData(changes);
                    await new Promise((resolve, reject) => {
                        that.oModel.callFunction("/deleteOptionPerData", {
                            urlParameters: { dData: JSON.stringify(changes) },
                            success: resolve,
                            error: (err) => reject(err),
                        });
                    });
                } catch (err) {
                    that.oTree.setBusy(false);
                    that.byId("idDynamicPage2").setBusy(false);
                    console.error(err);
                    throw err;
                }
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
                    that.byId("idDynamicPage2").setBusy(true);
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
                    that.byId("idDynamicPage2").setBusy(false);
                    throw err;
                }
            },

            handlePlanOptionPercentages: async function (sData) {
                try {
                    let unqData = that.removeDuplicates(sData, ["LOCATION_ID"]);
                    const oDateRange = this.byId("idWeekDate");
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
                return new Promise((resolve, reject) => {
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
                        success: resolve,
                        error: reject,
                    });
                });
            },

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
                var fBtn = that.getView().byId("idFullScreen");
                if (page.getSize() == "25%") {
                    page.setSize("0%");
                    fBtn.setIcon("sap-icon://exit-full-screen");
                } else {
                    page.setSize("25%");
                    fBtn.setIcon("sap-icon://full-screen");
                }
            },

            onRefreshExcel: function () {
                if (that.cellChanges.length > 0) {
                    that.cellChanges.forEach((item) => {
                        let ind = that.allData.findIndex(
                            (f) =>
                                f.LOCATION_ID == item.LOCATION_ID &&
                                f.PRODUCT_ID == item.PRODUCT_ID &&
                                f.CUSTOMER_GROUP == item.CUSTOMER_GROUP &&
                                // f.CLASS_NUM == item.CLASS_NUM &&
                                f.CHAR_NUM == item.CHAR_NUM &&
                                f.CHARVAL_NUM == item.CHARVAL_NUM &&
                                f.MODEL_VERSION == item.MODEL_VERSION &&
                                f.VERSION == item.VERSION &&
                                f.SCENARIO == item.SCENARIO &&
                                f[that.weekType] == item[that.weekType] &&
                                f.KEY_FIG_ID == that.ManualKeyArr[0].KEY_FIG_ID
                        );
                        if (ind != -1) {
                            that.allData.splice(ind, 1);
                        }
                    });
                    that.cellChanges = [];
                    that.commentChanges = [];
                }
                that.saveTreeState();
                that.onGo();
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



            // convertDate: function (inputFormat, joinBy) {
            //     function pad(s) {
            //         return s < 10 ? "0" + s : s;
            //     }

            //     var d = new Date(inputFormat);

            //     // Get local time zone offset in minutes
            //     var timezoneOffset = d.getTimezoneOffset();

            //     // Adjust for the timezone offset
            //     d.setMinutes(d.getMinutes() - timezoneOffset);

            //     // Convert to UTC
            //     var utcYear = d.getUTCFullYear();
            //     var utcMonth = d.getUTCMonth() + 1; // Months are zero-based, so add 1
            //     var utcDate = d.getUTCDate();

            //     return [utcYear, pad(utcMonth), pad(utcDate)].join(joinBy);
            // },

            convertDate: function (inputFormat, joinBy) {
                if (!inputFormat) {
                    return "";
                }
                let sTimezone = that.oGModel.getProperty("/timeZone")[0].PARAMETER_VALUE;

                // 👉 Normalize "(UTC+05:30)" → "UTC+05:30"
                sTimezone = sTimezone.replace(/[()]/g, "").trim();

                function pad(n) {
                    return n < 10 ? "0" + n : n;
                }

                let date = new Date(inputFormat);

                if (sTimezone !== "UTC") {
                    const match = sTimezone.match(/UTC([+-])(\d{2}):(\d{2})/);

                    if (match) {
                        const sign = match[1] === "+" ? 1 : -1;
                        const hours = parseInt(match[2], 10);
                        const minutes = parseInt(match[3], 10);

                        const offsetMinutes = sign * (hours * 60 + minutes);

                        // Convert to UTC baseline, then apply offset
                        date = new Date(date.getTime() + offsetMinutes * 60 * 1000);
                    }
                }

                return [
                    date.getUTCFullYear(),
                    pad(date.getUTCMonth() + 1),
                    pad(date.getUTCDate())
                ].join(joinBy);
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
                let vUser;
                if (sap.ushell.Container) {
                    let email = sap.ushell.Container.getService("UserInfo")
                        .getUser()
                        .getEmail();
                    vUser = email ? email : "";
                }
                 if(!vUser){
                vUser='null';
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
                        variantManagement: "idMatList123",
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
                    that.oModel.read("/getWeeks", {
                        // that.aModel.read("/getFinalOptionPercentages", {
                        //     urlParameters: {
                        //         $apply:
                        //             "groupby((CALENDAR_WEEK,TELESCOPIC_WEEK,PERIODSTART,PERIODEND,WEEK_STARTDATE,WEEK_ENDDATE))",
                        //         $orderby:
                        //             "PERIODSTART asc,WEEK_STARTDATE asc,CALENDAR_WEEK asc,TELESCOPIC_WEEK asc",
                        //     },
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
                            that.loadVariants();
                            resolve(data); // ✅ resolve promise
                        },
                        error: function (err) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show(err.message);
                            that.loadVariants();
                            reject(err); // ❌ reject promise
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
                // return 'deepakbondili@sbpdigital.com';
            },

            /**
             * Load variants from backend
             */
            loadVariants: function () {
                BusyIndicator.show();
                const currentUser = this.getCurrentUser().toLowerCase();
                // const currentUser = "Test";
                this.oGModel.setProperty("/UserId", currentUser);

                const filters = this._createVariantFilters(currentUser);

                this.oModel.read(this.config.endpoints.getVariantHeader, {
                    filters: filters,
                    success: this._onVariantHeaderSuccess.bind(this),
                    error: this._onVariantError.bind(this),
                });
            },

            /**
             * Create filters for variant loading
             */
            _createVariantFilters: function (currentUser) {
                const appFilter1 = new Filter(
                    "APPLICATION_NAME",
                    FilterOperator.EQ,
                    this.appName
                );
                const userFilter = new Filter("USER", FilterOperator.EQ, currentUser);
                const appFilter2 = new Filter(
                    "APPLICATION_NAME",
                    FilterOperator.EQ,
                    this.appName
                );
                const scopeFilter = new Filter("SCOPE", FilterOperator.EQ, "Public");
                var oFilterAppName3 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, 'DefaultMulti');
                var oFilterUser1 = new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, currentUser);
                var oFilterCondition3 = new sap.ui.model.Filter({
                    filters: [oFilterAppName3, oFilterUser1],
                    and: true // Combine with AND
                });
                const condition1 = new Filter({
                    filters: [appFilter1, userFilter],
                    and: true,
                });
                const condition2 = new Filter({
                    filters: [appFilter2, scopeFilter],
                    and: true,
                });

                return [new Filter({ filters: [condition1, condition2, oFilterCondition3], and: false })];
            },

            /**
             * Handle variant header success
             */
            _onVariantHeaderSuccess: function (oData) {
                that.oGModel.setProperty("/headerDetails", oData.results);
                if (oData.results.length === 0) {
                    this._handleNoVariants();
                } else {
                    this._processVariantData(oData.results);
                    this._loadVariantDetails();
                }
            },

            /**
             * Handle case when no variants exist
             */
            _handleNoVariants: function () {
                const standardVariant = this._createStandardVariant(true);
                this._setVariantData([standardVariant]);
                this._setDefaultVariant(standardVariant);
                this._selectVariant(this.config.standardVariant.name);
            },

            /**
             * Process variant data
             */
            _processVariantData: function (results) {
                const currentUser = this.getCurrentUser().toLowerCase();
                // const currentUser = "Test";
                const processedData = [];
                let defaultVariant = null;

                results.forEach((variant) => {
                    if (variant.DEFAULT === "Y" && variant.USER === currentUser) {
                        defaultVariant = variant;
                        this._setDefaultVariant(variant);
                    }

                    if (variant.USER !== currentUser) {
                        variant.CHANGE = false;
                        variant.REMOVE = false;
                        variant.ENABLE = false;
                    }

                    processedData.push(variant);
                });

                this.oGModel.setProperty("/VariantData", processedData);
            },

            /**
             * Load variant details
             */
            _loadVariantDetails: function () {
                const headerData = this.oGModel.getProperty("/VariantData");
                const filters = headerData.map(
                    (item) => new Filter("VARIANTID", FilterOperator.EQ, item.VARIANTID)
                );

                this.oModel.read(this.config.endpoints.getVariant, {
                    filters: filters,
                    success: this._onVariantDetailsSuccess.bind(this),
                    error: this._onVariantError.bind(this),
                });
            },

            /**
             * Handle variant details success
             */
            _onVariantDetailsSuccess: function (oData) {
                that.oGModel.setProperty("/fieldDetails", oData.results);
                const headerData = this.oGModel.getProperty("/VariantData");
                const currentUser = this.getCurrentUser().toLowerCase();
                // const currentUser = "Test";

                // Merge header and detail data
                const mergedData = oData.results.map((detail) => {
                    const header = headerData.find(
                        (h) => h.VARIANTID === detail.VARIANTID
                    );
                    return header ? { ...detail, ...header } : detail;
                });

                // Convert scope to UI5 enum
                var processedData = mergedData.map((item) => ({
                    ...item,
                    SCOPE:
                        item.SCOPE === "Public"
                            ? sap.m.SharingMode.Public
                            : sap.m.SharingMode.Private,
                }));

                this.oGModel.setProperty("/variantDetails", processedData);
                processedData = processedData.filter(id => id.VARIANTNAME !== "defaultMulti" && id.APPLICATION_NAME !== "DefaultMulti");
                const uniqueVariants = this._removeDuplicates(
                    processedData,
                    "VARIANTNAME"
                );
                const standardVariant = this._createStandardVariant();

                // Find default variant
                const defaultVariant = uniqueVariants.find(
                    (v) => v.DEFAULT === "Y" && v.USER === currentUser
                );

                if (defaultVariant) {
                    standardVariant.DEFAULT = "N";
                    uniqueVariants.unshift(standardVariant);
                    this._setVariantData(uniqueVariants);
                    this._selectVariant(defaultVariant.VARIANTNAME);
                } else {
                    uniqueVariants.unshift(standardVariant);
                    this._setVariantData(uniqueVariants);
                    this._setDefaultVariant(standardVariant);
                    this._selectVariant(this.config.standardVariant.name);
                }
            },

            /**
             * Create standard variant object
             */
            _createStandardVariant: function (isDefault = true) {
                return {
                    VARIANTNAME: this.config.standardVariant.name,
                    VARIANTID: this.config.standardVariant.id,
                    DEFAULT: isDefault ? "Y" : "N",
                    REMOVE: false,
                    CHANGE: false,
                    USER: this.config.standardVariant.user,
                    SCOPE: sap.m.SharingMode.Public,
                };
            },

            /**
             * Set variant data to models
             */
            _setVariantData: function (variants) {
                this.oGModel.setProperty("/viewNames", variants);
                this.variantModel.setData({ variants: variants });
                this.varianNames = variants;
                this.byId(this.config.controlIds.variantManagement).setModel(
                    this.variantModel
                );
            },

            /**
             * Select and apply variant
             */
            _selectVariant: function (variantName) {
                this.oGModel.setProperty("/fromFunction", "X");
                this.handleSelectPress(variantName);
            },

            /**
             * Set default variant
             */
            _setDefaultVariant: function (variant) {
                this.UniqueDefKey = variant.VARIANTID;
                this.byId(this.config.controlIds.variantManagement).setDefaultKey(
                    variant.VARIANTID
                );
                this.byId(this.config.controlIds.variantManagement).setSelectedKey(
                    variant.VARIANTID
                );
            },

            /**
             * Handle variant selection
             */
            handleSelectPress: function (oEvent) {
                BusyIndicator.show();

                // Clear current filters
                // this._clearFilters();

                // Get selected variant name
                const selectedVariant =
                    this.oGModel.getProperty("/fromFunction") === "X"
                        ? oEvent
                        : oEvent.getSource().getTitle().getText();

                this.oGModel.setProperty("/variantName", selectedVariant);
                this.oGModel.setProperty("/fromFunction", "");

                if (selectedVariant !== this.config.standardVariant.name) {
                    this._applyVariantFilters(selectedVariant);
                } else {
                    // let headerDetails = that.oGModel.getProperty("/headerDetails").filter(id => id.APPLICATION_NAME == "DefaultMulti" && id.VARIANTNAME == "defaultMulti");

                    // if (headerDetails.length > 0) {
                    //     var filteredData = that.oGModel.getProperty("/fieldDetails").filter(id => id.VARIANTID == headerDetails[0].VARIANTID);

                    //     // const variantDetails = this.oGModel.getProperty("/variantDetails");
                    //     const filterData = {};
                    //     const rangeData = {};
                    //     // Process token-based fields
                    //     this.config.fieldMappings.forEach(fieldConfig => {
                    //         const fieldData = filteredData.filter(item =>
                    //             item.FIELD.includes(fieldConfig.variantField)
                    //         );
                    //         if (fieldData.length > 0) {
                    //             const tokens = fieldData.map(item => ({
                    //                 key: item.VALUE,
                    //                 text: item.VALUE
                    //             }));
                    //             this.oGModel.setProperty(fieldConfig.modelProperty, tokens);
                    //             filterData[fieldConfig.filterField] = { items: tokens };
                    //         }
                    //     });
                    //     // Process range fields
                    //     this.config.rangeFields.forEach(fieldConfig => {
                    //         const fieldData = filteredData.find(item =>
                    //             item.FIELD && item.FIELD.includes(fieldConfig.variantField)
                    //         );
                    //         const value = fieldData ? fieldData.VALUE : fieldConfig.defaultValue;
                    //         if (fieldConfig.modelProperty) {
                    //             this.oGModel.setProperty(fieldConfig.modelProperty, value);
                    //         }
                    //         rangeData[fieldConfig.filterField] = {
                    //             ranges: [{
                    //                 exclude: false,
                    //                 operation: "EQ",
                    //                 keyField: fieldConfig.filterField,
                    //                 value1: value
                    //             }]
                    //         };
                    //     });
                    //     // Apply filters
                    //     const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
                    //     smartFilterBar.setFilterData(rangeData);
                    //     smartFilterBar.setFilterDataAsString(JSON.stringify(filterData));
                    // }
                    // else {
                    this._applyDefaultFilters();
                    // }
                }

                BusyIndicator.hide();
            },

            /**
             * Clear all filters
             */
            _clearFilters: function () {
                const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
                smartFilterBar.clear();

                // Reset model properties
                this._initializeDefaultValues();
                this.byId(this.config.controlIds.variantManagement).setModified(false);
            },

            /**
             * Apply variant specific filters
             */
            _applyVariantFilters: function (variantName) {
                const variantDetails = this.oGModel.getProperty("/variantDetails");
                const filteredData = variantDetails.filter(
                    (item) =>
                        item.VARIANTNAME === variantName &&
                        item.APPLICATION_NAME === this.appName
                );

                const filterData = {};
                const rangeData = {};

                // Process token-based fields
                this.config.fieldMappings.forEach((fieldConfig) => {
                    const fieldData = filteredData.filter((item) =>
                        item.FIELD.includes(fieldConfig.variantField)
                    );

                    if (fieldData.length > 0) {
                        const tokens = fieldData.map((item) => ({
                            key: item.VALUE,
                            text: item.VALUE,
                        }));

                        this.oGModel.setProperty(fieldConfig.modelProperty, tokens);
                        filterData[fieldConfig.filterField] = { items: tokens };
                    }
                });
                that.versionValue = [];
                that.scenarioValue = [];
                // Process range fields
                this.config.rangeFields.forEach((fieldConfig) => {
                    if (fieldConfig.variantField === "Products") {
                        return; // ← continues to next field
                    }
                    const fieldData = filteredData.find(
                        (item) =>
                            item.FIELD && item.FIELD.includes(fieldConfig.variantField)
                    );

                    const value = fieldData ? fieldData.VALUE : fieldConfig.defaultValue;

                    if (fieldConfig.modelProperty) {
                        this.oGModel.setProperty(fieldConfig.modelProperty, value);
                    }
                    if (fieldConfig.filterField === "VERSION_NAME") {
                        that.versionValue = value;
                    }
                    if (fieldConfig.filterField === "SCENARIO_NAME") {
                        that.scenarioValue = value;
                    }
                    rangeData[fieldConfig.filterField] = {
                        ranges: [
                            {
                                exclude: false,
                                operation: "EQ",
                                keyField: fieldConfig.filterField,
                                value1: value,
                            },
                        ],
                    };

                });
                BusyIndicator.hide();

                // Apply filters
                const smartFilterBar = that.byId("smartFilterBar");
                smartFilterBar.fireClear();
                smartFilterBar.setFilterData(rangeData);
                smartFilterBar.setFilterDataAsString(JSON.stringify(filterData));
                var productData = filteredData.filter(id => id.FIELD === "Products")
                var oControlProd = smartFilterBar.getControlByKey("PRODUCT_ID");
                if (oControlProd) {
                    oControlProd.setValue(productData[0].VALUE);
                    oControlProd.setValueState("None");
                    oControlProd.fireChange({ value: productData[0].VALUE }); // forces sync
                }
                const oVersionCtrl = smartFilterBar.getControlByKey("VERSION_NAME");
                const oScenarioCtrl = smartFilterBar.getControlByKey("SCENARIO_NAME");


                if (oVersionCtrl) {
                    oVersionCtrl.setValue(that.versionValue);
                    oVersionCtrl.setValueState("None");
                    oVersionCtrl.fireChange({ value: that.versionValue }); // forces sync
                }

                if (oScenarioCtrl) {
                    oScenarioCtrl.setValue(that.scenarioValue);
                    oScenarioCtrl.setValueState("None");
                    oScenarioCtrl.fireChange({ value: that.scenarioValue });
                }
                that.byId("idMatList123").setModified(false);
                that.oGModel.setProperty("/defaultVariant", "N");
            },

            /**
             * Apply default filters (for Standard variant)
             */
            _applyDefaultFilters: function () {
                var flag = that.oGModel.getProperty("/defaultVariant");
                if (flag !== "Y") {
                    that.byId("smartFilterBar").fireClear();
                    const rangeData = {};

                    this.config.rangeFields.forEach((fieldConfig) => {
                        rangeData[fieldConfig.filterField] = {
                            ranges: [
                                {
                                    exclude: false,
                                    operation: "EQ",
                                    keyField: fieldConfig.filterField,
                                    value1: fieldConfig.defaultValue,
                                },
                            ],
                        };
                    });

                    this.byId(this.config.controlIds.smartFilterBar).setFilterData(
                        rangeData
                    );
                    const smartFilterBar = that.byId("smartFilterBar");
                    const oVersionCtrl = smartFilterBar.getControlByKey("VERSION_NAME");
                    const oScenarioCtrl = smartFilterBar.getControlByKey("SCENARIO_NAME");

                    if (oVersionCtrl) {
                        oVersionCtrl.setValue("Base Version");
                        oVersionCtrl.setValueState("None");
                        oVersionCtrl.fireChange({ value: "Base Version" }); // forces sync
                    }

                    if (oScenarioCtrl) {
                        oScenarioCtrl.setValue("_PLAN");
                        oScenarioCtrl.setValueState("None");
                        oScenarioCtrl.fireChange({ value: "_PLAN" });
                    }
                }
            },

            /**
             * Handle filter changes
             */
            // onFilterChange: function (oEvent) {
            //     if (!oEvent) return false;

            //     const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
            //     const filterData = smartFilterBar.getFilterData();

            //     // that.oGModel.setProperty("/oSmartFilterBar", filterData)
            //     // that.oGloableFilters = this.byId("smartFilterBar");
            //     let unchangedCount = 0;

            //     if (!Object.keys(filterData).length) return;

            //     // Check token-based fields
            //     this.config.fieldMappings.forEach((fieldConfig) => {
            //         if (filterData[fieldConfig.filterField]) {
            //             const currentItems =
            //                 filterData[fieldConfig.filterField].items || [];
            //             const defaultItems =
            //                 this.oGModel.getProperty(fieldConfig.modelProperty) || [];

            //             if (this._areArraysEqual(currentItems, defaultItems)) {
            //                 unchangedCount++;
            //             } else {
            //                 this.byId(this.config.controlIds.variantManagement).setModified(
            //                     true
            //                 );
            //                 return;
            //             }
            //         }
            //     });

            //     // Check range fields
            //     this.config.rangeFields.forEach((fieldConfig) => {
            //         if (
            //             fieldConfig.modelProperty &&
            //             filterData[fieldConfig.filterField]
            //         ) {
            //             const currentValue =
            //                 filterData[fieldConfig.filterField].ranges?.[0]?.value1;
            //             const defaultValue = this.oGModel.getProperty(
            //                 fieldConfig.modelProperty
            //             );

            //             if (currentValue === defaultValue) {
            //                 unchangedCount++;
            //             } else {
            //                 this.byId(this.config.controlIds.variantManagement).setModified(
            //                     true
            //                 );
            //                 return;
            //             }
            //         }
            //     });

            //     // If all fields match defaults, set as unmodified
            //     const totalFields =
            //         this.config.fieldMappings.length +
            //         this.config.rangeFields.filter((f) => f.modelProperty).length;

            //     if (unchangedCount === totalFields) {
            //         this.byId(this.config.controlIds.variantManagement).setModified(
            //             false
            //         );
            //     }

            //       this._applyStaticFilters();
            // },

            /**
             * Create new variant
             */
            onCreate: function (oEvent) {
                BusyIndicator.show();

                const params = oEvent.getParameters();
                const variantData = this._buildVariantData(params);

                if (!params.name) {
                    BusyIndicator.hide();
                    MessageToast.show("Please provide a variant name");
                    return;
                }

                this._saveVariant(variantData, params);
            },

            /**
             * Build variant data from current filters
             */
            _buildVariantData: function (params) {
                const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
                const filterData = smartFilterBar.getFilterData();
                const variantData = [];

                const defaultFlag = params.def ? "Y" : "N";
                const scope = params.public ? "Public" : "Private";

                // Process token-based fields
                this.config.fieldMappings.forEach((fieldConfig) => {
                    const fieldData = filterData[fieldConfig.filterField];
                    if (fieldData?.items) {
                        fieldData.items.forEach((item) => {
                            variantData.push({
                                Field: fieldConfig.variantField,
                                FieldCenter: item.key,
                                Value: item.text,
                                Default: defaultFlag,
                                IDNAME: params.name,
                                App_Name: this.appName,
                                SCOPE: scope,
                            });
                        });
                    }
                    else if (fieldData !== undefined) {
                        variantData.push({
                            Field: fieldConfig.variantField,
                            FieldCenter: fieldData,
                            Value: fieldData,
                            Default: defaultFlag,
                            IDNAME: params.name,
                            App_Name: this.appName,
                            SCOPE: scope,
                        });
                    }
                });

                // Process range fields
                this.config.rangeFields.forEach((fieldConfig) => {
                    if (fieldConfig.variantField) {
                        const value =
                            filterData[fieldConfig.filterField]?.ranges?.[0]?.value1 || filterData[fieldConfig.filterField]
                        fieldConfig.defaultValue;

                        if (value) {
                            variantData.push({
                                Field: fieldConfig.variantField,
                                FieldCenter: value,
                                Value: value,
                                Default: defaultFlag,
                                IDNAME: params.name,
                                App_Name: this.appName,
                                SCOPE: scope,
                            });
                        }
                    }
                });

                return variantData;
            },

            /**
             * Save variant to backend
             */
            _saveVariant: function (variantData, params) {
                // Handle default variant updates if needed
                if (
                    params.def &&
                    this.oGModel.getProperty("/defaultDetails")?.length > 0
                ) {
                    this._updateDefaultVariant();
                }

                const flag = params.overwrite ? "E" : "X";

                if (params.overwrite) {
                    variantData.forEach((item) => {
                        item.ID = params.key;
                    });
                }

                this.oModel.callFunction(this.config.endpoints.createVariant, {
                    method: "GET",
                    urlParameters: {
                        Flag: flag,
                        USER: this.oGModel.getProperty("/UserId"),
                        VARDATA: JSON.stringify(variantData),
                    },
                    success: (oData) => {
                        this.oGModel.setProperty("/newVariant", oData.results);
                        this.oGModel.setProperty("/newVaraintFlag", "X");
                        this.byId(this.config.controlIds.variantManagement).setModified(
                            false
                        );
                        this.loadVariants();
                    },
                    error: () => {
                        BusyIndicator.hide();
                        MessageToast.show("Failed to create variant");
                    },
                });
            },

            /**
             * Handle variant management
             */
            onManage: function (oEvent) {
                BusyIndicator.show();

                const params = oEvent.getParameters();
                const currentUser = this.getCurrentUser().toLowerCase();
                // const currentUser = "Test";

                // Validate permissions
                if (params.def && !this._canModifyVariant(params.def, currentUser)) {
                    this._resetVariantManagement();
                    BusyIndicator.hide();
                    MessageToast.show("Cannot modify variant - insufficient permissions");
                    return;
                }

                // Handle deletions
                if (params.deleted?.length > 0) {
                    this._handleVariantDeletion(params.deleted);
                }

                // Handle default changes
                if (params.def) {
                    this._handleDefaultVariantChange(params.def, currentUser);
                } else {
                    this.loadVariants();
                    BusyIndicator.hide();
                }
            },

            /**
             * Handle variant deletion
             */
            _handleVariantDeletion: function (deletedIds) {
                const variantData = this.oGModel.getProperty("/VariantData");
                const deletedVariants = deletedIds.map((id) => {
                    const variant = variantData.find(
                        (v) => v.VARIANTID === JSON.parse(id)
                    );
                    return { ID: variant.VARIANTID, NAME: variant.VARIANTNAME };
                });

                this._deleteVariants(deletedVariants);
            },

            /**
             * Delete variants from backend
             */
            _deleteVariants: function (variants) {
                this.oModel.callFunction(this.config.endpoints.createVariant, {
                    method: "GET",
                    urlParameters: {
                        Flag: "D",
                        USER: this.oGModel.getProperty("/UserId"),
                        VARDATA: JSON.stringify(variants),
                    },
                    success: () => {
                        // Success handled by parent function
                    },
                    error: () => {
                        BusyIndicator.hide();
                        MessageToast.show("Failed to delete variants");
                    },
                });
            },

            /**
             * Utility functions
             */
            _removeDuplicates: function (array, key) {
                return array.filter(
                    (item, index, self) =>
                        index === self.findIndex((t) => t[key] === item[key])
                );
            },

            _areArraysEqual: function (arr1, arr2) {
                if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;

                const sorted1 = [...arr1].sort((a, b) => a.key.localeCompare(b.key));
                const sorted2 = [...arr2].sort((a, b) => a.key.localeCompare(b.key));

                return sorted1.every(
                    (item, index) =>
                        item.key === sorted2[index].key && item.text === sorted2[index].text
                );
            },

            _canModifyVariant: function (variantId, currentUser) {
                const variantData = this.oGModel.getProperty("/VariantData");
                const variant = variantData.find(
                    (v) => v.VARIANTID === JSON.parse(variantId)
                );
                return !variant || variant.USER === currentUser;
            },

            _resetVariantManagement: function () {
                this.viewDetails.setData({ variants: this.varianNames });
                this.byId(this.config.controlIds.variantManagement).setModel(
                    this.viewDetails
                );
                this.byId(this.config.controlIds.variantManagement).setDefaultKey(
                    this.UniqueDefKey
                );
            },

            _onVariantError: function () {
                BusyIndicator.hide();
                MessageToast.show("Error loading variant details");
            },
            /**
             * Handle default variant updates and changes
             */
            _updateDefaultVariant: function () {
                const defaultDetails = this.oGModel.getProperty("/defaultDetails");
                this.oModel.callFunction(this.config.endpoints.updateVariant, {
                    method: "GET",
                    urlParameters: {
                        VARDATA: JSON.stringify(defaultDetails),
                    },
                    success: function () {
                        // Handled by calling function
                    },
                    error: function () {
                        MessageToast.show("Failed to update default variant");
                    },
                });
            },

            _handleDefaultVariantChange: function (newDefaultId, currentUser) {
                const variantData = this.oGModel.getProperty("/VariantData");

                if (JSON.parse(newDefaultId) !== 0) {
                    // Set new default (not Standard)
                    const currentDefault = variantData.find(
                        (v) => v.DEFAULT === "Y" && v.USER === currentUser
                    );

                    if (currentDefault) {
                        // Update existing default to non-default
                        currentDefault.DEFAULT = "N";
                        this._updateVariantDefault(currentDefault, () => {
                            // Set new default
                            const newDefault = variantData.find(
                                (v) => v.VARIANTID === JSON.parse(newDefaultId)
                            );
                            newDefault.DEFAULT = "Y";
                            this._updateVariantDefault(newDefault, () => {
                                this.loadVariants();
                            });
                        });
                    } else {
                        // No existing default, just set new one
                        const newDefault = variantData.find(
                            (v) => v.VARIANTID === JSON.parse(newDefaultId)
                        );
                        newDefault.DEFAULT = "Y";
                        this._updateVariantDefault(newDefault, () => {
                            this.loadVariants();
                        });
                    }
                } else {
                    // Standard selected as default - remove existing default
                    const currentDefault = variantData.find((v) => v.DEFAULT === "Y");
                    if (currentDefault) {
                        currentDefault.DEFAULT = "N";
                        this._updateVariantDefault(currentDefault, () => {
                            this.loadVariants();
                        });
                    }
                }
            },

            _updateVariantDefault: function (variant, callback) {
                this.oModel.callFunction(this.config.endpoints.updateVariant, {
                    method: "GET",
                    urlParameters: {
                        VARDATA: JSON.stringify([variant]),
                    },
                    success: callback,
                    error: () => {
                        BusyIndicator.hide();
                        MessageToast.show("Failed to update variant");
                    },
                });
            },
            saveDefaultVariant: function () {
                const smartFilterBar = this.byId(this.config.controlIds.smartFilterBar);
                const filterData = smartFilterBar.getFilterData();
                const variantData = [];
                this.config.fieldMappings.forEach(fieldConfig => {
                    const fieldData = filterData[fieldConfig.filterField];
                    if (fieldData?.items) {
                        fieldData.items.forEach(item => {
                            variantData.push({
                                Field: fieldConfig.variantField,
                                FieldCenter: item.key,
                                Value: item.text,
                                IDNAME: "defaultMulti",
                                App_Name: "DefaultMulti",
                                SCOPE: "Global"
                            });
                        });
                    }
                });
                // Process range fields
                this.config.rangeFields.forEach(fieldConfig => {
                    if (fieldConfig.variantField) {
                        const value = filterData[fieldConfig.filterField]?.ranges?.[0]?.value1 ||
                            fieldConfig.defaultValue;
                        if (value) {
                            variantData.push({
                                Field: fieldConfig.variantField,
                                FieldCenter: value,
                                Value: value,
                                IDNAME: "defaultMulti",
                                App_Name: "DefaultMulti",
                                SCOPE: "Global"
                            });
                        }
                    }
                });
                var flag = "N";
                this.oModel.callFunction(this.config.endpoints.createVariant, {
                    method: "GET",
                    urlParameters: {
                        Flag: flag,
                        USER: this.oGModel.getProperty("/UserId"),
                        VARDATA: JSON.stringify(variantData)
                    },
                    success: (oData) => {
                        BusyIndicator.hide();
                    },
                    error: () => {
                        BusyIndicator.hide();
                        MessageToast.show("Failed to create global variant");
                    }
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
                    oStorage.put("nodeId", 87);
                    //Generate a  URL for the second application
                    var url = window.location.href.split('#')[0] + hash;
                    //Navigate to second app
                    sap.m.URLHelper.redirect(url, true);
                }
            },


            // loadSubData: async function () {
            //     return new Promise(async (resolve, reject) => {
            //         try {
            //             const oSmartFilterBar = this.byId("smartFilterBar");
            //             const filterData = oSmartFilterBar.getFilterData();
            //             let groupbyFields = [
            //                 "LOCATION_ID",
            //                 "PRODUCT_ID",
            //                 "CUSTOMER_GROUP",
            //                 "VERSION",
            //                 "SCENARIO",
            //                 "WEEK_STARTDATE",
            //             ],
            //                 measures = [{ field: "OPT_QTY", operation: "sum" }];
            //             let baseApplyQuery = that.getApplyQueryForFields(
            //                 groupbyFields,
            //                 measures
            //             );

            //             // Build final query with filters
            //             let finalApplyQuery = this.buildFinalApplyQuery(
            //                 filterData,
            //                 baseApplyQuery
            //             );

            //             let urlparams = {
            //                 $apply: finalApplyQuery,
            //             };

            //             that.subAllData = await getFilteredSubData(urlparams);
            //             that.subAllData.map((d) => {
            //                 // Only rename OPT_QTY_SUM if it exists
            //                 if (d.hasOwnProperty("OPT_QTY_SUM")) {
            //                     d.OPT_QTY = d.OPT_QTY_SUM;
            //                     delete d.OPT_QTY_SUM;
            //                 }
            //             });
            //             resolve();
            //         } catch (error) {
            //             console.error("Error in loadSubData:", error);
            //             MessageToast.show(error);
            //             reject(error);
            //         }
            //     });

            //     function getFilteredSubData(urlparams) {
            //         return new Promise((resolve, reject) => {
            //             that.aModel.read("/getFinalOptionPercentages", {
            //                 urlParameters: urlparams,
            //                 success: function (oData) {
            //                     resolve(oData.results);
            //                 },
            //                 error: function (err) {
            //                     reject(new Error(err.message || "Failed to load sub data"));
            //                 },
            //             });
            //         });
            //     }
            // },

            // loadData: async function (evt) {
            //     // Get filters from SmartFilterBar
            //     const oWeekTypeKey = this.byId("idWeekType").getSelectedKey();
            //     const oSmartFilterBar = this.byId("smartFilterBar");
            //     const oDateRange = this.byId("idWeekDate");
            //     const dateValues = oDateRange.getValue().split(" - ");
            //     const totalDatesData = that.oGModel.getProperty("/totalWeekTypes");
            //     const currentWeek = totalDatesData.find(f => dateValues[0] >= that.convertDate(f.WEEK_STARTDATE, '-') && dateValues[0] <= that.convertDate(f.WEEK_ENDDATE, '-'));
            //     const oValue1 = that.convertDate(currentWeek.WEEK_STARTDATE, '-');
            //     const oValue2 = dateValues[1];
            //     const weekFilter = new Filter("WEEK_STARTDATE", FilterOperator.BT, oValue1, oValue2)
            //     const aFilters = oSmartFilterBar.getFilters();
            //     if (aFilters) {
            //         aFilters[0].aFilters.push(weekFilter);
            //     }
            //     // const checkCharNum = that.byId("idPri").getSelected();
            //     const oCombinedFilter = that.handleVerScenFilter(aFilters);
            //     that.weekType = oWeekTypeKey;
            //     let topCount = 30000;
            //     let urlparams = "";
            //     let entity = "";
            //     let serviceModel = "";
            //     if (oWeekTypeKey == "TELESCOPIC_WEEK") {
            //         serviceModel = that.oModel;
            //         entity = "/getTelescopicFinalPlan";
            //         let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
            //         const updatedFilter = replaceWeekDates(finalApplyQuery);
            //         function replaceWeekDates(filterString) {
            //             return filterString
            //                 .replace(/WEEK_STARTDATE/g, "PERIODSTART")
            //                 .replace(/WEEK_ENDDATE/g, "PERIODEND");
            //         }
            //         const modifiedCharValFilter = addNullChecksToFilter(updatedFilter);
            //         urlparams = {
            //             $skip: that.skip,
            //             $top: topCount,
            //             $apply: modifiedCharValFilter,
            //             $orderby: "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,PERIODSTART asc",
            //         };
            //     } else {
            //         serviceModel = that.aModel;
            //         entity = "/getFinalOptionPercentages";
            //         let finalApplyQuery = that.getFilterApplyQuery([oCombinedFilter]);
            //         const modifiedCharValFilter = addNullChecksToFilter(finalApplyQuery);
            //         urlparams = {
            //             $skip: that.skip,
            //             $top: topCount,
            //             $apply: modifiedCharValFilter,
            //             $orderby: "LOCATION_ID asc,PRODUCT_ID asc,CUSTOMER_GROUP asc,CHAR_NUM asc,CHARVAL_NUM asc,VERSION asc,SCENARIO asc,TYPE asc,WEEK_STARTDATE asc",
            //         };
            //     }

            //     serviceModel.read(entity, {
            //         urlParameters: urlparams,
            //         success: function (oData) {
            //             // Check if more data needs to be loaded
            //             if (topCount === oData.results.length) {
            //                 that.skip += topCount;
            //                 that.allData = [...(that.allData || []), ...oData.results];
            //                 that.loadData(); // Recursively load more data
            //             } else {
            //                 // Reset skip and finalize data
            //                 that.skip = 0;
            //                 that.allData = [...(that.allData || []), ...oData.results];

            //                 that.allData = that.removeDuplicates(that.allData, [
            //                     "LOCATION_ID",
            //                     "PRODUCT_ID",
            //                     "CUSTOMER_GROUP",
            //                     "CHAR_NUM",
            //                     "CHARVAL_NUM",
            //                     "VERSION",
            //                     "SCENARIO",
            //                     "MODEL_VERSION",
            //                     oWeekTypeKey,
            //                     "TYPE",
            //                 ]);

            //                 // if (!checkCharNum) {
            //                 //     that.allData = that.allData.filter(
            //                 //         (o) => o.CHAR_TYPE === "P" || o.CHAR_TYPE === null
            //                 //     );
            //                 // }
            //                 if (oWeekTypeKey == 'TELESCOPIC_WEEK') {
            //                     that.allData.sort((a, b) => new Date(a.PERIODSTART) - new Date(b.PERIODSTART))
            //                 } else {
            //                     that.allData.sort((a, b) => new Date(a.WEEK_STARTDATE) - new Date(b.WEEK_STARTDATE))
            //                 }
            //                 // Extract unique, sorted dates
            //                 that.dates = Array.from(
            //                     new Set(
            //                         that.allData.map((d) => {
            //                             // Only rename OPT_PERCENT_AVERAGE if it exists
            //                             if (d.hasOwnProperty("OPT_PERCENT_AVERAGE")) {
            //                                 d.OPT_PERCENT = d.OPT_PERCENT_AVERAGE;
            //                                 delete d.OPT_PERCENT_AVERAGE;
            //                             }

            //                             // Only rename OPT_QTY_SUM if it exists
            //                             if (d.hasOwnProperty("OPT_QTY_SUM")) {
            //                                 d.OPT_QTY = d.OPT_QTY_SUM;
            //                                 delete d.OPT_QTY_SUM;
            //                             }

            //                             // Return the date field used for Set and sorting
            //                             return d[oWeekTypeKey];
            //                         })
            //                     )
            //                 );

            //                 // Generate required views
            //                 that.generateTree(that.allData);
            //                 that.oTree.setBusy(false);
            //                 if (that.allExpandNode && that.allExpandNode.length)
            //                     that.oTree.expandToLevel(3);
            //                 if (that.selPath) {
            //                     that.preSelNode = that.oTree
            //                         .getItems()
            //                         .find(
            //                             (item) => item.getHighlightText() === that.selectedTreeText
            //                         );
            //                     if (that.preSelNode) {
            //                         that.oTree.setSelectedItem(that.preSelNode);
            //                     }
            //                 }
            //                 if (!that.isKeyFigureAlreadyGenerate) {
            //                     that.generateKeyFigSettings(that.allData);
            //                     that.isKeyFigureAlreadyGenerate = true;
            //                 }
            //                 that.onTreeItemSelect();
            //                 that.ResetTree();

            //                 // Show success message if triggered by refresh
            //                 if (evt === "refreshData") {
            //                     MessageToast.show("Successfully Saved Data");
            //                 }
            //             }

            //             // Update UI status
            //             that.byId("idDynamicPage2").setBusy(false);
            //             that.oTree.setBusy(false);
            //         },
            //         error: function (err) {
            //             // Handle error
            //             that.oTree.setBusy(false);
            //             that.byId("idDynamicPage2").setBusy(false);
            //             MessageToast.show("Error Loading Option Percentages Data");
            //         },
            //     });

            //     //helper function 
            //     function addNullChecksToFilter(filterString) {
            //         if (!filterString || typeof filterString !== 'string') {
            //             return filterString;
            //         }

            //         let modifiedFilter = filterString;

            //         // Check if CHAR_NUM exists in the filter
            //         const hasCharNum = /CHAR_NUM\s+eq\s+[^)\s]+/.test(filterString);

            //         // Check if CHARVAL_NUM exists in the filter
            //         const hasCharValNum = /CHARVAL_NUM\s+eq\s+[^)\s]+/.test(filterString);

            //         // Check if CUSTOMER_GROUP exists in the filter
            //         const hasCustomerGroup = /CUSTOMER_GROUP\s+eq\s+[^)\s]+/.test(filterString);

            //         // If CHAR_NUM exists, add null check
            //         if (hasCharNum) {
            //             // Find the CHAR_NUM condition and wrap it with OR null condition
            //             modifiedFilter = modifiedFilter.replace(
            //                 /(CHAR_NUM\s+eq\s+[^)\s]+)/g,
            //                 '($1 or CHAR_NUM eq null)'
            //             );
            //         }

            //         // If CHARVAL_NUM exists, add null check
            //         if (hasCharValNum) {
            //             // Find the CHARVAL_NUM condition and wrap it with OR null condition
            //             modifiedFilter = modifiedFilter.replace(
            //                 /(CHARVAL_NUM\s+eq\s+[^)\s]+)/g,
            //                 '($1 or CHARVAL_NUM eq null)'
            //             );
            //         }

            //         // If CUSTOMER_GROUP exists, add null check
            //         if (hasCustomerGroup) {
            //             // Find the CHARVAL_NUM condition and wrap it with OR null condition
            //             modifiedFilter = modifiedFilter.replace(
            //                 /(CUSTOMER_GROUP\s+eq\s+[^)\s]+)/g,
            //                 '($1 or CUSTOMER_GROUP eq null)'
            //             );
            //         }

            //         // Always add CHAR_TYPE condition
            //         // Remove the outer filter( and ) to work with the inner condition
            //         const innerFilter = modifiedFilter.replace(/^filter\(/, '').replace(/\)$/, '');

            //         // Add CHAR_TYPE condition with AND operator
            //         const charTypeCondition = "(CHAR_TYPE eq 'P' or CHAR_TYPE eq null)";
            //         const finalInnerFilter = `(${innerFilter}) and ${charTypeCondition}`;

            //         // Wrap back with filter()
            //         modifiedFilter = `filter(${finalInnerFilter})`;

            //         return modifiedFilter;
            //     }
            // },



            // onNorSelect: function (event) {
            //     var that = this;
            //     var oSelectedItem = event.getParameter("item");
            //     var sLabel = oSelectedItem.getLabel ? oSelectedItem.getLabel() : oSelectedItem.label;
            //     var aFiltersRoot = that.oGModel.getProperty("/oFilterspas");

            //     // 🔹 Helper function to recursively find CUSTOMER_GROUP
            //     function findCustomerGroupValue(aFilters) {
            //         for (var i = 0; i < aFilters.length; i++) {
            //             var f = aFilters[i];
            //             if (f.sPath && f.sPath.toUpperCase() === "CUSTOMER_GROUP" && f.oValue1) {
            //                 return f.oValue1;
            //             }
            //             if (f.aFilters && f.aFilters.length > 0) {
            //                 var val = findCustomerGroupValue(f.aFilters);
            //                 if (val) return val;
            //             }
            //         }
            //         return null;
            //     }

            //     // 🔹 Get Customer Group value
            //     var sCustomerGroup = null;
            //     if (Array.isArray(aFiltersRoot) && aFiltersRoot.length > 0) {
            //         sCustomerGroup = findCustomerGroupValue(aFiltersRoot[0].aFilters || []);
            //     }

            //     // 🔹 Check if Customer Group filter exists
            //     var bHasCustomerGroup = sCustomerGroup && sCustomerGroup.trim() !== "";

            //     // 🔹 Check if selected label includes Planned / Forecast
            //     var bIsPlannedOrForecast = sLabel && (
            //         sLabel.toLowerCase().includes("planned option percentage") ||
            //         sLabel.toLowerCase().includes("planned option quantity") ||
            //         sLabel.toLowerCase().includes("forecast order percentage at vc") ||
            //         sLabel.toLowerCase().includes("forecast order qty at vc") ||
            //         sLabel.toLowerCase().includes("forecast order quantity")
            //     );

            //     // 🔹 When both true — unselect and hide the item
            //     if (bHasCustomerGroup && bIsPlannedOrForecast) {
            //         sap.m.MessageToast.show("No data for Customer Group");

            //         // Uncheck and hide the selected key figure
            //         setTimeout(function () {
            //             try {
            //                 oSelectedItem.setSelected(false);
            //             } catch (err) {
            //                 console.warn("Could not unselect item:", err);
            //             }

            //             // 🔹 Update corresponding data model (make visible = false)
            //             var norKeyFig = that.oCore.byId("idNorKeyFigure");
            //             var calKeyFig = that.oCore.byId("idCalKeyFigure");

            //             var aNorData = norKeyFig.getP13nData ? norKeyFig.getP13nData() : [];
            //             var aCalData = calKeyFig.getP13nData ? calKeyFig.getP13nData() : [];

            //             // update visible property to false for matching label
            //             [aNorData, aCalData].forEach(function (aData) {
            //                 aData.forEach(function (item) {
            //                     if (item.label === sLabel) {
            //                         item.visible = false;
            //                     }
            //                 });
            //             });

            //             // re-apply the updated personalization data
            //             if (norKeyFig && norKeyFig.setP13nData) norKeyFig.setP13nData(aNorData);
            //             if (calKeyFig && calKeyFig.setP13nData) calKeyFig.setP13nData(aCalData);

            //         }, 100);
            //     }
            // },

            // onCalSelect: function (event) {
            //     var that = this;
            //     var oSelectedItem = event.getParameter("item");
            //     var sLabel = oSelectedItem.getLabel ? oSelectedItem.getLabel() : oSelectedItem.label;
            //     var aFiltersRoot = that.oGModel.getProperty("/oFilterspas");

            //     // 🔹 Helper function to recursively find CUSTOMER_GROUP
            //     function findCustomerGroupValue(aFilters) {
            //         for (var i = 0; i < aFilters.length; i++) {
            //             var f = aFilters[i];
            //             if (f.sPath && f.sPath.toUpperCase() === "CUSTOMER_GROUP" && f.oValue1) {
            //                 return f.oValue1;
            //             }
            //             if (f.aFilters && f.aFilters.length > 0) {
            //                 var val = findCustomerGroupValue(f.aFilters);
            //                 if (val) return val;
            //             }
            //         }
            //         return null;
            //     }

            //     // 🔹 Get Customer Group value
            //     var sCustomerGroup = null;
            //     if (Array.isArray(aFiltersRoot) && aFiltersRoot.length > 0) {
            //         sCustomerGroup = findCustomerGroupValue(aFiltersRoot[0].aFilters || []);
            //     }

            //     // 🔹 Check if Customer Group filter exists
            //     var bHasCustomerGroup = sCustomerGroup && sCustomerGroup.trim() !== "";

            //     // 🔹 Check if selected label includes Planned / Forecast
            //     var bIsPlannedOrForecast = sLabel && (
            //         sLabel.toLowerCase().includes("forecast order quantity")
            //     );

            //     // 🔹 When both true — unselect and hide the item
            //     if (bHasCustomerGroup && bIsPlannedOrForecast) {
            //         sap.m.MessageToast.show("No data for Customer Group");

            //         // Uncheck and hide the selected key figure
            //         setTimeout(function () {
            //             try {
            //                 oSelectedItem.setSelected(false);
            //             } catch (err) {
            //                 console.warn("Could not unselect item:", err);
            //             }

            //             // 🔹 Update corresponding data model (make visible = false)
            //             var norKeyFig = that.oCore.byId("idNorKeyFigure");
            //             var calKeyFig = that.oCore.byId("idCalKeyFigure");

            //             var aNorData = norKeyFig.getP13nData ? norKeyFig.getP13nData() : [];
            //             var aCalData = calKeyFig.getP13nData ? calKeyFig.getP13nData() : [];

            //             // update visible property to false for matching label
            //             [aNorData, aCalData].forEach(function (aData) {
            //                 aData.forEach(function (item) {
            //                     if (item.label === sLabel) {
            //                         item.visible = false;
            //                     }
            //                 });
            //             });

            //             // re-apply the updated personalization data
            //             if (norKeyFig && norKeyFig.setP13nData) norKeyFig.setP13nData(aNorData);
            //             if (calKeyFig && calKeyFig.setP13nData) calKeyFig.setP13nData(aCalData);

            //         }, 100);
            //     }
            // },

            // generateKeyFigSettings: function () {
            //     const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");

            //     const norKeyFig = that.oCore.byId("idNorKeyFigure"),
            //         calKeyFig = that.oCore.byId("idCalKeyFigure");

            //     // Reset personalization data
            //     norKeyFig.setP13nData([]);
            //     calKeyFig.setP13nData([]);

            //     // --- Get Customer Group Value from SmartFilterBar ---
            //     const oSmartFilterBar = that.oView.byId("smartFilterBar");
            //     const filterData = oSmartFilterBar?.getFilterData() || {};
            //     const customerGroupItems = filterData?.CUSTOMER_GROUP?.items || [];
            //     const isCustomerGroupPresent = customerGroupItems.length > 0; // ✅ true if group selected

            //     // Split data
            //     const nKfs = maintainedKeyFigs.filter(
            //         (item) =>
            //             (item.KEY_FIG_ID >= 0 && item.KEY_FIG_ID <= 99) ||
            //             (item.KEY_FIG_ID >= 100 && item.KEY_FIG_ID <= 200)
            //     );

            //     const cKfs = maintainedKeyFigs.filter(
            //         (item) => item.KEY_FIG_ID > 200 && item.KEY_FIG_ID < 999
            //     );

            //     const selectedNorKeys = [1, 1000, 1100, 1001, 1101];
            //     const selectedCalKeys = [997];

            //     // --- Build Data ---
            //     const buildData = (arr, selectedKeys) =>
            //         arr.map((u) => {
            //             const desc = u.KEY_FIG_DESC?.toLowerCase() || "";
            //             const isPlannedOrForecast =
            //                 desc.includes("planned option quantity") ||
            //                 desc.includes("planned option percentage") ||
            //                 desc.includes("forecast order qty at vc") ||
            //                 desc.includes("forecast order quantity") ||
            //                 desc.includes("forecast order percentage at vc") ||
            //                 desc.includes("unconsumed quantity");

            //             return {
            //                 key: u.KEY_FIG_ID,
            //                 label: u.KEY_FIG_DESC,
            //                 visible: selectedKeys.includes(u.KEY_FIG_ID), // 👈 Always visible (same logic)
            //                 enabled: isCustomerGroupPresent
            //                     ? !isPlannedOrForecast // fade when group present
            //                     : true // all enabled when no group
            //             };
            //         });

            //     let norData = buildData(nKfs, selectedNorKeys);
            //     let calData = buildData(cKfs, selectedCalKeys);

            //     // ---- Handle Manual Key Figures ----
            //     if (nKfs.some((f) => f.KEY_FIG_DESC === that.ManualKeyArr[0].KEY_FIG_DESC)) {
            //         norData.push(
            //             { key: 1001, label: "Effective Option %", visible: false, enabled: true },
            //             { key: 1101, label: "Effective Option Qty", visible: false, enabled: true },
            //             { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
            //             { key: 1100, label: "Option Quantity", visible: true, enabled: true }
            //         );
            //     } else {
            //         norData.push(
            //             {
            //                 key: that.ManualKeyArr[0].KEY_FIG_ID,
            //                 label: that.ManualKeyArr[0].KEY_FIG_DESC,
            //                 visible: true,
            //                 enabled: true
            //             },
            //             { key: 1001, label: "Effective Option %", visible: true, enabled: true },
            //             { key: 1101, label: "Effective Option Qty", visible: true, enabled: true },
            //             { key: 1000, label: "Option Percentage %", visible: true, enabled: true },
            //             { key: 1100, label: "Option Quantity", visible: true, enabled: true }
            //         );
            //     }

            //     // ---- Sorting ----
            //     const customSort = (a, b) => {
            //         if (a.key === 1) return -1;
            //         if (b.key === 1) return 1;
            //         if (a.visible && !b.visible) return -1;
            //         if (!a.visible && b.visible) return 1;
            //         return a.label.localeCompare(b.label);
            //     };

            //     norData.sort(customSort);
            //     calData.sort(customSort);

            //     // ---- Apply personalization data ----
            //     norKeyFig.setP13nData(norData);
            //     calKeyFig.setP13nData(calData);

            //     // ---- Fade Disabled Texts ----
            //     // const fadeDisabledTexts = (panel) => {
            //     //     const data = panel.getP13nData();

            //     //     panel.addEventDelegate({
            //     //         onAfterRendering: function () {
            //     //             const $panel = panel.$();
            //     //             data.forEach((entry, index) => {
            //     //                 if (!entry.enabled) {
            //     //                     const item = $panel.find(
            //     //                         `.sapMListItems li:nth-child(${index + 1}), .sapMLIB:nth-child(${index + 1})`
            //     //                     );
            //     //                     item.addClass("sapUiDisabledText");
            //     //                     item.attr("title", "Disabled for Planned/Forecast Key Figures");
            //     //                 }
            //     //             });
            //     //         }
            //     //     });
            //     // };

            //     // fadeDisabledTexts(norKeyFig);
            //     // fadeDisabledTexts(calKeyFig);

            //     const fadeDisabledTexts = (panel) => {
            //         const data = panel.getP13nData();

            //         panel.addEventDelegate({
            //             onAfterRendering: function () {
            //                 const $panel = panel.$();
            //                 data.forEach((entry, index) => {
            //                     const item = $panel.find(
            //                         `.sapMListItems li:nth-child(${index + 1}), .sapMLIB:nth-child(${index + 1})`
            //                     );

            //                     if (!entry.enabled) {
            //                         // Faded state
            //                         item.addClass("sapUiDisabledText");
            //                         item.removeClass("sapUiNormalText");
            //                         item.attr("title", "Disabled for Planned/Forecast Key Figures");
            //                     } else {
            //                         // Normal active state
            //                         item.addClass("sapUiNormalText");
            //                         item.removeClass("sapUiDisabledText");
            //                         item.removeAttr("title");
            //                     }
            //                 });
            //             }
            //         });

            //     };
            //     fadeDisabledTexts(norKeyFig);
            //     fadeDisabledTexts(calKeyFig);

            // },


            // generateKeyFigSettings: function () {
            //     const maintainedKeyFigs = that.oGModel.getProperty("/keyFigData");
            //     const oSettingNorData = [],
            //         oSettingCalData = [],
            //         norKeyFig = that.oCore.byId("idNorKeyFigure"),
            //         calKeyFig = that.oCore.byId("idCalKeyFigure");
            //     norKeyFig.setP13nData(oSettingNorData);
            //     calKeyFig.setP13nData(oSettingCalData);
            //     const nKfs = maintainedKeyFigs.filter(
            //         (item) =>
            //             (item.KEY_FIG_ID >= 0 && item.KEY_FIG_ID <= 99) ||
            //             item.KEY_FIG_ID >= 100 && item.KEY_FIG_ID <= 200
            //     ),
            //         cKfs = maintainedKeyFigs.filter(
            //             (item) => item.KEY_FIG_ID > 200 && item.KEY_FIG_ID < 999
            //         );
            //     cKfs.sort((a, b) => b.key - a.key);
            //     nKfs.sort(that.dynamicSort("KEY_FIG_ID"));
            //     nKfs.forEach((u) => {
            //         let obj = {};
            //         obj.key = u.KEY_FIG_ID;
            //         obj.label = u.KEY_FIG_DESC;
            //         obj.visible = false;
            //         if (u.KEY_FIG_ID == 1) {
            //             obj.visible = true;
            //         }
            //         oSettingNorData.push(obj);
            //     });
            //     cKfs.forEach((u) => {
            //         let obj = {};
            //         obj.key = u.KEY_FIG_ID;
            //         obj.label = u.KEY_FIG_DESC;
            //         if (u.KEY_FIG_ID == 997) {
            //             obj.visible = true;
            //         }
            //         oSettingCalData.push(obj);
            //     });
            //     if (
            //         nKfs.some((f) => f.KEY_FIG_DESC == that.ManualKeyArr[0].KEY_FIG_DESC)
            //     ) {
            //         oSettingNorData.push({
            //             key: 1001,
            //             label: "Effective Option %",
            //             visible: false,
            //         });
            //         oSettingNorData.push({
            //             key: 1101,
            //             label: "Effective Option Qty",
            //             visible: false,
            //         });
            //         oSettingNorData.push({
            //             key: 1000,
            //             label: "Option Percentage %",
            //             visible: true,
            //         });
            //         oSettingNorData.push({
            //             key: 1100,
            //             label: "Option Quantity",
            //             visible: true,
            //         });
            //     } else {
            //         oSettingNorData.push({
            //             key: that.ManualKeyArr[0].KEY_FIG_ID,
            //             label: that.ManualKeyArr[0].KEY_FIG_DESC,
            //             visible: true,
            //         });
            //         oSettingNorData.push({
            //             key: 1001,
            //             label: "Effective Option %",
            //             visible: true,
            //         });
            //         oSettingNorData.push({
            //             key: 1101,
            //             label: "Effective Option Qty",
            //             visible: true,
            //         });
            //         oSettingNorData.push({
            //             key: 1000,
            //             label: "Option Percentage %",
            //             visible: true,
            //         });
            //         oSettingNorData.push({
            //             key: 1100,
            //             label: "Option Quantity",
            //             visible: true,
            //         });
            //     }
            //     norKeyFig.setP13nData(oSettingNorData);
            //     calKeyFig.setP13nData(oSettingCalData);
            // },


            //    onBeforeRendering: async function () {
            //     sap.ui.core.BusyIndicator.show();
            //     const that = this;

            //     try {
            //         // Step 1️⃣ - Load Week Data
            //         const weekData = await this._readAsync(this.aModel, "/getFinalOptionPercentages", {
            //             $apply:
            //                 "groupby((CALENDAR_WEEK,TELESCOPIC_WEEK,PERIODSTART,PERIODEND,WEEK_STARTDATE,WEEK_ENDDATE))",
            //             $orderby:
            //                 "PERIODSTART asc,WEEK_STARTDATE asc,CALENDAR_WEEK asc,TELESCOPIC_WEEK asc",
            //         });

            //         const weekResults = weekData.results;
            //         that.oGModel.setProperty("/totalWeekTypes", weekResults);

            //         const weekLookupMap = new Map();
            //         const dateToWeekMap = new Map();
            //         that.telWeek = [];
            //         that.telMonth = [];
            //         that.telQ = [];

            //         for (let i = 0; i < weekResults.length; i++) {
            //             const item = weekResults[i];
            //             if (!item.TELESCOPIC_WEEK && !item.CALENDAR_WEEK) continue;

            //             const monday = that.getMondaysBetween(item.WEEK_STARTDATE, item.WEEK_ENDDATE);
            //             item.monday = monday;

            //             if (
            //                 !that.telWeek.includes(item.TELESCOPIC_WEEK) &&
            //                 !that.telMonth.includes(item.TELESCOPIC_WEEK) &&
            //                 !that.telQ.includes(item.TELESCOPIC_WEEK)
            //             ) {
            //                 const found = weekResults.filter(o => o.TELESCOPIC_WEEK === item.TELESCOPIC_WEEK);
            //                 const length = found.length;

            //                 if (length === 1) that.telWeek.push(item.TELESCOPIC_WEEK);
            //                 else if (length > 2 && length <= 6) that.telMonth.push(item.TELESCOPIC_WEEK);
            //                 else if (length > 6) that.telQ.push(item.TELESCOPIC_WEEK);
            //             }

            //             weekLookupMap.set(item.TELESCOPIC_WEEK, item);
            //             weekLookupMap.set(item.CALENDAR_WEEK, item);
            //             dateToWeekMap.set(monday, item);
            //         }

            //         that.weekLookupMap = weekLookupMap;
            //         that.dateToWeekMap = dateToWeekMap;

            //         // Step 2️⃣ - Load Key Figure Master
            //         const keyFigData = await this._readAsync(this.oModel, "/getKeyFigureMaster");
            //         const keyFigResults = keyFigData.results;

            //         that.oGModel.setProperty("/keyFigData", keyFigResults);
            //         that.ManualKeyArr = keyFigResults.filter(f => f.KEY_FIG_ID == 3);

            //         // Step 3️⃣ - Load Global Planning Config
            //         const configData = await this._callFunctionAsync(this.oModel, "/getGlobalPlanningConfig");
            //         const config = JSON.parse(configData.getGlobalPlanningConfig);

            //         if (config.MONTHS === 0 && config.QUARTER === 0) {
            //             that.byId("idWeekType").setSelectedKey("CALENDAR_WEEK");
            //         }

            //         // ✅ Everything loaded successfully
            //         console.log("All services loaded successfully");

            //     } catch (err) {
            //         sap.m.MessageToast.show(err.message || "Error while loading data");
            //         console.error("Service Load Error:", err);
            //     } finally {
            //         sap.ui.core.BusyIndicator.hide();
            //     }
            // },






        });
    }
);
