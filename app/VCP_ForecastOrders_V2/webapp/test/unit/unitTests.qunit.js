/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"vcpapp/vcp_forecasting_orders_beta/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
