/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "vcpapp/vcpmaterialrequirements/model/models"
],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("vcpapp.vcpmaterialrequirements.Component", {
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

                function loadScript(src) {
                    return new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = src;
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                (async function loadAllScripts() {
                    try {
                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js');
                        console.log('jQuery UI loaded');

                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jqueryui-touch-punch/0.2.3/jquery.ui.touch-punch.min.js');
                        console.log('Touch Punch loaded');

                        await loadScript('https://cdn.plot.ly/plotly-basic-latest.min.js');
                        console.log('Plotly Basic loaded');

                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pivottable/2.22.0/pivot.min.js');
                        console.log('PivotTable loaded');

                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pivottable/2.22.0/plotly_renderers.min.js');
                        console.log('Plotly Renderers loaded');

                        // Safe to initialize pivot now
                        // e.g. $("#output").pivotUI(...)
                    } catch (e) {
                        console.error('Failed to load a script:', e);
                    }
                })();



            }
        });
    }
);