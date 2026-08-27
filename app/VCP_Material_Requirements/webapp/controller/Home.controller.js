sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/Fragment",
        "../model/formatter"
    ],
    function (
        Controller,
        Filter,
        FilterOperator,
        MessageToast,
        JSONModel,
        formatter,
        Fragment
    ) {
        "use strict";
        var that;
        return Controller.extend("vcpapp.vcpmaterialrequirements.controller.Home", {
            formatter: formatter,
            onInit: function () {
                that = this;
                that.viewDetails = new JSONModel({
                    items12: []
                });
                that.viewDetails.setSizeLimit(5000);
                that.byId("idMatList123AR").setModel(that.viewDetails);
                // that.variantModel = new JSONModel();
                // that.variantModel.setSizeLimit(5000);
                that.oModel = that.getOwnerComponent().getModel("oModel");
                that.cModel = that.getOwnerComponent().getModel("aModel");
                that.oGModel = that.getOwnerComponent().getModel("oGModel");
                that.FilterBar = that.byId("smartFilterBarAR");
                that.getView().byId("smartFilterBarAR").setModel(that.oModel);
                that._oPopover = null;
                that.dataReady = true;
                that.oGModel.setProperty("/showPivot", false);
                that.oGModel.setProperty("/TypeAssemb", true);
                that.oGModel.setProperty("/OverFlow", false);
                that.oGModel.setProperty("/tableType", "Table");
                that.loadFragment();
                var oMetaModel = that.oModel.getMetaModel();

                if (sap.ushell) {
                    that.sUser = sap.ushell?.Container?.getService("UserInfo")?.getEmail()
                }
                if (!that.sUser) {
                    that.sUser = 'null';
                }
                oMetaModel.loaded().then(function () {
                    const aFields = ["LOCATION_ID", "REF_PRODID", "MRP_GROUP"];

                    aFields.forEach(function (sField) {
                        that.updateValueListConstantMail(oMetaModel, "getAssemblyCompQty", sField, that.sUser);
                    });
                });

                that.Rows = [
                    "Manufacturing Location",
                    "Product",
                    "Assembly Manufacturing Location",
                    "Assembly"
                ];
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
            onBeforeRendering: function () {
                that.cModel.read("/getWeeks", {
                    success: function (oData) {
                        that.calWeekData = oData.results;
                        if (!oData.results) MessageBox.show("Cal Week Date Not Avail");
                        else {
                            that.telWeek = [];
                            that.telMonth = [];
                            that.telQ = [];
                            const remain = [];
                            that.telescopicWeekMap = new Map();
                            that.calendarWeekMap = new Map();
                            for (let i = 0; i < oData.results.length; i++) {
                                const item = oData.results[i];
                                if (!item.TELESCOPIC_WEEK && !item.CALENDAR_WEEK) continue;
                                if (
                                    !that.telWeek.includes(item.TELESCOPIC_WEEK) &&
                                    !that.telMonth.includes(item.TELESCOPIC_WEEK) &&
                                    !that.telQ.includes(item.TELESCOPIC_WEEK)
                                ) {
                                    const found = oData.results.filter(
                                        (o) => o.TELESCOPIC_WEEK === item.TELESCOPIC_WEEK
                                    );
                                    const length = found.length;
                                    if (length === 1) that.telWeek.push(item.TELESCOPIC_WEEK);
                                    else if (length > 2 && length <= 6)
                                        that.telMonth.push(item.TELESCOPIC_WEEK);
                                    else if (length > 6) that.telQ.push(item.TELESCOPIC_WEEK);
                                    else remain.push(item.TELESCOPIC_WEEK);
                                }
                            }
                        }
                    },
                    error: function (error) {
                        console.error(error);
                    },
                });
            },
            async loadFragment() {
                if (!that.ChartDialog) {
                    that.ChartDialog = await sap.ui.core.Fragment.load({
                        name: "vcpapp.vcpmaterialrequirements.fragment.ChartOption",
                        controller: that
                    });
                    that.getView().addDependent(that.ChartDialog);
                }
                if (!that.colSetting) {
                    that.colSetting = await sap.ui.core.Fragment.load({
                        name: "vcpapp.vcpmaterialrequirements.fragment.ColumnSettings",
                        controller: that
                    });
                    that.getView().addDependent(that.colSetting);
                }
                if (!that.keyTable) {
                    that.keyTable = await sap.ui.core.Fragment.load({
                        name: "vcpapp.vcpmaterialrequirements.fragment.keyFigure",
                        controller: that
                    });
                    that.getView().addDependent(that.keyTable);
                }
                if (!that.compTable) {
                    that.compTable = await sap.ui.core.Fragment.load({
                        name: "vcpapp.vcpmaterialrequirements.fragment.Comp",
                        controller: that
                    });
                    that.getView().addDependent(that.compTable);
                }
                if (!that.uniqueIDTable) {
                    that.uniqueIDTable = await sap.ui.core.Fragment.load({
                        name: "vcpapp.vcpmaterialrequirements.fragment.UniqueID",
                        controller: that
                    });
                    that.getView().addDependent(that.uniqueIDTable);
                }
            },
            onAfterRendering: function () {
                that.addScrollEvent();
                that.getVariantData();
                that.setDateRange("disable", 2);
                that.KeyFig = ["Total Component Quantity"];
                that.firstScroll = undefined;
                that.oUniqueControl = this.byId("uniqueButtonControl");
                that.oGModel.setProperty("/initialClear", "Y");
            },
            onFilterBarInit: function (params) {
                that.smartFilterBar = params.getSource();
            },
            onGo: async function (params) {
                if (that.dataReady) {
                    const bPressed = this.getView().byId("idToggleAR").getPressed();
                    const selectedItem = bPressed ? "Telescopic View" : "Calendar View";
                    that.dataReady = false;
                    that.skip = 0;
                    that.top = 15000;
                    that.allData = [];

                    if (selectedItem == "Calendar View") {
                        this.loadData("CALENDAR_WEEK");
                    } else {
                        this.loadData("TELESCOPIC_WEEK");
                    }
                }
            },
            addScrollEvent: function () {
                var oPivotDiv = that.byId("mainDivAR").getDomRef();

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
                            if (
                                !isEventTriggered &&
                                that.hasMoreData &&
                                currentScrollTop + clientHeight >= scrollHeight - 1
                            ) {
                                // Trigger the event only once
                                isEventTriggered = true;

                                // Load more data
                                that.skip += that.top;
                                // if (that.byId("idAssemblyBoxAR").getSelectedItems().length > 0)
                                //     return;
                                // if (that.Rows.includes("Unique Id")) {
                                //     that.ScrollCount += 1;
                                //     if (that.ExistAssembly.length / 10 < that.ScrollCount)
                                //         that.loadData(that.weekType);
                                //     else {
                                //         that.slicePivot(
                                //             that.ExistAssembly.length / that.ScrollCount
                                //         );
                                //     }
                                // } else that.loadData(that.weekType);
                                // that.filterAssembly(that.pivotData);
                                that.loadData(that.weekType);

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
            buildODataQuery(groupbyFields, measures, filter, startDate, endDate) {
                const filterConditions = [];

                for (const [key, value] of Object.entries(filter)) {
                    if (value === null || value === undefined) {
                        continue;
                    }

                    if (typeof value === 'object' && value.items && Array.isArray(value.items)) {
                        if (value.items.length > 0) {
                            if (value.items.length === 1) {
                                filterConditions.push(`${key} eq '${value.items[0].key}'`);
                            } else {
                                const orConditions = value.items
                                    .map(item => `${key} eq '${item.key}'`)
                                    .join(' or ');
                                filterConditions.push(`(${orConditions})`);
                            }
                        }
                    }
                    else if (typeof value === 'string') {
                        filterConditions.push(`${key} eq '${value}'`);
                    }
                }

                filterConditions.push("REQ_TYPE eq 'OD'");
                filterConditions.push("TYPE eq 'PI'");

                if (startDate) {
                    filterConditions.push(`WEEK_STARTDATE ge ${startDate}`);
                }
                if (endDate) {
                    filterConditions.push(`WEEK_ENDDATE le ${endDate}`);
                }

                const filterClause = `filter(${filterConditions.join(' and ')})`;

                const groupbyClause = groupbyFields.join(',');

                const aggregateClause = measures.map(measure => {
                    const operation = measure.operation;
                    const field = measure.field;
                    const alias = `${field}_${operation.toUpperCase()}`;
                    return `${field} with ${operation} as ${alias}`;
                }).join(',');

                const query = `${filterClause}/groupby((${groupbyClause}),aggregate(${aggregateClause}))`;

                return query;
            },
            loadData: async function (sField) {
                that.weekType = sField;

                const filterData = that.byId("smartFilterBarAR").getFilterData();
                // filterData.USER = that.sUser;
                // filterData.USER = '';
                let groupbyFields = [
                    "LOCATION_ID",
                    "LOCATION_DESC",
                    "PRODUCT_ID",
                    "PROD_DESC",
                    "ASSEMBLY",
                    "ITEM_NUM",
                    "ASM_DESC",
                    "MODEL_VERSION",
                    "VERSION",
                    "VERSION_NAME",
                    "SCENARIO",
                    "SCENARIO_NAME",
                    "RULE_TYPE",
                    "REF_PRODID",
                    "FACTORY_LOC",
                    // "MRP_GROUP",
                    // "MRP_TYPE",
                    // "PHANTOM_IND",
                    // "CONFIGURABLE",
                    "REQ_TYPE",
                    "TYPE",
                    // "WEEK_STARTDATE",
                    sField,
                ],
                    measures = [
                        { field: "CIR_ASMB_QTY", operation: "sum" },
                        { field: "ACTUAL_QTY", operation: "sum" },
                        { field: "TOTAL_QTY", operation: "sum" },
                        { field: "PROD_DEM", operation: "max" },
                        { field: "COEFFICIENTS", operation: "average" },
                        { field: "CIR_QTY", operation: "sum" },
                    ];
                let entity = "getAssemblyCompQty";
                const qtyType = that.byId("idTypeSegmentAR")?.getSelectedKey() || "Assembly";
                that.qtyType = qtyType;
                if (qtyType === "Component") {
                    entity = "getAsmbCompBOM";
                    measures = [
                        { field: "TOTAL_COMPONENT_QTY", operation: "sum" }
                    ];
                    groupbyFields.push("COMPONENT");
                } else {
                    groupbyFields.push("MRP_GROUP");
                    groupbyFields.push("MRP_TYPE");
                }

                function toLocalDateString(date) {
                    const d = new Date(date);
                    // Format as YYYY-MM-DD using local time
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    return `${year}-${month}-${day}`;
                }

                const startVal = toLocalDateString(that.byId("idDaterangeAR").getDateValue());
                const endVal = toLocalDateString(that.byId("idDaterangeAR").getSecondDateValue());

                const foundobj = that.calWeekData.find(f =>
                    toLocalDateString(f.WEEK_STARTDATE) <= startVal &&
                    toLocalDateString(f.WEEK_ENDDATE) >= startVal
                );

                const vFromDate = toLocalDateString(foundobj.WEEK_STARTDATE);


                let query = that.buildODataQuery(groupbyFields, measures, filterData, vFromDate, endVal);


                let model = that.cModel;

                if (sField === "TELESCOPIC_WEEK" && qtyType === "Assembly") {
                    entity = "getAssemblyCompTelescopic";
                    model = that.oModel;
                    const replaceDateFields = (str) => str.replace(/WEEK_STARTDATE/g, 'PERIODSTART').replace(/WEEK_ENDDATE/g, 'PERIODEND');
                    query = replaceDateFields(query);
                }


                that.byId("pivotPageAR").setBusy(true);
                try {

                    const urlParameters = {
                        $apply: query + '/orderby(LOCATION_ID,ASSEMBLY)',
                        $skip: that.skip,
                        $top: that.top, //batch sizeyyyyyyyyyyyyyyyy
                    };
                    const res = await that.readModel(
                        model,
                        entity,
                        urlParameters
                    );
                    if (res.length === that.top)
                        that.hasMoreData = true;
                    else
                        that.hasMoreData = false;
                    that.allData.push(...res);
                    that.allData = that.sort(that.allData);

                    if (qtyType === "Assembly") {
                        const curKeys = that.KeysFromLabel();
                        const SumData = that.aggregateFlexible(
                            that.allData,
                            [...curKeys, [that.weekType]],
                            {
                                ACTUAL_QTY_SUM: "sum",
                                CIR_ASMB_QTY_SUM: "sum",
                                TOTAL_QTY_SUM: "sum",
                                PROD_DEM_MAX: "fixed",
                            }
                        );
                        that.pivotData = that.addTypeToData($.extend(true, [], SumData));
                        that.Val = ["Value"];
                    } else {
                        that.pivotData = that.allData;
                        that.Val = ["Component Quantity"];
                    }
                    that.loadPivotTab(
                        that.pivotData,
                        that.Rows,
                        that.Val
                    );
                    // that.saveDefaultVariant();
                    that.dataReady = true;
                } catch (error) {
                    console.error(error);
                    that.dataReady = true;
                    that.byId("pivotPageAR").setBusy(false);
                    MessageToast.show(error.message);
                }
            },
            sort(data) {
                for (let i = 0; i < data.length; i++) {
                    const element = data[i];
                    let CalObj = null;
                    CalObj = that.calWeekData.find(
                        (o) => o[that.weekType] === element[that.weekType]
                    );
                    if (CalObj) element.date = CalObj.WEEK_STARTDATE; // the date might not be monday but fine for sorting;
                }
                return data.sort((a, b) => new Date(a.date) - new Date(b.date));
            },
            getFilters() {
                var aTableFilters = that.FilterBar.getFilterGroupItems().reduce(
                    function (aResult, oFilterGroupItem) {
                        var oControl = oFilterGroupItem.getControl();
                        var aSelectedKeys, aFilters;
                        if (oControl.getTokens) {
                            aSelectedKeys =
                                oControl && oControl.getTokens() ? oControl.getTokens() : [];
                            aFilters = aSelectedKeys.map(function (sSelectedKey) {
                                return new Filter({
                                    path: oFilterGroupItem.getName(),
                                    operator: FilterOperator.EQ,
                                    value1: sSelectedKey.getKey(),
                                });
                            });
                        } else {
                            aSelectedKeys = oControl.getValue();
                            aFilters = [
                                new Filter({
                                    path: oFilterGroupItem.getName(),
                                    operator: FilterOperator.EQ,
                                    value1: aSelectedKeys,
                                }),
                            ];
                        }
                        if (aSelectedKeys.length > 0) {
                            aResult.push(
                                new Filter({
                                    filters: aFilters,
                                    and: false,
                                })
                            );
                        }
                        return aResult;
                    },
                    []
                );
                return aTableFilters;
            },
            readAllData(entity, urlParameters, filter = []) {
                let allResults = [];
                let skip = 0;
                const top = urlParameters.$top || 20000; // Use provided top or default to 20,000

                // Function to recursively fetch data
                const fetchData = async () => {
                    // Create a copy of urlParameters and update skip
                    const currentUrlParameters = { ...urlParameters, $skip: skip };

                    try {
                        const { promise, resolve, reject } = Promise.withResolvers();
                        that.cModel.read(`/${entity}`, {
                            filters: filter,
                            urlParameters: currentUrlParameters,
                            success(oRes) {
                                resolve(oRes.results);
                            },
                            error(oError) {
                                reject(oError);
                            },
                        });
                        const results = await promise;

                        // Add results to collection
                        allResults = allResults.concat(results);

                        // Check if more data is available
                        if (results.length === top) {
                            // Update skip for next batch
                            skip += top;
                            // Recursively fetch more data
                            return await fetchData();
                        } else {
                            // All data retrieved
                            return allResults;
                        }
                    } catch (error) {
                        throw error;
                    }
                };

                // Start fetching data
                return fetchData();
            },
            readModel(oModel, entity, urlParameters, filter = []) {
                try {
                    const { promise, resolve, reject } = Promise.withResolvers();
                    oModel.read(`/${entity}`, {
                        filters: filter,
                        urlParameters: urlParameters,
                        success(oRes) {
                            return resolve(oRes.results);
                        },
                        error(oError) {
                            return reject(oError);
                        },
                    });
                    return promise;
                } catch (error) {
                    throw error;
                }
            },
            addTypeToData(rawData) {
                let selType = that.KeyFig;
                that.coeffcinat = [];
                that.coeffcinatMap = {};
                if (!selType || !selType.length)
                    selType = ["Total Component Quantity"]; // selected types
                const ProcessData = [];
                that.coef = [];
                for (let i = 0; i < rawData.length; i++) {
                    const el = rawData[i];

                    for (let j = 0; j < selType.length; j++) {
                        const type = selType[j];

                        if (type === "Actual Component Quantity") {
                            ProcessData.push({
                                ...el,
                                Type: "Actual Component Quantity",
                                Value: el.ACTUAL_QTY_SUM,
                            });
                        }

                        if (type === "Unconsumed Component Quantity") {
                            ProcessData.push({
                                ...el,
                                Type: "Unconsumed Component Quantity",
                                Value: el.CIR_ASMB_QTY_SUM,
                            });
                        }
                        if (type === "Total Component Quantity") {
                            ProcessData.push({
                                ...el,
                                Type: "Total Component Quantity",
                                Value: el.TOTAL_QTY_SUM
                            });
                        }
                        if (type === "Net Component Quantity") {
                            ProcessData.push({
                                ...el,
                                Type: "Net Component Quantity",
                                Value: el.CIR_ASMB_QTY_SUM,
                            });
                        }
                        if (type === "Product Demand") {
                            ProcessData.push({
                                ...el,
                                Type: "Product Demand",
                                Value: el.PROD_DEM_MAX,
                            });
                        }
                        if (type === "Coefficients") {
                            function calculateCoef(el) {
                                // Ensure both values exist and are numbers
                                const totalQty = Number(el?.TOTAL_QTY_SUM);
                                const prodDem = Number(el?.PROD_DEM_MAX);

                                // Handle invalid numbers
                                if (isNaN(totalQty) || isNaN(prodDem)) {
                                    return 0; // or null, depending on what you want
                                }

                                // Handle division by zero
                                if (prodDem === 0) {
                                    return totalQty === 0 ? 0 : Infinity; // or null, depending on requirements
                                }

                                // Normal case
                                return totalQty / prodDem;
                            }
                            const coef = calculateCoef(el);

                            ProcessData.push({
                                ...el,
                                Type: "Coefficients",
                                Value: coef.toFixed(2),
                            });
                            that.coef.push(coef.toFixed(2));
                        }
                    }
                }
                return ProcessData;
            },
            aggregateFlexible(data, groupByKeys, aggregationConfig) {
                const result = {};
                const countMap = {};

                data.forEach((item) => {
                    const groupKey = groupByKeys.map((k) => item[k]).join("|");

                    if (!result[groupKey]) {
                        // Start with a shallow copy of the first item (keep all fields)
                        result[groupKey] = { ...item };

                        // Make sure all aggregation fields are initialized properly
                        for (const [field, method] of Object.entries(aggregationConfig)) {
                            if (method === "sum" || method === "avg") {
                                result[groupKey][field] = 0;
                            } else if (method === "fixed") {
                                result[groupKey][field] = item[field];
                            }
                        }

                        countMap[groupKey] = 0;
                    }

                    countMap[groupKey]++;

                    // Aggregate sum and avg fields
                    for (const [field, method] of Object.entries(aggregationConfig)) {
                        if (method === "sum" || method === "avg") {
                            result[groupKey][field] += item[field] || 0;
                        }
                    }
                });

                // Finalize averages
                for (const groupKey in result) {
                    for (const [field, method] of Object.entries(aggregationConfig)) {
                        if (method === "avg") {
                            result[groupKey][field] =
                                result[groupKey][field] / countMap[groupKey];
                        }
                    }
                }

                return Object.values(result);
            },
            KeysFromLabel() {
                let selectLabel = [],
                    curRow = JSON.parse(JSON.stringify(that.Rows));
                curRow = curRow.filter(r => r !== "Type")
                curRow.forEach((label) => {
                    let key = "";
                    switch (label) {
                        case "Manufacturing Location":
                            key = "LOCATION_ID";
                            break;
                        case "Manufacturing Location Description":
                            key = "LOCATION_DESC";
                            break;
                        case "Product":
                            key = "PRODUCT_ID";
                            break;
                        case "Product Description":
                            key = "PROD_DESC";
                            break;
                        case "Item Number":
                            key = "ITEM_NUM";
                            break;
                        case "Assembly":
                            key = "ASSEMBLY";
                            break;
                        case "Assembly Description":
                            key = "ASM_DESC";
                            break;
                        case "Week Date":
                            key = "WEEK_DATE";
                            break;
                        case "Model Version":
                            key = "MODEL_VERSION";
                            break;
                        case "Version":
                            key = "VERSION";
                            break;
                        case "Scenario":
                            key = "SCENARIO";
                            break;
                        case "Rule Type":
                            key = "RULE_TYPE";
                            break;
                        case "Configurable Product":
                            key = "REF_PRODID";
                            break;
                        case "Assembly Manufacturing Location":
                            key = "FACTORY_LOC";
                            break;
                        case "MRP Group":
                            key = "MRP_GROUP";
                            break;
                        case "MRP Type":
                            key = "MRP_TYPE";
                            break;
                        case "Phantom Index":
                            key = "PHANTOM_IND";
                            break;
                        case "Configurable":
                            key = "CONFIGURABLE";
                            break;
                        case "Request Type":
                            key = "REQ_TYPE";
                            break;
                        case "Assembly Quantity":
                            key = "ASMB_QTY";
                            break;
                        case "Unique Id":
                            key = "UNIQUE_ID";
                            break;
                        case "TYPE":
                            key = "TYPE";
                            break;
                        default:
                            key = label;
                            break;
                    }
                    selectLabel.push(key);
                });
                return selectLabel;
            },
            onTogglePress: function (oEvent) {
                const oButton = oEvent.getSource();
                const $btn = oButton.$();
                const bPressed = oButton.getPressed();
                const newText = bPressed ? "Telescopic View" : "Calendar View";

                // A single duration for a consistent animation speed
                const animationDuration = 500; // ms

                // Set transform origin for a centered scale effect
                $btn.css("transform-origin", "50% 50%");

                // Animate out by shrinking horizontally
                $({ animValue: 1 }).animate(
                    { animValue: 0 },
                    {
                        duration: animationDuration,
                        easing: "swing", // Optional: for a more natural feel
                        step: function (now) {
                            // 'now' progresses from 1 to 0
                            // Apply this progress to both scaleX and opacity
                            $btn.css({
                                transform: `scaleX(${now})`,
                                opacity: now,
                            });
                        },
                        complete: function () {
                            // --- Animation Out Complete ---

                            // 1. Update the text while the button is invisible
                            oButton.setText(newText);

                            // 2. Animate in by expanding horizontally
                            $({ animValue: 0 }).animate(
                                { animValue: 1 },
                                {
                                    duration: animationDuration,
                                    easing: "swing",
                                    step: function (now) {
                                        // 'now' progresses from 0 to 1
                                        $btn.css({
                                            transform: `scaleX(${now})`,
                                            opacity: now,
                                        });
                                    },
                                }
                            );
                        },
                    }
                );
                const selectedItem = bPressed ? "Telescopic View" : "Calendar View";
                that.skip = 0;
                if (selectedItem == "Calendar View") {
                    that.setDateRange("enable", "", 3);
                } else {
                    that.setDateRange("disable", 2);
                }
                that.onGo();
            },
            onChangeType() {
                const qtyType = that.byId("idTypeSegmentAR")?.getSelectedKey() || "Assembly";
                that.onGo();
                if (qtyType === "Assembly")
                    that.oGModel.setProperty("/TypeAssemb", true);
                else
                    that.oGModel.setProperty("/TypeAssemb", false);
            },
            setDateRange(mode = "disable", years = 2, months = 3) {
                const oDateL = new Date();
                const oDateH = new Date();
                const oDateRange = that.byId("idDaterangeAR");
                if (mode === "disable") {
                    // Disable mode: tomorrow + specified years
                    oDateH.setFullYear(oDateL.getFullYear() + years);
                    oDateRange.setEnabled(false);
                    oDateRange.setDateValue(oDateL);
                    oDateRange.setSecondDateValue(oDateH);
                } else if (mode === "enable") {
                    // Enable mode: tomorrow + specified months
                    oDateH.setMonth(oDateL.getMonth() + months);
                    oDateRange.setEnabled(true);
                    oDateRange.setDateValue(oDateL);
                    oDateRange.setSecondDateValue(oDateH);
                }
                oDateRange.setMinDate(new Date());
            },
            onClear: function () {
                that.oGModel.setProperty("/showPivot", false);
                that.oGModel.setProperty("/tableType", "Table");
                that.byId("pivotPageAR").setBusy(false);
                var newDiv = document.createElement("div");
                that.setDateRange("disable", 2);
                newDiv.id = `pivotGrid`;
                newDiv.textContent = "";
                that.oGModel.setProperty("/OverFlow", false);
                that.KeyFig = ["Total Component Quantity"];
                // that.byId("idAssemblyBoxAR").setModel(new JSONModel());
                var existingDiv = document.querySelector(`[id*='mainDivAR']`);
                if (existingDiv.children.length > 0) {
                    while (existingDiv.firstChild) {
                        existingDiv.removeChild(existingDiv.firstChild);
                    }
                }

                // const oVersionCtrl = that.FilterBar.getControlByKey("VERSION_NAME");
                // const oScenarioCtrl = that.FilterBar.getControlByKey("SCENARIO_NAME");
                // if (oVersionCtrl) {
                //     oVersionCtrl.setValue("Base Version");
                //     oVersionCtrl.setValueState("None");
                //     oVersionCtrl.fireChange({ value: "Base Version" }); // forces sync
                // }

                // if (oScenarioCtrl) {
                //     oScenarioCtrl.setValue("_PLAN");
                //     oScenarioCtrl.setValueState("None");
                //     oScenarioCtrl.fireChange({ value: "_PLAN" });
                // }
            },
            changeLabel: function (json) {
                const headers = [];
                const keys = Object.keys(json[0]);
                keys.forEach((key) => {
                    let label;
                    switch (key) {
                        case "LOCATION_ID":
                            label = "Manufacturing Location";
                            break;
                        case "LOCATION_DESC":
                            label = "Manufacturing Location Description";
                            break;
                        case "PRODUCT_ID":
                            label = "Product";
                            break;
                        case "PROD_DESC":
                            label = "Product Description";
                            break;
                        case "ITEM_NUM":
                            label = "Item Number";
                            break;
                        case "ASSEMBLY":
                            label = "Assembly";
                            break;
                        case "COMPONENT":
                            label = "Component";
                            break;
                        case "PARENT":
                            label = "Parent";
                            break;
                        case "ASM_DESC":
                            label = "Assembly Description";
                            break;
                        case "WEEK_DATE":
                            label = "Week Date";
                            break;
                        case "MODEL_VERSION":
                            label = "Model Version";
                            break;
                        case "VERSION":
                            label = "Version";
                            break;
                        case "VERSION_NAME":
                            label = "Version Description";
                            break;
                        case "SCENARIO":
                            label = "Scenario";
                            break;
                        case "SCENARIO_NAME":
                            label = "Scenario Description";
                            break;
                        case "RULE_TYPE":
                            label = "Rule Type";
                            break;
                        case "REF_PRODID":
                            label = "Configurable Product";
                            break;
                        case "FACTORY_LOC":
                            label = "Assembly Manufacturing Location";
                            break;
                        case "MRP_GROUP":
                            label = "MRP Group";
                            break;
                        case "MRP_TYPE":
                            label = "MRP Type";
                            break;
                        case "PHANTOM_IND":
                            label = "Phantom Index";
                            break;
                        case "CONFIGURABLE":
                            label = "Configurable";
                            break;
                        case "REQ_TYPE":
                            label = "Request Type";
                            break;
                        case "ASMB_QTY":
                            label = "Assembly Quantity";
                            break;
                        case "CIR_QTY_SUM":
                            label = "Forecast Order Quantity";
                            break;
                        case "TOTAL_COMPONENT_QTY_SUM":
                            label = "Component Quantity";
                            break;
                        case "CIR_ASMB_QTY":
                            label = "Unconsumed Component Quantity";
                            break;
                        case "ACTUAL_QTY_SUM":
                            label = "Actual Component Quantity";
                            break;
                        case "TOTAL_QTY_SUM":
                            label = "Total Component Quantity";
                            break;
                        case "CIR_ASMB_QTY_SUM":
                            label = "Unconsumed Component Quantity";
                            break;
                        case "PROD_DEM_MAX":
                            label = "Product Demand";
                            break;
                        case "COEFFICIENTS_AVERAGE":
                            label = "Coefficients";
                            break;
                        case "UNIQUE_ID":
                            label = "Unique Id";
                            break;
                        case "CALENDAR_WEEK":
                            label = "Calendar Week";
                            break;
                        case "TELESCOPIC_WEEK":
                            label = "Telescopic Week";
                            break;
                        case "TYPE":
                            label = "TYPE";
                            break;
                        default:
                            label = key;
                            break;
                    }
                    headers.push(label);
                });
                that.headers = [
                    ...new Set([
                        "Manufacturing Location",
                        "Product",
                        "Assembly Manufacturing Location",
                        "Assembly",
                        "Unique Id",
                        "Type",
                        ...headers,
                    ]),
                ];
                const data = json.map((item) => Object.values(item));
                return [headers, ...data];
            },
            loadPivotTab: function (data, rows, val) {
                const pivotPage = that.byId("pivotPageAR"),
                    existingDiv = document.querySelector(`[id*='mainDivAR']`);
                that.oGModel.setProperty("/OverFlow", true);

                if (!data.length) {
                    that.oGModel.setProperty("/showPivot", false);
                    pivotPage.setBusy(false);

                    if (existingDiv?.children.length) {
                        existingDiv.innerHTML = "";
                    }

                    return MessageToast.show("No Data");
                }

                that.oGModel.setProperty("/showPivot", true);
                that.isTableBarChart = true;

                if (existingDiv?.children.length) {
                    existingDiv.innerHTML = "";
                }

                const newDiv = document.createElement("div");
                newDiv.id = "pivotGrid";
                existingDiv.appendChild(newDiv);

                const pivotDiv = document.getElementById("pivotGrid");

                if (!(window.jQuery && window.jQuery.fn.pivot)) {
                    console.error("Pivot.js or jQuery is not loaded yet.");
                    pivotPage.setBusy(false);
                    return;
                }

                let pivotData = that.changeLabel(data),
                    finalRows = rows || that.Rows,
                    finalVal = val || ["Value"],
                    tableType = that.oGModel.getProperty("/tableType") || "Table",
                    cols =
                        that.weekType === "CALENDAR_WEEK"
                            ? "Calendar Week"
                            : "Telescopic Week";

                that.Rows = finalRows;
                that.Val = finalVal;


                const header = pivotData[0];

                if (that.qtyType === "Component") {
                    // Remove "Type" if it exists
                    finalRows = finalRows.filter(r => r !== "Type");

                    // Rename Assembly → Component
                    // let idx = header.indexOf("Assembly");
                    // if (idx !== -1) header[idx] = "Component";
                    let idx = finalRows.indexOf("Assembly");
                    if (idx !== -1) finalRows[idx] = "Component";

                    // // Rename Product → Parent
                    // idx = header.indexOf("Product");
                    // if (idx !== -1) header[idx] = "Parent";
                    // idx = finalRows.indexOf("Product");
                    // if (idx !== -1) finalRows[idx] = "Parent";
                }
                else {
                    // Ensure "Type" exists
                    if (!finalRows.includes("Type")) finalRows.push("Type");

                    // Rename Component → Assembly
                    // let idx = header.indexOf("Component");
                    // if (idx !== -1) header[idx] = "Assembly";
                    let idx = finalRows.indexOf("Component");
                    if (idx !== -1) finalRows[idx] = "Assembly";

                    // Rename Parent → Product
                    // idx = header.indexOf("Parent");
                    // if (idx !== -1) header[idx] = "Product";
                    // idx = finalRows.indexOf("Parent");
                    // if (idx !== -1) finalRows[idx] = "Product";
                }

                $(pivotDiv).pivotUI(pivotData, {
                    rows: finalRows,
                    cols: [cols],
                    vals: finalVal,
                    aggregatorName: "Sum",
                    rendererName: tableType,
                    sorters: {
                        [cols]: () => 0,
                        Type: () => 0,
                    },
                    showUI: false,
                    rendererOptions: {
                        table: {
                            colTotals: false,
                            rowTotals: false,
                            clickCallback: function (e, value, filters, pivotData) {
                                if (!that.firstScroll) {
                                    that.firstScroll = true;
                                    setTimeout(() => {
                                        that.firstScroll = undefined;
                                    }, 300);
                                    return
                                }

                                if (filters.Component)
                                    that.loaduniqueIDTableForComp(value, filters);
                                else
                                    that.loaduniqueIDTable(value, filters);

                            }
                        },
                    },
                    renderers: $.extend(
                        $.pivotUtilities.renderers,
                        $.pivotUtilities.plotly_renderers
                    ),
                });

                setTimeout(() => {
                    that.pvtRenderer = $(".pvtRenderer");
                }, 300);

                if (tableType.includes("Table") || tableType.includes("Heatmap")) {
                    $(".mainDivClass").ready(function () {
                        that.loadPivotCss();
                    });
                } else {
                    setTimeout(that.ChartWidth, 100);
                }
                pivotPage.setBusy(false);
            },
            async loaduniqueIDTable(value, filters) {

                if (filters.Type === "Product Demand" || filters.Type === "Coefficients")
                    return;
                this.getView().setBusy(true);
                try {
                    function groupAndSumByTelescopicWeekAndUniqueId(dataArray) {
                        // Fields to sum
                        const fieldsToSum = [
                            'CIR_ASMB_QTY',
                            'ACTUAL_QTY',
                            'TOTAL_QTY',
                            'CIR_QTY'
                        ];

                        // Group by TELESCOPIC_WEEK and UNIQUE_ID
                        const grouped = dataArray.reduce((acc, item) => {
                            const week = item[that.weekType];
                            const uniqueId = item.UNIQUE_ID;
                            // const key = `${week}_${uniqueId}`; // Create composite key
                            const key = `${item.LOCATION_ID}_${item.PRODUCT_ID}_${item.ASSEMBLY}_${week}_${uniqueId}`

                            if (!acc[key]) {
                                // Create new group with first item as base
                                acc[key] = { ...item };
                            } else {
                                // Sum the specified fields
                                fieldsToSum.forEach(field => {
                                    const currentValue = acc[key][field] || 0;
                                    const newValue = item[field] || 0;
                                    acc[key][field] = Number(currentValue) + Number(newValue);
                                });
                            }

                            return acc;
                        }, {});

                        // Convert back to array
                        return Object.values(grouped);
                    }
                    const week = that.weekType === "CALENDAR_WEEK" ? 'Calendar Week' : 'Telescopic Week';

                    let locFiedd = "LOCATION_ID", prodField = "PRODUCT_ID", AsmField = "ASSEMBLY";
                    let loclabel = "Manufacturing Location", prodlabel = "Product", aslabel = "Assembly";
                    if (!filters["Manufacturing Location"]) {
                        locFiedd = "LOCATION_DESC";
                        loclabel = "Manufacturing Location Description";
                    }
                    if (!filters.Product) {
                        prodField = "PROD_DESC";
                        prodlabel = "Product Description";
                    }
                    if (!filters.Assembly) {
                        AsmField = "ASM_DESC";
                        aslabel = "Assembly Description";
                    }
                    const filterData = that.byId("smartFilterBarAR").getFilterData()

                    // let uniqueIdFilters = filterData.UNIQUE_ID?.items.map(k =>
                    //     new Filter("UNIQUE_ID", FilterOperator.EQ, k.key)
                    // ) || [];
                    const aFilter = [
                        // new Filter(locFiedd, FilterOperator.EQ, filters[loclabel]),
                        // new Filter(prodField, FilterOperator.EQ, filters[prodlabel]),
                        new Filter(that.weekType, FilterOperator.EQ, filters[week]),
                        // new Filter("ASSEMBLY", FilterOperator.EQ, filters.Assembly),
                        new Filter("VERSION_NAME", FilterOperator.EQ, filterData.VERSION_NAME),
                        new Filter("SCENARIO_NAME", FilterOperator.EQ, filterData.SCENARIO_NAME),
                        // new Filter(uniqueIdFilters, false), // false = OR condition for UNIQUE_IDs
                        new Filter("REQ_TYPE", FilterOperator.EQ, "OD"),
                        new Filter("TYPE", FilterOperator.EQ, "PI"),
                        // new Filter("USER", FilterOperator.EQ, that.sUser)
                    ];
                    if (filters["Assembly Manufacturing Location"])
                        aFilter.push(new Filter("FACTORY_LOC", FilterOperator.EQ, filters["Assembly Manufacturing Location"]))

                    if (filters[loclabel])
                        aFilter.push(new Filter(locFiedd, FilterOperator.EQ, filters[loclabel]))

                    if (filters[prodlabel])
                        aFilter.push(new Filter(prodField, FilterOperator.EQ, filters[prodlabel]))

                    if (filters[aslabel])
                        aFilter.push(new Filter(AsmField, FilterOperator.EQ, filters[aslabel]))
                    let oMultiFilter = new Filter(aFilter, true);

                    let tabledata = await that.readAllData(
                        "getAssemblyCompQty",
                        { $top: 50000 }, [oMultiFilter]
                    );

                    let uniqueIdFilters = filterData.UNIQUE_ID?.items.map(k => k.key) || [];
                    if (uniqueIdFilters.length)
                        tabledata = tabledata.filter(o => uniqueIdFilters.includes(o.UNIQUE_ID + ""));


                    if (!(tabledata && tabledata.length)) {
                        this.getView().setBusy(false);
                        return MessageToast.show("No Assembly Found");
                    }


                    tabledata = groupAndSumByTelescopicWeekAndUniqueId(tabledata);
                    // tabledata = that.removeDuplicate(tabledata, "UNIQUE_ID");

                    const UniID = [...new Set(tabledata.map(o => Number(o.UNIQUE_ID)))];
                    const dateObj = that.calWeekData.find(o => o[that.weekType] === filters[week]);

                    const urlParameters = {
                        LOCATION_ID: JSON.stringify([tabledata[0].FACTORY_LOC]),
                        PLANNING_LOC: JSON.stringify([]),
                        UNIQUE_ID: JSON.stringify(UniID),
                        PRODUCT_ID: JSON.stringify([tabledata[0].PRODUCT_ID]),
                        VERSION: JSON.stringify([tabledata[0].VERSION]),
                        SCENARIO: JSON.stringify([tabledata[0].SCENARIO]),
                        FROMDATE: new Date(dateObj.WEEK_STARTDATE.setDate(dateObj.WEEK_STARTDATE.getDate() - 1))
                            .toISOString()
                            .split("T")[0],
                        TODATE: dateObj.WEEK_ENDDATE.toISOString().split('T')[0],
                        MODEL_VERSION: "Active",
                        weekType: that.weekType === "CALENDAR_WEEK" ? 'cal' : 'tel'
                    };

                    const [params, Lineres] = await Promise.all([
                        that.callFunction("getForecastCIRTel", urlParameters),
                        that.callFunction("getObjectDepByAssembly", { manLoc: JSON.stringify([filters["Manufacturing Location"]]), Asem: JSON.stringify([filters[aslabel]]) })
                    ]);
                    const res = JSON.parse(params.getForecastCIRTel).res;
                    if (Object.keys(JSON.parse(params.getForecastCIRTel).res).length > 0) {
                        const key = `${tabledata[0].LOCATION_ID}|${tabledata[0].PRODUCT_ID}|${tabledata[0].VERSION}|${tabledata[0].SCENARIO}`
                        const data = res[filters[week]][key].data;
                        tabledata.forEach(item => {
                            item.ACT_QTY = data[item.UNIQUE_ID]?.ACT_QTY ?? 0;
                        })

                    }
                    tabledata.forEach(o => { o.UNIQUE_ID = String(o.UNIQUE_ID) });
                    //Object Dep

                    // const Lineres = await that.callFunction("getObjectDepByAssembly", { manLoc: filters.Location, Asem: filters.Assembly }) || [];
                    const Lines = JSON.parse(Lineres.getObjectDepByAssembly);
                    this.getView().setBusy(false);
                    that.uniqueIDTable.open();
                    sap.ui.getCore().byId("idChartab").setModel(new JSONModel({ results: Lines }));
                    // sap.ui.getCore().byId("codePanel").setHeaderText(`Object Dependency for Assembly: ${filters.Assembly}`);

                    const sumObj = {
                        "ASSEMBLY": "Total:",
                        "UNIQUE_ID": "",
                        "ASMB_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.ASMB_QTY) || 0), 0),
                        "CIR_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.CIR_QTY) || 0), 0),
                        "CIR_ASMB_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.CIR_ASMB_QTY) || 0), 0),
                        "ACT_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.ACT_QTY) || 0), 0),
                        "ACTUAL_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.ACTUAL_QTY) || 0), 0),
                        "TOTAL_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.TOTAL_QTY) || 0), 0)
                    };


                    tabledata.push(sumObj);

                    sap.ui.getCore().byId("idTableAR").setModel(new JSONModel({ assembly: tabledata }));
                    sap.ui.getCore().byId("idTableAR").setMinAutoRowCount(tabledata.length);
                    sap.ui.getCore().byId("idTableAR").setVisibleRowCount(tabledata.length);
                    sap.ui.getCore().byId("idDialogAR").setTitle(`${filters[week] || filters[week]}`);


                    sap.ui.getCore().byId("idLocLabel").setText(tabledata[0].LOCATION_ID);
                    sap.ui.getCore().byId("idProdLabel").setText(tabledata[0].PRODUCT_ID);
                    that.curProd = tabledata[0].REF_PRODID;
                    sap.ui.getCore().byId("idAsmLabel").setText(tabledata[0].ASSEMBLY);
                    sap.ui.getCore().byId("idVerLabel").setText(tabledata[0].VERSION_NAME);
                    sap.ui.getCore().byId("idSceLabel").setText(tabledata[0].SCENARIO_NAME);
                    sap.ui.getCore().byId("idWeekLabel").setText(filters[week]);
                    sap.ui.getCore().byId("idFromLabel").setText(new Date(dateObj.PERIODSTART).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
                    sap.ui.getCore().byId("idToLabel").setText(new Date(dateObj.PERIODEND).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
                } catch (error) {
                    MessageToast.show(error)
                    this.getView().setBusy(false);
                }
            },
            async loaduniqueIDTableForComp(value, filters) {
                if (!filters.Component)
                    return;
                this.getView().setBusy(true);
                try {
                    function groupAndSumByTelescopicWeekAndUniqueId(dataArray) {
                        // Fields to sum
                        const fieldsToSum = [
                            'TOTAL_COMPONENT_QTY'
                        ];

                        // Group by TELESCOPIC_WEEK and UNIQUE_ID
                        const grouped = dataArray.reduce((acc, item) => {
                            const week = item[that.weekType];
                            const uniqueId = item.UNIQUE_ID;
                            const key = `${item.LOCATION_ID}_${item.PRODUCT_ID}_${item.COMPONENT}_${week}_${uniqueId}` // Create composite key

                            if (!acc[key]) {
                                // Create new group with first item as base
                                acc[key] = { ...item };
                            } else {
                                // Sum the specified fields
                                fieldsToSum.forEach(field => {
                                    const currentValue = acc[key][field] || 0;
                                    const newValue = item[field] || 0;
                                    acc[key][field] = Number(currentValue) + Number(newValue);
                                });
                            }

                            return acc;
                        }, {});

                        // Convert back to array
                        return Object.values(grouped);
                    }
                    const week = that.weekType === "CALENDAR_WEEK" ? 'Calendar Week' : 'Telescopic Week';

                    let locFiedd = "LOCATION_ID", prodField = "PRODUCT_ID";
                    let loclabel = "Manufacturing Location", prodlabel = "Product";
                    // let loclabel = "Manufacturing Location", prodlabel = "Parent";
                    if (!filters["Manufacturing Location"]) {
                        locFiedd = "LOCATION_DESC";
                        loclabel = "Manufacturing Location Description";
                    }
                    if (!filters.Product) {
                        prodField = "PROD_DESC";
                        prodlabel = "Product Description";
                    }
                    const filterData = that.byId("smartFilterBarAR").getFilterData()

                    // let uniqueIdFilters = filterData.UNIQUE_ID?.items.map(k =>
                    //     new Filter("UNIQUE_ID", FilterOperator.EQ, k.key)
                    // ) || [];
                    const aFilter = [
                        // new Filter(locFiedd, FilterOperator.EQ, filters[loclabel]),
                        // new Filter(prodField, FilterOperator.EQ, filters[prodlabel]),
                        new Filter(that.weekType, FilterOperator.EQ, filters[week]),
                        new Filter("COMPONENT", FilterOperator.EQ, filters.Component),
                        new Filter("VERSION_NAME", FilterOperator.EQ, filterData.VERSION_NAME),
                        new Filter("SCENARIO_NAME", FilterOperator.EQ, filterData.SCENARIO_NAME),
                        // new Filter(uniqueIdFilters, false), // false = OR condition for UNIQUE_IDs
                        new Filter("REQ_TYPE", FilterOperator.EQ, "OD"),
                        new Filter("TYPE", FilterOperator.EQ, "PI"),
                        // new Filter("USER", FilterOperator.EQ, that.sUser)
                    ]
                    if (filters["Assembly Manufacturing Location"])
                        aFilter.push(new Filter("FACTORY_LOC", FilterOperator.EQ, filters["Assembly Manufacturing Location"]))

                    if (filters[loclabel])
                        aFilter.push(new Filter(locFiedd, FilterOperator.EQ, filters[loclabel]))

                    if (filters[prodlabel])
                        aFilter.push(new Filter(prodField, FilterOperator.EQ, filters[prodlabel]))


                    let oMultiFilter = new Filter(aFilter, true);

                    let tabledata = await that.readAllData(
                        "getAsmbCompBOM",
                        { $top: 50000 }, [oMultiFilter]
                    );

                    let uniqueIdFilters = filterData.UNIQUE_ID?.items.map(k => k.key) || [];
                    if (uniqueIdFilters.length)
                        tabledata = tabledata.filter(o => uniqueIdFilters.includes(o.UNIQUE_ID + ""));


                    if (!(tabledata && tabledata.length)) {
                        this.getView().setBusy(false);
                        return MessageToast.show("No Component Found");
                    }

                    tabledata = groupAndSumByTelescopicWeekAndUniqueId(tabledata);
                    // tabledata = that.removeDuplicate(tabledata, "UNIQUE_ID");

                    tabledata.forEach(o => { o.UNIQUE_ID = String(o.UNIQUE_ID) });
                    const Lineres = await that.callFunction("getObjectDepByAssembly", { manLoc: JSON.stringify([filters["Manufacturing Location"]]), Asem: JSON.stringify([filters.Component]) })
                    const Lines = JSON.parse(Lineres.getObjectDepByAssembly);
                    this.getView().setBusy(false);
                    that.compTable.open();
                    sap.ui.getCore().byId("idChartabCom").setModel(new JSONModel({ results: Lines }));
                    // sap.ui.getCore().byId("codePanelCom").setHeaderText(`Object Dependency for Component: ${filters.Component}`)

                    const sumObj = {
                        "COMPONENT": "Total:",
                        "UNIQUE_ID": "",
                        "TOTAL_COMPONENT_QTY": tabledata.reduce((sum, item) => sum + (Number(item?.TOTAL_COMPONENT_QTY) || 0), 0)
                    };


                    tabledata.push(sumObj);
                    sap.ui.getCore().byId("idTableCompAR").setModel(new JSONModel({ comp: tabledata }));
                    sap.ui.getCore().byId("idDialogCompAR").setTitle(`${filters[week] || filters[week]}`);
                    sap.ui.getCore().byId("idTableCompAR").setMinAutoRowCount(tabledata.length);
                    sap.ui.getCore().byId("idTableCompAR").setVisibleRowCount(tabledata.length);

                    const dateObj = that.calWeekData.find(o => o[that.weekType] === filters[week]);

                    sap.ui.getCore().byId("idLocLabel1").setText(tabledata[0].LOCATION_ID);
                    sap.ui.getCore().byId("idProdLabel1").setText(tabledata[0].PRODUCT_ID);
                    that.curProd = tabledata[0].REF_PRODID;
                    sap.ui.getCore().byId("idAsmLabel1").setText(tabledata[0].COMPONENT);
                    sap.ui.getCore().byId("idVerLabel1").setText(tabledata[0].VERSION_NAME);
                    sap.ui.getCore().byId("idSceLabel1").setText(tabledata[0].SCENARIO_NAME);
                    sap.ui.getCore().byId("idWeekLabel1").setText(filters[week]);
                    sap.ui.getCore().byId("idFromLabel1").setText(new Date(dateObj.PERIODSTART).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
                    sap.ui.getCore().byId("idToLabel1").setText(new Date(dateObj.PERIODEND).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
                } catch (error) {
                    MessageToast.show(error)
                    this.getView().setBusy(false);
                }
            },
            onOpenUniqueIdDialog: async function (e) {
                // Load fragment via Unique.js control
                var oFragment = await that.oUniqueControl.loadUniqueIdFragment();
                // Fetch data from backend
                sap.ui.core.BusyIndicator.show(0);
                that.cModel.callFunction("/getUniqueIdItemsNew", {
                    method: "GET",
                    urlParameters: {
                        PRODUCT_ID: that.curProd,
                        UNIQUE_ID: Number(e.getSource().getBindingContext().getObject().UNIQUE_ID)
                    },
                    success: function (oData) {
                        try {
                            var parsedData = JSON.parse(oData.getUniqueIdItemsNew);
                            var oJSONModel = new sap.ui.model.json.JSONModel({ data: parsedData });
                            oFragment.setModel(oJSONModel, "uniqueIdModel");
                            oFragment.open();
                            sap.ui.core.BusyIndicator.hide(0);
                        } catch (err) {
                            MessageToast.show("Invalid data format returned from service");
                            sap.ui.core.BusyIndicator.hide(0);
                        }
                    },
                    error: function (oError) {
                        MessageToast.show("Failed to load Unique ID items");
                        console.error(oError);
                    }
                });
            },
            onCloseUniquetable() {
                sap.ui.getCore().byId("IdSearchUniqueID_AR").setValue();
                that.uniqueIDTable.close();
            },
            onCloseUniquetableComp() {
                sap.ui.getCore().byId("IdSearchUniqueIDCompAR").setValue();
                that.compTable.close();
            },
            ChartWidth() {
                // Function to make Plotly charts responsive and use full container width

                // Wait for the chart to be fully loaded
                setTimeout(function () {
                    // Find the Plotly chart container
                    const plotContainer = $(".js-plotly-plot");

                    if (!plotContainer.length) {
                        console.error("No Plotly chart found!");
                        return;
                    }

                    // Make the chart container responsive
                    plotContainer.css({
                        width: "100%",
                        "max-width": "100%",
                        height: "auto",
                        "min-height": "400px", // Set a minimum height to ensure visibility
                    });

                    // Make SVG elements responsive
                    $(".main-svg").css({
                        width: "100%",
                        height: "auto",
                    });

                    // Adjust the plot container
                    $(".plot-container").css({
                        width: "100%",
                        "max-width": "100%",
                    });

                    // If Plotly is available, try to properly resize the chart
                    if (window.Plotly) {
                        try {
                            // Get the container's width
                            const containerWidth = plotContainer.parent().width();

                            // Resize the plot to fill the container
                            Plotly.relayout(plotContainer[0], {
                                width: containerWidth,
                                autosize: true,
                            });
                        } catch (e) {
                            console.warn("Could not automatically resize Plotly chart:", e);
                        }
                    }

                    // Add a resize handler to maintain responsiveness
                    $(window)
                        .off("resize.plotlyResponsive")
                        .on("resize.plotlyResponsive", function () {
                            // Debounce the resize event to prevent excessive redrawing
                            clearTimeout(window.plotlyResizeTimer);
                            window.plotlyResizeTimer = setTimeout(function () {
                                if (window.Plotly) {
                                    try {
                                        const containerWidth = plotContainer.parent().width();
                                        Plotly.relayout(plotContainer[0], {
                                            width: containerWidth,
                                        });
                                    } catch (e) {
                                        console.warn("Error resizing chart on window resize:", e);
                                    }
                                }
                            }, 250); // Wait 250ms after resize ends
                        });

                    // If Plotly object isn't available, use CSS-only approach
                    if (!window.Plotly) {
                        console.warn(
                            "Plotly object not found. Using CSS-only approach for responsiveness."
                        );
                        // Ensure the SVG viewBox is set correctly
                        $(".main-svg").each(function () {
                            const svg = $(this);
                            const width = parseFloat(svg.attr("width"));
                            const height = parseFloat(svg.attr("height"));

                            if (width && height) {
                                svg.attr("viewBox", `0 0 ${width} ${height}`);
                                svg.attr("preserveAspectRatio", "xMinYMin meet");
                            }
                        });
                    }
                }, 300); // Give the chart time to render before adjusting
            },
            loadPivotCss() {
                $(".mainDivClass .pvtTable").ready(function () {
                    setTimeout(function () {
                        // Adjust vertical alignment for headers with large rowspan
                        $(".mainDivClass .pvtTable")
                            .find("th[rowspan]")
                            .each(function () {
                                if (parseInt($(this).attr("rowspan")) > 7) {
                                    $(this).css("vertical-align", "top");
                                }
                            });

                        const allWeek = $(".mainDivClass .pvtTable").find("thead tr:first th");

                        if (that.calWeekData && that.calWeekData.length)
                            $(allWeek).each(function (e) {
                                const cellText = $(this).text();

                                if (that.weekType === "TELESCOPIC_WEEK") {
                                    if (that.telMonth.includes(cellText)) {
                                        $(this).css("background-color", "#ced4da");
                                    }

                                    if (that.telQ.includes(cellText)) {
                                        $(this).css("background-color", "#adb5bd");
                                    }

                                    if (e === allWeek.length - 1) {
                                        $(this).css("background-color", "#adb5bd");
                                    }
                                }

                                $(this).addClass("weekHeader");

                                const popoverHtml = `
                    <div class="popover">
                        <div class="popover-content">
                            <div class="date-row">
                                <span class="date-label">From:</span>
                                <span class="From${cellText}">28 April 2025</span>
                            </div>
                            <div class="date-row">
                                <span class="date-label">To:</span>
                                <span class="To${cellText}">05 May 2025</span>
                            </div>
                        </div>
                    </div>`;

                                // Add popover to header cell
                                $(this).append(popoverHtml);

                                // On hover, update date
                                $(this).hover(function () {
                                    that.updateDate(cellText);
                                });
                            });

                        // Freeze columns in thead
                        function freezeHeaderColumns() {
                            const firstHeadRow = $(".mainDivClass .pvtTable").find("thead tr:first");
                            if (firstHeadRow.length) {
                                let widthsHead = [0];
                                const columnsToFreeze = Math.min(2, firstHeadRow.find("th").length);

                                for (let i = 0; i < columnsToFreeze; i++) {
                                    const th = firstHeadRow.find(`th:eq(${i})`);
                                    if (th.length) {
                                        const borderWidth =
                                            parseFloat(th.css("border-left-width") || "0") +
                                            parseFloat(th.css("border-right-width") || "0");
                                        const paddingWidth =
                                            parseFloat(th.css("padding-left") || "0") +
                                            parseFloat(th.css("padding-right") || "0");
                                        const width =
                                            parseFloat(th.css("width") || "0") +
                                            borderWidth +
                                            paddingWidth;
                                        widthsHead.push(widthsHead[i] + width);
                                    }
                                }

                                firstHeadRow.find("th").each(function (index) {
                                    if (index < columnsToFreeze) {
                                        $(this).addClass("frezzThead");
                                        $(this).css("left", `${widthsHead[index]}px`);
                                    }
                                });
                            }

                            const secondHeadRow = $(".mainDivClass .pvtTable").find("thead tr:eq(1)");
                            if (secondHeadRow.length) {
                                let widthsHead2 = [0];
                                const thElements = secondHeadRow.find("th");
                                const columnsToFreeze = thElements.length;

                                for (let i = 0; i < columnsToFreeze; i++) {
                                    const th = thElements.eq(i);
                                    const borderWidth =
                                        parseFloat(th.css("border-left-width") || "0") +
                                        parseFloat(th.css("border-right-width") || "0");
                                    const paddingWidth =
                                        parseFloat(th.css("padding-left") || "0") +
                                        parseFloat(th.css("padding-right") || "0");
                                    const width =
                                        parseFloat(th.css("width") || "0") +
                                        borderWidth +
                                        paddingWidth;
                                    widthsHead2.push(widthsHead2[i] + width);
                                }

                                thElements.each(function (index) {
                                    if (index < columnsToFreeze) {
                                        $(this).addClass("frezzThead");
                                        $(this).css("left", `${widthsHead2[index]}px`);
                                    }
                                });
                            }
                        }

                        // Freeze columns in tbody
                        function freezeBodyColumns() {
                            const tbody = $(".mainDivClass .pvtTable").find("tbody");
                            if (!tbody.length) return;

                            let maxThCount = 0;
                            let referenceRow = null;

                            tbody.find("tr").each(function () {
                                const thCount = $(this).find("th").length;
                                if (thCount > maxThCount) {
                                    maxThCount = thCount;
                                    referenceRow = $(this);
                                }
                            });

                            if (!referenceRow || maxThCount === 0) return;

                            let widths = [0];
                            for (let i = 0; i < maxThCount; i++) {
                                const th = referenceRow.find(`th:eq(${i})`);
                                if (th.length) {
                                    const borderWidth =
                                        parseFloat(th.css("border-left-width") || "0") +
                                        parseFloat(th.css("border-right-width") || "0");
                                    const paddingWidth =
                                        parseFloat(th.css("padding-left") || "0") +
                                        parseFloat(th.css("padding-right") || "0");
                                    const width =
                                        parseFloat(th.css("width") || "0") +
                                        borderWidth +
                                        paddingWidth;
                                    widths.push(widths[i] + width);
                                }
                            }

                            tbody.find("tr").each(function () {
                                const thElements = $(this).find("th");
                                const currentThCount = thElements.length;

                                thElements.each(function (index) {
                                    let positionIndex = index;
                                    if (currentThCount < maxThCount) {
                                        positionIndex += maxThCount - currentThCount;
                                    }
                                    $(this).addClass("frezz");
                                    $(this).css("left", `${widths[positionIndex]}px`);
                                });
                            });
                        }

                        // Format number cells
                        function formatCells() {
                            $(".mainDivClass .pvtTable")
                                .find("td")
                                .each(function () {
                                    let cellText = $(this).text().trim();
                                    if (cellText === "") {
                                        $(this).text("0");
                                    }
                                    let rowHeader = $(".pvtTable").find(`tr:eq(${$(this).parent().index() + 2})`).find("th:first")[0].textContent;
                                    if (that.KeyFig.length == 1 || that.KeyFig[0] === 'Coefficients')
                                        rowHeader = $(".pvtTable").find(`tr:eq(${$(this)?.parent()?.index() + 2}) th`).filter((_, th) => $(th).text().trim() === "Coefficients").length > 0 ? 'Coefficients' : "";
                                    if (rowHeader !== 'Coefficients' && cellText.includes(".")) {
                                        $(this).text(cellText.split(".")[0]);
                                    }
                                    if (rowHeader !== 'Coefficients' && rowHeader !== 'Product Demand') {
                                        $(this).css("cursor", "pointer").addClass("clickable-cell");
                                    }
                                });
                        }

                        freezeHeaderColumns();
                        freezeBodyColumns();

                        formatCells();
                    }, 300);
                });
            },
            updateDate(week) {
                try {
                    const Calendar = Array.isArray(that.calWeekData)
                        ? that.calWeekData.filter((o) => o && o[that.weekType] == week)
                        : [];

                    const fromElem = document.getElementsByClassName(`From${week}`)[0];
                    const toElem = document.getElementsByClassName(`To${week}`)[0];

                    if (Calendar.length === 0) {
                        $(".popover").hide();
                        return;
                    }
                    $(".popover").show();
                    const startDate =
                        Calendar[0]?.PERIODSTART instanceof Date
                            ? Calendar[0].PERIODSTART
                            : new Date(Calendar[0]?.PERIODSTART);
                    const endDate =
                        Calendar[Calendar.length - 1]?.PERIODEND instanceof Date
                            ? Calendar[Calendar.length - 1].PERIODEND
                            : new Date(Calendar[Calendar.length - 1]?.PERIODEND);

                    const startDateStr = isNaN(startDate)
                        ? ""
                        : startDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        });
                    const endDateStr = isNaN(endDate)
                        ? ""
                        : endDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        });

                    if (fromElem) fromElem.innerHTML = startDateStr;
                    if (toElem) toElem.innerHTML = endDateStr;
                } catch (e) {
                    console.error("Error in updateDate:", e);
                }
            },
            onChangeTableType(oEvents) {
                const selectedValue = oEvents.mParameters.value;
                that.oGModel.setProperty("/tableType", selectedValue);
                // Determine if it's a table type or chart type visualization
                const isTableType =
                    selectedValue.includes("Table") || selectedValue.includes("Heatmap");

                that.isTableBarChart = isTableType;

                if (isTableType) {
                    $(".mainDivClass").ready(function () {
                        that.loadPivotCss();
                    });
                } else {
                    setTimeout(that.ChartWidth, 100);
                    // Call function for chart-type visualization
                }
                that.pvtRenderer.val(selectedValue).trigger("change");
            },
            onSearchUniqueId(oEvent) {
                const sValue = oEvent.getParameters().newValue || oEvent.getSource().getValue(),
                    oBinding = oEvent.getSource().getParent().getParent().getBinding();
                if (sValue === "") {
                    oBinding.filter([]);
                    return;
                }
                let filters = [];
                const keyWords = ["UNIQUE_ID"];
                keyWords.forEach(key => {
                    filters.push(new Filter(
                        key,
                        FilterOperator.Contains,
                        sValue
                    ))
                })
                const filter = new Filter(filters);
                oBinding.filter(filter);
            },
            onSelectChart() {
                that.ChartDialog.open();
                that._highlightSelectedTile();
            },
            onCancelVisualizationDialog: function () {
                that.ChartDialog.close();
            },
            onSelectVisualization: function (oEvent) {
                // Get the source of the event (the GenericTile)
                const oTile = oEvent.getSource(),
                    sType = oTile.getCustomData()[0].getValue();
                that.oGModel.setProperty("/tableType", sType);
                // Determine if it's a table type or chart type visualization
                const isTableType =
                    sType.includes("Table") || sType.includes("Heatmap");

                that.isTableBarChart = isTableType;

                if (isTableType) {
                    // Call function for table-type visualization
                    $(".mainDivClass").ready(function () {
                        that.loadPivotCss();
                    });
                } else {
                    // setTimeout(that.ChartWidth, 100);
                    that.ChartWidth();
                    // Call function for chart-type visualization
                }
                that.pvtRenderer.val(sType).trigger("change");
                that.onCancelVisualizationDialog();
            },
            _highlightSelectedTile: function () {
                // Get current selection from model
                var sCurrentType = that.oGModel.getProperty("/tableType");

                // Reset all tiles
                that._resetAllTiles();

                // Find and highlight the current selection
                var sSelectedTileId = "tile-" + sCurrentType.replace(/\s+/g, "");
                var oSelectedTile = sap.ui.getCore().byId(sSelectedTileId);

                if (oSelectedTile) {
                    oSelectedTile.addStyleClass("selected");
                }
            },
            _resetAllTiles: function () {
                // Remove highlighting from all tiles
                var aTileIds = [
                    "tile-TableAR",
                    "tile-TableBarchartAR",
                    "tile-HeatmapAR",
                    "tile-RowHeatmapAR",
                    "tile-ColHeatmapAR",
                    "tile-HorizontalBarChartAR",
                    "tile-HorizontalStackedBarChartAR",
                    "tile-BarChartAR",
                    "tile-StackedBarChartAR",
                    "tile-LineChartAR",
                    "tile-AreaChartAR",
                    "tile-ScatterChartAR",
                ];

                aTileIds.forEach(function (sTileId) {
                    var oTile = sap.ui.getCore().byId(sTileId);
                    if (oTile) {
                        oTile.removeStyleClass("selected");
                    }
                });
            },
            onSelectColumnsSetting: function () {
                that.colSetting.open();
                const table = sap.ui.getCore().byId("idDataTableAR"),
                    columns = [
                        "Manufacturing Location",
                        "Product",
                        "Assembly Manufacturing Location",
                        "Assembly",
                        "Configurable Product",
                        "Item Number",
                        "Version",
                        "Scenario",
                        // "Phantom Index",
                        // "Configurable"
                    ];
                that.table = table;

                if (!that.settingData) {
                    that.settingData = columns.map((field) => {
                        const hasOptions = ["Manufacturing Location", "Product", "Assembly", "Version", "Scenario"].includes(
                            field
                        );

                        return {
                            field: field,
                            select: that.Rows.includes(field),
                            option: hasOptions
                                ? [
                                    {
                                        key: "ID",
                                        text: "ID",
                                    },
                                    {
                                        key: "Description",
                                        text: "Description",
                                    },
                                ]
                                : [],
                        };
                    });
                }
                if (that.qtyType === "Component") {
                    // Rename Assembly → Component
                    let idx = that.settingData.findIndex(d => d.field === "Assembly");
                    if (idx !== -1) that.settingData[idx].field = "Component";

                    // Rename Product → Parent
                    // idx = that.settingData.findIndex(d => d.field === "Product");
                    // if (idx !== -1) that.settingData[idx].field = "Parent";
                }
                else {
                    // Rename Component → Assembly
                    let idx = that.settingData.findIndex(d => d.field === "Component");
                    if (idx !== -1) that.settingData[idx].field = "Assembly";

                    // Rename Parent → Product
                    // idx = that.settingData.findIndex(d => d.field === "Parent");
                    // if (idx !== -1) that.settingData[idx].field = "Product";
                }


                var oModel = new JSONModel({
                    data: that.settingData,
                });
                table.setModel(oModel);
                that.checkSelect();
            },
            checkSelect: function () {
                const table = that.table;
                table.getItems().forEach((item, index) => {
                    const obj = item.getBindingContext().getObject();
                    if (obj.field === "Assembly" || obj.field === "Assembly Manufacturing Location") {
                        item.setSelected(true);
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
            },
            checkSelect2: function () {
                const table = that.table;
                table.getItems().forEach((item, index) => {
                    const obj = item.getBindingContext().getObject();
                    if (obj.select) item.addStyleClass("selectItem");
                    else item.removeStyleClass("selectItem");
                    const icons = item.getCells()[1].getItems();
                    if (index === 0) {
                        icons[0].setVisible(false);
                        icons[2].setVisible(false);
                    } else {
                        icons[0].setVisible(true);
                        icons[2].setVisible(true);
                    }
                    if (index === that.keySettingData.length - 1) {
                        icons[1].setVisible(false);
                        icons[3].setVisible(false);
                    } else {
                        icons[1].setVisible(true);
                        icons[3].setVisible(true);
                    }
                });
            },
            onAddColumn: function () {
                try {
                    const FIELDS_WITH_OPTIONS = ["Manufacturing Location", "Product", "Assembly", "Version", "Scenario"];
                    const dataTable = sap.ui.getCore().byId("idDataTableAR");
                    const selectItems = dataTable.getSelectedItems();
                    const tableData = dataTable.getModel().getData().data;
                    const selectedColumns = tableData
                        .filter((item) => item.select)
                        .map((item) => item.field);
                    that.Rows = selectedColumns.map((col) => {
                        if (!FIELDS_WITH_OPTIONS.includes(col)) {
                            return col;
                        }
                        const selectField = selectItems.find(
                            (item) => item.getBindingContext().getObject().field === col
                        );
                        if (!selectField) {
                            return col;
                        }
                        const selectedKey = selectField.getCells()[1].getSelectedKey();
                        return that._getFormattedColumnName(col, selectedKey);
                    });
                    if (that.qtyType === "Assembly") {
                        const curKeys = that.KeysFromLabel();
                        const SumData = that.aggregateFlexible(
                            that.allData,
                            [...curKeys, [that.weekType]],
                            {
                                ACTUAL_QTY_SUM: "sum",
                                CIR_ASMB_QTY_SUM: "sum",
                                TOTAL_QTY_SUM: "sum",
                                PROD_DEM_MAX: "fixed",
                            }
                        );
                        that.pivotData = that.addTypeToData($.extend(true, [], SumData));
                        that.Val = ["Value"];
                    } else {
                        that.pivotData = that.allData;
                        that.Val = ["Component Quantity"];
                    }
                    that.loadPivotTab(
                        that.pivotData,
                        that.Rows,
                        that.Val
                    );
                    that.colSetting.close();
                } catch (error) {
                    console.error("Error in onAddColumn:", error);
                }
            },
            _getFormattedColumnName: function (field, selectedKey) {
                const OPTION_KEYS = {
                    ID: "ID",
                    DESCRIPTION: "Description",
                    ID_DESCRIPTION: "ID-Description",
                };
                if (selectedKey === OPTION_KEYS.ID) {
                    return field;
                }
                if (
                    selectedKey === OPTION_KEYS.DESCRIPTION ||
                    selectedKey === OPTION_KEYS.ID_DESCRIPTION
                ) {
                    return `${field} Description`;
                }
                return field;
            },
            onCloseColumn: function () {
                that.colSetting.close();
            },
            onIconPress: function (oEvent) {
                let item = oEvent.getSource().getParent().getParent(),
                    path = Number(item.getBindingContext().getPath().split("/")[2]),
                    icon = oEvent.getSource().getTooltip(),
                    model,
                    oModel,
                    newData,
                    newIndex;
                item.getDomRef().scrollIntoView();
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
                model = oEvent.getSource().getModel().getData();
                newData = that.changeIndexPosition(model.data, path, newIndex);
                that.settingData = newData;
                oModel = new JSONModel({
                    data: that.settingData,
                });
                that.table.setModel(oModel);
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
            onPressKey() {
                that.keyTable.open();
                const table = sap.ui.getCore().byId("idkeyTableAR");
                that.table = table;
                if (!that.keySettingData) {
                    that.keySettingData = [{
                        field: "Total Component Quantity",
                        option: [],
                        select: true
                    },
                    {
                        field: "Net Component Quantity",
                        option: [],
                        select: false
                    },
                    {
                        field: "Actual Component Quantity",
                        option: [],
                        select: false
                    },
                    {
                        field: "Unconsumed Component Quantity",
                        option: [],
                        select: false
                    },
                    {
                        field: "Product Demand",
                        option: [],
                        select: false
                    },
                    {
                        field: "Coefficients",
                        option: [],
                        select: false
                    }
                    ];
                    var oModel = new JSONModel({
                        data: that.keySettingData,
                    });
                    table.setModel(oModel);
                    that.checkSelect2();
                }
            },
            onAddKey: function () {
                try {
                    that.byId("pivotPageAR").setBusy(true);
                    const dataTable = that.table;
                    const selectItems = dataTable.getSelectedItems();
                    const keyFig = selectItems.map((col) => {
                        return col.getBindingContext().getObject().field
                    });
                    that.KeyFig = keyFig;
                    // that.pivotData = that.addTypeToData($.extend(true, [], that.allData));
                    const curKeys = that.KeysFromLabel();
                    const SumData = that.aggregateFlexible(
                        that.allData,
                        [...curKeys, [that.weekType]],
                        {
                            ACTUAL_QTY_SUM: "sum",
                            CIR_ASMB_QTY_SUM: "sum",
                            TOTAL_QTY_SUM: "sum",
                            PROD_DEM_MAX: "fixed",
                        }
                    );
                    that.pivotData = that.addTypeToData($.extend(true, [], SumData));
                    that.loadPivotTab(
                        that.pivotData,
                        that.Rows,
                        that.Val
                    );

                    that.keyTable.close();
                } catch (error) {
                    console.error("Error in onAddColumn:", error);
                }
            },
            onIconPress2: function (oEvent) {
                let item = oEvent.getSource().getParent().getParent(),
                    path = Number(item.getBindingContext().getPath().split("/")[2]),
                    icon = oEvent.getSource().getTooltip(),
                    model,
                    oModel,
                    newData,
                    newIndex;
                item.getDomRef().scrollIntoView();
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
                        newIndex = that.keySettingData.length - 1;
                        break;
                    default:
                        console.log("Error");
                }
                model = oEvent.getSource().getModel().getData();
                newData = that.changeIndexPosition(model.data, path, newIndex);
                that.keySettingData = newData;
                oModel = new JSONModel({
                    data: that.keySettingData,
                });
                that.table.setModel(oModel);
                that.checkSelect2();
            },
            async onExportPivot() {
                that.getView().setBusy(true);
                let entity = "getAssemblyCompQty",
                    filename = "Assembly";
                if (that.qtyType === "Component") {
                    entity = "getAsmbCompBOM";
                    filename = "Component";
                }
                const allData = await that.readAllData(
                    entity,
                    { $top: 50000 }, that.byId("smartFilterBarAR").getFilters()
                );
                that.downloadFastCSV(allData, filename);
            },
            downloadFastCSV: function (jsonData, fileName) {
                try {
                    function formatToYMD(input) {
                        const date = new Date(input);
                        if (isNaN(date.getTime())) return input; // return as is if not date

                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");

                        return `${y}-${m}-${d}`;
                    }
                    if (jsonData.length === 0) {
                        return false;
                    }

                    that.getView().setBusy(true);

                    // Get headers from the first data object and remove metadata
                    const sampleItem = { ...jsonData[0] };
                    if (sampleItem.__metadata) delete sampleItem.__metadata;
                    const headers = Object.keys(sampleItem);
                    let labels = [];
                    headers.forEach((key) => {
                        let label;
                        switch (key) {
                            case "LOCATION_ID":
                                label = "Manufacturing Location";
                                break;
                            case "LOCATION_DESC":
                                label = "Manufacturing Location Description";
                                break;
                            case "PRODUCT_ID":
                                label = "Product";
                                break;
                            case "PROD_DESC":
                                label = "Product Description";
                                break;
                            case "ITEM_NUM":
                                label = "Item Number";
                                break;
                            case "ASSEMBLY":
                                label = "Assembly";
                                break;
                            case "ASM_DESC":
                                label = "Assembly Description";
                                break;
                            case "WEEK_DATE":
                                label = "Week Date";
                                break;
                            case "MODEL_VERSION":
                                label = "Model Version";
                                break;
                            case "VERSION":
                                label = "Version";
                                break;
                            case "SCENARIO":
                                label = "Scenario";
                                break;
                            case "RULE_TYPE":
                                label = "Rule Type";
                                break;
                            case "REF_PRODID":
                                label = "Configurable Product";
                                break;
                            case "FACTORY_LOC":
                                label = "Assembly Manufacturing Location";
                                break;
                            case "MRP_GROUP":
                                label = "MRP Group";
                                break;
                            case "MRP_TYPE":
                                label = "MRP Type";
                                break;
                            case "PHANTOM_IND":
                                label = "Phantom Index";
                                break;
                            case "CONFIGURABLE":
                                label = "Configurable";
                                break;
                            case "REQ_TYPE":
                                label = "Request Type";
                                break;
                            case "ASMB_QTY":
                                label = "Assembly Quantity";
                                break;
                            case "CIR_QTY":
                                label = "Forecast Order Quantity";
                                break;
                            // case "CIR_ASMB_QTY":
                            //     label = "Assembly Requirements";
                            //     break;
                            case "CIR_ASMB_QTY":
                                label = "Unconsumed Component Quantity";
                                break;
                            case "ACTUAL_QTY_SUM":
                                label = "Actual Component Quantity";
                                break;
                            case "TOTAL_QTY_SUM":
                                label = "Total Component Quantity";
                                break;
                            case "CIR_ASMB_QTY_SUM":
                                label = "Unconsumed Component Quantity";
                                break;
                            case "UNIQUE_ID":
                                label = "Unique Id";
                                break;
                            case "CALENDAR_WEEK":
                                label = "Calendar Week";
                                break;
                            case "TELESCOPIC_WEEK":
                                label = "Telescopic Week";
                                break;
                            case "TYPE":
                                label = "TYPE";
                                break;
                            case "ACTUAL_QTY":
                                label = "Actual Component Quantity";
                                break;
                            case "TOTAL_QTY":
                                label = "Total Component Quantity";
                                break;
                            case "FACTORY_LOCATION_DESC":
                                label = "Factory Location Desc";
                                break;
                            default:
                                label = key;
                                break;
                        }
                        labels.push(label);
                    });

                    // Create CSV header row
                    let csvContent = labels.join(",") + "\r\n";

                    // Process data in chunks to avoid UI freezing
                    const chunkSize = 10000; // Increased chunk size for CSV (faster than Excel)
                    let processedCount = 0;

                    const processNextChunk = () => {
                        const chunk = jsonData.slice(
                            processedCount,
                            processedCount + chunkSize
                        );
                        let chunkContent = "";

                        // Process the current chunk
                        for (let i = 0; i < chunk.length; i++) {
                            const row = [];
                            for (let j = 0; j < headers.length; j++) {
                                let value = chunk[i][headers[j]];

                                // Handle null or undefined values
                                if (headers[j] === "WEEK_STARTDATE" || headers[j] === "WEEK_ENDDATE")
                                    value = formatToYMD(value);
                                if (value === null || value === undefined) {
                                    value = "";
                                }
                                // Handle strings with commas, quotes, or newlines by escaping
                                else if (typeof value === "string") {
                                    // If value contains commas, quotes or newlines, wrap in quotes
                                    if (
                                        value.includes(",") ||
                                        value.includes('"') ||
                                        value.includes("\n")
                                    ) {
                                        // Double any quotes in the value
                                        value = value.replace(/"/g, '""');
                                        // Wrap in quotes
                                        value = `"${value}"`;
                                    }
                                }

                                row.push(value);
                            }
                            chunkContent += row.join(",") + "\r\n";
                        }

                        // Append this chunk's content to the CSV
                        csvContent += chunkContent;

                        processedCount += chunk.length;

                        // Continue processing or finish
                        if (processedCount < jsonData.length) {
                            setTimeout(processNextChunk, 0); // Continue with next chunk
                        } else {
                            // All data processed, download the CSV file
                            // Create Blob from the CSV string
                            const blob = new Blob([csvContent], {
                                type: "text/csv;charset=utf-8;",
                            });

                            // Create download link
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;

                            // Ensure the filename has .csv extension
                            if (!fileName.toLowerCase().endsWith(".csv")) {
                                fileName += ".csv";
                            }
                            a.download = fileName;

                            document.body.appendChild(a);
                            a.click();

                            // Clean up
                            setTimeout(() => {
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                that.getView().setBusy(false);
                            }, 100);
                        }
                    };

                    // Start processing
                    setTimeout(processNextChunk, 0);

                    return true;
                } catch (error) {
                    that.getView().setBusy(false);
                    console.error("Error in downloadFastCSV:", error);
                    return false;
                }
            },
            callFunction() {
                const [entity, urlParameters] = arguments,
                    { promise, resolve, reject } = Promise.withResolvers();
                that.cModel.callFunction(`/${entity}`, {
                    urlParameters: urlParameters,
                    success(oRes) {
                        resolve(oRes);
                    },
                    error(oError) {
                        reject(oError);
                    },
                })
                return promise;
            },
            removeDuplicates: function (array, key) {
                var check = new Set();
                return array.filter(
                    (obj) => !check.has(obj[key]) && check.add(obj[key])
                );
            },
            removeDuplicatesMultiple: function (array, keys) {
                //Function to remove duplicates in an array
                const filtered = array.filter(
                    (
                        (s) => (o) =>
                            ((k) => !s.has(k) && s.add(k))(keys.map((k) => o[k]).join("|"))
                    )(new Set())
                );
                return filtered;
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
            getDateFn: function (imDate) {
                var vMonth, vDate;
                var vMnthFrm = imDate.getMonth() + 1;

                if (vMnthFrm < 10) {
                    vMonth = "0" + vMnthFrm;
                } else {
                    vMonth = vMnthFrm;
                }

                if (imDate.getDate() < 10) {
                    vDate = "0" + imDate.getDate();
                } else {
                    vDate = imDate.getDate();
                }
                return (imDate = imDate.getFullYear() + "-" + vMonth + "-" + vDate);
            },
            getUser: function () {
                let vUser;
                if (sap.ushell && sap.ushell.Container) {
                    let email = sap.ushell.Container.getService("UserInfo")
                        .getUser()
                        .getEmail();
                    vUser = email ? email : "";
                }
                if (!that.sUser) {
                    that.sUser = 'null';
                }
                return vUser;
            } /*Getting variant view data*/,
            getVariantData: function () {
                var ndData = [];
                var dData = [],
                    uniqueName = [];
                that.uniqueName = [];
                sap.ui.core.BusyIndicator.show();
                var variantUser = that.getUser();
                variantUser = variantUser?.toLowerCase();
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                that.oGModel.setProperty("/UserId", variantUser);
                // Define the filters
                var oFilterAppName1 = new sap.ui.model.Filter(
                    "APPLICATION_NAME",
                    sap.ui.model.FilterOperator.EQ,
                    appName
                );
                var oFilterUser = new sap.ui.model.Filter(
                    "USER",
                    sap.ui.model.FilterOperator.EQ,
                    variantUser
                );

                var oFilterAppName2 = new sap.ui.model.Filter(
                    "APPLICATION_NAME",
                    sap.ui.model.FilterOperator.EQ,
                    appName
                );
                var oFilterScope = new sap.ui.model.Filter(
                    "SCOPE",
                    sap.ui.model.FilterOperator.EQ,
                    "Public"
                );

                var oFilterAppName3 = new sap.ui.model.Filter(
                    "APPLICATION_NAME",
                    sap.ui.model.FilterOperator.EQ,
                    "DefaultMulti"
                );
                var oFilterUser1 = new sap.ui.model.Filter(
                    "USER",
                    sap.ui.model.FilterOperator.EQ,
                    variantUser
                );

                var oFilterCondition1 = new sap.ui.model.Filter({
                    filters: [oFilterAppName1, oFilterUser],
                    and: true, // Combine with AND
                });

                var oFilterCondition2 = new sap.ui.model.Filter({
                    filters: [oFilterAppName2, oFilterScope],
                    and: true, // Combine with AND
                });

                var oFilterCondition3 = new sap.ui.model.Filter({
                    filters: [oFilterAppName3, oFilterUser1],
                    and: true, // Combine with AND
                });

                var oFinalFilter = new sap.ui.model.Filter({
                    filters: [oFilterCondition1, oFilterCondition2, oFilterCondition3],
                    and: false, // Combine with OR
                });

                //   this.getView().getModel("oModel").read("/getVariantHeader", {
                that
                    .getOwnerComponent()
                    .getModel("aModel")
                    .read("/getVariantHeader", {
                        // filters: [oFinalFilter],
                        headers:{
                        "x-user-id":variantUser,
                        "x-app-name":appName
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
                                    VARIANTNAME: "Standard",
                                    VARIANTID: "0",
                                    DEFAULT: "Y",
                                    REMOVE: false,
                                    CHANGE: false,
                                    USER: "SAP",
                                    SCOPE: sap.m.SharingMode.Public,
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);
                                that.oGModel.setProperty("/defaultDetails", "");
                                // uniqueName = that.normalizeVariantItems(uniqueName);
                                that.viewDetails.setData({
                                    items12: uniqueName
                                });
                                that.varianNames = uniqueName;
                                // that.byId("idMatList123AR").setModel(that.viewDetails);
                                that.UniqueDefKey = uniqueName[0].VARIANTID;
                                that
                                    .byId("idMatList123AR")
                                    .setDefaultKey(uniqueName[0].VARIANTID);
                                that
                                    .byId("idMatList123AR")
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
                                            .byId("idMatList123AR")
                                            .setDefaultKey(oData.results[i].VARIANTID);
                                        that
                                            .byId("idMatList123AR")
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
                            sap.m.MessageToast.show("error while loading variant details");
                        },
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
                    .getModel("aModel")
                    .read("/getVariant", {
                        filters: [oFilters],
                        success: function (oData) {
                            oData.results = oData.results.map(item => ({
                                ...item,
                                VARIANTID: String(item.VARIANTID)
                            }));
                            that.oGModel.setProperty("/fieldDetails", oData.results);
                            var variantNewData = oData.results;
                            aData = variantNewData.map((item1) => {
                                const item2 = headerData.find(
                                    (item2) => item2.VARIANTID === item1.VARIANTID
                                );
                                return item2 ? { ...item1, ...item2 } : { ...item1 };
                            });
                            aData = aData.map((item) => ({
                                ...item,
                                SCOPE:
                                    item.SCOPE === "Public"
                                        ? sap.m.SharingMode.Public
                                        : sap.m.SharingMode.Private,
                            }));
                            that.oGModel.setProperty("/variantDetails", aData);
                            if (aData.length > 0) {
                                aData = aData.filter(
                                    (id) =>
                                        id.VARIANTNAME !== "defaultMulti" &&
                                        id.APPLICATION_NAME !== "DefaultMulti"
                                );
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
                                            DEFAULT: 'N',
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
                                    SCOPE: sap.m.SharingMode.Public,
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);
                                // uniqueName = that.normalizeVariantItems(uniqueName);
                                that.viewDetails.setData({
                                    items12: uniqueName
                                });
                                that.varianNames = uniqueName;
                                that.oGModel.setProperty("/defaultDetails", defaultDetails);
                                // that.byId("idMatList123AR").setModel(that.variantModel);
                                if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                    var newVariant = that.oGModel.getProperty("/newVariant");
                                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                                    if (newVariant[0].DEFAULT === "Y") {
                                        that.UniqueDefKey = newVariant[0].VARIANTID;
                                        that
                                            .byId("idMatList123AR")
                                            .setDefaultKey(newVariant[0].VARIANTID);
                                    }
                                    that
                                        .byId("idMatList123AR")
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
                                    SCOPE: sap.m.SharingMode.Public,
                                });
                                that.oGModel.setProperty("/viewNames", uniqueName);
                                that.oGModel.setProperty("/defaultDetails", "");

                                // uniqueName = that.normalizeVariantItems(uniqueName);
                                that.viewDetails.setData({
                                    items12: uniqueName
                                });
                                that.varianNames = uniqueName;
                                // that.byId("idMatList123AR").setModel(that.viewDetails);
                                var Default = "Standard";
                                if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                                    var newVariant = that.oGModel.getProperty("/newVariant");
                                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                                    if (newVariant[0].DEFAULT === "Y") {
                                        that.UniqueDefKey = newVariant[0].VARIANTID;
                                        that
                                            .byId("idMatList123AR")
                                            .setDefaultKey(newVariant[0].VARIANTID);
                                    }
                                    that
                                        .byId("idMatList123AR")
                                        .setSelectedKey(newVariant[0].VARIANTID);
                                    that.oGModel.setProperty("/newVaraintFlag", "");
                                } else {
                                    that.UniqueDefKey = uniqueName[0].VARIANTID;
                                    that
                                        .byId("idMatList123AR")
                                        .setDefaultKey(uniqueName[0].VARIANTID);
                                    that
                                        .byId("idMatList123AR")
                                        .setSelectedKey(uniqueName[0].VARIANTID);
                                    that.handleSelectPress(Default);
                                }
                            }
                        },
                        error: function (oData, error) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show("error while loading variant details");
                        },
                    });
            },
            removeDuplicate: function (array, key) {
                var check = new Set();
                return array.filter(
                    (obj) => !check.has(obj[key]) && check.add(obj[key])
                );
            },
            /**
               /**On Press of Variant Name */
            handleSelectPress: function (oEvent) {
                var oTokens = {},
                    oFilterData = {};
                that.finaloTokens = [];
                var oFiltersClear = that.byId("smartFilterBarAR");
                // oFiltersClear.clear();
                var oTableItems = that.oGModel.getProperty("/variantDetails");
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                that.byId("idMatList123AR").setModified(false);
                that.oGModel.setProperty("/defaultLocation", []);
                that.oGModel.setProperty("/defaultProduct", []);
                that.oGModel.setProperty("/defaultUnique", []);
                that.oGModel.setProperty("/defaultAssembly", []);
                that.oGModel.setProperty("/defaultVersion", []);
                that.oGModel.setProperty("/defaultScenario", []);

                if (that.oGModel.getProperty("/fromFunction") === "X") {
                    that.oGModel.setProperty("/fromFunction", "");
                    that.selectedApp = oEvent;
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                } else {
                    that.selectedApp = oEvent.getSource().getTitle().getText();
                    that.oGModel.setProperty("/variantName", that.selectedApp);
                }
                if (that.selectedApp !== "Standard") {
                    oFiltersClear.fireClear();

                    const oControlLoc = oFiltersClear.getControlByKey("LOCATION_ID");
                    oControlLoc.removeAllTokens();
                    const oControlProd = oFiltersClear.getControlByKey("REF_PRODID");
                    oControlProd.removeAllTokens();
                    const oControlAssembly = oFiltersClear.getControlByKey("ASSEMBLY");
                    oControlAssembly.removeAllTokens();
                    const oControlUnique = oFiltersClear.getControlByKey("UNIQUE_ID");
                    oControlUnique.removeAllTokens();
                    var filteredData = oTableItems.filter(
                        (a) =>
                            a.VARIANTNAME === that.selectedApp &&
                            a.APPLICATION_NAME === appName
                    );
                    var locData, prodData, uniqData, assembly;
                    locData = filteredData.filter((a) => a.FIELD.includes("Manufacturing Location"));
                    prodData = filteredData.filter((a) => a.FIELD.includes("Config"));
                    uniqData = filteredData.filter((a) => a.FIELD.includes("Unique ID"));
                    assembly = filteredData.filter((a) => a.FIELD.includes("Assembly"));
                    //   version = filteredData.filter(a => a.FIELD.includes("Version"));
                    //   scenario = filteredData.filter(a => a.FIELD.includes("Scenario"));

                    if (locData.length > 0) {
                        let aLocValues = locData.map((item) => item.VALUE);
                        var aTokenItems = aLocValues.map(function (sVal) {
                            return { key: sVal, text: sVal };
                        });
                        that.oGModel.setProperty("/defaultLocation", aTokenItems);
                        // Set tokens via setFilterDataAsString
                        oFilterData.LOCATION_ID = {
                            items: aTokenItems,
                        };
                        for (var i = 0; i < locData.length; i++) {
                            oTokens = {
                                FIELD: locData[i].FIELD,
                                VALUE: locData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }

                    if (prodData.length > 0) {
                        let aProdValues = prodData.map((item) => item.VALUE);
                        var aProdItems = aProdValues.map(function (sVal) {
                            return { key: sVal, text: sVal };
                        });
                        that.oGModel.setProperty("/defaultProduct", aProdItems);
                        // Set tokens via setFilterDataAsString
                        oFilterData.REF_PRODID = {
                            items: aProdItems,
                        };
                        for (var i = 0; i < prodData.length; i++) {
                            oTokens = {
                                FIELD: prodData[i].FIELD,
                                VALUE: prodData[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    if (assembly.length > 0) {
                        let aAssembly = assembly.map((item) => item.VALUE);
                        var aTokenItems = aAssembly.map(function (sVal) {
                            return { key: sVal, text: sVal };
                        });
                        that.oGModel.setProperty("/defaultAssembly", aTokenItems);
                        oFilterData.ASSEMBLY = {
                            items: aTokenItems,
                        };
                        for (var i = 0; i < assembly.length; i++) {
                            oTokens = {
                                FIELD: assembly[i].FIELD,
                                VALUE: assembly[i].VALUE,
                            };
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }
                    if (uniqData.length > 0) {
                        let aUnique = uniqData.map(item => item.VALUE);
                        var aTokenItems = aUnique.map(function (sVal) {
                            return { key: sVal, text: sVal };
                        });
                        that.oGModel.setProperty("/defaultUnique", aTokenItems);
                        oFilterData.UNIQUE_ID = {
                            items: aTokenItems
                        };
                        for (var i = 0; i < uniqData.length; i++) {
                            oTokens = {
                                FIELD: uniqData[i].FIELD,
                                VALUE: uniqData[i].VALUE
                            }
                            that.finaloTokens.push(oTokens);
                            oTokens = {};
                        }
                    }

                    var oSmartFilterBar = that.byId("smartFilterBarAR");
                    that.oGModel.setProperty("/initialClear", "N");
                    oSmartFilterBar.setFilterDataAsString(JSON.stringify(oFilterData));
                    const oVersionCtrl = oSmartFilterBar.getControlByKey("VERSION_NAME");
                    const oScenarioCtrl = oSmartFilterBar.getControlByKey("SCENARIO_NAME");

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

                    // oSmartFilterBar.search();
                    sap.ui.core.BusyIndicator.hide();
                } else {
                    // let headerDetails = that.oGModel
                    //     .getProperty("/headerDetails")
                    //     .filter(
                    //         (id) =>
                    //             id.APPLICATION_NAME == "DefaultMulti" &&
                    //             id.VARIANTNAME == "defaultMulti"
                    //     );
                    // if (headerDetails.length) {
                    //     // oFiltersClear.clear();
                    //     var filteredData = that.oGModel
                    //         .getProperty("/fieldDetails")
                    //         .filter((id) => id.VARIANTID == headerDetails[0].VARIANTID);
                    //     var locData, prodData, uniqData, assembly;
                    //     locData = filteredData.filter((a) =>
                    //         a.FIELD.includes("Assembly Manufacturing Location")
                    //     );
                    //     prodData = filteredData.filter((a) =>
                    //         a.FIELD.includes("Config Product")
                    //     );
                    //     uniqData = filteredData.filter((a) => a.FIELD.includes("Unique ID"));
                    //     assembly = filteredData.filter((a) => a.FIELD.includes("Assembly"));
                    //     if (locData.length > 0) {
                    //         let aLocValues = locData.map((item) => item.VALUE);
                    //         var aTokenItems = aLocValues.map(function (sVal) {
                    //             return { key: sVal, text: sVal };
                    //         });
                    //         that.oGModel.setProperty("/defaultLocation", aTokenItems);
                    //         // Set tokens via setFilterDataAsString
                    //         oFilterData.FACTORY_LOC = {
                    //             items: aTokenItems,
                    //         };
                    //         for (var i = 0; i < locData.length; i++) {
                    //             oTokens = {
                    //                 FIELD: locData[i].FIELD,
                    //                 VALUE: locData[i].VALUE,
                    //             };
                    //             that.finaloTokens.push(oTokens);
                    //             oTokens = {};
                    //         }
                    //     }

                    //     if (prodData.length > 0) {
                    //         let aProdValues = prodData.map((item) => item.VALUE);
                    //         var aProdItems = aProdValues.map(function (sVal) {
                    //             return { key: sVal, text: sVal };
                    //         });
                    //         that.oGModel.setProperty("/defaultProduct", aProdItems);
                    //         // Set tokens via setFilterDataAsString
                    //         oFilterData.REF_PRODID = {
                    //             items: aProdItems,
                    //         };
                    //         for (var i = 0; i < prodData.length; i++) {
                    //             oTokens = {
                    //                 FIELD: prodData[i].FIELD,
                    //                 VALUE: prodData[i].VALUE,
                    //             };
                    //             that.finaloTokens.push(oTokens);
                    //             oTokens = {};
                    //         }
                    //     }
                    //     if (assembly.length > 0) {
                    //         let aAssembly = assembly.map((item) => item.VALUE);
                    //         var aTokenItems = aAssembly.map(function (sVal) {
                    //             return { key: sVal, text: sVal };
                    //         });
                    //         that.oGModel.setProperty("/defaultAssembly", aTokenItems);
                    //         oFilterData.ASSEMBLY = {
                    //             items: aTokenItems,
                    //         };
                    //         for (var i = 0; i < assembly.length; i++) {
                    //             oTokens = {
                    //                 FIELD: assembly[i].FIELD,
                    //                 VALUE: assembly[i].VALUE,
                    //             };
                    //             that.finaloTokens.push(oTokens);
                    //             oTokens = {};
                    //         }
                    //     }
                    //     if (uniqData.length > 0) {
                    //         let aUnique = uniqData.map(item => item.VALUE);
                    //         var aTokenItems = aUnique.map(function (sVal) {
                    //             return { key: sVal, text: sVal };
                    //         });
                    //         that.oGModel.setProperty("/defaultUnique", aTokenItems);
                    //         oFilterData.UNIQUE_ID = {
                    //             items: aTokenItems
                    //         };
                    //         for (var i = 0; i < uniqData.length; i++) {
                    //             oTokens = {
                    //                 FIELD: uniqData[i].FIELD,
                    //                 VALUE: uniqData[i].VALUE
                    //             }
                    //             that.finaloTokens.push(oTokens);
                    //             oTokens = {};
                    //         }
                    //     }

                    //     var oSmartFilterBar = that.byId("smartFilterBarAR");
                    //     // const oFilterData1 = {
                    //     //     VERSION_NAME: {
                    //     //         ranges: [
                    //     //             {
                    //     //                 exclude: false,
                    //     //                 operation: "EQ",
                    //     //                 keyField: "VERSION",
                    //     //                 value1: "Base Version",
                    //     //             },
                    //     //         ],
                    //     //     },
                    //     //     SCENARIO_NAME: {
                    //     //         ranges: [
                    //     //             {
                    //     //                 exclude: false,
                    //     //                 operation: "EQ",
                    //     //                 keyField: "SCENARIO_NAME",
                    //     //                 value1: "_PLAN",
                    //     //             },
                    //     //         ],
                    //     //     },
                    //     // };
                    //     // oSmartFilterBar.setFilterData(oFilterData1);
                    //     oSmartFilterBar.setFilterDataAsString(JSON.stringify(oFilterData));
                    //     // oSmartFilterBar.search();
                    //     sap.ui.core.BusyIndicator.hide();
                    // } else {
                    //do nothing
                    var oFiltersClear = that.byId("smartFilterBarAR");
                    const oControlLoc = oFiltersClear.getControlByKey("LOCATION_ID");
                    oControlLoc.removeAllTokens();
                    const oControlProd = oFiltersClear.getControlByKey("REF_PRODID");
                    oControlProd.removeAllTokens();
                    const oControlAssembly = oFiltersClear.getControlByKey("ASSEMBLY");
                    oControlAssembly.removeAllTokens();
                    const oControlUnique = oFiltersClear.getControlByKey("UNIQUE_ID");
                    oControlUnique.removeAllTokens();
                    // if (that.oGModel.getProperty("/initialClear") === "Y") {
                    //     that.oGModel.setProperty("/initialClear", "N");
                    // }
                    // else {
                    // oFiltersClear.fireClear();
                    // const oVersionCtrl = oFiltersClear.getControlByKey("VERSION_NAME");
                    // const oScenarioCtrl = oFiltersClear.getControlByKey("SCENARIO_NAME");

                    // if (oVersionCtrl) {
                    //     oVersionCtrl.setValue("Base Version");
                    //     oVersionCtrl.setValueState("None");
                    //     oVersionCtrl.fireChange({ value: "Base Version" }); // forces sync
                    // }

                    // if (oScenarioCtrl) {
                    //     oScenarioCtrl.setValue("_PLAN");
                    //     oScenarioCtrl.setValueState("None");
                    //     oScenarioCtrl.fireChange({ value: "_PLAN" });
                    // }
                    // }

                    sap.ui.core.BusyIndicator.hide();
                }
            },
            onFilterChange: function (oEvent) {
                if (oEvent === undefined) {
                    return false;
                }

                var isModified = false;
                var oSmartFilterBar = this.getView().byId("smartFilterBarAR");
                var filterData = oSmartFilterBar.getFilterData() || {};

                var filters = [
                    { key: "LOCATION_ID", defaultPath: "/defaultLocation" },
                    { key: "REF_PRODID", defaultPath: "/defaultProduct" },
                    { key: "ASSEMBLY", defaultPath: "/defaultAssembly" },
                    { key: "UNIQUE_ID", defaultPath: "/defaultUnique" }
                    // { key: "VERSION", defaultPath: "/defaultVersion" },
                    // { key: "SCENARIO", defaultPath: "/defaultScenario" }
                ];

                filters.forEach(function (filter) {
                    var currentItems = (filterData[filter.key] && filterData[filter.key].items) || [];
                    var defaultItems = that.oGModel.getProperty(filter.defaultPath) || [];

                    if (!that.areArraysEqualSorted(currentItems, defaultItems)) {
                        isModified = true;
                    }
                });

                that.byId("idMatList123AR").setModified(isModified);
            },
            // * Saving the VIEW on press of save in NameVariant fragment
            // * @param {*} oEvent
            // */
            onCreate: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var array = [];
                var details = {};
                let oSmartFilterBar = this.getView().byId("smartFilterBarAR");
                var sLocation = oSmartFilterBar.getFilterData()["LOCATION_ID"];
                var Field1 = "Manufacturing Location";
                var sProduct = oSmartFilterBar.getFilterData()["REF_PRODID"];
                var Field2 = "Config Product";
                var sAssembly = oSmartFilterBar.getFilterData()["ASSEMBLY"];
                var Field4 = "Assembly";
                var sUniqueID = oSmartFilterBar.getFilterData()["UNIQUE_ID"];
                var Field5 = "Unique ID";
                //   var sVersion = oSmartFilterBar.getFilterData()["VERSION"];
                //   var Field6 = "Version";
                //   var sScenario = oSmartFilterBar.getFilterData()["SCENARIO"];
                //   var Field7 = "Scenario";

                var varName = oEvent.getParameters().name;
                var sDefault = oEvent.getParameters().def;
                var appName = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                if (!sLocation && !sProduct && !sAssembly) {
                    sap.ui.core.BusyIndicator.hide();
                    return sap.m.MessageToast.show(
                        "No values selected in filters Config Product,Factory Location, Assembly, Version & Scenario"
                    );
                }

                if (varName) {
                    if (
                        sDefault &&
                        that.oGModel.getProperty("/defaultDetails").length > 0
                    ) {
                        var defaultChecked = "Y";
                        this.getOwnerComponent()
                            .getModel("aModel")
                            .callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(
                                        that.oGModel.getProperty("/defaultDetails")
                                    ),
                                },
                                success: function (oData) { },
                                error: function (error) {
                                    sap.m.MessageToast.show("Failed to create variant");
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
                    if (oEvent.getParameters().public) {
                        var Scope = "Public";
                    } else {
                        var Scope = "Private";
                    }
                    if (sLocation) {
                        for (var s = 0; s < sLocation.items.length; s++) {
                            details = {
                                Field: Field1,
                                FieldCenter: sLocation.items[s].key, //sLocation[s].getKey(),
                                Value: sLocation.items[s].text,
                                Default: defaultChecked,
                            };
                            array.push(details);
                        }
                    }
                    if (sProduct) {
                        for (var s = 0; s < sProduct.items.length; s++) {
                            details = {
                                Field: Field2,
                                FieldCenter: sProduct.items[s].key, //getKey(),
                                Value: sProduct.items[s].text,
                                Default: defaultChecked,
                            };
                            array.push(details);
                        }
                    }
                    if (sAssembly) {
                        for (var s = 0; s < sAssembly.items.length; s++) {
                            details = {
                                Field: Field4,
                                FieldCenter: sAssembly.items[s].key,
                                Value: sAssembly.items[s].text,
                                Default: defaultChecked,
                            };
                            array.push(details);
                        }
                    }
                    if (sUniqueID) {
                        for (var s = 0; s < sUniqueID.items.length; s++) {
                            details = {
                                Field: Field5,
                                FieldCenter: sUniqueID.items[s].key,
                                Value: sUniqueID.items[s].text
                            }
                            array.push(details);
                        }
                    }


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
                        .getModel("aModel")
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
                                that.byId("idMatList123AR").setModified(false);
                                that.onAfterRendering();
                            },
                            error: function (error) {
                                sap.ui.core.BusyIndicator.hide();
                                sap.m.MessageToast.show("Failed to create variant");
                            },
                        });
                } else {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Please fill View Name");
                }
            },
            /**On press of save in manage fragment */
            onManage: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var oDelted = {},
                    deletedArray = [],
                    count = 0;
                var totalVariantData = that.oGModel.getProperty("/VariantData");
                var selected = oEvent.getParameters();
                var variantUser = that.getUser();
                variantUser = variantUser?.toLowerCase();
                if (selected.def) {
                    totalVariantData.filter((item1) => {
                        if (
                            JSON.parse(selected.def) == item1.VARIANTID &&
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
                    // that.byId("idMatList123AR").setModel(that.viewDetails);
                    that.byId("idMatList123AR").setDefaultKey(that.UniqueDefKey);
                    return sap.m.MessageToast.show(
                        "Variant doesn't belong to logged in user. Cannot make changes to this Variant"
                    );
                }
                //Delete the selected variant names
                if (selected.deleted) {
                    selected.deleted.forEach((item1) => {
                        totalVariantData.forEach((item2) => {
                            if (JSON.parse(item1) == item2.VARIANTID) {
                                oDelted = {
                                    ID: item2.VARIANTID,
                                    NAME: item2.VARIANTNAME,
                                };
                                deletedArray.push(oDelted);
                            }
                        });
                    });
                    if (deletedArray.length > 0) {
                        that.deleteVariant(deletedArray);
                    }
                }
                //Updating the default variants
                if (selected.def) {
                    //If selected default is not standard
                    if (JSON.parse(selected.def) != 0) {
                        //Update the existing default to a new default
                        var defaultVariant = totalVariantData.filter(
                            (item) => item.DEFAULT === "Y" && item.USER === variantUser
                        );
                        if (defaultVariant.length > 0) {
                            defaultVariant[0].DEFAULT = "N";
                            that
                                .getView()
                                .getModel("aModel")
                                .callFunction("/updateVariant", {
                                    method: "GET",
                                    urlParameters: {
                                        VARDATA: JSON.stringify(defaultVariant),
                                    },
                                    success: function (oData) {
                                        var newDefault = totalVariantData.filter(
                                            (item) => item.VARIANTID == JSON.parse(selected.def)
                                        );
                                        newDefault[0].DEFAULT = "Y";
                                        that
                                            .getView()
                                            .getModel("aModel")
                                            .callFunction("/updateVariant", {
                                                method: "GET",
                                                urlParameters: {
                                                    VARDATA: JSON.stringify(newDefault),
                                                },
                                                success: function (oData) {
                                                    that.onAfterRendering();
                                                    // sap.ui.core.BusyIndicator.hide();
                                                },
                                                error: function (error) {
                                                    sap.m.MessageToast.show("Failed to update variant");
                                                },
                                            });
                                    },
                                    error: function (error) {
                                        sap.ui.core.BusyIndicator.hide();
                                        sap.m.MessageToast.show("Failed to update variant");
                                    },
                                });
                        } else {
                            var selectedVariant = totalVariantData.filter(
                                (item) => item.VARIANTID == JSON.parse(selected.def)
                            );
                            selectedVariant[0].DEFAULT = "Y";
                            that
                                .getView()
                                .getModel("aModel")
                                .callFunction("/updateVariant", {
                                    method: "GET",
                                    urlParameters: {
                                        VARDATA: JSON.stringify(selectedVariant),
                                    },
                                    success: function (oData) {
                                        that.onAfterRendering();
                                        // sap.ui.core.BusyIndicator.hide();
                                    },
                                    error: function (error) {
                                        sap.ui.core.BusyIndicator.hide();
                                        sap.m.MessageToast.show("Failed to update variant");
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
                            .getModel("aModel")
                            .callFunction("/updateVariant", {
                                method: "GET",
                                urlParameters: {
                                    VARDATA: JSON.stringify(defaultItem),
                                },
                                success: function (oData) {
                                    that.onAfterRendering();
                                    // sap.ui.core.BusyIndicator.hide();
                                },
                                error: function (error) {
                                    sap.ui.core.BusyIndicator.hide();
                                    sap.m.MessageToast.show("Failed to update variant");
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
                that
                    .getView()
                    .getModel("aModel")
                    .callFunction("/createVariant", {
                        method: "GET",
                        urlParameters: {
                            Flag: "D",
                            USER: that.oGModel.getProperty("/UserId"),
                            VARDATA: deletedItems,
                        },
                        success: function (oData) {
                            that.deletedArray = [];
                        },
                        error: function (error) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show("Failed to delete variant");
                        },
                    });
            },
            areArraysEqualSorted: function (arr1, arr2) {
                if (arr1.length !== arr2.length) return false;

                const sorted1 = arr1.slice().sort((a, b) => a.key.localeCompare(b.key));
                const sorted2 = arr2.slice().sort((a, b) => a.key.localeCompare(b.key));

                return sorted1.every(
                    (item, index) =>
                        item.key === sorted2[index].key && item.text === sorted2[index].text
                );
            },
            saveDefaultVariant: function () {
                sap.ui.core.BusyIndicator.show();
                var array = [];
                var details = {};
                let oSmartFilterBar = this.getView().byId("smartFilterBarAR");
                var sLocation = oSmartFilterBar.getFilterData()["FACTORY_LOC"];
                var Field1 = "Assembly Manufacturing Location";
                var sProduct = oSmartFilterBar.getFilterData()["REF_PRODID"];
                var Field2 = "Config Product";
                var sAssembly = oSmartFilterBar.getFilterData()["ASSEMBLY"];
                var Field4 = "Assembly";
                var sUniqueID = oSmartFilterBar.getFilterData()["UNIQUE_ID"];
                var Field5 = "Unique ID";
                var sVersion = oSmartFilterBar.getFilterData()["VERSION"];
                var Field6 = "Version";
                var sScenario = oSmartFilterBar.getFilterData()["SCENARIO"];
                var Field7 = "Scenario";

                if (!sLocation && !sProduct && !sUniqueID) {
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }

                if (sLocation) {
                    for (var s = 0; s < sLocation.items.length; s++) {
                        details = {
                            Field: Field1,
                            FieldCenter: sLocation.items[s].key, //sLocation[s].getKey(),
                            Value: sLocation.items[s].text,
                        };
                        array.push(details);
                    }
                }
                if (sProduct) {
                    for (var s = 0; s < sProduct.items.length; s++) {
                        details = {
                            Field: Field2,
                            FieldCenter: sProduct.items[s].key, //getKey(),
                            Value: sProduct.items[s].text,
                        };
                        array.push(details);
                    }
                }
                if (sAssembly) {
                    for (var s = 0; s < sAssembly.items.length; s++) {
                        details = {
                            Field: Field4,
                            FieldCenter: sAssembly.items[s].key,
                            Value: sAssembly.items[s].text,
                        };
                        array.push(details);
                    }
                }
                if (sUniqueID) {
                    for (var s = 0; s < sUniqueID.items.length; s++) {
                        details = {
                            Field: Field5,
                            FieldCenter: sUniqueID.items[s].key,
                            Value: sUniqueID.items[s].text
                        }
                        array.push(details);
                    }
                }


                var flag = "N";
                for (var j = 0; j < array.length; j++) {
                    array[j].IDNAME = "defaultMulti";
                    array[j].App_Name = "DefaultMulti";
                    array[j].SCOPE = "Global";
                }

                //    console.log(JSON.stringify(array));
                this.getOwnerComponent()
                    .getModel("aModel")
                    .callFunction("/createVariant", {
                        method: "GET",
                        urlParameters: {
                            Flag: flag,
                            USER: that.oGModel.getProperty("/UserId"),
                            VARDATA: JSON.stringify(array),
                        },
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide();
                        },
                        error: function (error) {
                            sap.ui.core.BusyIndicator.hide();
                            sap.m.MessageToast.show("Failed to create global variant");
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
                    oStorage.put("nodeId", 83);
                    //Generate a  URL for the second application
                    var url = window.location.href.split('#')[0] + hash;
                    //Navigate to second app
                    sap.m.URLHelper.redirect(url, true);
                }
            },
        });
    }
);
