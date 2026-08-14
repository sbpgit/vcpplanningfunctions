sap.ui.define([
    "sap/ui/core/UIComponent",
    "vcp/vcpoptionpercentagesoptimised/model/models"
], function (UIComponent, models) {
    "use strict";

    return UIComponent.extend("vcp.vcpoptionpercentagesoptimised.Component", {

        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {

            UIComponent.prototype.init.apply(this, arguments);

            // initialize router
            this.getRouter().initialize();

            // set device model
            this.setModel(models.createDeviceModel(), "device");

            // Handsontable JS
            var oHandsonScript = document.createElement("script");
            oHandsonScript.src = "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.js";
            document.head.appendChild(oHandsonScript);

            // XLSX JS
            var oXlsxScript = document.createElement("script");
            oXlsxScript.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.4/xlsx.full.min.js";
            document.head.appendChild(oXlsxScript);

            // Handsontable CSS
            var oCssScript = document.createElement("link");
            oCssScript.rel = "stylesheet";
            oCssScript.href = "https://cdn.jsdelivr.net/npm/handsontable/dist/handsontable.full.min.css";
            document.head.appendChild(oCssScript);

        }

    });
});