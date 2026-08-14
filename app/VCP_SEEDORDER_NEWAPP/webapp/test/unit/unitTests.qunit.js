/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"vcp/vcp_seedorder_creation_new/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
