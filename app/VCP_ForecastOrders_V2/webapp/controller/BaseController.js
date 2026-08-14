sap.ui.define(
    ["sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History"
    ],
    function (Controller, History) {
        "use strict";

        return Controller.extend("vcpapp.vcpforecastingordersbeta.controller.BaseController",
            {
                /**
                 * Convenience method for accessing the router.
                 * @public
                 * @returns {sap.ui.core.routing.Router} the router for this component
                 */
                getRouter: function () {
                    return sap.ui.core.UIComponent.getRouterFor(this);
                },

                /**
                 * Convenience method for getting the view model by name.
                 * @public
                 * @param {string} [sName] the model name
                 * @returns {sap.ui.model.Model} the model instance
                 */
                getModel: function (sName) {
                    return this.getView().getModel(sName);
                },

                /**
                 * Convenience method for setting the view model.
                 * @public
                 * @param {sap.ui.model.Model} oModel the model instance
                 * @param {string} sName the model name
                 * @returns {sap.ui.mvc.View} the view instance
                 */
                setModel: function (oModel, sName) {
                    return this.getView().setModel(oModel, sName);
                },

                /**
                 * Getter for the resource bundle.
                 * @public
                 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
                 */
                getResourceBundle: function () {
                    return this.getOwnerComponent().getModel("i18n").getResourceBundle();
                },
                // get user data
                getUserDetails: function () {
                    let vUser;
                    if (sap.ushell.Container) {
                        let email = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
                        vUser = (email) ? email : "";
                    }
                    return vUser;
                },
                /**
                   * 
                   */
                getWeekNumber: function (dInpDate) {
                    var dCurrentDate = new Date(dInpDate);
                    var dStartDate = new Date(dCurrentDate.getFullYear(), 0, 1);
                    var iDays = Math.floor((dCurrentDate - dStartDate) / (24 * 60 * 60 * 1000));
                    var iWeek = Math.ceil(iDays / 7);
                    var bLeapYear = this.checkLeapYear(dCurrentDate.getFullYear());
                    if (bLeapYear === true) {
                        iWeek = iWeek + 1;
                    }
                    return iWeek;
                },
                /**
                 * Check if the year is a leap year or not
                 */
                checkLeapYear: function (iYear) {
                    return (iYear % 100 === 0) ? (iYear % 400 === 0) : (iYear % 4 === 0);
                }

            }
        );
    }
);
