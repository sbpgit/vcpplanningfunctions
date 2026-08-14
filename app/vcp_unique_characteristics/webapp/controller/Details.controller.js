sap.ui.define(
  [
    "vcpapp/vcpuniquecharacteristics/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
  ],
  function (
    BaseController,
    JSONModel,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
    Device
  ) {
    "use strict";
    var that, oGModel;

    return BaseController.extend("vcpapp.vcpuniquecharacteristics.controller.Details", {
      /**
       * Called when a controller is instantiated and its View controls (if available) are already created.
       * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
       */
      onInit: function () {
        that = this;
        this.bus = sap.ui.getCore().getEventBus();
        this.bus.subscribe(
          "vcpapp.vcpuniquecharacteristics",
          "addBeginPage",
          this.addBeginPage,
          this
        );
        this.bus.subscribe(

          "vcpapp.vcpuniquecharacteristics",
          "addDetailPage",
          this.addDetailPage,
          this
        );
        this.bus.subscribe("nav", "toBeginPage", this.toBeginPage, this);
        this.bus.subscribe("nav", "toDetailPage", this.toDetailPage, this);
        this.bus.subscribe("nav", "backToBegin", this.backToBegin, this);
        this.bus.subscribe("nav", "expandBegin", this.expandBegin, this);

        var oViewModel = new JSONModel({
          sideMenuBurgerVisible: !Device.system.desktop, // Show on mobile/tablet, hide on desktop
          expanded: false
        });

        this.getView().setModel(oViewModel, "appView");
        Device.resize.attachHandler(function () {
          that._updateMenuVisibility();
        });


        //   that._updateMenuVisibility();

        // Attach resize event
        sap.ui.Device.resize.attachHandler(this._updateMenuVisibility.bind(this));

        this.oFlexibleColumnLayout = this.byId("fclUC");
        this.getRouter()
          .getRoute("Details")
          .attachPatternMatched(this._onPatternMatched.bind(this));
        if (Device.system.phone) {
          this.oFlexibleColumnLayout.setLayout(
            sap.f.LayoutType.MidColumnFullScreen
          );
        } else {
          this.oFlexibleColumnLayout.setLayout(
            sap.f.LayoutType.TwoColumnsMidExpanded
          );
        }
        var oViewModel = new JSONModel({
          expanded: true,
          midExists: false,
          busy: true,
          delay: 0,
        });

        this.setModel(oViewModel, "appView");

        if (Device.support.touch) {
          Device.orientation.attachHandler(function (oEvt) {
            NotificationObj.onAfterRendering();
            NotificationObj.iconWidth = 0;
            NotificationObj.oldBeginColNoImgWidth = 0;
            NotificationObj.newMidColumnWidth = 0;
          });
        }
        // sap.ui.core.BusyIndicator.show();
        // that.getOwnerComponent().getModel("BModel").read("/getUserPreferences", {
        //   filters: [
        //     new Filter("PARAMETER", FilterOperator.EQ, "MAX_RECORDS")
        //   ],
        //   success: function (oData) {
        //     sap.ui.core.BusyIndicator.hide();
        //     that.getModel("oGModel").setProperty("/MaxCount", oData.results[0].PARAMETER_VALUE);
        //   },
        //   error: function (oData, error) {
        //     console.log(error)
        //   },
        // });
      },

      _updateMenuVisibility: function () {
        var oViewModel = that.getView().getModel("appView");

        // Get screen width dynamically
        var isPhone = Device.system.phone;
        var isTablet = Device.system.tablet;
        var screenWidth = window.innerWidth; // Get current screen width

        if (isPhone || isTablet || screenWidth < 1024) {
          // Show menu for mobile and tablet screens (or when width is less than 768px)
          that.byId("leftMenuUC").setVisible(true);
          oViewModel.setProperty("/sideMenuBurgerVisible", true);
          oViewModel.setProperty("/expanded", true);
        } else {
          // Hide menu for desktops (or larger screens)
          that.byId("leftMenuUC").setVisible(false);
          oViewModel.setProperty("/expanded", false);
        }
      },

      /**
       * This function is called when come back.
       */
      onExit: function () {
        this.bus.unsubscribe(
          "vcpapp.vcpuniquecharacteristics",
          "addBeginPage",
          this.addBeginPage,
          this
        );
        this.bus.unsubscribe(
          "vcpapp.vcpuniquecharacteristics",
          "addDetailPage",
          this.addDetailPage,
          this
        );
        this.bus.unsubscribe("nav", "toBeginPage", this.toBeginPage, this);
        this.bus.unsubscribe("nav", "toDetailPage", this.toDetailPage, this);
        this.bus.unsubscribe("nav", "backToBegin", this.backToBegin, this);
      },

      /**
       * Called after the view has been rendered.
       */
      onAfterRendering: function () {
        that = this;

        var oViewModel = this.getModel("appView");
        /**  Removing the arrow button inbetween pages(ItemMaster and ItemDetail)*/
        if (this.getView().byId("fclUC").mAggregations._midColumnForwardArrow !== undefined) {
          this.getView().byId("fclUC").mAggregations._midColumnForwardArrow.setVisible(false);
        }
        //   this.getView().byId("fclUC").mAggregations._midColumnNav.setVisible(false)
        /* Menu button option for Device and Desktop*/
        // if (!Device.system.desktop) {
        //   this.byId("leftMenuUC").setVisible(true);
        //   this.getModel("appView").setProperty("/expanded", false);
        // } else {
        //   oViewModel.setProperty("/sideMenuBurgerVisible", false);
        //   oViewModel.setProperty("/expanded", false);
        // }
      },

      /**
       * To set the master page
       * @param {string} sChannel - Event channel
       * @param {string} sEvent - Event name
       * @param {object} oView - View to be displayed
       */
      addBeginPage: function (sChannel, sEvent, oView) {
        this.oFlexibleColumnLayout.addBeginColumnPage(oView);
      },

      /**
       * Lazy loader for the mid page - only on demand (when the user clicks)
       * @param {string} sChannel - Event channel
       * @param {string} sEvent - Event name
       * @param {object} oView - View to be displayed
       */
      addDetailPage: function (sChannel, sEvent, oView) {
        var aPages = this.oFlexibleColumnLayout.getMidColumnPages(),
          bFound = false;
        for (var i = 0; i < aPages.length; i++) {
          if (aPages[i].getProperty("viewName") === oView.getViewName()) {
            bFound = true;
            break;
          } else {
            bFound = false;
          }
        }
        if (!bFound) {
          this.oFlexibleColumnLayout.addMidColumnPage(oView);
        }
      },

      /**
       * To initialize master page
       * @param {string} sChannel - Event channel
       * @param {string} sEvent - Event name
       * @param {object} oView - View to be displayed
       */
      toBeginPage: function (sChannel, sEvent, oView) {
        var aPages = this.oFlexibleColumnLayout.getBeginColumnPages();
        for (var i = 0; i < aPages.length; i++) {
          if (aPages[i].getProperty("viewName") === oView.viewName) {
            this.oFlexibleColumnLayout.toBeginColumnPage(
              this.oFlexibleColumnLayout.getBeginColumnPages()[i]
            );
            break;
          }
        }
      },

      /**
       * To get the required detail page
       * @param {string} sChannel - Event channel
       * @param {string} sEvent - Event name
       * @param {object} oView - View to be displayed
       */
      toDetailPage: function (sChannel, sEvent, oView) {
        var aPages = this.oFlexibleColumnLayout.getMidColumnPages();
        for (var i = 0; i < aPages.length; i++) {
          if (aPages[i].getProperty("viewName") === oView.viewName) {
            this.oFlexibleColumnLayout.toMidColumnPage(
              this.oFlexibleColumnLayout.getMidColumnPages()[i]
            );
            break;
          }
        }
        this.oFlexibleColumnLayout.setLayout(
          sap.f.LayoutType.TwoColumnsMidExpanded
        );
        /* Adding ItemDetail page */
        if (aPages.length < 1) {
          this.getOwnerComponent().runAsOwner(
            function () {
              this.detailView = sap.ui.view({
                viewName: "vcpapp.vcpuniquecharacteristics.view.ItemDetail",
                type: "XML",
              });
              this.oFlexibleColumnLayout.addMidColumnPage(this.detailView);
            }.bind(this)
          );
        } else {
          this.oFlexibleColumnLayout.addMidColumnPage(aPages[0]);
          aPages[0].onAfterRendering();
        }
      },

      /**
       * To show only the master page
       */
      backToBegin: function () {
        this.oFlexibleColumnLayout.setLayout(sap.f.LayoutType.OneColumn);
      },

      /**
       * Called when the URL matches pattern "Details"
       * @constructor
       */
      _onPatternMatched: function () {
        this.oFlexibleColumnLayout.setLayout(sap.f.LayoutType.OneColumn);
        var aPages = this.oFlexibleColumnLayout.getBeginColumnPages();
        /* If Begin page has already been added, navigate to it and call 'onAfterRendering' explicitly */
        if (aPages.length < 1) {
          this.getOwnerComponent().runAsOwner(
            function () {
              this.masterView = sap.ui.view({
                viewName: "vcpapp.vcpuniquecharacteristics.view.ItemMaster",
                type: "XML",
              });
              this.oFlexibleColumnLayout.addBeginColumnPage(this.masterView);
            }.bind(this)
          );
        } else {
          this.oFlexibleColumnLayout.toBeginColumnPage(aPages[0]);
          aPages[0].onAfterRendering();
        }
      },

      expandBegin: function () {
        this.bus.publish("nav", "backToBegin");
        /* Handling Ment button when we are in Item Master page  */
        if (!Device.system.desktop) {
          this.byId("leftMenuUC").setVisible(false);
          this.getModel("appView").setProperty("/expanded", true);
        }
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
          oStorage.put("nodeId", 82);
          //Generate a  URL for the second application
          var url = window.location.href.split('#')[0] + hash;
          //Navigate to second app
          sap.m.URLHelper.redirect(url, true);
        }
      },

    });
  }
);
