'use strict';
document.addEventListener('DOMContentLoaded', function () {
  angular.bootstrap(document.documentElement, ['monacaIDE']);
});

angular.module('monacaIDE', [
  'ui.bootstrap',
  'ui.gravatar',
  'gettext',
  'ngSanitize',
  'PubSub',
  'ngAnimate',
  'ngToast',
  'ngRoute',
  'ngMessages',
  'checklist-model',
  'colorpicker',
  'smart-table',
  'ngCsv',
  'oc.lazyLoad',
  'infinite-scroll'
])
  .config([
    '$uibModalProvider',
    'ngToastProvider',
    '$locationProvider',
    '$routeProvider',
    function ($uibModalProvider, ngToast, $locationProvider, $routeProvider) {
      window.config = window.config || {};
      const matches = location.pathname.match(/(\/ide)?\/(editor|build)\/([0-9a-z]*)/);
      if (matches) {
        window.config.projectId = matches[3];
      }
      window.config.isEditor = location.pathname.indexOf('/editor/') > -1;

      $locationProvider.html5Mode(true);

      $routeProvider.when('/login', {
        templateUrl: 'login.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load('app.login.js?t=' + Date.now());
            }
          ]
        }
      }).when('/editor/:projectId', {
        templateUrl: 'index.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load({
                serie: true,
                files: [
                  'lib/lib.ide.js',
                  'lib/vs/loader.js?t=' + Date.now(),
                  'app.ide.js?t=' + Date.now()
                ]
              });
            }
          ]
        }
      }).when('/build/:projectId/:screenId', {
        templateUrl: 'build.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load('app.build.js?t=' + Date.now());
            }
          ]
        }
      }).when('/build/:projectId/:screenId/:queueId', {
        templateUrl: 'build.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load('app.build.js?t=' + Date.now());
            }
          ]
        }
      }).when('/dashboard', {
        templateUrl: 'dashboard.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load('app.dashboard.js?t=' + Date.now());
            }
          ]
        }
      }).when('/accountManager/:userId', {
        templateUrl: 'educationAdmin/accountManager.html',
        resolve: {
          lazy: [
            '$ocLazyLoad',
            function ($ocLazyLoad) {
              return $ocLazyLoad.load({
                serie: true,
                files: [
                  'css/monaca_account_manager.css',
                  'app.accountManager.js?t=' + Date.now()
                ]
              });
            }
          ]
        }
      });
      ngToast.configure({
        animation: 'slide',
        combineDuplications: true,
        dismissButton: true,
        timeout: 10000,
        dismissOnClick: false,
        tapToDismiss: false,
        additionalClasses: 'selectable-text',
      });

      let language = (new CookieFactory()).get('MONACA_LANG') || 'en'; // eslint-disable-line
      document.documentElement.setAttribute('lang', language);

      // check if session is expired
      if (!window.config.client && window.envConfigFetchUrl) {
        fetch(window.envConfigFetchUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'default',
          credentials: 'include'
        })
          .then(response => {
            // DO NTH
          })
          .catch(e => {
            // DO NTH as it will be handled by `window.fetch` function in index.html
          });
      }

      // Configure Monaca API
      MonacaApi.Config
        .setApiToken(window.config.apiToken)
        .setLanguage(language || 'en')
        .setServiceEndpoint({
          ide: window.config.client.host.ide_host,
          console: window.config.client.host.console_host,
          io: (language === 'en' ? window.config.client.host.io_host.en : window.config.client.host.io_host.ja),
          web: window.config.client.host.web_host_ssl + '/' + language
        });
    }
  ])
  .run([
    '$rootScope',
    '$q',
    'gettextCatalog',
    'ProjectFactory',
    'UserFactory',
    'PubSub',
    'Constant',
    'CommonFunctionService',
    'EnvironmentFactory',
    'Docs',
    function ($rootScope, $q, gettextCatalog, ProjectFactory, UserFactory, PubSub, Constant, CommonFunctionService, EnvironmentFactory, Docs) {

      gettextCatalog.setCurrentLanguage(window.MonacaApi.Config.getLanguage());
      $rootScope.docsUrl = Docs.url;

      if (window.config.apiToken && window.config.apiToken !== 'undefined') {
        $q.all([UserFactory.loading, EnvironmentFactory.loading]).then(function (response) {
          PubSub.publish(Constant.EVENT.USER_INFO_LOADED, true);
          var plan = UserFactory.getInfo().planName;
          $rootScope.isRPGUser = plan ? plan.toLowerCase() === 'rpgtkool' : false;
        });
      }

      window.onbeforeunload = function (event) {
        // There is probably a better way to detect unsaved editor files, but this is
        // the easiest!
        if ($('.lm_tab.unsaved').length) {
          var message = gettextCatalog.getString('<strong>Do you want to leave this site?</strong>\nChanges you made may not be saved.');
          if (typeof event === 'undefined') {
            event = window.event;
          }
          if (event) {
            event.returnValue = message;
          }
          return message;
        }
      };

      window.config = window.config || {};
      window.config.os = bowser.mac ? 'mac' : (bowser.windows ? 'win' : 'linux'); // Cover three primary OS.

      if (window.config.projectId) {
        ProjectFactory.loading.then(function () {
          $rootScope.projectName = ProjectFactory.getProjectName();

          // Update Service Endpoints
          MonacaApi.Config.setServiceEndpoint(
            Object.assign({},
              ProjectFactory.getServiceEndpoint(),
              MonacaApi.Config.getServiceEndpoint()
            )
          );
        });
      }
    }
  ]);

;angular.module("monacaIDE").run(["$templateCache", function($templateCache) {
  $templateCache.put("AboutMonacaCloudDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>About Monaca Cloud</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <img src=\"img/logo_monaca2.png\" />\n" +
    "  <p>&copy; 2011-2018 Asial Corporation. All rights reserved.</p>\n" +
    "</section>");
  $templateCache.put("BatchBuildDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>{{title}}</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Batch Build Name</label>\n" +
    "    <input type=\"text\" id=\"name\" name=\"name\" class=\"form-control\" ng-model=\"name\">\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Description</label>\n" +
    "    <textarea id=\"description\" name=\"description\" class=\"form-control\" ng-model=\"description\"></textarea>\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <span class=\"available-build-task-header\" translate>Available Build Tasks</span>\n" +
    "    <span class=\"build-task-header\" translate>Build Tasks</span>\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <div>\n" +
    "      <select multiple ng-model=\"selectedAvailableBuildTasks\" class=\"form-control available-build-tasks\">\n" +
    "        <option ng-repeat=\"item in availableBuildTasks\" value=\"{{item}}\">\n" +
    "          {{item.name}}\n" +
    "        </option>\n" +
    "      </select>\n" +
    "    </div>\n" +
    "    <div class=\"actions\">\n" +
    "      <i class=\"m-icon m-icon-arrow-up\" ng-class=\"{'icon-inactive': !isAbleToMoveUp()}\" ng-click=\"moveUp()\"></i>\n" +
    "      <i class=\"m-icon m-icon-arrow-down\" ng-class=\"{'icon-inactive': !isAbleToMoveDown()}\" ng-click=\"moveDown()\"></i>\n" +
    "      <i class=\"m-icon m-icon-arrow-right\" ng-class=\"{'icon-inactive': !isAbleToMoveToBuildTasks()}\" ng-click=\"moveFromAvailableTasksToBuildTasks()\"></i>\n" +
    "      <i class=\"m-icon m-icon-arrow-left\" ng-class=\"{'icon-inactive': !isAbleToMoveToAvailaleTasks()}\" ng-click=\"moveFromBuildTasksToAvailableTasks()\"></i>\n" +
    "    </div>\n" +
    "    <div>\n" +
    "      <select multiple ng-model=\"selectedBuildTasks\" class=\"form-control build-tasks\">\n" +
    "        <option ng-repeat=\"item in buildTasks\" value=\"{{item}}\">\n" +
    "          {{item.name}}\n" +
    "        </option>\n" +
    "      </select>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <hr>\n" +
    "  <div class=\"flex-container-row buttons-row\">\n" +
    "    <span style=\"width: 100%\"></span>\n" +
    "    <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "    <button ng-if=\"isDeleteAble()\" type=\"button\" class=\"btn btn-danger\" ng-click=\"delete()\" translate>Delete</button>\n" +
    "    <button ng-disabled=\"!isSaveAble()\" type=\"button\" class=\"btn btn-primary\" ng-click=\"save()\" translate>Save</button>\n" +
    "  </div>\n" +
    "</section>");
  $templateCache.put("build.html",
    "<div ng-controller=\"SettingController as settings\">\n" +
    "    <toast></toast>\n" +
    "    <div class=\"header\" ng-show=\"!settings.hideHeaderbar\">\n" +
    "        <img alt=\"monaca\" src=\"img/header_logo.svg\" />\n" +
    "        <div class=\"project-name\">{{projectName}}</div>\n" +
    "    </div>\n" +
    "    <div class=\"app-loading\" ng-show=\"page === 'loading'\">\n" +
    "        <spinner s-loading-text=\"Loading Project Settings...\"></spinner>\n" +
    "    </div>\n" +
    "    <div id=\"settings\">\n" +
    "        <nav ng-show=\"page !== 'loading' && !settings.hideSidebar\" ng-class=\"{'hide-headerbar': settings.hideHeaderbar}\">\n" +
    "            <div class=\"scroll\">\n" +
    "                <h2 ng-hide=\"isGenericProject\" translate>Build &amp; Build Settings</h2>\n" +
    "                <ul ng-hide=\"isGenericProject\">\n" +
    "                    <li ng-show=\"canBuild('android')\" ng-class=\"{'selected': page === settings.Constant.PAGE_ANDROID_BUILD || page === settings.Constant.PAGE_ANDROID_BUILD_SETTINGS}\"\n" +
    "                        ng-click=\"setPage(settings.Constant.PAGE_ANDROID_BUILD)\" translate>Android</li>\n" +
    "                    <li ng-show=\"canBuild('ios')\" ng-class=\"{'selected': page === settings.Constant.PAGE_IOS_BUILD || page === settings.Constant.PAGE_IOS_BUILD_SETTINGS}\"\n" +
    "                        ng-click=\"setPage(settings.Constant.PAGE_IOS_BUILD)\" translate>iOS</li>\n" +
    "                    <li ng-hide=\"isRPGUser || isReactNative || !canBuild('windows')\" ng-class=\"{'selected': page === settings.Constant.PAGE_WINDOWS_BUILD}\" ng-click=\"setPage(settings.Constant.PAGE_WINDOWS_BUILD)\"\n" +
    "                        translate>Windows</li>\n" +
    "                    <li ng-show=\"canBuild('electron')\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_WINDOWS_BUILD}\" ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_WINDOWS_BUILD)\"\n" +
    "                        translate>Windows</li>\n" +
    "                    <li ng-show=\"canBuild('electron') && showElectronMacOsBuild\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_MACOS_BUILD || page === settings.Constant.PAGE_IOS_BUILD_SETTINGS}\"\n" +
    "                        ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_MACOS_BUILD)\" translate>macOS</li>\n" +
    "                    <li ng-show=\"canBuild('electron') && showElectronLinuxBuild\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_LINUX_BUILD }\"\n" +
    "                        ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_LINUX_BUILD)\" translate>Linux</li>\n" +
    "                    <li ng-show=\"hasPwaBuildSupport && !isReactNative\" ng-class=\"{'selected': page === settings.Constant.PAGE_WEB_BUILD}\" ng-click=\"setPage(settings.Constant.PAGE_WEB_BUILD)\"\n" +
    "                        translate>Web</li>\n" +
    "                </ul>\n" +
    "\n" +
    "                <h2 ng-hide=\"isReactNative || isGenericProject\" translate>App Settings</h2>\n" +
    "                <ul ng-hide=\"isReactNative || isGenericProject\">\n" +
    "                    <li ng-show=\"canBuild('android')\" ng-class=\"{'selected': page === settings.Constant.PAGE_ANDROID_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_ANDROID_APP_SETTINGS)\"\n" +
    "                        translate>Android</li>\n" +
    "                    <li ng-show=\"canBuild('ios')\" ng-class=\"{'selected': page === settings.Constant.PAGE_IOS_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_IOS_APP_SETTINGS)\"\n" +
    "                        translate>iOS</li>\n" +
    "                    <li ng-hide=\"isRPGUser || !canBuild('windows')\" ng-class=\"{'selected': page === settings.Constant.PAGE_WINDOWS_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_WINDOWS_APP_SETTINGS)\"\n" +
    "                        translate>Windows</li>\n" +
    "                    <li ng-show=\"canBuild('electron')\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_WINDOWS_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_WINDOWS_APP_SETTINGS)\"\n" +
    "                        translate>Windows</li>\n" +
    "                    <li ng-show=\"canBuild('electron') && showElectronMacOsBuild\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_MACOS_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_MACOS_APP_SETTINGS)\"\n" +
    "                        translate>macOS</li>\n" +
    "                    <li ng-show=\"canBuild('electron') && showElectronLinuxBuild\" ng-class=\"{'selected': page === settings.Constant.PAGE_ELECTRON_LINUX_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_ELECTRON_LINUX_APP_SETTINGS)\"\n" +
    "                        translate>Linux</li>\n" +
    "                    <li ng-show=\"hasPwaBuildSupport\" ng-class=\"{'selected': page === settings.Constant.PAGE_WEB_APP_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_WEB_APP_SETTINGS)\"\n" +
    "                        translate>Web</li>\n" +
    "                </ul>\n" +
    "\n" +
    "                <h2 translate ng-hide=\"isRPGUser || isReactNative || isGenericProject\">Project</h2>\n" +
    "                <ul ng-hide=\"isReactNative\">\n" +
    "                    <li ng-show=\"isCordovaPluginEnabled\" ng-class=\"{'selected': page === settings.Constant.PAGE_CORDOVA_PLUGINS}\" ng-click=\"setPage(settings.Constant.PAGE_CORDOVA_PLUGINS)\"\n" +
    "                        translate>Cordova Plugins</li>\n" +
    "                    <li ng-show=\"hasWebComponentSupport\" ng-class=\"{'selected': page === settings.Constant.PAGE_WEB_COMPONENTS}\"\n" +
    "                        ng-click=\"setPage(settings.Constant.PAGE_WEB_COMPONENTS)\" translate>JS/CSS Components</li>\n" +
    "                    <li ng-hide=\"isRPGUser || !isServiceIntegrationEnabled\" ng-class=\"{'selected': page === settings.Constant.PAGE_SERVICE_INTEGRATION}\" ng-click=\"setPage(settings.Constant.PAGE_SERVICE_INTEGRATION)\"\n" +
    "                        translate>Service Integrations</li>\n" +
    "                </ul>\n" +
    "\n" +
    "                <h2 translate ng-hide=\"fromLocalkit || isRPGUser || isReactNative\">Build</h2>\n" +
    "                <ul ng-hide=\"fromLocalkit || isRPGUser || isReactNative\">\n" +
    "                    <li ng-show=\"isGenericProject\" ng-class=\"{'selected': page === settings.Constant.PAGE_BUILD_CUSTOM_BUILD_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_BUILD_CUSTOM_BUILD_SETTINGS)\"\n" +
    "                    translate>Start Custom Build</li>\n" +
    "                    <li ng-class=\"{'selected': page === settings.Constant.PAGE_BUILD_ENVIRONMENT_SETTINGS}\" ng-click=\"setPage(settings.Constant.PAGE_BUILD_ENVIRONMENT_SETTINGS)\"\n" +
    "                        translate>Build Environment Settings</li>\n" +
    "                    <li ng-show=\"isCIEnabled\" ng-class=\"{'selected': page === settings.Constant.PAGE_CI}\" ng-click=\"setPage(settings.Constant.PAGE_CI)\" translate>Continuous Integration\n" +
    "                        <sup class=\"beta\">BETA</sup>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "\n" +
    "                <h2 ng-hide=\"fromLocalkit || isRPGUser || isReactNative\" translate>Service</h2>\n" +
    "                <ul ng-hide=\"fromLocalkit || isRPGUser || isReactNative || !isDeployServiceEnabled\" ng-class=\"{'no-margin': !isRPGUser && !isReactNative}\">\n" +
    "                    <li ng-class=\"{'selected': page === settings.Constant.PAGE_DEPLOY_SERVICE}\" ng-click=\"setPage(settings.Constant.PAGE_DEPLOY_SERVICE)\"\n" +
    "                        translate>Deploy Services\n" +
    "                        <sup class=\"beta\">BETA</sup>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "\n" +
    "                <h2 translate ng-show=\"isRPGUser || isReactNative\">Log</h2>\n" +
    "                <ul>\n" +
    "                    <li ng-class=\"{'selected': page === settings.Constant.PAGE_BUILD_HISTORY}\" ng-click=\"setPage(settings.Constant.PAGE_BUILD_HISTORY)\"\n" +
    "                        translate>Build History</li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "        </nav>\n" +
    "\n" +
    "        <main class=\"content\" ng-show=\"page != 'loading'\" ng-class=\"{'hide-headerbar': settings.hideHeaderbar, 'hide-sidebar': settings.hideSidebar}\">\n" +
    "            <!-- Settings Page Containers -->\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/BuildHistory.html'\" ng-if=\"page === settings.Constant.PAGE_BUILD_HISTORY\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/AndroidBuild.html'\" ng-if=\"page === settings.Constant.PAGE_ANDROID_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/IosBuild.html'\" ng-if=\"page === settings.Constant.PAGE_IOS_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/ElectronBuild.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_LINUX_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/ElectronBuild.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_MACOS_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/ElectronBuild.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_WINDOWS_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/WindowsBuild.html'\" ng-if=\"page === settings.Constant.PAGE_WINDOWS_BUILD\"></div>\n" +
    "            <div class=\"build-setting lm_content\" ng-include=\"'build/WebBuild.html'\" ng-if=\"page === settings.Constant.PAGE_WEB_BUILD\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/AndroidAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_ANDROID_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/IosAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_IOS_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/ElectronAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_LINUX_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/ElectronAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_MACOS_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/ElectronAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_ELECTRON_WINDOWS_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/WindowsAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_WINDOWS_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/WebAppSettings.html'\" ng-if=\"page === settings.Constant.PAGE_WEB_APP_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/AndroidBuildSettings.html'\" ng-if=\"page === settings.Constant.PAGE_ANDROID_BUILD_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/IosBuildSettings.html'\" ng-if=\"page === settings.Constant.PAGE_IOS_BUILD_SETTINGS\"></div>\n" +
    "            <div class=\"app-setting lm_content\" ng-include=\"'build/BuildResult.html'\" ng-if=\"page === settings.Constant.PAGE_BUILD_RESULT\"></div>\n" +
    "            <div class=\"lm_content\" ng-controller=\"CordovaPluginsController as cordova\" ng-include=\"'build/CordovaPlugins.html'\" ng-if=\"page === settings.Constant.PAGE_CORDOVA_PLUGINS\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'build/WebComponent.html'\" ng-if=\"page === settings.Constant.PAGE_WEB_COMPONENTS\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'build/ServiceIntegration.html'\" ng-if=\"page === settings.Constant.PAGE_SERVICE_INTEGRATION\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'build/ContinuousIntegration.html'\" ng-if=\"page === settings.Constant.PAGE_CI && !fromLocalkit\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'build/DeployService.html'\" ng-if=\"page === settings.Constant.PAGE_DEPLOY_SERVICE && !fromLocalkit\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'build/BuildEnvironmentSettings.html'\" ng-if=\"page === settings.Constant.PAGE_BUILD_ENVIRONMENT_SETTINGS\"></div>\n" +
    "            <div class=\"lm_content\" ng-include=\"'dashboard/NewRemoteBuild.html'\" ng-if=\"page === settings.Constant.PAGE_BUILD_CUSTOM_BUILD_SETTINGS\"></div>\n" +
    "        </main>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/AndroidAppSettings.html",
    "<div ng-controller=\"AndroidAppSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <!-- Show Sippner -->\n" +
    "    <div ng-show=\"loading\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"saving\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"container\" ng-form=\"form\">\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <h1 translate>Android App Configuration</h1>\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Application Information</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "                    <div>\n" +
    "                        <label translate>\n" +
    "                            <span translate>Application Name:</span>\n" +
    "                            <span class=\"m-tooltip-body icon-help\" translate>\n" +
    "                                <i class=\"m-tooltip tt-text-leftside\">Any strings (Asterisk will be appended to\n" +
    "                                    application name for debug build).\n" +
    "                                    <br>Note that this field is common to Android and iOS.<br>\n" +
    "                                    Submitting your app to store may fail if some symbols are included\n" +
    "                                </i>\n" +
    "                            </span>\n" +
    "                        </label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationName_android\" ng-model=\"settings.applicationName_android\"\n" +
    "                                ng-pattern=\"/^(?!(&|@)).*$/\" class=\"long-text\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationName_android.$valid && valueChanged('applicationName_android')\">\n" +
    "                                <span translate>iOS Application Name will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationName_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Cannot start with\n" +
    "                                    &rsquo;&amp;&rsquo; and &rsquo;@&rsquo;.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Package Name:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">It is recommended you use reverse-domain style (e.g. com.example.appname).<br />You can use only alphanumeric characters and periods.<br />At least one period must be used.<br />Each segment separated by periods should begin with an alphabetic character.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationClass_android\" ng-model=\"settings.applicationClass_android\"\n" +
    "                                ng-pattern=\"/^([a-zA-Z]+[a-zA-Z0-9_]*\\.){1,}[a-zA-Z]+[a-zA-Z0-9_]*$/\" class=\"long-text\"\n" +
    "                                required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationClass_android.$valid && valueChanged('applicationClass_android')\">\n" +
    "                                <span translate>iOS App ID will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationClass_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-if=\"!isRPGUser\">\n" +
    "                        <label class=\"lh-clear\" translate>Use Different Package Name <br />for Debug Build:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">If enabled, the package name will be *.debug when build type is Debug. Also, package name will be *.debugger when building project debugger.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" id=\"config_postfix\" ng-model=\"settings.config_postfix\">\n" +
    "                            <label for=\"config_postfix\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Version:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Specify three or four numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"versionName_android\" ng-model=\"settings.versionName_android\"\n" +
    "                                ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})(\\.(\\d{1,2}))?$/\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.versionName_android.$valid && valueChanged('versionName_android')\">\n" +
    "                                <span translate>iOS/Windows Version will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.versionName_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Specify three or four numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"content-info-added\" ng-show=\"5 <= cordovaVersion\">\n" +
    "                        <label translate>Version Code:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">An internal version number. The value must be set as an integer.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"versionCode_android\" ng-model=\"settings.versionCode_android\"\n" +
    "                                ng-disabled=\"!specifyVersionCode\" ng-pattern=\"/^[0-9]+$/\" ng-required=\"specifyVersionCode\">\n" +
    "                            <span ng-messages=\"form.versionCode_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>You can only use numbers.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                            <div>\n" +
    "                                <ul>\n" +
    "                                    <li>\n" +
    "                                        <input type=\"checkbox\" id=\"specifyVersionCode\" ng-model=\"specifyVersionCode\">\n" +
    "                                        <label for=\"specifyVersionCode\" translate>Specify the version code manually</label>\n" +
    "                                    </li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"content-info-added\">\n" +
    "                        <label translate>Target SDK Version:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">The target SDK Version for Android Platform. The value must be set as an integer.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"config_android_target_sdk_version\" ng-model=\"settings.config_android_target_sdk_version\"\n" +
    "                                ng-pattern=\"/^[0-9]+$/\">\n" +
    "                            <span ng-messages=\"form.config_android_target_sdk_version.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>The value must be set as an integer.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Fullscreen:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" id=\"fullscreen_android\" ng-model=\"settings.fullscreen_android\">\n" +
    "                            <label for=\"fullscreen_android\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-if=\"isCordova10\">\n" +
    "                        <label translate>Enable AndroidX:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" id=\"xenable_android\" ng-model=\"settings.xenable_android\">\n" +
    "                            <label for=\"xenable_android\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Icons</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>PNG format is supported.</div>\n" +
    "                    <div class=\"updateAllImagesAtOnce-contents\">\n" +
    "                        <div translate>Update all images at once.</div>\n" +
    "                        <div>\n" +
    "                            <em><button class=\"m-btn m-btn-default-dark\" type=\"button\" ng-click=\"openFileDialog('icon_all_android')\"><span\n" +
    "                                        translate>Upload</span></button></em>\n" +
    "                            <input name=\"icon_all_android\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\"\n" +
    "                                style=\"display:none;\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-show=\"hasMissingSrcIcon\">\n" +
    "                        <div class=\"alert alert-warning\" role=\"alert\">\n" +
    "                            <p translate>The icons confugured in config.xml do not appear here correctly. For more details, please refer to 'Set of adaptive icons' in <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">our documentation</a>.</p>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-android\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in iconTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img class=\"sfimg-android\" ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" alt=\"{{iconType}}\"\n" +
    "                                            id=\"image-{{iconType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"icon.label\"></span><br>({{icon.w}} x {{icon.h}})</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default ng-binding\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span\n" +
    "                                                        translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\"\n" +
    "                                                style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"!isRPGUser\">\n" +
    "                <legend>\n" +
    "                    <h2 translate>Splash Files</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel splashScreen-body\">\n" +
    "                    <div class=\"config-info\" translate>It's recommended to use 9-patch formatted PNG (*.9.png) files for Android splash screens, because regular PNGs are forcibly scaled to the screen size.<br>Note that splash images can only be displayed on build apps, not on the Debugger.</div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-android\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(splashType,splash) in splashTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{splashType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{splashType}}\">\n" +
    "                                    <a ng-href=\"{{splash.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img on-image-load-error=\"onImageLoadError(splash)\" ng-show=\"!splash.missing\" class=\"sfimg-android\" ng-src=\"{{splash.url}}&amp;t={{timestamp()}}\" id=\"image-{{splashType}}\">\n" +
    "                                    </a>\n" +
    "                                    <span translate ng-if=\"splash.missing\">\n" +
    "                                        No image\n" +
    "                                    </span>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"splash.label\"></span></label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog(splashType)\"><span\n" +
    "                                                        translate>Change</span></button></em>\n" +
    "                                            <em>\n" +
    "                                                <button class=\"m-btn m-btn-default\"\n" +
    "                                                        type=\"button\"\n" +
    "                                                        ng-click=\"deleteImage(splashType)\"\n" +
    "                                                        ng-disabled=\"splash.missing\">\n" +
    "                                                        <span translate>Clear</span>\n" +
    "                                                </button>\n" +
    "                                            </em>\n" +
    "                                            <input name=\"{{splashType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\"\n" +
    "                                                style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tableCell\">\n" +
    "                        <label translate>Display Time:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Specify how long the splash will be present (in milliseconds).</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"splashtime_android\" ng-model=\"settings.splashtime_android\"\n" +
    "                                ng-pattern=\"/\\d+/\" required>\n" +
    "                            <span ng-messages=\"form.splashtime_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"isRPGUser\">\n" +
    "                <legend>\n" +
    "                    <h2>背景画像</h2>\n" +
    "                    <div class=\"tableCell\">\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select name=\"rpgtkool_background_image_android\" ng-model=\"settings.selected_rpg_background_image_android\"\n" +
    "                                ng-options=\"image for image in rpg_background_images_android\">\n" +
    "                                <option value=\"\">なし</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </legend>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Misc</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel misc-body tableCell-all\">\n" +
    "                    <div class=\"text-top content-info-added\" ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Allowed URL:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">One hostname per line. It can also start with protocol (http://). If you specify [subdomains] after the hostname, all subdomains are applied.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <textarea name=\"config_access_origin_android\" ng-model=\"settings.config_access_origin_android\"\n" +
    "                                rows=\"4\" cols=\"20\" placeholder=\"*\" required></textarea>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.config_access_origin_android.$valid && valueChanged('config_access_origin_android')\">\n" +
    "                                <span translate>iOS Allowed URL will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.config_access_origin_android.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                            <div>\n" +
    "                                <ul>\n" +
    "                                    <li><label translate>You need to rebuild the app to apply the change.</label></li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Keep Running:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" id=\"config_keeprunning\" ng-model=\"settings.config_keeprunning\">\n" +
    "                            <label for=\"config_keeprunning\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Disallow Overscroll:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Disable bouncing in WebView.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" id=\"config_disallow_overscroll_android\" ng-model=\"settings.config_disallow_overscroll_android\">\n" +
    "                            <label for=\"config_disallow_overscroll_android\" translate>Enable</label>\n" +
    "                            <span class=\"config-warning\" ng-show=\"valueChanged('config_disallow_overscroll_android')\">\n" +
    "                                <span translate>iOS Overscroll configuration will also be changed.</span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Screen Orientation:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Set\n" +
    "                                    screen orientation.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <div>\n" +
    "                                <input type=\"radio\" id=\"config_orientation_android_default\" ng-model=\"settings.config_orientation_android\"\n" +
    "                                    value=\"default\">\n" +
    "                                <label for=\"config_orientation_android_default\">Default</label>\n" +
    "                            </div>\n" +
    "                            <div>\n" +
    "                                <input type=\"radio\" id=\"config_orientation_android_landscape\" ng-model=\"settings.config_orientation_android\"\n" +
    "                                    value=\"landscape\">\n" +
    "                                <label for=\"config_orientation_android_landscape\">Landscape</label>\n" +
    "                            </div>\n" +
    "                            <div>\n" +
    "                                <input type=\"radio\" id=\"config_orientation_android_portrait\" ng-model=\"settings.config_orientation_android\"\n" +
    "                                    value=\"portrait\">\n" +
    "                                <label for=\"config_orientation_android_portrait\">Portrait</label>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"webViewEngine-contents\" ng-if=\"!isRPGUser && cordovaVersion < 7\">\n" +
    "                        <label class=\"lh-clear\" translate>WebView Engine:</label>\n" +
    "                        <div>\n" +
    "                            <label ng-show=\"!isHighPerformanceWebView\" translate>Stock WebView (default)</label>\n" +
    "                            <label ng-show=\"isHighPerformanceWebView\" translate>High Performance (Crosswalk)</label>\n" +
    "                            <div>\n" +
    "                                <span translate>*To use a high-performance version,</span><br><br>\n" +
    "                                <span translate>[Cordova version &gt;= 5]</span><br>\n" +
    "                                <span translate>Enable the crosswalk plugin in Cordova plugins page.</span>\n" +
    "                                <br>\n" +
    "                                <br>\n" +
    "                                <span translate>[Cordova version &lt; 5]</span><br><span translate>Open <code>config.xml</code>\n" +
    "                                    and add following tag.</span>\n" +
    "                                <ul>\n" +
    "                                    <li>\n" +
    "                                        <span translate>Device WebView (default)</span>\n" +
    "                                        <pre>&lt;preference name=&quot;monaca:WebViewEngine&quot; value=&quot;default&quot;/&gt;</pre>\n" +
    "                                    </li>\n" +
    "                                    <li>\n" +
    "                                        <span translate>Crosswalk Engine</span>\n" +
    "                                        <pre>&lt;preference name=&quot;monaca:WebViewEngine&quot; value=&quot;crosswalk&quot;/&gt;\n" +
    "&lt;preference name=&quot;monaca:CrosswalkArchitecture&quot; value=&quot;arm&quot;/&gt;</pre>\n" +
    "                                        <span translate>(Select \"arm\" or \"x86\" to switch crosswalk architecture.)</span>\n" +
    "                                    </li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "            </>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"build-start-button-area\">\n" +
    "            <div class=\"build-start-button\">\n" +
    "                <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\">Back</a>\n" +
    "                <button id=\"button-save\" class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"submit()\" disabled=\"disabled\"\n" +
    "                    ng-class=\"{disable: !isReadyToSave || form.$invalid}\" ng-disabled=\"!isReadyToSave || form.$invalid\"\n" +
    "                    translate>Save</button>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "");
  $templateCache.put("build/AndroidBuild.html",
    "<div ng-controller=\"AndroidBuildController\" ng-init=\"init()\">\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <div ng-show=\"deleting\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Deleting...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"building\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Starting build...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <h1 translate>Build Android App</h1>\n" +
    "        </div>\n" +
    "\n" +
    "        <div notification-of-unsupported-cordova></div>\n" +
    "\n" +
    "        <ul class=\"category-tabs\">\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'development'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('development')\" translate>Build for Debugging</a>\n" +
    "            </li>\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'production'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('production')\" translate>Build for Release</a>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <div class=\"type-tabs\">\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'development'}\" id=\"development\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-if=\"!isRPGUser && !isReactNative && isCustomBuildDebuggerServiceEnabled\" ng-class=\"{'active': purpose === 'debugger'}\">\n" +
    "                        <a class=\"debugger {{lang}}\" data-toggle=\"tab\" alt=\"Debugger Build\" ng-click=\"changeTab('development', 'debugger')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-if=\"!isRPGUser && !isReactNative && isCustomBuildDebuggerServiceEnabled\"><div class=\"vertical-border\"></div></li>\n" +
    "                    <li ng-class=\"{'active': purpose === 'debug'}\">\n" +
    "                        <a class=\"debug-android {{lang}}\" data-toggle=\"tab\" alt=\"Debug Build\" ng-click=\"changeTab('development', 'debug')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'debug'}\" id=\"development-debug\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>An Android app with a dummy signature will be built. <br /> A debug-build application has no signature, so it cannot be registered in Google Play. See <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">here</a> for details.</p>\n" +
    "                            </div>\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'debugger'}\" id=\"development-debugger\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A debugger including Cordova plugins enabled in the Plugin Management screen can be built. The operation of plugins not included in the store-version debugger can be checked. Details <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">here</a>.</p>\n" +
    "                            </div>\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'production'}\" id=\"production\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-class=\"{'active': purpose === 'release'}\">\n" +
    "                        <a class=\"release-android {{lang}}\" data-toggle=\"tab\" alt=\"Release Build\"  ng-click=\"changeTab('production', 'release')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-class=\"{'active': purpose === 'inappupdater'}\" ng-if=\"!isRPGUser && !isReactNative\">\n" +
    "                        <a class=\"inappupdater-releaseBuild {{lang}}\" data-toggle=\"tab\" alt=\"In-App Updater update file\" ng-click=\"changeTab('production', 'inapp_updater')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "\n" +
    "\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'release'}\" id=\"production-release\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>Use KeyStore to build Andoid app. Submission to Google Play is also possible. Details <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">here</a>.</p>\n" +
    "                            </div>\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Setup KeyStore and Alias</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': aliasList && aliasList.length, 'm-btn-blue': !aliasList || !aliasList.length}\" ng-click=\"manageBuildSettings()\" translate>Manage KeyStore and Alias</a></div>\n" +
    "                                </div>\n" +
    "                                <div ng-show=\"aliasList && !aliasList.length\" ng-class=\"{'m-text': aliasList.length, 'm-text-alert': !aliasList.length}\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Release build can not continue because the keystore and alias is not created. Please create a keystore and alias from build settings.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div ng-show=\"aliasList && aliasList.length\" class=\"alias-form has-config-error-message\">\n" +
    "                                    <div class=\"alias-form-label\"><span translate>Alias</span></div>\n" +
    "                                    <div>\n" +
    "                                        <div class=\"m-component-combobox block\">\n" +
    "                                            <select id=\"alias_name\" ng-model=\"alias_name\" ng-options=\"item.alias as item.alias for item in aliasList\" ng-change=\"showDummyPassword()\"></select>\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                    <div class=\"alias-form-label\" style=\"margin-left: 10%\"><span translate>Password</span></div>\n" +
    "                                    <div>\n" +
    "                                        <input id=\"alias_password\" ng-model=\"alias_password\" type=\"password\" name=\"alias_password\" placeholder=\"password\" ng-change=\"aliasPasswordChanged()\" class=\"block\">\n" +
    "                                        <div class=\"config-error\" ng-show=\"!alias_password\" translate>Alias password is not specified</div>\n" +
    "                                        <div class=\"config-error\" ng-show=\"password_error\" translate>{{ password_error }}</div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-if=\"isRPGUser\" class=\"build-setting-item\" ng-class=\"{'disable-remote-package-list': !flag_monaca_hosting_app.android}\" style=\"max-width: 832px;\">\n" +
    "                                    <div class=\"\" style=\"margin-top: 12px\">\n" +
    "                                        <table class=\"build-list-table\">\n" +
    "                                            <label style=\"margin-bottom: 5px;\"><span class=\"label-large-app\" style=\"font-weight: 600\">Monacaで管理している更新ファイル</span></label>\n" +
    "                                            <thead>\n" +
    "                                            <tr>\n" +
    "                                                <th>アプリのバージョン</th>\n" +
    "                                                <th>作成日</th>\n" +
    "                                                <th>操作</th>\n" +
    "                                            </tr>\n" +
    "                                            </thead>\n" +
    "                                            <tbody>\n" +
    "                                            <tr ng-show=\"!inappupdater_packages\" class=\"empty-list\">\n" +
    "                                                <td colspan=\"4\">更新ファイルはありません</td>\n" +
    "                                            </tr>\n" +
    "                                            <tr ng-repeat=\"package in inappupdater_packages\">\n" +
    "                                                <td>\n" +
    "                                                    <div>{{package.app_version}}</div>\n" +
    "                                                </td>\n" +
    "                                                <td>\n" +
    "                                                    <div>{{package.created_at}}</div>\n" +
    "                                                </td>\n" +
    "                                                <td>\n" +
    "                                                    <button class=\"m-btn m-btn-default\" ng-disabled=\"!flag_monaca_hosting_app.android\" ng-click=\"deleteUpdateNumber(package.id)\"><span>\n" +
    "                                                        <span class=\"ng-scope\">削除</span></span>\n" +
    "                                                    </button>\n" +
    "                                                </td>\n" +
    "                                            </tr>\n" +
    "                                            </tbody>\n" +
    "                                        </table>\n" +
    "                                    </div>\n" +
    "                            </div>\n" +
    "                            <div class=\"build-setting-item\">\n" +
    "                                <div style=\"margin-top: 12px\">\n" +
    "                                    <label>\n" +
    "                                        <span class=\"label-large-app\" translate>Package Type:</span><span>{{formatAndroidPackageType(androidPackageType.version)}} <a href=\"#\" ng-click=\"manageBuildEnvironmentSettings()\" translate>Configure</a></span>\n" +
    "                                    </label>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'inappupdater'}\" id=\"production-inappupdater\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A zip file will be created containing HTML5 assets used by the app to allow automatic updating without rebuilding or repacking.  <br /> For this build, the InAppUpdater plugin must be included in the Cordova Plugin Settings screen. Please deploy the file to your web server.</p>\n" +
    "                            </div>\n" +
    "                            <div ng-include src=\"'build-problems'\" ng-show=\"inAppUpdaterPlugin && inAppUpdaterPlugin.canUsed\"></div>\n" +
    "\n" +
    "                            <section class=\"error-container\" ng-show=\"inAppUpdaterPlugin && !inAppUpdaterPlugin.canUsed\">\n" +
    "                                <div class=\"error-message-container\">\n" +
    "                                    <div class=\"error-icon\"><img ng-src=\"{{'/img/0-ico-exclamation.png'}}\"></div>\n" +
    "                                    <div class=\"error-message\" translate>To use the In-App Updater update file build, an Corporate Plan upgrade is required. <br /> The Corporate Plan includes not only the automatic In-App Updater, but also extended features for resource encryption and secure storage. Details <a href=\"https://monaca.io/enterprise.html\" target=\"_blank\">here</a>.</div>\n" +
    "                                </div>\n" +
    "                                <div class=\"error-container-button-area\">\n" +
    "                                    <a class=\"m-btn m-btn-green m-btn-large\" ng-href=\"https://monaca.io/support/inquiry.html\" target=\"_blank\" translate>Apply to Corporate Plan</a>\n" +
    "                                </div>\n" +
    "                            </section>\n" +
    "\n" +
    "                            <section class=\"error-container\" ng-show=\"inAppUpdaterPlugin && inAppUpdaterPlugin.canUsed && !inAppUpdaterPlugin.isInstalled\">\n" +
    "                                <div class=\"error-message-container\">\n" +
    "                                    <div class=\"error-icon\"><img ng-src=\"{{'/img/0-ico-exclamation.png'}}\"></div>\n" +
    "                                    <div class=\"error-message\" translate>Please add the InAppUpdater plugin. <br />It can be added in the Cordova Plugin settings screen.</div>\n" +
    "                                </div>\n" +
    "                            </section>\n" +
    "\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"build()\"\n" +
    "            ng-disabled=\"!canBuild || (purpose === 'release' && !alias_password) || building\" disabled translate>\n" +
    "            Start Build</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <script type=\"text/ng-template\" id=\"build-problems\">\n" +
    "        <div class=\"box-warningarea\" ng-show=\"buildWarnings.length\">\n" +
    "            <p translate>Build Setting Warnings</p>\n" +
    "            <div class=\"box-warningCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildWarnings\">\n" +
    "                        <span ng-if=\"item.value && item.key == 'android_version_warning'\" translate>We noticed that you have defined \"cordova-android\" package in \"devDependencies\" of \"package.json\" file.<br>The build will fail if the version of \"cordova-android\" is not supported by Monaca. We recommend you remove it from your \"package.json\" file.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "        <div class=\"box-errorarea\" ng-show=\"!canBuild && buildProblems.length\">\n" +
    "            <p translate>You do not have the necessary setting to build.</p>\n" +
    "            <div class=\"box-errorCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildProblems\">\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_config_xml'\" translate>An unexpected error has occurred while reading config.xml. Please fix config.xml file.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_remaining_build_count'\" translate>Number of builds per day has reached the maximum.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_start_file'\" translate>App launch page is not saved.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_assets_encrypt_password'\" translate>Encryption plugin password is not set.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_version_name'\" translate>VersionName format is incorrect.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_keystore'\" translate>KeyStore is not set.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_crosswalk_setting'\" translate>Crosswalk Architecture is not set. Please select Architecture in \"Crosswalk WebView Engine\" Configure in Cordova Plugin page.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_cordova_permission'\" translate>The project's Cordova version is unsupported by your current plan and can not build. Please upgrade your project and try again.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_plugin_permission'\" translate>The project contains unlicensed plugins.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'is_not_business_trial'\" translate>Release build cannot be started during the trial.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_inapp_updater_setting'\" translate>In-App Updater settings is not set.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'can_release_build' && purpose === 'release'\" translate>Current plan does not allow release build. Please refer to\n" +
    "                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB)+'/plan/manage', '_blank'); return false;\">pricing</a> for details.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'can_app_bundle_build'\" translate>Please switch to Android Platform 8.1.0 or higher version for App Bundle Build in the Build Environment Settings.</span>\n" +
    "                        <span ng-if=\"item.key == 'error_messages'\">\n" +
    "                            <ul>\n" +
    "                                <li ng-repeat=\"(_key, _value) in item.value\">\n" +
    "                                    <span ng-bind-html=\"_value | trustAsHtml\"></span>\n" +
    "                                </li>\n" +
    "                            <ul>\n" +
    "                        </span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "    </script>\n" +
    "\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/AndroidBuildSettings.html",
    "<div class=\"build-settings\" ng-controller=\"AndroidBuildSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <div ng-show=\"updating\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Updating...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "        <header class=\"m-header-caret balloon-line\">\n" +
    "            <div class=\"cell-build-panel add-about margin-btm-clear\">\n" +
    "                <h1 translate>Manage KeyStore and Alias</h1>\n" +
    "                <div class=\"add-about-text\">\n" +
    "                    <p translate>The project is not configured for Release build. In order to register your App to Google Play, please setup it according to <a ng-href=\"{{ docsUrl.deploy_google_play }}\" target=\"_blank\">the document</a>.<br />KeyStore and Alias are used to code-sign applications for release build. KeyStore can contain multiple Alias, but only one Alias is used for code-sign an application.<br />The configuration is saved by user basis.<a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a></p>\n" +
    "                </div>\n" +
    "                <fieldset>\n" +
    "                    <div class=\"config-list-box config-list-box-top border-top\">\n" +
    "                        <table class=\"list-row\"><caption translate>Generate New KeyStore:</caption><tbody><tr>\n" +
    "                            <th><label translate>Create KeyStore and Alias</label></th>\n" +
    "                            <td translate>Create New KeyStore and Alias</td>\n" +
    "                            <td translate>\n" +
    "                                <em><button class=\"m-btn m-btn-default\" ng-click=\"clickGenerateKeyStore()\"><span translate>Clear and Generate New</span></button></em>\n" +
    "                            </td>\n" +
    "                        <tr></tr>\n" +
    "                            <th><label translate>Add Alias</label></th>\n" +
    "                            <td translate>Add New Alias</td>\n" +
    "                            <td>\n" +
    "                                <em><button class=\"m-btn m-btn-default\" ng-click=\"clickAddAlias()\" ng-disabled=\"!hasKeyStore\"><span translate>Add Alias</span></button></em>\n" +
    "                            </td>\n" +
    "                        <tr></tr>\n" +
    "                            <th><label translate>KeyStore<br />Import and Export</label></th>\n" +
    "                            <td translate>A keystore created elsewhere will be imported, and an alias added. <br /> Also, it can be exported to the local PC as a backup.</td>\n" +
    "                            <td>\n" +
    "                                <em><button class=\"m-btn m-btn-default\" ng-click=\"clickImport()\"><span translate>Import</span></button></em>\n" +
    "                                <em><button class=\"m-btn m-btn-default\" ng-click=\"clickExport()\" ng-disabled=\"!hasKeyStore\"><span translate>Export</span></button></em>\n" +
    "                            </td>\n" +
    "                        </tr></tbody></table>\n" +
    "                    </div>\n" +
    "                </fieldset>\n" +
    "            </div>\n" +
    "        </header>\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <div class=\"config-list-box config-list-box-top\">\n" +
    "                <table id=\"alias-table\" class=\"build-list-table android-keystore-list\">\n" +
    "                    <caption translate>List of Alias in KeyStore:</caption>\n" +
    "                    <thead>\n" +
    "                        <tr>\n" +
    "                            <th translate>Alias</th>\n" +
    "                            <th translate>Password</th>\n" +
    "                            <th></th>\n" +
    "                        </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                        <tr ng-repeat=\"item in aliasList\">\n" +
    "                            <td>\n" +
    "                                <div>{{htmlspecialchars(item.alias)}}</div>\n" +
    "                            </td>\n" +
    "                            <td>\n" +
    "                                <div>*</div>\n" +
    "                            </td>\n" +
    "                            <td>\n" +
    "                                <button ng-click=\"clickDeleteAlias(item.alias)\" class=\"m-icon-btn\"><span class=\"btn-deleted\" aria-hidden=\"true\"></span></button>\n" +
    "                                </td>\n" +
    "                        </tr>\n" +
    "                        <tr ng-hide=\"aliasList.length\">\n" +
    "                            <td colspan=\"3\">&nbsp;</td>\n" +
    "                        </tr>\n" +
    "                    </tbody>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"build-start-button-area\" ng-show=\"hasPrevPage()\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <div>\n" +
    "                <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\" translate>Back</a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
  $templateCache.put("build/BuildEnvironmentSettings.html",
    "<div class=\"build-env-settings\" ng-controller=\"BuildEnvironmentSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "  <!-- Loading -->\n" +
    "  <div ng-show=\"loading\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <div class=\"header-section\">\n" +
    "      <h1 translate>Build Environment Settings</h1>\n" +
    "    </div>\n" +
    "    <hr>\n" +
    "\n" +
    "    <div class=\"main-content\">\n" +
    "      <!-- <p class=\"\" translate>Please choose the build server environment.</p><br> -->\n" +
    "\n" +
    "      <div ng-show=\"errorMessage\">\n" +
    "        <p style=\"color: #a42d2d;\">{{ errorMessage }}</p>\n" +
    "      </div>\n" +
    "\n" +
    "      <ul uk-tab>\n" +
    "        <li ng-click=\"selectPlatform('ios')\" class=\"uk-active\"><a href=\"\">iOS</a></li>\n" +
    "        <li ng-click=\"selectPlatform('android')\"><a href=\"\">Android</a></li>\n" +
    "        <li ng-click=\"selectPlatform('electron')\" ng-show=\"environments.electron.platform && environments.electron.platform.length\"><a href=\"\">Electron</a></li>\n" +
    "      </ul>\n" +
    "\n" +
    "      <!-- iOS -->\n" +
    "      <div class=\"section-container\" ng-show=\"currentPlatform == 'ios'\">\n" +
    "        <!-- Platform -->\n" +
    "        <div class=\"section-box\" ng-show=\"environments.ios.platform && environments.ios.platform.length\">\n" +
    "          <div class=\"platform-label\" translate>Platform</div>\n" +
    "          <div class=\"right-section\">\n" +
    "            <div class=\"item-box\" ng-repeat=\"platform in environments.ios.platform\" ng-class=\"{'checked': platform.enabled === true}\"\n" +
    "              ng-click=\"selectEnvironment('ios', 'platform', platform)\">\n" +
    "              iOS {{platform.version}}\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <!-- Xcode -->\n" +
    "        <div class=\"section-box\" ng-show=\"environments.ios.xcode && environments.ios.xcode.length\">\n" +
    "          <div class=\"platform-label\" translate>Xcode</div>\n" +
    "          <div class=\"right-section\">\n" +
    "            <div class=\"item-box\" ng-repeat=\"xcode in environments.ios.xcode\" ng-class=\"{'checked': xcode.enabled === true}\"\n" +
    "              ng-click=\"selectEnvironment('ios', 'xcode', xcode)\">\n" +
    "              Xcode {{xcode.version}}\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <!-- BuildFlag -->\n" +
    "        <div id=\"build-flag-container\" class=\"section-box\" ng-show=\"environments.ios.buildFlag\">\n" +
    "          <div class=\"platform-label\" translate>Build Flag</div>\n" +
    "            <div id=\"build-flag-flex-container\" class=\"uk-flex\">\n" +
    "              <div class=\"uk-container\" ng-repeat=\"buildType in supportedBuildType\">\n" +
    "                <div class=\"uk-container-heading\"><span>{{formatBuildTypeText(buildType)}}</span></div>\n" +
    "                <form>\n" +
    "                  <fieldset class=\"uk-fieldset\" style=\"margin: 12px 0;\">\n" +
    "                    <div class=\"uk-margin\">\n" +
    "                      <div class=\"uk-flex-inline input-box\">\n" +
    "                        <input ng-keyup=\"buildFlagInputOnKeyUp($event, buildType)\" ng-model=\"buildFlagInput[buildType]\" class=\"uk-input\" type=\"text\" placeholder={{buildFlagPlaceHolder}}>\n" +
    "                        <a ng-click=\"addBuildFlag(buildType)\" uk-icon=\"icon:plus;ratio:0.7;\" class=\"input-box-icon\"></a>\n" +
    "                      </div>\n" +
    "                      <ul class=\"uk-list uk-list-disc uk-list-primary\">\n" +
    "                        <li ng-repeat=\"flag in environments.ios.buildFlag[buildType]\">\n" +
    "                          {{htmlspecialchars(flag)}} <a ng-click=\"removeBuildFlag(buildType, $index)\" uk-icon=\"icon:close;ratio:0.5;\" class=\"uk-icon-remove\"></a>\n" +
    "                        </li>\n" +
    "                      </ul>\n" +
    "                    </div>\n" +
    "                  </fieldset>\n" +
    "                </form>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div id=\"build-dsym-toggle\" ng-if=\"canShowDSYM\">\n" +
    "              <div class=\"platform-label\">\n" +
    "                <span translate>dSYM Download</span>\n" +
    "                <span class=\"m-tooltip-body icon-help\">\n" +
    "                  <i class=\"m-tooltip tt-text-leftside\" translate>Only available to Plan for team development.</i>\n" +
    "                </span>\n" +
    "              </div>\n" +
    "              <label class=\"switcher\">\n" +
    "                <input type=\"checkbox\" ng-model=\"environments.ios.dSYM\" ng-change=\"dSYMSettingChanged()\" ng-disabled=\"!canChangeDSYM\"/>\n" +
    "                <span class=\"slider round\"></span>\n" +
    "              </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "\n" +
    "      <!-- Android -->\n" +
    "      <div class=\"section-container\" ng-show=\"currentPlatform == 'android'\">\n" +
    "        <!-- Platform -->\n" +
    "        <div class=\"section-box\" ng-show=\"environments.android.platform && environments.android.platform.length\">\n" +
    "          <div class=\"platform-label\" translate>Platform</div>\n" +
    "          <div class=\"right-section\">\n" +
    "            <div class=\"item-box\" ng-repeat=\"platform in environments.android.platform\" ng-class=\"{'checked': platform.enabled === true}\"\n" +
    "              ng-click=\"selectEnvironment('android', 'platform', platform)\">\n" +
    "              Android {{platform.version}}\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <!-- Package Type -->\n" +
    "        <div class=\"section-box\" ng-show=\"environments.android.package_type && environments.android.package_type.length\">\n" +
    "          <div class=\"platform-label\" translate>Package Type</div>\n" +
    "          <div class=\"right-section\">\n" +
    "            <div class=\"item-box\" ng-repeat=\"package_type in environments.android.package_type\" ng-class=\"{'checked': package_type.enabled === true}\"\n" +
    "                 ng-click=\"selectEnvironment('android', 'package_type', package_type)\">\n" +
    "              {{formatAndroidPackageType(package_type.version)}}\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "\n" +
    "      <!-- Electron -->\n" +
    "      <div class=\"section-container\" ng-show=\"currentPlatform == 'electron'\">\n" +
    "        <!-- Platform -->\n" +
    "        <div class=\"section-box\" ng-show=\"environments.electron.platform && environments.electron.platform.length\">\n" +
    "          <div class=\"platform-label\" translate>Platform</div>\n" +
    "          <div class=\"right-section\">\n" +
    "            <div class=\"item-box\" ng-repeat=\"platform in environments.electron.platform\" ng-class=\"{'checked': platform.enabled === true}\"\n" +
    "              ng-click=\"selectEnvironment('electron', 'platform', platform)\">\n" +
    "              Electron {{platform.version}}\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"build-start-button-area\">\n" +
    "    <div class=\"build-start-button\">\n" +
    "      <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"save()\" ng-disabled=\"loading || !selectedEnvironments\" translate>Save</button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/BuildHistory.html",
    "<div ng-controller=\"BuildHistoryController as build\" class=\"build-history\">\n" +
    "  <header class=\"m-header-caret cell-build-panel\">\n" +
    "    <h1 translate>Build History</h1>\n" +
    "  </header>\n" +
    "\n" +
    "  <section class=\"cell-build-panel\">\n" +
    "    <dl ng-hide=\"build.isGenericProject\" class=\"catselect\">\n" +
    "      <dt translate>Category: </dt>\n" +
    "      <dd ng-click=\"build.platform = ''\" ng-class=\"{on: (build.platform === '')}\" translate translate-context=\"category\">All Platforms</dd>\n" +
    "      <dd ng-show=\"hasBuildService('ios')\" ng-click=\"build.platform = 'ios'\" ng-class=\"{on: (build.platform === 'ios')}\">iOS</dd>\n" +
    "      <dd ng-show=\"hasBuildService('android')\" ng-click=\"build.platform = 'android'\" ng-class=\"{on: (build.platform === 'android')}\">Android</dd>\n" +
    "      <dd ng-show=\"hasBuildService('pwa')\" ng-click=\"build.platform = 'pwa'\" ng-class=\"{on: (build.platform === 'pwa')}\">PWA</dd>\n" +
    "      <dd ng-hide=\"isRPGUser || !hasBuildService('windows')\" ng-click=\"build.platform = 'winrt'\" ng-class=\"{on: (build.platform === 'winrt')}\">Windows</dd>\n" +
    "      <dd ng-show=\"hasBuildService('electron')\" ng-click=\"build.platform = 'electron_windows'\" ng-class=\"{on: (build.platform === 'electron_windows')}\" style=\"width: 140px\">Windows</dd>\n" +
    "      <dd ng-show=\"hasBuildService('electron') && showElectronMacOsBuild\" ng-click=\"build.platform = 'electron_macos'\" ng-class=\"{on: (build.platform === 'electron_macos')}\">macOS</dd>\n" +
    "      <dd ng-show=\"hasBuildService('electron') && showElectronLinuxBuild\" ng-click=\"build.platform = 'electron_linux'\" ng-class=\"{on: (build.platform === 'electron_linux')}\">Linux</dd>\n" +
    "    </dl>\n" +
    "\n" +
    "    <ul class=\"services\">\n" +
    "      <li ng-repeat=\"history in build.historyCollection | filter:{platform: build.platform} | orderBy: 'created_at' : true\" class=\"platform-{{history.platform}} status-{{history.status}}\">\n" +
    "\n" +
    "        <div class=\"flexbox\">\n" +
    "          <div class=\"projectInfoSection\">\n" +
    "            <!-- Android Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debugger' && history.platform === 'android'\" translate>Android Debugger Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debug' && history.platform === 'android'\" translate>Android Debug Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'adhoc' && history.platform === 'android'\" translate>Android AdHoc Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'release' && history.platform === 'android'\" translate>Android Release Build</h2>\n" +
    "            <h2 class=\"name\" ng-hide=\"isRPGUser\" ng-if=\"history.type === 'inapp_updater' && history.platform === 'android'\" translate>Android InAppUpdater Build</h2>\n" +
    "\n" +
    "            <!-- iOS Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debugger' && history.platform === 'ios'\" translate>iOS Debugger Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'simulator' && history.platform === 'ios'\" translate>iOS Simulator Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debug' && history.platform === 'ios'\" translate>iOS Debug Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'adhoc' && history.platform === 'ios'\" translate>iOS AdHoc Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"(history.type === 'release' && history.platform === 'ios') && (history.status !== 'ios-publish-finish' && history.status !== 'ios-publish-fail')\" translate>iOS Release Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"(history.type === 'release' && history.platform === 'ios') && (history.status === 'ios-publish-finish' || history.status === 'ios-publish-fail')\" translate>iOS App Store Upload</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'inhouse' && history.platform === 'ios'\" translate>iOS In-House Build</h2>\n" +
    "            <h2 class=\"name\" ng-hide=\"isRPGUser\" ng-if=\"history.type === 'inapp_updater' && history.platform === 'ios'\" translate>iOS InAppUpdater Build</h2>\n" +
    "\n" +
    "            <!-- Windows Labels -->\n" +
    "            <h2 class=\"name\" ng-hide=\"isRPGUser\" ng-if=\"history.platform === 'winrt'\" translate>Windows Build</h2>\n" +
    "\n" +
    "            <!-- Electron Windows Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debug' && history.platform === 'electron_windows'\" translate>Windows Debug Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'release' && history.platform === 'electron_windows'\" translate>Windows Release Build</h2>\n" +
    "\n" +
    "            <!-- PWA Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.platform === 'pwa'\" translate>PWA Build</h2>\n" +
    "\n" +
    "            <!-- Electron Linux Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debug' && history.platform === 'electron_linux'\" translate>Linux Debug Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'release' && history.platform === 'electron_linux'\" translate>Linux Release Build</h2>\n" +
    "\n" +
    "            <!-- Electron macOS Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'debug' && history.platform === 'electron_macos'\" translate>macOS Debug Build</h2>\n" +
    "            <h2 class=\"name\" ng-if=\"history.type === 'release' && history.platform === 'electron_macos'\" translate>macOS Release Build</h2>\n" +
    "\n" +
    "            <!-- Custom Build Labels -->\n" +
    "            <h2 class=\"name\" ng-if=\"history.platform === 'custom'\">{{ history.build_name }}</h2>\n" +
    "\n" +
    "            <p class=\"version\" ng-show=\"history.version.project && history.platform !== 'custom'\">\n" +
    "              <i translate translate-context=\"version\">Project</i> v{{history.version.project}}\n" +
    "              <span ng-show=\"history.type === 'debugger'\"> / <i translate translate-context=\"version\">Debugger</i> v{{history.version.debugger}}</span>\n" +
    "            </p>\n" +
    "            <p class=\"version unknown\" ng-show=\"!history.version.project && history.platform !== 'custom'\" translate>Unknown Version</p>\n" +
    "\n" +
    "            <button ng-show=\"(history.platform !== 'custom') && history.is_download_active && (history.status === 'finish' || history.status === 'ios-publish-finish' || history.status === 'ios-publish-fail')\" type=\"button\" class=\"m-btn btn-detail\"\n" +
    "                    ng-click=\"build.showDetails(history)\" ng-disabled=\"!build.isBuildFinished(history.status)\" translate>See Details</button>\n" +
    "\n" +
    "            <button ng-show=\"(history.platform === 'custom') && (history.status === 'finish')\" type=\"button\" class=\"m-btn btn-detail\"\n" +
    "                    ng-click=\"build.showDetails(history)\" ng-disabled=\"!build.isBuildFinished(history.status)\" translate>See Details</button>\n" +
    "\n" +
    "            <button ng-show=\"history.status === 'fail'\" type=\"button\" class=\"m-btn btn-detail\" ng-click=\"build.showDetails(history)\" ng-disabled=\"!build.isBuildFinished(history.status)\" translate>See Details</button>\n" +
    "\n" +
    "            <button ng-show=\"history.status === 'fail' || ((history.status === 'finish' || history.status === 'ios-publish-finish' || history.status === 'ios-publish-fail') && history.is_download_active)\" type=\"button\" class=\"m-btn btn-detail\"\n" +
    "                    ng-click=\"build.downloadLog(history)\" ng-disabled=\"!build.isBuildFinished(history.status)\" translate>Download log</button>\n" +
    "\n" +
    "            <button ng-show=\"build.isBuildFinished(history.status)\" ng-click=\"build.onClickDelete(history.id)\" class=\"m-btn m-btn-alert btn-detail\" translate>Delete</button>\n" +
    "\n" +
    "          </div>\n" +
    "          <div class=\"timeSection\">\n" +
    "            <p class=\"waiting\" ng-show=\"history.status === 'new'\" translate>Preparing...</p>\n" +
    "            <p class=\"building\" ng-show=\"history.status === 'process'\" translate>Building...</p>\n" +
    "\n" +
    "            <p class=\"ellapsed\" ng-show=\"build.isBuildFinished(history.status)\" title=\"elapsed time\">{{history.ellapsed}}</p>\n" +
    "            <p class=\"finishedat\" ng-show=\"build.isBuildFinished(history.status)\" title=\"build finish time\">{{history.finishedAt}}</p>\n" +
    "            <p class=\"downloadexpire\" ng-class=\"{'has-expired':!history.is_download_active}\"  title=\"expiration date of download\"\n" +
    "                ng-show=\"(history.platform !== 'custom') && (history.status === 'finish' || history.status === 'ios-publish-finish' || history.status === 'ios-publish-fail') && history.download_expire_text\">\n" +
    "                {{history.download_expire_text}}</p>\n" +
    "            <div ng-if=\"!history.$editingComment\"\n" +
    "                class=\"one-line-memo-container\"\n" +
    "                ng-click=\"history.$editingComment = true\"\n" +
    "           >\n" +
    "              <i class=\"fa fa-fw fa-sticky-note note-icon\"></i>\n" +
    "              <span ng-show=\"history.comment\">{{ history.comment }}</span>\n" +
    "              <span ng-show=\"!history.comment\" translate>Click to add comment...</span>\n" +
    "            </div>\n" +
    "            <div ng-if=\"history.$editingComment\" class=\"one-line-memo-container editing\">\n" +
    "              <i class=\"fa fa-fw fa-sticky-note note-icon\"></i>\n" +
    "              <input type=\"text\"\n" +
    "                      placeholder=\"{{ 'Add comment...' | translate }}\"\n" +
    "                      ng-model=\"history.comment\"\n" +
    "                      ng-disabled=\"history.$pendingComment\"\n" +
    "                      ng-class=\"{error: history.$commentError}\"\n" +
    "              />\n" +
    "              <i ng-if=\"history.$commentError\" class=\"m-tooltip-body\" translate>\n" +
    "                <i class=\"fa fa-fw fa-exclamation-circle next-to-button\" style=\"color:red\"></i>\n" +
    "                <i class=\"m-tooltip tt-text-rightside\">{{ history.$commentError }}</i>\n" +
    "              </i>\n" +
    "              <button type=\"button\" class=\"m-btn m-btn-green\"\n" +
    "                      ng-click=\"updateComment(history)\"\n" +
    "                      ng-disabled=\"history.$pendingComment\"\n" +
    "              >\n" +
    "                {{ 'Save' | translate }}\n" +
    "                <i ng-show=\"history.$pendingComment\" class=\"fa fa-fw fa-spin fa-spinner ng-hide\"></i>\n" +
    "              </button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "\n" +
    "    <div class=\"\" ng-show=\"build.maxnum['all'] === 0 || build.maxnum[build.platform] === 0\" translate>No build history is found. Please start a new build.</div>\n" +
    "    <button type=\"button\" class=\"m-btn btn-readmore\" ng-show=\"build.hasMore()\" ng-click=\"build.fetchMoreHistory()\" translate>See More</button>\n" +
    "  </section>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/BuildResult.html",
    "<div ng-controller=\"BuildResultController\" ng-init=\"init()\" ng-style=\"!settings.hideSidebar && {'position': 'relative'}\">\n" +
    "    <div class=\"container buildResult-container\">\n" +
    "        <header class=\"m-header-caret balloon-line\">\n" +
    "            <div class=\"buildResultHeader-panel\">\n" +
    "                <div class=\"cell-build-panel margin-btm-clear\">\n" +
    "                    <div>\n" +
    "                        <h1 style=\"margin-bottom: 16px;\" translate>Build</h1>\n" +
    "                        <div ng-show=\"public_build_result_enabled\" style=\"\n" +
    "                            display: flex;\n" +
    "                            align-items: center;\n" +
    "                            justify-content: flex-end;\n" +
    "                            flex-wrap: wrap;\n" +
    "                            margin-bottom: 34px;\n" +
    "                        \">\n" +
    "                            <span\n" +
    "                                style=\"\n" +
    "                                    font-size: 14px;\n" +
    "                                    font-weight: 700;\n" +
    "                                \"\n" +
    "                                translate\n" +
    "                                >Share build result: </span\n" +
    "                            >\n" +
    "                            <input\n" +
    "                                ng-model=\"is_result_public\"\n" +
    "                                type=\"checkbox\"\n" +
    "                                style=\"margin: 0 0 0 5px;\"\n" +
    "                                ng-change=\"setIsResultPubliclyReadable()\"\n" +
    "                            >\n" +
    "                            <hr\n" +
    "                                style=\"\n" +
    "                                    margin: 0 0 5px;\n" +
    "                                    width: 100%;\n" +
    "                                    border: none;\n" +
    "                                \"\n" +
    "                            >\n" +
    "                            <div\n" +
    "                                ng-show=\"is_result_public\"\n" +
    "                                class=\"input-group\"\n" +
    "                            >\n" +
    "                                <input\n" +
    "                                    id=\"shared-build-result-url\"\n" +
    "                                    type=\"text\"\n" +
    "                                    class=\"form-control\"\n" +
    "                                    value=\"{{ sharedBuildResultUrl }}\"\n" +
    "                                    readonly\n" +
    "                                >\n" +
    "                                <span\n" +
    "                                    class=\"input-group-addon\"\n" +
    "                                    style=\"padding: 6px 12px; cursor: pointer;\"\n" +
    "                                    ng-click=\"copySharedBuildResultUrl()\"\n" +
    "                                >\n" +
    "                                    <i class=\"fa fa-copy\"></i>\n" +
    "                                </span>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <ul class=\"buildResultHeader-services\">\n" +
    "                        <li class=\"status-{{queue.status}}\">\n" +
    "                            <h2 class=\"name\">{{queue.label}}</h2>\n" +
    "                            <p ng-show=\"showProjectVersion\" class=\"version\" ng-show=\"queue.version.project\">\n" +
    "                                <i translate translate-context=\"version\">Project</i> v{{queue.version.project}}\n" +
    "                                <span ng-show=\"queue.type === 'debugger'\"> /\n" +
    "                                    <i translate translate-context=\"version\">Debugger</i> v{{queue.version.debugger}}</span>\n" +
    "                            </p>\n" +
    "                            <p ng-show=\"showProjectVersion && !queue.version.project\" class=\"version unknown\" translate>Unknown Version</p>\n" +
    "                            <p ng-show=\"!showProjectVersion\" class=\"version empty\"></p>\n" +
    "                            <p class=\"ellapsed\" ng-show=\"queue.finished_at\">{{queue.ellapsed}}</p>\n" +
    "                            <p class=\"createdat\" ng-show=\"queue.finished_at\">{{queue.finishedAtLabel}}</p>\n" +
    "                            <p class=\"waiting\" ng-show=\"queue.status === 'new'\" translate>Waiting... (Behind {{queue.queue_count}} queues)</p>\n" +
    "                            <p class=\"building\" ng-show=\"queue.status === 'process'\" translate>Building...</p>\n" +
    "                            <div ng-if=\"!memo.editing\"\n" +
    "                                 class=\"one-line-memo-container\"\n" +
    "                                 ng-click=\"memo.openEditor()\"\n" +
    "                            >\n" +
    "                                <i class=\"fa fa-fw fa-sticky-note note-icon\"></i>\n" +
    "                                <span ng-show=\"queue.comment\">{{ queue.comment }}</span>\n" +
    "                                <span ng-show=\"!queue.comment\" translate>Click to add comment...</span>\n" +
    "                            </div>\n" +
    "                            <div ng-if=\"memo.editing\" class=\"one-line-memo-container editing\">\n" +
    "                                <i class=\"fa fa-fw fa-sticky-note note-icon\"></i>\n" +
    "                                <input type=\"text\"\n" +
    "                                       placeholder=\"{{ 'Add comment...' | translate }}\"\n" +
    "                                       ng-model=\"memo.comment\"\n" +
    "                                       ng-disabled=\"memo.pending\"\n" +
    "                                       ng-class=\"{error: memo.error}\"\n" +
    "                                />\n" +
    "                                <i ng-if=\"memo.error\" class=\"m-tooltip-body\" translate>\n" +
    "                                    <i class=\"fa fa-fw fa-exclamation-circle next-to-button\" style=\"color:red\"></i>\n" +
    "                                    <i class=\"m-tooltip tt-text-rightside\">{{ memo.error }}</i>\n" +
    "                                </i>\n" +
    "                                <button type=\"button\" class=\"m-btn m-btn-green\"\n" +
    "                                        ng-click=\"memo.save()\"\n" +
    "                                        ng-disabled=\"memo.pending\"\n" +
    "                                >\n" +
    "                                    {{ 'Save' | translate }}\n" +
    "                                    <i ng-show=\"memo.pending\" class=\"fa fa-fw fa-spin fa-spinner ng-hide\"></i>\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </li>\n" +
    "                    </ul>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </header>\n" +
    "        <div class=\"buildResultContent-panel\">\n" +
    "            <div class=\"cell-build-panel\">\n" +
    "\n" +
    "                <div class=\"buildResultContent-summary\" ng-show=\"queue.status && queue.status !== 'new' && queue.status !== 'process' && queue.status !== 'uploading'\">\n" +
    "                    <div class=\"congratulations-panel\" ng-show=\"isSuccessBuild(queue.status)\">\n" +
    "                        <legend class=\"border-none\">\n" +
    "                            <div>\n" +
    "                                <h2 class=\"build-success-title\" translate>Congratulations!</h2>\n" +
    "                            </div>\n" +
    "                        </legend>\n" +
    "                        <div class=\"config-section-panel\">\n" +
    "                            <p class=\"build-success-text\" ng-show=\"isGeneric\" translate>Your build is successfully finished. Please click <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a> to see the build log. </p>\n" +
    "                            <p class=\"build-success-text\" ng-show=\"!isGeneric && queue.status === 'ios-publish-finish'\" translate>We have uploaded your application to App Store Connect.\n" +
    "                            <p class=\"build-success-text\" ng-show=\"!isGeneric && queue.type !== 'inapp_updater' && shouldShowBuildLog()\" translate>Your build is successfully finished. Please download and install the app on the device. Please click <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a> to see the build log. </p>\n" +
    "                            <p class=\"build-success-text\" ng-show=\"!isGeneric && queue.type === 'inapp_updater'\" translate>The package is zipped and ready for distribution. For more details, please refer to the\n" +
    "                                <a ng-href=\"{{ docsUrl.inapp_updater }}\" target=\"_blank\">docs</a>.\n" +
    "                                <br> Please deploy the file to the Web server. Build log can be obtained from\n" +
    "                                <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a>.\n" +
    "                                </p>\n" +
    "                            <p class=\"build-success-text\" ng-hide=\"queue.status === 'ios-publish-finish' || isGeneric || queue.type === 'inapp_updater' || queue.platform === 'pwa' || queue.platform === 'electron_macos' || queue.platform === 'electron_linux' || queue.platform === 'electron_windows'\" style=\"color: #a42d2d;\" translate>A successful build does not guarantee that your application will pass the regulation tests for\n" +
    "                                uploading on an app store.</p>\n" +
    "                            <p class=\"build-success-text\" ng-show=\"queue.status === 'ios-publish-finish'\" style=\"color: #a42d2d;\" translate>Please visit App Store Connect and verify that your application is ready for submission.</p>\n" +
    "                            <div ng-hide=\"isGeneric\">\n" +
    "                                <ul class=\"m-selectBoxs downloads\">\n" +
    "                                    <li class=\"service-download\" ng-show=\"queue.binary_url\">\n" +
    "                                        <a href=\"{{queue.binary_url}}\">\n" +
    "                                            <div>\n" +
    "                                                <figure>\n" +
    "                                                    <img src=\"/img/build/btn_pc.png\" alt=\"Download to Local PC\" width=\"220\" height=\"126\">\n" +
    "                                                </figure>\n" +
    "                                                <h3>\n" +
    "                                                    <i translate>Download to Local PC</i>\n" +
    "                                                </h3>\n" +
    "                                            </div>\n" +
    "                                        </a>\n" +
    "                                    </li>\n" +
    "                                    <li class=\"service-qrcode\" ng-show=\"canShowQrCodeUrl && qrCodeUrl\">\n" +
    "                                        <div>\n" +
    "                                            <a ng-click=\"openQRCodeDialog()\" href=\"#\">\n" +
    "                                                <figure>\n" +
    "                                                    <img ng-src=\"{{qrCodeUrl}}\" alt=\"QR Code\" width=\"120\" height=\"120\">\n" +
    "                                                </figure>\n" +
    "                                            </a>\n" +
    "                                            <h3><i translate>Install via<br>QR code</i></h3>\n" +
    "                                            <div ng-hide=\"!canShowQrCodeUrl || !qrCodeUrl || isGeneric\"\n" +
    "                                                 style=\"display: flex; align-items: center; justify-content: center; margin-top: 15px;\">\n" +
    "                                                <label style=\"font-size: 11px;\" translate>Set download authentication</label>\n" +
    "                                                <input type=\"checkbox\" style=\"margin: 0 3px;\" ng-change=\"setIsPubliclyDownloadable()\" ng-model=\"is_private\"/>\n" +
    "                                            </div>\n" +
    "                                        </div>\n" +
    "                                    </li>\n" +
    "                                    <li class=\"service-notification\" ng-show=\"showSendAppIcon\">\n" +
    "                                        <a ng-click=\"openSendAppDialog()\" href=\"#\">\n" +
    "                                            <div>\n" +
    "                                                <figure>\n" +
    "                                                    <img src=\"/img/build/btn_mail.png\" alt=\"Send install information to registered email address\" width=\"220\" height=\"126\">\n" +
    "                                                </figure>\n" +
    "                                                <h3>\n" +
    "                                                    <i translate>Notify registered e-mail address of installation method.</i>\n" +
    "                                                </h3>\n" +
    "                                            </div>\n" +
    "                                        </a>\n" +
    "                                    </li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "\n" +
    "                        <legend ng-hide=\"isGeneric || queue.platform === 'electron_macos' || queue.platform === 'electron_linux' || queue.platform === 'electron_windows'\">\n" +
    "                            <div>\n" +
    "                                <h2 translate>Deployment &amp; Optional Services</h2>\n" +
    "                            </div>\n" +
    "                        </legend>\n" +
    "                        <div ng-hide=\"isGeneric || queue.platform === 'electron_macos' || queue.platform === 'electron_linux' || queue.platform === 'electron_windows'\" class=\"config-section-panel buildResultContent-external\">\n" +
    "                            <p translate>External service API tokens can be saved, according to the deployment method used (Monaca-provided\n" +
    "                                upload to App Store Connect or deploy service settings). These deployment services can be accessed\n" +
    "                                from various Monaca functions.</p>\n" +
    "\n" +
    "                            <div ng-show=\"errorMessage\">\n" +
    "                                <p style=\"color: #a42d2d;\">{{ errorMessage }}</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div>\n" +
    "                                <ul class=\"m-selectBoxs deployServices\">\n" +
    "\n" +
    "                                    <li ng-show=\"showIosAppUploader\" class=\"status-loading service-appStore\">\n" +
    "                                        <a href=\"#\" ng-click=\"openUploaderWindow()\">\n" +
    "                                            <div class=\"selectBox-loading unLoading\">\n" +
    "                                                <img ng-src=\"{{'/img/size32/icon_loading_black.gif'}}\">\n" +
    "                                            </div>\n" +
    "                                            <div>\n" +
    "                                                <div class=\"status-result\"></div>\n" +
    "                                                <figure>\n" +
    "                                                    <img src=\"/img/build/icon_appstore.png\">\n" +
    "                                                </figure>\n" +
    "                                                <h3>\n" +
    "                                                    <i>AppStore</i>\n" +
    "                                                    <small></small>\n" +
    "                                                </h3>\n" +
    "                                            </div>\n" +
    "                                        </a>\n" +
    "                                    </li>\n" +
    "\n" +
    "                                    <li ng-show=\"showAndroidAppUploader\" class=\"status-loading service-playStore\">\n" +
    "                                        <a href=\"#\" ng-click=\"openAndroidUploaderWindow()\">\n" +
    "                                            <div class=\"selectBox-loading unLoading\">\n" +
    "                                                <img src=\"/img/size32/icon_loading_black.gif\" alt=\"Loading icon\" />\n" +
    "                                            </div>\n" +
    "                                            <div>\n" +
    "                                                <div class=\"status-result\"></div>\n" +
    "                                                <figure>\n" +
    "                                                    <img src=\"/img/build/icon_playstore.png\" alt=\"Google Play Store icon\" />\n" +
    "                                                </figure>\n" +
    "                                                <h3>\n" +
    "                                                    <i translate>Upload to Play Store</i>\n" +
    "                                                    <small></small>\n" +
    "                                                </h3>\n" +
    "                                            </div>\n" +
    "                                        </a>\n" +
    "                                    </li>\n" +
    "\n" +
    "                                    <li ng-repeat=\"service in DeployServiceFactory.ownedCollection | filter: deployServiceCustomFilter\" ng-class=\"{'status-process': service.manualProcessStatus === 'process','status-finish': service.manualProcessStatus === 'finish','status-fail': service.manualProcessStatus === 'failed'}\"\n" +
    "                                        ng-click=\"sendToDeployService(service)\">\n" +
    "                                        <div class=\"selectBox-loading\" ng-show=\"service.manualProcessStatus === 'process'\">\n" +
    "                                            <img ng-src=\"{{'/img/size32/icon_loading_black.gif' }}\">\n" +
    "                                        </div>\n" +
    "                                        <div>\n" +
    "                                            <div class=\"status-result\">\n" +
    "                                                <small ng-show=\"service.manualProcessStatus === 'failed'\">\n" +
    "                                                    <a href=\"#\" ng-click=\"openDeployLogs($event, service)\" translate>View Details</a>\n" +
    "                                                </small>\n" +
    "                                            </div>\n" +
    "                                            <figure>\n" +
    "                                                <img ng-src=\"{{convertServiceLargeImgToSmall(service.app_logo)}}\">\n" +
    "                                            </figure>\n" +
    "                                            <h3>\n" +
    "                                                <small>\n" +
    "                                                    <div>\n" +
    "                                                        <span class=\"m-label m-label-gray\" translate>ALIAS</span> {{service.alias}}\n" +
    "                                                    </div>\n" +
    "                                                </small>\n" +
    "                                            </h3>\n" +
    "                                        </div>\n" +
    "                                    </li>\n" +
    "                                    <li class=\"status-loading service-appStore\" ng-show=\"showSecurityService\" ng-click=\"sendToApkCheckerService()\">\n" +
    "                                        <a href=\"#\">\n" +
    "                                            <div class=\"selectBox-loading unLoading\">\n" +
    "                                                <img ng-src=\"{{'/img/size32/icon_loading_black.gif'}}\">\n" +
    "                                            </div>\n" +
    "                                            <div>\n" +
    "                                                <div class=\"status-result\"></div>\n" +
    "                                                <figure>\n" +
    "                                                    <img src=\"/img/build/icon_security.png\" style=\"margin:-40px 0 0 16px;\">\n" +
    "                                                </figure>\n" +
    "                                                <h3>\n" +
    "                                                    <i translate>Use Secure Coding Checker</i>\n" +
    "                                                    <small></small>\n" +
    "                                                </h3>\n" +
    "                                            </div>\n" +
    "                                        </a>\n" +
    "                                    </li>\n" +
    "                                    <li\n" +
    "                                        ng-repeat=\"service in deployServices | filter: deployServiceCustomFilter | filter: ownedDeployServiceFilter\"\n" +
    "                                        ng-click=\"addNewDeployService(service)\"\n" +
    "                                    >\n" +
    "                                        <div>\n" +
    "                                            <div class=\"status-result\">\n" +
    "                                            </div>\n" +
    "                                            <figure>\n" +
    "                                                <img ng-src=\"{{convertServiceLargeImgToSmall(service.app_logo)}}\">\n" +
    "                                            </figure>\n" +
    "                                            <h3>\n" +
    "                                                <small>\n" +
    "                                                    <div>\n" +
    "                                                        <i translate>Add {{service.name}}</i>\n" +
    "                                                    </div>\n" +
    "                                                </small>\n" +
    "                                            </h3>\n" +
    "                                        </div>\n" +
    "                                    </li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"config-section-panel\" ng-show=\"queue.status === 'ios-publish-fail' && !queue.binary_url\">\n" +
    "                        <br />\n" +
    "                        <br />\n" +
    "                        <p class=\"build-success-text\" translate>You can download the built package from ios release build below.</p>\n" +
    "                        <ul class=\"m-selectBoxs downloads\">\n" +
    "                            <li class=\"service-download\">\n" +
    "                                <a href=\"{{queue.binary_url}}\">\n" +
    "                                    <div>\n" +
    "                                        <figure>\n" +
    "                                            <img src=\"/img/build/btn_pc.png\" alt=\"Download to Local PC\" width=\"220\" height=\"126\">\n" +
    "                                        </figure>\n" +
    "                                        <h3>\n" +
    "                                            <i translate>Download to Local PC</i>\n" +
    "                                        </h3>\n" +
    "                                    </div>\n" +
    "                                </a>\n" +
    "                            </li>\n" +
    "                        </ul>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"box-errorarea\" ng-show=\"queue && queue.status != 'finish' && buildResult.error_message\">\n" +
    "                        <p translate>App build is failed. Your app cannot be built. Please make sure following settings are properly setup:</p>\n" +
    "                        <div class=\"box-errorCheckPoint\">\n" +
    "                            <ul>\n" +
    "                                <li ng-bind-html=\"getBuildResultErrorMessage(buildResult.error_message)\"></li>\n" +
    "                            </ul>\n" +
    "                        </div>\n" +
    "                        <p translate>After correcting errors, please build again.</p>\n" +
    "                        <p style=\"margin-top: 15px;\" translate>Need technical support? <a ng-href=\"{{supportLink}}\" target=\"_blank\">Contact us.</a></p>\n" +
    "                    </div>\n" +
    "                    <div class=\"box-errorarea\" ng-show=\"queue && buildResult.status === 'ios-publish-fail' && buildResult.ios_publish_error_message\">\n" +
    "                        <p translate>We attempted to submit your application to App Store Connect, but had failed due to the following reason:</p>\n" +
    "                        <div class=\"box-errorCheckPoint\">\n" +
    "                            <ul>\n" +
    "                                <li ng-bind-html=\"getBuildResultErrorMessage(buildResult.ios_publish_error_message)\"></li>\n" +
    "                            </ul>\n" +
    "                        </div>\n" +
    "                        <p translate>Please correct the issue described above and try again. Click <a href=\"#\" ng-click=\"openUploaderWindow()\">here</a> to try uploading again</p>\n" +
    "                        <p style=\"margin-top: 15px;\" translate>Need technical support? <a ng-href=\"{{supportLink}}\" target=\"_blank\">Contact us.</a></p>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <!-- Each build task result -->\n" +
    "                <div class=\"buildResultContent-buildtasks\" ng-show=\"isGeneric && (queue.status && queue.status !== 'new' && queue.status !== 'process')\">\n" +
    "                    <legend>\n" +
    "                        <div>\n" +
    "                            <h2 translate>Build Task Result</h2>\n" +
    "                        </div>\n" +
    "                    </legend>\n" +
    "                    <ul class=\"buildResultContent-services\">\n" +
    "                        <li ng-hide=\"buildTaskResults.length > 0\">\n" +
    "                            <div class=\"buildResultContent-buildtaskheader status-process\">\n" +
    "                                <h2 class=\"name\">Loading...</h2>\n" +
    "                            </div>\n" +
    "                        </li>\n" +
    "                        <li ng-repeat=\"buildTaskResult in buildTaskResults\">\n" +
    "                            <div class=\"buildResultContent-buildtaskheader status-{{queue.status}}\">\n" +
    "                                <h2 class=\"name\">{{buildTaskResult.name}}</h2>\n" +
    "                            </div>\n" +
    "                            <div class=\"buildResultContent-buildtaskcontent\" ng-show=\"buildTaskResult.artifact\" style=\"border: 1px solid #ddd;border-top: none;padding: 20px;color: #333;\">\n" +
    "                                <!--\n" +
    "                                <div>\n" +
    "                                    <span style=\"cursor: pointer;\">▶︎ Logs</span>\n" +
    "                                    <div></div>\n" +
    "                                </div>\n" +
    "                                -->\n" +
    "                                <div ng-show=\"buildTaskResult.artifact\">\n" +
    "                                    <!-- <hr style=\"margin-left: -20px;margin-right: -20px;\"> -->\n" +
    "                                    <span ng-click=\"toggleArtifacts(buildTaskResult.task_id)\" style=\"cursor: pointer;\">{{showArtifacts[buildTaskResult.task_id] ? '▼' : '▶'}} Artifacts</span> (<a ng-href=\"{{buildTaskResult.parsed.artifactServerOrigin}}/artifacts.zip\">Download All</a>)\n" +
    "                                    <div ng-show=\"showArtifacts[buildTaskResult.task_id]\">\n" +
    "                                        <ul style=\"list-style-type: disc; margin-left: 40px; margin: 0 0 0 40px; min-height: unset; margin: 12px 0 6px 20px;\">\n" +
    "                                            <li ng-repeat=\"path in buildTaskResult.parsed.artifactStructure\" style=\"list-style-type: disc; margin: 0 0 0 40px; min-height: unset; margin: 6px 0 6px 20px; background: none; border: 0; padding: unset;\">\n" +
    "                                                <a ng-href=\"{{buildTaskResult.parsed.artifactServerOrigin}}/{{path}}\" target=\"_blank\" rel=\"noopener\">{{path}}</a>\n" +
    "                                            </li>\n" +
    "                                        </ul>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div ng-show=\"buildTaskResult.artifact && buildTaskResult.parsed.outputFliePath != '' && buildTaskResult.parsed.outputFliePath != 'index.html'\">\n" +
    "                                    <hr style=\"margin-left: -20px;margin-right: -20px;\">\n" +
    "                                    <span ng-click=\"toggleReport(buildTaskResult.task_id)\" style=\"cursor: pointer;\">{{showReport[buildTaskResult.task_id] ? '▼' : '▶'}} Report: <code>{{buildTaskResult.parsed.outputFliePath}}</code></span>\n" +
    "                                    <div style=\"font-size: 16px;margin: 16px 8px 8px 8px;border: 1px solid #ccc;padding: 16px;/* height: 80px; */\"\n" +
    "                                        ng-show=\"buildTaskResult.parsed.outputFliePath != '' && showReport[buildTaskResult.task_id]\">\n" +
    "                                        <iframe class=\"build-task-iframe\" title=\"{{buildTaskResult.name}}\"\n" +
    "                                            ng-src=\"{{trustAsResourceUrl(buildTaskResult.artifact)}}\">\n" +
    "                                            <p translate>Your browser does not support iframes.</p>\n" +
    "                                        </iframe>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <!--\n" +
    "                                <div>\n" +
    "                                    <hr style=\"margin-left: -20px;margin-right: -20px;\">\n" +
    "                                    <span ng-click=\"toggleAggregateReport(buildTaskResult.task_id)\" style=\"cursor: pointer;\">{{showAggregateReport[buildTaskResult.task_id] ? '▼' : '▶'}} Aggregate Report</span>\n" +
    "                                    <div style=\"font-size: 16px;margin: 16px 8px 8px 8px;border: 1px solid #ccc;padding: 16px;/* height: 80px; */\"\n" +
    "                                        ng-show=\"buildTaskResult.artifact && showAggregateReport[buildTaskResult.task_id]\">\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                -->\n" +
    "                            </div>\n" +
    "                        </li>\n" +
    "                    </ul>\n" +
    "                </div>\n" +
    "\n" +
    "                <!-- Publish Build <-> Release build relation -->\n" +
    "                <div class=\"buildResultHeader-panel\" ng-if=\"shouldShowBuildQueueRelation()\">\n" +
    "                    <div class=\"cell-build-panel margin-btm-clear\">\n" +
    "                        <div>\n" +
    "                            <h1 style=\"margin-bottom: 16px;\" translate>{{getQueueRelationTitle(queue)}}</h1>\n" +
    "                        </div>\n" +
    "                        <ul ng-click=\"openBuild(q)\" ng-repeat=\"q in getBuildQueueRelations(queue)\" class=\"buildResultHeader-services\">\n" +
    "                            <li class=\"status-{{q.status}} hoverBox\">\n" +
    "                                <h2 class=\"name\">{{getLabel(q)}}</h2>\n" +
    "                                <p class=\"ellapsed\" ng-show=\"q.finished_at\">{{getEllapsed(q)}}</p>\n" +
    "                                <p class=\"createdat\" ng-show=\"q.finished_at\">{{getCreatedAt(q)}}</p>\n" +
    "                                <p class=\"one-line-memo-container\" style=\"padding-top: 25px;\">\n" +
    "                                    <i class=\"fa fa-fw fa-sticky-note note-icon\"></i>\n" +
    "                                    <span ng-show=\"q.comment\">{{ q.comment }}</span>\n" +
    "                                    <span ng-show=\"!q.comment\" translate>No comment</span>\n" +
    "                                </p>\n" +
    "                            </li>\n" +
    "                        </ul>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <!-- Build Log -->\n" +
    "                <div id=\"build-log-area-{{rawQueueId}}\" class=\"buildResultContent-buildlogarea\" ng-show=\"shouldShowBuildLog() && (showBuildLog || (queue && queue.status !== 'finish'))\">\n" +
    "                    <div class=\"buildResultContent-buildlogarea-header\">\n" +
    "                        <h2 translate>Build Log</h2>\n" +
    "                        <a href=\"{{queue.build_log_url}}\" ng-show=\"showBuildLog || (queue && queue.status === 'fail')\" translate>Download log</a>\n" +
    "                    </div>\n" +
    "                    <span class=\"config-warning\">\n" +
    "                        <span ng-show=\"isCordova && cordovaVersion < 6 && queue.status === 'process'\" translate>Cordova5 projects and below will not display a realtime log.</span>\n" +
    "                        <span ng-show=\"isReactNative\" translate>React Native realtime build log may be temporary unavailable.</span>\n" +
    "                    </span>\n" +
    "                    <div class=\"build-log\" show-tail>\n" +
    "                        <div ng-repeat=\"line in buildLogLines\" class=\"line {{ line.className }}\">{{ line.text || '&nbsp;' }}</div>\n" +
    "                    </div>\n" +
    "                    <div class=\"buildResultContent-buildlogarea-header\" ng-show=\"canDownloadDsym\">\n" +
    "                        <h2>dSYM</h2>\n" +
    "                        <a href=\"{{queue.dsym_url}}\" translate>Download dSYM file</a>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <!-- Publish Log -->\n" +
    "                <div id=\"build-publish-log-area-{{rawQueueId}}\" class=\"buildResultContent-buildlogarea\" ng-show=\"shouldShowPublishLog()\">\n" +
    "                    <div class=\"buildResultContent-buildlogarea-header\">\n" +
    "                        <h2 translate>Publish Log</h2>\n" +
    "                    </div>\n" +
    "                    <div class=\"build-log\" show-tail>\n" +
    "                        <div ng-repeat=\"line in publishLogLines\" class=\"line {{ line.className }}\">{{ line.text || '&nbsp;' }}</div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/BuildUpgradeConfirmDialog.html",
    "<div class=\"modal-header\" translate>Plan Upgrade Required</div>\n" +
    "<div class=\"modal-body\">\n" +
    "  <p style=\"margin-bottom: 0;\" translate>You can view up to 3 records for each platform.<br />Please upgrade your account to see the full history.</p>\n" +
    "</div>\n" +
    "<div class=\"modal-footer\">\n" +
    "  <a href=\"https://monaca.mobi/pricing\" target=\"_blank\" class=\"m-btn m-btn-blue\" translate>Upgrade</a>\n" +
    "  <a href=\"#\" class=\"m-btn m-btn-default\" ng-click=\"cancel();\" translate>Close</a>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CIHistory.html",
    "<div ng-controller=\"CIHistoryController as ci\" class=\"m-page-settings ci-history\">\n" +
    "  <header class=\"m-header-caret\">\n" +
    "    <h1 translate>Continuous Integration History</h1>\n" +
    "  </header>\n" +
    "\n" +
    "  <section>\n" +
    "    <ul class=\"m-list-status m-list-status-icon\">\n" +
    "      <li ng-repeat=\"history in ci.historyCollection\" class=\"status-{{history.status}}\">\n" +
    "        <h2 class=\"name\" translate>Status: {{history.status}}</h2>\n" +
    "        <div class=\"timestamp\">\n" +
    "          <p class=\"ellapsed\" ng-show=\"ci.isProcessEnded(history.status)\">{{history.updated_at}}</p>\n" +
    "          <p class=\"createdate\" ng-show=\"ci.isProcessEnded(history.status)\">{{history.created_at}}</p>\n" +
    "          <p class=\"waiting\" ng-show=\"history.status === 'new'\" translate>Preparing...</p>\n" +
    "          <p class=\"building\" ng-show=\"history.status === 'process'\" translate>Building...</p>\n" +
    "        </div>\n" +
    "        <div class=\"build-log-container\" ng-show=\"ci.isProcessEnded(history.status)\">\n" +
    "          <p ng-repeat=\"log in history.build_logs\" ng-click=\"ci.showBuildLog(log.build_queue_url_id)\" class=\"build-log\">{{log.build_queue_name}}</p>\n" +
    "        </div>\n" +
    "        <div class=\"log-action-control\">\n" +
    "          <button type=\"button\" class=\"m-btn\" ng-show=\"ci.isProcessEnded(history.status)\" ng-click=\"ci.showLog(history)\" translate>Show Logs</button>\n" +
    "        </div>\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "    <div class=\"\" ng-show=\"ci.historyCollection.length === 0\" translate>There is no continuous integration history available.</div>\n" +
    "    <div class=\"history-action-control\">\n" +
    "      <button type=\"button\" class=\"m-btn\" ng-show=\"ci.hasMore()\" ng-click=\"ci.fetchMoreHistory()\" translate>See More</button>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/ContinuousIntegration.html",
    "<div ng-controller=\"ContinuousIntegrationController\" class=\"m-page-settings backend-service\">\n" +
    "  <!-- Loading -->\n" +
    "  <div ng-show=\"loading\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <header class=\"m-header-caret balloon-line\">\n" +
    "      <h1 translate>Continuous Integration</h1>\n" +
    "      <p style=\"margin-top: -32px; margin-bottom: 40px; margin-left: 16px;\" translate>\n" +
    "        Automates build and deployment cycle.\n" +
    "      </p>\n" +
    "\n" +
    "      <div ng-show=\"!loading && !error\" style=\"padding: 0 16px;\">\n" +
    "        <div ng-show=\"ciResponse.ci_tickets.usable === 0\" class=\"ci-depleted-notice\">\n" +
    "          <p class=\"m-text-alert\">\n" +
    "            <span class=\"ico-exclamation\">\n" +
    "              <img src=\"img/integration/0-ico-exclamation.png\" />\n" +
    "            </span>\n" +
    "            <span translate>The number of available continuous integration tickets has been depleted. To continue this service, please purchase\n" +
    "              additional CI tickets.</span>\n" +
    "          </p>\n" +
    "          <!--\n" +
    "              <button ng-click=\"planDetails()\" class=\"m-btn m-btn-default\" translate>View Plan Details</button>\n" +
    "              <button ng-click=\"upgradePlan()\" class=\"m-btn m-btn-blue\" translate>Upgrade</button>\n" +
    "              -->\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"m-container half display-grid\">\n" +
    "          <div class=\"title\">\n" +
    "            <div translate>{{ciResponse.project_vcs.service_type}} Account</div>\n" +
    "          </div>\n" +
    "          <div ng-show=\"ciResponse.project_vcs.username && ciResponse.project_vcs.email\">\n" +
    "            <div>{{ciResponse.project_vcs.username}}</div>\n" +
    "            <div>{{ciResponse.project_vcs.email}}</div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <div class=\"m-container half display-grid\">\n" +
    "          <div class=\"title\">\n" +
    "            <div translate>Available Tickets</div>\n" +
    "            <div>\n" +
    "              <button ng-click=\"planDetails()\" class=\"m-btn m-btn-default-dark\" translate>Plan Details</button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div ng-class=\"{'m-text-alert': ciResponse.ci_tickets.usable === 0}\">\n" +
    "            <div>\n" +
    "              <div class=\"m-container-table\">\n" +
    "                <div translate>CI Tickets: </div>\n" +
    "                <div translate>{{ciResponse.ci_tickets.usable}}/{{ciResponse.ci_tickets.total}} (Complimentary : {{ciResponse.ci_tickets.total_complimentary}})</div>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </header>\n" +
    "\n" +
    "    <main>\n" +
    "      <section ng-show=\"!loading && !error && ciResponse.project_vcs.username && ciResponse.project_vcs.email\" class=\"bottom-border\">\n" +
    "        <h2 translate>\n" +
    "          CI Configs\n" +
    "          <input type=\"button\" value=\"Create New\" class=\"m-btn m-btn-green\" style=\"margin-left: 20px;\" ng-click=\"openCiConfig()\" />\n" +
    "        </h2>\n" +
    "\n" +
    "        <table class=\"common-table\">\n" +
    "          <thead>\n" +
    "            <tr>\n" +
    "              <th translate>Name</th>\n" +
    "              <th translate>Branch / Tag</th>\n" +
    "              <th translate>Triggers</th>\n" +
    "              <th translate>Framework</th>\n" +
    "              <th translate>Platforms</th>\n" +
    "              <th translate>Builds</th>\n" +
    "              <th translate>Deployments</th>\n" +
    "              <th class=\"shrink\"></th>\n" +
    "            </tr>\n" +
    "          </thead>\n" +
    "          <tbody>\n" +
    "            <tr ng-repeat=\"ciConfig in ciResponse.config\"><!-- [Caution] ciResponse.config is an array -->\n" +
    "              <td>{{ciConfig.task_name}}</td>\n" +
    "              <td>\n" +
    "                <div ng-if=\"ciConfig.branch != null && ciConfig.tag == null\">\n" +
    "                  <code style=\"margin-right: 6px;\">{{ciConfig.branch}}</code>branch\n" +
    "                </div>\n" +
    "                <div ng-if=\"ciConfig.branch == null && ciConfig.tag != null\">\n" +
    "                  <code style=\"margin-right: 6px;\">{{ciConfig.tag}}</code>tag\n" +
    "                </div>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <div>Git Push ({{ciConfig.triggers.indexOf('push') != -1 ? 'Enabled' : 'Disabled'}})</div>\n" +
    "                <div ng-show=\"EnvironmentFactory.service.ci_service_api_access || false\">API Access ({{ciConfig.triggers.indexOf('api') != -1 ? 'Enabled' : 'Disabled'}})</div>\n" +
    "                <div\n" +
    "                  ng-show=\"(EnvironmentFactory.service.ci_service_api_access || false) && ciConfig.triggers.indexOf('api') != -1\"\n" +
    "                >\n" +
    "                    <input\n" +
    "                      type=\"text\"\n" +
    "                      class=\"form-control\"\n" +
    "                      style=\"width: 265px; height: 26px; font-size: 9pt; padding: 0 8px; border-radius: 4px; margin-left: 8px;\"\n" +
    "                      value=\"{{getTriggerApiUrl(ciConfig)}}\"\n" +
    "                      readonly\n" +
    "                    >\n" +
    "                </div>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <span ng-switch=\"ProjectFactory.getFramework()\">\n" +
    "                  <span ng-switch-when=\"cordova\">\n" +
    "                    Cordova {{ProjectFactory.getCordovaVersion()}}\n" +
    "                  </span>\n" +
    "                  <span ng-switch-when=\"react-native\">\n" +
    "                    React Native\n" +
    "                  </span>\n" +
    "                  <span ng-switch-when=\"generic\">\n" +
    "                    Generic\n" +
    "                  </span>\n" +
    "                  <span ng-switch-default>\n" +
    "                    Unknown\n" +
    "                  </span>\n" +
    "                </span>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <div ng-repeat=\"p in ciConfig.platform\">{{p}}</div><!-- [Caution] platform is an array -->\n" +
    "                  <div ng-if=\"ciConfig.platform.length === 0\">(none)</div>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <div ng-repeat=\"b in ciConfig.build\">{{b}}</div><!-- [Caution] build is an array -->\n" +
    "                <div ng-if=\"ciConfig.build == null || ciConfig.build.length === 0\">(none)</div>\n" +
    "              </td>\n" +
    "              <td>\n" +
    "                <div ng-repeat=\"d in ciConfig.deploy\">{{d.alias}} ({{d.type}})</div><!-- [Caution] deploy is an array -->\n" +
    "                <div ng-if=\"ciConfig.deploy == null || ciConfig.deploy.length === 0\">(none)</div>\n" +
    "              </td>\n" +
    "              <td class=\"shrink\" translate><input type=\"button\" value=\"Edit\" class=\"m-btn\" ng-click=\"openCiConfig(ciConfig)\" /></td>\n" +
    "            </tr>\n" +
    "          </tbody>\n" +
    "        </table>\n" +
    "      </section>\n" +
    "\n" +
    "      <!--Error Containers-->\n" +
    "      <section ng-show=\"!loading && error === 'accessDenied'\" class=\"error-container\">\n" +
    "        <div class=\"error-message-container\">\n" +
    "        <div class=\"error-icon\"><img src=\"/img/services/0-ico-exclamation.png\" /></div>\n" +
    "        <div class=\"error-message\" translate>Sorry, only the owner of the project can change this setting.</div>\n" +
    "        </div>\n" +
    "      </section>\n" +
    "      <section ng-show=\"!loading && error === 'unsupportedCordovaVersion'\" class=\"error-container\">\n" +
    "        <div class=\"error-message-container\">\n" +
    "          <div class=\"error-icon\">\n" +
    "            <img src=\"img/integration/0-ico-exclamation.png\" />\n" +
    "          </div>\n" +
    "          <div class=\"error-message\" translate>This project does not meet the minimum Cordova version requirement to use this feature.\n" +
    "            <br>To use this feature, please upgrade your project's Cordova version in the\n" +
    "            <a href=\"#\" ng-click=\"setPage(settings.Constant.PAGE_CORDOVA_PLUGINS)\">Cordova Plugins page</a>.</div>\n" +
    "        </div>\n" +
    "      </section>\n" +
    "      <section ng-show=\"!loading && error === 'missingAccountGitHub'\" class=\"error-container\">\n" +
    "        <div class=\"error-message-container\">\n" +
    "          <div class=\"error-icon\">\n" +
    "            <img src=\"img/integration/0-ico-exclamation.png\" />\n" +
    "          </div>\n" +
    "          <div class=\"error-message\" translate>The Continuous Integration service is currently not available with your existing account settings.\n" +
    "            <br>To use this service, please link your Monaca account with a {{ciResponse.project_vcs.service_type}} account.</div>\n" +
    "          <div translate>You can link your {{ciResponse.project_vcs.service_type}} account at the\n" +
    "            <a ng-click=\"configureVcs()\">Link {{ciResponse.project_vcs.service_type}} Account</a> account settings page.</div>\n" +
    "        </div>\n" +
    "        <button ng-click=\"configureVcs()\" class=\"m-btn m-btn-green m-btn-large\" translate>Link {{ciResponse.project_vcs.service_type}} Account</button>\n" +
    "      </section>\n" +
    "      <section ng-show=\"!loading && error === 'missingProjectGitHub'\" class=\"error-container\">\n" +
    "        <div class=\"error-message-container\">\n" +
    "          <div class=\"error-icon\">\n" +
    "            <img src=\"img/integration/0-ico-exclamation.png\" />\n" +
    "          </div>\n" +
    "          <div class=\"error-message\" translate>This project is currently not configured properly to use the Continuous Integration service.\n" +
    "            <br>To use this service, please link this project with a {{ciResponse.project_vcs.service_type}} repository from the Monaca\n" +
    "            IDE Version Control Configuration page.</div>\n" +
    "          <div translate>Please see\n" +
    "            <a ng-click=\"openSetupVcsDoc()\">Monaca documentation</a> for support on how to configure your project with VCS.</div>\n" +
    "        </div>\n" +
    "        <button ng-click=\"openSetupVcsDoc()\" class=\"m-btn m-btn-green m-btn-large\" translate>How to Configure VCS</button>\n" +
    "      </section>\n" +
    "    </main>\n" +
    "  </div>\n" +
    "</div>");
  $templateCache.put("build/ContinuousIntegrationConfigDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>{{configDialogCtrl.title}}</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-if=\"configDialogCtrl.isLoading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-if=\"!configDialogCtrl.isLoading\">\n" +
    "  <div ng-if=\"!configDialogCtrl.shouldShowJsonEditor\">\n" +
    "    <table>\n" +
    "      <tbody>\n" +
    "        <tr>\n" +
    "          <td translate>Name</td>\n" +
    "          <td translate class=\"suppress-duplicate-input\">\n" +
    "            <input type=\"text\" id=\"name\" name=\"name\" class=\"form-control\" ng-model=\"configDialogCtrl.newCiConfig.task_name\" />\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td translate>Branch / Tag</td>\n" +
    "          <td translate class=\"suppress-duplicate-input\">\n" +
    "            <div style=\"display: flex; flex-flow: row nowrap;\">\n" +
    "                <select ng-model=\"configDialogCtrl.branchOrTag\" class=\"form-control\" style=\"width: 150px; margin-right: 8px;\">\n" +
    "                <option value=\"branch\" translate>Branch</option>\n" +
    "                <option value=\"tag\" translate>Tag</option>\n" +
    "              </select>\n" +
    "              <input type=\"text\" class=\"form-control\"\n" +
    "                placeholder=\"/master/ (Example)\"\n" +
    "                ng-if=\"configDialogCtrl.branchOrTag === 'branch'\"\n" +
    "                ng-model=\"configDialogCtrl.newCiConfig.branch\"\n" +
    "              />\n" +
    "              <input type=\"text\" class=\"form-control\"\n" +
    "                placeholder=\"/v1.0.0/ (Example)\"\n" +
    "                ng-if=\"configDialogCtrl.branchOrTag === 'tag'\"\n" +
    "                ng-model=\"configDialogCtrl.newCiConfig.tag\"\n" +
    "              />\n" +
    "            </div>\n" +
    "            <p style=\"margin: 16px 0 0 0; font-size: 9pt; opacity: 0.8;\" translate>\n" +
    "              You must use <a href=\"https://www.php.net/manual/en/function.preg-match.php\" target=\"_blank\" rel=\"noopener\">preg_match</a> pattern (Example: <code>/master/</code>, <code>/^dev_[a-z0-9_]*/i</code>)\n" +
    "            </p>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td translate>Triggers</td>\n" +
    "          <td>\n" +
    "            <div class=\"checkbox\">\n" +
    "              <label>\n" +
    "                <input id=\"checkbox-trigger-push\" type=\"checkbox\" style=\"margin-right: 8px;\" ng-model=\"configDialogCtrl.triggerPushEnabled\" />Git Push\n" +
    "              </label>\n" +
    "              <p class=\"description\" translate>\n" +
    "                Run CI when pushing commits to the specified remote branch/tag.\n" +
    "              </p>\n" +
    "            </div>\n" +
    "            <div class=\"checkbox\" ng-show=\"configDialogCtrl.EnvironmentFactory.service.ci_service_api_access || false\">\n" +
    "              <label>\n" +
    "                <input id=\"checkbox-trigger-api\" type=\"checkbox\" style=\"margin-right: 8px;\" ng-model=\"configDialogCtrl.triggerApiEnabled\" />API Access\n" +
    "              </label>\n" +
    "              <p class=\"description\" translate>\n" +
    "                Run CI when accessing an API URL. The URL will be shown in CI configs list.\n" +
    "              </p>\n" +
    "            </div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td translate>Framework</td>\n" +
    "          <td>\n" +
    "            <span ng-switch=\"configDialogCtrl.ProjectFactory.getFramework()\">\n" +
    "              <span ng-switch-when=\"cordova\">\n" +
    "                Cordova {{configDialogCtrl.ProjectFactory.getCordovaVersion()}}\n" +
    "              </span>\n" +
    "              <span ng-switch-when=\"react-native\">\n" +
    "                React Native\n" +
    "              </span>\n" +
    "              <span ng-switch-when=\"generic\">\n" +
    "                Generic\n" +
    "              </span>\n" +
    "              <span ng-switch-default>\n" +
    "                Unknown\n" +
    "              </span>\n" +
    "            </span> (this project)\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td translate>Platforms</td>\n" +
    "          <td>\n" +
    "            <div class=\"platform\">\n" +
    "              <div class=\"radio\" ng-if=\"true\">\n" +
    "                <label>\n" +
    "                  <input type=\"radio\" ng-model=\"configDialogCtrl.builtInOrCustom\" ng-change=\"configDialogCtrl.updatePlatform()\" value=\"built-in\" ng-disabled=\"!(configDialogCtrl.ProjectFactory.hasBuildService('ios') || configDialogCtrl.ProjectFactory.hasBuildService('android'))\">Built-in\n" +
    "                </label>\n" +
    "                <p class=\"description\" translate>\n" +
    "                  Build for built-in platforms supported by Monaca.\n" +
    "                </p>\n" +
    "                <div class=\"sublist\" ng-if=\"configDialogCtrl.ProjectFactory.hasBuildService('ios') || configDialogCtrl.ProjectFactory.hasBuildService('android')\">\n" +
    "                  <div class=\"checkbox\">\n" +
    "                    <label>\n" +
    "                      <input type=\"checkbox\" id=\"inlineCheckbox2\" ng-model=\"configDialogCtrl.platformAndroidSelected\" ng-change=\"configDialogCtrl.updatePlatform()\" ng-disabled=\"configDialogCtrl.builtInOrCustom === 'custom'\">Android\n" +
    "                    </label>\n" +
    "                  </div>\n" +
    "                  <div class=\"checkbox\">\n" +
    "                    <label>\n" +
    "                      <input type=\"checkbox\" id=\"inlineCheckbox1\" ng-model=\"configDialogCtrl.platformIosSelected\" ng-change=\"configDialogCtrl.updatePlatform()\" ng-disabled=\"configDialogCtrl.builtInOrCustom === 'custom'\">iOS\n" +
    "                    </label>\n" +
    "                  </div>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"radio\" ng-if=\"configDialogCtrl.ProjectFactory.hasBuildService('custom')\">\n" +
    "                <label>\n" +
    "                  <input type=\"radio\" ng-model=\"configDialogCtrl.builtInOrCustom\" ng-change=\"configDialogCtrl.updatePlatform()\" value=\"custom\">Custom\n" +
    "                </label>\n" +
    "                <p class=\"description\" translate>\n" +
    "                  Build for user-defined platforms.\n" +
    "                </p>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <td translate>Builds</td>\n" +
    "          <td ng-if=\"configDialogCtrl.builtInOrCustom === 'built-in'\">\n" +
    "            <div class=\"checkbox\" ng-if=\"configDialogCtrl.platformAndroidSelected || configDialogCtrl.platformIosSelected\">\n" +
    "              <label>\n" +
    "                <input type=\"checkbox\" id=\"inlineCheckbox3\" ng-model=\"configDialogCtrl.buildDebugSelected\" ng-change=\"configDialogCtrl.updateBuild()\">\n" +
    "                {{\n" +
    "                  (configDialogCtrl.platformAndroidSelected ? ['Android Debug'] : [])\n" +
    "                  .concat(configDialogCtrl.platformIosSelected ? ['iOS Debug'] : [])\n" +
    "                  .join(' & ')\n" +
    "                }}\n" +
    "              </label>\n" +
    "            </div>\n" +
    "            <div class=\"checkbox\" ng-if=\"configDialogCtrl.platformAndroidSelected || configDialogCtrl.platformIosSelected\">\n" +
    "              <label>\n" +
    "                <input type=\"checkbox\" id=\"inlineCheckbox4\" ng-model=\"configDialogCtrl.buildReleaseSelected\" ng-change=\"configDialogCtrl.updateBuild()\">\n" +
    "                {{\n" +
    "                  (configDialogCtrl.platformAndroidSelected ? ['Android Release'] : [])\n" +
    "                  .concat(configDialogCtrl.platformIosSelected ? ['iOS Release'] : [])\n" +
    "                  .join(' & ')\n" +
    "                }}\n" +
    "              </label>\n" +
    "            </div>\n" +
    "            <div class=\"alert alert-danger\" ng-if=\"!configDialogCtrl.platformAndroidSelected && !configDialogCtrl.platformIosSelected\">\n" +
    "              <p>Please choose at least one platform.</p>\n" +
    "            </div>\n" +
    "          </td>\n" +
    "          <td class=\"build-list\" ng-if=\"configDialogCtrl.builtInOrCustom === 'custom'\">\n" +
    "            <!-- List of builds -->\n" +
    "            <div class=\"build-list__item\" ng-repeat=\"buildItem in configDialogCtrl.customBuilds track by $index\">\n" +
    "              <select ng-if=\"configDialogCtrl.isValidBatchBuildName(buildItem)\" class=\"form-control\"\n" +
    "                      ng-model=\"buildItem\"\n" +
    "                      ng-options=\"definedBatchBuild.name as definedBatchBuild.name for definedBatchBuild in configDialogCtrl.definedBatchBuilds\">\n" +
    "              </select>\n" +
    "              <select ng-if=\"!configDialogCtrl.isValidBatchBuildName(buildItem)\" class=\"form-control\"\n" +
    "                      disabled=\"disabled\">\n" +
    "                <option>{{buildItem}} (Not Found)</option>\n" +
    "              </select>\n" +
    "              <input type=\"button\" value=\"{{'Remove'|translate}}\" class=\"m-btn m-btn-light\" style=\"margin-left: 8px; height: 34px;\" ng-click=\"configDialogCtrl.removeBatchBuild($index)\" />\n" +
    "            </div>\n" +
    "            <!-- Add button -->\n" +
    "            <div class=\"build-list__add-button\" ng-if=\"configDialogCtrl.canAddBatchBuild()\">\n" +
    "              <input type=\"button\" class=\"m-btn m-btn-light\" value=\"{{'+ Add Build'|translate}}\"\n" +
    "                     ng-click=\"configDialogCtrl.canAddBatchBuild() && configDialogCtrl.addBatchBuild()\" />\n" +
    "            </div>\n" +
    "            <!-- No builds defined error -->\n" +
    "            <div class=\"alert alert-danger\" ng-if=\"!configDialogCtrl.canAddBatchBuild()\">\n" +
    "                <p>No builds are defined.</p>\n" +
    "              <p>Please define builds in <strong>Custom Build Settings</strong> page.</p>\n" +
    "            </div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "        <tr ng-if=\"configDialogCtrl.builtInOrCustom === 'built-in'\">\n" +
    "          <td colspan=\"2\"><hr /></td>\n" +
    "        </tr>\n" +
    "        <tr ng-if=\"configDialogCtrl.builtInOrCustom === 'built-in'\">\n" +
    "          <td translate>Deployments</td>\n" +
    "          <td>\n" +
    "            <!-- List of deployments -->\n" +
    "            <div class=\"deploy-list__item\" ng-repeat=\"deployItem in configDialogCtrl.deployments track by $index\">\n" +
    "              <select class=\"form-control\"\n" +
    "                      ng-model=\"deployItem.tmpId\"\n" +
    "                      ng-change=\"configDialogCtrl.updateDeployment(deployItem)\"\n" +
    "                      ng-if=\"configDialogCtrl.isValidDeploymentName(deployItem.alias)\">\n" +
    "                <option ng-repeat=\"definedDeployment in configDialogCtrl.definedDeployments\" value=\"{{definedDeployment.tmpId}}\">\n" +
    "                  {{definedDeployment.alias}} ({{definedDeployment.service_type}})\n" +
    "                </option>\n" +
    "              </select>\n" +
    "              <select class=\"form-control\"\n" +
    "                      disabled=\"disabled\"\n" +
    "                      ng-if=\"!configDialogCtrl.isValidDeploymentName(deployItem.alias)\">\n" +
    "                <option>{{deployItem.alias}} (Not Found)</option>\n" +
    "              </select>\n" +
    "              <input type=\"button\" value=\"{{'Configure'|translate}}\" class=\"m-btn m-btn-light\" style=\"margin-left: 8px; height: 34px;\" ng-click=\"configDialogCtrl.configureDeployment(deployItem)\" />\n" +
    "              <input type=\"button\" value=\"{{'Remove'|translate}}\" class=\"m-btn m-btn-light\" style=\"margin-left: 8px; height: 34px;\" ng-click=\"configDialogCtrl.removeDeployment($index)\" />\n" +
    "            </div>\n" +
    "            <!-- Add button -->\n" +
    "            <div class=\"deploy-list__add-button\" ng-if=\"configDialogCtrl.canAddDeployment()\">\n" +
    "              <input type=\"button\" class=\"m-btn m-btn-light\" value=\"{{'+ Add Deployment'|translate}}\"\n" +
    "                     ng-click=\"configDialogCtrl.canAddDeployment() && configDialogCtrl.addDeployment()\" />\n" +
    "            </div>\n" +
    "            <!-- No builds defined error -->\n" +
    "            <div class=\"alert alert-warning\" ng-if=\"!configDialogCtrl.canAddDeployment()\">\n" +
    "              <p>No deployments are defined.</p>\n" +
    "              <p>Please define deployments in <strong>Deploy Service</strong> page if you want to automate them.</p>\n" +
    "            </div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "      </tbody>\n" +
    "    </table>\n" +
    "  </div>\n" +
    "  <div ng-if=\"configDialogCtrl.shouldShowJsonEditor\">\n" +
    "    <p style=\"margin: 8px 5px 24px 5px;\">\n" +
    "      This CI config has unknown property. Showing the raw JSON data.\n" +
    "      <hr />\n" +
    "    </p>\n" +
    "    <form class=\"form-holizontal\">\n" +
    "      <div class=\"form-group\" ng-class=\"{'has-error': configDialogCtrl.rawJsonDataParseError}\">\n" +
    "        <label class=\"col-sm-2 control-label\">Raw JSON</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <textarea class=\"form-control\" rows=\"10\" ng-model=\"configDialogCtrl.rawJsonData\" ng-change=\"configDialogCtrl.validateRawJsonData() && configDialogCtrl.parseRawJsonData()\"></textarea>\n" +
    "          <p class=\"help-block\" style=\"height: 20px;\">{{configDialogCtrl.rawJsonDataParseError}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </form>\n" +
    "  </div>\n" +
    "  <hr style=\"margin-top: 14px;\">\n" +
    "  <div class=\"buttons-row\">\n" +
    "    <span style=\"width: 100%\"></span>\n" +
    "    <!--\n" +
    "    <button type=\"button\" class=\"btn btn-primary\" style=\"background: #FFFFFF; color: #FF0000;\" ng-click=\"configDialogCtrl.toggleRawJson()\" translate>{{ configDialogCtrl.shouldShowJsonEditor ? \"GUI\" : \"Raw Json\" }}</button>\n" +
    "    -->\n" +
    "    <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "    <button ng-if=\"configDialogCtrl.isDeleteAble()\" type=\"button\" class=\"btn btn-danger\" ng-click=\"configDialogCtrl.delete()\" translate>Delete</button>\n" +
    "    <button type=\"button\" class=\"btn btn-primary\" ng-click=\"configDialogCtrl.save()\" ng-disabled=\"!configDialogCtrl.isSaveAble()\" translate>Save</button>\n" +
    "  </div>\n" +
    "</section>\n" +
    "");
  $templateCache.put("build/ContinuousIntegrationDeploymentDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>{{deploymentDialogCtrl.title}}</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-if=\"deploymentDialogCtrl.isLoading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-if=\"!deploymentDialogCtrl.isLoading\">\n" +
    "  <div>\n" +
    "    <form class=\"form-holizontal\">\n" +
    "      <div class=\"form-group\">\n" +
    "        <label class=\"col-sm-2 control-label\">Type</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <p class=\"form-control-static\">{{deploymentDialogCtrl.newDeployment.type}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"form-group\">\n" +
    "        <label class=\"col-sm-2 control-label\">Alias</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <p class=\"form-control-static\" style=\"margin-bottom: 15px;\">{{deploymentDialogCtrl.newDeployment.alias}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"form-group\" ng-class=\"{'has-error': deploymentDialogCtrl.defaultParametersJsonParseError}\">\n" +
    "        <label class=\"col-sm-2 control-label\">Default Parameters (JSON)</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <textarea class=\"form-control\" rows=\"3\" ng-model=\"deploymentDialogCtrl.defaultParametersStr\" ng-change=\"deploymentDialogCtrl.validate()\"></textarea>\n" +
    "          <p class=\"help-block\" style=\"height: 20px;\">{{deploymentDialogCtrl.defaultParametersJsonParseError}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"form-group\" ng-class=\"{'has-error': deploymentDialogCtrl.iosParametersJsonParseError}\">\n" +
    "        <label class=\"col-sm-2 control-label\">iOS Parameters (JSON)</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <textarea class=\"form-control\" rows=\"3\" ng-model=\"deploymentDialogCtrl.iosParametersStr\" ng-change=\"deploymentDialogCtrl.validate()\"></textarea>\n" +
    "          <p class=\"help-block\" style=\"height: 20px;\">{{deploymentDialogCtrl.iosParametersJsonParseError}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"form-group\" ng-class=\"{'has-error': deploymentDialogCtrl.androidParametersJsonParseError}\">\n" +
    "        <label class=\"col-sm-2 control-label\">Android Parameters (JSON)</label>\n" +
    "        <div class=\"col-sm-10\">\n" +
    "          <textarea class=\"form-control\" rows=\"3\" ng-model=\"deploymentDialogCtrl.androidParametersStr\" ng-change=\"deploymentDialogCtrl.validate()\"></textarea>\n" +
    "          <p class=\"help-block\" style=\"height: 20px;\">{{deploymentDialogCtrl.androidParametersJsonParseError}}</p>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </form>\n" +
    "  </div>\n" +
    "  <hr style=\"margin-top: 14px;\">\n" +
    "  <div class=\"buttons-row\">\n" +
    "    <span style=\"width: 100%\"></span>\n" +
    "    <!--\n" +
    "    <button type=\"button\" class=\"btn btn-primary\" style=\"background: #FFFFFF; color: #FF0000;\" ng-click=\"toggleRawJson()\" translate>{{ shouldShowJsonEditor ? \"GUI\" : \"Raw Json\" }}</button>\n" +
    "    -->\n" +
    "    <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "    <button type=\"button\" class=\"btn btn-primary\" ng-click=\"deploymentDialogCtrl.save()\" ng-disabled=\"!deploymentDialogCtrl.isSaveAble()\" translate>Save</button>\n" +
    "  </div>\n" +
    "</section>");
  $templateCache.put("build/ContinuousIntegrationJsonErrorDialog.html",
    "<div class=\"modal-header\">{{title}}</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "	<div>\n" +
    "		<div>\n" +
    "			<img src=\"/img/services/0-ico-exclamation.png\" />\n" +
    "		</div>\n" +
    "		<div>\n" +
    "			<h2 translate>JSON Validation Error</h2>\n" +
    "			<p ng-bind-html=\"message\"></p>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "\n" +
    "	<div>\n" +
    "		<div></div>\n" +
    "		<div>\n" +
    "			<ul>\n" +
    "				<li translate>Error Resolution:</li>\n" +
    "				<li translate>Please see <a ng-click=\"gotoCiJsonDocs()\">Monaca Docs</a> for support on JSON configurations for Continuous Integration.</li>\n" +
    "			</ul>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "	<button class=\"m-btn\" type=\"button\" ng-click=\"gotoCiJsonDocs()\" translate>Documentation</button>\n" +
    "	<button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaConfigAssetsEncryptPassword.html",
    "<div class=\"modal-header\" translate>Save HTML5 Resource Encryption Password</div>\n" +
    "\n" +
    "<div class=\"modal-body laoding\" ng-show=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Resource Encryption Settings...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"!loading\">\n" +
    "  <div class=\"m-text-alert\"  ng-show=\"passwordExists\" translate>Password is already registered.<br />If using In-App-Updater, already distributed apps will become incompatible once the password is changed.</div>\n" +
    "\n" +
    "  <div>\n" +
    "    <label for=\"cordova_encryption_confirm_new_password\" translate>New Password:</label>\n" +
    "    <input class=\"m-component-textbox\" type=\"password\" id=\"cordova_encryption_new_password\" name=\"new_password\" ng-model=\"password\" />\n" +
    "  </div>\n" +
    "\n" +
    "  <div>\n" +
    "    <label for=\"cordova_encryption_confirm_new_password\" translate>Confirm New Password:</label>\n" +
    "    <input class=\"m-component-textbox\" type=\"password\" id=\"cordova_encryption_confirm_new_password\" name=\"confirm_new_password\" ng-model=\"password_confirm\" ng-enter=\"ok()\" />\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!loading\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaConfigInAppUpdater.html",
    "<div class=\"modal-header\" translate>In-App Updater Settings</div>\n" +
    "\n" +
    "<div class=\"modal-body laoding\" ng-show=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading In-App Updater Settings...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"!loading\">\n" +
    "  <div>\n" +
    "    <label translate>Update Mode:</label>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"update_mode\" ng-options=\"mode.value as mode.text for mode in update_modes\"></select>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div>\n" +
    "    <label for=\"cordova_inapupdater_deploy_url\" translate>Deploy URL:</label>\n" +
    "    <input class=\"m-component-textbox\" type=\"text\" id=\"cordova_inapupdater_deploy_url\" name=\"deploy_url\" ng-model=\"deploy_url\" ng-enter=\"ok()\" />\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!loading\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaConfigInAppUpdater4.html",
    "<div class=\"modal-header\" translate>In-App Updater Settings</div>\n" +
    "\n" +
    "<div class=\"modal-body laoding\" ng-show=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading In-App Updater Settings...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"!loading\">\n" +
    "  \n" +
    "  <div>\n" +
    "    <div translate>Plugin Version:</div>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"selected_version\" ng-options=\"version for version in plugin_version\"></select>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  \n" +
    "  <div>\n" +
    "    <label for=\"cordova_inapupdater_checkUpdate_url\" translate>CheckUpdate URL:</label>\n" +
    "    <input class=\"m-component-textbox\" type=\"text\" id=\"cordova_inapupdater_checkUpdate_url\" name=\"check_update_url\" ng-model=\"check_update_url\" ng-enter=\"ok()\" />\n" +
    "  </div>\n" +
    "\n" +
    "  <div>\n" +
    "    <label for=\"cordova_inapupdater_download_url\" translate>Download URL:</label>\n" +
    "    <input class=\"m-component-textbox\" type=\"text\" id=\"cordova_inapupdater_download_url\" name=\"download_url\" ng-model=\"download_url\" ng-enter=\"ok()\" />\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!loading\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaConfigPluginCommon.html",
    "<div class=\"modal-header\" translate>Settings: {{plugin.name}}</div>\n" +
    "\n" +
    "<div class=\"modal-body laoding\" ng-show=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Cordova Plugins Settings...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"!loading\">\n" +
    "  <div class=\"plugin-version\" ng-show=\"pluginVersionChangeVisible\">\n" +
    "    <div translate>Plugin Version:</div>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"plugin_selected_version\" ng-disabled=\"pluginVersionChangeDisabled\" ng-options=\"version for version in plugin_version\"></select>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"crosswalk-version\" ng-show=\"crosswalkVisible\">\n" +
    "    <div translate>Crosswalk Version:</div>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"crosswalk_selected_version\" ng-disabled=\"crosswalkVersionChangeDisabled\" ng-options=\"version for version in crosswalk_version\"></select>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"crosswalk-arch\" ng-show=\"crosswalkVisible\">\n" +
    "    <div translate>Architecture:</div>\n" +
    "    <div>\n" +
    "      <input id=\"carch_arm\" type=\"radio\" ng-model=\"crosswalk_arch\" value=\"{{crosswalk_archs.arm}}\"><label for=\"carch_arm\">ARM</label>\n" +
    "      <input id=\"carch_x86\" type=\"radio\" ng-model=\"crosswalk_arch\" value=\"{{crosswalk_archs.x86}}\"><label for=\"carch_x86\">x86</label>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"plugin-install-params\">\n" +
    "    <div><span translate>Install Parameters (one per line):<span title=\"Each line corresponds to each --variable parameter of cordova plugin add.\" class=\"btn-tooltip\"><i class=\"tooltip-1\"></i></span></div>\n" +
    "    <div>\n" +
    "      <textarea class=\"m-component-textbox\" rows=\"4\" cols=\"20\" autocomplete=\"off\" aria-invalid=\"false\" placeholder=\"eg. API_KEY=12345\" role=\"textbox\" aria-required=\"false\" aria-multiline=\"true\" ng-model=\"pluginInstallParams\"></textarea>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!loading\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaConfirmUpgradeDialog.html",
    "<div class=\"modal-header\" translate>Updating Cordova Version</div>\n" +
    "\n" +
    "<div class=\"modal-body\">\n" +
    "  <p class=\"m-text-alert\"><strong translate>Attention: Please ensure that all unsaved changes have been saved before continuing.</strong></p>\n" +
    "  <p translate>Update Cordova version will affect your project, which can result to unexpected behavior.\n" +
    "    And all core Cordova plugins will be updated. Do you want to continue?</p>\n" +
    "  <p translate>Existing project will be copied and saved as another project.</p>\n" +
    "  <p ng-if=\"param.additional_message\" class=\"m-text-bigger\"><strong>{{param.additional_message}}</strong></p>\n" +
    "\n" +
    "  <p class=\"m-text-alert\"><strong translate>The platform requirements will be changed:</strong></p>\n" +
    "  <ul>\n" +
    "    <li><strong translate>Supported Operating System Version:</strong><br/>Android {{ param.android_version }} <span translate> or later</span>\n" +
    "      <br/>iOS {{param.ios_version }} <span translate> or later</span></li>\n" +
    "    <li><strong translate>Supported Monaca Debugger:</strong><br/>{{ param.debugger_version }} <span translate> or later</span>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "  <hr/>\n" +
    "  <div ng-show=\"{{!!param.deprecated_plugins}}\">\n" +
    "    <p class=\"m-text-alert\"><strong translate>The following plugins will be deprecated:</strong></p>\n" +
    "    <ul>\n" +
    "      <li ng-repeat=\"plugin in param.deprecated_plugins\">\n" +
    "        {{plugin}}\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "  </div>\n" +
    "  <hr ng-show=\"{{!!param.deprecated_plugins}}\" />\n" +
    "\n" +
    "  <div ng-show=\"{{!!param.plugins_to_be_removed}}\">\n" +
    "    <div class=\"alert alert-danger\" role=\"alert\" translate>\n" +
    "      The following plugins will be <strong>removed</strong>:\n" +
    "    </div>\n" +
    "    <ul>\n" +
    "      <li ng-repeat=\"plugin in param.plugins_to_be_removed\">\n" +
    "        {{plugin}}\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "  </div>\n" +
    "  <hr ng-show=\"{{!!param.plugins_to_be_removed}}\" />\n" +
    "\n" +
    "  <div ng-show=\"{{!!param.plugins_to_be_upgraded}}\">\n" +
    "    <div class=\"alert alert-warning\" role=\"alert\" translate>\n" +
    "      The following plugins will be  <strong>upgraded</strong>:\n" +
    "    </div>\n" +
    "    <ul>\n" +
    "      <li ng-repeat=\"plugin in param.plugins_to_be_upgraded\">\n" +
    "        {{plugin.id}} {{plugin.from}} to {{plugin.to}}\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "  </div>\n" +
    "  <hr ng-show=\"{{!!param.plugins_to_be_upgraded}}\"/>\n" +
    "\n" +
    "  <div ng-show=\"{{!!param.plugins_to_be_upgrade_in_devDependencies}}\">\n" +
    "    <div class=\"alert alert-warning\" role=\"alert\" translate>\n" +
    "      We noticed that following plugins are installed in devDependencies, we will <strong>move</strong> these plugins to dependencies and <strong>upgrade</strong> to the version supported with updated Cordova:\n" +
    "    </div>\n" +
    "    <ul>\n" +
    "      <li ng-repeat=\"plugin in param.plugins_to_be_upgrade_in_devDependencies\">\n" +
    "        {{plugin.id}} {{plugin.from}} to {{plugin.to}}\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "  </div>\n" +
    "\n" +
    "  <p ng-show=\"{{!!param.link}}\" translate>For more details about the change, please refer to <a href=\"{{ param.link }}\" target=\"_blank\">our\n" +
    "    documentation</a>.</p>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-click=\"ok()\" translate autofocus>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaImport.html",
    "<div class=\"modal-header\" translate>Import Cordova Plugin</div>\n" +
    "<div ng-show=\"importing\" class=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Importing...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "<div class=\"modal-body\">\n" +
    "  <div ng-show=\"hasZipImportSupport\" class=\"radio\">\n" +
    "    <label>\n" +
    "      <input type=\"radio\" ng-model=\"import_method\" name=\"import_method\" value=\"zip\">\n" +
    "      <span translate>Upload Compressed ZIP/TGZ Package</span>\n" +
    "    </label>\n" +
    "  </div>\n" +
    "  <div ng-show=\"hasZipImportSupport\" ng-class=\"{disabled: import_method !== 'zip'}\">\n" +
    "    <label for=\"cordova-import-package\" translate>Package:</label>\n" +
    "    <input ng-disabled=\"import_method !== 'zip'\" type=\"file\" id=\"cordova-import-package\" name=\"cordova-import-package\" fileread=\"import_file\" />\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"radio\">\n" +
    "    <label>\n" +
    "      <input type=\"radio\" ng-model=\"import_method\" name=\"import_method\" value=\"url\">\n" +
    "      <span translate>Specify URL or Package Name</span>\n" +
    "    </label>\n" +
    "  </div>\n" +
    "  <div ng-class=\"{disabled: import_method !== 'url'}\">\n" +
    "    <label for=\"cordova-import-package-url\" translate>Package Name / URL:</label>\n" +
    "    <input ng-enter=\"ok()\" ng-disabled=\"import_method !== 'url'\" class=\"m-component-textbox\" type=\"text\" id=\"cordova-import-package-url\" name=\"cordova-import-package-url\" ng-model=\"import_url\" />\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaPlugins.html",
    "<div ng-controller=\"CordovaPluginsController as cordova\" ng-init=\"init()\" ng-cloak>\n" +
    "  <div ng-show=\"!cordova.isInitialized\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Loading Cordova Plugins...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "  <div ng-show=\"changingversion\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <div class=\"m-page-settings ide-setting-cordova-plugins\">\n" +
    "\n" +
    "      <div ng-show=\"cordova.isInitialized\">\n" +
    "        <header class=\"m-header-caret balloon-line cordova-plugins-version\" ng-show=\"cordova.canShowCordovaVersion\">\n" +
    "          <h1 translate>Cordova Plugins</h1>\n" +
    "\n" +
    "          <div class=\"sub-header\" translate style=\"padding-left:17px;\">Cordova Version:</div>\n" +
    "          <dl class=\"cli-version-info\">\n" +
    "            <dt style=\"line-height: 27px;\" translate>CLI Version\n" +
    "              <span class=\"m-tooltip-body icon-help\">\n" +
    "                <i class=\"m-tooltip tt-text-leftside\" translate>After upgrading Cordova version, you cannot downgrade to the previous version.</i>\n" +
    "              </span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <span>{{cordova.version.currentLong}}</span>\n" +
    "              <span ng-show=\"cordova.version.nextLong && !isFujitsuAdf\" ng-click=\"cordova.onSelectCordovaVersion()\" class=\"upgrade-link\" translate>Upgrade to {{cordova.version.nextLong}}</span>\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "          <div class=\"cordova-plugins-version-detail\" ng-show=\"cordova.isVersionDetailVisible\">\n" +
    "            <dl>\n" +
    "              <dt translate>iOS Platform:</dt>\n" +
    "              <dd>{{cordova.cordovaPlatformVersion.ios}}</dd>\n" +
    "            </dl>\n" +
    "            <dl>\n" +
    "              <dt translate>Android Platform:</dt>\n" +
    "              <dd>{{cordova.cordovaPlatformVersion.android}}</dd>\n" +
    "            </dl>\n" +
    "          </div>\n" +
    "          <dl class=\"cli-version-detail\">\n" +
    "            <dt>\n" +
    "              <span class=\"btn-versiondetail\" ng-click=\"cordova.isVersionDetailVisible = !cordova.isVersionDetailVisible\">\n" +
    "                <span ng-show=\"cordova.isVersionDetailVisible\" translate>Hide Details</span>\n" +
    "                <span ng-show=\"!cordova.isVersionDetailVisible\" translate>Show Details</span>\n" +
    "                <i ng-class=\"{'m-icon': true, 'm-icon-sort-down': !cordova.isVersionDetailVisible, 'm-icon-sort-up': cordova.isVersionDetailVisible}\"></i>\n" +
    "              </span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <p class=\"cordova-plugins-version-info\" translate>Choose CLI version and plugins for the selected version are shown.</p>\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "      </div>\n" +
    "      </header>\n" +
    "\n" +
    "      <div class=\"main\" ng-show=\"cordova.isInitialized\">\n" +
    "        <div class=\"toolbar\">\n" +
    "          <div>\n" +
    "            <input type=\"text\" class=\"m-component-textbox\" ng-model=\"cordova.searchword\" placeholder=\"Plugin Search\"\n" +
    "            />\n" +
    "          </div>\n" +
    "          <button ng-show=\"showImportCordovaPlugin\" type=\"button\" class=\"m-btn m-btn-blue\" ng-click=\"cordova.onClickBtnImport()\" translate>Import Cordova Plugin</button>\n" +
    "        </div>\n" +
    "        <section>\n" +
    "          <h2 translate>Enabled Plugins</h2>\n" +
    "          <ul class=\"plugins enabled\" ng-show=\"cordova.installedPluginCount !== 0\">\n" +
    "            <li class=\"animate-repeat\" ng-repeat=\"plugin in cordova.plugins | filter:{isInstalled: true} | orderBy: 'name' | pluginsearch: cordova.searchword\"\n" +
    "              data-key=\"{{plugin.key}}\" ng-class=\"{'imported': !plugin.isDefault}\">\n" +
    "              <div class=\"movedmask\" translate>Disable</div>\n" +
    "              <div class=\"movedmask-imported\" translate>Remove</div>\n" +
    "              <div ng-include=\"'build/CordovaPluginsCard.html'\"></div>\n" +
    "            </li>\n" +
    "          </ul>\n" +
    "          <div class=\"plugins-empty\" ng-show=\"cordova.installedPluginCount === 0\" translate>No plugins are currently enabled or installed.</div>\n" +
    "        </section>\n" +
    "        <section>\n" +
    "          <h2 translate>Available Plugins</h2>\n" +
    "          <ul class=\"plugins available\" ng-show=\"!cordova.isAvailablePluginEmpty()\">\n" +
    "            <li class=\"animate-repeat\" ng-repeat=\"(key, plugin) in cordova.plugins | filter:{isInstalled: false} | orderBy: 'name' | pluginsearch: cordova.searchword\"\n" +
    "              data-key=\"{{plugin.key}}\">\n" +
    "              <div class=\"movedmask\" translate>Enable</div>\n" +
    "              <div ng-include=\"'build/CordovaPluginsCard.html'\"></div>\n" +
    "            </li>\n" +
    "          </ul>\n" +
    "          <div class=\"plugins-empty\" ng-show=\"cordova.isAvailablePluginEmpty()\" translate>No plugins are available.</div>\n" +
    "        </section>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/CordovaPluginsCard.html",
    "<!-- <div class=\"label-imported\" translate>Import Cordova Plugin</div> -->\n" +
    "<section class=\"plugin-card\">\n" +
    "  <div>\n" +
    "    <img ng-src=\"{{plugin.thumbnail}}\" alt=\"\">\n" +
    "  </div>\n" +
    "\n" +
    "  <h3><i>{{plugin.name}}</i></h3>\n" +
    "\n" +
    "  <span class=\"plugin-id\" ng-hide=\"plugin.name === plugin.id\">{{plugin.id}}</span>\n" +
    "\n" +
    "  <footer>\n" +
    "    <span class=\"platforms\">\n" +
    "      <i ng-class=\"{'ios': true, 'on': plugin.platforms.indexOf('ios') >= 0}\"></i>\n" +
    "      <i ng-class=\"{'android': true, 'on': plugin.platforms.indexOf('android') >= 0}\"></i>\n" +
    "      <i ng-class=\"{'winrt': true, 'on': plugin.platforms.indexOf('windows') >= 0}\"></i>\n" +
    "      <i ng-show=\"plugin.platforms.indexOf('electron') >= 0\" ng-class=\"{'electron': true, 'on': plugin.platforms.indexOf('electron') >= 0}\"></i>\n" +
    "    </span>\n" +
    "\n" +
    "    <span class=\"version\" ng-show=\"!!plugin.version\">v{{plugin.version}}</span>\n" +
    "  </footer>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"plugin-detail\">\n" +
    "  <header>\n" +
    "    <h3>{{plugin.name}}</h3>\n" +
    "    <span ng-hide=\"plugin.name === plugin.id\">{{plugin.id}}</span>\n" +
    "  </header>\n" +
    "\n" +
    "  <main>\n" +
    "    <div class=\"plugin-logo\">\n" +
    "      <img ng-src=\"{{plugin.thumbnail}}\" alt=\"\">\n" +
    "    </div>\n" +
    "\n" +
    "    <a href=\"{{plugin.docs}}\" target=\"_blank\" class=\"plugin-detail-docs\" ng-show=\"!!plugin.docs\" translate>Show README</a>\n" +
    "    \n" +
    "    <div class=\"plugin-detail-author\" ng-show=\"plugin.author\">by <i>{{plugin.author}}</i></div>\n" +
    "    \n" +
    "    <div ng-show=\"plugin.updatedAt\" class=\"plugin-detail-updatedat\" translate>Last Updated: <i>{{plugin.updatedAt}}</i></div>\n" +
    "    \n" +
    "    <div ng-show=\"plugin.version\" class=\"plugin-detail-version\" translate>Version <i>{{plugin.version}}</i></div>\n" +
    "\n" +
    "    <div class=\"plugin-detail-description\">{{plugin.description}}</div>\n" +
    "\n" +
    "    <div class=\"plugin-detail-canused\" ng-show=\"!plugin.canUsed && plugin.requiredPlanNames == 'Enterprise'\" translate>Only available to Plan for team development.</div>\n" +
    "    <div class=\"plugin-detail-canused\" ng-show=\"!plugin.canUsed && !plugin.requiredPlanNames\" translate>Your plan not support the imported plugin.</div>\n" +
    "    <div class=\"plugin-detail-canused\" ng-show=\"!plugin.hasMonacaSupport\" translate>This plugin is deprecated.</div>\n" +
    "  </main>\n" +
    "\n" +
    "  <footer>\n" +
    "    <div class=\"plugin-detail-buttons\">\n" +
    "      <button class=\"m-btn m-btn-blue\" ng-click=\"cordova.onClickBtnEnable(plugin.key)\" ng-show=\"plugin.canUsed && !plugin.isImported && !plugin.isInstalled\" translate>Enable</button>\n" +
    "      <button class=\"m-btn m-btn-alert\" ng-click=\"cordova.onClickBtnDisable(plugin.key)\" ng-show=\"!plugin.isImported && plugin.isInstalled && !plugin.isInstallRequired\" translate>Disable</button>\n" +
    "      <button class=\"m-btn m-btn-alert\" ng-click=\"cordova.onClickBtnRemove(plugin.key)\" ng-show=\"plugin.isImported && plugin.isInstalled && !plugin.isInstallRequired\" translate>Delete</button>\n" +
    "      <button class=\"m-btn\" ng-click=\"cordova.onClickBtnConfig($event, plugin)\" ng-show=\"plugin.canUsed && plugin.isInstalled && cordova.version.currentShort >= 4\" translate>Configure</button>\n" +
    "    </div>\n" +
    "  </footer>\n" +
    "</section>\n" +
    "");
  $templateCache.put("build/DeployService.html",
    "<div ng-controller=\"DeployServiceController\" class=\"m-page-settings deploy-service\">\n" +
    "  <div class=\"container\">\n" +
    "    <header class=\"m-header-caret balloon-line\">\n" +
    "      <h1 translate>Deploy Services</h1>\n" +
    "\n" +
    "      <div ng-show=\"!loading && !error\">\n" +
    "        <p translate>Adding external deploy services allows you to save API tokens.\n" +
    "          <br>These deployment services are accessible by various Monaca tools and services.</p>\n" +
    "\n" +
    "        <div class=\"deploy-service-list-available\">\n" +
    "          <div ng-repeat=\"(service, data) in DeployServiceFactory.serviceCollection\" data-service=\"{{service}}\">\n" +
    "            <img ng-src=\"{{data.logo.editor_logo_small}}\" />\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <div>\n" +
    "          <button class=\"m-btn m-btn-green m-btn-large add-deploy-service\" ng-click=\"addNewDeployService()\">&plus;\n" +
    "            <translate>Add Deploy Service</translate>\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </header>\n" +
    "\n" +
    "    <main>\n" +
    "      <section>\n" +
    "        <h2 translate>Configured Deploy Services</h2>\n" +
    "\n" +
    "        <div class=\"deploy-service-missing-own\" ng-show=\"!loading && !error && DeployServiceFactory.ownedCollection.length === 0\"\n" +
    "          translate>There is no configured deploy service.</div>\n" +
    "\n" +
    "        <div class=\"deploy-service-has-own\" ng-show=\"!loading && !error && DeployServiceFactory.ownedCollection.length > 0\">\n" +
    "\n" +
    "          <div ng-repeat=\"item in DeployServiceFactory.ownedCollection\">\n" +
    "            <div class=\"deploy-service-table-col1\">\n" +
    "              <img ng-src=\"{{item.editor_logo}}\" />\n" +
    "            </div>\n" +
    "            <div class=\"deploy-service-table-col2\">\n" +
    "              <div>{{item.service_type}}</div>\n" +
    "              <div>\n" +
    "                <a href=\"{{item.website}}\" target=\"_blank\">{{item.website}}</a>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"deploy-service-table-col3\">\n" +
    "              <div>\n" +
    "                <span translate>Alias:</span>{{item.alias}}</div>\n" +
    "              <div>\n" +
    "                <span translate>API Key:</span>{{item.token}}</div>\n" +
    "            </div>\n" +
    "            <div class=\"deploy-service-table-col4\">\n" +
    "              <button class=\"m-btn m-btn-alert\" ng-click=\"deleteDeployService(item.service_type, item.alias);\" translate>Delete</button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </section>\n" +
    "    </main>\n" +
    "  </div>\n" +
    "</div>");
  $templateCache.put("build/DeployServiceAddDialog.html",
    "<div class=\"modal-header\" translate>Add New Deploy Service</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "	<div ng-show=\"error\" class=\"error m-text-alert\">{{error}}</div>\n" +
    "\n" +
    "	<div class=\"select-deploy-service\">\n" +
    "		<div>\n" +
    "			<div class=\"select-deploy-service-label\">\n" +
    "				<span translate>Service Provider: </span><span class=\"m-component-tooltip-icon\"><i class=\"m-component-tooltip\" translate>List of supported third-party service providers that can boost app development and deployment.</i></span>\n" +
    "			</div>\n" +
    "			<div class=\"select-deploy-service-select\">\n" +
    "				<div class=\"m-component-combobox\">\n" +
    "					<select ng-options=\"service as service.name for service in DeployServiceFactory.serviceCollection track by service.id\" ng-model=\"selected_service\" ng-change=\"updateDeployServiceForm()\">\n" +
    "						<option value=\"\" translate>Select a Deploy Service</option>\n" +
    "					</select>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "\n" +
    "	<div class=\"deploy-service-type-form\" ng-show=\"selected_service && formElements.length\">\n" +
    "		<hr>\n" +
    "		<h2 translate>{{selected_service.name}} Configurations</h2>\n" +
    "		<form>\n" +
    "			<div>\n" +
    "				<div class=\"deploy-service-type-form-label\">\n" +
    "					<span translate>Config Alias: </span><span class=\"m-component-tooltip-icon\"><i class=\"m-component-tooltip\" translate>Alias is the unique identifier for each configurations.</i></span>\n" +
    "				</div>\n" +
    "				<div class=\"deploy-service-type-form-value\">\n" +
    "					<input class=\"m-component-textbox\" type=\"text\" ng-model=\"alias\" />\n" +
    "				</div>\n" +
    "			</div>\n" +
    "			\n" +
    "			<div ng-repeat=\"(ele, data) in formElements\">\n" +
    "				<div class=\"deploy-service-type-form-label\">\n" +
    "					{{data.label}}: <span class=\"m-component-tooltip-icon\"><i class=\"m-component-tooltip\" >{{data.info}}</i></span>\n" +
    "				</div>\n" +
    "				<div class=\"deploy-service-type-form-value\">\n" +
    "					<input class=\"m-component-textbox\" ng-model=\"formData[data.id]\" type=\"{{data.type}}\" />\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</form>\n" +
    "	</div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "	<button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "	<button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"addNewDeployService()\" ng-disable=\"!selected_service\" translate>Add</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/AdHocQRCodeDialog.html",
    "<div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "<div class=\"modal-header\" translate>Install via QR code</div>\n" +
    "\n" +
    "<section class=\"modal-body qr-code\" ng-form=\"dialogForm\">\n" +
    "    <div>\n" +
    "        <figure>\n" +
    "            <img ng-src=\"{{qrCodeUrl}}\" alt=\"QR Code\">\n" +
    "        </figure>\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>OK</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/CertificateExportDialog.html",
    "<div>\n" +
    "    <div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "    <div class=\"modal-header\" translate>Export Developer Certification(iOS)</div>\n" +
    "\n" +
    "    <section class=\"modal-body\">\n" +
    "        <div class=\"divTable\">\n" +
    "            <p translate>You can export the data to make a backup on your local PC.<br />You need to input password to export this file. Password will be used when importing to your computer. Blank password is not recommended.</p>\n" +
    "            <div>\n" +
    "                <label translate>Input Password</label>\n" +
    "                <div>\n" +
    "                    <input type=\"password\" name=\"password\" ng-model=\"password\" placeholder=\"password\" ng-enter=\"exportCertificate()\" >\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </section>\n" +
    "\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "        <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"exportCertificate()\" translate>Export</button>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/ConfirmApkCheckDialog.html",
    "<div class=\"modal-header\">Secure Coding Checker<span style=\"font-size:13px;margin-left:10px;\" translate>Vulnerability Assessment Service</span></div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <section>\n" +
    "    <div style=\"margin:10px 0;line-height: 1.5em;\" translate>This is a Vulnerability Assessment tool which is provided by LAC Co., Ltd.</div>\n" +
    "    <div style=\"margin:17px 0;line-height: 1.5em;\" translate>\n" +
    "    If so, please be aware that currently Monaca only uses a trial version of this service.\n" +
    "    By continuing to use this service, you agree to <a href=\"https://cxt.scc.lac.co.jp/Content/TermsOfService-scc-cxt.pdf\" target=\"_blank\">\n" +
    "      LAC Co., Ltd's terms of service</a>.</div>\n" +
    "    <div style=\"margin:10px 0;line-height: 1.5em;\" translate>For more information, please refer to <a href=\"http://www.lac.co.jp/service/consulting/scc.html\" target=\"_blank\">Secure Code Checker</a>.</div>\n" +
    "  </section>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" ng-disable=\"!selected_service\" translate>Start</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/CsrExportDialog.html",
    "<div>\n" +
    "    <div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "    <div class=\"modal-header\" translate>CSR(iOS) Export</div>\n" +
    "\n" +
    "    <section class=\"modal-body\">\n" +
    "        <div>\n" +
    "	        <p translate>For the purposes of generating a certificate via the Apple Developer Program, a CSR file will be prepared. <br /> For detailed usage information, please see <a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\">help</a>.</p>\n" +
    "        <div>\n" +
    "    </section>\n" +
    "\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "        <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"exportCsr()\" translate>Export</button>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/KeyStoreAddAliasDialog.html",
    "<div class=\"close-x\" ng-click=\"cancel()\"></div>\n" +
    "<div class=\"modal-header\" translate>Add Alias</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <img ng-src=\"{{'/img/size32/icon_loading.gif'}}\">\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <div class=\"divTable middleTitle\">\n" +
    "        <div>\n" +
    "            <label><strong translate>Alias Name :</strong></label>\n" +
    "            <div>\n" +
    "                <input type=\"text\" name=\"name\" ng-model=\"name\" placeholder=\"alias\" ng-enter=\"ok()\" required>\n" +
    "                <span ng-messages=\"dialogForm.name.$error\" ng-show=\"dialogForm.name.$dirty\" ng-cloak>\n" +
    "                    <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    <span ng-message=\"minlength\" class=\"config-error\">The minimum length for this field is 6</span>\n" +
    "                </span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div>\n" +
    "            <label><strong translate>Alias Password :</strong></label>\n" +
    "            <div>\n" +
    "                <input type=\"text\" name=\"password\" ng-model=\"password\" placeholder=\"password\" ng-minlength=\"6\" ng-enter=\"ok()\" required>\n" +
    "                <span ng-messages=\"dialogForm.password.$error\" ng-show=\"dialogForm.password.$dirty\" ng-cloak>\n" +
    "                    <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    <span ng-message=\"minlength\" class=\"config-error\">The minimum length for this field is 6</span>\n" +
    "                </span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" ng-disabled=\"dialogForm.$invalid\" translate>Add Alias</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/KeyStoreExportDialog.html",
    "<div class=\"close-x\" ng-click=\"cancel()\"></div>\n" +
    "<div class=\"modal-header\" translate>Export KeyStore (Android)</div>\n" +
    "<div ng-show=\"exporting\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Exporting...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <img ng-src=\"{{'/img/size32/icon_loading.gif'}}\">\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <div>\n" +
    "        <p translate>Are you sure to export this file?</p>\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn monaca-btn-gray\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>Export</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/KeyStoreGeneratorDialog.html",
    "<div class=\"close-x\" ng-click=\"cancel()\"></div>\n" +
    "<div class=\"modal-header\" translate>Generate KeyStore</div>\n" +
    "<div ng-show=\"generating\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Generating KeyStore...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <img ng-src=\"{{'/img/size32/icon_loading.gif'}}\">\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <section>\n" +
    "        <p translate>Please input information for Alias which will be stored in KeyStore. Please input Alias name and password.</p>\n" +
    "        <div class=\"divTable longTitle\">\n" +
    "            <div>\n" +
    "                <label><strong translate>Alias Name&nbsp;:</strong></label>\n" +
    "                <div>\n" +
    "                    <input type=\"text\" name=\"alias_name\" ng-model=\"alias_name\" placeholder=\"alias\" ng-enter=\"ok()\" required>\n" +
    "                    <span ng-messages=\"dialogForm.alias_name.$error\" ng-show=\"dialogForm.alias_name.$dirty\" ng-cloak>\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div>\n" +
    "                <label><strong translate>Alias Password&nbsp;:</strong></label>\n" +
    "                <div>\n" +
    "                    <input type=\"password\" name=\"alias_password\" ng-model=\"alias_password\" placeholder=\"password\" ng-minlength=\"6\" ng-enter=\"ok()\" required>\n" +
    "                    <span ng-messages=\"dialogForm.alias_password.$error\" ng-show=\"dialogForm.alias_password.$dirty\" ng-cloak>\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                        <span ng-message=\"minlength\" class=\"config-error\">The minimum length for this field is 6</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </section>\n" +
    "    <section class=\"section-end\">\n" +
    "        <p translate>KeyStore contains Alias to code-sign release build apps. For security, KeyStore should be protected by password.</p>\n" +
    "        <div class=\"divTable longTitle\">\n" +
    "            <div>\n" +
    "                <label><strong translate>Please input password for KeyStore&nbsp;:</strong></label>\n" +
    "                <div>\n" +
    "                    <input type=\"password\" name=\"keystore_password\" ng-model=\"keystore_password\" placeholder=\"password\" ng-minlength=\"6\" ng-enter=\"ok()\" required>\n" +
    "                    <span ng-messages=\"dialogForm.keystore_password.$error\" ng-show=\"dialogForm.keystore_password.$dirty\" ng-cloak>\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                        <span ng-message=\"minlength\" class=\"config-error\">The minimum length for this field is 6</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </section>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" ng-disabled=\"dialogForm.$invalid\" disabled translate>Generate KeyStore and Alias</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/KeyStoreImportDialog.html",
    "<div class=\"close-x\" ng-click=\"cancel()\"></div>\n" +
    "<div class=\"modal-header\" translate>Import KeyStore (Android)</div>\n" +
    "<div ng-show=\"importing\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Importing...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <img ng-src=\"{{'/img/size32/icon_loading.gif'}}\">\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <div class=\"divTable middleTitle\">\n" +
    "        <section>\n" +
    "            <p translate>You can import KeyStore file from other source (eclipse). Please refer to the manual for details.</p>\n" +
    "            <div>\n" +
    "                <label>KeyStore file&nbsp;:</label>\n" +
    "                <div>\n" +
    "                    <input type=\"text\" name=\"filePath\" ng-model=\"filePath\" readonly required>\n" +
    "                    <em><button class=\"m-btn m-btn-default-dark\" type=\"button\" ng-click=\"openFileDialog('file')\"><span translate>Browse</span></button></em>\n" +
    "                    <input name=\"file\" type=\"file\" onchange=\"this.files.length && angular.element(this).scope().selectFile(this);this.value = '';\" style=\"display:none;\">\n" +
    "                    <span ng-messages=\"dialogForm.filePath.$error\" ng-show=\"dialogForm.filePath.$dirty\">\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div>\n" +
    "                <label class=\"lh-clear\" translate>Please input password <br />for KeyStore&nbsp;:</label>\n" +
    "                <div>\n" +
    "                    <input type=\"password\" name=\"password\" ng-model=\"password\" ng-enter=\"ok()\" required>\n" +
    "                    <span ng-messages=\"dialogForm.password.$error\" ng-show=\"dialogForm.password.$dirty\">\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </section>\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn monaca-btn-gray\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" ng-disabled=\"dialogForm.$invalid\" translate>Import</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/PackageCertificateExportDialog.html",
    "<div class=\"close-x\" ng-click=\"cancel()\"></div>\n" +
    "<div class=\"modal-header\" translate>Export Package Certificate Key</div>\n" +
    "<div ng-show=\"exporting\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Exporting...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <img ng-src=\"{{'/img/size32/icon_loading.gif'}}\">\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <div>\n" +
    "        <p translate>You can export the data to make a backup on your local PC.</p>\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>Export</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/PrivateKeyAndCsrGeneratorDialog.html",
    "<div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "<div ng-show=\"page == 'input'\">\n" +
    "    <div class=\"modal-header\" translate>Generate Private Key and CSR</div>\n" +
    "    <div ng-show=\"generating\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Generating...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "\n" +
    "    <section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "        <section class=\"section-end\">\n" +
    "        <p translate>Please input your name and email address which match with your Apple ID Account.</p>\n" +
    "        <div class=\"divTable longTitle\">\n" +
    "            <div>\n" +
    "                <label class=\"lh-clear\"><strong translate>User Name:</strong></label>\n" +
    "                <div>\n" +
    "                    <input type=\"text\" name=\"adcUsername_ios\" placeholder=\"Apple ID Name\" ng-model=\"adcUsername_ios\" required>\n" +
    "                    <span ng-messages=\"dialogForm.adcUsername_ios.$error\" ng-show=\"dialogForm.adcUsername_ios.$dirty\" ng-cloak>\n" +
    "                        <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div>\n" +
    "                <label class=\"lh-clear\"><strong translate>Email Address:</strong></label>\n" +
    "                <div>\n" +
    "                    <input type=\"email\" name=\"adcMailAddress_ios\" placeholder=\"Apple ID Email Address\" ng-model=\"adcMailAddress_ios\" required>\n" +
    "                    <span ng-messages=\"dialogForm.adcMailAddress_ios.$error\" ng-show=\"dialogForm.adcMailAddress_ios.$dirty\" ng-cloak>\n" +
    "                        <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div>\n" +
    "                <label><strong translate>Country:</strong></label>\n" +
    "                <div class=\"m-component-combobox\">\n" +
    "                    <select ng-model=\"country\" ng-options=\"item.code as item.label for item in countryList | orderBy: 'label'\"></select>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        </section>\n" +
    "    </section>\n" +
    "\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "        <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"generatePrivateKeyAndCSR()\" ng-disabled=\"dialogForm.$invalid\" translate>Generate Key and CSR</button>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page == 'success'\">\n" +
    "    <div class=\"modal-header\">CSR has been generated.</div>\n" +
    "\n" +
    "    <section class=\"modal-body\">\n" +
    "        <div>\n" +
    "            <p translate>CSR has been generated. <br>Please upload generated CSR to Apple Developer Program to issue certificate.</p>\n" +
    "        </div>\n" +
    "    </section>\n" +
    "\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"exportCsr()\">Download CSR</button>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "");
  $templateCache.put("build/dialogs/PrivateKeyImportDialog.html",
    "<div>\n" +
    "    <div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "    <div class=\"modal-header\" translate>Import Private Key</div>\n" +
    "    <div ng-show=\"importing\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Importing...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "\n" +
    "    <section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "        <div class=\"divTable\">\n" +
    "            <p translate>You can import private key exported from Key Chain Access (Mac OS X). Please refer to the manual for details.</p>\n" +
    "            <div>\n" +
    "                <label translate>Key (PKCS#12 .p12):</label>\n" +
    "                <div>\n" +
    "                    <input type=\"text\" name=\"selectedFilePath\" ng-model=\"selectedFilePath\" disabled required>\n" +
    "                    <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog('file')\"><span translate>Browse</span></button></em>\n" +
    "                    <input name=\"file\" type=\"file\" accept=\".p12\" onchange=\"this.files.length && angular.element(this).scope().selectFile(this);this.value = '';\" style=\"display:none;\">\n" +
    "                    <span ng-messages=\"dialogForm.selectedFilePath.$error\" ng-show=\"dialogForm.selectedFilePath.$dirty\" ng-cloak>\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div>\n" +
    "                <label translate>Password for the Key:</label>\n" +
    "                <div>\n" +
    "                    <input type=\"password\" name=\"password\" ng-model=\"password\" ng-enter=\"importPrivateKey()\">\n" +
    "                    <span ng-messages=\"dialogForm.password.$error\" ng-show=\"dialogForm.password.$dirty\" ng-cloak>\n" +
    "                        <span ng-message=\"required\" class=\"config-error\">This field is required</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </section>\n" +
    "\n" +
    "    <div class=\"modal-footer\">\n" +
    "        <button class=\"m-btn m-btn m-btn-default\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "        <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"importPrivateKey()\" ng-disabled=\"dialogForm.$invalid\" translate>Import</button>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "");
  $templateCache.put("build/dialogs/RestartPreviewServerDialog.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "  <spinner s-type=\"modal\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"ok()\" translate>Restart</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/dialogs/SendManualDeployServiceRequest.html",
    "<div class=\"modal-header\" translate>Manual Deploy Service</div>\n" +
    "\n" +
    "<section class=\"modal-body manual-deploy-service-dialog\">\n" +
    "  <section>\n" +
    "    <h1 translate>Service Provider Information</h1>\n" +
    "    <div class=\"divTable\">\n" +
    "      <div class=\"flex-container\">\n" +
    "        <label><strong translate>Deploy Service:</strong></label>\n" +
    "        <div><i>{{service.service_type}}</i></div>\n" +
    "      </div>\n" +
    "      <div class=\"flex-container\">\n" +
    "        <label><strong translate>Alias:</strong></label>\n" +
    "        <div><i>{{service.alias}}</i></div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"section-end\" ng-show=\"showOptionalParamForm\">\n" +
    "    <h1 translate>Optional Parameter Entry</h1>\n" +
    "    <p translate>For more information on third-party distribution service's optional parameters, please visit <a ng-href=\"{{ docUrl.ci_support_service }}\">Monaca\n" +
    "        Support Docs</a>.</p>\n" +
    "    <textarea ng-model=\"serviceOptionalParameters\"></textarea>\n" +
    "  </section>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"sendToDeployService()\" ng-disable=\"!selected_service\"\n" +
    "    translate>Deploy</button>\n" +
    "</div>");
  $templateCache.put("build/dialogs/ViewManualDeployServiceLog.html",
    "<div class=\"modal-header\" translate>Manual Deploy Service Log</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <textarea style=\"height: 150px; width: 100%;\" ng-model=\"service.manualProcessResults\" readonly></textarea>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/ElectronAppSettings.html",
    "<div ng-controller=\"ElectronAppSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <!-- Show Sippner -->\n" +
    "    <div ng-show=\"loading\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"saving\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\" ng-form=\"form\">\n" +
    "        <div class=\"cell-build-panel add-about\">\n" +
    "            <h1 translate>{{ template }} App Configuration</h1>\n" +
    "            <div class=\"add-about-text\" translate>Please input necessary configurations for building {{ template }} application. This configuration is saved by project basis.</div>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 ng-cloak translate>Application Information</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "                    <div>\n" +
    "                        <label>\n" +
    "                            <span translate>Application Name:</span>\n" +
    "                            <span class=\"m-tooltip-body icon-help\">\n" +
    "                                <i class=\"m-tooltip tt-text-leftside\" translate>\n" +
    "                                    Application's display name.<br>Note that this field is common between all other platforms, except PWA.<br>\n" +
    "                                    Submitting your app to store may fail if some symbols are included.\n" +
    "                                </i>\n" +
    "                            </span>\n" +
    "                        </label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationName_electron\" ng-model=\"settings.applicationName_electron\" ng-pattern=\"/^(?!(&|@)).*$/\" class=\"long-text\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationName_electron.$valid && valueChanged('applicationName_electron')\">\n" +
    "                                <span translate>Note that this field is common between all other platforms, except PWA.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationName_electron.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Cannot start with &rsquo;&amp;&rsquo; and &rsquo;@&rsquo;.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>App ID:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>It is recommended you use reverse-domain style (e.g. com.example.appname).<br/>You can use only alphanumeric characters and periods.<br/>At least one period must be used.<br/>Each segment separated by periods should begin with an alphabetic character.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationId_electron\" ng-model=\"settings.applicationId_electron\"\n" +
    "                                   ng-pattern=\"/^([a-zA-Z]+[a-zA-Z0-9_]*\\.){1,}[a-zA-Z]+[a-zA-Z0-9_]*$/\" class=\"long-text\" class=\"long-text\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationId_electron.$valid && valueChanged('applicationId_electron')\">\n" +
    "                                <span translate>Note that this field is common between all other platforms, except Windows and PWA.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationId_electron.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>Version Number:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Enter the Application Version number.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"versionNumber_electron\" ng-model=\"settings.versionNumber_electron\" ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})$/\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.versionNumber_electron.$valid && valueChanged('versionNumber_electron')\">\n" +
    "                               <span translate>Note that this field is common between all other platforms, except PWA.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.versionNumber_electron.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Specify three numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>Application Description:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Enter your Application's Description.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <!--TODO: Disable the horizontal resizing - textarea { resize: horizontal; } -->\n" +
    "                            <textarea name=\"applicationDescription_electron\" ng-model=\"settings.applicationDescription_electron\" rows=\"4\" cols=\"20\" placeholder=\"*\"></textarea>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationDescription_electron.$valid && valueChanged('applicationDescription_electron')\">\n" +
    "                               <span translate>Note that this field is common between all other platforms, except iOS, Android and PWA.</span>\n" +
    "                            </span>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationDescription_electron.$valid && valueChanged('applicationDescription_electron')\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"!isRPGUser\">\n" +
    "                <legend>\n" +
    "                    <h2 translate>Icons</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>PNG format is supported. Icons are shared across Linux, macOS and Windows Electron platforms. Icon should be at least 512x512 pixels to work across all operating systems.</div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-ios\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in iconTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" id=\"image-{{iconType}}\" onload=\"angular.element(this).scope().checkIconSize(512,512);\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default ng-binding\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <span class=\"config-error\" ng-hide=\"validUploadImage\" translate>Icon should be at least 512x512 pixels to work across all operating systems.</span>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <div><h2 translate>Splash</h2></div>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        Only PNG format is supported. Large pictures will be auto-scaled to fit the size. Splash Screen icon is shared across Linux, macOS and Windows Electron platforms.\n" +
    "                    </div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <!--TODO: create a class for electron images-->\n" +
    "                        <div class=\"sfl-win-splash\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(splashType,splash) in splashTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{splashType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\">\n" +
    "                                    <a ng-href=\"{{splash.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{splash.url}}&amp;t={{timestamp()}}\" id=\"image-{{splashType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config tableCell\">\n" +
    "                                    <label><span ng-bind-html=\"splash.name\"></span>{{splash.w}} x {{splash.h}}</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog(splashType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{splashType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tableCell\">\n" +
    "                        <label translate>Background Color:</label>\n" +
    "                        <div>\n" +
    "                            <input color-picker type=\"text\" name=\"theme_color\" ng-model=\"settings.splash_screen_background_color\" color-picker-model=\"settings.splash_screen_background_color\" ng-style=\"{background:settings.splash_screen_background_color}\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\" translate>Back</a>\n" +
    "            <button id=\"button-save\" class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"submit()\" disabled=\"disabled\" ng-class=\"{disable: !isReadyToSave || form.$invalid || !validIcon}\" ng-disabled=\"!isReadyToSave || form.$invalid || !validIcon\" translate>Save</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/ElectronBuild.html",
    "<div ng-controller=\"ElectronBuildController\" ng-init=\"init()\">\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <!-- Show Sippner -->\n" +
    "    <div ng-show=\"updating\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"building\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Starting build...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <h1 translate>Build {{ template }} App</h1>\n" +
    "        </div>\n" +
    "        \n" +
    "        <div notification-of-unsupported-cordova></div>\n" +
    "\n" +
    "        <!--TODO: Icons for Debugging and Release-->\n" +
    "        <ul class=\"category-tabs\">\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'development'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('development')\" translate>Build for Debugging</a>\n" +
    "            </li>\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'production'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('production')\" translate>Build for Release</a>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <div class=\"type-tabs\">\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'development'}\" id=\"development\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-class=\"{'active': purpose === 'debug'}\">\n" +
    "                        <a class=\"debug-electron-{{template}} {{lang}}\" data-toggle=\"tab\" alt=\"Debug Build\" ng-click=\"changeTab('development', 'debug')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "\n" +
    "                    <!--Debug Build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'debug'}\" id=\"development-debug\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>An Electron {{ template }} application with open Chrome DevTools will be built.</p>\n" +
    "                            </div>\n" +
    "                            <br />\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "                            <div class=\"m-container\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>App Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn m-btn-default-dark\" ng-click=\"manageAppSettings()\" translate>Manage App Settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\">\n" +
    "                                    <div><p translate>App icon, splash screen, file version number etc. can be set in the {{ template }} App Settings screen.</p></div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'production'}\" id=\"production\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-class=\"{'active': purpose === 'release'}\">\n" +
    "                        <a class=\"release-electron-{{template}} {{lang}}\" data-toggle=\"tab\" alt=\"Release Build\" ng-click=\"changeTab('production', 'release')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "\n" +
    "                    <!--Release build-->\n" +
    "                    <!-- App Setting -->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'release'}\" id=\"production-release\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>An Electron {{ template }} application will be built.</p>\n" +
    "                            </div>\n" +
    "                            <br />\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "                            <div class=\"m-container\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>App Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn m-btn-default-dark\" ng-click=\"manageAppSettings()\" translate>Manage App Settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\">\n" +
    "                                    <div><p translate>App icon, splash screen, file version number etc. can be set in the {{ template }} App Settings screen.</p></div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <!-- Build Package Option -->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': template === 'Windows' && purpose === 'release'}\" id=\"production-release-build-option\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>\n" +
    "                                    The windows release build supports the following build packages:\n" +
    "                                </p>\n" +
    "                                <ul>\n" +
    "                                    <li translate>&nbsp; - NSIS: it will generate an NSIS installer.</li>\n" +
    "                                    <li translate>&nbsp; - ZIP: it will pack everythings into a zip file.</li>\n" +
    "                                </ul>\n" +
    "                                <br />\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Package Option</span></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\">\n" +
    "                                    <div><span translate>Package</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-model=\"selectedBuildPackage\" ng-options=\"item as (item|uppercase) for item in buildPackages\" ng-change=\"changeBuildPackage()\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"build()\" ng-disabled=\"!canBuild || building\" disabled translate>Start Build</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <script type=\"text/ng-template\" id=\"build-problems\">\n" +
    "        <div class=\"box-warningarea\" ng-show=\"buildWarnings.length\">\n" +
    "            <p translate>Build Setting Warnings</p>\n" +
    "            <div class=\"box-warningCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildWarnings\">\n" +
    "                        <!--App Name-->\n" +
    "                        <span ng-if=\"item.value && item.key == 'warning_app_name'\" translate>The application id contains invalid characters.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"box-errorarea\" ng-show=\"!canBuild && buildProblems.length\">\n" +
    "            <p translate>You do not have the necessary setting to build.</p>\n" +
    "            <div class=\"box-errorCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildProblems\">\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_cordova_version'\" translate>Electron Build requires Cordova 9.0 or later. Please upgrade Cordova version.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_remaining_slot'\" translate>Number of builds per day has reached the maximum.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_icon'\" translate>Icon should be at least 512x512 pixels to work across all operating systems.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "    </script>\n" +
    "\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/IosAppSettings.html",
    "<div ng-controller=\"IosAppSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <!-- Show Sippner -->\n" +
    "    <div ng-show=\"loading\" class=\"loading\">\n" +
    "            <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"saving\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\" ng-form=\"form\">\n" +
    "        <div class=\"cell-build-panel add-about\">\n" +
    "            <h1 translate>iOS App Configuration</h1>\n" +
    "            <div class=\"add-about-text\" translate>Please input necessary configurations for building iOS application. This configuration is saved by project basis.<a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a></div>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 ng-cloak translate>Application Information</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "                    <div>\n" +
    "                        <label>\n" +
    "                            <span translate>Application Name:</span>\n" +
    "                            <span class=\"m-tooltip-body icon-help\">\n" +
    "                                <i class=\"m-tooltip tt-text-leftside\" translate>\n" +
    "                                    Application's display name.<br>Note that this field is common to Android and iOS.<br>\n" +
    "                                    Submitting your app to store may fail if some symbols are included.\n" +
    "                                </i>\n" +
    "                            </span>\n" +
    "                        </label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationName_ios\" ng-model=\"settings.applicationName_ios\" ng-pattern=\"/^(?!(&|@)).*$/\" class=\"long-text\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationName_ios.$valid && valueChanged('applicationName_ios')\">\n" +
    "                                <span translate>Android Application Name will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationName_ios.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Cannot start with &rsquo;&amp;&rsquo; and &rsquo;@&rsquo;.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>App ID:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>It is recommended you use reverse-domain style (e.g. com.example.appname).<br/>You can use only alphanumeric characters and periods.<br/>At least one period must be used.<br/>Each segment separated by periods should begin with an alphabetic character.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"applicationID_ios\" ng-model=\"settings.applicationID_ios\" ng-pattern=\"/^[^\\*]*$/\" class=\"long-text\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.applicationID_ios.$valid && valueChanged('applicationID_ios')\">\n" +
    "                                <span translate>Android Package Name will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.applicationID_ios.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Cannot contain *</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>Version Number:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Enter the Version Number which you specified in App Store Connect.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"versionName_ios\" ng-model=\"settings.versionName_ios\" ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})$/\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.versionName_ios.$valid && valueChanged('versionName_ios')\">\n" +
    "                                <span translate>Android/Windows Version will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.versionName_ios.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Specify three numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>Bundle Version Number:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Enter the Bundle Version Number which specifies the build version number of the bundle.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"bundleVersion_ios\" ng-model=\"settings.bundleVersion_ios\" ng-disabled=\"!specifyBundleVersion\" ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})(\\.(\\d{1,2}))?$/\" ng-required=\"specifyBundleVersion\">\n" +
    "                            <div>\n" +
    "                                <ul>\n" +
    "                                    <li><input type=\"checkbox\" ng-model=\"specifyBundleVersion\" id=\"checkbox_specifyBundleVersion\"><label for=\"checkbox_specifyBundleVersion\" translate>Specify different version for bundle</label></li>\n" +
    "                                    <li>\n" +
    "                                        <span ng-messages=\"form.bundleVersion_ios.$error\" ng-show=\"isInitialized\">\n" +
    "                                            <span ng-message=\"pattern\" class=\"config-error\" translate>Specify three or four numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.</span>\n" +
    "                                            <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                                        </span>\n" +
    "                                    </li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"localizationItems-contents text-top\">\n" +
    "                        <label><span translate>Localizations:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Specifies the display locale in the native widgets (i.e. \"Copy\" when selecting a text.)</i></span></label>\n" +
    "                        <div>\n" +
    "                            <div ng-repeat=\"item in localizationItems\">\n" +
    "                                <input type=\"checkbox\" id=\"localization_{{$index}}\" checklist-model=\"settings.localizations_ios\" checklist-value=\"item.value\">\n" +
    "                                <label for=\"localization_{{$index}}\">{{item.label}}</label>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Target Device Family</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel targetDeviceFamily-body\">\n" +
    "                    <div>\n" +
    "                        <div>\n" +
    "                            <label for=\"checkbox_targetFamilyiPhone_ios\">\n" +
    "                                <img src=\"img/build/cell/ico-iphone.png\">\n" +
    "                            </label>\n" +
    "                            <div class=\"targetDeviceFamily-item\">\n" +
    "                                <input type=\"checkbox\" id=\"checkbox_targetFamilyiPhone_ios\" name=\"targetFamily\" ng-model=\"settings.targetFamilyiPhone_ios\" ng-true-value=\"1\" ng-false-value=\"0\" ng-required=\"!settings.targetFamilyiPad_ios && !settings.targetFamilyiPhone_ios\">\n" +
    "                                <label for=\"checkbox_targetFamilyiPhone_ios\" translate>iPhone, iPod touch</label>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                        <div>\n" +
    "                            <label for=\"checkbox_targetFamilyiPad_ios\">\n" +
    "                                <img src=\"img/build/cell/ico-ipad.png\">\n" +
    "                            </label>\n" +
    "                            <div class=\"targetDeviceFamily-item\">\n" +
    "                                <input type=\"checkbox\" id=\"checkbox_targetFamilyiPad_ios\" name=\"targetFamily\" ng-model=\"settings.targetFamilyiPad_ios\" ng-true-value=\"1\" ng-false-value=\"0\" ng-required=\"!settings.targetFamilyiPad_ios && !settings.targetFamilyiPhone_ios\">\n" +
    "                                <label for=\"checkbox_targetFamilyiPad_ios\" translate>iPad</label>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"config-error-body\">\n" +
    "                        <ul>\n" +
    "                            <li>\n" +
    "                                <span ng-messages=\"form.targetFamily.$error\" ng-show=\"isInitialized\">\n" +
    "                                    <span ng-message=\"required\" class=\"config-error\" translate>You need to check at least 1 target.</span>\n" +
    "                                    <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                                </span>\n" +
    "                            </li>\n" +
    "                        </ul>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Icons</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        PNG format is supported. Large pictures will be auto-scaled to fit right size.\n" +
    "                    </div>\n" +
    "                    <div class=\"updateAllImagesAtOnce-contents\">\n" +
    "                        <div translate>Update all images at once.</div>\n" +
    "                        <div>\n" +
    "                            <em><button class=\"m-btn m-btn-default-dark\" type=\"button\" ng-click=\"openFileDialog('icon_all_ios')\"><span translate>Upload</span></button></em>\n" +
    "                            <input name=\"icon_all_ios\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-ios\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in iconTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" id=\"image-{{iconType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"icon.name\"></span><br>({{icon.w}} x {{icon.h}}) </label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default ng-binding\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"!(storeIconTypeList | isEmptyObj)\">\n" +
    "                <legend>\n" +
    "                    <h2 translate>Icons for App Store</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        PNG format is supported. Large pictures will be auto-scaled to fit right size. Images containing transparent backgrounds or alpha channels can not be set.\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-ios\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in storeIconTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" id=\"image-{{iconType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"icon.name\"></span><br>({{icon.w}} x {{icon.h}}) </label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default ng-binding\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"!isRPGUser\">\n" +
    "                <legend>\n" +
    "                    <h2 translate>Splash Screen</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel splashScreen-body\">\n" +
    "                    <div class=\"config-info\" translate>Please register Splash screen which will be displayed when opening the application.<br>PNG format is supported. Large pictures will be auto-scaled to fit the size.</div>\n" +
    "                    <div class=\"updateAllImagesAtOnce-contents iosSplashSelect\">\n" +
    "                        <ul ng-if=\"canChangeSplashScreenMode\">\n" +
    "                            <li>\n" +
    "                                <strong translate>Splash screen type</strong>\n" +
    "                                <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\" ng-show=\"splashTypeIsChanging\">\n" +
    "                            </li>\n" +
    "                            <li>\n" +
    "                                <input type=\"radio\" id=\"iosSplashTypeLegacy\" name=\"iosSplashType\" value=\"legacy\" ng-model=\"settings.ios_splash_type\" ng-change=\"attemptSplashTypeChange()\" ng-disabled=\"splashTypeIsChanging\" />\n" +
    "                                <label for=\"iosSplashTypeLegacy\" translate>Legacy</label>\n" +
    "                                <span class=\"m-tooltip-body icon-help\">\n" +
    "                                    <i class=\"m-tooltip tt-text-leftside\" translate>\n" +
    "                                        Legacy splash screen configuration requires a separate image for each size of iOS device. Monaca can generate all the correct sizes for you from one image, or you can upload them individually. However, this does not support devices such as iPhone X.\n" +
    "                                    </i>\n" +
    "                                </span>\n" +
    "                            </li>\n" +
    "                            <li>\n" +
    "                                <input type=\"radio\" id=\"iosSplashTypeStoryboard\" name=\"iosSplashType\" value=\"storyboard\" ng-model=\"settings.ios_splash_type\" ng-change=\"attemptSplashTypeChange()\" ng-disabled=\"splashTypeIsChanging\" />\n" +
    "                                <label for=\"iosSplashTypeStoryboard\" translate>Storyboard (Recommended)</label>\n" +
    "                                <span class=\"m-tooltip-body icon-help\">\n" +
    "                                    <i class=\"m-tooltip tt-text-leftside\" translate>\n" +
    "                                        A storyboard splash screen uses one image for all screen sizes and crops it as necessary. You must use a storyboard to create full-screen apps on iPhone X.\n" +
    "                                    </i>\n" +
    "                                </span>\n" +
    "                            </li>\n" +
    "                        </ul>\n" +
    "                        <div ng-class=\"{iosSplashSelectLegacyUpload:canChangeSplashScreenMode}\" ng-if=\"settings.ios_splash_type === 'legacy'\">\n" +
    "                            <div translate>Update all images at once.</div>\n" +
    "                            <em><button class=\"m-btn m-btn-default-dark ng-binding\" ng-click=\"openFileDialog('splash_all_ios')\"><span translate>Upload</span></button></em>\n" +
    "                            <input name=\"splash_all_ios\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-ios\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(splashType,splash) in displaySplashImages\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{splashType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{splashType}}\">\n" +
    "                                    <a ng-href=\"{{splash.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{splash.url}}&amp;t={{timestamp()}}\" id=\"image-{{splashType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"splash.name\"></span><br>({{splash.w}} x {{splash.h}})</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <button class=\"m-btn m-btn-default ng-binding\" type=\"button\" ng-click=\"openFileDialog(splashType)\"><span translate>Change</span></button>\n" +
    "                                            <input name=\"{{splashType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"tableCell\" ng-if=\"!isRPGUser\">\n" +
    "                        <label><span translate><a ng-href=\"{{ docsUrl.tips_splashscreen }}\" target=\"_blank\">Hide by</a></span>:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>You can manually hide the splash screen with JavaScript to increase user experience.</i></span></label>\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select name=\"config_auto_hide_splash_screen\" ng-model=\"settings.config_auto_hide_splash_screen\">\n" +
    "                                <option value=\"false\" translate>Hide by JavaScript</option>\n" +
    "                                <option value=\"true\" translate>Hide Automatically</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tableCell\" ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Fade Splash Screen:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" ng-model=\"settings.config_fade_splash_screen\" id=\"config_fade_splash_screen\">\n" +
    "                            <label for=\"config_fade_splash_screen\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tableCell\" ng-if=\"!isRPGUser\">\n" +
    "                        <label translate>Show Splash Screen Spinner:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" ng-model=\"settings.config_show_splash_screen_spinner\" id=\"config_show_splash_screen_spinner\">\n" +
    "                            <label for=\"config_show_splash_screen_spinner\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset ng-if=\"isRPGUser\">\n" +
    "                <legend>\n" +
    "                    <h2>背景画像</h2>\n" +
    "                    <div class=\"tableCell\">\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select name=\"rpgtkool_background_image_ios\" ng-model=\"settings.selected_rpg_background_image_ios\"\n" +
    "                                    ng-options=\"image for image in rpg_background_images_ios\">\n" +
    "                                <option value=\"\">なし</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </legend>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <h2 translate>Misc</h2>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel misc-body tableCell-all\" ng-if=\"!isRPGUser\">\n" +
    "                    <div ng-show=\"settings.config_webview_engine_ios\">\n" +
    "                        <label class=\"lh-clear\" translate>WebView Engine:</label>\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select name=\"config_webview_engine_ios\" ng-model=\"settings.config_webview_engine_ios\"\n" +
    "                                ng-options=\"webview.value as webview.label for webview in iosWebviewEngine\">\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"allowedURL-contents text-top\">\n" +
    "                        <label><span translate>Allowed URL:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>One hostname per line. It can also start with protocol (http://). If you specify [subdomains] after the hostname, all subdomains are applied.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <textarea name=\"config_access_origin_ios\" ng-model=\"settings.config_access_origin_ios\" rows=\"4\" cols=\"20\" placeholder=\"*\" required></textarea>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.config_access_origin_ios.$valid && valueChanged('config_access_origin_ios')\">\n" +
    "                                <span translate>Android Allowed URL will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.config_access_origin_ios.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label><span translate>Disallow Overscroll:</span><span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>Disable bouncing in WebView.<br>Note that this field is common to Android and iOS.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" ng-model=\"settings.config_disallow_overscroll_ios\" id=\"config_disallow_overscroll_ios\" ng-true-value=\"true\" ng-false-value=\"false\">\n" +
    "                            <label for=\"config_disallow_overscroll_ios\" translate>Enable</label>\n" +
    "                            <span class=\"config-warning\" ng-show=\"valueChanged('config_disallow_overscroll_ios')\">\n" +
    "                                <span translate>Android Overscroll configuration will also be changed.</span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Enable Viewport Scale:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"checkbox\" ng-model=\"settings.config_enable_viewport_scale\" id=\"config_enable_viewport_scale\">\n" +
    "                            <label for=\"config_enable_viewport_scale\" translate>Enable</label>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label class=\"lh-clear\" translate>Screen Orientation:</label>\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select name=\"config_orientation_ios\" ng-model=\"settings.config_orientation_ios\">\n" +
    "                                <option value=\"all\">All</option>\n" +
    "                                <option value=\"landscape\">Landscape</option>\n" +
    "                                <option value=\"portrait\">Portrait</option>\n" +
    "                            </select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <div class=\"form-error-msg\">\n" +
    "                <span ng-messages=\"form.targetFamily.$error\" ng-show=\"isInitialized\">\n" +
    "                    <span ng-message=\"required\" class=\"config-error\" translate>You need to check at least 1 iOS target device family.</span>\n" +
    "                </span>\n" +
    "            </div>\n" +
    "            <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\">Back</a>\n" +
    "            <button id=\"button-save\" class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"submit()\" disabled=\"disabled\" ng-class=\"{disable: !isReadyToSave || form.$invalid}\" ng-disabled=\"!isReadyToSave || form.$invalid\" translate>Save</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/IosBuild.html",
    "<div ng-controller=\"IosBuildController\" ng-init=\"init()\">\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <div ng-show=\"updating\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"building\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Starting build...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <h1 translate>Build iOS App</h1>\n" +
    "        </div>\n" +
    "        <div notification-of-unsupported-cordova></div>\n" +
    "\n" +
    "        <ul class=\"category-tabs\">\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'development'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('development')\" translate>Build for Debugging</a>\n" +
    "            </li>\n" +
    "            <li class=\"tab-wrapper\" ng-class=\"{'active': type === 'production'}\">\n" +
    "                <a class=\"tab\" data-toggle=\"tab\" ng-click=\"changeTab('production')\" translate>Build for Release</a>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <div class=\"type-tabs\">\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'development'}\" id=\"development\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-hide=\"isRPGUser || isReactNative || !isCustomBuildDebuggerServiceEnabled\" ng-class=\"{'active': purpose === 'debugger'}\">\n" +
    "                        <a class=\"debugger {{lang}}\" data-toggle=\"tab\" alt=\"Debugger Build\" ng-click=\"changeTab('development', 'debugger')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-hide=\"isRPGUser || isReactNative || !isCustomBuildDebuggerServiceEnabled\"><div class=\"vertical-border\"></div></li>\n" +
    "                    <li ng-class=\"{'active': purpose === 'debug'}\">\n" +
    "                        <a class=\"debug-ios {{lang}}\" data-toggle=\"tab\" alt=\"Debug Build\" ng-click=\"changeTab('development', 'debug')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-show=\"hasSimulatorBuild\" ng-class=\"{'active': purpose === 'simulator'}\">\n" +
    "                        <a class=\"simulator-ios {{lang}}\" data-toggle=\"tab\" alt=\"Simulator Build\" ng-click=\"changeTab('development', 'simulator')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "\n" +
    "                    <!--Debugger Build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'debugger'}\" id=\"development-debugger\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A debugger for your device can be built.  <br /> A debugger including Cordova plugins enabled in the Plugin Management screen can be built.  The operation of plugins not included in the store-version debugger can be checked. <br /> USB debugging, and high-level debugging of Javascript using Monaca CLI or Localkit is possible.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': profiles && profiles.development.length, 'm-btn-blue': !profiles || !profiles.development.length}\" ng-click=\"manageBuildSettings()\" translate>Manage build settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\" ng-show=\"!profiles\">&nbsp;</div>\n" +
    "                                <div class=\"m-text\" ng-show=\"profiles && profiles.development.length\">\n" +
    "                                    <div><span translate>Provisioning File</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-change=\"changeProfile()\" ng-model=\"profile.debugger\" ng-options=\"profile.value as profile.label for profile in profiles.development\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text-alert\" ng-show=\"profiles && !profiles.development.length\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program developer certificate and associated Development Provisioning profile.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <!--Debug Build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'debug'}\" id=\"development-debug\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A debug build can be created. <br /> A registered Apple Developer Program developer certificate, and a Development Provisioning profile are required.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': profiles && profiles.development.length, 'm-btn-blue': !profiles || !profiles.development.length}\" ng-click=\"manageBuildSettings()\" translate>Manage build settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\" ng-show=\"!profiles\">&nbsp;</div>\n" +
    "                                <div class=\"m-text\" ng-show=\"profiles && profiles.development.length\">\n" +
    "                                    <div><span translate>Provisioning File</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-change=\"changeProfile()\" ng-model=\"profile.debug\" ng-options=\"profile.value as profile.label for profile in profiles.development\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text-alert\" ng-show=\"profiles && !profiles.development.length\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program developer certificate and associated Development Provisioning profile.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-if=\"!dSYMLoading && project.isGreaterOrEqualCordovaVersion(10) && canDownloadDsym\" class=\"dsym-download-status\">\n" +
    "                                <span translate>dSYM Download:</span>\n" +
    "                                <span ng-if=\"dSYMEnabled\" translate>On</span>\n" +
    "                                <span ng-if=\"!dSYMEnabled\" translate>Off</span>\n" +
    "                                <a ng-click=\"openBuildEnvironment()\" href=\"#\" class=\"configure\"><span translate>Configure</span></a>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"tab-pane\" ng-show=\"hasSimulatorBuild\" ng-class=\"{'active': purpose === 'simulator'}\" id=\"development-simulator\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A simulator build can be created.<br />This build will not use an Apple Developer certificate or provisioning profile.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\" ng-show=\"!canBuild\"></div>\n" +
    "\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"tab-pane\" ng-class=\"{'active': type === 'production'}\" id=\"production\">\n" +
    "                <ul class=\"nav-icon-tabs\">\n" +
    "                    <li ng-class=\"{'active': purpose === 'release'}\">\n" +
    "                        <a class=\"release-ios {{lang}}\" data-toggle=\"tab\" alt=\"Release Build\" ng-click=\"changeTab('production', 'release')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-if=\"!isRPGUser\" ng-class=\"{'active': purpose === 'adhoc'}\">\n" +
    "                        <a class=\"adhoc {{lang}}\" data-toggle=\"tab\" alt=\"Ad-hoc Build\" ng-click=\"changeTab('production', 'adhoc')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-if=\"!isRPGUser && !isReactNative\" ng-class=\"{'active': purpose === 'inhouse'}\">\n" +
    "                        <a class=\"inhouse {{lang}}\" data-toggle=\"tab\" alt=\"In-house Build\" ng-click=\"changeTab('production', 'inhouse')\"></a>\n" +
    "                    </li>\n" +
    "                    <li ng-if=\"!isRPGUser && !isReactNative\" ng-class=\"{'active': purpose === 'inapp_updater'}\">\n" +
    "                        <a class=\"inappupdater-releaseBuild {{lang}}\" data-toggle=\"tab\" alt=\"In-App Updater update file\" ng-click=\"changeTab('production', 'inapp_updater')\"></a>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "                <div class=\"tab-content\">\n" +
    "\n" +
    "                    <!--Release build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'release'}\" id=\"production-release\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>App Store distribution build. <br /> A registered Apple Developer Program distribution certificate, and a Distribution (App Store) Provisioning profile are required.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': profiles && profiles.release.length, 'm-btn-blue': !profiles || !profiles.release.length}\" ng-click=\"manageBuildSettings()\" translate>Manage build settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\" ng-show=\"!profiles\">&nbsp;</div>\n" +
    "                                <div class=\"m-text\" ng-show=\"profiles && profiles.release.length\">\n" +
    "                                    <div><span translate>Provisioning File</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-change=\"changeProfile()\" ng-model=\"profile.release\" ng-options=\"profile.value as profile.label for profile in profiles.release\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text-alert\" ng-show=\"profiles && !profiles.release.length\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Please generate a private key or import on the build settings screen.</p>\n" +
    "                                        <p translate>Also, please use the Apple Developer Program and register the target device distribution certificate.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-if=\"!dSYMLoading && project.isGreaterOrEqualCordovaVersion(10) && canDownloadDsym\" class=\"dsym-download-status\">\n" +
    "                                <span translate>dSYM Download:</span>\n" +
    "                                <span ng-if=\"dSYMEnabled\" translate>On</span>\n" +
    "                                <span ng-if=\"!dSYMEnabled\" translate>Off</span>\n" +
    "                                <a ng-click=\"openBuildEnvironment()\" href=\"#\" class=\"configure\"><span translate>Configure</span></a>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <!-- AdHoc Build -->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'adhoc'}\" id=\"production-adhoc\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>Limited distribution build. <br /> A registered Apple Developer Program distribution certificate, and a Distribution (AdHoc) Provisioning profile are required.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': profiles && profiles.adhoc.length, 'm-btn-blue': !profiles || !profiles.adhoc.length}\" ng-click=\"manageBuildSettings()\" translate>Manage build settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\" ng-show=\"!profiles\">&nbsp;</div>\n" +
    "                                <div class=\"m-text\" ng-show=\"profiles && profiles.adhoc.length\">\n" +
    "                                    <div><span translate>Provisioning File</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-change=\"changeProfile()\" ng-model=\"profile.adhoc\" ng-options=\"profile.value as profile.label for profile in profiles.adhoc\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text-alert\" ng-show=\"profiles && !profiles.adhoc.length\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program distribution certificate and Distribution (AdHoc) Provisioning profile.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-if=\"!dSYMLoading && project.isGreaterOrEqualCordovaVersion(10) && canDownloadDsym\" class=\"dsym-download-status\">\n" +
    "                                <span translate>dSYM Download:</span>\n" +
    "                                <span ng-if=\"dSYMEnabled\" translate>On</span>\n" +
    "                                <span ng-if=\"!dSYMEnabled\" translate>Off</span>\n" +
    "                                <a ng-click=\"openBuildEnvironment()\" href=\"#\" class=\"configure\"><span translate>Configure</span></a>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <!--In-House Build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'inhouse'}\" id=\"production-inhouse\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>Limited distribution build. <br /> A registered Apple Developer Program distribution certificate, and a Distribution (InHouse) Provisioning profile are required.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\"></div>\n" +
    "\n" +
    "                            <div class=\"m-container two-columns-status-l\">\n" +
    "                                <div class=\"title\">\n" +
    "                                    <div><span translate>Build Settings</span></div>\n" +
    "                                    <div><a class=\"m-btn\" ng-class=\"{'m-btn-default-dark': profiles && profiles.inhouse.length, 'm-btn-blue': !profiles || !profiles.inhouse.length}\" ng-click=\"manageBuildSettings()\" translate>Manage build settings</a></div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text\" ng-show=\"!profiles\">&nbsp;</div>\n" +
    "                                <div class=\"m-text\" ng-show=\"profiles && profiles.inhouse.length\">\n" +
    "                                    <div><span translate>Provisioning File</span></div>\n" +
    "                                    <div class=\"m-component-combobox mcc-ios\">\n" +
    "                                        <select ng-change=\"changeProfile()\" ng-model=\"profile.inhouse\" ng-options=\"profile.value as profile.label for profile in profiles.inhouse\"></select>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                                <div class=\"m-text-alert\" ng-show=\"profiles && !profiles.inhouse.length\">\n" +
    "                                    <div>\n" +
    "                                        <p translate>Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program distribution certificate and Distribution (InHouse) Provisioning profile.</p>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-if=\"!dSYMLoading && project.isGreaterOrEqualCordovaVersion(10) && canDownloadDsym\" class=\"dsym-download-status\">\n" +
    "                                <span translate>dSYM Download:</span>\n" +
    "                                <span ng-if=\"dSYMEnabled\" translate>On</span>\n" +
    "                                <span ng-if=\"!dSYMEnabled\" translate>Off</span>\n" +
    "                                <a ng-click=\"openBuildEnvironment()\" href=\"#\" class=\"configure\"><span translate>Configure</span></a>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <!--In-App-Updater Build-->\n" +
    "                    <div class=\"tab-pane\" ng-class=\"{'active': purpose === 'inapp_updater'}\" id=\"production-inappupdater\">\n" +
    "                        <div class=\"cell-build-panel\">\n" +
    "                            <div class=\"about-container\">\n" +
    "                                <p translate>A zip file will be created containing HTML5 assets used by the app to allow automatic updating without rebuilding or repacking.  <br /> For this build, the Monaca In-App Updater plugin must be included in the Cordova Plugin Settings screen. Please deploy the file to your web server.</p>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div ng-include src=\"'build-problems'\" ng-show=\"!canBuild || (inAppUpdaterPlugin && inAppUpdaterPlugin.canUsed)\"></div>\n" +
    "\n" +
    "                            <section class=\"error-container\" ng-show=\"inAppUpdaterPlugin && !inAppUpdaterPlugin.canUsed\">\n" +
    "                                <div class=\"error-message-container\">\n" +
    "                                    <div class=\"error-icon\"><img ng-src=\"{{'/img/0-ico-exclamation.png'}}\"></div>\n" +
    "                                    <div class=\"error-message\" translate>To use the In-App Updater update file build, an Corporate Plan upgrade is required. <br /> The Corporate Plan includes not only the automatic In-App Updater, but also extended features for resource encryption and secure storage. Details <a href=\"https://monaca.io/enterprise.html\" target=\"_blank\">here</a>.</div>\n" +
    "                                </div>\n" +
    "                                <div class=\"error-container-button-area\">\n" +
    "                                    <a class=\"m-btn m-btn-green m-btn-large\" ng-href=\"https://monaca.io/support/inquiry.html\" target=\"_blank\" translate>Apply to Corporate Plan</a>\n" +
    "                                </div>\n" +
    "                            </section>\n" +
    "\n" +
    "                            <section class=\"error-container\" ng-show=\"inAppUpdaterPlugin && inAppUpdaterPlugin.canUsed && !inAppUpdaterPlugin.isInstalled\">\n" +
    "                                <div class=\"error-message-container\">\n" +
    "                                    <div class=\"error-icon\"><img ng-src=\"{{'/img/0-ico-exclamation.png'}}\"></div>\n" +
    "                                    <div class=\"error-message\" translate>Please add the InAppUpdater plugin. <br />It can be added in the Cordova Plugin settings screen.</div>\n" +
    "                                </div>\n" +
    "                            </section>\n" +
    "\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"build()\"\n" +
    "            ng-disabled=\"!canBuild || building\" disabled translate>Start Build</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <script type=\"text/ng-template\" id=\"build-problems\">\n" +
    "        <div class=\"box-warningarea\" ng-show=\"buildWarnings.length\">\n" +
    "            <p translate>Build Setting Warnings</p>\n" +
    "            <div class=\"box-warningCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildWarnings\">\n" +
    "                        <span ng-if=\"item.value && item.key == 'xcode_version_lt_12_5_warning'\" translate>Please use Xcode 12.5.1 or greater to launch the app on your iOS 15 device. Please refer to <a href=\"https://medium.com/the-web-tub/monaca-support-xcode-12-5-1-2476904e628f\" target=\"_blank\">our documentation</a>.</span>\n" +
    "                        <!--App Name-->\n" +
    "                        <span ng-if=\"item.value && item.key == 'warning_app_name'\" translate>The application name contains invalid characters.</span>\n" +
    "                        <span ng-if=\"item.value && item.key === 'xcode_version_lt_10_1_warning'\"\n" +
    "                              translate>\n" +
    "                            Unsupported Xcode version (Xcode {{ item.value }}). Please switch to Xcode 10.1 or higher version in the Build Environment Settings\n" +
    "                        </span>\n" +
    "                        <span ng-if=\"item.value && item.key === 'xcode_version_gte_10_2_and_legacy_splash_screen_type_warning'\"\n" +
    "                              translate>\n" +
    "                            Set the splash screen type to 'Storyboard' in iOS App Configuration.\n" +
    "                        </span>\n" +
    "                        <span ng-if=\"item.value && item.key == 'ios_version_warning'\" translate>We noticed that you have defined \"cordova-ios\" package in \"devDependencies\" of \"package.json\" file. The build will fail if the version of \"cordova-ios\" is not supported by Monaca. We recommend you remove it from your \"package.json\" file.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"box-errorarea\" ng-show=\"!canBuild && buildProblems.length\">\n" +
    "            <p translate>You do not have the necessary setting to build.</p>\n" +
    "            <div class=\"box-errorCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildProblems\">\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_config_xml'\" translate>An unexpected error has occurred while reading config.xml. Please fix config.xml file.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_start_file'\" translate>App launch page is not saved.</span>\n" +
    "\n" +
    "                        <!--Certification-->\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_certificate'\" translate>Certificate is not registered.</span>\n" +
    "                        <span ng-if=\"item.value && item.key == 'certificate_error'\" translate> - Certification status ({{item.value}})</span>\n" +
    "\n" +
    "                        <!--Provisioning-->\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_provisioning'\" translate>Provisioning profile is not registered. {{provisioning_error}}</span>\n" +
    "                        <span ng-if=\"item.value && item.key == 'provisioning_error'\" translate> - Provisioning status ({{item.value}})</span>\n" +
    "\n" +
    "                        <!--App Settings-->\n" +
    "                        <span ng-if=\"item.value !== '' && item.key == 'missing_icon'\" translate>This Icon or splash screen is not set - {{ item.value }}</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_inapp_updater_setting'\" translate>In-App Updater settings is not set.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_assets_encrypt_password'\" translate>Encryption plugin password is not set.</span>\n" +
    "\n" +
    "                        <!--Permission-->\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_remaining_build_count'\" translate>Number of builds per day has reached the maximum.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_cordova_permission'\" translate>The project's Cordova version is unsupported by your current plan and can not build. Please upgrade your project and try again.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_plugin_permission'\" translate>The project contains unlicensed plugins.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'is_not_business_trial'\" translate>Release build cannot be started during the trial.</span>\n" +
    "\n" +
    "                        <span ng-if=\"!item.value && item.key == 'can_build_ios_inhouse'\" translate>Please upgrade your plan for in-house build.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'can_release_build'\" translate>Current plan does not provide release build. Please refer to\n" +
    "                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) +'/plan/manage', '_blank'); return false;\">pricing page</a> for details.</span>\n" +
    "\n" +
    "                        <span ng-if=\"item.key == 'error_messages'\">\n" +
    "                            <ul>\n" +
    "                                <li ng-repeat=\"(_key, _value) in item.value\">\n" +
    "                                    <span ng-bind-html=\"_value | trustAsHtml\"></span>\n" +
    "                                </li>\n" +
    "                            <ul>\n" +
    "                        </span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "    </script>\n" +
    "\n" +
    "<div>\n" +
    "");
  $templateCache.put("build/IosBuildSettings.html",
    "<div class=\"build-settings\" ng-controller=\"IosBuildSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <div ng-show=\"updating\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "        <header class=\"m-header-caret balloon-line\">\n" +
    "            <div class=\"cell-build-panel add-about margin-btm-clear\">\n" +
    "                <h1 translate>iOS Build Configuration</h1>\n" +
    "                <div class=\"add-about-text\" translate>Please setup necessary configurations for building iOS application. This configuration is saved by user basis.<a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a></div>\n" +
    "\n" +
    "                <fieldset>\n" +
    "                    <div class=\"config-list-box config-list-box-top border-top\">\n" +
    "                        <table class=\"list-row clb-ios\">\n" +
    "                            <caption translate>Private Key and CSR</caption>\n" +
    "                            <tbody><tr>\n" +
    "                                <th><label translate>Generate Private Key and CSR</label></th>\n" +
    "                                <td translate>Generate private key and CSR for issuing new certificate.</td>\n" +
    "                                <td><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openPrivateKeyGenerateDialog()\"><span translate>Generate Key and CSR</span></button></em></td>\n" +
    "                            </tr></tbody>\n" +
    "                        </table>\n" +
    "                    </div>\n" +
    "                </fieldset>\n" +
    "\n" +
    "                <fieldset ng-if=\"hasOldDevCert || hasOldProdCert\">\n" +
    "                    <div class=\"config-list-box export-cert\">\n" +
    "                        <table class=\"list-row clb-ios\">\n" +
    "                            <caption translate>Export Previous Private Key and Cerificates</caption>\n" +
    "                            <tbody><tr>\n" +
    "                                <th><label translate>Export previous certificate</label></th>\n" +
    "                                <td translate>Export previous private key and certificate.</td>\n" +
    "                                <td><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openExportPreviousCertificateDialog('dev')\" ng-disabled=\"!hasOldDevCert\" disabled><span translate>Export developer cert</span></button></em>\n" +
    "                                    <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openExportPreviousCertificateDialog('prod')\" ng-disabled=\"!hasOldProdCert\" disabled><span translate>Export distribution cert</span></button></em></td>\n" +
    "                            </tr></tbody>\n" +
    "                        </table>\n" +
    "                    </div>\n" +
    "                </fieldset>\n" +
    "                    \n" +
    "                <fieldset>\n" +
    "                    <div class=\"config-list-box\">\n" +
    "                        <table class=\"list-row clb-ios\">\n" +
    "                            <caption translate>Register Issued Certificate</caption>\n" +
    "                            <tbody><tr>\n" +
    "                                <th><label translate>Certificate and Profiles</label></th>\n" +
    "                                <td translate>Please upload: 1.&nbsp;Apple Developer Program certificate&nbsp;&nbsp;2.&nbsp;Associated profile&nbsp; in order.</td>\n" +
    "                                <td><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog('certificate')\" ng-disabled=\"!hasPrivateKeys\" disabled><span translate>Upload Certificate</span></button></em>\n" +
    "                                    <input name=\"certificate\" type=\"file\" onchange=\"this.files.length && angular.element(this).scope().uploadCertificate(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                    <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog('provisioning_profile')\" ng-disabled=\"!crts.length\" disabled><span translate>Upload Profile</span></button></em>\n" +
    "                                    <input name=\"provisioning_profile\" type=\"file\" onchange=\"this.files.length && angular.element(this).scope().uploadProvisioningProfile(this);this.value = '';\" style=\"display:none;\"></td>\n" +
    "                            </tr><tr>\n" +
    "                                <th><label translate>Import Secret Key and Certificate</label></th>\n" +
    "                                <td translate>Import the Keychain private key and certificate.</td>\n" +
    "                                <td><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openImportPKCSDialog()\"><span translate>Import</span></button></em></td>\n" +
    "                            </tr></tbody>\n" +
    "                        </table>\n" +
    "                    </div>\n" +
    "                </fieldset>\n" +
    "            </div>\n" +
    "        </header>\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <fieldset>\n" +
    "                <div class=\"config-list-box config-list-box-top\">\n" +
    "                    <table class=\"build-list-table ios-certificate-list\">\n" +
    "                        <caption translate>Certificates registered in Monaca</caption>\n" +
    "                        <thead>\n" +
    "                            <tr>\n" +
    "                                <th translate>Certificate</th>\n" +
    "                                <th class=\"column-profile\" translate>Profile</th>\n" +
    "                                <th class=\"column-status\" translate>Status</th>\n" +
    "                            </tr>\n" +
    "                        </thead>\n" +
    "                        <tbody>\n" +
    "                            <tr ng-show=\"!crts.length && !keys.length\" class=\"empty-list\">\n" +
    "                                <td colspan=\"3\" translate>Certificate is not registered.</td>\n" +
    "                            </tr>\n" +
    "                            <tr ng-repeat=\"crt in crts\" ng-show=\"crts.length\">\n" +
    "                                <td>\n" +
    "                                    <div>\n" +
    "                                        <div><span class=\"m-label m-label-{{crt.color}}\">{{crt.label}}</span></div>\n" +
    "                                        <div ng-class=\"{'m-text-alert': crt.expired}\">{{crt.cn}}<br />\n" +
    "                                        <span ng-show=\"crt.expirationms\" translate>expiration date: {{crt.expirationms|date:'yyyy/M/d'}}</span>\n" +
    "                                        </div>\n" +
    "                                        <div class=\"btn-right\">\n" +
    "                                            <button class=\"m-icon-btn\" ng-click=\"openExportCertificateDialog(crt.crt_id)\"><span class=\"btn-export\" aria-hidden=\"true\"></span></button>\n" +
    "                                            <button class=\"m-icon-btn\" ng-click=\"openDeleteCertificateDialog(crt)\"><span class=\"btn-deleted\" aria-hidden=\"true\"></span></button>\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </td>\n" +
    "                                <td>\n" +
    "                                    <div ng-repeat=\"prov in crt.provs\">\n" +
    "                                        <div><span class=\"m-label m-label-{{prov.color}}\">{{prov.label}}</span></div>\n" +
    "                                        <div ng-class=\"{'m-text-alert': prov.expired}\">{{prov.prov_name}}</div>\n" +
    "                                        <div class=\"btn-right\">\n" +
    "                                            <button class=\"m-icon-btn\" ng-click=\"openExportProvisioningProfileDialog(prov.prov_id)\"><span class=\"btn-export\" aria-hidden=\"true\"></span></button>\n" +
    "                                            <button class=\"m-icon-btn\" ng-click=\"openDeleteProvisioningProfileDialog(prov)\"><span class=\"btn-deleted\" aria-hidden=\"true\"></span></button>\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </td>\n" +
    "                                <td>\n" +
    "                                    <div ng-show=\"!crt.provs || !crt.provs.length\">\n" +
    "                                        <div class=\"m-text-alert\" translate>Provisioning Profile is not registered.</div>\n" +
    "                                    </div>\n" +
    "                                    <div ng-show=\"crt.expired\">\n" +
    "                                        <div class=\"m-text-alert\" translate>Certificate has expired.</div>\n" +
    "                                    </div>\n" +
    "                                    <div ng-show=\"crt.has_expired_prov\">\n" +
    "                                        <div class=\"m-text-alert\" translate>Profile has expired.</div>\n" +
    "                                    </div>\n" +
    "                                </td>\n" +
    "                            </tr><tr ng-repeat=\"key in keys\">\n" +
    "                                <td>\n" +
    "                                    <div>\n" +
    "                                        <div><span translate>Generated Private Key</span></div>\n" +
    "                                        <div>&nbsp;&nbsp;<span>(Email: {{htmlspecialchars(key.email)}})</span></div>\n" +
    "                                        <div class=\"btn-right\"><button class=\"m-icon-btn\" ng-click=\"openDeletePrivateKeyDialog(key)\"><span class=\"btn-deleted\" aria-hidden=\"true\"></span></button></div>\n" +
    "                                    </div>\n" +
    "                                </td>\n" +
    "                                <td></td>\n" +
    "                                <td>\n" +
    "                                    <a ng-show=\"key.has_csr\" ng-click=\"openExportCsrDialog(key.key_id)\" translate>Download CSR</a>\n" +
    "                                </td>\n" +
    "                            </tr>\n" +
    "                        </tbody>\n" +
    "                    </table>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"build-start-button-area\" ng-show=\"hasPrevPage()\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <div>\n" +
    "                <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\" translate>Back</a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/notification/deprecatedCordova.html",
    "<div class=\"box-errorarea\" style=\"margin: 35px;\">\n" +
    "  <p translate>The build service was terminated.</p>\n" +
    "</div>");
  $templateCache.put("build/notification/willDeprecatedCordova.html",
    "<div class=\"box-errorarea\" style=\"margin: 35px;\">\n" +
    "  <p translate>As of December 31, 2021, The build service (Cordova 7.1) will be terminated.</p>\n" +
    "</div>");
  $templateCache.put("build/ServiceIntegration.html",
    "<div ng-controller=\"ServiceIntegrationController as integration\" class=\"m-page-settings service-integration\">\n" +
    "  <div ng-show=\"integration.loading\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Loading Service Integration...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <header class=\"m-header-caret balloon-line\" ng-show=\"!integration.loading\">\n" +
    "      <h1 class=\"cell-title\" translate>Service Integrations</h1>\n" +
    "\n" +
    "      <dl class=\"catselect\">\n" +
    "        <dt translate>Category：</dt>\n" +
    "        <dd ng-click=\"integration.category = ''\" ng-class=\"{on: (integration.category === '')}\" translate>All</dd>\n" +
    "        <dd ng-click=\"integration.category = 'backend'\" ng-class=\"{on: (integration.category === 'backend')}\" translate>Backend</dd>\n" +
    "        <dd ng-click=\"integration.category = 'test'\" ng-class=\"{on: (integration.category === 'test')}\" translate>Testing</dd>\n" +
    "        <dd ng-click=\"integration.category = 'ad'\" ng-class=\"{on: (integration.category === 'ad')}\" translate>Advertisement</dd>\n" +
    "        <dd ng-click=\"integration.category = 'analytics'\" ng-class=\"{on: (integration.category === 'analytics')}\" translate>Analytics</dd>\n" +
    "        <dd ng-click=\"integration.category = 'iot'\" ng-class=\"{on: (integration.category === 'iot')}\" translate>IoT</dd>\n" +
    "      </dl>\n" +
    "    </header>\n" +
    "\n" +
    "    <div class=\"main\" ng-show=\"!integration.loading\">\n" +
    "      <ul class=\"services\">\n" +
    "        <li ng-repeat=\"service in integration.services | filter:{category: integration.category}\" class=\"cat-{{service.category}}\">\n" +
    "          <img ng-src=\"{{service.logo}}\" class=\"logo\" />\n" +
    "          <h2 class=\"name\">{{service.name}}</h2>\n" +
    "          <p class=\"description\">{{service.description}}</p>\n" +
    "          <span>\n" +
    "            <button class=\"m-btn\" ng-click=\"integration.openWebsite(service.service_url);\" translate>Website</button>\n" +
    "            <button class=\"m-btn\" ng-click=\"integration.showDetails(service)\" translate>Details</button>\n" +
    "          </span>\n" +
    "        </li>\n" +
    "      </ul>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>");
  $templateCache.put("build/ServiceIntegrationDetailDialog.html",
    "<div class=\"modal-header\" translate>{{service.name}} Details</div>\n" +
    "\n" +
    "<div class=\"modal-body laoding\" ng-show=\"loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Service Integration Details...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"!loading\">\n" +
    "  <div class=\"service-summary\">\n" +
    "    <img ng-src=\"{{service.logo}}\" />\n" +
    "\n" +
    "    <div ng-show=\"service.integration_data.cordova_plugins || service.integration_data.bower_components\">\n" +
    "      <div style=\"font-size: 110%; font-weight: bold;\" translate>Files:</div>\n" +
    "      <div ng-show=\"service.integration_data.cordova_plugins && service.integration_data.match_cordova_plugins\">\n" +
    "        <div ng-repeat=\"cordova_plugin in service.integration_data.match_cordova_plugins\">\n" +
    "          <div class=\"item-caption\"><span translate>Cordova Plugin:</span> <b>{{cordova_plugin.url}}</b></div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div ng-show=\"service.integration_data.cordova_plugins && service.integration_data.match_cordova_plugins.length == 0\" translate>Not supported for this project.</div>\n" +
    "      <div ng-repeat=\"componentInfo in service.integration_data.bower_components\">\n" +
    "        <div class=\"item-caption\"><span translate>JS/CSS Component:</span> <b>{{componentInfo.name}}</b></div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"service-description\">\n" +
    "    <h1>{{service.name}}</h1>\n" +
    "    <p class=\"cat\"><span translate>Category: </span>{{service.category}}</p>\n" +
    "    <div ng-bind-html=\"description\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!loading\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-disabled=\"!service.installable\" ng-click=\"showSetupConfirmWindow()\" ng-show=\"service.integration_type === 'project'\" translate>Install</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/ServiceIntegrationSetupDialog.html",
    "<div class=\"modal-header\" translate>Installing {{service.name}}</div>\n" +
    "\n" +
    "<!-- Confirm to Install Integreation Service -->\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'confirm'\">\n" +
    "  <img ng-src=\"{{service.logo}}\" alt=\"\" class=\"logo\">\n" +
    "  <p translate><em>{{service.name}}</em> will be installed to the project. Are you sure to continue?</p>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"page === 'confirm'\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"confirmOk(service)\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<!-- Show the Install Progress of the Integration Service  -->\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'progress'\">\n" +
    "  <img ng-src=\"{{service.logo}}\" alt=\"\" class=\"logo\">\n" +
    "  <p translate>Installing <em>{{service.name}}</em>...</p>\n" +
    "  <spinner s-type=\"modal\"></spinner>\n" +
    "  <!-- <progressbar class=\"progress-striped active\" value=\"progress\" type=\"success\"><b>{{progress}}%</b></progressbar> -->\n" +
    "</div>\n" +
    "\n" +
    "<!-- <div class=\"modal-footer\" ng-show=\"page === 'progress'\">\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div> -->\n" +
    "\n" +
    "\n" +
    "<!-- Show the Install Completion Page for Integration Service -->\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'complete'\">\n" +
    "  <div style=\"text-align: center; padding-top: 5px;\">\n" +
    "      <img ng-src=\"img/settings/ico_checked.png\"> &nbsp; &nbsp;\n" +
    "      <img ng-src=\"{{service.logo}}\">\n" +
    "  </div>\n" +
    "  <br>\n" +
    "  <p style=\"text-align: center;\" translate><em>{{service.name}}</em> was successfully installed.</p>\n" +
    "  <div style=\"font-size: 0.9em; padding: 0 0 0.5em 1em;\" translate>The following files were installed.</div>\n" +
    "  <table class=\"installed-items\">\n" +
    "    <tr ng-repeat=\"pluginName in service.integration_data.match_cordova_plugins\">\n" +
    "      <td>\n" +
    "        <div class=\"item-caption\">\n" +
    "          <img src=\"img/settings/ico-ok.png\" width=\"16\" height=\"16\"> <span translate>Cordova Plugin:</span> {{pluginName.url}}\n" +
    "        </div>\n" +
    "        <div class=\"item-detail\">\n" +
    "          <img src=\"img/settings/ico-right-gray.png\" width=\"16\" height=\"16\"> <span translate>This service is installed as a Cordova Plugin.</span> <br />\n" +
    "          <img src=\"img/settings/ico-right-gray.png\" width=\"16\" height=\"16\"> <span translate>To confirm or remove, go to the Cordova Plugins settings.</span>\n" +
    "        </div>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "    <tr ng-repeat=\"componentInfo in service.integration_data.bower_components\">\n" +
    "      <td>\n" +
    "        <div class=\"item-caption\">\n" +
    "          <img src=\"img/settings/ico-ok.png\" width=\"16\" height=\"16\"> <span translate>JS/CSS Components:</span> {{componentInfo.name}}\n" +
    "        </div>\n" +
    "        <div class=\"item-detail\">\n" +
    "          <img src=\"img/settings/ico-right-gray.png\" width=\"16\" height=\"16\"> <span translate>This service is installed as JS/CSS Components.</span> <br />\n" +
    "          <img src=\"img/settings/ico-right-gray.png\" width=\"16\" height=\"16\"> <span translate>To confirm or remove, go to the JS/CSS Components settings.</span>\n" +
    "        </div>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </table>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"page === 'complete'\">\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/WebAppSettings.html",
    "<div class=\"web-app-settings\" ng-controller=\"WebAppSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "  <!-- Show Sippner -->\n" +
    "  <div ng-show=\"loading\" class=\"loading\">\n" +
    "      <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "  <div ng-show=\"saving\" class=\"loading\">\n" +
    "      <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "  <div class=\"container\" ng-form=\"form\">\n" +
    "    <div class=\"cell-build-panel add-about\">\n" +
    "      <div><h1 translate>PWA Configuration</h1></div>\n" +
    "      <div class=\"add-about-text\" translate>Please input necessary configurations for building PWA application. This configuration is saved by project basis.</div>\n" +
    "\n" +
    "      <fieldset>\n" +
    "        <legend>\n" +
    "          <div><h2 translate>Application Information</h2></div>\n" +
    "        </legend>\n" +
    "        <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "          <div>\n" +
    "            <label translate>Name:</label>\n" +
    "            <div>\n" +
    "              <input type=\"text\" name=\"name\" ng-model=\"settings.name\" class=\"long-text\" required>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Short Name:</label>\n" +
    "            <div>\n" +
    "              <input type=\"text\" name=\"short_name\" ng-model=\"settings.short_name\" class=\"long-text\" required>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Description:</label>\n" +
    "            <div>\n" +
    "              <input type=\"text\" name=\"description\" ng-model=\"settings.description\" class=\"long-text\" required>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Language:</label>\n" +
    "            <div>\n" +
    "              <select ng-model=\"settings.lang\" ng-options=\"lang.value as lang.label for lang in languageCollection\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Text Direction:</label>\n" +
    "            <div>\n" +
    "              <select ng-model=\"settings.dir\" ng-options=\"dir.value as dir.label for dir in dirCollection\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Scope:</label>\n" +
    "            <div>\n" +
    "              <input type=\"text\" name=\"scope\" ng-model=\"settings.scope\" class=\"long-text\" required>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Start URL:</label>\n" +
    "            <div>\n" +
    "              <input type=\"text\" name=\"start_url\" ng-model=\"settings.start_url\" class=\"long-text\" required>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "      </fieldset>\n" +
    "\n" +
    "      <fieldset>\n" +
    "        <legend>\n" +
    "          <div><h2 translate>Application Display Preference</h2></div>\n" +
    "        </legend>\n" +
    "        <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "          <div>\n" +
    "            <label translate>Display:</label>\n" +
    "            <div>\n" +
    "              <select ng-model=\"settings.display\" ng-options=\"display.value as display.label for display in displayCollection\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Orientation:</label>\n" +
    "            <div>\n" +
    "              <select ng-model=\"settings.orientation\" ng-options=\"orientation.value as orientation.label for orientation in orientationCollection\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Background Color:</label>\n" +
    "            <div>\n" +
    "              <input color-picker type=\"text\" name=\"background_color\" ng-model=\"settings.background_color\" color-picker-model=\"settings.background_color\" class=\"long-text\" ng-style=\"{background:settings.background_color}\">\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Theme Color:</label>\n" +
    "            <div>\n" +
    "                <input color-picker type=\"text\" name=\"theme_color\" ng-model=\"settings.theme_color\" color-picker-model=\"settings.theme_color\" class=\"long-text\" ng-style=\"{background:settings.theme_color}\">\n" +
    "            </div>\n" +
    "          </div>\n" +
    "      </fieldset>\n" +
    "\n" +
    "      <fieldset>\n" +
    "        <legend>\n" +
    "          <div><h2 translate>App Icon</h2></div>\n" +
    "        </legend>\n" +
    "        <div class=\"config-section-panel icon-body\">\n" +
    "          <div class=\"config-info\" translate>Only PNG format is supported for uploading. Large images will be auto-scaled to fit the corresponding size. Images on the Cloud IDE are scaled down to fit the window but does not affect the actual image proportions.</div>\n" +
    "          <div class=\"updateAllImagesAtOnce-contents\">\n" +
    "            <div translate>Update all icons at once.</div>\n" +
    "            <div>\n" +
    "              <em><button class=\"m-btn m-btn-default-dark\" type=\"button\" ng-click=\"openFileDialog('icon_all_pwa')\">\n" +
    "                <span translate>Upload</span>\n" +
    "              </button></em>\n" +
    "              <input name=\"icon_all_pwa\" type=\"file\" accept=\".png,image/png\" \n" +
    "                onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div>\n" +
    "            <style type=\"text/css\">\n" +
    "              .app-icon-list {\n" +
    "                display: flex;\n" +
    "                flex-wrap: wrap;\n" +
    "              }\n" +
    "\n" +
    "              .app-icon-list > div {\n" +
    "                padding: 15px;\n" +
    "              }\n" +
    "\n" +
    "              .web-appicon {\n" +
    "                height: 144px;\n" +
    "                width: 144px;\n" +
    "                padding: 4px;\n" +
    "                border: 1px solid lightgray;\n" +
    "                border-radius: 5px;\n" +
    "                display: flex;\n" +
    "                position: relative;\n" +
    "              }\n" +
    "\n" +
    "              .web-appicon:after {\n" +
    "                position: absolute;\n" +
    "                padding: 3px 7px;\n" +
    "                font-size: 12px;\n" +
    "                font-weight: bold;\n" +
    "                background-color: #f5f5f5;\n" +
    "                border: 1px solid #ddd;\n" +
    "                color: #9da0a4;\n" +
    "                -webkit-border-radius: 4px 0 4px 0;\n" +
    "                -moz-border-radius: 4px 0 4px 0;\n" +
    "                border-radius: 4px 0 4px 0;\n" +
    "                margin: -5px -5px;\n" +
    "              }\n" +
    "\n" +
    "              .web-appicon img {\n" +
    "                max-height: 100%;\n" +
    "                max-width: 100%;\n" +
    "                display: block;\n" +
    "                margin: auto;\n" +
    "              }\n" +
    "            </style>\n" +
    "\n" +
    "            <div class=\"app-icon-list\" ng-if=\"hasIconSet\">\n" +
    "              <div ng-repeat=\"(iconType,icon) in iconTypeList\">\n" +
    "                <style type=\"text/css\">\n" +
    "                  .web-appicon-{{icon.w}}:after {\n" +
    "                    content: \"{{icon.w}} x {{icon.h}}\";\n" +
    "                  }\n" +
    "                </style>\n" +
    "                <div class=\"setFile-type web-appicon web-appicon-{{icon.w}}\">\n" +
    "                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" id=\"image-{{iconType}}\" onerror='this.style.display = \"none\"'>\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "        </div>\n" +
    "      </fieldset>\n" +
    "      \n" +
    "      <!-- <fieldset>\n" +
    "        <legend>\n" +
    "          <div><h2 translate>Related Application</h2></div>\n" +
    "        </legend>\n" +
    "        <div class=\"config-section-panel icon-body\">\n" +
    "          <div class=\"config-info\" translate>\n" +
    "            Collection of native applications that are installable by, or accessible to, the underlying platform — for example a native Android application obtainable through the Google Play Store.\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Prefer Related Applications:</label>\n" +
    "            <div>\n" +
    "              <input type=\"checkbox\" name=\"prefer_related_applications\" ng-model=\"settings.prefer_related_applications\" class=\"long-text\">\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </fieldset> -->\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"build-start-button-area\">\n" +
    "    <div class=\"build-start-button\">\n" +
    "      <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\">Back</a>\n" +
    "      <button id=\"button-save\" class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"submit()\" disabled=\"disabled\" ng-class=\"{disable: !isReadyToSave || form.$invalid}\" ng-disabled=\"!isReadyToSave || form.$invalid\" translate>Save</button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/WebBuild.html",
    "<div ng-controller=\"WebBuildController\" ng-init=\"init()\">\n" +
    "  <div ng-show=\"building\" class=\"loading\">\n" +
    "      <spinner s-type=\"modal\" s-loading-text=\"Starting build...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "  </div>\n" +
    "  <div class=\"container\">\n" +
    "    <div class=\"cell-build-panel\">\n" +
    "      <h1 translate>Build PWA App</h1>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"cell-build-panel\">\n" +
    "      <div class=\"about-container\">\n" +
    "        <p translate>Progressive Web App will be built. <br />The built application can be deployed to any hosting services. Please see the documentation for build and deploy information.</p>\n" +
    "      </div>\n" +
    "      <div ng-include src=\"'build-problems'\"></div>\n" +
    "      <div class=\"m-container\">\n" +
    "        <div class=\"title\">\n" +
    "          <div><span translate>App Settings</span></div>\n" +
    "          <div><a class=\"m-btn m-btn-default-dark\" ng-click=\"manageAppSettings()\" translate>Manage App Settings</a></div>\n" +
    "        </div>\n" +
    "        <div class=\"m-text\">\n" +
    "          <div><p translate>App icon, name, description, etc. can be set in the Web App Settings screen.</p></div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"build-start-button-area\">\n" +
    "    <div class=\"build-start-button\">\n" +
    "      <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"build()\" ng-disabled=\"!canBuild || building\" disabled translate>Start Build</button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <script type=\"text/ng-template\" id=\"build-problems\">\n" +
    "    <div class=\"box-errorarea\" ng-show=\"!canBuild && buildProblems.length\">\n" +
    "      <p translate>You do not have the necessary setting to build.</p>\n" +
    "      <div class=\"box-errorCheckPoint\">\n" +
    "        <ul>\n" +
    "          <li ng-repeat=\"item in buildProblems\">\n" +
    "            <span ng-if=\"!item.value && item.key == 'has_remaining_slot'\" translate>Number of builds per day has reached the maximum.</span>\n" +
    "            <span ng-if=\"!item.value && item.key === 'has_vcs_configuration'\" translate>The project is not linked to a version control repository.</span>\n" +
    "            <span ng-if=\"!item.value && item.key === 'has_pwa_manifest'\" translate>The Progressive Web App Manifest file is missing.</span>\n" +
    "            <span ng-if=\"!item.value && item.key === 'has_pwa_icon_set'\" translate>One or more app icons are missing.</span>\n" +
    "          </li>\n" +
    "        </ul>\n" +
    "      </div>\n" +
    "      <p></p>\n" +
    "    </div>\n" +
    "  </script>\n" +
    "\n" +
    "  <div>\n" +
    "");
  $templateCache.put("build/WebComponent.html",
    "<div ng-controller=\"WebComponentController as web\" class=\"ide-setting-web-components\">\n" +
    "  <div ng-show=\"web.loading\" class=\"loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Loading JS/CSS Components...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <header ng-show=\"!web.loading\" class=\"m-header-caret\" ng-show=\"!integration.loading\">\n" +
    "      <h1 class=\"cell-title\" translate>JS/CSS Components</h1>\n" +
    "    </header>\n" +
    "\n" +
    "    <div class=\"main\" ng-show=\"!web.loading\">\n" +
    "      <table>\n" +
    "        <thead>\n" +
    "          <tr>\n" +
    "            <th translate>Components</th>\n" +
    "            <th>\n" +
    "              <input type=\"text\" class=\"m-component-textbox long-text\" ng-model=\"web.searchword\" placeholder=\"Component Name\"\n" +
    "              />\n" +
    "              <button class=\"m-btn\" ng-click=\"searchForComponents()\" translate>Search</button>\n" +
    "            </th>\n" +
    "          </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "          <tr ng-repeat=\"component in web.WebComponentFactory.collection | orderBy: ['isInstalled', 'displayName']\" ng-class=\"{'installed': component.isInstalled}\">\n" +
    "            <td>\n" +
    "              <img src=\"img/settings/ico_list_component.png\" alt=\"{{component.displayName}} Web Component\" />\n" +
    "              <span class=\"name\">{{component.displayName}}\n" +
    "                <span>\n" +
    "                  <span ng-show=\"component.isInstalled\" class=\"version\" translate>Version: {{component.version}}</span>\n" +
    "                  <span ng-show=\"component.isDependent\" translate>Dependent on other package.</span>\n" +
    "            </td>\n" +
    "            <td ng-if=\"!component.isInstalled\">\n" +
    "              <button ng-click=\"web.add(component)\" class=\"m-btn\" translate>Add</button>\n" +
    "            </td>\n" +
    "            <td ng-if=\"component.isInstalled\">\n" +
    "              <button ng-click=\"web.configure(component)\" class=\"m-btn\" translate>Configure</button>\n" +
    "              <button ng-disabled=\"component.isDependent\" ng-click=\"web.remove(component)\" class=\"m-btn m-btn-alert\" translate>Remove</button>\n" +
    "            </td>\n" +
    "          </tr>\n" +
    "        </tbody>\n" +
    "      </table>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "</div>");
  $templateCache.put("build/WebComponentManageDialog.html",
    "<div class=\"modal-header\" translate>Install JS/CSS Component</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'loading'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"{{loadingText}}\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Confirm Install -->\n" +
    "<div class=\"modal-body web-component-confirm\" ng-show=\"page === 'confirm'\">\n" +
    "  <p translate>The following component will be installed to your project.</p>\n" +
    "  <p><strong>{{component.name}}</strong></p>\n" +
    "  <p>{{description}}</p>\n" +
    "\n" +
    "  <section>\n" +
    "    <div translate>Version:</div> &nbsp;\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"selectedVersion\" ng-options=\"version as version for version in versions\"></select>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"page === 'confirm'\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"confirmInstall()\" translate>Install</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Configure Installed Component -->\n" +
    "<div class=\"modal-body web-component-configure\" ng-show=\"page === 'configure'\">\n" +
    "  <div ng-repeat=\"data in componentData | filter: data.file\">\n" +
    "    <h2 class=\"component-file-desc\"><span translate>Select files to be loaded for</span> {{data.componentKey}}</h2>\n" +
    "    <div ng-if=\"data.files.monaca\">\n" +
    "      <div ng-show=\"data.files.monaca.main\" ng-repeat=\"requiredItems in data.files.monaca.main\" translate>Required: {{requiredItems}}</div>\n" +
    "      <div ng-show=\"component === 'monaca-onsenui'\" translate>Please select a \"*-theme.css\"</div>\n" +
    "\n" +
    "      <div class=\"checkbox\" ng-show=\"data.files.monaca.option\" ng-repeat=\"optionalItems in data.files.monaca.option\">\n" +
    "        <label>\n" +
    "          <input type=\"checkbox\" ng-model=\"configureFormData[data.componentKey][optionalItems]\" value=\"{{optionalItems}}\"> {{optionalItems}}\n" +
    "        </label>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <div ng-if=\"!data.files.monaca\">\n" +
    "      <div class=\"checkbox\" ng-show=\"data.files.allFiles.js\" ng-repeat=\"jsItems in data.files.allFiles.js\">\n" +
    "        <label>\n" +
    "          <input type=\"checkbox\" ng-model=\"configureFormData[data.componentKey][jsItems]\" value=\"{{jsItems}}\"> {{jsItems}}\n" +
    "        </label>\n" +
    "      </div>\n" +
    "\n" +
    "      <div class=\"checkbox\" ng-show=\"data.files.allFiles.css\" ng-repeat=\"cssItems in data.files.allFiles.css\">\n" +
    "        <label>\n" +
    "          <input type=\"checkbox\" ng-model=\"configureFormData[data.componentKey][cssItems]\" value=\"{{cssItems}}\"> {{cssItems}}\n" +
    "        </label>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"page === 'configure'\">\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-click=\"saveChanges()\" translate>Save</button>\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>Cancel</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/WindowsAppSettings.html",
    "<div class=\"windows-app-settings\" ng-controller=\"WindowsAppSettingsController\" ng-init=\"init()\" ng-cloak>\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <!-- Show Sippner -->\n" +
    "    <div ng-show=\"loading\" class=\"loading\">\n" +
    "            <spinner s-type=\"modal\" s-loading-text=\"loading...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div ng-show=\"saving\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Saving...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\" ng-form=\"form\">\n" +
    "        <div class=\"cell-build-panel add-about\">\n" +
    "            <div><h1 translate>Windows App Configuration</h1></div>\n" +
    "            <div class=\"add-about-text\" translate>Please input necessary configurations for building Windows application. This configuration is saved by project basis.</div>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <div><h2 translate>Application Information</h2></div>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel appInfo-body tableCell-all\">\n" +
    "                    <div>\n" +
    "                        <label translate>Application GUID:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"identity_name_winrt\" ng-model=\"settings.identity_name_winrt\" ng-pattern=\"/^[0-9a-zA-Z\\-\\.]+$/\" class=\"long-text\" required>\n" +
    "                            <span ng-messages=\"form.identity_name_winrt.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>The field contains invalid characters.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"package-certificate-key\">\n" +
    "                        <label translate>Package Certificate Key:</label>\n" +
    "                        <div>\n" +
    "                            <input name=\"debug_pfx_winrt\" type=\"file\" onchange=\"this.files.length && angular.element(this).scope().uploadCertificate(this);this.value = '';\" style=\"display:none;\">\n" +
    "                            <div><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog('debug_pfx_winrt')\"><span translate>Upload</span></button></em></div>\n" +
    "                            <div><em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openExportCertificateDialog()\" ng-disabled=\"!hasPfx\" disabled><span translate>Export</span></button></em></div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>App Display Name:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" ng-model=\"settings.app_display_name_winrt\" class=\"long-text\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Version:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"identity_version_winrt\" ng-model=\"settings.identity_version_winrt\" ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})$/\" required>\n" +
    "                            <span class=\"config-warning\" ng-show=\"form.identity_version_winrt.$valid && valueChanged('identity_version_winrt')\">\n" +
    "                                <span translate>iOS/Android Version will also be changed.</span>\n" +
    "                            </span>\n" +
    "                            <span ng-messages=\"form.identity_version_winrt.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Specify three numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Package Version:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" name=\"packageVersion_winrt\" ng-model=\"settings.packageVersion_winrt\" ng-disabled=\"!specifyPackageVersion\" ng-pattern=\"/^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})\\.(\\d{1,2})$/\" ng-required=\"specifyPackageVersion\">\n" +
    "                            <span ng-messages=\"form.packageVersion_winrt.$error\" ng-show=\"isInitialized\">\n" +
    "                                <span ng-message=\"pattern\" class=\"config-error\" translate>Specify four numbers separated by dots. (e.g. 1.10.2.3)<br>Note that each number should be in 0-99.</span>\n" +
    "                                <span ng-messages-include=\"common/errors.html\"></span>\n" +
    "                            </span>\n" +
    "                            <div>\n" +
    "                                <ul>\n" +
    "                                    <li><input type=\"checkbox\" ng-model=\"specifyPackageVersion\"><label translate>Specify the numbers for package version</label></li>\n" +
    "                                </ul>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>App Description:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>App Description is not used in cordova6.</i></span></label>\n" +
    "                        <div>\n" +
    "                            <textarea ng-model=\"settings.app_description_winrt\" rows=\"4\" cols=\"64\"></textarea>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Package Publisher Name:</label>\n" +
    "                        <div>\n" +
    "                            <input type=\"text\" ng-model=\"settings.package_publisher_display_name_winrt\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div>\n" +
    "                        <label translate>Architecture:</label>\n" +
    "                        <div class=\"m-component-combobox\">\n" +
    "                            <select ng-model=\"settings.app_arch_winrt\" ng-options=\"arch.value as arch.label for arch in archList\"></select>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <div><h2 translate>App Logo</h2></div>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        Only PNG format is supported. Large pictures will be auto-scaled to fit the size.\n" +
    "                    </div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-win-applogo\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in appLogoList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" alt=\"{{iconType}}\" id=\"image-{{iconType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"icon.label\"></span>{{icon.w}} x {{icon.h}}</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <div><h2 translate>Tile Wide Logo</h2></div>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        Only PNG format is supported. Large pictures will be auto-scaled to fit the size.\n" +
    "                    </div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-win-tileWide\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(iconType,icon) in tileWideLogoList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{iconType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{iconType}}\">\n" +
    "                                    <a ng-href=\"{{icon.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{icon.url}}&amp;t={{timestamp()}}\" alt=\"{{iconType}}\" id=\"image-{{iconType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config\">\n" +
    "                                    <label><span ng-bind-html=\"icon.label\"></span>{{icon.w}} x {{icon.h}}</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog(iconType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{iconType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "\n" +
    "            <fieldset>\n" +
    "                <legend>\n" +
    "                    <div><h2 translate>Splash</h2></div>\n" +
    "                </legend>\n" +
    "                <div class=\"config-section-panel icon-body\">\n" +
    "                    <div class=\"config-info\" translate>\n" +
    "                        Only PNG format is supported. Large pictures will be auto-scaled to fit the size.\n" +
    "                    </div>\n" +
    "                    <div class=\"setFile-list-body\">\n" +
    "                        <div class=\"sfl-win-splash\">\n" +
    "                            <div class=\"setFile-list\" ng-repeat=\"(splashType,splash) in splashTypeList\">\n" +
    "                                <div class=\"setFile-loading\" ng-show=\"!!isLoading.{{splashType}}\">\n" +
    "                                    <img ng-src=\"{{'/img/size16/icon_loading.gif'}}\">\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-type\" ng-show=\"!isLoading.{{splashType}}\">\n" +
    "                                    <a ng-href=\"{{splash.url}}&amp;t={{timestamp()}}\" target=\"_blank\" title=\"Download\">\n" +
    "                                        <img ng-src=\"{{splash.url}}&amp;t={{timestamp()}}\" id=\"image-{{splashType}}\">\n" +
    "                                    </a>\n" +
    "                                </div>\n" +
    "                                <div class=\"setFile-config tableCell\">\n" +
    "                                    <label><span ng-bind-html=\"splash.label\"></span>{{splash.w}} x {{splash.h}}</label>\n" +
    "                                    <div>\n" +
    "                                        <div>\n" +
    "                                            <em><button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"openFileDialog(splashType)\"><span translate>Change</span></button></em>\n" +
    "                                            <input name=\"{{splashType}}\" type=\"file\" accept=\".png,image/png\" onchange=\"this.files.length && angular.element(this).scope().uploadImage(this);this.value = '';\" style=\"display:none;\">\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "                                </div>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                    <div class=\"tableCell\">\n" +
    "                        <label translate>Splash Background:</label>\n" +
    "                        <div>\n" +
    "                            <div class=\"color-sample-box\" ng-style=\"{'background-color': settings.app_splash_background_winrt}\" onclick=\"this.nextElementSibling.click()\"></div>\n" +
    "                            <input colorpicker type=\"text\" ng-model=\"settings.app_splash_background_winrt\" id=\"app_splash_background_winrt\" placeholder=\"#000000\">\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <a class=\"m-btn m-btn-default backButton\" href=\"#\" ng-click=\"backPage()\" ng-show=\"hasPrevPage()\" role=\"button\">Back</a>\n" +
    "            <button id=\"button-save\" class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"submit()\" disabled=\"disabled\" ng-class=\"{disable: !isReadyToSave || form.$invalid}\" ng-disabled=\"!isReadyToSave || form.$invalid\" translate>Save</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("build/WindowsBuild.html",
    "<div ng-controller=\"WindowsBuildController\" ng-init=\"init()\">\n" +
    "    <ask-update-old-project-dialog />\n" +
    "    <div ng-show=\"building\" class=\"loading\">\n" +
    "        <spinner s-type=\"modal\" s-loading-text=\"Starting build...\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "    </div>\n" +
    "    <div class=\"container\">\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <h1 translate>Build Windows App (preview version)</h1>\n" +
    "        </div>\n" +
    "        <div notification-of-unsupported-cordova></div>\n" +
    "\n" +
    "        <div class=\"cell-build-panel\">\n" +
    "            <div class=\"about-container\">\n" +
    "                <p translate>Windows application will be built. <br />The built application can be installed on a Windows PC. Please see the documentation for installation information.</p>\n" +
    "            </div>\n" +
    "            <div ng-include src=\"'build-problems'\"></div>\n" +
    "            <div class=\"m-container\">\n" +
    "                <div class=\"title\">\n" +
    "                    <div><span translate>App Settings</span></div>\n" +
    "                    <div><a class=\"m-btn m-btn-default-dark\" ng-click=\"manageAppSettings()\" translate>Manage App Settings</a></div>\n" +
    "                </div>\n" +
    "                <div class=\"m-text\">\n" +
    "                    <div><p translate>App icon, splash screen, file version number etc. can be set in the Windows app settings screen.</p></div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"build-start-button-area\">\n" +
    "        <div class=\"build-start-button\">\n" +
    "            <button class=\"m-btn m-btn-blue m-btn-large\" ng-click=\"build()\" \n" +
    "            ng-disabled=\"!canBuild || building\" disabled translate>Start Build</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <script type=\"text/ng-template\" id=\"build-problems\">\n" +
    "        <div class=\"box-warningarea\" ng-show=\"buildWarnings.length\">\n" +
    "            <p translate>Build Setting Warnings</p>\n" +
    "            <div class=\"box-warningCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildWarnings\">\n" +
    "                        <!--App Name-->\n" +
    "                        <span ng-if=\"item.value && item.key == 'warning_app_id'\" translate>The application id contains invalid characters.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"box-errorarea\" ng-show=\"!canBuild && buildProblems.length\">\n" +
    "            <p translate>You do not have the necessary setting to build.</p>\n" +
    "            <div class=\"box-errorCheckPoint\">\n" +
    "                <ul>\n" +
    "                    <li ng-repeat=\"item in buildProblems\">\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_cordova_version'\" translate>Windows Build requires Cordova 6.2 or later. Please upgrade cordova version.</span>\n" +
    "                        <span ng-if=\"!item.value && item.key == 'has_valid_app_id'\" translate>The application id contains invalid characters.</span>\n" +
    "                    </li>\n" +
    "                </ul>\n" +
    "            </div>\n" +
    "            <p translate></p>\n" +
    "        </div>\n" +
    "    </script>\n" +
    "\n" +
    "<div>\n" +
    "");
  $templateCache.put("BuildTaskDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>{{title}}</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Task Name</label>\n" +
    "    <input type=\"text\" id=\"name\" name=\"name\" class=\"form-control\" ng-model=\"name\">\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Description</label>\n" +
    "    <textarea id=\"description\" name=\"description\" class=\"form-control\" ng-model=\"description\"></textarea>\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Execution</label>\n" +
    "    <textarea id=\"execution\" name=\"execution\" class=\"form-control\" ng-model=\"execution\"></textarea>\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "    <label translate>Report</label>\n" +
    "    <select class=\"form-control\" id=\"report\" name=\"report\" ng-options=\"report as report.label for report in reports track by report.id\" ng-model=\"selectedReport\"></select>\n" +
    "  </div>\n" +
    "\n" +
    "  <hr>\n" +
    "  <div class=\"flex-container-row buttons-row\">\n" +
    "    <span style=\"width: 100%\"></span>\n" +
    "    <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "    <button ng-if=\"isDeleteAble()\" type=\"button\" class=\"btn btn-danger\" ng-click=\"delete()\" translate>Delete</button>\n" +
    "    <button type=\"button\" class=\"btn btn-primary\" ng-click=\"save()\" ng-disabled=\"!isSaveAble()\" translate>Save</button>\n" +
    "  </div>\n" +
    "</section>");
  $templateCache.put("common/errors.html",
    "<span ng-message=\"required\" class=\"config-error\" translate>This field is required.</span>\n" +
    "<span ng-message=\"pattern\" class=\"config-error\" translate>The field contains invalid characters.</span>\n" +
    "<span ng-message=\"maxlength\" class=\"config-error\" translate>Input string is too long.</span>\n" +
    "<span ng-message=\"minlength\" class=\"config-error\" translate>Input string is too short.</span>\n" +
    "<span ng-message=\"number\" class=\"config-error\" translate>Please use half-width numbers.</span>\n" +
    "<span ng-message=\"email\" class=\"config-error\" translate>Invalid email address.</span>\n" +
    "");
  $templateCache.put("commonDialogs/AlertDialog.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <spinner s-type=\"ide\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "    <p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>OK</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/ConfirmDialog.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "  <spinner s-type=\"modal\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"ok()\" translate>OK</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/ConfirmDialogWithSpinning.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "	<spinner s-type=\"modal\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    " 	<p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "	<button class=\"m-btn\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "	<button class=\"m-btn\" type=\"button\" ng-click=\"ok()\">\n" +
    "	  <div style=\"display: inline-flex\">\n" +
    "	    <div translate>OK</div>\n" +
    "	    <spinner style=\"display: inline-flex\" s-type=\"spinner-button\" ng-show=\"isLoading\"></spinner>\n" +
    "	  </div>\n" +
    "	</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/ConfirmProductTermsAgreement.html",
    "<div class=\"modal-header\">利用規約の確認</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "  <spinner s-type=\"ide\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" style=\"font-size:14px;\">\n" +
    "  <div style=\"line-height: 1.8;\">\n" +
    "    次の「Monaca 利用規約」から、本ソフトウェアの利用規約をご確認ください。<br>\n" +
    "    ボタン「同意する」を押すと、利用規約にご同意いただいた上での利用開始となります。\n" +
    "  </div>\n" +
    "  <div style=\"margin:15px;\">\n" +
    "    <a href=\"https://ja.monaca.io/terms-of-service/\" target=\"_blank\">「Monaca 利用規約」</a>\n" +
    "    <i class=\"fas fa-external-link-alt\" style=\"font-size:0.9em;\"></i>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"ok()\" translate>同意する</button>\n" +
    "</div>");
  $templateCache.put("commonDialogs/CustomDialog.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button ng-repeat=\"(index, label) in buttons\" style=\"margin: 0 0 5px 5px\" class=\"m-btn\" type=\"button\" ng-click=\"button(index)\" translate>\n" +
    "      {{label}}\n" +
    "  </button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/ErrorDialog.html",
    "<section class=\"modal-header\">{{title}}</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <p ng-bind-html=\"message\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-footer\" ng-show=\"canClose\">\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" translate>OK</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("commonDialogs/QrCodeDialog.html",
    "<div class=\"close-x\" ng-click=\"this.$close()\"></div>\n" +
    "<div class=\"modal-header\">{{title}}</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-form=\"dialogForm\">\n" +
    "    <div translate>\n" +
    "        Scan the QR code or visit this <a href=\"{{url}}\" target=\"_blank\">link</a> to access Download Application Package page.\n" +
    "    </div>\n" +
    "    <div class=\"center\">\n" +
    "        <figure>\n" +
    "            <img ng-src=\"{{qrCodeUrl}}\" alt=\"QR Code\">\n" +
    "        </figure>\n" +
    "    </div>\n" +
    "    <div class=\"right\" translate>\n" +
    "        This QR code is valid for {{expiration}} seconds.\n" +
    "    </div>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>OK</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/RawAlertDialog.html",
    "<div class=\"modal-header\">{{title}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "    <spinner s-type=\"ide\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-bind-html=\"message\"></section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>OK</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("commonDialogs/ReplaceDialog.html",
    "<div class=\"modal-header\">{{title | translate}}</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading' || page === 'committing'\">\n" +
    "  <spinner s-type=\"modal\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <p ng-bind-html=\"message | translate\"></p>\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"replaceAll()\" translate>Replace All</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"ok()\" translate>Replace</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "</div>");
  $templateCache.put("dashboard.html",
    "<toast></toast>\n" +
    "<div ng-controller=\"dashboardCtrl\" class=\"dashboard\" ng-hide=\"isEnviromentLoading\">\n" +
    "  <div class=\"fullscreen-slider\" ng-class=\"{ 'slide-in': showFullscreenSlider, 'slide-out': !showFullscreenSlider }\" ng-if=\"fullscreenPage\">\n" +
    "    <i class=\"d-icon di-circle-x close-circle\" ng-click=\"close()\"></i>\n" +
    "    <div class=\"fullscreen-slider-content\" ng-include=\"fullscreenPage\"></div>\n" +
    "  </div>\n" +
    "  <ask-product-terms-agreement-modal/>\n" +
    "\n" +
    "  <header class=\"dashboard\">\n" +
    "    <a href=\"/dashboard\">\n" +
    "      <span href=\"#\" class=\"header-logo\">\n" +
    "        <img ng-if=\"screenWidth > 480\" src=\"img/dashboard/logo_dashboard.svg\" alt=\"Monaca\">\n" +
    "        <img ng-if=\"screenWidth <= 480\" src=\"img/dashboard/logo_dashboard_responsive.svg\" alt=\"Monaca\">\n" +
    "      </span>\n" +
    "    </a>\n" +
    "    <div class=\"header-dashboard-tools\">\n" +
    "      <div ng-if=\"isEducationAdmin\" style=\"padding: 0 14.5px\">\n" +
    "        <a href=\"#\" ng-click=\"openAccountList()\">\n" +
    "          <span ng-if=\"screenWidth > 880\" translate>Management Page</span>\n" +
    "          <img ng-if=\"screenWidth <= 880\" class=\"info-icon\" src=\"img/dashboard/ico_learn_and_discuss.svg\" width=\"23\" alt=\"Learn & Discuss\">\n" +
    "        </a>\n" +
    "      </div>\n" +
    "      <div ng-if=\"showDownloadPackageQrCode\" style=\"padding: 0 14.5px\">\n" +
    "        <a href=\"#\" ng-click=\"showLoginToApplicationPackageQrCode()\">\n" +
    "          <span ng-if=\"screenWidth > 880\" translate>Download Package</span>\n" +
    "          <img ng-if=\"screenWidth <= 880\" class=\"info-icon\" src=\"img/dashboard/ico_download.svg\" width=\"23\" alt=\"Download Package\">\n" +
    "        </a>\n" +
    "      </div>\n" +
    "      <div ng-if=\"user.info.company && user.info.company.isEntCompanyAdmin\" style=\"padding: 0 14.5px\">\n" +
    "        <a href=\"#\" ng-click=\"goToTeamDashboard()\">\n" +
    "          <span ng-if=\"screenWidth > 880\" translate>Login to team account</span>\n" +
    "        </a>\n" +
    "      </div>\n" +
    "      <div uib-dropdown style=\"padding: 0 14.5px\">\n" +
    "        <a uib-dropdown-toggle href=\"#\">\n" +
    "          <span ng-if=\"screenWidth > 880\" translate>Learn &amp; Discuss</span>\n" +
    "          <img ng-if=\"screenWidth <= 880\" class=\"info-icon\" src=\"img/dashboard/ico_learn_and_discuss.svg\" width=\"23\" alt=\"Learn & Discuss\">\n" +
    "        </a>\n" +
    "        <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "\n" +
    "          <li ng-if=\"isRPGUser\">\n" +
    "            <a ng-href=\"{{ urls.documents }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Documents</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "          <li ng-if=\"urls.community\">\n" +
    "            <a ng-href=\"{{ urls.community }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Community Forum</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "          <li ng-if=\"urls.community_monaca\">\n" +
    "            <a ng-href=\"{{ urls.community_monaca }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Monaca Community</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "          <li ng-if=\"urls.community_onsenui\">\n" +
    "            <a ng-href=\"{{ urls.community_onsenui }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Onsen UI Community</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "\n" +
    "        </ul>\n" +
    "      </div>\n" +
    "      <div uib-dropdown style=\"padding: 0 14px\">\n" +
    "        <a uib-dropdown-toggle href=\"#\">\n" +
    "          <span ng-if=\"screenWidth > 880\" translate>Contact Us</span>\n" +
    "          <img ng-if=\"screenWidth <= 880\" class=\"support-icon\" src=\"img/dashboard/ico_contact_us.svg\" width=\"24\" alt=\"Contact Us\">\n" +
    "        </a>\n" +
    "        <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "          <li ng-if=\"urls.technical_support && isRPGUser\">\n" +
    "            <a ng-href=\"{{ urls.technical_support }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Advanced Technical support</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "          <li ng-if=\"urls.general_inquiry\">\n" +
    "            <a ng-href=\"{{ urls.general_inquiry }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>General Inquiry</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "          <li ng-if=\"urls.status_issues\">\n" +
    "            <a ng-href=\"{{ urls.status_issues }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "              <span translate>Status and Known Issues</span>\n" +
    "            </a>\n" +
    "          </li>\n" +
    "        </ul>\n" +
    "      </div>\n" +
    "      <div uib-dropdown id=\"notification-list\" ng-controller=\"notificationCtrl\">\n" +
    "        <a aria-label=\"dashboard-notifications\" uib-dropdown-toggle href=\"#\" ng-click=\"openNotificationList()\" ng-class=\"{'btn-notification': true, 'dropdown-toggle': true, 'unread': !isNewsRead}\"\n" +
    "          class=\"dropdown-toggle\">&nbsp;</a>\n" +
    "        <aside uib-dropdown-menu class=\"dropdown-menu header-notification\">\n" +
    "          <div class=\"dropdown-header\">\n" +
    "            <h1>\n" +
    "              <span translate>Updates</span>\n" +
    "            </h1>\n" +
    "            <a ng-show=\"showAllNotifications\" ng-click=\"openHeadline()\" href=\"#\" class=\"showall\">\n" +
    "              <span translate>Show All</span>\n" +
    "            </a>\n" +
    "          </div>\n" +
    "          <div class=\"notifications-loading\" ng-show=\"notificationsLoading\">\n" +
    "            <spinner s-type=\"ide\" s-loading-text=\"Loading Notifications...\"></spinner>\n" +
    "          </div>\n" +
    "          <ul class=\"notification-items\">\n" +
    "            <li ng-click=\"openWindow(item.url)\" ng-class=\"{'notification-item': true, 'type-status-ok': (item.fault_stat === 'Solved'), 'type-status-ng': (item.fault_stat === 'Fixing'),'type-status-reported': (item.fault_stat === 'Reported'), 'type-headline': (item.category === 'news')}\"\n" +
    "              ng-repeat=\"(index, item) in notifications\">\n" +
    "\n" +
    "              <p class=\"notification-item-body\">\n" +
    "                <a href=\"#\">{{item.title}}</a>\n" +
    "              </p>\n" +
    "\n" +
    "              <p class=\"notification-item-date\">\n" +
    "                {{item.date}} -\n" +
    "              </p>\n" +
    "            </li>\n" +
    "          </ul>\n" +
    "        </aside>\n" +
    "      </div>\n" +
    "      <div uib-dropdown class=\"user-profile-menu\">\n" +
    "        <a uib-dropdown-toggle href=\"#\" ng-if=\"showGravatarIcon\">\n" +
    "          <img class=\"profile-icon\" alt=\"profile picture\" gravatar-src=\"user.info.email\" gravatar-size=\"28\" gravatar-default=\"mp\">\n" +
    "        </a>\n" +
    "        <a uib-dropdown-toggle href=\"#\" ng-if=\"!showGravatarIcon\">\n" +
    "            <img class=\"profile-icon\" alt=\"profile picture\" src=\"img/dashboard/default_profile_icon_28.png\">\n" +
    "          </a>\n" +
    "        <div uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "          <div class=\"account-description\" ng-if=\"user.info.company && user.info.company.isEntCompanyUser\">\n" +
    "            <span translate>This account is managed by team account.</span>\n" +
    "          </div>\n" +
    "          <div class=\"personal-info\">\n" +
    "            <img ng-if=\"showGravatarIcon\" class=\"profile-icon\" alt=\"profile picture\" gravatar-src=\"user.info.email\" gravatar-size=\"60\" gravatar-default=\"mp\">\n" +
    "            <img ng-if=\"!showGravatarIcon\" class=\"profile-icon\" src=\"img/dashboard/default_profile_icon_60.png\">\n" +
    "            <div>\n" +
    "              <div class=\"profile-name\">{{user.info.username}}</div>\n" +
    "              <div class=\"profile-email\">{{user.info.email}}</div>\n" +
    "              <div class=\"manage-account\">\n" +
    "                <a ng-href=\"{{ manageAccountUrl }}\" ng-if=\"!user.info.isClassiUser\">\n" +
    "                  <span translate>Manage Account</span>\n" +
    "                </a>\n" +
    "                <a href=\"#\" ng-click=\"logout()\">\n" +
    "                  <span translate>Logout</span>\n" +
    "                </a>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div class=\"plan-info\">\n" +
    "            <div class=\"payment-description\">\n" +
    "              <div ng-if=\"user.info.company && user.info.company.isEntCompanyUser\">\n" +
    "                <div ng-if=\"showTrialPeriod && user.info.company && user.company.isTrialExpired\">\n" +
    "                  <span translate translate-params-plan=\"user.info.company.planName\">{{plan}} plan has finished its trial period.</span>\n" +
    "                </div>\n" +
    "                <div ng-if=\"showTrialPeriod && user.info.company && user.info.company.isTrial\">\n" +
    "                  <span translate translate-params-days=\"user.info.company.getLeftTrialDays\">Trial ends in {{days}} days.</span>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div ng-if=\"showTrialPeriod && (!user.info.company || !user.info.company.isEntCompanyUser) && user.info.isTrialToday\">\n" +
    "                <span translate translate-params-days=\"user.info.getLeftTrialDays\">Trial ends in {{days}} days.</span>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"plan-description\">\n" +
    "              <div class=\"plan-label\">{{ user.info.planName }}</div>\n" +
    "              <div ng-if=\"!user.info.isClassiUser\">\n" +
    "                <span class=\"plan-type\">\n" +
    "                  <a ng-href=\"{{ managePlanUrl }}\" class=\"settings\" translate>Manage Plan</a>\n" +
    "                </span>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div class=\"company-info\" ng-if=\"user.info.company && user.info.company.isEntCompanyAdmin\">\n" +
    "            <div class=\"title\">\n" +
    "              <span translate>Team Account</span>\n" +
    "            </div>\n" +
    "            <div class=\"profile\">{{user.info.company.companyName}}</div>\n" +
    "            <div class=\"corporate-link\">\n" +
    "              <i class=\"d-icon di-external-link\"></i>\n" +
    "              <a href=\"#\" ng-click=\"goToTeamDashboard()\">\n" +
    "                <span translate>Login to team account</span>\n" +
    "              </a>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </header>\n" +
    "  <script type=\"text/javascript\">\n" +
    "    var Kairos3Tracker = \"asial\";\n" +
    "  </script>\n" +
    "  <script type=\"text/javascript\" charset=\"utf-8\" src=\"//c.k3r.jp\"></script>\n" +
    "  <div class=\"dashboard-parent\">\n" +
    "    <div id=\"dashboard-controller\" class=\"content dashboard-container\">\n" +
    "      <div id=\"dashboard-projects\" class=\"dashboard-projects\">\n" +
    "        <div class=\"btn-area\" ng-show=\"!isRPGUser && screenWidth > 880\" ng-cloak>\n" +
    "          <a href=\"#\" class=\"m-btn m-btn-green btn-newproject\" ng-click=\"showDashboardNewProjectWindow()\">\n" +
    "            <span translate>Create New Project</span>\n" +
    "          </a>\n" +
    "          <a href=\"#\" class=\"m-btn m-btn-dark btn-import\" ng-click=\"showImportWindow()\" ng-disabled=\"!userLoaded\">\n" +
    "            <span translate>Import</span>\n" +
    "          </a>\n" +
    "        </div>\n" +
    "\n" +
    "        <div id=\"filter-tags\">\n" +
    "          <input aria-label=\"selectall\" type=\"checkbox\" id=\"projects-selectall\" ng-model=\"selectAllProjects\" ng-disabled=\"isProjectListLoading || (projects === null) || (projects === [])\">\n" +
    "          <div class=\"selectbox-container\">\n" +
    "            <div uib-dropdown ng-if=\"screenWidth > 880\">\n" +
    "              <a uib-dropdown-toggle href=\"#\" ng-disabled=\"!allTags.length\" class=\"btn btn-dropdown btn-filtertags dropdown-toggle\">\n" +
    "                <span translate>Tags</span>\n" +
    "                <i>&nbsp;</i>\n" +
    "              </a>\n" +
    "              <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "                <li ng-repeat=\"tag in allTags\" ng-class=\"{'on': inArray(tag, projectFilterCriteria.tags)}\">\n" +
    "                  <a href=\"#\" ng-click=\"filterToggleTag(tag, $event)\">{{tag}}</a>\n" +
    "                </li>\n" +
    "                <li class=\"filter-tags-type\" ng-click=\"$event.stopPropagation();\">\n" +
    "                  <label>\n" +
    "                    <input type=\"radio\" name=\"tagType\" value=\"or\" ng-model=\"projectFilterCriteria.tagType\" />OR</label>\n" +
    "                  <label>\n" +
    "                    <input type=\"radio\" name=\"tagType\" value=\"and\" ng-model=\"projectFilterCriteria.tagType\" />AND</label>\n" +
    "                </li>\n" +
    "                <li ng-click=\"$event.stopPropagation();\">\n" +
    "                  <a href=\"#\" id=\"btn-clear\" class=\"btn btn-default\" ng-disabled=\"!projectFilterCriteria.tags.length\" ng-click=\"projectFilterCriteria.tags = []; $event.stopPropagation()\">\n" +
    "                    <span translate>Clear Selection</span>\n" +
    "                  </a>\n" +
    "                </li>\n" +
    "              </ul>\n" +
    "            </div>\n" +
    "            <div uib-dropdown>\n" +
    "              <a uib-dropdown-toggle href=\"#\" class=\"btn btn-dropdown dropdown-toggle btn-status\">\n" +
    "                <span ng-show=\"projectsType === TYPE_ONLINE\" translate>Online</span>\n" +
    "                <span ng-show=\"projectsType === TYPE_ARCHIVED\" translate>Archive</span>\n" +
    "                <i>&nbsp;</i>\n" +
    "              </a>\n" +
    "              <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "                <li role=\"menuitem\">\n" +
    "                  <a href=\"#\" ng-click=\"onProjectTypeClicked(TYPE_ONLINE)\" translate>Online</a>\n" +
    "                </li>\n" +
    "                <li role=\"menuitem\">\n" +
    "                  <a href=\"#\" ng-click=\"onProjectTypeClicked(TYPE_ARCHIVED)\" translate>Archive</a>\n" +
    "                </li>\n" +
    "              </ul>\n" +
    "            </div>\n" +
    "            <div uib-dropdown>\n" +
    "              <a uib-dropdown-toggle href=\"#\" class=\"btn btn-dropdown dropdown-toggle btn-sort-projects\">\n" +
    "                <span>{{projectSortCriterion.label}}</span>\n" +
    "                <i>&nbsp;</i>\n" +
    "              </a>\n" +
    "              <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "                <li role=\"menuitem\" ng-repeat=\"criterion in projectSortCriteria\">\n" +
    "                  <a href=\"#\" ng-click=\"sortProjects(criterion)\">{{criterion.label}}</a>\n" +
    "                </li>\n" +
    "              </ul>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <span class=\"d-icon di-sync btn-reload\" title=\"Refresh Projects\" ng-click=\"loadAllProjects()\">&nbsp;</span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div id=\"edit-projects\" ng-class=\"{'on': hasSelectedAnyProjects()}\">\n" +
    "          <a href=\"#\" class=\"btn btn-default\" ng-click=\"deleteSelectedProjects()\">\n" +
    "            <span translate>Delete</span>\n" +
    "          </a>\n" +
    "          <a href=\"#\" class=\"btn btn-default\" ng-click=\"onClickArchiveSelectedProjects()\" ng-show=\"projectsType === TYPE_ONLINE && !isRPGUser\">\n" +
    "            <span translate>Move to Archive</span>\n" +
    "          </a>\n" +
    "          <a href=\"#\" class=\"btn btn-default\" ng-click=\"onClickActivateSelectedProjects()\" ng-show=\"projectsType === TYPE_ARCHIVED\">\n" +
    "            <span translate>Restore to Online</span>\n" +
    "          </a>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"projects\" dashboard-menu-scroll=\"closeMenus()\">\n" +
    "          <div class=\"loading\" ng-show=\"isProjectListLoading\">\n" +
    "            <spinner s-type=\"ide\"></spinner>\n" +
    "          </div>\n" +
    "\n" +
    "          <p class=\"projects-info-empty-online\" ng-show=\"(projectsType === TYPE_ONLINE) && (projects !== null) && !hasOnlineProjects() && !isRPGUser\">\n" +
    "            <span translate>Please create new project.</span>\n" +
    "            <br />\n" +
    "            <span>\n" +
    "              <span translate>No project is available.</span>\n" +
    "            </span>\n" +
    "          </p>\n" +
    "          <p class=\"projects-info-empty-archived\" ng-show=\"(projectsType === TYPE_ARCHIVED) && (projects !== null) && !hasArchivedProjects()\">\n" +
    "            <span translate>There is no archived project.</span>\n" +
    "            <br />\n" +
    "            <span>\n" +
    "              <span translate>Use this feature to move your unnecessary projects.</span>\n" +
    "            </span>\n" +
    "          </p>\n" +
    "\n" +
    "        <div infinite-scroll=\"scrollToNextProjectsPage()\"\n" +
    "          infinite-scroll-disabled=\"infiniteScrollBusy\"\n" +
    "          infinite-scroll-immediate-check=\"false\"\n" +
    "          infinite-scroll-container=\"'.projects'\">\n" +
    "            <div\n" +
    "              ng-click=\"openProjectDetails(project)\"\n" +
    "              ng-repeat=\"project in projects | filter:filterProject(project) | orderBy:['-starred', projectSortCriterion.value]\" ng-class=\"{'project': true, 'new': project.isNew, 'selected': project.selected, 'editting': project.editting, 'current': currentProjectId === project.projectId}\"\n" +
    "              ng-show=\"!project.hidden && (project.type === projectsType)\" id=\"project-{{project.projectId}}\">\n" +
    "              <input aria-label=\"label-project-{{project.projectId}}\" type=\"checkbox\" class=\"project-select\" ng-model=\"project.selected\" ng-hide=\"project.current || !project.isOwner\" ng-change=\"onSelectionChange(project.selected)\">\n" +
    "              <img ng-if=\"!project.languageType || project.languageType !== 'generic'\" ng-src=\"{{project.icon ? ideHost + project.icon + '?api_token=' + apiToken : ''}}\" alt=\"\"\n" +
    "                class=\"project-icon\">\n" +
    "              <img ng-if=\"project.languageType && project.languageType === 'generic'\" class=\"project-icon\" src=\"img/dashboard/icons/dashboard-project-icon.png\" alt=\"Project Icon\">\n" +
    "\n" +
    "              <div ng-show=\"!project.editting\">\n" +
    "                <h3 class=\"project-title\">{{project.name}}\n" +
    "                  <img alt=\"react\" src=\"img/dashboard/icon_react_mini.png\" ng-hide=\"!(project.framework && project.framework === 'react-native')\" class=\"project-icon-react-native\"\n" +
    "                  />\n" +
    "                </h3>\n" +
    "                <p class=\"project-description\">\n" +
    "                  {{project.description || ('No project description.' | translate)}}\n" +
    "                </p>\n" +
    "                <p class=\"project-tags\">\n" +
    "                  <span ng-class=\"setProjectTagClass(tag)\" ng-repeat=\"tag in project.tags\">{{tag}}</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <!-- Editor and Star Feature -->\n" +
    "              <div style=\"position:absolute; display:flex;flex-direction:column; top: 10px; right: 15px;\" ng-click=\"$event.stopPropagation();\"\n" +
    "                class=\"project-quickedit\">\n" +
    "                <i class=\"d-icon\" style=\"font-size: 13px;\" ng-class=\"{'di-edit': !project.editting, 'di-edit-cancel': project.editting}\"\n" +
    "                  ng-click=\"project.editting ? cancelEditProject(project) : startEditProject(project)\"></i>\n" +
    "                <i class=\"d-icon\" ng-class=\"{'di-starred': project.starred, 'di-star': !project.starred}\" ng-click=\"starProject(project, project.starred ? false : true)\"></i>\n" +
    "                <i ng-if=\"(project.team && project.team.length > 0) || (project.isDirectPreviewEnabled)\" class=\"d-icon m-icon-team\" ng-click=\"openProjectDetails(project, 4)\"></i>\n" +
    "              </div>\n" +
    "\n" +
    "              <div class=\"project-edit\" ng-show=\"project.editting\">\n" +
    "                <input type=\"text\" ng-model=\"project.name\" class=\"project-edit-name\" placeholder=\"Project Name\" ng-keypress=\"($event.which === 13) ? editProject(project) : void();\"\n" +
    "                  ng-disabled=\"!project.isOwner\">\n" +
    "                <textarea ng-model=\"project.description\" class=\"project-edit-description\" placeholder=\"Description\" cols=\"30\" rows=\"2\" ng-disabled=\"!project.isOwnerOrDeveloper\"></textarea>\n" +
    "                <input type=\"text\" ng-model=\"project.tagsStr\" placeholder=\"Tags (Separate with comma)\" class=\"project-edit-tags\" ng-keypress=\"($event.which === 13) ? editProject(project) : void();\">\n" +
    "                <a href=\"#\" class=\"btn btn-default project-edit-save\" ng-click=\"editProject(project)\" ng-disabled=\"project.isProjectListLoading\">\n" +
    "                  <span translate>Save</span>\n" +
    "                </a>\n" +
    "                <spinner s-type=\"ide\" ng-hide=\"!project.isProjectListLoading\"></spinner>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"loading-templates\" ng-if=\"infiniteScrollBusy\">\n" +
    "              <spinner s-type=\"modal\" s-loading-text=\"Loading projects...\"></spinner>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <!-- /container -->\n" +
    "    </section>\n" +
    "\n" +
    "    <aside class=\"wall\" ng-controller=\"wallCtrl\">\n" +
    "      <div class=\"wall-inner\">\n" +
    "        <div class=\"warn-box\" ng-if=\"hasPaymentService && hasUSDFailurePayments\">\n" +
    "          <i class=\"d-icon di-exclamation\"></i>\n" +
    "          <span ng-bind-html=\"hasUSDFailurePaymentWarning\"></span>\n" +
    "        </div>\n" +
    "        <div class=\"warn-box\" ng-if=\"hasPaymentService && hasJPYFailurePayments\">\n" +
    "          <i class=\"d-icon di-exclamation\"></i>\n" +
    "          <span ng-bind-html=\"hasJPYFailurePaymentWarning\"></span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div ng-if=\"hasShowBanner && isLanguageJa\">\n" +
    "          <div ng-click=\"openBanner()\" class=\"dashboard-banner\">\n" +
    "            <img src=\"img/dashboard/banner_mbaas.png\" class=\"dashboard-banner-img\"/>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div ng-if=\"events.length == 0\" class=\"wrapper-logo\">\n" +
    "          <img src=\"../img/dashboard/monaca_empty.png\"/>\n" +
    "        </div>\n" +
    "      \n" +
    "        <div class=\"event-list-section\" ng-if=\"events.length > 0\">\n" +
    "          <h4 translate>Events</h4>\n" +
    "          <ul>\n" +
    "            <a ng-repeat=\"event in events\" href=\"{{event.url}}\" target=\"_blank\">\n" +
    "              <li>\n" +
    "                  <div class=\"image\"><img src=\"{{event.imageUrl}}\"></div>\n" +
    "                  <div class=\"event-content\">\n" +
    "                    <div class=\"title\">{{event.title}}</div>\n" +
    "                    <span class=\"date\">{{event.date}}</span><span class=\"place\">{{event.location}}</span>\n" +
    "                  </div>\n" +
    "              </li>\n" +
    "            </a>\n" +
    "          </ul>\n" +
    "        </div>\n" +
    "        \n" +
    "        <div class=\"blog\" ng-if=\"showBlog\">\n" +
    "          <section id=\"wall-blog\" class=\"wall-blog\">\n" +
    "            <div class=\"title title-{{lang}}\" ng-click=\"openBlog()\" translate>Posts from The Web Tub</div>\n" +
    "            <ul class=\"blog-box\">\n" +
    "              <li ng-repeat=\"item in blog.items\" ng-class=\"{'blog-read': isBlogRead(item.$$hashKey)}\">\n" +
    "                <a href=\"{{item.link}}\" target=\"_blank\" ng-click=\"markBlogAsRead(item.$$hashKey)\">\n" +
    "                  <div ng-if=\"item.imageUrl\" class=\"image-blog-container\">\n" +
    "                    <img class=\"new-blog\" src=\"../img/dashboard/ico_new.png\" ng-if=\"isBlogPostNew(item.pubDate) && !isBlogRead(item.$$hashKey)\" alt=\"\"/>\n" +
    "                    <img src=\"{{item.imageUrl}}\" alt=\"\"/>\n" +
    "                  </div>\n" +
    "                  <h3>{{item.title}}</h3>\n" +
    "                  <p class=\"blog-date\">{{item.pubDate}}</p>\n" +
    "                  <p class=\"blog-body\">{{item.description}}</p>\n" +
    "                </a>\n" +
    "              </li>\n" +
    "            </ul>\n" +
    "          </section>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </aside>\n" +
    "  </div>\n" +
    "\n" +
    "  <script type=\"text/javascript\" ng-if=\"newcomer\">\n" +
    "    /* <![CDATA[ */\n" +
    "    var google_conversion_id = 990498722;\n" +
    "    var google_conversion_language = \"en\";\n" +
    "    var google_conversion_format = \"3\";\n" +
    "    var google_conversion_color = \"ffffff\";\n" +
    "    var google_conversion_label = \"UeRECJb1vAUQop-n2AM\";\n" +
    "    var google_conversion_value = 0;\n" +
    "    /* ]]> */\n" +
    "  </script>\n" +
    "  <script type=\"text/javascript\" src=\"//www.googleadservices.com/pagead/conversion.js\" ng-if=\"newcomer\"></script>\n" +
    "\n" +
    "  <div ng-controller=\"projectDetailPanel\" id=\"project-detail-panel\" class=\"project-detail-panel ng-hide\">\n" +
    "    <i class=\"d-icon di-close project-detail-close\" ng-click=\"close()\"></i>\n" +
    "    <header>\n" +
    "      <h2>{{name}}</h2>\n" +
    "      <h3>{{descriptionLabel}}</h3>\n" +
    "      <ul class=\"project-details\">\n" +
    "        <li ng-if=\"ownerName\" class=\"sep\">\n" +
    "          <span translate>Owner: </span>\n" +
    "          <img ng-if=\"showGravatarIcon\" class=\"gravatar\" ng-src=\"{{ownerIcon}}\" alt=\"{{ownerName}}\" title=\"{{ownerName}}\" />\n" +
    "          <img ng-if=\"!showGravatarIcon\" class=\"gravatar\" ng-src=\"img/dashboard/default_profile_icon_60.png\" alt=\"{{ownerName}}\" title=\"{{ownerName}}\"  />\n" +
    "          {{ownerName}}\n" +
    "        </li>\n" +
    "        <li class=\"sep\">\n" +
    "          <span translate>Created:&nbsp;</span>{{createdAt}}</li>\n" +
    "        <li class=\"sep\">\n" +
    "          <span translate>Last access:&nbsp;</span>{{lastAccessedAt}}</li>\n" +
    "        <li>\n" +
    "          <span translate>Framework:&nbsp;</span>{{frameworkLabel}}</li>\n" +
    "      </ul>\n" +
    "    </header>\n" +
    "\n" +
    "    <content>\n" +
    "      <uib-tabset active=\"tabPlacement\">\n" +
    "        <uib-tab ng-show=\"!isRPGUser && active\" index=\"0\" class=\"tab-develop\" id=\"tab-develop\">\n" +
    "          <uib-tab-heading>\n" +
    "            <i class=\"d-icon di-develop\"></i>\n" +
    "            <span translate>Develop</span>\n" +
    "          </uib-tab-heading>\n" +
    "          <div ng-hide=\"(framework && framework === 'react-native')\" class=\"project-tab-section develop-cloud\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-cloud-development\"></i>\n" +
    "              <span>\n" +
    "                <span translate>Cloud Development</span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span translate>Monaca Cloud IDE is a full-featured online ide with coding, debugging and building capabilities.</span>\n" +
    "            </p>\n" +
    "\n" +
    "            <div class=\"m-btn-group\" uib-dropdown auto-close=\"outsideClick\">\n" +
    "              <button id=\"openIdeButton\" class=\"m-btn m-btn-blue m-caret-left-button\" ng-click=\"openIde()\">\n" +
    "                <i class=\"d-icon di-open-in-ide\"></i>\n" +
    "                <span translate>Open in Cloud IDE</span>\n" +
    "              </button>\n" +
    "              <button class=\"m-btn m-btn-blue m-caret\" uib-dropdown-toggle>\n" +
    "                <span class=\"caret\"></span>\n" +
    "                <span class=\"sr-only\" translate>Open IDE Options</span>\n" +
    "              </button>\n" +
    "              <ul uib-dropdown-menu ng-if=\"hasSafeOpenProject\"\n" +
    "                  class=\"dropdown-menu m-button-dropdown-list\" role=\"menu\" aria-labelledby=\"openIdeButton\">\n" +
    "                <li role=\"menuitem\">\n" +
    "                  <a href=\"#\" ng-click=\"openIde({safe_mode: true})\" translate>Open in safe mode</a>\n" +
    "                </li>\n" +
    "              </ul>\n" +
    "              <ul uib-dropdown-menu ng-if=\"!hasSafeOpenProject\"\n" +
    "                  class=\"dropdown-menu m-button-dropdown-list\" role=\"menu\" aria-labelledby=\"openIdeButton\">\n" +
    "                <li role=\"menuitem\" ng-show=\"openInSafeModeOption\">\n" +
    "                  <label for=\"checkbox-safe-mode\">\n" +
    "                    <input id=\"checkbox-safe-mode\" aria-label=\"selectall\" type=\"checkbox\"\n" +
    "                      ng-model=\"openIdeOptions.opensettings.safe_mode\">\n" +
    "                      <span translate>Open in safe mode</span>\n" +
    "                  </label>\n" +
    "                </li>\n" +
    "                <li role=\"menuitem\" ng-show=\"terminalServiceEnabled()\">\n" +
    "                  <label for=\"checkbox-lite-mode\">\n" +
    "                    <input id=\"checkbox-lite-mode\" aria-label=\"selectall\" type=\"checkbox\"\n" +
    "                      ng-model=\"openIdeOptions.opensettings.lite_mode\">\n" +
    "                      <span translate>Open in lite mode</span>\n" +
    "                      <span class=\"m-tooltip-body icon-help\" style=\"margin-left: 0;\">\n" +
    "                          <i class=\"m-tooltip tt-text-leftside\" translate>\n" +
    "                            There will be no terminal feature in<br>this mode.\n" +
    "                          </i>\n" +
    "                      </span>\n" +
    "                  </label>\n" +
    "                  </a>\n" +
    "                </li>\n" +
    "              </ul>\n" +
    "            </div>\n" +
    "            <span ng-hide=\"isSupportedBrowser\" style=\"font-weight: normal; font-size: 12px;\">\n" +
    "              <i class=\"d-icon di-exclamation\" style=\"color: orange;\"></i>\n" +
    "              <a ng-href=\"{{ docsUrl.environment }}\" target=\"_blank\" rel=\"noopener\">\n" +
    "                <span translate>This browser has support limitations.</span>\n" +
    "              </a>\n" +
    "            </span>\n" +
    "          </div>\n" +
    "\n" +
    "          <div class=\"project-tab-section develop-local-cli\" ng-if=\"showCliGuide\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-local-development\"></i>\n" +
    "              <span>\n" +
    "                <span translate>Command Line Interface for Local Development</span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span ng-bind-html=\"getCliText()\"></span>\n" +
    "            </p>\n" +
    "            <div class=\"code-sample\">\n" +
    "              <div>$ npm i -g monaca</div>\n" +
    "              <div>$ monaca login</div>\n" +
    "              <div>$ monaca import</div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div class=\"project-tab-section develop-local-gui\" ng-if=\"showLocalKitGuide\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-desktop-development\"></i>\n" +
    "              <span>\n" +
    "                <span translate>Desktop App (GUI) for Local Development</span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span translate>For Windows and Mac users, Monaca Localkit is a desktop app that contains all necessary development stack with\n" +
    "                a quick installation.</span>\n" +
    "            </p>\n" +
    "            <a href=\"#\" ng-click=\"openLocalkitPage('/localkit.html')\">\n" +
    "              <span translate>Learn more about Localkit</span>\n" +
    "            </a>\n" +
    "          </div>\n" +
    "\n" +
    "        </uib-tab>\n" +
    "\n" +
    "        <uib-tab ng-show=\"active\" index=\"1\" class=\"tab-build\" ng-if=\"isOwnerOrDeveloper\">\n" +
    "          <uib-tab-heading>\n" +
    "            <i class=\"d-icon di-build\"></i>\n" +
    "            <span translate>Build</span>\n" +
    "          </uib-tab-heading>\n" +
    "\n" +
    "          <div class=\"project-tab-section build-remote-build\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-build\"></i>\n" +
    "              <span>\n" +
    "                <span translate>\n" +
    "                  Remote Build\n" +
    "                </span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span translate ng-hide=\"showCustomBuild\">Generates native package for mobile platforms. Please choose the target operating system.</span>\n" +
    "            </p>\n" +
    "            <div style=\"display: flex; align-items: center; flex-wrap:wrap;\">\n" +
    "              <button ng-show=\"canBuild('android', project)\" ng-click=\"openBuildScreen('android-build')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-android\"></i> Android</button>\n" +
    "              <button ng-show=\"canBuild('ios', project)\" ng-click=\"openBuildScreen('ios-build')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-ios\"></i> iOS</button>\n" +
    "              <button ng-show=\"canBuild('windows', project)\" ng-show=\"!isRPGUser\" ng-click=\"openBuildScreen('windows-build')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-windows\"></i> Windows</button>\n" +
    "              <button ng-show=\"canBuild('electron', project)\" ng-click=\"openBuildScreen('electron-windows-build')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-windows\"></i> Windows</button>\n" +
    "              <button ng-show=\"canBuild('electron', project) && project.showElectronMacOsBuild\" ng-click=\"openBuildScreen('electron-macos-build')\" class=\"m-btn\">\n" +
    "                  <i class=\"d-icon di-macos\"></i> macOS</button>\n" +
    "              <button ng-show=\"canBuild('electron', project) && project.showElectronLinuxBuild\" ng-click=\"openBuildScreen('electron-linux-build')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-linux\"></i> Linux</button>\n" +
    "              <button ng-show=\"showCustomBuild\" ng-click=\"openCustomBuild('new-remote-build', project)\" class=\"m-btn m-btn-custom-build\">\n" +
    "                <span translate>New Remote Build</span>\n" +
    "              </button>\n" +
    "              <a style=\"margin-left: 5px;\" href=\"#\" ng-click=\"openBuildScreen('build-history')\">\n" +
    "                <i class=\"d-icon di-build-history\"></i>\n" +
    "                <span translate>Build History</span>\n" +
    "              </a>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div class=\"project-tab-section build-app-settings\" ng-if=\"showAppConfiguration\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-configure\"></i>\n" +
    "              <span>\n" +
    "                <span translate>App Configuration</span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span translate>Configure required properties for building application.</span>\n" +
    "            </p>\n" +
    "            <div style=\"display: flex; align-items: center; flex-wrap:wrap;\">\n" +
    "              <button ng-show=\"canBuild('android', project)\" ng-click=\"openBuildScreen('android-app-settings')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-android\"></i> Android</button>\n" +
    "              <button ng-show=\"canBuild('ios', project)\" ng-click=\"openBuildScreen('ios-app-settings')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-ios\"></i> iOS</button>\n" +
    "              <button ng-show=\"canBuild('windows', project)\" ng-click=\"openBuildScreen('windows-app-settings')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-windows\"></i> Windows</button>\n" +
    "              <button ng-show=\"canBuild('electron', project)\" ng-click=\"openBuildScreen('electron-windows-app-settings')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-windows\"></i> Windows</button>\n" +
    "              <button ng-show=\"canBuild('electron', project) && project.showElectronMacOsBuild\" ng-click=\"openBuildScreen('electron-macos-app-settings')\" class=\"m-btn\">\n" +
    "                  <i class=\"d-icon di-macos\"></i> macOS</button>\n" +
    "              <button ng-show=\"canBuild('electron', project) && project.showElectronLinuxBuild\" ng-click=\"openBuildScreen('electron-linux-app-settings')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-linux\"></i> Linux</button>\n" +
    "              <button ng-show=\"!isRPGUser\" ng-click=\"openBuildScreen('cordova-plugins')\" ng-show=\"framework == 'cordova'\" class=\"m-btn\">\n" +
    "                <img alt=\"cordova\" src=\"img/dashboard/icn_cordova.svg\" style=\"width: 20px; margin-right: 3px\"> Cordova</button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </uib-tab>\n" +
    "\n" +
    "        <uib-tab ng-show=\"active && hasDeployOrCiServiceEnabled\" index=\"2\" class=\"tab-deploy\" ng-if=\"isOwnerOrDeveloper\">\n" +
    "          <uib-tab-heading>\n" +
    "            <i class=\"d-icon di-deploy\"></i>\n" +
    "            <span translate>Deploy</span>\n" +
    "          </uib-tab-heading>\n" +
    "\n" +
    "          <div ng-show=\"hasDeployServiceEnabled\" class=\"project-tab-section build-deploy-services\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-deploy-service\"></i>\n" +
    "              <span>\n" +
    "                <span translate>Deploy Service</span>\n" +
    "              </span>\n" +
    "            </h4>\n" +
    "            <p>\n" +
    "              <span translate>Deploy service transfers the built app to connecting services.</span>\n" +
    "            </p>\n" +
    "\n" +
    "            <div>\n" +
    "              <button ng-click=\"openBuildScreen('deploy-service')\" class=\"m-btn\">\n" +
    "                <i class=\"d-icon di-deploy-service\"></i>\n" +
    "                <span translate>Manage deploy service</span>\n" +
    "              </button>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div ng-if=\"hasCIServiceEnabled && vcsServiceType\">\n" +
    "            <div ng-show=\"vcsType !== 'GitHub'\" class=\"project-tab-section build-ci\">\n" +
    "              <h4>\n" +
    "                <i class=\"d-icon di-ci\"></i>\n" +
    "                <span>\n" +
    "                  <span translate>Continuous Integration</span>\n" +
    "                </span>\n" +
    "              </h4>\n" +
    "              <p>\n" +
    "                <span translate>This project is not configured to use the continuous integration service. To use this service, please import\n" +
    "                  a project from GitHub.</span>\n" +
    "              </p>\n" +
    "              <div>\n" +
    "                <button ng-click=\"openDoc('github-import')\" class=\"m-btn\">\n" +
    "                  <i class=\"d-icon di-see-documentation\"></i>\n" +
    "                  <span translate>See Documentation</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"vcsType === 'GitHub'\" class=\"project-tab-section build-ci\">\n" +
    "              <h4>\n" +
    "                <i class=\"d-icon di-sync\"></i>\n" +
    "                <span>\n" +
    "                  <span translate>Continuous Integration</span>\n" +
    "                </span>\n" +
    "              </h4>\n" +
    "              <p>\n" +
    "                <span translate>Configure your project to automate build & deployment when GitHub repository has been updated.</span>\n" +
    "              </p>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"openDoc('ci-overview')\" class=\"m-btn\" style=\"width: 45%;\">\n" +
    "                  <i class=\"d-icon di-see-documentation\"></i>\n" +
    "                  <span translate>See Documentation</span>\n" +
    "                </button>\n" +
    "                &nbsp;\n" +
    "                <button ng-click=\"openBuildScreen('ci')\" class=\"m-btn\" style=\"width: 45%;\">\n" +
    "                  <i class=\"d-icon di-configure\"></i>\n" +
    "                  <span translate>Configure CI Configs</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div ng-if=\"hasCIServiceEnabled && !vcsServiceType\">\n" +
    "            <div class=\"project-tab-section build-ci\">\n" +
    "              <h4>\n" +
    "                <i class=\"d-icon di-ci\"></i>\n" +
    "                <span>\n" +
    "                  <span translate>Continuous Integration</span>\n" +
    "                </span>\n" +
    "              </h4>\n" +
    "              <p>\n" +
    "                <span translate>Connect GitHub Account</span>\n" +
    "              </p>\n" +
    "              <p>\n" +
    "                <span translate>To use continuous integration service, your account and project needs to be linked with GitHub.</span>\n" +
    "              </p>\n" +
    "              <div>\n" +
    "                <button ng-click=\"openGitHubManage()\" class=\"m-btn\">\n" +
    "                  <i class=\"d-icon di-see-documentation\"></i>\n" +
    "                  <span translate>Connect your Account</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </uib-tab>\n" +
    "\n" +
    "        <uib-tab index=\"3\" class=\"tab-settings\" ng-if=\"isOwnerOrDeveloper\">\n" +
    "          <uib-tab-heading>\n" +
    "            <i class=\"d-icon di-configure\"></i>\n" +
    "            <span translate>Configure</span>\n" +
    "          </uib-tab-heading>\n" +
    "\n" +
    "          <div class=\"project-tab-section settings-project\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-project-operation\"></i>\n" +
    "              <span translate>Project Operation</span>\n" +
    "            </h4>\n" +
    "            <div ng-show=\"canArchive() && !isRPGUser\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Export project</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Creates a zip archive containing all files in the project.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"exportProject()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon di-export\"></i>\n" +
    "                  <span translate>Export</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div ng-show=\"canExportToGoogleDrive()\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Export Project to Google Drive</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>\n" +
    "                    Creates a zip archive containing all files and export to Google drive.\n" +
    "                  </span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>\n" +
    "                    Note: Please prepare a destination folder for your project on Google Drive in advance.\n" +
    "                  </span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-disabled=\"exportToGoogleProcessing\" ng-click=\"exportProjectToGoogleDrive()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': exportToGoogleProcessing, 'di-spin': exportToGoogleProcessing, 'di-google-drive': !exportToGoogleProcessing}\"></i>\n" +
    "                  <span translate>Export</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"canDuplicate() && !isRPGUser\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Duplicate project</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Make a copy of this project. All settings are preserved.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-disabled=\"duplicateProcessing\" ng-click=\"duplicateProject()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': duplicateProcessing, 'di-spin': duplicateProcessing, 'di-duplicate': !duplicateProcessing}\"></i>\n" +
    "                  <span translate>Duplicate</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"canArchive() && !isRPGUser\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Archive</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Archived project cannot develop or build unless making it back online.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"archiveProject()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': archiveProcessing, 'di-spin': archiveProcessing, 'di-archive': !archiveProcessing}\"></i>\n" +
    "                  <span translate>Archive</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"canActivate() && !isRPGUser\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Restore to Online</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Move project from archive to online.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"activateProject()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': archiveProcessing, 'di-spin': archiveProcessing, 'di-archive': !archiveProcessing}\"></i>\n" +
    "                  <span translate>Online</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"canDelete()\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Delete project</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Project is permanently deleted, and cannot be undone. Use with caution.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"delete()\" class=\"project-operation-task-btn m-btn m-btn-alert\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': deleteProcessing, 'di-spin': deleteProcessing, 'di-delete': !deleteProcessing}\"></i>\n" +
    "                  <span translate>Delete</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-show=\"canRecover()\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Project Recovery</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>Clean and reinstall project dependencies.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-disabled=\"recoverProcessing\" ng-click=\"recover()\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon\" ng-class=\"{'di-loading': recoverProcessing, 'di-spin': recoverProcessing, 'di-recover': !recoverProcessing}\"></i>\n" +
    "                  <span translate>Recover</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "          </div>\n" +
    "        </uib-tab>\n" +
    "\n" +
    "        <!-- Share Tab -->\n" +
    "        <uib-tab index=\"4\" class=\"tab-shared\" id=\"tab-shared\" ng-show=\"isShared()\">\n" +
    "          <uib-tab-heading>\n" +
    "            <i class=\"d-icon di-share\"></i>\n" +
    "            <span translate>Share</span>\n" +
    "          </uib-tab-heading>\n" +
    "\n" +
    "          <div class=\"project-tab-section settings-project\">\n" +
    "            <h4>\n" +
    "              <i class=\"d-icon di-project-share\"></i>\n" +
    "              <span translate>Project Share</span>\n" +
    "            </h4>\n" +
    "\n" +
    "            <br />\n" +
    "\n" +
    "            <!-- Project Share (Shared User) -->\n" +
    "            <div ng-show=\"!isOwner && isProjectShared\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Project</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>This project is shared by the owner. Do you want to remove it from your list?</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"removeSharedProject(project_id)\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon di-delete\"></i>\n" +
    "                  <span translate>Remove</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- Project Share (Project Owner) -->\n" +
    "            <div ng-show=\"isOwner && isProjectShared\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span>{{getProjectShareTitle()}}</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>You are currently sharing this project. Do you want to disable it?</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"removeSharedProjectByOwner(project_id)\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon di-delete\"></i>\n" +
    "                  <span translate>Disable</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- Direct Preview (Project Owner) -->\n" +
    "            <div ng-show=\"isOwner && isProjectDirectPreviewShared\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Web Release</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>You are currently sharing this project on the web. Do you want to disable it?</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "\n" +
    "              <div>\n" +
    "                <button ng-click=\"disableDirectPreview(project_id)\" class=\"project-operation-task-btn m-btn\">\n" +
    "                  <i class=\"d-icon di-delete\"></i>\n" +
    "                  <span translate>Disable</span>\n" +
    "                </button>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- Direct Preview (Shared User) -->\n" +
    "            <div ng-show=\"!isOwner && isProjectDirectPreviewShared\" class=\"project-operation-task-section\">\n" +
    "              <div>\n" +
    "                <p class=\"project-operation-task-title\">\n" +
    "                  <span translate>Web Release</span>\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                  <span translate>This project's web release is currently shared by the owner.</span>\n" +
    "                </p>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "\n" +
    "          </div>\n" +
    "\n" +
    "        </uib-tab>\n" +
    "\n" +
    "      </uib-tabset>\n" +
    "    </content>\n" +
    "  </div>\n" +
    "\n" +
    "  <script type=\"text/javascript\" ng-if=\"lang === 'en'\">\n" +
    "    // var Tawk_API = Tawk_API || {},\n" +
    "    //   Tawk_LoadStart = new Date();\n" +
    "    // (function () {\n" +
    "    //   var s1 = document.createElement(\"script\"),\n" +
    "    //     s0 = document.getElementsByTagName(\"script\")[0];\n" +
    "    //   s1.async = true;\n" +
    "    //   s1.src = 'https://embed.tawk.to/5b0bc1ad10b99c7b36d45ef5/default';\n" +
    "    //   s1.charset = 'UTF-8';\n" +
    "    //   s1.setAttribute('crossorigin', '*');\n" +
    "    //   s0.parentNode.insertBefore(s1, s0);\n" +
    "    // })();\n" +
    "  </script>\n" +
    "</div>\n" +
    "");
  $templateCache.put("dashboard/DashboardNewProject.html",
    "<div class=\"dashboard-newproject\" ng-controller=\"DashboardNewProjectController\">\n" +
    "  <h1 class=\"dashboard-fullscreen-title\">\n" +
    "    <span translate>Create New Project</span>\n" +
    "  </h1>\n" +
    "\n" +
    "  <div class=\"loading-templates\" ng-show=\"loadingTemplates\">\n" +
    "    <spinner s-loading-text=\"Retrieving information...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <img src=\"img/monaca_icon_512.png\" class=\"monaca-spinning-logo\" ng-if=\"!loadingTemplates\" />\n" +
    "  <div class=\"cover\" ng-if=\"openPreview || isLoading\" ng-click=\"closePreviewWindow()\"></div>\n" +
    "  <div class=\"preview-window\" ng-class=\"{ 'open-preview': openPreview, 'close-preview': closePreview }\" ng-if=\"!loadingTemplates\">\n" +
    "    <spinner class=\"loading loadingForPreview\" s-type=\"white\" ng-if=\"loadingPreview\"></spinner>\n" +
    "    <iframe class=\"preview\" id=\"previewFrame\" ng-src=\"{{previewUrl}}\" width=\"280\" height=\"480\" ng-class=\"{ 'turn-off': turnOff, 'turn-on': turnOn, 'iframe-loaded': iframeLoaded }\"\n" +
    "      iframe-onload=\"loadingComplete()\" ng-if=\"previewUrl\"></iframe>\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-if=\"!isShortProjectCreateStep\" class=\"stepper-container\">\n" +
    "    <stepper linear=\"true\" startclosed=\"true\" control=\"stepperCtrl\" class=\"new-project-stepper\" ng-show=\"!loadingTemplates\">\n" +
    "      <step label=\"{{'Language Type' | translate}}\" completed=\"{{selectedLanguage}}\" inactive=\"!showLanguageType\">\n" +
    "        <div class=\"project-type-wrapper\">\n" +
    "          <div class=\"project-type\" ng-class=\"{'current': languageType == 'generic'}\" ng-click=\"changeLanguageType('generic')\">\n" +
    "            <div class=\"project-type-title\" translate>Generic</div>\n" +
    "            <div class=\"project-type-description\" translate>\n" +
    "              Generic Language\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </step>\n" +
    "      <step label=\"{{'Project Type' | translate}}\" completed=\"{{selectedType}}\" inactive=\"languageType === 'generic'\">\n" +
    "        <div class=\"project-type-wrapper\">\n" +
    "          <div class=\"project-type\" ng-class=\"{'current': category == 'sample'}\" ng-click=\"changeCategory('sample')\">\n" +
    "            <div class=\"project-type-title\" translate>Sample Applications</div>\n" +
    "            <div class=\"project-type-description\" translate>\n" +
    "              Clone one of our complex sample applications. This is good for beginners for experimentation.\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div class=\"project-type\" ng-class=\"{'current': category == 'template'}\" ng-click=\"changeCategory('template')\">\n" +
    "            <div class=\"project-type-title\" translate>Framework Templates</div>\n" +
    "            <div class=\"project-type-description\" translate>\n" +
    "              Create your application from one of our templates based on different frameworks.\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          <div class=\"project-type\" ng-class=\"{'current': category == 'blank'}\" ng-click=\"changeCategory('blank')\">\n" +
    "            <div class=\"project-type-title\" translate>Blank</div>\n" +
    "            <div class=\"project-type-description\" translate>\n" +
    "              Create a totally blank applicaton without any frameworks.\n" +
    "            </div>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </step>\n" +
    "      <step label=\"{{'Framework' | translate}}\" completed=\"{{selectedFramework}}\" inactive=\"languageType === 'generic' || category != 'template'\">\n" +
    "        <div class=\"framework-list\">\n" +
    "          <div class=\"framework\" ng-click=\"changeType(0)\" ng-class=\"{ 'current': templateType == templateTypes[0] }\">\n" +
    "            <div class=\"framework-icon javascript\"></div>\n" +
    "            JavaScript\n" +
    "          </div>\n" +
    "          <div class=\"framework\" ng-click=\"changeType(1)\" ng-class=\"{ 'current': templateType == templateTypes[1] }\">\n" +
    "            <div class=\"framework-icon angular\"></div>\n" +
    "            Angular\n" +
    "          </div>\n" +
    "          <div class=\"framework\" ng-click=\"changeType(2)\" ng-class=\"{ 'current': templateType == templateTypes[2] }\">\n" +
    "            <div class=\"framework-icon react\"></div>\n" +
    "            React\n" +
    "          </div>\n" +
    "          <div class=\"framework\" ng-click=\"changeType(3)\" ng-class=\"{ 'current': templateType == templateTypes[3] }\">\n" +
    "            <div class=\"framework-icon vue\"></div>\n" +
    "            Vue\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </step>\n" +
    "      <step label=\"{{'Template' | translate}}\" completed=\"{{selectedTemplate ? selectedTemplate.name : ''}}\" inactive=\"languageType === 'generic' || category == 'blank'\">\n" +
    "        <ul class=\"template-list\">\n" +
    "          <li ng-repeat=\"template in templateList\" class=\"template-detail\" ng-click=\"selectTemplate(template)\" ng-class=\"{ 'current': selectedTemplate === template }\">\n" +
    "            <div class=\"template-img\" ng-show=\"template.preview\">\n" +
    "              <img ng-src=\"{{getImgUrl(template['_id'], template.isClientTemplate)}}\" />\n" +
    "            </div>\n" +
    "            <h2 class=\"name\">{{template.name}}</h2>\n" +
    "            <div class=\"description\">{{template.description}}</div>\n" +
    "            <div ng-if=\"template.template_size\" class=\"template-size\" translate>Size:{{template.template_size}}MB</div>\n" +
    "            <a ng-show=\"template.preview\" class=\"m-btn preview-btn\" ng-click=\"$event.stopPropagation();openPreviewWindow(template)\">\n" +
    "              <span translate>Preview</span>\n" +
    "            </a>\n" +
    "            <div class=\"platforms\">\n" +
    "              <img class=\"ios\" ng-class=\"{on: template.platformIos}\" src=\"img/dashboard/template/icn_ios.svg\" />\n" +
    "              <img class=\"android\" ng-class=\"{on: template.platformAndroid}\" src=\"img/dashboard/template/icn_android.svg\" />\n" +
    "              <img class=\"win\" ng-class=\"{on: (template.platformElectron || template.platformWin)}\" src=\"img/dashboard/template/icn_winrt.svg\" />\n" +
    "            </div>\n" +
    "          </li>\n" +
    "        </ul>\n" +
    "      </step>\n" +
    "      <step label=\"{{'Project information' | translate}}\" completed=\"\">\n" +
    "        <form name=\"newProjectForm\">\n" +
    "          <dl>\n" +
    "            <dt>\n" +
    "              <span translate class=\"new-project-label\">Project Name</span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <input type=\"text\" ng-model=\"newProjectName\" class=\"new-project-name\"\n" +
    "                ng-keypress=\"($event.keyCode === 13 && newProjectForm.$valid) ? ok(newProjectName, newProjectDescription) : void();\"\n" +
    "                required />\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "          <dl>\n" +
    "            <dt>\n" +
    "              <span translate class=\"new-project-label\">Description</span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <textarea ng-model=\"newProjectDescription\" class=\"new-project-description\" cols=\"30\" rows=\"5\"></textarea>\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "          <dl>\n" +
    "            <dt ng-if=\"needContractAgreement\">\n" +
    "              <div class=\"contract-requirement\">\n" +
    "                <input type=\"checkbox\" ng-model=\"hasAgreeContract\" ng-disabled=\"!openedContract\" required>\n" +
    "                <a href=\"#\" ng-click=\"openContract()\">特約条項</a>に同意します。\n" +
    "              </div>\n" +
    "            </dt>\n" +
    "          </dl>\n" +
    "        </form>\n" +
    "        <div>\n" +
    "          <spinner s-type=\"ide\" ng-show=\"isLoading\"></spinner>\n" +
    "          <button class=\"m-btn m-btn-green btn-makeproject\" ng-disabled=\"newProjectForm.$invalid || isLoading\"\n" +
    "            ng-click=\"ok(newProjectName, newProjectDescription)\">\n" +
    "            <span translate>Create Project</span>\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </step>\n" +
    "    </stepper>\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-if=\"isShortProjectCreateStep\" class=\"stepper-container\">\n" +
    "    <stepper linear=\"true\" startclosed=\"true\" control=\"stepperCtrl\" class=\"new-project-stepper\" ng-show=\"!loadingTemplates\">\n" +
    "        <step label=\"{{'Template' | translate}}\" completed=\"{{selectedTemplate ? selectedTemplate.name : ''}}\" inactive=\"category == 'blank'\">\n" +
    "          <ul class=\"template-list\">\n" +
    "            <li ng-repeat=\"template in templateList\" class=\"template-detail\" ng-click=\"selectTemplate(template)\" ng-class=\"{ 'current': selectedTemplate === template }\">\n" +
    "              <div class=\"template-img\" ng-show=\"template.preview\">\n" +
    "                <img ng-src=\"{{getImgUrl(template['_id'], template.isClientTemplate)}}\" />\n" +
    "              </div>\n" +
    "              <h2 class=\"name\">{{template.name}}</h2>\n" +
    "              <div class=\"description\">{{template.description}}</div>\n" +
    "              <div ng-if=\"template.template_size\" class=\"template-size\" translate>Size:{{template.template_size}}MB</div>\n" +
    "              <a ng-show=\"showProjectTemplatePreview && template.preview\" class=\"m-btn preview-btn\" ng-click=\"$event.stopPropagation();openPreviewWindow(template)\">\n" +
    "                <span translate>Preview</span>\n" +
    "              </a>\n" +
    "            </li>\n" +
    "          </ul>\n" +
    "        </step>\n" +
    "        <step label=\"{{'Project information' | translate}}\" completed=\"\">\n" +
    "          <form name=\"newProjectForm\">\n" +
    "            <dl>\n" +
    "              <dt>\n" +
    "                <span translate class=\"new-project-label\">Project Name</span>\n" +
    "              </dt>\n" +
    "              <dd>\n" +
    "                <input type=\"text\" ng-model=\"newProjectName\" class=\"new-project-name\"\n" +
    "                  ng-keypress=\"($event.keyCode === 13 && newProjectForm.$valid) ? ok(newProjectName, newProjectDescription) : void();\"\n" +
    "                  required />\n" +
    "              </dd>\n" +
    "            </dl>\n" +
    "            <dl>\n" +
    "              <dt>\n" +
    "                <span translate class=\"new-project-label\">Description</span>\n" +
    "              </dt>\n" +
    "              <dd>\n" +
    "                <textarea ng-model=\"newProjectDescription\" class=\"new-project-description\" cols=\"30\" rows=\"5\"></textarea>\n" +
    "              </dd>\n" +
    "            </dl>\n" +
    "          </form>\n" +
    "          <div>\n" +
    "            <spinner s-type=\"ide\" ng-show=\"isLoading\"></spinner>\n" +
    "            <button class=\"m-btn m-btn-green btn-makeproject\" ng-disabled=\"newProjectForm.$invalid || isLoading\"\n" +
    "              ng-click=\"ok(newProjectName, newProjectDescription)\">\n" +
    "              <span translate>Create Project</span>\n" +
    "            </button>\n" +
    "          </div>\n" +
    "        </step>\n" +
    "    </stepper>\n" +
    "  </div>\n" +
    "\n" +
    "</div>\n" +
    "");
  $templateCache.put("dashboard/ImportProjectWindow.html",
    "<div class=\"dashboard-import-project\" ng-controller=\"ImportProjectController\">\n" +
    "  <h1 class=\"dashboard-fullscreen-title\">\n" +
    "    <span translate>Import Project</span>\n" +
    "  </h1>\n" +
    "\n" +
    "  <div class=\"loading-repositories\" ng-show=\"isLoadingRepositories\">\n" +
    "    <spinner s-type=\"ide\" s-loading-text=\"Gathering project information. Please wait...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"preview-window delay-800\">\n" +
    "  </div>\n" +
    "\n" +
    "  <stepper class=\"new-project-stepper\" linear=\"true\" startclosed=\"true\" control=\"stepperCtrl\">\n" +
    "    <step label=\"{{'Language Type' | translate}}\" completed=\"{{selectedLanguage}}\" inactive=\"!showLanguageType\">\n" +
    "      <div class=\"project-type-wrapper\">\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': languageType == 'generic'}\" ng-click=\"changeLanguageType('generic')\">\n" +
    "          <div class=\"project-type-title\" translate>Generic</div>\n" +
    "          <div class=\"project-type-description\" translate>\n" +
    "            Generic Language\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': languageType == 'javascript'}\" ng-click=\"changeLanguageType('javascript')\">\n" +
    "          <div class=\"project-type-title\" translate>JavaScript</div>\n" +
    "          <div class=\"project-type-description\" translate>\n" +
    "            JavaScript Language\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "    <step label=\"{{'Import Method' | translate}}\" completed=\"{{selectedMethod}}\">\n" +
    "      <div class=\"project-type-wrapper\">\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': model.method == 'url', 'half': renderHalf, 'third': renderThird, 'quarter': renderQuarter}\" ng-click=\"changeMethod('url')\">\n" +
    "          <div class=\"project-type-title\" translate>{{methodLabels['url'] | translate}}</div>\n" +
    "          <div class=\"project-type-description\" translate>Import your project by providing a URL pointing to a zip package.</div>\n" +
    "        </div>\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': model.method == 'upload', 'half': renderHalf, 'third': renderThird, 'quarter': renderQuarter}\" ng-click=\"changeMethod('upload')\">\n" +
    "          <div class=\"project-type-title\" translate>{{methodLabels['upload'] | translate}}</div>\n" +
    "          <div class=\"project-type-description\" translate>Upload your project zip file located on your computer.</div>\n" +
    "        </div>\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': model.method == 'git', 'half': renderHalf, 'third': renderThird, 'quarter': renderQuarter}\" ng-click=\"changeMethod('git')\" ng-if=\"gitssh\">\n" +
    "          <div class=\"project-type-title\" translate>{{methodLabels['git'] | translate}}</div>\n" +
    "          <div class=\"project-type-description\" translate>Import your project from Git by providing a Git SSH URL.</div>\n" +
    "        </div>\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': model.method == 'github', 'half': renderHalf, 'third': renderThird, 'quarter': renderQuarter}\" ng-click=\"changeMethod('github')\" ng-if=\"github\">\n" +
    "          <div class=\"project-type-title\" translate>{{methodLabels['github'] | translate}}</div>\n" +
    "          <div class=\"project-type-description\" translate>Import your project from your linked GitHub account</div>\n" +
    "        </div>\n" +
    "        <div class=\"project-type\" ng-class=\"{'current': model.method == 'google', 'half': renderHalf, 'third': renderThird, 'quarter': renderQuarter}\" ng-click=\"changeMethod('google')\" ng-if=\"google\">\n" +
    "          <div class=\"project-type-title\" translate>{{methodLabels['google'] | translate}}</div>\n" +
    "          <div class=\"project-type-description\" translate>Import your project from your linked Google account</div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "    <step label=\"{{methodLabels['url'] | translate}}\" completed=\"{{model.url}}\" inactive=\"model.method != 'url'\">\n" +
    "      <form name=\"importUrlForm\">\n" +
    "        <dl>\n" +
    "          <dt>\n" +
    "            <span class=\"new-project-label\" translate>Provide an URL pointing to a zip file containing your project.</span>\n" +
    "          </dt>\n" +
    "          <dd>\n" +
    "            <input class=\"import-url\" type=\"text\" ng-model=\"model.url\" placeholder=\"http://example.com/monaca-project.zip\"/>\n" +
    "          </dd>\n" +
    "        </dl>\n" +
    "      </form>\n" +
    "      <a href=\"#\" class=\"m-btn m-btn-green btn-next\" ng-disabled=\"!model.url\" ng-click=\"next()\">\n" +
    "        <span translate>Next</span>\n" +
    "      </a>\n" +
    "    </step>\n" +
    "    <step label=\"{{methodLabels['upload'] | translate}}\" completed=\"{{selectedFilename}}\" inactive=\"model.method != 'upload'\">\n" +
    "      <form name=\"uploadFromFileForm\">\n" +
    "        <dl>\n" +
    "          <dt>\n" +
    "            <span class=\"new-project-label\" translate>Browse the zip archive of your project from your computer</span>\n" +
    "          </dt>\n" +
    "          <dd>\n" +
    "            <input class=\"import-method-input\" type=\"file\" accept=\".zip\" name=\"import-upload-file\" id=\"import-upload-file\" onchange=\"angular.element(this).scope().fileSelected(this)\"/>\n" +
    "            <label for=\"import-upload-file\" class=\"m-btn btn-file-input\">\n" +
    "              <i class=\"d-icon di-archive\"></i>\n" +
    "              <span>{{selectedFilename ? selectedFilename : ('Choose a file' | translate)}}</span>\n" +
    "            </label>\n" +
    "          </dd>\n" +
    "        </dl>\n" +
    "      </form>\n" +
    "    </step>\n" +
    "    <step label=\"{{methodLabels['git'] | translate}}\" completed=\"{{model.gitsshurl}}\" inactive=\"model.method != 'git'\">\n" +
    "      <form name=\"importGitSshUrlForm\" ng-if=\"hasGitSshImportSupport\">\n" +
    "        <dl>\n" +
    "          <dt>\n" +
    "            <span class=\"new-project-label\" translate>Provide an URL pointing to your project's Git repository.</span>\n" +
    "          </dt>\n" +
    "          <dd>\n" +
    "            <input class=\"import-url\" type=\"text\" ng-model=\"model.gitsshurl\" name=\"git-repository\" id=\"git-repository\" placeholder=\"ssh://\"/>\n" +
    "          </dd>\n" +
    "        </dl>\n" +
    "      </form>\n" +
    "      <p class=\"basic-notice\" ng-if=\"!hasGitSshImportSupport\">\n" +
    "        <i class=\"d-icon di-exclamation\"></i>\n" +
    "        <span ng-bind-html=\"upgradeText\"></span>\n" +
    "      </p>\n" +
    "      <a href=\"#\" class=\"m-btn m-btn-green btn-next\" ng-disabled=\"!model.gitsshurl\" ng-click=\"next()\">\n" +
    "        <span translate>Next</span>\n" +
    "      </a>\n" +
    "    </step>\n" +
    "    <step label=\"{{methodLabels['github'] | translate}}\" completed=\"{{model.repo ? model.repo.name : ''}}\" inactive=\"model.method != 'github'\">\n" +
    "      <div class=\"github-info\" ng-if=\"!repositories || !repositories.length\">\n" +
    "        <button class=\"m-btn\" ng-click=\"openVcsIndex()\">\n" +
    "          <span translate>Connect to GitHub</span>\n" +
    "        </button>\n" +
    "        <p>\n" +
    "          <span translate>After connecting to GitHub, you can import from GitHub repositories.</span>\n" +
    "        </p>\n" +
    "      </div>\n" +
    "      <div ng-if=\"repositories && repositories.length\">\n" +
    "        <form name=\"importGitHubForm\">\n" +
    "          <dl>\n" +
    "            <dt>\n" +
    "              <span class=\"new-project-label\" translate>Import from GitHub Repository</span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <div class=\"m-component-combobox\">\n" +
    "                <select name=\"github-repository\" id=\"github-repository-select\" ng-options=\"r.full_name for r in repositories\" ng-model=\"model.repo\"></select>\n" +
    "              </div>\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "        </form>\n" +
    "        <a href=\"#\" class=\"m-btn m-btn-green btn-next\" ng-disabled=\"!model.repo\" ng-click=\"next()\">\n" +
    "          <span translate>Next</span>\n" +
    "        </a>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "    <step label=\"{{methodLabels['google'] | translate}}\" completed=\"{{model.googleFile}}\" inactive=\"model.method != 'google'\">\n" +
    "      <p class=\"basic-notice\" ng-if=\"!hasGoogleImportSupport\">\n" +
    "        <i class=\"d-icon di-exclamation\"></i>\n" +
    "        <span ng-bind-html=\"upgradeText\"></span>\n" +
    "      </p>\n" +
    "      <div class=\"github-info\" ng-if=\"hasGoogleImportSupport && !hasLinkedGoogleAccount\">\n" +
    "        <button class=\"m-btn\" ng-click=\"linkToGoogleAccount()\">\n" +
    "          <span translate>Connect to Google</span>\n" +
    "        </button>\n" +
    "        <p>\n" +
    "          <span translate>After connecting to Google, you can import project from Google drive</span>\n" +
    "        </p>\n" +
    "      </div>\n" +
    "      <div ng-if=\"hasGoogleImportSupport && hasLinkedGoogleAccount\">\n" +
    "        <form name=\"importgoogleForm\">\n" +
    "          <dl>\n" +
    "            <dt>\n" +
    "              <span class=\"new-project-label\" translate>Browse the zip archive of your project from your Google drive</span>\n" +
    "            </dt>\n" +
    "            <dd>\n" +
    "              <br />\n" +
    "              <button class=\"m-btn\" ng-click=\"openPickerDialog()\" ng-disabled=\"isSelectingGoogleFile\">\n" +
    "                <span>{{model.googleFile ? model.googleFile : ('Choose a file' | translate)}}</span>\n" +
    "              </button>\n" +
    "            </dd>\n" +
    "          </dl>\n" +
    "        </form>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "    <step label=\"{{'Project information' | translate}}\" completed=\"\">\n" +
    "      <form name=\"importProjectForm\">\n" +
    "        <dl>\n" +
    "          <dt>\n" +
    "            <span translate class=\"new-project-label\">Project Name</span>\n" +
    "          </dt>\n" +
    "          <dd>\n" +
    "            <input type=\"text\" ng-model=\"model.name\" class=\"new-project-name\" ng-keypress=\"($event.keyCode === 13) ? import() : void();\" required />\n" +
    "          </dd>\n" +
    "        </dl>\n" +
    "        <dl>\n" +
    "          <dt>\n" +
    "            <span translate class=\"new-project-label\">Description</span>\n" +
    "          </dt>\n" +
    "          <dd>\n" +
    "            <textarea ng-model=\"model.description\" class=\"new-project-description\" cols=\"30\" rows=\"5\"></textarea>\n" +
    "          </dd>\n" +
    "        </dl>\n" +
    "      </form>\n" +
    "      <div>\n" +
    "        <spinner s-type=\"ide\" ng-show=\"isLoading\"></spinner>\n" +
    "        <a href=\"#\" class=\"m-btn m-btn-green btn-makeproject\" ng-click=\"import()\" ng-disabled=\"isLoading || !model.name || !model.method\">\n" +
    "          <span translate>Import Project</span>\n" +
    "        </a>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "  </stepper>\n" +
    "  <p class=\"error\" ng-show=\"errorMsg\" ng-bind-html=\"errorMsg\"></p>\n" +
    "</div>\n" +
    "");
  $templateCache.put("dashboard/MaxProjectConfirmWindow.html",
    "<div class=\"modal-header\">\n" +
    "  <span translate>Project number reached the maximum limit</span>\n" +
    "</div>\n" +
    "<div class=\"modal-body\">\n" +
    "  <p style=\"margin-bottom: 0;\">\n" +
    "    <span translate>You can't create projects anymore in your plan.</span><br/>\n" +
    "    <span translate>Please upgrade your plan or archive any project.</span>\n" +
    "  </p>\n" +
    "</div>\n" +
    "<div class=\"modal-footer\">\n" +
    "  <a ng-href=\"{{pricingUrl}}\" target=\"_blank\" class=\"m-btn m-btn-blue\" ng-click=\"sendEventToGA('upgrade', 'execute', 'project-create');\">\n" +
    "    <span translate>Upgrade</span>\n" +
    "  </a>\n" +
    "  <a href=\"#\" class=\"m-btn\" ng-click=\"sendEventToGA('upgrade', 'cancel', 'project-create'); cancel();\">\n" +
    "    <span translate>Close</span>\n" +
    "  </a>\n" +
    "</div>");
  $templateCache.put("dashboard/NewRemoteBuild.html",
    "<div class=\"dashboard-custom-build\" ng-controller=\"NewRemoteBuildController\">\n" +
    "  <h1 class=\"dashboard-fullscreen-title\">\n" +
    "    <span translate>Start New Build</span>\n" +
    "  </h1>\n" +
    "\n" +
    "  <spinner s-type=\"ide\" ng-show=\"isLoading\"></spinner>\n" +
    "  <div class=\"cover\" ng-show=\"isProcessing\"></div>\n" +
    "  <stepper class=\"new-project-stepper\" linear=\"true\" startclosed=\"true\" control=\"stepperCtrl\" ng-hide=\"isLoading\">\n" +
    "    <step label=\"{{'Select Build' | translate}}\" completed=\"{{selectedBuildTitle}}\">\n" +
    "      <div class=\"project-type-wrapper\">\n" +
    "        <div class=\"project-type\" ng-repeat=\"build in builds\" ng-class=\"{'current': selectedBuildTitle === build.name}\" ng-click=\"selectBuild(build)\">\n" +
    "          <div class=\"project-type-title\" translate>{{build.name}}</div>\n" +
    "          <div class=\"project-type-description\" translate>\n" +
    "            {{build.description}}\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "    <step label=\"{{'Build' | translate}}\" completed=\"\">\n" +
    "      <div>\n" +
    "        <spinner s-type=\"ide\" ng-show=\"isProcessing\"></spinner>\n" +
    "        <a href=\"#\" class=\"m-btn m-btn-green btn-start-custom-build\" ng-click=\"start()\" ng-disabled=\"isProcessing || !selectedBuildTitle\">\n" +
    "          <span translate>Start</span>\n" +
    "        </a>\n" +
    "      </div>\n" +
    "    </step>\n" +
    "  </stepper>\n" +
    "  <p class=\"error\" ng-show=\"errorMsg\" ng-bind-html=\"errorMsg\"></p>\n" +
    "\n" +
    "</div>");
  $templateCache.put("dashboard/ProjectRecoveryDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>Project Recovery</h3>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"message\">\n" +
    "    <p>\n" +
    "      <div translate> The following fixes will be applied to the project. </div>\n" +
    "    </p>\n" +
    "    <ul class=\"list\">\n" +
    "      <li>\n" +
    "        <input type=\"checkbox\" ng-model=\"node_modules\" ng-checked=\"node_modules\">\n" +
    "        <span translate>Reconfigure node_modules</span>\n" +
    "      </li>\n" +
    "      <li>\n" +
    "        <input type=\"checkbox\" ng-model=\"package_lock\" ng-checked=\"package_lock\">\n" +
    "        <span translate>Reconfigure package-lock.json</span>\n" +
    "      </li>\n" +
    "      <li>\n" +
    "        <input type=\"checkbox\" ng-model=\"missing_files\" ng-checked=\"missing_files\">\n" +
    "        <span translate>Install .gitignore .monacaignore, and package.json if missing</span>\n" +
    "      </li>\n" +
    "      <li>\n" +
    "        <input type=\"checkbox\" ng-model=\"terminal_server\" ng-checked=\"terminal_server\">\n" +
    "        <span translate>Refresh terminal server</span>\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "    <p>\n" +
    "      <div translate> Note that this operation may take up to several minutes. </div>\n" +
    "    </p>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-disabled=\"isLoading\" ng-click=\"cancel()\" translate>Cancel</button>\n" +
    "  <button ng-click=\"ok()\" ng-disabled=\"isLoading || !checked()\" class=\"project-operation-task-btn m-btn m-btn-blue\">\n" +
    "    <i class=\"d-icon\" ng-class=\"{'di-loading': isLoading, 'di-spin': isLoading, 'di-recover': !isLoading}\"></i>\n" +
    "    <span translate>Start Recovery</span>\n" +
    "  </button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("debugger.html",
    "<div ng-controller=\"DebuggerController as debugger\" class=\"debugger-view\">\n" +
    "  <iframe title=\"Debugger\" ng-src=\"{{debugger.url}}\"><p translate>Your browser does not support iframes.</p></iframe>\n" +
    "</div>\n" +
    "");
  $templateCache.put("DirectPreviewDialog.html",
    "<section class=\"modal-header\">\n" +
    "    <h3 class=\"modal-title\" translate>Web Release</h3>\n" +
    "    <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"modal-body\">\n" +
    "\n" +
    "    <div class=\"flex-container-row\">\n" +
    "        <label translate>Public Path:</label>\n" +
    "        <input type=\"text\" ng-model=\"dirPath\" placeholder=\"/www\" uib-typeahead=\"dir.id as dir.path for dir in directoryList | filter:{path:$viewValue} | limitTo:8\" class=\"m-component-textbox m-component-textbox-faild\" required autofocus>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"flex-container-row\">\n" +
    "      <label translate>Index File:</label>\n" +
    "      <input class=\"m-component-textbox m-component-textbox-faild\" placeholder=\"index.html\" type=\"text\" ng-model=\"fileName\" required/>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"flex-container-row\">\n" +
    "      <label translate>Visibility:</label>\n" +
    "      <select class=\"form-control\" id=\"status\" ng-model=\"status\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"flex-container-row description\">\n" +
    "      <p translate>Once you enable it, anyone can view your project previewer with this url.</p>\n" +
    "    </div>\n" +
    "\n" +
    "    <label class=\"project-share-url\">\n" +
    "      <div translate>Project URL to share:</div>\n" +
    "      <input type=\"text\" ng-model=\"directPreviewUrl\" readonly=\"readonly\">\n" +
    "    </label>\n" +
    "\n" +
    "    <div class=\"flex-container-row\">\n" +
    "      <figure class=\"qr-code\">\n" +
    "          <img ng-src=\"{{directPreviewQrCode}}\" alt=\"QR Code\">\n" +
    "      </figure>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "    <div class=\"flex-container-row buttons-row\">\n" +
    "        <span style=\"width: 100%\"></span>\n" +
    "        <button type=\"button\" ng-disabled=\"isLoading || isProcessing\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Close</button>\n" +
    "        <button ng-click=\"ok()\" ng-disabled=\"isLoading || isProcessing\" class=\"btn btn-primary\">\n" +
    "          <span translate>Apply</span>\n" +
    "        </button>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "");
  $templateCache.put("educationAdmin/accountManager.html",
    "<div ng-controller=\"AccountManager\" class=\"account-manager\">\n" +
    "  <toast></toast>\n" +
    "  <div class=\"loading\" ng-show=\"isLoading\">\n" +
    "    <spinner s-type=\"ide\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <header class=\"dashboard\">\n" +
    "    <a href=\"#\" style=\"pointer-events:none;\">\n" +
    "      <span href=\"#\" class=\"header-logo\">\n" +
    "        <img src=\"img/dashboard/logo_dashboard.svg\" alt=\"Monaca\">\n" +
    "      </span>\n" +
    "    </a>\n" +
    "  </header>\n" +
    "\n" +
    "  <div class=\"container\">\n" +
    "    <div class=\"sub-header\">\n" +
    "      <h1>\n" +
    "        <span translate>Account Manager</span>\n" +
    "      </h1>\n" +
    "    </div>\n" +
    "\n" +
    "    <section class=\"operation-section\">\n" +
    "      <button type=\"button\" class=\"btn btn-sm btn-success\" ng-disabled=\"isLoading\" ng-csv=\"getExportingList()\"\n" +
    "        csv-header=\"csvHeader\" filename=\"download.csv\" field-separator=\",\">\n" +
    "        <div translate>CSV Download (All)</div>\n" +
    "      </button>\n" +
    "      <button type=\"button\" class=\"btn btn-sm btn-success\" ng-disabled=\"isLoading\" ng-click=\"fetchingData()\">\n" +
    "          <div translate>Refresh</div>\n" +
    "      </button>\n" +
    "    </section>\n" +
    "\n" +
    "    <table st-table=\"displayedCollection\" st-safe-src=\"rowCollection\" class=\"table table-striped\">\n" +
    "      <thead>\n" +
    "        <tr>\n" +
    "          <th st-sort=\"email\" translate>Email</th>\n" +
    "          <th translate>Password</th>\n" +
    "          <th st-sort=\"license\" translate>Plan</th>\n" +
    "          <th translate>Action</th>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "          <th>\n" +
    "            <input st-search=\"email\" placeholder=\"search for email\" class=\"input-sm form-control\" type=\"search\" />\n" +
    "          </th>\n" +
    "          <th></th>\n" +
    "          <th></th>\n" +
    "          <th></th>\n" +
    "        </tr>\n" +
    "      </thead>\n" +
    "      <tbody ng-show=\"!isLoading\">\n" +
    "        <tr st-select-row=\"row\" ng-repeat=\"row in displayedCollection\">\n" +
    "          <td>{{row.email}}</td>\n" +
    "          <td>\n" +
    "            <input disabled type=\"{{row.showPassword ? 'text' : 'password'}}\" value=\"{{row.password_raw}}\" class=\"display-password\"/>\n" +
    "            <button class=\"btn show-password-btn\" ng-click=\"(row.showPassword = !row.showPassword)\">\n" +
    "                <i class=\"fa fa-eye\"></i>\n" +
    "            </button>\n" +
    "          </td>\n" +
    "          <td>{{row.license}}</td>\n" +
    "          <td>\n" +
    "            <button type=\"button\" class=\"m-btn\" ng-click=\"resetPassword(row.id)\" type=\"button\">\n" +
    "              <span translate>Reset Password</span>\n" +
    "            </button>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "      </tbody>\n" +
    "      <tfoot ng-show=\"!isLoading\">\n" +
    "        <tr>\n" +
    "          <td colspan=\"4\" class=\"text-center\">\n" +
    "            <div st-pagination=\"\" st-items-by-page=\"100\"></div>\n" +
    "          </td>\n" +
    "        </tr>\n" +
    "      </tfoot>\n" +
    "    </table>\n" +
    "  </div>\n" +
    "\n" +
    "</div>");
  $templateCache.put("EndOfBackendDialog.html",
    "<section class=\"modal-body\">\n" +
    "  <img style=\"width: 120px; padding: 15px;\" src=\"img/logo_monaca2.png\" />\n" +
    "  <p style=\"line-height: 1.7; margin: 0 25px 10px;\" translate>\n" +
    "    The Monaca Backend which is used for user management was terminated on May 31, 2021. <br>\n" +
    "    Thank you for using Monaca Backend service.</p>\n" +
    "  <p style=\"font-size: 11px;\">&copy; 2011-2021 Asial Corporation. All rights reserved.</p>\n" +
    "</section>");
  $templateCache.put("footer.html",
    "<nav\n" +
    "  ng-controller=\"FooterController as footer\"\n" +
    "  class=\"navbar navbar-default\"\n" +
    "  style=\"min-height: 34px; height: 34px;\"\n" +
    ">\n" +
    "  <div ng-show=\"footer.isEditor\" class=\"container-fluid\">\n" +
    "    <div class=\"collapse navbar-collapse\">\n" +
    "      <ul class=\"nav navbar-nav navbar-right\">\n" +
    "        <li class=\"dropdown dropup\">\n" +
    "          <a\n" +
    "            ng-show=\"footer.hasChangeEncoding\"\n" +
    "            href=\"#\"\n" +
    "            class=\"dropdown-toggle\"\n" +
    "            style=\"padding-top: 7px; padding-bottom: 7px;\"\n" +
    "            data-toggle=\"dropdown\"\n" +
    "            role=\"button\"\n" +
    "            aria-haspopup=\"true\"\n" +
    "            aria-expanded=\"false\"\n" +
    "            >{{ footer.encoding }}</a\n" +
    "          >\n" +
    "          <ul class=\"dropdown-menu\">\n" +
    "            <li class=\"dropdown-header\" translate>Reopen file with</li>\n" +
    "            <li ng-repeat=\"encoding in footer.encodings\">\n" +
    "              <a href=\"#\" ng-click=\"footer.changeEncoding(encoding)\">{{ encoding }}</a>\n" +
    "            </li>\n" +
    "          </ul>\n" +
    "        </li>\n" +
    "        <li class=\"dropdown dropup\">\n" +
    "          <a\n" +
    "            ng-show=\"footer.hasChangeEol\"\n" +
    "            href=\"#\"\n" +
    "            class=\"dropdown-toggle\"\n" +
    "            style=\"padding-top: 7px; padding-bottom: 7px;\"\n" +
    "            data-toggle=\"dropdown\"\n" +
    "            role=\"button\"\n" +
    "            aria-haspopup=\"true\"\n" +
    "            aria-expanded=\"false\"\n" +
    "            >{{ footer.eolTypeString }}</a\n" +
    "          >\n" +
    "          <ul class=\"dropdown-menu\">\n" +
    "            <li class=\"dropdown-header\" translate>Change End of Line sequence:</li>\n" +
    "            <li><a href=\"#\" ng-click=\"footer.setEditorEol(footer.eolTypes.LF)\">LF</a></li>\n" +
    "            <li><a href=\"#\" ng-click=\"footer.setEditorEol(footer.eolTypes.CRLF)\">CRLF</a></li>\n" +
    "          </ul>\n" +
    "        </li>\n" +
    "      </ul>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</nav>");
  $templateCache.put("grepPanel.html",
    "<div id=\"grep-panel\" class=\"grep-panel\" ng-controller=\"GrepPanelController as grep\">\n" +
    "  <div class=\"search\">\n" +
    "    <div class=\"options\">\n" +
    "      <button ng-class=\"{active: isCaseSensitive}\" ng-click=\"toggleCaseSensitive()\" title=\"Case sensitive\">aA</button>\n" +
    "      <button ng-class=\"{active: isRegExp}\" ng-click=\"toggleIsRegExp()\" title=\"Use regular expression\">.*?</button>\n" +
    "    </div>\n" +
    "\n" +
    "    <input id=\"grep-searchbox\" type=\"text\" ng-model=\"keyword\" ng-change=\"search()\" name=\"keyword\" class=\"m-component-textbox\" placeholder=\"Type to search...\" autofocus/>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"result-container\">\n" +
    "    <spinner ng-show=\"isSearching\" scale=\"0.1\" top=\"10%\"></spinner>\n" +
    "\n" +
    "    <div class=\"message-box\" ng-show=\"!isSearching && !results\" translate>\n" +
    "      Type to search across all project files\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"message-box\" ng-show=\"!isSearching && results && getLength(results) === 0\" translate>\n" +
    "      No results\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"results\">\n" +
    "      <div ng-repeat=\"(fileKey, fileData) in results\">\n" +
    "        <div class=\"file-detail\"><img ng-src=\"{{getFileTypeImage(fileKey)}}\" height=\"16\" width=\"16\"/>{{fileKey}}</div>\n" +
    "        <div class=\"file-line\" ng-class=\"{'selected': selectedResult === getResultId(fileKey, lineData.num)}\" ng-repeat=\"lineData in fileData\" ng-click=\"setSelectedResult(getResultId(fileKey, lineData.num))\" ng-dblclick=\"openFile(fileKey, lineData.num)\">\n" +
    "          <span class=\"line-num\">{{lineData.num}}</span> <span class=\"line-match-text\" ng-bind-html=\"formatExcerpt(lineData.excerpt)\"></span>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("header.html",
    "<div ng-controller=\"HeaderController as header\">\n" +
    "  <div ng-click=\"header.menuClick($event)\" class=\"logo-container\">\n" +
    "    <div class=\"logo\"></div>\n" +
    "  </div>\n" +
    "\n" +
    "  <ul class=\"header-left-menu\">\n" +
    "    <li class=\"header-left-menu-items\" role=\"presentation\" ng-repeat=\"item in header.menu\" ng-if=\"item.hasItem\" ng-class=\"{'no-hover': item.label === null || item.isButtonVisible, 'm-icon-vsep': item.label === null, 'disabled': item.disabled.value === true}\"\n" +
    "      ng-click=\"item.disabled.value || (item.items.length ? header.toggleMenuItem() : item.click(item));\">\n" +
    "      <span>\n" +
    "        <button class=\"m-btn\" wrap-if=\"{{item.isButtonVisible}}\">\n" +
    "          <i ng-show=\"item.icon && item.isIconVisible\" ng-class=\"{'m-icon': true, '{{item.icon}}': true}\"></i>{{item.label}}\n" +
    "          <span class=\"header-text-beta\" ng-show=\"item.isBeta\" translate>BETA</span>\n" +
    "        </button>\n" +
    "      </span>\n" +
    "      <ul ng-if=\"item.items.length > 0\">\n" +
    "        <li ng-repeat=\"subItem in item.items track by $index\" ng-if=\"subItem.hasItem\" ng-class=\"{'no-hover': subItem.label === null, 'disabled': subItem.disabled.value === true}\"\n" +
    "          ng-click=\"header.closeMenu($event); subItem.disabled.value || subItem.click(subItem);\">\n" +
    "          <span>\n" +
    "            <i ng-show=\"subItem.icon && subItem.isIconVisible\" ng-class=\"{'m-icon': true, '{{subItem.icon}}': true}\"></i>\n" +
    "            <span>{{subItem.label}}</span>\n" +
    "            <span class=\"header-text-beta\" ng-show=\"subItem.isBeta\" translate>BETA</span>\n" +
    "            <span class=\"m-tooltip-body btn-help\" ng-show=\"subItem.isToolTip\">\n" +
    "              <i class=\"m-tooltip tt-text-leftside\">\n" +
    "                <div translate>\n" +
    "                  Please prepare a destination folder for your project on Google Drive in advance.\n" +
    "                </div>\n" +
    "              </i>\n" +
    "            </span>\n" +
    "          </span>\n" +
    "          <span ng-show=\"subItem.shortcutKey\">{{subItem.shortcutKey}}</span>\n" +
    "          <hr ng-show=\"subItem.label === null\" />\n" +
    "        </li>\n" +
    "      </ul>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "  <ul class=\"header-right-menu\">\n" +
    "    <li id=\"user-panel\">\n" +
    "      <div>\n" +
    "        <span uib-dropdown class=\"header-user-panel\">\n" +
    "          <a uib-dropdown-toggle href=\"#\">\n" +
    "            <i class=\"m-icon m-icon-account-default\" title=\"{{header.user}}\"></i>\n" +
    "          </a>\n" +
    "\n" +
    "          <aside uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "            <ul>\n" +
    "              <li ng-click=\"header.returnToDashboard()\">\n" +
    "                <i class=\"m-icon m-icon-return-to-dashboard\"></i>\n" +
    "                <span translate>Return to Dashboard</span>\n" +
    "              </li>\n" +
    "              <li ng-click=\"header.logout()\">\n" +
    "                <i class=\"m-icon m-icon-none\"></i>\n" +
    "                <span translate>Logout</span>\n" +
    "              </li>\n" +
    "              <li ng-if=\"header.isEnglish\" ng-click=\"header.changeLanguage('ja')\">\n" +
    "                <i class=\"m-icon m-icon-switch-language\"></i>\n" +
    "                <span translate>Switch to Japanese</span>\n" +
    "              </li>\n" +
    "              <li ng-if=\"!header.isEnglish\" ng-click=\"header.changeLanguage('en')\">\n" +
    "                <i class=\"m-icon m-icon-switch-language\"></i>\n" +
    "                <span translate>Switch to English</span>\n" +
    "              </li>\n" +
    "            </ul>\n" +
    "          </aside>\n" +
    "        </span>\n" +
    "      </div>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "</div>\n" +
    "");
  $templateCache.put("index.html",
    "<div id=\"allmighty\" class=\"ide-wrapper\" ng-controller=\"IdeController as ide\">\n" +
    "  <!-- Displays when the IDE is Loading -->\n" +
    "  <div class=\"ide-loading\" ng-show=\"ide.loading && !ide.error\">\n" +
    "    <spinner s-type=\"ide\" s-loading-text=\"Loading Monaca Cloud IDE...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <!-- Displays when IDE is Loaded -->\n" +
    "  <div class=\"ide\" ng-if=\"!ide.loading\">\n" +
    "    <header id=\"ide-header\" ng-include=\"'header.html'\" class=\"header-view\"></header>\n" +
    "\n" +
    "    <section ng-class=\"{ 'show-status-bar': ide.showStatusBar }\" ide-golden-layout>\n" +
    "      <div class=\"no-views-open-message\" ng-if=\"showWelcomeMessage()\">\n" +
    "        <strong translate>Welcome to Monaca Cloud IDE</strong>\n" +
    "        <p translate>Get started by opening the project tree from the View menu.</p>\n" +
    "      </div>\n" +
    "      <div class=\"golden-layout-container\"></div>\n" +
    "      <div class=\"tab-add-dropdown-container\">\n" +
    "        <ul class=\"tab-add-dropdown\"></ul>\n" +
    "      </div>\n" +
    "      <div class=\"tab-close-dropdown-container\">\n" +
    "        <ul class=\"tab-close-dropdown\"></ul>\n" +
    "      </div>\n" +
    "    </section>\n" +
    "\n" +
    "    <footer id=\"ide-footer\" ng-include=\"'footer.html'\" class=\"footer-view\"></footer>\n" +
    "  </div>\n" +
    "  \n" +
    "  <toast></toast>\n" +
    "  \n" +
    "  <div id=\"forte-dashboard\"></div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("login.html",
    "<div ng-controller=\"LoginController\" class=\"login\">\n" +
    "  <div class=\"box\">\n" +
    "    <h3>Login</h3>\n" +
    "    <form>\n" +
    "      <input type \"text\" id=\"email\" placeholder=\"E-mail address\"/>\n" +
    "      <input type=\"password\" id=\"password\" placeholder=\"Password\"/>\n" +
    "      <button id=\"login\" type=\"submit\" ng-click=\"login()\">Login</button>\n" +
    "    </form>\n" +
    "  </div>\n" +
    "</div>");
  $templateCache.put("oneTimePassword/oneTimePassDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button type=\"button\" class=\"close\" ng-click=\"this.$close()\" aria-label=\"Close\"><span\n" +
    "          aria-hidden=\"true\">&times;</span></button>\n" +
    "  <span translate translate-context=\"header\">One Time Password</span>\n" +
    "</div>\n" +
    "\n" +
    "<div>\n" +
    "  <section class=\"modal-body\">\n" +
    "    \n" +
    "    <div class=\"page-loading\" ng-show=\"page === 'loading'\">\n" +
    "      <spinner s-type=\"ide\"></spinner>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-show=\"page === 'one-time-pass'\">\n" +
    "      <div class=\"oneTimePass-item\">\n" +
    "        <div class=\"oneTimePass-item__label\" translate>Email address:</div>\n" +
    "        <div class=\"oneTimePass-item__value\">{{email}}</div>\n" +
    "      </div>\n" +
    "      <div class=\"oneTimePass-item\">\n" +
    "        <div class=\"oneTimePass-item__label\" translate>Password:</div>\n" +
    "        <div class=\"oneTimePass-item__value\">{{password}}</div>\n" +
    "      </div>\n" +
    "      <div class=\"oneTimePass-item\">\n" +
    "        <div class=\"oneTimePass-item__label\" translate>Expire at:</div>\n" +
    "        <div class=\"oneTimePass-item__value\">{{expire_at}}</div>\n" +
    "        <div class=\"oneTimePass-item__refresh\" ng-click=\"generate()\">\n" +
    "          <span class=\"d-icon di-sync\" aria-hidden=\"true\"></span>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" ng-click=\"close()\" type=\"button\" translate>Close</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'error'\">\n" +
    "  <section class=\"modal-body\">\n" +
    "    <div class=\"configure-fail\">\n" +
    "      <h1 ng-bind-html=\"title\">TITLE</h1>\n" +
    "      <p ng-bind-html=\"message\">MESSAGE</p>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <div class=\"modal-footer\">\n" +
    "    <button type=\"button\" class=\"btn-back cell-button-light-small\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<style>\n" +
    "  .page-loading {\n" +
    "    margin: 40px 10px;\n" +
    "    text-align: center;\n" +
    "  }\n" +
    "\n" +
    "  .oneTimePass-item {\n" +
    "    display: flex;\n" +
    "    align-items: center;\n" +
    "    padding: 7px;\n" +
    "  }\n" +
    "\n" +
    "  .oneTimePass-item__label {\n" +
    "    width: 140px;\n" +
    "  }\n" +
    "\n" +
    "  .oneTimePass-item__value {\n" +
    "    background-color: #F4F4F4;\n" +
    "    border-radius: 4px;\n" +
    "    width: 250px;\n" +
    "    padding: 6px;\n" +
    "    user-select: text;\n" +
    "  }\n" +
    "\n" +
    "  .oneTimePass-item__refresh {\n" +
    "    cursor: pointer;\n" +
    "    padding: 5px;\n" +
    "  }\n" +
    "</style>\n" +
    "");
  $templateCache.put("project.html",
    "<div ng-controller=\"ProjectController as project\" class=\"project-view\">\n" +
    "  <p class=\"project-name\">{{project.projectName}}</p>\n" +
    "  <div id=\"file-panel\" ng-controller=\"FilePanelController\" class=\"project-panel\" ng-include=\"'project/filePanel.html'\" ng-show=\"project.currentPanel == 'file'\" simple-drop=\"onDropOnFileTree\"></div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("project/dialog/copyFile.html",
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Copy File</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "<div class=\"modal-body modal-body-multi-column\" id=\"modal-body\">\n" +
    "  <div class=\"file-form\">\n" +
    "    <form name=\"fileForm\" ng-submit=\"ok()\">\n" +
    "        <div class=\"column-box\">\n" +
    "          <label class=\"title\" translate>Folder:</label>\n" +
    "          <div>\n" +
    "            <input type=\"text\" ng-model=\"dirPath\" uib-typeahead=\"dir.id as dir.path for dir in directoryList | filter:{path:$viewValue} | limitTo:8\" class=\"m-component-textbox\">\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <div class=\"column-box\">\n" +
    "            <label class=\"title\" translate>File Name:</label>\n" +
    "            <div>\n" +
    "              <input class=\"m-component-textbox m-component-textbox-faild\" type=\"text\" ng-model=\"fileName\" class=\"m-component-textbox\">\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <input style=\"display: none\" type=\"submit\" id=\"submit\" value=\"Submit\" />\n" +
    "    </form>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "</div>");
  $templateCache.put("project/dialog/createFile.html",
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Create New File</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "<div class=\"modal-body modal-body-multi-column create-file\" id=\"modal-body\">\n" +
    "  <div class=\"file-form\">\n" +
    "    <form name=\"fileForm\" ng-submit=\"ok()\">\n" +
    "      <div class=\"column-box\">\n" +
    "        <label class=\"title\" translate>Folder:</label>\n" +
    "        <div>\n" +
    "          <input type=\"text\" ng-model=\"dirPath\" uib-typeahead=\"dir.id as dir.path for dir in directoryList | filter:{path:$viewValue} | limitTo:8\" class=\"m-component-textbox m-component-textbox-faild\" required>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"column-box\">\n" +
    "        <label class=\"title\" translate>File Name:</label>\n" +
    "        <div>\n" +
    "          <input class=\"m-component-textbox m-component-textbox-faild\" type=\"text\" ng-model=\"fileName\" required autofocus/>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <div class=\"column-box\">\n" +
    "        <label class=\"title\" translate>File Format:</label>\n" +
    "        <div class=\"m-component-combobox\">\n" +
    "          <select ng-model=\"fileFormat\" ng-options=\"data.name for data in formatList track by data.id\"></select>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "      <input style=\"display: none\" type=\"submit\" id=\"submit\" value=\"Submit\" />\n" +
    "    </form>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" ng-disabled=\"fileForm.$invalid\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "</div>");
  $templateCache.put("project/dialog/createFolder.html",
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Create Folder</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "<div class=\"modal-body modal-body-multi-column create-folder\" id=\"modal-body\">\n" +
    "  <div class=\"file-form\">\n" +
    "    <form name=\"fileForm\" ng-submit=\"ok()\">\n" +
    "        <div class=\"column-box\">\n" +
    "          <label class=\"title\" translate>Base Folder:</label>\n" +
    "          <div>\n" +
    "            <input type=\"text\" ng-model=\"dirPath\" uib-typeahead=\"dir.id as dir.path for dir in directoryList | filter:{path:$viewValue} | limitTo:8\" class=\"m-component-textbox\">\n" +
    "          </div>\n" +
    "        </div>\n" +
    "        <div class=\"column-box\">\n" +
    "            <label class=\"title\" translate>Folder Name:</label>\n" +
    "            <div>\n" +
    "              <input class=\"m-component-textbox m-component-textbox-faild\" type=\"text\" ng-model=\"folderName\" class=\"m-component-textbox\" autofocus>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <input style=\"display: none\" type=\"submit\" id=\"submit\" value=\"Submit\" />\n" +
    "    </form>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"ok()\" translate>OK</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "</div>");
  $templateCache.put("project/dialog/fileUpload.html",
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Upload Files</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <input type=\"text\" ng-model=\"uploadDir\" uib-typeahead=\"dir.id as dir.path for dir in directoryList | filter:{path:$viewValue} | limitTo:8\" class=\"m-component-textbox\" autofocus>\n" +
    "\n" +
    "  <div id=\"drop-area\" simple-drop=\"onDrop\" ng-show=\"uploadStatus.count === 0\" translate>Drag &amp; Drop files here</div>\n" +
    "\n" +
    "  <uib-progressbar class=\"uploading-progress progress-striped active\" max=\"200\" value=\"200\" type=\"info\" ng-show=\"uploadStatus.count !== 0\"></uib-progressbar>\n" +
    "\n" +
    "  <span translate>or</span>\n" +
    "\n" +
    "  <label class=\"m-btn m-btn-blue\">\n" +
    "    <span translate>Select File</span>\n" +
    "    <input type=\"file\" file-upload=\"uploadSingleFile\" style=\"display:none;\" />\n" +
    "  </label>\n" +
    "</section>\n" +
    "");
  $templateCache.put("project/dialog/previewer.html",
    "<div class=\"ide-loading\" ng-if=\"working\">\n" +
    "  <spinner s-type=\"ide\" s-loading-class=\"spinner-loading\"></spinner>\n" +
    "</div>\n" +
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Previewer</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div id=\"tui-image-editor\" ng-if=\"content === 'image'\"></div>\n" +
    "  <audio preload=\"auto\" controls ng-if=\"content === 'audio'\" ng-src=\"{{src}}\"></audio>\n" +
    "</section>\n" +
    "");
  $templateCache.put("project/filePanel.html",
    "<div class=\"tool-bar\">\n" +
    "  <button aria-label=\"createFile\" ng-click=\"openCreateFileDialog()\"><div>&nbsp;</div></button>\n" +
    "  <button aria-label=\"createFolder\" ng-click=\"openCreateFolderDialog()\"><div>&nbsp;</div></button>\n" +
    "  <button aria-label=\"uploadFile\" ng-click=\"openUploadFilePanel()\"><div>&nbsp;</div></button>\n" +
    "\n" +
    "  <div class=\"spacer\"></div>\n" +
    "\n" +
    "  <button class=\"reload\" title=\"Refresh File Panel\" ng-click=\"treeClearCacheReload()\"><div>&nbsp;</div></button>\n" +
    "</div>\n" +
    "<div class=\"scrollbar\" style=\"overflow-y: auto; margin-right: 5px;\">\n" +
    "  <div id=\"load-tree-mask\" style=\"height: 10000px; background: rgba(0,0,0,.4); position: relative; z-index: 1000;\" ng-show=\"showMask\"></div>\n" +
    "\n" +
    "  <js-tree id=\"jstree\" tree-plugins=\"contextmenu,wholerow,dnd,state\" tree-ajax=\"{{ url }}\" tree-events=\"eventCallbacks\" tree-contextmenuaction=\"contextMenu\" reset-counter=\"treeResetCounter\" tree-state-key=\"{{treeStateKey}}\" tree-core=\"jsTreeCore\" simple-drop=\"onDrop\"></js-tree>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"float-panel-list\"></div>\n" +
    "");
  $templateCache.put("RunOnDeviceDialog.html",
    "<div class=\"modal-header\" ng-show=\"page !== 'debugger_not_found'\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Run on Device</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Connecting -->\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'connecting'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Running the project...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Debugger Not Found -->\n" +
    "<div class=\"modal-header\" ng-show=\"page === 'debugger_not_found'\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\" translate>Debugger Not Found</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'debugger_not_found'\">\n" +
    "  <p translate>Please make sure the debugger is setup and logged in on the device.</p>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Success Send to Device -->\n" +
    "<div class=\"modal-body successful-run\" ng-show=\"page === 'successful_run'\">\n" +
    "  <div class=\"sync\">\n" +
    "    <img src=\"img/debugger/icon_livereload.gif\">\n" +
    "    <div>\n" +
    "      <h4 translate>The project is synced!</h4>\n" +
    "      <p translate>Live reload started with the debugger.</p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"device\">\n" +
    "    <img src=\"img/debugger/icon_check.png\"> <span>{{clientName}}</span>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"page === 'debugger_not_found'\">\n" +
    "  <button ng-click=\"run()\" class=\"m-btn m-btn-blue\" translate>Retry</button>\n" +
    "  <button ng-click=\"installDebuggerGuide()\" class=\"m-btn\" translate>Install Debugger</button>\n" +
    "</div>");
  $templateCache.put("setting/CustomBuildSettings.html",
    "<div ng-controller=\"CustomBuildSettingsController\" class=\"m-page-settings custom-build-settings\">\n" +
    "  <div class=\"header\">\n" +
    "    <span translate>Custom Build Settings</span>\n" +
    "  </div>\n" +
    "  <spinner s-type=\"ide\" ng-show=\"isLoading\"></spinner>\n" +
    "\n" +
    "  <div ng-hide=\"isLoading\">\n" +
    "    <!-- Build Tasks -->\n" +
    "    <div class=\"col-md-12 col-sm-12 heading\">\n" +
    "      <div class=\"col-md-6 col-sm-6 col-xs-6 sub-header left\">\n" +
    "        <span translate>Build Tasks</span>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-6 col-sm-6 col-xs-6 right\">\n" +
    "        <button type=\"button\" class=\"btn btn-info\" ng-click=\"openBuildTask()\" translate>New Build Task</button>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <!-- Each build task -->\n" +
    "    <div class=\"col-md-12 col-sm-12 row\" ng-repeat=\"buildTask in buildTasks\">\n" +
    "      <div class=\"col-md-1 col-sm-1 col-xs-12\">\n" +
    "        <i class=\"m-icon m-icon-build-task\"></i>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-3 col-sm-3 col-xs-12\">\n" +
    "        <a href=\"#\" ng-click=\"openBuildTask(buildTask)\">{{buildTask.name}}</a>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-8 col-sm-8 col-xs-12\">\n" +
    "        {{buildTask.description}}\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    \n" +
    "    <!-- Batch Builds -->\n" +
    "    <div class=\"col-md-12 col-sm-12 heading\">\n" +
    "      <div class=\"col-md-6 col-sm-6 col-xs-6 sub-header left\">\n" +
    "        <span translate>Batch Builds</span>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-6 col-sm-6 col-xs-6 right\">\n" +
    "        <button type=\"button\" class=\"btn btn-info\" ng-click=\"openBatchBuild()\" translate>New Batch Build</button>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <!-- Each Batch Build -->\n" +
    "    <div class=\"col-md-12 col-sm-12 row\" ng-repeat=\"batchBuild in batchBuilds\">\n" +
    "      <div class=\"col-md-1 col-sm-1 col-xs-12\">\n" +
    "        <i class=\"m-icon m-icon-batch-build\"></i>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-3 col-sm-3 col-xs-12\">\n" +
    "          <a href=\"#\" ng-click=\"openBatchBuild(batchBuild)\">{{batchBuild.name}}</a>\n" +
    "      </div>\n" +
    "      <div class=\"col-md-8 col-sm-8 col-xs-12\">\n" +
    "        {{batchBuild.description}}\n" +
    "      </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n" +
    "");
  $templateCache.put("setting/TerminalConfiguration.html",
    "<div ng-controller=\"TerminalConfigController as configuration\" class=\"m-page-settings ide-terminal-configuration\">\n" +
    "  <main>\n" +
    "    <section>\n" +
    "      <aside>\n" +
    "        <fieldset>\n" +
    "          <legend translate>UI Design</legend>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Cursor Style</label>\n" +
    "            <div class=\"m-component-combobox\">\n" +
    "              <select ng-model=\"config.cursorStyle\" ng-options=\"item.value as item.label for item in validCursorStyles\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Cursor Blink</label>\n" +
    "            <div><input type=\"checkbox\" name=\"\" ng-model=\"config.cursorBlink\"></div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Font Family</label>\n" +
    "            <div class=\"m-component-combobox\">\n" +
    "              <select ng-model=\"config.fontFamily\" ng-options=\"item.value as item.label for item in validFontFamilies\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Font Size</label>\n" +
    "            <div><input class=\"m-component-textbox\" type=\"number\" name=\"\" min=11 max=24 ng-model=\"config.fontSize\" /></div>\n" +
    "          </div>\n" +
    "\n" +
    "          <div>\n" +
    "            <label translate>Theme</label>\n" +
    "            <div class=\"m-component-combobox\">\n" +
    "              <select ng-model=\"config.theme\" ng-options=\"item.value as item.label for item in validThemes\"></select>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "\n" +
    "\n" +
    "        </fieldset>\n" +
    "\n" +
    "        <div class=\"flex-container-row\">\n" +
    "          <button type=\"button\" class=\"btn btn-primary\" ng-click=\"configuration.apply()\" translate>Save</button>\n" +
    "          <button type=\"button\" class=\"btn btn-default\" ng-click=\"configuration.reset()\" translate>Reset</button>\n" +
    "        </div>\n" +
    "\n" +
    "      </aside>\n" +
    "\n" +
    "    </section>\n" +
    "  </main>\n" +
    "</div>");
  $templateCache.put("setting/WorkspaceConfiguration.html",
    "<div ng-controller=\"WorkspaceConfigController as configuration\" class=\"m-page-settings ide-editor-configuration\">\n" +
    "  <div class=\"col-md-12\">\n" +
    "    <div class=\"row\">\n" +
    "      <div data-headername=\"Editor Configuration\" class=\"col-md-12 workspace-configuration\">\n" +
    "          <form class=\"form-horizontal\">\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"font_family\" class=\"col-sm-offset-1 col-sm-6 control-label\">Font Family</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"font_family\" ng-model=\"config.editor.fontFamily\" ng-options=\"item.value as item.label for item in validFontFamilies\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"font_size\" class=\"col-sm-offset-1 col-sm-8 control-label\">Font Size</label>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <input type=\"number\" class=\"form-control\" id=\"font_size\" placeholder=\"Font Size\" min=11 max=80 ng-model=\"config.editor.fontSize\">\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"editor_theme\" class=\"col-sm-offset-1 col-sm-6 control-label\">Theme</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"editor_theme\" ng-model=\"config.editor.theme\" ng-options=\"item.value as item.label for item in validThemes\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"minimap\" class=\"col control-label\">Display Minimap</label>\n" +
    "                </div>\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"minimap\" class=\"col help-text\">Shows the map of the opened file on right side</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"minimap_toggle\" ng-model=\"config.editor.minimap.enabled\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"auto_closing_brackets\" class=\"col control-label\">Auto Closing Brackets</label>\n" +
    "                </div>\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"auto_closing_brackets\" class=\"col help-text\">Automatically add matching close bracket upon typing</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"auto_closing_brackets_toggle\" ng-model=\"config.editor.autoClosingBrackets\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"auto_indent\" class=\"col control-label\">Auto Indent</label>\n" +
    "                </div>\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"auto_indent\" class=\"col help-text\">Automatically add indentation when needed</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"auto_indent_toggle\" ng-model=\"config.editor.autoIndent\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"drag_n_drop\" class=\"col control-label\">Drag and Drop</label>\n" +
    "                </div>\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"drag_n_drop\" class=\"col help-text\">The ability to move the selected content by drag and drop.</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"drag_n_drop_toggle\" ng-model=\"config.editor.dragAndDrop\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"whitespace\" class=\"col-sm-offset-1 col-sm-6 control-label\">Render Whitespace</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"whitespace\" ng-model=\"config.editor.renderWhitespace\" ng-options=\"item.value as item.label for item in validRenderWhitespace\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"word_wrap\" class=\"col-sm-offset-1 col-sm-6 control-label\">Word Wrap</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"word_wrap\" ng-model=\"config.editor.wordWrap\" ng-options=\"item.value as item.label for item in validWordWrap\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"word_wrap_column\" class=\"col-sm-offset-1 col-sm-6 control-label\">Word Wrap Column</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <input type=\"number\" class=\"form-control\" id=\"word_wrap_column\" placeholder=\"Word Wrap Column\" min=30 ng-disabled=\"config.editor.wordWrap !== 'wordWrapColumn'\" ng-model=\"config.editor.wordWrapColumn\">\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"indent_w_space\" class=\"col-sm-offset-1 col-sm-8 control-label\">Indent with Spaces</label>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"indent_w_space_toggle\" ng-model=\"config.editor.modelFormatting.insertSpaces\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"tab_size\" class=\"col-sm-offset-1 col-sm-8 control-label\">Tab Size</label>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <input type=\"number\" class=\"form-control\" id=\"tab_size\" placeholder=\"Tab Size\" min=1 max=10 ng-model=\"config.editor.modelFormatting.tabSize\">\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"debugger_panel\" class=\"col-sm-offset-1 col-sm-8 control-label\">Debugger Tab</label>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"debugger_panel_toggle\" ng-model=\"config.editor.debuggerPanel\" ng-options=\"b.value as b.name for b in bool\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </form>\n" +
    "      </div>\n" +
    "\n" +
    "      <div data-headername=\"Terminal Configuration\" class=\"col-md-12 workspace-configuration\" ng-show=\"terminalFeatureEnabled\">\n" +
    "          <form class=\"form-horizontal\">\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"terminal_font_family\" class=\"col-sm-offset-1 col-sm-6 control-label\">Font Family</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"terminal_font_family\" ng-options=\"item.value as item.label for item in terminalFontFamilies\" ng-model=\"config.terminal.fontFamily\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"terminal_font_size\" class=\"col-sm-offset-1 col-sm-8 control-label\">Font Size</label>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <input type=\"number\" class=\"form-control\" id=\"terminal_font_size\" placeholder=\"Font Size\" min=11 max=80 ng-model=\"config.terminal.fontSize\">\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"terminal_theme\" class=\"col-sm-offset-1 col-sm-6 control-label\">Theme</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"terminal_theme\" ng-model=\"config.terminal.theme\" ng-options=\"item.value as item.label for item in terminalThemes\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <label translate for=\"cursor_style\" class=\"col-sm-offset-1 col-sm-6 control-label\">Cursor Style</label>\n" +
    "              <div class=\"col-sm-4\">\n" +
    "                <select class=\"form-control input-20\" id=\"cursor_style\" ng-model=\"config.terminal.cursorStyle\" ng-options=\"item.value as item.label for item in terminalCursorStyles\"></select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"cursor_blink\" class=\"col control-label\">Cursor Blink</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"cursor_blink_toggle\" ng-model=\"config.terminal.cursorBlink\" ng-options=\"b.value as b.name for b in bool\">\n" +
    "                </select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "            <div class=\"form-group\" ng-show=\"isMultipleLanguage\">\n" +
    "              <div class=\"col-sm-offset-1 col-sm-8\">\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"terminal_os\" class=\"col control-label\">Terminal OS</label>\n" +
    "                </div>\n" +
    "                <div class=\"row row-no-margin\">\n" +
    "                    <label translate for=\"terminal_os\" class=\"col help-text\">You need to reload the browser to take effect</label>\n" +
    "                </div>\n" +
    "              </div>\n" +
    "              <div class=\"col-sm-2\">\n" +
    "                <select class=\"form-control input-20\" id=\"terminal_os\" ng-model=\"config.terminal.terminalOS\" ng-options=\"item.value as item.label for item in terminalOSes\">\n" +
    "                </select>\n" +
    "              </div>\n" +
    "            </div>\n" +
    "          </form>\n" +
    "      </div>\n" +
    "\n" +
    "      <!--<div data-headername=\"{{'Customer Experience' | translate}}\" class=\"col-md-12 workspace-configuration\" ng-show=\"config.isShowedCustomerExperience\">-->\n" +
    "          <!--<form class=\"form-horizontal\">-->\n" +
    "            <!--<div class=\"form-group\">-->\n" +
    "              <!--<div class=\"col-sm-offset-1 col-sm-8\">-->\n" +
    "                <!--<div class=\"row row-no-margin\">-->\n" +
    "                    <!--<label translate for=\"getting-data\" class=\"col control-label\">Would you like to give us feedback?</label>-->\n" +
    "                <!--</div>-->\n" +
    "                <!--<div class=\"row row-no-margin\">-->\n" +
    "                    <!--<label translate for=\"getting-data\" class=\"col help-text\">You need to refresh the IDE to make effective the change</label>-->\n" +
    "                <!--</div>-->\n" +
    "              <!--</div>-->\n" +
    "              <!--<div class=\"col-sm-2\">-->\n" +
    "                <!--<select class=\"form-control input-20\" id=\"getting-data_toggle\" ng-model=\"config.user.feedback\" ng-options=\"b.value as b.name for b in bool\">-->\n" +
    "                <!--</select>-->\n" +
    "              <!--</div>-->\n" +
    "            <!--</div>-->\n" +
    "          <!--</form>-->\n" +
    "      <!--</div>-->\n" +
    "\n" +
    "      <div id=\"preview-conf-editor\" style=\"display: none\" class=\"monaca-editor\"></div>\n" +
    "\n" +
    "      <div class=\"col-md-12\">\n" +
    "        <div class=\"row\">\n" +
    "          <div class=\"col-md-8 workspace-restore-btn\">\n" +
    "            <button type=\"button\" class=\"btn\" ng-click=\"onRestoreDefaultClicked()\" translate>Restore default</button>\n" +
    "          </div>\n" +
    "          <div class=\"col-md-4 workspace-apply-btn\">\n" +
    "            <button type=\"button\" class=\"btn btn-primary pull-right\" ng-click=\"onApplyClicked()\" translate>Apply</button>\n" +
    "          </div>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("SetupDebuggerCustomOnlyDialog.html",
    "<div class=\"modal-header\">\n" +
    "    <h3 class=\"modal-title\" id=\"modal-title\" translate>Setup Debugger</h3>\n" +
    "    <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'loading'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Debugger Information\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Landing Page -->\n" +
    "<div class=\"modal-body setup-debugger-landing\" ng-show=\"page === 'landing'\">\n" +
    "  <section class=\"debugger-insert\">\n" +
    "    <h1 translate>Setup Debugger</h1>\n" +
    "\n" +
    "    <div>\n" +
    "      <p translate>Our Debugger provides you the ability to test your app on your device without building the project each time. See <a ng-href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">documentation</a> for more details.</p>\n" +
    "      <h2 translate>Use Preview for Quicker Access</h2>\n" +
    "      <p translate>Our Preview is a convenient tool for checking the application without an actual mobile device.</p>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <hr />\n" +
    "\n" +
    "  <section class=\"monaca-debugger-platforms\">\n" +
    "    <h2 translate>Installing Debugger</h2>\n" +
    "    <p translate>The debugger is available for each platform. Please select a platform to continue.</p>\n" +
    "\n" +
    "    <ul>\n" +
    "      <li class=\"debugger-android\" ng-click=\"next('android')\" translate>Android &gt;</li>\n" +
    "      <li class=\"debugger-ios\" ng-click=\"next('ios')\" translate>iOS &gt;</li>\n" +
    "    </ul>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Android Option -->\n" +
    "<div class=\"modal-body setup-debugger-android\" ng-show=\"page === 'android'\">\n" +
    "  <section>\n" +
    "    <h1 translate>Debugger for Android</h1>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-custom-build\" ng-click=\"installType = 'android'; buildCustom();\">\n" +
    "    <h2 translate>Build and Install</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{custom_debugger_version_android}}</p>\n" +
    "    <p translate>Custom built debugger will include third-party Cordova plugins that have been added to the project. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">See details.</a></p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'android_install'\">\n" +
    "  <section class=\"confirm-install\">\n" +
    "    <p translate>After the installation, please sign in using the same account. Debugger will automatically connect to the cloud.</p>\n" +
    "    <p>\n" +
    "      <label><input type=\"checkbox\" name=\"checkbox\" value=\"installed\" ng-model=\"isDebuggerInstalled\"> <span translate>I have installed and logged into the debugger.</span></label>\n" +
    "    </p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect' || page === 'ios_connect'\">\n" +
    "  <strong translate>Searching for Debugger...</strong>\n" +
    "\n" +
    "  <p translate>Looking for the same Cloud IDE account logged into the debugger.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p translate>Searching</p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect_failed' || page === 'ios_connect_failed'\">\n" +
    "  <strong translate>Failed to Find Debugger</strong>\n" +
    "\n" +
    "  <p translate>Verify that the debugger is installed and logged in with the same Cloud IDE account.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line-error\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p><img src=\"img/debugger/icon_error.png\"> <span translate>Not Found</span></p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect_success' || page === 'ios_connect_success'\">\n" +
    "  <strong translate>{{deviceName}} is connected!</strong>\n" +
    "\n" +
    "  <p translate>Please click \"Run on Device\" to run your app on Monaca Debugger.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line-success\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p><img src=\"img/debugger/icon_check.png\"> {{deviceName}}</p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<!-- iOS Option -->\n" +
    "<div class=\"modal-body setup-debugger-ios\" ng-show=\"page === 'ios'\">\n" +
    "  <section>\n" +
    "    <h1 translate>Debugger for iOS</h1>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-custom-build\" ng-click=\"installType = 'ios'; buildCustom();\">\n" +
    "    <h2 translate>Build and Install</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{custom_debugger_version_ios}}</p>\n" +
    "    <p translate>Custom built debugger will include third-party Cordova plugins that have been added to the project. Provides USB debugging under local development. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See details</a></p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'ios_install'\">\n" +
    "  <section class=\"confirm-install\">\n" +
    "    <p translate>After the installation, please sign in using the same Cloud IDE account. The debugger will automatically connect to the cloud.</p>\n" +
    "    <p>\n" +
    "      <label><input type=\"checkbox\" name=\"checkbox\" value=\"installed\" ng-model=\"isDebuggerInstalled\"> <span translate>I have installed and logged into the debugger.</span></label>\n" +
    "    </p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'ios_unable_to_build'\">\n" +
    "  Display Some Error...\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'landing'\" class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-show=\"page === 'landing'\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page !== 'landing'\" class=\"modal-footer modal-footer-separater\">\n" +
    "  <button ng-hide=\"page === 'android_connect_success' || page === 'ios_connect_success'\" ng-disabled=\"page === 'android_connect' || page === 'ios_connect'\" class=\"m-btn m-btn-left\" ng-click=\"back()\" translate>Back</button>\n" +
    "  <span ng-show=\"page === 'android_install' || page === 'ios_install'\">\n" +
    "    <button ng-disabled=\"!isDebuggerInstalled\" class=\"m-btn m-btn-right\" ng-click=\"connect()\" translate>Next</button>\n" +
    "  </span>\n" +
    "\n" +
    "  <span ng-show=\"page === 'android_connect_failed'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"page = 'android_connect'\" translate>Search</button>\n" +
    "  </span>\n" +
    "  <span ng-show=\"page === 'ios_connect_failed'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"page = 'ios_connect'\" translate>Search</button>\n" +
    "  </span>\n" +
    "\n" +
    "  <span ng-show=\"page === 'android_connect_success' || page === 'ios_connect_success'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"runOnDevice()\" translate>Run on Device</button>\n" +
    "  </span>\n" +
    "</div>\n" +
    "");
  $templateCache.put("SetupDebuggerDialog.html",
    "<div class=\"modal-header\">\n" +
    "    <h3 class=\"modal-title\" id=\"modal-title\" translate>Monaca Debugger</h3>\n" +
    "    <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'loading'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Debugger Information\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Landing Page -->\n" +
    "<div class=\"modal-body setup-debugger-landing\" ng-show=\"page === 'landing'\">\n" +
    "  <section class=\"monaca-debugger-insert\">\n" +
    "    <h1 translate>Monaca Debugger</h1>\n" +
    "\n" +
    "    <div>\n" +
    "      <p translate>Monaca Debugger provides you the ability to test your app on your device without building the project each time. See <a ng-href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">Monaca documentation</a> for more details.</p>\n" +
    "      <h2 translate>Use Preview for Quicker Access</h2>\n" +
    "      <p translate>Our Preview is a convenient tool for checking the application without an actual mobile device.</p>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <hr />\n" +
    "\n" +
    "  <section class=\"monaca-debugger-platforms\">\n" +
    "    <h2 translate>Installing Monaca Debugger</h2>\n" +
    "    <p translate>Monaca Debugger is available for each platform. Please click the icon to continue.</p>\n" +
    "\n" +
    "    <ul>\n" +
    "      <li class=\"debugger-android\" ng-click=\"next('android')\" translate>Android</li>\n" +
    "      <li class=\"debugger-ios\" ng-click=\"next('ios')\" translate>iOS</li>\n" +
    "    </ul>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<!-- Android Option -->\n" +
    "<div class=\"modal-body setup-debugger-android\" ng-show=\"page === 'android'\">\n" +
    "  <section>\n" +
    "    <h1 translate>Monaca Debugger for Android</h1>\n" +
    "    <p translate>Get Monaca Debugger in the Google Play Store or by building your own.</p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-google-play\" ng-click=\"installType = 'android'; next('android_install');\">\n" +
    "    <h2 translate>Get it on Google Play</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{debugger_version_android}}</p>\n" +
    "    <p translate>You can connect your device to the Cloud IDE and Monaca local development tools. All core Cordova plugins are included. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" ng-click=\"$event.stopPropagation()\" target=\"_blank\">See details.</a></p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-custom-build\" ng-click=\"installType = 'android'; buildCustom();\">\n" +
    "    <h2 translate>Build and Install</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{custom_debugger_version_android}}</p>\n" +
    "    <p translate>Custom built debugger will include third-party Cordova plugins that have been added to the project. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">See details.</a></p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'android_install'\">\n" +
    "  <section class=\"monaca-debugger-insert\">\n" +
    "    <h1 translate>Get it on Google Play</h1>\n" +
    "    <p translate>Monaca Debugger can be found by searching for \"Monaca\" in the Google Play Store, or by using the following QR code. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">See the documentation</a> for more details.</p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"qr-code\">\n" +
    "    <img src=\"img/debugger/qr_android.gif\" alt=\"QR Code for Monaca Debugger on Google Play\" /><br />\n" +
    "    <a href=\"https://play.google.com/store/apps/details?id=mobi.monaca.debugger&amp;hl=en\" target=\"_blank\" translate>View in the Google Play Store</a>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"confirm-install\">\n" +
    "    <p translate>After the installation, please sign in using the same Monaca account. Monaca Debugger will automatically connect to the cloud.</p>\n" +
    "    <p>\n" +
    "      <label><input type=\"checkbox\" name=\"checkbox\" value=\"installed\" ng-model=\"isDebuggerInstalled\"> <span translate>I have installed and logged into Monaca Debugger.</span></label>\n" +
    "    </p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect' || page === 'ios_connect'\">\n" +
    "  <strong translate>Searching for Monaca Debugger...</strong>\n" +
    "\n" +
    "  <p translate>Looking for the same IDE account logged into Monaca Debugger.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p translate>Searching</p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect_failed' || page === 'ios_connect_failed'\">\n" +
    "  <strong translate>Failed to Find Monaca Debugger</strong>\n" +
    "\n" +
    "  <p translate>Verify that Monaca Debugger is installed and logged in with the same account as Monaca IDE.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line-error\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p><img src=\"img/debugger/icon_error.png\"> <span translate>Not Found</span></p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body connecting-device\" ng-show=\"page === 'android_connect_success' || page === 'ios_connect_success'\">\n" +
    "  <strong translate>{{deviceName}} is connected!</strong>\n" +
    "\n" +
    "  <p translate>Please click \"Run on Device\" to run your app on Monaca Debugger.</p>\n" +
    "\n" +
    "  <div class=\"connection-flow\">\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_pc.png\">\n" +
    "      <p translate>Your PC</p>\n" +
    "    </div>\n" +
    "    <div class=\"connection-line-success\"></div>\n" +
    "    <div>\n" +
    "      <img src=\"img/debugger/connect_device.png\">\n" +
    "      <p><img src=\"img/debugger/icon_check.png\"> {{deviceName}}</p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<!-- iOS Option -->\n" +
    "<div class=\"modal-body setup-debugger-ios\" ng-show=\"page === 'ios'\">\n" +
    "  <section>\n" +
    "    <h1 translate>Monaca Debugger for iOS</h1>\n" +
    "    <p translate>Get Monaca Debugger in the App Store or by building your own.</p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-apple-store\" ng-click=\"installType = 'ios'; next('ios_install');\">\n" +
    "    <h2 translate>Get from the App Store</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{debugger_version_ios}}</p>\n" +
    "    <p translate>You can connect your device to the Cloud IDE and Monaca local development tools. All core Cordova plugins are included. Does not support USB debugging under local development. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See details.</a></p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"debugger-custom-build\" ng-click=\"installType = 'ios'; buildCustom();\">\n" +
    "    <h2 translate>Build and Install</h2>\n" +
    "    <p class=\"version\" translate>Latest Version: {{custom_debugger_version_ios}}</p>\n" +
    "    <p translate>Custom built debugger will include third-party Cordova plugins that have been added to the project. Provides USB debugging under local development. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See details</a></p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"page === 'ios_install'\">\n" +
    "  <section class=\"monaca-debugger-insert\">\n" +
    "    <h1 translate>Get from the App Store</h1>\n" +
    "    <p translate>Monaca Debugger can be found by searching for \"Monaca\" in the App Store, or by using the following QR code. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See the documentation</a> for more details.</p>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"qr-code\">\n" +
    "    <img src=\"img/debugger/qr_ios.gif\" alt=\"QR Code for Monaca Debugger on App Store\" /><br />\n" +
    "    <a href=\"http://itunes.apple.com/en/app/monaca/id550941371?mt=8\" target=\"_blank\" translate>View in the App Store</a>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"confirm-install\">\n" +
    "    <p translate>After the installation, please sign in using the same Monaca account. Monaca Debugger will automatically connect to the cloud.</p>\n" +
    "    <p>\n" +
    "      <label><input type=\"checkbox\" name=\"checkbox\" value=\"installed\" ng-model=\"isDebuggerInstalled\"> <span translate>I have installed and logged into Monaca Debugger.</span></label>\n" +
    "    </p>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'landing'\" class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-show=\"page === 'landing'\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page !== 'landing'\" class=\"modal-footer modal-footer-separater\">\n" +
    "  <button ng-hide=\"page === 'android_connect_success' || page === 'ios_connect_success'\" ng-disabled=\"page === 'android_connect' || page === 'ios_connect'\" class=\"m-btn m-btn-left\" ng-click=\"back()\" translate>Back</button>\n" +
    "  <span ng-show=\"page === 'android_install' || page === 'ios_install'\">\n" +
    "    <button ng-disabled=\"!isDebuggerInstalled\" class=\"m-btn m-btn-right\" ng-click=\"connect()\" translate>Next</button>\n" +
    "  </span>\n" +
    "\n" +
    "  <span ng-show=\"page === 'android_connect_failed'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"page = 'android_connect'\" translate>Search</button>\n" +
    "  </span>\n" +
    "  <span ng-show=\"page === 'ios_connect_failed'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"page = 'ios_connect'\" translate>Search</button>\n" +
    "  </span>\n" +
    "\n" +
    "  <span ng-show=\"page === 'android_connect_success' || page === 'ios_connect_success'\">\n" +
    "    <button class=\"m-btn m-btn-blue\" ng-click=\"runOnDevice()\" translate>Run on Device</button>\n" +
    "  </span>\n" +
    "</div>\n" +
    "");
  $templateCache.put("share/ProjectPublishWindow.html",
    "<div class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\">{{getModalTitle()}}</h3>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\" ng-show=\"isLoading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Project Information\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-show=\"!isLoading && !publishUrl\">\n" +
    "\n" +
    "  <h5 translate>This project is not published to the web.</h5>\n" +
    "  <br>\n" +
    "  <div translate>\n" +
    "    Make your project available to anyone by publishing it to the web. <br> After publishment your project can be imported by just accessing the generated link after clicking the <strong>Publish</strong> button.\n" +
    "  </div>\n" +
    "\n" +
    "  <br>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-show=\"!isLoading && publishUrl\">\n" +
    "\n" +
    "  <h5 translate>This project is published to the web.</h5>\n" +
    "  <br>\n" +
    "\n" +
    "  <div translate>\n" +
    "    Your project is available to import to anyone by accessing the generated link below. <br> If you no longer wish for your project to be public, you can make it private again by clicking the <strong>Make Private</strong> button.\n" +
    "  </div>\n" +
    "  <div class=\"publish-note\" translate><strong>Note:</strong> All other users who have imported your project prior to making the project private again, will keep their copy of the project!</div>\n" +
    "\n" +
    "  <br>\n" +
    "  <label class=\"project-share-url\">\n" +
    "    <div translate>Project URL to share:</div>\n" +
    "    <input type=\"text\" ng-model=\"publishUrl\" readonly=\"readonly\">\n" +
    "  </label>\n" +
    "\n" +
    "</section>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!isLoading && !publishUrl\">\n" +
    "  <button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"onClickCancel(this)\" translate>Close</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onTogglePublish()\" translate>Publish</button>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\" ng-show=\"!isLoading && publishUrl\">\n" +
    "  <button class=\"m-btn m-btn-default\" type=\"button\" ng-click=\"onClickCancel(this)\" translate>Close</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onTogglePublish()\" translate>Make Private</button>\n" +
    "</div>\n" +
    "");
  $templateCache.put("share/ProjectShareWindow.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" id=\"modal-title\">{{getModalTitle()}}</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-show=\"isLoading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading Share Project Information\"></spinner>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-show=\"!isLoading && !canShareProject\">\n" +
    "  <div class=\"share-url\" translate>The project sharing functionality is not available with your current subscribed plan.</div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\" ng-show=\"!isLoading && canShareProject\">\n" +
    "  <div style=\"margin-bottom:15px;font-weight: 700;\" translate>Your email: {{userInfo.email}}</div>\n" +
    "\n" +
    "  <div class=\"title\" translate>{{users.length}} user(s) in this project:</div>\n" +
    "\n" +
    "  <ul class=\"project-share-members\">\n" +
    "    <li ng-repeat=\"user in users\">\n" +
    "      <div class=\"project-share-name\">\n" +
    "        <img ng-if=\"showGravatarIcon\" ng-src=\"{{user.image_url}}\">\n" +
    "        <img ng-if=\"!showGravatarIcon\" ng-src=\"img/dashboard/default_profile_icon_28.png\">\n" +
    "        <span ng-show=\"user.pending\" class=\"m-icon-inviting\" translate>Inviting</span>\n" +
    "        <span ng-if=\"user.name\" class=\"user-name\">{{user.name}}</span>\n" +
    "        <span>{{user.email}}</span>\n" +
    "      </div>\n" +
    "\n" +
    "      <div uib-dropdown class=\"project-share-membertype\">\n" +
    "        <button uib-dropdown-toggle>{{user.role | capitalize | translate}}</button>\n" +
    "        <ul uib-dropdown-menu class=\"dropdown-menu\">\n" +
    "          <li ng-click=\"onClickUpdateUserRole(user, 'developer');\" translate>Developer</li>\n" +
    "          <li ng-click=\"onClickUpdateUserRole(user, 'tester');\" translate>Tester</li>\n" +
    "        </ul>\n" +
    "      </div>\n" +
    "\n" +
    "      <button type=\"button\" class=\"m-btn-list-delete\" ng-show=\"isDeletableUser(user)\" ng-click=\"onClickDeleteUser(user);\">\n" +
    "        <div class=\"cancel-x\"></div>\n" +
    "      </button>\n" +
    "    </li>\n" +
    "  </ul>\n" +
    "\n" +
    "  <div class=\"project-share-invite\">\n" +
    "    <h2 class=\"title\" translate>Invite User(s)</h2>\n" +
    "\n" +
    "    <div ng-show=\"!isInviteDetailOpen\">\n" +
    "      <button type=\"button\" class=\"m-btn\" ng-click=\"onClickInviteMail()\" translate>Enter email addresses...</button>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"project-share-invite-detail\" ng-class=\"{show: isInviteDetailOpen}\">\n" +
    "      <textarea id=\"project-share-invite-emails\" rows=\"3\" cols=\"20\" placeholder=\"Enter email addresses (one per line)...\" ng-model=\"newmembers.email\"></textarea>\n" +
    "\n" +
    "      <label>\n" +
    "        <translate>Role:</translate>\n" +
    "        <span class=\"cell-btn-help\" tooltip-placement=\"top\"\n" +
    "              uib-tooltip=\"Tester role can only run this project from their debugger.\"></span>\n" +
    "\n" +
    "        <div class=\"m-component-combobox\">\n" +
    "          <select ng-model=\"newmembers.role\">\n" +
    "            <option value=\"developer\" translate>Developer</option>\n" +
    "            <option value=\"tester\" translate>Tester</option>\n" +
    "          </select>\n" +
    "        </div>\n" +
    "      </label>\n" +
    "\n" +
    "      <label>\n" +
    "        <translate>Notify via email:</translate>\n" +
    "        <input type=\"checkbox\" ng-model=\"newmembers.sendmail\">\n" +
    "      </label>\n" +
    "\n" +
    "      <div class=\"project-share-invite-action\">\n" +
    "        <button type=\"button\" class=\"m-btn m-btn-blue\" ng-click=\"onClickInviteSubmit()\" ng-disabled=\"!isValid()\" translate>Add User</button>\n" +
    "        <button type=\"button\" class=\"m-btn\" ng-click=\"onClickInviteCancel()\" translate>Cancel</button>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickOk(this)\" translate>OK</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("stepper/step.tpl.html",
    "<div class=\"step-wrapper\">\n" +
    "  <div class=\"step-header\" ng-class=\"{\n" +
    "    'active': $ctrl.stepNumber === $ctrl.$stepper.currentStep,\n" +
    "    'disabled': $ctrl.isDisabled(),\n" +
    "    'completed': !!$ctrl.completed\n" +
    "  }\" ng-click=\"$ctrl.$stepper.goto($ctrl.stepNumber, true)\">\n" +
    "    <span class=\"stepper-circle\">\n" +
    "      <span class=\"stepper-number\">\n" +
    "        {{$ctrl.completed ? '✔' : $ctrl.getStepNumber()}}\n" +
    "      </span>\n" +
    "      <span class=\"stepper-edit-icon\">\n" +
    "        <i class=\"d-icon di-edit\"></i>\n" +
    "      </span>\n" +
    "    </span>\n" +
    "    <div class=\"step-label-wrapper\">\n" +
    "      <span class=\"step-label\">{{$ctrl.label}}</span>\n" +
    "      <span class=\"step-completed\">{{$ctrl.completed}}</span>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div class=\"step-content-wrapper\" ng-class=\"{ 'active': $ctrl.stepNumber === $ctrl.$stepper.currentStep}\">\n" +
    "    <div class=\"step-content\" ng-transclude></div>\n" +
    "  </div>\n" +
    "</div>");
  $templateCache.put("stepper/stepper.tpl.html",
    "<div class=\"steps\" ng-transclude></div>");
  $templateCache.put("switchIDE/dialog/changesNotification.html",
    "<div class=\"modal-header\">\n" +
    "    <h3 class=\"modal-title\" id=\"modal-title\" translate>Switch to the old IDE version</h3>\n" +
    "<div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</div>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "    <p translate>Before switching to the old IDE version, please make sure all files have been saved.</p> <span style=\"font-weight: bold\" translate>Unsaved modifications will be lost. </span>\n" +
    "</section>\n" +
    "  \n" +
    "<div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"switchIde()\" ng-disabled=\"fileForm.$invalid\" translate>Switch</button>\n" +
    "    <button class=\"m-btn\" type=\"button\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "</div>");
  $templateCache.put("terminal.html",
    "<div ng-controller=\"TerminalController as terminal\" class=\"terminal-view\">\n" +
    "	<text-spinner ng-if=\"terminal.loading\" type=\"dots\" title=\"Launching terminal...\" title-size=\"14px\" spinner-size=\"16\" color=\"skyblue\"></text-spinner>\n" +
    "	<div class=\"terminal-wrapper\" ng-if=\"!terminal.loading\" ng-style=\"terminal.bodyStyle\">\n" +
    "		<monaca-terminal\n" +
    "			ng-if=\"terminal.showTerminal\"\n" +
    "			ng-class=\"{active: true}\"\n" +
    "			options=\"terminal.options\"\n" +
    "			css-style=\"{ backgroundColor: '{{terminal.bodyStyle.backgroundColor}}' }\">\n" +
    "		</monaca-terminal>\n" +
    "	</div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("transpile_log.html",
    "<div ng-controller=\"TranspileLogController as transpile\" class=\"transpile-view\">\n" +
    "  <text-spinner ng-if=\"!transpile.retryConnecting && transpile.loading\" type=\"dots\" title=\"Launching terminal server...\" title-size=\"14px\" spinner-size=\"16\" color=\"skyblue\"></text-spinner>\n" +
    "  <div ng-if=\"!transpile.retryConnecting && !transpile.loading\">\n" +
    "    <div class=\"flex-container-row layout-padding transpiler-log-command-wrapper\">\n" +
    "      <label translate>Running <b>monaca preview</b> on port <b>{{ transpile.port }}</b></label>\n" +
    "      <div class=\"flex-grow\"></div>\n" +
    "      <button type=\"button\" class=\"btn btn-md btn-cog\" ng-click=\"transpile.onSettingClicked()\"></button>\n" +
    "      <button type=\"button\" class=\"btn btn-md btn-refresh\" ng-click=\"transpile.restartPreviewer(true)\"></button>\n" +
    "      <button type=\"button\" class=\"btn btn-md btn-recover\" ng-click=\"transpile.recoverProject()\"></button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div ng-if=\"transpile.retryConnecting && transpile.retryReason !== 'networkStable' \" class=\"transpile-log-retry-wrapper\">\n" +
    "    <div class=\"transpile-log-retry-wrapper-column\">\n" +
    "      <p ng-bind=\"transpile.retryReason\"></p>\n" +
    "      <br>\n" +
    "      <p ng-bind=\"transpile.useLitemodeMessage\"></p>\n" +
    "      <button type=\"button\" class=\"btn btn-default\" ng-click=\"transpile.retry()\" translate>Reload browser</button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "	<div class=\"transpile-log-wrapper\" ng-if=\"!transpile.retryConnecting && !transpile.loading\" ng-style=\"transpile.bodyStyle\">\n" +
    "    <monaca-terminal\n" +
    "      ng-if=\"transpile.showTerminal\"\n" +
    "      ng-class=\"{active: true}\"\n" +
    "      options=\"transpile.options\"\n" +
    "      css-style=\"{ backgroundColor: '{{transpile.bodyStyle.backgroundColor}}' }\">\n" +
    "    </monaca-terminal>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("TranspileLogSettingDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>Preview Server Settings</h3>\n" +
    "  <div class=\"cancel-x\" ng-click=\"$close()\"></div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"flex-container-row\">\n" +
    "      <label translate>Preview Server runs the preview app by running monaca:preview script defined in package.json. For details, please refer to the <a ng-href=\"{{ docsUrl.ide_terminal }}\" target=\"_blank\">documentation</a></label>\n" +
    "  </div>\n" +
    "  <div class=\"flex-container-row\">\n" +
    "      <label translate>Port Number</label>\n" +
    "      <select class=\"form-control\" id=\"port\" ng-options=\"item as item.port for item in userApp track by item.port\" ng-model=\"port_selected\"\"></select>\n" +
    "  </div>\n" +
    "  <hr>\n" +
    "  <div class=\"flex-container-row buttons-row\">\n" +
    "      <span style=\"width: 100%\"></span>\n" +
    "      <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\" translate>Cancel</button>\n" +
    "      <button type=\"button\" class=\"btn btn-primary\" ng-click=\"onApplyClicked()\" translate>Apply</button>\n" +
    "  </div>\n" +
    "</section>");
  $templateCache.put("UpgradeCliEcosystemDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>Monaca Preview Feature Update</h3>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"announcement\" translate>\n" +
    "    <p> New changes have been released with the new version of Monaca.</p>\n" +
    "    <p> Your package.json will be modified for the updated preview feature. </p>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div class=\"message\" translate> Before the update, duplicate of the project is saved in archive list and a backup of package.json is created and saved as package.json.backup in this project. <br/> If your project use a lot of modules / libraries, update processing may take more than 5 minutes. </div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-disabled=\"isUpgrading\" ng-click=\"openHelp()\" translate>Read More</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" ng-disabled=\"isUpgrading\" ng-click=\"upgradeEcosystem()\">\n" +
    "      <div style=\"display: inline-flex\">\n" +
    "        <div translate>Run Update</div>\n" +
    "        <spinner style=\"display: inline-flex\" s-type=\"spinner-button\" ng-show=\"isUpgrading\"></spinner>\n" +
    "      </div>\n" +
    "  </button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("UpgradeCordovaDialog.html",
    "<section class=\"modal-header\">\n" +
    "  <h3 class=\"modal-title\" translate>Unsupported Cordova Version</h3>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-body\">\n" +
    "  <div translate>This project is currently using Cordova version {{cordovaVersion}}.</div>\n" +
    "  <div translate>The current subscription plan for your account does not support Cordova version {{cordovaVersion}} projects.</div>\n" +
    "  <div translate>To continue to use this project, please upgrade your project to the latest Cordova version or upgrade your subscription plan.</div>\n" +
    "</section>\n" +
    "\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-disabled=\"isUpgrading\" ng-click=\"openPlanPricing()\" translate>Upgrade Plan</button>\n" +
    "  <button class=\"m-btn\" ng-disabled=\"isUpgrading\" ng-click=\"upgradeCordova()\">\n" +
    "      <div style=\"display: inline-flex\">\n" +
    "        <div translate>Upgrade Cordova</div>\n" +
    "        <spinner style=\"display: inline-flex\" s-type=\"spinner-button\" ng-show=\"isUpgrading\"></spinner>\n" +
    "      </div>\n" +
    "  </button>\n" +
    "  <button class=\"m-btn\" ng-disabled=\"isUpgrading\" ng-click=\"returnToDashboard()\" translate>Return to Dashboard</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/config/VcsConfigError.html",
    "<section class=\"modal-body git-configuration-error\">\n" +
    "  <div class=\"configure-fail\">\n" +
    "    <h1 ng-bind-html=\"title\"></h1>\n" +
    "    <p ng-bind-html=\"message\"></p>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button type=\"button\" class=\"m-btn\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</section>");
  $templateCache.put("vcs/config/VcsConfigGitHub.html",
    "<section class=\"modal-body git-service-github\">\n" +
    "  <h1 translate>Remote Repository Configuration</h1>\n" +
    "  \n" +
    "  <label ng-show=\"!configOptions.currentRepository\">\n" +
    "    <span translate>Select Repository:</span>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"configOptions.selectedRepository\" ng-options=\"repository.value as repository.name for repository in repositories\"></select>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label ng-show=\"configOptions.currentRepository\">\n" +
    "    <span translate>Current Repository:</span>\n" +
    "    <div class=\"current-repository\">\n" +
    "      <i><a href=\"{{configOptions.currentRepoLink}}\" target=\"_blank\">{{configOptions.currentRepository}}</a></i>\n" +
    "      <small translate><img src=\"img/icon/icon_exclamation.png\" /> Repositories can not be changed after setup.</small>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label ng-show=\"configOptions.currentRepository\">\n" +
    "    <span>\n" +
    "      <span translate>Current Working Branch:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>New branch should be created on the repository hosting provider site or through command line.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"configOptions.selectedBranch\" ng-options=\"branch.value as branch.name for branch in branches\"></select>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label>\n" +
    "    <span>\n" +
    "      <span translate>Committer Email:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>The committer email address is used to identify who commit changes to the repository. The list is populated from the available list provided by the repository hosting provider.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"configOptions.selectedEmail\" ng-options=\"email.value as email.name for email in emails\"></select>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label>\n" +
    "    <span>\n" +
    "      <span translate>Committer Name:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>The committer name is a required option to identify who commit changes to the repository.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <input type=\"text\" class=\"m-component-textbox committer-name\" ng-model=\"configOptions.name\"/>\n" +
    "  </label>\n" +
    "\n" +
    "  <p ng-show=\"configOptions.currentRepository\" translate>If your GitHub username and/or repository name changes, please click on Clear Cache &amp; Save even if you made no changes.</p>\n" +
    "\n" +
    "  <div ng-show=\"!configOptions.currentRepository\">\n" +
    "    <h2 translate>Can't find repositories?</h2>\n" +
    "    <p translate>Missing repositories can be caused by improper repository configuration or service plan.</p>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"goToServiceSelection()\" ng-show=\"!uiSetup.hasVcsConfiguration && uiSetup.hasMultipleServices\" translate>Back</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickInitialize()\" ng-show=\"!uiSetup.hasVcsConfiguration\" translate>Initialize</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickInitialize()\" ng-show=\"uiSetup.hasVcsConfiguration\" translate>Clear Cache &amp; Save</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/config/VcsConfigGitHubCreateEmptyRepo.html",
    "<section class=\"modal-body git-service-github-no-repository\">\n" +
    "  <h1 translate>Please Create an Empty Repository</h1>\n" +
    "  <p translate>To configure GitHub and connect this project to a repository, you need a blank repository. However, We were unable to find any available repositories to link with.</p>\n" +
    "  <br />\n" +
    "  <p translate style=\"color:#c83e29;\">Please login and create an empty GitHub repository.</p>\n" +
    "  <br />\n" +
    "  <a href=\"https://github.com/new\" target=\"_blank\" class=\"m-btn m-btn-blue m-btn-large\" translate>Create Empty Repository</a>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/config/VcsConfigGitSsh.html",
    "<section class=\"modal-body git-service-gitssh\">\n" +
    "  <h1 translate>Remote Repository Configuration</h1>\n" +
    "\n" +
    "  <label ng-show=\"!configOptions.currentRepository\">\n" +
    "    <span translate>Repository URL:</span>\n" +
    "    <div>\n" +
    "      <input ng-model=\"configOptions.selectedRepository\" type=\"text\" class=\"m-component-textbox\" placeholder=\"ssh://...\" />\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label ng-show=\"configOptions.currentRepository\">\n" +
    "    <span translate>Repository URL:</span>\n" +
    "    <div class=\"current-repository\">\n" +
    "      <i><span>{{configOptions.currentRepository}}</span></i>\n" +
    "      <small translate><img src=\"img/icon/icon_exclamation.png\" /> Repositories can not be changed after setup.</small>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label ng-show=\"configOptions.currentRepository\">\n" +
    "    <span>\n" +
    "      <span translate>Current Working Branch:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>New branch should be created on the repository hosting provider site or through command line.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div class=\"m-component-combobox\">\n" +
    "      <select ng-model=\"configOptions.selectedBranch\" ng-options=\"branch.value as branch.name for branch in branches\"></select>\n" +
    "    </div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label>\n" +
    "    <span>\n" +
    "      <span translate>Committer Email:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>The committer email address is used to identify who commit changes to the repository. The list is populated from the available list provided by the repository hosting provider.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div><i class=\"committer-email\">{{configOptions.selectedEmail}}</i></div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label>\n" +
    "    <span>\n" +
    "      <span translate>Committer Name:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>The committer name is a required option to identify who commit changes to the repository.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div><input class=\"m-component-textbox\" type=\"text\" ng-model=\"configOptions.name\" /></div>\n" +
    "  </label>\n" +
    "\n" +
    "  <label>\n" +
    "    <span>\n" +
    "      <span translate>Public SSH Key:</span>\n" +
    "      <i class=\"m-component-tooltip-icon\">\n" +
    "        <div class=\"m-component-tooltip\" translate>The public SSH key needs to be added to the third-party remote git service for git command access.</div>\n" +
    "      </i>\n" +
    "    </span>\n" +
    "    <div><textarea class=\"git-ssh-key m-component-textbox\" readonly disabled>{{uiSetup.sshPublicKey}}</textarea></div>\n" +
    "  </label>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"goToServiceSelection()\" ng-show=\"!uiSetup.hasVcsConfiguration && uiSetup.hasMultipleServices\" translate>Back</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickInitialize()\" ng-show=\"!uiSetup.hasVcsConfiguration\" translate>Initialize</button>\n" +
    "  <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickInitialize()\" ng-show=\"uiSetup.hasVcsConfiguration\" translate>Clear Cache &amp; Save</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/config/VcsConfigLoading.html",
    "<div class=\"page-loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Processing configuration request...\"></spinner>\n" +
    "</div>");
  $templateCache.put("vcs/config/VcsConfigMissingSshKey.html",
    "<section class=\"modal-body git-missing-ssh-key\">\n" +
    "  <h1 translate>Missing SSH Key</h1>\n" +
    "  <p translate>Unable to locate SSH Key. Please generate a SSH key from the <a target=\"_blank\" href=\"{{uiSetup.sshConfigureUrl}}\">User Account Management</a> screen and try again.</p>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" type=\"button\" translate>Close</button>\n" +
    "</section>");
  $templateCache.put("vcs/config/VcsConfigServiceSelection.html",
    "<!-- Modal Body Content -->\n" +
    "<section class=\"modal-body git-service-selection\">\n" +
    "  <h1 translate>Select a Git Service</h1>\n" +
    "  <p class=\"service-desc\" translate>Connecting your project to a repository will allow you to version control your files. To use this feature, please select a git service provider below.</p>\n" +
    "  <div class=\"service-options\">\n" +
    "    <div ng-class=\"{'gitssh': true, 'disable': isServiceOptionDisabled('gitssh') === true}\" ng-click=\"isServiceOptionDisabled('gitssh') === true || initialServiceSelection('gitssh')\">\n" +
    "      <img src=\"img/vcs/gitservice-option-gitssh.png\" />\n" +
    "      <div ng-show=\"isServiceOptionDisabled('gitssh') === true\">\n" +
    "        <p translate>Your current subscription plan does not support the Git SSH feature. To use this feature, please upgrade to a supported plan.</p>\n" +
    "        <button class=\"m-btn m-btn-blue\" ng-click=\"openPlanChangeUrl()\" translate>Upgrade</button>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <div ng-class=\"{'github': true, 'disable': isServiceOptionDisabled('github') === true}\" ng-click=\"initialServiceSelection('github')\">\n" +
    "      <img src=\"img/vcs/gitservice-option-github.png\" />\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/config/VcsConfigSuccess.html",
    "<section class=\"modal-body git-configuration-success\">\n" +
    "  <!-- GitHub content -->\n" +
    "  <div ng-show=\"!configOptions.currentRepository && serviceType == 'GitHub'\" class=\"configure-success\">\n" +
    "    <h1 translate>Congratulations!</h1>\n" +
    "    <p translate>Your project has successfully been uploaded to the \"{{initCurrentRepository}}\" repository on GitHub.</p>\n" +
    "    <p translate>The current working branch is set to \"{{initSelectedBranch}}\". To change your working branch, click on \"Advance Configurations\" below. You can change the branch at any time by visiting the \"Configuration Service\" window.</p>\n" +
    "  </div>\n" +
    "\n" +
    "  <!-- GitManual content-->\n" +
    "  <div ng-show=\"!configOptions.currentRepository && serviceType == 'GitManual'\" class=\"configure-success\">\n" +
    "    <h1 translate>Congratulations!</h1>\n" +
    "    <p translate>Your project has successfully been uploaded to \"{{configOptions.selectedRepository}}\".</p>\n" +
    "    <p translate>The current working branch is set to \"{{initSelectedBranch}}\". To change your working branch, click on \"Advance Configurations\" below. You can change the branch at any time by visiting the \"Configuration Service\" window.</p>\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-show=\"configOptions.currentRepository\" class=\"configure-success\">\n" +
    "    <p ng-bind-html=\"message\"></p>\n" +
    "  </div>\n" +
    "</section>\n" +
    "\n" +
    "<!-- Modal Footer Content -->\n" +
    "<section class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-click=\"this.$close()\" type=\"button\" translate>Close</button>\n" +
    "  <button class=\"m-btn\" ng-show=\"!configOptions.currentRepository\" type=\"button\" ng-click=\"onClickAdvanceConfigurations()\" translate>Advance Configurations</button>\n" +
    "</section>\n" +
    "");
  $templateCache.put("vcs/VcsAbortMerge.html",
    "<div class=\"modal-header\">\n" +
    "    <button\n" +
    "      ng-show=\"page !== pages.loading\" \n" +
    "      type=\"button\" \n" +
    "      class=\"close\"\n" +
    "      ng-click=\"$close()\"\n" +
    "      aria-label=\"Close\">\n" +
    "      <span aria-hidden=\"true\">&times;</span>\n" +
    "    </button>\n" +
    "    <span translate>Abort Merge</span>\n" +
    "  </div>\n" +
    "  \n" +
    "  <div class=\"modal-body\">\n" +
    "    <div ng-show=\"page === pages.default\">\n" +
    "      <p\n" +
    "        class=\"message\" \n" +
    "        translate\n" +
    "        >Are you sure you would like to abort merge? This operation cannot be undone.</p\n" +
    "      >\n" +
    "    </div>\n" +
    "  \n" +
    "    <div ng-show=\"page === pages.loading\" class=\"page-loading\">\n" +
    "      <spinner s-type=\"modal\" s-loading-text=\"Aborting Merge...\"></spinner>\n" +
    "    </div>\n" +
    "  \n" +
    "    <div ng-show=\"page === pages.success || page === pages.error\">\n" +
    "      <p \n" +
    "        ng-show=\"page === pages.success\" \n" +
    "        class=\"message\" \n" +
    "        translate\n" +
    "        >Merge is aborted.</p\n" +
    "      >\n" +
    "      <div ng-show=\"page === pages.error\" class=\"configure-fail\">\n" +
    "        <h1 ng-bind-html=\"errorTitle\"></h1>\n" +
    "        <p ng-bind-html=\"errorMessage\"></p>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  \n" +
    "  <div \n" +
    "    ng-show=\"page !== pages.loading\"\n" +
    "    class=\"modal-footer\"\n" +
    "  >\n" +
    "    <button \n" +
    "      class=\"m-btn\" \n" +
    "      type=\"button\" \n" +
    "      ng-click=\"$close()\" \n" +
    "      translate\n" +
    "      >Close</button\n" +
    "    >\n" +
    "    <button \n" +
    "      ng-show=\"page === pages.default\" \n" +
    "      class=\"m-btn m-btn-blue\" \n" +
    "      type=\"button\" \n" +
    "      ng-click=\"onClickAbortButton()\" \n" +
    "      translate\n" +
    "      >Abort</button\n" +
    "    >\n" +
    "  </div>");
  $templateCache.put("vcs/VcsCommitDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button ng-show=\"page === 'complete' || page === 'error' || page === 'default'\" type=\"button\" class=\"close\" ng-click=\"this.$close()\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>\n" +
    "  <span translate>Commit</span>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'loading'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Loading File Changes...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"page-loading\" ng-show=\"page === 'committing'\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Committing File Changes\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'default'\">\n" +
    "  <section class=\"modal-body\">\n" +
    "    <h1 translate>Changed Files</h1>\n" +
    "\n" +
    "    <div class=\"vcs-commit-window-status\">\n" +
    "      <dl class=\"status-untracked\">\n" +
    "        <dt translate>Untracked</dt>\n" +
    "        <dd>{{status.untracked}}</dd>\n" +
    "      </dl>\n" +
    "      <dl class=\"status-modified\">\n" +
    "        <dt translate>Modified</dt>\n" +
    "        <dd>{{status.modified}}</dd>\n" +
    "      </dl>\n" +
    "      <dl class=\"status-conflicted\" ng-show=\"status['updated-but-unmerged']\">\n" +
    "        <dt translate>Conflicted</dt>\n" +
    "        <dd>{{status['updated-but-unmerged']}}</dd>\n" +
    "      </dl>\n" +
    "      <dl class=\"status-renamed\">\n" +
    "        <dt translate>Renamed</dt>\n" +
    "        <dd>{{status.renamed}}</dd>\n" +
    "      </dl>\n" +
    "      <dl class=\"status-deleted\">\n" +
    "        <dt translate>Deleted</dt>\n" +
    "        <dd>{{status.deleted}}</dd>\n" +
    "      </dl>\n" +
    "    </div>\n" +
    "\n" +
    "    <textarea cols=\"30\" rows=\"10\" ng-model=\"commitMessage\" class=\"vcs-commit-window-comment\" resizable=\"none\"\n" +
    "              placeholder=\"Type a description for your commit\"></textarea>\n" +
    "\n" +
    "    <div class=\"vcs-commit-window-files\">\n" +
    "      <div>\n" +
    "        <table>\n" +
    "          <thead>\n" +
    "          <tr>\n" +
    "            <td ng-click=\"onClickCheckAll()\"><input type=\"checkbox\" id=\"vcs-commit-window-files-commitall\"></td>\n" +
    "            <td translate>Name</td>\n" +
    "            <td translate>Status</td>\n" +
    "          </tr>\n" +
    "          </thead>\n" +
    "          <tbody>\n" +
    "          <tr ng-repeat=\"file in files\" ng-click=\"onClickFile(file)\">\n" +
    "            <td><input type=\"checkbox\" ng-model=\"file.isToCommited\" ng-change=\"onClickCheckbox(file)\"\n" +
    "                       ng-click=\"highlightRow($event)\"></td>\n" +
    "            <td>{{file.name}}</td>\n" +
    "            <td>\n" +
    "              <i class=\"vcs-commit-window-files-untracked\" ng-show=\"file.status === 'untracked'\"></i>\n" +
    "              <i class=\"vcs-commit-window-files-modified\" ng-show=\"file.status === 'modified'\"></i>\n" +
    "              <i class=\"vcs-commit-window-files-conflicted\" ng-show=\"file.status === 'updated-but-unmerged'\"></i>\n" +
    "              <i class=\"vcs-commit-window-files-renamed\" ng-show=\"file.status === 'renamed'\"></i>\n" +
    "              <i class=\"vcs-commit-window-files-deleted\" ng-show=\"file.status === 'deleted'\"></i>\n" +
    "            </td>\n" +
    "          </tr>\n" +
    "          </tbody>\n" +
    "        </table>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"onClickSubmit()\" translate>Commit</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'success'\">\n" +
    "  <section class=\"modal-body\">\n" +
    "    <div class=\"configure-success\">\n" +
    "      <h1 translate>Congratulations!</h1>\n" +
    "      <p translate>Your changes has successfully been committed.</p>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" ng-click=\"this.$close()\" type=\"button\" translate>Close</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div ng-show=\"page === 'error'\">\n" +
    "  <section class=\"modal-body\">\n" +
    "    <div class=\"configure-fail\">\n" +
    "      <h1>{{title}}</h1>\n" +
    "      <p>{{message}}</p>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "\n" +
    "  <div class=\"modal-footer\">\n" +
    "    <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "    <button class=\"m-btn m-btn-blue\" type=\"button\" ng-click=\"this.onClickBack()\" ng-hide=\"hideBack\" translate>Back</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "");
  $templateCache.put("vcs/VcsCommitHistory.html",
    "<div ng-controller=\"VcsCommitHistoryController\" class=\"vcs-history\">\n" +
    "  <section class=\"vcs-history-list pull-left\">\n" +
    "    <p ng-show=\"loading\">Loading...</p>\n" +
    "    <ul ng-show=\"!loading\">\n" +
    "      <li class=\"vcs-no-commits-message\" ng-if=\"commits.length === 0\">No commits</li>\n" +
    "      <li class=\"vcs-history-commit-item\" ng-repeat=\"commit in commits\" ng-class=\"(commit.comment === 'UNSTAGED' && commit.committer.timestamp === '...') ? 'unstaged' : ''\">\n" +
    "        <div class=\"vcs-history-commit\">\n" +
    "          <div class=\"vcs-history-commit-message\">\n" +
    "            {{commit.comment}}\n" +
    "          </div>\n" +
    "\n" +
    "          <div class=\"vcs-history-commit-detail\">\n" +
    "            {{commit.committer.username}} <span ng-if=\"commit.comment !== 'UNSTAGED' || commit.committer.timestamp !== '...'\" translate>committed</span>&nbsp;{{commit.committer.timestamp}}\n" +
    "          </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"vcs-history-commit-id\">\n" +
    "          <button type=\"button\" class=\"m-btn\" ng-click=\"displayDiff($event, commit.commit_id, commit.parent)\" title=\"{{commit.commit_id}}\">\n" +
    "            {{commit.commit_id_display}}\n" +
    "          </button>\n" +
    "        </div>\n" +
    "      </li>\n" +
    "    </ul>\n" +
    "  </section>\n" +
    "\n" +
    "  <section class=\"vcs-history-diff\">\n" +
    "    <div id=\"diff-viewer\"></div>\n" +
    "  </section>\n" +
    "</div>\n" +
    "");
  $templateCache.put("vcs/VcsConfigurationDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button ng-hide=\"page === 'loading'\" type=\"button\" class=\"close\" ng-click=\"this.$close()\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>\n" +
    "  <span translate>Configure</span>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-switch on=\"page\">\n" +
    "  <div ng-switch-when=\"git-service-selection\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigServiceSelection.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-service-gitssh\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigGitSsh.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-service-github\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigGitHub.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-service-github-no-repository\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigGitHubCreateEmptyRepo.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-missing-ssh-key\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigMissingSshKey.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-configuration-success\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigSuccess.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-when=\"git-configuration-error\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigError.html'\"></div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-switch-when=\"loading\">\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigLoading.html'\"></div>\n" +
    "  </div>\n" +
    "  <div ng-switch-default>\n" +
    "    <div ng-include=\"'vcs/config/VcsConfigLoading.html'\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
  $templateCache.put("vcs/VcsDiscardChanges.html",
    "<div class=\"modal-header\">\n" +
    "  <button\n" +
    "    ng-show=\"page !== pages.loading\" \n" +
    "    type=\"button\" \n" +
    "    class=\"close\"\n" +
    "    ng-click=\"$close()\"\n" +
    "    aria-label=\"Close\">\n" +
    "    <span aria-hidden=\"true\">&times;</span>\n" +
    "  </button>\n" +
    "  <span translate>Discard Local Changes</span>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-body\">\n" +
    "  <div ng-show=\"page === pages.default\">\n" +
    "    <p\n" +
    "      class=\"message\" \n" +
    "      translate\n" +
    "      >Are you sure you would like to discard your local changes? This operation cannot be undone.</p\n" +
    "    >\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-show=\"page === pages.loading\" class=\"page-loading\">\n" +
    "    <spinner s-type=\"modal\" s-loading-text=\"Discarding Local Changes...\"></spinner>\n" +
    "  </div>\n" +
    "\n" +
    "  <div ng-show=\"page === pages.success || page === pages.error\">\n" +
    "    <p \n" +
    "      ng-show=\"page === pages.success\" \n" +
    "      class=\"message\" \n" +
    "      translate\n" +
    "      >Your local changes have been discarded successfully.</p\n" +
    "    >\n" +
    "    <div ng-show=\"page === pages.error\" class=\"configure-fail\">\n" +
    "      <h1 ng-bind-html=\"errorTitle\"></h1>\n" +
    "      <p ng-bind-html=\"errorMessage\"></p>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div \n" +
    "  ng-show=\"page !== pages.loading\"\n" +
    "  class=\"modal-footer\"\n" +
    ">\n" +
    "  <button \n" +
    "    class=\"m-btn\" \n" +
    "    type=\"button\" \n" +
    "    ng-click=\"$close()\" \n" +
    "    translate\n" +
    "    >Close</button\n" +
    "  >\n" +
    "  <button \n" +
    "    ng-show=\"page === pages.default\" \n" +
    "    class=\"m-btn m-btn-blue\" \n" +
    "    type=\"button\" \n" +
    "    ng-click=\"onClickDiscardButton()\" \n" +
    "    translate\n" +
    "    >Discard</button\n" +
    "  >\n" +
    "</div>");
  $templateCache.put("vcs/VcsPullDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button\n" +
    "    ng-show=\"!isLoading()\" \n" +
    "    type=\"button\" \n" +
    "    class=\"close\"\n" +
    "    ng-click=\"$close()\"\n" +
    "    aria-label=\"Close\"\n" +
    "  >\n" +
    "    <span aria-hidden=\"true\">&times;</span>\n" +
    "  </button>\n" +
    "  <span translate-context=\"header\" translate>Pulling</span>\n" +
    "</div>\n" +
    "\n" +
    "<!-- in setup -->\n" +
    "<div ng-show=\"page === pages.loading\" class=\"page-loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Getting Remote Branches...\"></spinner>\n" +
    "</div>\n" +
    "<!-- pulling -->\n" +
    "<div ng-show=\"page === pages.pulling\" class=\"page-loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Processing Pull Request...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div \n" +
    "  ng-show=\"!isLoading()\"\n" +
    "  class=\"modal-body\"\n" +
    "  ng-class=\"{ 'text-center': page === pages.pullSuccess || page === pages.pullError }\"\n" +
    ">\n" +
    "  <!-- on setup success -->\n" +
    "  <div ng-show=\"page === pages.setupSuccess\">\n" +
    "    <div class=\"pull-from\">\n" +
    "      <label>\n" +
    "        <span class=\"item-name\">\n" +
    "          <span translate>Pull from (remote)</span>\n" +
    "        </span>\n" +
    "        <div class=\"m-component-combobox\">\n" +
    "          <select ng-model=\"selectedBranch\" ng-options=\"branch.name for branch in branches\"></select>\n" +
    "        </div>\n" +
    "      </label>\n" +
    "    </div>\n" +
    "    <div class=\"pull-into\">\n" +
    "      <label>\n" +
    "        <span class=\"item-name\">\n" +
    "          <span translate>Pull into (local)</span>\n" +
    "        </span>\n" +
    "        <span>\n" +
    "          <span translate><code>{{ currentBranch.name }}</code> (current branch)</span>\n" +
    "        </span>\n" +
    "      </label>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- on setup error -->\n" +
    "  <div ng-show=\"page === pages.setupError\">\n" +
    "    <div class=\"configure-fail\">\n" +
    "      <h1 ng-bind-html=\"setup.error.title\"></h1>\n" +
    "      <p ng-bind-html=\"setup.error.message\"></p>\n" +
    "    </div>  \n" +
    "  </div>\n" +
    "  <!-- on pull success -->\n" +
    "  <div ng-show=\"page === pages.pullSuccess\">\n" +
    "    <div class=\"icon\">\n" +
    "      <img src=\"img/vcs/icon_pull_check.png\" />\n" +
    "    </div>\n" +
    "    <p\n" +
    "      ng-if=\"pull.success.message\"\n" +
    "      class=\"message\"\n" +
    "      ng-bind-html=\"pull.success.message\"\n" +
    "    ></p>\n" +
    "    <br/>\n" +
    "    <div ng-show=\"pull.success.result\" class=\"text-left\">\n" +
    "      <h2 translate>Pull Log:</h2>\n" +
    "      <textarea\n" +
    "        class=\"error-log\"\n" +
    "        ng-model=\"pull.success.result\"\n" +
    "        disabled\n" +
    "        readonly\n" +
    "      ></textarea>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <!-- on pull error -->\n" +
    "  <div ng-show=\"page === pages.pullError\">\n" +
    "    <div class=\"icon\">\n" +
    "      <img src=\"img/vcs/icon_pull_failed.png\" />\n" +
    "    </div>\n" +
    "    <br/>\n" +
    "    <span ng-bind-html=\"pull.error.message\"></span>\n" +
    "    <br/>\n" +
    "    <div ng-show=\"pull.error.result\" class=\"configure-fail text-left\">\n" +
    "      <h2 translate>Pull Log:</h2>\n" +
    "      <textarea\n" +
    "        class=\"error-log\"\n" +
    "        ng-model=\"pull.error.result\"\n" +
    "        disabled\n" +
    "        readonly\n" +
    "      ></textarea>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "\n" +
    "<div\n" +
    "  ng-show=\"!isLoading()\"\n" +
    "  class=\"modal-footer\"\n" +
    ">\n" +
    "  <button\n" +
    "    class=\"m-btn\"\n" +
    "    type=\"button\"\n" +
    "    ng-click=\"$close()\"\n" +
    "    translate\n" +
    "    >Close</button\n" +
    "  >\n" +
    "  <button\n" +
    "    ng-show=\"page === pages.setupSuccess\"\n" +
    "    class=\"m-btn m-btn-blue\"\n" +
    "    type=\"button\"\n" +
    "    ng-click=\"onClickPullButton()\"\n" +
    "    >\n" +
    "    <span ng-show=\"isSelectedSameBranch()\" translate>Pull</span>\n" +
    "    <span ng-show=\"!isSelectedSameBranch()\" translate>Pull &amp; Merge</span>\n" +
    "    </button\n" +
    "  >\n" +
    "</div>");
  $templateCache.put("vcs/VcsPushDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button \n" +
    "    ng-show=\"page !== pages.pushing\"  \n" +
    "    class=\"close\" \n" +
    "    ng-click=\"$close()\" \n" +
    "    aria-label=\"Close\"\n" +
    "  >\n" +
    "    <span aria-hidden=\"true\">&times;</span>\n" +
    "  </button>\n" +
    "  <span translate-context=\"header\" translate>Pushing</span>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === pages.default\" class=\"modal-body\">\n" +
    "  <p translate>Are you sure you would like to push?</p>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === pages.pushing\" class=\"page-loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"Processing Push Request...\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<section\n" +
    "  ng-show=\"page === pages.success || page === pages.error\"\n" +
    "  class=\"modal-body text-center\"\n" +
    ">\n" +
    "  <div>\n" +
    "    <img ng-if=\"page === pages.success\" src=\"img/vcs/icon_push_check.png\" />\n" +
    "    <img ng-if=\"page === pages.error\" src=\"img/vcs/icon_push_failed.png\" />\n" +
    "  </div>\n" +
    "  <br/>\n" +
    "  <p>{{ message }}</p>\n" +
    "</section>\n" +
    "\n" +
    "<div ng-show=\"page !== pages.pushing\" class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" ng-click=\"$close()\" translate>Close</button>\n" +
    "  <button\n" +
    "    ng-show=\"page === pages.default\"\n" +
    "    class=\"m-btn m-btn-blue\"\n" +
    "    ng-click=\"onClickPushButton()\"\n" +
    "    translate\n" +
    "    >Push</button\n" +
    "  >\n" +
    "</div>\n" +
    "");
  $templateCache.put("vcs/VcsPushPullDialog.html",
    "<div class=\"modal-header\">\n" +
    "  <button\n" +
    "    ng-show=\"page === 'complete' || page === 'error'\" \n" +
    "    type=\"button\" \n" +
    "    class=\"close\"\n" +
    "    ng-click=\"this.$close()\"\n" +
    "    aria-label=\"Close\">\n" +
    "    <span aria-hidden=\"true\">&times;</span>\n" +
    "  </button>\n" +
    "  <span>{{ headerTitle }}</span>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'pushing' || page === 'pulling'\" class=\"page-loading\">\n" +
    "  <spinner s-type=\"modal\" s-loading-text=\"{{ loadingText }}\"></spinner>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-show=\"page === 'complete' || page === 'error'\">\n" +
    "  <section class=\"modal-body text-center\">\n" +
    "    <div class=\"icon\">\n" +
    "      <img ng-show=\"page === 'complete'\" src=\"img/vcs/icon_pull_check.png\" />\n" +
    "      <img ng-show=\"page === 'error' && gitCommand === 'pull'\" src=\"img/vcs/icon_pull_failed.png\" />\n" +
    "      <img ng-show=\"page === 'error' && gitCommand === 'push'\" src=\"img/vcs/icon_push_failed.png\" />\n" +
    "    </div>\n" +
    "    \n" +
    "    <p class=\"message\" translate ng-if=\"message\" ng-bind-html=\"message\"></p>\n" +
    "\n" +
    "    <div ng-if=\"result\" class=\"configure-fail text-left\" >\n" +
    "      <h2 translate>{{ logText }}:</h2>\n" +
    "      <textarea class=\"error-log\" ng-model=\"result\" disabled readonly></textarea>\n" +
    "    </div>\n" +
    "  </section>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"modal-footer\">\n" +
    "  <button class=\"m-btn\" type=\"button\" ng-click=\"this.$close()\" translate>Close</button>\n" +
    "</div>");
}]);

;angular.module('monacaIDE').constant('Constant', {
  EVENT: {
    /**
     * Toast Notification
     */
    NOTIFY_USER: 'notify-user',

    /**
     * Analytics
     */
    SEND_ANALYTICS: 'send-analytics',

    // Used to let GoldenLayout know when it can start setting up
    IDE_READY: 'ide-ready',

    // Fired when GoldenLayout is set up
    LAYOUT_READY: 'layout-ready',

    /**
     * Toggle, Collapse, and Expand Functionality for View Regions
     */
    TOGGLE_PROJECT_VIEW: 'toggle-project-view',
    TOGGLE_PREVIEWER_VIEW: 'toggle-previewer-view',
    TOGGLE_DEBUGGER_VIEW: 'toggle-debugger-view',
    TOGGLE_TERMINAL_VIEW: 'toggle-terminal-view',
    TOGGLE_DOCUMENT_VIEW: 'toggle-document-view',
    TOGGLE_NORMAL_EDITOR_VIEW: 'toggle-normal-editor-view',
    TOGGLE_COMPARE_EDITOR_VIEW: 'toggle-compare-editor-view',
    TOGGLE_TRANSPILE_LOG_VIEW: 'toggle-transpile-log-view',
    TOGGLE_GENERIC_IFRAME_VIEW: 'toggle-generic-iframe-view',
    TOGGLE_GENERIC_ANGULAR_VIEW: 'toggle-generic-angular-view',
    VIEW_OPENED: 'view-opened',
    VIEW_CLOSED: 'view-closed',
    VIEW_SHOWN: 'view-shown',
    VIEW_HIDE: 'view-hide',
    VIEW_RESIZE: 'view-resize',

    // TAB_CREATED is slightly different to VIEW_OPENED - it fires when the tab DOM element is created
    TAB_CREATED: 'tab-created',
    GL_STACK_CREATED: 'gl-stack-created',

    RESET_LAYOUT: 'reset-layout',

    OPEN_BUILD_HISTORY: 'open-build-history',
    CORDOVA_PLUGIN_REBUILD_COLLECTION: 'cordova-plugin-rebuild-collection',

    BODY_CLICKED: 'body-clicked',

    // Other non-documented events.
    UPDATE_IFRAME_TAB_WITH_CALLBACK: 'update-iframe-tab-with-callback',
    CLOSE_ALL_TABS: 'close-all-tabs',
    CLOSE_INACTIVATE_TABS: 'close-inactive-tabs',
    SAVE_ACTIVE_EDITOR_TAB: 'save-active-editor-tab',
    SAVE_ALL_EDITOR_TAB: 'save-all-editor-tab',
    UNDO_ACTIVE_EDITOR_TAB: 'undo-active-editor-tab',
    REDO_ACTIVE_EDITOR_TAB: 'redo-active-editor-tab',
    TOGGLE_COMMENT_EDITOR_TAB: 'toggle-comment-editor-tab',
    FOCUS_SEARCH_BOX: 'focus-search-box',
    FOCUS_EDITOR: 'focus-editor',
    SEARCH_NEXT: 'search-next',
    SEARCH_PREVIOUS: 'search-previous',
    REPLACE_TEXT_EDITOR_TAB: 'replace-text-editor-tab',
    PASTE_TO_ACTIVE_EDITOR_TAB: 'paste-to-active-editor-tab',
    COPY_FROM_ACTIVE_EDITOR_TAB: 'copy-from-active-editor-tab',
    CUT_FROM_ACTIVE_EDITOR_TAB: 'cut-from-active-editor-tab',
    CHANGE_ENCODING_ACTIVE_EDITOR_TAB: 'change-encoding-for-saving-active-editor-tab',
    MODEL_CHANGED_ACTIVE_EDITOR_TAB: 'model-changed-active-editor-tab',
    MODEL_SAVED: 'model-saved', // for detecting successful save in other tabs
    MODEL_DISCARDED: 'model-discarded', // for detecting modification discard in other tabs

    // Editor related events to proxy actions that used to be in the right click context menu
    INCREASE_FONT_SIZE_ACTIVE_EDITOR_TAB: 'increase-font-size-active-editor-tab',
    DECREASE_FONT_SIZE_ACTIVE_EDITOR_TAB: 'decrease-font-size-active-editor-tab',
    FORMAT_DOCUMENT_ACTIVE_EDITOR_TAB: 'format-document-active-editor-tab',
    COMMAND_PALETTE_ACTIVE_EDITOR_TAB: 'command-paletete-active-editor-tab',

    // events about filePanel
    NEW_FILE: 'new-file',
    NEW_FOLDER: 'new-folder',
    CREATED_NEW_FILE_OR_FOLDER: 'created-new-file-or-folder',
    DELETE_FILE_OR_FOLDER: 'delete-file-or-folder',
    RENAME_FILE_OR_FOLDER: 'rename-file-or-folder',
    OPEN_FILE: 'open-file',
    COPY_FILE: 'copy-file',
    UPLOAD_FILES: 'upload-files',
    TREE_CLEAR_CACHE_RELOAD: 'tree-clear-cache-reload',
    TREE_UPDATED: 'tree-updated',
    TREE_ERROR: 'tree-error',

    INIT_USER_PROJECT_LIST: 'init-user-project-list',

    CHANGE_CONFIG_VALUE_HAS_VCS_CONFIGS: 'change-config-value-has-vcs-configs',
    OPEN_DEBUG_SETUP: 'open-debug-setup',
    OPEN_RUN_ON_DEVICE: 'open-run-on-device',
    OPEN_BUILD_PANEL: 'open-build-panel',

    EXECUTE_WITH_SELECTED_NODE: 'execute-with-selected-node',

    FILE_FOLDER_WAS_DELETED: 'file-folder-was-deleted',

    EDITOR_CONFIG_UPDATED: 'editor-config-updated',
    SET_ACTIVE_EDITOR_TAB: 'set-active-editor-tab',
    ACTIVE_EDITOR_TAB_CHANGED: 'active-editor-tab-changed',
    UPDATE_TAB_CLEAN_STATE: 'update-tab-clean-state',

    TERMINAL_SERVER_REQUEST: 'terminal-server-request',
    TERMINAL_SERVER_RESPONSE: 'terminal-server-response',
    TERMINAL_SERVER_RESPONSE_TERMINAL: 'terminal-server-response-for-terminal-tab',
    TERMINAL_SERVER_RESPONSE_FAILED: 'terminal-server-response-failed',

    PREVIEWER_VIEW_DEVICE_CHANGED: 'previewer-view-device-changed',
    PREVIEWER_VIEW_URL_CHANGED: 'previewer-view-url-changed',
    PREVIEWER_VIEW_URL_REFRESH: 'previewer-view-url-refresh',
    PREVIEWER_VIEW_URL_FAILED: 'previewer-view-url-failed',

    TERMINAL_SETTING_CHANGED: 'terminal-setting-changed',
    TRANSPILE_SETTING_CHANGED: 'transpile-setting-changed',

    CUSTOM_BUILD_RELOAD: 'custom-build-reload',
    CI_CONFIGS_RELOAD: 'ci-configs-reload',
    CLOSE_A_VIEW: 'close-a-golden-layout-view',

    EDITOR_CREATED: 'editor-created',

    ENCODING_CHANGED: 'encoding-changed',

    // discard local change event
    CHANGE_DISCARDED: 'change-discarded',

    // merging in vcs event
    MERGING_DETECTED: 'merging-detected',
    MERGING_RESOLVED: 'merging-resolved',

    // vcs checkout event
    BRANCH_CHANGED: 'branch-changed',

    // pull end event
    PULL_FINISHED: 'pull-finished',

    // Update Build Flag
    UPDATE_BUILD_FLAGE: 'update-build-flag',

    // loading
    USER_INFO_LOADED: 'user-info-loaded',

    // Google
    EXPORT_GOOGLE_PROJECT: 'export-google-project',

    PROJECT_ID_CHANGED: 'project-id-changed'
  },

  VIEW: {
    PROJECT_VIEW: 'project-view',
    PREVIEWER_VIEW: 'previewer-view',
    DEBUGGER_VIEW: 'debugger-view',
    // Do not change the value of NORMAL_EDITOR_VIEW.
    // Otherwise, user's IDE will be broken due to user's golden_layout_config cache in Local Storage.
    NORMAL_EDITOR_VIEW: 'editor-view',
    COMPARE_EDITOR_VIEW: 'compare-editor-view',
    TERMINAL_VIEW: 'terminal-view',
    TRANSPILE_LOG_VIEW: 'transpile-log-view',
    GENERIC_IFRAME_VIEW: 'generic-iframe-view',
    GENERIC_ANGULAR_VIEW: 'generic-angular-view',
    PLACEHOLDER_VIEW: 'placeholder-view',
    CUSTOM_BUILD_VIEW: 'buildforcustom-view'
  },

  SHORTCUT_KEY: {
    SAVE: {
      win: 'Ctrl+S',
      mac: '⌘S',
      linux: ''
    },

    CUT: {
      win: 'Ctrl+X',
      mac: '⌘X',
      linux: ''
    },

    COPY: {
      win: 'Ctrl+C',
      mac: '⌘C',
      linux: ''
    },

    PASTE: {
      win: 'Ctrl+V',
      mac: '⌘V',
      linux: ''
    },

    UNDO: {
      win: 'Ctrl+Z',
      mac: '⌘Z',
      linux: ''
    },

    REDO: {
      win: 'Ctrl+Shift+Z',
      mac: '⌘+Shift+Z',
      linux: ''
    },

    SEARCH: {
      win: 'Ctrl+F',
      mac: '⌘F',
      linux: ''
    },

    SEARCH_ALL: {
      win: '',
      mac: '',
      linux: ''
    },

    SEARCH_NEXT: {
      win: 'Ctrl+G',
      mac: '⌘G',
      linux: ''
    },

    SEARCH_PREVIOUS: {
      win: 'Shift+Ctrl+G',
      mac: '⌘+Shift+G',
      linux: ''
    },

    REPLACE: {
      win: 'Shift+Ctrl+F',
      mac: '⌘+Alt+F',
      linux: ''
    },

    REPLACE_ALL: {
      win: 'Shift+Ctrl+R ',
      mac: '⌘+Shift+Alt+F',
      linux: ''
    },

    COMMENT_OUT: {
      win: 'Ctrl+/',
      mac: '⌘/',
      linux: ''
    },

    COMMENT_IN: {
      win: 'Ctrl+/',
      mac: '⌘/',
      linux: ''
    },

    COMMAND_PALETTE: {
      win: 'F1',
      mac: 'F1',
      linux: ''
    },

    DECREASE_FONT_SIZE: {
      win: 'CTRL+,',
      mac: '⌘,',
      linux: ''
    },

    INCREASE_FONT_SIZE: {
      win: 'CTRL+.',
      mac: '⌘.',
      linux: ''
    },

    FORMAT_DOCUMENT: {
      win: 'Shift+Alt+F',
      mac: 'Shift+Alt+F',
      linux: ''
    }
  },

  PROJECT: {
    PANEL_FILE: 'file',
    PANEL_GREP: 'grep'
  },

  BUILD_PANEL: {
    /**
     * Available Page Views Service App
     */
    PAGE_CI: 1,
    PAGE_DEPLOY_SERVICE: 2,
    PAGE_CORDOVA_PLUGINS: 3,
    PAGE_WEB_COMPONENTS: 4,
    PAGE_SERVICE_INTEGRATION: 5,

    PAGE_ANDROID_BUILD: 6,
    PAGE_IOS_BUILD: 7,
    PAGE_ELECTRON_LINUX_BUILD: 8,
    PAGE_ELECTRON_MACOS_BUILD: 9,
    PAGE_ELECTRON_WINDOWS_BUILD: 10,
    PAGE_WINDOWS_BUILD: 11,
    // PAGE_CHROME_BUILD: 12,

    PAGE_ANDROID_APP_SETTINGS: 13,
    PAGE_IOS_APP_SETTINGS: 14,
    PAGE_ELECTRON_LINUX_APP_SETTINGS: 15,
    PAGE_ELECTRON_MACOS_APP_SETTINGS: 16,
    PAGE_ELECTRON_WINDOWS_APP_SETTINGS: 17,
    PAGE_WINDOWS_APP_SETTINGS: 18,
    // PAGE_CHROME_APP_SETTINGS: 19,

    PAGE_ANDROID_BUILD_SETTINGS: 20,
    PAGE_IOS_BUILD_SETTINGS: 21,

    PAGE_BUILD_RESULT: 22,

    PAGE_ANDROID_BUILD_DEBUGGER: 23,
    PAGE_IOS_BUILD_DEBUGGER: 24,
    PAGE_BUILD_HISTORY: 25,
    PAGE_WEB_BUILD: 26,
    PAGE_WEB_APP_SETTINGS: 27,
    PAGE_BUILD_ENVIRONMENT_SETTINGS: 28,
    PAGE_BUILD_CUSTOM_BUILD_SETTINGS: 29
  },

  ANALYTICS: {
    CATEGORY: 'monaca-cloud',
    ACTION: {
      ARCHIVE: 'archive',
      CLICK: 'click',
      CREATE: 'create',
      DELETE: 'delete',
      DUPLICATE: 'duplicate',
      IMPORT: 'import',
      OPEN: 'open',
      PUBLISH: 'publish',
      RUN: 'run',
      SELECT: 'select',
      SHARE: 'share',
      SHOW: 'show'
    },

    LABEL: {
      MENU: 'menu',
      PRODUCT: 'product',
      PROJECT: 'project',
      PROJECT_CREATE: 'project-create',
      PLAN_ARCHIVE: 'plan-archive'
    },

    VALUE: {
      CLI: 'cli',
      CLOUD: 'cloud',
      LOCALKIT: 'localkit',
      PREVIEW: 'preview',
      VISUALSTUDIO: 'vs',
      UPGRADE: 'upgrade'
    }
  },

  PLUGIN: {
    INAPP_UPDATER: 'io.monaca.plugins.inappupdater',
    INAPP_UPDATER_CORDOVA7: 'monaca-plugin-inappupdater',
    CROSSWALK: 'cordova-plugin-crosswalk-webview',
    ENCRYPTION: 'mobi.monaca.plugins.Encrypt',
    ENCRYPTION_CORDOVA7: 'monaca-plugin-encrypt'
  },

  PROJECT_TYPE: {
    CORDOVA: 'cordova',
    JAVASCRIPT: 'javascript',
    GENERIC: 'generic'
  },

  PLAN: {
    FREE: 'free',
    EDUCATION: 'education',
    PRO: 'pro',
    BUSINESS: 'business',
    ENTERPRISE: 'enterprise'
  },
  FRAMEWORK: {
    CORDOVA: 'cordova',
    REACT_NATIVE: 'react-native',
    GENERIC: 'generic'
  },

  /**
   * Available Page Views Service App
   */
  PAGE_CI: 1,
  PAGE_DEPLOY_SERVICE: 2,
  PAGE_CORDOVA_PLUGINS: 3,
  PAGE_WEB_COMPONENTS: 4,
  PAGE_SERVICE_INTEGRATION: 5,

  PAGE_ANDROID_BUILD: 6,
  PAGE_IOS_BUILD: 7,
  PAGE_ELECTRON_LINUX_BUILD: 8,
  PAGE_ELECTRON_MACOS_BUILD: 9,
  PAGE_ELECTRON_WINDOWS_BUILD: 10,
  PAGE_WINDOWS_BUILD: 11,
  PAGE_CHROME_BUILD: 12,

  PAGE_ANDROID_APP_SETTINGS: 13,
  PAGE_IOS_APP_SETTINGS: 14,
  PAGE_ELECTRON_LINUX_APP_SETTINGS: 15,
  PAGE_ELECTRON_MACOS_APP_SETTINGS: 16,
  PAGE_ELECTRON_WINDOWS_APP_SETTINGS: 17,
  PAGE_WINDOWS_APP_SETTINGS: 18,
  PAGE_CHROME_APP_SETTINGS: 19,

  PAGE_ANDROID_BUILD_SETTINGS: 20,
  PAGE_IOS_BUILD_SETTINGS: 21,

  PAGE_BUILD_RESULT: 22,

  PAGE_ANDROID_BUILD_DEBUGGER: 23,
  PAGE_IOS_BUILD_DEBUGGER: 24,
  PAGE_BUILD_HISTORY: 25,
  PAGE_WEB_BUILD: 26,
  PAGE_WEB_APP_SETTINGS: 27,
  PAGE_BUILD_ENVIRONMENT_SETTINGS: 28,
  PAGE_BUILD_CUSTOM_BUILD_SETTINGS: 29,

  LIMIT: {
    EDITOR_RELOAD_TRY_LIMIT: 5
  },

  TIMEOUT: {
    EDITOR_FILE_OPEN_RELOAD: 1000
  }
});

;angular.module('monacaIDE').factory('EnvironmentFactory', ['$q', 'EnvironmentService', 'UserFactory', function ($q, EnvironmentService, UserFactory) {
  var _data = {};

  // // Initializes the factories data.
  var _factoryPromise = $q.all([EnvironmentService.getConfigurations()]).then(function (resp) {
    _data = resp[0].result.client;
    return _data;
  });

  return {
    loading: _factoryPromise,

    get browser () {
      return _data.browser;
    },

    get service () {
      return _data.service;
    },

    showCliGuide: function () {
      if (!_data || !_data.service) return true; // fallback is true
      return _data.service.show_cli_guide;
    },

    showLocalKitGuide: function () {
      if (!_data || !_data.service) return true; // fallback is true
      return _data.service.show_localkit_guide;
    },

    canExportProject: function () {
      if (_data.service && _data.service.can_export_project_for_free_user) return true;
      return UserFactory.getSubscriptionInfo() !== 'Free';
    },

    showProjectTemplatePreview: function () {
      if (_data.service && _data.service.show_new_project_preview_button) return true;
      return false;
    },

    showAllNotifications: function () {
      if (_data.service && _data.service.show_all_notification) return true;
      return false;
    },

    showBlog: function () {
      if (_data.service && _data.service.show_blog) return true;
      return false;
    },

    showGravatarIcon: function () {
      if (_data.service && _data.service.show_gravata_icon) return true;
      return false;
    },

    showImportCordovaPlugin: function () {
      if (_data.service && _data.service.show_import_cordova_plugin) return true;
      return false;
    },

    getDefaultEditorConfiguration: function () {
      if (_data.service && _data.service.editor_configuration != null) return _data.service.editor_configuration;
      return null;
    },

    showMenuHeader: function (key) {
      if (_data.service && _data.service.show_menu_header && _data.service.show_menu_header[key] !== 'undefined') return _data.service.show_menu_header[key];
      return false;
    },

    getDefaultEditorTabSize: function () {
      if (!this.getDefaultEditorConfiguration() || !this.getDefaultEditorConfiguration()['tab_size']) return 2;
      return Number.parseInt(this.getDefaultEditorConfiguration()['tab_size'], 10);
    },

    getDefaultEditorFontFamily: function () {
      if (!this.getDefaultEditorConfiguration() || !this.getDefaultEditorConfiguration()['font_family']) return 'Ricty Diminished';
      return this.getDefaultEditorConfiguration()['font_family'];
    },

    defaultNewProjectType: function () {
      if (!_data.service || !_data.service.default_project_type) return false;
      return _data.service.default_project_type;
    },

    getOverriedSampleApps: function () {
      try {
        if (!_data.service || !_data.service.sample_apps || !_data.service.sample_apps.length) return false;
        return _data.service.sample_apps;
      } catch (e) {
        return false;
      }
    },

    hasDirectPreviewEnabled: function () {
      try {
        if (!_data.service || !_data.service.direct_preview) return false;
        return true;
      } catch (e) {
        return false;
      }
    },

    hasEducationDbEnabled: function () {
      try {
        if (!_data.service || !_data.service.education_db) return false;
        return true;
      } catch (e) {
        return false;
      }
    },

    useMenuHeaderForEdu: function () {
      try {
        if (!_data.service || !_data.service.use_menu_header_for_edu) return false;
        return true;
      } catch (e) {
        return false;
      }
    },

    showDsymSetting: function () {
      return _data.service && _data.service.show_dsym;
    },

    hasGitServiceEnabled: function () {
      if (!_data || !_data.service || !_data.service.vcs) return false;
      if (_data.service.vcs.hasOwnProperty('github') && _data.service.vcs.github) return true;
      if (_data.service.vcs.hasOwnProperty('gitssh') && _data.service.vcs.gitssh) return true;
      return false;
    },

    hasCordovaPluginManageEnabled: function () {
      return _data.service && _data.service.cordova_plugin_manage;
    },

    hasJsCssComponentEnabled: function () {
      return _data.service && _data.service.js_css_component;
    },

    hasServiceIntegrationEnabled: function () {
      return _data.service && _data.service.service_integration;
    },

    hasCIServiceEnabled: function () {
      return _data.service && _data.service.ci_service;
    },

    hasDeployServiceEnabled: function () {
      return _data.service && _data.service.deploy_service;
    },

    hasBuildService: function (platform) {
      return _data.service && _data.service.app_build[platform];
    },

    hasCustomDebugBuildService: function (platform) {
      return _data.service && _data.service.debugger_build[platform];
    },

    hasDetectUnsupportedBrowser: function () {
      return _data.browser && _data.browser['detect_unsupported'];
    },

    hasCheckChromeVersion: function () {
      return _data.browser && _data.browser['check_chrome_version'];
    },

    hasShowBanner: function () {
      return _data.service && _data.service.show_banner;
    },

    hasGoogleService: function () {
      return _data.service && _data.service.has_google_service;
    },

    getGoogleConfiguration: function () {
      return _data.service && _data.service.google_configuration;
    },

    getGoogleConfigurationAppId: function () {
      return this.getGoogleConfiguration() && this.getGoogleConfiguration()['app_id'];
    },

    getGoogleConfigurationPickerApiKey: function () {
      return this.getGoogleConfiguration() && this.getGoogleConfiguration()['picker_api_key'];
    },

    shouldShowAndroidAppUploader: function () {
      return _data.service && _data.service.show_android_upload;
    }

  };

}]);

;class CookieFactory {
  constructor () {
    /**
     * @deprecated Remove getCookie and setCookie usage
     */
    this.getCookie = this.get;
    this.setCookie = this.set;
  }
  /**
   * Return value of the cookie by key.
   *
   * @param {String} key Cookie's key
   */
  get (key) {
    let cookies = document.cookie.split(';');

    key = key + '=';

    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];

      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }

      if (cookie.indexOf(key) === 0) {
        return cookie.substring(key.length, cookie.length);
      }
    }
    return '';
  }

  /**
   * Set Cookie Key Value
   *
   * @param {*} key Cookie's key
   * @param {*} value Cookie's key value
   * @param {*} length Length in days to expire
   * @param {*} domain Domain
   */
  set (key, value, length, domain) {
    let date = new Date();
    date.setTime(date.getTime() + (length * 24 * 60 * 60 * 1000));

    let expires = 'expires=' + date.toUTCString();
    domain = 'domain=' + domain;

    document.cookie = key + '=' + value + ';' + expires + ';path=/' + ';' + domain;

    return this;
  }
}

CookieFactory.$inject = [];
angular.module('monacaIDE').factory('CookieFactory', CookieFactory);

;angular.module('monacaIDE').factory('ProjectFactory', ['$q', 'ProjectService', 'ProjectFileService', 'Constant', 'PubSub', '$routeParams', 'CommonFunctionService', function ($q, ProjectService, ProjectFileService, Constant, PubSub, $routeParams, CommonFunctionService) {
  // Data storage from the initializer of the factory.
  var _data = {};

  const filePaths = [
    '/src/App.vue',
    '/src/main.ts',
    '/src/main.jsx',
    '/src/app/app.ts',
    '/src/app/app.component.ts',
    '/src/app.js',
    '/src/main.js',
    '/src/public/index.html',
    '/src/public/index.html.ejs',
    '/src/index.html',
    '/index.html'
  ];

  const projectInfoPromise = new Promise(function (resolve, reject) {
    setTimeout(() => {
      if (!window.config.projectId && $routeParams.projectId) {
        window.config.projectId = $routeParams.projectId;
      }
      if (window.config.projectId) {
        ProjectService.getProjectInfo(window.config.projectId).then(resp => resolve(resp));
      }
    });
  });

  const checkFileExistPromise = new Promise(function (resolve, reject) {
    setTimeout(() => {
      if (!window.config.projectId && $routeParams.projectId) {
        window.config.projectId = $routeParams.projectId;
      }
      if (window.config.projectId) {
        ProjectFileService.isExist(filePaths).then(resp => resolve(resp));
      }
    });
  });

  var _factoryPromise = $q.all([projectInfoPromise, checkFileExistPromise]).then(function (resp) {
    _data = resp[0].body.result;
    let paths = resp[1].body.result;
    Object.keys(paths).forEach(key => {
      if (paths[key] && !_data.fileToOpen) _data.fileToOpen = key;
    });
  });

  return {
    loading: _factoryPromise,

    // Refetch and update data.
    _refetch: function () {
      $q.when(ProjectService.getProjectInfo(window.config.projectId)).then(function (resp) {
        _data = resp.body.result;
      });
    },

    /**
     * Initialize the Project Factory Data.
     */
    getUserName: function () {
      return _data.userName;
    },

    getProjectName: function () {
      return _data.projectName;
    },

    getProjectId: function () {
      return _data.projectId;
    },

    getApiToken: function () {
      return _data.apiToken;
    },

    getEnvironmentType: function () {
      return _data.env;
    },

    getLanguage: function () {
      return _data.lang;
    },

    getDefaultFileToOpen: function () {
      return _data.fileToOpen || '/www/index.html';
    },

    getIsSupportedCordova: function () {
      return _data.isSupportedCordova;
    },

    getHasServiceAnalytics: function () {
      return _data.service && _data.service.analytics;
    },

    getHasServiceCustomDebuggerOnly: function () {
      return _data.service && _data.service.custom_debugger_only;
    },

    getVcsServiceCollection: function () {
      return _data.service && _data.service.vcs ? _data.service.vcs : {};
    },

    getHasServiceVcsGitHub: function () {
      return _data.service && _data.service.vcs && _data.service.vcs.github;
    },

    getHasServiceVcsGitSsh: function () {
      return _data.service && _data.service.vcs && _data.service.vcs.gitssh;
    },

    getCustomUrl: function (key) {
      return _data.url && _data.url[key] ? _data.url[key] : false;
    },

    getInspectorUrl: function () {
      return _data.inspectorUrl;
    },

    getSubscriberUrl: function () {
      return _data.subscriberUrl;
    },

    hasVcsConfiguration: function () {
      return _data.has_vcs_configuration;
    },

    getVcsServiceType: function () {
      return _data.vcs_service_type || null;
    },

    setVcsServiceType: function (value) {
      /**
       * Update default value so that when controllers use new accurate values.
       */
      _data.vcs_service_type = value || null;
    },

    setHasVcsConfiguration: function (value) {
      /**
       * Update default value so that when controllers are initalized, new
       * values are used.
       */
      _data.has_vcs_configuration = value || false;

      /**
       * All exisiting controllers that are initialized should be notifed of
       * the new value so it can be updated in each controller.
       * Controllers that required this changed information should subscribe.
       */
      PubSub.publish(Constant.EVENT.CHANGE_CONFIG_VALUE_HAS_VCS_CONFIGS, value);
    },

    getFramework: function () {
      return _data.framework || Constant.FRAMEWORK.CORDOVA;
    },

    hasZipImportSupport: function () {
      return _data.service.upload_custom_cordova_plugin_zip;
    },

    getCordovaVersionList: function (isFormated) {
      if (!isFormated) {
        return _data.cordovaVersionList;
      }

      var format = [];

      for (var shortVersion in _data.cordovaVersionList) {
        format.push({
          value: shortVersion,
          name: _data.cordovaVersionList[shortVersion]
        });
      }

      return format;
    },

    getCordovaVersion: function () {
      return _data.cordovaVersion;
    },

    getCurrentCordovaVersion: function () {
      return _data.cordovaVersion;
    },

    getCordovaPlatformVersions: function (target) {
      return target ? (
        _data.cordovaPlatformVersions[target] || null
      ) : _data.cordovaPlatformVersions;
    },

    canChangeCordovaPluginVersion: function () {
      return _data.can_support_cordova_plugin_version_change;
    },

    getAndroidCustomDebuggerVersion: function () {
      return _data.androidCustomDebuggerVer;
    },

    getIosCustomDebuggerVersion: function () {
      return _data.iosCustomDebuggerVer;
    },

    getBackendId: function () {
      return _data.backendId;
    },

    getCanShareProject: function () {
      return _data.canShareProject;
    },

    getIsSupportOneTimePassword: function () {
      return _data.isSupportOneTimePassword;
    },

    getServiceEndpoint: function () {
      return _data.service_endpoint;
    },

    getStaticPreviewUrl: function () {
      return _data.previewUrl + '/www/index.html';
    },

    isGreaterCordovaVersion: function (version) {
      return parseInt(this.getCordovaVersion(), 10) > parseInt(version, 10);
    },

    isGreaterOrEqualCordovaVersion: function (version) {
      return parseInt(this.getCordovaVersion(), 10) >= parseInt(version, 10);
    },

    hasGitServiceEnabled: function () {
      if (!_data || !_data.service || !_data.service.vcs) return false;
      if (_data.service.vcs.hasOwnProperty('github') && _data.service.vcs.github) return true;
      if (_data.service.vcs.hasOwnProperty('gitssh') && _data.service.vcs.gitssh) return true;
      return false;
    },

    hasCordovaPluginManageEnabled: function () {
      return _data.service && _data.service.cordova_plugin_manage;
    },

    hasJsCssComponentEnabled: function () {
      return _data.service && _data.service.js_css_component;
    },

    hasServiceIntegrationEnabled: function () {
      return _data.service && _data.service.service_integration;
    },

    hasCIServiceEnabled: function () {
      return _data.service && _data.service.ci_service;
    },

    hasDeployServiceEnabled: function () {
      return _data.service && _data.service.deploy_service;
    },

    hasMonacaBackend: function () {
      return _data.service && _data.service.monaca_backend;
    },

    hasBuildService: function (platform) {
      return _data.service && _data.service.app_build && _data.service.app_build[platform];
    },

    hasAnyBuildService: function () {
      if (!_data.service || !_data.service.app_build) return false;
      for (let key in _data.service.app_build) {
        if (key && _data.service.app_build[key]) return true;
      }
      return false;
    },

    hasEitherPreviewerOrDebuggerService: function () {
      if (!_data.service) return false;
      if (_data.service.previewer || _data.service.debugger) return true;
      return false;
    },

    hasCustomDebugBuildService: function (platform) {
      return _data.service && _data.service.debugger_build[platform];
    },

    isGenericProject: function () {
      if (!CommonFunctionService.isMultipleLanguage()) return false;
      return _data.service.language_type === Constant.PROJECT_TYPE.GENERIC;
    },

    isCordovaProject: function () {
      if ((!CommonFunctionService.isMultipleLanguage() || !_data.service.language_type) && !this.isReactNativeProject()) return true;
      return _data.service.language_type === Constant.PROJECT_TYPE.JAVASCRIPT;
    },

    isReactNativeProject: function () {
      return this.getFramework() === Constant.FRAMEWORK.REACT_NATIVE;
    },

    hasDebuggerService: function () {
      return _data.service && _data.service.debugger;
    },

    hasPreviewerService: function () {
      if (!CommonFunctionService.previewerEnabled()) return false;
      return _data.service && _data.service.previewer;
    },

    isTranspileLogEnabled: function () {
      if (this.isGenericProject()) return false;
      return CommonFunctionService.isTerminalService();
    },

    showBuildEnvironmentSettingPage: function () {
      if (this.isCordovaProject() && this.isGreaterCordovaVersion(6)) {
        return true;
      } else if (this.isGenericProject()) {
        return false;
      } else {
        // it is not cordova/generic project. Or it is cordova project which lower cordova version
        return false;
      }
    },

    showElectronMacOsBuild: function () {
      return _data.showElectronMacOsBuild;
    },

    showElectronLinuxBuild: function () {
      return _data.showElectronLinuxBuild;
    },

    isFujitsuAdf: function () {
      return !!_data.isFujitsuAdf;
    },

    isAdminRole: function () {
      return _data.projectRole && _data.projectRole === 'admin';
    }

  };
}]);

;angular.module('monacaIDE').factory('UserFactory', ['$q', 'UserService', 'Constant', 'PubSub', function ($q, UserService) {
  // Data storage from the initializer of the factory.
  var _data = {};
  var _customerExperienceSettings = null;

  // Initializes the factories data.
  var _factoryPromise = $q.all([
    UserService.getSubscriptionInfo(),
    UserService.getCustomerExperienceSettings()
  ]).then(function (resp) {
    _data = resp[0].body.result;
    _customerExperienceSettings = resp[1];
  });

  const _defaultConfig = {
    feedback: true
  };

  function isEmpty (settings) {
    if (settings.constructor === Array) return true;
    if (settings.constructor === Object && Object.keys(settings).length === 0) return true;
    return false;
  }

  return {
    loading: _factoryPromise,

    canCreateNewTerminal: function () {
      return _data.canCreateNewTerminal;
    },

    canUseCompareEditor: function () {
      return _data.canUseCompareEditor;
    },

    hasVcsServiceCheck: function (service) {
      return _data.available_vcs_service && service && _data.available_vcs_service.hasOwnProperty(service) ? _data.available_vcs_service[service] : false;
    },

    canUseSnsService: function (service) {
      return _data.available_sns_service && service && _data.available_sns_service.hasOwnProperty(service) ? _data.available_sns_service[service] : false;
    },

    hasLinkedSnsAccount: function (service) {
      return _data.has_sns_account && service && _data.has_sns_account.hasOwnProperty(service) ? _data.has_sns_account[service] : false;
    },

    getDefaultCustormerExperienceSettings: function () {
      return _defaultConfig;
    },

    getCustomerExperienceSettings: function () {
      if (isEmpty(_customerExperienceSettings)) {
        return _defaultConfig;
      } else {
        return _customerExperienceSettings;
      }
    },

    setCustomerExperienceSettings: function (settings) {
      return UserService.setCustomerExperienceSettings(settings)
        .then(newSettings => {
          _customerExperienceSettings = settings;
          return settings;
        });
    },

    getSubscriptionInfo: function () {
      return _data.planName;
    },

    getIsNewsRead: function () {
      return _data.isNewsRead;
    },

    getInfo: function () {
      return _data;
    },

    isEducationAdmin: function () {
      if (_data && _data.organization && _data.organization.isEducationAdmin) return true;
      return false;
    },

    getUserId: function () {
      return _data.userId;
    }
  };
}]);

;angular.module('monacaIDE').service('EnvironmentService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Environment;

  return {
    getConfigurations: function () {
      return $q.when(Api.getConfigurations()).then(function (resp) {
        return resp.body;
      });
    },

    getBlog: function (lang) {
      return $q.when(Api.getBlog(lang)).then(function (resp) {
        return resp;
      });
    }
  };

}]);

;/**
 * This is a helper class to help preloading fonts
 * Used for e.g. monaca-terminal as it doesn't load the font in time,
 * therefore we must preload the used font before initializing the terminal.
 *
 * IMPORTANT:
 * This class has to contain all the fontfaces that are defined in src/sass/v2/_fonts.sass
 */
class FontFaceLoaderService {

  constructor () {

    this.fontFaces = [
      {
        fontFamily: 'DejaVu Sans Mono',
        src: `url('../fonts/DejaVuSansMono.woff2') format('woff2'), url('../fonts/DejaVuSansMono.ttf') format('truetype')`
      },
      {
        fontFamily: 'mplus-1mn-regular',
        src: `url('../fonts/mplus-1mn-regular.woff2') format('woff2'), url('../fonts/mplus-1mn-regular.ttf') format('truetype')`
      },
      {
        fontFamily: 'Source Code Pro',
        src: `url('../fonts/SourceCodePro-Regular.woff2') format('woff2'), url('../fonts/SourceCodePro-Regular.ttf') format('truetype')`
      },
      {
        fontFamily: 'Droid Sans Mono Slashed',
        src: `url('../fonts/DroidSansMonoSlashed.woff2') format('woff2'), url('../fonts/DroidSansMonoSlashed.ttf') format('truetype')`
      },
      {
        fontFamily: 'Ricty Diminished',
        src: `url('../fonts/RictyDiminished-Regular.woff2') format('woff2'), url('../fonts/RictyDiminished-Regular.ttf') format('truetype')`
      },
      {
        fontFamily: 'Courier New',
        src: `url('../fonts/courierNew.woff2') format('woff2'), url('../fonts/courierNew.ttf') format('truetype')`
      },
      {
        fontFamily: 'Monaco',
        src: `url('../fonts/monaco.woff2') format('woff2'), url('../fonts/monaco.ttf') format('truetype')`
      },
      {
        fontFamily: 'M+',
        src: `url('../fonts/mplus-1c-regular.woff2') format('woff2'), url('../fonts/mplus-1c-regular.ttf') format('truetype')`
      }
    ];
  }

  get defaultFontFace () {
    return this.fontFaces.find(face => face.fontFamily === 'Monaco');
  }

  loadFont (fontFamily) {
    const fontFace = this.fontFaces.find(face => face.fontFamily === fontFamily) || this.defaultFontFace;
    const font = new FontFace(fontFace.fontFamily, fontFace.src);
    return font.load()
      .then(() => {
        document.fonts.add(font);
      })
      .catch(() => {
        console.log(`Couldn't load FontFace for termial: ${fontFamily}`);
      });
  }
}

angular.module('monacaIDE').service('FontFaceLoader', FontFaceLoaderService);

;angular.module('monacaIDE').service('ProjectService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Project;
  var project_id = window.config.projectId;

  return {

    /**
     * Fetch Project Info
     *
     * @return {Promise} returns Object
     */
    getProjectInfo: function (projectId) {
      return Api.getProjectInfo(projectId);
    },

    /**
     * Save Project Properties
     *
     * @param {String} projectId ID of the Project
     * @param {Object} properties properties object
     *
     * @return {Promise} returns Object
     */
    saveProjectProperties: function (projectId, properties) {
      return $q.when(Api.saveProjectProperties(projectId, properties)).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Delete Project
     *
     * @param {String} projectId ID of the Project
     *
     * @returns {Promise} returns Object
     */
    deleteProject: function (projectId) {
      return $q.when(Api.deleteProject(projectId)).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Duplicate Project
     *
     * @param {String} projectId ID of the Project
     *
     * @returns {Promise} returns Object
     */
    duplicateProject: function (projectId) {
      return $q.when(Api.duplicateProject(projectId)).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Import Project
     *
     * @param {String} data Descriptor of project to be imported
     *
     * @returns {Promise} returns Object
     */
    importProject: function (data) {
      return $q.when(Api.importProject(data)).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Get Project Environment Settings
     *
     * @return {Promise} returns Object
     */
    getProjectEnvSetting: function (projectId) {
      return $q.when(Api.getProjectEnvSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Project Environment Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveProjectEnvSetting: function (projectId, params) {
      return $q.when(Api.saveProjectEnvSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Project Settings
     *
     * @return {Promise} returns Object
     */
    getProjectSetting: function (projectId) {
      return $q.when(Api.getProjectSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Project Editor Settings
     *
     * @return {Promise} returns Object
     */
    getEditorSetting: function (projectId) {
      return $q.when(Api.getEditorSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Project Editor Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveEditorSetting: function (projectId, params) {
      return $q.when(Api.saveEditorSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Terminal Settings
     *
     * @return {Promise} returns Object
     */
    getTerminalSetting: function (projectId) {
      return $q.when(Api.getTerminalSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Project Terminal Settings
     *
     * @return {Promise} returns Object
     */
    getProjectTerminalSetting: function (projectId) {
      return $q.when(Api.getProjectTerminalSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Terminal Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveTerminalSetting: function (projectId, params) {
      return $q.when(Api.saveTerminalSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Build Environment Settings
     *
     * @return {Promise} returns Object
     */
    getBuildEnvironmentSetting: function (projectId) {
      return $q.when(Api.getBuildEnvironmentSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Build Environment Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveBuildEnvironmentSetting: function (projectId, params) {
      return $q.when(Api.saveBuildEnvironmentSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Custom Build Tasks and Settings
     *
     * @return {Promise} returns Object
     */
    getCustomBuildTasks: function (projectId) {
      return $q.when(Api.getCustomBuildTasks(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Custom Build Tasks and Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveCustomBuildTasks: function (params) {
      return $q.when(Api.saveCustomBuildTasks(project_id, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Transpile Command Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveTranspileCommandSetting: function (projectId, params) {
      return $q.when(Api.saveTranspileCommandSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saved Project Terminal Settings
     *
     * @param {Object} params
     * @return {Promise}
     */
    saveProjectTerminalSetting: function (projectId, params) {
      return $q.when(Api.saveProjectTerminalSetting(projectId, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Reset Transpile Command Settings
     *
     * @return {Promise} returns Object
     */
    resetTranspileCommandSetting: function (projectId) {
      return $q.when(Api.resetTranspileCommandSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Reset Project Terminal Settings
     *
     * @return {Promise} returns Object
     */
    resetProjectTerminalSetting: function (projectId) {
      return $q.when(Api.resetProjectTerminalSetting(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Run Project on Monaca Debugger
     *
     * @return {Promise}
     */
    run: function (projectId) {
      return $q.when(Api.run(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get transpile project information
     *
     * @return {Promise} returns Object
     */
    getIsTranspile: function (projectId) {
      return $q.when(Api.getIsTranspile(projectId)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Get Project State
     *
     * @return {Promise} returns Object
     */
    getProjectState: function () {
      return $q.when(Api.checkProjectState(project_id)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Recover Project by reinstalling project dependencies
     *
     * @return {Promise} returns Object
     */
    recoverProject: function (projectId, fixes) {
      if (!projectId) projectId = project_id;
      return $q.when(Api.recoverProject(projectId, fixes)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Export Project to Google
     *
     * @return {Promise} returns Object
     */
    exportProjectToGoogle: function (projectId, settings) {
      if (!projectId) projectId = project_id;
      return $q.when(Api.exportProjectToGoogle(projectId, settings)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Duplicate and archive the project
     *
     * @return {Promise} returns Object
     */
    duplicateAndArchive: function () {
      return $q.when(Api.duplicateAndArchive(project_id)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Gets the open settings for a project (which stores safe_mode and lite_mode)
     *
     * @return {Promise} returns Object
     */
    getOpenSetting: function (project_id) {
      return $q.when(Api.getOpenSetting(project_id)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saves the open settings for a project (which stores safe_mode and lite_mode)
     *
     * @return {Promise} returns Object
     */
    saveOpenSetting: function (project_id, settings) {
      return $q.when(Api.saveOpenSetting(project_id, settings)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Gets the Direct Preview settings for a project
     *
     * @return {Promise} returns Object
     */
    getDirectPreviewSetting: function () {
      return $q.when(Api.getDirectPreviewSetting(project_id)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Saves the Direct Preview settings for a project
     *
     * @return {Promise} returns Object
     */
    saveDirectPreviewSetting: function (params) {
      return $q.when(Api.saveDirectPreviewSetting(project_id, params)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Disable project direct preview
     *
     * @return {Promise} returns Object
     */
    disableDirectPreview: function (project_id) {
      return $q.when(Api.disableDirectPreview(project_id)).then(function (resp) {
        return resp.body.result;
      });
    }

  };
}]);

;angular.module('monacaIDE').service('ProjectFileService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.ProjectFile;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    getFolderTree: function () {
      return Api.getFolderTree(project_id, {
        is_show_hidden: 1,
        is_show_deleted: 0
      }).then(function (resp) {
        var body = formatResponse(resp);
        if (body && body.result && body.result.items) {
          return $q.resolve(body);
        } else {
          return $q.reject(body);
        }
      }).catch(function (err) {
        return $q.reject(err);
      });
    },

    move: function (oldPath, newPath) {
      return Api.move(project_id, oldPath, newPath);
    },

    remove: function (path, success, fail) {
      return Api.remove(project_id, path);
    },

    isExist: function (path) {
      return Api.isExist(project_id, path);
    },

    mkdir: function (path) {
      return Api.mkdir(project_id, path);
    },

    save: function (path, content, contentFrom, templateId) {
      contentFrom = contentFrom || '';
      templateId = templateId || '';

      return Api.fileSave(project_id, path, content, contentFrom, templateId);
    },

    upload: function (path, file) {
      if (path === '#/') path = '/';
      return Api.fileUpload(project_id, path, file);
    },

    copy: function (oldPath, newPath) {
      return Api.copy(project_id, oldPath, newPath);
    },

    getFileReadUrl: function (path) {
      return Api.getFileReadUrl(project_id, path);
    },

    getDirExportUrl: function (path) {
      return Api.getDirExportUrl(project_id, path);
    },

    fileRead: Api.fileRead.bind(this, project_id),

    fileSave: Api.fileSave.bind(this, project_id),

    grep: function (keyword, isNotCaseSensitive, isRegEx) {
      return Api.grep(project_id, {
        keyword: keyword,
        is_ignorecase: isNotCaseSensitive,
        is_regex: isRegEx
      }).then(function (resp) {
        var body = formatResponse(resp);
        if (body && body.result) {
          return $q.resolve(body.result);
        } else {
          return $q.reject(body);
        }
      });
    }
  };
}]);

;angular.module('monacaIDE').service('UserService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.User;

  return {
    switchLanguage: function (language) {
      return $q.when(Api.switchLanguage(language)).then(function (resp) {
        // Response is already in JSON format and does not require formatting.
        return resp.body;
      });
    },

    clientList: function () {
      return $q.when(Api.clientList()).then(function (resp) {
        // Response is already in JSON format and does not require formatting.
        return resp.body;
      });
    },

    getProjects: function () {
      return $q.when(Api.getProjects()).then(function (resp) {
        return resp.body;
      });
    },

    getProjectsByType: function (type, page) {
      return $q.when(Api.getProjectsByType(type, page)).then(function (resp) {
        return resp.body;
      });
    },

    getTemplates: function () {
      return $q.when(Api.getTemplates()).then(function (resp) {
        return resp.body;
      });
    },

    getRepositories: function () {
      return $q.when(Api.getRepositories()).then(function (resp) {
        return resp.body;
      });
    },

    news: function () {
      return $q.when(Api.news()).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Fetch User Subscription Info
     *
     * @return {Promise} returns Object
     */
    getSubscriptionInfo: Api.info.bind(this),

    /**
     * Get the user's experience settings.
     *
     * @return {Promise} returns Object
     */
    getCustomerExperienceSettings: function () {
      return $q.when(Api.getCustomerExperienceServices()).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Generate one-time token session url for application package managment page
     *
     * @return {Promise} returns Object
     */
    getAppPackageSessionUrl: function () {
      return $q.when(Api.getAppPackageSessionUrl()).then(function (resp) {
        return resp.body;
      });
    },

    /**
     * Set the user's experience settings.
     *
     * @param {Object} options
     * @return {Promise}
     */
    setCustomerExperienceSettings: function (options) {
      return $q.when(Api.setCustomerExperienceServices(options)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
     * Check whether user has token access to google drive
     *
     * @return {Promise} returns Object
     */
    hasGoogleDriveAccess: function (type) {
      return $q.when(Api.hasGoogleDriveAccess(type)).then(function (resp) {
        return resp.body.result;
      });
    }

  };
}]);

;angular.module('monacaIDE').service('EducationAdminService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.EducationAdmin;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    getAccountList: function (options) {
      return $q.when(Api.getAccountList(options))
        .then(function (_resp) {
          let resp = formatResponse(_resp);
          if (!resp || !resp.result) {
            throw new Error();
          }
          return resp;
        });
    },

    resetPassword: function (userID) {
      return $q.when(Api.resetPassword(userID))
        .then(function (_resp) {
          let resp = formatResponse(_resp);
          if (!resp || !resp.result || !resp.result.newPassword) {
            throw new Error();
          }
          return resp;
        });
    }
  };

}]);

;angular.module('monacaIDE').service('CommonFunctionService', [
  'gettextCatalog',
  'UserService',
  'ProjectService',
  'ngToast',
  'PubSub',
  'Constant',
  '$uibModal',
  function (
    gettextCatalog,
    UserService,
    ProjectService,
    ngToast,
    PubSub,
    Constant,
    $modal
  ) {

    // google drive
    const pricingUrl = window.config.client[window.MonacaApi.Config.getLanguage()].url.plan_pricing;
    const upgradeText = window.MonacaApi.Config.getLanguage() === 'ja' ? `現在のプランではご利用いただけません。アップグレードは<a href="${pricingUrl}">こちら</a>` : `This feature is unavailable on your current plan. Please consider to <a href="${pricingUrl}">upgrade</a>.`;
    let appId;
    let oAuthToken;
    let developerKey;
    let projectId;
    const MIMETYPE = 'application/vnd.google-apps.folder';
    const GOOGLE_DRIVE_SCOPE = 'google_drive_scope_param';

    const onPickerApiLoad = () => {
      createPicker();
    };

    const linkToGoogleAccount = () => {
      window.location.href = `${window.config.client.host.web_host_ssl}/${window.MonacaApi.Config.getLanguage()}/google?scope=${GOOGLE_DRIVE_SCOPE}`;
    };

    const upgradePlanDialog = () => {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: 'static',
        resolve: {
          title: () => {
            return gettextCatalog.getString('Upgrade your current plan');
          },
          message: () => {
            return upgradeText;
          }
        }
      }).result
        .then((res) => {
          if (res) {
            window.location.href = pricingUrl;
          }
        });
    };

    const showErrorDialog = (title, message) => {
      $modal.open({
        templateUrl: 'commonDialogs/ErrorDialog.html',
        controller: 'ErrorDialogController',
        windowClass: 'error-dialog',
        resolve: {
          title: () => {
            return title;
          },
          message: () => {
            return message;
          },
          canClose: () => {
            return true;
          }
        },
        backdrop: 'static'
      });
    };

    const createPicker = () => {
      let view = new google.picker.DocsView(google.picker.ViewId.FOLDERS);
      const origin = window.location.protocol + '//' + window.location.host;
      view.setSelectFolderEnabled(true);
      view.setMimeTypes(MIMETYPE);
      let picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .disableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(appId)
        .setOAuthToken(oAuthToken)
        .addView(view)
        .setOrigin(origin)
        .setDeveloperKey(developerKey)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    };

    const exportProjectToGoogle = (param) => {
      ProjectService.exportProjectToGoogle(projectId, param).then(result => {
        document.body.style.cursor = 'default';
        if (result) {
          notification('success', gettextCatalog.getString('Export to Google Success'));
        } else {
          notification('danger', gettextCatalog.getString('Export to Google Failed'));
          showErrorDialog(
            gettextCatalog.getString('Export Error'),
            gettextCatalog.getString('An unknown error occurred while trying to access to the Server. Please try again.<br>If the error persists, please contact Monaca Support.')
          );
        }
      }).catch(error => {
        notification('danger', 'Export Failed');
        document.body.style.cursor = 'default';
        if (!error) return;
        if (error.status === 400) {
          showErrorDialog(
            gettextCatalog.getString('Export Error'),
            gettextCatalog.getString('Please select a folder to export')
          );
        } else if (error.status === 401) {
          upgradePlanDialog();
        } else {
          showErrorDialog(
            gettextCatalog.getString('Export Error'),
            gettextCatalog.getString('An unknown error occurred while trying to access to the Server. Please try again.<br>If the error persists, please contact Monaca Support.')
          );
        }
      });
    };

    const pickerCallback = (data) => {
      if (data && data.action === google.picker.Action.CANCEL) {
        notification('success', gettextCatalog.getString('Export to Google Canceled'));
      } else if (data && data.action === google.picker.Action.PICKED && data.docs[0]) {
        document.body.style.cursor = 'wait';
        let folder = data.docs[0];
        let param = {
          id: folder['id'],
          mime_type: folder['mimeType']
        };
        exportProjectToGoogle(param);
      }
    };

    const notification = (messageType, message) => {
      if (location.pathname.indexOf('editor') > -1) {
        ngToast.create({
          className: messageType,
          content: message
        });
      }
      PubSub.publish(Constant.EVENT.EXPORT_GOOGLE_PROJECT, {
        messageType: messageType,
        message: message
      });
    };

    return {
      serialize: function (obj, prefix) {
        var result = [];
        for (var key in obj) {
          var name = prefix ? prefix + '[' + key + ']' : key;
          var val = obj[key];
          result.push(typeof val === 'object' ? serialize(val, name) : encodeURIComponent(name) + '=' + encodeURIComponent(val));
        }

        return result.join('&');
      },

      htmlspecialchars: function (string, quote_style, charset, double_encode) {
        //       discuss at: http://phpjs.org/functions/htmlspecialchars/
        //      original by: Mirek Slugen
        //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //      bugfixed by: Nathan
        //      bugfixed by: Arno
        //      bugfixed by: Brett Zamir (http://brett-zamir.me)
        //      bugfixed by: Brett Zamir (http://brett-zamir.me)
        //       revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //         input by: Ratheous
        //         input by: Mailfaker (http://www.weedem.fr/)
        //         input by: felix
        // reimplemented by: Brett Zamir (http://brett-zamir.me)
        //             note: charset argument not supported
        //        example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES');
        //        returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
        //        example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES']);
        //        returns 2: 'ab"c&#039;d'
        //        example 3: htmlspecialchars('my "&entity;" is still here', null, null, false);
        //        returns 3: 'my &quot;&entity;&quot; is still here'

        var optTemp = 0;
        var i = 0;
        var noquotes = false;
        if (typeof quote_style === 'undefined' || quote_style === null) {
          quote_style = 2;
        }
        string = string.toString();
        if (double_encode !== false) {
          // Put this first to avoid double-encoding
          string = string.replace(/&/g, '&amp;');
        }
        string = string.replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        var OPTS = {
          'ENT_NOQUOTES': 0,
          'ENT_HTML_QUOTE_SINGLE': 1,
          'ENT_HTML_QUOTE_DOUBLE': 2,
          'ENT_COMPAT': 2,
          'ENT_QUOTES': 3,
          'ENT_IGNORE': 4
        };
        if (quote_style === 0) {
          noquotes = true;
        }
        if (typeof quote_style !== 'number') {
          // Allow for a single string or an array of string flags
          quote_style = [].concat(quote_style);
          for (i = 0; i < quote_style.length; i++) {
            // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
            if (OPTS[quote_style[i]] === 0) {
              noquotes = true;
            } else if (OPTS[quote_style[i]]) {
              optTemp = optTemp | OPTS[quote_style[i]];
            }
          }
          quote_style = optTemp;
        }
        if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
          string = string.replace(/'/g, '&#039;');
        }
        if (!noquotes) {
          string = string.replace(/"/g, '&quot;');
        }

        return string;
      },

      isMultipleLanguage: function () {
        if (window.config.client.service && window.config.client.service.multiple_language) return true;
        return false;
      },

      getWorkspaceConfigurationTitle: function () {
        if (this.isTerminalService()) return gettextCatalog.getString('Workspace Configuration');
        return gettextCatalog.getString('Editor Configuration');
      },

      isTerminalService: function () {
        if (!window.config.client.service.terminal) return false;
        try {
          // default, fallback -> true
          if (!window.location.search) return true;
          const urlParams = new URLSearchParams(window.location.search);
          const previewer = urlParams.get('terminal');
          // if ?terminal=0 or ?terminal=false is appended to the url
          if (previewer && (previewer === '0' || previewer === 'false')) return false;
          return true;
        } catch (err) {
          return true;
        }
      },

      previewerEnabled: function () {
        try {
          if (!window.location.search) return true;
          const urlParams = new URLSearchParams(window.location.search);
          const previewer = urlParams.get('previewer');
          // if ?preview=0 or ?preview=false is appended to the url
          if (previewer && (previewer === '0' || previewer === 'false')) return false;
          return true;
        } catch (err) {
          return true;
        }
      },

      setWaitCursor: function (wait) {
        if (wait) {
          document.body.style.cursor = 'wait';
        } else {
          document.body.style.cursor = 'default';
        }
      },

      isValidJson: function (content) {
        try {
          JSON.parse(content);
          return true;
        } catch (error) {
          return false;
        }
      },

      exportToGoogleDrive: (pProjectId, pAppId, pDeveloperKey) => {
        projectId = pProjectId;
        appId = pAppId;
        developerKey = pDeveloperKey;

        UserService.hasGoogleDriveAccess('export').then((data) => {
          if (!data) {
            notification('danger', gettextCatalog.getString('Export to Google Failed'));
            showErrorDialog(
              gettextCatalog.getString('Export Error'),
              gettextCatalog.getString('An unknown error occurred while trying to access to the Server. Please try again.<br>If the error persists, please contact Monaca Support.')
            );
          } else if (data['url']) {
            notification('success', gettextCatalog.getString('Requesting for permission to access Google drive'));
            $modal.open({
              templateUrl: 'commonDialogs/ConfirmDialog.html',
              controller: 'ConfirmController',
              backdrop: 'static',
              resolve: {
                title: function () {
                  return gettextCatalog.getString('Permission to Access Google Drive');
                },
                message: function () {
                  return gettextCatalog.getString('The application need access to your google drive. Do you wish to continue?');
                }
              }
            }).result
              .then(function (res) {
                if (res) window.location.href = data['url'];
              });
          } else if (data['access_token']) {
            oAuthToken = data['access_token'];
            if (oAuthToken) gapi.load('picker', { 'callback': onPickerApiLoad });
          }
        }).catch(function (err) {
          notification('danger', gettextCatalog.getString('Export to Google Failed'));
          if (!err || !err.status) return;
          if (err.status === 503) {
            showErrorDialog(
              gettextCatalog.getString('Service Unavailable'),
              gettextCatalog.getString('The service is not available in this system. Please try again.<br>If the error persists, please contact Monaca Support.')
            );
          } else if (err.status === 401) {
            upgradePlanDialog();
          } else if (err.status === 404) {
            $modal.open({
              templateUrl: 'commonDialogs/ConfirmDialog.html',
              controller: 'ConfirmController',
              backdrop: 'static',
              resolve: {
                title: function () {
                  return gettextCatalog.getString('Connect to Google Account');
                },
                message: function () {
                  return gettextCatalog.getString('You need to link to your Google account to continue this operation. Do you wish to continue?');
                }
              }
            }).result
              .then(function (res) {
                if (res) linkToGoogleAccount();
              });
          } else {
            showErrorDialog(
              gettextCatalog.getString('Export Error'),
              gettextCatalog.getString('An unknown error occurred while trying to access to the Server. Please try again.<br>If the error persists, please contact Monaca Support.')
            );
          }
        });
      },

      showErrorDialog: (title, message) => {
        return showErrorDialog(title, message);
      },

      upgradePlanDialog: () => {
        return upgradePlanDialog();
      },

      linkToGoogleAccount: () => {
        return linkToGoogleAccount();
      },

      versionCompare: function (v1 = '', v2 = '', options) {
        var lexicographical = options && options.lexicographical;
        var zeroExtend = options && options.zeroExtend;
        var v1parts = v1.split('.');
        var v2parts = v2.split('.');

        function isValidPart (x) {
          return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }

        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
          return NaN;
        }

        if (zeroExtend) {
          while (v1parts.length < v2parts.length) v1parts.push('0');
          while (v2parts.length < v1parts.length) v2parts.push('0');
        }

        if (!lexicographical) {
          v1parts = v1parts.map(Number);
          v2parts = v2parts.map(Number);
        }

        for (var i = 0; i < v1parts.length; ++i) {
          if (v2parts.length === i) {
            return 1;
          }

          if (v1parts[i] === v2parts[i]) {
            continue;
          } else if (v1parts[i] > v2parts[i]) {
            return 1;
          } else {
            return -1;
          }
        }

        if (v1parts.length !== v2parts.length) {
          return -1;
        }

        return 0;
      },

      parseNpmPackageName: (input) => {
        // Parsed a scoped package name into name, version, and path.
        const RE_SCOPED = /^(@[^\/]+\/[^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
        // Parsed a non-scoped package name into name, version, path
        const RE_NON_SCOPED = /^([^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
        const m = RE_SCOPED.exec(input) || RE_NON_SCOPED.exec(input);

        if (!m) {
          throw new Error(`[parse-package-name] invalid package name: ${input}`);
        }

        return {
          name: m[1] || '',
          version: m[2] || 'latest',
          path: m[3] || ''
        };
      }
    };
  }]);

;angular.module('monacaIDE').service('IDEHeaderMenuService', [
  'gettextCatalog',
  'EnvironmentFactory',
  function (
    gettextCatalog,
    EnvironmentFactory
  ) {
    return {
      getShareTitle: function () {
        if (EnvironmentFactory.useMenuHeaderForEdu()) return gettextCatalog.getString('Co-editing');
        return gettextCatalog.getString('Share...');
      },

      getExportZipTitle: function () {
        if (EnvironmentFactory.useMenuHeaderForEdu()) return gettextCatalog.getString('Export (Zip)');
        return gettextCatalog.getString('Export...');
      },

      getExportGoogleTitle: function () {
        if (EnvironmentFactory.useMenuHeaderForEdu()) return gettextCatalog.getString('Export (Google Drive)');
        return gettextCatalog.getString('Export to Google Drive...');
      },

      getPublishTitle: function () {
        if (EnvironmentFactory.useMenuHeaderForEdu()) return gettextCatalog.getString('Export (Web)');
        return gettextCatalog.getString('Publish...');
      }
    };
  }
]);

;angular.module('monacaIDE').service('Docs', [
  function () {
    var baseUrl = window.MonacaApi.Config.getLanguage() === 'en' ?
      window.config.client.host.monaca_doc_en_url : window.config.client.host.monaca_doc_ja_url;

    var list = {
      'top': '/',
      'environment': '/environment',
      'cli_overview': '/products_guide/monaca_cli/overview/',
      'keyboard_shortcut': '/products_guide/monaca_ide/editor/',
      // VCS
      'setup_vcs': '/products_guide/monaca_ide/version_control/github_integration/',
      'vcs_import_project': '/products_guide/monaca_ide/version_control/github_integration#importing-a-project-from-a-github-repository-to-monaca',
      'vcs_gitssh_integration': '/products_guide/monaca_ide/version_control/git_ssh_integration',
      // CI
      'ci_json_example': '/manual/monaca_ci/json_sample/',
      'ci_support_service': '/products_guide/monaca_ide/monaca_ci/supported_services',
      // CD
      'deploy_google_play': '/products_guide/monaca_ide/deploy/google_play',
      // Build
      'ios_build': '/maual/build/ios/build_ios',
      'android_build': '/products_guide/monaca_ide/build/build_android/',
      'guide_ios_build': '/products_guide/monaca_ide/build/ios/build_ios',
      // Plugin
      'inapp_updater': '/reference/power_plugins/in-app_updater/',
      // Debugger
      'debugger_features': '/products_guide/debugger/features',
      'install_debugger_android': '/products_guide/debugger/installation/debugger_android',
      'install_debugger_ios': '/products_guide/debugger/installation/debugger_ios',
      // Terminal
      'ide_terminal': '/products_guide/monaca_ide/terminal/#preview-log-and-preview-server',
      // Sample
      'tips_splashscreen': '/sampleapp/tips/splashscreen',
      // Release note
      'upgrade_cli_3': '/release_notes/20180918_monaca_cli_3.0',
      'release_note_cordova9': '/release_notes/20190627_cordova9',
      'release_note_cordova10': '/release_notes/20201119_cordova10'
    };

    Object.keys(list).map(function (key, index) {
      list[key] = baseUrl + list[key];
    });

    return {
      url: list
    };
  }]);

;angular.module('monacaIDE').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('ja', {"All Platforms":{"category":"すべて"},"One Time Password":{"header":"ワンタイムパスワード","$$noContext":"ワンタイム パスワード"},"Pulling":{"header":"プルを行っています"},"Pushing":{"header":"プッシュを行っています"},"Debugger":{"version":"Debugger","$$noContext":"デバッガー"},"Project":{"version":"Project","$$noContext":"プロジェクト"},"#000000":"#000000","&nbsp; - NSIS: it will generate an NSIS installer.":"&nbsp; - NSIS：NSISインストーラーを生成します。","&nbsp; - ZIP: it will pack everythings into a zip file.":"&nbsp; - ZIP: ZIP形式でビルド結果を生成します。","(Select \"arm\" or \"x86\" to switch crosswalk architecture.)":"※ Crosswalkのアーキテクチャを切り替えるには monaca:CrosswalkArchitecture に \"x86\" か \"arm\" を指定してください。","(in this project)":"(このプロジェクト内)","*":"*","*To use a high-performance version,":"※ハイパフォーマンス版を使用するには、","+ Add Build":"+ ビルドを追加","+ Add Deployment":"+ デプロイメントを追加","- Certification status ({{item.value}})":" - 証明書のステータス ({{item.value}})","- Provisioning status ({{item.value}})":" - プロビジョニングファイルのステータス ({{item.value}})","/master/ (Example)":"/master/ (例)","/v1.0.0/ (Example)":"/v1.0.0/ (例)","20 x 20 size icon will be required for iOS App Setting. You can upload the image on App Settings for iOS page.":"20 x 20サイズのアイコンがiOSアプリの設定に必要です。iOSアプリ設定画面から設定を行ってください。","<a ng-href=\"{{ docsUrl.tips_splashscreen }}\" target=\"_blank\">Hide by</a>":"<a href=\"{{ docsUrl.tips_splashscreen }}\" target=\"_blank\">スプラッシュ画像の消去方法</a>","<br>Please try again.<br>If the error persists, please contact Monaca Support.":"<br>もう一度お試しください。<br>エラーが解決しない場合は、Monacaサポートにお問い合わせください。","<code>{{ currentBranch.name }}</code> (current branch)":"<code>{{ currentBranch.name }}</code> （カレントブランチ）","<em><button class=\"m-btn m-btn-default\" ng-click=\"clickGenerateKeyStore()\"><span translate>Clear and Generate New</span></button></em>":"<em><button class=\"m-btn m-btn-default\" ng-click=\"clickGenerateKeyStore()\"><span translate=\"\">新しく生成する</span></button></em>","<em>{{service.name}}</em> was successfully installed.":"<em>{{service.name}}</em>は正常にインストールされました。","<em>{{service.name}}</em> will be installed to the project. Are you sure to continue?":"<em>{{service.name}}</em>をプロジェクトにインストールします。よろしいですか？","<img src=\"img/icon/icon_exclamation.png\"> Repositories can not be changed after setup.":"<img src=\"img/icon/icon_exclamation.png\"> 設定後に、リポジトリ変更はできません。","<input type=\"button\" value=\"Edit\" class=\"m-btn\" ng-click=\"openCiConfig(ciConfig)\">":"<input type=\"button\" value=\"編集\" class=\"m-btn\" ng-click=\"openCiConfig(ciConfig)\">","<p> New changes have been released with the new version of Monaca.</p>\n    <p> Your package.json will be modified for the updated preview feature. </p>":"<p> Monaca IDE プレビュー機能がアップデートされます。</p>\n<p>このアップデートにともなって、「package.json」が変更されます。</p>","<p>Only paid users can use this function. Please upgrade your subscription plan.</p>":"<p>有料ユーザーのみ利用できます。プランをアップグレードしてください。</p>","<p>Please click the button to download the project in a zip format. You may import the project later from the dashboard</p>":"<p>プロジェクトをzip形式でエクスポートします。エクスポートしたプロジェクトをMonacaで再度利用する場合は、ダッシュボードのインポート機能からZip形式でインポートしてください。</p>","<p>The previewer is not available in safe mode.</p>":"<p>プレビュー機能は、セーフモードでは利用できません。</p>","<p>This will restart your preview server container.</p>":"<p>プレビューサーバー用コンテナの再起動を行います。続行してもよろしいですか？</p>","<strong>Note:</strong> All other users who have imported your project prior to making the project private again, will keep their copy of the project!":"<strong>注：</strong>プライベートに変更する前にインポートされたプロジェクトは、そのまま利用し続けることができます。","A debug build can be created. <br> A registered Apple Developer Program developer certificate, and a Development Provisioning profile are required.":"デバッグ向けのビルドができます。<br />Apple Developer Programに登録されたデベロッパー証明書とDevelopmentプロビジョニングプロファイルが必要です。","A debugger for your device can be built.  <br> A debugger including Cordova plugins enabled in the Plugin Management screen can be built.  The operation of plugins not included in the store-version debugger can be checked. <br> USB debugging, and high-level debugging of Javascript using Monaca CLI or Localkit is possible.":"プラグイン管理画面で有効にしたCordovaプラグインを組み込んだデバッガーをビルドします。<br>ストア版デバッガーに含まれないプラグインの動作をチェックできます。<br />また、USBデバッグにも対応し、Monaca CLIやLocalkitを用いたJavaScriptの高度なデバッグが可能になります。","A debugger including Cordova plugins enabled in the Plugin Management screen can be built. The operation of plugins not included in the store-version debugger can be checked. Details <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">here</a>.":"プラグイン管理画面で有効化したCordovaプラグインを含むデバッガーをビルドします。<br>ストア版デバッガーに含まれないプラグインの動作をチェックできます。<br>詳細は <a href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">こちら</a>","A keystore created elsewhere will be imported, and an alias added. <br> Also, it can be exported to the local PC as a backup.":"別の場所で作成されたキーストアをインポートし、エイリアスを追加します。<br />また、エクスポートでローカルPC上にバックアップをとることができます。","A simulator build can be created.<br>This build will not use an Apple Developer certificate or provisioning profile.":"シュミュレータービルドができます。<br />Apple デベロッパー証明書やプロビジョニングプロファイルは必要ありません。","A storyboard splash screen uses one image for all screen sizes and crops it as necessary. You must use a storyboard to create full-screen apps on iPhone X.":"1つの画像で必要に応じてイメージをトリミングし、すべての画面サイズに適用させます。iPhone Xでフルスクリーンアプリを作成する場合は、オートリサイズモードを選択してください。","A successful build does not guarantee that your application will pass the regulation tests for\n                                uploading on an app store.":"※ ビルド成功は、iOS/Androidのストア申請（パッケージ申請）と審査通過を保証するものではございません。","A zip file will be created containing HTML5 assets used by the app to allow automatic updating without rebuilding or repacking.  <br> For this build, the InAppUpdater plugin must be included in the Cordova Plugin Settings screen. Please deploy the file to your web server.":"ビルドやストアへの提出を行わずに自動アップデートを行うためのHTML5アセットが含まれたZipファイルが作成されます。<br>このビルドを行うためには、Cordovaプラグイン画面にて、InAppUpdaterプラグインが有効になっている必要があります。作成されたファイルはWebサーバーにデプロイしてください。","A zip file will be created containing HTML5 assets used by the app to allow automatic updating without rebuilding or repacking.  <br> For this build, the Monaca In-App Updater plugin must be included in the Cordova Plugin Settings screen. Please deploy the file to your web server.":"アプリで使用しているHTML5アセットを、再ビルド・再パッケージ化を行わずにアプリを自動更新するためのZIPファイルを出力します。<br />このビルドには、Cordovaプラグインの管理画面からMonaca In-App Updaterプラグインを組み込む必要があります。<br />出力されたファイルは配置用Webサーバーへ配置してください。","ALIAS":"エイリアス","API Key:":"APIキー:","Abort Merge":"マージを中止","Abort Merge...":"マージを中止する...","Aborting Merge...":"マージを中止しています...","About Monaca Cloud":"Monaca Cloudについて","About Monaca Cloud...":"Monaca Cloudについて...","Account Manager":"アカウント管理","Action":"操作","Ad-hoc Build":"アドホックビルド","AdHoc Build":"アドホックビルド","Add":"追加","Add Alias":"エイリアスの追加","Add Deploy Service":"新しく追加する","Add New Alias":"新しいエイリアスを追加します。","Add New Deploy Service":"デプロイサービスを新しく追加する","Add User":"ユーザーを追加する","Add comment...":"コメント追加...","Add {{service.name}}":"{{service.name}}を追加する","Adding external deploy services allows you to save API tokens.\n          <br>These deployment services are accessible by various Monaca tools and services.":"外部のデプロイサービスを追加して、APIトークンを保存します。<br>デプロイサービスはMonacaの中で使う事ができます。","Advance Configurations":"詳細設定","Advanced Technical Support":"テクニカルサポート","Advanced Technical support":"テクニカルサポート","Advertisement":"広告","After connecting to GitHub, you can import from GitHub repositories.":"GitHubレポジトリからプロジェクトをインポートするには、GitHubとの連携設定を行ってください。","After connecting to Google, you can import project from Google drive":"Googleに接続したら、Googleドライブからプロジェクトをインポートできます","After correcting errors, please build again.":"エラーを修正した後で、再度ビルドを行ってください。","After the installation, please sign in using the same Cloud IDE account. The debugger will automatically connect to the cloud.":"インストール後、Monacaデバッガーを起動し、現在利用しているアカウントでログインしてください。ログイン後、IDEとの接続が始まります。","After the installation, please sign in using the same Monaca account. Monaca Debugger will automatically connect to the cloud.":"インストール後、Monacaデバッガーを起動し、現在利用しているアカウントでログインしてください。ログイン後、IDEとの接続が始まります。","After the installation, please sign in using the same account. Debugger will automatically connect to the cloud.":"インストール後、Monacaデバッガーを起動し、現在利用しているアカウントでログインしてください。ログイン後、IDEとの接続が始まります。","After upgrading Cordova version, you cannot downgrade to the previous version.":"Cordovaバージョンをアップグレードすると、前のバージョンに戻すことはできません。","Alias":"エイリアス","Alias Name :":"エイリアス名 :","Alias Name&nbsp;:":"エイリアス名&nbsp;:","Alias Password :":"エイリアスのパスワード :","Alias Password&nbsp;:":"エイリアスのパスワード&nbsp;:","Alias is the unique identifier for each configurations.":"エイリアスは設定を管理するための識別子となり、重複することはできません。","Alias password is not specified":"エイリアスのパスワードが入力されていません","Alias:":"エイリアス:","All":"すべて","Allowed URL:":"許可する外部URL:","Allowed URL:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">One hostname per line. It can also start with protocol (http://). If you specify [subdomains] after the hostname, all subdomains are applied.<br>Note that this field is common to Android and iOS.</i></span>":"許可する外部URL: <span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">1行ごとに1つのホスト名を指定します。プロトコル (http://) からはじめることもできます。ホスト名の後に [subdomains] と指定すると、すべてのサブドメインが対象になります。<br>この設定値はAndroidとiOSで共通です。</i></span>","Also, please use the Apple Developer Program and register the target device distribution certificate.":"また、Apple Developer Programを使用して、インストール先の端末が含まれたディストリビューション証明書を登録してください。","An Android app with a dummy signature will be built. <br> A debug-build application has no signature, so it cannot be registered in Google Play. See <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">here</a> for details.":"ダミー署名を用いてAndroidアプリをビルドします。<br />デバッグビルドされたアプリケーションはパッケージに署名がないため、Google Playに登録することはできません。詳細は<a href=\"{{ docsUrl.android_build }}\" target=\"_blank\">こちら</a>","An Electron {{ template }} application will be built.":"Electron {{template}}アプリケーションがビルドされます。","An Electron {{ template }} application with open Chrome DevTools will be built.":"デバッグ用Chrome DevToolsを備えたElectron {{template}} アプリケーションがビルドされます。","An email has been sent to your account.":"メールが登録されたアドレスに送信されました。","An error occurred while attempting to redirect you to the \"{{page_title}}\" page.":"\"{{page_title}}\"ページへのリダイレクト中にエラーが発生しました。","An error occurred while trying to initialize the Monaca Cloud. Please try again.<br>If the error persists, please contact Monaca Support.":"Monaca Cloudの初期化中にエラーが発生しました。もう一度お試しください。<br>エラーが解決しない場合は、Monacaサポートにお問い合わせください。","An unexpected error has occurred while fetching In-App Updater plugin settings. Please try again.":"In-App Updaterプラグインの設定取得に失敗しました。再度行ってください。","An unexpected error has occurred while fetching encrypt plugin settings. Please try again.":"暗号化プラグインの設定取得に失敗しました。再度行ってください。","An unexpected error has occurred while reading config.xml. Please fix config.xml file.":"config.xmlの読み込みに失敗しました。config.xmlを修正してください。","An unexpected error has occurred with the message of \"{{error_message}}\". Please try again.":"エラーが発生しました: {{error_message}}","An unexpected error has occurred with the message of '{{error_message}}'. Please try again.":"エラー '{{error_message}}' が発生しました。もう一度やり直してください。","An unexpected error occured while copying.":"コピー中に予期しないエラーが発生しました。","An unexpected error occured while creating folder.":"フォルダ作成中に予期しないエラーが発生しました。","An unexpected error occured while creating.":"作成中に予期しないエラーが発生しました。","An unknown error has occurred while attempting to distribute your app to the selected third-party service.":"選択されたサービスへのデプロイが失敗いたしました。","An unknown error has occurred. Please refresh and try again.":"不明なエラーが発生しました。リフレッシュしてもう一度お試しください。","An unknown error occurred while trying to access to the Server. Please try again.<br>If the error persists, please contact Monaca Support.":"不明なエラーが発生しました。もう一度お試しください。<br>エラーが続く場合は、Monacaサポートにお問い合わせください。","Analytics":"統計","Android":"Android","Android &gt;":"Android &gt;","Android AdHoc Build":"Androidアドホックビルド","Android Allowed URL will also be changed.":"Androidの「許可する外部URL」も変更されます。","Android App Configuration":"Androidアプリ設定","Android Application Name will also be changed.":"Androidのアプリケーション名も変更されます。","Android Debug Build":"Androidデバッグビルド","Android Debugger Build":"Androidデバッガービルド","Android InAppUpdater Build":"InAppUpdaterビルド","Android Overscroll configuration will also be changed.":"Androidのオーバースクロール設定も変更されます。","Android Package Name will also be changed.":"Androidのパッケージ名も変更されます。","Android Platform:":"Androidプラットフォーム:","Android Release Build":"Androidリリースビルド","Android/Windows Version will also be changed.":"Android/Windowsのバージョンも変更されます。","App":"アプリ","App Configuration":"アプリ設定","App Description is not used in cordova6.":"概要はcordova6では使用しません。","App Description:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate>App Description is not used in cordova6.</i></span>":"概要:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\" translate=\"\">概要はCordova6のプロジェクトでは使用されません。</i></span>","App Display Name:":"アプリ表示名:","App ID:":"App ID:","App Icon":"アプリアイコン","App Logo":"アプリロゴ","App Settings":"アプリの設定","App Settings for Android":"Androidアプリ設定","App Settings for Android...":"Androidアプリ設定...","App Settings for Electron":"Electronアプリ設定","App Settings for Linux":"Linuアプリ設定","App Settings for Linux...":"Linuxアプリ設定...","App Settings for PWA":"PWAアプリ設定","App Settings for PWA...":"PWAアプリ設定...","App Settings for Windows":"Windowsアプリ設定","App Settings for Windows...":"Windowsアプリ設定...","App Settings for iOS":"iOSアプリ設定","App Settings for iOS...":"iOSアプリ設定...","App Settings for macOS":"macOSアプリ設定","App Settings for macOS...":"macOSアプリ設定...","App Store distribution build. <br> A registered Apple Developer Program distribution certificate, and a Distribution (App Store) Provisioning profile are required.":"App Store配布向けのビルドです。<br />Apple Developer Programに登録されたディストリビューション証明書とDistribution(App Store)プロビジョニングプロファイルが必要です。","App build is failed. Your app cannot be built. Please make sure following settings are properly setup:":"アプリのビルドに失敗しました。次の項目を確認してください。","App icon, name, description, etc. can be set in the Web App Settings screen.":"アプリ設定画面でアプリのアイコンやスプラッシュ画像などの設定ができます。","App icon, splash screen, file version number etc. can be set in the Windows app settings screen.":"Windowsアプリ設定画面でアプリのアイコンやスプラッシュ画像、ファイルのバージョン番号などの設定が出来ます。","App icon, splash screen, file version number etc. can be set in the {{ template }} App Settings screen.":"{{ template }}アプリ設定画面でアプリのアイコンやスプラッシュ画像、ファイルのバージョン番号などの設定が出来ます。","App launch page is not saved.":"アプリ起動ページのファイルが存在しません。","Apple ID Email Address":"Apple IDのメールアドレス","Apple ID Name":"Apple IDのお名前","Application Description:":"アプリケーションの説明:","Application Display Preference":"アプリケーションの表示設定","Application GUID:":"アプリGUID:","Application Information":"アプリケーション情報","Application Name:":"アプリケーション名:","Application's display name.<br>Note that this field is common between all other platforms, except PWA.<br>\n                                    Submitting your app to store may fail if some symbols are included.":"アプリケーションの表示名です。<br>この項目はAndroidとiOSで共通となります。<br>また、一部の記号が含まれている場合、ストア申請に失敗する場合があります。","Application's display name.<br>Note that this field is common to Android and iOS.<br>\n                                    Submitting your app to store may fail if some symbols are included.":"アプリケーションの表示名です。<br>この項目はAndroidとiOSで共通となります。<br>また、一部の記号が含まれている場合、ストア申請に失敗する場合があります。","Apply":"適用する","Apply to Corporate Plan":"企業向けプランの問い合わせをする","Architecture:":"アーキテクチャ:","Archive":"アーカイブ","Archive Project":"プロジェクトのアーカイブ","Archived project cannot develop or build unless making it back online.":"アーカイブしたプロジェクトは開発やビルドができなくなります。","Are you sure to delete this CI config?":"このパッケージを削除しても良いですか?","Are you sure to delete this alias from KeyStore?":"キーストアからエイリアスを削除してもよろしいですか?","Are you sure to delete this certificate?":"この証明書を削除してもよろしいですか?","Are you sure to delete this package?":"このパッケージを削除しても良いですか?","Are you sure to delete this private key?":"この秘密鍵を削除してもよろしいですか?","Are you sure to delete this provisioning profile?":"このプロビジョニングプロファイルを削除してもよろしいですか?","Are you sure to export this file?":"このファイルをエクスポートしてもよろしいですか?","Are you sure to overwrite this file?":"このファイルを上書きしてもよろしいですか?","Are you sure to remove the KeyStore and all the aliases?":"キーストアとすべてのエイリアスが削除されます。よろしいですか?","Are you sure to remove the plugin? Removed plugins cannot be restored.":"プラグインを削除してもよろしいですか? 元に戻すことはできません。","Are you sure you want to delete this build history?":"このビルド履歴を削除しても良いですか?","Are you sure you want to remove this?":"本当に削除しますか?","Are you sure you would like to abort merge? This operation cannot be undone.":"マージを中止してもよろしいですか？この操作は元に戻せません。","Are you sure you would like to delete the deploy service configurations for \"{{alias}}\" for service type \"{{service}}\"?":"\"{{service}}\"サービスの\"{{alias}}\"を消去します。よろしいですか？","Are you sure you would like to delete {{file}}?":"{{file}}を削除してもよろしいですか？","Are you sure you would like to discard your local changes? This operation cannot be undone.":"ローカルの変更を破棄してもよろしいですか？この操作は元に戻せません。","Are you sure you would like to logout?":"ログアウトしてもよろしいですか？","Are you sure you would like to push?":"プッシュしてもよろしいですか？","Are you sure you would want to disable this plugin.":"このプラグインを無効にしてもよろしいですか?","Are you sure you would want to remove this component?":"このコンポーネントを無効にしてもよろしいですか?","As of December 31, 2021, The build service (Cordova 7.1) will be terminated.":"Cordova7系プロジェクトのビルドは、2021年12月31日にサポートを終了します。","Assignment Submission (Co-editing)":"課題提出（共同編集）","Assignment Submission (Web Release)":"課題提出（Web公開）","Attention: Please ensure that all unsaved changes have been saved before continuing.":"注意：続行する前に、未保存の変更がないか確認してください。","Auto Closing Brackets":"ブラケットの自動閉じ","Auto Indent":"自動インデント","Automates build and deployment cycle.":"アプリのビルドとデプロイメントを自動化します。","Automatically add indentation when needed":"自動でインデントする","Automatically add matching close bracket upon typing":"自動で閉じ括弧を挿入する","Available Build Tasks":"利用可能なビルドタスク","Available Plugins":"利用可能なプラグイン","Available Tickets":"今月の継続的インテグレーション実行状況","BETA":"BETA","Back":"戻る","Backend":"バックエンド","Background Color:":"背景色:","Base Folder:":"フォルダ:","Batch Build Name":"バッチビルド名","Batch Builds":"バッチビルド","Batch build is deleted.":"バッチビルドが削除されました","Batch build is saved.":"バッチビルドが保存されました","Before switching to the old IDE version, please make sure all files have been saved.":"旧IDEバージョンに切替える前に、ファイルが保存されていることを確認してください。","Before the update, duplicate of the project is saved in archive list and a backup of package.json is created and saved as package.json.backup in this project. <br> If your project use a lot of modules / libraries, update processing may take more than 5 minutes.":"※ 更新の前に、プロジェクトの複製がアーカイブリストに保存されます。また、更新前のpackage.jsonも「package.json.backup」としてバックアップされます。<br> 利用しているモジュール/ライブラリが多い場合は、アップデート処理に5分以上かかる場合がございます。","Blank":"最小限のテンプレート","Blank Application":"空のアプリケーション","Blog":"ブログ","Branch":"ブランチ","Branch / Tag":"ブランチ / タグ","Browse":"参照する","Browse the zip archive of your project from your Google drive":"Googleドライブからプロジェクトのzipアーカイブを参照します","Browse the zip archive of your project from your computer":"お使いのパソコンからZIP形式のプロジェクトを選択してください","Build":"ビルド","Build &amp; Build Settings":"ビルド/ビルド設定","Build Android App":"Androidアプリのビルド","Build App for Android":"Androidアプリのビルド","Build App for Android...":"Androidアプリのビルド...","Build App for Linux":"Linuxアプリのビルド","Build App for Linux...":"Linuxアプリのビルド...","Build App for PWA":"PWAアプリのビルド","Build App for PWA...":"PWAアプリのビルド...","Build App for Windows":"Windowsアプリのビルド","Build App for Windows...":"Windowsアプリのビルド...","Build App for iOS":"iOSアプリのビルド","Build App for iOS...":"iOSアプリのビルド...","Build App for macOS":"macOSアプリのビルド","Build App for macOS...":"macOSアプリのビルド...","Build Environment Settings":"ビルド環境の設定","Build Environment Settings...":"ビルド環境の設定…","Build Flag":"ビルドフラグ","Build History":"ビルド履歴","Build History...":"ビルド結果一覧...","Build Log":"ビルドログ","Build PWA App":"PWAアプリのビルド","Build Package Option":"ビルド・パッケージ種別","Build Results":"ビルド結果","Build Setting Warnings":"アプリ設定のアラート","Build Settings":"ビルドの設定","Build Settings for Android":"Androidビルド設定","Build Settings for iOS":"iOSビルド設定","Build Settings for iOS...":"iOSビルド設定…","Build Task Result":"ビルドタスク 結果","Build Tasks":"ビルドタスク","Build Windows App (preview version)":"Windowsアプリのビルド（プレビュー）","Build and Install":"ビルドとインストール","Build for Debugging":"デバッグ向けビルド","Build for Release":"リリース向けビルド","Build for built-in platforms supported by Monaca.":"ビルトインのプラットフォームに対してビルドを行います。Monacaによってサポートされています。","Build for user-defined platforms.":"ユーザ定義のプラットフォームに対してビルドを行います。","Build iOS App":"iOSアプリのビルド","Build task is deleted.":"ビルドタスクが削除されました","Build task is saved.":"ビルドタスクが保存されました","Build {{ template }} App":"{{template}}アプリのビルド","Building...":"ビルド中…","Builds":"ビルド","Bundle Version Number:":"バンドルバージョン:","CI Configs\n          <input type=\"button\" value=\"Create New\" class=\"m-btn m-btn-green\" style=\"margin-left: 20px;\" ng-click=\"openCiConfig()\">":"CI 設定\n          <input type=\"button\" value=\"作成\" class=\"m-btn m-btn-green\" style=\"margin-left: 20px;\" ng-click=\"openCiConfig()\">","CI History":"継続的インテグレーション結果一覧","CI History...":"継続的インテグレーション結果一覧...","CI Tickets:":"CIチケット:","CI config was deleted successfully.":"削除されました。","CI config was saved successfully.":"保存されました。","CLI Version\n              <span class=\"m-tooltip-body icon-help\">\n                <i class=\"m-tooltip tt-text-leftside\" translate>After upgrading Cordova version, you cannot downgrade to the previous version.</i>\n              </span>":"CLIバージョン\n              <span class=\"m-tooltip-body icon-help\">\n                <i class=\"m-tooltip tt-text-leftside\" translate=\"\">Cordovaバージョンをアップグレードすると、前のバージョンには戻せません。</i>\n              </span>","CSR has been generated":"CSR情報が生成されました","CSR has been generated. <br>Please upload generated CSR to Apple Developer Program to issue certificate.":"CSR情報が生成されました。<br>生成されたCSRをApple Developer Programにアップロードし、証明書の発行を行ってください。","CSR(iOS) Export":"CSR情報(iOS)のエクスポート","CSS":"CSS","CSV Download (All)":"全アカウントをCSVダウンロード","Can't find repositories?":"リポジトリが見つからない場合","Cancel":"キャンセル","Cannot apply Customer Experience settings.":"設定の保存に失敗しました。","Cannot apply preview command setting.":"プレビューコマンドの設定に失敗しました。","Cannot apply workspace configurations.":"ワークスペース設定の適用に失敗しました。","Cannot contain *":"*を含めることはできません。","Cannot reset setting to default.":"設定のリセットに失敗しました。","Cannot start with ’&amp;’ and ’@’.":"＆と@を使用することはできません。","Case sensitive":"大文字と小文字を区別","Category:":"カテゴリ:","Category：":"カテゴリ:","Certificate":"証明書","Certificate and Profiles":"証明書とプロファイル","Certificate has expired.":"証明書の期限が切れています","Certificate is not registered.":"証明書が登録されていません。","Certificates registered in Monaca":"Monacaに登録された証明書","Change":"変更","Change End of Line sequence:":"改行コードを変更する:","Changed Files":"変更されたファイル","Changing your splash screen type will modify your config.xml. Do you want to continue?":"スプラッシュスクリーン 設定モードを変更すると、config.xmlが変更されます。よろしいですか？","Check Answer":"答え合わせ","CheckUpdate URL:":"CheckUpdate URL:","Choose CLI version and plugins for the selected version are shown.":"指定されたCordovaバージョンに含まれるCLIとプラグインのバージョンが表示されます。","Class":"授業","Clean and reinstall project dependencies.":"プロジェクトの再セットアップを行います。","Clear":"クリア","Clear Cache &amp; Save":"アップデート","Clear Selection":"選択解除","Clear and Generate New":"新しく生成する","Click to add comment...":"クリックしてコメント追加","Clone one of our complex sample applications. This is good for beginners for experimentation.":"サンプルのアプリケーションからプロジェクトを作成します。","Close":"閉じる","Close All Tabs":"全てのタブを閉じる","Close Other Tabs":"このタブ以外を閉じる","Cloud Development":"クラウド開発","Co-editing":"共同編集","Command Line Interface for Local Development":"コマンドラインツールを使う（ローカル開発）","Command Palette":"コマンドパレット","Commit":"コミット","Commit...":"コミット...","Committer Email:":"コミッターメールアドレス:","Committer Name:":"コミッター名:","Committing File Changes":"ファイルの変更をコミット","Community":"コミュニティ（teratail）","Community Forum":"コミュニティ","Component Name":"コンポーネント名","Components":"コンポーネント","Config Alias:":"エイリアス名:","Configure":"設定","Configure CI Configs":"CIを設定する","Configure required properties for building application.":"App IDやパッケージ名、アイコンなど、ビルドに必要なアプリケーション設定を行います。","Configure your project to automate build & deployment when GitHub repository has been updated.":"GitHubリポジトリが更新されたときに、ビルドとデプロイメントを自動化します。","Configured Deploy Services":"連携中のデプロイサービス一覧","Confirm":"確認","Confirm Delete":"削除","Confirm Deletion":"削除の確認","Confirm New Password:":"新しいパスワード（確認）:","Conflicted":"コンフリクト","Congratulations!":"おめでとうございます","Connect GitHub Account":"GitHubアカウントと接続します。","Connect to GitHub":"GitHub連携設定を行う","Connect to Google":"Googleに接続","Connect to Google Account":"Googleアカウントに接続する","Connect your Account":"アカウントと接続する","Connecting your project to a repository will allow you to version control your files. To use this feature, please select a git service provider below.":"プロジェクトをリモートレポジトリと関連付けることで、プロジェクトのファイルをバージョン管理できるようになります。この機能で使うGitサービスを以下から選んで下さい。","Connection closed":"接続が終了しました","Contact Us":"お問い合わせ","Continuous Integration":"継続的インテグレーション","Continuous Integration\n                        <sup class=\"beta\">BETA</sup>":"継続的インテグレーション<sup class=\"beta\">BETA</sup>","Continuous Integration History":"継続的インテグレーション結果一覧","Continuous Integration...":"継続的インテグレーション...","Copy":"コピー","Copy File":"ファイルをコピー","Copying from the original editor is restricted.":"元ファイルからのコピーが禁止されています。","Cordova Plugin Settings":"Cordovaプラグインの管理","Cordova Plugin Settings...":"Cordovaプラグインの管理...","Cordova Plugin:":"Cordovaプラグイン:","Cordova Plugins":"Cordovaプラグイン","Cordova Version:":"Cordovaバージョン","Cordova5 projects and below will not display a realtime log.":"Cordova5以下のプロジェクトではリアルタイムログは表示されません。","Country:":"国コード","Create Empty Repository":"空白のレポジトリを作成する","Create Folder":"新規フォルダーの作成","Create KeyStore and Alias":"キーストアとエイリアスの作成","Create New File":"新規ファイルの作成","Create New KeyStore and Alias":"新しいキーストアとエイリアスを作成します。","Create New Project":"新しいプロジェクトを作る","Create Project":"作成","Create a totally blank applicaton without any frameworks.":"フレームワークを利用しない空白のプロジェクトを作成します。","Create your application from one of our templates based on different frameworks.":"フレームワークが入っているテンプレートからプロジェクトを作成します。","Created:&nbsp;":"作成日時:&nbsp;","Creates a zip archive containing all files and export to Google drive.":"Zip形式のアーカイブとしてプロジェクトのファイル一式をGoogleドライブにエクスポートします。","Creates a zip archive containing all files in the project.":"Zip形式のアーカイブとしてプロジェクトのファイル一式をエクスポートします。","Crosswalk Architecture is not set. Please select Architecture in \"Crosswalk WebView Engine\" Configure in Cordova Plugin page.":"Crosswalk用アーキテクチャが設定されていません。「Cordovaプラグイン」 => 「Crosswalk WebView Engine」 => 「設定」 からアーキテクチャを選択してください。","Crosswalk Engine":"ハイパフォーマンスWebView（Crosswalkエンジン）","Crosswalk Version:":"Crosswalkバージョン:","Crosswalk is no longer supported on Monaca using Cordova 7. If you have the Crosswalk plugin installed, it will be removed during the upgrade.":"Crosswalkプラグインは、Cordova 7からサポート対象外となります。Crosswalkプラグインがインストールされている場合は、アップグレード中に削除されます。","Current KeyStore and all the aliases will be lost. Are you sure to continue?":"既存のキーストアとすべてのエイリアスが消去されます。続けてもよろしいですか？","Current Repository:":"リポジトリ：","Current Working Branch:":"現在のブランチ:","Current plan does not allow release build. Please refer to\n                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB)+'/plan/manage', '_blank'); return false;\">pricing</a> for details.":"このプランではリリースビルドができません。詳細は \n                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB)+'/plan/manage', '_blank'); return false;\">プランの詳細</a> を参照してください。","Current plan does not provide release build. Please refer to\n                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) +'/plan/manage', '_blank'); return false;\">pricing page</a> for details.":"このプランではリリースビルドができません。詳細は \n                            <a href=\"#\" onclick=\"window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB)+'/plan/manage', '_blank'); return false;\">プランの詳細</a> を参照してください。","Cursor Blink":"カーソルの点滅","Cursor Style":"カーソルの形状","Custom Build Settings":"カスタムビルドの設定","Custom Build Settings...":"カスタムビルドの設定","Custom built debugger will include third-party Cordova plugins that have been added to the project. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">See details.</a>":"カスタムビルド版デバッガーには、プロジェクトに追加されたサードパーティのCordovaプラグインが含まれます。詳細は<a href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">こちら</a>。","Custom built debugger will include third-party Cordova plugins that have been added to the project. Provides USB debugging under local development. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See details</a>":"カスタムビルドのデバッガには、プロジェクトに追加されたサードパーティのCordovaプラグインが含まれます。 ローカル開発では、USBデバッグをご利用いただけます。 詳細は、<a href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">こちら</a>。","Customer Experience":"その他環境設定","Cut":"切り取り","DB":"データベース","Debug":"デバッガー","Debug Build":"デバッグビルド","Debugger Build":"デバッガービルド","Debugger Not Found":"Debuggerが見つかりません","Debugger Tab":"デバッガー タブ","Debugger for Android":"Android用 Monaca デバッガー","Debugger for iOS":"iOS用 Monaca デバッガー","Decrease Font Size":"フォントサイズを小さく","Delete":"削除","Delete Deploy Service Configurations":"デプロイサービス設定を消去する","Delete project":"プロジェクトの削除","Deleted":"削除","Deleting...":"削除しています…","Dependent on other package.":"他のパッケージに依存しています","Deploy":"デプロイ","Deploy Service":"デプロイサービス","Deploy Service...":"デプロイサービス...","Deploy Service:":"デプロイサービス：","Deploy Services":"デプロイサービス","Deploy Services\n                        <sup class=\"beta\">BETA</sup>":"デプロイサービス\n                        <sup class=\"beta\">BETA</sup>","Deploy URL:":"デプロイURL:","Deploy service transfers the built app to connecting services.":"デプロイサービスを使うと、ビルドしたアプリを別のサービスに転送することができます。","Deployment &amp; Optional Services":"デプロイ&amp; オプションサービス","Deployments":"デプロイメント","Description":"説明","Description:":"説明:","Desktop App (GUI) for Local Development":"デスクトップアプリを使う（ローカル開発）","Details":"詳細を見る","Develop":"開発","Developer":"開発者","Device Preview":"プレビュー","Device WebView (default)":"システムのWebView（デフォルト）","Disable":"無効","Disable bouncing in WebView.<br>Note that this field is common to Android and iOS.":"WebViewのバウンス機能を無効にします。<br>この項目はAndroidとiOSで共通です。","Disabled":"無効","Disallow Overscroll:":"オーバースクロールを無効:","Disallow Overscroll:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Disable bouncing in WebView.<br>Note that this field is common to Android and iOS.</i></span>":"オーバースクロールを禁止: <span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">WebViewのバウンスを無効にします。<br>この項目はAndroidとiOSで共通です。</i></span>","Discard":"破棄","Discard Local Changes":"ローカルの変更を破棄する","Discard Local Changes...":"ローカルの変更を破棄する...","Discarding Local Changes...":"ローカルの変更を破棄しています..","Display Minimap":"ミニマップ表示","Display Time:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Specify how long the splash will be present (in milliseconds).</i></span>":"表示時間:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">スプラッシュが表示される時間を指定します。(ミリ秒)</i></span>","Display:":"表示:","Do you want to reset the layout? This will reload the IDE.":"レイアウトをリセットしますか？リセットするとIDEをリロードします。","Documentation":"ドキュメントを参照する","Documents":"ドキュメント","Download":"ダウンロード","Download Application Package":"アプリパッケージダウンロード","Download CSR":"CSRのダウンロード","Download Package":"パッケージダウンロード","Download URL:":"ダウンロードURL:","Download dSYM file":"dSYMファイルのダウンロード","Download log":"ログのダウンロード","Download to Local PC":"ローカルPCに<br />ダウンロード","Drag &amp; Drop files here":"ファイルをドロップしてください","Drag and Drop":"ドラッグ&ドロップ","Duplicate":"複製する","Duplicate project":"プロジェクトの複製","E-mail address":"メールアドレス","Edit":"編集","Edit Batch Build":"バッチビルドの編集","Edit CI Config":"CIを設定する","Edit Task":"タスクの編集","Editor Configuration":"エディター設定","Email":"メールアドレス","Email Address:":"メールアドレス:","Email address:":"メールアドレス:","Enable":"有効","Enable AndroidX:":"AndroidXを有効にする:","Enable Viewport Scale:":"ビューポート制御を有効:","Enable the crosswalk plugin in Cordova plugins page.":"Cordova設定画面から「Crosswalk WebView Engine」を有効にしてください。","Enabled":"有効","Enabled Plugins":"有効なプラグイン","Encryption plugin password is not set.":"暗号化プラグインのパスワードが設定されていません。","Enter email addresses (one per line)...":"メールアドレスを入力してください（1行に1アドレス）…","Enter email addresses...":"メールアドレスを入力してください…","Enter the Bundle Version Number which specifies the build version number of the bundle.":"そのバンドルのビルドバージョン番号となるバンドルバージョン番号を入力してください。","Enter the Version Number which you specified in App Store Connect.<br>Note that this field is common to Android and iOS.":"App Store Connectで指定したバージョン番号を入力してください。<br>この項目はAndroidとiOSで共通です。","Error Resolution:":"エラーの解決方法、～を行ってください","Error occured.":"エラーが発生しました。","Events":"イベント情報","Example Answer":"解答例","Example Answer (read-only)":"解答例（読み取り専用）","Execution":"実行処理","Existing project will be copied and saved as another project.":"既存のプロジェクトは別のプロジェクトとして複製し保存されます。","Expire at:":"有効期限:","Export":"エクスポート","Export (Google Drive)":"エクスポート(Google)","Export (Web)":"エクスポート(Web)","Export (Zip)":"エクスポート(zip)","Export Developer Certification(iOS)":"開発者証明書のエクスポート（iOS）","Export Error":"エクスポートが失敗しました","Export Folder":"フォルダーをエクスポート","Export KeyStore (Android)":"キーストアのエクスポート（Android）","Export Package Certificate Key":"パッケージ証明書キーのエクスポート","Export Previous Private Key and Cerificates":"以前の秘密鍵と証明書のエクスポート","Export Project to Google Drive":"Googleドライブにエクスポート","Export developer cert":"開発者証明書のエクスポート","Export distribution cert":"ディストリビューション証明書のエクスポート","Export previous certificate":"以前の証明書をエクスポート","Export previous private key and certificate.":"以前のIDEで作成した秘密鍵、証明書をエクスポートします。","Export project":"プロジェクトのエクスポート","Export to Google Canceled":"Googleドライブへのエクスポートがキャンセルされました","Export to Google Drive...":"Googleドライブにエクスポート…","Export to Google Failed":"Googleドライブへのエクスポートが失敗しました","Export to Google Success":"Googleドライブへのエクスポートが成功しました","Export...":"エクスポート...","Exporting Project":"プロジェクトのエクスポート","Exporting...":"エクスポート中です...","External service API tokens can be saved, according to the deployment method used (Monaca-provided\n                                upload to App Store Connect or deploy service settings). These deployment services can be accessed\n                                from various Monaca functions.":"App Store Connectへのアップロード機能や、外部サービスとの連携によるデプロイ機能やセキュリティ診断機能を利用することができます。","Fade Splash Screen:":"スプラッシュ画像をフェードアウト:","Failed to Create Alias":"エイリアスの作成に失敗しました","Failed to Find Debugger":"Monacaデバッガが見つかりません","Failed to Find Monaca Debugger":"Monacaデバッガが見つかりません","Failed to change Cordova version.":"Cordovaバージョンの変更に失敗しました。","Failed to check the existence of":"次のファイルの存在を確認できませんでした:","Failed to detect file changes. Please refresh the preview panel for latest change.":"ファイル変更の検出に失敗しました。プレビュー画面を再読み込みしてください。","Failed to disable share access to this project!":"Web公開を停止できませんでした!","Failed to fetch data":"データの取得に失敗しました","Failed to install \"{{service}}\" service. One or more dependencies has failed to install.":"{{service}} サービスのインストールに失敗しました。依存された機能のインストールに失敗しました。","Failed to install custom Cordova plugin.":"カスタムCordovaプラグインのインストールに失敗しました。","Failed to load":"読み込みに失敗しました:","Failed to move {{oldFilePath}} to {{newFilePath}}.":"{{oldFilePath}}を{{newFilePath}}に移動できませんでした。","Failed to process the data. Please make sure the file and folder is valid and existed.":"保存できません。入力値が有効かつ存在することを確認してください。","Failed to reload CI configs.":"CI設定の再読み込みに失敗しました。","Failed to remove the shared project from the list!":"プロジェクト一覧から削除できませんでした!","Failed to rename file because of invalid characters.":"無効な文字のためにファイル名を変更できませんでした。","Failed to restart terminal.":"ターミナルの再起動に失敗しまし。","Failed to retrieve project file information. Please try again. If the problem persists, please contact our support team.":"プロジェクトファイルの取得に失敗しました。問題が引き続き発生する場合はお問い合わせください。","Failed to save":"ファイルの保存に失敗しました","Failed to save CI config.":"ファイルの保存に失敗しました","Failed to save Cordova plugin settings.":"Cordovaプラグイン設定の保存に失敗しました。","Failed to save In-App Updater Cordova plugin settings.":"In-App Updater設定の保存に失敗しました。","Failed to set resource encryption password.":"暗号化プラグインの設定に失敗しました。","Failed to upload file due to an unexpected server error.":"予期しないサーバーエラーが原因でファイルをアップロードできませんでした。","Failed to upload file.":"アップロードに失敗しました。","File":"ファイル","File Format:":"ファイル形式:","File Name:":"ファイル名:","File failed to save":"ファイルの保存に失敗しました","File has been copied.":"ファイルがコピーされました","File has been created.":"ファイルが作成されました","File has been moved.":"ファイルが移動されました","File has been renamed.":"ファイル名が変更されました","File has been saved.":"ファイルが保存されました","File has been uploaded successfully.":"ファイルが保存されました","Files":"ファイル","Files:":"ファイル: ","Find in Files":"プロジェク内検索","Folder Name:":"フォルダ名:","Folder has been created.":"フォルダーが作成されました","Folder:":"フォルダ:","Font Family":"フォントファミリー","Font Size":"フォントサイズ","For Cordova 5.x and earlier projects, The support for build and application settings has been discontinued. Please update the project.":"Cordova5.x系以前のプロジェクトは、ビルドおよびアプリ設定のサポートが終了しております。プロジェクトのアップデートをお願いします。","For Windows and Mac users, Monaca Localkit is a desktop app that contains all necessary development stack with\n                a quick installation.":"WindowsとMacをお使いの方は、Monaca Localkitをダウンロードしてローカル環境をセットアップすることもできます。必要な開発スタックがすべて含まれています。","For more details about the change, please refer to <a href=\"{{ param.link }}\" target=\"_blank\">our\n    documentation</a>.":"詳細については、<a href=\"{{ param.link }}\"  target=\"_blank\">こちらの記事</a>を参照してください。","For more information on third-party distribution service's optional parameters, please visit <a ng-href=\"{{ docUrl.ci_support_service }}\">Monaca\n        Support Docs</a>.":"各サービスがサポートするパラメータの詳細については、<a href=\"{{ docUrl.ci_support_service }}\">Monacaドキュメント</a>を参照してください。","For more information, please refer to <a href=\"http://www.lac.co.jp/service/consulting/scc.html\" target=\"_blank\">Secure Code Checker</a>.":"Secure Coding Checkerの詳細については、<a href=\"http://www.lac.co.jp/service/consulting/scc.html\" target=\"_blank\">こちら</a>。","For the purposes of generating a certificate via the Apple Developer Program, a CSR file will be prepared. <br> For detailed usage information, please see <a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\">help</a>.":"CSRファイルはApple Developer Programで証明書を発行するために使用します。<br />詳細な使い方については、<a href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\">ヘルプ</a>を参照してください。","Format Document":"コードフォーマット","Framework":"フレームワーク:","Framework Templates":"フレームワーク テンプレート","Framework:&nbsp;":"フレームワーク:&nbsp;","Fullscreen:":"フルスクリーン:","Gathering project information. Please wait...":"情報を取得しています。しばらくお待ちください...","General Inquiry":"サービス・料金に関するお問い合わせ","Generate Key and CSR":"秘密鍵とCSRの生成","Generate KeyStore":"キーストアを作成する","Generate KeyStore and Alias":"キーストアとエイリアスの作成","Generate New KeyStore:":"新しいキーストアを作成：","Generate Private Key and CSR":"秘密鍵とCSRの生成","Generate private key and CSR for issuing new certificate.":"新しい証明書を発行するための秘密鍵とCSRを生成します。","Generated Private Key":"生成されたプライベートキー","Generates native package for mobile platforms. Please choose the target operating system.":"各プラットフォーム向けのネイティブパッケージを作成します。ビルドするプラットフォームを選択してください。","Generating KeyStore...":"キーストアを作成しています...","Generating...":"生成しています...","Generic":"ジェネリック","Generic Language":"ジェネリック","Get Monaca Debugger in the App Store or by building your own.":"デバッガーは、App Storeにて提供しているものか、Monaca上でビルドしたものをインストールしてご利用いただけます。","Get Monaca Debugger in the Google Play Store or by building your own.":"デバッガーは、Google Play Storeにて提供しているものか、Monaca上でビルドしたものをインストールしてご利用いただけます。","Get from the App Store":"App Storeからインストール","Get it on Google Play":"Google Playからインストール","Get started by opening the project tree from the View menu.":"「表示」メニューからプロジェクトツリーを表示して開始します。","Getting Remote Branches...":"リモートブランチを取得しています...","HTML":"HTML","Help":"ヘルプ","Hide Automatically":"自動的に閉じる","Hide Details":"詳細を非表示","Hide by JavaScript":"JavaScriptで閉じる","High Performance (Crosswalk)":"ハイパフォーマンス（Crosswalk）","How to Configure VCS":"VCSの設定方法","I have installed and logged into Monaca Debugger.":"Monaca Debuggerをインストールしてログインしました","I have installed and logged into the debugger.":"デバッガーをインストールしてログインしました","Icon should be at least 512x512 pixels to work across all operating systems.":"512x512ピクセルのアイコンが必須となります。","Icons":"アイコン","Icons for App Store":"App Store用アイコン","If so, please be aware that currently Monaca only uses a trial version of this service.\n    By continuing to use this service, you agree to <a href=\"https://cxt.scc.lac.co.jp/Content/TermsOfService-scc-cxt.pdf\" target=\"_blank\">\n      LAC Co., Ltd's terms of service</a>.":"本機能は機能制限版となります。サービスの利用を開始すると、<a href=\"https://cxt.scc.lac.co.jp/Content/TermsOfService-scc-cxt.pdf\" target=\"_blank\">利用規約</a>に同意したこととなります。","If your GitHub username and/or repository name changes, please click on Clear Cache &amp; Save even if you made no changes.":"GitHubのユーザー名やレポジトリを変更した場合は、アップデートボタンをクリックして設定を反映させてください。","Images containing transparent backgrounds or alpha channels can not be set.":"背景が透過されている画像やアルファチャンネルを含む画像は設定できません。","Import":"インポート","Import Cordova Plugin":"Cordovaプラグインのインポート","Import Error":"インポート エラー","Import From Git":"Gitレポジトリ","Import KeyStore (Android)":"キーストアのインポート（Android）","Import Method":"インポート方法","Import Private Key":"秘密鍵のインポート","Import Project":"プロジェクトのインポート","Import Secret Key and Certificate":"秘密鍵と証明書のインポート","Import from GitHub Repository":"GitHubレポジトリからインポート","Import the Keychain private key and certificate.":"秘密鍵と証明書のインポート","Import your project by providing a URL pointing to a zip package.":"URLを指定してインポート","Import your project from Git by providing a Git SSH URL.":"Git SSH URLからインポート","Import your project from your linked GitHub account":"GitHubレポジトリからインポート","Import your project from your linked Google account":"リンクされたGoogleアカウントからプロジェクトをインポートします","Importing...":"インポート中です...","In-App Updater Settings":"In-App Updater設定","In-App Updater settings is not set.":"In-App Updaterのプラグイン設定が必要です。","In-App Updater update file":"In-App Updater用更新ファイル","In-House Build":"In-Houseビルド","In-house Build":"In-Houseビルド","InAppUpdater Build":"InAppUpdaterビルド","Increase Font Size":"フォントサイズを大きく","Indent with Spaces":"スペースによるインデント","Index File:":"インデックス:","Index file contains invalid characters.":"インデックスに不正な文字が含まれています。","Information & Updates":"お知らせ・ニュース","Initialize":"設定する","Input Password":"入力パスワード","Input string is too long.":"入力文字列が長すぎます。","Input string is too short.":"入力文字列が短すぎます。","Input the build flag":"ビルドフラグ","Install":"インストール","Install .gitignore .monacaignore, and package.json if missing":"存在しない場合に .gitignore .monacaignore package.json の作成","Install Debugger":"デバッガーのインストール","Install JS/CSS Component":"JS/CSS コンポーネントのインストール","Install Parameters (one per line):<span title=\"Each line corresponds to each --variable parameter of cordova plugin add.\" class=\"btn-tooltip\"><i class=\"tooltip-1\"></i></span>":"インストールパラメータ（改行区切り）: <span title=\"Cordovaプラグイン追加時に指定するパラメータを入力してください。\" class=\"btn-tooltip\"><i class=\"tooltip-1\"></i></span>","Install via QR code":"QRコードからインストール","Install via<br>QR code":"QRコードで<br>インストール","Installing <em>{{service.name}}</em>...":"サービス <em>{{service.name}}</em> をインストール中...","Installing Component: \"{{component}}\"":"コンポーネント {{component}} をインストール中...","Installing Component: '{{component}}'":"'{{component}}’をインストールしています","Installing Debugger":"デバッガーのインストール","Installing Monaca Debugger":"Monaca デバッガーのインストール","Installing {{service.name}}":"{{service.name}} をインストール中","Internal System Error":"システムエラー","Internal System Error. Please try again.":"システムエラー","Invalid File Format":"無効なファイル形式","Invalid email address.":"メールアドレスの形式が正しくありません。","Invite User(s)":"ユーザーを招待する","Inviting":"招待中","IoT":"IoT","It is recommended you use reverse-domain style (e.g. com.example.appname).<br>You can use only alphanumeric characters and periods.<br>At least one period must be used.<br>Each segment separated by periods should begin with an alphabetic character.":"逆ドメイン形式（com.example.appname等）を推奨します。<br>英数字とピリオドのみを利用できます。<br>最低でも1つのピリオド文字が必要です。<br>ピリオドで区切られた各部位では英字から始める必要があります。<br>この項目はAndroidとiOSで共通です。","It is recommended you use reverse-domain style (e.g. com.example.appname).<br>You can use only alphanumeric characters and periods.<br>At least one period must be used.<br>Each segment separated by periods should begin with an alphabetic character.<br>Note that this field is common to Android and iOS.":"逆ドメイン形式（com.example.appname等）を推奨します。<br>英数字とピリオドのみを利用できます。<br>最低でも1つのピリオド文字が必要です。<br>ピリオドで区切られた各部位では英字から始める必要があります。<br>この項目はAndroidとiOSで共通です。","It's recommended to use 9-patch formatted PNG (*.9.png) files for Android splash screens, because regular PNGs are forcibly scaled to the screen size.<br>Note that splash images can only be displayed on build apps, not on the Debugger.":"Androidスプラッシュ画面では、自動的に画面サイズに最適化が行われる9-patch形式のPNGファイル（拡張子.9.png）が推奨されます。<br>スプラッシュ画像はビルドされたアプリには表示されますが、デバッガー上では反映されません。","JS/CSS Component Settings":"JS/CSSコンポーネントの追加と削除","JS/CSS Component Settings...":"JS/CSSコンポーネントの追加と削除...","JS/CSS Component:":"JS/CSSコンポーネント","JS/CSS Components":"JS/CSSコンポーネント","JS/CSS Components:":"JS/CSSコンポーネント:","JSON Validation Error":"JSON設定エラー～を続行できません","JavaScript":"JavaScript","JavaScript Language":"JavaScript","Keep Running:":"バックグラウンド時も<br>アプリを常に実行:","Key (PKCS#12 .p12):":"秘密鍵（PKCS#12 .12）","KeyStore Alias is missing. Try running the build with Monaca IDE first.":"プロビジョニングプロファイルが設定されていません。一度、MonacaクラウドIDEでビルドを実行する必要があります。","KeyStore Settings for Android...":"Androidキーストア設定…","KeyStore contains Alias to code-sign release build apps. For security, KeyStore should be protected by password.":"KeyStoreにはエイリアスが含まれ、リリースビルド時の署名に使用します。セキュリティのため、KeyStoreはパスワードで保護されています。","KeyStore import succeeded":"KeyStoreのインポートに成功","KeyStore is not set.":"キーストアが設定されていません。","KeyStore<br>Import and Export":"キーストアの<br />インポートとエクスポート","Keyboard Shortcuts":"キーボードショートカット","Language Type":"言語:","Language:":"言語:","Last Updated: <i>{{plugin.updatedAt}}</i>":"最終更新日:<i>{{plugin.updatedAt}}</i>","Last access:&nbsp;":"最終アクセス:&nbsp;","Latest Version: {{custom_debugger_version_android}}":"バージョン: {{custom_debugger_version_android}}","Latest Version: {{custom_debugger_version_ios}}":"バージョン: {{custom_debugger_version_ios}}","Latest Version: {{debugger_version_android}}":"バージョン: {{debugger_version_android}}","Latest Version: {{debugger_version_ios}}":"バージョン: {{debugger_version_ios}}","Launching terminal server...":"ターミナルサーバーを起動しています…","Launching terminal...":"ターミナルを起動しています...","Learn & Discuss":"Monacaを学ぶ","Learn &amp; Discuss":"Monacaを学ぶ","Learn more about Localkit":"Monaca Localkitについて詳しく見る","Leaving Cloud IDE":"クラウドIDEを閉じています","Legacy":"サイズ指定モード","Legacy splash screen configuration requires a separate image for each size of iOS device. Monaca can generate all the correct sizes for you from one image, or you can upload them individually. However, this does not support devices such as iPhone X.":"従来のスプラッシュ画面設定では、iOSデバイスのサイズごとに画像が必要です。Monacaでは1つの画像から全サイズを生成することも、個別にアップロードすることもできます。ただし、iPhone Xなどのデバイスはサポートしていません。","Limited distribution build. <br> A registered Apple Developer Program distribution certificate, and a Distribution (AdHoc) Provisioning profile are required.":"限定配布向けのビルドです。<br />Apple Developer Programに登録されたディストリビューション証明書とDistribution (AdHoc) プロビジョニングプロファイルが必要です。","Limited distribution build. <br> A registered Apple Developer Program distribution certificate, and a Distribution (InHouse) Provisioning profile are required.":"限定配布向けのビルドです。<br />Apple Developer Programに登録されたディストリビューション証明書とDistribution (In-House) プロビジョニングプロファイルが必要です。","Link {{ciResponse.project_vcs.service_type}} Account":"{{ciResponse.project_vcs.service_type}}アカウントと連携する","Linux Debug Build":"Linuxデバッグビルド","Linux Release Build":"Linuxリリースビルド","List of Alias in KeyStore:":"キーストア内のエイリアス一覧:","List of supported third-party service providers that can boost app development and deployment.":"ビルド処理と連携することができる、サードパーティのサービスプロバイダーです。","Live reload started with the debugger.":"デバッガーでライブリロード開始しました。","Loading Component Data...":"コンポーネント情報を読み込んでいます...","Loading Cordova Plugins Settings...":"Cordovaプラグイン設定を読み込んでいます…","Loading Cordova Plugins...":"Cordovaプラグインを読み込んでいます...","Loading Debugger Information":"デバッガー情報の読み込み中","Loading File Changes...":"ファイルの更新を読み込み中…","Loading In-App Updater Settings...":"In-App Updater設定を読み込んでいます...","Loading JS/CSS Components...":"JS/CSSコンポーネントを読み込んでいます...","Loading Monaca Cloud IDE...":"Monaca クラウド IDEを読み込み中","Loading Notifications...":"通知を読み込んでいます...","Loading Project Information":"プロジェクト情報の読み込み中","Loading Project Settings...":"プロジェクトの設定を読み込んでいます...","Loading Resource Encryption Settings...":"リソース暗号化の設定を読み込んでいます...","Loading Service Integration Details...":"サービス連携の設定を読み込んでいます...","Loading Service Integration...":"サービス連携を読み込んでいます...","Loading Share Project Information":"プロジェクトの共有情報の読み込み中","Loading projects...":"プロジェクトの設定を読み込んでいます...","Loading...":"読み込み中…","Localizations:":"対応言語:","Log":"ビルド履歴","Login to team account":"企業ダッシュボードへ","Logout":"ログアウト","Logs Not Found":"ログがありません","Looking for the same Cloud IDE account logged into the debugger.":"Monaca Debuggerにログインしている同一アカウントを探しています。","Looking for the same IDE account logged into Monaca Debugger.":"Monaca Debuggerにログインしている同一アカウントを探しています。","Make Private":"プライベートにする","Make a copy of this project. All settings are preserved.":"このプロジェクトのコピーを作成します。設定内容も引き継がれます。","Make your project available to anyone by publishing it to the web. <br> After publishment your project can be imported by just accessing the generated link after clicking the <strong>Publish</strong> button.":"プロジェクトをウェブに公開することで、誰でもプロジェクトを利用できるようになります。 <br>公開後、生成されたリンクにアクセスするだけでプロジェクトをインポートできます。","Manage Account":"アカウント設定","Manage App Settings":"アプリの設定を管理する","Manage KeyStore and Alias":"キーストアとエイリアスを管理する","Manage Plan":"プラン管理","Manage build settings":"ビルド設定の管理","Manage deploy service":"デプロイサービスを管理する","Management Page":"アカウント管理","Manual Deploy Service":"デプロイサービス","Manual Deploy Service Log":"デプロイサービスログ","Merge is aborted.":"マージが中止されました。","Misc":"その他","Missing SSH Key":"SSH鍵がありません","Missing modal's class wrapper.":"Missing modal's class wrapper.","Missing modal's controller.":"Missing modal's controller.","Missing modal's template.":"Missing modal's template.","Missing repositories can be caused by improper repository configuration or service plan.":"リポジトリ一覧に目的のリポジトリが表示されない場合は、リポジトリの設定やMonacaのプランを改めてご確認ください。","Modified":"変更","Monaca":"Monaca","Monaca Cloud IDE has detected an older version of the Chrome browser.</br> Some feature may not operate as expected.":"古いバージョンのChromeブラウザを検出しました。一部の機能が期待どおりに動作しない可能性があります。","Monaca Cloud IDE has detected the usage of an unsupported browser. Monaca Cloud IDE currently supports Chrome. </br>Other browser may not operate as expected.":"サポートされていないブラウザの使用を検出しました。クラウドIDEは最新のChromeをサポートしていますが、他のブラウザは期待通りに動作しない可能性があります。","Monaca Cloud IDE is a full-featured online ide with coding, debugging and building capabilities.":"MonacaクラウドIDEはブラウザーだけでご利用いただける開発環境です。コーディング、デバッグ、ビルドといった開発に必要なすべての機能が備わっています。","Monaca Cloud Initialization Error":"Monaca Cloudの初期化エラー","Monaca Community":"Monaca コミュニティ（teratail）","Monaca Debugger":"Monaca デバッガー","Monaca Debugger can be found by searching for \"Monaca\" in the App Store, or by using the following QR code. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See the documentation</a> for more details.":"Monaca デバッガーは、Google Play から「Monaca」で検索するか、下のQRコードからインストールできます。\n詳細は、<a href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">ドキュメント</a>を参照してください。","Monaca Debugger can be found by searching for \"Monaca\" in the Google Play Store, or by using the following QR code. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">See the documentation</a> for more details.":"Monaca デバッガーは、Google Play から「Monaca」で検索するか、下のQRコードからインストールできます。\n詳細は、<a href=\"{{ docsUrl.install_debugger_android }}\" target=\"_blank\">ドキュメント</a>を参照してください。","Monaca Debugger for Android":"Android用 Monaca デバッガー","Monaca Debugger for iOS":"iOS用 Monaca デバッガー","Monaca Debugger is available for each platform. Please click the icon to continue.":"デバッグする環境に合わせてMonacaデバッガーをインストールできます。","Monaca Debugger provides you the ability to test your app on your device without building the project each time. See <a ng-href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">Monaca documentation</a> for more details.":"「Monacaデバッガー」を利用すると、ソースコードを保存するだけで、実機上ですぐにアプリの動作を確認できます。コード更新のたびにビルドをする必要がありません。Monacaデバッガーの詳細は、<a href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">ドキュメント</a>をご参照ください。","Monaca IDE":"Monaca IDE","Monaca Preview Feature Update":"Monaca IDE プレビュー機能 アップデート","Move project from archive to online.":"プロジェクトをアーカイブからオンラインに移動します。","Move to Archive":"アーカイブに移動する","Name":"ファイル名","Name:":"名前:","Need technical support? <a ng-href=\"{{supportLink}}\" target=\"_blank\">Contact us.</a>":"有償のテクニカルサポートは<a ng-href=\"{{supportLink}}\" target=\"_blank\">こちら</a>","Network unstable. Please check your network connection.":"ネットワーク状態が不安定です。接続を確認してください。","New Batch Build":"新規作成","New Build Task":"新規作成","New CI Config":"CIを設定する","New Debugger":"デバッガー","New File":"新規ファイル作成","New File...":"新規ファイル...","New Folder":"新規フォルダー作成","New Password:":"新しいパスワード:","New Previewer":"プレビュー","New Remote Build":"リモートビルド","New Task":"新規タスク","New Terminal":"新規ターミナル","New branch should be created on the repository hosting provider site or through command line.":"ブランチの作成はこの画面では行えません。コマンドラインで行うか、使用しているバージョン管理システムの管理画面から操作してください。","Next":"次","No Project ID":"プロジェクトIDなし","No build history is found. Please start a new build.":"ビルド履歴が存在しません。","No comment":"コメントなし","No image":"画像がありません","No plugins are available.":"利用できるプラグインがありません。","No plugins are currently enabled or installed.":"有効またはインストールされたプラグインがありません。","No project is available.":"開発できるプロジェクトがありません。","No results":"結果がありません","Not Found":"見つかりません","Not supported for this project.":"このプロジェクトではサポートしていません。","Note that this operation may take up to several minutes.":"この操作には数分かかる可能性があります。","Note: Please prepare a destination folder for your project on Google Drive in advance.":"※ プロジェクトの保存先フォルダを事前にGoogleドライブ上に用意してください。","Notify registered e-mail address of installation method.":"登録メールアドレスに<br />インストール方法を通知","Notify via email:":"通知メールを送信する：","Number of builds per day has reached the maximum.":"一日のビルド上限数に達しました。","OK":"OK","Off":"Off","On":"On","Once you enable it, anyone can view your project previewer with this url.":"公開が「On」の場合、以下のURLにて公開フォルダ内を誰でも閲覧できます。","One hostname per line. It can also start with protocol (http://). If you specify [subdomains] after the hostname, all subdomains are applied.<br>Note that this field is common to Android and iOS.":"各行にホスト名を指定します。http://などのプロトコル情報から指定することもできます。ホスト名のあとに [subdomains] と指定することで、すべてのサブドメインが対象となります。<br>この項目はAndroidとiOSで共通です。","One or more app icons are missing.":"1つ以上のアプリアイコンがありません。","Online":"オンライン","Only PNG format is supported for upload.":"アップロードにはPNG形式のみがサポートされています。","Only PNG format is supported for uploading. Large images will be auto-scaled to fit the corresponding size. Images on the Cloud IDE are scaled down to fit the window but does not affect the actual image proportions.":"アップロードにはPNG形式のみがサポートされています。大きな画像は、対応するサイズに合わせて自動スケーリングされます。クラウドIDEの画像はウィンドウに合わせて縮小されますが、実際の画像の比率には影響しません。","Only PNG format is supported. Large pictures will be auto-scaled to fit the size.":"PNG形式の画像を指定してください。サイズが大きい場合は自動的に縮小されます。","Only PNG format is supported. Large pictures will be auto-scaled to fit the size. Splash Screen icon is shared across Linux, macOS and Windows Electron platforms.":"アップロードにはPNG形式のみがサポートされています。大きな画像は、対応するサイズに合わせて自動スケーリングされます。スプラッシュスクリーンアイコンは、Linux、macOS、およびWindows Electronで共有されています ","Only available to Plan for team development.":"企業向けプランでのみ利用可能です","Onsen UI Community":"Onsen UI コミュニティ（teratail）","Open File":"ファイルを開く","Open in Cloud IDE":"クラウドIDEで開く","Open in lite mode":"ライトモードで開く","Open in safe mode":"セーフモードで開く","Optional Parameter Entry":"パラメータ（オプション）","Orientation:":"画面の向き:","Other":"その他","Our Debugger provides you the ability to test your app on your device without building the project each time. See <a ng-href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">documentation</a> for more details.":"「Monacaデバッガー」を利用すると、ソースコードを保存するだけで、実機上ですぐにアプリの動作を確認できます。コード更新のたびにビルドをする必要がありません。Monacaデバッガーの詳細は、<a href=\"{{ docsUrl.debugger_features }}\" target=\"_blank\">ドキュメント</a>をご参照ください。","Our Preview is a convenient tool for checking the application without an actual mobile device.":"私たちのプレビューは、実際のモバイルデバイスなしでアプリケーションをチェックするための便利なツールです。","Owner:":"所有:","PNG format is supported.":"PNG形式の画像を指定してください。","PNG format is supported. Icons are shared across Linux, macOS and Windows Electron platforms. Icon should be at least 512x512 pixels to work across all operating systems.":"PNG形式がサポートされています。アイコンはLinux、macOS、Windowsで共有されますすべてのオペレーティングシステムで適用する場合は、512x512ピクセルのアイコンが必須となります。","PNG format is supported. Large pictures will be auto-scaled to fit right size.":"PNG形式の画像を指定してください。サイズが大きい場合は自動的に縮小されます。","PNG format is supported. Large pictures will be auto-scaled to fit right size. Images containing transparent backgrounds or alpha channels can not be set.":"PNG形式の画像を指定してください。サイズが大きい場合は自動的に縮小されます。背景が透過されている画像やアルファチャンネルを含む画像は設定できません。","PWA Build":"PWA ビルド","PWA Configuration":"PWA アプリ設定","Package":"パッケージ","Package Certificate Key:":"パッケージ証明書キー:","Package Name / URL:":"パッケージ名 / URL:","Package Name:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">It is recommended you use reverse-domain style (e.g. com.example.appname).<br>You can use only alphanumeric characters and periods.<br>At least one period must be used.<br>Each segment separated by periods should begin with an alphabetic character.<br>Note that this field is common to Android and iOS.</i></span>":"パッケージ名:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">逆ドメイン形式（com.example.appname等）を推奨します。<br>英数字とピリオドのみを利用できます。<br>最低でも1つのピリオド文字が必要です。<br>ピリオドで区切られた各部位では英字から始める必要があります。<br>この項目はAndroidとiOSで共通です。</i></span>","Package Publisher Name:":"パッケージパブリッシャー名:","Package Type":"パッケージタイプ","Package Type:":"パッケージタイプ:","Package Version:":"パッケージバージョン:","Package.json is invalid which may cause errors in the project. Would you like to open package.json and fix it?":"Package.jsonが不正のため、このプロジェクトで不具合が発生するかも知れません。package.jsonファイルを開いて修正しますか？","Package:":"パッケージ:","Password":"パスワード","Password for the Key:":"キーのパスワード:","Password is already registered.<br>If using In-App-Updater, already distributed apps will become incompatible once the password is changed.":"パスワードは既に登録されています。<br>In-App Updaterでは、パスワードが変更された場合、既に配布されたアプリとの互換性が失われます。","Password is incorrect.":"パスワードが間違っています。","Password:":"パスワード:","Paste":"貼り付け","Permission to Access Google Drive":"Googleドライブへのアクセス許可","Plan":"プラン","Plan Details":"プラン詳細","Plan Upgrade Required":"プランをアップグレードしてください","Platform":"プラットフォーム","Platforms":"プラットフォーム","Please Create an Empty Repository":"空白のリポジトリを作成してください。","Please add the InAppUpdater plugin. <br>It can be added in the Cordova Plugin settings screen.":"InApp Updaterプラグインを追加してください。<br>Cordovaプラグイン設定より追加できます。","Please click \"Run on Device\" to run your app on Monaca Debugger.":"Monaca Debuggerでアプリを実行するには、「Run on Device」をクリックしてください。","Please correct the issue described above and try again. Click <a href=\"#\" ng-click=\"openUploaderWindow()\">here</a> to try uploading again":"エラー内容に従い、再度アプリケーションのアップロード手続きを行ってください。詳細は<a href=\"#\" ng-click=\"openUploaderWindow()\">こちら</a>。","Please create new project.":"新しいプロジェクトを作成してください。","Please fill in the required fields: {{missing}}":"内容が入力されていません: {{missing}}","Please generate a private key or import on the build settings screen.":"ビルド設定画面で秘密鍵を生成するかインポートを行ってください。","Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program developer certificate and associated Development Provisioning profile.":"ビルド設定画面で秘密鍵を生成するか、インポートを行ってください。<br />また、Apple Developer Programで作成したデベロッパー証明書と、証明書に紐づくDevelopmentプロビジョニングプロファイルを登録してください。","Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program distribution certificate and Distribution (AdHoc) Provisioning profile.":"ビルド設定画面で秘密鍵を生成するか、インポートを行ってください。<br />また、Apple Developer Programで作成したDistribution証明書と、証明書に紐づくDistribution (AdHoc) プロビジョニングプロファイルを登録してください。","Please generate a secret key or import an existing key in the Build Settings screen. Also please register your Apple Developer Program distribution certificate and Distribution (InHouse) Provisioning profile.":"ビルド設定画面で秘密鍵を生成するか、インポートを行ってください。<br />また、Apple Developer Programで作成したDistribution証明書と、証明書に紐づくDistribution (In-House) プロビジョニングプロファイルを登録してください。","Please input information for Alias which will be stored in KeyStore. Please input Alias name and password.":"KeyStoreに格納するエイリアス情報を入力してください。エイリアス名とパスワードを入力してください。","Please input necessary configurations for building PWA application. This configuration is saved by project basis.":"PWAアプリケーションのビルドに必要な情報を入力してください。この設定はプロジェクト単位で保存されます。","Please input necessary configurations for building Windows application. This configuration is saved by project basis.":"Windowsアプリケーションのビルドに必要な情報を入力してください。この設定はプロジェクト単位で保存されます。","Please input necessary configurations for building iOS application. This configuration is saved by project basis.<a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>":"iOSアプリケーションのビルドに必要な情報を入力してください。この設定はプロジェクト単位で保存されます。<a href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>","Please input necessary configurations for building {{ template }} application. This configuration is saved by project basis.":"{{ template }}アプリケーションのビルドに必要な情報を入力してください。この設定はプロジェクト単位で保存されます。","Please input password <br>for KeyStore&nbsp;:":"KeyStoreで使用するパスワード<br>を入力してください&nbsp;:","Please input password for KeyStore&nbsp;:":"KeyStoreのパスワードを入力してください:","Please input your name and email address which match with your Apple ID Account.":"Apple IDアカウントと同一のお名前とメールアドレスを使用してください。","Please insert an alias for the selected deploy service.":"選択されたデプロイサービスのエイリアスを入力してください。","Please login and create an empty GitHub repository.":"ログインして空白のGitHubレポジトリを作成してください。","Please make sure the debugger is setup and logged in on the device.":"Monaca Debuggerがセットアップされ、デバイスにログインしていることを確認してください。","Please prepare a destination folder for your project on Google Drive in advance.":"プロジェクトの保存先フォルダを事前にGoogleドライブ上に用意してください。","Please register Splash screen which will be displayed when opening the application.<br>PNG format is supported. Large pictures will be auto-scaled to fit the size.":"アプリケーション起動時に表示されるスプラッシュ画像を登録してください。<br>PNG形式をサポートしています。大きな解像度の場合は画面に収まるように調整されます。","Please see\n            <a ng-click=\"openSetupVcsDoc()\">Monaca documentation</a> for support on how to configure your project with VCS.":"バージョン管理の利用方法は、<a ng-click=\"openSetupVcsDoc()\">Monacaドキュメント</a>を参照してください。","Please see <a ng-click=\"gotoCiJsonDocs()\">Monaca Docs</a> for support on JSON configurations for Continuous Integration.":"<a ng-click=\"gotoCiJsonDocs()\">ドキュメント</a>を参照して設定内容を確認してください。","Please see this <a href={{doc}} target=\"_blank\">documentation</a> for more detail":"詳細は<a href={{doc}} target=\"_blank\">こちら</a>を参照してください","Please select a \"*-theme.css\"":"*-theme.cssを選択してください。","Please select a ZIP file.":"ZIPファイルを選択してください。","Please select a deploy service.":"デプロイサービスを選択してください。","Please select a folder to export":"エクスポートするフォルダを選択してください。","Please setup necessary configurations for building iOS application. This configuration is saved by user basis.<a ng-href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>":"iOSアプリケーションのビルドに必要な情報を入力してください。この設定はユーザー単位で保存されます。<a href=\"{{ docsUrl.guide_ios_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>","Please specify the value for index file.":"インデックスファイルを指定してください。","Please specify the value for public path.":"公開フォルダを指定してください。","Please switch to Android Platform 8.1.0 or higher version for App Bundle Build in the Build Environment Settings.":"App Bundle Buildをするためにはビルド環境の設定から、Android Platformのバージョンを8.1.0以上にして下さい。","Please upgrade your plan for in-house build.":"In-Houseビルドにはアップグレードが必要です。","Please upgrade your plan or archive any project.":"不要なプロジェクトを削除するか、有料プランでのアーカイブ機能をご利用ください。","Please upload: 1.&nbsp;Apple Developer Program certificate&nbsp;&nbsp;2.&nbsp;Associated profile&nbsp; in order.":"1.&nbsp;Apple Developer Programで生成した証明書&nbsp;&nbsp;2.&nbsp;証明書に紐づくプロファイル&nbsp;の順でアップロードしてください。","Please use Xcode 12.5.1 or greater to launch the app on your iOS 15 device. Please refer to <a href=\"https://medium.com/the-web-tub/monaca-support-xcode-12-5-1-2476904e628f\" target=\"_blank\">our documentation</a>.":"iOS15の端末にアプリを起動させるためには、Xcode12.5.1以上をご利用ください。詳細については、<a href=\"https://press.monaca.io/takuya/8317\" target=\"_blank\">こちらの記事</a>を参照してください。","Please use half-width numbers.":"半角数値で入力してください。","Please visit App Store Connect and verify that your application is ready for submission.":"App Store Connectを開き、アプリケーションが正しくアップロードされたことを確認してください。","Plugin Search":"プラグイン検索","Plugin Version:":"プラグインバージョン:","Port Number":"ポート番号","Posts from The Web Tub":"Posts from The Web Tub","Preparing...":"ビルド準備中…","Preview":"プレビュー","Preview Log":"プレビューログ","Preview Server Settings":"サービスサーバーの設定","Preview Server runs the preview app by running monaca:preview script defined in package.json. For details, please refer to the <a ng-href=\"{{ docsUrl.ide_terminal }}\" target=\"_blank\">documentation</a>":"プレビューサーバーはpackage.jsonで指定されたmonaca:previewコマンドを実行します。詳細については<a ng-href=\"{{ docsUrl.ide_terminal }}/products_guide/monaca_ide/terminal/#プレビューログとプレビューサーバー\" target=_blank>ドキュメント</a>を参照してください。","Preview server has been reset to default settings.":"プレビューサーバーがデフォルトの設定にリセットされました。","Preview server settings has been saved.":"プレビューサーバーの設定が更新されました。","Previewer":"プレビュー","Private Key and CSR":"秘密鍵とCSR","Processing Pull Request...":"git pullを実行中…","Processing Push Request...":"git pushを実行中…","Processing configuration request...":"設定内容を送信中…","Profile":"プロファイル","Profile has expired.":"プロファイルの期限が切れています","Progressive Web App will be built. <br>The built application can be deployed to any hosting services. Please see the documentation for build and deploy information.":"PWA向けにアプリケーションをビルドします。<br />デプロイ方法はドキュメントを参照してください。","Project ID":"プロジェクトID","Project Icon":"プロジェクトアイコン","Project Name":"プロジェクト名","Project Operation":"プロジェクトの操作","Project Recovery":"プロジェクトの再構成","Project Share":"プロジェクト共有","Project Type":"テンプレートの種類","Project URL to share:":"プロジェクトのURL：","Project has been archived.":"プロジェクトがアーカイブされました。","Project has been deleted.":"プロジェクトが削除されました","Project has been recovered.":"プロジェクトが再構成されました","Project has been restored.":"プロジェクトは復元されました","Project has been updated.":"ファイル情報が更新されました。","Project information":"プロジェクトの情報","Project is permanently deleted, and cannot be undone. Use with caution.":"プロジェクトが永久に削除され、元に戻すことはできませんので注意してください。","Project number reached the maximum limit":"プロジェクト数が上限に達しました","Project(s) has been archived.":"プロジェクトがアーカイブされました。","Project(s) has been deleted.":"プロジェクトが削除されました","Project(s) has been restored.":"プロジェクトは復元されました","Provide an URL pointing to a zip file containing your project.":"ZIP形式でプロジェクトを取得できるURLを指定してください","Provide an URL pointing to your project's Git repository.":"Git レポジトリのURLを指定してください","Provisioning File":"プロビジョニングファイル","Provisioning Profile is not registered.":"プロビジョニングプロファイルが登録されていません。","Provisioning profile is not registered. {{provisioning_error}}":"プロビジョニングプロファイルが登録されていません。 {{certificate_error}}","Public Path:":"公開フォルダ:","Public SSH Key:":"SSH公開鍵: ","Public path contains invalid characters.":"公開フォルダに不正な文字が含まれています。","Publish":"公開する","Publish Builds":"iOS AppStoreアップロード","Publish Log":"iOS AppStoreアップロード ログ","Publish Project":"プロジェクトの公開","Publish...":"公開...","Pull":"プル","Pull &amp; Merge":"プル &amp; マージ","Pull / Merge...":"プル / マージ...","Pull Log:":"処理の詳細:","Pull from (remote)":"プル元（リモート）","Pull into (local)":"プル先（ローカル）","Push":"プッシュ","Push...":"プッシュ...","QR Code":"QRコード","QR Code for Monaca Debugger on App Store":"App Store上のMonaca Debugger QRコード","QR Code for Monaca Debugger on Google Play":"Google Play上のMonaca Debugger QRコード","React Native realtime build log may be temporary unavailable.":"React Nativeのビルドログが利用できません。","Read More":"詳細を見る","Reconfigure node_modules":"node_modulesの再構成","Reconfigure package-lock.json":"package-lock.jsonの再構成","Recover":"再構成","Redirection Failure":"リダイレクトに失敗しました","Redo":"やり直し","Refresh":"更新","Refresh Projects":"プロジェクトの再構成","Refresh terminal server":"ターミナルサーバーの再起動","Register Issued Certificate":"発行された証明書を登録する","Release":"リリースビルド","Release Build":"リリースビルド","Release build can not continue because the keystore and alias is not created. Please create a keystore and alias from build settings.":"キーストアとエイリアスが作成されていないためリリースビルドを続行できません。ビルド設定よりキーストアとエイリアスを作成してください。","Release build cannot be started during the trial.":"リリースビルドはトライアル中には実行できません。","Reload browser":"ブラウザのリロード","Remote Build":"リモートビルド","Remote Repository Configuration":"リモートリポジトリ設定","Remove":"削除","Remove JS/CSS Component":"JS/CSSコンポーネントの削除","Rename":"名前を変更","Renamed":"リネーム","Render Whitespace":"ホワイトスペースの表示","Reopen file with":"他のエンコードで開き直す:","Replace":"置き換え","Replace All":"すべて置き換え","Replace...":"置換...","Report":"レポート","Repository URL:":"リポジトリURL：","Requesting for permission to access Google drive":"Googleドライブへのアクセス許可のリクエスト","Required: {{requiredItems}}":"必要: {{requiredItems}}","Reset":"リセット","Reset Layout":"レイアウトをリセット","Reset Password":"パスワードのリセット","Reset Password Failed.":"パスワードのリセットが失敗しました","Reset Password Success.":"パスワードのリセットが成功しました","Restart":"再起動する","Restart Preview Server":"プレビューサーバーの再起動","Restore default":"デフォルトに戻す","Restore to Online":"オンラインに戻す","Retrieving information...":"情報を取得しています…","Retry":"リトライ","Return to Dashboard":"ダッシュボードに戻る","Role:":"権限：","Run":"実行","Run CI when accessing an API URL. The URL will be shown in CI configs list.":"API URLにアクセスされたときにCIを実行します。URLはCI設定一覧に表示されます。","Run CI when pushing commits to the specified remote branch/tag.":"指定されたリモートブランチ/タグにコミットがプッシュされたときにCIを実行します。","Run Update":"アップデートを行う","Run on Device":"実機で実行","Running <b>monaca preview</b> on port <b>{{ transpile.port }}</b>":"プレビューサーバーをポート<b>{{ transpile.port }}</b>で実行しています","Running the project...":"実機デバッグ","SSH is not configured properly Or your plan is not supported":"SSHの設定が正しくないか、ご利用中のプランではこちらの機能を使用することができません","Sample Applications":"サンプル アプリケーション","Save":"保存","Save All":"すべて保存","Save HTML5 Resource Encryption Password":"HTML5リソース暗号化のパスワードを保存する","Saving...":"保存しています...","Scan the QR code or visit this <a href=\"{{url}}\" target=\"_blank\">link</a> to access Download Application Package page.":"QRコードをスキャンするか <a href=\"{{url}}\" target=\"_blank\">リンク</a> からアプリインストール画面機能にアクセスしてください。","Scope:":"適用範囲：","Screen Orientation:":"画面の向き:","Screen Orientation:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Set\n                                    screen orientation.</i></span>":"画面の向き:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">画面の方向を指定します。</i></span>","Search":"検索する","Search All Files...":"プロジェクト内検索...","Search...":"検索...","Searching":"検索中","Searching for Debugger...":"Monaca デバッガーを探しています。","Searching for Monaca Debugger...":"Monaca デバッガーを探しています。","See Details":"詳細の表示","See Documentation":"ドキュメントを見る","See More":"もっと見る","Select Build":"ビルドの選択","Select File":"ファイル選択","Select Repository:":"リポジトリ：","Select a Deploy Service":"デプロイサービスを選ぶ","Select a Git Service":"Gitサービスの選択","Select files to be loaded for":"読み込むファイルを選択してください","Send install information to registered email address":"登録メールアドレスにインストール方法を通知","Server disconnected":"サーバーが切断されました","Service":"サービス","Service Integration Settings":"外部サービス連携","Service Integration Settings...":"外部サービス連携...","Service Integrations":"サービス連携","Service Provider Information":"サービスプロバイダの情報","Service Provider:":"サービス名:","Service Unavailable":"サービスは利用できません","Set download authentication":"ダウンロード認証を設定","Set the splash screen type to 'Storyboard' in iOS App Configuration.":"スプラッシュスクリーンタイプをオートリサイズモードにしてください。","Settings: {{plugin.name}}":"設定:{{plugin.name}}","Setup Debugger":"デバッガーの説明とインストール","Setup KeyStore and Alias":"キーストアとエイリアスの設定","Setup Monaca Debugger":"デバッガーの説明とインストール","Share":"共有","Share Project":"プロジェクトの共有","Share build result:":"ビルド結果を公開する:","Share...":"共有...","Short Name:":"短い名前:","Show All":"すべてを表示","Show Commit History":"コミット履歴","Show Commit History...":"コミット履歴...","Show Details":"詳細の表示","Show Logs":"ログを表示","Show Preview Tab":"プレビュータブを表示","Show README":"READMEを表示","Show Remote History...":"リモートのコミット履歴...","Show Splash Screen Spinner:":"スプラッシュにスピナーを表示:","Shows the map of the opened file on right side":"右側にファイルマップを表示します","Simulator Build":"シュミュレータービルド","Size:{{template.template_size}}MB":"サイズ：約{{template.template_size}}MB","Sorry, only the owner of the project can change this setting.":"設定の変更はプロジェクトのオーナーのみ可能です。","Sort by created":"作成日順","Sort by last accessed":"最終アクセス順","Sort by project title":"名前順","Specifies the display locale in the native widgets (i.e. \"Copy\" when selecting a text.)":"ネイティブウィジェットで使用するロケール（テキスト選択時の「コピー」等）を指定します","Specify URL or Package Name":"URLもしくはパッケージ名を指定します","Specify different version for bundle":"バンドルバージョンを指定","Specify four numbers separated by dots. (e.g. 1.10.2.3)<br>Note that each number should be in 0-99.":"ドット区切りで4つの数値を指定してください。（例: 1.10.2.3）<br>それぞれの数値は0-99の範囲で指定してください。","Specify the numbers for package version":"パッケージバージョンを指定","Specify the version code manually":"バージョンコードを指定","Specify three numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.":"ドット区切りで3つの数値を指定してください。（例: 1.10.2）<br>それぞれの数値は0-99の範囲で指定してください。","Specify three or four numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.":"ドット区切りで3つ、または4つの数値を指定してください。（例: 1.10.2）<br>それぞれの数値は0-99の範囲で指定してください。","Splash":"スプラッシュ","Splash Background:":"背景色:","Splash Files":"スプラッシュファイル","Splash Screen":"スプラッシュスクリーン","Splash screen type":"スプラッシュスクリーン 設定モード","Start":"利用開始","Start Build":"ビルドを開始する","Start Custom Build":"カスタムビルドを開始する","Start Custom Build...":"カスタムビルドを開始する...","Start New Build":"ビルドを開始する","Start Recovery":"実行する","Start URL:":"開始URL：","Start building":"ビルドを開始する","Starting build...":"ビルドを開始しています…","Status":"状態","Status & Known Issues":"障害・不具合情報","Status and Known Issues":"障害・不具合情報","Status: {{history.status}}":"ステータス:  {{history.status}}","Stock WebView (default)":"システムのWebView（デフォルト）","Storyboard (Recommended)":"オートリサイズモード","Submit email to your registered email address.":"登録されたメールアドレス宛てにメールを送信します。","Success":"成功","Successfully changed Cordova version.":"Cordovaバージョンの変更に成功しました。","Successfully configured JS/CSS Component":"JS/CSSコンポーネントの設定に成功しました。","Successfully copied project.":"プロジェクトのコピーに成功しました。","Successfully deleted file.":"ファイルの削除に成功しました。","Successfully deleted plugin.":"プラグインの削除に成功しました。","Successfully disabled plugin.":"プラグインを無効にしました。","Successfully enabled plugin.":"プラグインを有効にしました。","Successfully installed custom Cordova plugin":"カスタムCordovaプラグインをインストールしました","Successfully saved":"保存しました","Successfully saved Cordova plugin settings.":"Cordovaプラグイン設定を保存しました。","Successfully saved In-App Updater Cordova plugin settings.":"In-App Updaterプラグイン設定を保存しました。","Successfully set resource encryption password.":"リソース暗号化のパスワードを設定しました。","Successfully uninstalled JS/CSS Component: \"{{component_name}}\"":"JS/CSSコンポーネント {{component_name}} を削除しました","Successfully uploaded.":"アップロードしました。","Supported Monaca Debugger:":"対応するMonacaデバッガー:","Supported Operating System Version:":"サポートされるOSバージョン:","Switch":"切替える","Switch to English":"Switch to English","Switch to Japanese":"Switch to Japanese","Switch to the old IDE version":"旧IDEに戻る","Syntax error":"シンタックスエラー","System Error.":"システムエラー。","Tab Size":"Tab サイズ","Tag":"タグ","Tags":"タグ","Tags (Separate with comma)":"タグ（コンマ区切り）","Target Device Family":"対象デバイス","Target SDK Version:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">The target SDK Version for Android Platform. The value must be set as an integer.</i></span>":"ターゲットSDKバージョン:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">アプリがターゲットとするAPIレベル。値は整数である必要があります。</i></span>","Task Name":"タスク名","Team Account":"企業用アカウント","Template":"テンプレート","Terminal":"ターミナル","Terminal OS":"ターミナル OS","Tester":"テスター","Tester role can only run this project from their debugger.":"テスター権限ではデバッガーの実行のみに制限されます。開発者権限のメンバーはIDE上で編集が可能です。","Testing":"テスト","Text Direction:":"テキストの向き:","The Continuous Integration service is currently not available with your existing account settings.\n            <br>To use this service, please link your Monaca account with a {{ciResponse.project_vcs.service_type}} account.":"継続的インテグレーションはこのアカウントからは利用できません。<br>続行するには、{{ciResponse.project_vcs.service_type}}のアカウントと連携してください。","The Monaca Backend which is used for user management was terminated on May 31, 2021. <br>\n    Thank you for using Monaca Backend service.":"いつも「Monaca」をご利用いただきありがとうございます。<br>この度、データ管理を行う「バックエンド機能」は、2021年5月31日をもちまして機能の提供を終了いたしました。これまで本サービスをご愛顧いただき、誠にありがとうございました。何卒、ご理解賜りますようお願い申し上げます。","The Progressive Web App Manifest file is missing.":"Progressive Web App マニフェストファイルがありません。","The Support of Cordova 4 or earlier has ended.<br>In order to continue using the project, it is necessary to     upgrade the project.<br>Are you sure to upgrade project ?":"Cordova 4以下のサポートが終了しているため、プロジェクトのアップグレードが必要です。<br>続行してもよろしいですか？","The ability to move the selected content by drag and drop.":"ドラッグ&ドロップで選択したコンテンツを移動する","The application id contains invalid characters.":"アプリケーションIDに不正な文字が含まれています。","The application name contains invalid characters.":"アプリケーション名に不正な文字が含まれています。","The application need access to your google drive. Do you wish to continue?":"アプリケーションは、Googleドライブにアクセスする必要があります。続行しますか？","The build name could not be duplicated!":"ビルド名を空にすることはできません。","The build service was terminated.":"対象のプロジェクトバージョンのビルドは、サポートを終了いたしました。","The comment could not be saved":"コメントを保存できませんでした","The committer email address is used to identify who commit changes to the repository. The list is populated from the available list provided by the repository hosting provider.":"コミッターのメールアドレスは、リポジトリーへの変更を誰が行ったかを識別するために使用されます。リストは、リポジトリのホスティングプロバイダから提供された一覧です。","The committer name is a required option to identify who commit changes to the repository.":"コミッター名は、リポジトリへの変更を誰が行ったかを識別するために必要となります。","The componsent is not found. Please check the original repository. <a href='https://bower.io/search/' target='_blank'>bower.io</a>":"コンポーネントが見つかりません。リポジトリが存在するか確認してください。<a href='https://bower.io/search/' target='_blank'>bower.io</a>","The current subscription plan for your account does not support Cordova version {{cordovaVersion}} projects.":"あなたの現在のサブスクリプションプランは、Cordova {{cordovaVersion}}プロジェクトをサポートしていません。","The current working branch is set to \"{{initSelectedBranch}}\". To change your working branch, click on \"Advance Configurations\" below. You can change the branch at any time by visiting the \"Configuration Service\" window.":"現在のブランチは、 \"{{initSelectedBranch}}\"です。ブランチを変更する場合は、\n詳細設定をクリックしてください。ブランチは、「バージョン管理」の設定画面から変更できます。","The debugger is available for each platform. Please select a platform to continue.":"デバッグする環境に合わせてMonacaデバッガーをインストールできます。","The field contains invalid characters.":"不正な文字が含まれています。","The file has been deleted":"ファイルが削除されました","The file has been uploaded":"ファイルが更新されました","The file has unsaved changes. Please save it before reopening it with another encoding.":"未保存の変更があります。他のエンコードで開き直す前に一度保存してください。","The file name cannot be null.":"ファイル名を空にすることはできません。","The file name includes invalid character.":"ファイル名に無効な文字が含まれています。","The file or folder already exists.":"ファイルまたはフォルダが既に存在します。","The folder name cannot be null.":"フォルダー名を空にすることはできません。","The folder name includes invalid character.":"フォルダー名に無効な文字が含まれています。","The following component will be installed to your project.":"下記のコンポーネントがプロジェクトにインストールされます。","The following files were installed.":"下記のファイルがインストールされました。","The following fixes will be applied to the project.":"プロジェクトに対して下記の修正を実施します。","The following plugins will be  <strong>upgraded</strong>:":"次のプラグインは<strong>アップグレード</strong>されます:","The following plugins will be <strong>removed</strong>:":"次のプラグインは<strong>削除</strong>されます:","The following plugins will be deprecated:":"次のプラグインは非推奨になります:","The icons confugured in config.xml do not appear here correctly. For more details, please refer to 'Set of adaptive icons' in <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">our documentation</a>.":"config.xmlに設定されているアイコンは画面上に正しく表示されていません。 詳細については<a href=\"{{ docsUrl.android_build }}\" target=\"_blank\">こちら</a>の「アダプティブ アイコンの設定」を参照してください。","The number of available continuous integration tickets has been depleted. To continue this service, please purchase\n              additional CI tickets.":"CIチケットの残りがありません。継続的インテグレーションを利用するには、CIチケットを追加してください。","The package is zipped and ready for distribution. For more details, please refer to the\n                                <a ng-href=\"{{ docsUrl.inapp_updater }}\" target=\"_blank\">docs</a>.\n                                <br> Please deploy the file to the Web server. Build log can be obtained from\n                                <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a>.":"出力されたファイルを配信用のWebサーバーにアップロードしてください。詳細は<a href=\"{{ docsUrl.inapp_updater }}\" target=\"_blank\">ドキュメント</a>を参照してください。<br>ビルドログを表示するには<a href=\"#\" ng-click=\"showBuildLogTextArea()\">こちら</a>をクリックしてください。","The platform requirements will be changed:":"プラットフォーム要件が変更になります:","The previewer is not available in safe mode.":"プレビュー機能は、セーフモードでは利用できません。","The project contains unlicensed plugins.":"ご利用中のプランでは使用できないCordovaプラグインが含まれています。","The project is not configured for Release build. In order to register your App to Google Play, please setup it according to <a ng-href=\"{{ docsUrl.deploy_google_play }}\" target=\"_blank\">the document</a>.<br>KeyStore and Alias are used to code-sign applications for release build. KeyStore can contain multiple Alias, but only one Alias is used for code-sign an application.<br>The configuration is saved by user basis.<a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>":"このプロジェクトはリリースビルド設定が行われていません。Google Playストアに登録する場合は、<a href=\"{{ docsUrl.deploy_google_play }}\" target=\"_blank\">ドキュメント</a>を参照してください。<br>リリースビルドではKeyStoreとエイリアスを使用します。KeyStoreには複数のエイリアスを格納できますが、アプリケーションの署名にはそのなかの1つが使用されます。<br>この設定はユーザー単位で保存されます。<a href=\"{{ docsUrl.android_build }}\" target=\"_blank\"><span class=\"m-tooltip-body btn-help\"></span></a>","The project is not linked to a version control repository.":"プロジェクトはバージョン管理のリポジトリにリンクされていません。","The project is synced!":"プロジェクトが同期されました。","The project sharing functionality is not available with your current subscribed plan.":"ご利用中のプランではプロジェクト共有機能を使用することができません。","The project's Cordova version is unsupported by your current plan and can not build. Please upgrade your project and try again.":"Cordovaバージョンが古いため、現在のプランではビルドできません。","The provisioning file is missing. Try running the build with Monaca IDE first.":"プロビジョニングプロファイルが設定されていません。一度、MonacaクラウドIDEでビルドを実行する必要があります。","The public SSH key needs to be added to the third-party remote git service for git command access.":"サードパーティーのgitサービスを使うには、SSH公開鍵を設定する必要があります。","The publicly downloadable option was changed.":"ダウンロード認証の設定が更新されました","The selected build history has been deleted successfully.":"選択したビルド履歴が正常に削除されました。","The service is not available in this system. Please try again.<br>If the error persists, please contact Monaca Support.":"このシステムではサービスは利用できません。もう一度お試しください。<br>エラーが続く場合は、Monacaサポートにお問い合わせください。","The value must be set as an integer.":"整数で入力してください","The windows release build supports the following build packages:":"Windowsリリースビルドは、次のビルドパッケージをサポートしています。","Theme":"テーマ","Theme Color:":"テーマカラー:","There are no logs available at this time for this CI process.":"このCIプロセスは実行中のため、ログはまだ表示できません","There is no archived project.":"アーカイブされたプロジェクトはありません。","There is no configured deploy service.":"追加されたデプロイサービスはありません。","There is no continuous integration history available.":"CIログはありません","There will be no terminal feature in<br>this mode.":"ターミナル機能が無効化されます。","This Icon or splash screen is not set - {{ item.value }}":"アイコンもしくはスプラッシュ画像が設定されていません - {{ item.value }}","This QR code is valid for {{expiration}} seconds.":"あと {{expiration}} 秒有効","This account is managed by team account.":"このアカウントは企業用アカウントと連携しています","This browser has support limitations.":"このブラウザでは動作に制限があります","This build flag is already existed!":"このビルドフラグはすでに存在しています!","This field is required.":"必須入力項目です。","This file is already being uploaded. Please wait and try again.":"このファイルは既にアップロードされています。待ってからもう一度お試しください。","This is a Vulnerability Assessment tool which is provided by LAC Co., Ltd.":"<div style=\"margin: 15px 0;\">アプリケーション脆弱性検査サービスを利用しますか？</div>本サービスは株式会社ラックより提供さています。","This plugin is deprecated.":"このプラグインは非推奨になります","This project does not meet the minimum Cordova version requirement to use this feature.\n            <br>To use this feature, please upgrade your project's Cordova version in the\n            <a href=\"#\" ng-click=\"setPage(settings.Constant.PAGE_CORDOVA_PLUGINS)\">Cordova Plugins page</a>.":"このプロジェクトを利用するには、Cordovaバージョンをアップグレードする必要があります。<br><a href=\"#\" ng-click=\"setPage(settings.Constant.PAGE_CORDOVA_PLUGINS)\">Cordovaプラグイン</a>のページより、Cordovaバージョンをアップグレードしてください。","This project is currently not configured properly to use the Continuous Integration service.\n            <br>To use this service, please link this project with a {{ciResponse.project_vcs.service_type}} repository from the Monaca\n            IDE Version Control Configuration page.":"このプロジェクトでは継続的インテグレーションを利用できません。<br>はじめにMonacaと{{ciResponse.project_vcs.service_type}}レポジトリの連携を行ってください。","This project is currently using Cordova version {{cordovaVersion}}.":"このプロジェクトは現在、Cordova {{cordovaVersion}}を使用しています。","This project is not configured to use the continuous integration service. To use this service, please import\n                  a project from GitHub.":"このプロジェクトは、サービスの利用設定がされていません。GitHubからプロジェクトをインポートしてください。","This project is not published to the web.":"このプロジェクトは公開されていません。","This project is published to the web.":"このプロジェクトは公開されています。","This project is shared by the owner. Do you want to remove it from your list?":"プロジェクトが共有されました。プロジェクト一覧から削除しますか？","This project's web release is currently shared by the owner.":"Web公開が共有されています。","This service is installed as JS/CSS Components.":"このサービスはJS/CSSコンポーネントとしてインストールされます。","This service is installed as a Cordova Plugin.":"このサービスはCordovaプラグインとしてインストールされます。","Tile Wide Logo":"ワイドロゴ（タイル用）","To configure GitHub and connect this project to a repository, you need a blank repository. However, We were unable to find any available repositories to link with.":"GitHubを設定してプロジェクトをレポジトリに接続するには、空白のレポジトリが必要です。","To confirm or remove, go to the Cordova Plugins settings.":"Cordovaプラグイン設定画面より確認と削除を行ってください。","To confirm or remove, go to the JS/CSS Components settings.":"JS/CSSコンポーネント設定画面より確認と削除を行ってください。","To continue to use this project, please upgrade your project to the latest Cordova version or upgrade your subscription plan.":"このプロジェクトを引き続き使用するには、プロジェクトを最新のCordovaバージョンにアップグレードするか、サブスクリプションプランをアップグレードしてください。","To use continuous integration service, your account and project needs to be linked with GitHub.":"サービスを利用するには、アカウントとプロジェクトをGitHubにリンクする必要があります。","To use the In-App Updater update file build, an Corporate Plan upgrade is required. <br> The Corporate Plan includes not only the automatic In-App Updater, but also extended features for resource encryption and secure storage. Details <a href=\"https://monaca.io/enterprise.html\" target=\"_blank\">here</a>.":"In-App Updater用更新ファイルのビルドを利用する為には、企業向けプランへのアップグレードが必要です。<br />企業向けプランは、アプリを自動的に更新するIn-App Updaterだけでなく、<br />リソースの暗号化やセキュアストレージといった拡張機能を利用することができます。詳細は<a href=\"https://ja.monaca.io/enterprise.html\" target=\"_blank\">こちら</a>","Toggle Line Comment":"コメントの切り替え","Trial ends in {{days}} days.":"トライアル期間中です（残り{{days}}日）","Triggers":"トリガーイベント","Trying to connect to server.":"サーバーに接続しています。","Type a description for your commit":"コミットメッセージ","Type to search across all project files":"すべてのプロジェクトファイルから検索します","Type to search...":"検索する単語を入力してください...","UI Design":"UIデザイン","Unable to locate SSH Key. Please generate a SSH key from the <a target=\"_blank\" href=\"{{uiSetup.sshConfigureUrl}}\">User Account Management</a> screen and try again.":"SSH鍵が見つかりません。先に<a target=\"_blank\" href=\"{{uiSetup.sshConfigureUrl}}\">ユーザーアカウント設定</a>画面でSSH鍵を生成して下さい。","Undo":"元に戻す","Unknown Version":"不明なバージョン","Unknown error.":"不明なエラー.","Unsaved modifications will be lost.":"未保存の変更は失われます。","Unsupported Cordova Version":"非対応のCordovaバージョン","Unsupported Xcode version (Xcode {{ item.value }}). Please switch to Xcode 10.1 or higher version in the Build Environment Settings":"サポートされていないXcodeのバージョン(Xcode {{ item.value }})が設定されています。ビルド環境の設定から、Xcodeのバージョンを10.1以上にして下さい。","Untracked":"未トラック","Update Cordova version will affect your project, which can result to unexpected behavior.\n    And all core Cordova plugins will be updated. Do you want to continue?":"Cordovaバージョンを変更すると、アプリの実行に影響がある可能性があります。続行してもよろしいですか？","Update Mode:":"更新モード:","Update all icons at once.":"一括でアイコンを設定する。","Update all images at once.":"一括で設定する","Updates":"お知らせ","Updating Cordova Version":"Cordovaバージョンのアップデート","Updating...":"更新中です...","Upgrade":"アップグレード","Upgrade Completed":"アップグレード成功","Upgrade Confirm":"アップグレードの確認","Upgrade Cordova":"Cordovaのアップグレード","Upgrade Plan":"プランのアップグレード","Upgrade to {{cordova.version.nextLong}}":"{{cordova.version.nextLong}} にアップグレード","Upgrade your account to be able to upload your app to AppStore.":"機能のご利用には、アカウントのアップグレードが必要です。","Upgrade your account to be able to upload your app to Play Store.":"機能のご利用には、アカウントのアップグレードが必要です。","Upgrade your current plan":"プランをアップグレードする","Upload":"アップロード","Upload Certificate":"証明書のアップロード","Upload Compressed ZIP/TGZ Package":"圧縮されたパッケージ(ZIP/TGZ)をアップロード","Upload Files":"ファイル アップロード","Upload Files...":"ファイルをアップロード","Upload Profile":"プロファイルのアップロード","Upload to Play Store":"Play Storeにアップロード","Upload your project zip file located on your computer.":"パソコン上にあるプロジェクトをインポート","Upload...":"アップロード...","Use Different Package Name <br>for Debug Build:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">If enabled, the package name will be *.debug when build type is Debug. Also, package name will be *.debugger when building project debugger.</i></span>":"ビルド種別ごとに<br>パッケージ名を分ける:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">有効にした場合、デバッグビルドではパッケージ名に *.debug が付与されます。デバッガービルドではパッケージ名に *.debugger が付与されます。</i></span>","Use KeyStore to build Andoid app. Submission to Google Play is also possible. Details <a ng-href=\"{{ docsUrl.android_build }}\" target=\"_blank\">here</a>.":"キーストアを用いてAndroidアプリをビルドします。Google Playへの提出も可能です。詳しくは<a href=\"{{ docsUrl.android_build }}\" target=\"_blank\">こちら</a>。","Use Preview for Quicker Access":"レイアウト確認は、「プレビュー機能」で","Use Secure Coding Checker":"Secure Coding Checkerを利用する","Use regular expression":"正規表現を使う","Use this feature to move your unnecessary projects.":"使わなくなったプロジェクトはアーカイブしておくと便利です。","User Name:":"ユーザー名:","VCS Configure...":"バージョン管理設定...","Verify that Monaca Debugger is installed and logged in with the same account as Monaca IDE.":"Monaca Debuggerがインストールされ、Monaca IDEと同じアカウントでログインしていることを確認してください","Verify that the debugger is installed and logged in with the same Cloud IDE account.":"Monaca Debuggerがインストールされ、Monaca IDEと同じアカウントでログインしていることを確認してください","Version <i>{{plugin.version}}</i>":"バージョン <i>{{plugin.version}}</i>","Version Code:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">An internal version number. The value must be set as an integer.</i></span>":"バージョンコード:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">内部バージョン番号を指定します。値は数値である必要があります。</i></span>","Version Number:":"バージョン:","Version:":"バージョン:","Version: {{component.version}}":"バージョン:{{component.version}}","Version:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">Specify three or four numbers separated by dots. (e.g. 1.10.2)<br>Note that each number should be in 0-99.<br>Note that this field is common to Android and iOS.</i></span>":"バージョン:<span class=\"m-tooltip-body icon-help\"><i class=\"m-tooltip tt-text-leftside\">ピリオドで区切られた3もしくは4個の数字を指定します。<br>各フィールドは0から99の間である必要があります。<br>この設定はAndroidとiOSで共通です。</i></span>","VersionName format is incorrect.":"バージョン番号のフォーマットが不正です。","View":"表示","View Details":"詳細を見る","View in the App Store":"App Storeからインストール","View in the Google Play Store":"Google Play Storeを表示する","Visibility:":"公開:","Vulnerability Assessment Service":"セキュリティ検査サービス","Waiting... (Behind {{queue.queue_count}} queues)":"開始まで待機しています（{{queue.queue_count}}件のキューがあります）","We attempted to submit your application to App Store Connect, but had failed due to the following reason:":"アプリケーションをApp Store Connectにアップロードしましたが、下記のエラーが発生いたしました。","We have uploaded your application to App Store Connect.":"App Store Connectへのアップロードに成功しました。","We noticed that following plugins are installed in devDependencies, we will <strong>move</strong> these plugins to dependencies and <strong>upgrade</strong> to the version supported with updated Cordova:":"下記のプラグインはdevDependenciesに設定されています。これらのプラグインはdependenciesに<strong>移動</strong>し、新しいCordovaでサポートするバージョンに<strong>アップグレード</strong>されます。:","We noticed that you have defined \"cordova-android\" package in \"devDependencies\" of \"package.json\" file.<br>The build will fail if the version of \"cordova-android\" is not supported by Monaca. We recommend you remove it from your \"package.json\" file.":"package.jsonのdevDependenciesに「cordova-android」が設定されています。<br>Monacaで利用できないバージョンが指定されている場合、ビルドエラーとなります。package.jsonから「cordova-android」の設定を削除することをお薦めいたします。","We noticed that you have defined \"cordova-ios\" package in \"devDependencies\" of \"package.json\" file. The build will fail if the version of \"cordova-ios\" is not supported by Monaca. We recommend you remove it from your \"package.json\" file.":"package.jsonのdevDependenciesに「cordova-ios」が設定されています。<br>Monacaで利用できないバージョンが指定されている場合、ビルドエラーとなります。package.jsonから「cordova-ios」の設定を削除することをお薦めいたします。","Web":"Web","Web Release":"Web公開","WebView Engine:":"WebViewエンジン:","Website":"Webサイト","Welcome to Monaca Cloud IDE":"MonacaクラウドIDEへようこそ","Windows":"Windows","Windows App Configuration":"Windowsアプリ設定","Windows Build":"Windowsビルド","Windows Build requires Cordova 6.2 or later. Please upgrade cordova version.":"WindowsビルドにはCordova6.2以上が必要です。Cordovaプラグイン画面からCordovaバージョンをアップグレードしてください。","Windows Debug Build":"Windows デバッグ ビルド","Windows Release Build":"Windows リリース ビルド","Windows application will be built. <br>The built application can be installed on a Windows PC. Please see the documentation for installation information.":"Windows向けにアプリケーションをビルドします。<br />作成したアプリケーションはWindows PCにインストールすることができます。インストール方法などはドキュメントを参照してください。","Word Wrap":"折り返し","Word Wrap Column":"折り返す長さ","Workspace Configuration":"ワークスペース設定","Workspace configurations has been saved.":"ワークスペース設定が保存されました。","Xcode":"Xcode","You are about to be redirected away from the Monaca Cloud IDE. Would you like to continue to the \"{{page_title}}\" page?":"MonacaクラウドIDEを閉じようとしています。「{{page_title}}」ページに進みますか？","You are currently sharing this project on the web. Do you want to disable it?":"このプロジェクトはWeb公開が有効になっています。停止しますか？","You are currently sharing this project. Do you want to disable it?":"このプロジェクトは他のユーザーと共有されています。停止しますか？","You can connect your device to the Cloud IDE and Monaca local development tools. All core Cordova plugins are included. <a ng-href=\"{{ docsUrl.install_debugger_android }}\" ng-click=\"$event.stopPropagation()\" target=\"_blank\">See details.</a>":"デバイスをクラウドIDEとMonacaローカル開発ツールに接続することができます。すべてのコアCordovaプラグインが含まれています。詳細は、<a href=\"{{ docsUrl.install_debugger_android }}/\" ng-click=\"$event.stopPropagation()\" target=\"_blank\">こちら</a>。","You can connect your device to the Cloud IDE and Monaca local development tools. All core Cordova plugins are included. Does not support USB debugging under local development. <a ng-href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">See details.</a>":"デバイスをCloud IDEとMonacaローカル開発ツールに接続することができます。すべてのコアCordovaプラグインが含まれています。ローカル開発中のUSBデバッグはサポート対象外です。 詳細は、<a href=\"{{ docsUrl.install_debugger_ios }}\" target=\"_blank\">こちら</a>。","You can download the built package from ios release build below.":"下のアイコンからリリースビルドのパッケージをダウンロードできます。","You can export the data to make a backup on your local PC.":"ローカルPCへのバックアップのためにデータをエクスポートすることができます。","You can export the data to make a backup on your local PC.<br>You need to input password to export this file. Password will be used when importing to your computer. Blank password is not recommended.":"ローカルPCへのバックアップのためにデータをエクスポートすることができます。<br>このファイルのエクスポートにはパスワードを入力する必要があります。パスワードを空白にすることは推奨されません。","You can import KeyStore file from other source (eclipse). Please refer to the manual for details.":"他のアプリケーションで使用しているKeyStoreファイルをインポートすることができます。詳細はマニュアルを参照してください。","You can import private key exported from Key Chain Access (Mac OS X). Please refer to the manual for details.":"Key Chain Accessツールからエクスポートした秘密鍵をインポートできます。詳細はマニュアルを参照してください。","You can link your {{ciResponse.project_vcs.service_type}} account at the\n            <a ng-click=\"configureVcs()\">Link {{ciResponse.project_vcs.service_type}} Account</a> account settings page.":"{{ciResponse.project_vcs.service_type}}アカウントの連携は、\n            <a ng-click=\"configureVcs()\">{{ciResponse.project_vcs.service_type}}と連携する</a>から行えます。","You can manually hide the splash screen with JavaScript to increase user experience.":"JavaScriptコードでスプラッシュ画面を非表示にすることができます。","You can only use numbers.":"半角数字のみ使用可能です。","You can view up to 3 records for each platform.<br>Please upgrade your account to see the full history.":"現在のプランでは各プラットフォームごとに最新の3件まで閲覧できます。<br>すべての履歴を見るにはアカウントをアップグレードしてください。","You can't create projects anymore in your plan.":"ご利用のプランではプロジェクト数に制限があります。","You do not have the necessary setting to build.":"ビルドに必要な設定が出来ていません。","You have turn off the web released url.":"Web公開URLを無効にしました。","You have turn on the web released url.":"Web公開URLを有効にしました。","You have unsaved changes. Are you sure you want to close this file?":"保存していない変更があります。本当にこのファイルを閉じますか？","You have unsaved changes. Please save them before pull / merge.":"保存されていない変更があります。プル/マージの前に変更を保存してください。","You must use <a href=\"https://www.php.net/manual/en/function.preg-match.php\" target=\"_blank\" rel=\"noopener\">preg_match</a> pattern (Example: <code>/master/</code>, <code>/^dev_[a-z0-9_]*/i</code>)":"<a href=\"https://www.php.net/manual/ja/function.preg-match.php\" target=\"_blank\" rel=\"noopener\">preg_match</a> パターン形式で記述 (Example: <code>/master/</code>, <code>/^dev_[a-z0-9_]*/i</code>)","You need to check at least 1 iOS target device family.":"対象デバイスを選択してください。","You need to check at least 1 target.":"対象デバイスを選択してください。","You need to link to your Google account to continue this operation. Do you wish to continue?":"この操作を続行するには、Googleアカウントへのリンクが必要です。続行しますか？","You need to rebuild the app to apply the change.":"変更の反映にはアプリの再ビルドが必要です。","You need to reload the browser to take effect":"変更の反映にはアプリの再ブラウザのリロードが必要です","Your Code (editable)":"あなたのソースコード（編集可能）","Your PC":"PC","Your browser does not support iframes.":"お使いのブラウザは、インラインフレームをサポートしていません。","Your build is successfully finished. Please click <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a> to see the build log.":"ビルドに成功しました。ビルドログを確認するには<a href=\"#\" ng-click=\"showBuildLogTextArea()\">こちらをクリック</a>してください。","Your build is successfully finished. Please download and install the app on the device. Please click <a href=\"#\" ng-click=\"showBuildLogTextArea()\">here</a> to see the build log.":"ビルドに成功しました。ビルドログを確認するには<a href=\"#\" ng-click=\"showBuildLogTextArea()\">こちらをクリック</a>してください。","Your changes has successfully been committed.":"変更は正常にコミットされました。","Your current subscription plan does not support the Git SSH feature. To use this feature, please upgrade to a supported plan.":"現在のプランではGitのSSH機能を使うことができません。この機能を使うには、対応プランにアップグレードして下さい。","Your email: {{userInfo.email}}":"あなたのメールアドレス: {{userInfo.email}}","Your local changes have been discarded successfully.":"ローカルの変更の破棄に成功しました。","Your plan not support the imported plugin.":"ご利用中のプランでは、インポートされたプラグインは利用できません。","Your project has been upgraded to a newer version. <br/><div style=\"font-size: 13px;margin-top:7px;\">Furthermore, we created a back up in '{{new_project_name}}'</div>":"プロジェクトがアップデートされました。<br/><div style=\"font-size: 13px;margin-top:7px;\">また、バックアップを'{{new_project_name}}’に作成しました。</div>","Your project has successfully been uploaded to \"{{configOptions.selectedRepository}}\".":"GitHubの\"{{configOptions.selectedRepository}}\" リポジトリへのアップロードに成功しました。","Your project has successfully been uploaded to the \"{{initCurrentRepository}}\" repository on GitHub.":"GitHubの\"{{initCurrentRepository}}\" リポジトリへのアップロードに成功しました。","Your project is available to import to anyone by accessing the generated link below. <br> If you no longer wish for your project to be public, you can make it private again by clicking the <strong>Make Private</strong> button.":"生成されたリンクにアクセスすることで、誰でもこのプロジェクトをインポートできるようになります。<br> プロジェクトを公開したくない場合は、「<strong>プライベートにする</strong>」ボタンをクリックしてプロジェクトを再びプライベートにします。","[Cordova version &gt;= 5]":"[Cordovaバージョン &gt;= 5]","[Cordova version &lt; 5]":"[Cordovaバージョン &lt; 5]","alias":"エイリアス","build finish time":"ビルド完了時間","committed":"コミットされました","dSYM Download":"dSYMダウンロード","dSYM Download:":"dSYMダウンロード:","default":"default","does not exist.":"は存在しません。","eg. API_KEY=12345":"例: API_KEY=12345","elapsed time":"経過時間","exists but failed to load.":"は存在しましたが、読み込みに失敗しました。","expiration date of download":"ダウンロード有効期限","expiration date: {{crt.expirationms|date:'yyyy/M/d'}}":"有効期限: {{crt.expirationms|date:'yyyy/M/d'}}","failed to recover project":"プロジェクトの再構成に失敗しました。","http://example.com/monaca-project.zip":"http://example.com/monaca-project.zip","iOS":"iOS","iOS &gt;":"iOS &gt;","iOS AdHoc Build":"iOSアドホックビルド","iOS Allowed URL will also be changed.":"iOSの「許可する外部URL」も変更されます。","iOS App Configuration":"iOSアプリ設定","iOS App ID will also be changed.":"iOSのパッケージ名も変更されます。","iOS App Store Upload":"iOS App Store アップロード","iOS Application Name will also be changed.":"iOSのアプリケーション名も変更されます。","iOS Build Configuration":"iOSビルド設定","iOS Debug Build":"iOSデバッグビルド","iOS Debugger Build":"iOSデバッガービルド","iOS In-House Build":"iOS In-Houseビルド","iOS InAppUpdater Build":"InAppUpdaterビルド","iOS Overscroll configuration will also be changed.":"iOSのオーバースクロール設定も変更されます。","iOS Platform:":"iOSプラットフォーム:","iOS Release Build":"iOSリリースビルド","iOS Simulator Build":"iOS シュミュレータービルド","iOS/Android Version will also be changed.":"iOS/Anrdoidのバージョンも変更されます。","iOS/Windows Version will also be changed.":"iOS/Windowsのバージョンも変更されます。","iPad":"iPad","iPhone, iPod touch":"iPhone, iPod Touch","in another project.":"(他プロジェクト内)","loading...":"読み込み中…","macOS":"macOS","macOS Debug Build":"macOS デバッグビルド","macOS Release Build":"macOS リリースビルド","monaca":"monaca","or":"または","or later":"以上","password":"パスワード","search for email":"search for email","severe":"severe","ssh://":"ssh://","ssh://...":"ssh://...","{{ loadingText }}":"{{ loadingText }}","{{ logText }}:":"{{ logText }}:","{{ template }} App Configuration":"{{ template }} アプリ設定","{{build.description}}":"{{build.description}}","{{build.name}}":"{{build.name}}","{{buildTaskResult.name}}":"{{buildTaskResult.name}}","{{ciResponse.ci_tickets.usable}}/{{ciResponse.ci_tickets.total}} (Complimentary : {{ciResponse.ci_tickets.total_complimentary}})":"{{ciResponse.ci_tickets.usable}}/{{ciResponse.ci_tickets.total}}回 (無料 : {{ciResponse.ci_tickets.total_complimentary}})","{{ciResponse.project_vcs.service_type}} Account":"{{ciResponse.project_vcs.service_type}}アカウント","{{commit.commit_id}}":"{{commit.commit_id}}","{{component.displayName}} Web Component":"{{component.displayName}} Webコンポーネント","{{deviceName}} is connected!":"{{deviceName}}が接続されました。","{{header.user}}":"{{header.user}}","{{iconType}}":"{{iconType}}","{{loadingText}}":"{{loadingText}}","{{newFilePath}} already exists.":"{{newFilePath}} は既に存在しています。","{{ownerName}}":"{{ownerName}}","{{plan}} plan has finished its trial period.":"{{plan}}プランのトライアル期間が終了しました。","{{previewerId}}":"{{previewerId}}","{{selected_service.name}} Configurations":"{{selected_service.name}}の詳細設定","{{service.name}} Details":"{{service.name}} の詳細","{{users.length}} user(s) in this project:":"{{users.length}}名のユーザーで共有されています:"});
/* jshint +W100 */
}]);
;angular.module('monacaIDE')
  .directive('stepper', ['$timeout', ($timeout) => {
    return {
      transclude: true,
      restrict: 'E',
      scope: {
        control: '=',
        linear: '=?',
        startclosed: '=?'
      },
      bindToController: true,
      controller: function ($scope, $rootScope, $element, $attrs) {
        this.steps = [];
        this.currentStep = this.startclosed ? -1 : 0;

        /**
         * Adds a step to this stepper. (Internal function)
         *
         * @param {Object} step step Object to add
         * @returns {Number} index of the added step
         */
        this.$addStep = function (step) {
          return this.steps.push(step) - 1;
        }.bind(this);

        /**
         * Activates the next step if it can be activated.
         *
         * @returns {boolean} true if next step could be activated, false otherwise.
         */
        this.next = function () {
          if (!this.canActivate(this.currentStep + 1)) {
            return false;
          }
          // skip inactive steps
          for (let i = this.currentStep + 1; i < this.steps.length; i++) {
            if (!this.steps[i].inactive) {
              this.currentStep = i;
              return true;
            }
          }
          return false;
        }.bind(this);

        /**
         * Activates the previous step if the currently active step is not the first one.
         *
         * @returns {boolean} true if previous step could be activated, false otherwise.
         */
        this.back = function () {
          if (this.currentStep > 0) {
            this.currentStep--;
            return true;
          }
          return false;
        }.bind(this);

        /**
         * Activates a step and fires a beforeStepSelected and afterStepSelected event if fireEvent is true.
         *
         * @param {Number} stepNumber index of step to activate
         * @param {boolean} fireEvent set to true if events should be fired, true otherwise
         *
         * @returns {boolean} true if step could be activated, false otherwise.
         */
        this.goto = function (stepNumber, fireEvent) {
          if (!this.canActivate(stepNumber) || stepNumber === this.currentStep) {
            return false;
          }
          if (stepNumber < this.steps.length) {
            if (fireEvent && this.control.beforeStepSelected) {
              this.control.beforeStepSelected(stepNumber);
            }
            // wait for changes made during beforeStepSelected to render, so content gets its proper height for slideDown animation
            $timeout(() => {
              this.currentStep = stepNumber;
            });
            if (fireEvent && this.control.afterStepSelected) {
              this.control.afterStepSelected(stepNumber);
            }
            return true;
          }
          return false;
        }.bind(this);

        /**
         * Check if step is the currently active step. (Internal function)
         *
         * @param {Object} step step Object to check
         * @return {boolean} true if step is the currently active step, false otwerwise.
         */
        this.isActiveStep = function (step) {
          return this.steps.indexOf(step) === this.currentStep;
        }.bind(this);

        /**
         * Check if a step can be activated. (Internal function)
         *
         * @param {Number} stepNumber index of step to check
         * @returns {boolean} true if stepper is linear, stepNumber is 0 or the previous not optional and not inactive step is completed, false otherwise.
         */
        this.canActivate = function (stepNumber) {
          if (!this.linear || stepNumber === 0) {
            return true;
          }
          var idx = stepNumber - 1;
          while (idx >= 0) {
            // skip optinal and inactive steps
            if (this.steps[idx].optional || this.steps[idx].inactive) {
              idx--;
            } else {
              return this.steps[idx].completed;
            }
          }
          return true;
          // we have to return true if there was no return before.
          // This is required to make the first not inactive step always selectable
          // if the first step has stepNumber > 0;
        }.bind(this);

        /**
         * Checks if a step is completed.
         *
         * @param {Number} stepNumber index of step to check
         * @returns {boolean} true if step is completed, false otherwise
         */
        this.isCompleted = function (stepNumber) {
          return this.steps[stepNumber].completed;
        }.bind(this);
      },
      link: function (scope, element, attrs) {
        if (scope.stepper.control) {
          // if a control object is provided then populate it with proxy functions
          scope.stepper.control.next = scope.stepper.next.bind(scope);
          scope.stepper.control.back = scope.stepper.back.bind(scope);
          scope.stepper.control.goto = scope.stepper.goto.bind(scope);
        }
      },
      controllerAs: 'stepper',
      templateUrl: 'stepper/stepper.tpl.html'
    };
  }])
  .directive('step', ['$compile', ($compile) => {
    return {
      require: '^^stepper',
      transclude: true,
      restrict: 'E',
      scope: {
        label: '@',
        completed: '@',
        optional: '=?',
        inactive: '=?'
      },
      bindToController: true,
      controller: function ($scope, $element, $compile) {
        this.$stepper = {};
        this.stepNumber = 0;
        this.completed = false;

        /**
         * Called by Angular after the step elements are compiled and linked to the directive.
         * We add the step to the parent stepper and reset the content height to prevent animation issues.
         */
        this.$postLink = function () {
          this.stepNumber = this.$stepper.$addStep(this);
          $($element).find('.step-completed').slideDown(0);
          $($element).find('.step-content').slideUp(0);
        }.bind(this);

        /**
         * Check if this step is the currently active step. (Internal function, proxy to parent stepper's isActiveStep(step) function)
         *
         * @returns {boolean} true if this step is the currently active step, false otherwise.
         */
        this.isActive = function () {
          return this.$stepper.isActiveStep(this);
        }.bind(this);

        /**
         * Check if the step is disabled. Disabled steps cannot be selected. (Internal function)
         *
         * @returns {boolean} true if this step is the first one or the step can be activated, false otherwise
         */
        this.isDisabled = function () {
          if (this.stepNumber === 0) {
            return false;
          } else {
            return !this.$stepper.canActivate(this.stepNumber);
          }
        }.bind(this);

        /**
         * Gets the human readable index of this step. (Internal function)
         *
         * @returns {Number} the human readable index of this step.
         */
        this.getStepNumber = function () {
          let stepNumber = 1;
          for (var i = 0; i < this.$stepper.steps.indexOf(this); i++) {
            // skip inactive steps
            if (!this.$stepper.steps[i].inactive) {
              stepNumber++;
            }
          }
          return stepNumber;
        }.bind(this);
      },
      controllerAs: '$ctrl',
      link: (scope, element, attr, stepperCtrl) => {
        scope.$ctrl.$stepper = stepperCtrl;
        scope.$watch(function () {
          return scope.$ctrl.isActive();
        }, function (isActive) {
          // open content if the step is active
          if (isActive) {
            $(element).find('.step-completed').slideUp('fast');
            $(element).find('.step-content').slideDown('fast');
          } else {
            $(element).find('.step-completed').slideDown('fast');
            $(element).find('.step-content').slideUp('fast');
          }
        });
        scope.$watch(function () {
          return scope.$ctrl.inactive;
        }, function (inactive) {
          // hide the step if it's inactive
          if (inactive) {
            $(element).find('.step-wrapper').slideUp('fast');
          } else {
            $(element).find('.step-wrapper').slideDown('fast');
          }
        });
      },
      templateUrl: 'stepper/step.tpl.html'
    };
  }]);

;angular.module('monacaIDE').directive('onImageLoadError', function () {
  return {
    restrict: 'A',
    scope: {
      callback: '&onImageLoadError'
    },
    link: function (scope, element, attrs) {
      element.bind('error', function () {
        if (scope.callback) {
          scope.callback();
        }
      });
    }
  };
});

;angular.module('monacaIDE').directive('notificationOfUnsupportedCordova', [
  function () {
    return {
      replace: true,
      restrict: 'A',
      template: '<div ng-include src="getTemplateUrl()"></div>',
      controller: function ($scope) {
        $scope.getTemplateUrl = function () {
          if (parseFloat($scope.cordovaVersion) < 7) {
            return 'build/notification/deprecatedCordova.html';
          } else if (parseFloat($scope.cordovaVersion) < 8) {
            return 'build/notification/willDeprecatedCordova.html';
          }
        };
      }
    };
  }
]);

;angular.module('monacaIDE').factory('CustomBuildSettingsFactory', [function () {
  const _defaultReport = {
    id: 'NONE',
    label: 'No Report'
  };
  const _availableReports = [
    _defaultReport,
    {
      id: 'CODE_COVERAGE',
      label: 'Code Coverage'
    },
    {
      id: 'JUNIT',
      label: 'JUnit'
    }
  ];

  return {
    getDefaultReport: () => {
      return _defaultReport;
    },
    getAvailableReports: () => {
      return _availableReports;
    },
    getBuildTasks: (batchBuild, allBuildTasks) => {
      if (!batchBuild || !batchBuild.buildTasks || !batchBuild.buildTasks.length || !allBuildTasks || !allBuildTasks.length) return [];
      let buildTaskIDs = [];
      let buildTasks = [];
      batchBuild.buildTasks.forEach(item => {
        if (typeof item === 'string') buildTaskIDs.push(item);
      });
      if (buildTaskIDs && buildTaskIDs.length) {
        buildTaskIDs.forEach(buildTaskID => {
          buildTasks.push(allBuildTasks.filter(buildTask => buildTask.id === buildTaskID)[0]);
        });
      }
      return buildTasks;
    }
  };
}]);

;angular.module('monacaIDE').controller('CustomBuildSettingsController', [
  '$scope',
  '$uibModal',
  '$templateCache',
  'gettextCatalog',
  'ProjectService',
  'PubSub',
  'Constant',
  'CustomBuildSettingsFactory',
  function ($scope, $uibModal, $templateCache, gettextCatalog, ProjectService, PubSub, Constant, CustomBuildSettingsFactory) {
    $scope.isLoading = true;
    $scope.buildTasks = [];
    $scope.batchBuilds = [];
    $scope.allBuildTasks = []; // including deleted build tasks
    $scope.reports = CustomBuildSettingsFactory.getAvailableReports();

    $scope.getReport = (reportID) => {
      if (!reportID) return CustomBuildSettingsFactory.getDefaultReport();
      return $scope.reports.filter(report => report.id === reportID)[0] || CustomBuildSettingsFactory.getDefaultReport();
    };

    $scope.openBuildTask = (buildTask) => {
      if (buildTask && buildTask.report) {
        if (typeof buildTask.report === 'string') {
          buildTask.report = $scope.getReport(buildTask.report);
        }
      }
      $uibModal.open({
        template: $templateCache.get('BuildTaskDialog.html'),
        controller: 'BuildTaskDialog',
        windowClass: 'build-task-dialog',
        backdrop: 'static',
        resolve: {
          title: () => {
            if (buildTask) return gettextCatalog.getString('Edit Task');
            return gettextCatalog.getString('New Task');
          },
          buildTask: () => {
            return buildTask;
          },
          reports: () => {
            return $scope.reports;
          },
          buildTasks: () => {
            return $scope.buildTasks;
          }
        }
      });
    };

    $scope.openBatchBuild = (batchBuild) => {
      let isEditing = (batchBuild && batchBuild.id);
      let tmpBatchBuild = Object.assign({}, batchBuild);
      if (tmpBatchBuild && tmpBatchBuild.buildTasks && tmpBatchBuild.buildTasks.length) {
        tmpBatchBuild.buildTasks = CustomBuildSettingsFactory.getBuildTasks(tmpBatchBuild, $scope.allBuildTasks);
      }
      $uibModal.open({
        template: $templateCache.get('BatchBuildDialog.html'),
        controller: 'BatchBuildDialog',
        windowClass: 'batch-build-dialog',
        backdrop: 'static',
        resolve: {
          title: () => {
            if (isEditing) return gettextCatalog.getString('Edit Batch Build');
            return gettextCatalog.getString('New Batch Build');
          },
          batchBuild: () => {
            return tmpBatchBuild;
          },
          availableBuildTasks: () => {
            return $scope.buildTasks || [];
          },
          batchBuilds: () => {
            return $scope.batchBuilds || [];
          }
        }
      });
    };

    $scope.loadData = () => {
      $scope.isLoading = true;
      ProjectService.getCustomBuildTasks(window.config.projectId)
        .then(result => {
          $scope.allBuildTasks = result.buildTasks;
          // filter active builds
          $scope.buildTasks = result.buildTasks.filter(item => (item.isDeleted === false || item.isDeleted === '0' || item.isDeleted === 0));
          $scope.batchBuilds = result.batchBuilds.filter(item => (item.isDeleted === false || item.isDeleted === '0' || item.isDeleted === 0));
          $scope.isLoading = false;
        })
        .catch(err => {
          console.log(err);
        });
    };

    PubSub.subscribe(Constant.EVENT.CUSTOM_BUILD_RELOAD, () => {
      $scope.loadData();
    });

    $scope.loadData();
  }
]);

;angular.module('monacaIDE').controller('NewRemoteBuildController', [
  '$scope',
  '$timeout',
  'ProjectService',
  'PubSub',
  'Constant',
  'CustomBuildSettingsFactory',
  'gettextCatalog',
  function ($scope, $timeout, ProjectService, PubSub, Constant, CustomBuildSettingsFactory, gettextCatalog) {
    $scope.stepperCtrl = {};
    $scope.isLoading = true;
    $scope.isProcessing = false;
    $scope.selectedBuildTitle = '';
    $scope.selectedBuild = null;
    $scope.builds = [];
    $scope.allBuildTasks = [];
    $scope.projectId = window.config.projectId ? window.config.projectId : $scope.$parent.selectedProject.projectId;
    $scope.componentId = `mn-gl-${Constant.VIEW.CUSTOM_BUILD_VIEW}`;

    $scope.selectBuild = (build) => {
      if (!build) return;
      const type = typeof build;
      let selectedBuildTitle;
      if (type === 'string') {
        selectedBuildTitle = build;
      } else if (type === 'object') {
        selectedBuildTitle = build.name;
      }
      $scope.selectedBuildTitle = selectedBuildTitle;
      $scope.selectedBuild = build;
      $scope.next();
    };

    $scope.close = () => {
      if ($scope.$parent && $scope.$parent.close && typeof $scope.$parent.close === 'function') {
        $scope.$parent.close();
      } else {
        PubSub.publish(Constant.EVENT.CLOSE_A_VIEW, $scope.componentId);
      }
    };

    $scope.start = () => {
      $scope.isProcessing = true;
      let batchBuild = $scope.selectedBuild;
      const batchBuildName = batchBuild.name;
      let buildTasks = CustomBuildSettingsFactory.getBuildTasks(batchBuild, $scope.allBuildTasks);
      let buildParams = {
        platform: 'custom',
        purpose: batchBuildName,
        batch_build: batchBuild,
        build_tasks: buildTasks
      };

      MonacaApi.Ide.Build.build($scope.projectId, buildParams)
        .then(response => {
          let queueID = response.body.result.queue_id;
          if (window.location.href.indexOf('/build/') > -1) {
            window.location.href = `/build/${$scope.projectId}/build-result/${queueID}`;
          } else if (window.location.href.indexOf('/editor/') > -1) {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('Start building')
            });
            PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
              open: true,
              componentState: {
                id: queueID,
                title: gettextCatalog.getString('Build Results'),
                icon: 'settings',
                templateUrl: 'build/BuildResult.html'
              }
            });
            $scope.close();
          } else if (window.location.href.indexOf('/dashboard') > -1) {
            const url = `/build/${$scope.projectId}/build-result/${queueID}`;
            window.open(url);
            $scope.$parent.close();
          }
          $scope.isProcessing = false;
        })
        .catch(err => {
          console.log(err);
          $scope.isProcessing = false;
          $scope.close();
        });
    };

    $scope.loadData = () => {
      return new Promise((resolve, reject) => {
        $scope.isLoading = true;
        ProjectService.getCustomBuildTasks($scope.projectId)
          .then(result => {
            $scope.allBuildTasks = result.buildTasks;
            $scope.builds = result.batchBuilds.filter(item => (item.isDeleted === false || item.isDeleted === '0' || item.isDeleted === 0));
            $scope.isLoading = false;
            $timeout(() => resolve(true), 1000); // leave some times for rendering and initing stepper directive
          })
          .catch(err => {
            $scope.isLoading = false;
            console.log(err);
            reject(err);
          });
      });
    };

    $scope.next = () => {
      $timeout(() => $scope.stepperCtrl.next());
    };

    $scope.loadData()
      .then(() => {
        $scope.next();
      })
      .catch(err => {
        console.log(err);
        $scope.close();
      });

  }]);

//# sourceMappingURL=app.common.js.map