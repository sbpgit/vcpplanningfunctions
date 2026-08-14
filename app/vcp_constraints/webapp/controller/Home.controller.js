sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], (Controller, JSONModel, Filter,
    FilterOperator,
    MessageBox) => {
    "use strict";
    let that;
    return Controller.extend("vcpapp.vcpconstraints.controller.Home", {
        onInit() {
            that = this;
            that.aModel = that.getOwnerComponent().getModel("aModel");
            that.cModel = that.getOwnerComponent().getModel("cModel");
            that.FilterBar = that.byId("smartFilterBarVC");
            that.FilterBar.setModel(that.aModel);
            var oMetaModel = that.aModel.getMetaModel();

            if (sap.ushell) {
                that.sUser = sap.ushell?.Container?.getService("UserInfo")?.getEmail()
            }
            if (!that.sUser) {
                that.sUser = 'null';
            }
            oMetaModel.loaded().then(function () {
                const aFields = ["REF_PRODID"];

                aFields.forEach(function (sField) {
                    that.updateValueListConstantMail(oMetaModel, "getAlytRolesLocProd", sField, that.sUser);
                });
            });

            this.getView().setModel(new JSONModel({ addRule: false, isEditable: false }), "GModel");
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
        async onGo() {
            that.byId("idCharList").setBusy(true);
            const product = that.FilterBar.getFilterData().REF_PRODID;
            const prodChar = await that.readAllData("getPrioritizedCharValues", { "$orderby": "SEQUENCE" }, [new Filter("PRODUCT_ID", FilterOperator.EQ, product)]);
            const CharDesc = Object.groupBy(prodChar, (item) => item.CHAR_DESC);
            const charData = Object.entries(CharDesc).map(([key, value]) => ({
                charDesc: key,
                CHAR_NAME: value[0].CHAR_NAME,
                charValues: value
            }));
            that.charMap = new Map();
            for (const { PRODUCT_ID, CHAR_NAME, CHARVAL_NUM, CHARVAL_DESC } of prodChar) {
                that.charMap.set(PRODUCT_ID + "_" + CHAR_NAME + "_" + CHARVAL_NUM, CHARVAL_DESC)
            }
            this.byId("idCharList").setModel(new JSONModel({ charList: charData }));
            that.byId("idCharList").setBusy(false);

            //reading Rules
            that.readRules();

        },
        async readRules() {
            that.byId("RuleBox").setBusy(true);
            const filter = [
                new Filter("PRODUCT_ID", FilterOperator.EQ, that.FilterBar.getFilterData().REF_PRODID),
                new Filter([new Filter("TYPE", FilterOperator.NE, "E"), new Filter("TYPE", FilterOperator.NE, "I")], true)
            ];
            const prodRules = await that.readAllData("getDerivedCharRules", {}, filter);
            const Rules = that.createRule(prodRules);
            const oRoleModel = new JSONModel({
                roleList: Rules
            });
            this.byId("idRoleList").setModel(oRoleModel);
            this.getView().getModel("GModel").setProperty("/isEditable", !!(Rules[0]?.editable));
            this.getView().getModel("GModel").setProperty("/addRule", !Rules[0] || Rules[0].editable);
            that.dataBaseRule = prodRules;
            that.byId("RuleBox").setBusy(false);
        },
        createRule(rawRule) {

            const Rules = [];
            const groupByRuleName = Object.groupBy(rawRule, (item) => item.DEPENDENCY);

            for (const [roleName, items] of Object.entries(groupByRuleName)) {

                const ifBlock = items.filter(item => item.CLAUSE === "IF");
                const CharNameGroupIf = Object.groupBy(ifBlock, (i) => i.CHAR_NAME);

                const ifConditions = [];

                for (const [CHAR_NAME, items] of Object.entries(CharNameGroupIf)) {


                    const block = {
                        charDesc: CHAR_NAME,
                        charValues: [],
                        operator: items[0].OPERATOR_FLAG || items[0].OPERATOR,
                        editable: items[0].OPERATOR_FLAG !== null,
                        VALID_FROM: items[0]?.VALID_FROM
                    };

                    items.forEach(c => {
                        if (!block.charValues.find(o => o.CHARVAL_NUM === c.CHAR_VALUE))
                            block.charValues.push({
                                CHARVAL_NUM: c.CHAR_VALUE,
                                CHARVAL_DESC: that.charMap.get(
                                    c.PRODUCT_ID + "_" + c.CHAR_NAME + "_" + c.CHAR_VALUE
                                ) || c.CHAR_VALUE,
                                editable: c.OPERATOR_FLAG !== null
                            });
                    });

                    ifConditions.push(block);
                }

                // THEN BLOCK

                const thenBlock = items.filter(item => item.CLAUSE === "THEN");
                const CharNameGroupthen = Object.groupBy(thenBlock, (i) => i.CHAR_NAME);

                const thenConditions = [];

                for (const [CHAR_NAME, items] of Object.entries(CharNameGroupthen)) {

                    const block = {
                        charDesc: CHAR_NAME,
                        charValues: [],
                        operator: items[0].OPERATOR_FLAG ?? (items[0].OPERATOR === "EQ" ? "MB" : "CNB"),
                        editable: items[0].OPERATOR_FLAG !== null,
                        VALID_FROM: items[0]?.VALID_FROM
                    };

                    items.forEach(c => {
                        if (!block.charValues.find(o => o.CHARVAL_NUM === c.CHAR_VALUE))
                            block.charValues.push({
                                CHARVAL_NUM: c.CHAR_VALUE,
                                CHARVAL_DESC: that.charMap.get(
                                    c.PRODUCT_ID + "_" + c.CHAR_NAME + "_" + c.CHAR_VALUE
                                ) || c.CHAR_VALUE,
                                editable: c.OPERATOR_FLAG !== null
                            });
                    });

                    thenConditions.push(block);
                }

                Rules.push({
                    roleName,
                    isActive: items[0].ACTIVE,
                    editable: items[0].OPERATOR_FLAG !== null,
                    ifConditions,
                    thenConditions
                });
            }

            return Rules;
        },
        readAllData(entity, urlParameters, filter = []) {
            let allResults = [];
            let skip = 0;
            const top = urlParameters.$top || 50000; // Use provided top or default to 20,000

            // Function to recursively fetch data
            const fetchData = async () => {
                // Create a copy of urlParameters and update skip
                const currentUrlParameters = { ...urlParameters, $top: top, $skip: skip };

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
        onCharDragStart(oEvent) {
            const oDraggedItem = oEvent.getParameter("target"),
                oData = oDraggedItem.getBindingContext().getObject();
            this._oDraggedChar = {
                charDesc: oData.CHAR_NAME,
                charValues: [
                    {
                        CHARVAL_NUM: oData.CHARVAL_NUM,
                        CHARVAL_DESC: oData.CHARVAL_DESC
                    }
                ]
            };
        },
        onDropIF(oEvent) {
            if (!this._oDraggedChar) return;

            const oRoleModel = this.byId("idRoleList").getModel(),
                oDropVBox = oEvent.getSource(),
                sRolePath = oDropVBox.getBindingContext().getPath(),
                aConditions = oRoleModel.getProperty(sRolePath + "/ifConditions") || [],
                thenConditions = oRoleModel.getProperty(sRolePath + "/thenConditions") || [];

            const findCharinTHAN = thenConditions.findIndex(item => item.charDesc === this._oDraggedChar.charDesc);
            if (findCharinTHAN !== -1) {
                return;
            }

            const findCharvalIndex = aConditions.findIndex(item => item.charValues.find(o => o.CHARVAL_DESC === this._oDraggedChar.charValues[0].CHARVAL_DESC));
            if (findCharvalIndex !== -1) {
                return;
            }

            const findIndex = aConditions.findIndex(item => item.charDesc === this._oDraggedChar.charDesc);

            if (findIndex !== -1) {
                aConditions[findIndex].charValues.push(this._oDraggedChar.charValues[0])
            } else {
                aConditions.push({
                    charDesc: this._oDraggedChar.charDesc,
                    charValues: this._oDraggedChar.charValues,
                    operator: "EQ",
                    VALID_FROM: "0001-01-01",
                    VALID_TO: '9999-12-31',
                    TYPE: 'S'
                });
            }

            oRoleModel.setProperty(sRolePath + "/ifConditions", aConditions);
            oRoleModel.refresh(true)
            this._oDraggedChar = null;
            this.getView().getModel("GModel").setProperty("/isEditable", !!(aConditions[0]));
        },
        onDropTHEN(oEvent) {
            if (!this._oDraggedChar) return;

            const oRoleModel = this.byId("idRoleList").getModel(),
                oDropVBox = oEvent.getSource(),
                sRolePath = oDropVBox.getBindingContext().getPath(),
                aConditions = oRoleModel.getProperty(sRolePath + "/thenConditions") || [],
                ifConditions = oRoleModel.getProperty(sRolePath + "/ifConditions") || [];

            const findCharinIF = ifConditions.findIndex(item => item.charDesc === this._oDraggedChar.charDesc);
            if (findCharinIF !== -1) {
                return;
            }

            const findCharvalIndex = aConditions.findIndex(item => item.charValues.find(o => o.CHARVAL_DESC === this._oDraggedChar.charValues[0].CHARVAL_DESC));
            if (findCharvalIndex !== -1) {
                return;
            }

            const findIndex = aConditions.findIndex(item => item.charDesc === this._oDraggedChar.charDesc);

            if (findIndex !== -1) {
                aConditions[findIndex].charValues.push(this._oDraggedChar.charValues[0])
            } else {
                aConditions.push({
                    charDesc: this._oDraggedChar.charDesc,
                    charValues: this._oDraggedChar.charValues,
                    operator: "MB",
                    VALID_FROM: "0001-01-01",
                    VALID_TO: '9999-12-31',
                    TYPE: 'S'
                });
            }

            oRoleModel.setProperty(sRolePath + "/thenConditions", aConditions);
            oRoleModel.refresh(true)
            this._oDraggedChar = null;
            this.getView().getModel("GModel").setProperty("/isEditable", !!(aConditions[0]));
        },
        onRemoveTag(oEvent) {
            const oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                sPath = oSource.getBindingContext().getPath(),
                sParentPath = sPath.substring(0, sPath.lastIndexOf("/")),
                iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1)),
                aItems = oModel.getProperty(sParentPath);

            aItems.splice(iIndex, 1);
            oModel.setProperty(sParentPath, aItems);

            if (aItems.length === 0) {
                const sGrandParentPath = sParentPath.substring(0, sParentPath.lastIndexOf("/")),
                    sConditionParentPath = sGrandParentPath.substring(0, sGrandParentPath.lastIndexOf("/")),
                    iConditionIndex = parseInt(sGrandParentPath.substring(sGrandParentPath.lastIndexOf("/") + 1)),
                    aConditions = oModel.getProperty(sConditionParentPath);

                aConditions.splice(iConditionIndex, 1);
                oModel.setProperty(sConditionParentPath, aConditions);
            }
        },
        onRemoveIfCondition(oEvent) {
            const oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                sPath = oSource.getBindingContext().getPath(),
                sParentPath = sPath.substring(0, sPath.lastIndexOf("/")),
                iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1)),
                aItems = oModel.getProperty(sParentPath);

            aItems.splice(iIndex, 1);
            oModel.setProperty(sParentPath, aItems);
        },
        onCharSearch(oEvent) {
            const sQuery = oEvent.getParameter("newValue").toLowerCase().trim(),
                oModel = that.byId("idCharList").getModel(),
                aCharList = oModel.getProperty("/charList");

            aCharList.forEach((oChar) => {
                const bCharNameMatch = oChar.charDesc.toLowerCase().includes(sQuery);
                let bAnyValMatch = false;

                // Filter individual values
                oChar.charValues.forEach((oVal) => {
                    const bValMatch = oVal.CHARVAL_DESC.toLowerCase().includes(sQuery);
                    oVal.valVisible = !sQuery || bCharNameMatch || bValMatch;
                    if (bValMatch) bAnyValMatch = true;
                });

                // Show char if name matches or any value matches
                oChar.charVisible = !sQuery || bCharNameMatch || bAnyValMatch;

                // Auto-expand panel if a value matched (not just the char name)
                oChar.charExpanded = sQuery ? bAnyValMatch : false;
            });

            oModel.setProperty("/charList", aCharList);
        },
        onAddRule() {
            const oModel = this.byId("idRoleList").getModel(),
                aRoleList = oModel.getProperty("/roleList");

            aRoleList.push({
                roleName: "New Configuration Rule",
                isActive: true,
                ifConditions: [],
                thenConditions: []
            });

            oModel.setProperty("/roleList", aRoleList);
        },
        onDeleteRule(oEvent) {
            const oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                sPath = oSource.getBindingContext().getPath(),
                sParentPath = sPath.substring(0, sPath.lastIndexOf("/")),
                iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1)),
                aItems = oModel.getProperty(sParentPath);

            aItems.splice(iIndex, 1);
            oModel.setProperty(sParentPath, aItems);
        },
        onToggleRuleActive(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const bCurrent = oContext.getProperty("isActive");
            // Button → Toolbar → Panel
            const oPanel = oEvent.getSource().getParent().getParent();

            if (bCurrent) {
                oPanel.removeStyleClass("ruleInactive");
            } else {
                oPanel.addStyleClass("ruleInactive");
            }
        },
        onCopyRule(oEvent) {
            const oModel = this.byId("idRoleList").getModel();
            const sPath = oEvent.getSource().getBindingContext().getPath(); // /roleList/1
            const oCopyData = JSON.parse(JSON.stringify(oModel.getProperty(sPath)));

            oCopyData.roleName += " (copy)";
            oCopyData.editable = true;

            const nIndex = parseInt(sPath.split("/").pop()); // 1

            const aRoleList = oModel.getProperty("/roleList");
            aRoleList.splice(nIndex + 1, 0, oCopyData); // insert right after source

            oModel.setProperty("/roleList", aRoleList);
        },
        onOverflowToolbarPress(oEvent) {
            if (oEvent.mParameters.srcControl.isA("sap.m.Input")) {
                return; // Ignore clicks on the Input
            }
            const oPanel = oEvent.getSource().getParent();
            oPanel.setExpanded(!oPanel.getExpanded());
        },
        onListUpdateFinished(oEvent) {
            const oList = oEvent.getSource();
            oList.getItems().forEach(oItem => {
                const oContext = oItem.getBindingContext();
                if (!oContext) return;
                const bActive = oContext.getProperty("isActive");
                const oPanel = oItem.getContent()[0]; // first content = Panel
                oPanel.toggleStyleClass("ruleInactive", !bActive);
            });
        },
        async onPressSave() {
            try {
                const rules = this.byId("idRoleList").getModel().getData();
                const RuleNames = rules.roleList.map(rule => rule.roleName.trim());
                if (RuleNames.length !== new Set(RuleNames).size) {
                    return MessageBox.warning("Give Unique Name For Each Rule");
                }
                const allValid = rules.roleList.every((rule) => {
                    if (!rule.ifConditions.length || !rule.thenConditions.length) {
                        sap.m.MessageToast.show(`${rule.roleName.trim()} Is Not Valid`);
                        return false;
                    }
                    return true;
                });

                if (!allValid)
                    return;

                const charvalLevel = that.flattenRules(rules);
                // const groupByRule = Object.groupBy(charvalLevel, (item) => item.RULE_ID); // For test Purpuse
                // const groupByRuleName = Object.groupBy(charvalLevel, (item) => item.DEPENDENCY);

                const matchKeys = ['PRODUCT_ID', 'DEPENDENCY', 'RULE_ID', 'CHAR_NAME', 'CHAR_VALUE', 'CLAUSE', 'OPERATOR'];
                const { added, deleted, updated } = that.compareArrays(that.dataBaseRule, charvalLevel, matchKeys);

                that.byId("RuleBox").setBusy(true);

                const hasChanges = Object.keys(added).length || Object.keys(deleted).length || Object.keys(updated).length;

                if (Object.keys(added).length) await this._batchCreate(added, that.cModel);
                if (Object.keys(deleted).length) await this._batchDelete(deleted, that.cModel);
                if (Object.keys(updated).length) await this._batchUpdate(updated, that.cModel);

                if (hasChanges) {
                    that.readRules();
                }
            } catch (error) {
                console.error(error);
                MessageBox.error("Save Failed", {
                    title: "Error",
                    emphasizedAction: MessageBox.Action.CLOSE,
                    icon: MessageBox.Icon.ERROR
                });
            } finally {
                that.byId("RuleBox").setBusy(false);
            }

        },
        _batchDelete: function (deleted, cModel) {
            return new Promise((resolve, reject) => {
                cModel.setDeferredGroups([...cModel.getDeferredGroups(), "deleteRuleBatch"]);

                Object.values(deleted).flat().forEach(entry => {
                    const sKey = cModel.createKey("/getDerivedCharRules", {
                        PRODUCT_ID: entry.PRODUCT_ID,
                        DEPENDENCY: entry.DEPENDENCY,
                        RULE_ID: entry.RULE_ID,
                        CHAR_NAME: entry.CHAR_NAME,
                        CHAR_VALUE: entry.CHAR_VALUE,
                        CLAUSE: entry.CLAUSE,
                        OPERATOR: entry.OPERATOR,
                        VALID_FROM: entry.VALID_FROM
                    });
                    cModel.remove(sKey, { groupId: "deleteRuleBatch" });
                });

                cModel.submitChanges({
                    groupId: "deleteRuleBatch",
                    success: resolve,
                    error: reject
                });
            });
        },
        _batchCreate: function (added, cModel) {
            return new Promise((resolve, reject) => {
                cModel.setDeferredGroups([...cModel.getDeferredGroups(), "createRuleBatch"]);

                Object.values(added).flat().forEach(entry => {
                    // // entry.VALID_FROM = new Date().toISOString().split('T')[0];
                    // entry.VALID_FROM = '0001-01-01';
                    entry.VALID_TO = '9999-12-31';
                    entry.TYPE = 'S';
                    cModel.create("/getDerivedCharRules", entry, { groupId: "createRuleBatch" });
                });

                cModel.submitChanges({
                    groupId: "createRuleBatch",
                    success: function () {
                        that.cModel.callFunction("/generateNodes", {
                            method: "GET",
                            urlParameters: {
                                PRODUCT_ID: that.FilterBar.getFilterData().REF_PRODID
                            },
                            success: resolve,
                            error: reject
                        });
                    },
                    error: reject
                });
            });
        },
        _batchUpdate: async function (updated, cModel) {
            const originals = Object.values(updated).map(u => u.original).flat();
            const news = Object.values(updated).map(u => u.new).flat();

            await this._batchDelete({ updated: originals }, cModel);
            await this._batchCreate({ updated: news }, cModel);
        },
        compareArrays(origArr, newArr) {
            const IGNORED = ['__metadata', 'VALID_TO', 'TYPE', 'CLASS_NAME'];

            function stripMeta(obj) {
                return Object.fromEntries(
                    Object.entries(obj).filter(([k]) => !IGNORED.includes(k))
                );
            }

            function groupByDependency(arr) {
                return Object.groupBy(arr.map(stripMeta), obj => obj.DEPENDENCY);
            }

            function stableStringify(obj) {
                return JSON.stringify(obj, Object.keys(obj).sort());
            }

            function sortGroup(group) {
                return [...group].sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
            }

            function hasGroupChanged(origGroup, newGroup) {
                if (origGroup.length !== newGroup.length) return true;
                const sortedOrig = sortGroup(origGroup);
                const sortedNew = sortGroup(newGroup);
                return sortedNew.some((newObj, i) => stableStringify(newObj) !== stableStringify(sortedOrig[i]));
            }

            const origGroups = groupByDependency(origArr);
            const newGroups = groupByDependency(newArr);

            const origDeps = Object.keys(origGroups);
            const newDeps = Object.keys(newGroups);

            const added = {};
            const deleted = {};
            const updated = {};

            // new DEPENDENCY that didn't exist in original
            newDeps.filter(dep => !origGroups[dep]).forEach(dep => added[dep] = newGroups[dep]);

            // DEPENDENCY removed from original
            origDeps.filter(dep => !newGroups[dep]).forEach(dep => deleted[dep] = origGroups[dep]);

            // DEPENDENCY exists in both but something changed inside
            newDeps.filter(dep => origGroups[dep] && hasGroupChanged(origGroups[dep], newGroups[dep]))
                .forEach(dep => updated[dep] = {
                    original: origGroups[dep],
                    new: newGroups[dep]
                });

            return { added, deleted, updated };
        },
        flattenRules(data) {
            const result = [];

            // Helper functions

            const isOrOperator = (op) => ["IN", "MBOF"].includes(op);
            const isAndOperator = (op) => ["EQ", "NE", "MB", "CNB"].includes(op);

            for (const role of data.roleList) {

                // STEP 1: Build IF groups
                let ifGroups = [];

                for (const cond of role.ifConditions) {

                    let items = [];

                    if (isOrOperator(cond.operator)) {
                        // OR → each value becomes separate group
                        items = cond.charValues.map((val) => [{
                            charDesc: cond.charDesc,
                            CHARVAL_NUM: val.CHARVAL_NUM,
                            CHARVAL_DESC: val.CHARVAL_DESC,
                            operator: cond.operator,
                            VALID_FROM: cond.VALID_FROM
                        }]);
                    }
                    else if (isAndOperator(cond.operator)) {
                        // AND → all values stay in one group
                        items = [cond.charValues.map((val) => ({
                            charDesc: cond.charDesc,
                            CHARVAL_NUM: val.CHARVAL_NUM,
                            CHARVAL_DESC: val.CHARVAL_DESC,
                            operator: cond.operator,
                            VALID_FROM: cond.VALID_FROM
                        }))];
                    }

                    // First condition initialization
                    if (ifGroups.length === 0) {
                        ifGroups = items;
                    }
                    else {
                        const newGroups = [];
                        for (const group of ifGroups) {
                            for (const itemGroup of items) {
                                newGroups.push([...group, ...itemGroup]);
                            }
                        }
                        ifGroups = newGroups;
                    }
                }

                // STEP 2: Build THEN groups
                let thenGroups = [[]];

                for (const cond of role.thenConditions) {

                    let items = [];

                    if (isOrOperator(cond.operator)) {
                        items = cond.charValues.map((val) => [{
                            charDesc: cond.charDesc,
                            CHARVAL_NUM: val.CHARVAL_NUM,
                            CHARVAL_DESC: val.CHARVAL_DESC,
                            operator: cond.operator,
                            VALID_FROM: cond.VALID_FROM
                        }]);
                    }
                    else if (isAndOperator(cond.operator)) {
                        items = [cond.charValues.map((val) => ({
                            charDesc: cond.charDesc,
                            CHARVAL_NUM: val.CHARVAL_NUM,
                            CHARVAL_DESC: val.CHARVAL_DESC,
                            operator: cond.operator,
                            VALID_FROM: cond.VALID_FROM
                        }))];
                    }

                    const newGroups = [];
                    for (const group of thenGroups) {
                        for (const itemGroup of items) {
                            newGroups.push([...group, ...itemGroup]);
                        }
                    }
                    thenGroups = newGroups;
                }

                // STEP 3: Combine IF × THEN → Final rules
                let ruleNumber = 0;

                for (const ifGroup of ifGroups) {
                    for (const thenGroup of thenGroups) {
                        ruleNumber++;

                        // IF rows
                        for (const item of ifGroup) {
                            result.push({
                                RULE_ID: ruleNumber,
                                CHAR_NAME: item.charDesc,
                                CHAR_VALUE: item.CHARVAL_NUM,
                                CLAUSE: "IF",
                                // OPERATOR: item.operator === "NE" ? "NE" : "EQ",
                                OPERATOR: "EQ",
                                OPERATOR_FLAG: item.operator,
                                DEPENDENCY: role.roleName,
                                PRODUCT_ID: that.FilterBar.getFilterData().REF_PRODID,
                                ACTIVE: role.isActive,
                                VALID_FROM: item.VALID_FROM
                            });
                        }

                        // THEN rows
                        for (const item of thenGroup) {
                            result.push({
                                RULE_ID: ruleNumber,
                                CHAR_NAME: item.charDesc,
                                CHAR_VALUE: item.CHARVAL_NUM,
                                CLAUSE: "THEN",
                                OPERATOR: item.operator === "CNB" ? "NE" : "EQ",
                                OPERATOR_FLAG: item.operator,
                                DEPENDENCY: role.roleName,
                                PRODUCT_ID: that.FilterBar.getFilterData().REF_PRODID,
                                ACTIVE: role.isActive,
                                VALID_FROM: item.VALID_FROM
                            });
                        }
                    }
                }
            }

            return result;
        },
        onPressReset() {
            that.readRules();
        }
    });
});
