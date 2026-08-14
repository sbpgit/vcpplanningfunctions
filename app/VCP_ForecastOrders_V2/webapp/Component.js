/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "vcpapp/vcpforecastingordersbeta/model/models"
],
function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("vcpapp.vcpforecastingordersbeta.Component", {
        metadata: {
            manifest: "json"
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            var jQueryScript = document.createElement('script');
            jQueryScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js');
            document.head.appendChild(jQueryScript);

            var xlsxScript = document.createElement('script');
            xlsxScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.4/xlsx.full.min.js');
            document.head.appendChild(xlsxScript);

            var CSSScript = document.createElement('link');
            CSSScript.setAttribute('rel', 'stylesheet');
            CSSScript.setAttribute('href', 'https://cdn.jsdelivr.net/npm/handsontable/styles/handsontable.min.css');
            document.head.appendChild(CSSScript);

            var CSSthemeScript = document.createElement('link');
            CSSthemeScript.setAttribute('rel', 'stylesheet');
            CSSthemeScript.setAttribute('href', 'https://cdn.jsdelivr.net/npm/handsontable/styles/ht-theme-main.min.css');
            document.head.appendChild(CSSthemeScript);
        }
    });
}
);