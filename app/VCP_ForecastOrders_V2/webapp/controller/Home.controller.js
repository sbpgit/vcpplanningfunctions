sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/m/Token",
    "../model/formatter",
  ],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    BusyIndicator,
    Token,
    formatter
  ) {
    "use strict";
    var that, HandsontableKey;
    return BaseController.extend(
      "vcpapp.vcpforecastingordersbeta.controller.Home",
      {
        formatter: formatter,
        onInit: function () {
          that = this;
          that.uSkip = 0;
          that.userAccess = true;
          that.sUserId = that.getUserDetails();
          that._oCore = sap.ui.getCore();
          that.oModel = that.getOwnerComponent().getModel("oModel");
          that.bModel = that.getOwnerComponent().getModel("bModel");
          that.JModel = that.getOwnerComponent().getModel("JModel");
          that.oGModel = that.getOwnerComponent().getModel("oGModel");
          that.sTitle = that.getResourceBundle().getText("title");
          // that.sTitle = "FORECASTORDERS";
          that.oDynamicPage = that.getView().byId("dynamicPage");
          that.loadFragments();
          that.loadModels();
          that.getValidUser();
          // that.getCalenderWeek();
          that.loadHotKey();
          that.staticColumns = [
            "Location",
            "Product",
            "Unique ID",
            "Version",
            "Scenario",
            "Type",
          ];
          that.staticRows = [
            {
              data: "DEMAND_LOC",
              readOnly: false,
              wordWrap: true,
              comments: true,
              contextMenu: true,
            },
            {
              data: "PRODUCT_ID",
              readOnly: false,
              wordWrap: true,
            },
            {
              data: "UNIQUE_ID",
              readOnly: false,
              wordWrap: true,
            },
            {
              data: "VERSION_NAME",
              readOnly: false,
              wordWrap: true,
            },
            {
              data: "SCENARIO_NAME",
              readOnly: false,
              wordWrap: true,
            },
            {
              data: "TYPE",
              readOnly: false,
              wordWrap: true,
            },
          ];
          that.GO_IS_READY = true;

        },
        onBeforeRendering: function () {
          const oDateL = new Date();
          oDateL.setDate(oDateL.getDate() - 7);
          const oDateH = new Date();
          oDateH.setFullYear(oDateL.getFullYear() + 2);


          that.oModel.read("/getWeeks", {
            filters: [new Filter([
              new sap.ui.model.Filter("WEEK_STARTDATE", sap.ui.model.FilterOperator.GE, oDateL),
              new sap.ui.model.Filter("WEEK_STARTDATE", sap.ui.model.FilterOperator.LE, oDateH)
            ], true)],
            success: function (oData) {
              oData.results.sort((a, b) => a.WEEK_STARTDATE - b.WEEK_STARTDATE);
              that.calWeekData = oData.results;

              if (!oData.results.length) {
                MessageBox.show("No Week Description Available");
              } else {
                const weekLookupMap = new Map();
                const dateToWeekMap = new Map();

                that.telWeek = [];
                that.telMonth = [];
                that.telQ = [];
                const remain = [];

                // Track start and end dates for each range
                let weekRangeStart = null, weekRangeEnd = null;
                let monthRangeStart = null, monthRangeEnd = null;
                let qRangeStart = null, qRangeEnd = null;

                for (let i = 0; i < oData.results.length; i++) {
                  const item = oData.results[i];
                  if (!item.TELESCOPIC_WEEK && !item.CALENDAR_WEEK) continue;

                  const monday = that.getMondaysBetween(item.WEEK_STARTDATE, item.WEEK_ENDDATE);
                  item.monday = monday;

                  if (
                    !that.telWeek.includes(item.TELESCOPIC_WEEK) &&
                    !that.telMonth.includes(item.TELESCOPIC_WEEK) &&
                    !that.telQ.includes(item.TELESCOPIC_WEEK)
                  ) {
                    const found = oData.results.filter(o => o.TELESCOPIC_WEEK === item.TELESCOPIC_WEEK);
                    const length = found.length;

                    if (length === 1) {
                      that.telWeek.push(item.TELESCOPIC_WEEK);

                      // Update Week range dates
                      if (!weekRangeStart || item.WEEK_STARTDATE < weekRangeStart) {
                        weekRangeStart = item.WEEK_STARTDATE;
                      }
                      if (!weekRangeEnd || item.WEEK_ENDDATE > weekRangeEnd) {
                        weekRangeEnd = item.WEEK_ENDDATE;
                      }

                    } else if (length >= 2 && length <= 6) {
                      that.telMonth.push(item.TELESCOPIC_WEEK);

                      // Update Month range dates from all found entries
                      found.forEach(function (f) {
                        if (!monthRangeStart || f.WEEK_STARTDATE < monthRangeStart) {
                          monthRangeStart = f.WEEK_STARTDATE;
                        }
                        if (!monthRangeEnd || f.WEEK_ENDDATE > monthRangeEnd) {
                          monthRangeEnd = f.WEEK_ENDDATE;
                        }
                      });

                    } else if (length > 6) {
                      that.telQ.push(item.TELESCOPIC_WEEK);

                      // Update Quarter range dates from all found entries
                      found.forEach(function (f) {
                        if (!qRangeStart || f.WEEK_STARTDATE < qRangeStart) {
                          qRangeStart = f.WEEK_STARTDATE;
                        }
                        if (!qRangeEnd || f.WEEK_ENDDATE > qRangeEnd) {
                          qRangeEnd = f.WEEK_ENDDATE;
                        }
                      });

                    } else {
                      remain.push(item.TELESCOPIC_WEEK);
                    }
                  }

                  // Forward lookup: Week name -> dates
                  weekLookupMap.set(item.TELESCOPIC_WEEK, item);
                  weekLookupMap.set(item.CALENDAR_WEEK, item);

                  dateToWeekMap.set(monday, item);
                }

                // Store the range dates
                that.weekRange = { startDate: weekRangeStart, endDate: weekRangeEnd };
                that.monthRange = { startDate: monthRangeStart, endDate: monthRangeEnd };
                that.qRange = { startDate: qRangeStart, endDate: qRangeEnd };

                that.weekLookupMap = weekLookupMap;
                that.dateToWeekMap = dateToWeekMap;
              }
            },
            error: function (error) {
              console.error(error);
            },
          });
        },
        onAfterRendering: function () {
          that.oManLocation = that.byId("idManlocInp");
          that.oDemLocation = that.byId("idDemLocInp");
          that.oProduct = that.byId("idProdInp");
          that.oUnqID = that.byId("idUnqInp");
          that.oVersion = that.byId("idVerInp");
          that.oScenario = that.byId("idScenInp");
          that.weekDate = that.byId("idDateRange");
          that.modelVer = that.byId("idModelVer");
          that.charBox = that.byId("idUniqueCharDetails");
          that.qtyPanel = that.getView().byId("qtyPanel");
          that.exlVbox = that.getView().byId("exlVbox");
          if (sap.ushell) {
            that.sUser = sap.ushell?.Container?.getService("UserInfo")?.getEmail()
          }
          if(!that.sUser){
            that.sUser='null';
          }
          that.unqData = [];
          that.fullFiltereData = [];
          that.oCurrentDate = new Date();
          that.allChars = [];
          var oModel = that.getOwnerComponent().getModel('oModel');
          var oResults = {};
          that.verToken, that.scenToken;
          that.arrVer = [], that.arrScen = [];
          oModel.callFunction("/getGlobalPlanningConfig", {
            method: "GET",
            success: async function (oData, oResponse) {
              if (oData.getGlobalPlanningConfig) {
                oResults = JSON.parse(oData.getGlobalPlanningConfig);
                const verSce = await that.onIbpVerScen();
                const VerionDesc = verSce.find(o => o.VERSION === oResults.IBPVERSION)?.VERSION_NAME;
                var oVersTemplate = new sap.m.Token({
                  key: oResults.IBPVERSION,
                  text: VerionDesc,
                  editable: false
                });
                that.arrVer.push(oResults.IBPVERSION);
                that.verToken = oVersTemplate;
                // that.byId("idVerInp").addToken(oVersTemplate);
                const scenDesc = verSce.find(o => o.SCENARIO === oResults.IBPSCENARIO)?.SCENARIO_NAME;
                var oScenTemplate = new sap.m.Token({
                  key: oResults.IBPSCENARIO,
                  text: scenDesc,
                  editable: false
                });
                that.arrScen.push(oResults.IBPSCENARIO);
                that.scenToken = oScenTemplate;
                // that.byId("idScenInp").addToken(oScenTemplate);
              }
            },
            error: function (oResponse) {
              sap.m.MessageToast.show("Failed to get planning config, please try later!");
            },
          });
          oModel.read("/getRolesAccess", {
            filters: [new Filter("USER", FilterOperator.EQ, that.sUser)],
            success: async function (oData) {
              if (oData.results.length > 0) {
                const Data = oData.results;
                that.RoleMap = new Map();
                that.RoleMapFac = new Map();
                that.RoleMapFD = new Map();
                Data.forEach(obj => {
                  that.RoleMap.set(`${obj.DEMAND_LOC}_${obj.PRODUCT_ID}`, obj);
                  that.RoleMapFac.set(`${obj.FACTORY_LOC}_${obj.PRODUCT_ID}`, obj);
                  that.RoleMapFD.set(`${obj.FACTORY_LOC}_${obj.DEMAND_LOC}_${obj.PRODUCT_ID}`, obj);
                })
              }
            },
            error: function (oResponse) {
              console.error(oResponse);
            },
          });
          that.setDateRange("disable", 2);
          that.getFactoryLocs();
        },
        getFactoryLocs: function () {
          var unqManLocs = [];
          const filter = new Filter("USER", FilterOperator.EQ, that.sUser)
          that.oModel.read("/getRolesLocProd", {
            filters: [filter],
            urlParameters: {
              "$skip": 0,
              "$top": 50000
            },
            success: function (data) {
              that.oManLocDialog.setBusy(false);
              if (data.results.length > 0) {
                that.fullFiltereData = data.results;
                unqManLocs = that.removeDuplicates(data.results, [
                  "FACTORY_LOC",
                ]);
                unqManLocs = unqManLocs.sort(
                  that.dynamicSortMultiple("FACTORY_LOC")
                );
                that.manLocModel.setData({
                  items: unqManLocs,
                });
                that.manLocModel.setSizeLimit(unqManLocs.length);
                that.oManLocDialog.setGrowingThreshold(unqManLocs.length);
                that.oManLocDialog.setModel(that.manLocModel);
                that.oDemLocDialog.setModel(new JSONModel([]));
                if (that.oManLocation.getTokens().length > 0) {
                  that.oManLocation.getTokens().forEach((t) => {
                    that.oManLocDialog.getItems().forEach((i, ind) => {
                      if (t.getKey() == i.getDescription()) {
                        that.oManLocDialog
                          .getItems()
                        [ind].setSelected(true);
                      }
                    });
                  });
                }
              } else {
                that.oManLocDialog.setNoDataText("No Data");
              }
            },
            error: function () {
              that.oManLocDialog.setBusy(false);
              sap.m.MessageToast.show("Location Data Fetching Error");
            },
          });
        },
        onIbpVerScen: async function () {
          const { promise, resolve, reject } = Promise.withResolvers();
          that.oModel.read("/getIbpVerScn", {
            success: async function (oData) {
              var Overs = oData.results;

              // Fill null values: if VERSION is null, take VERSION_NAME, and vice versa
              that.verSce_Desc_To_Id = new Map();
              that.verSce_Id_To_Desc = new Map();
              Overs.forEach(item => {
                if (!item.VERSION && item.VERSION_NAME) item.VERSION = item.VERSION_NAME;
                if (!item.VERSION_NAME && item.VERSION) item.VERSION_NAME = item.VERSION;
                if (!item.SCENARIO && item.SCENARIO_NAME) item.SCENARIO = item.SCENARIO_NAME;
                if (!item.SCENARIO_NAME && item.SCENARIO) item.SCENARIO_NAME = item.SCENARIO;
                that.verSce_Desc_To_Id.set(item.VERSION_NAME, item.VERSION);
                that.verSce_Desc_To_Id.set(item.SCENARIO_NAME, item.SCENARIO);
                that.verSce_Id_To_Desc.set(item.VERSION, item.VERSION_NAME);
                that.verSce_Id_To_Desc.set(item.SCENARIO, item.SCENARIO_NAME);
              });

              // Deduplicate based on VERSION + VERSION_NAME + SCENARIO + SCENARIO_NAME
              var uniqueMap = {};
              var oVerscn = [];

              Overs.forEach(item => {
                var key = item.VERSION + "|" + item.VERSION_NAME + "|" + item.SCENARIO + "|" + item.SCENARIO_NAME;
                if (!uniqueMap[key]) {
                  uniqueMap[key] = true;
                  oVerscn.push(item);
                }
              });



              that.oGModel.setProperty("/oVerscena", oVerscn);
              that.getData();
              resolve(oVerscn);
            },
            error: function (oData, error) {
              sap.ui.core.BusyIndicator.hide();
              sap.m.MessageToast.show("error");
              reject(error);
            },
          });
          return promise;

        },
        loadHotKey: async function () {
          HandsontableKey = await that.getHandsontableKey();
        },
        getHandsontableKey: function () {
          var promise = new Promise((resolve, reject) => {
            that.oModel.callFunction("/getHandsontableKey", {
              success: function (params) {
                resolve(params.getHandsontableKey);
              },
              error: function (err) {
                reject(err.message);
              },
            });
          });
          return promise;
        },
        getValidUser: function (oEvent) {
          that.oModel.callFunction("/getCFAuthToken", {
            method: "GET",
            success: function (oData, oResponse) {
              that.authToken = oResponse.data.getCFAuthToken;
              that.getCFDestinationUser(that.authToken);
            },
            error: function (oResponse) {
              sap.m.MessageToast.show("Failed to get Destination User!");
            },
          });
        },
        getCFDestinationUser: function (sauthToken) {
          that.oModel.callFunction("/getCFDestinationUser", {
            method: "GET",
            urlParameters: {
              TOKEN: sauthToken,
            },
            success: function (oData, oResponse) {
              that.sCFUserDestination = oResponse.data.getCFDestinationUser;
              if (that.sCFUserDestination) {
                that.sCFUserDestination = that.sCFUserDestination.toUpperCase();
              }
            },
            error: function (oResponse) {
              sap.m.MessageToast.show("Failed to get Destination User!");
            },
          });
        },
        loadFragments: function () {
          var oHBox = new sap.m.HBox({
            alignItems: "Center",
            items: [
              new sap.m.CheckBox({
                select: (params) => {
                  that.handleCheckboxChange(params);
                },
              }),
              new sap.m.Title({
                text: "Select All",
                titleStyle: "Auto",
              }),
            ],
          });
          if (!that.oManLocDialog) {
            that.oManLocDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.ManLoc",
              that
            );
            that.getView().addDependent(that.oManLocDialog);
          }
          if (!that.oDemLocDialog) {
            that.oDemLocDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.DemLoc",
              that
            );
            that.getView().addDependent(that.oDemLocDialog);
            let title = "Demand Locations";
            oHBox.getItems()[1].setText(title);
            that.oDemLocDialog._oDialog.insertContent(oHBox.clone(), 1);
          }
          if (!that.oProductDialog) {
            that.oProductDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.Product",
              that
            );
            that.getView().addDependent(that.oProductDialog);
            let title = "Products";
            oHBox.getItems()[1].setText(title);
            that.oProductDialog._oDialog.insertContent(oHBox.clone(), 1);
          }
          if (!that.oUnqDialog) {
            that.oUnqDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.UniqueID",
              that
            );
            that.getView().addDependent(that.oUnqDialog);
            let title = "Unique Id's";
            oHBox.getItems()[1].setText(title);
            that.oUnqDialog._oDialog.insertContent(oHBox.clone(), 1);
          }
          if (!that.oVersionDialog) {
            that.oVersionDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.Version",
              that
            );
            that.getView().addDependent(that.oVersionDialog);
            let title = "Versions";
            oHBox.getItems()[1].setText(title);
            that.oVersionDialog._oDialog.insertContent(oHBox.clone(), 1);
          }
          if (!that.oScenarioDialog) {
            that.oScenarioDialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.Scenario",
              that
            );
            that.getView().addDependent(that.oScenarioDialog);
            let title = "Scenarios";
            oHBox.getItems()[1].setText(title);
            that.oScenarioDialog._oDialog.insertContent(oHBox.clone(), 1);
          }

          if (!that._Publishdialog) {
            that._Publishdialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.publishDialog",
              that
            );
            that.getView().addDependent(that._Publishdialog);
          }
          if (!that.CharTabledialog) {
            that.CharTabledialog = sap.ui.xmlfragment(
              "vcpapp.vcpforecastingordersbeta.fragments.CharTable",
              that
            );
            that.getView().addDependent(that.CharTabledialog);
          }
        },
        loadModels: function () {
          that.manLocModel = new JSONModel();
          that.demLocModel = new JSONModel();
          that.prodModel = new JSONModel();
          that.unqModel = new JSONModel();
          that.verModel = new JSONModel();
          that.scenModel = new JSONModel();
          that.viewDetails = new JSONModel({
            items12: []
          });
          that.byId("idMatList123").setModel(that.viewDetails);
          // that.variantModel = new JSONModel();
          that.variantFavModel = new JSONModel();
        },
        getUser: function () {
          let vUser;
          if (sap.ushell.Container) {
            let email = sap.ushell.Container.getService("UserInfo")
              .getUser()
              .getEmail();
            vUser = email ? email : "";
          }
          return vUser;
        },
        getUniqueIdData: function (uFilters) {
          var batchSize = 30000;
          that.getModel("oModel").read("/getSalesUniqueID", {
            filters: uFilters,
            urlParameters: {
              $top: batchSize,
              $skip: that.uSkip,
              // "$apply": "groupby((UNIQUE_ID))" // Apply grouping by UNIQUE_ID
            },
            success: function (oData) {
              var data = oData.results;
              data.forEach((u) => (u.UNIQUE_ID = u.UNIQUE_ID.toString()));
              that.uUniqueIds = that.uUniqueIds.concat(data);
              if (data.length === batchSize) {
                that.uSkip += batchSize;
                that.getUniqueIdData(uFilters); // Continue fetching next batch
              } else {
                that.oUnqDialog.setBusy(false);
                that.uUniqueIds = that.removeDuplicates(that.uUniqueIds, [
                  "UNIQUE_ID",
                ]);
                that.uUniqueIds = that.uUniqueIds.sort(
                  that.dynamicSortMultiple("UNIQUE_ID")
                );
                if (that.uUniqueIds.length > 0) {
                  that.unqModel.setData({
                    items: that.uUniqueIds,
                  });
                  that.unqModel.setSizeLimit(that.uUniqueIds.length);
                  that.oUnqDialog.setGrowingThreshold(that.uUniqueIds.length);
                  that.oUnqDialog.setModel(that.unqModel);
                  if (that.oUnqID.getTokens().length > 0) {
                    that.oUnqID.getTokens().forEach((t) => {
                      that.oUnqDialog.getItems().forEach((i, ind) => {
                        if (t.getText() == i.getTitle()) {
                          that.oUnqDialog.getItems()[ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  that.oUnqDialog.setBusy(false);
                  that.oUnqDialog.setNoDataText("No Data");
                }
              }
            },
            error: function () {
              MessageToast.show("error loading Unique Id's");
              that.oUnqList.setBusy(false);
            },
          });
        },
        handleValueHelp: function (oEvent) {
          var name = oEvent.getSource().getName();
          var unqManLocs = [],
            unqDemLocs = [],
            unqProducts = [];
          switch (name) {
            case "ManLocation":
              that.oManLocDialog.open();
              that.oManLocDialog.setNoDataText("...Loading");
              that.oManLocDialog.setBusy(true);
              if (that.oManLocDialog.getItems().length > 0) {
                that.oManLocDialog.setBusy(false);
                that.oDemLocDialog.setModel(new JSONModel([]));
                if (that.oManLocation.getTokens().length > 0) {
                  that.oManLocation.getTokens().forEach((t) => {
                    that.oManLocDialog.getItems().forEach((i, ind) => {
                      if (t.getKey() == i.getDescription()) {
                        that.oManLocDialog.getItems()[ind].setSelected(true);
                      }
                    });
                  });
                }
              } else {
                that.getFactoryLocs();

              }

              break;

            case "DemLocation":
              if (that.oManLocation.getTokens().length > 0) {
                that.oDemLocDialog.open();
                that.oDemLocDialog.setNoDataText("...Loading");
                that.oDemLocDialog.setBusy(true);
                if (that.oDemLocDialog.getItems().length > 0) {
                  that.oDemLocDialog.setBusy(false);
                  that.oProductDialog.setModel(new JSONModel([]));
                  if (that.oDemLocation.getTokens().length > 0) {
                    that.oDemLocation.getTokens().forEach((t) => {
                      that.oDemLocDialog.getItems().forEach((i, ind) => {
                        if (t.getKey() == i.getDescription()) {
                          that.oDemLocDialog.getItems()[ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  // that.oModel.callFunction("/getPartialProdLoc", {
                  //   success: function (data) {
                  that.oDemLocDialog.setBusy(false);
                  var manLocs = that.oManLocation.getTokens();
                  manLocs.forEach((l) => {
                    let lData = that.fullFiltereData.filter(
                      (el) => el.FACTORY_LOC == l.getText()
                    );
                    unqDemLocs = unqDemLocs.concat(lData);
                  });
                  var uDemLocData = that.removeDuplicates(unqDemLocs, [
                    "DEMAND_LOC",
                  ]);
                  uDemLocData = uDemLocData.sort(
                    that.dynamicSortMultiple("DEMAND_LOC")
                  );
                  if (uDemLocData.length > 0) {
                    that.demLocModel.setData({
                      items: uDemLocData,
                    });
                    that.demLocModel.setSizeLimit(uDemLocData.length);
                    that.oDemLocDialog.setGrowingThreshold(
                      uDemLocData.length
                    );
                    that.oDemLocDialog.setModel(that.demLocModel);
                    that.oProductDialog.setModel(new JSONModel([]));
                    if (that.oDemLocation.getTokens().length > 0) {
                      that.oDemLocation.getTokens().forEach((t) => {
                        that.oDemLocDialog.getItems().forEach((i, ind) => {
                          if (t.getKey() == i.getDescription()) {
                            that.oDemLocDialog
                              .getItems()
                            [ind].setSelected(true);
                          }
                        });
                      });
                    }
                  } else {
                    that.oDemLocDialog.setNoDataText("No Data");
                  }
                  //   },
                  //   error: function () {
                  //     that.oDemLocDialog.setBusy(false);
                  //     sap.m.MessageToast.show("Location Data Fetching Error");
                  //   },
                  // });
                }
              } else {
                MessageToast.show("Please Select Manufacturing Locations");
              }
              break;

            case "Product":
              if (that.oDemLocation.getTokens().length > 0) {
                that.oProductDialog.open();
                that.oProductDialog.setNoDataText("...Loading");
                that.oProductDialog.setBusy(true);
                if (that.oProductDialog.getItems().length > 0) {
                  that.oProductDialog.setBusy(false);
                  that.oVersionDialog.setModel(new JSONModel([]));
                  that.oUnqDialog.setModel(new JSONModel([]));
                  if (that.oProduct.getTokens().length > 0) {
                    that.oProduct.getTokens().forEach((t) => {
                      that.oProductDialog.getItems().forEach((i, ind) => {
                        if (t.getKey() == i.getDescription()) {
                          that.oProductDialog.getItems()[ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  // that.oModel.callFunction("/getPartialProdLoc", {
                  //   success: function (data) {
                  that.oProductDialog.setBusy(false);
                  var manLocs = that.oManLocation.getTokens();
                  var demLocs = that.oDemLocation.getTokens();
                  manLocs.forEach((l) => {
                    demLocs.forEach((d) => {
                      let lData = that.fullFiltereData.filter(
                        (el) =>
                          el.FACTORY_LOC == l.getText() &&
                          el.DEMAND_LOC == d.getText()
                      );
                      unqProducts = unqProducts.concat(lData);
                    });
                  });
                  var prods = that.removeDuplicates(unqProducts, [
                    "PRODUCT_ID",
                  ]);
                  prods = prods.sort(
                    that.dynamicSortMultiple("PRODUCT_ID")
                  );
                  if (prods.length > 0) {
                    that.prodModel.setData({
                      items: prods,
                    });
                    that.prodModel.setSizeLimit(prods.length);
                    that.oProductDialog.setGrowingThreshold(prods.length);
                    that.oProductDialog.setModel(that.prodModel);
                    that.oVersionDialog.setModel(new JSONModel([]));
                    that.oUnqDialog.setModel(new JSONModel([]));
                    if (that.oProduct.getTokens().length > 0) {
                      that.oProduct.getTokens().forEach((t) => {
                        that.oProductDialog.getItems().forEach((i, ind) => {
                          if (t.getKey() == i.getDescription()) {
                            that.oProductDialog
                              .getItems()
                            [ind].setSelected(true);
                          }
                        });
                      });
                    }
                  } else {
                    that.oProductDialog.setNoDataText("No Data");
                  }
                  //   },
                  //   error: function () {
                  //     that.oProductDialog.setBusy(false);
                  //     sap.m.MessageToast.show("Location Data Fetching Error");
                  //   },
                  // });
                }
              } else {
                MessageToast.show("Please Select Demand Locations");
              }
              break;

            case "UniqueId":
              if (that.oProduct.getTokens().length > 0) {
                that.oUnqDialog.open();
                that.oUnqDialog.setNoDataText("...Loading");
                that.oUnqDialog.setBusy(true);
                if (that.oUnqDialog.getItems().length > 0) {
                  that.oUnqDialog.setBusy(false);
                  that.oVersionDialog.setModel(new JSONModel([]));
                  if (that.oUnqID.getTokens().length > 0) {
                    that.oUnqID.getTokens().forEach((t) => {
                      that.oUnqDialog.getItems().forEach((i, ind) => {
                        if (t.getKey() == i.getDescription()) {
                          that.oUnqDialog.getItems()[ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  var oFilters = [];
                  that.oProduct.getTokens().forEach((t) => {
                    oFilters.push(
                      new Filter("PRODUCT_ID", FilterOperator.EQ, t.getText())
                    );
                  });
                  // oFilters.push(new Filter("UID_TYPE", FilterOperator.EQ, "U"));
                  that.uSkip = 0;
                  that.uUniqueIds = [];
                  that.getUniqueIdData(oFilters);
                }
              } else {
                MessageToast.show("Please Select Products");
              }
              break;

            case "Version":
              if (
                that.oDemLocation.getTokens().length > 0 &&
                that.oProduct.getTokens().length > 0
              ) {
                that.oVersionDialog.open();
                that.oVersionDialog.setNoDataText("...Loading");
                that.oVersionDialog.setBusy(true);
                if (that.oVersionDialog.getItems().length > 0) {
                  that.oVersionDialog.setBusy(false);
                  that.oScenarioDialog.setModel(new JSONModel([]));
                  if (that.oVersion.getTokens().length > 0) {
                    that.oVersion.getTokens().forEach((t) => {
                      that.oVersionDialog.getItems().forEach((i, ind) => {
                        if (t.getKey() == i.getTitle()) {
                          that.oVersionDialog.getItems()[ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  var oFilters = [];
                  that.oDemLocation.getTokens().forEach((d) => {
                    oFilters.push(
                      new Filter("LOCATION_ID", FilterOperator.EQ, d.getText())
                    );
                  });
                  that.oProduct.getTokens().forEach((t) => {
                    oFilters.push(
                      new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        t.getText().split("-")[0]
                      )
                    );
                  });
                  that.oModel.read("/getIbpVerScn", {
                    filters: oFilters,
                    success: function (oData) {
                      var data = oData.results;
                      data = that.removeDuplicates(data, "VERSION");
                      that.oVersionDialog.setBusy(false);
                      if (data.length > 0) {
                        that.verModel.setData({
                          items: data,
                        });
                        that.oVersionDialog.setGrowingThreshold(data.length);
                        that.oVersionDialog.setModel(that.verModel);
                        that.oScenarioDialog.setModel(new JSONModel([]));
                        if (that.oVersion.getTokens().length > 0) {
                          that.oVersion.getTokens().forEach((t) => {
                            that.oVersionDialog.getItems().forEach((i, ind) => {
                              if (t.getKey() == i.getTitle()) {
                                that.oVersionDialog
                                  .getItems()
                                [ind].setSelected(true);
                              }
                            });
                          });
                        }
                      } else {
                        that.oVersionDialog.setNoDataText("No Data");
                      }
                    },
                    error: function () {
                      that.oVersionDialog.setBusy(false);
                      MessageToast.show("Error Loading Version Data");
                    },
                  });
                }
              } else {
                MessageToast.show("Please Select Locations and Products");
              }
              break;

            case "Scenario":
              if (that.oVersion.getTokens().length > 0) {
                that.oScenarioDialog.open();
                that.oScenarioDialog.setNoDataText("...Loading");
                that.oScenarioDialog.setBusy(true);
                if (that.oScenarioDialog.getItems().length > 0) {
                  that.oScenarioDialog.setBusy(false);
                  if (that.oScenario.getTokens().length > 0) {
                    that.oScenario.getTokens().forEach((t) => {
                      that.oScenarioDialog.getItems().forEach((i, ind) => {
                        if (t.getKey() == i.getTitle()) {
                          that.oScenarioDialog
                            .getItems()
                          [ind].setSelected(true);
                        }
                      });
                    });
                  }
                } else {
                  var oFilters = [];
                  that.oDemLocation.getTokens().forEach((d) => {
                    oFilters.push(
                      new Filter("LOCATION_ID", FilterOperator.EQ, d.getText())
                    );
                  });
                  that.oProduct.getTokens().forEach((t) => {
                    oFilters.push(
                      new Filter(
                        "PRODUCT_ID",
                        FilterOperator.EQ,
                        t.getText().split("-")[0]
                      )
                    );
                  });
                  that.oModel.read("/getIbpVerScn", {
                    filters: oFilters,
                    success: function (oData) {
                      var data = oData.results;
                      data = that.removeDuplicates(data, "SCENARIO");
                      that.oScenarioDialog.setBusy(false);
                      if (data.length > 0) {
                        that.scenModel.setData({
                          items: data,
                        });
                        that.oScenarioDialog.setGrowingThreshold(data.length);
                        that.oScenarioDialog.setModel(that.scenModel);
                        if (that.oScenario.getTokens().length > 0) {
                          that.oScenario.getTokens().forEach((t) => {
                            that.oScenarioDialog
                              .getItems()
                              .forEach((i, ind) => {
                                if (t.getKey() == i.getTitle()) {
                                  that.oScenarioDialog
                                    .getItems()
                                  [ind].setSelected(true);
                                }
                              });
                          });
                        }
                      } else {
                        that.oScenarioDialog.setNoDataText("No Data");
                      }
                    },
                    error: function () {
                      that.oScenarioDialog.setBusy(false);
                      MessageToast.show("Error Loading Scenario Data");
                    },
                  });
                }
              } else {
                MessageToast.show("Please Select Versions");
              }
              break;
          }
        },
        handleCheckboxChange: function (event) {
          var controlId = event
            .getSource()
            .getParent()
            .getParent()
            .sId.split("-")[0];
          if (event.getParameters().selected) {
            let items = sap.ui.getCore().byId(`${controlId}`).getItems();
            items.forEach((i) => {
              i.setSelected(true);
            });
          } else {
            sap.ui.getCore().byId(`${controlId}`).clearSelection();
          }
        },
        handleSelectionChange: function (event) {
          var controlId = event.getSource().sId;
          var items = sap.ui.getCore().byId(`${controlId}`).getItems();
          if (controlId !== "idManLocDialog") {
            if (items.length > 0) {
              var sItems = items.filter((f) => f.getSelected() === true);
              if (sItems.length === items.length) {
                sap.ui
                  .getCore()
                  .byId(`${controlId}`)
                  ._oDialog.getContent()[1]
                  .getItems()[0]
                  .setSelected(true);
              } else {
                sap.ui
                  .getCore()
                  .byId(`${controlId}`)
                  ._oDialog.getContent()[1]
                  .getItems()[0]
                  .setSelected(false);
              }
            }
          }
        },
        handleSearch: function (oEvent) {
          var sQuery =
            oEvent.getParameter("value") || oEvent.getParameter("newValue"),
            sId = oEvent.getParameter("id"),
            oFilters = [];
          // Check if search filter is to be applied
          sQuery = sQuery ? sQuery.trim() : "";
          // Location
          if (sId.includes("idManLocDialog")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("FACTORY_LOC", FilterOperator.Contains, sQuery),
                    new Filter(
                      "FACTORYLOC_DESC",
                      FilterOperator.Contains,
                      sQuery
                    ),
                  ],
                  and: false,
                })
              );
            }
            that.oManLocDialog.getBinding("items").filter(oFilters);
            if (that.oManLocDialog.getItems().length == 0) {
              that.oManLocDialog.setNoDataText("No Locations Found");
            }
            // Product
          } else if (sId.includes("idProdDialog")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("PRODUCT_ID", FilterOperator.Contains, sQuery),
                    new Filter(
                      "PROD_DESC",
                      FilterOperator.Contains,
                      sQuery
                    ),
                  ],
                  and: false,
                })
              );
            }
            that.oProductDialog.getBinding("items").filter(oFilters);
            if (that.oProductDialog.getItems().length == 0) {
              that.oProductDialog.setNoDataText("No Products Found");
            }
            // Demand Location
          } else if (sId.includes("idUnqDialog")) {
            if (sQuery) {
              let uDesc = sQuery.toString();
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("UNIQUE_DESC", FilterOperator.Contains, uDesc),
                    new Filter("UNIQUE_ID", FilterOperator.Contains, uDesc),
                  ],
                  and: false,
                })
              );
            }
            that.oUnqDialog.getBinding("items").filter(oFilters);
            if (that.oUnqDialog.getItems().length == 0) {
              that.oUnqDialog.setNoDataText("No Unique Id Found");
            }
            // Version
          } else if (sId.includes("idDemLocDialog")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("DEMAND_LOC", FilterOperator.Contains, sQuery),
                    new Filter(
                      "DEMANDLOC_DESC",
                      FilterOperator.Contains,
                      sQuery
                    ),
                  ],
                  and: false,
                })
              );
            }
            that.oDemLocDialog.getBinding("items").filter(oFilters);
            if (that.oDemLocDialog.getItems().length == 0) {
              that.oDemLocDialog.setNoDataText("No Demand Locations Found");
            }
            // Version
          } else if (sId.includes("idVersionDialog")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("VERSION", FilterOperator.Contains, sQuery),
                    new Filter("VERSION_NAME", FilterOperator.Contains, sQuery),
                  ],
                  and: false,
                })
              );
            }
            that.oVersionDialog.getBinding("items").filter(oFilters);
            if (that.oVersionDialog.getItems().length == 0) {
              that.oVersionDialog.setNoDataText("No Versions Found");
            }
            // Scenario
          } else if (sId.includes("idScenDialog")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("SCENARIO", FilterOperator.Contains, sQuery),
                    new Filter(
                      "SCENARIO_NAME",
                      FilterOperator.Contains,
                      sQuery
                    ),
                  ],
                  and: false,
                })
              );
            }
            that.oScenarioDialog.getBinding("items").filter(oFilters);
            if (that.oScenarioDialog.getItems().length == 0) {
              that.oScenarioDialog.setNoDataText("No Scenarios Found");
            }
          } else if (sId.includes("_IDGenSearchField1")) {
            if (sQuery !== "") {
              oFilters.push(
                new Filter({
                  filters: [
                    new Filter("VARIANTNAME", FilterOperator.Contains, sQuery),
                    new Filter("VARIANTID", FilterOperator.Contains, sQuery),
                  ],
                  and: false,
                })
              );
            }
            sap.ui
              .getCore()
              .byId("varNameList")
              .getBinding("items")
              .filter(oFilters);
          }
        },
        handleSelection: function (oEvent) {
          var sId = oEvent.getSource().sId;
          var items = oEvent.getParameters().selectedItems;
          var oTokensCust = {},
            newToken = [];
          switch (sId) {
            case "idManLocDialog":
              that.arrManLoc = [];
              that.oManLocation.removeAllTokens();
              that.oDemLocation.removeAllTokens();
              that.oProduct.removeAllTokens();
              that.oUnqID.removeAllTokens();
              // that.oVersion.removeAllTokens();
              // that.oScenario.removeAllTokens();
              sap.ui
                .getCore()
                .byId(`idDemLocDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              sap.ui
                .getCore()
                .byId(`idProdDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              sap.ui
                .getCore()
                .byId(`idUnqDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idVersionDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idScenDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              if (that.oManLocation.getTokens().length != items.length) {
                items.forEach((i) => {
                  that.arrManLoc.push(i.getTitle().toString());
                  that.oManLocation.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Manufacturing Location",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var manlocationToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Manufacturing Location")
              );
              if (manlocationToken.length > 0) {
                manlocationToken = manlocationToken.sort(
                  that.dynamicSortMultiple("VALUE")
                );
              }
              if (
                JSON.stringify(newToken) !== JSON.stringify(manlocationToken)
              ) {
                that.byId("idMatList123").setModified(true);
              }
              break;
            case "idDemLocDialog":
              that.arrDemLoc = [];
              that.oDemLocation.removeAllTokens();
              that.oProduct.removeAllTokens();
              that.oUnqID.removeAllTokens();
              // that.oVersion.removeAllTokens();
              // that.oScenario.removeAllTokens();
              sap.ui
                .getCore()
                .byId(`idProdDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              sap.ui
                .getCore()
                .byId(`idUnqDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idVersionDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idScenDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              if (that.oDemLocation.getTokens().length != items.length) {
                items.forEach((i) => {
                  let obj = {};
                  obj.DEMAND_LOC = i.getTitle();
                  // obj.PLANNING_LOC = i.getInfo();
                  that.arrDemLoc.push(obj);
                  that.oDemLocation.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Demand Location",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var DemlocationToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Demand Location")
              );
              if (DemlocationToken.length > 0) {
                DemlocationToken = DemlocationToken.sort(
                  that.dynamicSortMultiple("VALUE")
                );
              }
              if (
                JSON.stringify(newToken) !== JSON.stringify(DemlocationToken)
              ) {
                that.byId("idMatList123").setModified(true);
              }
              break;
            case "idProdDialog":
              that.arrProd = [];
              that.refProdArr = [];
              that.oProduct.removeAllTokens();
              that.oUnqID.removeAllTokens();
              // that.oVersion.removeAllTokens();
              // that.oScenario.removeAllTokens();
              sap.ui
                .getCore()
                .byId(`idUnqDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idVersionDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              // sap.ui
              //   .getCore()
              //   .byId(`idScenDialog`)
              //   ._oDialog.getContent()[1]
              //   .getItems()[0]
              //   .setSelected(false);
              if (that.oProduct.getTokens().length != items.length) {
                items.forEach((i) => {
                  that.arrProd.push(i.getTitle().toString());
                  that.refProdArr.push(i.getInfo());
                  that.oProduct.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Product",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var prodToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Product")
              );
              if (prodToken.length > 0) {
                prodToken = prodToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              if (JSON.stringify(newToken) !== JSON.stringify(prodToken)) {
                that.byId("idMatList123").setModified(true);
              }
              // that.getLocProdCharacteristics();
              break;
            case "idUnqDialog":
              that.arrUnq = [];
              that.oUnqID.removeAllTokens();
              if (that.oUnqID.getTokens().length != items.length) {
                items.forEach((i) => {
                  let unqId = i.getDescription()
                    ? i.getDescription()
                    : i.getTitle();
                  that.arrUnq.push(Number(unqId));
                  that.oUnqID.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Unique Id",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var uniqueToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Unique")
              );
              if (uniqueToken.length > 0) {
                uniqueToken = uniqueToken.sort(
                  that.dynamicSortMultiple("VALUE")
                );
              }
              if (JSON.stringify(newToken) !== JSON.stringify(uniqueToken)) {
                that.byId("idMatList123").setModified(true);
              }
              break;
            case "idVersionDialog":
              that.arrVer = [];
              that.oVersion.removeAllTokens();
              that.oScenario.removeAllTokens();
              sap.ui
                .getCore()
                .byId(`idScenDialog`)
                ._oDialog.getContent()[1]
                .getItems()[0]
                .setSelected(false);
              if (that.oVersion.getTokens().length != items.length) {
                items.forEach((i) => {
                  that.arrVer.push(i.getDescription().toString());
                  that.oVersion.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Version",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var versionToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Version")
              );
              if (versionToken.length > 0) {
                versionToken = versionToken.sort(
                  that.dynamicSortMultiple("VALUE")
                );
              }
              if (JSON.stringify(newToken) !== JSON.stringify(versionToken)) {
                that.byId("idMatList123").setModified(true);
              }
              break;
            case "idScenDialog":
              that.arrScen = [];
              that.oScenario.removeAllTokens();
              if (that.oScenario.getTokens().length != items.length) {
                items.forEach((i) => {
                  //   that.arrScen.push(i.getDescription().toString()); commented on 03-01-2025 bcz of filter issues
                  that.arrScen.push(i.getDescription().toString());
                  that.oScenario.addToken(
                    new Token({
                      text: i.getTitle(),
                      key: i.getDescription(),
                      editable: false,
                    })
                  );
                  oTokensCust = {
                    FIELD: "Scenario",
                    VALUE: i.getTitle(),
                  };
                  newToken.push(oTokensCust);
                });
                newToken = newToken.sort(that.dynamicSortMultiple("VALUE"));
              }
              var ScenarioToken = that.finaloTokens.filter((id) =>
                id.FIELD.includes("Scenario")
              );
              if (ScenarioToken.length > 0) {
                ScenarioToken = ScenarioToken.sort(
                  that.dynamicSortMultiple("VALUE")
                );
              }
              if (JSON.stringify(newToken) !== JSON.stringify(ScenarioToken)) {
                that.byId("idMatList123").setModified(true);
              }
              break;
            default:
              break;
          }
        },
        onPanelExpand: function (params) {
          const isExpanded = params.getParameters().expand;

          if (that.hot) {
            let newHeight = isExpanded ? "40vh" : "61vh";

            // Update the height property in the model
            that.oGModel.setProperty("/hotHeight", newHeight);

            // Convert 'vh' to pixels dynamically
            let computedHeight =
              window.innerHeight * (parseInt(newHeight) / 100);

            // Update Handsontable settings dynamically
            that.hot.updateSettings({
              height: computedHeight,
            });

            // Re-render Handsontable
            that.hot.render();
          }
        },
        onGo: async function () {
          if (!that.GO_IS_READY) return;
          if (!that.calWeekData || !that.calWeekData.length)
            return MessageToast.show("No Week Description Available");
          that.GO_IS_READY = false;
          const oFilters = [],
            mLocs = that.arrManLoc,
            dLocs = that.arrDemLoc,
            prods = that.arrProd,
            ver = that.arrVer,
            scen = that.arrScen,
            unq = that.arrUnq || [];

          if (
            mLocs?.length &&
            dLocs?.length &&
            prods?.length &&
            ver?.length &&
            scen?.length
            // true
          ) {
            that.allData = [];

            that.ffData = [];
            that.dates = [];
            that.aCIRQty = [];
            that.cellChanges = [];
            that.changeForecast = {};
            that.commentChanges = [];
            that.foreCastArr = [];
            that.exlVbox.setBusy(true);

            dLocs.forEach((f) =>
              oFilters.push(
                new Filter("LOCATION_ID", FilterOperator.EQ, f.DEMAND_LOC)
              )
            );
            oFilters.push(
              new Filter("PARAMETER_ID", FilterOperator.EQ, 1),
              new Filter("PARAMETER_ID", FilterOperator.EQ, 9)
            );

            that.oModel.read("/V_Parameters", {
              filters: oFilters,
              success: (oData) => {
                that.ffData = that.ffData.concat(oData.results);
              },
              error: () => MessageToast.show("Data fetching error"),
            });

            const planLoc = [];

            mLocs.forEach(mLoc => {
              dLocs.forEach(dLoc => {
                prods.forEach(product => {
                  const planObj = that.fullFiltereData.find(o => o.FACTORY_LOC === mLoc && o.DEMAND_LOC === dLoc.DEMAND_LOC && o.PRODUCT_ID === product);
                  if (planObj)
                    planLoc.push({ DEMAND_LOC: dLoc.DEMAND_LOC, PLANNING_LOC: planObj.PLAN_LOC });
                })
              })
            })

            if (!planLoc.length) {
              MessageToast.show("No Plan Loc Found");
              that.GO_IS_READY = true;
            }


            var vFromDate = new Date(new Date().setDate(that.weekDate.getDateValue().getDate())).toISOString().split('T')[0],
              vToDate = that.weekDate.getSecondDateValue().toISOString().split('T')[0],
              modelVersion = that.modelVer.getSelectedKey();
            var foundobj = that.calWeekData.find(f => that.getConvertedDate(f.WEEK_STARTDATE, "-") <= vFromDate && that.getConvertedDate(f.WEEK_ENDDATE, "-") >= vFromDate)
            vFromDate = foundobj.WEEK_STARTDATE.toISOString().split('T')[0];
            const weekType = that.byId("idToggle").getPressed() ? "Telescopic View" : "Calendar View";
            that.DateKey = weekType == "Telescopic View" ? "tel" : "cal";


            try {
              const urlParameters = {
                LOCATION_ID: JSON.stringify(mLocs),
                PLANNING_LOC: JSON.stringify(planLoc),
                UNIQUE_ID: JSON.stringify(unq),
                PRODUCT_ID: JSON.stringify(prods),
                VERSION: JSON.stringify(ver),
                SCENARIO: JSON.stringify(scen),
                FROMDATE: vFromDate,
                TODATE: vToDate,
                MODEL_VERSION: modelVersion,
                weekType: that.DateKey.toLowerCase()
              };

              that.allFiltersParameters = urlParameters;

              const params = await that.callFunction("getForecastCIRTel", urlParameters);
              const res = JSON.parse(params.getForecastCIRTel);
              const data = res.res;
              that.orginalData = data;
              that.allData = data;
              that.CIRIDS = res.CIR_ID;
              if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                // console.time("start")
                const { excel, totalExcel } = that.createExcel(data);
                const allDate = Object.keys(data);

                var fDates = that.onDateRangeChange();
                fDates.forEach((el) => {
                  that.dates.push(that.getConvertedDate(el, '-'))
                });

                that.generateExcel(excel, allDate);
                that.generateTotalExcel(totalExcel, allDate)

                that.getLocProdCharacteristics();
                that.getPlannedParameters();
              } else {
                that.exlVbox.setBusy(false);
                MessageToast.show("No Forecast Orders");
                that.GO_IS_READY = true;

                // that.charBox.setModel(new JSONModel([]));
                ["quantityContainer", "excelContainer"].forEach((idPart) => {
                  const div = document.querySelector(`[id*="${idPart}"]`);
                  while (div?.firstChild) {
                    div.removeChild(div.firstChild);
                  }
                });
              }
              // that.saveDefaultVariant();
            } catch (error) {
              that.GO_IS_READY = true;
              that.exlVbox.setBusy(false);
              sap.m.MessageToast.show(error.message);
            }
          } else {
            MessageToast.show("Select Required Filters");
            that.GO_IS_READY = true;
          }
        },
        onReloadData: async function () {
          try {
            that.exlVbox.setBusy(true);
            const params = await that.callFunction("getForecastCIRTel", that.allFiltersParameters);
            const res = JSON.parse(params.getForecastCIRTel);
            const data = res.res;
            that.orginalData = data;
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
              const { excel, totalExcel } = that.createExcel(data);
              that.hot.updateData(excel);
              that.totalExcel.updateData(totalExcel);
              that.changeForecast = {};
              that.exlVbox.setBusy(false);
            } else {
              that.exlVbox.setBusy(false);
              MessageToast.show("No Forecast Orders");
              that.charBox.setModel(new JSONModel([]));
              ["quantityContainer", "excelContainer"].forEach((idPart) => {
                const div = document.querySelector(`[id*="${idPart}"]`);
                while (div?.firstChild) {
                  div.removeChild(div.firstChild);
                }
              });
            }
          } catch (error) {
            that.GO_IS_READY = true;
            that.exlVbox.setBusy(false);
            sap.m.MessageToast.show(error.message);
          }
        },
        createExcel(json, uniqueIdToInclude = []) {
          const rowsMap = {}; // temporary map to build each row exactly once

          const sumMap = {};

          const allDate = Object.keys(json);

          allDate.forEach((weekKey) => {
            const weekData = json[weekKey];
            that.currentWeek = weekKey;

            Object.values(weekData).forEach(({ meta, data: itemData }) => {
              for (const uniqueId in itemData) {
                if (uniqueIdToInclude.length && !uniqueIdToInclude.includes(uniqueId))
                  continue;
                const record = itemData[uniqueId];

                [
                  { type: "Forecast", getter: () => record.forecast },
                  { type: "Sales Order Quantity", getter: () => record.ACT_QTY },
                  { type: "Override", getter: () => record.BFORECHNG_CIRQTY },
                  { type: "Net Open Quantity", getter: () => record.OPEN_QTY }
                ].forEach(({ type, getter }) => {
                  // build a unique key per row
                  const mapKey = [
                    meta.DEMAND_LOC,
                    meta.PRODUCT_ID,
                    uniqueId,
                    meta.VERSION,
                    meta.SCENARIO,
                    type,
                  ].join("|");



                  const totalExcelKey = [
                    meta.DEMAND_LOC,
                    meta.PRODUCT_ID,
                    meta.VERSION,
                    meta.SCENARIO,
                    type,
                  ].join("|");

                  // if this is the first time we see this row, initialise it
                  const version = that.verSce_Id_To_Desc.get(meta.VERSION), // replace with version Desc
                    scenario = that.verSce_Id_To_Desc.get(meta.SCENARIO);  // replace with Scenario Desc
                  if (!rowsMap[mapKey]) {
                    rowsMap[mapKey] = [
                      meta.DEMAND_LOC,
                      meta.PRODUCT_ID,
                      uniqueId,
                      version,
                      scenario,
                      type,
                    ];
                  }

                  // push this week's value (or 0 if null/undefined)
                  if (type == "Override") {
                    let overRide = "";
                    if (getter() !== null && getter() !== "" && !isNaN(Number(getter()))) {
                      overRide = record.forecast; // if BFORECHNG_CIRQTY is a number it means we change the forecast manually
                    }
                    if (that.telQ.includes(that.currentWeek)) {
                      overRide = "";
                    }
                    rowsMap[mapKey].push(overRide);

                  }
                  else
                    rowsMap[mapKey].push((getter() ?? 0));

                  //for Total Excel
                  if (type !== "Override") {
                    if (!sumMap[totalExcelKey]) {
                      sumMap[totalExcelKey] = [
                        meta.DEMAND_LOC,
                        meta.PRODUCT_ID,
                        "-",
                        version,
                        scenario,
                        type,
                      ];
                    }
                    if (sumMap[totalExcelKey]) {
                      const lastIndex = rowsMap[mapKey].length - 1
                      const lastValue = sumMap[totalExcelKey][lastIndex]//last value put in main table
                      sumMap[totalExcelKey][lastIndex] = (getter() ?? 0) + Number(lastValue ?? 0);
                    }
                  }
                });
              };
            });
          });
          return { excel: Object.values(rowsMap), totalExcel: Object.values(sumMap) };
        },
        callFunction() {
          const [entity, urlParameters] = arguments,
            { promise, resolve, reject } = Promise.withResolvers();
          that.oModel.callFunction(`/${entity}`, {
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
        onTogglePress: function (oEvent) {
          const oButton = oEvent.getSource();
          const $btn = oButton.$();
          const newText = that.byId("idToggle").getPressed() ? "Telescopic View" : "Calendar View";

          // A single duration for a consistent animation speed
          const animationDuration = 500; // ms

          // Set transform origin for a centered scale effect
          $btn.css("transform-origin", "50% 50%");

          // Animate out by shrinking horizontally
          $({ animValue: 1 }).animate({ animValue: 0 }, {
            duration: animationDuration,
            easing: "swing", // Optional: for a more natural feel
            step: function (now) {
              // 'now' progresses from 1 to 0
              // Apply this progress to both scaleX and opacity
              $btn.css({
                transform: `scaleX(${now})`,
                opacity: now
              });
            },
            complete: function () {
              // --- Animation Out Complete ---

              // 1. Update the text while the button is invisible
              oButton.setText(newText);

              // 2. Animate in by expanding horizontally
              $({ animValue: 0 }).animate({ animValue: 1 }, {
                duration: animationDuration,
                easing: "swing",
                step: function (now) {
                  // 'now' progresses from 0 to 1
                  $btn.css({
                    transform: `scaleX(${now})`,
                    opacity: now
                  });
                }
              });
            }
          });


          // Date range logic
          if (newText === "Calendar View") {
            that.setDateRange('enable', '', 3);
          } else {
            that.setDateRange('disable', 2);
          }

          that.onGo();
        },
        setDateRange(mode = "disable", years = 2, months = 3) {
          const oDateL = new Date();
          const oDateH = new Date();
          if (mode === "disable") {
            // Disable mode: tomorrow + specified years
            oDateH.setFullYear(oDateL.getFullYear() + years);
            that.weekDate.setEnabled(false);
          } else if (mode === "enable") {
            // Enable mode: tomorrow + specified months
            that.weekDate.setEnabled(true);
            oDateH.setMonth(oDateL.getMonth() + months);
            that.weekDate.setMinDate(oDateL);
          }
          that.weekDate.setDateValue(oDateL);
          that.weekDate.setSecondDateValue(oDateH);
        },



        onOpenCharacteristics() {
          that.CharTabledialog.open();
          // sap.ui.getCore().byId("charDetailsDialog").setModel(that.CharModel);
          sap.ui.getCore().byId("charDetailsDialog").fireSearch({
            value: ""
          });
        },
        getLocProdCharacteristics: async function () {
          var products = that.refProdArr;
          var locProdCharModel = new JSONModel();

          // Create individual filters for PRODUCT_IDs
          var aProductFilters = products.map(function (productId) {
            return new Filter("PRODUCT_ID", FilterOperator.EQ, productId);
          });

          // Combine them with OR logic (AND: false)
          var oFinalFilter = new Filter({
            filters: aProductFilters,
            and: false, // OR condition
          });

          const aResults = await that.readModel("getprodChar", {}, [oFinalFilter]);
          if (aResults.length > 0) {
            // that.allChars = that.allChars.concat(aResults);

            // Remove duplicates
            var aFilteredChar = that.removeDuplicatesMultiple(
              aResults,
              ["CHAR_NUM", "CHAR_VALUE"]
            )

            locProdCharModel.setSizeLimit(aFilteredChar.length);
            sap.ui.getCore().byId("charDetailsDialog").setGrowingThreshold(aFilteredChar.length);


            locProdCharModel.setData({
              charDetails: aFilteredChar,
            });

            that.CharModel = locProdCharModel;
            sap.ui.getCore().byId("charDetailsDialog").setModel(that.CharModel);


            // that.charBox.setModel(locProdCharModel);
            // that.charBox.removeAllSelectedItems();


            that.oGModel.setProperty("/AllUniqueChars", aResults);
            that.oGModel.setProperty("/aFilteredChar", aFilteredChar);
          }

          // that.getModel("oModel").read("/getProdClsChar", {
          //   filters: [oFinalFilter],
          //   success: function (oData) {
          //     var aResults = oData.results;
          //     if (aResults.length > 0) {
          //       that.allChars = that.allChars.concat(aResults);

          //       // Remove duplicates
          //       var aFilteredChar = that.removeDuplicatesMultiple(
          //         aResults,
          //         ["CHAR_NUM", "CHARVAL_NUM"]
          //       );

          //       locProdCharModel.setData({
          //         charDetails: aFilteredChar,
          //       });

          //       that.charBox.setModel(locProdCharModel);
          //       that.charBox.removeAllSelectedItems();

          //       that.oGModel.setProperty("/AllUniqueChars", aResults);
          //       that.oGModel.setProperty("/aFilteredChar", aFilteredChar);
          //     }
          //   },
          //   error: function () {
          //     MessageToast.show("Failed to get characteristics data");
          //   },
          // });
        },
        handleSearchs: function (oEvent) {
          var sValue = oEvent.getParameter("value");
          var oFilter = new Filter({
            filters: [
              new Filter("CHAR_NAME", FilterOperator.Contains, sValue),
              new Filter("CHAR_VALUE", FilterOperator.Contains, sValue),
            ],
            and: false,
          });
          var oBinding = oEvent.getSource().getBinding("items");
          oBinding.filter([oFilter]);
        },
        onCharSelectionFinish: async function (oEvent) {
          try {
            // const aSelectedItems = oEvent.getParameter("selectedItems");
            const aSelectedItems = oEvent.mParameters.selectedContexts;
            that.selectChar = aSelectedItems;
            const aAllChars = that.oGModel.getProperty("/AllUniqueChars");
            let aCharNames = [], aCharValNames = [], aResults = [];
            if (aSelectedItems.length == 0) {
              updateTable();
              return;
            }
            that.exlVbox.setBusy(true);
            let aProducts = that.refProdArr;

            const resMap = new Map();
            const prod = new Set();

            aSelectedItems.forEach(function (item) {
              // const obj = item.getBindingContext().getObject()
              const obj = item.getObject();
              let sCharNum = obj.CHAR_NUM;
              let charName = obj.CHAR_NAME;
              let sCharValNum = obj.CHAR_VALUE;

              prod.add(obj.PRODUCT_ID);

              if (!resMap.get(charName))
                resMap.set(charName, new Set());
              const map = resMap.get(charName);
              map.add(sCharValNum);


              let found = aAllChars.find(function (obj) {
                return (
                  obj.CHAR_NUM === sCharNum && obj.CHAR_VALUE === sCharValNum
                );
              });

              if (found && !aCharNames.includes(found.CHAR_NAME)) {
                aCharNames.push(found.CHAR_NAME);
                aCharValNames.push(found.CHAR_VALUE);
              }
            });

            const data = Array.from(resMap, ([charName, charValSet]) => ({
              CharName: charName,
              CharVal: Array.from(charValSet)
            }));

            const Prodducts = Array.from(prod);

            // Now call backend function
            // const urlParameters = {
            //   PRODUCT_ID: JSON.stringify(aProducts),
            //   CHAR: JSON.stringify(aCharNames),
            //   CHARVAL: JSON.stringify(aCharValNames),
            // }

            const urlParameters = {
              PRODUCT_ID: JSON.stringify(Prodducts),
              data: JSON.stringify(data)
            }
            const oData = await that.callFunction("getUniqueIdWithCharVal", urlParameters);

            aResults = JSON.parse(oData.getUniqueIdWithCharVal);
            // let aUniqueIds = [];
            // if (aResults && aResults.length > 0) {
            //   aUniqueIds = aResults.map((item) => String(item.UNIQUE_ID));
            // }

            let aUniqueIds = aResults.map(u => String(u));
            updateTable(aUniqueIds)

          } catch (error) {

            console.error("Backend call failed", error);
            MessageToast.show("Error fetching characteristics data.");
            that.exlVbox.setBusy(false);
          }

          function updateTable(aUniqueIds) {
            let excel, totalExcel, filteredData, result;
            filteredData = JSON.parse(JSON.stringify(that.orginalData));
            if (aUniqueIds?.length == 0)
              filteredData = [];
            result = that.createExcel(filteredData, aUniqueIds);
            excel = result.excel;
            totalExcel = result.totalExcel;

            // if (excel && excel.length > 0) {
            that.exlVbox.setBusy(true);
            setTimeout(() => {
              that.hot.updateData(excel);
              that.hot.getPlugin('filters').filter();
              that.totalExcel.updateData(totalExcel);
              that.exlVbox.setBusy(false);
            }, 200);
            // }
          }
        },
        onClear: function () {
          that.oManLocation.removeAllTokens();
          that.oDemLocation.removeAllTokens();
          that.oProduct.removeAllTokens();
          that.oUnqID.removeAllTokens();
          that.oVersion.removeAllTokens();
          that.oScenario.removeAllTokens();
          that.oManLocDialog.clearSelection();
          that.oDemLocDialog.clearSelection();
          that.oProductDialog.clearSelection();
          that.oUnqDialog.clearSelection();
          that.oVersionDialog.clearSelection();
          that.oScenarioDialog.clearSelection();
          that.byId("idToggle").setPressed(true);
          that.byId("idToggle").setText("Telescopic View");
          that.allData = [];
          (that.arrManLoc = []),
            (that.arrDemLoc = []),
            (that.arrProd = []),
            (that.arrUnq = []),
            // (that.arrVer = []),
            // (that.arrScen = []);
            that.ffData = [];
          that.exlVbox.setBusy(false);
          that.charChange = false;
          that.aCIRQty = [];
          that.cellChanges = [];
          that.commentChanges = [];
          that.changeForecast = {};
          that.foreCastArr = [];
          that.arrVer.push("__BASELINE");
          that.arrScen.push("_PLAN");
          that.byId("idVerInp").addToken(that.verToken);
          that.byId("idScenInp").addToken(that.scenToken);
          // that.charBox.setModel(new JSONModel([]));
          sap.ui.getCore().byId("charDetailsDialog").setModel(new JSONModel([]));
          that.hot = "";
          that.uSkip = 0;
          var existingDiv1 = document.querySelector('[id*="excelContainer"]');
          if (existingDiv1.children.length > 0) {
            while (existingDiv1.firstChild) {
              existingDiv1.removeChild(existingDiv1.firstChild);
            }
          }
          var existingDiv2 = document.querySelector(
            '[id*="quantityContainer"]'
          );
          if (existingDiv2.children.length > 0) {
            while (existingDiv2.firstChild) {
              existingDiv2.removeChild(existingDiv2.firstChild);
            }
          }
          sap.ui
            .getCore()
            .byId(`idDemLocDialog`)
            ._oDialog.getContent()[1]
            .getItems()[0]
            .setSelected(false);
          sap.ui
            .getCore()
            .byId(`idProdDialog`)
            ._oDialog.getContent()[1]
            .getItems()[0]
            .setSelected(false);
          sap.ui
            .getCore()
            .byId(`idUnqDialog`)
            ._oDialog.getContent()[1]
            .getItems()[0]
            .setSelected(false);
          // sap.ui
          //   .getCore()
          //   .byId(`idVersionDialog`)
          //   ._oDialog.getContent()[1]
          //   .getItems()[0]
          //   .setSelected(false);
          // sap.ui
          //   .getCore()
          //   .byId(`idScenDialog`)
          //   ._oDialog.getContent()[1]
          //   .getItems()[0]
          //   .setSelected(false);
          that.setDateRange("disable", 2);
        },
        generateTotalExcel: function (data, allDate) {
          var columns = $.extend(true, [], that.staticColumns);
          var oData = $.extend(true, [], data);
          var excelRows = $.extend(true, [], that.staticRows);

          if (oData.length) {

            allDate.forEach(function (key) {
              columns.push(key);
              excelRows.push({
                data: key,
                readOnly: false,
                wordWrap: true,
              });
            });
          }
          this.loadQtyExcel(oData, excelRows, columns);
        },
        generateExcel: function (data, allDate) {
          // clone fixed/static columns & rows
          var columns = $.extend(true, [], that.staticColumns);
          var oData = $.extend(true, [], data);
          var excelRows = $.extend(true, [], that.staticRows);
          // const allDate = Object.keys(json);


          if (oData.length) {
            // that.storeWeek.sort((a, b) => new Date(a.date) - new Date(b.date));
            // const weekKeys = [...new Set(that.storeWeek.map((sw) => sw.week))];

            allDate.forEach(function (key) {
              columns.push(key);
              excelRows.push({
                data: key,
                readOnly: false,
                wordWrap: true,
              });
            });
          }
          // console.timeEnd("start")
          this.loadExcel(oData, excelRows, columns);
        },
        loadQtyExcel: function (data, rows, columns) {
          const weekType = that.byId("idToggle").getPressed() ? "Telescopic View" : "Calendar View";
          var newDiv = document.createElement("div");
          newDiv.id = "quantityGrid";
          newDiv.textContent = "";
          var existingDiv = document.querySelector('[id*="quantityContainer"]');
          if (existingDiv.children.length > 0) {
            while (existingDiv.firstChild) {
              existingDiv.removeChild(existingDiv.firstChild);
            }
          }
          existingDiv.appendChild(newDiv);
          var excel = document.querySelector('[id*="quantityGrid"]');
          var numberOfColumns = columns.length;
          that.lastWeek = columns[columns.length - 1];
          var defaultWidths = [80, 150, 120, 120, 120, 130];
          var defaultWidthFromFourth = 100;
          var colWidths = Array.from(
            {
              length: numberOfColumns,
            },
            (_, index) => {
              return index < 6 ? defaultWidths[index] : defaultWidthFromFourth;
            }
          );
          if (excel) {
            this.totalExcel = new Handsontable(excel, {
              data: data,
              colHeaders: columns,
              colWidths: colWidths,
              height: 'auto',
              fixedColumnsStart: 6,
              themeName: "ht-theme-main",
              licenseKey: HandsontableKey,
              afterGetColHeader(col, TH) {
                const isStaticCol = col < that.staticColumns.length;

                if (isStaticCol || weekType !== "Telescopic View") {
                  TH.className = "applyHeader";
                  return;
                }

                const text = TH.textContent;

                if (col >= that.staticColumns.length) {
                  if (that.telWeek.includes(text)) TH.className = "applyWeek";
                  if (that.telMonth.includes(text)) TH.className = "applyMonth";
                  if (that.telQ.includes(text)) TH.className = "applyQ";
                  if (text === that.lastWeek) TH.className = "applyQ";
                }

                const weekObj = that.weekLookupMap.get(text);
                if (!weekObj) return;

                TH.title = formatPeriod(weekObj.PERIODSTART, weekObj.PERIODEND);
              },
            });
            function formatPeriod(start, end) {
              const pStart = new Date(start).toLocaleDateString('en-CA');
              const pEnd = new Date(end).toLocaleDateString('en-CA');
              return `${pStart} - ${pEnd}`;
            }
            that.totalExcel.updateSettings({
              cells: function (row, col, prop) {
                var cellProperties = {};
                cellProperties.readOnly = true;
                if (col > 5) {
                  cellProperties.className = "alignmentTot";
                }
                return cellProperties;
              }.bind(this),
            });
          }
          // that.removeScrollAlign()
          that.addScrollAlign();
          that.GO_IS_READY = true;
        },
        loadExcel: function (data, rows, columns) {
          const weekType = that.byId("idToggle").getPressed() ? "TELESCOPIC_WEEK" : "CALENDAR_WEEK";
          var newDiv = document.createElement("div");
          newDiv.id = "excelGrid";
          newDiv.textContent = "";
          var existingDiv = document.querySelector('[id*="excelContainer"]');
          if (existingDiv.children.length > 0) {
            while (existingDiv.firstChild) {
              existingDiv.removeChild(existingDiv.firstChild);
            }
          }
          existingDiv.appendChild(newDiv);
          var excel = document.querySelector('[id*="excelGrid"]');
          var numberOfColumns = columns.length;
          that.lastWeek = columns[columns.length - 1];
          var defaultWidths = [80, 150, 120, 120, 120, 130];
          var defaultWidthFromFourth = 100;
          var colWidths = Array.from(
            {
              length: numberOfColumns,
            },
            (_, index) => {
              return index < 6 ? defaultWidths[index] : defaultWidthFromFourth;
            }
          );

          // --- Infinite Scroll Setup ---
          that.fullData = data;
          that.chunkSize = 1000;
          that.loadedRows = Math.min(that.chunkSize, data.length);
          that.isLoadingMore = false;
          var initialData = data.slice(0, that.chunkSize);

          if (excel && data.length > 0) {
            that.hot = new Handsontable(excel, {
              data: initialData, // <-- Load only first 1000 rows
              colWidths: colWidths,
              // rowHeaders: false,
              colHeaders: columns,
              // rowHeights: 50,
              comments: true,
              // mergeCells: true,
              // autoRowSize: true,
              contextMenu: true,
              contextMenu: {
                items: {
                  "commentsAddEdit": {},
                  "commentsReadOnly": {},
                  "commentsRemove": {
                    name: "Remove comment",
                    callback: function (key, selection) {
                      if (key === "commentsRemove")
                        that.onRemoveComment(selection[0].start);
                    }
                  }
                }
              },
              // width: "auto",
              fixedColumnsStart: 6,
              filters: true,
              // renderAllRows: false,
              dropdownMenu: true,
              hiddenColumns: {
                indicators: true,
              },
              themeName: "ht-theme-main",
              // themeName: theme,
              licenseKey: HandsontableKey,
              dropdownMenu: [
                "filter_by_condition",
                "filter_by_value",
                "filter_action_bar",
              ],
              afterGetColHeader(col, TH) {
                const isDataCol = col >= that.staticColumns.length;
                const headerText = TH.textContent;

                // Remove the changeType button if present
                if (isDataCol) {
                  const button = TH.querySelector(".changeType");
                  if (button) button.remove();
                }

                // Non-Telescopic logic
                if (weekType !== "TELESCOPIC_WEEK") {
                  TH.className = "applyHeader";
                  if (!isDataCol) return;

                  const weekObj = that.calWeekData.find(f => f[weekType] === headerText);
                  if (!weekObj) return;

                  TH.title = formatPeriod(weekObj.PERIODSTART, weekObj.PERIODEND);
                  return;
                }

                // Telescopic logic
                if (!isDataCol) {
                  TH.className = "applyHeader";
                  return;
                }



                const weekObj = that.weekLookupMap.get(headerText);
                if (!weekObj) return;

                TH.title = formatPeriod(weekObj.PERIODSTART, weekObj.PERIODEND);

                if (that.telWeek.includes(headerText)) {
                  TH.className = "applyWeek";
                } else if (that.telMonth.includes(headerText)) {
                  TH.className = "applyMonth";
                } else if (that.telQ.includes(headerText) || headerText === that.lastWeek) {
                  TH.className = "applyQ";
                }
              },
              afterChange: function (changes, source) {
                if (source === 'edit' && changes) {
                  changes.forEach(([row, prop, oldVal, newVal]) => {
                    const rowData = that.hot.getSourceDataAtRow(row);
                    const colHeader = that.hot.getColHeader(that.hot.propToCol(prop));
                    that.afterChange(rowData, colHeader, oldVal, newVal)
                  });
                }
              }
            });
            function formatPeriod(start, end) {
              const pStart = new Date(start).toLocaleDateString('en-CA');
              const pEnd = new Date(end).toLocaleDateString('en-CA');
              return `${pStart} - ${pEnd}`;
            }
            let isProgrammaticUpdate = false;
            that.hot.addHook("afterSetCellMeta", function (row, col, key, comment) {
              if (key === "comment" && comment && !isProgrammaticUpdate) {
                that.onAddOrEditComment({ row, col, comment: comment.value }, comment.value);
              }
            });
            that.hot.addHook(
              "beforeOnCellContextMenu",
              function (event, coords) {
                var contextMenuPlugin = that.hot.getPlugin("contextMenu");
                if (that.hot.getSelectedRange().length === 1) {
                  var rowInd = coords.row;
                  var colInd = coords.col;
                  var cellMeta = that.hot.getCellMeta(rowInd, colInd);
                  var isReadOnly = cellMeta.readOnly;
                  if (isReadOnly) {
                    contextMenuPlugin.disablePlugin();
                  } else {
                    contextMenuPlugin.enablePlugin();
                  }
                }
              }
            );
            var container = that.hot.rootElement; // Get the container element
            container.addEventListener('mousedown', function (event) {
              const isRightClick = event.button === 2;
              var target = event.target;
              if (target.classList.contains('htCore')) {
                // This check ensures that you are only responding to clicks inside the data grid.
                return;
              }
              var cell = that.hot.getSelectedLast();
              if (cell && cell[1] === 2 && event.detail === 1) {
                // Check if the cell is in column 2 and the event is a double-click
                that.onUniqueIdPress(cell);
              }
              // if (isRightClick) {
              //   if (that.hot.getSelectedRange()) {
              //     var selectedLength = that.hot.getSelectedRange().length;
              //     if (selectedLength == 1) {
              //       var cell = that.hot.getSelectedRange()[0].from;
              //       if (cell) {
              //         that.afterExcelCommentChange(cell);
              //       }
              //     }
              //   }
              // }
            });
            let commnetArray = [];
            this.hot.updateSettings({
              cells: function (row, col) {
                var cellProperties = {};
                cellProperties.readOnly = true;

                var rowData = this.hot.getSourceDataAtRow(row);
                let plannedLoc, productId, uniqueId, version, scenario, type;

                if (Array.isArray(rowData)) {
                  [
                    plannedLoc,
                    productId,
                    uniqueId,
                    version,
                    scenario,
                    type
                  ] = rowData;
                  version = that.verSce_Desc_To_Id.get(version);
                  scenario = that.verSce_Desc_To_Id.get(scenario);
                }

                if (rowData && col > that.staticColumns.length - 1) {
                  cellProperties.className = "alignmentHot";
                }

                if (
                  rowData &&
                  col > that.staticColumns.length - 1 &&
                  type === "Forecast"
                ) {
                  cellProperties.className = "manualBg";
                }

                if (rowData && type === "Override" && col > 5) {
                  cellProperties.type = "numeric";

                  //for Comment 
                  const WeekHeader = that.hot.getColHeader(col);

                  if (!that.telWeek.includes(WeekHeader)) {
                    cellProperties.readOnly = true;
                    cellProperties.className = "";
                    return cellProperties;

                  }
                  const ver = version
                  const orginalObj = that.orginalData[WeekHeader][`${plannedLoc}|${productId}|${ver}|${scenario}`].data[uniqueId];
                  if (typeof orginalObj === 'object' && orginalObj.COMMENTS) {
                    commnetArray.push({ row, col, comment: orginalObj.COMMENTS });
                  }

                  let demandLoc = rowData[0]; // assuming DEMAND_LOC is at index 0 (adjust if needed)
                  let productID = rowData[1];
                  let locId = demandLoc?.split("\n")[1];

                  const role = that.RoleMap.get(`${demandLoc}_${productID}`);

                  if (role?.UPDATE) {

                    let foundFdata = that.ffData.find(
                      (f) => f.LOCATION_ID === demandLoc && f.PARAMETER_ID === 1
                    );
                    let foundFirmdata = that.ffData.find(
                      (f) => f.LOCATION_ID === demandLoc && f.PARAMETER_ID === 9
                    );

                    if (foundFdata && foundFirmdata) {
                      let bFirm = false;
                      if (col - 5 <= parseInt(foundFdata?.VALUE)) {
                        cellProperties.readOnly = true;
                        bFirm = true;
                      } else if (col - 5 <= parseInt(foundFirmdata?.VALUE) && !bFirm) {
                        cellProperties.readOnly = false;
                        cellProperties.className = "editable";
                      } else {
                        cellProperties.readOnly = true;
                        cellProperties.className = "editable";
                      }
                    } else {
                      cellProperties.readOnly = false;
                      cellProperties.className = "editable";
                    }
                  }
                }

                return cellProperties;
              }.bind(this),
            });
            commnetArray.forEach(({ row, col, comment }) => {
              isProgrammaticUpdate = true;
              that.hot.getPlugin('comments').setCommentAtCell(row, col, comment);
              isProgrammaticUpdate = false;
            })
            if (!that.oGModel.getProperty("/hotHeight")) {
              that.hot.updateSettings({
                height: "61vh",
              });
            } else {
              let height = that.oGModel.getProperty("/hotHeight");
              that.hot.updateSettings({
                height: height,
              });
            }

            // --- Infinite Scroll Listener ---
            const wtHolder = document.querySelector('.wtHolder');
            if (wtHolder) {
              wtHolder.addEventListener('scroll', function () {
                if (that.isLoadingMore || that.loadedRows >= that.fullData.length) return;

                const { scrollTop, scrollHeight, clientHeight } = wtHolder;

                if (scrollTop + clientHeight >= scrollHeight - 200) {
                  that.isLoadingMore = true;
                  that.exlVbox.setBusy(true);

                  const nextChunk = that.fullData.slice(
                    that.loadedRows,
                    that.loadedRows + that.chunkSize
                  );

                  if (nextChunk.length > 0) {
                    const currentData = that.hot.getSourceData();
                    that.hot.loadData(currentData.concat(nextChunk));
                    that.loadedRows += nextChunk.length;
                    console.log(`Loaded ${that.loadedRows} / ${that.fullData.length} rows`);
                  }

                  that.exlVbox.setBusy(false);
                  setTimeout(() => { that.isLoadingMore = false; }, 300);
                }
              });
            }

            that.exlVbox.setBusy(false);
            that.addScrollAlign();
            that.GO_IS_READY = true;
          } else {
            that.exlVbox.setBusy(false);
            sap.m.MessageToast.show("No Forecast Orders");
            that.GO_IS_READY = true;
          }
        },
        onUniqueIdPress: function (params) {
          that.exlVbox.setBusy(true);
          var ObindingData = that.hot.getSourceDataAtRow(params[0]);
          const [
            sSelDmndLoc,
            sSelProdId,
            iSelUniqueId,
            verDesc,
            scenarioDesc
          ] = ObindingData;

          const ver = that.verSce_Desc_To_Id.get(verDesc);
          const scenario = that.verSce_Desc_To_Id.get(scenarioDesc);

          that.oGModel.setProperty("/ObindingData", {
            sSelDmndLoc,
            sSelProdId,
            iSelUniqueId, ver, scenario
          });

          let aCIRData = that.allData;
          that.oGModel.setProperty("/SelectedUniqueId", iSelUniqueId);
          that.oGModel.setProperty("/SelectedUniqueIdDesc", iSelUniqueId);
          // that.oGModel.setProperty("/SelectedExternalId", sSelExtId);
          that.oGModel.setProperty("/CIRQtys", aCIRData);
          that.oGModel.setProperty("/SelDemandLocation", sSelDmndLoc);
          that.oGModel.setProperty("/SelProduct", sSelProdId);
          that.oGModel.setProperty("/SelectedProd", that.arrProd);
          that.oGModel.setProperty("/TDates", that.dates);
          that.oGModel.setProperty("/CIRQtys", that.allData);
          that.oRouter = sap.ui.core.UIComponent.getRouterFor(that);
          that.oRouter.navTo("View1");
          that.exlVbox.setBusy(false);
        },
        onAddOrEditComment: function (cell, value) {
          if (!value)
            return;
          that.updateComment(cell, value);
        },
        onRemoveComment: function (cell) {
          let value = "";
          that.hot.getPlugin('comments').setCommentAtCell(cell.row, cell.col, "");
          that.updateComment(cell, value);
        },
        updateComment(cell, value) {
          const rowData = that.hot.getSourceDataAtRow(cell.row);
          let plannedLoc, productId, uniqueId, ver, scenario, type, colHeader;
          colHeader = that.hot.getColHeader(cell.col);
          let weekType =
            that.DateKey === "cal" ? "CALENDAR_WEEK" : "TELESCOPIC_WEEK";
          [
            plannedLoc,
            productId,
            uniqueId,
            ver,
            scenario,
            type
          ] = rowData;
          ver = that.verSce_Desc_To_Id.get(ver);
          scenario = that.verSce_Desc_To_Id.get(scenario);
          const key = [
            plannedLoc,
            productId,
            uniqueId,
            ver,
            scenario,
            colHeader
          ].join("|");
          if (!that.changeForecast[key]) {
            const orginalObj = that.orginalData[colHeader][`${plannedLoc}|${productId}|${ver}|${scenario}`].data[uniqueId];
            that.changeForecast[key] = {
              date: colHeader,
              type: weekType,
              meta:
              {
                plannedLoc: plannedLoc,
                productId: productId,
                uniqueId: uniqueId,
                version: ver,
                scenario: scenario,
                Type: type,
                oldValue: orginalObj.forecast,
                newValue: orginalObj.forecast,
                COMMENTS: value
              }
            }
          }
          that.changeForecast[key].meta.COMMENTS = value;
        },
        afterChange(rowData, colHeader, oldVal, newVal) {
          if (oldVal === newVal && newVal === '')
            return;
          let plannedLoc, productId, uniqueId, version, scenario, type;
          let weekType =
            that.DateKey === "cal" ? "CALENDAR_WEEK" : "TELESCOPIC_WEEK";
          [
            plannedLoc,
            productId,
            uniqueId,
            version,
            scenario,
            type
          ] = rowData;
          version = that.verSce_Desc_To_Id.get(version);
          scenario = that.verSce_Desc_To_Id.get(scenario);
          const key = [
            plannedLoc,
            productId,
            uniqueId,
            version,
            scenario,
            colHeader
          ].join("|")
          that.changeForecast[key] = {
            date: colHeader,
            type: weekType,
            meta:
            {
              plannedLoc: plannedLoc,
              productId: productId,
              uniqueId: uniqueId,
              version: version,
              scenario: scenario,
              Type: type,
              oldValue: oldVal,
              newValue: newVal,
              COMMENTS: ""
            }
          }
        },
        addScrollAlign: function () {
          if (!(that.hot && that.totalExcel)) return;
          var mainTable = that.hot.rootElement.querySelector(".wtHolder");
          var subTable = that.totalExcel.rootElement.querySelector(".wtHolder");

          let isSyncing = false;

          function syncScroll(source, target) {
            if (!isSyncing) {
              isSyncing = true;
              target.scrollLeft = source.scrollLeft; // Sync only horizontal scroll
              isSyncing = false;
            }
          }

          mainTable.addEventListener("scroll", function () {
            syncScroll(mainTable, subTable);
          });

          subTable.addEventListener("scroll", function () {
            syncScroll(subTable, mainTable);
          });
        },
        getMondaysBetween(startDateStr, endDateStr) {
          let startDate = new Date(startDateStr);
          const endDate = new Date(endDateStr);

          // Ensure startDate is before endDate
          if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
          }

          // Loop from start to end, checking for Mondays
          while (startDate <= endDate) {
            if (startDate.getDay() === 1) {
              return startDate.toLocaleDateString("en-CA");
            }
            startDate.setDate(startDate.getDate() + 1);
          }

          return undefined;
        },
        //************ Handle Assembly Requirements ***************************************
        onPressAssemblyRequirements: function () {
          var mLocs = that.arrManLoc,
            dLocs = that.arrDemLoc,
            prods = that.arrProd,
            ver = that.arrVer,
            scen = that.arrScen;
          if (
            mLocs &&
            mLocs.length > 0 &&
            dLocs &&
            dLocs.length > 0 &&
            prods &&
            prods.length > 0 &&
            ver &&
            ver.length > 0 &&
            scen &&
            scen.length > 0
          ) {
            // Validate Manufacturing Location and Product combinations
            var allowedCombos = [];
            var notAllowedCombos = [];

            mLocs.forEach(function (mLoc) {
              prods.forEach(function (prod) {
                var key = `${mLoc}_${prod}`;
                var roleMapping = that.RoleMapFac.get(key);

                if (roleMapping && roleMapping.CREATE) {
                  allowedCombos.push({
                    mLoc: mLoc,
                    prod: prod
                  });
                } else {
                  notAllowedCombos.push({
                    mLoc: mLoc,
                    prod: prod
                  });
                }
              });
            });

            // If there are not allowed combinations, show warning message
            if (notAllowedCombos.length > 0) {
              var warningMessage = "The following Product(s) are not Authorized in the selected Manufacturing Location(s):\n\n";

              // Group by Manufacturing Location for better readability
              var groupedByMLoc = {};
              notAllowedCombos.forEach(function (combo) {
                if (!groupedByMLoc[combo.mLoc]) {
                  groupedByMLoc[combo.mLoc] = [];
                }
                groupedByMLoc[combo.mLoc].push(combo.prod);
              });

              Object.keys(groupedByMLoc).forEach(function (mLoc) {
                warningMessage += `Manufacturing Location: ${mLoc}\n`;
                warningMessage += `Products: ${groupedByMLoc[mLoc].join(", ")}\n\n`;
              });

              // Check if any allowed combinations exist
              if (allowedCombos.length > 0) {
                warningMessage += "Do you want to continue with only the allowed combinations?";

                MessageBox.confirm(warningMessage, {
                  icon: MessageBox.Icon.WARNING,
                  title: "Authorization Warning",
                  actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                  emphasizedAction: MessageBox.Action.NO,
                  onClose: function (oAction) {
                    if (oAction === "YES") {
                      // Pass only allowed combinations
                      that.onPressAssemblyRequirementsConfirm(allowedCombos);
                    }
                  },
                });
              } else {
                // No allowed combinations found
                warningMessage = "None of the selected Product and Manufacturing Location combinations are allowed. Please check your selections.";
                MessageBox.error(warningMessage, {
                  title: "Authorization Error"
                });
              }
            } else {
              // All combinations are allowed, proceed with confirmation
              MessageBox.confirm(
                "Would you like to generate assembly requirements data?",
                {
                  icon: MessageBox.Icon.Conf,
                  title: "Confirmation",
                  actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                  emphasizedAction: MessageBox.Action.YES,
                  onClose: function (oAction) {
                    if (oAction === "YES") {
                      that.onPressAssemblyRequirementsConfirm(allowedCombos);
                    }
                  },
                }
              );
            }
          } else {
            sap.m.MessageToast.show("Please select all filters!");
          }
        },
        onPressAssemblyRequirementsConfirm: function (allowedCombos) {
          const allowedMLocs = [...new Set(allowedCombos.map(combo => combo.mLoc))];
          const allowedProds = [...new Set(allowedCombos.map(combo => combo.prod))];
          var that = this;
          that.count = 0;
          that.jobList = [];
          var aScheduleSEDT = that.getScheduleSEDT();
          var dCurrDateTime = new Date().getTime();
          var actionText = encodeURIComponent("/catalog/generateAssemblyReq");

          BusyIndicator.show();

          // Build job list based on arrManLoc and arrProd
          allowedMLocs.forEach((l) => {
            allowedProds.forEach((p) => {
              if (l && p) {
                // Ensure location and product are valid
                var oEntry = {
                  LOCATION_ID: l,
                  PRODUCT_ID: p,
                };

                var JobName = "Assembly Requirements" + dCurrDateTime;
                var finalList = {
                  name: JobName,
                  description: "Generate Assembly Requirements",
                  action: actionText,
                  active: true,
                  httpMethod: "POST",
                  startTime: aScheduleSEDT.djSdate,
                  endTime: aScheduleSEDT.djEdate,
                  createdAt: aScheduleSEDT.djSdate,
                  schedules: [
                    {
                      data: oEntry,
                      cron: "",
                      time: aScheduleSEDT.oneTime,
                      active: true,
                      startTime: aScheduleSEDT.dsSDate,
                      endTime: aScheduleSEDT.dsEDate,
                    },
                  ],
                };

                that.jobList.push(finalList);
              }
            });
          });

          // Schedule jobs recursively
          var scheduleNextJob = function () {
            if (that.count >= that.jobList.length) {
              // Exit when all jobs are done
              sap.m.MessageToast.show("Jobs Created");
              sap.ui.core.BusyIndicator.hide();
              return;
            }

            var finalList = that.jobList[that.count];
            that.getModel("JModel").callFunction("/addMLJob", {
              method: "GET",
              urlParameters: {
                jobDetails: JSON.stringify(finalList),
              },
              success: function () {
                that.count++;
                scheduleNextJob(); // Schedule the next job after success
              },
              error: function () {
                scheduleNextJob(); // Retry the next job on error
              },
            });
          };

          // Start scheduling jobs
          scheduleNextJob();
        },
        // ***************************** Handle Save **************************************
        onPressSave: function () {
          let mismatchDate;
          var sMessage = "";
          // Validation to check for total demand quantity per week
          mismatchDate = that.checkTotalDemandQty();
          if (Array.isArray(mismatchDate)) {
            if (mismatchDate.length === 0) {
              MessageBox.confirm("Would you like to save?", {
                icon: MessageBox.Icon.Conf,
                title: "Confirmation",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                  if (oAction === "YES") {
                    that.onPressSaveConfirm();
                  }
                },
              });
            } else {
              var Weeks = mismatchDate.join(",");
              sMessage =
                "Please adjust quatities as per total location demand for week(s)  -  " +
                Weeks;
              MessageToast.show(sMessage, {
                width: "35em",
              });
            }
          } else {
            MessageToast.show(mismatchDate, {
              width: "35em",
            });
          }
        },
        // getCIR_ID(changeForecast) {
        //   const CIR_IDS = that.CIRIDS;
        //   changeForecast.forEach(obj => {
        //     const CIR_ID = CIR_IDS.find(c =>
        //       c.LOCATION_ID === obj.LOCATION_ID &&
        //       c.PRODUCT_ID === obj.PRODUCT_ID &&
        //       c.VERSION === obj.VERSION &&
        //       c.WEEK_DATE === obj.WEEK_DATE &&
        //       c.UNIQUE_ID == Number(obj.UNIQUE_ID) &&
        //       c.SCENARIO === obj.SCENARIO
        //     );
        //     if (CIR_ID) {
        //       obj.CIR_ID = CIR_ID.CIR_ID
        //     }
        //   })
        // },
        onPressSaveConfirm: async function () {
          that.exlVbox.setBusy(true);
          const changeForecast = [];
          let weekType = "TELESCOPIC_WEEK";
          if (that.DateKey == "cal")
            weekType = "CALENDAR_WEEK";
          Object.values(that.changeForecast).forEach(({ meta, date }) => {
            const cal = that.calWeekData.find(o => o[weekType] === date);
            let monday;
            if (cal) {
              monday = that.getMondaysBetween(cal.WEEK_STARTDATE, cal.WEEK_ENDDATE);
            }

            const obj = {
              LOCATION_ID: meta.plannedLoc,
              PRODUCT_ID: meta.productId,
              UNIQUE_ID: meta.uniqueId,
              MODEL_VERSION: that.modelVer.getSelectedKey(),
              VERSION: meta.version,
              SCENARIO: meta.scenario,
              CIR_ID: "",
              WEEK_DATE: monday,
              COMMENTS: meta.COMMENTS,
              CIR_QTY: meta.newValue,
              OLD_CIR_QTY: meta.oldValue || 0,
            }
            changeForecast.push(obj);
          })
          // that.getCIR_ID(changeForecast);

          if (changeForecast.length < 0) {
            that.exlVbox.setBusy(false);
            return;
          }
          const urlParameters = {
            FLAG: "U",
            CIR_QUANTITIES: JSON.stringify(changeForecast),
          };
          try {
            const res = await that.callFunction("modifyCIRFirmQuantities", urlParameters);
            sap.m.MessageToast.show(res.modifyCIRFirmQuantities);
            that.onReloadData();
            that.changeForecast = {};
          } catch (error) {
            that.exlVbox.setBusy(false);
            sap.m.MessageToast.show(
              "Service Connectivity Issue, please try later!"
            );
          }
        },
        readModel(entity, urlParameters, filter = []) {
          let allResults = [];
          let skip = 0;
          const top = urlParameters.$top || 50000; // Use provided top or default to 20,000

          // Function to recursively fetch data
          const fetchData = async () => {
            // Create a copy of urlParameters and update skip
            const currentUrlParameters = { ...urlParameters, $top: top, $skip: skip };

            try {
              const { promise, resolve, reject } = Promise.withResolvers();
              that.oModel.read(`/${entity}`, {
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
        checkTotalDemandQty: function () {
          const totalData = that.totalExcel.getSourceData();
          const mainTableData = that.hot.getSourceData();
          if (!Object.values(that.changeForecast).length)
            return "No Changes To Save";

          const allChangeDate = [...new Set(Object.values(that.changeForecast).map(o => o.date))];
          const colHeader = that.totalExcel.getColHeader();

          const mismatchDate = new Set(); // Avoid duplicate dates

          for (const arr of totalData) {
            let [
              plannedLoc,
              productId,
              uniqueId,
              version,
              scenario,
              type
            ] = arr;


            if (type !== "Forecast")
              continue;

            allChangeDate.forEach(date => {
              const dateIndex = colHeader.findIndex(c => c === date);
              if (dateIndex === -1) return; // Skip if date not found in header

              let thisDateSum = 0;

              for (const row of mainTableData) {
                const [
                  plannedLocRow,
                  productIdRow,
                  uniqueIdRow,
                  versionRow,
                  scenarioRow,
                  typeRow
                ] = row;

                if (
                  plannedLocRow !== plannedLoc ||
                  productIdRow !== productId ||
                  versionRow !== version ||
                  scenarioRow !== scenario ||
                  typeRow !== type
                )
                  continue;

                const versionID = that.verSce_Desc_To_Id.get(versionRow),
                  scenarioID = that.verSce_Desc_To_Id.get(scenarioRow);

                const key = [
                  plannedLocRow,
                  productIdRow,
                  uniqueIdRow,
                  versionID,
                  scenarioID,
                  date
                ].join("|");

                const value = that.changeForecast[key]
                  ? parseFloat(that.changeForecast[key].meta.newValue) || 0
                  : parseFloat(row[dateIndex]) || 0; // Fix: safe numeric parsing

                thisDateSum += value;
              }

              const originalValue = parseFloat(arr[dateIndex]) || 0; // Fix: ensure numeric
              if (thisDateSum !== originalValue) {
                mismatchDate.add(date); // Fix: prevent duplicates
              }
            });
          }

          return [...mismatchDate]; // Return array
        },
        // *******************************Handle Download***********************************
        onPressDownload: function () {
          var hot = that.hot;
          if (hot) {
            var exportPlugin = hot.getPlugin("exportFile");

            exportPlugin.downloadFile("csv", {
              bom: false,
              columnDelimiter: ",",
              columnHeaders: true,
              exportHiddenColumns: true,
              exportHiddenRows: true,
              fileExtension: "csv",
              filename: `${that.sTitle}_[YYYY]-[MM]-[DD]`,
              mimeType: "text/csv",
              rowDelimiter: "\r\n",
              rowHeaders: false,
            });
          } else {
            MessageToast.show(
              "Select * filters and load the table before downloading"
            );
          }
        },
        // *******************************Handle Publish************************************
        checkAuthPublish: function () {
          var mLocs = that.arrManLoc,
            dLocs = that.arrDemLoc,
            prods = that.arrProd,
            ver = that.arrVer,
            scen = that.arrScen;

          if (
            mLocs &&
            mLocs.length > 0 &&
            dLocs &&
            dLocs.length > 0 &&
            prods &&
            prods.length > 0 &&
            ver &&
            ver.length > 0 &&
            scen &&
            scen.length > 0
          ) {
            // Validate Manufacturing Location, Demand Location and Product combinations
            var allowedCombos = [];
            var notAllowedCombos = [];

            mLocs.forEach(function (mLoc) {
              dLocs.forEach(function (dLocObj) {
                prods.forEach(function (prod) {
                  var key = `${mLoc}_${dLocObj.DEMAND_LOC}_${prod}`;
                  var roleMapping = that.RoleMapFD.get(key);

                  if (roleMapping && roleMapping.CREATE) {
                    allowedCombos.push({
                      mLoc: mLoc,
                      dLoc: dLocObj.DEMAND_LOC,
                      dLocObj: dLocObj, // Keep full object if needed
                      prod: prod
                    });
                  } else {
                    notAllowedCombos.push({
                      mLoc: mLoc,
                      dLoc: dLocObj.DEMAND_LOC,
                      dLocObj: dLocObj, // Keep full object if needed
                      prod: prod
                    });
                  }
                });
              });
            });

            // If there are not allowed combinations, show warning message
            if (notAllowedCombos.length > 0) {
              var warningMessage = "The following Product(s) are not Authorized for the selected Manufacturing Location(s) and Demand Location(s):\n\n";

              // Group by Manufacturing Location and Demand Location for better readability
              var groupedByMLoc = {};
              notAllowedCombos.forEach(function (combo) {
                var mLocKey = combo.mLoc;
                if (!groupedByMLoc[mLocKey]) {
                  groupedByMLoc[mLocKey] = {};
                }
                if (!groupedByMLoc[mLocKey][combo.dLoc]) {
                  groupedByMLoc[mLocKey][combo.dLoc] = [];
                }
                groupedByMLoc[mLocKey][combo.dLoc].push(combo.prod);
              });

              Object.keys(groupedByMLoc).forEach(function (mLoc) {
                warningMessage += `Manufacturing Location: ${mLoc}\n`;
                Object.keys(groupedByMLoc[mLoc]).forEach(function (dLoc) {
                  warningMessage += `  Demand Location: ${dLoc}\n`;
                  warningMessage += `    Products: ${groupedByMLoc[mLoc][dLoc].join(", ")}\n`;
                });
                warningMessage += "\n";
              });

              // Check if any allowed combinations exist
              if (allowedCombos.length > 0) {
                warningMessage += "Do you want to continue with only the Authorized combinations?";

                MessageBox.confirm(warningMessage, {
                  icon: MessageBox.Icon.WARNING,
                  title: "Authorization Warning",
                  actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                  emphasizedAction: MessageBox.Action.NO,
                  onClose: function (oAction) {
                    if (oAction === "YES") {
                      // Pass only allowed combinations
                      that.onPressPublish(allowedCombos);
                    }
                  },
                });
              } else {
                // No allowed combinations found
                warningMessage = "None of the selected Product, Manufacturing Location and Demand Location combinations are Authorized. Please check your selections.";
                MessageBox.error(warningMessage, {
                  title: "Authorization Error"
                });
              }
            } else {
              // All combinations are allowed, proceed with confirmation
              MessageBox.confirm(
                "Would you like to publish the data?",
                {
                  icon: MessageBox.Icon.CONFIRMATION,
                  title: "Confirmation",
                  actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                  emphasizedAction: MessageBox.Action.YES,
                  onClose: function (oAction) {
                    if (oAction === "YES") {
                      that.onPressPublish(allowedCombos);
                    }
                  },
                }
              );
            }
          } else {
            sap.m.MessageToast.show("Please select all filters!");
          }
        },
        onPressPublish: function (allowedCombos) {
          // var mLocs = that.arrManLoc;
          // var dLocs = that.arrDemLoc;
          // var prods = that.arrProd;
          var mLocs = [...new Set(allowedCombos.map(combo => combo.mLoc))];
          var dLocs = [...new Set(allowedCombos.map(combo => combo.dLoc))];
          var prods = [...new Set(allowedCombos.map(combo => combo.prod))];

          that.publicMloc = mLocs;
          that.publicdLocs = dLocs;
          that.publicprods = prods;

          var ver = that.arrVer;
          var scen = that.arrScen;
          if (mLocs && dLocs && prods && ver && scen) {
            if (that.dates && that.dates.length > 0) {
              //If Model version is Simulation ,cannot publish data
              if (that.modelVer.getSelectedKey() == "Simulation") {
                return MessageToast.show(
                  "Cannot publish when model version is Simulation."
                );
              }
              if (that.aCIRQty.length > 0) {
                MessageToast.show(
                  "Please save changed quantities before publish!"
                );
              } else {
                that.setpublishFragment();
                that._Publishdialog.open();
              }
            } else {
              MessageToast.show("Please Load Excel Pressing GO Button");
            }
          } else {
            MessageToast.show("Please Selection all Filters");
          }
        },
        onPressPublishConfirm: function () {
          BusyIndicator.show();
          // getting the input values
          var oEntry = {};
          var vFromDate = that.getConvertedDate(
            that.weekDate.getDateValue(),
            "-"
          );
          var vToDate = that.getConvertedDate(
            that.weekDate.getSecondDateValue(),
            "-"
          );
          oEntry.LOCATION_ID = that.publicMloc;
          oEntry.PLANNED_LOC = JSON.stringify(that.publicdLocs);
          oEntry.PRODUCT_ID = that.publicprods;
          // oEntry.REF_PRODID = that.oGModel.getProperty("/SelectedRefProd");
          oEntry.VERSION = that.arrVer;
          oEntry.SCENARIO = that.arrScen;
          oEntry.MODEL_VERSION = that.modelVer.getSelectedKey();
          oEntry.FROMDATE = vFromDate;
          oEntry.TODATE = vToDate;
          if (
            oEntry.LOCATION_ID !== undefined &&
            oEntry.PLANNED_LOC !== undefined &&
            oEntry.PRODUCT_ID !== undefined &&
            oEntry.VERSION !== undefined &&
            oEntry.SCENARIO !== undefined &&
            oEntry.MODEL_VERSION !== undefined &&
            vFromDate !== undefined &&
            vFromDate !== "" &&
            vToDate !== undefined &&
            vToDate !== ""
          ) {
            // Call service through Job Scheduler
            that.snapshotFunction(oEntry);
            // Call Snapshot function, only after success of it create job
          } else {
            BusyIndicator.hide();
            sap.m.MessageToast.show(
              "Please select a Location/Product/Version/Scenario/Date Range"
            );
          }
        },
        handlePublish: function (oEntry) {
          var aScheduleSEDT = {};
          aScheduleSEDT = that.getScheduleSEDT();
          var keys = ["DEMAND_LOC", "PRODUCT_ID", "VERSION", "SCENARIO"];
          var hotData = that.hot.getSourceData();
          var modifiedData = that.removeDuplicatesMultiple(hotData, keys);
          modifiedData.forEach((obj) => {
            var vcRuleList = {
              LOCATION_ID: obj.DEMAND_LOC.split("\n")[1],
              PLANNING_LOC: oEntry.PLANNED_LOC,
              PRODUCT_ID: obj.PRODUCT_ID.split("\n")[1],
              VERSION: oEntry.VERSION[0],
              SCENARIO: oEntry.SCENARIO[0],
              FROMDATE: oEntry.FROMDATE,
              TODATE: oEntry.TODATE,
              MODEL_VERSION: oEntry.MODEL_VERSION,
              VALIDUSER: that.sCFUserDestination,
              USER_ID: that.sUserId,
            };
            // that.oGModel.setProperty("/vcrulesData", vRuleslist);
            // var vcRuleList = that.oGModel.getProperty("/vcrulesData");
            var dCurrDateTime = new Date().getTime();
            var actionText = "/catalog/postCIRQuantitiesToS4";
            var JobName = "CIRQtys" + dCurrDateTime;
            var finalList = {
              name: JobName,
              description: "Weekly CIR Quantity",
              action: encodeURIComponent(actionText),
              active: true,
              httpMethod: "POST",
              startTime: aScheduleSEDT.djSdate,
              endTime: aScheduleSEDT.djEdate,
              createdAt: aScheduleSEDT.djSdate,
              schedules: [
                {
                  data: vcRuleList,
                  cron: "",
                  time: aScheduleSEDT.oneTime,
                  active: true,
                  startTime: aScheduleSEDT.dsSDate,
                  endTime: aScheduleSEDT.dsEDate,
                },
              ],
            };
            that.JModel.callFunction("/addMLJob", {
              method: "GET",
              urlParameters: {
                jobDetails: JSON.stringify(finalList),
              },
              success: function (oData) {
                BusyIndicator.hide();
                sap.m.MessageToast.show(oData.addMLJob + ": Job Created");
                if (that._Publishdialog) {
                  that._Publishdialog.close();
                }
              },
              error: function () {
                BusyIndicator.hide();
                sap.m.MessageToast.show("Error While publishing data!");
                if (that._Publishdialog) {
                  that._Publishdialog.close();
                }
              },
            });
          });
        },
        snapshotFunction: function (oEntry) {
          var sSnapDesc = "",
            sSnapType = "";
          if (sap.ui.getCore().byId("chkSnapshot").getSelected() === true) {
            var RadioSelected = sap.ui
              .getCore()
              .byId("publishrg")
              .getSelectedButton()
              .getText();
            if (RadioSelected === "Create") {
              sSnapType = "C";
              sSnapDesc = sap.ui.getCore().byId("iDescription").getValue();
              if (sSnapDesc.toString().trim() == "") {
                sap.ui.getCore().byId("iDescription").setValueState("Error");
                MessageToast.show("Please enter Snapshot Description");
                return BusyIndicator.hide();
              }
            } else if (RadioSelected === "Update") {
              sSnapType = "U";
              sSnapDesc = "";
            }
            var aData = [
              {
                SNAPSHOT_DESC: sSnapDesc,
                Mode: sSnapType,
              },
            ];
            var aScheduleSEDT = {};
            // Get Job Schedule Start/End Date/Time
            aScheduleSEDT = that.getScheduleSEDT();
            var dCurrDateTime = new Date().getTime();
            var actionText = "/catalog/maintainSnapShotjob";
            var JobName = "Snapshot generation" + dCurrDateTime;
            sap.ui.core.BusyIndicator.show();
            var finalList = {
              name: JobName,
              description: "Snapshot generation",
              action: encodeURIComponent(actionText),
              active: true,
              httpMethod: "POST",
              startTime: aScheduleSEDT.djSdate,
              endTime: aScheduleSEDT.djEdate,
              createdAt: aScheduleSEDT.djSdate,
              schedules: [
                {
                  data: {
                    SnapData: JSON.stringify(aData),
                  },
                  cron: "",
                  time: aScheduleSEDT.oneTime,
                  active: true,
                  startTime: aScheduleSEDT.dsSDate,
                  endTime: aScheduleSEDT.dsEDate,
                },
              ],
            };
            that.JModel.callFunction("/addMLJob", {
              method: "GET",
              urlParameters: {
                jobDetails: JSON.stringify(finalList),
              },
              success: function (oData) {
                BusyIndicator.hide();
                if (that._Publishdialog) {
                  that._Publishdialog.close();
                }
                that.handlePublish(oEntry);
              },
              error: function (error) {
                BusyIndicator.hide();
                sap.m.MessageToast.show("Service Connectivity Issue!");
              },
            });

            // that.oModel.callFunction("/maintainSnapShotLevels", {
            //     method: "GET",
            //     urlParameters: {
            //         SnapData: JSON.stringify(array)
            //     },
            //     success: function () {
            //         BusyIndicator.hide();
            //         if (that._Publishdialog) {
            //             that._Publishdialog.close();
            //         }
            //         that.handlePublish(oEntry);
            //     },
            //     error: function () {
            //         BusyIndicator.hide();
            //     },
            // });
          }
          //Call service through Job Scheduler
          else {
            if (that._Publishdialog) {
              that._Publishdialog.close();
            }
            that.handlePublish(oEntry);
          }
        },
        closePublishDialog: function () {
          that._Publishdialog.close();
        },
        chkSnapshotSelect: function () {
          var bCheckbox = sap.ui.getCore().byId("chkSnapshot").getSelected();
          if (bCheckbox == true) {
            sap.ui.getCore().byId("publishrg").setVisible(true);
            sap.ui.getCore().byId("HPublish").setVisible(true);
            sap.ui.getCore().byId("publishrg").setSelectedIndex(0);
          } else {
            sap.ui.getCore().byId("publishrg").setVisible(false);
            sap.ui.getCore().byId("HPublish").setVisible(false);
          }
          sap.ui.getCore().byId("iDescription").setValue("");
          sap.ui.getCore().byId("iDescription").setValueState("None");
        },
        radioGrpSelect: function (oEvent) {
          if (oEvent.getParameters().selectedIndex != 1) {
            sap.ui.getCore().byId("HPublish").setVisible(true);
          } else {
            sap.ui.getCore().byId("HPublish").setVisible(false);
            sap.ui.getCore().byId("iDescription").setValue("");
            sap.ui.getCore().byId("iDescription").setValueState("None");
          }
        },
        setpublishFragment: function () {
          sap.ui.getCore().byId("chkSnapshot").setSelected(false);
          sap.ui.getCore().byId("publishrg").setVisible(false);
          sap.ui.getCore().byId("publishrg").setSelectedIndex(0);
          sap.ui.getCore().byId("HPublish").setVisible(false);
          sap.ui.getCore().byId("iDescription").setValue("");
          sap.ui.getCore().byId("iDescription").setValue("");
          sap.ui.getCore().byId("iDescription").setValueState("None");
        },
        // *******************************Other Functions************************************
        getForeCastObjects: function (handsontab) {
          that.foreCastArr = [];
          if (handsontab) {
            var dataLen = handsontab.getData().length;
            for (let i = 0; i < dataLen; i++) {
              var rowData = that.hot.getSourceDataAtRow(i);
              if (rowData.TYPE === "Forecast") {
                var obj = {};
                Object.assign(obj, rowData);
                obj.DEMAND_LOC = rowData.DEMAND_LOC.split("\n")[1];
                obj.PRODUCT_ID = rowData.PRODUCT_ID.split("\n")[1];
                obj.UNIQUE_ID = rowData.UNIQUE_ID.split("\n")[1];
                that.foreCastArr.push(obj);
              }
            }
          }
          return that.foreCastArr;
        },
        getConvertedDate: function (inputFormat, joinBy) {
          function pad(s) {
            return s < 10 ? "0" + s : s;
          }
          var d = new Date(inputFormat);
          return [
            d.getFullYear(),
            pad(d.getMonth() + 1),
            pad(d.getDate()),
          ].join(joinBy);
        },
        onDateRangeChange: function () {
          var oStartDate = that.weekDate.getDateValue(),
            oEndDate = that.weekDate.getSecondDateValue();
          var aAllDates = [];
          var oCurrentDate = new Date(oStartDate);
          while (oCurrentDate <= oEndDate) {
            if (oCurrentDate.getDay() === 1) {
              aAllDates.push(new Date(oCurrentDate));
            }
            oCurrentDate.setDate(oCurrentDate.getDate() + 1);
          }
          return aAllDates;
        },
        getScheduleSEDT: function () {
          var aScheduleSEDT = {};
          var dDate = new Date();
          // 07-09-2022-1
          var idSchTime = dDate.setSeconds(dDate.getSeconds() + 20);
          // 07-09-2022-1
          var idSETime = dDate.setHours(dDate.getHours() + 2);
          idSchTime = new Date(idSchTime);
          idSETime = new Date(idSETime);
          //var onetime = idSchTime;
          var djSdate = new Date(),
            djEdate = idSETime,
            dsSDate = new Date(),
            dsEDate = idSETime,
            tjStime,
            tjEtime,
            tsStime,
            tsEtime;

          djSdate = djSdate.toISOString().split("T");
          tjStime = djSdate[1].split(":");
          djEdate = djEdate.toISOString().split("T");
          tjEtime = djEdate[1].split(":");
          dsSDate = dsSDate.toISOString().split("T");
          tsStime = dsSDate[1].split(":");
          dsEDate = dsEDate.toISOString().split("T");
          tsEtime = dsEDate[1].split(":");

          var dDate = new Date().toLocaleString().split(" ");
          aScheduleSEDT.djSdate =
            djSdate[0] + " " + tjStime[0] + ":" + tjStime[1] + " " + "+0000";
          aScheduleSEDT.djEdate =
            djEdate[0] + " " + tjEtime[0] + ":" + tjEtime[1] + " " + "+0000";
          aScheduleSEDT.dsSDate =
            dsSDate[0] + " " + tsStime[0] + ":" + tsStime[1] + " " + "+0000";
          aScheduleSEDT.dsEDate =
            dsEDate[0] + " " + tsEtime[0] + ":" + tsEtime[1] + " " + "+0000";
          aScheduleSEDT.oneTime = idSchTime;

          return aScheduleSEDT;
        },
        getPlannedParameters: function () {
          var sLocation = that.arrManLoc;
          let oFilters = [];
          sLocation.forEach((l) => {
            oFilters.push(new Filter("LOCATION_ID", FilterOperator.EQ, l));
          });
          that.oModel.read("/V_Parameters", {
            filters: [new sap.ui.model.Filter(oFilters, false)],
            success: function (oData) {
              var aParams = oData.results;
              var oParam = {};
              if (aParams.length > 0) {
                var iFrozenHorizon = parseInt(oData.results[0].VALUE) * 7 + 1;
                var dDate = new Date();
                dDate = new Date(
                  dDate.setDate(dDate.getDate() + iFrozenHorizon)
                );
                // that.dFrozenHorizonDate = dDate;
                that.oGModel.setProperty("/dFrozenHorizonDate", dDate);
                oParam = aParams.find((obj) => obj.PARAMETER_ID === 9);
                var iFirmHorizon = parseInt(oParam.VALUE) * 7;
                var dDateFHL = new Date();
                dDateFHL = new Date(
                  dDateFHL.setDate(dDateFHL.getDate() + iFirmHorizon)
                );
                //  that.dFirmHorizonDate = dDateFHL;
                that.oGModel.setProperty("/dFirmHorizonDate", dDateFHL);
              }
            },
            error: function () {
              MessageToast.show("error");
            },
          });
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
          return function (obj1, obj2) {
            var i = 0,
              result = 0,
              numberOfProperties = props.length;
            /* try getting a different result from 0 (equal)
             * as long as we have extra properties to compare
             */
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
            /* next line works with strings and numbers,
             * and you may want to customize it to your needs
             */
            var result =
              a[property] < b[property]
                ? -1
                : a[property] > b[property]
                  ? 1
                  : 0;
            return result * sortOrder;
          };
        },
        // Variant management code
        getData: function () {
          // BusyIndicator.show();
          that.oGModel.setProperty("/UserId", that.sUserId);
          //calling variant view data
          that.getVariantData();
        },
        /*Getting variant view data*/
        getVariantData: function () {
          var ndData = [];
          var dData = [],
            uniqueName = [];
          that.uniqueName = [];
          sap.ui.core.BusyIndicator.show();
          var variantUser = this.getUser()?.toLowerCase();
          var appName =
            this.getOwnerComponent().getManifestEntry("/sap.app/id");
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

          var oFilterAppName3 = new sap.ui.model.Filter("APPLICATION_NAME", sap.ui.model.FilterOperator.EQ, 'DefaultSingle');
          var oFilterUser1 = new sap.ui.model.Filter("USER", sap.ui.model.FilterOperator.EQ, variantUser);

          var oFilterCondition1 = new sap.ui.model.Filter({
            filters: [oFilterAppName1, oFilterUser],
            and: true // Combine with AND
          });

          var oFilterCondition2 = new sap.ui.model.Filter({
            filters: [oFilterAppName2, oFilterScope],
            and: true // Combine with AND
          });
          var oFilterCondition3 = new sap.ui.model.Filter({
            filters: [oFilterAppName3, oFilterUser1],
            and: true // Combine with AND
          });

          var oFinalFilter = new sap.ui.model.Filter({
            filters: [oFilterCondition1, oFilterCondition2, oFilterCondition3],
            and: false // Combine with OR
          });

          this.getView()
            .getModel("oModel")
            .read("/getVariantHeader", {
              headers:{
                        "x-user-id":variantUser,
                        "x-app-name":appName
              },
              // filters: [oFinalFilter],
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
                    SCOPE: "Public",
                  });
                  that.oGModel.setProperty("/viewNames", uniqueName);
                  that.oGModel.setProperty("/defaultDetails", "");
                  // uniqueName = that.normalizeVariantItems(uniqueName);
                  that.viewDetails.setData({
                    items12: uniqueName,
                  });
                  that.varianNames = uniqueName;
                  // that.byId("idMatList123").setModel(that.viewDetails);
                  that.UniqueDefKey = uniqueName[0].VARIANTID;
                  that
                    .byId("idMatList123")
                    .setDefaultKey(uniqueName[0].VARIANTID);
                  that
                    .byId("idMatList123")
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
                        .byId("idMatList123")
                        .setDefaultKey(oData.results[i].VARIANTID);
                      that
                        .byId("idMatList123")
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
                MessageToast.show("error while loading variant details");
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
            .getModel("oModel")
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
                  return item2
                    ? {
                      ...item1,
                      ...item2,
                    }
                    : {
                      ...item1,
                    };
                });
                that.oGModel.setProperty("/variantDetails", aData);
                if (aData.length > 0) {
                  aData = aData.filter(id => id.VARIANTNAME !== "defaultSingle" && id.APPLICATION_NAME !== "DefaultSingle");
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
                        DEFAULT: "N",
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
                    SCOPE: "Public",
                  });
                  that.oGModel.setProperty("/viewNames", uniqueName);
                  // uniqueName = that.normalizeVariantItems(uniqueName);
                  that.viewDetails.setData({
                    items12: uniqueName,
                  });
                  that.varianNames = uniqueName;
                  that.oGModel.setProperty("/defaultDetails", defaultDetails);
                  // that.byId("idMatList123").setModel(that.variantModel);
                  if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                    var newVariant = that.oGModel.getProperty("/newVariant");
                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                    if (newVariant[0].DEFAULT === "Y") {
                      that.UniqueDefKey = newVariant[0].VARIANTID;
                      that
                        .byId("idMatList123")
                        .setDefaultKey(newVariant[0].VARIANTID);
                    }
                    that
                      .byId("idMatList123")
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
                    SCOPE: "Public",
                  });
                  that.oGModel.setProperty("/viewNames", uniqueName);
                  that.oGModel.setProperty("/defaultDetails", "");
                  // uniqueName = that.normalizeVariantItems(uniqueName);
                  that.viewDetails.setData({
                    items12: uniqueName,
                  });
                  that.varianNames = uniqueName;
                  // that.byId("idMatList123").setModel(that.viewDetails);
                  var Default = "Standard";
                  if (that.oGModel.getProperty("/newVaraintFlag") === "X") {
                    var newVariant = that.oGModel.getProperty("/newVariant");
                    that.handleSelectPress(newVariant[0].VARIANTNAME);
                    if (newVariant[0].DEFAULT === "Y") {
                      that.UniqueDefKey = newVariant[0].VARIANTID;
                      that
                        .byId("idMatList123")
                        .setDefaultKey(newVariant[0].VARIANTID);
                    }
                    that
                      .byId("idMatList123")
                      .setSelectedKey(newVariant[0].VARIANTID);
                    that.oGModel.setProperty("/newVaraintFlag", "");
                  } else {
                    that.UniqueDefKey = uniqueName[0].VARIANTID;
                    that
                      .byId("idMatList123")
                      .setDefaultKey(uniqueName[0].VARIANTID);
                    that
                      .byId("idMatList123")
                      .setSelectedKey(uniqueName[0].VARIANTID);
                    that.handleSelectPress(Default);
                  }
                }
              },
              error: function (oData, error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("error while loading variant details");
              },
            });
        },
        /**
         * On selection of VIEW in POPOVER fragment.
         * @param {*} oEvent
         */
        handleSelectPress: function (oEvent) {
          that.refProdArr = []
          var oLoc,
            oDLoc,
            oProd,
            oVers,
            oScen,
            oModVers,
            oUnique,
            aChar,
            oTokens = {},
            finalToken = [],
            finalManuLocToken = [],
            finalDemandLocToken = [],
            finalVerToken = [],
            finalScenToken = [],
            finalUniqueToken = [];
          that.finaloTokens = [];
          var oTableItems = that.oGModel.getProperty("/variantDetails");
          that.oManLocation.removeAllTokens();
          that.oDemLocation.removeAllTokens();
          that.oProduct.removeAllTokens();
          that.oUnqID.removeAllTokens();
          that.oVersion.removeAllTokens();
          that.oScenario.removeAllTokens();
          that.oManLocDialog.clearSelection();
          that.oDemLocDialog.clearSelection();
          that.oProductDialog.clearSelection();
          that.oUnqDialog.clearSelection();
          that.oVersionDialog.clearSelection();
          that.oScenarioDialog.clearSelection();
          that.byId("idModelVer").setSelectedKey("Active");
          if (that.oGModel.getProperty("/fromFunction") === "X") {
            that.oGModel.setProperty("/fromFunction", "");
            if (typeof oEvent == "string") {
              that.selectedApp = oEvent;
            } else {
              that.selectedApp = oEvent.getSource().getTitle().getText();
            }
            that.oGModel.setProperty("/variantName", that.selectedApp);
          } else {
            that.selectedApp = oEvent.getSource().getTitle().getText();
            that.oGModel.setProperty("/variantName", that.selectedApp);
          }
          that.byId("idMatList123").setModified(false)
          var appName =
            this.getOwnerComponent().getManifestEntry("/sap.app/id");
          const verSce = that.oGModel.getProperty("/oVerscena");
          if (that.selectedApp !== "Standard") {
            var filteredData = oTableItems.filter(
              (a) =>
                a.VARIANTNAME === that.selectedApp &&
                a.APPLICATION_NAME === appName
            );
            var manLocData,
              demLocData,
              prodData,
              versData,
              scenData,
              modverData,
              uniqueData,
              aCharData;
            manLocData = filteredData.filter((a) =>
              a.FIELD.includes("Manufacturing Location")
            );
            demLocData = filteredData.filter((a) =>
              a.FIELD.includes("Demand Location")
            );
            prodData = filteredData.filter((a) => a.FIELD.includes("Product"));
            versData = filteredData.filter((a) =>
              a.FIELD === "Version"
            );
            scenData = filteredData.filter((a) =>
              a.FIELD.includes("Scenario")
            );
            modverData = filteredData.filter((a) =>
              a.FIELD.includes("Model Version")
            );
            uniqueData = filteredData.filter((a) => a.FIELD.includes("Unique ID"));
            aCharData = filteredData.filter((a) =>
              a.FIELD.includes("Characteristic")
            );

            if (manLocData.length > 0) {
              that.arrManLoc = [];
              for (var i = 0; i < manLocData.length; i++) {
                oLoc = manLocData[i].VALUE;
                var oManLocTemplate = new sap.m.Token({
                  key: manLocData[i].FIELD_CENTER,
                  text: manLocData[i].VALUE,
                  editable: false,
                });
                that.byId("idManlocInp").addToken(oManLocTemplate);
                that.arrManLoc.push(manLocData[i].VALUE);
                finalManuLocToken.push(oManLocTemplate);
                oManLocTemplate = {};
                oTokens = {
                  FIELD: manLocData[i].FIELD,
                  VALUE: manLocData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }

            if (demLocData.length > 0) {
              that.arrDemLoc = [];
              for (var i = 0; i < demLocData.length; i++) {
                oDLoc = demLocData[i].VALUE;
                var oDemandLocTemplate = new sap.m.Token({
                  key: demLocData[i].FIELD_CENTER,
                  text: demLocData[i].VALUE,
                  editable: false,
                });
                let obj = {};
                obj.DEMAND_LOC = demLocData[i].VALUE;
                obj.PLANNING_LOC = demLocData[i].VALUE;
                that.arrDemLoc.push(obj);
                that.oDemLocation.addToken(oDemandLocTemplate);
                finalDemandLocToken.push(oDemandLocTemplate);
                oDemandLocTemplate = {};
                oTokens = {
                  FIELD: demLocData[i].FIELD,
                  VALUE: demLocData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }

            if (prodData.length > 0) {
              that.arrProd = [];
              for (var i = 0; i < prodData.length; i++) {
                oProd = prodData[i].VALUE;
                var oItemTemplate = new sap.m.Token({
                  key: prodData[i].FIELD_CENTER.split("-")[0],
                  text: prodData[i].VALUE,
                  editable: false
                });
                that.arrProd.push(prodData[i].VALUE.split("-")[0]);
                that.refProdArr.push(prodData[i].VALUE);
                that.oProduct.addToken(oItemTemplate);
                finalToken.push(oItemTemplate);
                oItemTemplate = {};
                oTokens = {
                  FIELD: prodData[i].FIELD,
                  VALUE: prodData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }

            if (uniqueData.length > 0) {
              that.arrUnq = [];
              for (var i = 0; i < uniqueData.length; i++) {
                oUnique = uniqueData[i].VALUE;
                var oUnqiueTemplate = new sap.m.Token({
                  key: uniqueData[i].FIELD_CENTER,
                  text: uniqueData[i].VALUE,
                  editable: false
                });
                that.arrUnq.push(Number(uniqueData[i].VALUE));
                that.oUnqID.addToken(oUnqiueTemplate);
                finalUniqueToken.push(oUnqiueTemplate);
                oUnqiueTemplate = {};
                oTokens = {
                  FIELD: uniqueData[i].FIELD,
                  VALUE: uniqueData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }

            if (versData.length > 0) {
              that.arrVer = [];
              for (var i = 0; i < versData.length; i++) {
                oVers = versData[i].VALUE;
                var VerionDesc = verSce.find(o => o.VERSION_NAME === oVers)?.VERSION_NAME;
                //
                if (VerionDesc === undefined) {
                  VerionDesc = oVers
                }
                if (oVers === "Base Version") {
                  var baseLine = "__BASELINE"
                }
                var oVersTemplate = new sap.m.Token({
                  key: versData[i].FIELD_CENTER,
                  text: VerionDesc,
                  editable: false
                });
                that.arrVer.push(versData[i].FIELD_CENTER);
                that.oVersion.addToken(oVersTemplate);
                finalVerToken.push(oVersTemplate);
                oVersTemplate = {};
                oTokens = {
                  FIELD: versData[i].FIELD,
                  VALUE: versData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }
            else {
              that.byId("idVerInp").addToken(that.verToken);
            }
            if (scenData.length > 0) {
              that.arrScen = [];
              for (var i = 0; i < scenData.length; i++) {
                oScen = scenData[i].VALUE;
                const scenDesc = verSce.find(o => o.SCENARIO_NAME === oScen)?.SCENARIO_NAME;
                var oScenTemplate = new sap.m.Token({
                  key: scenData[i].FIELD_CENTER,
                  text: scenDesc,
                  editable: false
                });
                that.arrScen.push(scenData[i].FIELD_CENTER);
                that.oScenario.addToken(oScenTemplate);
                finalScenToken.push(oScenTemplate);
                oScenTemplate = {};
                oTokens = {
                  FIELD: scenData[i].FIELD,
                  VALUE: scenData[i].VALUE,
                };
                that.finaloTokens.push(oTokens);
                oTokens = {};
              }
            }
            else {
              that.byId("idScenInp").addToken(that.scenToken);
            }
            if (modverData.length > 0) {
              that.byId("idModelVer").setSelectedKey(modverData[0].VALUE);
              oTokens = {
                FIELD: modverData[0].FIELD,
                VALUE: modverData[0].VALUE,
              };
              that.finaloTokens.push(oTokens);
              oTokens = {};
            }
            // if (aCharData.length > 0) {
            //   that.charac = [];
            //   for (var i = 0; i < aCharData.length; i++) {
            //     aChar = aCharData[i].VALUE;
            //     var oCharTemplate = new sap.m.Token({
            //       key: aCharData[i].FIELD_CENTER,
            //       text: aCharData[i].VALUE,
            //     });
            //     that.charac.push(aCharData[i].VALUE);
            //     that.oScenario.addToken(oCharTemplate);
            //     finalScenToken.push(oCharTemplate);
            //     oCharTemplate = {};
            //     oTokens = {
            //       FIELD: aCharData[i].FIELD,
            //       VALUE: aCharData[i].VALUE,
            //     };
            //     that.finaloTokens.push(oTokens);
            //     oTokens = {};
            //   }
            // }
            sap.ui.core.BusyIndicator.hide();
          } else {
            // let headerDetails = that.oGModel.getProperty("/headerDetails").filter(id => id.APPLICATION_NAME == "DefaultSingle" && id.VARIANTNAME == "defaultSingle");
            // if (headerDetails.length) {
            //   var filteredData = that.oGModel.getProperty("/fieldDetails").filter(id => id.VARIANTID == headerDetails[0].VARIANTID);

            //   var manLocData,
            //     demLocData,
            //     prodData,
            //     versData,
            //     scenData,
            //     modverData,
            //     uniqueData,
            //     aCharData;
            //   manLocData = filteredData.filter((a) =>
            //     a.FIELD === "Manufacturing Location"
            //   );
            //   demLocData = filteredData.filter((a) =>
            //     a.FIELD === "Demand Location"
            //   );
            //   prodData = filteredData.filter((a) => a.FIELD === "Products");
            //   versData = filteredData.filter((a) =>
            //     a.FIELD === "Version"
            //   );
            //   scenData = filteredData.filter((a) =>
            //     a.FIELD === "Scenario"
            //   );
            //   modverData = filteredData.filter((a) =>
            //     a.FIELD === "Model Version"
            //   );
            //   uniqueData = filteredData.filter((a) => a.FIELD === "Unique ID");
            //   aCharData = filteredData.filter((a) =>
            //     a.FIELD === "Characteristic"
            //   );

            //   if (manLocData.length > 0) {
            //     that.arrManLoc = [];
            //     for (var i = 0; i < manLocData.length; i++) {
            //       oLoc = manLocData[i].VALUE;
            //       var oManLocTemplate = new sap.m.Token({
            //         key: manLocData[i].FIELD_CENTER,
            //         text: manLocData[i].VALUE,
            //         editable: false,
            //       });
            //       that.byId("idManlocInp").addToken(oManLocTemplate);
            //       that.arrManLoc.push(manLocData[i].VALUE);
            //       finalManuLocToken.push(oManLocTemplate);
            //       oManLocTemplate = {};
            //       oTokens = {
            //         FIELD: manLocData[i].FIELD,
            //         VALUE: manLocData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }

            //   if (demLocData.length > 0) {
            //     that.arrDemLoc = [];
            //     for (var i = 0; i < demLocData.length; i++) {
            //       oDLoc = demLocData[i].VALUE;
            //       var oDemandLocTemplate = new sap.m.Token({
            //         key: demLocData[i].FIELD_CENTER,
            //         text: demLocData[i].VALUE,
            //         editable: false,
            //       });
            //       let obj = {};
            //       obj.DEMAND_LOC = demLocData[i].VALUE;
            //       obj.PLANNING_LOC = demLocData[i].VALUE;
            //       that.arrDemLoc.push(obj);
            //       that.oDemLocation.addToken(oDemandLocTemplate);
            //       finalDemandLocToken.push(oDemandLocTemplate);
            //       oDemandLocTemplate = {};
            //       oTokens = {
            //         FIELD: demLocData[i].FIELD,
            //         VALUE: demLocData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }

            //   if (prodData.length > 0) {
            //     that.arrProd = [];
            //     for (var i = 0; i < prodData.length; i++) {
            //       oProd = prodData[i].VALUE;
            //       var oItemTemplate = new sap.m.Token({
            //         key: prodData[i].FIELD_CENTER.split("-")[0],
            //         text: prodData[i].VALUE,
            //         editable: false
            //       });
            //       that.arrProd.push(prodData[i].VALUE);
            //       that.oProduct.addToken(oItemTemplate);
            //       finalToken.push(oItemTemplate);
            //       oItemTemplate = {};
            //       oTokens = {
            //         FIELD: prodData[i].FIELD,
            //         VALUE: prodData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }

            //   if (uniqueData.length > 0) {
            //     that.arrUnq = [];
            //     for (var i = 0; i < uniqueData.length; i++) {
            //       oUnique = uniqueData[i].VALUE;
            //       var oUnqiueTemplate = new sap.m.Token({
            //         key: uniqueData[i].FIELD_CENTER,
            //         text: uniqueData[i].VALUE,
            //         editable: false
            //       });
            //       that.arrUnq.push(Number(uniqueData[i].VALUE));
            //       that.oUnqID.addToken(oUnqiueTemplate);
            //       finalUniqueToken.push(oUnqiueTemplate);
            //       oUnqiueTemplate = {};
            //       oTokens = {
            //         FIELD: uniqueData[i].FIELD,
            //         VALUE: uniqueData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }

            //   if (versData.length > 0) {
            //     that.arrVer = [];
            //     for (var i = 0; i < versData.length; i++) {
            //       oVers = versData[i].VALUE;
            //       var VerionDesc = verSce.find(o => o.VERSION === oVers)?.VERSION_NAME;
            //       if (VerionDesc === undefined) {
            //         VerionDesc = oVers
            //       }
            //       var oVersTemplate = new sap.m.Token({
            //         key: versData[i].FIELD_CENTER,
            //         text: VerionDesc,
            //         editable: false
            //       });

            //       //

            //       if (oVers === "Base Version") {
            //         var baseLine = "__BASELINE"
            //       }
            //       that.arrVer.push(baseLine);
            //       that.oVersion.addToken(oVersTemplate);
            //       finalVerToken.push(oVersTemplate);
            //       oVersTemplate = {};
            //       oTokens = {
            //         FIELD: versData[i].FIELD,
            //         VALUE: versData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }
            //   else {
            //     that.byId("idVerInp").addToken(that.verToken);
            //   }
            //   if (scenData.length > 0) {
            //     that.arrScen = [];
            //     for (var i = 0; i < scenData.length; i++) {
            //       oScen = scenData[i].VALUE;
            //       var oScenTemplate = new sap.m.Token({
            //         key: scenData[i].FIELD_CENTER,
            //         text: scenData[i].VALUE,
            //         editable: false
            //       });
            //       that.arrScen.push(scenData[i].VALUE);
            //       that.oScenario.addToken(oScenTemplate);
            //       finalScenToken.push(oScenTemplate);
            //       oScenTemplate = {};
            //       oTokens = {
            //         FIELD: scenData[i].FIELD,
            //         VALUE: scenData[i].VALUE,
            //       };
            //       that.finaloTokens.push(oTokens);
            //       oTokens = {};
            //     }
            //   }
            //   else {
            //     that.byId("idScenInp").addToken(that.scenToken);
            //   }
            //   if (modverData.length > 0) {
            //     that.byId("idModelVer").setSelectedKey(modverData[0].VALUE);
            //     oTokens = {
            //       FIELD: modverData[0].FIELD,
            //       VALUE: modverData[0].VALUE,
            //     };
            //     that.finaloTokens.push(oTokens);
            //     oTokens = {};
            //   }
            //   // if (aCharData.length > 0) {
            //   //   that.charac = [];
            //   //   for (var i = 0; i < aCharData.length; i++) {
            //   //     aChar = aCharData[i].VALUE;
            //   //     var oCharTemplate = new sap.m.Token({
            //   //       key: aCharData[i].FIELD_CENTER,
            //   //       text: aCharData[i].VALUE,
            //   //     });
            //   //     that.charac.push(aCharData[i].VALUE);
            //   //     that.oScenario.addToken(oCharTemplate);
            //   //     finalScenToken.push(oCharTemplate);
            //   //     oCharTemplate = {};
            //   //     oTokens = {
            //   //       FIELD: aCharData[i].FIELD,
            //   //       VALUE: aCharData[i].VALUE,
            //   //     };
            //   //     that.finaloTokens.push(oTokens);
            //   //     oTokens = {};
            //   //   }
            //   // }
            // }
            // else {
            //do nothing
            that.onClear();
            that.arrVer = [];
            that.arrScen = [];
            that.arrVer.push("__BASELINE");
            that.arrScen.push("_PLAN");
            that.byId("idVerInp").addToken(that.verToken);
            that.byId("idScenInp").addToken(that.scenToken);
            // }
            sap.ui.core.BusyIndicator.hide();
          }

        },
        /**
         * Saving the VIEW on press of save in NameVariant fragment
         * @param {*} oEvent
         */
        onCreate: function (oEvent) {
          sap.ui.core.BusyIndicator.show();
          var array = [];
          var details = {};
          var sManLocation = that.byId("idManlocInp").getTokens();
          var Field1 = that.byId("idManLabel").getLabel();
          var sDemLocation = that.byId("idDemLocInp").getTokens();
          var Field2 = that.byId("idDemLabel").getLabel();
          var sProduct = that.byId("idProdInp").getTokens();
          var Field3 = that.byId("idProdLabel").getLabel();
          var sVersion = that.byId("idVerInp").getTokens();
          var Field4 = that.byId("idVerLabel").getLabel();
          var sScen = that.byId("idScenInp").getTokens();
          var Field5 = that.byId("idScenLabel").getLabel();
          var sModVers = that.byId("idModelVer").getSelectedKey();
          var Field6 = that.byId("idModLabel").getLabel();
          var sUniqueId = that.byId("idUnqInp").getTokens();
          var Field7 = that.byId("idUniqueLabel").getLabel();
          // var sChars = that.byId("idUniqueCharDetails").getSelectedKeys();
          // var Field8 = that.byId("idCharLabel").getLabel();
          var varName = oEvent.getParameters().name;
          var sDefault = oEvent.getParameters().def;
          var appName =
            this.getOwnerComponent().getManifestEntry("/sap.app/id");
          if (
            sManLocation.length === 0 &&
            sDemLocation.length === 0 &&
            sProduct.length === 0
          ) {
            sap.ui.core.BusyIndicator.hide();
            return MessageToast.show(
              "No values selected in required filters"
            );
          }

          if (varName) {
            if (
              sDefault &&
              that.oGModel.getProperty("/defaultDetails").length > 0
            ) {
              var defaultChecked = "Y";
              this.getOwnerComponent()
                .getModel("oModel")
                .callFunction("/updateVariant", {
                  method: "GET",
                  urlParameters: {
                    VARDATA: JSON.stringify(
                      that.oGModel.getProperty("/defaultDetails")
                    ),
                  },
                  success: function (oData) { },
                  error: function (error) {
                    MessageToast.show("Failed to create variant");
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
            if (oEvent.getParameters()?.public) {
              var Scope = "Public";
            } else {
              var Scope = "Private";
            }
            for (var i = 0; i < sManLocation.length; i++) {
              details = {
                Field: Field1,
                FieldCenter: sManLocation[i].getKey(),
                Value: sManLocation[i].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            for (var k = 0; k < sDemLocation.length; k++) {
              details = {
                Field: Field2,
                FieldCenter: sDemLocation[k].getKey(),
                Value: sDemLocation[k].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            for (var k = 0; k < sProduct.length; k++) {
              details = {
                Field: Field3,
                FieldCenter: sProduct[k].getKey(),
                Value: sProduct[k].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            for (var k = 0; k < sUniqueId.length; k++) {
              details = {
                Field: Field7,
                FieldCenter: sUniqueId[k].getKey(),
                Value: sUniqueId[k].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            for (var k = 0; k < sVersion.length; k++) {
              details = {
                Field: Field4,
                FieldCenter: sVersion[k].getKey(),
                Value: sVersion[k].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            for (var k = 0; k < sScen.length; k++) {
              details = {
                Field: Field5,
                FieldCenter: sScen[k].getKey(),
                Value: sScen[k].getText(),
                Default: defaultChecked,
              };
              array.push(details);
            }

            // for (var k = 0; k < sChars.length; k++) {
            //   details = {
            //     Field: Field5,
            //     FieldCenter: sChars[k].getKey(),
            //     Value: sChars[k].getKey(),
            //     Default: defaultChecked,
            //   };
            //   array.push(details);
            // }

            details = {
              Field: Field6,
              FieldCenter: (1).toString(),
              Value: sModVers,
              Default: defaultChecked,
            };
            array.push(details);
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
              .getModel("oModel")
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
                  that.byId("idMatList123").setModified(false);
                  that.onAfterRendering();
                },
                error: function (error) {
                  sap.ui.core.BusyIndicator.hide();
                  MessageToast.show("Failed to create variant");
                },
              });
          } else {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show("Please fill View Name");
          }
        },
        /**On press of save in manage fragment */
        onManage: async function (oEvent) {
          sap.ui.core.BusyIndicator.show();
          var oDelted = {},
            deletedArray = [],
            count = 0;
          var totalVariantData = that.oGModel.getProperty("/VariantData");
          var selected = oEvent.getParameters();
          var variantUser = this.getUser()?.toLowerCase();
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
            // that.byId("idMatList123").setModel(that.viewDetails);
            that.byId("idMatList123").setDefaultKey(that.UniqueDefKey);
            return MessageToast.show(
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
              await that.deleteVariant(deletedArray);
            }
          }
          //Updating the default variants
          if (selected.def) {
            //If selected default is not standard
            if (JSON.parse(selected.def) != 0) {
              //Update the existing default to a new default
              var defaultVariant = totalVariantData.filter(
                (item) => item.DEFAULT === "Y"
              );
              if (defaultVariant.length > 0) {
                defaultVariant[0].DEFAULT = "N";
                that
                  .getView()
                  .getModel("oModel")
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
                        .getModel("oModel")
                        .callFunction("/updateVariant", {
                          method: "GET",
                          urlParameters: {
                            VARDATA: JSON.stringify(newDefault),
                          },
                          success: function (oData) {
                            that.onAfterRendering();
                          },
                          error: function (error) {
                            MessageToast.show("Failed to update variant");
                          },
                        });
                    },
                    error: function (error) {
                      sap.ui.core.BusyIndicator.hide();
                      MessageToast.show("Failed to update variant");
                    },
                  });
              } else {
                var selectedVariant = totalVariantData.filter(
                  (item) => item.VARIANTID == JSON.parse(selected.def)
                );
                selectedVariant[0].DEFAULT = "Y";
                that
                  .getView()
                  .getModel("oModel")
                  .callFunction("/updateVariant", {
                    method: "GET",
                    urlParameters: {
                      VARDATA: JSON.stringify(selectedVariant),
                    },
                    success: function (oData) {
                      that.onAfterRendering();
                    },
                    error: function (error) {
                      sap.ui.core.BusyIndicator.hide();
                      MessageToast.show("Failed to update variant");
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
                .getModel("oModel")
                .callFunction("/updateVariant", {
                  method: "GET",
                  urlParameters: {
                    VARDATA: JSON.stringify(defaultItem),
                  },
                  success: function (oData) {
                    that.onAfterRendering();
                  },
                  error: function (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Failed to update variant");
                  },
                });
            }
          }
          else if (selected.deleted) {
            that.onAfterRendering();
          }
          sap.ui.core.BusyIndicator.hide();
        },
        deleteVariant: function (deletedArray) {
          that
            .getView()
            .getModel("oModel")
            .callFunction("/createVariant", {
              method: "GET",
              urlParameters: {
                Flag: "D",
                USER: that.oGModel.getProperty("/UserId"),
                VARDATA: JSON.stringify(deletedArray),
              },
              success: function () {
                that.deletedArray = [];
              },
              error: function () {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("Failed to delete variant");
              },
            });
        },
        removeDuplicate: function (array, key) {
          //Function to remove duplicates in an array
          var check = new Set();
          return array.filter(
            (obj) => !check.has(obj[key]) && check.add(obj[key])
          );
        },
        getVerScen: function () {
          var oTokens, oVers, oScen, finalVerToken = [], finalScenToken = [], oVersTemplate, oScenTemplate;
          var aValues = [20, 21];
          var aFilters = aValues.map(function (val) {
            return new sap.ui.model.Filter("PARAMETER_ID", sap.ui.model.FilterOperator.EQ, val);
          });
          that.oModel.read("/V_Parameters", {
            filters: aFilters,
            success: function (oData) {
              that.aVParams = that.removeDuplicates(oData.results, "PARAMETER_ID")
              that.oModel.read("/getIbpVerScn", {
                success: function (oData) {
                  var data = oData.results;
                  var versData = that.removeDuplicates(data, "VERSION");
                  var scenData = that.removeDuplicates(oData.results, "SCENARIO")
                  versData = versData.filter((e) => {
                    if (that.aVParams[0].DESCRIPTION.includes("IBP Default Version")) {
                      return e.VERSION == that.aVParams[0].VALUE
                    }
                  })
                  scenData = scenData.filter((e) => {
                    if (that.aVParams[1].DESCRIPTION.includes("IBP Default Scenario")) {
                      return e.SCENARIO == that.aVParams[1].VALUE
                    }
                  })

                  if (versData.length > 0) {
                    that.arrVer = [];
                    for (var i = 0; i < versData.length; i++) {
                      var oVers = versData[i].VERSION;
                      that.arrVer.push(oVers.toString());
                      var oVersTemplate = new sap.m.Token({
                        key: versData[i].VERSION,
                        text: versData[i].VERSION,
                        editable: false
                      });
                      that.oVersion.addToken(oVersTemplate);
                      finalVerToken.push(oVersTemplate);
                      oVersTemplate = {};
                      oTokens = {
                        FIELD: versData[i].VERSION_NAME,
                        VALUE: versData[i].VERSION,
                      };
                      that.finaloTokens.push(oTokens);
                      oTokens = {};
                    }
                  }
                  if (scenData.length > 0) {
                    that.arrScen = [];
                    for (var i = 0; i < scenData.length; i++) {
                      oScen = scenData[i].SCENARIO;
                      var oScenTemplate = new sap.m.Token({
                        key: scenData[i].SCENARIO,
                        text: scenData[i].SCENARIO,
                        editable: false
                      });
                      that.arrScen.push(scenData[i].SCENARIO_NAME);
                      that.oScenario.addToken(oScenTemplate);
                      finalScenToken.push(oScenTemplate);
                      oScenTemplate = {};
                      oTokens = {
                        FIELD: scenData[i].SCENARIO_NAME,
                        VALUE: scenData[i].SCENARIO,
                      };
                      that.finaloTokens.push(oTokens);
                      oTokens = {};
                    }
                  }
                },
                error: function () {
                  that.oVersionDialog.setBusy(false);
                  MessageToast.show("Error Loading Version Data");
                },
              })

            }, error: function () {
              that.oVersionDialog.setBusy(false);
              MessageToast.show("Error Loading Paramters Data");
            },
          })

        },
        saveDefaultVariant: function () {
          sap.ui.core.BusyIndicator.show();
          var array = [];
          var details = {};
          var sManLocation = that.byId("idManlocInp").getTokens();
          var Field1 = that.byId("idManLabel").getLabel();
          var sDemLocation = that.byId("idDemLocInp").getTokens();
          var Field2 = that.byId("idDemLabel").getLabel();
          var sProduct = that.byId("idProdInp").getTokens();
          var Field3 = that.byId("idProdLabel").getLabel();
          var sVersion = that.byId("idVerInp").getTokens();
          var Field4 = that.byId("idVerLabel").getLabel();
          var sScen = that.byId("idScenInp").getTokens();
          var Field5 = that.byId("idScenLabel").getLabel();
          var sModVers = that.byId("idModelVer").getSelectedKey();
          var Field6 = that.byId("idModLabel").getLabel();
          var sUniqueId = that.byId("idUnqInp").getTokens();
          var Field7 = that.byId("idUniqueLabel").getLabel();
          if (
            sManLocation.length === 0 &&
            sDemLocation.length === 0 &&
            sProduct.length === 0 &&
            sVersion.length === 0 &&
            sScen.length === 0 &&
            sUniqueId.length === 0
          ) {
            sap.ui.core.BusyIndicator.hide();
            return;
          }


          for (var i = 0; i < sManLocation.length; i++) {
            details = {
              Field: Field1,
              FieldCenter: sManLocation[i].getKey(),
              Value: sManLocation[i].getText()
            };
            array.push(details);
          }

          for (var k = 0; k < sDemLocation.length; k++) {
            details = {
              Field: Field2,
              FieldCenter: sDemLocation[k].getKey(),
              Value: sDemLocation[k].getText()
            };
            array.push(details);
          }

          for (var k = 0; k < sProduct.length; k++) {
            details = {
              Field: Field3,
              FieldCenter: sProduct[k].getKey(),
              Value: sProduct[k].getText()
            };
            array.push(details);
          }

          for (var k = 0; k < sUniqueId.length; k++) {
            details = {
              Field: Field7,
              FieldCenter: sUniqueId[k].getKey(),
              Value: sUniqueId[k].getText()
            };
            array.push(details);
          }

          for (var k = 0; k < sVersion.length; k++) {
            details = {
              Field: Field4,
              FieldCenter: sVersion[k].getKey(),
              Value: sVersion[k].getText()
            };
            array.push(details);
          }

          for (var k = 0; k < sScen.length; k++) {
            details = {
              Field: Field5,
              FieldCenter: sScen[k].getKey(),
              Value: sScen[k].getText()
            };
            array.push(details);
          }

          // for (var k = 0; k < sChars.length; k++) {
          //   details = {
          //     Field: Field5,
          //     FieldCenter: sChars[k].getKey(),
          //     Value: sChars[k].getKey()
          //   };
          //   array.push(details);
          // }

          details = {
            Field: Field6,
            FieldCenter: (1).toString(),
            Value: sModVers
          };
          array.push(details);

          var flag = "N";
          for (var j = 0; j < array.length; j++) {
            array[j].IDNAME = "defaultSingle";
            array[j].App_Name = "DefaultSingle";
            array[j].SCOPE = "Global";
          }

          //    console.log(JSON.stringify(array));
          this.getOwnerComponent()
            .getModel("oModel")
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
                MessageToast.show("Failed to create global variant");
              },
            });
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
            oStorage.put("nodeId", 86);
            //Generate a  URL for the second application
            var url = window.location.href.split('#')[0] + hash;
            //Navigate to second app
            sap.m.URLHelper.redirect(url, true);
          }
        },
      }
    );
  }
);
