sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Control, MessageToast, Fragment, Filter, FilterOperator) {
    "use strict";
    return Control.extend("custom.controls.Unique", {
        // Metadata configuration for the control
        metadata: {
            properties: {},
            events: {
                openUniqueIdDialog: {}
            }
        },
        //Renderer defines how the control looks
        renderer: {
            render: function (oRM, oControl) {
                oRM.openStart("button", oControl);
                oRM.class("sapMBtn sapMBtnBase sapMBtnDefault sapUiTinyMargin");
                oRM.openEnd();
                oRM.close("button");
            }
        },
        //  Loads the Unique ID Fragment
        loadUniqueIdFragment: async function () {
            if (!this._oUniqueIdFragment) {
                try {
                    this._oUniqueIdFragment = await Fragment.load({
                        id: this.getId(),
                        name: "vcpapp.vcpmaterialrequirements.controls.CharacteristicValue",
                        controller: this
                    });
                    this.addDependent(this._oUniqueIdFragment);
                } catch (error) {
                    MessageToast.show("Failed to load characteristic dialog");
                    console.error(error);
                }
            }
            var oTable = sap.ui.core.Fragment.byId(this.getId(), "tblUniqueId");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);
            }
            return this._oUniqueIdFragment;
        },
        // Handles live search for the Unique ID table
        onUniqueIdSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = sap.ui.core.Fragment.byId(this.getId(), "tblUniqueId");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];
            //filters for CHAR_NAME and CHAR_VALUE
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("CHAR_NAME", FilterOperator.Contains, sQuery),
                        new Filter("CHAR_VALUE", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            oBinding.filter(aFilters);
        },
        onUniqueIdCancel: function () {
            if (this._oUniqueIdFragment) {
                this._oUniqueIdFragment.close();
            }
            // Reset search field and table filter
            var oSearchField = sap.ui.core.Fragment.byId(this.getId(), "uniqueIdSearchField");
            if (oSearchField) oSearchField.setValue("");
            var oTable = sap.ui.core.Fragment.byId(this.getId(), "tblUniqueId");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.filter([]);
            }
        }
    });
});
