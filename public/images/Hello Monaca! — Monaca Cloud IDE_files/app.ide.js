'use strict';
angular.module('monacaIDE').directive('askUpdateOldProjectDialog', [
  'ProjectFactory', 'Dialog', 'PubSub', 'Constant', 'gettextCatalog',
  function (ProjectFactory, Dialog, PubSub, Constant, gettextCatalog) {

    return {
      restrict: 'E',
      link: function (scope, element, attrs) {
        ProjectFactory.loading.then(function () {
          if (ProjectFactory.isCordovaProject() && ProjectFactory.getCordovaVersion() < 6) {
            Dialog.alert(gettextCatalog.getString('For Cordova 5.x and earlier projects, The support for build and application settings has been discontinued. Please update the project.'))
              .then(function () {
                PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
                  open: true,
                  componentState: {
                    id: 'cordovapluginsettings',
                    title: gettextCatalog.getString('Cordova Plugin Settings'),
                    icon: 'settings',
                    templateUrl: 'build/CordovaPlugins.html'
                  }
                });
              });
          }
        });
      }
    };
  }
]);

;angular.module('monacaIDE')
  .directive('placeholder', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.attr('placeholder', gettextCatalog.getString(attrs.placeholder));
      }
    };
  }])
  .directive('alt', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.attr('alt', gettextCatalog.getString(attrs.alt));
      }
    };
  }])
  .directive('title', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.attr('title', gettextCatalog.getString(attrs.title));
      }
    };
  }])
  .directive('s-loading-text', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.attr('s-loading-text', gettextCatalog.getString(attrs['s-loading-text']));
      }
    };
  }]);

;angular.module('monacaIDE').directive('devicePreviewer', [
  '$sce',
  '$httpParamSerializer',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'TerminalFactory',
  '$http',
  '$interval',
  'ProjectFactory',
  'CommonFunctionService',
  function ($sce, $httpParamSerializer, PubSub, Constant, gettextCatalog, TerminalFactory, $http, $interval, ProjectFactory, CommonFunctionService) {
    return {
      restrict: 'E',
      scope: {
        previewerId: '='
      },
      template: `
        <iframe title="{{previewerId}}" ng-if="!safeMode" ng-src="{{url}}"><p translate>Your browser does not support iframes.</p></iframe>
        <div ng-if="safeMode" style="height: 100%; display: flex; justify-content: center; align-items: center;"><p translate>The previewer is not available in safe mode.</p></div>
      `,
      link: function ($scope, element) {
        element.addClass('previewer-view');
        const baseUrl = `/preview/${window.config.projectId}?id=${$scope.previewerId}&terminal=${CommonFunctionService.isTerminalService()}`;
        const _checkingPreviewUrlInterval = 5000;
        const staticPreviewUrl = window.config.staticPreviewUrl;
        var checkPreviewUrlInterval;
        $scope.previewUrl = staticPreviewUrl;
        $scope.url = '';
        $scope.safeMode = false; // default value (always open previewer)

        $scope.onDetachBtn = () => {
          const params = $httpParamSerializer({
            width: 640,
            height: 480,
            left: 100,
            top: 100,
            status: 'no',
            location: 'no',
            scrollbars: 'no',
            toolbar: 'no',
            personalbar: 'no',
            menubar: 'no'
          }).replace('&', ',');

          window.open(`${baseUrl}&previewUrl=${$scope.previewUrl}`, 'monaca_preview_window', params);

          PubSub.publish(Constant.EVENT.SEND_ANALYTICS, {
            category: Constant.ANALYTICS.CATEGORY,
            action: Constant.ANALYTICS.ACTION.OPEN,
            label: Constant.ANALYTICS.LABEL.MENU,
            value: Constant.ANALYTICS.VALUE.PREVIEW
          });

          PubSub.publish(Constant.EVENT.TOGGLE_PREVIEWER_VIEW, {
            componentState: { id: $scope.previewerId },
            open: false
          });

          $scope.wasDetached = true;
        };

        var setStaticPreviewUrl = () => {
          PubSub.publish(Constant.EVENT.PREVIEWER_VIEW_URL_CHANGED, {url: staticPreviewUrl});
          $scope.url = $sce.trustAsResourceUrl(`${baseUrl}&is_attach=1&previewUrl=${staticPreviewUrl}`);
        };

        var checkPreviewUrl = () => {
          if (!CommonFunctionService.isTerminalService()) return;
          if (!TerminalFactory.isNetworkStable()) return;

          let previewUrl = TerminalFactory.getPreviewUrl();
          if (!previewUrl) {
            $scope.validPreviewUrl = false;
            return;
          }
          const fetchOptions = {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'include'
          };
          fetch(previewUrl, fetchOptions)
            .then(response => {
              if (response && response.status === 200) {
                $scope.previewUrl = previewUrl;
                $scope.url = $sce.trustAsResourceUrl(`${baseUrl}&is_attach=1&previewUrl=${$scope.previewUrl}`);
                $scope.validPreviewUrl = true;
              } else {
                $scope.validPreviewUrl = false;
              }
            })
            .catch(() => {
              $scope.validPreviewUrl = false;
            });
        };

        // check whether the IDE is open in safe mode.
        if (!ProjectFactory.hasPreviewerService()) {
          $scope.safeMode = true;
        } else {
          // initialize
          setStaticPreviewUrl();
          if (CommonFunctionService.isTerminalService()) {
            checkPreviewUrl();
            checkPreviewUrlInterval = $interval(() => {
              if (!$scope.validPreviewUrl) {
                checkPreviewUrl();
              }
            }, _checkingPreviewUrlInterval);
          }
        }

        PubSub.subscribe(Constant.EVENT.PREVIEWER_VIEW_URL_CHANGED, function (data) {
          checkPreviewUrl();
        });

        PubSub.subscribe(Constant.EVENT.PREVIEWER_VIEW_URL_FAILED, function (data) {
          setStaticPreviewUrl();
          checkPreviewUrl();
        });

        const destroySubId = PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, (opts) => {
          if (opts.componentId === element.parent().attr('id')) {
            if (!$scope.wasDetached) {
              const localStorageKey = `${window.config.projectId}_mn-gl-${$scope.previewerId}_previewer`;
              localStorage.removeItem(localStorageKey);
            }

            // stop $interval
            if (checkPreviewUrlInterval || angular.isDefined(checkPreviewUrlInterval)) {
              $interval.cancel(checkPreviewUrlInterval);
              checkPreviewUrlInterval = undefined;
            }
            PubSub.unsubscribe(destroySubId);
            $scope.$destroy();
          }
        });
      }
    };
  }
]);

;angular.module('monacaIDE').directive('normalEditorTab', [
  'NormalEditorTab',
  function (NormalEditorTab) {
    return {
      restrict: 'E',
      scope: {}, // Caution: Header and footer will be broken when all tabs are closed if you remove this line.
      link (scope, element, attrs) {
        element.css({ // Set editor tab to match parent dimensions for editor to ingest and render correctly.
          display: 'block',
          height: '100%',
          width: '100%',
          '-webkit-user-select': 'initial' // Fixes https://github.com/microsoft/monaco-editor/issues/1629
        });

        new NormalEditorTab(scope, element, attrs);
      }
    };
  }
]);

;angular.module('monacaIDE').directive('compareEditorTab', [
  'gettextCatalog',
  'CompareEditorTab',
  function (gettextCatalog, CompareEditorTab) {
    return {
      restrict: 'E',
      scope: {}, // Caution: Header and footer will be broken when all tabs are closed if you remove this line.
      template: `
        <div>
          <div style="
            display: flex;
            flex: 1;
            align-items: center;
            height: 100%;
            justify-content: flex-start;
            padding-left: 11px;
          ">${gettextCatalog.getString('Example Answer (read-only)')}</div>
          <div style="
            display: flex;
            flex: 1;
            align-items: center;
            border-left: 1px solid #eee;
            height: 100%;
            padding-left: 11px;
          ">${gettextCatalog.getString('Your Code (editable)')}</div>
          <div style="
            width: 30px;
            height: 100%;
          "><!-- Spacer for div.diffOverview --></div>
        </div>
        <div></div>
      `,
      link (scope, element, attrs) {
        element.css({ // Set editor tab to match parent dimensions for editor to ingest and render correctly.
          display: 'block',
          height: '100%',
          width: '100%',
          '-webkit-user-select': 'initial' // Fixes https://github.com/microsoft/monaco-editor/issues/1629
        });
        element.children().eq(0).css({
          height: '30px',
          'background-color': '#fff',
          'border-bottom': '1px solid #e8eaed',
          'display': 'flex',
          'justify-content': 'space-evenly',
          'align-items': 'center',
          'font-weight': 'bold',
          color: '#888'
        });
        element.children().eq(1).css({
          height: '100%',
          width: '100%'
        });

        new CompareEditorTab(scope, element.children().eq(1), attrs);
      }
    };
  }
]);

;angular.module('monacaIDE').directive('fileUpload', function () {
  return {
    restrict: 'A',
    scope: {
      fileUpload: '='
    },
    link: function ($scope, element, attrs) {
      element.bind('change', function (event) {
        event.stopPropagation();
        event.preventDefault();

        $scope.fileUpload(element[0].files[0]).then(
          function () {
            element.val(null);
          },
          function () {
            element.val(null);
          }
        );
      });
    }
  };
}).directive('fileread', [function () {
  return {
    scope: {
      fileread: '='
    },
    link: function (scope, element, attributes) {
      element.bind('change', function (changeEvent) {
        scope.$apply(function () {
          scope.fileread = changeEvent.target.files[0];
          // or all selected files:
          // scope.fileread = changeEvent.target.files;
        });
      });
    }
  };
}]);

;angular.module('monacaIDE').directive('ideGoldenLayout', [
  'Constant',
  'GoldenLayoutService',
  'PubSub',
  'gettextCatalog',
  'UserFactory',
  '$uibModal',
  '$window',
  'CommonFunctionService',
  'ProjectFactory',
  'GlobalEditorConfig',
  function (Constant, GoldenLayoutService, PubSub, gettextCatalog, UserFactory, $modal, $window, CommonFunctionService, ProjectFactory, GlobalEditorConfig) {
    return {
      restrict: 'A',
      link: function ($scope, element) {
        $scope.resetLayout = () => {
          if (window.confirm(gettextCatalog.getString('Do you want to reset the layout? This will reload the IDE.'))) {
            GoldenLayoutService.resetLayout();
          }
        };

        $scope.showWelcomeMessage = () => {
          return GoldenLayoutService.isInitialised() && !GoldenLayoutService.areViewsOpen();
        };

        // Initialise GoldenLayout
        GoldenLayoutService.init(element);
        PubSub.subscribe(Constant.EVENT.RESET_LAYOUT, $scope.resetLayout);

        // TODO is there a global KeyListener? I haven't found one yet.
        document.addEventListener('keydown', (event) => {
          if (event.altKey && event.keyCode === 87) {
            if (event.shiftKey && !event.ctrlKey) { // Shift+Alt+W
              GoldenLayoutService.closeTabsInStack($scope.activeStack, 'all');
            } else if (!event.shiftKey && event.ctrlKey) { // Ctrl+Alt+W
              GoldenLayoutService.closeTabsInStack($scope.activeStack, 'other');
            } else { // Alt+W
              GoldenLayoutService.closeTabsInStack($scope.activeStack, 'active');
            }
          } else if (event.altKey) {
            if (event.keyCode === 219) { // Alt+[
              GoldenLayoutService.selectPreviousTabInStack($scope.activeStack);
            } else if (event.keyCode === 221) { // Alt+]
              GoldenLayoutService.selectNextTabInStack($scope.activeStack);
            }
          }
        });

        //
        // Set up the + buttons in the tab bars
        //
        const $element = $(element);
        const $tabAddDropdownContainer = $element.find('.tab-add-dropdown-container');
        const $tabCloseDropdownContainer = $element.find('.tab-close-dropdown-container');

        const debuggerDropDownItem = {
          id: 'tab-add-debugger',
          icon: 'm-icon-new-debugger',
          title: gettextCatalog.getString('New Debugger'),
          shouldDisable: () => {
            const componentId = GoldenLayoutService.getComponentId(Constant.VIEW.DEBUGGER_VIEW);
            return !!GoldenLayoutService.getComponentInstanceById(componentId);
          },
          onClick: (tabBar) => PubSub.publish(Constant.EVENT.TOGGLE_DEBUGGER_VIEW, { open: true, tabBar })
        };
        const previewerDropDownItem = {
          id: 'tab-add-previewer',
          icon: 'm-icon-new-previewer',
          title: gettextCatalog.getString('New Previewer'),
          onClick: (tabBar) => {

            if (ProjectFactory.hasPreviewerService()) {
              PubSub.publish(Constant.EVENT.TOGGLE_PREVIEWER_VIEW, {
                open: true,
                tabBar,
                componentState: { id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER) }
              });
            } else {
              $modal.open({
                templateUrl: 'commonDialogs/AlertDialog.html',
                controller: 'AlertController',
                windowClass: 'confirm-window',
                resolve: {
                  title: function () {
                    return gettextCatalog.getString('New Previewer');
                  },
                  message: function () {
                    return gettextCatalog.getString('<p>The previewer is not available in safe mode.</p>');
                  }
                }
              });
            }
          }
        };
        const terminalDropDownItem = {
          id: 'tab-add-terminal',
          icon: 'm-icon-new-terminal',
          title: gettextCatalog.getString('New Terminal'),
          onClick: (tabBar) => {
            if (UserFactory.canCreateNewTerminal()) {

              PubSub.publish(Constant.EVENT.TOGGLE_TERMINAL_VIEW, {
                open: true,
                tabBar,
                componentState: {
                  id: 'terminal_' + Math.random().toString(36).substring(7),
                  templateUrl: 'terminal.html'
                }
              });

            } else {

              $modal.open({
                templateUrl: 'commonDialogs/AlertDialog.html',
                controller: 'AlertController',
                windowClass: 'confirm-window',
                resolve: {
                  title: function () {
                    return gettextCatalog.getString('New Terminal');
                  },
                  message: function () {
                    return gettextCatalog.getString('<p>Only paid users can use this function. Please upgrade your subscription plan.</p>');
                  }
                }
              });

            }
          }
        };

        let addTabDropdownItems = [];
        if (ProjectFactory.hasDebuggerService() && GlobalEditorConfig.showDebuggerPanel()) addTabDropdownItems.push(debuggerDropDownItem);
        if (ProjectFactory.hasPreviewerService()) addTabDropdownItems.push(previewerDropDownItem);
        if (CommonFunctionService.isTerminalService()) addTabDropdownItems.push(terminalDropDownItem);

        const closeTabDropdownItems = [
          {
            id: 'tab-close-tabs',
            icon: 'm-icon-close-all-tabs',
            title: gettextCatalog.getString('Close All Tabs'),
            onClick: (tabBar) => GoldenLayoutService.closeAllTabsWindow(tabBar)
          },
          {
            id: 'tab-close-other',
            title: gettextCatalog.getString('Close Other Tabs'),
            onClick: (tabBar) => GoldenLayoutService.closeOtherTabsWindow(tabBar)
          }
        ];

        var hiddenTabItems = [ ];

        $scope.onStackCreated = (opts) => {
          const stack = opts.stack;

          if ((addTabDropdownItems && addTabDropdownItems.length >= 1) && !GoldenLayoutService._isAloneProjectViewStack(stack)) {
            stack.header.tabsContainer.append('<button aria-label="addTabButton" class="add-tab-button"></button>');
            stack.header.controlsContainer.prepend('<button aria-label="addTabButton" class="close-tab-button"></button>');
          }

          // Store stack in $scope when it's clicked (this will fire if the target of the click is an editor window).
          stack.element.click(function () {
            // $scope.activeStack will be the target for shortcuts.
            $scope.activeStack = stack;
          });
        };

        $scope.generateNewAddTabDropdownHtml = () => {
          return addTabDropdownItems
            .map((menuItem) => {
              const isDisabled = typeof menuItem.shouldDisable === 'function' ? menuItem.shouldDisable() : false;
              return `<li id="${menuItem.id}" class="tab-add ${isDisabled ? 'disabled' : ''}"><i class="m-icon ${menuItem.icon || 'm-icon-none'}"></i><span>${menuItem.title}</span></li>`;
            })
            .join('');
        };

        $scope.generateNewCloseTabDropdownHtml = () => {
          return hiddenTabItems.concat(closeTabDropdownItems)
            .map((menuItem) => {
              if (menuItem.id === 'separator') {
                return '<li><hr/></li>';
              }
              const isDisabled = typeof menuItem.shouldDisable === 'function' ? menuItem.shouldDisable() : false;
              return `<li id="${menuItem.id}" class="tab-close ${isDisabled ? 'disabled' : ''}"><i class="m-icon ${menuItem.icon || 'm-icon-none'}"></i><span>${menuItem.title}</span></li>`;
            })
            .join('');
        };

        PubSub.subscribe(Constant.EVENT.GL_STACK_CREATED, $scope.onStackCreated);

        $element.on('click', '.add-tab-button', (ev) => {
          const bounds = ev.currentTarget.getBoundingClientRect();
          const $dropdown = $tabAddDropdownContainer.find('.tab-add-dropdown');
          $scope.activeTabBar = ev.currentTarget;

          $tabAddDropdownContainer.toggleClass('open');
          $dropdown.html($scope.generateNewAddTabDropdownHtml())
            .css({
              top: bounds.bottom,
              left: Math.min(bounds.left, (window.innerWidth - $dropdown.width() - 10))
            });
        });

        $element.on('click', '.close-tab-button', (ev) => {
          const bounds = ev.currentTarget.getBoundingClientRect();
          const $dropdown = $tabCloseDropdownContainer.find('.tab-close-dropdown');
          $scope.activeTabBar = ev.currentTarget;

          $tabCloseDropdownContainer.toggleClass('open');

          hiddenTabItems = [];
          var hiddenItems = GoldenLayoutService.getHiddenItems($scope.activeTabBar);
          for (var i = 0; i < hiddenItems.length; i++) {
            const item = hiddenItems[i];
            hiddenTabItems.push({
              id: `hidden-tab-item-${i}`,
              title: item.title,
              icon: `nomask jstree ${item.icon}`,
              componentState: item.componentState,
              onClick: (tabBar, componentState) => {
                if (componentState) {
                  PubSub.publish(Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW, {
                    open: true,
                    componentState: componentState
                  });
                } else {
                  PubSub.publish(Constant.EVENT.TOGGLE_DEBUGGER_VIEW, { open: true, tabBar });
                }
              }
            });
          }

          if (hiddenTabItems.length > 0) {
            hiddenTabItems.push({id: 'separator'});
          }

          $dropdown.html($scope.generateNewCloseTabDropdownHtml())
            .css({
              top: bounds.bottom,
              left: Math.min(bounds.left, (window.innerWidth - $dropdown.width() - 10)),
              maxHeight: `calc(100% - ${bounds.bottom + 20}px`
            });
        });

        $tabAddDropdownContainer
          .on('click', '.tab-add', (ev) => {
            if ($(ev.currentTarget).hasClass('disabled')) return;
            const id = ev.currentTarget.id;
            const menuItem = addTabDropdownItems.find(item => item.id === id);
            menuItem.onClick($scope.activeTabBar);
            $tabAddDropdownContainer.removeClass('open');
          })
          .on('click', (ev) => {
            // Hide the dropdown if the user clicks anywhere outside it
            if (ev.target === ev.currentTarget) {
              $(ev.currentTarget).removeClass('open');
            }
          });

        $tabCloseDropdownContainer
          .on('click', '.tab-close', (ev) => {
            if ($(ev.currentTarget).hasClass('disabled')) return;
            const id = ev.currentTarget.id;
            const menuItem = hiddenTabItems.concat(closeTabDropdownItems).find(item => item.id === id);
            menuItem.onClick($scope.activeTabBar, menuItem.componentState);
            $tabCloseDropdownContainer.removeClass('open');
          })
          .on('click', (ev) => {
            // Hide the dropdown if the user clicks anywhere outside it
            if (ev.target === ev.currentTarget) {
              $(ev.currentTarget).removeClass('open');
            }
          });
      }
    };
  }
]);

;/*
 * jstree.directive [http://www.jstree.com]
 * http://arvindr21.github.io/jsTree-Angular-Directive
 *
 * Copyright (c) 2014 Arvind Ravulavaru
 * Licensed under the MIT license.
 */

angular.module('monacaIDE').directive('jsTree', ['PubSub', 'Constant', '$http', 'FileUtilityFactory', 'ProjectService', '$q', function (PubSub, Constant, $http, FileUtilityFactory, ProjectService, $q) {
  var treeDir = {
    restrict: 'EA',
    fetchResource: function (url, cb) {
      return $http.get(url).then(function (data) {
        if (cb) cb(data.data);
      });
    },

    documentEventList: {},

    convertToTreeModel: function (rawData) {
      var safeKey = '';
      return Object.keys(rawData).map(function (key) {
        safeKey = FileUtilityFactory.escapeFileName(key);
        var res = Object.assign({}, rawData[key], {
          id: safeKey,
          text: safeKey.split('/').pop(),
          parent: safeKey.split('/').slice(0, -1).join('/') || '#'
        });
        if (rawData[key]['type'] === 'dir') {
          res.state = {opened: false};
        }

        return res;
      }) || [];
    },

    managePlugins: function (s, e, a, config) {
      if (a.treePlugins) {
        config.plugins = a.treePlugins.split(',');
        config.core = config.core || {};
        config.core.check_callback = config.core.check_callback || true;

        if (config.plugins.indexOf('state') >= 0) {
          config.state = config.state || {};
          config.state.key = a.treeStateKey;
        }

        if (config.plugins.indexOf('search') >= 0) {
          var to = false;
          if (e.next().attr('class') !== 'ng-tree-search') {
            e.after('<input type="text" placeholder="Search Tree" class="ng-tree-search"/>')
              .next()
              .on('keyup', function (ev) {
                if (to) {
                  clearTimeout(to);
                }
                to = setTimeout(function () {
                  treeDir.tree.jstree(true).search(ev.target.value);
                }, 250);
              });
          }
        }

        if (config.plugins.indexOf('checkbox') >= 0) {
          config.checkbox = config.checkbox || {};
          config.checkbox.keep_selected_style = false;
        }

        if (config.plugins.indexOf('contextmenu') >= 0) {
          if (a.treeContextmenu || a.treeContextmenuaction) {
            config.contextmenu = config.contextmenu || {};

            if (a.treeContextmenuaction) {
              config.contextmenu.items = function (e) {
                return s.$eval(a.treeContextmenuaction)(e);
              };
            } else {
              config.contextmenu.items = function () {
                return s[a.treeContextmenu];
              };
            }
          }
        }

        if (config.plugins.indexOf('types') >= 0) {
          if (a.treeTypes) {
            config.types = s[a.treeTypes];
          }
        }

        if (config.plugins.indexOf('dnd') >= 0) {
          if (a.treeDnd) {
            config.dnd = s[a.treeDnd];
          }
          config.dnd.copy = false;
        }
      }

      config.plugins.push('sort');

      return config;
    },

    manageEvents: function (s, e, a) {
      treeDir.documentEventList = {};

      if (a.treeEvents) {
        for (var key in s[a.treeEvents]) {
          if (key.indexOf('vakata') > -1) {
            treeDir.documentEventList[key] = s[a.treeEvents][key];
            $(document).on(key, s[a.treeEvents][key]);
          } else {
            treeDir.tree.on(key + '.jstree', s[a.treeEvents][key]);
          }
        }

        // Adding new event: Open /www folder when the user does not have a local storage with the state
        if (JSON.parse(localStorage.getItem(a.treeStateKey)) === null) {
          treeDir.tree.on('loaded.jstree', function () {
            $q.when(ProjectService.getIsTranspile(window.config.projectId)).then(function (resp) {
              if (!resp) {
                treeDir.tree.jstree(true).open_node(document.querySelector('[id=\'/www\']'));
              }
            });
          });
        }

      }
    },

    link: function (s, e, a) { // scope, element, attribute \O/
      $(function () {
        var config = {
          dnd: {
            check_while_dragging: false
          }
        };

        // users can define 'core'
        config.core = {};

        if (a.treeCore) {
          config.core = $.extend(config.core, s[a.treeCore]);
        }

        // clean Case
        a.treeData = a.treeData ? a.treeData.toLowerCase() : '';
        a.treeSrc = a.treeSrc ? a.treeSrc.toLowerCase() : '';

        if (a.treeData === 'html') {
          treeDir.fetchResource(a.treeSrc, function (data) {
            e.html(data);
            treeDir.init(s, e, a, config);
          });
        } else if (a.treeData === 'json') {
          treeDir.fetchResource(a.treeSrc, function (data) {
            config.core.data = treeDir.convertToTreeModel(data);
            treeDir.init(s, e, a, config);
          });
        } else if (a.treeData === 'scope') {
          s.$watch(a.resetCounter, function (n, o) {
            if (n) {
              config.core.data = treeDir.convertToTreeModel(s[a.treeModel]);

              for (var key in treeDir.documentEventList) {
                $(document).off(key);
              }

              $(e).jstree('destroy');
              treeDir.init(s, e, a, config);
            }
          }, true);
          // Trigger it initally
          // Fix issue #13
          config.core.data = treeDir.convertToTreeModel(s[a.treeModel]);
          treeDir.init(s, e, a, config);
        } else if (a.treeAjax) {
          config.core.data = {
            'url': a.treeAjax,
            xhrFields: {
              withCredentials: true
            },
            'data': function (node) {
              return {
                'path': node.id !== '#' ? node.id : '/'
              };
            },
            'dataFilter': function (nodes) {
              let object = JSON.parse(nodes);
              if (object.result) {
                return JSON.stringify(treeDir.convertToTreeModel(object.result.items || {}));
              }
            },
            'error': function (jqXHR, textStatus, errorThrown) {
              PubSub.publish(Constant.EVENT.TREE_ERROR, errorThrown);
            }
          };
          treeDir.init(s, e, a, config);
        }
      });
    },

    init: function (s, e, a, config) {
      treeDir.managePlugins(s, e, a, config);

      config.core.multiple = false;
      // maybe this is not working...
      config.core.dblclick_toggle = false;

      // Sorting tree alphabetically but display directories first then file.
      // https://stackoverflow.com/questions/28188417/jstree-triggering-the-sort-plugin
      config.sort = function (a, b) {
        var nodeA = this.get_node(a);
        var nodeB = this.get_node(b);
        var typeA = nodeA.original.type;
        var typeB = nodeB.original.type;
        var textA = nodeA.text.toLowerCase();
        var textB = nodeB.text.toLowerCase();
        var result = 0;

        switch (typeA) {
        case 'dir':
          if (typeB !== 'dir') {
            result = -1;
          } else {
            result = textA > textB ? 1 : -1;
          }
          break;
        default:
          if (typeB === typeA) {
            result = textA > textB ? 1 : -1;
          } else {
            result = 1;
          }
          break;
        }
        return result;
      };

      this.tree = $(e).jstree(config);
      treeDir.manageEvents(s, e, a);
    }
  };

  return treeDir;
}]);

;angular.module('monacaIDE').directive('ngEnter', function () {
  return {
    restrict: 'A',
    scope: {
      action: '&ngEnter'
    },
    link: function (scope, element, attr) {
      element.bind('keydown keypress', function (evt) {
        if (evt.which === 13) {
          scope.$apply(scope.action);
          evt.preventDefault();
        }
      });
    }
  };
});

;angular.module('monacaIDE').directive('showTail', function () {
  return function (scope, elem, attr) {
    scope.$watch(function () {
      if (elem[0].tagName === 'DIV') {
        return elem[0].innerText;
      }
      return elem[0].value;
    },
    function (e) {
      elem[0].scrollTop = elem[0].scrollHeight;
    });
  };
});

;angular.module('monacaIDE').directive('simpleDrop', function () {
  return {
    restrict: 'A',
    scope: {
      'simpleDrop': '='
    },
    link: function ($scope, element, attrs) {
      element.bind('drop', function (event) {
        event.stopPropagation();
        event.preventDefault();

        $scope.simpleDrop(event);
      });

      element.bind('dragover', function (event) {
        event.stopPropagation();
        event.preventDefault();
      });
    }
  };
});

;angular.module('monacaIDE').directive('spinner', ['gettextCatalog', function (gettextCatalog) {
  var defaultSettings = {
    lines: 11, // The number of lines to draw
    length: 0, // The length of each line
    width: 14, // The line thickness
    radius: 38, // The radius of the inner circle
    scale: 0.3, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#000', // #rgb or #rrggbb or array of colors
    opacity: 0.25, // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner-loading', // The CSS class to assign to the spinner
    top: '44%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    position: 'absolute' // Element positioning
  };

  return {
    template: function (element, attr) {
      var loadingTextHtml = '';

      if (attr.sLoadingText) {
        loadingTextHtml = '<div class="spinner-loading-text">' + gettextCatalog.getString(attr.sLoadingText) + '</div>';
      }

      if (attr.sType === 'modal') {
        return '<div style="height: 40px; padding: 5px;">' + loadingTextHtml + '</div>';
      } else if (attr.sType === 'spinner-button') {
        return '<div style="padding: 0 3px 0 16px;"></div>';
      }

      return '<div>' + loadingTextHtml + '</div>';
    },

    link: function (scope, element, attr) {
      var overrideSettings = {};

      if (attr.sType && attr.sType === 'modal') {
        overrideSettings = {
          color: '#000',
          scale: 0.12,
          className: 'spinner-loading-small',
          position: 'relative',
          top: '24%'
        };
      } else if (attr.sType && attr.sType === 'spinner-button') {
        overrideSettings = {
          color: '#000',
          scale: 0.1,
          className: 'spinner-loading-small',
          position: 'relative',
          left: '100%',
          zIndex: 0
        };
      } else if (attr.sType && attr.sType === 'white') {
        overrideSettings = {
          color: '#fff'
        };
      } else {
        overrideSettings = {
          color: '#000'
        };
      }

      new Spinner(angular.extend(defaultSettings, overrideSettings)).spin(element[0].querySelector('div'));
    }
  };
}]);

;/**
 * accept attribute:
 * type: spinner style
 * title: Loading title description
 * title-size: css font-size format (px, em...)
 * spinner-size: decimal number
 * color: css color format (#fff, red...)
 */
angular.module('monacaIDE').directive('textSpinner', ['$compile', function ($compile) {
  var defaultSettings = {
    lines: 11, // The number of lines to draw
    length: 36, // The length of each line
    width: 14, // The line thickness
    radius: 38, // The radius of the inner circle
    scale: 0.3, // Scales overall size of the spinner
    corners: 0.8, // Corner roundness (0..1)
    color: '#333', // #rgb or #rrggbb or array of colors
    opacity: 0.25, // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner-loading', // The CSS class to assign to the spinner
    top: '44%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    position: 'absolute' // Element positioning
  };

  return {
    template: function (element, attr) {
      var title = attr.title ? attr.title : '';
      // all type can be check here https://maxbeier.github.io/text-spinners/
      var type = attr.type ? attr.type : 'dots';
      if (type === 'spin') {
        return `<div><p>${title}</p><div class='spinner'></div></div>`;
      }
      return `<div><p>${title}</p><span class="loading ${type}"></span></div>`;
    },
    link: function (scope, element, attr) {
      angular.element(element[0].querySelector('div')).css('height', '100%');
      angular.element(element[0].querySelector('div')).css('display', 'flex');
      angular.element(element[0].querySelector('div')).css('flex-direction', 'row');
      angular.element(element[0].querySelector('div')).css('flex-wrap', 'wrap');
      angular.element(element[0].querySelector('div')).css('justify-content', 'center');
      angular.element(element[0].querySelector('div')).css('align-items', 'center');
      angular.element(element[0].querySelector('div')).css('align-content', 'center');

      // var parentWidth = angular.element(element[0]).parent()[0].offsetWidth;
      // var titleWidth = angular.element(element[0].querySelector('p'))[0].offsetWidth;
      // if (parentWidth == titleWidth) {
      //   angular.element(element[0].querySelector('.spinner')).css('margin-top', '10px');
      // }

      let color = attr.color ? attr.color : '#333';
      angular.element(element[0].querySelector('div')).css('color', attr.color);

      let size = attr.spinnerSize ? attr.spinnerSize : 16;

      if (attr.type && attr.type === 'spin') {
        var overrideSettings = {
          scale: size / 97,
          className: 'spinner-loading-small',
          position: 'relative',
          color: color
        };

        angular.element(element[0].querySelector('.spinner')).css('margin-left', '10px');
        angular.element(element[0].querySelector('.spinner')).css('margin-bottom', '4px');

        new Spinner(angular.extend(defaultSettings, overrideSettings)).spin(element[0].querySelector('.spinner'));
      } else {
        angular.element(element[0].querySelector('span')).css('font-size', `${attr.spinnerSize}px`);
      }

      if (attr.titleSize) {
        angular.element(element[0].querySelector('p')).css('font-size', attr.titleSize);
      }

      if (attr.title) {
        angular.element(element[0].querySelector('p')).css('padding', '8px');
      }
    }
  };
}]);

;angular.module('monacaIDE').directive('wrapIf', [function () {
  return {
    restrict: 'A',
    transclude: true,
    link: function (scope, element, attrs, controller, transclude) {
      if (attrs.wrapIf) {
        transclude(function (clone) {
          element.append(clone);
        });
      } else {
        transclude(function (clone) {
          element.replaceWith(clone);
        });
      }
    }
  };
}]);

;'use strict';
var fullscreen = (function () {
  return {
    toggleFullScreen: function (term, fullscreen) {
      var fn;
      if (typeof fullscreen === 'undefined') {
        fn = (term.element.classList.contains('fullscreen')) ? 'remove' : 'add';
      } else if (!fullscreen) {
        fn = 'remove';
      } else {
        fn = 'add';
      }
      term.element.classList[fn]('fullscreen');
    },
    apply: function (terminalConstructor) {
      terminalConstructor.prototype.toggleFullScreen = function (fullscreen) {
        return fullscreen.toggleFullScreen(this, fullscreen);
      };
    }
  };
})();

if (typeof exports !== 'undefined') {
  module.exports.fullscreen = fullscreen;
} else {
  window.fullscreen = fullscreen;
}

;'use strict';
var winptyCompat = (function () {
  return {
    winptyCompatInit: function (terminal) {
      var isWindows = ['Windows', 'Win16', 'Win32', 'WinCE'].indexOf(navigator.platform) >= 0;
      if (!isWindows) {
        return;
      }
      terminal.on('linefeed', function () {
        var line = terminal.buffer.lines.get(terminal.buffer.ybase + terminal.buffer.y - 1);
        var lastChar = line[terminal.cols - 1];
        if (lastChar[3] !== 32) {
          var nextLine = terminal.buffer.lines.get(terminal.buffer.ybase + terminal.buffer.y);
          nextLine.isWrapped = true;
        }
      });
    },
    apply: function (terminalConstructor) {
      terminalConstructor.prototype.winptyCompatInit = function () {
        winptyCompat.winptyCompatInit(this);
      };
    }
  };
})();

if (typeof exports !== 'undefined') {
  module.exports.winptyCompat = winptyCompat;
} else {
  window.winptyCompat = winptyCompat;
}

;/**
 * Factory for xterm's Terminal
 */
angular.module('monacaIDE').factory('xtermTerminal', [function () {
  return Terminal;
}]);

/**
 * Factory for FitAddon
 */
angular.module('monacaIDE').factory('xtermTerminalFitAddon', [function () {
  return FitAddon.FitAddon;
}]);

/**
 * Factory for AttachAddon
 */
angular.module('monacaIDE').factory('xtermTerminalAttachAddon', [function () {
  return AttachAddon.AttachAddon;
}]);

/**
 * Factory for WebSocket
 */
angular.module('monacaIDE').factory('monacaWebsocket', ['$window', function ($window) {
  var Socket = $window.WebSocket || $window.MozWebSocket;

  if (!Socket) {
    throw 'WebSocket not supported';
  }

  Socket.prototype.isOpen = function () {
    var OPEN = WebSocket.OPEN || 1;
    return this.readyState === OPEN;
  };

  return Socket;
}]);

/**
 * Terminal directive
 */
angular.module('monacaIDE').directive('monacaTerminal', ['TerminalFactory', 'TerminalSettingFactory', 'TerminalService', '$timeout', '$q', function (TerminalFactory, TerminalSettingFactory, TerminalService, $timeout, $q) {
  return {
    restrict: 'E',
    template: '<div ng-style="terminalController.ngStyle">' +
      '<div class="terminal-info-container" ng-if="terminalController.showLoader">' +
      '<text-spinner ng-if="terminalController.isTranspile"  type="dots" title="Launching terminal server..." title-size="14px" spinner-size="16" color="skyblue"></text-spinner>' +
      '<text-spinner ng-if="!terminalController.isTranspile" type="dots" title="Launching terminal..." title-size="14px" spinner-size="16" color="skyblue"></text-spinner>' +
      '</div>' +
      '<div ng-if="terminalController.error != null && !terminalController.isTranspile" class="terminal-error-container" ng-transclude="error">' +
      '<p class="terminal-error">{{ terminalController.error }}</p>' +
      '</div>' +
      '<div class="terminal-info-container" ng-if="terminalController.error != null && terminalController.isTranspile">' +
      '<text-spinner class="terminal-info" type="dots" title="Launching terminal server..." title-size="14px" spinner-size="16" color="skyblue"></text-spinner>' +
      '</div>' +
      '</div>',
    replace: true,
    bindToController: {
      options: '=',
      style: '=cssStyle'
    },
    transclude: {
      loader: '?terminalLoader',
      error: '?terminalError'
    },
    controllerAs: 'terminalController',
    controller: [
      'xtermTerminal',
      'xtermTerminalFitAddon',
      'xtermTerminalAttachAddon',
      '$element',
      '$http',
      '$scope',
      'monacaWebsocket',
      '$rootScope',
      '$window',
      '$timeout',
      '$interval',
      'gettextCatalog',
      'PubSub',
      'Constant',
      'CommonFunctionService',
      'ProjectFactory',
      'FontFaceLoader',
      function (
        Terminal, FitAddon, AttachAddon, $element, $http, $scope, websocket, $rootScope, $window,
        $timeout, $interval, gettextCatalog, PubSub, Constant, CommonFunctionService, ProjectFactory, FontFaceLoader) {
        var vm = this;
        var pid;
        var _scrollBarWidth = 15;
        var _cellWidth = 7;
        var _cellHeight = 16;
        var _elementPaddingHor = 18;
        var _elementPaddingVer = 10;
        var _errorText = gettextCatalog.getString('Error occured.');
        const CTRL_C = '\x03';

        vm.term = null;
        vm.socket = null;
        vm.isTranspile = true;
        var options = {
          terminal: {
            cursorBlink: false,
            scrollback: 1000,
            tabStopWidth: 8,
            fontSize: 12,
            fontFamily: 'Monaco'
          },
          autoResize: true,
          keepAliveIntervalSec: 5,
          width: 0,
          height: 0,
          id: ''
        };

        vm.$onInit = function () {
          doInit();
        };

        function doInit () {
          if (!TerminalFactory.isNetworkStable()) return;
          // Clean terminal
          $element.children().remove();
          options = angular.extend(options, vm.options);

          vm.isTranspile = options.isTranspile;
          vm.showLoader = true;
          vm.ngStyle = vm.style || {};
          vm.error = null;

          const defaultTerminalOption = {
            macOptionClickForcesSelection: bowser.mac,
            windowsMode: bowser.windows,
            rendererType: 'dom'
          };
          const terminalOpts = Object.assign({}, defaultTerminalOption, options.terminal);
          FontFaceLoader.loadFont(TerminalFactory.getSettings().fontFamily)
            .then(() => {
              vm.term = new Terminal(terminalOpts);
              if (vm.isTranspile) {
                vm.term.attachCustomKeyEventHandler(event => {
                  if ((event.code === 'Escape') ||
                    (event.ctrlKey) ||
                    (event.altKey) ||
                    (event.metaKey)
                  ) {
                    // process
                  } else {
                    event.preventDefault();
                    return false;
                  }
                });
              }
              vm.term.open($element[0]);
              vm.term.forceResize = resizeFn;
              vm.term.sendTranspileCommand = sendTranspileCommandFn;
              vm.term.getSocket = getSocketFn;
              vm.term.reInit = doInit;
              vm.term.loading = loadingFn;
              vm.term.getErrorMessage = getErrorMessageFn;
              vm.term.setUIConfiguration = setUIConfigurationFn;
              vm.term.forceFocus = focusFn;
              vm.term.clearTmuxSession = clearTmuxSessionFn;
              vm.term.killPreviewPort = killPreviewPort;
              vm.term.sendCtrlC = sendCtrlC;

              // load UI configuration
              let config = TerminalFactory.getSettings();
              setConfigOption(config);

              if (options.focus === true) {
                vm.term.focus();
              }

              vm.setTerminalSize(options.width, options.height);

              if (options.autoResize) {
                vm.watchResize();
              }

              // get terminal pid
              var headers = options.headers || {};
              headers['Content-Type'] = 'application/x-www-form-urlencoded';

              $http.post(options.url, createPidRequestBody(), { withCredentials: true, headers: headers }).then(function (response) {
                if (!response || !response.data) {
                  throw 'Response does not contain terminal pid';
                }

                callback('onConnect'); // eslint-disable-line
                pid = response.data;

                vm.socket = new websocket(getTerminalEndpointUrl(response.data)); // eslint-disable-line
                vm.socket.onopen = vm.attach;
                vm.socket.onclose = vm.onClose;
                vm.socket.onerror = vm.onError;
                vm.socket.onmessage = vm.onMessage;
              }).catch(function (err) {
                console.log('Could not connect to terminal server with error code', err.status);
                if (err && err.status === 401) {
                  vm.showLoader = false;
                  vm.showError();
                  let message = gettextCatalog.getString(getCookieErrorMessage());
                  let subMessage = gettextCatalog.getString('Trying to connect to server. ');
                  PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                    className: 'danger',
                    content: subMessage + message
                  });
                  if (vm.isTranspile || (!ProjectFactory.isTranspileLogEnabled())) {
                    TerminalFactory.networkIsNotStable(); // retry for 3 times
                    PubSub.publish(Constant.EVENT.TERMINAL_SERVER_RESPONSE_FAILED, {
                      reason: message
                    });
                  }
                } else if (!ProjectFactory.isTranspileLogEnabled() && err && (err.status === 400 || err.status === 502)) {
                  TerminalFactory.setContainerID(''); // reset current container id
                  vm.showLoader = true;
                } else {
                  vm.showLoader = false;
                  vm.showError();
                }
              });

              // onInit callback with terminal
              callback('onInit', vm.term); // eslint-disable-line
            }).catch(function (error) {
              console.log(error);
            });
        }

        function getCookieErrorMessage () {
          let message = '';
          if (bowser.safari) {
            if (bowser.version === '11.0') {
              message = 'Please make sure that you disable the "Prevent cross-site tracking".';
            } else {
              message = 'Please make sure that you allow all the cookies.';
            }
          } else {
            message = 'Please make sure that you DO NOT block any 3rd party cookies.';
          }
          return message;
        }

        function createPidRequestBody () {
          var postRequest = options.credentials || {};
          postRequest.cols = options.terminal.cols;
          postRequest.rows = options.terminal.rows;
          if (angular.isDefined(options.customCommand)) {
            postRequest.command = options.customCommand;
          }
          if (angular.isDefined(options.killSession) && options.killSession) {
            postRequest.killSession = true;
          }
          postRequest.sessionWindow = options.id;

          return Object.keys(postRequest).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(postRequest[key]); }).join('&');
        }

        function getResizeUrl (base, pid) {
          base += base[base.length - 1] === '/' ? '' : '/';
          return base + pid + '/size';
        }

        function getTerminalCLoseUrl (base, pid) {
          base += base[base.length - 1] === '/' ? '' : '/';
          return base + pid + '/close';
        }
        /**
         * Send empty message periodically to keep connection alive.
         */
        function startKeepAliveInterval () {
          if (options.keepAliveIntervalSec > 0) {
            var intervalPromise = $interval(function () {
              if (vm.socket.isOpen()) {
                vm.socket.send('');
              } else {
                $interval.cancel(intervalPromise);
              }
            }, options.keepAliveIntervalSec * 1000);
          }
        }

        /**
         * Construct url where the websocket connection should be made
         * @param {*} pid Terminal pid
         */
        function getTerminalEndpointUrl (pid) {
          var protocol = '';
          if (options.wss === true) {
            protocol += 'wss://';
          } else if (options.wss === false) {
            protocol += 'ws://';
          } else {
            protocol += options.url.substring(0, 5) === 'https' ? 'wss://' : 'ws://';
          }

          var base = options.url.substring(options.url.indexOf('://') + 3);
          if (base[base.length - 1] !== '/') {
            base += '/';
          }

          return protocol + base + pid;
        }

        /**
         * calculate terminal's row and column count
         */
        vm.setTerminalSize = function (width, height) {
          const viewportElement = $element[0].getElementsByClassName('xterm-viewport')[0];
          let clientWidth = (typeof width === 'undefined') ? viewportElement.clientWidth : width;
          let clientHeight = (typeof height === 'undefined') ? viewportElement.clientHeight : height;

          // Calculate padding
          let elementPaddingHor = parseInt(angular.element($element).parent().css('padding-right')) + parseInt(angular.element($element).parent().css('padding-left'));
          if (!elementPaddingHor || elementPaddingHor <= 0) elementPaddingHor = _elementPaddingHor;
          clientWidth = clientWidth - elementPaddingHor;

          let elementPaddingVer = parseInt(angular.element($element).parent().css('padding-top')) + parseInt(angular.element($element).parent().css('padding-bottom'));
          if (!elementPaddingVer || elementPaddingVer <= 0) elementPaddingVer = _elementPaddingVer;
          clientHeight = clientHeight - elementPaddingVer;

          let scrollBarWidth = $element[0].offsetWidth - clientWidth;
          if (!scrollBarWidth || scrollBarWidth <= 0) scrollBarWidth = _scrollBarWidth;

          const cellWidth = getTerminalActualWidth() || _cellWidth;
          const cellHeight = getTerminalActualHeight() || _cellHeight;
          options.terminal.cols = Math.round((clientWidth - scrollBarWidth) / cellWidth, 0);
          options.terminal.rows = Math.floor(clientHeight / cellHeight);

          if (options.terminal.cols && options.terminal.rows) {
            vm.term.resize(options.terminal.cols, options.terminal.rows);
          }
        };

        function getTerminalActualWidth () {
          try {
            if (!vm.term || !vm.term._core) return 0;
            return vm.term._core._renderService.dimensions.actualCellWidth;
          } catch (error) {
            return 0;
          }
        }

        function getTerminalActualHeight () {
          try {
            if (!vm.term || !vm.term._core) return 0;
            return vm.term._core._renderService.dimensions.actualCellHeight;
          } catch (error) {
            return 0;
          }
        }

        /**
         * bind event listener to window resize event
         */
        vm.watchResize = function () {
          angular.element($window).bind('resize', resizeFn);
          vm.term.onResize(vm.doResizeCall);
        };

        /**
         * call resize fn, but only after 100ms, to prevent too much resizes
         */
        function resizeFn (width, height) {
          $timeout(function () {
            vm.resize(width, height);
          }, 100);
        }

        function setConfigOption (config) {
          if (!config) return;
          for (let key in config) {
            if (key === 'terminalOS') continue;
            let value = config[key];
            if (key === 'theme') value = TerminalSettingFactory.getThemeConfiguration(value);
            vm.term.setOption(key, value);
          }
        }

        function focusFn () {
          vm.term.focus();
        }

        function setUIConfigurationFn (config) {
          setConfigOption(config);
          _cellWidth = getTerminalActualWidth() || _cellWidth;
          _cellHeight = getTerminalActualHeight() || _cellHeight;
          callback('onTerminalOptionChanged', config); // eslint-disable-line
        }

        function clearTmuxSessionFn (tmuxSessionName) {
          let headers = vm.options.headers || {};
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          let url = getTerminalCLoseUrl(vm.options.url, pid);
          if (url && tmuxSessionName) {
            $http.post(url, `sessionWindow=${tmuxSessionName}`, { withCredentials: true, headers: headers }).then(function (response) {
              // DO NOTHING
            }).catch(function (err) {
              console.log(err);
            });
          }
        }

        /**
         * call setTerminalSize if not currently resizing
         */
        vm.resize = function (width, height) {
          vm.setTerminalSize(width, height);
          vm.term.refresh(0, options.terminal.rows - 1);
          safeDigest();
        };

        /**
         * POST to backend to resize terminal
         * @param {*} size xterm size (cols, rows)
         */
        vm.doResizeCall = function (size) {
          var headers = options.headers || {};
          headers['Content-Type'] = 'application/x-www-form-urlencoded';

          let url = getResizeUrl(options.url, pid);
          $http.post(url, 'cols=' + size.cols + '&rows=' + size.rows, { withCredentials: true, headers: headers }).then(function (response) {
            vm.onResize(size);
          }).catch(function () {
            vm.showError();
          });
        };

        /**
         * Websocket open connection event
         */
        vm.attach = function (event) {
          try {
            // attach addon
            const attachAddon = new AttachAddon(vm.socket);
            vm.term.loadAddon(attachAddon);
            // fit addon
            const fitAddon = new FitAddon();
            vm.term.loadAddon(fitAddon);
            if (getTerminalActualHeight() && getTerminalActualWidth()) {
              fitAddon.fit();
            }
            vm.onOpen(event);
            vm.showLoader = false;
            startKeepAliveInterval();
          } catch (error) {
            console.log(error);
          }
        };

        function getErrorMessageFn () {
          return vm.error;
        }

        function getSocketFn () {
          return vm.socket;
        }

        function loadingFn (load) {
          vm.error = null;
          vm.showLoader = load;
        }

        /**
         * Kill existing ports
         */
        function killPreviewPort () {
          let port = TerminalFactory.getCurrentPreviewPort();
          if (!port) return;
          let command = `fuser -k ${port}/tcp\n`;
          sendSocketCommand(command);
        }

        function sendCtrlC () {
          sendSocketCommand(CTRL_C);
        }

        function sendSocketCommand (command) {
          if (vm.socket && vm.socket.isOpen()) vm.socket.send(command);
        }

        /**
         * run npm install and monaca reconfigure before monaca preview
         */
        function installPackageAndRunTranspileCommand (command) {
          let subCommand = 'npm install;monaca reconfigure;';
          sendSocketCommand(`\n${subCommand}${command};\n`);
          callback('onSendTranspileCommand', vm.socket); // eslint-disable-line
        }

        /**
         * run monaca preview
         */
        function runTranspileCommand (command) {
          sendSocketCommand(`\n${command};\n`);
          callback('onSendTranspileCommand', vm.socket); // eslint-disable-line
        }

        /**
         * Send custom command (monaca preview -p 8080)
         */
        function sendTranspileCommandFn (command) {
          if (command) {
            // killPreviewPort();
            TerminalService.isRequiredToInstallPackages()
              .then(function (isRequired) {
                if (isRequired) {
                  installPackageAndRunTranspileCommand(command);
                } else {
                  runTranspileCommand(command);
                }
              })
              .catch(function () {
                installPackageAndRunTranspileCommand(command);
              });
          }
        }

        /**
         * Websocket onClose event handler
         * @param {*} event
         */
        vm.onClose = function (event) {
          vm.showError(event.reason || gettextCatalog.getString('Connection closed'));
          callback('onClose', event); // eslint-disable-line
          safeDigest();
        };

        /**
         * Websocket onError event handler
         * @param {*} event
         */
        vm.onError = function (event) {
          vm.showError();
          callback('onError', event); // eslint-disable-line
          safeDigest();
        };

        /**
         * Websocket onOpen event handler
         * @param {*} event
         */
        vm.onOpen = function (event) {
          callback('onOpen', event); // eslint-disable-line
          safeDigest();
        };

        /**
         * Show error panel in terminal with the desired message
         * @param {*} message
         */
        vm.showError = function (message) {
          vm.error = message || _errorText;
          safeDigest();
        };

        /**
         * Websocket onMessage event handler
         * @param {*} event
         */
        vm.onMessage = function (event) {
          callback('onMessage', event); // eslint-disable-line
          safeDigest();
        };

        /**
         * Callback on xterm resize event
         * @param {*} size
         */
        vm.onResize = function (size) {
          callback('onResize', size); // eslint-disable-line
          safeDigest();
        };

        /**
         * Close connection when the scope is destroyed
         */
        $scope.$on('$destroy', function () {
          if (!vm.socket) {
            return;
          }
          vm.socket.close();
        });

        /**
         * Call a function in options (ie. event callbacks)
         * @param {function name} what Name of the function in options to call
         * @param {function arguments} args Arguments to call the function with
         */
        function callback (what, args) {
          if (typeof options[what] !== 'function') {
            return;
          }

          options[what](args);
        }

        /**
         * call digest to update views on every scope
         */
        function safeDigest () {
          if (!$rootScope.$$phase) {
            $rootScope.$digest();
          }
        }
      }]
  };
}]);

;/**
 * Capitalize
 * {{'hogge yeah' | capitalize }} -> Hogge yeah
 * {{'hogge yeah' | capitalize:true }} -> Hogge Yeah
 */
angular.module('monacaIDE').filter('capitalize', function () {
  return function (input, all) {
    var reg = (all) ? /([^\W_]+[^\s-]*) */g : /([^\W_]+[^\s-]*)/;
    return (input) ? input.replace(reg, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); }) : '';
  };
});

;angular.module('monacaIDE').filter('isEmptyObj', function () {
  return function (object) {
    return angular.equals({}, object);
  };
});

;angular.module('monacaIDE').filter('trustAsHtml', function ($sce) {
  return function (value, type) {
    return $sce.trustAsHtml(value);
  };
});

;angular.module('monacaIDE').factory('DeployServiceFactory', ['$q', 'DeployServiceIntegrator', function ($q, DeployServiceIntegrator) {
  return {
    serviceCollection: [],
    ownedCollection: [],

    /**
     * Service Wrappers
     */
    fetchOwnedCollection: function () {
      return DeployServiceIntegrator.fetchOwned().then(
        function (response) {
          Object.keys(response.result).forEach(key => {
            response.result[key].editor_logo = response.result[key].app_logo.replace('/img/', 'img/');
          });
          this.ownedCollection = response.result;
          return $q.resolve(response.result);
        }.bind(this),
        function (response) {
          return $q.reject(response.message);
        }
      );
    },

    fetchServiceCollection: function () {
      return DeployServiceIntegrator.fetchServices().then(
        function (response) {
          Object.keys(response.result).forEach(key => {
            response.result[key].logo.editor_logo_small = response.result[key].logo.app_logo_small.replace('/img/', 'img/');
            response.result[key].logo.editor_logo_large = response.result[key].logo.app_logo_large.replace('/img/', 'img/');
          });
          this.serviceCollection = response.result;
          return $q.resolve(response.result);
        }.bind(this),
        function (response) {
          return $q.reject(response.message);
        }
      );
    },

    fetch: function () {
      return $q.all([this.fetchServiceCollection(), this.fetchOwnedCollection()]).catch(
        function (error) {
          var response = [];

          if (error[0]) {
            response.push(error[0]);
          }

          if (error[1]) {
            response.push(error[1]);
          }

          return $q.reject(response.join(' '));
        }
      );
    },

    removeOwn: function (service_type, alias) {
      return DeployServiceIntegrator.remove(service_type, alias).then(
        function () {
          return this.fetchOwnedCollection();
        }.bind(this),
        function (response) {
          return $q.reject(response.message);
        }
      );
    },

    addOwn: function (formData) {
      return DeployServiceIntegrator.add(formData).then(
        function () {
          return this.fetchOwnedCollection();
        }.bind(this),
        function (response) {
          return $q.reject(response.message);
        }
      );
    },

    distributeApp: function (project_id, service_type, service_alias, service_optional_params, build_queue_id, ci_queue_id) {
      return DeployServiceIntegrator.distributeApp(project_id, service_type, service_alias, service_optional_params, build_queue_id, ci_queue_id).then(
        function (resp) {
          return $q.resolve(resp.result);
        },
        function (error) {
          return $q.reject(error);
        }
      );
    }
  };
}]);

;angular.module('monacaIDE').factory('FileUtilityFactory', [function () {
  /**
   * List of extension -> language supported by the editor.
   */
  const languages = {
    bat: 'bat',
    c: 'c',
    coffee: 'coffeescript',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    // dockerfile: 'dockerfile',
    // fsharp: 'fsharp',
    // go: 'go',
    hbs: 'handlebars',
    handlebars: 'handlebars',
    htm: 'html',
    html: 'html',
    xhtml: 'html',
    jhtml: 'html',
    tpl: 'html',
    ejs: 'html',
    vue: 'html', // for highlighting purpose
    ini: 'ini',
    java: 'java',
    jsp: 'java',
    jspx: 'java',
    wss: 'java',
    do: 'java',
    action: 'java',
    ui: 'javascript',
    js: 'javascript',
    jsx: 'javascript', // for highlighting purpose
    bjson: 'json',
    json: 'json',
    bablerc: 'json',
    less: 'less',
    // lua: 'lua',
    markdown: 'markdown',
    md: 'markdown',
    // msdax: 'msdax',
    h: 'objective-c',
    m: 'objective-c',
    php: 'php',
    php4: 'php',
    php3: 'php',
    phtml: 'php',
    log: 'plaintext',
    tlog: 'plaintext',
    dat: 'plaintext',
    txt: 'plaintext',
    // postiats: 'postiats',
    ps: 'powershell',
    // pug: 'pug',
    py: 'python',
    // r: 'r',
    // razor: 'razor',
    rb: 'ruby',
    rhtml: 'ruby',
    // sb: 'sb',
    sass: 'scss',
    scss: 'scss',
    // sol: 'sol',
    sqlite: 'sql',
    sql: 'sql',
    swift: 'swift',
    ts: 'typescript',
    tsx: 'typescript',
    // vb: 'vb',
    xml: 'xml',
    rss: 'xml',
    svg: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    cob: 'cobol',
    cbl: 'cobol',
    eco: 'cobol',
    pco: 'cobol',
    sqb: 'cobol',
    cpy: 'cobol'
  };

  return {
    /**
     * Escape String
     * @param {String} unsafe
     * $return {String}
     */
    escapeFileName: function (unsafe) {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },

    /**
     * Checks if the filename is valid.
     * http://stackoverflow.com/a/27351102
     *
     * Use Case:
     * Must not be empty.
     * Must not be only space(s).
     * Must not start with .
     * Must not be com0-com9, con, lpt0-lpt9, nul, prn
     * Must not contain | * ? \ : ; < > $
     * Must not end with .
     *
     * @param  {String}  filename
     * @return {Boolean}
     */
    isValidFilename: function (filename) {
      return /^(?!\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)(?!\s*$)[^\|\*\?\\:;<>/$"]*[^\.\|\*\?\\:;<>/$"]+$/.test(filename);
    },

    /**
     * Get filename from file path.
     * ファイルパスからファイル名を取得する
     *
     * @param {String} file_path
     * @return {String}
     */
    getFileName: function (file_path) {
      return file_path.substring(file_path.lastIndexOf('/') + 1, file_path.length);
    },

    /**
     * Get directory path from file path.
     * ファイルパスからファイルディレクトリパスを取得する
     *
     * @deprecated Appears to not be used.
     * @todo Remove
     *
     * @param {String} file_path
     * @return {String}
     */
    getFileDirectory: function (file_path) {
      return file_path.substring(0, file_path.lastIndexOf('/') + 1);
    },

    /**
     * Get file directory with training slash removed.
     * ファイルパスからファイルディレクトリパスを取得する(後尾のスラッシュを削除)
     *
     * @deprecated Appears to not be used.
     * @todo Remove
     *
     * @param {String} file_path
     * @return {String}
     */
    getFileDirectoryDeleteLastSlash: function (file_path) {
      return this.getFileDirectory(file_path.replace(/\/$/, ''));
    },

    /**
     * Get file extension from file name.
     * ファイル名から拡張子を取得する
     *
     * @param {String} file_path
     * @return {String}
     */
    getExtName: function (file_name) {
      return (!file_name || file_name.lastIndexOf('.') === -1) ? '' : file_name.split('.').pop();
    },

    /**
     *
     * 拡張子からMIME typeを取得する
     *
     * @param {String} extname
     * @return {String} ext_name
     */
    getMime: function (extname) {
      switch (extname) {
      case 'html':
      case 'htm':
      case 'tpl':
      case 'ejs':
        return 'text/html';
      case 'ui':
      case 'js':
      case 'json':
        return 'text/javascript';
      case 'ts':
        return 'text/typescript';
      case 'cbl':
      case 'cob':
      case 'eco':
      case 'pco':
      case 'sqb':
      case 'cpy':
        return 'text/cobol';
      case 'xml':
        return 'text/xml';
      case 'css':
        return 'text/css';
      case 'h':
      case 'm':
        return 'text/objective-c';
      case 'java':
        return 'text/java';
      case 'vue':
        return 'text/vue';
      case 'jsx':
      case 'tsx':
        return 'text/react';
      default:
        return 'text/plain';
      }
    },

    /**
     * Detect language from file path.
     * If the extension does not exist, fallback to plaintext.
     * ファイルパスから言語を検出する（拡張子が存在しない場合は plaintext にフォールバックする）
     *
     * @param {String} file_path
     * @return {String}
     */
    getLanguage: function (file_path) {
      const extension = this.getExtName(this.getFileName(file_path));
      return languages[extension] || 'plaintext';
    },

    /**
     * Get file type from etension
     * ファイルの拡張子からファイルタイプを取得する
     *
     * @param {String} extname
     * @return {String}
     */
    getFileType: function (extname) {
      return extname.match(/png|jpg|jpeg|gif|bmp/i) ? 'img' : 'text';
    },

    /**
     * Creates a DOM Safe Classname/Id from file path.
     *
     * @param  {String}
     * @return {String}
     */
    getDomSafeId: function (file_path) {
      return file_path.replace(/^\/|\/$/g, '').replace(/\W/g, '-');
    }
  };
}]);

;/**
 * Factory used only for loading `vs/editor/editor.main`.
 */
angular.module('monacaIDE').factory('EditorFactory', [
  function () {
    const _factoryPromise = new Promise(function (resolve, reject) {
      // Load Visual Studio Editor (Monaco Editor)
      require.config({
        paths: {'vs': 'lib/vs'},
        urlArgs: 'v=0.29.2'
      });
      require(['vs/editor/editor.main'], () => {
        resolve();
      });
    });

    return {
      loading: _factoryPromise
    };
  }
]);

;angular.module('monacaIDE').factory('GlobalEditorConfig', [
  '$q',
  'Constant',
  'PubSub',
  'EnvironmentFactory',
  'ProjectService',
  'EditorConfigWrapper',
  function ($q, Constant, PubSub, EnvironmentFactory, ProjectService, EditorConfigWrapper) {
    class GlobalEditorConfig {
      constructor () {
        this._globalMonacoEditorOptions = null;
        this._debuggerPanel = null;

        this.loading = this.fetchEditorSetting();
      }

      /**
       * Fetch and updates stored global editor config.
       *
       * @returns {Promise}
       */
      fetchEditorSetting () {
        return EnvironmentFactory.loading
          .then(() => {
            return ProjectService.getEditorSetting(window.config.projectId);
          })
          .then((editorSetting) => {
            this.setGlobalMonacoEditorOptions(new EditorConfigWrapper({ monacoEditorOptions: editorSetting })._generatedMonacoEditorOptions);
          });
      }

      getGlobalMonacoEditorOptions () {
        return this._globalMonacoEditorOptions;
      }

      setGlobalMonacoEditorOptions (monacoEditorOptions) {
        this._globalMonacoEditorOptions = monacoEditorOptions;
        this._debuggerPanel = monacoEditorOptions.debuggerPanel;

        PubSub.publish(Constant.EVENT.EDITOR_CONFIG_UPDATED);
      }

      showDebuggerPanel () {
        return this._debuggerPanel;
      }

      getDefaultValues () {
        return {
          theme: 'vs',
          fontFamily: (EnvironmentFactory.service.editor_configuration && EnvironmentFactory.service.editor_configuration['font_family']) || 'Ricty Diminished',
          fontSize: 14,
          contextmenu: false,
          minimap: {
            enabled: false
          },
          autoClosingBrackets: false,
          autoIndent: true,
          renderWhitespace: 'none',
          wordWrap: 'on',
          wordWrapColumn: 80,
          dragAndDrop: false,

          // The following values are not Monaco editor option
          modelFormatting: {
            insertSpaces: true,
            tabSize: Number.parseInt((EnvironmentFactory.service.editor_configuration && EnvironmentFactory.service.editor_configuration['tab_size']) || '2')
          },
          debuggerPanel: true
        };
      }
    }

    return new GlobalEditorConfig();
  }
]);

;angular.module('monacaIDE').factory('BaseEditorTab', [
  '$http',
  'Constant',
  'EnvironmentFactory',
  'OnsenTags',
  'JavaKeywords',
  'PubSub',
  'GoldenLayoutService',
  'EditorTabService',
  'GlobalEditorConfig',
  'EditorConfigWrapper',
  function ($http, Constant, EnvironmentFactory, OnsenTags, JavaKeywords, PubSub, GoldenLayoutService, EditorTabService, GlobalEditorConfig, EditorConfigWrapper) {
    /**
     * Base class of the editor tab classes.
     *
     * This class is responsible for:
     * - Setup autocomplete for Monaco editors
     * - Subscribe PubSub events
     */
    class BaseEditorTab {
      constructor (scope, element, attrs) {
        this.scope = scope;
        this.element = element; // Element where the custom Monaco editor is put into
        this.attrs = attrs;

        this._editorConfigWrapper = new EditorConfigWrapper({ monacoEditorOptions: GlobalEditorConfig.getGlobalMonacoEditorOptions() });
        this._contextmenuContainer = null;
        this._contextmenuOpen = false;
        this._pubsubTokens = null;

        this._setupHTMLDefaults();
        this._setupOnsenJSAutocomplete();
        this._setupOnsenHTMLAutocomplete();
        this._setupJavaAutocomplete();
        this._addGlobalStyles();
        this.setupEditor()
          .then(() => {
            this.setupContextMenu();
            this._setupPubSubEvents();
          });
      }

      _setupPubSubEvents () {
        const runOnlyInActiveTab = (originalFn) => {
          return (opts) => {
            if (this.isActiveTab()) {
              originalFn(opts);
            }
          };
        };

        this._pubsubTokens = [
          // View (Tab) related
          PubSub.subscribe(Constant.EVENT.VIEW_SHOWN, this.onViewShown.bind(this)),
          PubSub.subscribe(Constant.EVENT.VIEW_RESIZE, this.onViewResize.bind(this)),
          PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, this.onViewClosed.bind(this)),

          // Config related
          PubSub.subscribe(Constant.EVENT.EDITOR_CONFIG_UPDATED, this.onEditorConfigUpdated.bind(this)),

          // Editting related
          PubSub.subscribe(Constant.EVENT.UNDO_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onUndo.bind(this))),
          PubSub.subscribe(Constant.EVENT.REDO_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onRedo.bind(this))),
          PubSub.subscribe(Constant.EVENT.COPY_FROM_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onCopy.bind(this))),
          PubSub.subscribe(Constant.EVENT.CUT_FROM_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onCut.bind(this))),
          PubSub.subscribe(Constant.EVENT.PASTE_TO_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onPaste.bind(this))),
          PubSub.subscribe(Constant.EVENT.TOGGLE_COMMENT_EDITOR_TAB, runOnlyInActiveTab(this.onToggleComment.bind(this))),
          PubSub.subscribe(Constant.EVENT.FORMAT_DOCUMENT_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onFormatDocument.bind(this))),
          PubSub.subscribe(Constant.EVENT.FOCUS_EDITOR, runOnlyInActiveTab(this.onFocus.bind(this))),
          PubSub.subscribe(Constant.EVENT.FOCUS_SEARCH_BOX, runOnlyInActiveTab(this.onSearch.bind(this))),
          PubSub.subscribe(Constant.EVENT.SEARCH_NEXT, runOnlyInActiveTab(this.onSearchNext.bind(this))),
          PubSub.subscribe(Constant.EVENT.SEARCH_PREVIOUS, runOnlyInActiveTab(this.onSearchPrevious.bind(this))),
          PubSub.subscribe(Constant.EVENT.REPLACE_TEXT_EDITOR_TAB, runOnlyInActiveTab(this.onReplace.bind(this))),
          PubSub.subscribe(Constant.EVENT.COMMAND_PALETTE_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onCommandPalette.bind(this))),
          PubSub.subscribe(Constant.EVENT.INCREASE_FONT_SIZE_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onIncreaseFontSize.bind(this))),
          PubSub.subscribe(Constant.EVENT.DECREASE_FONT_SIZE_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onDecreaseFontSize.bind(this))),

          // Save/load related
          PubSub.subscribe(Constant.EVENT.SAVE_ACTIVE_EDITOR_TAB, this.onSave.bind(this)),
          PubSub.subscribe(Constant.EVENT.SAVE_ALL_EDITOR_TAB, this.onSaveAll.bind(this)),
          PubSub.subscribe(Constant.EVENT.CHANGE_ENCODING_ACTIVE_EDITOR_TAB, runOnlyInActiveTab(this.onChangeEncoding.bind(this))),
          PubSub.subscribe(Constant.EVENT.MODEL_SAVED, this.onModelSaved.bind(this)),
          PubSub.subscribe(Constant.EVENT.MODEL_DISCARDED, this.onModelDiscarded.bind(this)),

          // Git related
          PubSub.subscribe(Constant.EVENT.CHANGE_DISCARDED, this.onChangeDiscarded.bind(this)),
          PubSub.subscribe(Constant.EVENT.BRANCH_CHANGED, this.onBranchChanged.bind(this)),
          PubSub.subscribe(Constant.EVENT.PULL_FINISHED, this.onPullFinished.bind(this))

          // Not handled:
          // Constant.EVENT.CLOSE_INACTIVATE_TABS,
          // Constant.EVENT.CLOSE_ALL_TABS,
          // Constant.EVENT.MOVE_TAB_LEFT,
          // Constant.EVENT.MOVE_TAB_RIGHT,
          // Constant.EVENT.MOVE_TAB_BY_INDEX,
        ];
      }

      _setupHTMLDefaults () {
        // Disable Ionic and Angular suggestions
        monaco.languages.html.htmlDefaults.setOptions(Object.assign(
          {},
          monaco.languages.html.htmlDefaults.options, // Defaults
          {suggest: {html5: true, ionic: false, angular1: false}} // Monaca Overrides
        ));

        // Disable hovers
        monaco.languages.html.htmlDefaults.setModeConfiguration(Object.assign(
          {},
          monaco.languages.html.htmlDefaults.modeConfiguration, // Defaults
          { hovers: false } // Overrides
        ));
      }

      _setupHtmlFormatting () {
        monaco.languages.registerDocumentFormattingEditProvider('html', {
          provideDocumentFormattingEdits: function (model, options, token) {
            const text = window.html_beautify(model.getValue(), {
              indent_size: options.insertSpaces ? options.tabSize : 1,
              indent_char: options.insertSpaces ? ' ' : '\t'
            });

            return [{
              text: text,
              range: model.getFullModelRange()
            }];
          }
        });
      }

      // Monaco uses .d.ts files to set up JS auto-complete. So we can take the latest
      // onsenui.d.ts file from the Onsen UI CDN, and register it with Monaco.
      _setupOnsenJSAutocomplete () {
        let url = 'https://unpkg.com/onsenui/js/onsenui.d.ts';
        if (!EnvironmentFactory.service.use_cdn_onsenui) {
          url = '/lib/onsenui.d.ts'; // For on premise environment
        }
        $http({
          method: 'GET',
          url: url
        }).then(res => {
          // Monaco does not use @description to get the function's description, just the text in
          // the comment. Thus we remove "@description" so the description of the function will
          // display in the editor.
          const dts = res.data.replace(/@description/g, '');

          monaco.languages.typescript.javascriptDefaults.addExtraLib(dts, 'onsenui.d.ts');
        });
      }

      _setupOnsenHTMLAutocomplete () {
        monaco.languages.registerCompletionItemProvider('html', {
          triggerCharacters: ['<'],
          provideCompletionItems: (model, position) => {
            const contentToHere = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            });

            // Despite triggerCharacters only being set to '<' above, this function appears
            // to be triggered much more frequently than that. tagNameInProgress checks to
            // see if the user has opened a tag with '<' and is still writing the tag name.
            const tagNameInProgress = contentToHere.match(/\<([a-z\-])*$/);

            // In contrast to tagNameInProgress, openHtmlTag matches if there is an open
            // HTML tag with a space after the tag name. That is, it will match when
            // the user is writing the attributes of the HTML tag.
            const openHtmlTagMatch = contentToHere.match(/\<([a-z\-]*)[\s\n]+[^\>]*$/);
            const openHtmlTag = openHtmlTagMatch && openHtmlTagMatch.length > 1 ? openHtmlTagMatch[1] : null;

            // If the user is within a valid Onsen UI tag, then we suggest the attributes
            // which can be added to it. Otherwise, if there is no active tag (that is, if
            // the user has just typed a <), then suggest all the Onsen UI tags. If the user
            // is inside any other tag (for example, <img ), then we do not suggest anything.
            let completionItems;
            if (tagNameInProgress) {
              completionItems = _.map(OnsenTags, (tag, key) => {
                return {
                  label: key,
                  insertText: key,
                  documentation: tag.description,
                  kind: monaco.languages.CompletionItemKind.Property
                };
              });
            } else if (openHtmlTag && !!OnsenTags[openHtmlTag]) { // Check if it is a valid Onsen UI HTML tag
              completionItems = OnsenTags[openHtmlTag].attributes.map(attribute => {
                return {
                  label: attribute.id,
                  insertText: attribute.id,
                  documentation: attribute.description,
                  kind: monaco.languages.CompletionItemKind.Value
                };
              });
            } else {
              completionItems = [];
            }
            return { suggestions: completionItems };
          }
        });
      }

      _setupJavaAutocomplete () {
        monaco.languages.registerCompletionItemProvider('java', {
          triggerCharacters: [...'abcdefghijklmnopqrstuvwxyz'],
          provideCompletionItems: (model, position) => {
            const contentToHere = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            });
            const keywordInProgress = contentToHere.match(/\w([a-z\-])*$/);

            let completionItems;
            if (keywordInProgress) {
              completionItems = _.map(JavaKeywords, (tag, key) => {
                return {
                  label: key,
                  insertText: key,
                  documentation: tag.description,
                  kind: monaco.languages.CompletionItemKind.Keyword
                };
              });
            } else {
              completionItems = [];
            }

            return { suggestions: completionItems };
          }
        });
      }

      _addGlobalStyles () {
        // Suppress 2x2 dot at the left top corner of the editor (appears in monaco-editor 0.29.1)
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
          div[widgetid="editor.contrib.modesGlyphHoverWidget"] {
            display: none;
          }
        `;
        document.head.appendChild(styleElement);
      }

      // --------------------------------
      // Abstract methods
      // --------------------------------

      /**
       * @return {Promise}
       */
      setupEditor () {
        console.error(`Please override this method.`);
      }

      setupContextMenu () {
        console.error(`Please override this method.`);
      }

      // --------------------------------
      // Utility methods
      // --------------------------------

      getComponentId () {
        console.error(`Please override this method.`);
      }

      isActiveTab () {
        return EditorTabService.isActiveTab(this.getComponentId());
      }

      editorViewsUsingSameModel (projectId, path) {
        return GoldenLayoutService.getAllTabs().filter(tab => {
          if (tab.componentName === Constant.VIEW.NORMAL_EDITOR_VIEW) {
            if (window.config.projectId === projectId && tab.componentState.url === path) {
              return true;
            }
          } else if (tab.componentName === Constant.VIEW.COMPARE_EDITOR_VIEW) {
            if (tab.componentState.originalFile.projectId === projectId && tab.componentState.originalFile.path === path) {
              return true;
            } else if (tab.componentState.modifiedFile.projectId === projectId && tab.componentState.modifiedFile.path === path) {
              return true;
            }
          } else {
            return false;
          }
        });
      }

      // --------------------------------
      // Event handlers
      // --------------------------------

      // View (Tab) related
      onViewShown (opts) {
        console.error(`Please override this method.`);
      }
      onViewResize (opts) {
        console.error(`Please override this method.`);
      }
      onViewClosed (opts) {
        if (opts.componentId === this.getComponentId()) {
          // Ideally we would be able to use the directive's $destroy event to remove event
          // listeners. But, GoldenLayout appears to not properly destroy it, so we need
          // to do it another way. See https://github.com/WolframHempel/golden-layout/issues/216.
          if (this._pubsubTokens && this._pubsubTokens.length) {
            this._pubsubTokens.forEach(token => PubSub.unsubscribe(token));
          }
          this.scope.$destroy();
        }
      }

      // Config related
      onEditorConfigUpdated (opts) {
        this._editorConfigWrapper = new EditorConfigWrapper({ monacoEditorOptions: GlobalEditorConfig.getGlobalMonacoEditorOptions() });

        // Update theme of all active Monaco editors
        const newTheme = this._editorConfigWrapper._generatedMonacoEditorOptions.theme;
        if (this._editorConfigWrapper.themes.some(v => v.value === newTheme)) {
          monaco.editor.setTheme(newTheme);
        } else {
          console.warn('The selected theme "' + newTheme + '" is not a valid option.');
        }
      }
      onIncreaseFontSize (opts) {
        console.error(`Please override this method.`);
      }
      onDecreaseFontSize (opts) {
        console.error(`Please override this method.`);
      }

      // Editting related
      onUndo (opts) {
        console.error(`Please override this method.`);
      }
      onRedo (opts) {
        console.error(`Please override this method.`);
      }
      onCopy (opts) {
        console.error(`Please override this method.`);
      }
      onCut (opts) {
        console.error(`Please override this method.`);
      }
      onPaste (opts) {
        console.error(`Please override this method.`);
      }
      onToggleComment (opts) {
        console.error(`Please override this method.`);
      }
      onFormatDocument (opts) {
        console.error(`Please override this method.`);
      }
      onFocus (opts) {
        console.error(`Please override this method.`);
      }
      onSearch (opts) {
        console.error(`Please override this method.`);
      }
      onSearchNext (opts) {
        console.error(`Please override this method.`);
      }
      onSearchPrevious (opts) {
        console.error(`Please override this method.`);
      }
      onReplace (opts) {
        console.error(`Please override this method.`);
      }
      onCommandPalette (opts) {
        console.error(`Please override this method.`);
      }

      // Save/load related
      onSave (opts) {
        console.error(`Please override this method.`);
      }
      onSaveAll (opts) {
        console.error(`Please override this method.`);
      }
      onChangeEncoding (opts) {
        console.error(`Please override this method.`);
      }
      onModelSaved (opts) {
        console.error(`Please override this method.`);
      }
      onModelDiscarded (opts) {
        console.error(`Please override this method.`);
      }

      // Git related
      onChangeDiscarded () {
        console.error(`Please override this method.`);
      }
      onBranchChanged () {
        console.error(`Please override this method.`);
      }
      onPullFinished () {
        console.error(`Please override this method.`);
      }
    }

    // --------------------------------
    // Public static variables
    // --------------------------------

    BaseEditorTab.increaseFontSizeAction = {
      // An unique identifier of the contributed action.
      id: 'increase-font-size',

      // A label of the action that will be presented to the user.
      label: 'Increase Font Size',

      // An optional array of keybindings for the action.
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_DOT
        // // chord
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      ],

      // A precondition for this action.
      // precondition: null,
      precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: null,

      contextMenuGroupId: 'navigation',

      contextMenuOrder: 1.5,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convinience
      run: (editor) => {
        if (GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize < 80) {
          GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize = ++GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize;
          PubSub.publish(Constant.EVENT.EDITOR_CONFIG_UPDATED);
        }

        return null;
      }
    };
    BaseEditorTab.decreaseFontSizeAction = {
      // An unique identifier of the contributed action.
      id: 'decrease-font-size',

      // A label of the action that will be presented to the user.
      label: 'Decrease Font Size',

      // An optional array of keybindings for the action.
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_COMMA
        // // chord
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      ],

      // A precondition for this action.
      precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: null,

      contextMenuGroupId: 'navigation',

      contextMenuOrder: 1.5,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convinience
      run: (editor) => {
        if (GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize > 11) {
          GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize = --GlobalEditorConfig.getGlobalMonacoEditorOptions().fontSize;
          PubSub.publish(Constant.EVENT.EDITOR_CONFIG_UPDATED);
        }

        return null;
      }
    };

    return BaseEditorTab;
  }
]);

;angular.module('monacaIDE').factory('NormalEditorTab', [
  'Constant',
  'CommonFunctionService',
  'gettextCatalog',
  'PubSub',
  'GoldenLayoutService',
  'EditorTabService',
  'GlobalEditorConfig',
  'BaseEditorTab',
  'ModelWrapper',
  'Docs',
  function (Constant, CommonFunctionService, gettextCatalog, PubSub, GoldenLayoutService, EditorTabService, GlobalEditorConfig, BaseEditorTab, ModelWrapper, Docs) {
    return class NormalEditorTab extends BaseEditorTab {
      constructor (...args) {
        super(...args);

        this._monacoEditor = null;
        this._modelWrapper = null;
      }

      /**
       * @override
       */
      setupEditor () {
        return new Promise((resolve, reject) => {
          ModelWrapper.getInstance(window.config.projectId, this.attrs.file)
            .then((modelWrapper) => {
              this._modelWrapper = modelWrapper;

              this._monacoEditor = monaco.editor.create(this.element[0], this._editorConfigWrapper._generatedMonacoEditorOptions);
              this._monacoEditor._modelWrapper = modelWrapper; // allows access to model wrapper via Monaco editor instance
              this._monacoEditor.setModel(this._modelWrapper.getModel());
              this._monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z, this.onUndo.bind(this));
              this._monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Y, this.onRedo.bind(this));
              this._monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z, this.onRedo.bind(this));
              this._monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, this.onSave.bind(this));
              this._monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH, this.onToggleComment.bind(this));
              this._monacoEditor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KEY_F, this.onFormatDocument.bind(this)); // Alt corresponds to Option in macOS
              this._monacoEditor.addCommand(monaco.KeyCode.F1, this.onCommandPalette.bind(this));
              this._monacoEditor.addAction(BaseEditorTab.increaseFontSizeAction);
              this._monacoEditor.addAction(BaseEditorTab.decreaseFontSizeAction);
              this._monacoEditor.createContextKey('editorIsOpen', true); // Fixes microsoft/monaco-editor#2355
              this._monacoEditor.onDidChangeModelContent((event) => {
                PubSub.publish(Constant.EVENT.MODEL_CHANGED_ACTIVE_EDITOR_TAB, { id: this.getComponentId(), editor: this._monacoEditor, model: this._modelWrapper.getModel() });

                if (!event.isFlush) { // Ignore flush event to prevent _updateGoldenLayout from being called earlier than the callback of _reloadFile
                  this._updateGoldenLayout();
                }
              });
              this._monacoEditor.onDidFocusEditorText(() => {
                PubSub.publish(Constant.EVENT.SET_ACTIVE_EDITOR_TAB, { id: this.getComponentId() });

                this._updateGoldenLayout();
              });

              // enable emmet
              window.emmetHTML(this._monacoEditor); // FIXME: Emmet Abbreviation does not appear in any production environment at least on 2021/11/16

              PubSub.publish(Constant.EVENT.EDITOR_CREATED, { id: this.getComponentId(), editor: this._monacoEditor });
              resolve();
            })
            .catch((err) => {
              console.error(`[NormalEditorTab] Failed to create model.`);
              console.error(err);
              if (err && err.message) {
                PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                  className: 'danger',
                  content: err.message
                });
              }

              // Close the tab when failed to create a model
              PubSub.publish(Constant.EVENT.CLOSE_A_VIEW, this.getComponentId());
            });
        });
      }

      /**
       * @override
       */
      setupContextMenu () {
        // Show custom context menu instead of default one
        this.element[0].addEventListener('contextmenu', (e) => {
          if (!this._contextmenuOpen) {
            this._contextmenuContainer = $(`<div style="position: absolute; left: ${e.clientX}px; top: ${e.clientY}px;"><ul class="editor-context-dropdown"></ul></div>`);
            $(document.body).append(this._contextmenuContainer);
            const menu = this._contextmenuContainer.find('.editor-context-dropdown');
            const contextmenuItems = [
              {
                label: gettextCatalog.getString('Cut'),
                click: () => PubSub.publish(Constant.EVENT.CUT_FROM_ACTIVE_EDITOR_TAB),
                shortcutKey: Constant.SHORTCUT_KEY.CUT[window.config.os]
              },
              {
                label: gettextCatalog.getString('Copy'),
                click: () => PubSub.publish(Constant.EVENT.COPY_FROM_ACTIVE_EDITOR_TAB),
                shortcutKey: Constant.SHORTCUT_KEY.COPY[window.config.os]
              },
              {
                label: gettextCatalog.getString('Paste'),
                click: () => PubSub.publish(Constant.EVENT.PASTE_TO_ACTIVE_EDITOR_TAB),
                shortcutKey: Constant.SHORTCUT_KEY.PASTE[window.config.os]
              },
              {
                label: 'separator'
              },
              {
                label: gettextCatalog.getString('Command Palette'),
                shortcutKey: Constant.SHORTCUT_KEY.COMMAND_PALETTE[window.config.os],
                click: () => PubSub.publish(Constant.EVENT.COMMAND_PALETTE_ACTIVE_EDITOR_TAB)
              }, {
                label: gettextCatalog.getString('Keyboard Shortcuts'),
                icon: 'm-icon-shortcuts',
                click: () => window.open(Docs.url.keyboard_shortcut)
              },
              {
                label: 'separator'
              },
              {
                label: gettextCatalog.getString('Format Document'),
                shortcutKey: Constant.SHORTCUT_KEY.FORMAT_DOCUMENT[window.config.os],
                click: () => PubSub.publish(Constant.EVENT.FORMAT_DOCUMENT_ACTIVE_EDITOR_TAB)
              },
              {
                label: gettextCatalog.getString('Toggle Line Comment'),
                shortcutKey: Constant.SHORTCUT_KEY.COMMENT_OUT[window.config.os],
                click: () => PubSub.publish(Constant.EVENT.TOGGLE_COMMENT_EDITOR_TAB)
              },
              {
                label: gettextCatalog.getString('Increase Font Size'),
                shortcutKey: Constant.SHORTCUT_KEY.INCREASE_FONT_SIZE[window.config.os],
                disabled: this.is_edit_menu_disabled,
                click: () => PubSub.publish(Constant.EVENT.INCREASE_FONT_SIZE_ACTIVE_EDITOR_TAB)
              },
              {
                label: gettextCatalog.getString('Decrease Font Size'),
                shortcutKey: Constant.SHORTCUT_KEY.DECREASE_FONT_SIZE[window.config.os],
                click: () => PubSub.publish(Constant.EVENT.DECREASE_FONT_SIZE_ACTIVE_EDITOR_TAB)
              }
            ];
            contextmenuItems.map(item => {
              let menuItem;
              if (item.label === 'separator') {
                menuItem = $('<li><hr/></li>');
              } else {
                menuItem = $(`<li class="editor-context"><span><i class="m-icon ${item.icon ? item.icon : 'm-icon-none'}"></i><span>${item.label}</span></span><span class="shortcut">${item.shortcutKey || ''}</span></li>`);
              }
              menu.append(menuItem);
              menuItem.click(() => item.click());
            });
            const removeContextMenu = (e) => {
              this._contextmenuContainer.remove();
              this._contextmenuOpen = false;
              document.removeEventListener('click', removeContextMenu);
            };
            document.addEventListener('click', removeContextMenu);
            this._contextmenuOpen = true;
          } else {
            this._contextmenuContainer.css({
              left: e.clientX,
              top: e.clientY
            });
          }
          e.preventDefault();
        });
      }

      // --------------------------------
      // Utility methods
      // --------------------------------

      /**
       * @override
       */
      getComponentId () {
        return this.element.parent().attr('id');
      }

      _doSave () {
        EditorTabService.saveFile(this.attrs.file, this._modelWrapper.getModel().getValue(), this._modelWrapper.getEncoding())
          .then((isSuccess) => {
            if (isSuccess) {
              if (this._modelWrapper.isDeleted()) { // if deleted file is saved
                // new file is created, so update file tree
                PubSub.publish(Constant.EVENT.TREE_UPDATED);
                this._modelWrapper._doesFileExist = true;
              }
              this._modelWrapper.markAsClean();
              this._updateGoldenLayout();

              PubSub.publish(Constant.EVENT.MODEL_SAVED, {
                componentId: this.getComponentId(),
                projectId: window.config.projectId,
                path: this.attrs.file
              });
            }
          });
      }

      _reloadFile () {
        this._modelWrapper.reloadFile()
          .then(() => {
            this._updateGoldenLayout();
          })
          .catch(() => { // if the file is deleted or some error happens
            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });
      }

      _updateGoldenLayout () {
        GoldenLayoutService.setComponentCleanState(this.getComponentId(), {
          'isClean': this._modelWrapper.isClean(),
          'isDeleted': this._modelWrapper.isDeleted(),
          'canUndo': this._modelWrapper.canUndo(),
          'canRedo': this._modelWrapper.canRedo()
        });
      }

      /**
       * A wrapper to trigger an editor's action and display error when action does not exist.
       *
       * @param {String} id Action keyword identifier
       */
      _executeAction (id) {
        try {
          return this._monacoEditor.getAction(id).run();
        } catch (e) {
          console.error('Failed to execute action: "' + id + '" with the error message: ' + e);
        }
      }

      _insertTextAtCursor (text) {
        this._monacoEditor.focus();
        const selection = this._monacoEditor.getSelection();
        const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
        const id = { major: 1, minor: 1 };
        const op = {identifier: id, range: range, text: text, forceMoveMarkers: true};
        this._monacoEditor.executeEdits('clipboard', [op]); // no "undo stop" will be pushed in executeEdits
        this._monacoEditor.pushUndoStop();
      }

      // --------------------------------
      // Event handlers
      // --------------------------------

      // View (Tab) related
      /**
       * @override
       */
      onViewShown (opts) {
        if (this._monacoEditor && this.getComponentId() === opts.componentId) {
          this._updateGoldenLayout();
        }
      }
      /**
       * @override
       */
      onViewResize (event) {
        // if an editor tab was resized and its parent is the same as this tab's parent, then resize this tab as well
        // manual layout management is required as Monaco editor's automatic layout management was the root cause of the scroll issue described in #569
        if (event.componentName === Constant.VIEW.NORMAL_EDITOR_VIEW && $(this.element).parents('.lm_stack')[0] === $(`#${event.componentId}`).parents('.lm_stack')[0]) {
          this._monacoEditor.layout({
            width: event.containerWidth,
            height: event.containerHeight
          });
        }
      }
      /**
       * @override
       */
      onViewClosed (opts) {
        // Dispose the editor only if the closed view is this view
        if (this._monacoEditor && this.getComponentId() === opts.componentId) {
          this._monacoEditor.dispose();

          if (this.editorViewsUsingSameModel(window.config.projectId, this.attrs.file).length === 1) {
            ModelWrapper.deleteInstance(window.config.projectId, this.attrs.file);
          }
        }

        super.onViewClosed(opts);
      }

      // Config related
      /**
       * @override
       */
      onEditorConfigUpdated (opts) {
        super.onEditorConfigUpdated(opts);

        if (!this._monacoEditor) {
          console.warn('The Monaco editor instance is missing so Monaco editor options can not be configured');
        } else {
          // Update Editor Monaco editor options;
          this._monacoEditor.updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions);

          // Update Editor's Model Options
          this._modelWrapper.getModel().updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions.modelFormatting);
        }
      }
      /**
       * @override
       */
      onIncreaseFontSize (opts) {
        return this._executeAction('increase-font-size');
      }
      /**
       * @override
       */
      onDecreaseFontSize (opts) {
        return this._executeAction('decrease-font-size');
      }

      // Editting related
      /**
       * @override
       */
      onUndo (opts) {
        this._modelWrapper.updateUndoStartVersion();
        this._modelWrapper.getModel().undo();
      }
      /**
       * @override
       */
      onRedo (opts) {
        this._modelWrapper.getModel().redo();
      }
      /**
       * @override
       */
      onCopy (opts) {
        return navigator.clipboard.writeText(this._modelWrapper.getModel().getValueInRange(this._monacoEditor.getSelection())).then(() => {
          this._monacoEditor.focus();
        }).catch(err => {
          // This can happen if the user denies clipboard permissions:
          console.error('Could not copy text: ', err);
        });
      }
      /**
       * @override
       */
      onCut (opts) {
        this.onCopy().then(() => this._insertTextAtCursor(''));
      }
      /**
       * @override
       */
      onPaste (opts) {
        navigator.clipboard.readText().then(text => {
          this._insertTextAtCursor(text);
        }).catch(err => {
          console.error('Failed to read clipboard contents: ', err);
        });
      }
      /**
       * @override
       */
      onToggleComment (opts) {
        return this._executeAction('editor.action.commentLine');
      }
      /**
       * @override
       */
      onFormatDocument (opts) {
        this._setupHtmlFormatting(); // in monaco-editor 0.13.1 we can't override formatter on init, last initialized is used for built-in languages
        return this._executeAction('editor.action.formatDocument');
      }
      /**
       * @override
       */
      onFocus (opts) {
        this._monacoEditor.focus();
      }
      /**
       * @override
       */
      onSearch (opts) {
        this._monacoEditor.focus();
        return this._executeAction('actions.find');
      }
      /**
       * @override
       */
      onSearchNext (opts) {
        return this._executeAction('editor.action.nextMatchFindAction');
      }
      /**
       * @override
       */
      onSearchPrevious (opts) {
        return this._executeAction('editor.action.previousMatchFindAction');
      }
      /**
       * @override
       */
      onReplace (opts) {
        this._monacoEditor.focus();
        return this._executeAction('editor.action.startFindReplaceAction');
      }
      /**
       * @override
       */
      onCommandPalette (opts) {
        this._monacoEditor.focus();
        return this._executeAction('editor.action.quickCommand');
      }

      // Save/load related
      /**
       * @override
       */
      onSave (opts) {
        if (this.isActiveTab()) {
          if (!this._modelWrapper.isClean() || this._modelWrapper.isDeleted()) {
            this._doSave();
          }
        } else if (GoldenLayoutService.hasUncleanComponents() === 1) {
          // There is only one unsave tab
          this._doSave();
        }
      }
      /**
       * @override
       */
      onSaveAll (opts) {
        if (
          GoldenLayoutService.areThereUncleanComponents() ||
          GoldenLayoutService.areThereDeletedComponents()
        ) this._doSave();
      }
      /**
       * @override
       */
      onChangeEncoding (opts) {
        // if there are unsaved changes, warn it and stop.
        if (!this._modelWrapper.isClean()) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString(
              'The file has unsaved changes. Please save it before reopening it with another encoding.'
            )
          });
          return;
        }

        this._modelWrapper.loadFileContentToModel(window.config.projectId, this.attrs.file, opts.encoding)
          .then(() => {
            this._modelWrapper.setEncoding(opts.encoding);
            this._updateGoldenLayout();
          })
          .catch(() => { // if the file is deleted or some error happens
            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });
      }
      /**
       * @override
       */
      onModelSaved (opts) {
        // If this saved model is this editor's model, mark as clean and update GoldenLayout
        if (opts.projectId === window.config.projectId && opts.path === this.attrs.file) {
          this._modelWrapper.markAsClean();
          this._updateGoldenLayout();
        }
      }
      /**
       * @override
       */
      onModelDiscarded (opts) {
        // If this discarded model is this editor's model, reload the file
        if (opts.projectId === window.config.projectId && opts.path === this.attrs.file) {
          this._reloadFile();
        }
      }

      // Git related
      /**
       * @override
       */
      onChangeDiscarded () {
        this._reloadFile();
      }
      /**
       * @override
       */
      onBranchChanged () {
        this._reloadFile();
      }
      /**
       * @override
       */
      onPullFinished () {
        this._reloadFile();
      }
    };
  }
]);

;angular.module('monacaIDE').factory('CompareEditorTab', [
  'Constant',
  'CommonFunctionService',
  'gettextCatalog',
  'PubSub',
  'GoldenLayoutService',
  'EditorTabService',
  'BaseEditorTab',
  'ModelWrapper',
  'Docs',
  function (Constant, CommonFunctionService, gettextCatalog, PubSub, GoldenLayoutService, EditorTabService, BaseEditorTab, ModelWrapper, Docs) {
    return class CompareEditorTab extends BaseEditorTab {
      constructor (...args) {
        super(...args);

        this._monacoDiffEditor = null;
        this._focusingEditor = null;
        this._originalModelWrapper = null;
        this._modifiedModelWrapper = null;

        this._removeContextMenu = null; // event handler for removing context menu gracefully
      }

      /**
       * @override
       */
      setupEditor () {
        return new Promise((resolve, reject) => {
          const originalModelWrapperPromise = ModelWrapper.getInstance(this.attrs.originalFileProjectId, this.attrs.originalFilePath);
          const modifiedModelWrapperPromise = ModelWrapper.getInstance(this.attrs.modifiedFileProjectId, this.attrs.modifiedFilePath);
          Promise.all([originalModelWrapperPromise, modifiedModelWrapperPromise])
            .then(([originalModelWrapper, modifiedModelWrapper]) => {
              this._originalModelWrapper = originalModelWrapper;
              this._modifiedModelWrapper = modifiedModelWrapper;

              // Setup diff editor (contains original editor and modified editor)
              this._monacoDiffEditor = monaco.editor.createDiffEditor(this.element[0], { ...this._editorConfigWrapper._generatedMonacoEditorOptions, enableSplitViewResizing: false });
              this._monacoDiffEditor.setModel({
                original: originalModelWrapper.getModel(),
                modified: modifiedModelWrapper.getModel()
              });
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z, this.onUndo.bind(this));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Y, this.onRedo.bind(this));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z, this.onRedo.bind(this));

              const runOnlyWhenHavingTextFocus = (fn) => {
                return (...args) => {
                  if (this._monacoDiffEditor.hasTextFocus()) {
                    fn(...args);
                  }
                };
              };
              // Caution:
              // Please do not try to add a command to only one of the original editor and the modified editor.
              // Adding a command to the original editor also adds the command to the modified editor. (bug of Monaco editor 0.29.1)
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C, runOnlyWhenHavingTextFocus(this.onCopy.bind(this)));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_X, runOnlyWhenHavingTextFocus(this.onCut.bind(this)));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_V, runOnlyWhenHavingTextFocus(this.onPaste.bind(this)));

              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, this.onSave.bind(this));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.US_SLASH, this.onToggleComment.bind(this));
              this._monacoDiffEditor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KEY_F, this.onFormatDocument.bind(this)); // Alt corresponds to Option in macOS
              this._monacoDiffEditor.addCommand(monaco.KeyCode.F1, this.onCommandPalette.bind(this));
              // this._monacoDiffEditor.createContextKey('editorIsOpen', true); // Fixes microsoft/monaco-editor#2355
              this._monacoDiffEditor.onDidUpdateDiff((event) => {
              });

              // Setup original editor
              const originalEditor = this._monacoDiffEditor.getOriginalEditor();
              originalEditor.addAction(BaseEditorTab.increaseFontSizeAction);
              originalEditor.addAction(BaseEditorTab.decreaseFontSizeAction);
              originalEditor.onDidChangeModelContent((event) => {
              });
              originalEditor.onDidFocusEditorText(() => {
                PubSub.publish(Constant.EVENT.SET_ACTIVE_EDITOR_TAB, { id: this.getComponentId() });

                this._focusingEditor = originalEditor;
                this._updateGoldenLayout();
              });

              // Setup modified editor
              const modifiedEditor = this._monacoDiffEditor.getModifiedEditor();
              modifiedEditor._modelWrapper = modifiedModelWrapper; // allows access to modified model wrapper via modified Monaco editor instance
              modifiedEditor.addAction(BaseEditorTab.increaseFontSizeAction);
              modifiedEditor.addAction(BaseEditorTab.decreaseFontSizeAction);
              modifiedEditor.onDidChangeModelContent((event) => {
                PubSub.publish(Constant.EVENT.MODEL_CHANGED_ACTIVE_EDITOR_TAB, { id: this.getComponentId(), editor: modifiedEditor, model: modifiedModelWrapper.getModel() });

                if (!event.isFlush) { // Ignore flush event to prevent _updateGoldenLayout from being called earlier than the callback of _reloadFile
                  this._updateGoldenLayout();
                }
              });
              modifiedEditor.onDidFocusEditorText(() => {
                PubSub.publish(Constant.EVENT.SET_ACTIVE_EDITOR_TAB, { id: this.getComponentId() });

                this._focusingEditor = modifiedEditor;
                this._updateGoldenLayout();
              });
              window.emmetHTML(modifiedEditor); // FIXME: Emmet Abbreviation does not appear in any production environment at least on 2021/11/16

              PubSub.publish(Constant.EVENT.EDITOR_CREATED, { id: this.getComponentId(), editor: modifiedEditor }); // use modified editor as canonical editor
              resolve();
            })
            .catch((err) => {
              console.error(`[CompareEditorTab] Failed to create model.`);
              console.error(err);
              if (err && err.message) {
                PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                  className: 'danger',
                  content: err.message
                });
              }
            });
        });
      }

      /**
       * @override
       */
      setupContextMenu () {
        // Show custom context menu instead of default one
        this.element[0].addEventListener('contextmenu', (e) => {
          if (this._removeContextMenu != null) {
            this._removeContextMenu();
          }

          this._contextmenuContainer = $(`<div style="position: absolute; left: ${e.clientX}px; top: ${e.clientY}px;"><ul class="editor-context-dropdown"></ul></div>`);
          $(document.body).append(this._contextmenuContainer);
          const menu = this._contextmenuContainer.find('.editor-context-dropdown');
          const contextmenuItems = [
            {
              label: gettextCatalog.getString('Cut'),
              click: () => PubSub.publish(Constant.EVENT.CUT_FROM_ACTIVE_EDITOR_TAB),
              shortcutKey: Constant.SHORTCUT_KEY.CUT[window.config.os],
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            },
            {
              label: gettextCatalog.getString('Copy'),
              click: () => PubSub.publish(Constant.EVENT.COPY_FROM_ACTIVE_EDITOR_TAB),
              shortcutKey: Constant.SHORTCUT_KEY.COPY[window.config.os],
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            },
            {
              label: gettextCatalog.getString('Paste'),
              click: () => PubSub.publish(Constant.EVENT.PASTE_TO_ACTIVE_EDITOR_TAB),
              shortcutKey: Constant.SHORTCUT_KEY.PASTE[window.config.os],
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            },
            {
              label: 'separator'
            },
            {
              label: gettextCatalog.getString('Command Palette'),
              shortcutKey: Constant.SHORTCUT_KEY.COMMAND_PALETTE[window.config.os],
              click: () => PubSub.publish(Constant.EVENT.COMMAND_PALETTE_ACTIVE_EDITOR_TAB),
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            }, {
              label: gettextCatalog.getString('Keyboard Shortcuts'),
              icon: 'm-icon-shortcuts',
              click: () => window.open(Docs.url.keyboard_shortcut),
              disabled: false
            },
            {
              label: 'separator'
            },
            {
              label: gettextCatalog.getString('Format Document'),
              shortcutKey: Constant.SHORTCUT_KEY.FORMAT_DOCUMENT[window.config.os],
              click: () => PubSub.publish(Constant.EVENT.FORMAT_DOCUMENT_ACTIVE_EDITOR_TAB),
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            },
            {
              label: gettextCatalog.getString('Toggle Line Comment'),
              shortcutKey: Constant.SHORTCUT_KEY.COMMENT_OUT[window.config.os],
              click: () => PubSub.publish(Constant.EVENT.TOGGLE_COMMENT_EDITOR_TAB),
              disabled: this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()
            },
            {
              label: gettextCatalog.getString('Increase Font Size'),
              shortcutKey: Constant.SHORTCUT_KEY.INCREASE_FONT_SIZE[window.config.os],
              click: () => PubSub.publish(Constant.EVENT.INCREASE_FONT_SIZE_ACTIVE_EDITOR_TAB),
              disabled: false
            },
            {
              label: gettextCatalog.getString('Decrease Font Size'),
              shortcutKey: Constant.SHORTCUT_KEY.DECREASE_FONT_SIZE[window.config.os],
              click: () => PubSub.publish(Constant.EVENT.DECREASE_FONT_SIZE_ACTIVE_EDITOR_TAB),
              disabled: false
            }
          ];
          contextmenuItems.map(item => {
            let menuItem;
            if (item.label === 'separator') {
              menuItem = $('<li><hr/></li>');
            } else {
              menuItem = $(`<li class="editor-context ${item.disabled ? 'disabled' : ''}"><span><i class="m-icon ${item.icon ? item.icon : 'm-icon-none'}"></i><span>${item.label}</span></span><span class="shortcut">${item.shortcutKey || ''}</span></li>`);
            }
            menu.append(menuItem);
            menuItem.click(() => {
              if (!item.disabled) {
                item.click();
              }
            });
          });
          const removeContextMenu = (e) => {
            this._contextmenuContainer.remove();
            this._contextmenuOpen = false;
            document.removeEventListener('click', removeContextMenu);
          };
          document.addEventListener('click', removeContextMenu);
          this._contextmenuOpen = true;
          this._removeContextMenu = removeContextMenu;

          e.preventDefault();
        });
      }

      // --------------------------------
      // Utility methods
      // --------------------------------

      /**
       * @override
       */
      getComponentId () {
        return this.element.parent().parent().attr('id');
      }

      _doSave () {
        // Note: EditorTabService.saveFile does not support specifying projectId, so only path is specified here
        EditorTabService.saveFile(this.attrs.modifiedFilePath, this._modifiedModelWrapper.getModel().getValue(), this._modifiedModelWrapper.getEncoding())
          .then((isSuccess) => {
            if (isSuccess) {
              if (this._modifiedModelWrapper.isDeleted()) { // if deleted file is saved
                // new file is created, so update file tree
                PubSub.publish(Constant.EVENT.TREE_UPDATED);
                this._modifiedModelWrapper._doesFileExist = true;
              }
              this._modifiedModelWrapper.markAsClean();
              this._updateGoldenLayout();

              PubSub.publish(Constant.EVENT.MODEL_SAVED, {
                componentId: this.getComponentId(),
                projectId: this.attrs.modifiedFileProjectId,
                path: this.attrs.modifiedFilePath
              });
            }
          });
      }

      _reloadFile () {
        this._originalModelWrapper.reloadFile()
          .then(() => {
            this._updateGoldenLayout();
          })
          .catch(() => { // if the file is deleted or some error happens
            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });

        this._modifiedModelWrapper.reloadFile()
          .then(() => {
            this._updateGoldenLayout();
          })
          .catch(() => { // if the file is deleted or some error happens
            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });
      }

      _updateGoldenLayout () {
        GoldenLayoutService.setComponentCleanState(this.getComponentId(), {
          'isClean': this._modifiedModelWrapper.isClean(),
          'isDeleted': this._modifiedModelWrapper.isDeleted(),
          'canUndo': this._modifiedModelWrapper.canUndo(),
          'canRedo': this._modifiedModelWrapper.canRedo()
        });
      }

      /**
       * A wrapper to trigger an editor's action and display error when action does not exist.
       *
       * @param {String} id Action keyword identifier
       */
      _executeAction (editor, id) {
        try {
          return editor.getAction(id).run();
        } catch (e) {
          console.error('Failed to execute action: "' + id + '" with the error message: ' + e);
        }
      }

      _insertTextAtCursor (editor, text) {
        editor.focus();
        const selection = editor.getSelection();
        const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
        const id = { major: 1, minor: 1 };
        const op = {identifier: id, range: range, text: text, forceMoveMarkers: true};
        editor.executeEdits('clipboard', [op]); // no "undo stop" will be pushed in executeEdits
        editor.pushUndoStop();
      }

      // --------------------------------
      // Event handlers
      // --------------------------------

      // View (Tab) related
      /**
       * @override
       */
      onViewShown (opts) {
        if (this._monacoDiffEditor && this.getComponentId() === opts.componentId) {
          this._updateGoldenLayout();
        }
      }
      /**
       * @override
       */
      onViewResize (event) {
        // if an editor tab was resized and its parent is the same as this tab's parent, then resize this tab as well
        // manual layout management is required as Monaco editor's automatic layout management was the root cause of the scroll issue described in #569
        if (event.componentName === Constant.VIEW.COMPARE_EDITOR_VIEW && $(this.element).parents('.lm_stack')[0] === $(`#${event.componentId}`).parents('.lm_stack')[0]) {
          this._monacoDiffEditor.layout({
            width: event.containerWidth,
            height: event.containerHeight
          });
        }
      }
      /**
       * @override
       */
      onViewClosed (opts) {
        // Dispose the editor only if the closed view is this view
        if (this._monacoDiffEditor && this.getComponentId() === opts.componentId) {
          this._monacoDiffEditor.dispose();

          if (this.editorViewsUsingSameModel(this.attrs.originalFileProjectId, this.attrs.originalFilePath).length === 1) {
            ModelWrapper.deleteInstance(this.attrs.originalFileProjectId, this.attrs.originalFilePath);
          }
          if (this.editorViewsUsingSameModel(this.attrs.modifiedFileProjectId, this.attrs.modifiedFilePath).length === 1) {
            ModelWrapper.deleteInstance(this.attrs.modifiedFileProjectId, this.attrs.modifiedFilePath);
          }
        }

        super.onViewClosed(opts);
      }

      // Config related
      /**
       * @override
       */
      onEditorConfigUpdated (opts) {
        super.onEditorConfigUpdated(opts);

        if (!this._monacoDiffEditor) {
          console.warn('The Monaco diff editor instance is missing so Monaco editor options can not be configured');
        } else {
          // Update Editor Monaco editor options;
          this._monacoDiffEditor.getOriginalEditor().updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions);
          this._monacoDiffEditor.getModifiedEditor().updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions);

          // Update Editor's Model Options
          this._monacoDiffEditor.getOriginalEditor().getModel().updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions.modelFormatting);
          this._monacoDiffEditor.getModifiedEditor().getModel().updateOptions(this._editorConfigWrapper._generatedMonacoEditorOptions.modelFormatting);
        }
      }
      /**
       * @override
       */
      onIncreaseFontSize (opts) {
        return this._executeAction(this._monacoDiffEditor.getModifiedEditor(), 'increase-font-size');
      }
      /**
       * @override
       */
      onDecreaseFontSize (opts) {
        return this._executeAction(this._monacoDiffEditor.getModifiedEditor(), 'decrease-font-size');
      }

      // Editting related
      /**
       * @override
       */
      onUndo (opts) {
        this._modifiedModelWrapper.updateUndoStartVersion();
        this._modifiedModelWrapper.getModel().undo();
      }
      /**
       * @override
       */
      onRedo (opts) {
        this._modifiedModelWrapper.getModel().redo();
      }
      /**
       * @override
       */
      onCopy (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Copying from the original editor is restricted.')
            });
            return Promise.resolve();
          }

          return navigator.clipboard.writeText(this._focusingEditor.getModel().getValueInRange(this._focusingEditor.getSelection())).then(() => {
            this._focusingEditor.focus();
          }).catch(err => {
            // This can happen if the user denies clipboard permissions:
            console.error('Could not copy text: ', err);
          });
        } else {
          return Promise.resolve();
        }
      }
      /**
       * @override
       */
      onCut (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Copying from the original editor is restricted.')
            });
            return;
          }

          this.onCopy().then(() => this._insertTextAtCursor(this._focusingEditor, ''));
        }
      }
      /**
       * @override
       */
      onPaste (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            return;
          }

          navigator.clipboard.readText().then(text => {
            this._insertTextAtCursor(this._focusingEditor, text);
          }).catch(err => {
            console.error('Failed to read clipboard contents: ', err);
          });
        }
      }
      /**
       * @override
       */
      onToggleComment (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            return Promise.resolve();
          }

          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'editor.action.commentLine');
        }
      }
      /**
       * @override
       */
      onFormatDocument (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            return Promise.resolve();
          }

          this._focusingEditor.focus();
          this._setupHtmlFormatting(); // in monaco-editor 0.13.1 we can't override formatter on init, last initialized is used for built-in languages
          return this._executeAction(this._focusingEditor, 'editor.action.formatDocument');
        }
      }
      /**
       * @override
       */
      onFocus (opts) {
        if (this._focusingEditor == null) {
          this._focusingEditor = this._monacoDiffEditor.getModifiedEditor();
        }
        this._focusingEditor.focus();
      }
      /**
       * @override
       */
      onSearch (opts) {
        if (this._focusingEditor != null) {
          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'actions.find');
        }
      }
      /**
       * @override
       */
      onSearchNext (opts) {
        if (this._focusingEditor != null) {
          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'editor.action.nextMatchFindAction');
        }
      }
      /**
       * @override
       */
      onSearchPrevious (opts) {
        if (this._focusingEditor != null) {
          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'editor.action.previousMatchFindAction');
        }
      }
      /**
       * @override
       */
      onReplace (opts) {
        if (this._focusingEditor != null) {
          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'editor.action.startFindReplaceAction');
        }
      }
      /**
       * @override
       */
      onCommandPalette (opts) {
        if (this._focusingEditor != null) {
          // disallow this action in original editor
          if (this._focusingEditor === this._monacoDiffEditor.getOriginalEditor()) {
            return Promise.resolve();
          }

          this._focusingEditor.focus();
          return this._executeAction(this._focusingEditor, 'editor.action.quickCommand');
        }
      }

      // Save/load related
      /**
       * @override
       */
      onSave (opts) {
        if (this.isActiveTab()) {
          if (!this._modifiedModelWrapper.isClean() || this._modifiedModelWrapper.isDeleted()) {
            this._doSave();
          }
        } else if (GoldenLayoutService.hasUncleanComponents() === 1) {
          // There is only one unsave tab
          this._doSave();
        }
      }
      /**
       * @override
       */
      onSaveAll (opts) {
        if (
          GoldenLayoutService.areThereUncleanComponents() ||
          GoldenLayoutService.areThereDeletedComponents()
        ) this._doSave();
      }
      /**
       * @override
       */
      onChangeEncoding (opts) {
        // if there are unsaved changes, warn it and stop.
        if (!this._modifiedModelWrapper.isClean()) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString(
              'The file has unsaved changes. Please save it before reopening it with another encoding.'
            )
          });
          return;
        }

        this._originalModelWrapper.loadFileContentToModel(this.attrs.originalFileProjectId, this.attrs.originalFilePath, opts.encoding)
          .then(() => {
            this._originalModelWrapper.setEncoding(opts.encoding);
            this._updateGoldenLayout();
          })
          .catch((err) => { // if the file is deleted or some error happens
            if (err && err.message) {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'danger',
                content: err.message
              });
            }

            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });

        this._modifiedModelWrapper.loadFileContentToModel(this.attrs.modifiedFileProjectId, this.attrs.modifiedFilePath, opts.encoding)
          .then(() => {
            this._modifiedModelWrapper.setEncoding(opts.encoding);
            this._updateGoldenLayout();
          })
          .catch((err) => { // if the file is deleted or some error happens
            if (err && err.message) {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'danger',
                content: err.message
              });
            }

            this._updateGoldenLayout();
            PubSub.publish(Constant.EVENT.TREE_UPDATED);
          });
      }
      /**
       * @override
       */
      onModelSaved (opts) {
        // If this saved model is this editor's model, mark as clean and update GoldenLayout
        if (opts.projectId === this.attrs.modifiedFileProjectId && opts.path === this.attrs.modifiedFilePath) {
          this._modifiedModelWrapper.markAsClean();
          this._updateGoldenLayout();
        }
      }
      /**
       * @override
       */
      onModelDiscarded (opts) {
        // If this discarded model is this editor's model, reload the file
        if (opts.projectId === this.attrs.modifiedFileProjectId && opts.path === this.attrs.modifiedFilePath) {
          this._reloadFile();
        }
      }

      // Git related
      /**
       * @override
       */
      onChangeDiscarded () {
        this._reloadFile();
      }
      /**
       * @override
       */
      onBranchChanged () {
        this._reloadFile();
      }
      /**
       * @override
       */
      onPullFinished () {
        this._reloadFile();
      }
    };
  }
]);

;angular.module('monacaIDE').factory('EditorConfigWrapper', [
  'EnvironmentFactory',
  function (EnvironmentFactory) {
    return class EditorConfigWrapper {
      constructor (options = {}) {
        this.themes = [
          {label: 'Visual Studio', value: 'vs'},
          {label: 'Visual Studio Dark', value: 'vs-dark'},
          {label: 'Hight Contrast Black', value: 'hc-black'}
        ];

        const defaultFont = (EnvironmentFactory.service.editor_configuration && EnvironmentFactory.service.editor_configuration['font_family']) || 'Ricty Diminished';
        let fontList = [
          {label: 'Courier New', value: 'Courier New'},
          {label: 'DejaVu Sans Mono', value: 'DejaVu Sans Mono'},
          {label: 'Droid Sans Mono Slashed', value: 'Droid Sans Mono Slashed'},
          {label: 'M+', value: 'M+'},
          {label: 'M+ 1mn regular', value: 'mplus-1mn-regular'},
          {label: 'M+ 1p regular', value: 'mplus-1p-regular'},
          {label: 'Monaco', value: 'Monaco'},
          {label: 'Ricty Diminished', value: 'Ricty Diminished'},
          {label: 'Source Code Pro', value: 'Source Code Pro'},
          {label: 'Monacakomi', value: 'Monacakomi'},
          {label: 'MonacakomiRegular', value: 'MonacakomiRegular'},
          {label: 'MonacakomiLite', value: 'MonacakomiLite'},
          {label: 'MonacakomiMinimum', value: 'MonacakomiMinimum'},
          {label: '梅ゴシックC4', value: 'Ume-Gothic-C4'}
        ];

        this.fonts = fontList.map((font) => {
          if (font.value === defaultFont) {
            font.label = `Default (${font.label})`;
          }
          return font;
        });

        this.whitespace = [
          {label: 'None', value: 'none'},
          {label: 'Boundary', value: 'boundary'},
          {label: 'All', value: 'all'}
        ];

        this.wordwrap = [
          {label: 'Off', value: 'off'},
          {label: 'On', value: 'on'},
          {label: 'Bounded', value: 'bounded'},
          {label: 'Word Wrap Column', value: 'wordWrapColumn'}
        ];

        this._generatedMonacoEditorOptions = null;
        this.update(options.monacoEditorOptions);
      }

      /**
       * Update Monaco editor options based off four values.
       * 1. Default Monaco editor options that users can override.
       * 2. Locked Monaco editor options that users can not override.
       * 3. The existing editor instance Monaco editor options.
       * 4. The Monaco editor options to add.
       *
       * @param {Object} monacoEditorOptions
       */
      update (monacoEditorOptions = {}) {
        const _defaults = {
          language: 'plaintext',

          // Configurable
          fontFamily: (EnvironmentFactory.service.editor_configuration && EnvironmentFactory.service.editor_configuration['font_family']) || 'Ricty Diminished',
          fontSize: 14,
          theme: 'vs',
          contextmenu: false,
          minimap: {
            enabled: false,
            maxColumn: 120,
            renderCharacters: true,
            showSlider: 'mouseover'
          },
          autoClosingBrackets: false,
          autoIndent: true,
          dragAndDrop: false,
          renderWhitespace: 'none',
          wordWrap: 'on',
          wordWrapColumn: 80,
          wordWrapMinified: true,
          wrappingIndent: 'same',

          // The following values are not Monaco editor option
          modelFormatting: {
            insertSpaces: true,
            tabSize: Number.parseInt((EnvironmentFactory.service.editor_configuration && EnvironmentFactory.service.editor_configuration['tab_size']) || '2')
          },
          debuggerPanel: true
        };

        // Default editor Monaco editor options that can not be overwritten.
        const _lockedMonacoEditorOptions = {
          automaticLayout: false, // we manage layout changes manually, because automatic layout management was the root cause of the scroll position issue described in #569
          folding: true,
          glyphMargin: true,
          hideCursorInOverviewRuler: false,
          hover: true,
          iconsInSuggestions: true,
          links: false
        };

        // Strip out user defined Monaco editor options if locked or if the option is private.
        Object.keys(monacoEditorOptions).map(function (key, index) {
          if (_lockedMonacoEditorOptions[key] || key.charAt(0) === '_') {
            delete monacoEditorOptions[key];
          }
        });

        this._generatedMonacoEditorOptions = Object.assign({}, _defaults, _lockedMonacoEditorOptions, this._generatedMonacoEditorOptions || {}, monacoEditorOptions);
      }
    };
  }
]);

;angular.module('monacaIDE').factory('ModelWrapper', [
  'Constant',
  'PubSub',
  'gettextCatalog',
  'ProjectFileService',
  'FileUtilityFactory',
  function (Constant, PubSub, gettextCatalog, ProjectFileService, FileUtilityFactory) {
    class ModelWrapper {
      constructor () {
        this._model = monaco.editor.createModel();
        this._initialVersion = this._model.getAlternativeVersionId();
        this._savedVersion = this._initialVersion;
        this._undoStartVersion = this._initialVersion;

        this._projectId = null;
        this._path = null;
        this._encoding = null;
        this._doesFileExist = null;
        this._fileLoadingPromise = null;
      }

      getModel () {
        return this._model;
      }

      getEncoding () {
        return this._encoding;
      }

      setEncoding (encoding) {
        this._encoding = encoding;
        PubSub.publish(Constant.EVENT.ENCODING_CHANGED, {
          encoding: encoding
        });
      }

      doesFileExist () {
        return this._doesFileExist;
      }

      waitUntilFileIsLoaded () {
        return this._fileLoadingPromise;
      }

      isClean () {
        return this._model.getAlternativeVersionId() === this._savedVersion;
      }

      markAsClean () {
        this._savedVersion = this._model.getAlternativeVersionId();
      }

      isDeleted () {
        return !this.doesFileExist();
      }

      canUndo () {
        return this._model.getAlternativeVersionId() > this._initialVersion;
      }

      canRedo () {
        return this._model.getAlternativeVersionId() < this._undoStartVersion;
      }

      updateUndoStartVersion () {
        if (this._undoStartVersion < this._model.getAlternativeVersionId()) {
          this._undoStartVersion = this._model.getAlternativeVersionId();
        }
      }

      clearUndoBuffer () {
        this._initialVersion = this._model.getAlternativeVersionId();
        this._undoStartVersion = this._initialVersion;
      }

      /**
       * Overwrite the content of the Monaco model with the specified file.
       *
       * @param {string} projectId
       * @param {string} path
       * @param {string} encoding
       */
      loadFileContentToModel (projectId, path, encoding = '') {
        this._fileLoadingPromise = new Promise((resolve, reject) => {
          this._projectId = projectId;
          this._path = path;

          const attemptToLoadFile = () => {
            return ProjectFileService.fileRead(path, '', encoding);
          };

          const checkResponse = (resp) => {
            if (resp.status !== 200) {
              throw resp;
            } else {
              return resp;
            }
          };

          const rejectDelay = (reason) => {
            return new Promise(function (resolve, reject) {
              setTimeout(reject.bind(null, reason), Constant.TIMEOUT.EDITOR_FILE_OPEN_RELOAD);
            });
          };

          const handleFileLoaded = (response) => {
            this._doesFileExist = true;

            // Set encoding
            const matches = response.headers.get('Content-Type').match(/charset=([^()<>@,;:"/[\]?.=\s]*)/i);
            this._encoding = (matches != null ? matches[1] : 'UTF-8');
            this._encoding = (this._encoding === 'Shift_JIS' ? 'Shift_JIS' : 'UTF-8'); // Set to Shift_JIS or UTF-8

            // Set value
            this._model.setValue(response.body);

            this.markAsClean();
            this.clearUndoBuffer();

            // Set language
            monaco.editor.setModelLanguage(this._model, FileUtilityFactory.getLanguage(path));
            resolve();
          };

          const handleFileLoadError = () => {
            console.log(`handleFileLoadError`);
            // Check the reason why fileRead failed because fileRead returns 404 without any further information
            ProjectFileService.isExist(path)
              .then((response) => response.body && response.body.result && response.body.result[path]) // Check the path is included and set to true
              .then((fileExists) => {
                if (fileExists) {
                  this._doesFileExist = true;

                  reject(new Error(path + ' ' + gettextCatalog.getString('(in this project)') + ' ' + gettextCatalog.getString('exists but failed to load.')));
                } else {
                  this._doesFileExist = false;

                  reject(new Error(path + ' ' + gettextCatalog.getString('(in this project)') + ' ' + gettextCatalog.getString('does not exist.')));
                }
              })
              .catch(() => {
                reject(new Error(gettextCatalog.getString('Failed to check the existence of') + ' ' + path + '.' + ' ' + gettextCatalog.getString('(in this project)')));
              });
          };

          if (projectId === window.config.projectId) { // Read file from the opening project
            // eslint-disable-next-line prefer-promise-reject-errors
            let fileLoad = Promise.reject();
            for (let i = 0; i < Constant.LIMIT.EDITOR_RELOAD_TRY_LIMIT; i++) {
              fileLoad = fileLoad.catch(attemptToLoadFile).then(checkResponse).catch(rejectDelay);
            }
            fileLoad = fileLoad.then(handleFileLoaded).catch(handleFileLoadError);
          } else { // Read file from another project
            MonacaApi.Ide.Compare.anotherProjectFileRead(window.config.projectId, projectId, path, '', encoding)
              .then((response) => {
                this._doesFileExist = true;

                // Set value
                this._model.setValue(response.body);

                this.markAsClean();
                this.clearUndoBuffer();

                // Set language
                monaco.editor.setModelLanguage(this._model, FileUtilityFactory.getLanguage(path));
                resolve();
              })
              .catch(() => {
                reject(new Error(gettextCatalog.getString('Failed to load') + ' ' + path + ' ' + gettextCatalog.getString(`in another project.`) + ' ' + `(` + gettextCatalog.getString(`Project ID`) + `: ${projectId})`));
              });
          }
        });

        return this._fileLoadingPromise;
      }

      reloadFile () {
        return this.loadFileContentToModel(this._projectId, this._path, this._encoding);
      }
    }

    // Private static variables
    const _instanceMap = new Map();

    // Static methods
    ModelWrapper.getInstance = (projectId, path) => {
      return new Promise((resolve, reject) => {
        const hash = window.objectHash({ projectId: projectId, path: path });

        // Re-use existing instance
        if (_instanceMap.has(hash)) {
          const existingInstance = _instanceMap.get(hash);
          existingInstance.waitUntilFileIsLoaded()
            .then(() => {
              resolve(existingInstance);
            })
            .catch((err) => {
              _instanceMap.delete(hash);
              reject(err);
            });
          return;
        }

        // Create new instance
        const newInstance = new ModelWrapper();
        _instanceMap.set(hash, newInstance);
        newInstance.loadFileContentToModel(projectId, path)
          .then(() => {
            resolve(newInstance);
          })
          .catch((err) => {
            _instanceMap.delete(hash);
            reject(err);
          });
      });
    };

    ModelWrapper.deleteInstance = (projectId, path) => {
      return new Promise((resolve, reject) => {
        const hash = window.objectHash({ projectId: projectId, path: path });

        if (_instanceMap.has(hash)) {
          const existingInstance = _instanceMap.get(hash);
          existingInstance.waitUntilFileIsLoaded()
            .then(() => {
              _instanceMap.delete(hash);
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      });
    };

    return ModelWrapper;
  }
]);

;angular.module('monacaIDE').factory('ProjectTreeFactory', [
  '$q',
  '$http',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'Dialog',
  'ProjectFileService',
  'FileUtilityFactory',
  '$uibModal',
  '$templateCache',
  'TerminalService',
  'ProjectFactory',
  'CommonFunctionService',
  function ($q, $http, PubSub, Constant, gettextCatalog, Dialog, ProjectFileService, FileUtilityFactory, $modal, $tpl, TerminalService, ProjectFactory, CommonFunctionService) {
    /**
     * Contains Project Tree Structure.
     *
     * @type {Object}
     */
    var _tree = {};
    var _folder_tree = {};

    // Uploading Guide Lines
    // 1. Add to upload stack.
    // 2. Item on the stack needs to declare the file and upload path.

    /**
     * File Upload Queue Stack in Object Format
     *
     * @type {Object}
     */
    var _uploadQueueStack = {
      // Example Entry
      // '/path/to/file.ext': {
      //   file: 'file.ext',
      //   path: '/path/to/'
      // }
    };

    /**
     * Overwriting Message Elements
     *
     * @type {Object}
     */
    var overwritingMessage = {
      title: 'Confirm File Overwrite',
      content: 'The file "<strong>{{file}}</strong>" already exists.<br/>Would you like to overwrite it?'
    };

    /**
     * Replace All flag
     *
     * @type {Boolean}
     */
    var _replaceAll = false;

    /**
     * Default Upload Error
     *
     * @param  {String} key  Upload Queue Stack Key
     * @param  {Object} resp Upload Response Object
     * @return {Boolean}
     */
    function uploadError (key, resp) {
      return cleanAndNotify(
        key,
        'danger',
        gettextCatalog.getString('Failed to upload file due to an unexpected server error.'),
        resp
      );
    }

    /**
     * Default Upload Success
     *
     * @param  {String} key  Upload Queue Stack Key
     * @param  {Object} resp Upload Response Object
     * @return {Boolean}
     */
    function uploadSuccess (key, resp) {
      return cleanAndNotify(
        key,
        'success',
        gettextCatalog.getString('File has been uploaded successfully.'),
        resp
      );
    }

    /**
     * Remove leading slashes
     * @param {String} filepath
     * @return {String}
     */
    function removeLeadingSlashes (filepath) {
      return filepath.replace(/^\/+/, '');
    }

    /**
     * Remove completed (success or fail) items from the Upload Queue Stack and notify user
     *
     * @param  {String} key     Upload Queue Stack Key
     * @param  {String} status  Notify user status
     * @param  {String} message Notify user message
     * @param  {Object} resp    Upload Response Object
     * @return {Boolean}        true
     */
    function cleanAndNotify (key, status, message, resp) {
      delete _uploadQueueStack[key];

      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: status,
        content: message
      });

      PubSub.publish(Constant.EVENT.CREATED_NEW_FILE_OR_FOLDER, resp.body.result);
      instance.uploadStatus.count--;

      if ((CommonFunctionService.isTerminalService()) && (status === 'success') && (ProjectFactory.getEnvironmentType() !== 'local')) {
        const FailedDetectChangeMessage = gettextCatalog.getString('Failed to detect file changes. Please refresh the preview panel for latest change.');
        TerminalService.triggerFileChange(removeLeadingSlashes(key))
          .then(response => {
            if (response && response.data === 'ok') {
              // DO NOTHING
            } else {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'danger',
                content: FailedDetectChangeMessage
              });
            }
          })
          .catch(err => {
            console.log(err);
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: FailedDetectChangeMessage
            });
          });
      }

      return true;
    }

    /**
     * Notify Error Wrapper
     * @param  {String} message Error Message
     */
    function notifyError (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: message
      });
    }

    function checkFileName (name) {
      if (!name) {
        notifyError(gettextCatalog.getString('The file name cannot be null.'));
        return false;
      }

      if (!name.match(/^[!-~]+$/) || name.match(/[/<>;]/)) {
        notifyError(gettextCatalog.getString('The file name includes invalid character.'));
        return false;
      }
      return true;
    }

    var instance = {
      /**
       * Uploading Status
       *
       * @type {Object}
       */
      uploadStatus: {
        count: 0
      },

      /**
       * Get Tree Data
       *
       * @type {Object}
       */
      getTreeData: function () {
        return _tree;
      },

      /**
       * Get Folder Data
       *
       * @type {Object}
       */
      getFolderTreeData: function () {
        return _folder_tree;
      },

      /**
       * Add folder to Folder Data tree
       */
      addFolderTreeData: function (key) {
        if (!_folder_tree[key]) _folder_tree[key] = { type: 'dir' };
      },

      /**
       * Remove folder from Folder Data tree
       */
      removeFolderTreeData: function (key) {
        Object.keys(_folder_tree).forEach(function (value) {
          if (value.startsWith(key)) {
            delete _folder_tree[value];
          }
        });
      },

      /**
       * Get all the folders of project from server
       */
      loadFolderTreeData: function () {
        return $q.when(ProjectFileService.getFolderTree())
          .then(function (resp) {
            _folder_tree = resp.result.items;
            return $q.resolve(null);
          })
          .catch(function (err) {
            _folder_tree = {};
            console.error(err);
            return $q.resolve(null);
          });
      },

      /**
       * Push to upload queue stack.
       *
       * @param  {String} path Directory path where file is uploaded
       * @param  {String} file Name of the file
       * @return {Promise|Boolean} Returns upload promise or false.
       */
      push: function (filePath, file, singleFile) {
        if (!checkFileName(file.name)) return false;

        // Example Key = /www/test.html
        var queueStackKey = filePath + file.name;
        var _singleFile = singleFile;

        /**
         * Actual push action to perform if the user approves overwriting, if file already exists.
         */
        function _push () {
          if (_uploadQueueStack.hasOwnProperty(queueStackKey)) {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('This file is already being uploaded. Please wait and try again.')
            });

            return $q.reject(false);
          }

          _uploadQueueStack[queueStackKey] = {
            file: file,
            path: filePath
          };
          instance.uploadStatus.count++;

          // console.debug('[File Upload] File Sent to Server', queueStackKey);

          return ProjectFileService.upload(filePath, file).then(
            uploadSuccess.bind(this, queueStackKey),
            uploadError.bind(this, queueStackKey)
          );
        }

        if ($('#jstree').jstree(true).get_node(queueStackKey) && _singleFile) {
          return Dialog.confirm(
            gettextCatalog.getString(overwritingMessage.content, { file: queueStackKey }),
            gettextCatalog.getString(overwritingMessage.title)
          ).then(function (allowOverwrite) {
            if (allowOverwrite) {
              return _push();
            }
            return $q.success();
          });
        } else {
          return _push();
        }
      },

      onDrop: function (evt, node) {
        var files = evt.dataTransfer.files;
        var items = evt.dataTransfer.items;

        _replaceAll = false; // Reinitialize

        // Prevent Defaults
        event.preventDefault();
        event.stopPropagation();

        function uploadFile (file) {
          PubSub.publish(Constant.EVENT.EXECUTE_WITH_SELECTED_NODE, {
            target: node || evt.srcElement,
            callback: function (node) {
              var baseDir = '/';

              if (node !== '/') {
                baseDir = node.original.type === 'dir' ? node.original.id : node.original.parent;
              }

              var filePath = baseDir + file.fileName;
              var fileDirPath = filePath.split('/').slice(0, -1).join('/') + '/';

              instance.push(fileDirPath, file.entry, false);
            }
          });
        }

        // check exist file in server
        function checkExistFile (path) {
          return ProjectFileService.isExist(path).then(
            function (res) {
              return res.body.result;
            },
            function (err) {
              console.error(err);
              return null;
            }
          );
        }

        function openConfirmReplaceDialog (queueStackKey) {
          return $modal.open({
            templateUrl: 'commonDialogs/ReplaceDialog.html',
            controller: 'ReplaceController',
            windowClass: 'confirm-window',
            backdrop: 'static',
            resolve: {
              title: function () {
                return gettextCatalog.getString(overwritingMessage.title);
              },
              message: function () {
                return gettextCatalog.getString(overwritingMessage.content, { file: queueStackKey });
              },
              callback: function () {
                return function () {
                  _replaceAll = true;
                  return $q.when();
                };
              }
            }
          }).result;
        }

        let lastConfirmReplaceDialogPromise = Promise.resolve();

        function enqueueConfirmReplaceDialogOpening (entry, queueStackKey) {
          lastConfirmReplaceDialogPromise = lastConfirmReplaceDialogPromise.then(() => {

            let dialogFunc = _replaceAll ?
              () => $q.when() :
              () => openConfirmReplaceDialog(queueStackKey);

            return dialogFunc()
              .then(() => {
                entry.file((file) => {
                  uploadFile({
                    fileName: entry.fullPath,
                    entry: file
                  });
                });
              })
              .catch(() => {}); // Ignoring
          });
        }

        function recursiveTree (entry) {
          if (entry.isFile) {
            var queueStackKey = node !== '/' ? node + entry.fullPath : entry.fullPath;

            checkExistFile(queueStackKey).then(function (result) {
              if (!result) {
                return; // Ignoring
              }
              if (result[queueStackKey]) {
                enqueueConfirmReplaceDialogOpening(entry, queueStackKey);
              } else {
                entry.file(function (file) {
                  uploadFile({
                    fileName: entry.fullPath,
                    entry: file
                  });
                });
              }
            });
          } else if (entry.isDirectory) {
            var reader = entry.createReader();
            var readEntries = function () {
              reader.readEntries(function (items) {
                var chain = $q.resolve();
                items.forEach(function (item) {
                  chain = chain.then(function () {
                    return recursiveTree(item);
                  });
                });
                if (items.length) readEntries();
              });
            };
            readEntries();
          }
        }

        for (var i = 0; i < files.length; i++) {
          recursiveTree(items[i].webkitGetAsEntry());
        }
      }
    };

    return instance;
  }
]);

;angular.module('monacaIDE').factory('TerminalFactory', ['TerminalSettingFactory', 'Constant', 'PubSub', 'ProjectService', '$q', 'gettextCatalog', function (TerminalSettingFactory, Constant, PubSub, ProjectService, $q, gettextCatalog) {
  var _previewUrl = '';
  var _containerId = '';
  var _serverAppUrl = '';
  var _currentPreviewPort = 8080;
  var _previewPorts = [];
  var _isConnectingToServer = false;
  var _settings = null;
  var _isNetworkStable = true;
  var _retryNetworkCount = 0;
  var _maxRetryNetwork = 3;
  var _customCommand = '/bin/bash';
  var _startTerminalPrivilege = false;

  var _factoryPromise = $q.when(ProjectService.getTerminalSetting(window.config.projectId)).then((config) => {
    _settings = config;
  });

  function isEmpty (settings) {
    if (settings.constructor === Array) return true;
    if (settings.constructor === Object && Object.keys(settings).length === 0) return true;
    return false;
  }

  return {
    loading: _factoryPromise,

    fetchSettings: function () {
      return ProjectService.getTerminalSetting(window.config.projectId).then((config) => {
        _settings = config;
      });
    },

    getSettings: function () {
      if (isEmpty(_settings)) {
        return TerminalSettingFactory.getDefaultSettings();
      } else {
        return _settings;
      }
    },

    setSettings: function (settings) {
      return ProjectService.saveTerminalSetting(window.config.projectId, settings)
        .then(newSettings => {
          _settings = settings;
          PubSub.publish(Constant.EVENT.TERMINAL_SETTING_CHANGED, settings);
          return settings;
        });
    },

    getTerminalBackgroundColor: function () {
      let settings = this.getSettings();
      let default_background = TerminalSettingFactory.getDefaultBackground();
      if (!settings || !settings['theme']) return default_background;
      let background = TerminalSettingFactory.getThemeConfiguration(settings['theme']).background;
      return background || default_background;
    },

    networkIsNotStable: function () {
      _retryNetworkCount += 1;
    },
    setNetworkStatus: function (status) {
      _isNetworkStable = status;
      if (status) _retryNetworkCount = 0;
    },
    isNetworkStable: function () {
      if (_retryNetworkCount >= _maxRetryNetwork) return false;
      return _isNetworkStable;
    },
    connectingToServer: function (status) {
      _isConnectingToServer = status;
    },
    isConnectingToServer: function () {
      return _isConnectingToServer;
    },
    getContainerID: function () {
      return _containerId;
    },
    setContainerID: function (containerId) {
      _containerId = containerId;
    },
    getTerminalURL: function () {
      return `${_serverAppUrl}/terminals`;
    },
    setTerminalURL: function (serverAppUrl) {
      if (serverAppUrl) _serverAppUrl = serverAppUrl;
    },
    getTerminalFileSaveUrl: function () {
      return `${_serverAppUrl}/file/save`;
    },
    getPreviewUrl: function () {
      return _previewUrl;
    },
    setPreviewUrl: function (url) {
      if (url) _previewUrl = url;
    },
    getCurrentPreviewPort: function () {
      return _currentPreviewPort;
    },
    setCurrentPreviewPort: function (port) {
      if (port) _currentPreviewPort = port;
    },
    getPreviewPorts: function () {
      return _previewPorts;
    },
    setPreviewPorts: function (ports) {
      if (ports) _previewPorts = ports;
    },
    getFullTranspileCommand: function () {
      return `monaca preview ${_currentPreviewPort}`;
    },
    setCustomCommand: function (command) {
      _customCommand = command;
    },
    getCustomCommand: function () {
      return _customCommand || '/bin/bash';
    },
    resetCustomCommand: function () {
      _customCommand = '/bin/bash';
    },
    startTerminalPrivilege: function (privilege) {
      _startTerminalPrivilege = privilege;
    },
    getStartTerminalPrivilege: function () {
      return _startTerminalPrivilege;
    }
  };
}]);

;angular.module('monacaIDE').factory('TerminalSettingFactory', ['ProjectFactory', 'Constant', function (ProjectFactory, Constant) {
  const default_black = {
    /** The default background color */
    background: '#161719',
    /** The cursor color */
    cursor: '#d0d0d0',
    /** The default foreground color */
    foreground: '#c5c8c6',
    /** ANSI black (eg. `\x1b[30m`) */
    black: '#000000',
    /** ANSI red (eg. `\x1b[31m`) */
    red: '#fd5ff1',
    /** ANSI green (eg. `\x1b[32m`) */
    green: '#87c38a',
    /** ANSI yellow (eg. `\x1b[33m`) */
    yellow: '#ffd7b1',
    /** ANSI blue (eg. `\x1b[34m`) */
    blue: '#85befd',
    /** ANSI magenta (eg. `\x1b[35m`) */
    magenta: '#b9b6fc',
    /** ANSI cyan (eg. `\x1b[36m`) */
    cyan: '#85befd',
    /** ANSI white (eg. `\x1b[37m`) */
    white: '#e0e0e0',
    /** ANSI bright black (eg. `\x1b[1;30m`) */
    brightBlack: '#000000',
    /** ANSI bright red (eg. `\x1b[1;31m`) */
    brightRed: '#fd5ff1',
    /** ANSI bright green (eg. `\x1b[1;32m`) */
    brightGreen: '#94fa36',
    /** ANSI bright yellow (eg. `\x1b[1;33m`) */
    brightYellow: '#f5ffa8',
    /** ANSI bright blue (eg. `\x1b[1;34m`) */
    brightBlue: '#96cbfe',
    /** ANSI bright magenta (eg. `\x1b[1;35m`) */
    brightMagenta: '#b9b6fc',
    /** ANSI bright cyan (eg. `\x1b[1;36m`) */
    brightCyan: '#85befd',
    /** ANSI bright white (eg. `\x1b[1;37m`) */
    brightWhite: '#e0e0e0',
    /** The accent color of the cursor (used as the foreground color for a block cursor) */
    cursorAccent: '#000000',
    /** The selection color (can be transparent) */
    selection: 'rgba(255, 255, 255, 0.3)'
  };

  const default_white = {
    /** The default background color */
    background: '#f9f9f9',
    /** The cursor color */
    cursor: '#bbbbbb',
    /** The default foreground color */
    foreground: '#2a2c33',
    /** ANSI black (eg. `\x1b[30m`) */
    black: '#000000', // color0
    /** ANSI red (eg. `\x1b[31m`) */
    red: '#de3e35', // color1
    /** ANSI green (eg. `\x1b[32m`) */
    green: '#3f953a', // color2
    /** ANSI yellow (eg. `\x1b[33m`) */
    yellow: '#d2b67c', // color3
    /** ANSI blue (eg. `\x1b[34m`) */
    blue: '#2f5af3', // color4
    /** ANSI magenta (eg. `\x1b[35m`) */
    magenta: '#950095', // color5
    /** ANSI cyan (eg. `\x1b[36m`) */
    cyan: '#3f953a', // color6
    /** ANSI white (eg. `\x1b[37m`) */
    white: '#bbbbbb', // color7
    /** ANSI bright black (eg. `\x1b[1;30m`) */
    brightBlack: '#000000', // color8
    /** ANSI bright red (eg. `\x1b[1;31m`) */
    brightRed: '#de3e35', // color9
    /** ANSI bright green (eg. `\x1b[1;32m`) */
    brightGreen: '#3f953a', // color10
    /** ANSI bright yellow (eg. `\x1b[1;33m`) */
    brightYellow: '#d2b67c', // color11
    /** ANSI bright blue (eg. `\x1b[1;34m`) */
    brightBlue: '#2f5af3', // color12
    /** ANSI bright magenta (eg. `\x1b[1;35m`) */
    brightMagenta: '#a00095', // color13
    /** ANSI bright cyan (eg. `\x1b[1;36m`) */
    brightCyan: '#3f953a', // color14
    /** ANSI bright white (eg. `\x1b[1;37m`) */
    brightWhite: '#ffffff', // color15
    /** The accent color of the cursor (used as the foreground color for a block cursor) */
    cursorAccent: '#000000',
    /** The selection color (can be transparent) */
    selection: 'rgba(0, 0, 0, 0.3)'
  };

  const _defaultConfig = {
    fontFamily: 'Ricty Diminished',
    fontSize: 13,
    theme: 'Default_White',
    cursorStyle: 'block',
    cursorBlink: false
  };
  const _fonts = [
    {label: 'Default', value: 'Ricty Diminished'},
    {label: 'Courier New', value: 'Courier New'},
    {label: 'DejaVu Sans Mono', value: 'DejaVu Sans Mono'},
    {label: 'Droid Sans Mono Slashed', value: 'Droid Sans Mono Slashed'},
    {label: 'M+ 1mn regular', value: 'mplus-1mn-regular'},
    {label: 'Monaco', value: 'Monaco'},
    {label: 'Source Code Pro', value: 'Source Code Pro'}
  ];
  const _themes = [
    {label: 'Default White', value: 'Default_White'},
    {label: 'Default Black', value: 'Default_Black'}
  ];
  const _cursorStyles = [
    {label: 'block', value: 'block'},
    {label: 'underline', value: 'underline'},
    {label: 'bar', value: 'bar'}
  ];
  const _terminalOSes = [
    {label: 'generic', value: 'generic'},
    {label: 'javascript', value: 'javascript'}
  ];
  const _themeConfigurations = {
    Default_White: default_white,
    Default_Black: default_black
  };

  return {

    getThemeConfiguration: function (theme) {
      return _themeConfigurations[theme];
    },

    getValidFonts: function () {
      return _fonts;
    },

    getValidThemes: function () {
      return _themes;
    },

    getValidCursorStyles: function () {
      return _cursorStyles;
    },

    getValidTerminalOSes: function () {
      return _terminalOSes;
    },

    getDefaultSettings: function () {
      return _defaultConfig;
    },

    getDefaultBackground: function () {
      return default_white.background;
    },

    getDefaultTerminalOS: function () {
      try {
        if (ProjectFactory.isGenericProject()) return Constant.PROJECT_TYPE.GENERIC;
        return Constant.PROJECT_TYPE.JAVASCRIPT;
      } catch (error) {
        return Constant.PROJECT_TYPE.JAVASCRIPT; // fallback
      }
    }

  };
}]);

;angular.module('monacaIDE').factory('WebComponentFactory', [
  '$q',
  'Constant',
  'gettextCatalog',
  'PubSub',
  'WebComponentService',
  function ($q, Constant, gettextCatalog, PubSub, WebComponentService) {
    // Data storage from the initializer of the factory.
    var _components = [];

    // Initializes the factories data.
    function formatFetchedComponentList (data) {
      var formattedCollection = [];

      Object.keys(data).forEach(function (key) {
        data[key].key = key;
        formattedCollection.push(data[key]);
      });

      return formattedCollection;
    }

    var _factoryPromise = $q.when(WebComponentService.list()).then(
      function (resp) {
        formatFetchedComponentList(resp.result).forEach(function (component) {
          _components.push(component);
        });
      },
      function (error) {
        return $q.reject(error);
      }
    );

    return {
      loading: _factoryPromise,
      collection: _components,

      fetchList: function (keyword) {
        keyword = keyword || '';
        WebComponentService.list(keyword).then(function (resp) {
          this.collection = formatFetchedComponentList(resp.result);
        }.bind(this));
      },

      uninstall: function (componentName) {
        return WebComponentService.uninstall(componentName).then(function (resp) {
          // Fetch Updated List
          this.fetchList();
          return $q.resolve(resp);
        }.bind(this));
      },

      install: function (componentName, version) {
        return WebComponentService.install(componentName, version).then(function (resp) {
          // Fetch Updated List
          this.fetchList();
          return $q.resolve(resp);
        }.bind(this));
      },

      fetchComponentDetails: function (name, isOffline) {
        return WebComponentService.fetchComponentDetails(name, isOffline);
      },

      setLoader: function (componentFiles) {
        return WebComponentService.setLoader(componentFiles);
      }
    };
  }]);

;angular.module('monacaIDE').factory('ProjectSettingFactory', ['$q', 'ProjectService', '$routeParams', function ($q, ProjectService, $routeParams) {
  // Data storage from the initializer of the factory.
  var _data;

  // Initializes the factories data.
  function load () {
    return $q.when(new Promise(function (resolve, reject) {
      setTimeout(function () {
        if ($routeParams.projectId) {
          ProjectService.getProjectSetting($routeParams.projectId).then(function (resp) {
            resolve(resp);
          });
        } else {
          resolve(undefined);
        }
      });
    })).then(function (resp) {
      _data = resp || {};
      return _data;
    });
  }

  return {
    loading: load(),

    reload: function () {
      this.loading = load();
    },

    /**
     * Initialize the Project Factory Data.
     */
    getResult: function () {
      return _data;
    },

    getProjectInfo: function () {
      return _data.project || {};
    },

    getConfig: function (platform) {
      if (platform) {
        return _data.config[platform] ? _data.config[platform] : {};
      } else {
        return _data.config || {};
      }
    },

    getPreference: function () {
      return _data.preference || {};
    }
  };
}]);

;angular.module('monacaIDE').service('BuildService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Build;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    fetchLogList: function (param) {
      return $q.when(Api.history(project_id, param)).then(function (resp) {
        return formatResponse(resp);
      });
    },

    deleteHistory: function (historyId) {
      return $q.when(Api.deleteHistory(project_id, {queue_id: historyId})).then(function (resp) {
        return formatResponse(resp);
      });
    },

    downloadLog: function (historyId) {
      return $q.when(Api.result(project_id, historyId)).then(function (resp) {
        return formatResponse(resp);
      });
    },

    getOfficialReleaseDebuggerVersion: function (platform) {
      return $q.when(Api.getOfficialReleaseDebuggerVersion(project_id, platform)).then(function (resp) {
        return formatResponse(resp);
      });
    },

    setIsPubliclyDownloadable: function (queue_id, is_public) {
      return $q.when(Api.setIsPubliclyDownloadable(project_id, queue_id, is_public)).then(function (resp) {
        return formatResponse(resp);
      });
    },

    setIsResultPubliclyReadable: function (queue_id, is_result_public) {
      return $q.when(Api.setIsResultPubliclyReadable(project_id, queue_id, is_result_public)).then(function (resp) {
        return formatResponse(resp);
      });
    }
  };
}]);

;angular.module('monacaIDE').service('CIService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Ci;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    fetchLogList: function (param) {
      return $q.when(Api.fetchLogList(project_id, param)).then(function (resp) {
        return formatResponse(resp);
      });
    }
  };
}]);

;angular.module('monacaIDE').service('ContainerService', [
  '$q',
  function ($q) {
    return {

      /**
       * Remove Terminal
       *
       * @return {Promise} returns Object
       */
      removeTerminal: function (projectId) {
        return $q.when(MonacaApi.Ide.Terminal.removeTerminal(projectId)).then(function (resp) {
          return resp.body.result;
        });
      }

    };
  }]);

;angular.module('monacaIDE').service('ContinuousIntegrator', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Ci;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    response = response.body;

    if (response.status === 'error') {
      return $q.reject(response);
    } else {
      return $q.resolve(response.result);
    }
  }

  return {
    fetch: function () {
      return $q.when(Api.getCiConfigs(project_id)).then(formatResponse.bind(this));
    },

    saveCiConfigs: function (config) {
      return $q.when(Api.saveCiConfigs(project_id, config)).then(formatResponse.bind(this));
    },

    saveCiConfig: function (config) {
      return $q.when(Api.saveCiConfig(project_id, config.id, JSON.stringify(config))).then(formatResponse.bind(this));
    },

    deleteCiConfig: function (ci_config_id) {
      return $q.when(Api.deleteCiConfig(project_id, ci_config_id)).then(formatResponse.bind(this));
    },

    enable: function (enabled) {
      return $q.when(Api.enableCi(project_id, enabled)).then(formatResponse.bind(this));
    }

    // This is used only in IDE not App
    // fetchLogList: function() {
    //   return $q.when(Api.fetchLogList(project_id, type)).then(function(resp) {
    //     return formatResponse(resp);
    //   });
    // },
  };
}]);

;angular.module('monacaIDE').service('CordovaPluginService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Cordova;
  var BuildApi = MonacaApi.Ide.Build;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    /**
     * Get a collection of available Cordova plugins for project by project id.
     *
     * @return {Promise}
     */
    list: function () {
      return $q.when(Api.list(project_id, true)).then(formatResponse.bind(this));
    },

    /**
     * Get a collection of enabled Cordova plugins for project by project id.
     *
     * @return {Promise}
     */
    listEnabled: function () {
      return $q.when(Api.listEnabled(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Get a collection of available Cordova version.
     *
     * @return {Promise}
     */
    versionList: function () {
      return $q.when(Api.versionList(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Get a collection of available Cordova plugins from npm registry.
     *
     * @return {Promise}
     */
    getCordovaRegistryIoPlugins: function () {
      return $q.when(Api.getCordovaRegistryIoPlugins(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Enables selected Cordova Plugin to the defined project.
     *
     * @return {Promise}
     */
    enable: function (plugin_id) {
      return $q.when(Api.enable(project_id, plugin_id))
        .then(formatResponse.bind(this))
        .catch(formatResponse.bind(this));
    },

    /**
     * Disables selected Cordova Plugin to the defined project.
     *
     * @return {Promise}
     */
    disable: function (plugin_id) {
      return $q.when(Api.disable(project_id, plugin_id)).then(formatResponse.bind(this));
    },

    /**
     * Imports external Cordova Plugin to the defined project.
     *
     * @param {} file archive package of a Cordova Plugin to import.
     *
     * @return {Promise}
     */
    importFile: function (file) {
      return $q.when(Api.importFile(project_id, file)).then(formatResponse.bind(this));
    },

    /**
     * Get user's Cordova affect plugin version.
     *
     * @param {String} version Targeted Cordova Version
     *
     * @return {Promise}
     */
    getUserAffectPluginList: function (version) {
      return $q.when(Api.getUserAffectPluginList(project_id, version))
        .then(formatResponse.bind(this))
        .catch(formatResponse.bind(this));
    },

    /**
     * Switches defined project's current Cordova version.
     *
     * @param {String} version Targeted Cordova Version
     *
     * @return {Promise}
     */
    switchCordovaVersion: function (version) {
      return $q.when(Api.switchCordovaVersion(project_id, version))
        .then(formatResponse.bind(this))
        .catch(formatResponse.bind(this));
    },

    /**
     * Get Cordova Plugin Settings.
     *
     * @param {String} plugin_id Cordova Plugin ID
     *
     * @return {Promise}
     */
    getPluginSettings: function (plugin_id) {
      return $q.when(Api.getPluginSettings(project_id, plugin_id)).then(formatResponse.bind(this));
    },

    /**
     * Get Cordova Plugin Version Collection
     *
     * @param {String} plugin_id Cordova Plugin ID
     *
     * @return {Promise}
     */
    getPluginVersionCollection: function (plugin_id) {
      return $q.when(Api.getPluginVersionCollection(project_id, plugin_id)).then(formatResponse.bind(this));
    },

    /**
     * Update Cordova Plugin Settings
     *
     * @param {Object} params Cordova Plugin Paramers { "pluginId":"", ... }
     *
     * @return {Promise}
     */
    updatePluginSettings: function (params) {
      return $q.when(Api.updatePluginSettings(project_id, params)).then(formatResponse.bind(this));
    },

    /**
     * Returns if the status of the Assets Encryption Password setting.
     *
     * @return {Promise}
     */
    hasAssetEncryptionPassword: function () {
      return $q.when(BuildApi.canBuildIosApp(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Sets the Assets Encrypt Password
     *
     * @param {String} password Asset Encrypt Password
     * @param {String} password_confirm Asset Encrypt Confirm Password
     *
     * @return {Promise}
     */
    saveAssetsEncryptPassword: function (password, password_confirm) {
      return $q.when(Api.saveAssetsEncryptPassword(project_id, password, password_confirm)).then(formatResponse.bind(this));
    },

    /**
     * Gets In-App Updater Cordova Plugin Settings
     *
     * @return {Promise}
     */
    getInAppUpdaterSetting: function () {
      return $q.when(Api.getInAppUpdaterSetting(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Gets In-App Updater 4 Cordova Plugin Settings
     *
     * @return {Promise}
     */
    getInAppUpdater4Setting: function () {
      return $q.when(Api.getInAppUpdater4Setting(project_id)).then(formatResponse.bind(this));
    },

    /**
     * Save In-App Updater Cordova Plugin Settings
     *
     * @param {String} mode In-App Updater Mode
     * @param {String} url In-App Updater Mode URL
     *
     * @return {Promise}
     */
    saveInAppUpdaterSetting: function (mode, url) {
      return $q.when(Api.saveInAppUpdaterSetting(project_id, mode, url)).then(formatResponse.bind(this));
    },

    /**
     * Save In-App Updater Cordova Plugin Settings
     *
     * @param {String} mode In-App Updater Mode
     * @param {String} url In-App Updater Mode URL
     *
     * @return {Promise}
     */
    saveInAppUpdater4Setting: function (mode, url) {
      return $q.when(Api.saveInAppUpdater4Setting(project_id, mode, url)).then(formatResponse.bind(this));
    },

    /**
     * Import Cordova Plugin by Plugin Name or URL
     *
     * @param {String} name Custom Cordova Plugin Name or URL
     *
     * @return {Promise}
     */
    importCordovaPluginPath: function (name) {
      return $q.when(Api.importCordovaPluginPath(project_id, name)).then(formatResponse.bind(this));
    },

    /**
     * Import Cordova Plugin by File Upload
     *
     * @param {File} file Custom Cordova Plugin File Upload
     *
     * @return {Promise}
     */
    importCordovaPluginFile: function (file) {
      return $q.when(Api.importCordovaPluginFile(project_id, file)).then(formatResponse.bind(this));
    },

    /**
     * Fetch plugin data from target registry.
     *
     * @param {String} registry registry repository name
     * @param {String} plugin plugin name
     *
     * @return {Promise}
     */
    fetchRegistryData: function (registry, plugin) {
      return $q.when(Api.fetchRegistryData(registry, plugin)).then(formatResponse.bind(this));
    }
  };
}]);

;angular.module('monacaIDE').service('CordovaService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Cordova;
  var project_id = window.config.projectId;

  return {
    upgradeVersion: function (language) {
      return $q.when(Api.upgradeVersion(project_id)).then(function (resp) {
        return resp.body;
      });
    }
  };
}]);

;angular.module('monacaIDE').service('DeployServiceIntegrator', ['$q', function ($q, BaseApi) {
  var Api = MonacaApi.Ide.Deploy;

  function formatResponse (response) {
    response = response.body;

    if (response.status === 'error') {
      return $q.reject(response);
    } else {
      return $q.resolve(response);
    }
  }

  return {
    fetchServices: function () {
      return $q.when(Api.getAvailableBackendServiceCollection()).then(formatResponse.bind(this));
    },

    fetchOwned: function () {
      return $q.when(Api.getUsersBackendServiceCollection()).then(formatResponse.bind(this));
    },

    add: function (formData) {
      return $q.when(Api.addUserOwnedBackendService(formData)).then(formatResponse.bind(this));
    },

    remove: function (service, alias) {
      return $q.when(Api.removeUserOwnedBackendService(service, alias)).then(function (resp) {
        return formatResponse(resp);
      });
    },

    distributeApp: function (project_id, service_type, service_alias, service_optional_params, build_queue_id, ci_queue_id) {
      return $q.when(Api.distributeApp(project_id, service_type, service_alias, service_optional_params, build_queue_id, ci_queue_id)).then(function (resp) {
        return formatResponse(resp);
      });
    }
  };
}]);

;angular.module('monacaIDE').service('Dialog', [
  '$http',
  '$q',
  '$uibModal',
  'gettextCatalog',
  function ($http, $q, $modal, gettextCatalog) {
    var GENERAL_DIALOG_TITLE = gettextCatalog.getString('Monaca IDE');

    return {
      alert: function (msg, title) {
        return $modal.open({
          templateUrl: 'commonDialogs/AlertDialog.html',
          controller: 'AlertController',
          windowClass: 'alert-window',
          resolve: {
            title: function () {
              return title || GENERAL_DIALOG_TITLE;
            },
            message: function () {
              return msg;
            }
          }
        }).result;
      },

      confirm: function (msg, title) {
        return $modal.open({
          templateUrl: 'commonDialogs/ConfirmDialog.html',
          controller: 'ConfirmController',
          windowClass: 'confirm-window',
          resolve: {
            title: function () {
              return title || GENERAL_DIALOG_TITLE;
            },
            message: function () {
              return msg;
            }
          }
        }).result;
      },

      /**
     * confirm dialog with callback function called when user pressed 'OK'
     * @param {String} msg
     * @param {String} title
     * @param {function} callback should return Promise
     */
      confirmWithCallback: function (msg, title, callback) {
        $modal.open({
          templateUrl: 'commonDialogs/ConfirmDialog.html',
          controller: 'ConfirmWithCallbackController',
          windowClass: 'confirm-window',
          resolve: {
            title: function () {
              return title || GENERAL_DIALOG_TITLE;
            },
            message: function () {
              return msg;
            },
            callback: function () {
              return function () {
                var dfd = $q.defer();

                callback()
                  .then(function (result) {
                    dfd.resolve(result);
                  }, function (result) {
                    dfd.reject(result);
                  });

                return dfd.promise;
              };
            }
          }
        });
      }
    };
  }]);

;angular.module('monacaIDE').service('EditorManagementService', [
  'PubSub',
  'Constant',
  function (PubSub, Constant) {
    var editors = {};
    // register editor with given id
    PubSub.subscribe(Constant.EVENT.EDITOR_CREATED, function (opts) {
      editors[opts.id] = opts.editor;
    });
    // remove registered editor which is associated with the closed view
    PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, function (opts) {
      if (opts.componentName === Constant.VIEW.NORMAL_EDITOR_VIEW) {
        delete editors[opts.componentId];
      }
    });
    /**
     * get editor instance.
     * @param {string} id
     * @return {Object}
     */
    function getEditor (id) {
      return editors[id];
    }

    return {
      getEditor: getEditor
    };
  }
]);

;class EditorTabService {
  constructor (
    Constant,
    GoldenLayoutService,
    ProjectFileService,
    PubSub,
    gettextCatalog,
    TerminalService,
    ProjectFactory,
    CommonFunctionService,
    $interval) {
    this.Constant = Constant;
    this.GoldenLayoutService = GoldenLayoutService;
    this.ProjectFileService = ProjectFileService;
    this.PubSub = PubSub;
    this.gettextCatalog = gettextCatalog;
    this.TerminalService = TerminalService;
    this.ProjectFactory = ProjectFactory;
    this.CommonFunctionService = CommonFunctionService;
    this.$interval = $interval;
    this._subscribed = false;
    this.intervalId = null;

    this._setActiveEditorTabId = this._setActiveEditorTabId.bind(this);
    this._onViewOpened = this._onViewOpened.bind(this);
    this._onViewClosed = this._onViewClosed.bind(this);
    this._informUser = this._informUser.bind(this);
    this._subscribedEditorEvents = this._subscribedEditorEvents.bind(this);

    this.PubSub.subscribe(this.Constant.EVENT.LAYOUT_READY, () => {
      this._subscribedEditorEvents();
    });

    this._startCheckingInterval();
  }

  _startCheckingInterval () {
    // fallback solution for subscribed event (in case editor is failed to subscribe to the LAYOUT_READY event)
    this.intervalId = this.$interval(() => {
      if (!this._subscribed && this.GoldenLayoutService.isLayoutReady()) this._subscribedEditorEvents();
    }, 1000 * 1);
  }

  _stopCheckingInterval () {
    this.$interval.cancel(this.intervalId);
    this.intervalId = null;
  }

  _subscribedEditorEvents () {
    try {
      this.PubSub.subscribe(this.Constant.EVENT.SET_ACTIVE_EDITOR_TAB, this._setActiveEditorTabId);
      this.PubSub.subscribe(this.Constant.EVENT.VIEW_OPENED, this._onViewOpened);
      this.PubSub.subscribe(this.Constant.EVENT.VIEW_SHOWN, this._onViewOpened);
      this.PubSub.subscribe(this.Constant.EVENT.VIEW_CLOSED, this._onViewClosed);
      this._subscribed = true;
      this._stopCheckingInterval();
    } catch (e) {
      const errorMessage = this.gettextCatalog.getString('Some modules are not loaded properly. Please refresh the browser.');
      console.error(e);
      console.log(errorMessage);
      this.PubSub.publish(this.Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: errorMessage
      });
      this._stopCheckingInterval();
    }
  }

  _setActiveEditorTabId (opts) {
    if (!this._activeEditorTabId || this._activeEditorTabId !== opts.id) {
      this._activeEditorTabId = opts.id;
      this.PubSub.publish(this.Constant.EVENT.ACTIVE_EDITOR_TAB_CHANGED, {
        id: opts.id
      });
    }
  }

  getActiveEditorTabId () {
    return this._activeEditorTabId;
  }

  isActiveTab (id) {
    return this._activeEditorTabId === id;
  }

  _onViewOpened (opts) {
    if (opts.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || opts.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW) {
      this._setActiveEditorTabId({id: opts.componentId});
    } else {
      this._setActiveEditorTabId({id: null});
    }
  }

  _onViewClosed (opts) {
    if ((opts.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || opts.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW) && opts.componentId === this.getActiveEditorTabId()) {
      this._setActiveEditorTabId({id: null});
    }
  }

  loadFile (filePath, encoding) {
    return this.ProjectFileService.fileRead(filePath, '', encoding);
  }

  _informUser (messageType, message, responseError, filePath) {
    this.PubSub.publish(this.Constant.EVENT.NOTIFY_USER, {
      className: messageType,
      content: message
    });
    if (filePath === '/package.json' && messageType === 'danger' && this.ProjectFactory.getEnvironmentType() !== 'local') {
      // send email
      let errorMessage = '';
      if (responseError) {
        errorMessage = responseError;
      } else {
        errorMessage = message;
      }
      MonacaApi.Ide.Terminal.alertEmail(window.config.projectId, errorMessage);
    }
  }

  saveFile (filePath, content, encoding) {
    return this.ProjectFileService.fileSave(filePath, content, null, null, encoding)
      .then((result) => {
        const isSuccess = result.body.status === 'ok';
        const SuccessMessage = this.gettextCatalog.getString('File has been saved.');
        const FailedMessage = this.gettextCatalog.getString('File failed to save');
        const FailedDetectChangeMessage = this.gettextCatalog.getString('Failed to detect file changes. Please refresh the preview panel for latest change.');

        if (isSuccess) {
          this._informUser('success', SuccessMessage);

          if (!this.CommonFunctionService.isTerminalService()) {
            this.PubSub.publish(this.Constant.EVENT.PREVIEWER_VIEW_URL_REFRESH);
          } else if (this.ProjectFactory.getEnvironmentType() === 'local') {
            // Do nothing
          } else {
            this.TerminalService.triggerFileChange(filePath.substring(1), content)
              .then(response => {
                if (response && response.data !== 'ok') {
                  this._informUser('danger', FailedDetectChangeMessage, response.data, filePath);
                }
              })
              .catch(err => {
                this._informUser('danger', FailedDetectChangeMessage, err.data, filePath);
              });
          }
        } else {
          this._informUser('danger', FailedMessage, '', filePath);
        }
        return isSuccess;
      }).catch((err) => {
        this._informUser('danger',
          this.gettextCatalog.getString('File failed to save') + `: ${err.body.message}`,
          `could not save from backend: ${err.body.message}`,
          filePath
        );
      });
  }
}

EditorTabService.$inject = [
  'Constant',
  'GoldenLayoutService',
  'ProjectFileService',
  'PubSub',
  'gettextCatalog',
  'TerminalService',
  'ProjectFactory',
  'CommonFunctionService',
  '$interval'
];
angular.module('monacaIDE').service('EditorTabService', EditorTabService);

;class GoldenLayoutService {
  constructor ($compile, $rootScope, $templateCache, Constant, ProjectFactory, FileUtilityFactory, PubSub, gettextCatalog, CommonFunctionService, GlobalEditorConfig) {
    this.$compile = $compile;
    this.$rootScope = $rootScope;
    this.$templateCache = $templateCache;
    this.Constant = Constant;
    this.ProjectFactory = ProjectFactory;
    this.FileUtilityFactory = FileUtilityFactory;
    this.PubSub = PubSub;
    this.gettextCatalog = gettextCatalog;
    this.CommonFunctionService = CommonFunctionService;
    this.GlobalEditorConfig = GlobalEditorConfig;
    this._isLayoutReady = false;

    this.saveLayoutConfig = _.debounce(this.saveLayoutConfig, 1000).bind(this);
    this.areViewsOpen = this.areViewsOpen.bind(this);

    this.LOCALSTORAGE_KEY = 'golden_layout_config_' + window.config.projectId;
    this.COMPONENT_ID_PREFIX = 'mn-gl-'; // ensure that the IDs we generate are unique

    this.COMPONENTS_CONFIG = {
      project: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.PROJECT_VIEW,
          type: 'component',
          title: gettextCatalog.getString('Files'),
          width: 12,
          isClosable: false
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_PROJECT_VIEW
        },
        templateUrl: 'project.html'
      },
      editor: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.NORMAL_EDITOR_VIEW,
          componentState: {
            url: ProjectFactory.getDefaultFileToOpen()
          },
          type: 'component',
          title: '',
          width: 80
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW
        },
        templateFn: _.template('<normal-editor-tab file="<%= url %>"></normal-editor-tab>'),
        automaticallyShareStackWith: [
          this.Constant.VIEW.GENERIC_IFRAME_VIEW,
          this.Constant.VIEW.GENERIC_ANGULAR_VIEW,
          this.Constant.VIEW.PLACEHOLDER_VIEW
        ]
      },
      compareEditor: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.COMPARE_EDITOR_VIEW,
          componentState: {
            originalFile: {
              projectId: null,
              path: null
            },
            modifiedFile: {
              projectId: null,
              path: null
            }
          },
          type: 'component',
          title: '',
          width: 80
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_COMPARE_EDITOR_VIEW
        },
        templateFn: _.template(`
          <compare-editor-tab
            original-file-project-id="<%= originalFile.projectId %>"
            original-file-path="<%= originalFile.path %>"
            modified-file-project-id="<%= modifiedFile.projectId %>"
            modified-file-path="<%= modifiedFile.path %>">
          </compare-editor-tab>
        `),
        automaticallyShareStackWith: [
          this.Constant.VIEW.GENERIC_IFRAME_VIEW,
          this.Constant.VIEW.GENERIC_ANGULAR_VIEW,
          this.Constant.VIEW.PLACEHOLDER_VIEW
        ]
      },
      debugger: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.DEBUGGER_VIEW,
          type: 'component',
          title: this.gettextCatalog.getString('Debugger'),
          height: 20,
          icon: 'debugger'
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_DEBUGGER_VIEW
        },
        templateUrl: 'debugger.html',
        automaticallyShareStackWith: [this.Constant.VIEW.TERMINAL_VIEW, this.Constant.VIEW.TRANSPILE_LOG_VIEW]
      },
      terminal: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.TERMINAL_VIEW,
          componentState: {
            id: 'terminal_' + Math.random().toString(36).substring(7),
            templateUrl: 'terminal.html'
          },
          type: 'component',
          title: this.gettextCatalog.getString('Terminal'),
          width: 20,
          icon: 'terminal'
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_TERMINAL_VIEW
        },
        templateUrl: 'terminal.html',
        automaticallyShareStackWith: [this.Constant.VIEW.DEBUGGER_VIEW, this.Constant.VIEW.TRANSPILE_LOG_VIEW]
      },
      transpile: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.TRANSPILE_LOG_VIEW,
          type: 'component',
          title: this.gettextCatalog.getString('Preview Log'),
          width: 20,
          icon: 'transpile',
          isClosable: false
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_TRANSPILE_LOG_VIEW
        },
        templateUrl: 'transpile_log.html',
        automaticallyShareStackWith: [this.Constant.VIEW.DEBUGGER_VIEW, this.Constant.VIEW.TERMINAL_VIEW]
      },
      previewer: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.PREVIEWER_VIEW,
          type: 'component',
          title: this.gettextCatalog.getString('Device Preview'),
          width: 16,
          componentState: {
            id: 1
          }
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_PREVIEWER_VIEW
        },
        templateFn: _.template('<device-previewer previewer-id="<%= id %>"></device-previewer>')
      },
      iframe: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.GENERIC_IFRAME_VIEW,
          type: 'component',
          title: '',
          width: 80
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_GENERIC_IFRAME_VIEW
        },
        templateFn: _.template('<iframe style="height: 100%; width: 100%;" src="<%= url %>"></iframe>'),
        automaticallyShareStackWith: [
          this.Constant.VIEW.NORMAL_EDITOR_VIEW,
          this.Constant.VIEW.GENERIC_ANGULAR_VIEW,
          this.Constant.VIEW.PLACEHOLDER_VIEW
        ]
      },
      genericAngular: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.GENERIC_ANGULAR_VIEW,
          type: 'component',
          title: '',
          width: 80
        },
        events: {
          toggle: this.Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW
        },
        automaticallyShareStackWith: [
          this.Constant.VIEW.NORMAL_EDITOR_VIEW,
          this.Constant.VIEW.GENERIC_IFRAME_VIEW,
          this.Constant.VIEW.PLACEHOLDER_VIEW
        ]
      },
      placeholder: {
        goldenLayoutConfig: {
          componentName: this.Constant.VIEW.PLACEHOLDER_VIEW,
          componentState: {
            isClosable: false
          },
          type: 'component'
        },
        templateFn: _.template('<div class="placeholder-view"></div>')
      }
    };

    // Define how the IDE layout should look on the very first load, and also set some
    // configuration options.
    let bottomStack = [];
    if (this.ProjectFactory.hasDebuggerService() && this.GlobalEditorConfig.showDebuggerPanel()) bottomStack.push(this.COMPONENTS_CONFIG.debugger.goldenLayoutConfig);
    if (this.ProjectFactory.isTranspileLogEnabled()) bottomStack.push(this.COMPONENTS_CONFIG.transpile.goldenLayoutConfig);
    // add terminal tab to the bottom stack if it is generic project
    if (this.ProjectFactory.isGenericProject() && this.CommonFunctionService.isTerminalService()) bottomStack.push(this.COMPONENTS_CONFIG.terminal.goldenLayoutConfig);
    let editorStack = {
      type: 'column',
      content: [
        {
          type: 'stack',
          activeItemIndex: 0,
          content: [
            this.COMPONENTS_CONFIG.placeholder.goldenLayoutConfig
          ]
        }
      ]
    };
    // open the default file if it's cordova project
    if (this.ProjectFactory.isCordovaProject()) {
      editorStack.content[0].content.push(this.COMPONENTS_CONFIG.editor.goldenLayoutConfig);
      editorStack.content[0].activeItemIndex = 1;
    }
    if (bottomStack && bottomStack.length >= 1) {
      editorStack.content.push({
        type: 'stack',
        content: bottomStack
      });
    }
    this.DEFAULT_LAYOUT_CONFIG = {
      content: [{
        type: 'row',
        content: [
          this.COMPONENTS_CONFIG.project.goldenLayoutConfig,
          editorStack
        ]
      }],
      dimensions: {
        borderWidth: 2,
        headerHeight: 30,
        minItemWidth: 175,
        minItemHeight: 100
      },
      settings: {
        showPopoutIcon: false,
        // hides the close button on groups, but not individual tabs
        showCloseIcon: false,
        // tabControlOffset is used by GoldenLayout as part of its calculations to figure out
        // when to show the tab overflow menu. The default value is 10. We add 30 to account
        // for the "add tab" button which we have added.
        tabControlOffset: 40,
        reorderOnTabMenuClick: false
      }
    };
    if (this.ProjectFactory.hasPreviewerService()) this.DEFAULT_LAYOUT_CONFIG.content[0].content.push(this.COMPONENTS_CONFIG.previewer.goldenLayoutConfig);
  }

  init (element) {
    const goldenLayoutElement = angular.element(element[0].querySelector('.golden-layout-container'));
    this.layoutManager = window.layoutManager = new GoldenLayout(this.getSavedConfig(), goldenLayoutElement);
    this.registerComponents(this.COMPONENTS_CONFIG);
    this.addComponentEventListeners(this.COMPONENTS_CONFIG);
    this.layoutManager.on('activeContentItemChanged', (contentItem) => {
      if (contentItem.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || contentItem.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW) {
        this.PubSub.publish(this.Constant.EVENT.FOCUS_EDITOR, contentItem);
      }
    });
    this.layoutManager.on('stateChanged', () => this.saveLayoutConfig());

    // Update Build Flag Event
    this.PubSub.subscribe(this.Constant.EVENT.UPDATE_BUILD_FLAGE, () => {
      this.closeEditorView('build.json');
    });

    // Initialise the layout once the rest of the IDE is ready
    this.PubSub.subscribe(this.Constant.EVENT.IDE_READY, () => {
      try {
        this.layoutManager.init();
        if (this.ProjectFactory.isTranspileLogEnabled()) {
          let transpileComponent = this.getComponentInstanceById(this.getComponentId(this.Constant.VIEW.TRANSPILE_LOG_VIEW));
          if (!transpileComponent) {
            // create transpile tab if it is missing
            this.createComponent(this.Constant.VIEW.TRANSPILE_LOG_VIEW);
          }
        }
        this._setProjectViewHeaderVisibility();
      } catch (e) {
        const errorMessage = this.gettextCatalog.getString('Some modules are not loaded properly. Please refresh the browser.');
        console.error(e);
        console.log(errorMessage);
        this.PubSub.publish(this.Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: errorMessage
        });
      } finally {
        this.PubSub.publish(this.Constant.EVENT.LAYOUT_READY);
        this._isLayoutReady = true;
      }
    });

    // Though GoldenLayout should automatically resize with the window, it does not, so
    // we need to add our own listener here.
    window.addEventListener('resize', this.layoutManager._resizeFunction);
  }

  // get layout_ready flag
  isLayoutReady () {
    return this._isLayoutReady;
  }

  getAllTabs () {
    var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    if (!storedContentConfig || !storedContentConfig.content) return;
    return this._getAllContentItems(storedContentConfig.content)
      .filter(item => item.type === 'component' && item.title && (item.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || item.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW || item.componentName === 'previewer-view' || item.componentName === 'terminal-view'));
  }

  // Maybe it is not the best way to close the tabs, but if we want to add Close All and
  // Close Other Tabs I cannot think in another way to do that.

  // Close all tabs (from all windows)
  closeAllTabs () {
    var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    if (!storedContentConfig || !storedContentConfig.content) {
      return;
    }
    this._getAllContentItems(storedContentConfig.content)
      .filter(item => item.type === 'component' && item.title && (item.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || item.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW || item.componentName === 'previewer-view' || item.componentName === 'terminal-view' || item.componentName === 'generic-angular-view'))
      .forEach(item => {
        var componentID = this.getComponentId(item.componentName, item.componentState);
        this.closeComponent(componentID, false);
      });
  }

  // close editor view
  closeEditorView (title) {
    try {
      if (!title) return;
      var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
      if (!storedContentConfig || !storedContentConfig.content) return;
      this._getAllContentItems(storedContentConfig.content)
        .filter(item => item.type === 'component' && (item.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || item.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW) && item.title === title)
        .forEach(item => {
          var componentID = this.getComponentId(item.componentName, item.componentState);
          this.closeComponent(componentID, false);
        });
    } catch (error) {
      console.error(error);
      console.log(`could not close "${title}" tab. please close it manually.`);
    }
  }

  // Close all previewer tabs
  closeAllPreviewerTabs () {
    var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    if (!storedContentConfig || !storedContentConfig.content) return;
    this._getAllContentItems(storedContentConfig.content)
      .filter(item => item.type === 'component' && item.title && (item.componentName === this.Constant.VIEW.PREVIEWER_VIEW))
      .forEach(item => {
        var componentID = this.getComponentId(item.componentName, item.componentState);
        this.closeComponent(componentID, false);
      });
  }

  // Close all previewer and terminal tabs
  closeAllPreviewerAndTerminalTabs () {
    var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    if (!storedContentConfig || !storedContentConfig.content) return;
    this._getAllContentItems(storedContentConfig.content)
      .filter(item => item.type === 'component' && item.title && (item.componentName === this.Constant.VIEW.PREVIEWER_VIEW || item.componentName === this.Constant.VIEW.TERMINAL_VIEW))
      .forEach(item => {
        var componentID = this.getComponentId(item.componentName, item.componentState);
        this.closeComponent(componentID, false);
      });
  }

  // Close all terminal tabs
  closeAllTerminalTabs () {
    var storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    if (!storedContentConfig || !storedContentConfig.content) return;
    this._getAllContentItems(storedContentConfig.content)
      .filter(item => item.type === 'component' && item.title && item.componentName === this.Constant.VIEW.TERMINAL_VIEW)
      .forEach(item => {
        var componentID = this.getComponentId(item.componentName, item.componentState);
        this.closeComponent(componentID, false);
      });
  }

  /**
   * Finds all hidden tabs in a tabBar
   * @param {*} tabBar tabBar to search in
   */
  getHiddenItems (tabBar) {
    var hiddenItems = [];
    var stackElement = this.layoutManager.root.getItemsByType('stack').find(stack => stack.element.get(0) === $(tabBar).parents('.lm_stack').get(0));
    stackElement.contentItems
      .forEach(item => {
        // if a tab's parent has lm_tabdropdown_list class then the tab is hidden
        if (item.tab.element[0].parentElement.className === 'lm_tabdropdown_list') {
          hiddenItems.push({
            title: item.config.title,
            componentState: item.config.componentState,
            icon: item.tab.element[0].getAttribute('icon')
          });
        }
      });
    return hiddenItems;
  }

  // Close all tabs in a window
  closeAllTabsWindow (tabBar) {
    var stackElement = this.layoutManager.root.getItemsByType('stack').find(stack => stack.element.get(0) === $(tabBar).parents('.lm_stack').get(0));

    this.closeTabsInStack(stackElement, 'all');
  }

  // Close other tabs in a window
  closeOtherTabsWindow (tabBar) {
    var stackElement = this.layoutManager.root.getItemsByType('stack').find(stack => stack.element.get(0) === $(tabBar).parents('.lm_stack').get(0));

    this.closeTabsInStack(stackElement, 'other');
  }

  /**
   * Closes tabs in a stack. Mode tells which tabs should be closed.
   *
   * @param {lm.items.Stack} stackElement stack to close tabs on
   * @param {String} mode 'active' - close active tab. 'other' - close all, but this tab. 'all' - close all tabs
   */
  closeTabsInStack (stackElement, mode) {
    stackElement.contentItems
      .filter(item => item.config.type === 'component' && item.config.title && (item.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || item.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW || item.componentName === 'previewer-view' || item.componentName === 'terminal-view' || item.componentName === 'debugger-view' || item.componentName === 'generic-angular-view'))
      .forEach(item => {
        var componentID = this.getComponentId(item.componentName, item.config.componentState);
        var component = this.getComponentInstanceById(componentID);
        var stack = component.parent;
        if (mode === 'other' && stack.getActiveContentItem() !== component) {
          this.closeComponent(componentID, false);
        } else if (mode === 'active' && stack.getActiveContentItem() === component) {
          var index = stackElement.contentItems.indexOf(component);
          this.closeComponent(componentID, false);
          // there is a placeholder item at index 0, so if the first tab is closed then the placeholder will be selected, not the next editor-view
          // this selects the next (the one at the new index 1) editor-view manually
          if (index === 1 && stackElement.contentItems.length > 1) {
            setTimeout(() => this.selectTabInStackByIndex(stackElement, 1));
          }
        } else if (mode === 'all') {
          this.closeComponent(componentID, false);
        }
      });
  }

  /**
   * Selects the previous tab in a stack.
   *
   * @param {lm.items.Stack} stackElement stack to use
   */
  selectPreviousTabInStack (stackElement) {
    var component = stackElement.getActiveContentItem();
    var previousIndex = stackElement.contentItems.indexOf(component) - 1;
    if (previousIndex < 0) {
      return;
    }

    this.selectTabInStackByIndex(stackElement, previousIndex);
  }

  /**
   * Selects the next tab in a stack.
   *
   * @param {lm.items.Stack} stackElement stack to use
   */
  selectNextTabInStack (stackElement) {
    var component = stackElement.getActiveContentItem();
    var nextIndex = stackElement.contentItems.indexOf(component) + 1;
    if (nextIndex >= stackElement.contentItems.length) {
      return;
    }

    this.selectTabInStackByIndex(stackElement, nextIndex);
  }

  /**
   * Selects a tab in a stack by index.
   *
   * @param {lm.items.Stack} stackElement stack to use
   * @param {Number} index the index of the tab to select
   */
  selectTabInStackByIndex (stackElement, index) {
    var item = stackElement.contentItems[index];
    if (item.config.type === 'component' && item.config.title && (item.componentName === this.Constant.VIEW.NORMAL_EDITOR_VIEW || item.componentName === this.Constant.VIEW.COMPARE_EDITOR_VIEW || item.componentName === 'previewer-view' || item.componentName === 'terminal-view' || item.componentName === 'debugger-view')) {
      var componentID = this.getComponentId(item.componentName, item.config.componentState);
      this.focusExistingComponent(componentID);
    }
  }

  // By default, the only way to reference GoldenLayout components is by their name. However,
  // this doesn't work because sometimes we have multiple instances of the same component (for
  // example, multiple editor components). So we create our own unique ID based on both the
  // component name and its state. Whenever you want to reference a component, do it via this
  // function.
  getComponentId (componentName, componentState) {
    let componentId;

    if (componentState && componentState.id) {
      componentId = componentState.id;
    } else if (componentState && componentState.url) {
      componentId = this.FileUtilityFactory.getDomSafeId(componentState.url);
    } else if (componentState && componentState.originalFile && componentState.modifiedFile) {
      componentId = this.FileUtilityFactory.getDomSafeId(`${componentState.originalFile.projectId}${componentState.originalFile.path}`);
    } else {
      componentId = componentName;
    }

    return this.COMPONENT_ID_PREFIX + componentId;
  }

  getComponentConfig (componentName) {
    return _.find(this.COMPONENTS_CONFIG, component => component.goldenLayoutConfig.componentName === componentName);
  }

  getSavedConfig () {
    let storedContentConfig;
    let hasTranspile = false;
    let hasTerminal = false;
    let hasPreviewer = false;
    let hasDebugger = false;
    try {
      storedContentConfig = JSON.parse(localStorage.getItem(this.LOCALSTORAGE_KEY));
    } catch (e) {}

    if (storedContentConfig) {
      // If the user switches language, the title will not change, as it is saved in
      // their config. So, we loop through the titles here to ensure that they get
      // translated.
      this._getAllContentItems(storedContentConfig.content)
        .filter(item => item.type === 'component' && item.title)
        .forEach(item => {
          const defaultComponentConfig = _.find(this.COMPONENTS_CONFIG, c => c.goldenLayoutConfig.componentName === item.componentName);
          if (!hasTranspile && item.componentName === this.Constant.VIEW.TRANSPILE_LOG_VIEW) hasTranspile = true;
          if (!hasTerminal && item.componentName === this.Constant.VIEW.TERMINAL_VIEW) hasTerminal = true;
          if (!hasPreviewer && item.componentName === this.Constant.VIEW.PREVIEWER_VIEW) hasPreviewer = true;
          if (!hasDebugger && item.componentName === this.Constant.VIEW.DEBUGGER_VIEW) hasDebugger = true;
          if (defaultComponentConfig && defaultComponentConfig.goldenLayoutConfig.title) {
            item.title = defaultComponentConfig.goldenLayoutConfig.title;
          }
        });

      // return default layout if transpile/terminal/previewer/debugger service is disabled but it has transpile/terminal/previewer/debugger tab (due to existing local storage)
      if (!this.ProjectFactory.isTranspileLogEnabled() && hasTranspile) return this.DEFAULT_LAYOUT_CONFIG;
      if (!this.CommonFunctionService.isTerminalService() && hasTerminal) return this.DEFAULT_LAYOUT_CONFIG;
      if (!this.ProjectFactory.hasPreviewerService() && hasPreviewer) return this.DEFAULT_LAYOUT_CONFIG;
      if ((!this.ProjectFactory.hasDebuggerService() || !this.GlobalEditorConfig.showDebuggerPanel()) && hasDebugger) return this.DEFAULT_LAYOUT_CONFIG;

      return angular.extend({}, this.DEFAULT_LAYOUT_CONFIG, storedContentConfig);
    } else {
      return this.DEFAULT_LAYOUT_CONFIG;
    }
  }

  // stateChanged can fire a lot, so the GoldenLayout docs suggest debouncing the save function
  saveLayoutConfig () {
    // Trying to save when the layout is not initialised will cause GoldenLayout to
    // throw an error. If it is not initialised, we will try again in 1s.
    if (!this.allLayoutsInitialised(this.layoutManager)) {
      setTimeout(this.saveLayoutConfig, 1000);
      return;
    }

    const currentConfig = this.layoutManager.toConfig();

    // The config object also includes things like border dimensions and whether certain
    // tabs are closable. These should not be user changeable settings, so we don't want
    // to save them to localStorage. All we need is `content`, which contains their layout.
    const configToSave = { content: currentConfig.content };
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(configToSave));
  }

  getComponentCloseButton (componentId, isPrefix) {
    /*
     * Since componentId's are hyphen delimiated, we should append a trailing hypen to the componentId.
     * This will minimize closing simular folder and filename.
     */
    componentId += isPrefix ? '-' : '';

    const prefixFlag = isPrefix ? '^' : '';
    const selector = `.lm_tab[target-id${prefixFlag}=${componentId}] .lm_close_tab`;
    return this.layoutManager.container.find(selector);
  }

  closeComponent (componentId, isPrefix) {
    let toClose = this.getComponentCloseButton(componentId, isPrefix);

    if (isPrefix) {
      toClose.each((i, btn) => btn.click());
    } else {
      toClose.click();
    }
  }

  // Register our component configurations with GoldenLayout so it knows how to create them
  registerComponents (components) {
    // GoldenLayout calls the function passed to registerComponent with new, so 'this'
    // can never be GoldenLayoutService, no matter how we bind it. So we cache it here.
    const _this = this;

    _.each(components, (componentConfig) => {
      // Do not change this function to () =>, it will break its constructor
      this.layoutManager.registerComponent(componentConfig.goldenLayoutConfig.componentName, function (container, componentState) {
        _this._registerComponent(container, componentState);
      });
    });
  }

  // This function is called by GoldenLayout when it is about to put the component into
  // the page.
  _registerComponent (container, componentState) {
    const componentId = this.getComponentId(componentState.componentName, componentState);
    const componentConfig = this.getComponentConfig(componentState.componentName);
    const containerEl = container.getElement();

    // Add some attributes to the element so we can reference it easily in the DOM
    containerEl.attr('component-name', componentState.componentName);
    containerEl.attr('id', this.getComponentId(componentConfig.goldenLayoutConfig.componentName, componentState));

    if (componentConfig.templateFn) {
      containerEl.html(this.$compile(componentConfig.templateFn(componentState))(this.$rootScope));
    } else if (componentState.templateUrl) {
      containerEl.html(this.$compile(this.$templateCache.get(componentState.templateUrl))(this.$rootScope));
    } else {
      containerEl.html(this.$compile(this.$templateCache.get(componentConfig.templateUrl))(this.$rootScope));
    }

    // Bind the component's events to our PubSub events so they are easily accessed
    // elsewhere in the codebase.
    const eventOpts = {
      componentName: componentState.componentName,
      componentId
    };

    container.on('open', () => this.PubSub.publish(this.Constant.EVENT.VIEW_OPENED, eventOpts));
    container.on('show', () => {
      // show close button
      if (container.tab.contentItem.config.isClosable) {
        container.tab.closeElement.fadeTo(1, 1);
      }

      this.PubSub.publish(this.Constant.EVENT.VIEW_SHOWN, Object.assign(eventOpts, {
        containerWidth: container.width,
        containerHeight: container.height
      }));
    });
    container.on('hide', () => {
      // hide close button
      if (container.tab.contentItem.config.isClosable) {
        container.tab.closeElement.fadeTo(1, 0);
      }

      this.PubSub.publish(this.Constant.EVENT.VIEW_HIDE, eventOpts);
    });
    container.on('resize', () => {
      this.PubSub.publish(this.Constant.EVENT.VIEW_RESIZE, Object.assign(eventOpts, {
        containerWidth: container.width,
        containerHeight: container.height
      }));
    });
    container.on('destroy', () => {
      this._onContainerDestroy(eventOpts);
      this.PubSub.publish(this.Constant.EVENT.VIEW_CLOSED, eventOpts);
    });
  }

  // By default, GoldenLayout does not allow for tabs to be closed without them being active.
  // This causes issues when we close an inactive tab, as GoldenLayout then stores an
  // incorrect reference to the active tab. On reload this can cause a fatal error if it tries
  // to reference a non-existent tab. So, when a tab is closed, we re-set the active tab just to
  // ensure that everything is in order.
  _onContainerDestroy (opts) {
    const component = this.getComponentInstanceById(opts.componentId);
    const stack = component.parent;

    // Destroy angular controller
    let scopeElment = component.element.find('[ng-controller]');
    if (scopeElment.length > 0) angular.element(scopeElment).scope().$destroy();

    if (stack && stack.contentItems && stack.contentItems.length > 1) {
      // The destroy event is fired right before the item is removed, but we only want to
      // run this afterwards. Wrapping it in a 0ms setTimeout ensures it gets put to the
      // end of the event cycle.
      setTimeout(() => stack.setActiveContentItem(stack.getActiveContentItem()));
    }
  }

  addComponentEventListeners (components) {
    _.each(components, (currentComponent) => {
      if (!currentComponent.events || !currentComponent.events.toggle) return;

      // Listen for open and close events from coming across the IDE. This allows us to
      // control the GoldenLayout tabs from any part of the codebase. Very useful!
      this.PubSub.subscribe(currentComponent.events.toggle, (opts = {}) => {
        const componentId = this.getComponentId(currentComponent.goldenLayoutConfig.componentName, opts.componentState);
        const componentAlreadyExists = this.componentAlreadyExists(componentId, false);

        if (componentAlreadyExists && opts.open !== true) {
          this.closeComponent(componentId, false);
        } else if (componentAlreadyExists && opts.open === true) {
          this.focusExistingComponent(componentId);

          // Currently only used in the Build Panel - this selects the relevant page
          // within the Build Panel iframe.
          if (currentComponent.goldenLayoutConfig.componentName === this.Constant.VIEW.GENERIC_IFRAME_VIEW && opts.componentState.page) {
            this.postIframeMessage(componentId, opts.componentState.page);
          }
        } else if (!componentAlreadyExists && opts.isDir) {
          if (this.componentAlreadyExists(componentId, true)) {
            this.closeComponent(componentId, true);
          }
        } else if (!componentAlreadyExists && opts.open !== false) {
          this.createComponent(
            currentComponent.goldenLayoutConfig.componentName,
            opts.componentState,
            this._findStackFromChildElement(opts.tabBar)
          );
        }
      });
    });

    // GoldenLayout does not provide a simple way of finding the tab which controls a
    // particular component after this point. So we take the opportunity here to add
    // an attribute to the tab element which contains the componentId of the component
    // which it controls.
    this.layoutManager.on('tabCreated', (tab) => {
      // remove tabDropdownButton if it exists (items in tabDropDown will show in tabCloseDropdown instead)
      if (tab.header.tabDropdownButton && tab.header.tabDropdownButton.element && tab.header.tabDropdownButton.element[0] && tab.header.tabDropdownButton.element[0].parentElement) {
        tab.header.tabDropdownButton.element[0].parentElement.removeChild(tab.header.tabDropdownButton.element[0]);
      }
      tab.element.attr('target-id', this.getComponentId(tab.contentItem.componentName, tab.contentItem.config.componentState));

      let title;
      let icon;
      if (tab.contentItem.config.componentState) {
        if (tab.contentItem.config.componentState.title) {
          title = tab.contentItem.config.componentState.title;
        } else if (tab.contentItem.config.componentState.url) {
          // normalEditorTab
          title = this.FileUtilityFactory.getFileName(tab.contentItem.config.componentState.url);
          icon = this.FileUtilityFactory.getExtName(tab.contentItem.config.componentState.url);
        } else if (tab.contentItem.config.componentState.originalFile && tab.contentItem.config.componentState.modifiedFile) {
          // compareEditorTab
          title = `(${this.gettextCatalog.getString('Example Answer')}) ↔︎ ${this.FileUtilityFactory.getFileName(tab.contentItem.config.componentState.modifiedFile.path)}`;
          icon = this.FileUtilityFactory.getExtName(tab.contentItem.config.componentState.modifiedFile.path);
        }
      }

      if (title) tab.contentItem.setTitle(title);

      icon = icon || (tab.contentItem.config.componentState && tab.contentItem.config.componentState.icon ? tab.contentItem.config.componentState.icon : tab.contentItem.config.icon);
      if (icon) tab.element.attr('icon', icon);

      // The only way to intercept a pre-close event is to replace the original _onCloseClick method.
      // GoldenLayout unfortunately does not have a "beforeclose" event we can listen to.
      const self = this;
      const newCloseClickHandler = function (event) { // arrow function must not be used
        event.stopPropagation();

        if (this.contentItem.componentName === self.Constant.VIEW.NORMAL_EDITOR_VIEW || this.contentItem.componentName === self.Constant.VIEW.COMPARE_EDITOR_VIEW) {
          if (!this.element.hasClass('unsaved') ||
          window.confirm(self.gettextCatalog.getString('You have unsaved changes. Are you sure you want to close this file?'))) {
            // Fire MODEL_DISCARDED event
            let opts;
            if (this.contentItem.componentName === self.Constant.VIEW.NORMAL_EDITOR_VIEW) {
              opts = {
                componentId: self.getComponentId(this.contentItem.componentName, this.contentItem.config.componentState),
                projectId: window.config.projectId,
                path: this.contentItem.config.componentState.url
              };
            } else if (this.contentItem.componentName === self.Constant.VIEW.COMPARE_EDITOR_VIEW) {
              opts = {
                componentId: self.getComponentId(this.contentItem.componentName, this.contentItem.config.componentState),
                projectId: this.contentItem.config.componentState.modifiedFile.projectId,
                path: this.contentItem.config.componentState.modifiedFile.path
              };
            }
            self.PubSub.publish(self.Constant.EVENT.MODEL_DISCARDED, opts);
          } else {
            return;
          }
        }
        this.contentItem.remove();
      };
      Object.getPrototypeOf(tab)._onCloseClick = newCloseClickHandler;
      tab._onCloseClickFn = newCloseClickHandler.bind(tab);

      // Disable the close button for certain tabs
      if (tab.contentItem.config.isClosable === false) {
        tab.element.addClass('not-closable');
      }

      setTimeout(() => {
        // hide close button by default for none active tabs
        if (!tab.isActive) tab.closeElement.fadeTo(1, 0);
        // show close button when hover
        if (tab.contentItem.config.isClosable) {
          tab.element.hover(() => {
            tab.closeElement.fadeTo(1, 1);
          }, () => {
            if (!tab.isActive) tab.closeElement.fadeTo(1, 0);
          });
        }
      });

      // setTimeout to ensure the tab has been dropped and is part of the stack now
      setTimeout(() => this._setProjectViewHeaderVisibility());

      this.PubSub.publish(this.Constant.EVENT.TAB_CREATED, tab);
    });

    // When the user changes the device in the Device Preview, this event is triggered.
    // We use it to set the title and icon of the Device Preview tab.
    this.PubSub.subscribe(this.Constant.EVENT.PREVIEWER_VIEW_DEVICE_CHANGED, (opts) => {
      this.setComponentTitle(
        opts.componentId,
        opts.device.name,
        `${opts.device.platform.toLowerCase()}-muted`
      );
    });

    this.PubSub.subscribe(this.Constant.EVENT.CLOSE_A_VIEW, (componentId) => {
      if (componentId) this.closeComponent(componentId, false);
    });

    this.layoutManager.on('stackCreated', (stack) => {
      // The stackCreated event fires before the component has been added to it. Wrapped
      // in a 0ms setTimeout puts it at the end of the event loop, when the component
      // will then be in the stack.
      setTimeout(() => {
        if (this._isAloneProjectViewStack(stack)) {
          this._disableDropOnStack(stack);
        }
      });

      this.PubSub.publish(this.Constant.EVENT.GL_STACK_CREATED, {stack});
    });
  }

  componentAlreadyExists (componentId, isPrefix) {
    return this.getComponentCloseButton(componentId, isPrefix).length > 0;
  }

  _findStackFromChildElement (element) {
    const stackElement = $(element).parents('.lm_stack').get(0);
    if (!stackElement) return;
    return this.layoutManager.root.getItemsByType('stack').find(stack => stack.element.get(0) === stackElement);
  }

  createComponent (componentName, componentState, destinationStack) {
    const componentToCreate = this.getComponentConfig(componentName);
    const config = angular.extend({}, componentToCreate.goldenLayoutConfig, { componentState: componentState });

    // Adding components directly to the root can cause blank tabs to be
    // created. So, we always make sure there is a child we can use.
    if (!this.layoutManager.root.contentItems.length) {
      this.layoutManager.root.addChild({type: 'row'});
    }

    const whereToAdd = destinationStack || this._findExistingStackForComponent(componentName) || this.layoutManager.root.contentItems[0];
    whereToAdd.addChild(config);
  }

  _findExistingStackForComponent (componentName) {
    const fullConfig = this.getComponentConfig(componentName);

    return this.layoutManager.root.getItemsByType('stack').find(stack => {
      return stack.contentItems.find(stackChild => {
        return stackChild.config.componentName === componentName ||
          (fullConfig.automaticallyShareStackWith && fullConfig.automaticallyShareStackWith.includes(stackChild.config.componentName));
      });
    });
  }

  // This doesn't look very nice, but it is the recommended way of doing this. See:
  // https://github.com/WolframHempel/golden-layout/issues/299
  focusExistingComponent (componentId) {
    const component = this.getComponentInstanceById(componentId);
    component.parent.setActiveContentItem(component);
  }

  getComponentInstanceById (componentId) {
    return this.layoutManager.root.getItemsByType('component').find(item => {
      return this.getComponentId(item.config.componentName, item.config.componentState) === componentId;
    });
  }

  postIframeMessage (componentId, message) {
    console.log(message);
    const iframe = this.layoutManager.container.find(`#${componentId} iframe`);
    iframe[0].contentWindow.postMessage(message, '*');
  }

  isInitialised () {
    return this.layoutManager ? this.layoutManager.isInitialised : false;
  }

  allLayoutsInitialised () {
    return this.layoutManager.isInitialised &&
      _.every(this.layoutManager.openPopouts, popout => popout.isInitialised);
  }

  resetLayout () {
    localStorage.removeItem(this.LOCALSTORAGE_KEY);
    setTimeout(() => location.reload(), 500);
  }

  areViewsOpen () {
    return !!(this.layoutManager &&
      this.layoutManager.root &&
      this.layoutManager.root.contentItems &&
      this.layoutManager.root.contentItems.length > 0);
  }

  areThereUncleanComponents () {
    return document.querySelectorAll('li.lm_tab.unsaved').length >= 1;
  }

  areThereDeletedComponents () {
    return document.querySelectorAll('li.lm_tab.deleted').length >= 1;
  }

  hasUncleanComponents () {
    return document.querySelectorAll('li.lm_tab.unsaved').length;
  }

  // Marks a view as clean / unclean. Its main purpose is to put a * next to unsaved
  // editor tabs, but technically it can be used for any tab.
  setComponentCleanState (componentId, editorState) {
    this._getTabElement(componentId).toggleClass('unsaved', !editorState.isClean);
    this._getTabElement(componentId).toggleClass('deleted', editorState.isDeleted);
    this.PubSub.publish(this.Constant.EVENT.UPDATE_TAB_CLEAN_STATE, {
      id: componentId,
      isClean: editorState.isClean,
      isDeleted: editorState.isDeleted,
      canUndo: editorState.canUndo,
      canRedo: editorState.canRedo,
      isAnyUnsaved: this.areThereUncleanComponents(),
      isAnyDeleted: this.areThereDeletedComponents()
    });
  }

  getComponentCleanState (componentId, isClean) {
    return this._getTabElement(componentId).hasClass('unsaved');
  }

  setComponentTitle (componentId, title, icon) {
    const component = this.getComponentInstanceById(componentId);

    // The component does not exist in the hierarchy if it is being dragged
    if (!component) return;

    component.setTitle(title);

    if (icon) {
      const tab = this._getTabElement(componentId);
      tab.attr('icon', icon);
      component.container.extendState({icon});
    }
  }

  _getTabElement (componentId) {
    // We specifically use $ instead of this.layoutManager.container.find here, because
    // when the tab is being dragged, it is not inside the container.
    return $(`.lm_tab[target-id=${componentId}]`);
  }

  _isAloneProjectViewStack (stack) {
    return !!(stack && stack.contentItems.length === 1 &&
      stack.contentItems[0].componentName === this.Constant.VIEW.PROJECT_VIEW);
  }

  // Partially based on http://golden-layout.com/examples/#30979a043f34750045dbe57aba4b1ee5
  _disableDropOnStack (stack) {
    // GoldenLayout calculates where it should be able to drop an item by asking each
    // stack to return its coordinates. By overriding this function, we can essentially
    // pretend that this stack doesn't exist for the purposes of being dropped on.
    const originalGetAreaFn = stack._$getArea;

    stack._$getArea = function () {
      // Return off-screen co-ordinates with a size of 0 so that nothing can be dropped
      // on the this stack.
      let area = originalGetAreaFn.call(stack);
      Object.assign(area, { x1: -100, x2: -100, y1: -100, y2: -100, surface: 0 });

      // Remove the header dimensions so that no tab can be dropped in the same tab bar
      Object.defineProperty(stack._contentAreaDimensions, 'header', {value: {}, enumerable: false});

      return area;
    };
  }

  _setProjectViewHeaderVisibility () {
    const projectView = this.getComponentInstanceById(this.getComponentId(this.Constant.VIEW.PROJECT_VIEW));
    const stack = projectView.parent;
    const isLeftmostStack = stack.parent.contentItems.indexOf(stack) === 0;
    const isAloneProjectViewStack = this._isAloneProjectViewStack(stack);
    const shouldHideHeader = isLeftmostStack && isAloneProjectViewStack;

    stack.element
      .toggleClass('project-view-stack', isAloneProjectViewStack)
      .toggleClass('hide-header', shouldHideHeader);
  }

  _getAllContentItems (content) {
    let allContentItems = [];

    let addChildren = function (contentItem) {
      allContentItems.push(contentItem);

      if (contentItem.content instanceof Array) {
        for (let i = 0; i < contentItem.content.length; i++) {
          addChildren(contentItem.content[ i ]);
        }
      }
    };

    addChildren(content[0]);

    return allContentItems;
  }
}

GoldenLayoutService.$inject = ['$compile', '$rootScope', '$templateCache', 'Constant', 'ProjectFactory', 'FileUtilityFactory', 'PubSub', 'gettextCatalog', 'CommonFunctionService', 'GlobalEditorConfig'];

angular.module('monacaIDE').service('GoldenLayoutService', GoldenLayoutService);

;angular.module('monacaIDE').service('InAppUpdaterService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.InAppUpdater;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body.result)) {
      response.body.result = JSON.parse(response.body.result);
    }
    return response.body.result;
  }

  return {
    getRemotePackgeList: function (param) {
      return $q.when(Api.packageList(project_id)).then(function (resp) {
        return formatResponse(resp);
      });
    }
  };
}]);

;angular.module('monacaIDE').service('OneTimePassApiService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.User;

  return {
    generate: function () {
      return $q.when(Api.generateOneTimePass()).then(function (resp) {
        return resp.body;
      });
    },

    load: function () {
      return $q.when(Api.loadOneTimePass()).then(function (resp) {
        return resp.body;
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

;
angular.module('monacaIDE').service('PublishApiService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Project;
  var project_id = window.config.projectId;

  return {

    /**
    * Checks if the project is published, if so returns the id of the publish entry
    * @return {Promise}
    */
    isPublished: function () {
      return $q.when(Api.isPublished(project_id)).then(function (resp) {
        return resp.body.result;
      });
    },

    /**
    * Publish the project or make it private
    * @return {Promise} returns the publish entry id or null if is made public
    */
    togglePublish: function () {
      return $q.when(Api.togglePublish(project_id)).then(function (resp) {
        return resp.body.result;
      });
    }
  };
}]);

;angular.module('monacaIDE').service('ServiceIntegrationService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.ServiceIntegration;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    /**
     * Get a collection of Integration Services for project by project id.
     *
     * @return {Promise}
     */
    list: function () {
      return $q.when(Api.list(project_id)).then(
        formatResponse.bind(this)
      );
    }
  };

  // var components = [];
  // var progress = {total: 0, complete: 0};
  //
  // /**
  //  * run loop
  //  * @param  {function} progressCallback
  //  * @param {Deferred} dfd for recursive
  //  * @return {Deffered}
  //  */
  // function run(progressCallback, dfd) {
  //   if (typeof dfd === "undefined") dfd = $q.defer();
  //
  //   install(components.shift())
  //   .then(function(name){
  //     progress.complete++;
  //
  //     progressCallback(name, progress.complete / progress.total);
  //
  //     if (!components.length) {
  //       dfd.resolve();
  //       return;
  //     }
  //
  //     run(progressCallback, dfd);
  //   }).catch(function(error) {
  //     dfd.reject(error);
  //   })
  //
  //   return dfd.promise;
  // }
  //
  // /**
  //  * intall bower components or cordova plugins
  //  * @param  {Object} component
  //  * @return {Deffered}
  //  */
  // function install(component) {
  //   var dfd = $q.defer();
  //
  //   switch (component.type) {
  //     case "html5":
  //     Forte.API.installHtml5Plugin(component.name, component.version, function() {
  //       dfd.resolve(component.name);
  //     }, function(code, message) {
  //       dfd.reject({name: component.name, code: code, message: message});
  //     });
  //     break;
  //     case "cordovaId":
  //     Forte.API.enableCordovaPlugin(component.name, function() {
  //       dfd.resolve(component.name);
  //     }, function(code, message) {
  //       dfd.reject({name: component.name, code: code, message: message});
  //     });
  //     break;
  //     default:
  //     break;
  //   }
  //
  //   return dfd.promise;
  // }
  //
  // return {
  //   /**
  //    * setup the service
  //    * @param  {Object} service
  //    * @param  {function} progressCallback Called periodically when each components're installed
  //    * @return {Deffered}
  //    */
  //   setup: function(service, progressCallback) {
  //     if (typeof progressCallback === "undefined") progressCallback = function() {};
  //
  //     components = [];
  //
  //     var bowerList = service.integration_data.bower_components
  //     var cordovaList = service.integration_data.match_cordova_plugins;
  //
  //     if (cordovaList && cordovaList.length) {
  //       cordovaList.forEach(function(plugin) {
  //         components.push({
  //           type: "cordovaId",
  //           name: plugin.url
  //         });
  //       });
  //     }
  //
  //     if (bowerList && bowerList.length) {
  //       bowerList.forEach(function(component) {
  //         components.push({
  //           type: "html5",
  //           name: component.name,
  //           version: component.version
  //         })
  //       });
  //     }
  //
  //     progress = {total: components.length, complete: 0};
  //
  //     return run(progressCallback);
  //   },
  //
  //   /**
  //    * abort the process
  //    */
  //   abort: function() {
  //     components = [];
  //   }
  // };
}]);

;angular.module('monacaIDE').service('ShareApiService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Project;
  var project_id = window.config.projectId;

  return {
    ROLE_DEVELOPER: 'developer',
    ROLE_TESTER: 'tester',

    /**
     * Fetch list of users
     *
     * @return {Promise} returns Object
     */
    getSharedUsers: function () {
      return $q.when(Api.getSharedUsers(project_id)).then(function (resp) {
        return resp;
      });
    },

    /**
     * Share project to the user
     *
     * @param {String[] | String} emails
     * @param {String} role ROLE_DEVELOPER, ROLE_TESTER
     * @param {Boolean} isNotify
     * @return {Promise} returns Object
     */
    addSharedUser: function (emails, role, isNotify) {
      if (_.isArray(emails)) {
        emails = emails.join('\n');
      }

      return $q.when(Api.addSharedUser(project_id, emails, role, isNotify)).then(function (resp) {
        return resp;
      });
    },

    /**
     * Isolate user from the project
     *
     * @param {String} email
     * @return {Promise}
     */
    removeSharedUser: function (email, _project_id) {
      var project_id = _project_id || window.config.projectId;
      return $q.when(Api.removeSharedUser(project_id, email)).then(function (resp) {
        return resp;
      });
    },

    /**
     * update role of the user
     *
     * @param {String} email
     * @param {String} role ROLE_DEVELOPER, ROLE_TESTER
     * @return {Promise}
     */
    updateUserRole: function (email, role) {
      return $q.when(Api.updateSharedUserRole(project_id, email, role)).then(function (resp) {
        return resp;
      });
    }
  };
}]);

;angular.module('monacaIDE').service('TerminalService', [
  'PubSub',
  'Constant',
  'gettextCatalog',
  '$http',
  'TerminalFactory',
  '$q',
  function (PubSub, Constant, gettextCatalog, $http, TerminalFactory, $q) {
    return {
      startTerminal: function (data) {
        if (TerminalFactory.isConnectingToServer() || !TerminalFactory.isNetworkStable()) return;
        TerminalFactory.setContainerID('');
        TerminalFactory.connectingToServer(true);

        let projectId = window.config.projectId;
        MonacaApi.Ide.Terminal.startTerminal(projectId).then(function (response) {
          let result = response.body.result;

          TerminalFactory.setContainerID(result.containerId);
          TerminalFactory.setTerminalURL(result.serverAppUrl);
          TerminalFactory.setCurrentPreviewPort(result.previewAppPort);
          if (data) {

            let userApp = result.userApp;
            TerminalFactory.setPreviewPorts(userApp);

            let terminalServerAuth = $q.when($http.get(result.serverAppAuthUrl, { withCredentials: true }));
            let previewServerAuth = $q.when($http.get(result.previewAuthUrl, { withCredentials: true }));

            $q.all([terminalServerAuth, previewServerAuth])
              .then(function (res) {
                TerminalFactory.setPreviewUrl(result.previewUrl);
                if (data.isTranspile) {
                  PubSub.publish(Constant.EVENT.TERMINAL_SERVER_RESPONSE, {response: response, isTranspile: true});
                } else {
                  PubSub.publish(Constant.EVENT.TERMINAL_SERVER_RESPONSE_TERMINAL, {response: response, isTranspile: false});
                }
              })
              .catch(function (err) {
                console.log('authorization failed!');
                console.error(err);
              });
          }
          TerminalFactory.connectingToServer(false);
        }).catch(function (error) {
          TerminalFactory.connectingToServer(false);
          if (error && (parseInt(error.status, 10) === -1 || parseInt(error.status, 10) === 500)) {
            TerminalFactory.networkIsNotStable(); // not stable - retry for 3 times
            let message = gettextCatalog.getString('Network unstable. Please check your network connection.');
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: message
            });
            PubSub.publish(Constant.EVENT.TERMINAL_SERVER_RESPONSE_FAILED, {
              reason: message
            });
          }
        });
      },

      isRequiredToInstallPackages: function () {
        return new Promise((resolve, reject) => {
          let projectId = window.config.projectId;
          MonacaApi.Ide.Terminal.checkNodeModules(projectId).then(function (response) {
            let isRequired = false;
            if (response && response.body.result) isRequired = true;
            return resolve(isRequired);
          }).catch(function (error) {
            console.log(error);
            console.log('fallback: install node_modules packages...');
            return resolve(true);
          });
        });
      },

      triggerFileChange (filePath) {
        return new Promise((resolve, reject) => {
          // reject it the terminal is not started/stable
          if (!TerminalFactory.isNetworkStable()) {
            const message = gettextCatalog.getString('To disable the terminal feature, try using the IDE\'s lite mode. This option is available from the Dashboard.');
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: message
            });
            return reject(new Error('ERR_NO_CONTAINER'));
          }
          let headers = {};
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          let url = TerminalFactory.getTerminalFileSaveUrl();
          $http.post(url, 'path=' + filePath, {
            withCredentials: true,
            headers: headers
          })
            .then(response => {
              resolve(response);
            })
            .catch(err => {
              reject(err);
            });
        });
      }

    };
  }]);

;angular.module('monacaIDE').service('UpgradeService', [
  '$q',
  'ProjectService',
  function ($q, ProjectService) {
    let _state = null;

    let isEmpty = (_state) => {
      if (!_state) return false;
      if (_state.constructor === Array) return true;
      if (_state.constructor === Object && Object.keys(_state).length === 0) return true;
      return false;
    };

    return {
      fetchProjectState: function () {
        return $q.when(ProjectService.getProjectState()).then(function (state) {
          _state = state;
          return state;
        });
      },

      getProjectState: function () {
        if (isEmpty(_state)) return {upgradeDevCliEcoSystem: false, shouldNpmInstall: false};
        else return _state;
      }
    };
  }]);

;angular.module('monacaIDE').service('VcsApiService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.Vcs;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (response.body.status === 'error') {
      return $q.reject(response.body);
    } else {
      return $q.resolve(response.body);
    }
  }

  return {
    /**
     * Fetch VCS configuration setup data.
     *
     * @param {String} project_id The working project's ID.
     * @param {String} type VCS Remote Service Type
     *
     * @return {Promise}
     */
    setup: function (type) {
      return $q.when(Api.setup(project_id, type)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Sends VCS configuration changes.
     *
     * @param {String} project_id The working project's ID.
     * @param {Object} params VCS config parameters
     *
     * @return {Promise}
     */
    configure: function (params) {
      return $q.when(Api.configure(project_id, params)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Get status of the project files.
     *
     * @param {String} project_id The working project's ID.
     *
     * @return {Promise}
     */
    status: function () {
      return $q.when(Api.status(project_id)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Commit selected files and folders with commit message.
     *
     * @param {String} project_id The working project's ID.
     * @param {String} message The Commit message.
     * @param {Array} files Collection of files to be comitted
     *
     * @return {Promise}
     */
    commit: function (message, files) {
      return $q.when(Api.commit(project_id, message, files)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Discard local changes.
     *
     * @return {Promise}
     */
    discard: function () {
      return $q.when(Api.discard(project_id)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Pull in repository changes.
     *
     * @param {String} branch The remote branch name.
     * @param {String} project_id The working project's ID.
     *
     * @return {Promise}
     */
    pull: function (branch) {
      return $q.when(Api.pull(project_id, branch)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Abort merge.
     *
     * @return {Promise}
     */
    abortMerge: function () {
      return $q.when(Api.abortMerge(project_id)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Push local changes to repository.
     *
     * @param {String} project_id The working project's ID.
     *
     * @return {Promise}
     */
    push: function () {
      return $q.when(Api.push(project_id)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Fetch local change history.
     *
     * @param {String} project_id The working project's ID.
     *
     * @return {Promise}
     */
    localHistory: function () {
      return $q.when(Api.localHistory(project_id)).then(
        formatResponse,
        formatResponse
      );
    },

    /**
     * Get file diff.
     *
     * @param {String} project_id The working project's ID.
     * @param {String} commit_id1 Base commit ID to compare with.
     * @param {String} commit_id2 Commit ID to compare against.
     *
     * @return {Promise}
     */
    diff: function (commit_id1, commit_id2) {
      return $q.when(Api.diff(project_id, commit_id1, commit_id2)).then(
        formatResponse,
        formatResponse
      );
    }
  };
}]);

;angular.module('monacaIDE').service('WebComponentService', ['$q', function ($q) {
  var Api = MonacaApi.Ide.WebComponent;
  var project_id = window.config.projectId;

  function formatResponse (response) {
    if (!angular.isObject(response.body)) {
      response.body = JSON.parse(response.body);
    }

    return response.body;
  }

  return {
    /**
     * Get a collection of web components.
     *
     * @return {Promise}
     */
    list: function (keyword) {
      return $q.when(Api.list(project_id, keyword)).then(formatResponse.bind(this));
    },

    /**
     * Fetch Web Component Details
     *
     * @param {String} name component's key name
     * @param {Boolean} isOffline
     *
     * @return {Promise}
     */
    fetchComponentDetails: function (name, isOffline) {
      return $q.when(Api.fetchComponentDetails(project_id, name, isOffline)).then(formatResponse.bind(this));
    },

    /**
     * Install Web Component
     *
     * @param {String} name component's key name
     * @param {String} version
     *
     * @return {Promise}
     */
    install: function (name, version) {
      return $q.when(Api.install(project_id, name, version)).then(formatResponse.bind(this));
    },

    /**
     * Uninstall Web Component
     *
     * @param {String} name component's key name
     *
     * @return {Promise}
     */
    uninstall: function (name) {
      return $q.when(Api.uninstall(project_id, name)).then(formatResponse.bind(this));
    },

    /**
     * Configure Monaca Loader with specific Component files.
     *
     * @param {Object} componentFiles Collection of Component and Component Files to use.
     *
     * @return {Promise}
     */
    setLoader: function (componentFiles) {
      return $q.when(Api.setLoader(project_id, componentFiles)).then(formatResponse.bind(this));
    }
  };
}]);

;angular.module('monacaIDE').service('WebSocketHandlerService', function () {
  return {
    webSocket: null,
    errorHandler: null,
    buildLogStorage: {},
    subscribers: {},

    getEndpointUrl: function (apiToken) {
      var ideEndpoint = document.createElement('a');
      ideEndpoint.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE);

      // Setup WebSocket endpoint
      var wsEndpoint = document.createElement('a');
      wsEndpoint.href = 'ws://example.com';
      switch (ideEndpoint.protocol) {
      case 'http:':
        wsEndpoint.protocol = 'ws:'; // Use ws for http
        wsEndpoint.port = '1443'; // Change from 80 to 1443
        break;
      case 'https:':
        wsEndpoint.protocol = 'wss:'; // Use wss for https
        break;
      default:
        wsEndpoint.protocol = 'wss:';
      }
      if (/^ide\./.test(ideEndpoint.hostname)) {
        wsEndpoint.hostname = ideEndpoint.hostname.replace(/^ide\./, 'ws.');
      } else {
        console.error('[WebSocketHandlerService] Error: IDE endpoint "' + ideEndpoint.hostname + '" does not start with "ide.".');
        wsEndpoint.hostname = 'ws.' + ideEndpoint.hostname; // Fallback
        console.error('[WebSocketHandlerService] Fallback to "' + wsEndpoint.hostname + '".');
      }
      wsEndpoint.pathname = '/ide/subscribe/' + apiToken;

      return wsEndpoint.href;
    },

    connect: function (apiToken) {
      var self = this;

      try {
        if (self.webSocket) return;
        self.webSocket = new WebSocket(this.getEndpointUrl(apiToken));
      } catch (ex) {
        console.error(ex.message);
        return;
      }

      self.webSocket.onmessage = function (event) {
        self.onMessage(event);
      };
      self.webSocket.onerror = function (event) {
        self.onError(event);
      };
      self.webSocket.onclose = function () {
        // Connect again
        setTimeout(
          function () { self.connect(apiToken); },
          10 * 1000
        );
      };

    },

    close: function () {
      if (this.webSocket) {
        this.webSocket.onclose = function () { };
        this.webSocket.close();
        this.webSocket = null;
      }
    },

    subscribeByQueueId: function (queueId, callback) {
      this.subscribers[queueId] = { callback: callback };
    },

    updateBuildLog: function (queueId, body) {
      if (this.buildLogStorage[queueId]) {
        this.buildLogStorage[queueId] += body;
      } else {
        this.buildLogStorage[queueId] = body;
      }
    },

    getBuildLog: function (queueId) {
      if (this.buildLogStorage[queueId]) {
        return this.buildLogStorage[queueId];
      }
      return '';
    },

    onMessage: function (msg) {
      var self = this;
      var frame = JSON.parse(msg.data);

      if (frame.method === 'buildLog') {
        self.updateBuildLog(frame.data.queueId, frame.data.body);

        if (self.subscribers[frame.data.queueId]) {
          self.subscribers[frame.data.queueId]['callback']({ data: frame.data });
        }
      }
    },

    onError: function (e) {
      var self = this;
      if (self.errorHandler) {
        self.errorHandler(e);
      }
    },

    setErrorHandler: function (func) {
      var self = this;
      self.errorHandler = func;
    }
  };
});

;
class PNG {
  // implemented on the basis of
  // https://stackoverflow.com/questions/37992117/how-to-get-image-color-mode-cmyk-rgb-in-javascript

  constructor (gettextCatalog) {
    this.gettextCatalog = gettextCatalog;
  }

  parse (file) {
    return file.type && file.type !== 'image/png' ?
      Promise.reject(
        this.gettextCatalog.getString('Only PNG format is supported for upload.')
      ) :
      this.utils.getFileContents(file)
        .then((content) => {
          var base64 = content.split('base64,')[1];
          var byteData = this.utils.base64StringToByteArray(base64);
          var parsedPngData = this.utils.parseBytes(byteData);
          return this.utils.enrichParsedData(parsedPngData);
        });
  }

  get utils () {
    return {

      getFileContents (file) {
        const reader = new FileReader(file);
        return new Promise((resolve, reject) => {
          reader.onload = (event) => {
            try {
              resolve(event.target.result);
            } catch (e) {
              reject(e);
            }
          };
          reader.readAsDataURL(file);
        });
      },

      base64StringToByteArray (base64String) {
        // http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
        var byteCharacters = atob(base64String);
        var byteNumbers = new Array(byteCharacters.length);
        for (var i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return new Uint8Array(byteNumbers);
      },

      parseBytes (bytes) {
        var pngData = {};
        // see https://en.wikipedia.org/wiki/Portable_Network_Graphics

        // verify file header
        pngData['headerIsValid'] = bytes[0] === 0x89
          && bytes[1] === 0x50
          && bytes[2] === 0x4E
          && bytes[3] === 0x47
          && bytes[4] === 0x0D
          && bytes[5] === 0x0A
          && bytes[6] === 0x1A
          && bytes[7] === 0x0A;

        if (!pngData.headerIsValid) {
          console.warn('Provided data does not belong to a png');
          return pngData;
        }

        // parsing chunks
        var chunks = [];

        var chunk = this.parseChunk(bytes, 8);
        chunks.push(chunk);

        while (chunk.name !== 'IEND') {
          chunk = this.parseChunk(bytes, chunk.end);
          chunks.push(chunk);
        }

        pngData['chunks'] = chunks;
        return pngData;
      },

      parseChunk (bytes, start) {
        var chunkLength = this.bytes2Int(bytes.slice(start, start + 4));

        var chunkName = '';
        chunkName += String.fromCharCode(bytes[start + 4]);
        chunkName += String.fromCharCode(bytes[start + 5]);
        chunkName += String.fromCharCode(bytes[start + 6]);
        chunkName += String.fromCharCode(bytes[start + 7]);

        var chunkData = [];
        for (var idx = start + 8; idx < chunkLength + start + 8; idx++) {
          chunkData.push(bytes[idx]);
        }

        // TODO validate crc as required!

        return {
          start: start,
          end: Number(start) + Number(chunkLength) + 12, // 12 = 4 (length) + 4 (name) + 4 (crc)
          length: chunkLength,
          name: chunkName,
          data: chunkData,
          crc: [
            bytes[chunkLength + start + 8],
            bytes[chunkLength + start + 9],
            bytes[chunkLength + start + 10],
            bytes[chunkLength + start + 11]
          ],
          crcChecked: false
        };
      },

      enrichParsedData (pngData) {
        var idhrChunk = this.getChunk(pngData, 'IHDR');

        // see http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html
        pngData.width = this.bytes2Int(idhrChunk.data.slice(0, 4));
        pngData.height = this.bytes2Int(idhrChunk.data.slice(4, 8));
        pngData.bitDepth = this.bytes2Int(idhrChunk.data.slice(8, 9));
        pngData.colorType = this.bytes2Int(idhrChunk.data.slice(9, 10));
        pngData.compressionMethod = this.bytes2Int(idhrChunk.data.slice(10, 11));
        pngData.filterMethod = this.bytes2Int(idhrChunk.data.slice(11, 12));
        pngData.interlaceMethod = this.bytes2Int(idhrChunk.data.slice(12, 13));

        pngData.isGreyScale = pngData.colorType === 0 || pngData.colorType === 4;
        pngData.isRgb = pngData.colorType === 2 || pngData.colorType === 6;
        pngData.hasAlpha = pngData.colorType === 4 || pngData.colorType === 6;
        pngData.hasPaletteMode = pngData.colorType === 3 && this.getChunk(pngData, 'PLTE') != null;

        return pngData;
      },

      getChunks (pngData, chunkName) {
        var chunksForName = [];
        for (var idx = 0; idx < pngData.chunks.length; idx++) {
          if (pngData.chunks[idx].name === chunkName) {
            chunksForName.push(pngData.chunks[idx]);
          }
        }
        return chunksForName;
      },

      getChunk (pngData, chunkName) {
        for (var idx = 0; idx < pngData.chunks.length; idx++) {
          if (pngData.chunks[idx].name === chunkName) {
            return pngData.chunks[idx];
          }
        }
        return null;
      },

      bytes2Int (bytes) {
        var ret = 0;

        for (var idx = 0; idx < bytes.length; idx++) {
          ret += bytes[idx];
          if (idx < bytes.length - 1) {
            ret = ret << 8;
          }
        }

        return ret;
      }
    };
  }
}

PNG.$inject = ['gettextCatalog'];

angular.module('monacaIDE').service('PNG', PNG);

;angular.module('monacaIDE').controller('ProjectRecoveryDialogController', [
  '$scope',
  '$window',
  '$q',
  '$uibModalInstance',
  'Constant',
  'gettextCatalog',
  'callback',
  function ($scope, $window, $q, $modalInstance, Constant, gettextCatalog, callback) {
    $scope.isLoading = false;
    $scope.node_modules = true;
    $scope.package_lock = true;
    $scope.missing_files = true;
    $scope.terminal_server = true;

    $scope.checked = function () {
      return (
        $scope.node_modules ||
        $scope.package_lock ||
        $scope.missing_files ||
        $scope.terminal_server
      );
    };

    $scope.ok = function () {
      if ($scope.isLoading) return; // make sure it doesn't run twice for fast click
      $scope.isLoading = true;
      var fixes = {
        node_modules: $scope.node_modules || '',
        package_lock: $scope.package_lock || '',
        missing_files: $scope.missing_files || '',
        terminal_server: $scope.terminal_server || ''
      };

      callback(fixes)
        .then(() => {
          $modalInstance.close(true);
        });
    };

    $scope.cancel = function () {
      $modalInstance.close(false);
    };

  }]);

;angular.module('monacaIDE').controller('DirectPreviewDialogController', [
  '$scope',
  '$uibModalInstance',
  'ProjectService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  '$uibModal',
  'directoryList',
  function ($scope, $modalInstance, ProjectService, PubSub, Constant, gettextCatalog, $modal, directoryList) {
    $scope.isLoading = true;
    $scope.isProcessing = false;

    // model
    $scope.directoryList = $.map(directoryList, (value) => {
      return value;
    });
    $scope.fileName = 'index.html';
    $scope.dirPath = '/www';
    $scope.status = true;
    $scope.bool = {
      off: {
        name: gettextCatalog.getString('Off'),
        value: false
      },
      on: {
        name: gettextCatalog.getString('On'),
        value: true
      }
    };
    const PREFIX = window.config.client.host.direct_preview_prefix || 'https://direct-preview';
    const DOMAIN = window.config.client.host.web_host_ssl.substring(window.config.client.host.web_host_ssl.indexOf('//') + 2); // https://lmonaca.com --> lmonaca.com
    $scope.directPreviewUrl = `${PREFIX}-${window.config.projectId}.${DOMAIN}`;
    $scope.directPreviewQrCode = `${window.config.client.host.ide_host}/api/project/${window.config.projectId}/directpreviewsetting/downloadQR`;

    // function
    this.save = () => {
      return new Promise((resolve, reject) => {
        ProjectService.saveDirectPreviewSetting({
          'public_path': $scope.dirPath,
          'index_file': $scope.fileName,
          'expire': $scope.status ? -1 : 0
        }).then(data => resolve(data)).catch(e => reject(e));
      });
    };

    this.validate = () => {
      if (!$scope.dirPath) return gettextCatalog.getString('Please specify the value for public path.');
      if (!$scope.fileName) return gettextCatalog.getString('Please specify the value for index file.');

      $scope.fileName = $scope.fileName.trim();
      $scope.dirPath = $scope.dirPath.trim();
      const REDIS_VALUE_SEPARATOR = '*?*';

      const folderFilter = [REDIS_VALUE_SEPARATOR, '..'];
      const fileFilter = [REDIS_VALUE_SEPARATOR, '..', '/'];

      // Check for illegal traversal
      for (let i = 0; i < folderFilter.length; i++) {
        if ($scope.dirPath.indexOf(folderFilter[i]) >= 0) return gettextCatalog.getString('Public path contains invalid characters.');
      }

      for (let i = 0; i < fileFilter.length; i++) {
        if ($scope.fileName.indexOf(fileFilter[i]) >= 0) return gettextCatalog.getString('Index file contains invalid characters.');
      }

      const endingSlash = $scope.dirPath.lastIndexOf('/');
      if (endingSlash < 0) {
        // appending / to the front if there isn't
        $scope.dirPath = '/' + $scope.dirPath;
      } else if (endingSlash > 0 && endingSlash === $scope.dirPath.length - 1) {
        // remove ending / if any
        $scope.dirPath = $scope.dirPath.substring(0, endingSlash);
      }

      return '';
    };

    this.init = () => {
      let publicPath = 'www';
      let indexFile = 'index.html';
      ProjectService.getDirectPreviewSetting().then(data => {
        if (data && data['public_path']) publicPath = data['public_path'];
        if (data && data['index_file']) indexFile = data['index_file'];
        if (data && parseInt(data['expire']) === -1) {
          $scope.status = true;
        } else {
          $scope.status = false;
        }
        $scope.dirPath = publicPath;
        $scope.fileName = indexFile;
        $scope.isLoading = false;
        this.digest();
      }).catch(e => {
        console.log(e);
      });
    };

    this.digest = () => {
      if (!$scope.$$phase) $scope.$apply();
    };

    this.errorDialog = (msg) => {
      $modal.open({
        templateUrl: 'commonDialogs/AlertDialog.html',
        controller: 'AlertController',
        windowClass: 'confirm-window',
        backdrop: 'static',
        resolve: {
          title: () => {
            return gettextCatalog.getString('Web Release');
          },
          message: () => {
            return msg;
          }
        }
      });
    };

    $scope.ok = () => {
      if ($scope.isLoading || $scope.isProcessing) return; // make sure it doesn't run twice for fast click
      const errorMsg = this.validate();
      if (errorMsg) {
        this.errorDialog(errorMsg);
        return;
      }

      $scope.isProcessing = true;

      this.save().then((data) => {
        $scope.isProcessing = false;
        this.digest();
        const text = $scope.status ? gettextCatalog.getString('You have turn on the web released url.') : gettextCatalog.getString('You have turn off the web released url.');
        // Notify user
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: text
        });
      }).catch((e) => {
        const errorMessage = e.body.message || gettextCatalog.getString('Failed to process the data. Please make sure the file and folder is valid and existed.');
        this.errorDialog(errorMessage);
        $scope.isProcessing = false;
        this.digest();
      });
    };

    // init dialog
    this.init();
  }]);

;angular.module('monacaIDE').controller('AboutMonacaCloudDialogController', [
  '$scope',
  function ($scope) {
  // Dialog Controller
  }]);

;angular.module('monacaIDE').controller('EndOfBackendDialogController', [
  '$scope',
  function ($scope) {
    // Dialog Controller
  }]);

;angular.module('monacaIDE').controller('CIHistoryController', ['$scope', '$q', '$window', 'gettextCatalog', 'Dialog', 'CIService', 'PubSub', 'Constant', '$routeParams', function ($scope, $q, $window, gettextCatalog, Dialog, CIService, PubSub, Constant, $routeParams) {
  var START_COUNTER = 3;
  var LAST_INCREMENT = 1;
  var INTERVAL = 6000;
  var TOTAL_AVAILABLE_ITEMS = 0;

  this.historyCollection = [];

  this.showBuildLog = function (buildQueueUrlID) {
    if (window.location.href.indexOf('/build/') > -1) {
      window.location.href = `/build/${$routeParams.projectId}/build-result/${buildQueueUrlID}`;
    } else {
      PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
        open: true,
        componentState: {
          id: buildQueueUrlID,
          title: gettextCatalog.getString('Build Results'),
          icon: 'settings',
          templateUrl: 'build/BuildResult.html'
        }
      });
    }
    return true;
  };

  function fetchList () {
    CIService.fetchLogList({
      count: (START_COUNTER * LAST_INCREMENT)
    }).then(function (response) {
      var result = response.result;

      TOTAL_AVAILABLE_ITEMS = result.count;
      this.historyCollection = result.logs;
    }.bind(this));
  }

  // Get list instantly and then start interval.
  fetchList.call(this);
  this.fetchIntervalId = setInterval(fetchList.bind(this), INTERVAL);

  this.fetchMoreHistory = function () {
    // Stop the existing interval
    clearInterval(this.fetchIntervalId);

    // Update list count, get list instantly, and then restart interval.
    LAST_INCREMENT++;
    fetchList.call(this);
    this.fetchIntervalId = setInterval(fetchList.bind(this), INTERVAL);
  };

  this.isProcessEnded = function (status) {
    return (status === 'finish' || status === 'failed' || status === 'warning');
  };

  this.showLog = function (history) {
    if (!this.isProcessEnded(history.status) || !history.log_url) {
      return Dialog.alert(
        gettextCatalog.getString('There are no logs available at this time for this CI process.'),
        gettextCatalog.getString('Logs Not Found')
      );
    }

    $window.open(history.log_url, '_blank');
    return true;
  };

  this.hasMore = function () {
    return TOTAL_AVAILABLE_ITEMS > (START_COUNTER * LAST_INCREMENT);
  };

  this.beforeClose = function () {
    clearInterval(this.fetchIntervalId.bind(this));
    this.$destroy();
  };
}]);

;angular.module('monacaIDE').controller('DebuggerController', [
  '$scope',
  '$sce',
  'ProjectFactory',
  '$timeout',
  '$element',
  function ($scope, $sce, ProjectFactory, $timeout, $element) {
    var isInspectorLoaded = false;
    var inspector = $element.find('iframe');

    // WebSocket Handler for Inspector
    var WebSocketHandler = {
      webSocket: null,
      errorHandler: null,

      connect: function () {
        try {
          this.webSocket = new WebSocket(ProjectFactory.getSubscriberUrl());
        } catch (ex) {
          // console.error(ex.message);
          return;
        }

        this.webSocket.onmessage = function (event) {
          this.onMessage(event);
        }.bind(this);

        this.webSocket.onerror = function (event) {
          this.onError(event);
        }.bind(this);

        this.webSocket.onclose = function () {
          // Connect again
          setTimeout(function () {
            this.connect(window.MonacaApi.Config.getApiToken());
          }.bind(this), 10 * 1000);
        }.bind(this);
      },

      onMessage: function (msg) {
        var frame = JSON.parse(msg.data);
        if (frame.method !== 'debug.onLog' || frame.data.project_id !== window.config.projectId) {
          return;
        }
        var obj = frame.data;
        obj.content.forEach(function (log) {
          // convert log type string
          var messageLevel;
          var message = log.message;
          switch (log.type.toLowerCase()) {
          case 'debug':
          case 'verbose':
            messageLevel = 0;
            break;

          case 'log':
          case 'info':
            messageLevel = 1;
            break;

          case 'warning':
            messageLevel = 2;
            break;

          case 'error':
            messageLevel = 3;
            break;

          case 'content_loaded':
            return;

          default:
            messageLevel = 1;
          }

          // eslint-disable-next-line
          var message = {
            // repeatCount
            // stackTrace
            // requestId
            url: '',
            source: 3, // JS
            type: 0, // HTML
            level: messageLevel, // LOG
            message: message.toString(),
            parameters: [
              {
                type: typeof message,
                description: message,
                hasChildren: false
              }
            ]
          };

          if (log.url && log.url.length > 0) {
            message.url = log.url;
          }
          // Append device_name to the last
          if (log.line && log.line > 0) {
            message.line = log.line + ' ' + obj['device_name'];
          } else {
            message.url = message.url + ' ' + obj['device_name'];
          }

          // Send using PostMessage
          var data = {
            command: 'weinre',
            deviceId: obj['device_id'],
            deviceName: obj['device_name'],
            message: {
              interface: 'ConsoleNotify',
              method: 'addConsoleMessage',
              args: [message]
            }
          };

          sendToInspector.call(this, data);
        });
      },

      onError: function (e) {
        if (this.errorHandler) {
          this.errorHandler(e);
        }
      },

      setErrorHandler: function (func) {
        this.errorHandler = func;
      }
    };

    var sendToInspector = function (data) {
      if (!isInspectorLoaded) {
        return;
      }

      if (inspector[0].src.indexOf(ProjectFactory.getInspectorUrl()) !== -1) {
        inspector[0].contentWindow.postMessage(data, ProjectFactory.getInspectorUrl());
      }
    };

    // Check if the inspector has been loaded.
    inspector.on('load', function ($element) {
      if (inspector[0].src.indexOf(ProjectFactory.getInspectorUrl()) !== -1) {
        isInspectorLoaded = true;
      }
    });

    // When Project Factory has been Loaded, Load Inspector and Connect ot WebSocket.
    ProjectFactory.loading.then(function () {
      this.url = $sce.trustAsResourceUrl(ProjectFactory.getInspectorUrl());

      WebSocketHandler.connect();
    }.bind(this));
  }
]);

;angular.module('monacaIDE').controller('FooterController', [
  '$scope',
  'PubSub',
  'Constant',
  'EditorManagementService',
  'EditorTabService',
  'EnvironmentFactory',
  function ($scope, PubSub, Constant, EditorManagementService, EditorTabService, EnvironmentFactory) {
    // active tab is editor or not
    this.isEditor = false;

    // change eol feature is enabled or not
    this.hasChangeEol = (EnvironmentFactory.service.show_status_bar && EnvironmentFactory.service.show_status_bar_eol) || false;
    // EOL (End-of-Line) related variables
    this.eolTypes = {
      LF: 0,
      CRLF: 1
    };
    // active editor's EOL type (0 for LF, 1 for CRLF)
    this.eolType = null;
    // variable for displaying EOL type
    this.eolTypeString = '';

    // Change encoding feature is enabled or not
    this.hasChangeEncoding = (EnvironmentFactory.service.show_status_bar && EnvironmentFactory.service.show_status_bar_encoding) || false;
    // Encoding related variables
    this.encodings = [
      'UTF-8',
      'Shift_JIS'
    ];
    // active editor's encoding
    this.encoding = null;

    /**
     * set EOL type by judging from EOL character.
     * @param eolChar {string} - '\r\n' or '\n'
     */
    this.setEolType = eolChar => {
      this.eolType = eolChar === '\r\n' ? this.eolTypes.CRLF : this.eolTypes.LF;
    };

    /**
     * set editor's EOL.
     * @param eolType {number} - 0 (LF) or 1 (CRLF)
     */
    this.setEditorEol = eolType => {
      var editor = EditorManagementService.getEditor(
        EditorTabService.getActiveEditorTabId()
      );
      editor.getModel().pushEOL(eolType);
      this.eolType = eolType;
    };

    /**
     * set encoding of the file.
     * @param encoding {string} - file encoding
     */
    this.setEncoding = encoding => {
      this.encoding = encoding;
    };

    /**
     * Change encoding of the file.
     * @param encoding {string} - file encoding
     */
    this.changeEncoding = encoding => {
      if (this.encoding !== encoding) {
        PubSub.publish(Constant.EVENT.CHANGE_ENCODING_ACTIVE_EDITOR_TAB, {
          encoding: encoding
        });
      }
    };

    // when new editor is created
    PubSub.subscribe(Constant.EVENT.EDITOR_CREATED, opts => {
      if (EditorTabService.isActiveTab(opts.id)) {
        this.setEolType(opts.editor._modelWrapper.getModel().getEOL());
        this.setEncoding(opts.editor._modelWrapper.getEncoding());
      }
    });

    // when active tab is changed
    PubSub.subscribe(Constant.EVENT.ACTIVE_EDITOR_TAB_CHANGED, opts => {
      // Only editor tab does have the id
      this.isEditor = !!opts.id;
      var editor = EditorManagementService.getEditor(opts.id);
      // null check for editor because this event is occurred before 'EDITOR_CREATED' event
      if (this.isEditor && editor) {
        if (EditorTabService.isActiveTab(opts.id)) {
          this.setEolType(editor._modelWrapper.getModel().getEOL());
          this.setEncoding(editor._modelWrapper.getEncoding());
        }
      }
    });

    PubSub.subscribe(Constant.EVENT.ENCODING_CHANGED, opts => {
      this.setEncoding(opts.encoding);
    });

    // Reflect EOL change caused by undo/redo
    PubSub.subscribe(Constant.EVENT.MODEL_CHANGED_ACTIVE_EDITOR_TAB, opts => {
      if (EditorTabService.isActiveTab(opts.id)) {
        this.setEolType(opts.model.getEOL());
        this.setEncoding(opts.editor._modelWrapper.getEncoding());
      }
    });

    $scope.$watch(
      () => this.eolType,
      newValue => {
        this.eolTypeString = newValue === this.eolTypes.CRLF ? 'CRLF' : 'LF';
      }
    );
  }
]);

;angular.module('monacaIDE').controller('GrepPanelController', [
  '$scope',
  '$compile',
  '$q',
  '$timeout',
  'PubSub',
  'Constant',
  'ProjectFileService',
  'FileUtilityFactory',
  function ($scope, $compile, $q, $timeout, PubSub, Constant, ProjectFileService, FileUtilityFactory) {
    $scope.isCaseSensitive = false;
    $scope.isRegExp = false;
    $scope.keyword = '';
    $scope.isSearching = false;

    $scope.search = _.debounce(() => {
      if ($scope.keyword === '' || $scope.keyword.length < 3) return;

      $scope.results = {};
      $scope.isSearching = true;

      // We need to manually $apply because this function is debounced
      if (!$scope.$$phase) $scope.$apply();

      $q.when(ProjectFileService.grep($scope.keyword, ($scope.isCaseSensitive === true) ? 0 : 1, ($scope.isRegExp === true) ? 1 : 0))
        .then((resp) => {
          $scope.results = resp || {};
          $scope.isSearching = false;
        })
        .catch(() => {
          $scope.isSearching = false;
        });
    }, 300);

    $scope.openFile = function (target, line) {
      PubSub.publish(Constant.EVENT.OPEN_FILE, {
        target: target,
        lineNum: line
      });
    };

    $scope.getResultId = function (filename, lineNum) {
      return filename + lineNum;
    };

    $scope.setSelectedResult = function (id) {
      // Selecting a result doesn't do anything, it just looks nice for the user!
      $scope.selectedResult = id;
    };

    $scope.getFileTypeImage = function (fileName) {
      switch (FileUtilityFactory.getExtName(fileName) || fileName) {
      case 'js':
        return '/img/tree/document-js.png';

      case 'json':
        return '/img/tree/document-json.png';

      case 'ts':
        return '/img/tree/document-ts.png';

      case 'jsx':
        return '/img/tree/document-react.png';

      case 'java':
        return '/img/tree/document-java.svg';

      case 'html':
      case 'xml':
        return '/img/tree/document-code.png';

      case 'sass':
      case 'scss':
      case 'less':
      case 'css':
        return '/img/tree/document-css.png';

      case 'markdown':
      case 'md':
        return '/img/tree/document-markdown.png';

      case 'vue':
        return '/img/tree/document-vue.png';

      case 'cob':
        return '/img/tree/document-cobol.svg';

      case 'README':
      case 'LICENSE':
      case 'AUTHOR':
      case 'txt':
      case 'dat':
      default:
        return '/img/tree/document-text.png';
      }
    };

    $scope.formatExcerpt = function (excerpt) {
      var escapeHtmlEntities = function (str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      var reFlags = $scope.isCaseSensitive ? 'g' : 'ig';
      var search = new RegExp(
        $scope.isRegExp ? $scope.keyword : $scope.keyword.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
        , reFlags);

      return escapeHtmlEntities(excerpt).replace(search, '<span class="highlight">$&</span>');
    };

    $scope.toggleCaseSensitive = function () {
      $scope.isCaseSensitive = !$scope.isCaseSensitive;
      $scope.search();
    };

    $scope.toggleIsRegExp = function () {
      $scope.isRegExp = !$scope.isRegExp;
      $scope.search();
    };

    $scope.getLength = function (obj) {
      return Object.keys(obj).length;
    };

    $timeout(() => $('#grep-searchbox').focus()); // autofocus doesn't seem to work here most of the cases, so we focus manually
  }
]);

;angular.module('monacaIDE').controller('HeaderController', [
  '$scope',
  '$http',
  '$templateCache',
  '$uibModal',
  '$timeout',
  'PubSub',
  'gettextCatalog',
  'Constant',
  '$window',
  'Dialog',
  'UserFactory',
  'ProjectFactory',
  'GoldenLayoutService',
  'UserService',
  '$q',
  'CommonFunctionService',
  'EnvironmentFactory',
  'ProjectTreeFactory',
  'IDEHeaderMenuService',
  function ($scope, $http, $tpl, $modal, $timeout, PubSub, gettextCatalog, Constant, $window, Dialog, UserFactory, ProjectFactory, GoldenLayoutService, UserService, $q, CommonFunctionService, EnvironmentFactory, ProjectTreeFactory, IDEHeaderMenuService) {
    this.isEnglish = window.MonacaApi.Config.getLanguage() === 'en';
    this.menu = [];

    // Edit menu items should be enabled only when there is an active editor window
    // Initial data.
    this.is_edit_menu_disabled = {value: true};
    this.is_undo_menu_disabled = {value: true};
    this.is_redo_menu_disabled = {value: true};

    // VCS configs are not avaialble by default.
    this.is_vcs_configuration_disabled = {value: true};
    this.is_vcs_remote_history_disabled = {value: true};

    // Save disable flags
    this.is_save_menu_disabled = {value: true};
    this.is_save_all_menu_disabled = {value: true};

    // vcs related flags
    this.merging = {value: false};
    this.is_pull_menu_disabled = {
      value: this.is_vcs_configuration_disabled.value || this.merging.value
    };
    this.is_abort_merge_menu_disabled = {
      value: this.is_vcs_configuration_disabled.value || !this.merging.value
    };

    const updateVcsMenuFlags = () => {
      this.is_pull_menu_disabled.value =
        this.is_vcs_configuration_disabled.value || this.merging.value;
      this.is_abort_merge_menu_disabled.value =
        this.is_vcs_configuration_disabled.value || !this.merging.value;
    };

    function isPlatformDir (path) {
      return /^\/(android|ios|chrome)/.test(path);
    }

    function isPluginDir (path) {
      return /^\/www\/plugins(\/?)/.test(path);
    }

    function getUploadDirList () {
      var dirList = {
        '/': {
          id: '/',
          path: '/'
        }
      };

      for (var key in ProjectTreeFactory.getFolderTreeData()) {
        if (!isPluginDir(key) && !isPlatformDir(key)) {
          dirList[key] = { id: key, path: key + '/' };
        }
      }

      return dirList;
    }

    function openModal (template, controller, cssClass, resolve, backdrop) {
      if (!template) {
        throw gettextCatalog.getString('Missing modal\'s template.');
      }

      if (!controller) {
        throw gettextCatalog.getString('Missing modal\'s controller.');
      }

      if (!cssClass) {
        throw gettextCatalog.getString('Missing modal\'s class wrapper.');
      }

      $modal.open({
        template: $tpl.get(template),
        controller: controller,
        windowClass: cssClass,
        resolve: resolve || {},
        backdrop: backdrop === undefined ? true : backdrop
      });
    }

    this.openModal = openModal;

    function openBuildPanel (url, page) {
      PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_IFRAME_VIEW, {
        open: true,
        componentState: {
          title: gettextCatalog.getString('App'),
          id: 'buildpanel',
          page: page,
          url: url + '?hide_headerbar=1'
        }
      });
    }

    let cancelWindowDetect = false;
    this.toggleMenuItem = function () {
      cancelWindowDetect = true;
      event.currentTarget.parentElement.classList.toggle('submenu-active');
    };

    window.onclick = function (e) {
      if (cancelWindowDetect) {
        cancelWindowDetect = false;
        return;
      }

      if (!e.target.matches('.header-left-menu')) {
        var menu = document.querySelector('ul.header-left-menu');

        if (menu.classList.contains('submenu-active')) {
          menu.classList.remove('submenu-active');
        }
      }
    };

    /**
     * Closes the left header menu once an element has been clicked
     */
    this.closeMenu = function (event) {
      var target = event.currentTarget.parentElement;
      target.style.display = 'none';

      $timeout(function () {
        target.style.display = '';
      }, 1000);
    };

    /**
     * Notification Panel Actions
     */
    this.openHeadline = function () {
      $window.open(window.MonacaApi.Config.getServiceEndpoint('io') + '/headline');
    };

    /**
     * User Panel Actions
     */
    this.changeLanguage = function (lang) {
      UserService.switchLanguage(lang).then(function () {
        window.location.reload();
      });
    };

    this.logout = function () {
      return Dialog.confirm(gettextCatalog.getString('Are you sure you would like to logout?'), gettextCatalog.getString('Monaca IDE')).then(function (allowLogout) {
        if (allowLogout) {
          window.onbeforeunload = null; // Skip the on before unload warning message.
          var logout = function () {
            $window.location = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) + '/logout';
          };
          $http.get(window.config.client.host.enterprise_host + '/' + window.MonacaApi.Config.getLanguage() + '/sync/off', {
            withCredentials: true
          }).then(logout, logout);
        }
      });
    };

    this.returnToDashboard = function () {
      $window.location = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_CONSOLE) + '/dashboard';
    };

    /**
     * Help & Support Actions
     */
    this.hasCustomUrl = function (key) {
      return ProjectFactory.getCustomUrl(key) || false;
    };

    this.openCustomUrl = function (key) {
      if (this.hasCustomUrl(key)) {
        $window.open(ProjectFactory.getCustomUrl(key));
      }
    };

    /**
     * Menu Actions
     */
    this.menuClick = function (e) {
      this.returnToDashboard();
    };

    const openBuildEnvironment = () => {
      PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
        open: true,
        componentState: {
          id: 'buildEnvironment',
          title: gettextCatalog.getString('Build Environment Settings'),
          icon: 'settings',
          templateUrl: 'build/BuildEnvironmentSettings.html'
        }
      });
    };

    const openBuildHistory = () => {
      PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
        open: true,
        componentState: {
          id: 'buildhistory',
          title: gettextCatalog.getString('Build History'),
          icon: 'build-history',
          templateUrl: 'build/BuildHistory.html'
        }
      });
    };

    this.openNotificationPanel = function () {
      $modal.open({
        templateUrl: 'switchIDE/dialog/changesNotification.html',
        controller: 'HeaderController',
        windowClass: ''
      });
    };

    $scope.switchIde = function () {
      // Set flag to stop using new IDE.
      $scope.config = {}; // Default IDE
      $scope.config.useNewIde = false;
      UserService.setCustomerExperienceSettings($scope.config);
      window.location.href = window.config.client.host.ide_host + '/project/' + window.config.projectId;
    };

    // Handle the opening and closing of GoldenLayout tabs
    const onLayoutTabToggle = (tabId, isOpen) => {
      // Show or hide the tick next to the tab name in the View menu
      var headerViewMenu = _.find(this.menu, {id: 'view'});
      var tabEntryInViewMenu = _.find(headerViewMenu.items, {id: tabId});
      if (tabEntryInViewMenu) tabEntryInViewMenu.isIconVisible = isOpen;
    };

    function _recursivePathHasClass (path, className) {
      var hasClass = false;

      Array.prototype.forEach.call(
        path,
        function (entry) {
          hasClass = hasClass || (entry && entry.className && entry.className.indexOf(className) >= 0);
        }
      );

      return hasClass;
    }

    // Only Chrome supports event.path, so this is a simple polyfill
    function _getEventPath (event) {
      let path = [];
      let element = event.target;

      while (element.parentNode) {
        path.unshift(element.parentNode);
        element = element.parentNode;
      }

      return path;
    }

    PubSub.subscribe(Constant.EVENT.BODY_CLICKED, (data) => {
      const path = _getEventPath(data.event);
      if (
        _recursivePathHasClass(path, 'logo-container') ||
        _recursivePathHasClass(path, 'dashboard-projects') ||
        _recursivePathHasClass(path, 'modal')
      ) {
        return false;
      }
    });

    PubSub.subscribe(Constant.EVENT.OPEN_BUILD_HISTORY, openBuildHistory);

    PubSub.subscribe(Constant.EVENT.OPEN_DEBUG_SETUP, function () {
      var tpl = ProjectFactory.getHasServiceCustomDebuggerOnly() ? 'SetupDebuggerCustomOnlyDialog.html' : 'SetupDebuggerDialog.html';
      openModal(tpl, 'SetupDebuggerDialogController', 'setup-debugger-dialog');
    });

    PubSub.subscribe(Constant.EVENT.OPEN_RUN_ON_DEVICE, function () {
      openModal('RunOnDeviceDialog.html', 'RunOnDeviceDialogController', 'run-on-device-dialog');
    });

    PubSub.subscribe(Constant.EVENT.CHANGE_CONFIG_VALUE_HAS_VCS_CONFIGS, (value) => {
      this.is_vcs_configuration_disabled.value = !value;
      this.is_vcs_remote_history_disabled.value = !(ProjectFactory.getVcsServiceType() === 'GitHub');
      updateVcsMenuFlags();
    });

    PubSub.subscribe(Constant.EVENT.OPEN_BUILD_PANEL, function (options) {
      openBuildPanel(options.url, options.page, options.forcePage);
    });

    PubSub.subscribe(Constant.EVENT.VIEW_OPENED, (opts) => {
      onLayoutTabToggle(opts.componentName, true);
    });

    PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, (opts) => {
      onLayoutTabToggle(opts.componentName, false);
    });

    PubSub.subscribe(Constant.EVENT.ACTIVE_EDITOR_TAB_CHANGED, (opts) => {
      this.is_edit_menu_disabled.value = !opts.id;
    });

    // This is called when switch the already opend editor tab
    PubSub.subscribe(Constant.EVENT.UPDATE_TAB_CLEAN_STATE, (opts) => {
      this.is_save_menu_disabled.value = opts.isClean && !opts.isDeleted;
      this.is_undo_menu_disabled.value = !opts.canUndo;
      this.is_redo_menu_disabled.value = !opts.canRedo;
      this.is_save_all_menu_disabled.value = !opts.isAnyUnsaved && !opts.isAnyDeleted;
    });

    PubSub.subscribe(Constant.EVENT.MERGING_DETECTED, () => {
      this.merging.value = true;
      updateVcsMenuFlags();
    });

    PubSub.subscribe(Constant.EVENT.MERGING_RESOLVED, () => {
      this.merging.value = false;
      updateVcsMenuFlags();
    });

    $q.all([ProjectFactory.loading]).then(() => {
      this.user = ProjectFactory.getUserName() + (ProjectFactory.getLanguage() === 'ja' ? 'さん' : '');
      this.is_vcs_configuration_disabled.value = !ProjectFactory.hasVcsConfiguration();
      this.is_vcs_remote_history_disabled.value = !(ProjectFactory.getVcsServiceType() === 'GitHub');
      updateVcsMenuFlags();
      const hasGitServiceEnabled = ProjectFactory.hasGitServiceEnabled();
      const hasCordovaPlugin = ProjectFactory.hasCordovaPluginManageEnabled();
      const hasJsCSSComponent = ProjectFactory.hasJsCssComponentEnabled();
      const hasServiceIntegration = ProjectFactory.hasServiceIntegrationEnabled();
      const hasCIService = ProjectFactory.hasCIServiceEnabled();
      const hasDeployService = ProjectFactory.hasDeployServiceEnabled();
      const useMenuHeaderForEdu = EnvironmentFactory.useMenuHeaderForEdu();
      const menuHr = {
        label: null,
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: null,
        items: null
      };
      const menuSaveIcon = {
        hasItem: EnvironmentFactory.showMenuHeader('saveIcon'),
        label: gettextCatalog.getString('Save'),
        icon: 'm-icon-save',
        isIconVisible: true,
        isButtonVisible: true,
        isBeta: false,
        items: null,
        disabled: this.is_save_menu_disabled,
        shortcutKey: Constant.SHORTCUT_KEY.SAVE[window.config.os],
        click: function () {
          PubSub.publish(Constant.EVENT.SAVE_ACTIVE_EDITOR_TAB);
        }
      };
      const menuSave = { ...menuSaveIcon, ...{ hasItem: true, label: gettextCatalog.getString('Save') } };
      const menuUndoIcon = {
        hasItem: EnvironmentFactory.showMenuHeader('undoIcon'),
        icon: 'm-icon-undo',
        isIconVisible: true,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.UNDO[window.config.os],
        disabled: this.is_undo_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.UNDO_ACTIVE_EDITOR_TAB);
        }
      };
      const menuUndo = { ...menuUndoIcon, ...{ hasItem: true, label: gettextCatalog.getString('Undo') } };
      const menuRedoIcon = {
        hasItem: EnvironmentFactory.showMenuHeader('redoIcon'),
        icon: 'm-icon-redo',
        isIconVisible: true,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.REDO[window.config.os],
        disabled: this.is_redo_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.REDO_ACTIVE_EDITOR_TAB);
        }
      };
      const menuRedo = { ...menuRedoIcon, ...{ hasItem: true, label: gettextCatalog.getString('Redo') } };
      const menuNewFile = {
        label: gettextCatalog.getString('New File...'),
        hasItem: true,
        icon: 'm-icon-new-file',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.NEW_FILE);
        }
      };
      const menuSaveAll = {
        label: gettextCatalog.getString('Save All'),
        hasItem: true,
        icon: 'm-icon-save-all',
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_save_all_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.SAVE_ALL_EDITOR_TAB);
        }
      };
      const menuUpload = {
        label: gettextCatalog.getString('Upload...'),
        hasItem: true,
        icon: 'm-icon-upload',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.UPLOAD_FILES);
        }
      };
      const menuCommandPalette = {
        label: gettextCatalog.getString('Command Palette'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.COMMAND_PALETTE[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.COMMAND_PALETTE_ACTIVE_EDITOR_TAB);
        }
      };
      const menuIncreaseFontSize = {
        label: gettextCatalog.getString('Increase Font Size'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.INCREASE_FONT_SIZE[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.INCREASE_FONT_SIZE_ACTIVE_EDITOR_TAB);
        }
      };
      const menuDecreaseFontSize = {
        label: gettextCatalog.getString('Decrease Font Size'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.DECREASE_FONT_SIZE[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.DECREASE_FONT_SIZE_ACTIVE_EDITOR_TAB);
        }
      };
      const menuCut = {
        label: gettextCatalog.getString('Cut'),
        hasItem: bowser.chrome,
        icon: 'm-icon-cut',
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.CUT[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.CUT_FROM_ACTIVE_EDITOR_TAB);
        }
      };
      const menuCopy = {
        label: gettextCatalog.getString('Copy'),
        hasItem: bowser.chrome,
        icon: 'm-icon-copy',
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.COPY[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.COPY_FROM_ACTIVE_EDITOR_TAB);
        }
      };
      const menuPaste = {
        label: gettextCatalog.getString('Paste'),
        hasItem: bowser.chrome,
        icon: 'm-icon-paste',
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.PASTE[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.PASTE_TO_ACTIVE_EDITOR_TAB);
        }
      };
      const menuFormatDocument = {
        label: gettextCatalog.getString('Format Document'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.FORMAT_DOCUMENT[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.FORMAT_DOCUMENT_ACTIVE_EDITOR_TAB);
        }
      };
      const menuToggleLineComment = {
        label: gettextCatalog.getString('Toggle Line Comment'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.COMMENT_OUT[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_COMMENT_EDITOR_TAB);
        }
      };
      const menuSearch = {
        label: gettextCatalog.getString('Search...'),
        hasItem: true,
        icon: 'm-icon-search',
        isIconVisible: true,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.SEARCH[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.FOCUS_SEARCH_BOX);
        }
      };
      const menuReplace = {
        label: gettextCatalog.getString('Replace...'),
        hasItem: true,
        icon: 'm-icon-replace',
        isIconVisible: true,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.REPLACE[window.config.os],
        disabled: this.is_edit_menu_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.REPLACE_TEXT_EDITOR_TAB);
        }
      };
      const menuSearchAllFiles = {
        label: gettextCatalog.getString('Search All Files...'),
        hasItem: true,
        icon: 'm-icon-search-all',
        isIconVisible: true,
        isBeta: false,
        items: null,
        shortcutKey: Constant.SHORTCUT_KEY.SEARCH_ALL[window.config.os],
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'cihistory',
              title: gettextCatalog.getString('Find in Files'),
              icon: 'search',
              templateUrl: 'grepPanel.html'
            }
          });
        }
      };
      const closeAllTabs = {
        label: gettextCatalog.getString('Close All Tabs'),
        hasItem: true,
        icon: null,
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          GoldenLayoutService.closeAllTabs();
        }
      };
      const menuDebuggerTab = {
        id: Constant.VIEW.DEBUGGER_VIEW,
        label: gettextCatalog.getString('Debugger Tab'),
        hasItem: ProjectFactory.hasDebuggerService(),
        icon: 'm-icon-checkmark',
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_DEBUGGER_VIEW);
        }
      };

      const menuResetLayout = {
        label: gettextCatalog.getString('Reset Layout'),
        hasItem: true,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.RESET_LAYOUT);
        }
      };

      const menuWorkSpaceConfiguration = {
        label: CommonFunctionService.getWorkspaceConfigurationTitle(),
        hasItem: true,
        icon: 'm-icon-workspace',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            // extension: 'settings', // icon class
            componentState: {
              id: 'workspaceconfig',
              title: CommonFunctionService.getWorkspaceConfigurationTitle(),
              templateUrl: 'setting/WorkspaceConfiguration.html'
            }
          });
        }
      };

      const menuShowPreviewTab = {
        label: gettextCatalog.getString('Show Preview Tab'),
        hasItem: ProjectFactory.hasPreviewerService(),
        icon: 'm-icon-preview',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          if (ProjectFactory.hasPreviewerService()) {
            PubSub.publish(Constant.EVENT.TOGGLE_PREVIEWER_VIEW, {
              open: true,
              componentState: {id: 1}
            });
          } else {
            $modal.open({
              templateUrl: 'commonDialogs/AlertDialog.html',
              controller: 'AlertController',
              windowClass: 'confirm-window',
              resolve: {
                title: function () {
                  return gettextCatalog.getString('New Previewer');
                },
                message: function () {
                  return gettextCatalog.getString('<p>The previewer is not available in safe mode.</p>');
                }
              }
            });
          }
        }
      };
      const menuRunOnDevice = {
        label: gettextCatalog.getString('Run on Device'),
        hasItem: ProjectFactory.hasDebuggerService(),
        icon: 'm-icon-debug',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.OPEN_RUN_ON_DEVICE);
        }
      };
      const menuSetupDebugger = {
        label: ProjectFactory.getHasServiceCustomDebuggerOnly() ? gettextCatalog.getString('Setup Debugger') : gettextCatalog.getString('Setup Monaca Debugger'),
        hasItem: ProjectFactory.hasDebuggerService(),
        icon: ProjectFactory.getHasServiceCustomDebuggerOnly() ? null : 'm-icon-debugger-install',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.OPEN_DEBUG_SETUP);
        }
      };
      const menuOneTimePassword = {
        label: gettextCatalog.getString('One Time Password'),
        hasItem: ProjectFactory.getIsSupportOneTimePassword(),
        icon: 'm-icon-debugger-install',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          $modal.open({
            template: $tpl.get('oneTimePassword/oneTimePassDialog.html'),
            controller: 'OneTimePassController',
            windowClass: 'one-time-password-window',
            backdrop: 'static',
            resolve: {
              projectId: function () {
                return window.config.projectId;
              }
            }
          }).result.then(function () {
          });
        }
      };
      const menuBuildAppForAndroid = {
        label: gettextCatalog.getString('Build App for Android...'),
        hasItem: ProjectFactory.hasBuildService('android'),
        icon: 'm-icon-android',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforandroid',
              title: gettextCatalog.getString('Build App for Android'),
              icon: 'android',
              templateUrl: 'build/AndroidBuild.html'
            }
          });
        }
      };
      const menuBuildAppForiOS = {
        label: gettextCatalog.getString('Build App for iOS...'),
        hasItem: ProjectFactory.hasBuildService('ios'),
        icon: 'm-icon-ios',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforios',
              title: gettextCatalog.getString('Build App for iOS'),
              icon: 'ios-muted',
              templateUrl: 'build/IosBuild.html'
            }
          });
        }
      };
      const menuBuildAppForWindows = {
        label: gettextCatalog.getString('Build App for Windows...'),
        hasItem: ProjectFactory.hasBuildService('windows'),
        icon: 'm-icon-win',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforwindows',
              title: gettextCatalog.getString('Build App for Windows'),
              icon: 'win',
              templateUrl: 'build/WindowsBuild.html'
            }
          });
        }
      };
      const menuBuildAppForPWA = {
        label: gettextCatalog.getString('Build App for PWA...'),
        hasItem: ProjectFactory.hasBuildService('pwa'),
        icon: 'm-icon-pwa',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforpwa',
              title: gettextCatalog.getString('Build App for PWA'),
              icon: 'pwa',
              templateUrl: 'build/WebBuild.html'
            }
          });
        }
      };
      const menuBuildAppForElectronWindows = {
        label: gettextCatalog.getString('Build App for Windows...'),
        hasItem: ProjectFactory.hasBuildService('electron'),
        icon: 'm-icon-win',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforelectronwindows',
              title: gettextCatalog.getString('Build App for Windows'),
              icon: 'win',
              templateUrl: 'build/ElectronBuild.html'
            }
          });
        }
      };
      const menuBuildAppForElectronMacOS = {
        label: gettextCatalog.getString('Build App for macOS...'),
        hasItem: ProjectFactory.hasBuildService('electron') && ProjectFactory.showElectronMacOsBuild(),
        icon: 'm-icon-macos',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforelectronmacos',
              title: gettextCatalog.getString('Build App for macOS'),
              icon: 'macos',
              templateUrl: 'build/ElectronBuild.html'
            }
          });
        }
      };
      const menuBuildAppForElectronLinux = {
        label: gettextCatalog.getString('Build App for Linux...'),
        hasItem: ProjectFactory.hasBuildService('electron') && ProjectFactory.showElectronLinuxBuild(),
        icon: 'm-icon-linux',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildforelectronlinux',
              title: gettextCatalog.getString('Build App for Linux'),
              icon: 'linux',
              templateUrl: 'build/ElectronBuild.html'
            }
          });
        }
      };
      const menuStartCustomBuild = {
        label: gettextCatalog.getString('Start Custom Build...'),
        hasItem: ProjectFactory.hasBuildService('custom'),
        icon: 'm-icon-build-environment',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: Constant.VIEW.CUSTOM_BUILD_VIEW,
              title: gettextCatalog.getString('Start Custom Build'),
              icon: 'm-icon-build-environment',
              templateUrl: 'dashboard/NewRemoteBuild.html'
            }
          });
        }
      };
      const menuBuildEnvironmentSettings = {
        label: gettextCatalog.getString('Build Environment Settings...'),
        hasItem: ProjectFactory.showBuildEnvironmentSettingPage(),
        icon: 'm-icon-build-environment',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: openBuildEnvironment
      };
      const menuCustomBuildSettings = {
        label: gettextCatalog.getString('Custom Build Settings...'),
        hasItem: ProjectFactory.hasBuildService('custom'),
        icon: 'm-icon-build-environment',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'custombuildsettings',
              title: gettextCatalog.getString('Custom Build Settings'),
              icon: 'm-icon-build-environment',
              templateUrl: 'setting/CustomBuildSettings.html'
            }
          });
        }
      };
      const menuBuildHistory = {
        label: gettextCatalog.getString('Build History...'),
        hasItem: true,
        icon: 'm-icon-build-history',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: openBuildHistory
      };
      const menuCiHistory = {
        label: gettextCatalog.getString('CI History...'),
        hasItem: hasCIService,
        icon: 'm-icon-ci',
        isIconVisible: true,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_configuration_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'cihistory',
              title: gettextCatalog.getString('CI History'),
              templateUrl: 'build/CIHistory.html'
            }
          });
        }
      };
      const menuCommit = {
        label: gettextCatalog.getString('Commit...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_configuration_disabled,
        click: function () {
          openModal('vcs/VcsCommitDialog.html', 'VcsCommitController', 'vcs-commit-window');
        }
      };
      const menuShowCommitHistory = {
        label: gettextCatalog.getString('Show Commit History...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_configuration_disabled,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'commithistory',
              title: gettextCatalog.getString('Show Commit History'),
              templateUrl: 'vcs/VcsCommitHistory.html'
            }
          });
        }
      };
      const menuDiscardLocalChanges = {
        label: gettextCatalog.getString('Discard Local Changes...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_configuration_disabled,
        click: function () {
          openModal('vcs/VcsDiscardChanges.html', 'VcsDiscardChangesController', 'vcs-discard-changes-window');
        }
      };
      const menuPullAndMerge = {
        label: gettextCatalog.getString('Pull / Merge...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_pull_menu_disabled,
        click: function () {
          // if there are unsaved tabs, alert it.
          if (GoldenLayoutService.areThereUncleanComponents()) {
            window.alert(
              gettextCatalog.getString('You have unsaved changes. Please save them before pull / merge.')
            );
            return;
          }
          openModal('vcs/VcsPullDialog.html', 'VcsPullController', 'vcs-pull-window');
        }
      };
      const menuAbortMerge = {
        label: gettextCatalog.getString('Abort Merge...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_abort_merge_menu_disabled,
        click: function () {
          openModal('vcs/VcsAbortMerge.html', 'VcsAbortMergeController', 'vcs-abort-merge-window');
        }
      };
      const menuPush = {
        label: gettextCatalog.getString('Push...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_configuration_disabled,
        click: function () {
          openModal('vcs/VcsPushDialog.html', 'VcsPushController', 'vcs-push-window');
        }
      };
      const menuShowRemoteHistory = {
        label: gettextCatalog.getString('Show Remote History...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        disabled: this.is_vcs_remote_history_disabled,
        click: function () {
          $window.open([
            window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE),
            'api',
            'project',
            window.config.projectId,
            'vcs',
            'history'
          ].join('/') + '?' + [
            'api_token=' + window.MonacaApi.Config.getApiToken()
          ].join('&'));
        }
      };
      const menuVcsConfigure = {
        label: gettextCatalog.getString('VCS Configure...'),
        hasItem: hasGitServiceEnabled,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: function () {
          openModal('vcs/VcsConfigurationDialog.html', 'VcsConfigurationController', 'vcs-config-window', void 0, 'static');
        }
      };
      const menuShare = {
        label: IDEHeaderMenuService.getShareTitle(),
        hasItem: true,
        icon: 'm-icon-team',
        isIconVisible: true,
        isBeta: false,
        shortcutKey: null,
        items: null,
        click: function () {
          $modal.open({
            template: $tpl.get('share/ProjectShareWindow.html'),
            controller: 'ProjectShareWindowController',
            windowClass: 'project-share',
            backdrop: 'static',
            resolve: {
              projectId: function () {
                return window.config.projectId;
              }
            }
          }).result.then(function () {
          });
          PubSub.publish(Constant.EVENT.SEND_ANALYTICS, {
            category: Constant.ANALYTICS.CATEGORY,
            action: Constant.ANALYTICS.ACTION.SHARE,
            label: Constant.ANALYTICS.LABEL.MENU
          });
        }
      };
      const menuExportZip = {
        label: IDEHeaderMenuService.getExportZipTitle(),
        hasItem: true,
        icon: 'm-icon-export',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          if (!EnvironmentFactory.service.can_export_project_for_free_user && UserFactory.getSubscriptionInfo() === 'Free') {
            $modal.open({
              templateUrl: 'commonDialogs/AlertDialog.html',
              controller: 'AlertController',
              windowClass: 'confirm-window',
              resolve: {
                title: function () {
                  return gettextCatalog.getString('Exporting Project');
                },
                message: function () {
                  return gettextCatalog.getString(
                    '<p>Only paid users can use this function. Please upgrade your subscription plan.</p>'
                  );
                }
              }
            });
          } else {
            $modal.open({
              templateUrl: 'commonDialogs/ConfirmDialog.html',
              controller: 'ConfirmController',
              windowClass: 'confirm-window',
              resolve: {
                title: function () {
                  return gettextCatalog.getString('Exporting Project');
                },
                message: function () {
                  return gettextCatalog.getString('<p>Please click the button to download the project in a zip format. You may import the project later from the dashboard</p>');
                }
              }
            }).result.then(function () {
              var url = window.config.client.host.ide_host + '/page/project/' + window.config.projectId + '/doExport?download=1&api_token=' + MonacaApi.Config.getApiToken();
              $window.open(url, '_blank');
            });
          }
        }
      };
      const menuExportGoogle = {
        label: IDEHeaderMenuService.getExportGoogleTitle(),
        hasItem: UserFactory.canUseSnsService('google'),
        icon: 'm-icon-google-drive',
        isIconVisible: true,
        isBeta: false,
        isToolTip: true,
        items: null,
        click: function () {
          CommonFunctionService.exportToGoogleDrive(
            window.config.projectId,
            EnvironmentFactory.getGoogleConfigurationAppId(),
            EnvironmentFactory.getGoogleConfigurationPickerApiKey()
          );
        }
      };
      const menuPublush = {
        label: IDEHeaderMenuService.getPublishTitle(),
        hasItem: true,
        icon: 'm-icon-project-publish',
        isIconVisible: true,
        isBeta: false,
        shortcutKey: null,
        items: null,
        click: function () {
          $modal.open({
            template: $tpl.get('share/ProjectPublishWindow.html'),
            controller: 'ProjectPublishWindowController',
            windowClass: 'project-publish-window',
            backdrop: 'static',
            resolve: {
              projectId: function () {
                return window.config.projectId;
              }
            }
          }).result.then(function () {

          });

          PubSub.publish(Constant.EVENT.SEND_ANALYTICS, {
            category: Constant.ANALYTICS.CATEGORY,
            action: Constant.ANALYTICS.ACTION.PUBLISH,
            label: Constant.ANALYTICS.LABEL.MENU
          });
        }
      };
      const menuDirectPreview = {
        label: gettextCatalog.getString('Web Release'),
        hasItem: EnvironmentFactory.hasDirectPreviewEnabled() && ProjectFactory.isAdminRole(),
        icon: 'm-icon-project-direct',
        isIconVisible: true,
        isBeta: true,
        shortcutKey: null,
        items: null,
        click: function () {
          openModal(
            'DirectPreviewDialog.html',
            'DirectPreviewDialogController',
            'direct-preview',
            {
              directoryList: getUploadDirList()
            },
            'static'
          );
        }
      };
      const menuDatabase = {
        label: gettextCatalog.getString('DB'),
        hasItem: EnvironmentFactory.hasEducationDbEnabled(),
        icon: 'm-icon-database',
        isIconVisible: true,
        isBeta: true,
        shortcutKey: null,
        items: null,
        click: function () {
          const url = `${window.config.client.host.education_db_host}/${window.MonacaApi.Config.getLanguage()}/database/${window.config.projectId}`;
          $window.open(url);
        }
      };
      const menuAppSettingsForAndroid = {
        label: gettextCatalog.getString('App Settings for Android...'),
        hasItem: ProjectFactory.hasBuildService('android'),
        icon: 'm-icon-android',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingsandroid',
              title: gettextCatalog.getString('App Settings for Android'),
              icon: 'settings',
              templateUrl: 'build/AndroidAppSettings.html'
            }
          });
        }
      };
      const menuKeyStoreSettingsForAndroid = {
        label: gettextCatalog.getString('KeyStore Settings for Android...'),
        hasItem: ProjectFactory.hasBuildService('android'),
        icon: 'm-icon-android',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildsettingsandroid',
              title: gettextCatalog.getString('Build Settings for Android'),
              icon: 'settings',
              templateUrl: 'build/AndroidBuildSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForiOS = {
        label: gettextCatalog.getString('App Settings for iOS...'),
        hasItem: ProjectFactory.hasBuildService('ios'),
        icon: 'm-icon-ios',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingsios',
              title: gettextCatalog.getString('App Settings for iOS'),
              icon: 'settings',
              templateUrl: 'build/IosAppSettings.html'
            }
          });
        }
      };
      const menuBuildSettingsForIOS = {
        label: gettextCatalog.getString('Build Settings for iOS...'),
        hasItem: ProjectFactory.hasBuildService('ios'),
        icon: 'm-icon-ios',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildsettingsios',
              title: gettextCatalog.getString('Build Settings for iOS'),
              icon: 'settings',
              templateUrl: 'build/IosBuildSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForWindows = {
        label: gettextCatalog.getString('App Settings for Windows...'),
        hasItem: ProjectFactory.hasBuildService('windows'),
        icon: 'm-icon-win',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingswindows',
              title: gettextCatalog.getString('App Settings for Windows'),
              icon: 'settings',
              templateUrl: 'build/WindowsAppSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForPWA = {
        label: gettextCatalog.getString('App Settings for PWA...'),
        hasItem: ProjectFactory.hasBuildService('pwa'),
        icon: 'm-icon-pwa',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingspwa',
              title: gettextCatalog.getString('App Settings for PWA'),
              icon: 'settings',
              templateUrl: 'build/WebAppSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForElectronWindows = {
        label: gettextCatalog.getString('App Settings for Windows...'),
        hasItem: ProjectFactory.hasBuildService('electron'),
        icon: 'm-icon-win',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingselectronwindows',
              title: gettextCatalog.getString('App Settings for Windows'),
              icon: 'settings',
              templateUrl: 'build/ElectronAppSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForElectronMacOS = {
        label: gettextCatalog.getString('App Settings for macOS...'),
        hasItem: ProjectFactory.hasBuildService('electron') && ProjectFactory.showElectronMacOsBuild(),
        icon: 'm-icon-macos',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingselectronmacos',
              title: gettextCatalog.getString('App Settings for macOS'),
              icon: 'settings',
              templateUrl: 'build/ElectronAppSettings.html'
            }
          });
        }
      };
      const menuAppSettingsForElectronLinux = {
        label: gettextCatalog.getString('App Settings for Linux...'),
        hasItem: ProjectFactory.hasBuildService('electron') && ProjectFactory.showElectronLinuxBuild(),
        icon: 'm-icon-linux',
        isIconVisible: true,
        isBeta: true,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'appsettingselectronlinux',
              title: gettextCatalog.getString('App Settings for Linux'),
              icon: 'settings',
              templateUrl: 'build/ElectronAppSettings.html'
            }
          });
        }
      };
      const menuCordovaPluginSettings = {
        label: gettextCatalog.getString('Cordova Plugin Settings...'),
        hasItem: hasCordovaPlugin,
        icon: 'm-icon-cordova-plugins',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'cordovapluginsettings',
              title: gettextCatalog.getString('Cordova Plugin Settings'),
              icon: 'settings',
              templateUrl: 'build/CordovaPlugins.html'
            }
          });
        }
      };
      const menuJsCssComponentSettings = {
        label: gettextCatalog.getString('JS/CSS Component Settings...'),
        hasItem: hasJsCSSComponent,
        icon: 'm-icon-js-css-comp',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'jscsscomponentsettings',
              title: gettextCatalog.getString('JS/CSS Component Settings'),
              icon: 'settings',
              templateUrl: 'build/WebComponent.html'
            }
          });
        }
      };
      const menuServiceIntegrationSettings = {
        label: gettextCatalog.getString('Service Integration Settings...'),
        hasItem: hasServiceIntegration,
        icon: 'm-icon-si',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'serviceintegrationsettings',
              title: gettextCatalog.getString('Service Integration Settings'),
              icon: 'settings',
              templateUrl: 'build/ServiceIntegration.html'
            }
          });
        }
      };
      const menuContinuousIntegration = {
        label: gettextCatalog.getString('Continuous Integration...'),
        hasItem: hasCIService,
        icon: 'm-icon-ci',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'continuousintegration',
              title: gettextCatalog.getString('Continuous Integration'),
              icon: 'settings',
              templateUrl: 'build/ContinuousIntegration.html'
            }
          });
        }
      };
      const menuDeployService = {
        label: gettextCatalog.getString('Deploy Service...'),
        hasItem: hasDeployService,
        icon: 'm-icon-deploy',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'deployservice',
              title: gettextCatalog.getString('Deploy Service'),
              icon: 'settings',
              templateUrl: 'build/DeployService.html'
            }
          });
        }
      };
      const menuKeyboardShortcuts = {
        label: gettextCatalog.getString('Keyboard Shortcuts'),
        hasItem: true,
        icon: 'm-icon-shortcuts',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: () => {
          // TODO add this URL to backend API and use this.openCustomUrl
          $window.open($scope.docsUrl.keyboard_shortcut);
        }
      };
      const menuAdvancedTechnicalSupport = {
        label: gettextCatalog.getString('Advanced Technical Support'),
        hasItem: this.hasCustomUrl('TECHNICAL_SUPPORT'),
        icon: 'm-icon-support',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('TECHNICAL_SUPPORT');
        }
      };
      const menuStatusAndKnownIssues = {
        label: gettextCatalog.getString('Status & Known Issues'),
        hasItem: this.hasCustomUrl('STATUS_ISSUES'),
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('STATUS_ISSUES');
        }
      };
      const menuGeneralInquiry = {
        label: gettextCatalog.getString('General Inquiry'),
        hasItem: this.hasCustomUrl('GENERAL_INQUIRY'),
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('GENERAL_INQUIRY');
        }
      };
      const menuInformationAndUpdates = {
        label: gettextCatalog.getString('Information & Updates'),
        hasItem: this.hasCustomUrl('INFORMATION_UPDATES'),
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('INFORMATION_UPDATES');
        }
      };
      const menuDocuments = {
        label: gettextCatalog.getString('Documents'),
        hasItem: this.hasCustomUrl('DOCUMENTS'),
        icon: 'm-icon-documents',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('DOCUMENTS');
        }
      };
      const menuBlog = {
        label: gettextCatalog.getString('Blog'),
        hasItem: this.hasCustomUrl('BLOG'),
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('BLOG');
        }
      };
      const menuCommunity = {
        label: gettextCatalog.getString('Community'),
        hasItem: this.hasCustomUrl('COMMUNITY'),
        icon: 'm-icon-community',
        isIconVisible: true,
        isBeta: false,
        items: null,
        click: () => {
          this.openCustomUrl('COMMUNITY');
        }
      };
      const menuAboutMonacaCloud = {
        label: gettextCatalog.getString('About Monaca Cloud...'),
        hasItem: true,
        icon: null,
        isIconVisible: false,
        isBeta: false,
        items: null,
        click: () => {
          this.openModal('AboutMonacaCloudDialog.html', 'AboutMonacaCloudDialogController', 'about-monaca-cloud');
        }
      };

      this.menu = [
        menuSaveIcon,
        menuUndoIcon,
        menuRedoIcon,
        {
          label: gettextCatalog.getString('File'),
          hasItem: EnvironmentFactory.showMenuHeader('file'),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuNewFile,
            menuSave,
            menuSaveAll,
            menuUpload
          ]
        },
        {
          label: gettextCatalog.getString('Edit'),
          hasItem: true,
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuUndo,
            menuRedo,
            menuHr,
            menuCut,
            menuCopy,
            menuPaste,
            menuHr,
            menuFormatDocument,
            menuToggleLineComment,
            menuHr,
            menuSearch,
            menuReplace,
            menuHr,
            menuSearchAllFiles
          ]
        },
        {
          id: 'view',
          label: gettextCatalog.getString('View'),
          hasItem: true,
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuCommandPalette,
            menuIncreaseFontSize,
            menuDecreaseFontSize,
            menuHr,
            closeAllTabs,
            menuHr,
            menuDebuggerTab,
            menuResetLayout,
            {...menuShowPreviewTab, ...{ hasItem: useMenuHeaderForEdu }},
            {...menuWorkSpaceConfiguration, ...{ hasItem: useMenuHeaderForEdu }},
            {...menuOneTimePassword, ...{ hasItem: useMenuHeaderForEdu }}
          ]
        },
        {
          label: gettextCatalog.getString('Run'),
          hasItem: EnvironmentFactory.showMenuHeader('run') && ProjectFactory.hasEitherPreviewerOrDebuggerService(),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuShowPreviewTab,
            menuRunOnDevice,
            menuHr,
            menuSetupDebugger,
            menuOneTimePassword
          ]
        },
        {
          label: gettextCatalog.getString('Build'),
          hasItem: EnvironmentFactory.showMenuHeader('build'),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuBuildAppForAndroid,
            menuBuildAppForiOS,
            menuBuildAppForWindows,
            menuBuildAppForPWA,
            menuBuildAppForElectronWindows,
            menuBuildAppForElectronMacOS,
            menuBuildAppForElectronLinux,
            menuStartCustomBuild,
            {...menuHr, ...{ hasItem: ProjectFactory.hasAnyBuildService() }},
            menuBuildEnvironmentSettings,
            menuCustomBuildSettings,
            menuBuildHistory,
            menuCiHistory
          ]
        },
        {
          label: gettextCatalog.getString('Project'),
          hasItem: true,
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuCommit,
            menuShowCommitHistory,
            {...menuHr, ...{ hasItem: hasGitServiceEnabled }},
            menuDiscardLocalChanges,
            {...menuHr, ...{ hasItem: hasGitServiceEnabled }},
            menuPullAndMerge,
            menuAbortMerge,
            menuPush,
            menuShowRemoteHistory,
            {...menuHr, ...{ hasItem: hasGitServiceEnabled }},
            menuVcsConfigure,
            {...menuHr, ...{ hasItem: hasGitServiceEnabled }},
            menuShare,
            menuExportZip,
            menuExportGoogle,
            menuPublush,
            menuDirectPreview,
            {...menuJsCssComponentSettings, ...{ hasItem: useMenuHeaderForEdu }},
            menuDatabase
          ]
        },
        {
          label: gettextCatalog.getString('Configure'),
          hasItem: EnvironmentFactory.showMenuHeader('configure'),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          shortcutKey: null,
          items: [
            menuAppSettingsForAndroid,
            menuKeyStoreSettingsForAndroid,
            {...menuHr, ...{ hasItem: ProjectFactory.hasBuildService('android') }},
            menuAppSettingsForiOS,
            menuBuildSettingsForIOS,
            {...menuHr, ...{ hasItem: ProjectFactory.hasBuildService('ios') }},
            menuAppSettingsForWindows,
            menuAppSettingsForPWA,
            menuAppSettingsForElectronWindows,
            menuAppSettingsForElectronMacOS,
            menuAppSettingsForElectronLinux,
            {...menuHr, ...{ hasItem: ProjectFactory.hasBuildService('windows') || ProjectFactory.hasBuildService('pwa') || ProjectFactory.hasBuildService('electron') }},
            menuCordovaPluginSettings,
            menuJsCssComponentSettings,
            menuServiceIntegrationSettings,
            menuContinuousIntegration,
            menuDeployService,
            menuHr,
            menuWorkSpaceConfiguration
          ]
        },
        {
          label: gettextCatalog.getString('Help'),
          hasItem: EnvironmentFactory.showMenuHeader('help'),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          items: [
            menuKeyboardShortcuts,
            menuHr,
            menuAdvancedTechnicalSupport,
            menuStatusAndKnownIssues,
            menuHr,
            menuGeneralInquiry,
            menuHr,
            menuInformationAndUpdates,
            menuDocuments,
            menuBlog,
            menuCommunity,
            menuHr,
            menuAboutMonacaCloud
          ]
        },
        {
          label: gettextCatalog.getString('Class'),
          hasItem: EnvironmentFactory.showMenuHeader('class'),
          icon: null,
          isIconVisible: false,
          isBeta: false,
          items: [
            {...menuDirectPreview, ...{ label: gettextCatalog.getString('Assignment Submission (Web Release)') }},
            {...menuShare, ...{ label: gettextCatalog.getString('Assignment Submission (Co-editing)') }},
            menuOneTimePassword
          ]
        }
      ];
    });
  }
]);

;angular.module('monacaIDE').controller('IdeController', [
  '$scope',
  '$compile',
  '$timeout',
  '$q',
  '$http',
  '$window',
  '$uibModal',
  '$templateCache',
  'ngToast',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'ProjectFactory',
  'UserFactory',
  'EditorFactory',
  'ProjectTreeFactory',
  'GlobalEditorConfig',
  'TerminalFactory',
  'EnvironmentFactory',
  function ($scope, $compile, $timeout, $q, $http, $window, $modal, $tpl, ngToast, PubSub, Constant, gettextCatalog, ProjectFactory, UserFactory, EditorFactory, ProjectTreeFactory, GlobalEditorConfig, TerminalFactory, EnvironmentFactory) {
    this.loading = true;
    this.error = false;

    const UserApi = MonacaApi.Ide.User;
    const VcsApi = MonacaApi.Ide.Vcs;

    const checkMultiUse = function () {
      UserApi.checkMultiUse().then((response) => {
        const result = response.body.result;
        if (result.isDetectedMultiUse) {
          if (confirm(result.description)) {
            $window.location = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) + '/dashboard';
          }
        } else if (result.isDetectedMultiDebugger) {
          if (confirm(result.description)) {
            $window.location = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IO) + '/pricing';
          }
        }
      });
    };

    const checkMerging = function () {
      VcsApi.mergeStatus(window.config.projectId).then(function (response) {
        // if MERGE_HEAD file exists
        const merging = response.body.result.merging;
        if (merging) {
          PubSub.publish(Constant.EVENT.MERGING_DETECTED);
        }
      });
    };

    // call checkMultiUse every 5 minutes
    window.setInterval(checkMultiUse, 300 * 1000);

    window.addEventListener('message', function (event) {
      if (/^http(s?):\/\/app(\.[a-z\d\-\.]*)?\.monaca.[a-z]*$/.test(event.origin) && event.data) {
        if (event.data.action === 'reload_tree') {
          PubSub.publish(Constant.EVENT.TREE_CLEAR_CACHE_RELOAD);
        } else if (event.data.action === 'close_inactivate_tabs') {
          PubSub.publish(Constant.EVENT.CLOSE_INACTIVATE_TABS);
        }
      }
    });

    document.body.addEventListener('click', function (event) {
      PubSub.publish(Constant.EVENT.BODY_CLICKED, {event: event});
    }, false);

    $q.all([
      EnvironmentFactory.loading,
      ProjectFactory.loading,
      ProjectTreeFactory.loading,
      UserFactory.loading,
      EditorFactory.loading,
      TerminalFactory.loading
    ]).then(function (resp) {
      if (ProjectFactory.isCordovaProject() && !ProjectFactory.getIsSupportedCordova()) {
        return $q.reject();
      }

      if (!UserFactory.getInfo().isAvailable) {
        window.location.href = `${window.config.client.host.web_host_ssl}/${window.MonacaApi.Config.getLanguage()}`;
        return;
      }

      if (ProjectFactory.hasGitServiceEnabled() && ProjectFactory.hasVcsConfiguration()) {
        checkMerging();
      }

      // set static preview url
      window.config.staticPreviewUrl = ProjectFactory.getStaticPreviewUrl();

      // flag whether displays the status bar or not
      this.showStatusBar = EnvironmentFactory.service.show_status_bar;

      // GlobalEditorConfig depends on EnvironmentFactory
      GlobalEditorConfig.loading
        .then(() => {
          this.loading = false;
          // Second argument, delay is not provided and executes the default behaviour.
          // The function will be executed after the DOM has completed rendering.
          $timeout(function () {
            PubSub.publish(Constant.EVENT.IDE_READY);

            // Checking browser name and version
            if (EnvironmentFactory.browser['detect_unsupported'] && !bowser.chrome) {
              setTimeout(() =>
                ngToast.create({
                  className: 'warning',
                  content: gettextCatalog.getString('Monaca Cloud IDE has detected the usage of an unsupported browser. Monaca Cloud IDE currently supports Chrome. </br>Other browser may not operate as expected.'),
                  dismissOnTimeout: false,
                  dismissButton: true
                }),
              3000);
            }
            if (EnvironmentFactory.browser['check_chrome_version'] && bowser.chrome && !bowser.check({chrome: '63'})) {
              setTimeout(() =>
                ngToast.create({
                  className: 'warning',
                  content: gettextCatalog.getString('Monaca Cloud IDE has detected an older version of the Chrome browser.</br> Some feature may not operate as expected.'),
                  dismissOnTimeout: false,
                  dismissButton: true
                }),
              3000);
            }

          });
        })
        .catch(err => {
          console.log(err);
          return $q.reject();
        });

    }.bind(this),
    unsupportedCordova.bind(this)
    ).then(
      function () {},
      unsupportedCordova.bind(this)
    );

    function unsupportedCordova () {
      this.error = true;

      if (!ProjectFactory.getIsSupportedCordova()) {
        $modal.open({
          template: $tpl.get('UpgradeCordovaDialog.html'),
          controller: 'UpgradeCordovaDialogController',
          windowClass: 'upgrade-cordova-dialog',
          resolve: {
            cordovaVersion: function () {
              return ProjectFactory.getCordovaVersion();
            }
          },
          backdrop: 'static'
        });
      } else {
        $modal.open({
          template: $tpl.get('commonDialogs/ErrorDialog.html'),
          controller: 'ErrorDialogController',
          windowClass: 'error-dialog',
          resolve: {
            title: function () {
              return gettextCatalog.getString('Monaca Cloud Initialization Error');
            },
            message: function () {
              return gettextCatalog.getString('An error occurred while trying to initialize the Monaca Cloud. Please try again.<br>If the error persists, please contact Monaca Support.');
            },
            canClose: function () {
              return false;
            }
          },
          backdrop: 'static'
        });
      }
    }

    PubSub.subscribe(Constant.EVENT.NOTIFY_USER, function (data, topic) {
      ngToast.create(data);
    });

    PubSub.subscribe(Constant.EVENT.SEND_ANALYTICS, function (data, topic) {
      if (!ProjectFactory.getHasServiceAnalytics()) {
        return false;
      }

      // var target = data.category + '/' + data.label + '-' + data.action;
      // add another analytic tool here
    });

    // This is used by the Device Preview popout to communicate with the parent IDE
    $scope.fetchForSubscribe = function () {
      return {
        PubSub: PubSub,
        Constant: Constant
      };
    };
  }
]);

;angular.module('monacaIDE').controller('ProjectController', [
  '$scope',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'ProjectFactory',
  function ($scope, PubSub, Constant, gettextCatalog, ProjectFactory) {
    this.projectName = '';
    this.currentPanel = Constant.PROJECT.PANEL_FILE;

    ProjectFactory.loading.then(function () {
      this.projectName = ProjectFactory.getProjectName();
    }.bind(this));
  }]);

;angular.module('monacaIDE').controller('RunOnDeviceDialogController', [
  '$scope',
  '$window',
  'gettextCatalog',
  'PubSub',
  'Constant',
  'ProjectService',
  '$timeout',
  function ($scope, $window, gettextCatalog, PubSub, Constant, ProjectService, $timeout) {
    $scope.page = 'connecting';
    $scope.clientName = '';

    $scope.run = function () {
      $scope.page = 'connecting';
      ProjectService.run(window.config.projectId).then(function (resp) {
        if (!resp.clientsCount) {
          $scope.page = 'debugger_not_found';
          return;
        }

        var firstDevice = Object.keys(resp.clients)[0];
        $scope.clientName = resp.clients[firstDevice].clientName;
        $scope.page = 'successful_run';

        $timeout($scope.$close.bind(null), 2000);
      }, function (resp) {
        $scope.page = 'debugger_not_found';
      });
    };

    $scope.installDebuggerGuide = function () {
      $scope.$close();
      PubSub.publish(Constant.EVENT.OPEN_DEBUG_SETUP);
    // $window.alert('The "Setup Monaca Debugger" dialog will open here...');
    };

    PubSub.publish(Constant.EVENT.SEND_ANALYTICS, {
      category: Constant.ANALYTICS.CATEGORY,
      action: Constant.ANALYTICS.ACTION.RUN,
      label: Constant.ANALYTICS.LABEL.MENU
    });

    // Trigger Send App...
    $scope.run();
  }]);

;angular.module('monacaIDE').controller('SetupDebuggerDialogController', [
  '$scope',
  'gettextCatalog',
  'PubSub',
  'Constant',
  '$q',
  'BuildService',
  'UserService',
  'ProjectFactory',
  function ($scope, gettextCatalog, PubSub, Constant, $q, BuildService, UserService, ProjectFactory) {
    $scope.page = 'loading';
    $scope.installType; // eslint-disable-line
    $scope.deviceName = '';
    $scope.debugger_version_android = '';
    $scope.debugger_version_ios = '';

    $scope.custom_debugger_version_android = ProjectFactory.getAndroidCustomDebuggerVersion();
    $scope.custom_debugger_version_ios = ProjectFactory.getIosCustomDebuggerVersion();

    if (ProjectFactory.getHasServiceCustomDebuggerOnly()) {
      $scope.page = 'landing';
    } else {
      $q.all([
        BuildService.getOfficialReleaseDebuggerVersion('android'),
        BuildService.getOfficialReleaseDebuggerVersion('ios')
      ]).then(function (resp) {
      // Set the version data
        $scope.debugger_version_android = resp[0].result.version;
        $scope.debugger_version_ios = resp[1].result.version;

        $scope.page = 'landing';
      });
    }

    var stack = [];

    $scope.next = function (page) {
    // push the old page
      stack.push($scope.page);

      // set the new page
      $scope.page = page;
    };

    $scope.back = function () {
    // set the old page
      $scope.page = stack.pop();
    };

    $scope.connect = function () {
      if ($scope.installType === 'android') {
        $scope.next('android_connect');
      } else if ($scope.installType === 'ios') {
        $scope.next('ios_connect');
      }
    };

    // When page is changed, trigger certian actions depending on page.
    $scope.$watch('page', function () {
      if ($scope.page === $scope.installType + '_connect') {
        UserService.clientList().then(function (resp) {
          if (!_.size(resp.result)) {
            $scope.page = $scope.installType + '_connect_failed';
          } else {
            var firstDevice = Object.keys(resp.result)[0];

            $scope.deviceName = resp.result[firstDevice].clientName;
            $scope.page = $scope.installType + '_connect_success';
          }
        });
      }
    });

    $scope.buildCustom = function () {
      var componentState = '';
      if ($scope.installType === 'android') {
        componentState = {
          id: 'buildforandroid',
          title: gettextCatalog.getString('Build App for Android'),
          icon: 'android',
          templateUrl: 'build/AndroidBuild.html'
        };
      } else if ($scope.installType === 'ios') {
        componentState = {
          id: 'buildforios',
          title: gettextCatalog.getString('Build App for iOS'),
          icon: 'ios-muted',
          templateUrl: 'build/IosBuild.html'
        };
      }

      PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, { open: true, componentState: componentState });
      $scope.$close();
    };

    $scope.runOnDevice = function () {
      $scope.$close();
      PubSub.publish(Constant.EVENT.OPEN_RUN_ON_DEVICE);
    };
  }]);

;(function () {
  angular.module('monacaIDE').controller('TerminalController', [
    'PubSub',
    'Constant',
    '$element',
    'TerminalService',
    'TerminalFactory',
    '$timeout',
    'GoldenLayoutService',
    'gettextCatalog',
    'CommonFunctionService',
    'ProjectFactory',
    function (PubSub, Constant, $element, TerminalService, TerminalFactory, $timeout, GoldenLayoutService, gettextCatalog, CommonFunctionService, ProjectFactory) {
      var vm = this;
      var _reconnectingToServer = 5000;
      var _data;
      var _needResize = false;
      var _needUIUpdate = null;
      var _safePadding = 5; // 5px
      var _retry = 0;
      var _maxRetry = 3;
      vm.loading = true;
      vm.showTerminal = false;
      vm.messages = [];
      vm.bodyStyle = {
        width: '100%',
        height: '100%',
        backgroundColor: ''
      };
      vm.bodyStyle.backgroundColor = TerminalFactory.getTerminalBackgroundColor();

      vm.options = {
        isTranspile: false,
        focus: true,
        terminal: {
          cursorStyle: 'underline'
        },
        url: '',
        containerId: '',
        autoResize: true,
        width: 0,
        height: 0,
        customCommand: '/bin/bash',
        onTerminalOptionChanged: function (config) {
        },
        onInit: function (terminal) {
          vm.terminal = terminal;
        },
        onError: function (event) {
          if (vm.terminal && !isConnected()) {
            vm.terminal.loading(true);
            init(_data);
          }
        },
        onClose: function (event) {
          if (vm.terminal && !isConnected()) {
            // close without reason, error, or not close properly
            if ((event && !event.reason) || vm.terminal.getErrorMessage() === gettextCatalog.getString('Error occured.') || (String(event.reason).indexOf('exited with code: 0') < 0)) {
              vm.terminal.loading(true);
              init(_data);
            }
          }
        },
        onConnect: function () {
          if (!ProjectFactory.isTranspileLogEnabled()) TerminalFactory.setNetworkStatus = true;
          _retry = 0;
          TerminalFactory.resetCustomCommand();
        },
        onMessage: function (event) {
        },
        onOpen: function (event) {
        },
        onResize: function (size) {
        }
      };

      vm.open = function () {
        if (TerminalFactory.getContainerID().length > 0) {
          vm.options.customCommand = TerminalFactory.getCustomCommand();
          vm.options.url = TerminalFactory.getTerminalURL();
          vm.options.containerId = TerminalFactory.getContainerID();
          vm.loading = false;
          vm.showTerminal = true;
          if (vm.terminal && !isSocketOpen()) vm.terminal.reInit();
        }
      };

      vm.destroy = function () {
        vm.showTerminal = false;
      };

      vm.resize = function (width, height) {
        vm.bodyStyle.backgroundColor = TerminalFactory.getTerminalBackgroundColor();
        vm.terminal.forceResize(width, height - _safePadding);
      };

      function init (data) {
        if (!isConnected() && !ProjectFactory.isTranspileLogEnabled() && !TerminalFactory.getContainerID()) {
          TerminalService.startTerminal({isTranspile: false});
          return;
        }
        if ((getDisplayStatus() !== 'none') && !isConnected() && TerminalFactory.isNetworkStable()) {
          if (_retry >= _maxRetry) return;
          _retry += 1;
          vm.loading = true;
          if (vm.terminal) {
            vm.terminal.loading(true);
          }
          vm.options.width = data.containerWidth;
          vm.options.height = data.containerHeight - _safePadding;
          vm.options.id = data.componentId || 'terminal';
          vm.open();

          $timeout(function () {
            if (!isConnected()) {
              init(data);
            }
          }, _reconnectingToServer);
        }
      }

      function isSocketOpen () {
        let socket = vm.terminal.getSocket();
        if (!socket || !socket.isOpen()) return false;
        return true;
      }

      function isConnected () {
        if (!vm.terminal) return false;
        // if the terminal is closed properly, don't need to reconnect
        if (String(vm.terminal.getErrorMessage()).indexOf('exited with code: 0') >= 0) return true;
        return isSocketOpen();
      }

      function getDisplayStatus () {
        let display_status = angular.element($element).parent().parent().css('display');
        return display_status;
      }

      function getTerminalID () {
        return angular.element($element).parent().attr('id');
      }

      function updateUIConfiguration (config) {
        _needUIUpdate = null;
        vm.terminal.setUIConfiguration(config);
        vm.resize(_data.containerWidth, _data.containerHeight);
      }

      PubSub.subscribe(Constant.EVENT.TERMINAL_SERVER_RESPONSE_TERMINAL, function (response) {
        try {
          if (!response.isTranspile) {
            init(_data);
          }
        } catch (err) {
          console.error(err);
        }
      });

      PubSub.subscribe(Constant.EVENT.TERMINAL_SERVER_RESPONSE_FAILED, function (data) {
        try {
          // todo - handle when failed to connect
          // _initing = false;
          // if (!TerminalFactory.isNetworkStable()) {
          //   let defaultError = gettextCatalog.getString('System Error.');
          //   vm.retryReason = data.reason || defaultError;
          //   vm.useLitemodeMessage = gettextCatalog.getString('To disable the terminal feature, try using the IDE\'s lite mode. This option is available from the Dashboard.');
          //   notifyUser('danger', vm.useLitemodeMessage);
          //   vm.retryReason = vm.retryReason;
          //   vm.retryConnecting = true;
          // } else {
          //   reconnectAgain(_data);
          // }
        } catch (err) {
          console.error(err);
        }
      });

      PubSub.subscribe(Constant.EVENT.TERMINAL_SETTING_CHANGED, function (config) {
        if (!config || !isConnected()) return;
        if (getDisplayStatus() !== 'none') {
          updateUIConfiguration(config);
        } else {
          _needUIUpdate = config;
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_SHOWN, function (data) {
        if (data.componentId === getTerminalID()) {
          _data = data;
          init(data);
          if (_needUIUpdate && isConnected()) {
            updateUIConfiguration(_needUIUpdate);
          }
          if (_needResize && isConnected()) {
            _needResize = false;
            vm.resize(data.containerWidth, data.containerHeight);
          }
          if (vm.terminal && isConnected()) vm.terminal.forceFocus();
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_HIDE, function (data) {
        if (data.componentId === getTerminalID()) {}
      });

      PubSub.subscribe(Constant.EVENT.VIEW_RESIZE, function (data) {
        if (data.componentId === getTerminalID() && vm.terminal) {
          _data = data;
          vm.resize(data.containerWidth, data.containerHeight);
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, function (data) {
        if (data.componentId === getTerminalID()) {
          if (vm.terminal && data.componentId) vm.terminal.clearTmuxSession(data.componentId);
          vm.destroy();
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_OPENED, function (data) {
        if (data.componentId === getTerminalID()) {
          GoldenLayoutService._getTabElement(data.componentId).off('click').on('click', function () {
            if (vm.terminal && isConnected()) {
              vm.terminal.forceFocus();
            }
          });
        }
      });
    }
  ]);
})();

;(function () {
  angular.module('monacaIDE').controller('TranspileLogController', [
    'PubSub',
    'Constant',
    '$element',
    '$scope',
    '$uibModal',
    '$templateCache',
    'TerminalService',
    'TerminalFactory',
    'GoldenLayoutService',
    '$timeout',
    'gettextCatalog',
    '$window',
    'UpgradeService',
    '$q',
    'ProjectService',
    'UserFactory',
    'ContainerService',
    'CommonFunctionService',
    'ProjectFileService',
    'ProjectFactory',
    function (PubSub, Constant, $element, $scope, $modal, $tpl, TerminalService,
      TerminalFactory, GoldenLayoutService, $timeout, gettextCatalog, $window,
      UpgradeService, $q, ProjectService, UserFactory, ContainerService, CommonFunctionService,
      ProjectFileService, ProjectFactory
    ) {
      var vm = this;
      var _dummyWidth = 800;
      var _dummyHeight = 300;
      var _needResize = false;
      var _reconnectingToServer = 15000;
      var _informPreviewPanel = 5000;
      var _data;
      var _componentId;
      var _needUIUpdate = null;
      var _safePadding = 0;
      var _initing = false;

      vm.bodyStyle = {
        width: '100%',
        // height: '100%',
        backgroundColor: '#fff'
      };

      vm.retryConnecting = false;
      vm.retryReason = '';
      vm.useLitemodeMessage = '';
      vm.loading = true;
      vm.showTerminal = false;
      vm.transpile_command = 'monaca preview';
      vm.port = 8080;
      vm.headerPixel = 28; // pixel of the header above the transpile log output
      vm.options = {
        isTranspile: true,
        focus: true,
        terminal: {
          cursorStyle: 'underline'
        },
        url: '',
        containerId: '',
        autoResize: true,
        width: 0,
        height: 0,
        killSession: false,
        customCommand: 'monaca preview',
        onTerminalOptionChanged: function (config) {
        },
        onInit: function (terminal) {
          vm.terminal = terminal;
        },
        onError: function (event) {
          _initing = false;
          vm.loading = true;
          if (vm.terminal && !isConnected()) {
            shouldReconnect(15000);
          }
        },
        onClose: function (event) {
          _initing = false;
          vm.loading = true;
          if (vm.terminal && !isConnected()) {
            shouldReconnect(5000);
          }
        },
        onConnect: function () {
          TerminalFactory.setNetworkStatus = true;
          vm.options.killSession = false; // reset to default
        },
        onMessage: function (event) {
        },
        onOpen: function (event) {
          _initing = false;
          vm.loading = false; // if any
          if (vm.terminal) vm.terminal.loading(false);
          updatePreviewUrl();
        },
        onResize: function (size) {
        },
        onSendTranspileCommand: function (socket) {
        }
      };

      vm.onSettingClicked = function () {
        openModal('TranspileLogSettingDialog.html', 'TranspileLogSettingDialog', 'transpile-setting');
      };

      vm.destroy = function () {
        vm.showTerminal = false;
      };

      vm.resize = function (width, height) {
        vm.bodyStyle.backgroundColor = TerminalFactory.getTerminalBackgroundColor();
        vm.terminal.forceResize(width, height - vm.headerPixel - _safePadding);
      };

      function updateUIConfiguration (config) {
        _needUIUpdate = null;
        vm.terminal.setUIConfiguration(config);
        vm.resize(_data.containerWidth, _data.containerHeight);
      }

      function updatePreviewUrl () {
        let previewUrl = TerminalFactory.getPreviewUrl();
        $timeout(function () { PubSub.publish(Constant.EVENT.PREVIEWER_VIEW_URL_CHANGED, {url: previewUrl}); }, _informPreviewPanel);
      }

      PubSub.subscribe(Constant.EVENT.TERMINAL_SETTING_CHANGED, function (config) {
        if (!config || !isConnected()) return;
        if (getDisplayStatus() !== 'none') {
          updateUIConfiguration(config);
        } else {
          _needUIUpdate = config;
        }
      });

      PubSub.subscribe(Constant.EVENT.TRANSPILE_SETTING_CHANGED, function () {
        if (vm.terminal) {
          let sessionName = 'mn-gl-transpile-log-view'; // default session name
          if (_data && _data.componentId) sessionName = _data.componentId;
          vm.terminal.clearTmuxSession(sessionName);
        }
      });

      PubSub.subscribe(Constant.EVENT.TERMINAL_SERVER_RESPONSE, function (response) {
        try {

          // close all existing terminal tabs (if any) if user cant create terminal due to his plan
          if (!UserFactory.canCreateNewTerminal()) GoldenLayoutService.closeAllTerminalTabs();

          vm.bodyStyle.backgroundColor = TerminalFactory.getTerminalBackgroundColor();
          if (response.isTranspile) {
            $q.when(UpgradeService.fetchProjectState())
              .then(function (state) {
                vm.options.url = TerminalFactory.getTerminalURL();
                vm.options.containerId = TerminalFactory.getContainerID();
                vm.port = TerminalFactory.getCurrentPreviewPort();

                let prepareCommand = '/tmp/start-preview';
                let prepareCommandArguments = '';
                let shouldRunNpmInstall = UpgradeService.getProjectState().shouldNpmInstall;
                let shouldRunMonacaUpdate = UpgradeService.getProjectState().upgradeDevCliEcoSystem;

                if (shouldRunNpmInstall) prepareCommandArguments = prepareCommandArguments.concat(' --npm-install');
                if (shouldRunMonacaUpdate) prepareCommandArguments = prepareCommandArguments.concat(' --upgrade');

                prepareCommand = prepareCommand.concat(' ', prepareCommandArguments);

                if (shouldRunMonacaUpdate) {
                  $q.when(ProjectFileService.fileRead('/package.json'))
                    .then((content) => {
                      if (content.body && CommonFunctionService.isValidJson(content.body)) {
                        // close all preview and terminal tabs
                        GoldenLayoutService.closeAllPreviewerAndTerminalTabs();
                        // close open package.json
                        GoldenLayoutService.closeEditorView('package.json');
                        // open update dialog
                        return openUpdateProjectStructure(prepareCommand);
                      } else {
                        $modal.open({
                          templateUrl: 'commonDialogs/ConfirmDialog.html',
                          controller: 'ConfirmController',
                          backdrop: true,
                          resolve: {
                            title: () => {
                              return gettextCatalog.getString('Syntax error');
                            },
                            message: () => {
                              return gettextCatalog.getString('Package.json is invalid which may cause errors in the project. Would you like to open package.json and fix it?');
                            }
                          }
                        }).result
                          .then((res) => {
                            PubSub.publish(Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW, {
                              open: true,
                              componentState: {
                                url: '/package.json'
                              }
                            });
                          });
                      }
                    });
                } else {
                  if (shouldRunNpmInstall) initTranspileTab(`${prepareCommand} ${vm.transpile_command}`);
                  else initTranspileTab(`/tmp/start-preview ${vm.transpile_command}`);
                }
              })
              .catch(function (err) {
                // run npm install and monaca preview as a fallback
                console.error(err);
                initTranspileTab(`/tmp/start-preview --npm-install ${vm.transpile_command}`);
              });
          }
        } catch (err) {
          console.error(err);
        }
      });

      function notifyUser (type, message) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: type,
          content: message
        });
      }

      function setWaitCursor (wait) {
        if (wait) {
          document.body.style.cursor = 'wait';
        } else {
          document.body.style.cursor = 'default';
        }
      }

      vm.recoverProject = () => {
        $modal.open({
          templateUrl: 'dashboard/ProjectRecoveryDialog.html',
          controller: 'ProjectRecoveryDialogController',
          windowClass: 'project-recovery-dialog',
          backdrop: 'static',
          keyboard: false,
          resolve: {
            callback: () => {
              return (fixes) => {
                setWaitCursor(true);
                var dfd = $q.defer();

                var restartTerminal = (fixes) => {
                  if (!fixes.terminal_server) return $q.resolve(true);

                  return ContainerService.removeTerminal(window.config.projectId);
                };

                var recoverProject = (fixes) => {
                  if (fixes.node_modules || fixes.package_lock || fixes.missing_files) {
                    return ProjectService.recoverProject(window.config.projectId, fixes);
                  } else {
                    return $q.resolve(true);
                  }
                };

                recoverProject(fixes)
                  .then(() => restartTerminal(fixes))
                  .then((response) => {
                    if (fixes && fixes.terminal_server) forceRestart();
                    dfd.resolve(true);
                  })
                  .catch((e) => {
                    dfd.reject(e);
                  });

                return dfd.promise;
              };
            }
          }
        }).result.then(res => {
          setWaitCursor(false);
        }).catch(err => {
          setWaitCursor(false);
          console.error(err);
          let message = gettextCatalog.getString('failed to recover project');
          notifyUser('danger', message);
        });
      };

      vm.restartPreviewer = function (force) {
        $modal.open({
          templateUrl: 'build/dialogs/RestartPreviewServerDialog.html',
          controller: 'RestartPreviewServerController',
          windowClass: 'confirm-window',
          resolve: {
            title: function () {
              return gettextCatalog.getString('Restart Preview Server');
            },
            message: function () {
              return gettextCatalog.getString('<p>This will restart your preview server container.</p>');
            }
          }
        }).result.then(function () {
          setWaitCursor(true);
          let projectId = window.config.projectId;
          let message;
          if (!projectId) {
            setWaitCursor(false);
            message = gettextCatalog.getString('Failed to restart terminal.');
            message = message + ' ' + gettextCatalog.getString('No Project ID');
            notifyUser('danger', message);
          } else {
            ContainerService.removeTerminal(projectId)
              .then(result => {
                forceRestart();
                setWaitCursor(false);
              })
              .catch(err => {
                setWaitCursor(false);
                message = gettextCatalog.getString('Failed to restart terminal.');
                notifyUser('danger', message);
                console.error(err);
              });
          }
        });
      };

      function forceRestart () {
        vm.retryReason = null;
        vm.retryConnecting = false;
        _initing = false;
        init(_data); // reconnect
      }

      function openUpdateProjectStructure (prepareCommand) {
        return $modal.open({
          template: $tpl.get('UpgradeCliEcosystemDialog.html'),
          controller: 'UpgradeCliEcosystemDialogController',
          windowClass: 'upgrade-cli-ecosystem-dialog',
          backdrop: 'static',
          keyboard: false
        }).result.then(function () {
          GoldenLayoutService.focusExistingComponent(_componentId);
          vm.options.killSession = true; // kill existing session if any
          initTranspileTab(`${prepareCommand} ${vm.transpile_command}`);
        });
      }

      PubSub.subscribe(Constant.EVENT.TERMINAL_SERVER_RESPONSE_FAILED, function (data) {
        try {
          _initing = false;
          if (!TerminalFactory.isNetworkStable()) {
            let defaultError = gettextCatalog.getString('System Error.');
            vm.retryReason = data.reason || defaultError;
            vm.useLitemodeMessage = gettextCatalog.getString('To disable the terminal feature, try using the IDE\'s lite mode. This option is available from the Dashboard.');
            notifyUser('danger', vm.useLitemodeMessage);
            vm.retryReason = vm.retryReason;
            vm.retryConnecting = true;
          } else {
            reconnectAgain(_data);
          }
        } catch (err) {
          console.error(err);
        }
      });

      vm.retry = function () {
        $window.location.reload();
      };

      function initTranspileTab (command) {
        vm.options.customCommand = command;
        if (vm.terminal && !isSocketOpen()) {
          vm.terminal = null;
        }
        vm.destroy();
        vm.showTerminal = true;
        vm.loading = false;
      }

      PubSub.subscribe(Constant.EVENT.VIEW_SHOWN, function (data) {
        if (data.componentName === Constant.VIEW.TRANSPILE_LOG_VIEW) {
          _data = data;
          if (getDisplayStatus() !== 'none') {
            if (_needUIUpdate && isConnected()) {
              updateUIConfiguration(_needUIUpdate);
            }
            if (!isConnected()) {
              init(data);
            } else if (_needResize) {
              _needResize = false;
              vm.resize(data.containerWidth, data.containerHeight);
            }
            if (vm.terminal && isConnected()) vm.terminal.forceFocus();
          }
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_OPENED, function (data) {
        if (data.componentName === Constant.VIEW.TRANSPILE_LOG_VIEW) {
          // close all previewers (if any) if IDE is open in safe mode
          if (!ProjectFactory.hasPreviewerService()) GoldenLayoutService.closeAllPreviewerTabs();

          _componentId = data.componentId;
          _data = data;
          if (getDisplayStatus() === 'none' && !isConnected()) {
            _needResize = true;
            init(data);
          }
          GoldenLayoutService._getTabElement(data.componentId).off('click').on('click', function () {
            if (vm.terminal && isConnected()) {
              vm.terminal.forceFocus();
            }
          });
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_HIDE, function (data) {
        if (data.componentName === Constant.VIEW.TRANSPILE_LOG_VIEW) {}
      });

      PubSub.subscribe(Constant.EVENT.VIEW_RESIZE, function (data) {
        if (data.componentName === Constant.VIEW.TRANSPILE_LOG_VIEW && isConnected()) {
          _data = data;
          vm.resize(data.containerWidth, data.containerHeight);
        }
      });

      PubSub.subscribe(Constant.EVENT.VIEW_CLOSED, function (data) {
        if (data.componentName === Constant.VIEW.TRANSPILE_LOG_VIEW) {
          vm.destroy();
        }
      });

      function shouldReconnect (waitingTime) {
        if (TerminalFactory.isNetworkStable()) {
          $timeout(function () {
            reConnect(_data);
          }, waitingTime);
        }
      }

      function reConnect (data) {
        if (getDisplayStatus() === 'none') {
          GoldenLayoutService.focusExistingComponent(_componentId);
        } else {
          init(data);
        }
      }

      function reconnectAgain (data) {
        $timeout(function () {
          if (!isConnected()) init(data);
        }, _reconnectingToServer);
      }

      function init (data) {
        if (_initing) return;
        _initing = true;
        _data = data;
        if (vm.terminal) vm.terminal.loading(true);
        vm.loading = true;
        vm.options.width = data.containerWidth || _dummyWidth - _safePadding;
        vm.options.height = data.containerHeight - vm.headerPixel - _safePadding || _dummyHeight - vm.headerPixel - _safePadding;
        vm.options.id = data.componentId || 'mn-gl-transpile-log-view';
        if (!isConnected()) TerminalService.startTerminal({isTranspile: true});
        reconnectAgain(data); // attempt to reconnect in 15 seconds if not connected
      }

      function getDisplayStatus () {
        let display_status = angular.element($element).parent().parent().css('display');
        return display_status;
      }

      function isSocketOpen () {
        let socket = vm.terminal.getSocket();
        if (!socket || !socket.isOpen()) return false;
        return true;
      }

      function isConnected () {
        if (!vm.terminal) return false;
        return isSocketOpen();
      }

      function openModal (template, controller, cssClass, resolve) {
        if (!template) {
          throw gettextCatalog.getString('Missing modal\'s template.');
        }

        if (!controller) {
          throw gettextCatalog.getString('Missing modal\'s controller.');
        }

        if (!cssClass) {
          throw gettextCatalog.getString('Missing modal\'s class wrapper.');
        }

        $modal.open({
          template: $tpl.get(template),
          controller: controller,
          windowClass: cssClass,
          resolve: resolve || {}
        });
      }
    }
  ]);
})();

;angular.module('monacaIDE').controller('TranspileLogSettingDialog', [
  'PubSub',
  'Constant',
  '$scope',
  'ProjectService',
  'gettextCatalog',
  'TerminalFactory',
  function (PubSub, Constant, $scope, ProjectService, gettextCatalog, TerminalFactory) {
    this.findWithAttr = (array, attr, value) => {
      for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
          return i;
        }
      }
      return -1;
    };

    this.populateData = () => {
      $scope.userApp = TerminalFactory.getPreviewPorts();

      let terminal_index = this.findWithAttr($scope.userApp, 'port', 'terminal');
      if (terminal_index > -1) $scope.userApp.splice(terminal_index, 1);

      let port_index = this.findWithAttr($scope.userApp, 'port', parseInt(TerminalFactory.getCurrentPreviewPort()));
      $scope.port_selected = $scope.userApp[port_index > -1 ? port_index : 0];
    };
    this.populateData();

    $scope.onRestoreDefaultClicked = () => {
      ProjectService.resetTranspileCommandSetting(window.config.projectId).then((result) => {
        TerminalFactory.setCurrentPreviewPort(result.preview_port);

        let port_index = this.findWithAttr($scope.userApp, 'port', parseInt(TerminalFactory.getCurrentPreviewPort()));
        TerminalFactory.setPreviewUrl($scope.userApp[port_index].Url);

        this.populateData();
        PubSub.publish(Constant.EVENT.TRANSPILE_SETTING_CHANGED);
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Preview server has been reset to default settings.')
        });
        $scope.$close();
      }).catch((error) => {
        console.log('transpile reset', error);
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('Cannot reset setting to default.')
        });
      });
    };

    $scope.onApplyClicked = () => {
      var settings = {};
      settings.preview_port = $scope.port_selected.port;

      ProjectService.saveTranspileCommandSetting(window.config.projectId, settings).then((response) => {
        if ($scope.port_selected.port !== TerminalFactory.getCurrentPreviewPort()) {
          TerminalFactory.setCurrentPreviewPort($scope.port_selected.port);
          TerminalFactory.setPreviewUrl($scope.port_selected.Url);
          PubSub.publish(Constant.EVENT.TRANSPILE_SETTING_CHANGED);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Preview server settings has been saved.')
          });
        }

        $scope.$close();
      }).catch((error) => {
        console.log(error);
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('Cannot apply preview command setting.')
        });
      });
    };
  }]);

;angular.module('monacaIDE').controller('UpgradeCliEcosystemDialogController', [
  '$scope',
  '$window',
  '$q',
  '$uibModalInstance',
  'Constant',
  'gettextCatalog',
  'ProjectService',
  function ($scope, $window, $q, $modalInstance, Constant, gettextCatalog, ProjectService) {
    $scope.isUpgrading = false;

    $scope.upgradeEcosystem = function () {
      if ($scope.isUpgrading) return; // make sure it doesn't run twice
      $scope.isUpgrading = true;
      ProjectService.duplicateAndArchive()
        .then(() => {
          $modalInstance.close(true);
        });
    };

    $scope.returnToDashboard = function () {
      $window.location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_CONSOLE) + '/dashboard';
    };

    $scope.openHelp = function () {
      $window.open($scope.docsUrl.upgrade_cli_3);
    };

  }]);

;angular.module('monacaIDE').controller('UpgradeCordovaDialogController', [
  '$scope',
  '$window',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'CordovaService',
  'cordovaVersion',
  function ($scope, $window, PubSub, Constant, gettextCatalog, CordovaService, cordovaVersion) {
    $scope.isUpgrading = false;
    $scope.cordovaVersion = cordovaVersion;

    $scope.upgradeCordova = function () {
      $scope.isUpgrading = true;
      CordovaService.upgradeVersion().then(
        function (resp) {
          window.location.reload();
          $scope.isUpgrading = false;
        },
        function (err) {
          $scope.isUpgrading = false;
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: (err && err.body && err.body.message)
              ? err.body.message
              : gettextCatalog.getString('An unknown error has occurred. Please refresh and try again.')
          });
        }
      );
    };

    $scope.openPlanPricing = function () {
      $window.open(window.config.client[window.MonacaApi.Config.getLanguage()].url.plan_pricing);
    };

    $scope.returnToDashboard = function () {
      $window.open(window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_CONSOLE) + '/dashboard');
    };
  }]);

;
angular.module('monacaIDE').controller('AndroidAppSettingsController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  'ProjectFactory',
  'ProjectSettingFactory',
  'PubSub',
  'Constant',
  function ($scope, gettextCatalog, $modal, ProjectFactory, ProjectSettingFactory, PubSub, Constant) {

    var projectId = window.config.projectId;
    var oldSettings = {};

    const now = Date.now();

    $scope.cordovaVersion = ProjectFactory.getCurrentCordovaVersion();

    $scope.isLoading = {};
    $scope.settings = {};
    $scope.isCordova10 = $scope.cordovaVersion === '10.0';

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.createSettingImageUrl = function (projectId, type) {
      return window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/file/read/' + type + '?api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.iconTypeList = (function () {
      var list = {
        'iconLdpi_android': { w: 36, h: 36, label: '' },
        'iconMdpi_android': { w: 48, h: 48, label: '' },
        'iconHdpi_android': { w: 72, h: 72, label: '' },
        'iconXHdpi_android': { w: 96, h: 96, label: '' },
        'iconXXHdpi_android': { w: 144, h: 144, label: '' },
        'iconXXXHdpi_android': { w: 192, h: 192, label: '' }
      };

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.splashTypeList = (function () {
      var list = {
        'splashLdpi_android': { w: '', h: '', label: 'ldpi' },
        'splashMdpi_android': { w: '', h: '', label: 'mdpi' },
        'splashHdpi_android': { w: '', h: '', label: 'hdpi' },
        'splashXHdpi_android': { w: '', h: '', label: 'xhdpi' },
        'splashXXHdpi_android': { w: '', h: '', label: 'xxhdpi' },
        'splashXXXHdpi_android': { w: '', h: '', label: 'xxxhdpi' }
      };

      if (parseInt($scope.cordovaVersion, 10) >= 9) {
        list['splashMdpi_android_default'] = { w: '', h: '', label: 'default' };
      }

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.timestamp = function () {
      return now;
    };

    $scope.init = function () {
      $scope.loading = true;
      ProjectSettingFactory.loading.then(function (result) {
        var projectInfo = result.project || {};
        var config = result.config && result.config.android ? result.config.android : {};
        var preference = config.preference || {};

        // Application Information
        $scope.settings.applicationName_android = config.applicationName;
        $scope.settings.applicationClass_android = config.applicationClass;
        $scope.settings.config_postfix = preference['monaca:AndroidIsPackageNameSeparate'] === 'true';
        $scope.settings.versionName_android = config.versionName;
        $scope.settings.versionCode_android = config.versionCode;
        $scope.specifyVersionCode = !!$scope.settings.versionCode_android;
        $scope.settings.fullscreen_android = preference.Fullscreen === 'true';
        $scope.settings.xenable_android = config.AndroidXEnabled === 'true';
        $scope.settings.config_android_target_sdk_version = config.androidTargetSdkVersion;

        // すべての<icon>にsrc属性があるかどうか
        $scope.hasMissingSrcIcon = !config.icon.every(iconTag => {
          // <icon>タグの属性のうち、1つはsrcがある
          const hasSrc = iconTag.some(attrs => {
            return attrs.attr === 'src';
          });
          return hasSrc;
        });

        // Splash Screen
        $scope.settings.splashtime_android = preference.SplashScreenDelay || '';

        // Misc
        $scope.settings.config_access_origin_android = config.accessOrigin;
        $scope.settings.config_keeprunning = preference.KeepRunning === 'true';
        $scope.settings.config_disallow_overscroll_android = preference.DisallowOverscroll === 'true';
        $scope.settings.config_orientation_android = preference.Orientation || 'default';

        // using crosswalk webview or not
        $scope.isHighPerformanceWebView = false;
        if ($scope.cordovaVersion < 5) {
          $scope.isHighPerformanceWebView = preference['monaca:WebViewEngine'] === 'crosswalk';
        }

        $scope.rpg_background_images_android = projectInfo.rpg_background_images;
        if (projectInfo.selected_rpg_background_image) {
          $scope.settings.selected_rpg_background_image_android = projectInfo.selected_rpg_background_image.android || '';
        }

        // 比較のため現在の設定内容を取得
        oldSettings = Object.assign({}, $scope.settings);

        $scope.isInitialized = true;
        $scope.isReadyToSave = true;
      }).then(function () {
        // get crosswalk plugin info
        if ($scope.cordovaVersion >= 5) {
          MonacaApi.Ide.Cordova.list(projectId).then(function (response) {
            $scope.loading = false;
            var plugins = response.body.result ? response.body.result : {};
            $scope.$apply(function () {
              var crosswalkPlugin = plugins[Constant.PLUGIN.CROSSWALK] || {};
              $scope.isHighPerformanceWebView = crosswalkPlugin && crosswalkPlugin.isInstalled;
            });
          });
        } else {
          $scope.loading = false;
        }
      });
    };

    $scope.valueChanged = function (fieldName) {
      return oldSettings[fieldName] !== $scope.settings[fieldName];
    };

    $scope.uploadImage = function (element) {
      var file = element.files[0];
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to overwrite this file?');
          }
        }
      }).result.then(function () {
        var uploadType = element.name;
        var types = (function () {
          if (uploadType === 'icon_all_android') {
            return Object.keys($scope.iconTypeList);
          } else if (uploadType === 'splash_all_android') {
            return Object.keys($scope.splashTypeList);
          } else {
            return [uploadType];
          }
        })();

        // show loading icons
        types.forEach(function (type) {
          $scope.isLoading[type] = true;
        });

        // reload updated images
        MonacaApi.Ide.Project.uploadSettingImage(projectId, uploadType, file)
          .then(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                document.getElementById('image-' + type).src = $scope.createSettingImageUrl(projectId, type) + '&t=' + (new Date()).getTime();
                $scope.isLoading[type] = false;
                if ($scope.splashTypeList[uploadType]) {
                  $scope.splashTypeList[uploadType].missing = false;
                }
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('Successfully uploaded.')
            });
          })
          .catch(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to upload file.')
            });
          });
      });
    };

    $scope.deleteImage = function (type) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure you want to remove this?');
          }
        }
      }).result.then(function () {
        MonacaApi.Ide.Project.deleteSettingImage(projectId, type);
        if ($scope.splashTypeList[type]) {
          $scope.splashTypeList[type].missing = true;
        }
      });
    };

    $scope.onImageLoadError = function (splash) {
      if (splash) {
        splash.missing = true;
      }
    };

    $scope.submit = function () {
      var data = { android: Object.assign({}, $scope.settings) };

      // バージョンコード指定にチェックが無い場合、バージョンコードの値を消しておく
      if (!$scope.specifyVersionCode) {
        data.android.versionCode_android = '';
      }

      $scope.isReadyToSave = false;
      $scope.saving = true;
      MonacaApi.Ide.Project.saveProjectSetting(projectId, data).then(function () {
        $scope.isReadyToSave = true;
        $scope.saving = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Successfully saved')
        });
        ProjectSettingFactory.reload();
        oldSettings = Object.assign({}, $scope.settings);
        $scope.$apply();
      });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('AndroidBuildController', ['$scope', '$controller', 'Constant', 'InAppUpdaterService', 'Dialog', 'gettextCatalog', 'PubSub', 'ProjectFactory',
    function ($scope, $controller, Constant, InAppUpdaterService, Dialog, gettextCatalog, PubSub, ProjectFactory) {

      angular.extend(this, $controller('BaseBuildController', { $scope: $scope }));

      $scope.platform = 'android';
      $scope.flag_monaca_hosting_app = { 'android': false };
      $scope.flag_alias_password_changed = false;
      ProjectFactory.loading.then(function () {
        $scope.isCustomBuildDebuggerServiceEnabled = ProjectFactory.hasCustomDebugBuildService('android');
      });

      var previousUsedAlias = null;

      if ($scope.isRPGUser) {
        InAppUpdaterService.getRemotePackgeList().then(function (result) {
          $scope.inappupdater_packages = result;
        });
      }

      $scope.manageBuildSettings = function () {
        if ($scope.isAppMode()) {
          $scope.setPage(Constant.PAGE_ANDROID_BUILD_SETTINGS, true);
        } else {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildsettingsandroid',
              title: gettextCatalog.getString('Build Settings for Android'),
              icon: 'settings',
              templateUrl: 'build/AndroidBuildSettings.html'
            }
          });
        }
      };

      $scope.manageBuildEnvironmentSettings = function () {
        if ($scope.isAppMode()) {
          $scope.setPage(Constant.PAGE_BUILD_ENVIRONMENT_SETTINGS, true);
        } else {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildEnvironment',
              title: gettextCatalog.getString('Build Environment Settings'),
              icon: 'settings',
              templateUrl: 'build/BuildEnvironmentSettings.html'
            }
          });
        }
      };

      $scope.initProfiles = function (result) {
        $scope.aliasList = result.project.android.alias_android_list || [];

        // set default alias
        previousUsedAlias = result.project.android.alias_android || null;
        if (previousUsedAlias && $scope.aliasList.map(function (v) { return v.alias; }).includes(previousUsedAlias)) {
          $scope.alias_name = previousUsedAlias;
          $scope.showDummyPassword();
        } else {
          $scope.alias_name = $scope.aliasList.length ? $scope.aliasList[0].alias : null;
        }
      };

      $scope.createBuildParameters = function () {
        var params = {};
        if ($scope.alias_name) {
          // 'alias_password' の値を送信した場合のみサーバー側で保持するalias_passwordが更新される
          // そのため、以前使ったaliasと同じaliasを使用する場合は 'alias_password' を送らないようにする
          // ただし、ユーザーがエイリアスのパスワードを再入力したら上書きできるようにする。(flag_alias_password_changed)
          params.alias_name = $scope.alias_name;
          if ($scope.alias_name !== previousUsedAlias || $scope.flag_alias_password_changed) {
            params.alias_password = $scope.alias_password || '';
          }
        }

        if ($scope.flag_monaca_hosting_app.android) {
          params.inapp_updater_env = $scope.purpose;
          params.purpose = 'inapp_updater';
          params.update_number = '1';
        }

        return params;
      };

      $scope.aliasPasswordChanged = function () {
        $scope.password_error = null;
        $scope.flag_alias_password_changed = true;
      };

      $scope.showDummyPassword = function () {
        if ($scope.alias_name === previousUsedAlias) {
          $scope.alias_password = '********';
        } else {
          $scope.alias_password = '';
        }
      };

      $scope.deleteUpdateNumber = function (package_id) {
        Dialog.confirm(
          gettextCatalog.getString('Are you sure to delete this package?')
        ).then(function () {
          $scope.deleting = true;
          MonacaApi.Ide.InAppUpdater.deleteUpdateNumber(window.config.projectId, package_id).then(function (res) {
            InAppUpdaterService.getRemotePackgeList().then(function (result) {
              $scope.inappupdater_packages = result;
              $scope.deleting = false;
            });
          });
        });
      };

      $scope.formatAndroidPackageType = function (packageType) {
        if (packageType === 'bundle') return gettextCatalog.getString('App Bundle (.aab)');
        return gettextCatalog.getString('APK (.apk)');
      };
    }]);

;
angular.module('monacaIDE').controller('AndroidBuildSettingsController', [
  '$scope',
  'gettextCatalog',
  '$controller',
  '$uibModal',
  'Dialog',
  'PubSub',
  'CommonFunctionService',
  function ($scope, gettextCatalog, $controller, $modal, Dialog, PubSub, CommonFunctionService) {

    var projectId = window.config.projectId;

    $scope.aliasList = [];

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.init = function () {
      $scope.updatePage();
    };

    $scope.showBackButton = function () {
      return $scope.hasPrevPage() && $scope.isAppMode();
    };

    $scope.updatePage = function () {
      $scope.updating = true;
      MonacaApi.Ide.Project.getProjectSetting(projectId).then(function (response) {
        var result = response.body && response.body.result ? response.body.result : {};
        var projectInfo = result.project.android || {};
        $scope.hasKeyStore = projectInfo.has_keystore || false;
        $scope.aliasList = projectInfo.alias_android_list;
        $scope.updating = false;
        $scope.$apply();
        PubSub.publish('android-build-settings-update');
      });
    };

    $scope.clickGenerateKeyStore = function () {
      Dialog.confirm(
        gettextCatalog.getString('Are you sure to remove the KeyStore and all the aliases?')
      ).then(function () {
        $modal.open({
          templateUrl: 'build/dialogs/KeyStoreGeneratorDialog.html',
          controller: 'KeyStoreGeneratorDialogController'
        }).result.then(function () {
          $scope.updatePage();
        });
      });
    };

    $scope.clickAddAlias = function () {
      $modal.open({
        templateUrl: 'build/dialogs/KeyStoreAddAliasDialog.html',
        controller: 'KeyStoreAddAliasDialogController'
      }).result.then(function () {
        $scope.updatePage();
      });
    };

    $scope.clickDeleteAlias = function (aliasName) {
      Dialog.confirm(
        gettextCatalog.getString('Are you sure to delete this alias from KeyStore?')
      ).then(function () {
        MonacaApi.Ide.Project.deleteAlias(projectId, aliasName).then(function () {
          $scope.updatePage();
        });
      });
    };

    $scope.htmlspecialchars = function (text) {
      return CommonFunctionService.htmlspecialchars(text);
    };

    $scope.clickImport = function () {
      Dialog.confirm(
        gettextCatalog.getString('Current KeyStore and all the aliases will be lost. Are you sure to continue?')
      ).then(function () {
        $modal.open({
          templateUrl: 'build/dialogs/KeyStoreImportDialog.html',
          controller: 'KeyStoreImportDialogController'
        }).result.then(function () {
          $scope.updatePage();
        });
      });
    };

    $scope.clickExport = function () {
      $modal.open({
        templateUrl: 'build/dialogs/KeyStoreExportDialog.html',
        controller: 'KeyStoreExportDialogController'
      });
    };

  }]);

;
angular.module('monacaIDE').controller('BaseBuildController', [
  '$q',
  '$scope',
  'Constant',
  'PubSub',
  'gettextCatalog',
  'ProjectFactory',
  function ($q, $scope, Constant, PubSub, gettextCatalog, ProjectFactory) {

    var projectId = window.config.projectId;
    $scope.lang = window.MonacaApi.Config.getLanguage();
    $scope.platform = null;
    $scope.cordovaVersion = ProjectFactory.getCurrentCordovaVersion();
    $scope.canBuild = false;

    $scope.type = window.config.initialBuildType || 'development';
    $scope.purpose = window.config.initialBuildPurpose || 'debug';
    $scope.tab = {
      development: 'debug',
      production: 'release'
    };
    $scope.tab[$scope.type] = $scope.purpose;

    // reset initial tab
    if (window.config.initialBuildType || window.config.initialBuildPurpose) {
      window.config.initialBuildType = null;
      window.config.initialBuildPurpose = null;
    }

    // 既に同一ページが開かれている場合はこれでdebuggerタブを開く @todo refactoring
    $scope.$on('SHOW_DEBUGGER_TAB', function (e) {
      $scope.type = 'development';
      $scope.purpose = 'debugger';
      $scope.tab[$scope.type] = $scope.purpose;
      $scope.$apply();
    });

    $scope.isAppMode = function () {
      return window.location.href.indexOf('/build/') > -1;
    };

    $scope.buildProblems = [];
    $scope.buildWarnings = [];

    $scope.password_error = null;

    // URLに特定の文字列が含まれたらbuildを同じWindowで開く
    // var buildSelfWindow = window.location.href.includes('from=local');
    $scope.init = function () {
      $scope.subscribeBuildSettings();
      // get user info and plugin info
      MonacaApi.Ide.User.info().then(function (response) {
        $scope.userInfo = response.body.result || {};
      }).then(function () {
        if (ProjectFactory.getFramework() === 'cordova') {
          MonacaApi.Ide.Cordova.list(projectId).then(function (response) {
            var plugins = response.body.result ? response.body.result : {};
            $scope.$apply(function () {
              if (plugins[Constant.PLUGIN.INAPP_UPDATER]) {
                // Cordova 6.5 and under
                $scope.inAppUpdaterPlugin = plugins[Constant.PLUGIN.INAPP_UPDATER];
              } else if (plugins[Constant.PLUGIN.INAPP_UPDATER_CORDOVA7]) {
                // Cordova 7.1+
                $scope.inAppUpdaterPlugin = plugins[Constant.PLUGIN.INAPP_UPDATER_CORDOVA7];
              } else {
                $scope.inAppUpdaterPlugin = {};
              }
            });
          });
        }
      });

      $scope.getProjectSettings();
    };

    $scope.getProjectSettings = function () {
      $q.when(MonacaApi.Ide.Project.getProjectSetting(projectId)).then(function (response) {
        return response.body.result ? response.body.result : {};
      }).then(function (result) {
        return $scope.initProfiles(result);
      }).then(function () {
        return $scope.checkBuildSettings();
      }).catch(function (error) {
        $scope.buildProblems.push({
          key: 'error_messages',
          value: [error.body.message]
        });
      });
    };

    $scope.initProfiles = function (result) {
      return {};
    };

    $scope.createBuildParameters = function () {
      return {};
    };

    $scope.subscribeBuildSettings = function () {
      let eventName;
      if ($scope.platform === 'android') {
        eventName = 'android-build-settings-update';
      } else if ($scope.platform === 'ios') {
        eventName = 'ios-build-settings-update';
      } else {
        return;
      }

      PubSub.subscribe(eventName, $scope.getProjectSettings);
    };

    $scope.checkBuildSettings = function () {
      var params = $scope.createBuildParameters();

      // Hack: Just merged from prod_monaca.
      $q.when(MonacaApi.Ide.Project.getBuildEnvironmentSetting(projectId)).then((buildEnvResponse) => {
        if ($scope.purpose === 'release') {
          $scope.androidPackageType = buildEnvResponse && buildEnvResponse.body && buildEnvResponse.body.result && buildEnvResponse.body.result.android &&
              buildEnvResponse.body.result.android.package_type.filter(x => x.enabled)[0];
        }
      });

      const purposeFilterRules = {
        // keys that are allowed only if the $scope.purpose === 'release',
        release: [
          'xcode_version_lt_10_1_warning',
          'xcode_version_gte_10_2_and_legacy_splash_screen_type_warning',
          'can_release_build'
        ],
        // keys that are allowed only if the $scope.purpose === 'debug',
        debug: []
        // keys that aren't included in release or debug are considered as allowed everywhere
      };

      /**
       * We have to filter out the warnings and errors by their purposes still in the controller.
       * If a key is specified in purposeFilterRules for the current purpose
       * or there's no rule specified for the key at all then we can return it and therefore we display it.
       * Otherwise we have to filter it out from buildWarnings and buildErrors.
       */
      const purposeFilter = key =>
        (purposeFilterRules[$scope.purpose] && purposeFilterRules[$scope.purpose].includes(key)) ||
        (!purposeFilterRules.debug.includes(key) && !purposeFilterRules.release.includes(key));

      return $q.when(MonacaApi.Ide.Build.canBuildApp(projectId, $scope.platform, $scope.purpose, params)).then(function (response) {
        var result = response.body.result || {};
        let keys = Object.keys(result);

        /**
         * We should not have any further conditions in the template in ng-if -s,
         * because the visibility of the warning and error panels are depending on $scope.buildWarnings.length
         * and on $scope.buildErrors.length.
         * We have to apply all the filtering here
         */

        $scope.buildProblems = keys
          .filter(key => !key.includes('warning'))
          .filter(key => purposeFilter(key))
          .map(key => ({
            key: key,
            value: result[key]
          }));

        $scope.buildWarnings = keys
          .filter(key => key.includes('warning') && result[key])
          .filter(key => purposeFilter(key))
          .map(key => ({
            key: key,
            value: result[key]
          }));

        // We should not have any further filtering conditions, see the comment above

        $scope.canBuild = result.can_build || false;
      });
    };

    $scope.changeTab = function (type, purpose) {
      $scope.type = type;
      if (purpose) {
        $scope.tab[type] = purpose;
      } else {
        purpose = $scope.tab[type];
      }
      $scope.purpose = purpose;
      $scope.buildProblems = [];
      $scope.buildWarnings = [];
      $scope.checkBuildSettings();
    };

    $scope.build = function () {
      $scope.building = true;
      $scope.password_error = null;
      var buildParams = {
        platform: $scope.platform,
        purpose: $scope.purpose // Build type
      };

      // merge params created by each platforms
      buildParams = Object.assign(buildParams, $scope.createBuildParameters());

      // Localkitとprotoから呼び出された場合は同じウィンドウでビルド結果ページを開く
      MonacaApi.Ide.Build.build(projectId, buildParams).then(function (response) {
        $scope.building = false;
        if (window.location.href.indexOf('/build/') > -1) {
          window.location.href = `/build/${projectId}/build-result/${response.body.result.queue_id}`;
        } else {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: response.body.result.queue_id,
              title: gettextCatalog.getString('Build Results'),
              icon: 'settings',
              templateUrl: 'build/BuildResult.html'
            }
          });
        }
        return response;
      }).catch(function (error) {
        $scope.building = false;
        var message = error.body.message || gettextCatalog.getString('Failed to upload file.');
        if (error.status === 422) {
          $scope.password_error = gettextCatalog.getString('Password is incorrect.');
          PubSub.publish(Constant.EVENT.BODY_CLICKED);
        } else {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: message
          });
        }
      });
    };
  }]);

;angular.module('monacaIDE').controller('BuildHistoryController', [
  '$scope',
  '$uibModal',
  'BuildService',
  'Constant',
  'PubSub',
  'gettextCatalog',
  '$routeParams',
  'ProjectFactory',
  function ($scope, $modal, BuildService, Constant, PubSub, gettextCatalog, $routeParams, ProjectFactory) {
    var START_COUNTER = 3;
    var LAST_INCREMENT = 1;
    var INTERVAL = 6000;
    var showUpgradeDialog = false;
    var platforms = ['android', 'ios', 'winrt', 'pwa', 'custom', 'electron_linux', 'electron_macos', 'electron_windows'];

    this.historyCollection = [];
    this.isGenericProject = ProjectFactory.isGenericProject();
    this.platform = '';
    this.totalItemCounts = {
      total: 0
    };
    $scope.showElectronMacOsBuild = ProjectFactory.showElectronMacOsBuild();
    $scope.showElectronLinuxBuild = ProjectFactory.showElectronLinuxBuild();

    $scope.hasBuildService = function (platform) {
      if (!platform) {
        return false;
      } else {
        return ProjectFactory.hasBuildService(platform);
      }
    };

    $scope.updateComment = function (historyItem) {
      if (!historyItem) {
        return false;
      }

      var projectId = window.config.projectId || $routeParams.projectId;
      var queueId = historyItem.id;

      historyItem.$pendingComment = true;
      historyItem.$commentError = false;

      MonacaApi.Ide.Build.updateComment(projectId, queueId, historyItem.comment)
        .then(function () {
          historyItem.$commentError = false;
          historyItem.$editingComment = false;
        })
        .catch(function (error) {
          historyItem.$commentError = (error.body && error.body.message) || gettextCatalog.getString('The comment could not be saved');
        })
        .finally(function () {
          historyItem.$pendingComment = false;
        });
    };

    this.isBuildFinished = function (status) {
      return ['finish', 'fail', 'cancel', 'kill', 'ios-publish-finish', 'ios-publish-fail'].indexOf(status) > -1;
    };

    function createLogUrl (history) {
      return [
        window.config.monacaAppHost,
        window.MonacaApi.Config.getLanguage(),
        'services',
        window.config.projectId,
        history.platform,
        'build',
        history.id
      ].join('/') + '?hide_sidebar=1';
    }

    this.anyHistoryItemIsBeingEdited = function () {
      return this.historyCollection.some(i => i.$editingComment);
    };

    function fetchList () {
      if (this.anyHistoryItemIsBeingEdited()) {
        // skip refresh when an item is being edited
        // because list refresh aborts edit state and
        // reverts edited comment text to original
        return;
      }
      BuildService.fetchLogList({
        maxnum: (START_COUNTER * LAST_INCREMENT),
        count: 1
      }).then((response) => {
        platforms.forEach(platform => {
          this.totalItemCounts[platform] = response.result[platform].total;
          this.totalItemCounts.total += response.result[platform].total;
        });
        this.historyCollection = [].concat(
          response.result.android.items,
          response.result.ios.items,
          response.result.winrt.items,
          response.result.pwa.items,
          response.result.custom.items,
          response.result.electron_linux.items,
          response.result.electron_macos.items,
          response.result.electron_windows.items
        );
        moment.locale(window.MonacaApi.Config.getLanguage()); // moment got stuck in Japanese for some reason
        for (var history in this.historyCollection) {
          var finishedAt = window.moment(this.historyCollection[history].finished_at);
          this.historyCollection[history].finishedAt = (window.MonacaApi.Config.getLanguage() === 'en') ? finishedAt.format('MMM D HH:mm:ss') : finishedAt.format('YYYY年M月D日 HH:mm:ss');

          var createdAt = window.moment(this.historyCollection[history].created_at);
          // 'createdAt' is UTC + 540m (the Japanese UTC differences)
          // So reset createdAt to be UTC by subtract method. And then add User local pc timezoneOffsest
          this.historyCollection[history].ellapsed = createdAt.subtract(new Date().getTimezoneOffset() + 540, 'm').fromNow();
          this.historyCollection[history].logUrl = createLogUrl(this.historyCollection[history]);
        }
      }).catch((e) => {
        switch (e.status) {
        case 401:
          if (!showUpgradeDialog) {
            $modal.open({
              templateUrl: 'build/BuildUpgradeConfirmDialog.html',
              controller: 'BuildUpgradeConfirmDialogController',
              windowClass: 'confirm-window',
              resolve: {
                '$parent': function () {
                  return $scope.$parent;
                }
              }
            });
            showUpgradeDialog = true;
          }
          break;
        }
      });
    }

    // Get list instantly and then start interval.
    fetchList.call(this);
    this.fetchIntervalId = setInterval(fetchList.bind(this), INTERVAL);

    this.fetchMoreHistory = function () {
      // Stop the existing interval
      clearInterval(this.fetchIntervalId);

      // Update list count, get list instantly, and then restart interval.
      LAST_INCREMENT++;
      fetchList.call(this);
      this.fetchIntervalId = setInterval(fetchList.bind(this), INTERVAL);
    };

    this.showDetails = function (history) {
      if (window.location.href.indexOf('/build/') > -1) {
        window.location.href = `/build/${$routeParams.projectId}/build-result/${history.id}`;
      } else {
        PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
          open: true,
          componentState: {
            id: history.id,
            title: gettextCatalog.getString('Build Results'),
            icon: 'settings',
            templateUrl: 'build/BuildResult.html'
          }
        });
      }

      return true;
    };

    this.downloadLog = function (history) {
      window.open(`${history.build_log_url}?api_token=${window.config.apiToken}`);
    };

    this.onClickDelete = function (historyId) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm Deletion');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure you want to delete this build history?');
          }
        }
      }).result.then(function () {
        BuildService.deleteHistory(historyId).then(function () {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('The selected build history has been deleted successfully.')
          });
        });
      });
    };

    this.hasMore = function () {
      return (this.platform ? this.totalItemCounts[this.platform] : this.totalItemCounts.total) > (START_COUNTER * LAST_INCREMENT);
    };

    this.beforeClose = function () {
      clearInterval(this.fetchIntervalId.bind(this));
      this.$destroy();
    };

    $scope.$on('$destroy', function () {
      clearInterval(this.fetchIntervalId);
    }.bind(this));

  }]);

;angular.module('monacaIDE').controller('BuildEnvironmentSettingsController', [
  '$scope',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'ProjectService',
  'ProjectFactory',
  'EnvironmentFactory',
  'CommonFunctionService',
  function ($scope, PubSub, Constant, gettextCatalog, ProjectService, ProjectFactory, EnvironmentFactory, CommonFunctionService) {
    $scope.environments = null;
    $scope.selectedEnvironments = null;
    $scope.loading = true;
    $scope.buildFlagInput = {
      'debug': null,
      'release': null
    };
    $scope.buildFlagPlaceHolder = gettextCatalog.getString('Input the build flag');
    const supportedPlatforms = ['ios', 'android', 'electron'];
    const supportedBuildType = ['debug', 'release'];
    $scope.supportedBuildType = supportedBuildType;
    $scope.currentPlatform = supportedPlatforms[0];
    // const UIkit = window.UIkit;

    const assignEnv = function (platform, field, value) {
      if (!$scope.selectedEnvironments) $scope.selectedEnvironments = [];
      if (!$scope.selectedEnvironments[platform]) $scope.selectedEnvironments[platform] = [];
      $scope.selectedEnvironments[platform][field] = value;
    };

    $scope.formatBuildTypeText = function (text) {
      if (text === 'debug') return gettextCatalog.getString('Debug');
      return gettextCatalog.getString('Release');
    };

    $scope.formatAndroidPackageType = function (packageType) {
      if (packageType === 'bundle') return gettextCatalog.getString('App Bundle');
      return gettextCatalog.getString('APK');
    };

    $scope.buildFlagInputOnKeyUp = function (event, buildType) {
      if (!event || !buildType) return;
      if (event.keyCode === 13) {
        event.preventDefault();
        $scope.addBuildFlag(buildType);
      }
    };

    $scope.addBuildFlag = function (buildType) {
      if (!buildType || supportedBuildType.indexOf(buildType) < 0) return;
      if (!$scope.buildFlagInput || !$scope.buildFlagInput[buildType]) return;
      const platform = 'ios';
      const field = 'buildFlag';
      const flag = $scope.buildFlagInput[buildType].trim();
      if (!$scope.environments[platform][field]) $scope.environments[platform][field] = {};
      if (!$scope.environments[platform][field][buildType]) $scope.environments[platform][field][buildType] = [];
      // scan for duplicate
      if ($scope.environments[platform][field][buildType].indexOf(flag) >= 0) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('This build flag is already existed!')
        });
        return;
      }
      $scope.environments[platform][field][buildType].push(flag);
      $scope.buildFlagInput[buildType] = null;
      $scope.environments[platform][field]['modified'] = true;
      assignEnv(platform, field, $scope.environments[platform][field]);
    };

    $scope.removeBuildFlag = function (buildType, index) {
      if (!buildType || supportedBuildType.indexOf(buildType) < 0) return;
      const platform = 'ios';
      const field = 'buildFlag';
      if (!$scope.environments[platform][field] ||
        !$scope.environments[platform][field][buildType] ||
        !$scope.environments[platform][field][buildType].length
      ) return;
      if (index < 0 || index >= $scope.environments[platform][field][buildType].length) return;
      $scope.environments[platform][field][buildType].splice(index, 1);
      $scope.environments[platform][field]['modified'] = true;
      assignEnv(platform, field, $scope.environments[platform][field]);
    };

    $scope.dSYMSettingChanged = function () {
      assignEnv('ios', 'dSYM', $scope.environments.ios.dSYM);
    };

    $scope.selectPlatform = function (platform) {
      if (!platform || supportedPlatforms.indexOf(platform) < 0) return;
      $scope.currentPlatform = platform;
    };

    $scope.selectEnvironment = function (platform, field, value) {
      if (
        (!platform || !field || !value) ||
        (
          !$scope.environments[platform][field] ||
          !$scope.environments[platform][field].length ||
          $scope.environments[platform][field].length <= 1
        )
      ) {
        return;
      }

      $scope.environments[platform][field].map((config, index) => {
        if (config.version === value.version) {
          $scope.environments[platform][field][index].enabled = true;
          assignEnv(platform, field, value);
        } else {
          $scope.environments[platform][field][index].enabled = false;
        }
      });

    };

    $scope.save = function () {
      if (!$scope.selectedEnvironments) return;
      $scope.loading = true;
      ProjectService.saveBuildEnvironmentSetting(window.config.projectId, {
        ios: $scope.selectedEnvironments['ios'],
        android: $scope.selectedEnvironments['android'],
        electron: $scope.selectedEnvironments['electron']
      })
        .then(resp => {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Successfully saved')
          });
          if ($scope.selectedEnvironments['ios'] && $scope.selectedEnvironments['ios']['buildFlag'] && $scope.selectedEnvironments['ios']['buildFlag']['modified']) {
            if (window.location.href.indexOf('/build/') > -1) {
              // Build Page
              // DO NOTHING
            } else {
              // IDE
              PubSub.publish(Constant.EVENT.TREE_UPDATED);
              PubSub.publish(Constant.EVENT.UPDATE_BUILD_FLAGE);
            }
          }
          $scope.loading = false;
          $scope.selectedEnvironments = null;
          PubSub.publish('android-build-settings-update');
          PubSub.publish('ios-build-settings-update');
        })
        .catch(err => {
          console.error(err);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString('Failed to save')
          });
          $scope.loading = false;
        });
    };

    let resizeObserver = null;
    try {
      /**
       * Handle Media Query
       */
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const buildFlagFlexContainer = document.getElementById('build-flag-flex-container');
          const buildFlagContainer = document.getElementById('build-flag-container');
          if (entry.target === buildFlagContainer) {
            if (entry.contentRect.width && entry.contentRect.width <= 540) {
              buildFlagFlexContainer.classList.add('uk-flex-column');
            } else {
              buildFlagFlexContainer.classList.remove('uk-flex-column');
            }
          }
        }
      });
    } catch (e) {
      resizeObserver = null;
      console.log('ResizeObserver is not supported', e);
    }

    $scope.init = function () {
      $scope.loading = true;
      ProjectService.getBuildEnvironmentSetting(window.config.projectId)
        .then(env => {
          $scope.environments = env;
          $scope.loading = false;
          const buildFlagContainer = document.getElementById('build-flag-container');
          if (resizeObserver) resizeObserver.observe(buildFlagContainer);
        })
        .catch(err => {
          console.error(err);
          console.log('use default build setting environment');
          $scope.loading = false;
          const buildFlagContainer = document.getElementById('build-flag-container');
          if (resizeObserver) resizeObserver.observe(buildFlagContainer);
        });

      $scope.canShowDSYM = ProjectFactory.isGreaterOrEqualCordovaVersion(10) && EnvironmentFactory.showDsymSetting();
      $scope.canChangeDSYM = window.config.client.service.has_dsym_download;
    };

    $scope.htmlspecialchars = function (text) {
      return CommonFunctionService.htmlspecialchars(text);
    };

  }
]);

;angular.module('monacaIDE').controller('BuildResultController', [
  '$scope',
  '$timeout',
  '$uibModal',
  '$q',
  'WebSocketHandlerService',
  'gettextCatalog',
  'Dialog',
  'EnvironmentFactory',
  'ProjectFactory',
  'DeployServiceFactory',
  'BuildService',
  'PubSub',
  'UserFactory',
  'Constant',
  '$routeParams',
  '$element',
  '$sce',
  'CommonFunctionService',
  function ($scope, $timeout, $modal, $q, WebSocketHandlerService, gettextCatalog, Dialog, EnvironmentFactory, ProjectFactory, DeployServiceFactory, BuildService, PubSub, UserFactory, Constant, $routeParams, $element, $sce, CommonFunctionService) {
    var projectId = window.config.projectId || $routeParams.projectId;
    var queueId = window.config.queueId || $routeParams.queueId;
    var refreshTimer = null;

    moment.locale(window.MonacaApi.Config.getLanguage());

    $scope.DeployServiceFactory = DeployServiceFactory;
    // list of deploy services
    $scope.deployServices = [{
      name: 'Appetize.io',
      service_type: 'AppetizeIo',
      app_logo: '/img/services/logo_large_appetizeio.png'
    },
    {
      name: 'DeployGate',
      service_type: 'DeployGate',
      app_logo: '/img/services/logo_large_deploygate.png'
    },
    {
      name: 'Firebase',
      service_type: 'Firebase',
      app_logo: '/img/services/logo_large_firebase.png'
    },
    {
      name: 'HockeyApp',
      service_type: 'HockeyApp',
      app_logo: '/img/services/logo_large_hockeyapp.png'
    }
    ];
    $scope.showIosAppUploader = false;
    $scope.showAndroidAppUploader = false;
    $scope.showDeployService = false;
    $scope.showSecurityService = false;

    $scope.is_private = false;
    $scope.public_build_result_enabled = EnvironmentFactory.service.public_build_result || false;
    $scope.is_result_public = false;
    $scope.sharedBuildResultUrl = '';
    $scope.comboboxLabel = [{ n: gettextCatalog.getString('Disabled'), v: false }, { n: gettextCatalog.getString('Enabled'), v: true }];
    $scope.queue = null;
    $scope.buildLog = '';
    $scope.cordovaVersion = ProjectFactory.getCurrentCordovaVersion();
    $scope.showBuildLog = false;
    $scope.isReactNative = ProjectFactory.getFramework() === 'react-native';
    $scope.isCordova = !ProjectFactory.getFramework() || ProjectFactory.getFramework() === 'cordova';
    $scope.isGeneric = ProjectFactory.isGenericProject();
    $scope.supportLink = window.MonacaApi.Config.getLanguage() === 'ja' ?
      'https://ja.monaca.io/support/technical/index.html' :
      'https://monaca.io/support/technical/index.html';
    $scope.showProjectVersion = !ProjectFactory.isGenericProject();
    $scope.buildTaskResults = [];
    $scope.showArtifacts = [];
    $scope.showReport = [];
    $scope.showAggregateReport = [];
    $scope.ownedDeployServices = [];
    $scope.memo = {
      pending: false,
      error: false,
      comment: null,
      editing: false,
      openEditor: function () {
        if (!$scope.queue) {
          return false;
        }

        $scope.memo.editing = true;
        $scope.memo.comment = $scope.queue.comment;
      },
      save: function () {
        $scope.memo.pending = true;
        $scope.memo.error = false;

        MonacaApi.Ide.Build.updateComment(projectId, queueId, $scope.memo.comment)
          .then(function () {
            $scope.memo.editing = false;
            $scope.queue.comment = $scope.memo.comment;
          })
          .catch(function (error) {
            $scope.memo.error = (error.body && error.body.message)
              || gettextCatalog.getString('The comment could not be saved');
          })
          .finally(function () {
            $scope.memo.pending = false;
          });
      }
    };

    $scope.toggleArtifacts = (buildTaskID) => {
      $scope.showArtifacts[buildTaskID] = !$scope.showArtifacts[buildTaskID];
    };

    $scope.toggleReport = (buildTaskID) => {
      $scope.showReport[buildTaskID] = !$scope.showReport[buildTaskID];
    };

    $scope.toggleAggregateReport = (buildTaskID) => {
      $scope.showAggregateReport[buildTaskID] = !$scope.showAggregateReport[buildTaskID];
    };

    function getQRCodeURL (project_id, queue_id, size) {
      if (project_id && queue_id) {
        return window.config.client.host.ide_host + '/api/project/' + project_id + '/downloadQR/' + queue_id + '?size=' + size;
      }
      return null;
    }

    $scope.trustAsResourceUrl = function (url) {
      return $sce.trustAsResourceUrl(url);
    };

    $scope.init = function () {
      $q.all([
        UserFactory.loading
      ]).then(() => {
        setTimeout(() => { // wait for parentElement
          if (!queueId) { // if queueId is undefined then we're in a GoldenLayout tab and the IDE was refreshed. We can get the ID from the parentElement
            queueId = $element[0].parentElement.id.replace('mn-gl-', '');
          }
          var tmp = queueId.split('_');
          $scope.rawQueueId = tmp[0];
          $scope.updateQueueInfo();
          initWebSocket($scope.rawQueueId);
          refreshTimer = setInterval($scope.updateQueueInfo, 4000);
        });
      });
    };

    $scope.ownedDeployServiceFilter = function (service) {
      if (!service || !$scope.queue) {
        return false;
      }

      return DeployServiceFactory.ownedCollection.every(
        function (ownedDeployService) {
          return ownedDeployService.service_type !== service.service_type;
        }
      );
    };

    $scope.deployServiceCustomFilter = function (service) {
      if (!service || !$scope.queue) {
        return false;
      }
      var serviceKey = service.service_type + 'BackendService';
      var serviceData = DeployServiceFactory.serviceCollection[serviceKey];

      return serviceData ? serviceData.supported_build_platforms.indexOf($scope.queue.platform) > -1 : false;
    };

    $scope.convertServiceLargeImgToSmall = function (url) {
      return url.replace('_large_', '_small_');
    };

    $scope.sendToDeployService = function (service) {
      if (service.manualProcessStatus === 'process') {
        return false;
      }

      $modal.open({
        templateUrl: 'build/dialogs/SendManualDeployServiceRequest.html',
        controller: 'DeployServiceRequestController',
        resolve: {
          service: service,
          queueId: function () {
            return queueId;
          }
        }
      });
    };

    $scope.sendToApkCheckerService = function () {
      var href = window.config.client.host.app_host + '/' + window.MonacaApi.Config.getLanguage() + '/security_checker/' + projectId + '/' + queueId;
      $modal.open({
        templateUrl: 'build/dialogs/ConfirmApkCheckDialog.html',
        controller: 'ConfirmApkCheckDialogController',
        resolve: {
          link: function () {
            return href;
          }
        }
      });
    };

    $scope.openDeployLogs = function ($event, service) {
      $event.preventDefault();
      $event.stopPropagation();
      if (service.manualProcessStatus !== 'failed') {
        return false;
      }

      $modal.open({
        templateUrl: 'build/dialogs/ViewManualDeployServiceLog.html',
        controller: 'DeployServiceLogController',
        resolve: {
          service: service
        }
      });

      return false;
    };

    $scope.updateQueueInfo = function () {
      MonacaApi.Ide.Project.getBuildQueue(projectId, queueId).then(function (response) {
        var queue = response.body.result || {};
        $scope.is_private = !queue.is_public;
        $scope.is_result_public = !!queue.is_result_public;
        $scope.sharedBuildResultUrl = window.config.client.host.app_host + '/' + window.MonacaApi.Config.getLanguage() + '/build-result/' + queueId;

        if (queue.platform === 'ios' && queue.type === 'release') {
          $scope.showIosAppUploader = true;
        }

        if (queue.platform === 'android') {
          if (window.config.client.service && window.config.client.service.security_checker) {
            $scope.showSecurityService = true;
          }
          if (EnvironmentFactory.shouldShowAndroidAppUploader() && queue.type === 'release') {
            $scope.showAndroidAppUploader = true;
          }
        }

        var finishedAt = moment(queue.finished_at);
        queue.label = createQueueLabel(queue);
        queue.ellapsed = finishedAt.fromNow();
        queue.finishedAtLabel = (window.MonacaApi.Config.getLanguage() === 'en') ? finishedAt.format('MMM D HH:mm:ss') : finishedAt.format('YYYY年M月D日 HH:mm:ss');
        queue.build_log_url += `?api_token=${window.config.apiToken}`;
        $scope.queue = queue;

        DeployServiceFactory.fetch().then(function () {
          $scope.ownedDeployServices = DeployServiceFactory.ownedCollection;
        });

        $scope.$apply();

        if ($scope.isBuildFinishStatus(queue.status)) {
          $scope.canShowQrCodeUrl = $scope.canShowQR($scope.queue);
          if ($scope.canShowQrCodeUrl) {
            $scope.qrCodeUrl = getQRCodeURL(projectId, queue.raw_id, 3);
          } else {
            $scope.qrCodeUrl = null;
          }
          var dsymBuildTypes = ['debug', 'adhoc', 'release', 'inhouse'];
          var userPlan = UserFactory.getSubscriptionInfo().toLowerCase();
          var dsymPlans = [Constant.PLAN.BUSINESS, Constant.PLAN.ENTERPRISE];
          var isDsymGenerated = !!queue.dsym_url;
          $scope.canDownloadDsym = dsymBuildTypes.includes(queue.type)
            && queue.platform === 'ios'
            && isDsymGenerated
            && dsymPlans.includes(userPlan)
            && CommonFunctionService.versionCompare(queue.cordova_version, '10.0') >= 0;

          MonacaApi.Ide.Build.result(projectId, queueId).then(function (response) {
            $scope.buildResult = response.body.result || {};
            $scope.buildLog = $scope.buildResult ? $scope.buildResult.build_log : '';

            // Try to fetch build queue info until the build log is ready. (It sometimes takes time to store build log.)
            if ($scope.buildLog) {
              clearInterval(refreshTimer);
              closeWebSocket();
              refreshTimer = null;
            }

            $scope.buildLogLines = getHighlightedBuildLog();
            $scope.publishLog = $scope.buildResult ? $scope.buildResult.ios_publish_log : '';
            $scope.publishLogLines = getHighlightedPublishLog();
            $scope.showSendAppIcon = $scope.canShowSendAppIcon($scope.queue.platform, $scope.queue.type);
            $scope.buildTaskResults = $scope.buildResult ? $scope.buildResult.build_task_result : [];
            $scope.showArtifacts = [];
            $scope.showReport = [];
            $scope.showAggregateReport = [];
            $scope.publishQueues = $scope.buildResult ? $scope.buildResult.publish_queues : [];
            $scope.releaseQueue = $scope.buildResult ? $scope.buildResult.release_queue : null;
            if ($scope.buildTaskResults) { // only custom(hitachi) build has build task result
              $scope.buildTaskResults.forEach(buildTaskResult => {
                // Parse outputFile URL if artifacts exist
                buildTaskResult.parsed = {};
                if (buildTaskResult.artifact && buildTaskResult.artifact !== '') {
                  var outputFlieUrl = document.createElement('a');
                  outputFlieUrl.href = buildTaskResult.artifact; // Example: https://a-5d1-5d1f6d85e78885ac1d0638ec-5d1485794a551.example.com/sub/d.html

                  buildTaskResult.parsed.artifactServerOrigin = outputFlieUrl.protocol + '//' + outputFlieUrl.host;
                  buildTaskResult.parsed.outputFliePath = outputFlieUrl.pathname.match(/^\/(.*)$/)[1]; // '/sub/d.html' -> 'sub/d.html'
                } else {
                  buildTaskResult.parsed.artifactServerOrigin = null;
                  buildTaskResult.parsed.outputFliePath = null;
                }
                if (buildTaskResult.artifact_structure && buildTaskResult.artifact_structure !== '') {
                  buildTaskResult.parsed.artifactStructure = JSON.parse(buildTaskResult.artifact_structure);
                } else {
                  buildTaskResult.parsed.artifactStructure = null;
                }

                $scope.showArtifacts[buildTaskResult.task_id] = false;
                $scope.showReport[buildTaskResult.task_id] = false;
                $scope.showAggregateReport[buildTaskResult.task_id] = false;
              });
            }
            $scope.$apply();
          });
        }
      });
    };

    $scope.getReportResult = function (reportResult) {
      if (!reportResult || !reportResult['detail']) return null;
      const userId = UserFactory.getUserId();
      const result = reportResult['detail'].filter(report => report['user_id'] === userId)[0];
      return result;
    };

    $scope.getBuildResultErrorMessage = function (message) {
      let msg = '';
      switch (message) {
      case 'Provisioning File is missing':
        msg = gettextCatalog.getString('The provisioning file is missing. Try running the build with Monaca IDE first.');
        break;
      case 'KeyStore Alias is missing':
        msg = gettextCatalog.getString('KeyStore Alias is missing. Try running the build with Monaca IDE first.');
        break;
      default:
        msg = message;
      }

      return `- ${msg}`;
    };

    $scope.isBuildFinishStatus = function (status) {
      return [
        'finish',
        'fail',
        'cancel',
        'kill',
        'ios-publish-finish',
        'ios-publish-fail'
      ].indexOf(status) >= 0;
    };

    $scope.isSuccessBuild = function (status) {
      return [
        'finish',
        'ios-publish-finish'
      ].indexOf(status) > -1;
    };

    $scope.isIosPublishBuild = function (status) {
      if (status === 'ios-publish-fail' || status === 'ios-publish-finish') {
        return true;
      }
      return false;
    };

    $scope.canShowQR = function (queue) {
      const platform = queue.platform;
      const purpose = queue.type;
      const packageType = queue.package_type;
      if (
        (purpose === 'inapp_updater') ||
        (platform === 'ios' && purpose === 'simulator') ||
        (platform === 'ios' && purpose === 'release') ||
        (platform === 'android' && purpose === 'release' && packageType === 'bundle') ||
        (platform === 'pwa') ||
        (platform === 'electron_macos') ||
        (platform === 'electron_linux') ||
        (platform === 'electron_windows') ||
        (platform === 'custom')
      ) {
        return false;
      }
      return true;
    };

    $scope.canShowSendAppIcon = function (platform, purpose) {
      var enableList = {
        'android': ['debug', 'release'],
        'ios': ['adhoc', 'inhouse'],
        'winrt': ['debug', 'release']
      };

      return (enableList[platform] && enableList[platform].includes(purpose)) || false;
    };

    $scope.openQRCodeDialog = function () {
      $modal.open({
        templateUrl: 'build/dialogs/AdHocQRCodeDialog.html',
        controller: 'AdHocQRCodeDialogController',
        resolve: {
          url: function () {
            return $scope.qrCodeUrl;
          },
          queue_id: function () {
            return queueId;
          }
        }
      });
    };

    $scope.openUploaderWindow = function () {
      if ([Constant.PLAN.FREE, Constant.PLAN.EDUCATION].includes(UserFactory.getSubscriptionInfo().toLowerCase())) {
        $scope.errorMessage = gettextCatalog.getString('Upgrade your account to be able to upload your app to AppStore.');
      } else {
        var href = window.config.client.host.app_host + '/' + window.MonacaApi.Config.getLanguage() + '/uploader/' + projectId + '/' + queueId;
        window.open(href);
      }
    };

    $scope.openAndroidUploaderWindow = function () {
      if ([Constant.PLAN.FREE, Constant.PLAN.EDUCATION].includes(UserFactory.getSubscriptionInfo().toLowerCase())) {
        $scope.errorMessage = gettextCatalog.getString('Upgrade your account to be able to upload your app to Play Store.');
      } else {
        var href = window.config.client.host.app_host + '/' + window.MonacaApi.Config.getLanguage() + '/uploader/' + projectId + '/' + queueId;
        window.open(href);
      }
    };

    $scope.openSecurityCheckerWindow = function () {
      var href = window.config.client.host.app_host + '/' + window.MonacaApi.Config.getLanguage() + '/security_checker/' + projectId + '/' + queueId;
      window.open(href);
    };

    $scope.openSendAppDialog = function () {
      Dialog.confirm(
        gettextCatalog.getString('Submit email to your registered email address.')
      ).then(function () {
        MonacaApi.Ide.Build.sendApp(projectId, queueId).then(function () {
          Dialog.alert(
            gettextCatalog.getString('An email has been sent to your account.'),
            gettextCatalog.getString('Success')
          );
        });
      });
    };

    $scope.updateBuildLog = function (res) {
      if (res.data && res.data.queueId) {
        $timeout(function () {
          $scope.buildLog = WebSocketHandlerService.getBuildLog(res.data.queueId);
          $scope.buildLogLines = getHighlightedBuildLog();
        });
      }
    };

    function getHighlightedBuildLog () {
      return highlightLog($scope.buildLog);
    }

    function getHighlightedPublishLog () {
      return highlightLog($scope.publishLog);
    }

    function highlightLog (_log) {
      const log = _log || '';
      const ERR_REGEX = / failed/;
      const WARN_REGEX = /^(?!.*--warning).*(warn(ing)?).*$/i;
      return log.split('\n').map(line => {
        let className = '';
        if (line.match(ERR_REGEX)) {
          className = ' error';
        } else if (line.match(WARN_REGEX)) {
          className = ' warning';
        }
        return {
          className: className,
          text: line
        };
      });
    }

    function createQueueLabel (queue) {
      var label = '';

      // custom build
      if (queue.platform === 'custom') return queue.build_name;

      if ($scope.isIosPublishBuild(queue.status)) {
        return gettextCatalog.getString('iOS App Store Upload');
      }

      switch (queue.platform) {
      case 'ios':
        label = 'iOS';
        break;
      case 'android':
        label = 'Android';
        break;
      case 'winrt':
        label = 'Windows';
        break;
      case 'pwa':
        label = 'PWA';
        break;
      case 'electron_macos':
        label = 'Electron macOS';
        break;
      case 'electron_linux':
        label = 'Electron Linux';
        break;
      case 'electron_windows':
        label = 'Electron Windows';
        break;
      default:
      }

      label += ' ';

      switch (queue.type) {
      case 'debug':
        label += gettextCatalog.getString('Debug Build');
        break;
      case 'debugger':
        label += gettextCatalog.getString('Debugger Build');
        break;
      case 'release':
        label += gettextCatalog.getString('Release Build');
        break;
      case 'adhoc':
        label += gettextCatalog.getString('AdHoc Build');
        break;
      case 'inhouse':
        label += gettextCatalog.getString('In-House Build');
        break;
      case 'inapp_updater':
        label += gettextCatalog.getString('InAppUpdater Build');
        break;
      case 'simulator':
        label += gettextCatalog.getString('Simulator Build');
        break;
      default:
      }

      return label;
    }

    function initWebSocket (rawQueueId) {
      WebSocketHandlerService.connect(window.MonacaApi.Config.getApiToken());
      WebSocketHandlerService.subscribeByQueueId(rawQueueId, $scope.updateBuildLog);
      $scope.buildLog = WebSocketHandlerService.getBuildLog(rawQueueId);
      $scope.buildLogLines = getHighlightedBuildLog();
    }

    function closeWebSocket () {
      WebSocketHandlerService.close();
    }

    $scope.setIsResultPubliclyReadable = function () {
      BuildService.setIsResultPubliclyReadable(queueId, $scope.is_result_public);
    };

    $scope.setIsPubliclyDownloadable = function () {
      BuildService.setIsPubliclyDownloadable(queueId, !$scope.is_private).then(function () {
        // TODO: japanese
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('The publicly downloadable option was changed.')
        });
      });
    };

    $scope.getLabel = (queue) => {
      return createQueueLabel(queue);
    };

    $scope.getEllapsed = (queue) => {
      const finishedAt = moment(queue.finished_at);
      return finishedAt.fromNow();
    };

    $scope.getCreatedAt = (queue) => {
      const finishedAt = moment(queue.finished_at);
      return (window.MonacaApi.Config.getLanguage() === 'en') ? finishedAt.format('MMM D HH:mm:ss') : finishedAt.format('YYYY年M月D日 HH:mm:ss');
    };

    $scope.getQueueRelationTitle = (queue) => {
      if ($scope.isIosPublishBuild(queue.status)) {
        return gettextCatalog.getString('Release Build');
      }
      return gettextCatalog.getString('Publish Builds');
    };

    $scope.shouldShowBuildQueueRelation = () => {
      return (
        $scope.releaseQueue ||
        ($scope.publishQueues && $scope.publishQueues.length)
      );
    };

    $scope.openBuild = function (queue) {
      if (!queue) return false;
      if (window.location.href.indexOf('/build/') > -1) {
        window.location.href = `/build/${$routeParams.projectId}/build-result/${queue.id}`;
      } else {
        PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
          open: true,
          componentState: {
            id: queue.id,
            title: gettextCatalog.getString('Build Results'),
            icon: 'settings',
            templateUrl: 'build/BuildResult.html'
          }
        });
      }
    };

    $scope.getBuildQueueRelations = function (queue) {
      if (!queue) return null;
      if ($scope.isIosPublishBuild(queue.status)) {
        if (!$scope.releaseQueue) {
          return null;
        }
        return [$scope.releaseQueue];
      } else {
        if (!$scope.publishQueues || !$scope.publishQueues.length) {
          return null;
        }
        return $scope.publishQueues;
      }
    };

    $scope.copySharedBuildResultUrl = function () {
      var sharedBuildResultUrlInput = document.querySelector('#shared-build-result-url');
      sharedBuildResultUrlInput.select();
      document.execCommand('copy');
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'success',
        content: 'Copied!'
      });
    };

    $scope.addNewDeployService = function (service) {
      $modal.open({
        templateUrl: 'build/DeployServiceAddDialog.html',
        controller: 'DeployServiceAddDialogController',
        windowClass: 'deploy-service-add-dialog',
        resolve: {
          service: Object.values(DeployServiceFactory.serviceCollection)
            .find(function (deployService) {
              return deployService.name === service.service_type;
            }) || false
        }
      });
    };

    $scope.shouldShowBuildLog = function () {
      return $scope.queue && !$scope.isIosPublishBuild($scope.queue.status) && $scope.buildLog;
    };

    $scope.shouldShowPublishLog = function () {
      return $scope.queue && $scope.isIosPublishBuild($scope.queue.status) && $scope.publishLog;
    };

    $scope.showBuildLogTextArea = function () {
      $scope.showBuildLog = true;
      setTimeout(function () {
        document.getElementById('build-log-area-' + $scope.rawQueueId).scrollIntoView();
      }, 0);
    };

  }
]);

;angular.module('monacaIDE')
  .controller('BuildUpgradeConfirmDialogController', ['$scope', '$uibModalInstance', '$sce',
    function ($scope, $modalInstance, $sce) {
      $scope.ok = function () {
        $modalInstance.close(true);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss(false);
      };
    }]);

;angular.module('monacaIDE').controller('ContinuousIntegrationController',
  ['$scope', '$uibModal', '$templateCache', 'EnvironmentFactory', 'PubSub', '$q', 'gettextCatalog', 'Dialog', '$uibModal', 'ContinuousIntegrator', 'DeployServiceFactory', 'Constant', 'ProjectFactory',
    function ($scope, $uibModal, $templateCache, EnvironmentFactory, PubSub, $q, gettextCatalog, Dialog, $modal, ContinuousIntegrator, DeployServiceFactory, Constant, ProjectFactory) {
      $scope.EnvironmentFactory = EnvironmentFactory; // Allow access from template
      $scope.ProjectFactory = ProjectFactory;

      $scope.loadData = () => {
        $scope.loading = true;
        $scope.error = false;

        /**
     * Fetches the CI Configuration page data and updates the defaults.
     */
        $q.all([
          ContinuousIntegrator.fetch(),
          DeployServiceFactory.fetchOwnedCollection()
        ]).then(([ciResponse, deployServiceResponse]) => {
          $scope.ciResponse = ciResponse;

          $scope.loading = false;
          $scope.error = false;
        }).catch((errorResponse) => {
          $scope.loading = false;
          $scope.error = errorResponse.body.result.errorType;
          $scope.ciResponse = errorResponse.body.result;
        });
      };

      /**
   * Open dialog for editing/creating a CI config.
   *
   * @param ciConfig Specify CI config to edit. If this argument is empty, a new CI config will be created.
   */
      $scope.openCiConfig = (ciConfig) => {
        const oldCiConfig = Object.assign({}, ciConfig);
        // if (tmpBatchBuild && tmpBatchBuild.buildTasks && tmpBatchBuild.buildTasks.length) {
        //   tmpBatchBuild.buildTasks = CustomBuildSettingsFactory.getBuildTasks(tmpBatchBuild, $scope.allBuildTasks);
        // }
        $uibModal.open({
          template: $templateCache.get('build/ContinuousIntegrationConfigDialog.html'),
          controller: 'ContinuousIntegrationConfigDialogController',
          controllerAs: 'configDialogCtrl',
          windowClass: 'continuous-integration-config-dialog',
          backdrop: 'static',
          resolve: {
            oldCiConfig: () => {
              return oldCiConfig;
            }
            // availableBuildTasks: () => {
            //   return $scope.buildTasks || [];
            // },
            // batchBuilds: () => {
            //   return $scope.batchBuilds || [];
            // }
          }
        });
      };

      $scope.getTriggerApiUrl = (ciConfig) => {
        return `${window.config.client.host.api_host}/v1/ci/${window.config.projectId}/${ciConfig.id}/start`;
      };

      /**
   * Open the VCS configuration page if redirection has been approved by the user.
   */
      $scope.configureVcs = function () {
        window.open($scope.ciResponse.url.vcs_configure);
      };

      /**
   * Open the purchase plan details page if redirection has been approved by the user.
   */
      $scope.planDetails = function () {
        window.open($scope.ciResponse.url.plan_upgrade);
      };

      /**
   * Redirects to the plan upgrade page if redirection has been approved by the user.
   */
      $scope.upgradePlan = function () {
        var page_title = gettextCatalog.getString('Upgrade Plan');

        if (!$scope.ciResponse.url.plan_upgrade) {
          return redirectFail(page_title);
        }

        return redirectAwayFromCloud(
          $scope.ciResponse.url.plan_upgrade,
          page_title
        );
      };

      /**
   * Confirmation dialog requesting to redirect away from the Monaca Cloud IDE
   *
   * @param string page
   * @param string page_title
   * @returns {*}
   */
      function redirectAwayFromCloud (page, page_title) {
        return Dialog.confirm(gettextCatalog.getString(
          'You are about to be redirected away from the Monaca Cloud IDE. Would you like to continue to the "{{page_title}}" page?',
          {
            page_title: page_title
          }
        ), gettextCatalog.getString('Leaving Cloud IDE')).then(function (allowRedirect) {
          if (allowRedirect) {
            window.location = page;
          }
        });
      }

      /**
   * Alert dialog notifying that the redirect request attempt was unable to process.
   *
   * @param page_title
   * @returns {*}
   */
      function redirectFail (page_title) {
        return Dialog.alert(gettextCatalog.getString(
          'An error occurred while attempting to redirect you to the "{{page_title}}" page.',
          {
            page_title: page_title
          }
        ), gettextCatalog.getString('Redirection Failure'));
      }

      /**
   * Opens the Deploy Services settings tab.
   */
      $scope.loadDeployServices = function () {
        var scope = angular.element(document.getElementById('settings')).scope();
        scope.setPage(Constant.PAGE_DEPLOY_SERVICE);
      };

      /**
   * Open Monaca VCS Docs
   */
      $scope.openSetupVcsDoc = function () {
        window.open($scope.docsUrl.setup_vcs);
      };

      PubSub.subscribe(Constant.EVENT.CI_CONFIGS_RELOAD, () => {
        $scope.loading = true;

        ContinuousIntegrator.fetch()
          .then(ciResponse => {
            $scope.ciResponse = ciResponse;
            $scope.loading = false;
          })
          .catch(err => {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to reload CI configs.')
            });
            console.log(err);
          });
      });

      $scope.loadData();
    }]);

;angular.module('monacaIDE').controller('ContinuousIntegrationJsonErrorDialogController', ['$scope', '$window', 'title', '$sce', 'message', function ($scope, $window, title, $sce, message) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);

  $scope.gotoCiJsonDocs = function () {
    $window.open($scope.docsUrl.ci_json_example);
  };
}]);

;angular.module('monacaIDE').controller('ContinuousIntegrationConfigDialogController', [
  '$scope',
  '$q',
  '$uibModal',
  '$templateCache',
  'EnvironmentFactory',
  'oldCiConfig',
  'ProjectService',
  'ProjectFactory',
  'DeployServiceFactory',
  'ContinuousIntegrator',
  'Dialog',
  'PubSub',
  'Constant',
  'gettextCatalog',
  function ($scope, $q, $uibModal, $templateCache, EnvironmentFactory, oldCiConfig, ProjectService, ProjectFactory, DeployServiceFactory, ContinuousIntegrator, Dialog, PubSub, Constant, gettextCatalog) {
    this.EnvironmentFactory = EnvironmentFactory; // Allow access from template
    this.ProjectFactory = ProjectFactory;

    const knownCiConfigKeys = [
      'id',
      'task_name',
      'branch',
      'tag',
      'triggers',
      'platform',
      'build',
      'deploy'
    ];

    const knownPlatforms = [
      'ios',
      'android',
      'custom'
    ];

    // Initialize values
    this.isLoading = true;
    this.title = null;
    this.shouldShowJsonEditor = null;
    // this.reports = reports;
    // this.description = this.selectedReport = this.execution = null;
    // this.id = buildTask ? buildTask.id : null;

    this.loadData = () => {
      // Load old CI config
      if (Object.keys(oldCiConfig).length === 0) { // = is empty
        // If old CI config is not given, create a new CI config
        this.title = gettextCatalog.getString('New CI Config');

        // Create a new CI config
        this.isNewConfig = true;
        this.newCiConfig = {
          id: '_', // _ means new config
          task_name: 'New Config',
          branch: '/master/',
          triggers: ['push'],
          platform: (ProjectFactory.hasBuildService('ios') || ProjectFactory.hasBuildService('android')) ? ['ios', 'android'] : ['custom'],
          build: (ProjectFactory.hasBuildService('ios') || ProjectFactory.hasBuildService('android')) ? ['debug', 'release'] : [],
          deploy: []
        };

        this.shouldShowJsonEditor = false;
        this.branchOrTag = 'branch';
        this.builtInOrCustom = (ProjectFactory.hasBuildService('ios') || ProjectFactory.hasBuildService('android')) ? 'built-in' : 'custom';
        this.triggerPushEnabled = true;
        this.triggerApiEnabled = false;
        this.platformAndroidSelected = ProjectFactory.hasBuildService('android');
        this.platformIosSelected = ProjectFactory.hasBuildService('ios');
        this.buildDebugSelected = ProjectFactory.hasBuildService('ios') || ProjectFactory.hasBuildService('android');
        this.buildReleaseSelected = ProjectFactory.hasBuildService('ios') || ProjectFactory.hasBuildService('android');
        this.customBuilds = [];
        this.deployments = [];
      } else {
        // If old CI config is given, change the dialog title
        this.title = gettextCatalog.getString('Edit CI Config');

        this.isNewConfig = false;

        // Clone old CI config
        this.newCiConfig = JSON.parse(angular.toJson(oldCiConfig)); // clone object

        // Check if we should show JSON editor
        const hasId = this.newCiConfig.id != null;
        const hasTaskName = this.newCiConfig.task_name != null;
        const hasBranchOrTag = this.newCiConfig.branch != null || this.newCiConfig.tag != null;
        const hasTriggers = this.newCiConfig.triggers != null;
        const hasPlatform = this.newCiConfig.platform != null;
        const hasOnlyKnownPlatforms = hasPlatform && this.newCiConfig.platform.every(v => knownPlatforms.includes(v));
        const hasBuild = this.newCiConfig.build != null;
        const hasOnlyKnownKeys = Object.keys(this.newCiConfig).every(key => knownCiConfigKeys.includes(key));
        if (hasId && hasTaskName && hasBranchOrTag && hasTriggers && hasPlatform && hasOnlyKnownPlatforms && hasBuild && hasOnlyKnownKeys) {
          // Hide JSON editor, and show GUI editor
          this.shouldShowJsonEditor = false;
          this.branchOrTag = (this.newCiConfig.branch != null ? 'branch' : 'tag');
          this.builtInOrCustom = (this.newCiConfig.platform.includes('custom') ? 'custom' : 'built-in');
          this.triggerPushEnabled = this.newCiConfig.triggers.indexOf('push') !== -1;
          this.triggerApiEnabled = this.newCiConfig.triggers.indexOf('api') !== -1;
          this.platformAndroidSelected = this.newCiConfig.platform.indexOf('android') !== -1;
          this.platformIosSelected = this.newCiConfig.platform.indexOf('ios') !== -1;
          this.buildDebugSelected = this.newCiConfig.build.indexOf('debug') !== -1;
          this.buildReleaseSelected = this.newCiConfig.build.indexOf('release') !== -1;
          this.customBuilds = (this.newCiConfig.platform.includes('custom') ? JSON.parse(angular.toJson(this.newCiConfig.build)) : []);
          this.deployments = JSON.parse(angular.toJson(this.newCiConfig.deploy || []));
        } else {
          // Show JSON editor
          this.shouldShowJsonEditor = true;
          this.rawJsonData = angular.toJson(this.newCiConfig, 2);
          this.rawJsonDataParseError = null;
        }

        // Variable to delete config
        if (hasId) {
          this.oldId = this.newCiConfig.id;
        }
      }

      $q.all([
        ProjectService.getCustomBuildTasks(window.config.projectId),
        DeployServiceFactory.fetchOwnedCollection()
      ]).then(([buildTasksResponse, deployServiceResponse]) => {
        this.definedBatchBuilds = buildTasksResponse.batchBuilds.filter(item => (item.isDeleted === false || item.isDeleted === '0' || item.isDeleted === 0));
        this.definedDeployments = deployServiceResponse.map(obj => {
          obj.tmpId = '_' + Math.random().toString(36).substr(2, 9); // generate temporary unique ID
          return obj;
        });
        if (this.deployments != null) {
          // Set tmpId
          this.deployments.forEach(deployment => {
            // Find defined deployment which has same service_type and alias
            const foundDefinedDeployment = this.definedDeployments.find((d) => {
              return d.service_type === deployment.type && d.alias === deployment.alias;
            });

            if (foundDefinedDeployment) {
              deployment.tmpId = foundDefinedDeployment.tmpId;
            }
          });
        }

        this.isLoading = false;
      }).catch((errorResponse) => {
        console.error(errorResponse);

        this.isLoading = false;
      });

      // if (oldCiConfig && oldCiConfig.task_name) {
      //   this.task_name = oldCiConfig.task_name;
      //   this.description = buildTask.description;
      //   this.execution = buildTask.execution;
      //   this.selectedReport = Object.assign({}, buildTask.report);
      // } else {
      //   this.selectedReport = CustomBuildSettingsFactory.getDefaultReport();
      // }
    };

    this.updatePlatform = () => {
      this.newCiConfig.platform.length = 0;
      if (this.builtInOrCustom === 'built-in') {
        if (this.platformAndroidSelected) {
          this.newCiConfig.platform.push('android');
        }
        if (this.platformIosSelected) {
          this.newCiConfig.platform.push('ios');
        }
      } else if (this.builtInOrCustom === 'custom') {
        this.newCiConfig.platform.push('custom');
      }
    };

    this.isValidBatchBuildName = (name) => {
      return this.definedBatchBuilds.filter(v => v.name === name).length >= 1;
    };

    this.canAddBatchBuild = () => {
      return this.definedBatchBuilds.length >= 1;
    };

    this.addBatchBuild = () => {
      this.customBuilds.push(this.definedBatchBuilds[0].name);
    };

    this.removeBatchBuild = ($index) => {
      this.customBuilds.splice($index, 1);
    };

    this.isValidDeploymentName = (alias) => {
      return this.definedDeployments.filter(v => v.alias === alias).length >= 1;
    };

    this.canAddDeployment = () => {
      return this.definedDeployments.length >= 1;
    };

    this.addDeployment = () => {
      this.deployments.push({
        tmpId: this.definedDeployments[0].tmpId, // should be removed before saving
        type: this.definedDeployments[0].service_type,
        alias: this.definedDeployments[0].alias
      });
    };

    this.updateDeployment = (deployment) => {
      const definedDeployment = this.definedDeployments.find(v => v.tmpId === deployment.tmpId);

      deployment.type = definedDeployment.service_type;
      deployment.alias = definedDeployment.alias;
    };

    this.configureDeployment = (deployment) => {
      $uibModal.open({
        template: $templateCache.get('build/ContinuousIntegrationDeploymentDialog.html'),
        controller: 'ContinuousIntegrationDeploymentDialogController',
        controllerAs: 'deploymentDialogCtrl',
        windowClass: 'continuous-integration-deployment-dialog',
        backdrop: 'static',
        resolve: {
          deployment: () => {
            return deployment;
          }
        }
      });
    };

    this.removeDeployment = ($index) => {
      this.deployments.splice($index, 1);
    };

    this.delete = () => {
      Dialog.confirm(
        gettextCatalog.getString('Are you sure to delete this CI config?')
      ).then(() => {
        ContinuousIntegrator.deleteCiConfig(this.oldId)
          .then(() => {
            PubSub.publish(Constant.EVENT.CI_CONFIGS_RELOAD);
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('CI config was deleted successfully.')
            });
            $scope.$close();
          })
          .catch(err => {
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to save CI config.')
            });
            console.log(err);
          });
      });
    };

    this.validateRawJsonData = () => {
      try {
        JSON.parse(this.rawJsonData);
        this.rawJsonDataParseError = null;
      } catch (e) {
        this.rawJsonDataParseError = `${e.name}: ${e.message}`;
      }
    };

    this.parseRawJsonData = () => {
      this.newCiConfig = JSON.parse(this.rawJsonData);
    };

    this.isSaveAble = () => {
      const isEmptyString = (str) => {
        return (str == null || str === '');
      };
      const isEmptyArray = (arr) => {
        return (arr == null || arr.length === 0);
      };
      const hasDuplicateValue = (arr) => {
        return new Set(arr).size !== arr.length;
      };

      // Validate input values
      if (this.shouldShowJsonEditor) {
        if (this.rawJsonDataParseError != null) { // reject invalid JSON data
          return false;
        }

        return true; // Accept any input unless JSON data is invalid
      } else {
        //  Validate GUI editor values
        if (isEmptyString(this.newCiConfig.task_name)) {
          return false;
        }
        if (this.branchOrTag === 'branch') {
          if (isEmptyString(this.newCiConfig.branch)) {
            return false;
          }
        } else if (this.branchOrTag === 'tag') {
          if (isEmptyString(this.newCiConfig.tag)) {
            return false;
          }
        } else {
          return false;
        }
        if (isEmptyArray(this.newCiConfig.platform)) {
          return false;
        }
        if (this.builtInOrCustom === 'custom' && hasDuplicateValue(this.customBuilds)) {
          return false;
        }
        if (Object.keys(this.newCiConfig).some(key => !knownCiConfigKeys.includes(key))) { // unknown key exists
          return false;
        }
      }

      return true;
    };

    this.isDeleteAble = () => {
      if (!this.isNewConfig && this.oldId) {
        return true;
      } else {
        return false;
      }
    };

    /**
     * Saves the CI config.
     */
    this.save = () => {
      if (this.shouldShowJsonEditor) {
        this.parseRawJsonData();
      } else {
        if (this.branchOrTag === 'branch') {
          delete this.newCiConfig.tag;
        } else if (this.branchOrTag === 'tag') {
          delete this.newCiConfig.branch;
        }

        this.newCiConfig.triggers = [];
        if (this.triggerPushEnabled) {
          this.newCiConfig.triggers.push('push');
        }
        if (this.triggerApiEnabled) {
          this.newCiConfig.triggers.push('api');
        }

        if (this.builtInOrCustom === 'built-in') {
          this.newCiConfig.build.length = 0;
          if (this.buildDebugSelected) {
            this.newCiConfig.build.push('debug');
          }
          if (this.buildReleaseSelected) {
            this.newCiConfig.build.push('release');
          }
        } else if (this.builtInOrCustom === 'custom') {
          this.newCiConfig.build = JSON.parse(angular.toJson(this.customBuilds));
        }

        if (this.builtInOrCustom === 'built-in') {
          this.newCiConfig.deploy = JSON.parse(angular.toJson(this.deployments));
          this.newCiConfig.deploy.forEach(obj => { delete obj.tmpId; }); // remove temporary unique ID
        } else if (this.builtInOrCustom === 'custom') {
          if (this.newCiConfig.deploy) {
            this.newCiConfig.deploy.length = 0;
          }
        }
      }

      ContinuousIntegrator.saveCiConfig(this.newCiConfig)
        .then(() => {
          PubSub.publish(Constant.EVENT.CI_CONFIGS_RELOAD);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('CI config was saved successfully.')
          });
          $scope.$close();
        })
        .catch(err => {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString('Failed to save CI config.')
          });
          console.log(err);
        });
    };

    this.loadData();

  }]);

;angular.module('monacaIDE').controller('ContinuousIntegrationDeploymentDialogController', [
  '$scope',
  'deployment',
  function (
    $scope,
    deployment
  ) {
    this.loadData = () => {
      this.title = `Configure Deployment`;
      this.newDeployment = JSON.parse(angular.toJson(deployment));

      this.defaultParametersStr = (this.newDeployment.default ? angular.toJson(this.newDeployment.default, 2) : '{}');
      this.defaultParametersJsonParseError = null;

      this.iosParametersStr = (this.newDeployment.ios ? angular.toJson(this.newDeployment.ios, 2) : '{}');
      this.iosParametersJsonParseError = null;

      this.androidParametersStr = (this.newDeployment.android ? angular.toJson(this.newDeployment.android, 2) : '{}');
      this.androidParametersJsonParseError = null;
    };

    this.validate = () => {
      try {
        if (this.defaultParametersStr !== '') {
          JSON.parse(this.defaultParametersStr);
        }
        this.defaultParametersJsonParseError = null;
      } catch (e) {
        this.defaultParametersJsonParseError = `${e.name}: ${e.message}`;
      }

      try {
        if (this.iosParametersStr !== '') {
          JSON.parse(this.iosParametersStr);
        }
        this.iosParametersJsonParseError = null;
      } catch (e) {
        this.iosParametersJsonParseError = `${e.name}: ${e.message}`;
      }

      try {
        if (this.androidParametersStr !== '') {
          JSON.parse(this.androidParametersStr);
        }
        this.androidParametersJsonParseError = null;
      } catch (e) {
        this.androidParametersJsonParseError = `${e.name}: ${e.message}`;
      }
    };

    this.isSaveAble = () => {
      if (this.defaultParametersJsonParseError != null) {
        return false;
      }
      if (this.iosParametersJsonParseError != null) {
        return false;
      }
      if (this.androidParametersJsonParseError != null) {
        return false;
      }

      return true;
    };

    this.save = () => {
      if (this.defaultParametersStr != null && this.defaultParametersStr !== '') {
        deployment.default = JSON.parse(this.defaultParametersStr);

        if (angular.equals(deployment.default, {})) {
          delete deployment.default;
        }
      } else {
        delete deployment.default;
      }

      if (this.iosParametersStr != null && this.iosParametersStr !== '') {
        deployment.ios = JSON.parse(this.iosParametersStr);

        if (angular.equals(deployment.ios, {})) {
          delete deployment.ios;
        }
      } else {
        delete deployment.ios;
      }

      if (this.androidParametersStr != null && this.androidParametersStr !== '') {
        deployment.android = JSON.parse(this.androidParametersStr);

        if (angular.equals(deployment.android, {})) {
          delete deployment.android;
        }
      } else {
        delete deployment.android;
      }

      $scope.$close();
    };

    this.loadData();
  }]);

;angular.module('monacaIDE').controller('CordovaConfigAssetsEncryptPasswordController', [
  '$scope',
  'gettextCatalog',
  'Constant',
  'PubSub',
  'CordovaPluginService',
  function ($scope, gettextCatalog, Constant, PubSub, CordovaPluginService) {
    // Scope Defaults
    $scope.loading = true;
    $scope.passwordExists = false;

    // Element's ng-model
    $scope.password = '';
    $scope.password_confirm = '';

    // Initialize - Check for exisiting Encryption Password.
    CordovaPluginService.hasAssetEncryptionPassword().then(function (resp) {
      if (resp.status !== 'ok') {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('An unexpected error has occurred while fetching encrypt plugin settings. Please try again.')
        });

        $scope.$close();
        return false;
      }

      $scope.passwordExists = resp.result.has_assets_encrypt_password;
      $scope.loading = false;
    });

    // Save Functionality
    $scope.ok = function () {
      CordovaPluginService.saveAssetsEncryptPassword($scope.password, $scope.password_confirm).then(function (resp) {
        var message = resp.status === 'ok' ?
          gettextCatalog.getString('Successfully set resource encryption password.') :
          resp.message || gettextCatalog.getString('Failed to set resource encryption password.');

        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: resp.status === 'ok' ? 'success' : 'danger',
          content: message
        });

        if (resp.status === 'ok' || !resp.message) {
          $scope.$close();
        }
      });
    };
  }]);

;angular.module('monacaIDE').controller('CordovaConfigInAppUpdater4Controller', [
  '$scope',
  'gettextCatalog',
  'Constant',
  'PubSub',
  'CordovaPluginService',
  'pluginData',
  function ($scope, gettextCatalog, Constant, PubSub, CordovaPluginService, pluginData) {
    // Constant Variables
    // var UPDATE_MODE_DEFAULT = 'default'; // unused

    // Scope Defaults
    $scope.loading = true;

    // Element's ng-model
    $scope.check_update_url = 'https://';
    $scope.download_url = 'https://';
    $scope.plugin = pluginData;
    var plugin_name = 'monaca-plugin-inappupdater';

    // Initialize
    CordovaPluginService.getInAppUpdater4Setting().then(function (resp) {
      if (resp.status !== 'ok') {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('An unexpected error has occurred while fetching In-App Updater plugin settings. Please try again.')
        });

        $scope.$close();
        return false;
      }

      $scope.check_update_url = resp.result.checkUpdateUrl || '';
      $scope.download_url = resp.result.downloadUrl || '';
      $scope.selected_version = $scope.plugin.version;
      CordovaPluginService.getPluginVersionCollection(plugin_name).then(function (resp) {
        $scope.plugin_version = resp.result[plugin_name];
        $scope.loading = false;
      });
    });

    // Save Functionality
    $scope.ok = function () {
      CordovaPluginService.saveInAppUpdater4Setting($scope.check_update_url, $scope.download_url).then(function (resp) {
        var updateParams = {
          pluginId: plugin_name,
          using_plugin_version: $scope.plugin.version,
          update_plugin_version: $scope.selected_version
        };

        CordovaPluginService.updatePluginSettings(updateParams).then(function (resp) {
          var message = resp.status === 'ok' ?
            gettextCatalog.getString('Successfully saved Cordova plugin settings.') :
            gettextCatalog.getString('Failed to save Cordova plugin settings.');

          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: resp.status === 'ok' ? 'success' : 'danger',
            content: message
          });
        }).then(function () {
          PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_UPDATE_ENABLED_CARD, {
            id: plugin_name,
            version: $scope.selected_version
          });
        }).then(function () {
          $scope.$close();
        });
      }).catch(function (error) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: error.body.message
        });
      });
    };
  }]);

;angular.module('monacaIDE').controller('CordovaConfigInAppUpdaterController', [
  '$scope',
  'gettextCatalog',
  'Constant',
  'PubSub',
  'CordovaPluginService',
  function ($scope, gettextCatalog, Constant, PubSub, CordovaPluginService) {
    // Constant Variables
    var UPDATE_MODE_DEFAULT = 'default';

    // Scope Defaults
    $scope.loading = true;
    $scope.update_modes = [{
      value: UPDATE_MODE_DEFAULT,
      text: gettextCatalog.getString('default')
    }, {
      value: 'severe',
      text: gettextCatalog.getString('severe')
    }];

    // Element's ng-model
    $scope.deploy_url = '';
    $scope.update_mode = UPDATE_MODE_DEFAULT;

    // Initialize
    CordovaPluginService.getInAppUpdaterSetting().then(function (resp) {
      if (resp.status !== 'ok') {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('An unexpected error has occurred while fetching In-App Updater plugin settings. Please try again.')
        });

        $scope.$close();
        return false;
      }

      $scope.update_mode = resp.result.updateMode || UPDATE_MODE_DEFAULT;
      $scope.deploy_url = resp.result.updateUrl || '';
      $scope.loading = false;
    });

    // Save Functionality
    $scope.ok = function () {
      CordovaPluginService.saveInAppUpdaterSetting($scope.update_mode, $scope.deploy_url).then(function (resp) {
        var message = resp.status === 'ok' ?
          gettextCatalog.getString('Successfully saved In-App Updater Cordova plugin settings.') :
          resp.message || gettextCatalog.getString('Failed to save In-App Updater Cordova plugin settings.');

        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: resp.status === 'ok' ? 'success' : 'danger',
          content: message
        });

        if (resp.status === 'ok' || !resp.message) {
          $scope.$close();
        }
      });
    };
  }]);

;angular.module('monacaIDE').controller('CordovaConfigPluginCommonController', [
  '$scope',
  'PubSub',
  'gettextCatalog',
  'Constant',
  'ProjectFactory',
  'CordovaPluginService',
  'pluginData',
  'CommonFunctionService',
  function ($scope, PubSub, gettextCatalog, Constant, ProjectFactory, CordovaPluginService, pluginData, CommonFunctionService) {
    // Defaults
    $scope.loading = true;
    $scope.plugin = pluginData;
    $scope.pluginVersionChangeDisabled = false;
    $scope.pluginVersionChangeVisible = true;
    $scope.pluginInstallParams = '';
    $scope.plugin_selected_version = $scope.plugin.version;
    $scope.plugin_version = [];
    $scope.plugin_id = CommonFunctionService.parseNpmPackageName($scope.plugin.id).name;

    $scope.crosswalkVisible = false;
    $scope.crosswalkVersionDisabled = true;
    $scope.crosswalk_version = null;
    $scope.crosswalk_arch = null;
    $scope.crosswalk_archs = {
      arm: 'arm',
      x86: 'x86'
    };

    var cordovaVersionFive = 5.2;
    var currentCordovaVersion = parseFloat(ProjectFactory.getCurrentCordovaVersion());
    var cordovaVersionRestriction = currentCordovaVersion >= cordovaVersionFive;

    if (cordovaVersionRestriction) {
      if ($scope.plugin.is_npm_plugin && !ProjectFactory.canChangeCordovaPluginVersion()) {
        $scope.pluginVersionChangeDisabled = true;
        $scope.notifyPluginVersionChange = true;
      }

      if ($scope.plugin.id.indexOf(Constant.PLUGIN.CROSSWALK) > -1) {
        $scope.crosswalkVisible = true;
        $scope.crosswalkVersionDisabled = false;
      } else {
        $scope.crosswalkVisible = false;
        $scope.crosswalkVersionDisabled = true;
      }
    } else {
      $scope.notifyPluginVersionChange = false;
    }

    if (!$scope.plugin.is_npm_plugin || currentCordovaVersion < cordovaVersionFive) {
      $scope.pluginVersionChangeDisabled = true;
      $scope.pluginVersionChangeVisible = false;
    }

    CordovaPluginService.getPluginSettings($scope.plugin.id).then(function (resp) {
      var variables = resp.result.variables || [];

      if (resp.result.additional_params && resp.result.additional_params.arch) {
        $scope.crosswalk_arch = resp.result.additional_params.arch;
      } else {
        $scope.crosswalk_arch = null;
      }

      variables.forEach(function (variable) {
        if (variable.indexOf('XWALK_VERSION=', 0) === 0) {
          $scope.crosswalk_selected_version = variable.split('=')[1];
        }
      });

      $scope.pluginInstallParams = variables.length > 0 ? variables.join('\n') : '';

      if ($scope.plugin.is_npm_plugin && cordovaVersionRestriction) {
        var plugin_name = $scope.plugin_id;
        CordovaPluginService.getPluginVersionCollection(plugin_name).then(function (resp) {
          $scope.plugin_version = resp.result[plugin_name];
          $scope.crosswalk_version = resp.result['crosswalk_version'];
          $scope.loading = false;
        });
      } else {
        $scope.pluginVersionChangeDisabled = true;
        $scope.pluginVersionChangeVisible = false;
        $scope.loading = false;
      }
    });

    $scope.$watch('crosswalk_selected_version', function (newVal, oldVal) {
      var text = $scope.pluginInstallParams;

      if (text) {
        var splitText = text.split('\n');
        for (var i = 0; i < splitText.length; i++) {
          if (splitText[i].indexOf('XWALK_VERSION=', 0) === 0) {
            splitText[i] = 'XWALK_VERSION=' + newVal;
          }
        }
        $scope.pluginInstallParams = splitText.join('\n');
      }
    });

    /**
     * Save Settings
     */
    $scope.ok = function () {
      var updateParams = {
        variables_text: $scope.pluginInstallParams,
        using_plugin_version: $scope.plugin.version,
        update_plugin_version: $scope.plugin_selected_version,

        // Targeted Cordova Plugin Identifer
        pluginId: $scope.plugin_id
      };

      if ($scope.plugin.id.indexOf(Constant.PLUGIN.CROSSWALK) > -1) {
        updateParams.additional_params = {
          arch: $scope.crosswalk_arch
        };
      }

      CordovaPluginService.updatePluginSettings(updateParams).then(function (resp) {
        var message = resp.status === 'ok' ?
          gettextCatalog.getString('Successfully saved Cordova plugin settings.') :
          gettextCatalog.getString('Failed to save Cordova plugin settings.');

        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: resp.status === 'ok' ? 'success' : 'danger',
          content: message
        });
      }).then(function () {
        PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_UPDATE_ENABLED_CARD, {
          id: $scope.plugin_id,
          version: $scope.plugin_selected_version
        });
      }).then(function () {
        $scope.$close();
      });
    };
  }]);

;angular.module('monacaIDE')
  .controller('CordovaConfirmUpgradeDialogController', ['$scope', '$uibModalInstance', '$sce', 'param',
    function ($scope, $modalInstance, $sce, param) {
      $scope.param = param;
      $scope.ok = function () {
        $modalInstance.close(true);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss(false);
      };
    }]);

;angular.module('monacaIDE').controller('CordovaImportController', [
  '$scope',
  'gettextCatalog',
  'Constant',
  'PubSub',
  'CordovaPluginService',
  'ProjectFactory',
  function ($scope, gettextCatalog, Constant, PubSub, CordovaPluginService, ProjectFactory) {
    $scope.hasZipImportSupport = ProjectFactory.hasZipImportSupport();

    $scope.import_method = $scope.hasZipImportSupport ? 'zip' : 'url';
    $scope.import_file = null;
    $scope.import_url = null;

    function uploadCallback (isSuccess, message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: isSuccess ? 'success' : 'danger',
        content: message
      });

      PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);

      $scope.importing = false;
      if (isSuccess || !message) {
        // Refresh Plugin Collection
        PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_REBUILD_COLLECTION);
        $scope.$close();
      }
    }

    function successCallback (resp) {
      uploadCallback.apply(this, [true, gettextCatalog.getString('Successfully installed custom Cordova plugin')]);
    }

    function failureCallback (resp) {
      uploadCallback.apply(this, [false, (resp && resp.body && resp.body.message) || gettextCatalog.getString('Failed to install custom Cordova plugin.')]);
    }

    // Save Functionality
    $scope.ok = function () {
      $scope.importing = true;

      if (!$scope.hasZipImportSupport && $scope.import_method === 'zip') {
        return failureCallback.call(this, { body: {} });
      }

      if ($scope.import_method === 'zip') {
        CordovaPluginService.importCordovaPluginFile($scope.import_file).then(successCallback.bind(this), failureCallback.bind(this));
      } else {
        CordovaPluginService.importCordovaPluginPath($scope.import_url).then(successCallback.bind(this), failureCallback.bind(this));
      }
    };
  }]);

;angular.module('monacaIDE').controller('CordovaPluginsController', [
  '$scope',
  '$q',
  '$uibModal',
  'Dialog',
  'gettextCatalog',
  'Constant',
  'PubSub',
  'ProjectFactory',
  'CordovaPluginService',
  '$window',
  'EnvironmentFactory',
  'CommonFunctionService',
  function ($scope, $q, modal, Dialog, gettextCatalog, Constant, PubSub, ProjectFactory, CordovaPluginService, $window, EnvironmentFactory, CommonFunctionService) {
    var sortedCordovaVersionList = Object.keys(ProjectFactory.getCordovaPlatformVersions()).sort(function (a, b) {
      return a - b;
    });

    this.isInitialized = false;
    $scope.showImportCordovaPlugin = EnvironmentFactory.service.show_import_cordova_plugin;
    $scope.isFujitsuAdf = ProjectFactory.isFujitsuAdf();

    var currentVersion = ProjectFactory.getCurrentCordovaVersion();
    var nextShortVersion = sortedCordovaVersionList[(sortedCordovaVersionList.indexOf(currentVersion) || 0) + 1];
    var nextLongVersion = ProjectFactory.getCordovaVersionList()[nextShortVersion] || null;

    if (CommonFunctionService.versionCompare(nextShortVersion, currentVersion) < 0) { // 次のバージョンが現在のバージョンよりも大きくない
      nextShortVersion = null;
      nextLongVersion = null;
    }

    this.version = {
      currentShort: currentVersion,
      currentLong: ProjectFactory.getCordovaVersionList()[currentVersion] || null,

      nextShort: nextShortVersion,
      nextLong: nextLongVersion
    };

    this.canShowCordovaVersion = parseFloat(this.version.currentShort) > 2.9;
    this.cordovaPlatformVersion = ProjectFactory.getCordovaPlatformVersions(this.version.currentShort);
    this.isVersionDetailVisible = false;
    this.plugins = [];
    this.installedPluginCount = 0;
    this.searchword = '';

    function init () {
      // Build Plugin List
      reloadPluginList.apply(this).then(function () {
        // After the plugin list is reloaded, complete initializion
        this.isInitialized = true;
      }.bind(this));
    }

    if (!this.isInitialized) {
      init.apply(this);
    }

    function updateCordovaVersionInfo () {
      this.version.currentShort = this.version.nextShort;
      this.version.currentLong = this.version.nextLong;

      var currentVersion = ProjectFactory.getCurrentCordovaVersion();
      var newNextShortVersion = sortedCordovaVersionList[(sortedCordovaVersionList.indexOf(this.version.currentShort) || 0) + 1];
      var newNextLongVersion = ProjectFactory.getCordovaVersionList()[newNextShortVersion] || null;
      if (CommonFunctionService.versionCompare(newNextShortVersion, currentVersion) < 0) { // 次のバージョンが現在のバージョンよりも大きくない
        newNextShortVersion = null;
        newNextLongVersion = null;
      }

      this.version.nextShort = newNextShortVersion;
      this.version.nextLong = newNextLongVersion;
    }

    function refresh () {
      if (window.location.href.indexOf('/build/') > -1) {
        PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_REBUILD_COLLECTION);
      } else {
        $window.location.reload();
      }
    }

    function reloadPluginList () {
      var dfd = $q.defer();
      var existingPlugins = [];

      this.isInitialized = false;
      $q.when(CordovaPluginService.list()).then(function (response) {
        var plugins = response.result || [];
        // Clear out old collection before rebuilding.
        // this.plugins = [];
        this.plugins.forEach(function (plugin) {
          existingPlugins.push(plugin.key);
        });

        // Build Plugin Collection
        buildPluginList.apply(this, [plugins]).then(function (pluginCollection) {
          // Hide removed plugin
          var keys = pluginCollection.map(function (v) {
            return v.key;
          });
          existingPlugins.forEach(function (key) {
            if (!keys.includes(key)) { // 新規取得したプラグイン一式と
              this.plugins.splice(this.plugins.findIndex(function (v) { return v.key === key; }), 1);
            }
          }.bind(this));

          // Show plugins
          pluginCollection.forEach(function (pluginCheck) {
            if (existingPlugins.indexOf(pluginCheck.key) === -1) {
              this.plugins.push(pluginCheck);
            } else {
              var plugin = getPlugin.apply(this, [pluginCheck.key]);

              // Update if plugin exists.
              if (plugin) {
                for (var attr in pluginCheck) {
                  plugin[attr] = pluginCheck[attr];
                }
              }
            }
          }.bind(this));
          this.isInitialized = true;
          dfd.resolve();
        }.bind(this));
      }.bind(this));

      return dfd.promise;
    }

    PubSub.subscribe(Constant.EVENT.CORDOVA_PLUGIN_REBUILD_COLLECTION, reloadPluginList.bind(this));

    PubSub.subscribe(Constant.EVENT.CORDOVA_PLUGIN_UPDATE_ENABLED_CARD, function (data) {
      if (!data) {
        return;
      }

      for (var i = 0; i < this.plugins.length; i++) {
        if (this.plugins[i].id === data.id) {
          this.plugins[i].version = data.version;
          return;
        }
      }
    }.bind(this));

    function getPlugin (key) {
      for (var i = 0; i < this.plugins.length; i++) {
        if (this.plugins[i].key === key) {
          return this.plugins[i];
        }
      }

      return null;
    }

    function npmRegistryFetch (pluginCollection, dfd, pluginData, name) {
      CordovaPluginService.fetchRegistryData('npm', name).then(function (resp) {
        pluginData.updatedAt = '';
        pluginData.author = '';
        pluginData.docs = '';

        if (resp.result) {
          pluginData.updatedAt = resp.result.modified ? moment(resp.result.modified).format('YYYY-MM-DD') : '';
          pluginData.author = resp.result.author ? resp.result.author : '';
          pluginData.docs = resp.result.homepage ? resp.result.homepage : '';
          pluginData.platforms = resp.result.platforms ? resp.result.platforms : [];
        }

        pluginCollection.push(pluginData);
        dfd.resolve();
      });
    }

    function getThumbnailUrl (thumbnailUrl) {
      if (!thumbnailUrl) {
        return 'img/build/plugin/cordova.png';
      } else if (thumbnailUrl.indexOf('build') > -1) {
        return thumbnailUrl;
      } else {
        return thumbnailUrl.replace('/img/plugin', 'img/build/plugin');
      }
    }

    function buildPluginList (plugins) {
      var promiseCollection = [];
      var pluginCollection = [];

      for (var plugin in plugins) {
        // Create a collectin of promises for each plugin.
        var dfd = $q.defer();
        promiseCollection.push(dfd.promise);

        var name = plugin.split('@')[0] || plugins[plugin].id;
        var pluginData = {
          key: plugin,
          id: name,
          name: plugins[plugin].name || name,
          description: plugins[plugin].description.trim(),
          docs: plugins[plugin].documentUrl,
          thumbnail: getThumbnailUrl(plugins[plugin].thumbnailUrl),
          canUsed: plugins[plugin].canUsed,
          platforms: plugins[plugin].supportedPlatforms,
          requiredPlanNames: plugins[plugin].requiredPlanNames,
          author: '',
          updatedAt: '',
          version: plugins[plugin].version,
          isInstalled: plugins[plugin].isInstalled,
          isInstallRequired: plugins[plugin].isInstallRequired,
          isDefault: plugins[plugin].isDefault,
          isImported: plugins[plugin].isImported,
          is_npm_plugin: plugins[plugin].is_npm_plugin,
          hasMonacaSupport: plugins[plugin].hasMonacaSupport
        };

        if (pluginData.isInstalled) {
          this.installedPluginCount++;
        }

        // If not Cordova Plugin, continue.
        if (!name.match(/^cordova-plugin/) || !pluginData.is_npm_plugin) {
          pluginCollection.push(pluginData);
          dfd.resolve();
          continue;
        }

        npmRegistryFetch(pluginCollection, dfd, pluginData, name);
      }

      return $q.all(promiseCollection).then(function () {

        // check another version of the same plugin, and hide a plugin that is not installed
        for (var i = 0; i < pluginCollection.length - 1; i++) {
          for (var j = i + 1; j < pluginCollection.length; j++) {
            var p1 = pluginCollection[i];
            var p2 = pluginCollection[j];
            if (p1.id === p2.id) {
              if (p1.isInstalled && !p2.isInstalled) {
                pluginCollection[i].sparePlugin = p2;
                pluginCollection[j].reserveRemoval = true;
              }
            }
          }
        }
        pluginCollection = pluginCollection.filter(function (item) {
          return !item.reserveRemoval;
        });

        return pluginCollection;
      });
    }

    this.onClickBtnEnable = function (key) {
      $q.when(CordovaPluginService.enable(key)).then(function (resp) {
        if (resp.status === 'fail') {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString(resp.message)
          });
        } else {
          var plugin = getPlugin.apply(this, [key]);
          plugin.isInstalled = true;

          this.installedPluginCount++;

          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Successfully enabled plugin.')
          });
        }
      }.bind(this));
    };

    this.onClickBtnDisable = function (key) {
      Dialog.confirm(
        gettextCatalog.getString('Are you sure you would want to disable this plugin.')
      ).then(function () {
        $q.when(CordovaPluginService.disable(key)).then(function () {
          var plugin = getPlugin.apply(this, [key]);
          plugin.isInstalled = false;

          this.installedPluginCount--;

          // restore another version plugin and delete disabled plugin
          if (plugin.sparePlugin) {
            this.plugins.push(plugin.sparePlugin);
            this.plugins.splice(this.plugins.indexOf(plugin), 1);
          }

          // 同名プラグインが複数表示される対策
          // もし既にインストール済みの同名プラグインが存在していたら、Disabledされた方のプラグインはsparePluginに登録して削除しておく
          // sparePluginとして登録したプラグインは削除時に復活する
          var index = this.searchOtherVersionPluginIndex(plugin);
          if (index !== -1) {
            if (this.plugins[index].isInstalled) {
              this.plugins[index].sparePlugin = plugin;
              this.plugins.splice(this.plugins.indexOf(plugin), 1);
            }
          }

          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Successfully disabled plugin.')
          });

          if (!plugin.is_npm_plugin) PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_REBUILD_COLLECTION);
          PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);

        }.bind(this));
      }.bind(this));
    };

    this.searchOtherVersionPluginIndex = function (plugin) {
      return this.plugins.findIndex(function (v) {
        return v.name === plugin.name && v.version !== plugin.version;
      });
    };

    this.filterCordovaVersion = function (version) {
      return parseFloat(version.value) >= parseFloat(ProjectFactory.getCurrentCordovaVersion());
    };

    this.isAvailablePluginEmpty = function () {
      return this.installedPluginCount === (this.plugins.length);
    };

    this.onClickBtnRemove = function (key) {
      Dialog.confirm(
        gettextCatalog.getString('Are you sure to remove the plugin? Removed plugins cannot be restored.')
      ).then(function () {
        $q.when(CordovaPluginService.disable(key)).then(function () {
          var plugin = getPlugin.apply(this, [key]);
          plugin.isInstalled = false;
          this.installedPluginCount--;

          // restore another version plugin and delete disabled plugin
          if (plugin.sparePlugin) {
            this.plugins.push(plugin.sparePlugin);
          }

          // remove this plugin
          this.plugins.splice(this.plugins.indexOf(plugin), 1);

          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Successfully deleted plugin.')
          });

          PubSub.publish(Constant.EVENT.CORDOVA_PLUGIN_REBUILD_COLLECTION);
          PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);
        }.bind(this));
      }.bind(this));
    };

    this.onClickBtnConfig = function ($event, plugin) {
      var pluginCard = $($event.currentTarget).closest('div[ng-include]');
      var page = 'CordovaConfigPluginCommon';

      if (plugin.key.indexOf(Constant.PLUGIN.ENCRYPTION) !== -1) {
        page = 'CordovaConfigAssetsEncryptPassword';
      } else if (plugin.key.indexOf(Constant.PLUGIN.INAPP_UPDATER) !== -1 ||
        plugin.key.indexOf(Constant.PLUGIN.INAPP_UPDATER_CORDOVA7) !== -1) {
        if (plugin.version.match(/^4\./) || plugin.key.indexOf(Constant.PLUGIN.INAPP_UPDATER_CORDOVA7) !== -1) {
          page = 'CordovaConfigInAppUpdater4';
        } else {
          page = 'CordovaConfigInAppUpdater';
        }
      }

      modal.open({
        templateUrl: `build/${page}.html`,
        controller: `${page}Controller`,
        windowClass: 'cordova-configure-dialog',
        resolve: {
          title: function () {
            return '';
          },

          message: function () {
            return '';
          },

          pluginCard: function () {
            return pluginCard;
          },

          pluginData: function () {
            return {
              name: plugin.name,
              id: plugin.key,
              is_npm_plugin: plugin.is_npm_plugin,
              version: plugin.version
            };
          }
        }
      });
    };

    this.onClickBtnImport = function () {
      modal.open({
        templateUrl: 'build/CordovaImport.html',
        controller: 'CordovaImportController',
        windowClass: 'cordova-configure-dialog',
        resolve: {
          title: function () {
            return '';
          },
          message: function () {
            return '';
          }
        }
      });
    };

    this.onSelectCordovaVersion = function () {
      if (!this.version.nextLong) {
        return false;
      }

      // Selected Version from Dropdown
      var selectedVersion = parseFloat(this.version.nextLong);

      // Should user be notified and confirmed for structural change?
      var hasStructuralChange = false;

      // Versions that require structural change.
      var versionWithStructuralChange = ['5.2.0', '6.2.0', '6.5.0', '7.1.0', '9.0.0', '10.0.0'];

      // Identify if user selected a structural change Cordova version.
      for (var i = 0; i < versionWithStructuralChange.length; i++) {
        if (parseFloat(versionWithStructuralChange[i]) === selectedVersion) {
          // User selected a structural change Cordova version.
          hasStructuralChange = true;
          break;
        }
      }

      if (hasStructuralChange) {
        // When structural change Cordova version is selected, we need to verify with the user
        // if they are sure they want to upgrade as it will change the projects structure.
        this.confirmStructuralChange(selectedVersion).then(function () {

          this.changeCordovaVersion(selectedVersion)
            .then(function (resp) {
              $scope.changingversion = false;
              if (resp.status === 'ok') {
                Dialog.alert(
                  gettextCatalog.getString(
                    'Your project has been upgraded to a newer version. <br/><div style="font-size: 13px;margin-top:7px;">Furthermore, we created a back up in \'{{new_project_name}}\'</div>', {
                      new_project_name: ProjectFactory.getProjectName() + ' (Backup)'
                    }
                  ),
                  gettextCatalog.getString('Upgrade Completed')
                ).then(function () {
                  if (window.monaca_ide_window) {
                    PubSub.publish(Constant.EVENT.RELOAD_IDE);
                  } else {
                    PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);
                    PubSub.publish(Constant.EVENT.CLOSE_INACTIVATE_IDE_TABS);
                  }
                  refresh();
                }, function () {
                  refresh();
                });
              }
            })
            .catch(function (resp) {
              $scope.changingversion = false;
            });
        }.bind(this));
      } else {
        // If the user did not select a structural change Cordova version, this is a safe upgrade.
        // The user will not be notified and immedatly, perform upgrade.
        this.changeCordovaVersion(selectedVersion).then(function () {
          $scope.changingversion = false;
        });
      }
    };

    this.confirmStructuralChange = function (selectedVersion) {
      var isJP = true;
      try {
        isJP = window.MonacaApi.Config.getLanguage() === 'ja';
      } catch (error) {
        isJP = true;
      }

      return CordovaPluginService.getUserAffectPluginList(selectedVersion).then(function (resp) {

        var _param = {
          '5.2': { link: '', ios_version: '8.0', android_version: '4.0', debugger_version: '5.0.0' },
          '6.2': { link: '', ios_version: '8.0', android_version: '4.0', debugger_version: '6.1.0' },
          '6.5': {
            link: isJP ? 'https://press.monaca.io/takuya/467' : 'https://onsen.io/blog/develop-powerful-apps-with-cordova6-5/',
            ios_version: '9.0',
            android_version: '4.1',
            debugger_version: '6.5.0'
          },
          '7.1': {
            link: '',
            ios_version: '9.0',
            android_version: '4.1',
            debugger_version: '7.0.0',
            additional_message: gettextCatalog.getString('Crosswalk is no longer supported on Monaca using Cordova 7. If you have the Crosswalk plugin installed, it will be removed during the upgrade.')
          },
          '9': {
            link: $scope.docsUrl.release_note_cordova9,
            ios_version: '10.0',
            android_version: '4.4',
            debugger_version: '9.0.0',
            deprecated_plugins: [
              'cordova-plugin-contacts',
              'cordova-plugin-device-motion',
              'cordova-plugin-device-orientation',
              'cordova-plugin-file-transfer',
              'cordova-plugin-globalization',
              'mobi.monaca.plugins.BarcodeScanner',
              'mobi.monaca.plugins.datepicker'
            ]
          },
          '10': {
            link: $scope.docsUrl.release_note_cordova10,
            cordova_version: '10',
            ios_version: '11.0',
            android_version: '6.0',
            debugger_version: '10.0.0',
            additional_message: gettextCatalog.getString('20 x 20 size icon will be required for iOS App Setting. You can upload the image on App Settings for iOS page.')
          }
        };

        if (resp.result) {
          if (resp.result.plugins_to_be_removed && resp.result.plugins_to_be_removed.length > 0) {
            _param[selectedVersion]['plugins_to_be_removed'] = resp.result.plugins_to_be_removed;
          }
          if (resp.result.plugins_to_be_upgraded && resp.result.plugins_to_be_upgraded.length > 0) {
            _param[selectedVersion]['plugins_to_be_upgraded'] = resp.result.plugins_to_be_upgraded;
          }
          if (resp.result.plugins_to_be_upgrade_in_devDependencies && resp.result.plugins_to_be_upgrade_in_devDependencies.length > 0) {
            _param[selectedVersion]['plugins_to_be_upgrade_in_devDependencies'] = resp.result.plugins_to_be_upgrade_in_devDependencies;
          }
        }

        return modal.open({
          templateUrl: 'build/CordovaConfirmUpgradeDialog.html',
          controller: 'CordovaConfirmUpgradeDialogController',
          windowClass: 'cordova-confirm-upgrade',
          resolve: {
            param: function () {
              return _param[selectedVersion];
            }
          }
        }).result;
      });
    };

    this.changeCordovaVersion = function (version) {
      $scope.changingversion = true;
      return CordovaPluginService.switchCordovaVersion(version).then(function (resp) {
        var isSuccess = resp.status === 'ok';
        var error_message = resp.message ? resp.message : gettextCatalog.getString('Failed to change Cordova version.');
        var message = isSuccess ?
          gettextCatalog.getString('Successfully changed Cordova version.') :
          error_message;

        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: isSuccess ? 'success' : 'danger',
          content: message
        });

        ProjectFactory._refetch();
        if (isSuccess) updateCordovaVersionInfo.apply(this);

        return isSuccess ? $q.resolve(resp) : $q.reject(resp);
      }.bind(this));
    };
  }]).filter('pluginsearch', function () {
  return function (plugins, words) {
    if (!words) return plugins;
    words = words.toLowerCase();

    var filteredList = [];

    for (var id in plugins) {
      var plugin = plugins[id];

      if (plugin.name.toLowerCase().indexOf(words) >= 0 || plugin.id.toLowerCase().indexOf(words) >= 0 || plugin.description.toLowerCase().indexOf(words) >= 0) {
        filteredList.push(plugin);
      }
    }

    return filteredList;
  };
});

;angular.module('monacaIDE').controller('DeployServiceAddDialogController', ['$scope', 'gettextCatalog', 'DeployServiceFactory', 'service', function ($scope, gettextCatalog, DeployServiceFactory, service) {
  $scope.selected_service = service;
  $scope.formElements = [];
  $scope.formData = {};
  $scope.alias = '';
  $scope.error = null;
  $scope.DeployServiceFactory = DeployServiceFactory;

  $scope.addNewDeployService = function () {
    if (!$scope.selected_service) {
      $scope.error = gettextCatalog.getString('Please select a deploy service.');
      return false;
    }

    if ($scope.alias === '') {
      $scope.error = gettextCatalog.getString('Please insert an alias for the selected deploy service.');
      return false;
    }

    var missingRequiredElements = [];

    $scope.formElements.forEach(function (item) {
      if (item.required && !$scope.formData[item.id]) {
        missingRequiredElements.push(item.label);
      }
    });

    if (missingRequiredElements.length) {
      $scope.error = gettextCatalog.getString(
        'Please fill in the required fields: {{missing}}',
        {
          missing: missingRequiredElements.join(', ')
        }
      );
      return false;
    }

    var submitForm = angular.copy($scope.formData);
    submitForm.alias = $scope.alias;
    submitForm.service = $scope.selected_service.id;

    DeployServiceFactory.addOwn(submitForm).then(
      this.$close.bind(this),
      function (message) {
        $scope.error = message;
      }
    );
  };

  $scope.updateDeployServiceForm = function () {
    $scope.formElements = [];

    // Reset Form Data when
    if (!$scope.selected_service) {
      $scope.formData = {};
    }

    if ($scope.selected_service && $scope.selected_service.form) {
      $scope.formElements = $scope.selected_service.form || [];
    }
  };

  $scope.updateDeployServiceForm();
}]);

;angular.module('monacaIDE').controller('DeployServiceController', ['$scope', '$uibModal', 'gettextCatalog', 'Dialog', 'DeployServiceFactory', function ($scope, $modal, gettextCatalog, Dialog, DeployServiceFactory) {
  $scope.DeployServiceFactory = DeployServiceFactory;
  $scope.loading = true;
  $scope.error = false;

  $scope.addNewDeployService = function () {
    var instance = $modal.open({
      templateUrl: 'build/DeployServiceAddDialog.html',
      controller: 'DeployServiceAddDialogController',
      windowClass: 'deploy-service-add-dialog',
      resolve: {
        service: false
      }
    });

    return instance.result;
  };

  $scope.deleteDeployService = function (service, alias) {
    return Dialog.confirm(
      gettextCatalog.getString(
        'Are you sure you would like to delete the deploy service configurations for "{{alias}}" for service type "{{service}}"?',
        {
          alias: alias,
          service: service
        }
      ),
      gettextCatalog.getString('Delete Deploy Service Configurations')
    ).then(function (isToDelete) {
      if (isToDelete) {
        DeployServiceFactory.removeOwn(service, alias);
      }
    });
  };

  /**
   * Loading Page
   */
  DeployServiceFactory.fetch().then(
    function () {
      $scope.loading = false;
      $scope.error = false;
    },
    function (error) {
      $scope.loading = false;
      $scope.error = true;
      $scope.errorObj = error;
    }
  );
}]);

;angular.module('monacaIDE').controller('ElectronAppSettingsController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  'ProjectFactory',
  'ProjectSettingFactory',
  'PubSub',
  'Constant',
  function ($scope, gettextCatalog, $modal, ProjectFactory, ProjectSettingFactory, PubSub, Constant) {

    const projectId = window.config.projectId;
    const ICON_MIN_WIDTH = 512;
    const ICON_MIN_HEIGHT = 512;
    let oldSettings = {};
    const now = Date.now();

    $scope.isLoading = {};
    $scope.settings = {};
    $scope.validIcon = true;
    $scope.validUploadImage = true;

    $scope.getTemplateName = function () {
      if ($scope.page) {
        if ($scope.page === Constant.PAGE_ELECTRON_LINUX_APP_SETTINGS) {
          $scope.template = 'Linux';
        } else if ($scope.page === Constant.PAGE_ELECTRON_MACOS_APP_SETTINGS) {
          $scope.template = 'macOS';
        } else if ($scope.page === Constant.PAGE_ELECTRON_WINDOWS_APP_SETTINGS) {
          $scope.template = 'Windows';
        }
      } else {
        PubSub.subscribe(Constant.EVENT.VIEW_SHOWN, function (data) {
          if (data.componentId === 'mn-gl-appsettingselectronlinux') {
            $scope.template = 'Linux';
          } else if (data.componentId === 'mn-gl-appsettingselectronmacos') {
            $scope.template = 'macOS';
          } else if (data.componentId === 'mn-gl-appsettingselectronwindows') {
            $scope.template = 'Windows';
          }
        });
      }
    };

    // Get the corresponding template name
    $scope.getTemplateName();

    $scope.timestamp = function () {
      return now;
    };

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.createSettingImageUrl = function (projectId, type) {
      return window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/file/read/' + type + '?api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.iconTypeList = (function () {
      const list = {
        'icon_electron_app': { name: '' }
      };

      for (let key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.splashTypeList = (function () {
      const list = {
        'electron_splash_image': { w: 620, h: 300, name: '' }
      };

      for (let key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    let checkImageSize = function (img, minWidth, minHeight) {
      let width = img.naturalWidth || img.width || 0;
      let height = img.naturalHeight || img.height || 0;
      return (width >= minWidth) && (height >= minHeight);
    };

    let checkUploadImage = function (element, minWidth, minHeight) {
      return new Promise(function (resolve, reject) {
        if (element && element.name !== 'icon_electron_app') resolve(true); // only check electron icon
        const file = element.files[0];
        let fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onload = function () {
          let img = new Image();
          img.src = fr.result;
          img.onload = function () {
            resolve(checkImageSize(img, minWidth, minHeight));
          };
        };
        fr.onerror = function (e) {
          console.error('Could not load this image');
          reject(e);
        };
      });
    };

    $scope.checkIconSize = function (minWidth, minHeight) {
      let img = document.getElementById('image-icon_electron_app');
      $scope.validUploadImage = $scope.validIcon = checkImageSize(img, minWidth, minHeight);
    };

    $scope.init = function () {
      $scope.loading = true;
      ProjectSettingFactory.loading.then(function (result) {
        $scope.loading = false;
        // set default values
        const config = result.config && result.config.electron ? result.config.electron : {};
        const preference = config.preference || {};

        // Application Information
        $scope.settings.applicationName_electron = config.applicationName;
        $scope.settings.applicationId_electron = config.applicationId;
        $scope.settings.versionNumber_electron = config.versionNumber;
        $scope.settings.applicationDescription_electron = config.applicationDescription;

        // Splash Screen
        $scope.settings.splash_screen_background_color = preference.SplashScreenBackgroundColor ? preference.SplashScreenBackgroundColor : '#464646';

        oldSettings = Object.assign({}, $scope.settings);

        $scope.isInitialized = true;
        $scope.isReadyToSave = true;
      });
    };

    $scope.valueChanged = function (fieldName) {
      return oldSettings[fieldName] !== $scope.settings[fieldName];
    };

    $scope.uploadImage = function (element) {
      const file = element.files[0];
      checkUploadImage(element, ICON_MIN_WIDTH, ICON_MIN_HEIGHT)
        .then(function (validImage) {
          // if the image is invalid, show the error message and stop processing
          if (!validImage) {
            $scope.validUploadImage = false;
            $scope.$apply();
            return;
          }
          $modal.open({
            templateUrl: 'commonDialogs/ConfirmDialog.html',
            controller: 'ConfirmController',
            backdrop: true,
            resolve: {
              title: function () {
                return gettextCatalog.getString('Confirm');
              },
              message: function () {
                return gettextCatalog.getString('Are you sure to overwrite this file?');
              }
            }
          }).result.then(function () {

            const uploadType = element.name;
            const types = (function () {
              if (uploadType === 'icon_all_electron') {
                return Object.keys($scope.iconTypeList);
              } else {
                return [uploadType];
              }
            })();

            // show loading icons
            types.forEach(function (type) {
              $scope.isLoading[type] = true;
            });

            // reload updated images
            MonacaApi.Ide.Project.uploadSettingImage(projectId, uploadType, file)
              .then(function () {
                if (validImage) $scope.validUploadImage = $scope.validIcon = true; // enable save button and remove error message if the image is valid
                $scope.$apply(function () {
                  types.forEach(function (type) {
                    document.getElementById('image-' + type).src = $scope.createSettingImageUrl(projectId, type) + '&t=' + (new Date()).getTime();
                    $scope.isLoading[type] = false;
                    $scope.checkIconSize(ICON_MIN_HEIGHT, ICON_MIN_WIDTH); // recheck after update calling scope.apply
                  });
                });
                PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                  className: 'success',
                  content: gettextCatalog.getString('Successfully uploaded.')
                });
              })
              .catch(function () {
                $scope.$apply(function () {
                  types.forEach(function (type) {
                    $scope.isLoading[type] = false;
                  });
                });
                PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                  className: 'danger',
                  content: gettextCatalog.getString('Failed to upload file.')
                });
              });
          });
        })
        .catch(function (error) {
          console.error(error);
        });
    };

    $scope.submit = function () {
      const data = { electron: Object.assign({}, $scope.settings) };

      $scope.isReadyToSave = false;
      $scope.saving = true;
      MonacaApi.Ide.Project.saveProjectSetting(projectId, data).then(function () {
        $scope.isReadyToSave = true;
        $scope.saving = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Successfully saved')
        });
        ProjectSettingFactory.reload();
        oldSettings = Object.assign({}, $scope.settings);
        $scope.$apply();
      });
    };
  }]);

;angular.module('monacaIDE')
  .controller('ElectronBuildController',
    ['$scope', '$controller', 'gettextCatalog', 'Constant', 'PubSub',
      function ($scope, $controller, gettextCatalog, Constant, PubSub) {
        angular.extend(this, $controller('BaseBuildController', { $scope: $scope }));

        $scope.getTemplateAndPlatformName = function () {
          $scope.template = '';
          if ($scope.page) {
            if ($scope.page === Constant.PAGE_ELECTRON_LINUX_BUILD) {
              $scope.template = 'Linux';
            } else if ($scope.page === Constant.PAGE_ELECTRON_MACOS_BUILD) {
              $scope.template = 'macOS';
            } else if ($scope.page === Constant.PAGE_ELECTRON_WINDOWS_BUILD) {
              $scope.template = 'Windows';
            }
            $scope.platform = `electron_${$scope.template.toLowerCase()}`;
          } else {
            PubSub.subscribe(Constant.EVENT.VIEW_SHOWN, function (data) {
              if (data.componentId === 'mn-gl-buildforelectronlinux') {
                $scope.template = 'Linux';
              } else if (data.componentId === 'mn-gl-buildforelectronmacos') {
                $scope.template = 'macOS';
              } else if (data.componentId === 'mn-gl-buildforelectronwindows') {
                $scope.template = 'Windows';
              }
              $scope.platform = `electron_${$scope.template.toLowerCase()}`;
            });
          }
        };

        // Get the corresponding template and platform name
        $scope.getTemplateAndPlatformName();

        $scope.initProfiles = function (result) {
          if ($scope.template !== 'Windows') return; // mac and linux will build "zip" package
          $scope.buildPackages = ['zip', 'nsis'];
          if (result.project.electron && result.project.electron.selectedBuildPackage) {
            $scope.selectedBuildPackage = result.project.electron.selectedBuildPackage;
          } else {
            $scope.selectedBuildPackage = $scope.buildPackages[0]; // default
          }
        };

        $scope.createBuildParameters = function () {
          let params = {};
          params.buildPackage = 'zip'; // default build package
          if ($scope.template !== 'Windows') return params;
          if ($scope.selectedBuildPackage) params.buildPackage = $scope.selectedBuildPackage;
          return params;
        };

        $scope.manageAppSettings = function () {
          if ($scope.isAppMode()) {
            $scope.setPage(Constant[`PAGE_ELECTRON_${$scope.template.toUpperCase()}_APP_SETTINGS`], true);
          } else {
            PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
              open: true,
              componentState: {
                id: `appsettingselectron${$scope.template.toLowerCase()}`,
                title: gettextCatalog.getString(`App Settings for Electron ${$scope.template}`),
                icon: 'settings',
                templateUrl: 'build/ElectronAppSettings.html'
              }
            });
          }
        };
      }]);

;angular.module('monacaIDE').controller('IosAppSettingsController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  'ProjectFactory',
  'ProjectSettingFactory',
  'PubSub',
  'Constant',
  'PNG',
  function ($scope, gettextCatalog, $modal, ProjectFactory, ProjectSettingFactory, PubSub, Constant, PNG) {

    var projectId = window.config.projectId;
    var oldSettings = {};

    const now = Date.now();

    $scope.cordovaVersion = ProjectFactory.getCurrentCordovaVersion();
    $scope.canChangeSplashScreenMode = $scope.cordovaVersion >= 7;
    $scope.iosWebviewEngine = [
      {value: 'uiwebview', label: 'UIWebView'}
    ];
    if ($scope.cordovaVersion >= 9) $scope.iosWebviewEngine.push({value: 'wkwebview', label: 'WKWebView'});

    $scope.isLoading = {};
    $scope.settings = {};

    $scope.timestamp = function () {
      return now;
    };

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.createSettingImageUrl = function (projectId, type) {
      return window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/file/read/' + type + '?api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.localizationItems = [
      { label: 'English', value: 'en' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Italian', value: 'it' },
      { label: 'Spanish', value: 'es' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Chinese (simplified)', value: 'zh_CN' },
      { label: 'Chinese (traditional)', value: 'zh_TW' }
    ];

    $scope.iconTypeList = (function () {
      // default list for cordova 7
      var list = {
        'icon_iphone': { w: 57, h: 57, name: 'iPhone' },
        'icon_iphone_retina': { w: 114, h: 114, name: 'iPhone Retina' },
        'icon_ipad': { w: 72, h: 72, name: 'iPad' },
        'icon_ipad_retina': { w: 144, h: 144, name: 'iPad Retina' },
        'icon_60_ios': { w: 60, h: 60, name: '' },
        'icon_iphone_retina_ios7': { w: 120, h: 120, name: 'iPhone Retina<br>(iOS7)' },
        'icon_iphone6plus': { w: 180, h: 180, name: 'iPhone 6<br>Plus' },
        'icon_ipad_ios7': { w: 76, h: 76, name: 'iPad (iOS7)' },
        'icon_ipad_retina_ios7': { w: 152, h: 152, name: 'iPad Retina<br>(iOS7)' },
        'icon_40_ios': { w: 40, h: 40, name: '' },
        'icon_40_2x_ios': { w: 80, h: 80, name: '' },
        'icon_50_ios': { w: 50, h: 50, name: '' },
        'icon_50_2x_ios': { w: 100, h: 100, name: '' },
        'icon_small_ios': { w: 29, h: 29, name: '' },
        'icon_small_2x_ios': { w: 58, h: 58, name: '' }
      };

      if ($scope.cordovaVersion >= 6) {
        list['icon_small_3x_ios'] = { w: 87, h: 87, name: '' };
        list['icon_ipad_pro'] = { w: 167, h: 167, name: 'iPad Pro' };
      }

      // Cordova10に依存しないが、Monaca Cordova10対応でリリースしたため、Cordova9のProjectには適応しない
      if ($scope.cordovaVersion >= 10) {
        list['icon_20_ios'] = { w: 20, h: 20, name: '' };
        list['icon_20_2x_ios'] = { w: 40, h: 40, name: '20@2x' };
      }

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.storeIconTypeList = (function () {
      var list = {};

      if ($scope.cordovaVersion >= 7) {
        list['icon_1024_ios'] = { w: 1024, h: 1024, name: 'App Store' };
      }

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.splashImages = {
      legacy: {
        'splash_iphone': { w: 320, h: 480, name: 'iPhone' },
        'splash_iphone_retina': { w: 640, h: 960, name: 'iPhone Retina' },
        'splash_iphone_568h': { w: 640, h: 1136, name: 'iPhone 5' },
        'splash_iphone6': { w: 750, h: 1334, name: 'iPhone 6' },
        'splash_iphone6plus': { w: 1242, h: 2208, name: 'iPhone 6 Plus' },
        'splash_iphone6plus_landscape': { w: 2208, h: 1242, name: 'iPhone 6 Plus<br>Landscape' },
        'splash_ipad_ios7': { w: 768, h: 1024, name: 'iPad (iOS7)' },
        'splash_ipad_ios7_landscape': { w: 1024, h: 768, name: 'iPad Landscape<br>(iOS7)' },
        'splash_ipad_retina_ios7': { w: 1536, h: 2048, name: 'iPad Retina (iOS7)' },
        'splash_ipad_retina_ios7_landscape': { w: 2048, h: 1536, name: 'iPad Retina<br>Landscape (iOS7)' }
      },
      storyboard: {
        'splash_ios_anyany': { w: 2732, h: 2732, name: '2x~universal~anyany' }
      }
    };

    $scope.displaySplashImages = {};

    _.each($scope.splashImages, function (splashImagesSubset) {
      _.each(splashImagesSubset, function (splashImage, key) {
        splashImage.url = $scope.createSettingImageUrl(projectId, key);
      });
    });

    $scope.init = function () {
      $scope.loading = true;
      ProjectSettingFactory.loading.then(function (result) {
        $scope.loading = false;
        // set default values
        var projectInfo = result.project || {};
        var config = result.config && result.config.ios ? result.config.ios : {};
        var preference = config.preference || {};

        // Application Information
        $scope.settings.applicationName_ios = config.applicationName;
        $scope.settings.applicationID_ios = config.applicationId;
        $scope.settings.versionName_ios = config.versionName;
        $scope.settings.bundleVersion_ios = config.bundleVersion;
        $scope.settings.localizations_ios = projectInfo.ios.localizations;

        // bundleVesionが空だったら'Specify different version for bundle'のチェックを外してversionNameを初期表示しておく
        $scope.specifyBundleVersion = !!$scope.settings.bundleVersion_ios;
        if (!$scope.specifyBundleVersion) {
          $scope.settings.bundleVersion_ios = $scope.settings.versionName_ios;
        }

        var deviceFamily = '';
        if ($scope.cordovaVersion >= 10) {
          // Target Device Family. use target-device in Cordova10
          deviceFamily = preference['target-device'] || '';
          $scope.settings.targetFamilyiPhone_ios = 0;
          $scope.settings.targetFamilyiPad_ios = 0;
          if (deviceFamily === 'universal') {
            $scope.settings.targetFamilyiPhone_ios = 1;
            $scope.settings.targetFamilyiPad_ios = 1;
          } else if (deviceFamily === 'handset') {
            $scope.settings.targetFamilyiPhone_ios = 1;
            $scope.settings.targetFamilyiPad_ios = 0;
          } else if (deviceFamily === 'tablet') {
            $scope.settings.targetFamilyiPhone_ios = 0;
            $scope.settings.targetFamilyiPad_ios = 1;
          }
        } else if ($scope.cordovaVersion >= 6) {
          // Target Device Family. use ios-XCBuildConfiguration-TARGETED_DEVICE_FAMILY in Cordova6
          deviceFamily = preference['ios-XCBuildConfiguration-TARGETED_DEVICE_FAMILY'] || '';
          $scope.settings.targetFamilyiPhone_ios = deviceFamily.includes('1') ? 1 : 0;
          $scope.settings.targetFamilyiPad_ios = deviceFamily.includes('2') ? 1 : 0;
        } else {
          $scope.settings.targetFamilyiPhone_ios = preference['monaca:targetFamilyiPhone'] === '1' ? 1 : 0;
          $scope.settings.targetFamilyiPad_ios = preference['monaca:targetFamilyiPad'] === '1' ? 1 : 0;
        }

        // Splash Screen
        $scope.settings.config_auto_hide_splash_screen = preference.AutoHideSplashScreen;
        $scope.settings.config_fade_splash_screen = preference.FadeSplashScreen === 'true';
        $scope.settings.config_show_splash_screen_spinner = preference.ShowSplashScreenSpinner === 'true';
        $scope.settings.ios_splash_type = config.iosSplashType || 'legacy';
        $scope.displaySplashImages = $scope.splashImages[$scope.settings.ios_splash_type];

        // Misc
        $scope.settings.config_access_origin_ios = config.accessOrigin;
        $scope.settings.config_disallow_overscroll_ios = preference.DisallowOverscroll === 'true';
        $scope.settings.config_enable_viewport_scale = preference.EnableViewportScale === 'true';
        $scope.settings.config_orientation_ios = config.Orientation || 'all';
        if ($scope.cordovaVersion < 10) {
          $scope.settings.config_webview_engine_ios = config.webviewEngine || 'uiwebview';
        }

        // 比較のため現在の設定内容を取得
        oldSettings = Object.assign({}, $scope.settings);

        $scope.rpg_background_images_ios = projectInfo.rpg_background_images;
        if (projectInfo.selected_rpg_background_image) {
          $scope.settings.selected_rpg_background_image_ios = projectInfo.selected_rpg_background_image.ios || '';
        }

        $scope.isInitialized = true;
        $scope.isReadyToSave = true;
      });
    };

    $scope.valueChanged = function (fieldName) {
      return oldSettings[fieldName] !== $scope.settings[fieldName];
    };

    $scope.uploadImage = function (element) {
      var file = element.files[0];
      var uploadType = element.name;
      if (uploadType === 'icon_1024_ios') {
        PNG.parse(file)
          .then((png) => {
            if (png.hasAlpha) {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'danger',
                content: gettextCatalog.getString('Images containing transparent backgrounds or alpha channels can not be set.')
              });
            } else {
              _uploadImage(file, uploadType);
            }
          });
      } else {
        _uploadImage(file, uploadType);
      }
    };

    var _uploadImage = function (file, uploadType) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to overwrite this file?');
          }
        }
      }).result.then(function () {
        var types = (function () {
          if (uploadType === 'icon_all_ios') {
            return Object.keys($scope.iconTypeList);
          } else if (uploadType === 'splash_all_ios') {
            return Object.keys($scope.splashImages.legacy);
          } else {
            return [uploadType];
          }
        })();

          // show loading icons
        types.forEach(function (type) {
          $scope.isLoading[type] = true;
        });

        // reload updated images
        MonacaApi.Ide.Project.uploadSettingImage(projectId, uploadType, file)
          .then(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                document.getElementById('image-' + type).src = $scope.createSettingImageUrl(projectId, type) + '&t=' + (new Date()).getTime();
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('Successfully uploaded.')
            });
          })
          .catch(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to upload file.')
            });
          });
      })
        .catch((e) => {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: e
          });
        });
    };

    $scope.submit = function () {
      var data = { ios: Object.assign({}, $scope.settings) };

      // specifyBundleVersionがチェックされていなければbundleVersionの値は送らない
      if (!$scope.specifyBundleVersion) {
        data.ios.bundleVersion_ios = '';
      }

      $scope.isReadyToSave = false;
      $scope.saving = true;
      MonacaApi.Ide.Project.saveProjectSetting(projectId, data).then(function () {
        $scope.isReadyToSave = true;
        $scope.saving = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Successfully saved')
        });
        ProjectSettingFactory.reload();
        oldSettings = Object.assign({}, $scope.settings);
        $scope.$apply();
      });
    };

    $scope.attemptSplashTypeChange = function () {
      var change_to = $scope.settings.ios_splash_type;
      var change_from = change_to === 'legacy' ? 'storyboard' : 'legacy';

      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Changing your splash screen type will modify your config.xml. Do you want to continue?');
          }
        }
      }).result.then(function () {
        $scope.setSplashType(change_to);
      }, function () {
        $scope.settings.ios_splash_type = change_from;
      });
    };

    $scope.setSplashType = function (type) {
      $scope.splashTypeIsChanging = true;
      MonacaApi.Ide.Project.setIosSplashType(projectId, type)
        .then(function () {
          $scope.splashTypeIsChanging = false;
          $scope.settings.ios_splash_type = type;
          $scope.displaySplashImages = $scope.splashImages[type];
          $scope.$apply();
          ProjectSettingFactory.reload();
        })
        .catch(function () {
          $scope.splashTypeIsChanging = false;
          $scope.displaySplashImages = $scope.splashImages[type];
          $scope.$apply();
        });
    };
  }]);

;angular.module('monacaIDE')
  .controller('IosBuildController',
    ['$scope', '$controller', 'gettextCatalog', 'Constant', 'PubSub', 'ProjectFactory', 'ProjectService',
      function ($scope, $controller, gettextCatalog, Constant, PubSub, ProjectFactory, ProjectService) {

        angular.extend(this, $controller('BaseBuildController', { $scope: $scope }));

        $scope.platform = 'ios';
        $scope.profile = {};
        $scope.flag_monaca_hosting_app = { 'ios': false };
        $scope.hasSimulatorBuild = $scope.cordovaVersion >= 7;
        $scope.project = ProjectFactory;

        ProjectFactory.loading.then(function () {
          $scope.isCustomBuildDebuggerServiceEnabled = ProjectFactory.hasCustomDebugBuildService('ios');
        });

        $scope.openBuildEnvironment = function () {
          PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
            open: true,
            componentState: {
              id: 'buildEnvironment',
              title: gettextCatalog.getString('Build Environment Settings'),
              icon: 'settings',
              templateUrl: 'build/BuildEnvironmentSettings.html'
            }
          });
        };

        $scope.manageBuildSettings = function () {
          if ($scope.isAppMode()) {
            $scope.setPage(Constant.PAGE_IOS_BUILD_SETTINGS, true);
          } else {
            PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
              open: true,
              componentState: {
                id: 'buildsettingsios',
                title: gettextCatalog.getString('Build Settings for iOS'),
                icon: 'settings',
                templateUrl: 'build/IosBuildSettings.html'
              }
            });
          }
        };

        $scope.initProfiles = function (result) {
          if ($scope.purpose === 'simulator') {
            return {};
          }

          if (result.project.ios && result.project.ios.prov_settings) {
            $scope.defaultProvList = result.project.ios.prov_settings;
          } else {
            $scope.defaultProvList = {};
          }

          return MonacaApi.Ide.IosCert.getProvisioningFileList().then(function (response) {
            // ProvisioningProfileを読み込み初期値設定
            var profiles = {
              'development': [],
              'release': [],
              'adhoc': [],
              'inhouse': []
            };

            // セレクトボックス用の値と表示値を設定
            var _profiles = response.body.result ? response.body.result : [];
            _profiles.forEach(function (v) {
              if (profiles.hasOwnProperty(v.type)) {
                v['value'] = v.crt.crt_id + ':' + v.prov_id;
                v['label'] = v.prov_name + '  ( ' + v.crt.cn + ' ) ';
                profiles[v.type].push(v);
              }
            });

            // 一つ目の要素を初期値として設定しておく
            $scope.profile = {
              'debug': profiles.development.length ? profiles.development[0].value : null,
              'debugger': profiles.development.length ? profiles.development[0].value : null,
              'release': profiles.release.length ? profiles.release[0].value : null,
              'adhoc': profiles.adhoc.length ? profiles.adhoc[0].value : null,
              'inhouse': profiles.inhouse.length ? profiles.inhouse[0].value : null
            };

            // 最後に使われたProvisioningProfileを初期値に設定
            for (var type in $scope.defaultProvList) {
              var data = $scope.defaultProvList[type];
              if (data && data.crt_id && data.prov_id) {
                var targetKey = data.crt_id + ':' + data.prov_id;

                var exists = false;
                Object.keys(profiles).forEach(function (key) {
                  if (profiles[key] && profiles[key].length) {
                    profiles[key].forEach(function (profile) {
                      if (profile.value === targetKey) exists = true;
                    });
                  }
                });

                if (exists) {
                  $scope.profile[type] = targetKey;
                }
              }
            }

            $scope.profiles = profiles;
            $scope.$apply();
          });
        };

        $scope.createBuildParameters = function () {
          var params = {};

          if ($scope.purpose === 'simulator') {
            return params;
          }

          // get crt_id & prov_id from selectbox
          var str = $scope.profile[$scope.purpose] || null;
          if (str) {
            params = {
              crt_id: str.split(':')[0],
              prov_id: str.split(':')[1]
            };
          }

          if ($scope.flag_monaca_hosting_app.ios) {
            params.inapp_updater_env = $scope.purpose;
            params.purpose = 'inapp_updater';
            params.update_number = '1';
          }

          return params;
        };

        $scope.changeProfile = function () {
          $scope.updating = true;
          $scope.checkBuildSettings().then(function () {
            $scope.updating = false;
          });
        };

        $scope.canDownloadDsym = window.config.client.service.has_dsym_download;
        const parentCheckBuildSettings = $scope.checkBuildSettings;
        $scope.checkBuildSettings = function () {
          return parentCheckBuildSettings().then(function () {
            $scope.dSYMLoading = true;
            ProjectService.getBuildEnvironmentSetting(window.config.projectId)
              .then(env => {
                $scope.dSYMEnabled = env.ios.dSYM;
                $scope.dSYMLoading = false;
              })
              .catch(() => {
                $scope.dSYMEnabled = false;
                $scope.dSYMLoading = false;
              });
          });
        };
      }]);

;
angular.module('monacaIDE').controller('IosBuildSettingsController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  'PubSub',
  'Constant',
  'CommonFunctionService',
  function ($scope, gettextCatalog, $modal, PubSub, Constant, CommonFunctionService) {

    var projectId = window.config.projectId;

    $scope.crts = [];
    $scope.keys = [];
    $scope.hasPrivateKeys = false;

    var crtLabels = {
      development: 'Dev',
      distribution: 'Prod'
    };

    var provLabels = {
      development: 'Dev',
      release: 'Dist',
      adhoc: 'AdHoc',
      inhouse: 'InHouse'
    };

    var crtColors = {
      development: 'blue',
      distribution: 'red'
    };

    var provColors = {
      development: 'blue',
      release: 'red',
      adhoc: 'green',
      inhouse: 'purple'
    };

    $scope.init = function () {
      $scope.updatePage();
    };

    $scope.updatePage = function () {
      $scope.updating = true;

      MonacaApi.Ide.Project.getFileList(projectId).then(function (res) {
        $scope.$apply(function () {
          var fileList = res.body.result.filelist || {};
          $scope.hasOldDevCert = fileList.hasOwnProperty('dev_certification_ios');
          $scope.hasOldProdCert = fileList.hasOwnProperty('certification_ios');
        });
      });

      MonacaApi.Ide.IosCert.getPrivateKeyList().then(function (response) {
        $scope.$apply(function () {
          var crts = [];
          var keys = [];
          var result = response.body.result || [];
          result.forEach(function (privateKey) {
            if (privateKey.crts && privateKey.crts.length) {
              privateKey.crts.forEach(function (crt) {
                crt.has_expired_prov = false;
                crt.color = crtColors[crt.type] || 'blue';
                crt.label = crtLabels[crt.type] || '-';
                if (crt.expiration) {
                  crt.expirationms = crt.expiration * 1000;
                } else {
                  crt.expirationms = null;
                }
                crt.provs.forEach(function (prov) {
                  if (prov.expired) {
                    crt.has_expired_prov = true;
                  }
                  prov.color = provColors[prov.type] || 'blue';
                  prov.label = provLabels[prov.type] || '-';
                });
              });
              crts = crts.concat(privateKey.crts);
            } else {
              keys.push(privateKey);
            }
          });
          $scope.crts = crts;
          $scope.keys = keys;
          $scope.hasPrivateKeys = result.length > 0;
          $scope.updating = false;
          PubSub.publish('ios-build-settings-update');
        });
      });
    };

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.uploadCertificate = function (element) {
      MonacaApi.Ide.IosCert.saveCertificate(element.files[0]).then(function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('The file has been uploaded')
        });
        $scope.updatePage();
      }, function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: response.body.message
        });
      });
    };

    $scope.uploadProvisioningProfile = function (element) {
      MonacaApi.Ide.IosCert.saveProvisioningProfile(element.files[0]).then(function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('The file has been uploaded')
        });
        $scope.updatePage();
      }, function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: response.body.message
        });
        $scope.updatePage();
      });
    };

    $scope.openPrivateKeyGenerateDialog = function () {
      MonacaApi.Ide.Constants.countryList().then(function (response) {
        var countryList = response.body.result || [];
        countryList.forEach(function (v) {
          v.label = (v[window.config.lang] || v.en) + ' (' + v.code + ')';
        });
        $modal.open({
          templateUrl: 'build/dialogs/PrivateKeyAndCsrGeneratorDialog.html',
          controller: 'PrivateKeyAndCsrGeneratorDialogController',
          windowClass: 'ios-private-key-generator-dialog',
          backdrop: 'static',
          resolve: {
            countryList: function () {
              return countryList;
            }
          }
        }).result.then(function () {
          $scope.updatePage();
        });
      });
    };

    $scope.openImportPKCSDialog = function () {
      $modal.open({
        templateUrl: 'build/dialogs/PrivateKeyImportDialog.html',
        controller: 'PrivateKeyImportDialogController',
        backdrop: 'static'
      }).result.then(function () {
        $scope.updatePage();
      });
    };

    $scope.openExportCertificateDialog = function (crtId) {
      $modal.open({
        templateUrl: 'build/dialogs/CertificateExportDialog.html',
        controller: 'CertificateExportDialogController',
        resolve: {
          crtId: function () {
            return crtId;
          },
          oldType: function () {
            return null;
          }
        }
      });
    };

    $scope.openExportPreviousCertificateDialog = function (oldType) {
      $modal.open({
        templateUrl: 'build/dialogs/CertificateExportDialog.html',
        controller: 'CertificateExportDialogController',
        resolve: {
          crtId: function () {
            return null;
          },
          oldType: function () {
            return oldType;
          }
        }
      });
    };

    $scope.openExportProvisioningProfileDialog = function (provId) {
      window.location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/user/ios/downloadprov?id=' + encodeURIComponent(provId) + '&api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.openExportCsrDialog = function (keyId) {
      $modal.open({
        templateUrl: 'build/dialogs/CsrExportDialog.html',
        controller: 'CsrExportDialogController',
        resolve: {
          keyId: function () {
            return keyId;
          }
        }
      });
    };

    $scope.openDeletePrivateKeyDialog = function (key) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to delete this private key?') +
              '<div style="margin:10px;">' + CommonFunctionService.htmlspecialchars(key.email) + '</div>';
          }
        }
      }).result.then(function () {
        MonacaApi.Ide.IosCert.deletePrivateKeyAndCSR(key.key_id).then(function (response) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('The file has been deleted')
          });
          $scope.updatePage();
        });
      });
    };

    $scope.openDeleteCertificateDialog = function (crt) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to delete this certificate?') +
              '<div style="margin:10px;">' + crt.cn + '</div>';
          }
        }
      }).result.then(function () {
        MonacaApi.Ide.IosCert.deleteCertificate(crt.crt_id).then(function (response) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('The file has been deleted')
          });
          $scope.updatePage();
        });
      });
    };

    $scope.openDeleteProvisioningProfileDialog = function (prov) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to delete this provisioning profile?') +
              '<div style="margin:10px;">' + prov.prov_name + '</div>';
          }
        }
      }).result.then(function () {
        MonacaApi.Ide.IosCert.deleteProvisioningProfile(prov.prov_id).then(function (response) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('The file has been deleted')
          });
          $scope.updatePage();
        });
      });
    };

    $scope.htmlspecialchars = function (text) {
      return CommonFunctionService.htmlspecialchars(text);
    };

  }]);

;angular.module('monacaIDE').controller('ServiceIntegrationController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  '$window',
  'PubSub',
  'Constant',
  'ServiceIntegrationService',
  function ($scope, gettextCatalog, $modal, $window, PubSub, Constant, ServiceIntegrationService) {
    this.loading = true;
    this.category = '';
    this.services = [];

    ServiceIntegrationService.list().then(
      function (resp) {
        this.services = resp.result;
        this.loading = false;
      }.bind(this),
      function (error) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString(
            'An unexpected error has occurred with the message of "{{error_message}}". Please try again.', {
              error_message: error
            }
          )
        });

        this.loading = false;
      }.bind(this)
    );

    this.openWebsite = function (url) {
      $window.open(url);
    };

    this.showDetails = function (service) {
      $modal.open({
        templateUrl: 'build/ServiceIntegrationDetailDialog.html',
        controller: 'ServiceIntegrationDetailDialogController',
        windowClass: 'service-integration-detail',
        resolve: {
          service: service
        }
      });
    };
  }]);

;angular.module('monacaIDE').controller('ServiceIntegrationDetailDialogController', [
  '$scope',
  '$sce',
  '$uibModal',
  'service',
  function ($scope, $sce, $modal, service) {
    $scope.service = service;
    $scope.description = $sce.trustAsHtml($scope.service.full_description);
    $scope.features = $sce.trustAsHtml($scope.service.service_features);

    $scope.showSetupConfirmWindow = function () {
      if (!$scope.service.installable) {
        return;
      }

      // Close Current Dialog and Open Confirm Dialog.
      $scope.$close();

      $modal.open({
        templateUrl: 'build/ServiceIntegrationSetupDialog.html',
        controller: 'ServiceIntegrationSetupDialogController',
        windowClass: 'service-integration-setup-confirm',
        resolve: {
          service: $scope.service
        }
      });
    };
  }]);

;angular.module('monacaIDE').controller('ServiceIntegrationSetupDialogController', [
  '$scope',
  '$q',
  '$uibModal',
  'gettextCatalog',
  'PubSub',
  'Constant',
  'CordovaPluginService',
  'WebComponentFactory',
  'service',
  function ($scope, $q, $modal, gettextCatalog, PubSub, Constant, CordovaPluginService, WebComponentFactory, service) {
    $scope.service = service;
    $scope.page = 'confirm';

    $scope.confirmOk = function () {
      // Display Processing
      $scope.page = 'progress';

      // Collect a collection of component and plugin install/enable promises.
      var promiseCollection = [];
      // var failedItems = []; // unused

      // Loop though the cordova plugins.
      service.integration_data.match_cordova_plugins.forEach(function (plugin) {
        promiseCollection.push(CordovaPluginService.enable(plugin.url));
      });

      // Loop though the bower components.
      service.integration_data.bower_components.forEach(function (component) {
        promiseCollection.push(WebComponentFactory.install(component.name, component.version));
      });

      var componentNameCollection;

      function openBowerManageDialog ($scope, componentNameCollection, componentDataCollection, componentName) {
        // Add name to component data.
        componentDataCollection[componentName].name = componentName;

        $modal.open({
          templateUrl: 'build/WebComponentManageDialog.html',
          controller: 'WebComponentManageDialogController',
          windowClass: 'web-component-manage',
          resolve: {
            component: function () {
              return componentDataCollection[componentName];
            },
            isConfigure: function () {
              return true;
            }
          }
        }).closed.then(function () {
          if (componentNameCollection.length === 0) {
            $scope.page = 'complete';
          } else {
            var componentName = componentNameCollection.shift();
            openBowerManageDialog($scope, componentNameCollection, componentDataCollection, componentName);
          }
        });
      }

      $q.all(promiseCollection).then(function (installResults) {
        installResults.forEach(function (installResult) {
          if (installResult && installResult.result && !angular.isArray(installResult.result)) {
            if (!componentNameCollection) {
              componentNameCollection = Object.keys(installResult.result);
            }

            var componentName = componentNameCollection.shift();
            openBowerManageDialog($scope, componentNameCollection, installResult.result, componentName);
          } else {
            $scope.page = 'complete';
          }
        });
      }, function (errors) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString(
            'Failed to install "{{service}}" service. One or more dependencies has failed to install.', {
              service: $scope.service.name
            }
          )
        });
        $scope.$close();
      });
    };
  }]);

;angular.module('monacaIDE').controller('WebAppSettingsController', [
  '$scope',
  '$uibModal',
  'gettextCatalog',
  'ProjectSettingFactory',
  'PubSub',
  'Constant',
  function ($scope, $modal, gettextCatalog, ProjectSettingFactory, PubSub, Constant) {
    var projectId = window.config.projectId;
    const now = Date.now();

    $scope.isLoading = {};
    $scope.settings = {};
    $scope.hasIconSet = true; // TODO check icon sets exists

    $scope.timestamp = function () {
      return now;
    };

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.dirCollection = [
      {value: 'auto', label: 'Auto'},
      {value: 'ltr', label: 'Left-to-Right'},
      {value: 'rtl', label: 'Right-to-Left'}
    ];

    $scope.languageCollection = [
      {value: 'en', label: 'en'},
      {value: 'ja', label: 'ja'},
      {value: 'de', label: 'de'},
      {value: 'es', label: 'es'},
      {value: 'fr', label: 'fr'},
      {value: 'it', label: 'it'},
      {value: 'pt', label: 'pt'},
      {value: 'zh-CN', label: 'zh-CN'},
      {value: 'ko', label: 'ko'}
    ];

    $scope.displayCollection = [
      {value: 'fullscreen', label: 'Fullscreen'},
      {value: 'standalone', label: 'Standalone'},
      {value: 'minimal-ui', label: 'Minimal UI'},
      {value: 'browser', label: 'Browser'}
    ];

    $scope.orientationCollection = [
      {value: 'any', label: 'Any'},
      {value: 'natural', label: 'Natural'},
      {value: 'landscape', label: 'Landscape'},
      {value: 'landscape-primary', label: 'Landscape Primary'},
      {value: 'landscape-secondary', label: 'Landscape Secondary'},
      {value: 'portrait', label: 'Portrait'},
      {value: 'portrait-primary', label: 'Portrait Primary'},
      {value: 'portrait-secondary', label: 'Portrait Secondary'}
    ];

    $scope.createSettingImageUrl = function (projectId, type) {
      return window.MonacaApi.Config.getServiceEndpoint(
        window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/file/read/' + type + '?api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.iconTypeList = (function () {
      var list = {
        'icon_pwa_48': {w: 48, h: 48, label: ''},
        'icon_pwa_72': {w: 72, h: 72, label: ''},
        'icon_pwa_96': {w: 96, h: 96, label: ''},
        'icon_pwa_128': {w: 128, h: 128, label: ''},
        'icon_pwa_144': {w: 144, h: 144, label: ''},
        'icon_pwa_152': {w: 152, h: 152, label: ''},
        'icon_pwa_168': {w: 168, h: 168, label: ''},
        'icon_pwa_192': {w: 192, h: 192, label: ''},
        'icon_pwa_256': {w: 256, h: 256, label: ''}
      };

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.init = function () {
      $scope.loading = true;
      ProjectSettingFactory.loading.then(function (result) {
        $scope.loading = false;
        var manifest = result.manifest && result.manifest.pwa ? result.manifest.pwa : {};

        $scope.settings.name = manifest.name || '';
        $scope.settings.short_name = manifest.short_name || '';
        $scope.settings.description = manifest.description || '';
        $scope.settings.lang = manifest.lang || 'en';
        $scope.settings.dir = manifest.dir || 'ltr';
        $scope.settings.scope = manifest.scope || './';
        $scope.settings.start_url = manifest.start_url || './';
        $scope.settings.display = manifest.display || 'fullscreen';
        $scope.settings.orientation = manifest.orientation || 'any';
        $scope.settings.background_color = manifest.background_color || '';
        $scope.settings.theme_color = manifest.theme_color || '';
        // $scope.settings.prefer_related_applications = manifest.prefer_related_applications || false;

        $scope.isInitialized = true;
        $scope.isReadyToSave = true;
      });
    };

    $scope.uploadImage = function (element) {
      var file = element.files[0];
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to overwrite this file?');
          }
        }
      }).result.then(function () {
        var uploadType = element.name;
        var types = (function () {
          if (uploadType === 'icon_all_pwa') {
            return Object.keys($scope.iconTypeList);
          } else if (uploadType === 'splash_all_pwa') {
            return Object.keys($scope.splashImages.legacy);
          } else {
            return [uploadType];
          }
        })();
        // show loading icons
        types.forEach(function (type) {
          $scope.isLoading[type] = true;
        });
        // reload updated images
        MonacaApi.Ide.Project.uploadSettingImage(projectId, uploadType, file)
          .then(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                document.getElementById('image-' + type).src = $scope.createSettingImageUrl(projectId, type) + '&t=' + (new Date()).getTime();
                document.getElementById('image-' + type).style.display = 'block';
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('Successfully uploaded.')
            });
          })
          .catch(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to upload file.')
            });
          });
      });
    };

    $scope.submit = function () {
      var data = {pwa: Object.assign({}, $scope.settings)};

      $scope.isReadyToSave = false;
      $scope.saving = true;
      MonacaApi.Ide.Project.saveProjectSetting(projectId, data).then(function () {
        $scope.isReadyToSave = true;
        $scope.saving = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Successfully saved')
        });
        ProjectSettingFactory.reload();
        $scope.$apply();
      });
    };
  }]);

;angular.module('monacaIDE').controller('WebBuildController', [
  '$scope', '$controller', 'gettextCatalog', 'Constant', 'PubSub',
  function ($scope, $controller, gettextCatalog, Constant, PubSub) {
    angular.extend(this, $controller('BaseBuildController', { $scope: $scope }));
    $scope.platform = 'pwa';
    $scope.type = 'release';
    $scope.purpose = 'release';

    $scope.manageAppSettings = function () {
      if ($scope.isAppMode()) {
        $scope.setPage(Constant.PAGE_WEB_APP_SETTINGS, true);
      } else {
        PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
          open: true,
          componentState: {
            id: 'appsettingspwa',
            title: gettextCatalog.getString('App Settings for PWA'),
            icon: 'settings',
            templateUrl: 'build/WebAppSettings.html'
          }
        });
      }
    };
  }
]);

;angular.module('monacaIDE').controller('WebComponentController', [
  '$scope',
  'gettextCatalog',
  '$uibModal',
  '$window',
  'PubSub',
  'Constant',
  'WebComponentFactory',
  function ($scope, gettextCatalog, $modal, $window, PubSub, Constant, WebComponentFactory) {
    this.loading = true;
    this.searchword = '';
    this.WebComponentFactory = WebComponentFactory;

    function unexpectedErrorNotice (error) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: gettextCatalog.getString(
          'An unexpected error has occurred with the message of "{{error_message}}". Please try again.', {
            error_message: error
          }
        )
      });
    }

    WebComponentFactory.loading.then(
      function (resp) {
        this.loading = false;
      }.bind(this),
      function (error) {
        unexpectedErrorNotice(error);
        this.loading = false;
      }.bind(this)
    );

    this.remove = function (component) {
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        windowClass: 'web-component-remove',
        resolve: {
          title: function () {
            return gettextCatalog.getString('Remove JS/CSS Component');
          },

          message: function () {
            return gettextCatalog.getString('Are you sure you would want to remove this component?');
          }
        }
      }).result.then(function (result) {
        if (result) {
          WebComponentFactory.uninstall(component.name).then(
            function (resp) {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'success',
                content: gettextCatalog.getString(
                  'Successfully uninstalled JS/CSS Component: "{{component_name}}"', {
                    component_name: component.name
                  }
                )
              });
              PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);
            },

            unexpectedErrorNotice.bind(this)
          );
        }
      });
    };

    this.add = function (component) {
      openManageDialog(component, false);
    };

    this.configure = function (component) {
      openManageDialog(component, true);
    };

    function openManageDialog (component, isConfigure) {
      return $modal.open({
        templateUrl: 'build/WebComponentManageDialog.html',
        controller: 'WebComponentManageDialogController',
        windowClass: 'web-component-manage',
        backdrop: 'static',
        keyboard: false,
        resolve: {
          component: function () {
            return component;
          },
          isConfigure: function () {
            return isConfigure;
          }
        }
      });
    }

    $scope.searchForComponents = function () {
      WebComponentFactory.fetchList(this.searchword);
    }.bind(this);
  }])
  .filter('componentsearch', function () {
    return function (components, words) {
      if (!words) return components;
      words = words.toLowerCase();

      var filteredList = [];

      for (var id in components) {
        var component = components[id];

        if (component.name.toLowerCase().indexOf(words) >= 0 || component.displayName.toLowerCase().indexOf(words) >= 0) {
          filteredList.push(component);
        }
      }

      return filteredList;
    };
  });

;angular.module('monacaIDE').controller('WebComponentManageDialogController', [
  '$scope',
  'Constant',
  'gettextCatalog',
  'PubSub',
  'WebComponentFactory',
  'component',
  'isConfigure',
  function ($scope, Constant, gettextCatalog, PubSub, WebComponentFactory, component, isConfigure) {
    $scope.page = 'loading';
    $scope.loadingText = gettextCatalog.getString('Loading Component Data...');

    // Initial Component Data
    $scope.component = component;

    // Configure vs Install
    $scope.isConfigure = isConfigure;

    // Install Params
    $scope.description = '';
    $scope.versions = [];
    $scope.selectedVersion = '';

    // Configure Params
    $scope.componentData = [];
    $scope.configureFormData = {};

    function unexpectedErrorNotice (error) {
      var content = gettextCatalog.getString('An unexpected error has occurred with the message of "{{error_message}}". Please try again.', { error_message: error });

      if (error.status === 404) {
        content = gettextCatalog.getString("The componsent is not found. Please check the original repository. <a href='https://bower.io/search/' target='_blank'>bower.io</a>");
      } else if (isJqueryConflictError(error)) {
        var obj = JSON.parse(error.body);
        content = obj.reasons.reason;
      }

      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: content
      });

      $scope.$close();

      function isJqueryConflictError (error) {
        if (error.body) {
          var obj = JSON.parse(error.body);
          if (obj.reasons && obj.reasons.reason && obj.reasons.version === 'conflict') {
            return true;
          }
        }
        return false;
      }
    }

    function formatComponentData (data) {
      for (var component in data) {
        if (!data[component].files) {
          continue;
        }

        data[component].componentKey = component;

        if ((!data[component].files.monaca || !data[component].files.monaca.main) && !data[component].files.loaderFiles) {
          $scope.componentData.push(data[component]);
          continue;
        }

        // Set initial configureFormData that the user can not change for example required items.
        if (!$scope.configureFormData[component]) {
          $scope.configureFormData[component] = {};
        }

        if (data[component].files.monaca && data[component].files.monaca.main) {
          data[component].files.monaca.main.forEach(function (data) {
            $scope.configureFormData[component][data] = true;
          });
        }

        if (data[component].files.loaderFiles) {
          data[component].files.loaderFiles.cssFiles.forEach(function (data) {
            $scope.configureFormData[component][data] = true;
          });

          data[component].files.loaderFiles.jsFiles.forEach(function (data) {
            $scope.configureFormData[component][data] = true;
          });
        }

        $scope.componentData.push(data[component]);
      }
    }

    WebComponentFactory.fetchComponentDetails(component.name, $scope.isConfigure).then(
      function (resp) {
        if ($scope.isConfigure) {
          // Prepare for Configure Display
          formatComponentData(resp.result);

          $scope.page = 'configure';
        } else {
          // Prepare for Install Display
          $scope.description = resp.result[component.name].latest.description;
          $scope.versions = resp.result[component.name].versions;
          $scope.selectedVersion = $scope.versions[0];

          $scope.page = 'confirm';
        }
      },

      unexpectedErrorNotice.bind(this)
    );

    $scope.confirmInstall = function () {
      $scope.loadingText = gettextCatalog.getString('Installing Component: "{{component}}"', {
        component: $scope.component.name
      });
      $scope.page = 'loading';

      WebComponentFactory.install($scope.component.name, $scope.selectedVersion).then(
        function (resp) {
          // Prepare for Configure Display
          formatComponentData(resp.result);
          PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);

          $scope.page = 'configure';
        },
        unexpectedErrorNotice.bind(this)
      );
    };

    $scope.saveChanges = function () {
      // Format configureFormData for setLoader Request.
      var formatedRequestBody = {};

      for (var componentName in $scope.configureFormData) {
        formatedRequestBody[componentName] = Object.keys($scope.configureFormData[componentName]).filter(
          function (key) {
            return $scope.configureFormData[componentName][key];
          }
        );
      }

      WebComponentFactory.setLoader(formatedRequestBody).then(
        function (resp) {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Successfully configured JS/CSS Component')
          });
          PubSub.publish(Constant.EVENT.RELOAD_IDE_FILETREE);

          $scope.$close();
        },

        unexpectedErrorNotice.bind(this)
      );
    };
  }]);

;
angular.module('monacaIDE').controller('WindowsAppSettingsController', [
  '$scope',
  '$uibModal',
  'gettextCatalog',
  'ProjectSettingFactory',
  'PubSub',
  'Constant',
  function ($scope, $modal, gettextCatalog, ProjectSettingFactory, PubSub, Constant) {

    var projectId = window.config.projectId;
    var oldSettings = {};

    const now = Date.now();

    $scope.isLoading = {};
    $scope.settings = {};

    $scope.timestamp = function () {
      return now;
    };

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.createSettingImageUrl = function (projectId, type) {
      return window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/file/read/' + type + '?api_token=' + window.MonacaApi.Config.getApiToken();
    };

    $scope.appLogoList = (function () {
      var list = {
        'app_logo_winrt': { w: 150, h: 150, label: '' },
        'package_logo_winrt': { w: 50, h: 50, label: '' },
        'app_small_logo_winrt': { w: 30, h: 30, label: '' }
      };

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.tileWideLogoList = (function () {
      var list = {
        'app_tile_wide_logo_winrt': { w: 310, h: 150, label: '' }
      };

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.splashTypeList = (function () {
      var list = {
        'app_splash_screen_winrt': { w: 620, h: 300, label: '' }
      };

      for (var key in list) {
        list[key].url = $scope.createSettingImageUrl(projectId, key);
      }

      return list;
    })();

    $scope.archList = [
      { value: '', label: 'AnyCPU' },
      { value: 'x86', label: 'x86' },
      { value: 'x64', label: 'x64' },
      { value: 'arm', label: 'Arm' }
    ];

    $scope.init = function () {
      $scope.loading = true;
      ProjectSettingFactory.loading.then(function (result) {
        $scope.loading = false;
        // set default values
        // var projectInfo = result.project || {}; // unused
        var config = result.config && result.config.winrt ? result.config.winrt : {};
        var manifest = result.manifest && result.manifest.winrt ? result.manifest.winrt : {};
        var preference = config.preference || {};

        // Application Information
        $scope.settings.identity_name_winrt = preference.WindowsStoreIdentityName ? preference.WindowsStoreIdentityName : manifest.identity_name_winrt;
        $scope.settings.app_display_name_winrt = manifest.app_display_name_winrt;
        $scope.settings.identity_version_winrt = manifest.identity_version_winrt;
        $scope.settings.packageVersion_winrt = manifest.packageVersion_winrt;
        $scope.settings.app_description_winrt = manifest.app_description_winrt;
        $scope.settings.package_publisher_display_name_winrt = manifest.package_publisher_display_name_winrt;
        $scope.settings.app_arch_winrt = manifest.app_arch_winrt || '';
        $scope.specifyPackageVersion = !!$scope.settings.packageVersion_winrt;

        // Splash
        $scope.settings.app_splash_background_winrt = manifest.app_splash_background_winrt || '';
        if ($scope.settings.app_splash_background_winrt === 'undefined') {
          $scope.settings.app_splash_background_winrt = '';
        }

        // 比較のため現在の設定内容を取得
        oldSettings = Object.assign({}, $scope.settings);

        $scope.isInitialized = true;
        $scope.isReadyToSave = true;

        // check pfx file exists
        MonacaApi.Ide.Project.getFileList(projectId).then(function (res) {
          var fileList = res.body.result.filelist;
          if (fileList && fileList.debug_pfx_winrt) {
            $scope.hasPfx = true;
          }
          $scope.$apply();
        });
      });
    };

    $scope.valueChanged = function (fieldName) {
      return oldSettings[fieldName] !== $scope.settings[fieldName];
    };

    $scope.uploadCertificate = function (element) {
      MonacaApi.Ide.Project.uploadSetting(projectId, element.name, element.files[0]);
    };

    $scope.uploadImage = function (element) {
      var file = element.files[0];
      $modal.open({
        templateUrl: 'commonDialogs/ConfirmDialog.html',
        controller: 'ConfirmController',
        backdrop: true,
        resolve: {
          title: function () {
            return gettextCatalog.getString('Confirm');
          },
          message: function () {
            return gettextCatalog.getString('Are you sure to overwrite this file?');
          }
        }
      }).result.then(function () {

        var uploadType = element.name;
        var types = [uploadType];

        // show loading icons
        types.forEach(function (type) {
          $scope.isLoading[type] = true;
        });

        // reload updated images
        MonacaApi.Ide.Project.uploadSettingImage(projectId, uploadType, file)
          .then(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                document.getElementById('image-' + type).src = $scope.createSettingImageUrl(projectId, type) + '&t=' + (new Date()).getTime();
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('Successfully uploaded.')
            });
          })
          .catch(function () {
            $scope.$apply(function () {
              types.forEach(function (type) {
                $scope.isLoading[type] = false;
              });
            });
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Failed to upload file.')
            });
          });
      });
    };

    $scope.deleteImage = function (type) {
      MonacaApi.Ide.Project.deleteSettingImage(projectId, type);
    };

    $scope.openExportCertificateDialog = function () {
      $modal.open({
        templateUrl: 'build/dialogs/PackageCertificateExportDialog.html',
        controller: 'PackageCertificateExportDialogController'
      });
    };

    $scope.submit = function () {
      var data = { winrt: Object.assign({}, $scope.settings) };

      // バージョンコード指定にチェックが無い場合、バージョンコードの値を消しておく
      if (!$scope.specifyPackageVersion) {
        data.winrt.packageVersion_winrt = '';
      }

      $scope.isReadyToSave = false;
      $scope.saving = true;
      MonacaApi.Ide.Project.saveProjectSetting(projectId, data).then(function () {
        $scope.isReadyToSave = true;
        $scope.saving = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('Successfully saved')
        });
        ProjectSettingFactory.reload();
        oldSettings = Object.assign({}, $scope.settings);
        $scope.$apply();
      });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('WindowsBuildController', ['$scope', '$controller', 'PubSub', 'Constant', 'gettextCatalog', function ($scope, $controller, PubSub, Constant, gettextCatalog) {
    angular.extend(this, $controller('BaseBuildController', { $scope: $scope }));
    $scope.platform = 'windows';

    $scope.manageAppSettings = function () {
      if ($scope.isAppMode()) {
        $scope.setPage(Constant.PAGE_WINDOWS_APP_SETTINGS, true);
      } else {
        PubSub.publish(Constant.EVENT.TOGGLE_GENERIC_ANGULAR_VIEW, {
          open: true,
          componentState: {
            id: 'appsettingswindows',
            title: gettextCatalog.getString('App Settings for Windows'),
            icon: 'settings',
            templateUrl: 'build/WindowsAppSettings.html'
          }
        });
      }
    };
  }]);

;
angular.module('monacaIDE')
  .controller('AdHocQRCodeDialogController', ['$scope', '$uibModalInstance', 'url', function ($scope, $modalInstance, url) {

    $scope.qrCodeUrl = url;

    $scope.ok = function () {
      $modalInstance.close(true);
    };

  }]);

;
angular.module('monacaIDE')
  .controller('CertificateExportDialogController', ['$scope', '$uibModalInstance', 'crtId', 'oldType', function ($scope, $modalInstance, crtId, oldType) {

    $scope.password = '';

    $scope.exportCertificate = function () {
      var url;
      if (crtId) {
        url = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/user/ios/exportpkcs?type=crt&id=' + encodeURIComponent(crtId) + '&password=' + encodeURIComponent($scope.password) + '&api_token=' + window.MonacaApi.Config.getApiToken();
      } else if (oldType) {
        url = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/user/ios/exportpkcs?type=crt&oldType=' + encodeURIComponent(oldType) + '&password=' + encodeURIComponent($scope.password) + '&api_token=' + window.MonacaApi.Config.getApiToken();
      }
      window.location.href = url;
      $modalInstance.close(true);
    };
  }]);

;angular.module('monacaIDE').controller('ConfirmApkCheckDialogController', [
  '$scope',
  'gettextCatalog',
  '$window',
  'link',
  function ($scope, gettextCatalog, $window, link) {
    $scope.ok = function () {
      $window.open(link);
      $scope.$close();
    };
  }]
);

;
angular.module('monacaIDE')
  .controller('CsrExportDialogController', ['$scope', '$uibModalInstance', 'keyId', function ($scope, $modalInstance, keyId) {

    $scope.exportCsr = function () {
      window.location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/user/ios/downloadcsr?id=' + encodeURIComponent(keyId) + '&api_token=' + window.MonacaApi.Config.getApiToken();
      $modalInstance.close(true);
    };
  }]);

;angular.module('monacaIDE').controller('DeployServiceLogController', [
  '$scope',
  'service',
  function ($scope, service) {
    $scope.service = service;
  }]);

;angular.module('monacaIDE').controller('DeployServiceRequestController', [
  '$scope',
  'gettextCatalog',
  'DeployServiceFactory',
  'service',
  'queueId',
  function ($scope, gettextCatalog, DeployServiceFactory, service, queueId) {
    $scope.service = service;
    $scope.serviceOptionalParameters = '{}';
    $scope.showOptionalParamForm = service.service_type !== 'Firebase'; // TODO: Move Check process to server-side

    $scope.sendToDeployService = function () {
      // Set the status to processing
      service.manualProcessStatus = 'process';
      service.manualProcessResults = '';

      // Submit the Distribute Request
      DeployServiceFactory.distributeApp(
        window.config.projectId,
        service.service_type,
        service.alias,
        $scope.serviceOptionalParameters,
        queueId,
        null
      ).then(
        function (resp) {
          // Set to success and store response. Response not necessary to display.
          service.manualProcessStatus = 'finish';
          service.manualProcessResults = JSON.stringify(resp);
        },
        function (error) {
          // Set to error and store error. Error is required for user to identify issue.
          service.manualProcessStatus = 'failed';
          if (error.body && error.body.message) {
            service.manualProcessResults = error.body.message;
          } else if (error.body) {
            service.manualProcessResults = JSON.stringify(error.body);
          } else {
            service.manualProcessResults = gettextCatalog.getString('An unknown error has occurred while attempting to distribute your app to the selected third-party service.');
          }
        }
      );

      // Close the dialog. Distribute progress is displated on build result page.
      $scope.$close();
    };
  }]);

;
angular.module('monacaIDE')
  .controller('KeyStoreAddAliasDialogController', ['$scope', '$uibModalInstance', 'PubSub', 'Constant', 'gettextCatalog', function ($scope, $modalInstance, PubSub, Constant, gettextCatalog) {

    var projectId = window.config.projectId;

    $scope.cancel = function () {
      $modalInstance.dismiss(false);
    };

    $scope.ok = function () {
      if (!$scope.name || !$scope.password) return;
      MonacaApi.Ide.Project.addAlias(projectId, $scope.name, $scope.password)
        .then(function () {
          $modalInstance.close(true);
        })
        .catch(function (err) {
          if (err) console.error(err);
          let message = gettextCatalog.getString('Failed to Create Alias');
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: message
          });
        });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('KeyStoreExportDialogController', ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {

    var projectId = window.config.projectId;

    $scope.cancel = function () {
      $modalInstance.dismiss(false);
    };

    $scope.ok = function () {
      $scope.exporting = true;
      MonacaApi.Ide.Project.getDownloadToken(
        projectId,
        'keystore_android'
      ).then(function (response) {
        var token = response.body.result.dlToken;
        location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/export/keystore_android?mode=download&&dlToken=' + token + '&api_token=' + window.MonacaApi.Config.getApiToken();

        $scope.exporting = false;
        $modalInstance.close(true);
      });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('KeyStoreGeneratorDialogController', ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {

    var projectId = window.config.projectId;

    $scope.cancel = function () {
      $modalInstance.dismiss(false);
    };

    $scope.ok = function () {
      if (!$scope.alias_name || !$scope.alias_password || !$scope.keystore_password) return;
      $scope.generating = true;
      MonacaApi.Ide.Project.generateKeyStore(
        projectId,
        $scope.alias_name,
        $scope.alias_password,
        $scope.keystore_password
      ).then(function (response) {
        $scope.generating = false;
        $modalInstance.close(true);
      });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('KeyStoreImportDialogController', ['$scope', 'gettextCatalog', '$uibModalInstance', 'Constant', 'PubSub', function ($scope, gettextCatalog, $modalInstance, Constant, PubSub) {

    var projectId = window.config.projectId;
    $scope.selectedFile = null;

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.selectFile = function (element) {
      $scope.selectedFile = element.files[0];
      $scope.filePath = $scope.selectedFile.name;
      $scope.$apply();
    };

    $scope.cancel = function () {
      $modalInstance.dismiss(false);
    };

    $scope.ok = function () {
      if (!$scope.selectedFile || !$scope.password) return;
      $scope.importing = true;
      MonacaApi.Ide.Project.saveKeyStore(
        projectId,
        $scope.selectedFile,
        $scope.password,
        true // overwrite keystore or merge?
      ).then(function (response) {
        $scope.importing = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('KeyStore import succeeded')
        });
        $modalInstance.close(true);
      }, function (response) {
        $scope.importing = false;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: response.body.message
        });
      });
    };
  }]);

;
angular.module('monacaIDE')
  .controller('PackageCertificateExportDialogController', ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {

    var projectId = window.config.projectId;

    $scope.cancel = function () {
      $modalInstance.dismiss(false);
    };

    $scope.ok = function () {
      $scope.exporting = true;
      MonacaApi.Ide.Project.getDownloadToken(projectId, 'debug_pfx_winrt').then(function (response) {
        var token = response.body.result.dlToken;
        location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/project/' + projectId + '/export/debug_pfx_winrt?mode=download&&dlToken=' + token + '&api_token=' + window.MonacaApi.Config.getApiToken();
        $scope.exporting = false;
        $modalInstance.close(true);
      });
    };
  }]);

;
angular.module('monacaIDE').controller('PrivateKeyAndCsrGeneratorDialogController', [
  '$scope',
  'gettextCatalog',
  '$uibModalInstance',
  'PubSub',
  'Constant',
  'countryList',
  function ($scope, gettextCatalog, $modalInstance, PubSub, Constant, countryList) {

    var keyId = null;

    $scope.page = 'input';
    $scope.lang = window.config.lang;
    $scope.countryList = countryList;
    $scope.country = window.config.lang === 'ja' ? 'JP' : 'US';

    $scope.generatePrivateKeyAndCSR = function () {
      $scope.generating = true;
      MonacaApi.Ide.IosCert.generatePrivateKeyAndCSR(
        $scope.adcUsername_ios,
        $scope.adcMailAddress_ios,
        $scope.country
      ).then(function (response) {
        keyId = response.body.result;
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('CSR has been generated')
        });
        $scope.generating = false;
        $scope.page = 'success';
      }, function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: response.body.message
        });
        $scope.generating = false;
        $modalInstance.dismiss(false);
      });
    };

    $scope.exportCsr = function () {
      window.location.href = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_IDE) + '/api/user/ios/downloadcsr?id=' + encodeURIComponent(keyId) + '&api_token=' + window.MonacaApi.Config.getApiToken();
      $modalInstance.close(true);
    };

  }]);

;
angular.module('monacaIDE').controller('PrivateKeyImportDialogController', [
  '$scope',
  'gettextCatalog',
  '$uibModalInstance',
  'PubSub',
  'Constant',
  function ($scope, gettextCatalog, $modalInstance, PubSub, Constant) {

    $scope.selectedFile = null;
    $scope.selectedFilePath = '';
    $scope.password = '';

    $scope.openFileDialog = function (name) {
      document.querySelector('input[type=file][name=' + name + ']').click();
    };

    $scope.selectFile = function (element) {
      $scope.selectedFile = element.files[0];
      $scope.selectedFilePath = $scope.selectedFile.name;
      $scope.$apply();
    };

    $scope.importPrivateKey = function () {
      if (!$scope.selectedFile) return;
      $scope.importing = true;
      MonacaApi.Ide.IosCert.savePKCS(
        $scope.selectedFile,
        $scope.password
      ).then(function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'success',
          content: gettextCatalog.getString('The file has been uploaded')
        });
        $scope.importing = false;
        $modalInstance.close(true);
      }, function (response) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: response.body.message
        });
        $scope.importing = false;
        $modalInstance.dismiss(false);
      });
    };
  }]);

;angular.module('monacaIDE').controller('RestartPreviewServerController', ['$scope', '$uibModalInstance', '$sce', 'title', 'message', function ($scope, $modalInstance, $sce, title, message) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);

  $scope.ok = function () {
    $modalInstance.close(true);
  };
  $scope.cancel = function () {
    $modalInstance.dismiss(false);
  };
}]);

;angular.module('monacaIDE').controller('AlertController', ['$scope', '$sce', 'title', 'message', function ($scope, $sce, title, message) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);
}]);

;angular.module('monacaIDE').controller('ConfirmController', ['$scope', '$uibModalInstance', '$sce', 'title', 'message', function ($scope, $modalInstance, $sce, title, message) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);

  $scope.ok = function () {
    $modalInstance.close(true);
  };
  $scope.cancel = function () {
    $modalInstance.dismiss(false);
  };
}]);

angular.module('monacaIDE').controller('ConfirmWithCallbackController', ['$scope', '$uibModalInstance', '$sce', 'title', 'message', 'callback', function ($scope, $modalInstance, $sce, title, message, callback) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);

  $scope.ok = function () {
    $scope.isLoading = true;
    callback().then(function () {
      $modalInstance.close(true);
    }).finally(function () {
      $scope.isLoading = false;
    });
  };

  $scope.cancel = function () {
    $modalInstance.close(false);
  };
}]);

;angular.module('monacaIDE').controller('ErrorDialogController', [
  '$scope',
  '$sce',
  'title',
  'message',
  'canClose',
  function ($scope, $sce, title, message, canClose) {
    $scope.title = title;
    $scope.message = $sce.trustAsHtml(message);
    $scope.canClose = angular.isDefined(canClose) ? canClose : true;
  }]);

;angular.module('monacaIDE').controller('ReplaceController', ['$scope', '$uibModalInstance', '$sce', 'title', 'message', 'callback', function ($scope, $modalInstance, $sce, title, message, callback) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);
  $scope.ok = function () {
    $modalInstance.close(true);
  };
  $scope.cancel = function () {
    $modalInstance.dismiss(false);
  };
  $scope.replaceAll = function () {
    $scope.isLoading = true;
    callback().then(function () {
      $modalInstance.close(true);
    }).finally(function () {
      $scope.isLoading = false;
    });
  };
}]);

;angular.module('monacaIDE').controller('CustomDialogController', ['$scope', '$uibModalInstance', '$sce', 'title', 'message', 'buttons', function ($scope, $modalInstance, $sce, title, message, buttons) {
  $scope.title = title;
  $scope.message = $sce.trustAsHtml(message);
  $scope.buttons = buttons;

  $scope.button = function (value) {
    $modalInstance.close(value);
  };

}]);

;angular.module('monacaIDE').controller('CopyFileDialogController', [
  '$scope',
  'ProjectFileService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'selectedNode',
  'directoryList',
  function ($scope, ProjectFileService, PubSub, Constant, gettextCatalog, selectedNode, directoryList) {
    $scope.fileName = 'copy_' + selectedNode.original.text;
    $scope.directoryList = $.map(directoryList, function (value) {
      return value;
    });
    $scope.dirPath = '/';

    if (selectedNode && selectedNode.original && selectedNode.original.type === 'dir') {
      $scope.dirPath = selectedNode.original.id;
    } else if (selectedNode && selectedNode.original) {
      $scope.dirPath = selectedNode.original.parent;
    }

    if ($scope.dirPath === '#/' || $scope.dirPath === '#') {
      $scope.dirPath = '/';
    }

    $scope.ok = function () {
      checkFileName($scope.fileName).then(() => {
        ProjectFileService.copy(selectedNode.id, $scope.dirPath + '/' + $scope.fileName).then(
          function (res) {
            PubSub.publish(Constant.EVENT.CREATED_NEW_FILE_OR_FOLDER, res.body.result);
            notifySuccess(gettextCatalog.getString('File has been copied.'));
            $scope.$close();
          },
          function (res) {
            notifyError(gettextCatalog.getString('An unexpected error occured while copying.'));
          }
        );
      }).catch(err => {
        notifyError(err);
        $scope.$close();
      });
    };

    function notifySuccess (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'success',
        content: message
      });
    }

    /**
     * Notify Error Wrapper
     * @param  {String} message Error Message]
     */
    function notifyError (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: message
      });
    }

    function checkFileName (name) {
      return new Promise((resolve, reject) => {
        if (!name) {
          reject(gettextCatalog.getString('The file name cannot be null.'));
        }

        if (!name.match(/^[!-~]+$/) || name.match(/[/<>;]/)) {
          reject(gettextCatalog.getString('The file name includes invalid character.'));
        }

        var filePath = $scope.dirPath + '/' + name;
        ProjectFileService.isExist(filePath).then(
          function (res) {
            if (!res.body.result[filePath]) {
              resolve();
            } else {
              reject(gettextCatalog.getString('The file or folder already exists.'));
            }
          },
          function () {
            reject(gettextCatalog.getString('An unknown error has occurred. Please refresh and try again.'));
          }
        );
      });
    }
  }
]);

;angular.module('monacaIDE').controller('CreateFileDialogController', [
  '$scope',
  'ProjectFileService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'FileUtilityFactory',
  'selectedNode',
  'directoryList',
  'ProjectFactory',
  function ($scope, ProjectFileService, PubSub, Constant, gettextCatalog, FileUtilityFactory, selectedNode, directoryList, ProjectFactory) {
    $scope.fileName = '';
    $scope.directoryList = $.map(directoryList, function (value) {
      return value;
    });
    $scope.dirPath = '/';

    if (selectedNode && selectedNode.original && selectedNode.original.type === 'dir') {
      $scope.dirPath = selectedNode.original.id;
    } else if (selectedNode && selectedNode.original) {
      $scope.dirPath = selectedNode.original.parent;
    }

    if ($scope.dirPath === '#/' || $scope.dirPath === '#') {
      $scope.dirPath = '/';
    }

    let index = 0;
    let otherFileFormat;

    $scope.formatList = [{
      id: ++index,
      name: gettextCatalog.getString('HTML')
    }, {
      id: ++index,
      name: gettextCatalog.getString('CSS')
    }, {
      id: ++index,
      name: gettextCatalog.getString('JavaScript')
    }];
    if (ProjectFactory.isGenericProject()) {
      $scope.formatList.push({
        id: ++index,
        name: gettextCatalog.getString('Java')
      });
      $scope.formatList.push({
        id: ++index,
        name: gettextCatalog.getString('Cobol')
      });
    }
    otherFileFormat = {
      id: ++index,
      name: gettextCatalog.getString('Other')
    };
    $scope.formatList.push(otherFileFormat);

    $scope.fileFormat = $scope.formatList[$scope.formatList.length - 1];

    $scope.$watch('fileName', function (newVal, oldVal) {
      var mime = FileUtilityFactory.getMime(FileUtilityFactory.getExtName(newVal));
      var index = $scope.formatList.length - 1;

      switch (mime) {
      case 'text/html':
        index = 0;
        break;
      case 'text/css':
        index = 1;
        break;
      case 'text/javascript':
        index = 2;
        break;
      case 'text/java':
        index = 3;
        break;
      case 'text/cobol':
        index = 4;
        break;
      }

      $scope.fileFormat = $scope.formatList[index] || otherFileFormat;
    });

    $scope.ok = function () {
      checkFileName($scope.fileName).then(() => {
        ProjectFileService.save($scope.dirPath + '/' + $scope.fileName, '@@NEW_FILE@@', null, null, null).then(
          function (res) {
            PubSub.publish(Constant.EVENT.CREATED_NEW_FILE_OR_FOLDER, res.body.result);
            notifySuccess(gettextCatalog.getString('File has been created.'));
            $scope.$close();
          },
          function (res) {
            notifyError(gettextCatalog.getString('An unexpected error occured while creating.'));
          }
        );
      }).catch(err => {
        notifyError(err);
        $scope.$close();
      });
    };

    function notifySuccess (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'success',
        content: message
      });
    }

    /**
     * Notify Error Wrapper
     * @param  {String} message Error Message]
     */
    function notifyError (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: message
      });
    }

    function checkFileName (name) {
      return new Promise((resolve, reject) => {
        if (!name) {
          reject(gettextCatalog.getString('The file name cannot be null.'));
        }

        if (!name.match(/^[!-~]+$/) || name.match(/[/<>;]/)) {
          reject(gettextCatalog.getString('The file name includes invalid character.'));
        }

        var filePath = $scope.dirPath + '/' + name;
        ProjectFileService.isExist(filePath).then(
          function (res) {
            if (!res.body.result[filePath]) {
              resolve();
            } else {
              reject(gettextCatalog.getString('The file or folder already exists.'));
            }
          },
          function () {
            reject(gettextCatalog.getString('An unknown error has occurred. Please refresh and try again.'));
          }
        );
      });
    }
  }
]);

;angular.module('monacaIDE').controller('CreateFolderDialogController', [
  '$scope',
  'ProjectFileService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'selectedNode',
  'directoryList',
  function ($scope, ProjectFileService, PubSub, Constant, gettextCatalog, selectedNode, directoryList) {
    $scope.folderName = '';
    $scope.directoryList = $.map(directoryList, function (value) {
      return value;
    });
    $scope.dirPath = '/';

    if (selectedNode && selectedNode.original && selectedNode.original.type === 'dir') {
      $scope.dirPath = selectedNode.original.id;
    } else if (selectedNode && selectedNode.original) {
      $scope.dirPath = selectedNode.original.parent;
    }

    if ($scope.dirPath === '#/' || $scope.dirPath === '#') {
      $scope.dirPath = '/';
    }

    $scope.ok = function () {
      checkFolderName($scope.folderName).then(() => {
        ProjectFileService.mkdir($scope.dirPath + '/' + $scope.folderName).then(
          function (res) {
            PubSub.publish(Constant.EVENT.CREATED_NEW_FILE_OR_FOLDER, res.body.result);
            notifySuccess(gettextCatalog.getString('Folder has been created.'));
            $scope.$close();
          },
          function () {
            notifyError(gettextCatalog.getString('An unexpected error occured while creating folder.'));
          }
        );
      }).catch(err => {
        notifyError(err);
        $scope.$close();
      });
    };

    function notifySuccess (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'success',
        content: message
      });
    }

    /**
     * Notify Error Wrapper
     * @param  {String} message Error Message]
     */
    function notifyError (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: message
      });
    }

    function checkFolderName (name) {
      return new Promise((resolve, reject) => {
        if (!name) {
          reject(gettextCatalog.getString('The folder name cannot be null.'));
        }

        if (!name.match(/^[!-~]+$/) || name.match(/[/<>;]/)) {
          reject(gettextCatalog.getString('The folder name includes invalid character.'));
        }

        var path = $scope.dirPath + '/' + name;
        ProjectFileService.isExist(path).then(
          function (res) {
            if (!res.body.result[path]) {
              resolve();
            } else {
              reject(gettextCatalog.getString('The file or folder already exists.'));
            }
          },
          function () {
            reject(gettextCatalog.getString('An unknown error has occurred. Please refresh and try again.'));
          }
        );
      });
    }
  }
]);

;angular.module('monacaIDE').controller('FilePanelController', [
  '$scope',
  '$window',
  '$element',
  '$timeout',
  '$uibModal',
  'Dialog',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'UserFactory',
  'ProjectFileService',
  'FileUtilityFactory',
  'ProjectTreeFactory',
  function ($scope, $window, $element, $timeout, $modal, Dialog, PubSub, Constant, gettextCatalog, UserFactory, ProjectFileService, FileUtilityFactory, ProjectTreeFactory) {
    /**
     * Ajax Tree Data end point
     */
    let ideHost = window.config.client.host.ide_host;
    let projectId = window.config.projectId;
    let anotherProjectId = null; // Another project to compare
    let apiToken = window.config.apiToken;
    $scope.url = `${ideHost}/api/project/${projectId}/file/tree/byPath?api_token=${apiToken}`;

    // get all folders for dialogs once
    ProjectTreeFactory.loadFolderTreeData();

    const loadCompareApiSetting = () => {
      if (UserFactory.canUseCompareEditor()) {
        MonacaApi.Ide.Compare.settingRead(window.config.projectId)
          .then((response) => {
            const result = response.body.result;
            if (result.is_valid) {
              anotherProjectId = result.another_project_id;
            } else {
              anotherProjectId = null;
              if (result.message) {
                console.error(`[FilePanelController] compare.json is invalid. ${result.message}`);
              }
            }
          })
          .catch(() => {
            anotherProjectId = null;
          });
      }
    };

    // Check if another project to compare exists
    loadCompareApiSetting();

    /**
     * Displays a loading mask over the JSTree
     * @type {Boolean}
     */
    $scope.showMask = false;

    /**
     * JSTree Reset Counter
     * @type {Number}
     */
    $scope.treeResetCounter = 0;

    /**
     * JSTree ID.
     * @type {String}
     */
    $scope.treeStateKey = 'tree-' + window.config.projectId;

    /**
     * JSTree Callback Events
     * @type {Object}
     */
    $scope.eventCallbacks = {
      select_node: function (evt, data) {
        // Nothing to do when a node is selected
      },

      /**
       * Double Click Event Handler
       * @param  {jQuery.Event} evt  jQuery.Event
       */
      _dblclick: function (evt) {
        var node = getSelectedNode(evt.target, false);

        if (node.original.type === 'dir') {
          toggleDirState(node.id);
        } else if (node.original.type === 'file') {
          openFile(node);
        }
      },

      move_node: function (event, data) {
        var moveNodeData = getMoveNodeData(data);
        moveFile(moveNodeData.oldFilePath, moveNodeData.newFilePath);
      },

      loaded: function (event, data) {
        var mc = new Hammer(document.querySelector('#jstree')); // eslint-disable-line no-undef
        mc.on('doubletap', function (evt) {
          $scope.eventCallbacks._dblclick(evt);
          return false;
        });

        $timeout(function () {
          $scope.showMask = false;
        });
      }
    };

    $scope.jsTreeCore = {
      check_callback: function (operation, node, node_parent, node_position, more) {
        if (operation === 'move_node') {
          if (canMoveNode({
            node: node,
            old_parent: (node.parent || $.jstree.root).toString(),
            parent: (node_parent.original && node_parent.original.type === 'file') ? node_parent.parent : node_parent.id
          })) {
            return (node_parent.original && node_parent.original.type === 'dir' && node_parent.original.id !== node.original.parent);
          }

          return false;
        }

        return true;
      }
    };

    // --- INTERNAL METHODS ---
    /**
     * Get Tree
     * @return {JSTree} The Project JSTree Instance
     */
    function getTree () {
      return $(angular.element($element[0].parentElement).find('js-tree')).jstree(true); // get existing instance
    }

    /**
     * Get the Current Selected Node Data Object
     * @return {Object} Node data stored on node key.
     */
    function getSelectedNode (target, wrapNode) {
      var node; // by default, node is undefined.

      // Get node data.
      if (target) {
        node = getTree().get_node(target);
      } else {
        node = getTree().get_selected(true);
      }

      // return node data if it exists
      if (node && angular.isObject(node) && target) {
        return wrapNode ? { node: node } : node;
      } else if (node && !target && angular.isArray(node) && node.length > 0) {
        return wrapNode ? { node: node[0] } : node[0];
      }

      // else return false
      return false;
    }

    /**
     * Get Node Data Object by Node ID
     * @return {Object} Node data stored on node key.
     */
    function getNodeById (nodeId) {
      return getTree().get_node(nodeId);
    }

    /**
     * Notify Success Wrapper
     * @param {String} message success message
     */
    function notifySuccess (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'success',
        content: message
      });
    }

    /**
     * Notify Error Wrapper
     * @param  {String} message Error Message]
     */
    function notifyError (message) {
      PubSub.publish(Constant.EVENT.NOTIFY_USER, {
        className: 'danger',
        content: message
      });
    }

    /**
     * Toggle Directory Open/Close State
     * @param  {String}  nodeId   Selected Node ID
     */
    function toggleDirState (nodeId) {
      getTree().toggle_node(nodeId);
    }

    /**
     * Open Selected File
     * @param  {Object} node JSTree Selected Node
     * @param  {Number} lineNum Line Number to Jump To
     * @return {Boolean}
     */
    function openFile (node, lineNum) {
      if (node.original.fileType === 'text') {
        PubSub.publish(Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW, {
          open: true,
          componentState: {
            url: node.id
          }
        });
      } else if (node.original.fileType === 'image' || node.original.fileType === 'audio') {
        $modal.open({
          templateUrl: 'project/dialog/previewer.html',
          controller: function ($scope) {
            $scope.src = ProjectFileService.getFileReadUrl(node.id);
            $scope.content = node.original.fileType;

            if ($scope.content === 'image') {
              $scope.save = function () {
                $scope.working = true;
                var arr = $scope.editor.toDataURL().split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                var bstr = window.atob(arr[1]);
                var n = bstr.length;
                var bytes = new Uint8Array(n);
                while (n--) {
                  bytes[n] = bstr.charCodeAt(n);
                }
                const pathArr = node.id.split('/');
                const fileName = pathArr.splice(pathArr.length - 1, 1)[0];
                const path = pathArr.join('/') + '/';
                ProjectFileService.upload(path, new File([bytes], fileName, { type: mime })).then(() => {
                  $scope.$apply(() => {
                    $scope.working = false;
                  });
                });
              };

              var whiteTheme = {
                'common.bisize.width': '251px',
                'common.bisize.height': '21px',
                'common.backgroundColor': '#fff',
                'common.border': 'none',

                // header
                'header.backgroundImage': 'none',
                'header.backgroundColor': 'transparent',
                'header.border': '0px',

                // load button
                'loadButton.backgroundColor': '#DDDDDD',
                'loadButton.border': '1px solid #DDDDDD',
                'loadButton.borderRadius': '4px',
                'loadButton.paddingTop': '0px',
                'loadButton.color': '#000',
                'loadButton.fontFamily': 'inherit',
                'loadButton.fontSize': '14px',
                'loadButton.fontWeight': 'initial',

                // download button
                'downloadButton.backgroundColor': '#337AB7',
                'downloadButton.border': '1px solid #2e6da4',
                'downloadButton.borderRadius': '4px',
                'downloadButton.paddingTop': '0px',
                'downloadButton.color': '#fff',
                'downloadButton.fontFamily': 'inherit',
                'downloadButton.fontSize': '14px',
                'downloadButton.fontWeight': 'initial',

                // main icons
                'menu.normalIcon.path': '../img/tui/icon-b.svg',
                'menu.normalIcon.name': 'icon-b',
                'menu.activeIcon.path': '../img/tui/icon-a.svg',
                'menu.activeIcon.name': 'icon-a',
                'menu.iconSize.width': '24px',
                'menu.iconSize.height': '24px',

                // submenu primary color
                'submenu.backgroundColor': 'transparent',
                'submenu.partition.color': '#858585',

                // submenu icons
                'submenu.normalIcon.path': '../img/tui/icon-a.svg',
                'submenu.normalIcon.name': 'icon-a',
                'submenu.activeIcon.path': '../img/tui/icon-d.svg',
                'submenu.activeIcon.name': 'icon-d',
                'submenu.iconSize.width': '32px',
                'submenu.iconSize.height': '32px',

                // submenu labels
                'submenu.normalLabel.color': '#858585',
                'submenu.normalLabel.fontWeight': 'normal',
                'submenu.activeLabel.color': '#000',
                'submenu.activeLabel.fontWeight': 'normal',

                // checkbox style
                'checkbox.border': '1px solid #ccc',
                'checkbox.backgroundColor': '#fff',

                // rango style
                'range.pointer.color': '#333',
                'range.bar.color': '#ccc',
                'range.subbar.color': '#606060',
                'range.value.color': '#000',
                'range.value.fontWeight': 'normal',
                'range.value.fontSize': '11px',
                'range.value.border': '0',
                'range.value.backgroundColor': '#f5f5f5',
                'range.title.color': '#000',
                'range.title.fontWeight': 'lighter',

                // colorpicker style
                'colorpicker.button.border': '1px solid #cbcbcb',
                'colorpicker.title.color': '#000'
              };
              $scope.working = true;
              var options = {
                method: 'GET',
                mode: 'cors',
                cache: 'default',
                credentials: 'include'
              };
              // tui-image-editor uses new Image() to load the image, which doesn't send cookies in CORS mode, so we fetch the image and create a data URL from it instead
              // we use native fetch, because monaca-api doesn't return the raw response object
              fetch(ProjectFileService.getFileReadUrl(node.id), options).then(file => {
                file.arrayBuffer().then(buffer => {
                  var binary = '';
                  var bytes = [].slice.call(new Uint8Array(buffer));
                  bytes.forEach((b) => {
                    binary += String.fromCharCode(b);
                  });
                  const url = `data:image/*;base64,${window.btoa(binary)}`;
                  $scope.editor = new tui.ImageEditor(document.querySelector('#tui-image-editor'), {
                    includeUI: {
                      loadImage: {
                        path: url,
                        name: 'Preview'
                      },
                      theme: whiteTheme,
                      initMenu: 'filter',
                      menuBarPosition: 'right'
                    },
                    cssMaxWidth: 700,
                    cssMaxHeight: 500,
                    selectionStyle: {
                      cornerSize: 20,
                      rotatingPointOffset: 70
                    }
                  });

                  // Remove load button
                  var loadButton = $('.tui-image-editor-header-buttons .tui-image-editor-load-btn')[0].parentNode;
                  loadButton.remove();

                  // replace the download button with save button
                  var downloadButton = $('.tui-image-editor-header-buttons .tui-image-editor-download-btn')[0];
                  var saveButton = downloadButton.cloneNode(); // removes event listeners
                  saveButton.innerHTML = gettextCatalog.getString('Save');
                  downloadButton.parentNode.replaceChild(saveButton, downloadButton);
                  $(saveButton).click(() => $scope.save());

                  $scope.working = false;
                });
              });
            }
          },
          windowClass: 'file-preview ' + node.original.fileType
        });
      }

      return true;
    }

    function getTreeItemById (id) {
      for (var key in getTree()._model.data) {
        if (key === id) {
          return getTree()._model.data[key];
        }
      }

      return null;
    }

    function moveFile (oldFilePath, newFilePath, isRename) {
      return ProjectFileService.move(oldFilePath, newFilePath).then(
        function (res) {
          var result = res.body.result;

          // Remove old node from tree.
          var from = result.from.replace('//', '/'); // remove duplicate slash
          var node = getNodeById(from);
          var isDir = node && node.original && node.original.type && node.original.type === 'dir';
          getTree().delete_node(node);

          // close tab of deleted file
          PubSub.publish(Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW, {
            open: false,
            isDir: isDir,
            componentState: {
              url: from
            }
          });

          // workaround for folder display empty
          if (isDir) {
            let path = result.path.replace('//', '/'); // remove duplicate slash
            result.meta[path]['children'] = true;
          }

          // notify user
          if (isRename) {
            notifySuccess(gettextCatalog.getString('File has been renamed.'));
          } else {
            notifySuccess(gettextCatalog.getString('File has been moved.'));
          }

          $scope.createNewNode(result);
        },
        function () {
          notifyError(gettextCatalog.getString('Failed to move {{oldFilePath}} to {{newFilePath}}.', {
            oldFilePath: oldFilePath,
            newFilePath: newFilePath
          }));

          PubSub.publish(Constant.EVENT.TREE_UPDATED);
        }
      );
    }

    function deleteFile () {
      var node = getSelectedNode(null, false);
      var nodeId = node && node.original && node.original.id ? node.original.id : null;
      var isDir = node && node.original && node.original.type && node.original.type === 'dir';

      return Dialog.confirm(
        gettextCatalog.getString('Are you sure you would like to delete {{file}}?', { file: nodeId }),
        gettextCatalog.getString('Confirm Delete')
      ).then(function (allowDelete) {
        if (allowDelete) {
          return ProjectFileService.remove(nodeId).then(function () {
            PubSub.publish(Constant.EVENT.TOGGLE_NORMAL_EDITOR_VIEW, {
              open: false,
              isDir: isDir,
              componentState: {
                url: nodeId
              }
            });

            // notify user
            notifySuccess(gettextCatalog.getString('Successfully deleted file.'));

            // remove from folder list
            if (isDir) ProjectTreeFactory.removeFolderTreeData(nodeId);

            // Remove node from tree.
            getTree().delete_node(node);
          });
        }

        return false;
      });
    }

    function getMoveNodeData (node) {
      var newParent = getNodeById(node.parent);

      // Unexpected Error: Selected new parent does not exist in the treeModel.
      if (!newParent) {
        return false;
      }

      // If the parent is a file, get the parent's parent
      if (newParent.original && newParent.original.type === 'file') {
        newParent = getNodeById(newParent.parent);
      }

      // Set the parent path.
      var newParentPath = newParent.id === '#' ? '' : newParent.id;
      var oldFilePath = node.node.id;
      var newFilePath = newParentPath + '/' + node.node.text;

      return {
        newParent: newParent,
        oldFilePath: oldFilePath,
        newFilePath: newFilePath
      };
    }

    function canMoveNode (data) {
      if (data.old_parent === data.parent) {
        return false;
      }

      var newParent = data.parent + '/';
      var newFilePath = newParent + data.node.text;

      if (getNodeById(data.parent).original && getNodeById(data.parent).original.type !== 'dir') {
        return false;
      }

      // Duplicated file names (ファイル名の重複の確認)
      if (getTreeItemById(newFilePath)) {
        notifyError(gettextCatalog.getString('{{newFilePath}} already exists.', {
          newFilePath: newFilePath
        }));

        return false;
      }

      return true;
    }

    function createEditTextElement (node) {
      var editor = document.createElement('input');
      editor.setAttribute('type', 'text');
      editor.setAttribute('name', 'tmp');
      editor.setAttribute('id', 'tmp-basename');
      editor.setAttribute('value', node.original.text);
      editor.style.color = 'black';
      return editor;
    }

    function changeNameInline (node) {
      var anchor = document.getElementById(node.id + '_anchor');
      var elem = document.getElementById(node.id);
      var childGroup = elem.querySelector('ul');
      var headIcon = elem.querySelector('i');
      var icon = anchor.querySelector('i');
      var editor = createEditTextElement(node);
      var keyDownCode = null;

      editor.addEventListener('input', function (event) {
        if (!editor.value.length) {
          editor.className = 'input-error';
        } else {
          editor.className = '';
        }
      });

      editor.addEventListener('keydown', function (event) {
        keyDownCode = event.which;
      });

      editor.addEventListener('keyup', function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (event.which !== 13 || event.which !== keyDownCode) {
          return;
        }

        editor.removeEventListener('blur', onBlur);
        $.jstree.reference('#jstree').redraw(true);

        if (editor.value !== node.original.text) {
          renameFile();
        }
      });

      editor.addEventListener('blur', onBlur);

      function renameFile () {
        var dirPath = node.original.parent + '/';

        if (dirPath === '#/') {
          dirPath = dirPath.replace('#/', '/');
        }

        if (!FileUtilityFactory.isValidFilename(editor.value)) {
          notifyError(gettextCatalog.getString('Failed to rename file because of invalid characters.'));
          return false;
        }

        var newPath = dirPath + editor.value;
        var oldPath = dirPath + node.original.text;

        moveFile(oldPath, newPath, true);
      }

      function onBlur (event) {
        event.preventDefault();
        event.stopPropagation();
        $.jstree.reference('#jstree').redraw(true);

        if (!editor.value.length || editor.value === node.original.text) {
          return;
        }

        renameFile();
      }

      elem.innerHTML = '';
      elem.appendChild(headIcon);
      elem.appendChild(icon);
      elem.appendChild(editor);

      if (childGroup) {
        elem.appendChild(childGroup);
      }
      editor.focus();
    }

    function isPlatformDir (path) {
      return /^\/(android|ios|chrome)/.test(path);
    }

    function isPluginDir (path) {
      return /^\/www\/plugins(\/?)/.test(path);
    }

    // --- SCOPE METHODS ---
    /**
     * [onDrop description]
     * @return {[type]} [description]
     */
    $scope.onDrop = ProjectTreeFactory.onDrop;
    $scope.uploadDir = null;

    $scope.openUploadFilePanel = function () {
      $modal.open({
        templateUrl: 'project/dialog/fileUpload.html',
        controller: 'UploadFileDialogController',
        windowClass: 'file-upload',
        resolve: {
          selectedNode: getSelectedNode(null, false),
          directoryList: getUploadDirList()
        }
      });
    };

    function openCompareEditor (node) {
      if (UserFactory.canUseCompareEditor()) {
        if (node.original.fileType === 'text') {
          if (anotherProjectId != null) {
            PubSub.publish(Constant.EVENT.TOGGLE_COMPARE_EDITOR_VIEW, {
              open: true,
              componentState: {
                originalFile: {
                  projectId: anotherProjectId,
                  path: node.id
                },
                modifiedFile: {
                  projectId: window.config.projectId,
                  path: node.id
                }
              }
            });
          } else {
            notifyError('Another project to compare is not set.');
          }
        } else if (node.original.fileType === 'image' || node.original.fileType === 'audio') {
          // Do nothing
        }
      }

      return true;
    }

    function getNodeDirList () {
      var dirList = {
        '/': {
          id: '/',
          path: '/'
        }
      };

      for (var key in getTree()._model.data) {
        if (!getTree()._model.data[key].original) continue;
        if (getTree()._model.data[key].original.type === 'dir' && !isPluginDir(key) && !isPlatformDir(key)) {
          dirList[key] = { id: key, path: key + '/' };
        }
      }

      return dirList;
    }

    function getUploadDirList () {
      var dirList = {
        '/': {
          id: '/',
          path: '/'
        }
      };

      for (var key in ProjectTreeFactory.getFolderTreeData()) {
        if (!isPluginDir(key) && !isPlatformDir(key)) {
          dirList[key] = { id: key, path: key + '/' };
        }
      }

      return dirList;
    }

    $scope.openCreateFileDialog = function () {
      var selectedNode = getSelectedNode();

      $modal.open({
        templateUrl: 'project/dialog/createFile.html',
        resolve: {
          directoryList: getUploadDirList(),
          selectedNode: selectedNode || getNodeById('/www')
        },
        controller: 'CreateFileDialogController',
        windowClass: 'file-panel-dialog create-file-dialog'
      });
    };

    $scope.openCreateFolderDialog = function () {
      var selectedNode = getSelectedNode();

      $modal.open({
        templateUrl: 'project/dialog/createFolder.html',
        resolve: {
          directoryList: getUploadDirList(),
          selectedNode: selectedNode || getNodeById('/www')
        },
        controller: 'CreateFolderDialogController',
        windowClass: 'file-panel-dialog create-file-dialog'
      });
    };

    $scope.openCopyFileDialog = function () {
      $modal.open({
        templateUrl: 'project/dialog/copyFile.html',
        resolve: {
          directoryList: getUploadDirList(),
          selectedNode: getSelectedNode()
        },
        controller: 'CopyFileDialogController',
        windowClass: 'file-panel-dialog create-file-dialog'
      });
    };

    $scope.contextMenu = function (node) {
      var items = {
        newFile: {
          label: gettextCatalog.getString('New File'),
          _class: 'contextmenu-new-file',
          action: function (obj) {
            $scope.openCreateFileDialog();
          }
        },
        newFolder: {
          label: gettextCatalog.getString('New Folder'),
          _class: 'contextmenu-new-folder',
          action: function (obj) {
            $scope.openCreateFolderDialog();
          }
        },
        delete: {
          label: gettextCatalog.getString('Delete'),
          _class: 'contextmenu-delete',
          action: function (obj) {
            deleteFile();
          }
        },
        rename: {
          label: gettextCatalog.getString('Rename'),
          _class: 'contextmenu-rename',
          action: function (obj) {
            changeNameInline(node);
          }
        },
        openFile: {
          label: gettextCatalog.getString('Open File'),
          _class: 'contextmenu-open-file',
          action: function (obj) {
            openFile(node);
          }
        },
        copyFile: {
          label: gettextCatalog.getString('Copy File'),
          _class: 'contextmenu-copy-file',
          action: function (obj) {
            $scope.openCopyFileDialog();
          }
        },
        /*
        viewOlderVersions: {
          label: 'View older versions...',
          _disabled: true,
          action: function(obj) {
            alert('You clicked ' + obj.item.label);
          }
        },
        */
        uploadFiles: {
          label: gettextCatalog.getString('Upload Files...'),
          _class: 'contextmenu-upload-files',
          action: function (obj) {
            $scope.openUploadFilePanel();
          }
        },
        exportFolder: {
          label: gettextCatalog.getString('Export Folder'),
          _class: 'contextmenu-export-folder',
          action: function (obj) {
            if (node.original.type === 'dir') {
              $window.open(ProjectFileService.getDirExportUrl(node.id));
            } else if (node.original.type === 'file') {
              // This should never hit but here to safely continue with the download.
              // Download the parent directory.
              $window.open(ProjectFileService.getDirExportUrl(node.parent));
            }
          }
        }
      };
      if (UserFactory.canUseCompareEditor() && anotherProjectId != null) {
        items.compare = {
          label: gettextCatalog.getString('Check Answer'), // In Monaca Education, show `Check Answer` instead of `Compare`
          _class: 'contextmenu-compare',
          action: function (obj) {
            openCompareEditor(node);
          }
        };
      }
      return items;
    };

    // --- PUBSUB SUBSCRIBES ---
    // When the tree data has been updated, this will trigger refresh of the tree.
    PubSub.subscribe(Constant.EVENT.TREE_UPDATED, function (options) {
      // Refresh JS Tree
      if (options && options.redraw) {
        getTree().redraw(true);
      } else {
        getTree().refresh(true);
      }
    });

    $scope.treeClearCacheReload = function (options) {
      PubSub.publish(Constant.EVENT.TREE_UPDATED, options);

      // refresh folder list
      ProjectTreeFactory.loadFolderTreeData();

      // Check if another project to compare exists
      loadCompareApiSetting();
    };
    PubSub.subscribe(Constant.EVENT.TREE_CLEAR_CACHE_RELOAD, $scope.treeClearCacheReload);

    PubSub.subscribe(Constant.EVENT.TREE_ERROR, function (errorThrown) {
      let message = gettextCatalog.getString('Failed to retrieve project file information. Please try again. If the problem persists, please contact our support team.');
      notifyError(message);
    });

    $scope.createParentNode = function (file) {
      let path = file.path.replace('//', '/'); // remove duplicate slash
      let safeKey = FileUtilityFactory.escapeFileName(path);
      let run = safeKey.split('/');
      let items = safeKey.split('/');
      let non_exist_parent = false;
      run.forEach(element => {
        const id = items.slice(0, -1).join('/') || '#';
        const parent = id.split('/').slice(0, -1).join('/') || '#';
        const index = Object.keys(getNodeDirList()).findIndex(x => x === id);
        if (index === -1 && id !== '#') {
          non_exist_parent = true;
          let node = {
            type: 'dir',
            children: true,
            deletable: true,
            id: id,
            text: id.split('/').pop(),
            parent: parent === '/' ? '#' : parent,
            state: { opened: false }
          };
          getTree().create_node(node.parent, node, 'last', null, true);

          // add to folder list
          ProjectTreeFactory.addFolderTreeData(node.id);
        }
        items.pop();
      });
      return non_exist_parent;
    };

    $scope.createNewNode = function (file) {
      let non_exist_parent = $scope.createParentNode(file); // create parent folder if not exist
      if (non_exist_parent) return;

      let path = file.path.replace('//', '/'); // remove duplicate slash
      let safeKey = FileUtilityFactory.escapeFileName(path);
      if (getTree()._model.data[safeKey]) return; // already existed, do nothing

      let parent = safeKey.split('/').slice(0, -1).join('/') || '#';
      let node = Object.assign({}, file.meta[path], {
        id: safeKey,
        text: safeKey.split('/').pop(),
        parent: parent === '/' ? '#' : parent
      });
      getTree().create_node(node.parent, node, 'last', null, true);

      // add to folder list
      if (node.type === 'dir') ProjectTreeFactory.addFolderTreeData(node.id);
    };
    PubSub.subscribe(Constant.EVENT.CREATED_NEW_FILE_OR_FOLDER, $scope.createNewNode);

    PubSub.subscribe(Constant.EVENT.NEW_FILE, function () {
      $scope.openCreateFileDialog();
    });

    PubSub.subscribe(Constant.EVENT.NEW_FOLDER, function () {
      $scope.openCreateFolderDialog();
    });

    PubSub.subscribe(Constant.EVENT.DELETE_FILE_OR_FOLDER, function () {
      deleteFile();
    });

    PubSub.subscribe(Constant.EVENT.RENAME_FILE_OR_FOLDER, function () {
      var node = getSelectedNode(null, true);

      if (node) {
        changeNameInline(node.node);
      } else {
        // console.error('[File Rename] Item is not selected.');
      }
    });

    PubSub.subscribe(Constant.EVENT.EXECUTE_WITH_SELECTED_NODE, function (data) {
      var node = data.target === '/' ? '/' : getSelectedNode(data.target, false);

      if (node) {
        data.callback(node);
      } else {
        // console.error('[File Execution] Item is not selected.');
      }
    });

    $scope.openNode = function (data) {
      var node;
      var lineNum = (data && data.lineNum ? data.lineNum : 0);

      if (data && data.target) {
        node = getNodeById(data.target);
      } else {
        node = getSelectedNode(null, true);
      }

      if (node && node.node) {
        node = node.node;
      }

      if (node && node.original.type === 'file') {
        openFile(node, lineNum);
      } else {
        // console.error('The selected item on the tree can not be opened.');
        // try to load nodes
        let safeKey = FileUtilityFactory.escapeFileName(data.target);
        let run = safeKey.split('/');
        let items = safeKey.split('/');
        let paths_to_open = [];
        run.forEach(element => {
          const id = items.join('/') || '#';
          if (id !== '#') paths_to_open.push(id);
          items.pop();
        });
        $scope.openNodeRecursive(paths_to_open, paths_to_open.length - 1, function () {
          $scope.openNode(data);
        });
      }
    };

    $scope.openNodeRecursive = function (paths, index, callback) {
      if (index > 0) {
        getTree().open_node(paths[index], function () {
          $scope.openNodeRecursive(paths, index - 1, callback);
        }, false);
      } else {
        callback();
      }
    };

    PubSub.subscribe(Constant.EVENT.OPEN_FILE, function (data) {
      $scope.openNode(data);
    });

    PubSub.subscribe(Constant.EVENT.COPY_FILE, function () {
      $scope.openCopyFileDialog();
    });

    PubSub.subscribe(Constant.EVENT.UPLOAD_FILES, function () {
      $scope.openUploadFilePanel();
    });
  }
]);

;angular.module('monacaIDE').controller('UploadFileDialogController', [
  '$scope',
  'ProjectTreeFactory',
  'selectedNode',
  'directoryList',
  function ($scope, ProjectTreeFactory, selectedNode, directoryList) {
    $scope.directoryList = $.map(directoryList, function (value) {
      return value;
    });
    $scope.uploadStatus = ProjectTreeFactory.uploadStatus;
    $scope.uploadDir = '/';

    try {
      $scope.uploadDir = selectedNode.original.type === 'file' ? selectedNode.parent : selectedNode.id;
      $scope.uploadDir = $scope.uploadDir === '#/' || $scope.uploadDir === '#' ? '/' : $scope.uploadDir;
    } catch (e) {
      // For any reason that the selected node did not exist, file is uploaded to /.
      $scope.uploadDir = '/';
    }

    /**
     * On Drop Handler for Multi-File and Folder Upload
     */
    $scope.onDrop = function (evt) {
      ProjectTreeFactory.onDrop(evt, $scope.uploadDir);
    };

    /**
     * Upload Single File
     * @param  {FileEntity} file
     */
    $scope.uploadSingleFile = function (file) {
      var path = $scope.uploadDir === '/' ? '/' : $scope.uploadDir + '/';
      return ProjectTreeFactory.push(path, file, true);
    };
  }
]);

;angular.module('monacaIDE')
  .controller('OneTimePassController', ['$scope', '$uibModalInstance', 'OneTimePassApiService', '$sce',
    function ($scope, $modalInstance, MonacaApiService, $sce) {
      $scope.page = 'loading';

      MonacaApiService.load().then(function (res) {
        display(res.result);
        $scope.page = 'one-time-pass';
      });

      function display (response) {
        $scope.password = response.one_time_password;
        $scope.email = response.email;
        $scope.expire_at = response.expire_at;
      }

      $scope.generate = function () {
        MonacaApiService.generate().then(function (res) {
          display(res.result);
        });
      };

      $scope.close = function () {
        $modalInstance.close($scope.expire_at);
      };
    }]);

;angular.module('monacaIDE').controller('WorkspaceConfigController', [
  '$scope',
  'gettextCatalog',
  'Constant',
  'GlobalEditorConfig',
  'EditorConfigWrapper',
  'ProjectService',
  'TerminalFactory',
  'TerminalSettingFactory',
  'UserFactory',
  'ProjectFactory',
  'PubSub',
  'CommonFunctionService',
  'ContainerService',
  'GoldenLayoutService',
  '$window',
  function ($scope, gettextCatalog, Constant, GlobalEditorConfig, EditorConfigWrapper, ProjectService, TerminalFactory, TerminalSettingFactory, UserFactory, ProjectFactory, PubSub, CommonFunctionService, ContainerService, GoldenLayoutService, $window) {
    $scope.config = {editor: {}, terminal: {}, user: {}};
    $scope.config.editor = Object.assign({}, GlobalEditorConfig.getDefaultValues());
    $scope.config.terminal = Object.assign({}, TerminalSettingFactory.getDefaultSettings());
    $scope.config.user = Object.assign({}, UserFactory.getDefaultCustormerExperienceSettings());
    $scope.config.isShowedCustomerExperience = UserFactory.getSubscriptionInfo().toLowerCase() !== Constant.PLAN.FREE;
    $scope.terminalFeatureEnabled = CommonFunctionService.isTerminalService();
    $scope.isMultipleLanguage = CommonFunctionService.isMultipleLanguage();
    let terminalOS;

    $scope.bool = {
      off: {
        name: gettextCatalog.getString('Off'),
        value: false
      },
      on: {
        name: gettextCatalog.getString('On'),
        value: true
      }
    };

    function assignTerminalScopeValue (setting) {
      $scope.config.terminal.fontFamily = setting.fontFamily;
      $scope.config.terminal.fontSize = setting.fontSize;
      $scope.config.terminal.theme = setting.theme;
      $scope.config.terminal.cursorStyle = setting.cursorStyle;
      $scope.config.terminal.cursorBlink = setting.cursorBlink;
    }

    function applyTerminal () {
      if (!$scope.terminalFeatureEnabled) return Promise.resolve(true);
      // check font size
      let fontSize = Number($scope.config.terminal.fontSize);
      if (!fontSize || fontSize < 11 || fontSize > 80) $scope.config.terminal.fontSize = 12;
      // save terminal_os
      if ($scope.config.terminal.terminalOS && $scope.isMultipleLanguage && terminalOS !== $scope.config.terminal.terminalOS) {
        GoldenLayoutService.closeAllTerminalTabs();
        let settings = {};
        settings.terminal_os = $scope.config.terminal.terminalOS;
        ProjectService.saveProjectTerminalSetting(window.config.projectId, settings)
          .then(() => {
            CommonFunctionService.setWaitCursor(true);
            terminalOS = $scope.config.terminal.terminalOS;
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'success',
              content: gettextCatalog.getString('You have changed Terminal OS. Please reload browser to take effect.')
            });
            ContainerService.removeTerminal(window.config.projectId)
              .then(() => {
                CommonFunctionService.setWaitCursor(false);
                const msg = gettextCatalog.getString('You have changed Terminal OS. Please reload browser to take effect.');
                alert(msg);
                setTimeout(() => $window.location.reload(), 2000);
              })
              .catch(() => {
                CommonFunctionService.setWaitCursor(false);
              });
          })
          .catch(err => {
            CommonFunctionService.setWaitCursor(false);
            console.error('Coult not save project terminal setting', err);
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Could not save the Terminal OS changes.')
            });
          });
      }
      return TerminalFactory.setSettings($scope.config.terminal);
    }

    function applyEditor () {
      if (($scope.config.editor && $scope.config.editor.hasOwnProperty('tabSize') && _.isNull($scope.config.editor.tabSize))) {
        $scope.config.editor.modelFormatting.tabSize = 1;
      }

      GlobalEditorConfig.setGlobalMonacoEditorOptions($scope.config.editor);
      return ProjectService.saveEditorSetting(window.config.projectId, $scope.config.editor);
    }

    function applyCustomerExperience () {
      return UserFactory.setCustomerExperienceSettings($scope.config.user);
    }

    // init data
    function readTerminalSettings () {
      const terminal_settings = TerminalFactory.getSettings();
      $scope.terminalFontFamilies = TerminalSettingFactory.getValidFonts();
      $scope.terminalThemes = TerminalSettingFactory.getValidThemes();
      $scope.terminalCursorStyles = TerminalSettingFactory.getValidCursorStyles();
      $scope.terminalOSes = TerminalSettingFactory.getValidTerminalOSes();
      assignTerminalScopeValue(terminal_settings);
      if ($scope.isMultipleLanguage && $scope.terminalFeatureEnabled) {
        // assign terminal_os
        ProjectService.getProjectTerminalSetting(window.config.projectId)
          .then(setting => {
            $scope.config.terminal.terminalOS = setting.terminal_os;
            terminalOS = setting.terminal_os;
          })
          .catch(error => {
            console.error('Could not get terminal setting for this project.', error);
            $scope.config.terminal.terminalOS = TerminalSettingFactory.getDefaultTerminalOS(); // fallback
          });
      }
    }

    function readCustomerExperienceSettings () {
      const customer_settings = UserFactory.getCustomerExperienceSettings();
      $scope.config.user.feedback = customer_settings.feedback;
    }

    function readEditorSettings () {
      const editorConfigWrapper = new EditorConfigWrapper({ monacoEditorOptions: GlobalEditorConfig.getGlobalMonacoEditorOptions() });
      $scope.validThemes = editorConfigWrapper.themes;
      $scope.validFontFamilies = editorConfigWrapper.fonts;
      $scope.validRenderWhitespace = editorConfigWrapper.whitespace;
      $scope.validWordWrap = editorConfigWrapper.wordwrap;

      const currentSettings = editorConfigWrapper._generatedMonacoEditorOptions;
      $scope.config.editor.theme = currentSettings.theme;
      $scope.config.editor.fontFamily = currentSettings.fontFamily;
      $scope.config.editor.fontSize = currentSettings.fontSize;
      $scope.config.editor.minimap.enabled = currentSettings.minimap.enabled;
      $scope.config.editor.autoClosingBrackets = currentSettings.autoClosingBrackets;
      $scope.config.editor.autoIndent = currentSettings.autoIndent;
      $scope.config.editor.renderWhitespace = currentSettings.renderWhitespace;
      $scope.config.editor.wordWrap = currentSettings.wordWrap;
      $scope.config.editor.wordWrapColumn = currentSettings.wordWrapColumn;
      $scope.config.editor.modelFormatting.insertSpaces = currentSettings.modelFormatting.insertSpaces;
      $scope.config.editor.modelFormatting.tabSize = currentSettings.modelFormatting.tabSize;
      $scope.config.editor.dragAndDrop = JSON.parse(currentSettings.dragAndDrop);
      $scope.config.editor.debuggerPanel = currentSettings.debuggerPanel; // Caution: This value is not a Monaco editor option
    }

    $scope.onRestoreDefaultClicked = () => {
      $scope.config.editor = Object.assign({}, GlobalEditorConfig.getDefaultValues());
      if ($scope.terminalFeatureEnabled) $scope.config.terminal = Object.assign({}, TerminalSettingFactory.getDefaultSettings());
      $scope.config.user = Object.assign({}, UserFactory.getDefaultCustormerExperienceSettings());
      if ($scope.isMultipleLanguage) $scope.config.terminal.terminalOS = TerminalSettingFactory.getDefaultTerminalOS();
      $scope.onApplyClicked();
    };

    $scope.onApplyClicked = () => {
      applyEditor().then((response) => {
        GlobalEditorConfig.fetchEditorSetting();
        applyTerminal().then((response) => {
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Workspace configurations has been saved.')
          });
          // show or close debugger panel
          const showDebuggerPanel = ProjectFactory.hasDebuggerService() && $scope.config.editor && $scope.config.editor.debuggerPanel;
          PubSub.publish(Constant.EVENT.TOGGLE_DEBUGGER_VIEW, { open: showDebuggerPanel });
          applyCustomerExperience().then((response) => {
          }).catch((error) => {
            console.log('Customer Experience', error);
            PubSub.publish(Constant.EVENT.NOTIFY_USER, {
              className: 'danger',
              content: gettextCatalog.getString('Cannot apply Customer Experience settings.')
            });
          });
        }).catch((error) => {
          console.log('workspace configuration', error);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'danger',
            content: gettextCatalog.getString('Cannot apply workspace configurations.')
          });
        });
      }).catch((error) => {
        console.log('workspace configuration', error);
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('Cannot apply workspace configurations.')
        });
      });
    };

    readEditorSettings();
    if ($scope.terminalFeatureEnabled) readTerminalSettings();
    readCustomerExperienceSettings();
  }
]);

;angular.module('monacaIDE').controller('ProjectShareWindowController', [
  '$scope',
  '$q',
  'ShareApiService',
  'CommonFunctionService',
  'PubSub',
  'Constant',
  'ProjectFactory',
  'EnvironmentFactory',
  'gettextCatalog',
  function ($scope, $q, Api, CommonFunctionService, PubSub, Constant, ProjectFactory, EnvironmentFactory, gettextCatalog) {
    $scope.isLoading = true;
    $scope.canShareProject = ProjectFactory.getCanShareProject();

    $scope.isInviteDetailOpen = false;
    $scope.shareUrl = '';
    $scope.users = [];
    $scope.dirtyUsers = [];
    $scope.newmembers = {
      email: '',
      role: 'developer',
      sendmail: false
    };
    $scope.showGravatarIcon = EnvironmentFactory.service.show_gravata_icon;

    MonacaApi.Ide.User.info().then(function (response) {
      $scope.userInfo = response.body.result || {};
    });

    if ($scope.canShareProject) {
      Api.getSharedUsers().then(function (response) {
        if (!response && !response.body && !response.body.result) {
        // Add some error handling.
          return false;
        }

        var result = response.body.result;

        $scope.myUserId = result.myUserId;
        $scope.ownerUserId = result.ownerUserId;
        $scope.shareUrl = result.projectUrl;
        $scope.users = result.teamUsers;

        $scope.isLoading = false;
      });
    } else {
      $scope.isLoading = false;
    }

    $scope.getModalTitle = function () {
      if (EnvironmentFactory.useMenuHeaderForEdu()) {
        return gettextCatalog.getString('Co-editing');
      }
      return gettextCatalog.getString('Share Project');
    };

    $scope.isDeletableUser = function (user) {
      if ($scope.myUserId !== $scope.ownerUserId && $scope.myUserId !== user.id) {
        return false;
      }

      return true;
    };

    $scope.onClickDeleteUser = function (user) {
      if (!$scope.isDeletableUser(user)) {
        return;
      }

      user.isDeleted = true;
      $scope.dirtyUsers.push(user);

      for (var i = 0; i < $scope.users.length; i++) {
        if ($scope.users[i].email === user.email) {
          $scope.users.splice(i, 1);
        }
      }
    };

    $scope.onClickUpdateUserRole = function (user, role) {
      if (user.role !== role) {
        user.role = role;
        $scope.dirtyUsers.push(user);
      }
    };

    $scope.onClickInviteMail = function () {
      $scope.isInviteDetailOpen = true;
      setTimeout(function () {
        document.getElementById('project-share-invite-emails').focus();
      });
    };

    $scope.onClickInviteCancel = function () {
      $scope.isInviteDetailOpen = false;
    };

    $scope.onClickInviteSubmit = function () {
      $scope.isLoading = true;

      Api.addSharedUser($scope.newmembers.email, $scope.newmembers.role, $scope.newmembers.sendmail).then(
        function (response) {
          if (!response && !response.body && !response.body.result) {
          // Add some error handling.
            return false;
          }

          var result = response.body.result;

          $scope.users = result.teamUsers;
          $scope.newmembers.email = '';
          $scope.isInviteDetailOpen = false;

          if (result.message) {
            var messages = result.message.split('\n').filter(function (v) {
              return !!v;
            });

            if (messages[0]) {
              PubSub.publish(Constant.EVENT.NOTIFY_USER, {
                className: 'danger',
                content: CommonFunctionService.htmlspecialchars(messages[0])
              });
            }
          }

          $scope.isLoading = false;
        });
    };

    $scope.isValid = function () {
      return ($scope.newmembers.email && $scope.newmembers.role);
    };

    $scope.onClickOk = function (modalInstance) {
      if (!$scope.dirtyUsers.length) {
        modalInstance.$close();
        return;
      }

      var dfds = [];

      $scope.dirtyUsers.forEach(function (user) {
        if (user.isDeleted) {
          dfds.push(Api.removeSharedUser(user.email));
        } else {
          dfds.push(Api.updateUserRole(user.email, user.role));
        }
      });

      $q.all(dfds).then(function () {
        modalInstance.$close();
      });
    };
  }]);

;angular.module('monacaIDE').controller('ProjectPublishWindowController', [
  '$scope',
  '$q',
  '$uibModal',
  'PublishApiService',
  'EnvironmentFactory',
  'gettextCatalog',
  function ($scope, $q, $modal, Api, EnvironmentFactory, gettextCatalog) {
    $scope.isLoading = true;
    $scope.publishUrl = '';

    $scope.getModalTitle = function () {
      if (EnvironmentFactory.useMenuHeaderForEdu()) {
        return gettextCatalog.getString('Export (Web)');
      }
      return gettextCatalog.getString('Publish Project');
    };

    Api.isPublished().then(function (response) {
      $scope.publishUrl = getPublishUrl(response.pid);
      $scope.isLoading = false;
    }, function (response) {
      alert('Could not determine whether the project is publihsed or not!');
    });

    $scope.onTogglePublish = function () {
      $scope.isLoading = true;

      Api.togglePublish().then(function (response) {
        $scope.publishUrl = getPublishUrl(response.pid);
        $scope.isLoading = false;
      }, function (response) {
        alert('The requested action could not be completed. Please Try again.');
      });
    };

    $scope.onClickCancel = function (modalInstance) {
      modalInstance.$close();
    };

    function getPublishUrl (pid) {
      return pid ? window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) + '/directimport?pid=' + pid : '';
    }
  }]);

;angular.module('monacaIDE').controller('VcsAbortMergeController', [
  '$scope',
  '$sce',
  'PubSub',
  'Constant',
  'VcsApiService',
  function ($scope, $sce, PubSub, Constant, VcsApiService) {
    $scope.pages = {
      default: 'default',
      loading: 'loading',
      success: 'success',
      error: 'error'
    };
    $scope.page = $scope.pages.default;
    // error title & message
    $scope.errorTitle = '';
    $scope.errorMessage = '';
    // abort merge
    $scope.onClickAbortButton = function () {
      $scope.page = $scope.pages.loading;
      VcsApiService.abortMerge().then(onSuccess, onError);
    };

    function onSuccess () {
      $scope.page = $scope.pages.success;
      PubSub.publish(Constant.EVENT.MERGING_RESOLVED);
      PubSub.publish(Constant.EVENT.TREE_UPDATED);
    }

    function onError (error) {
      $scope.page = $scope.pages.error;
      $scope.errorTitle = $sce.trustAsHtml(error.title);
      $scope.errorMessage = $sce.trustAsHtml(error.message);
    }
  }
]);

;angular.module('monacaIDE').controller('VcsCommitController', [
  '$scope',
  'PubSub',
  'Constant',
  'VcsApiService',
  '$sce',
  function ($scope, PubSub, Constant, VcsApiService, $sce) {
    $scope.page = 'loading';
    $scope.commitMessage = '';
    $scope.isToCommitedAll = 0; // can be 0,1,2 (2 is true, 1 is indeterminate)
    $scope.status = {untracked: 0, modified: 0, renamed: 0, deleted: 0, 'updated-but-unmerged': 0};
    $scope.files = [];
    $scope.hideBack = 0;
    $scope.model = {};

    VcsApiService.status().then(function (response) {
      if (response.status === 'ok' && response.title && response.message) {
        displayError(response);
        $scope.hideBack = 1;
        return;
      }
      $scope.page = 'default';
      $scope.status = response.result.overview || $scope.status;
      $scope.files = response.result.files || [];
      $scope.hideBack = 0;
    }, function (result) {
      $scope.hideBack = 1;
      displayError(result);
    });

    function displayError (result) {
      $scope.page = 'error';
      $scope.title = $sce.trustAsHtml(result.title);
      $scope.message = $sce.trustAsHtml(result.message);
    }

    function setCheckAllButtonState () {
      var el = document.getElementById('vcs-commit-window-files-commitall');
      if (el) {
        switch ($scope.isToCommitedAll) {
        case 0:
          el.checked = false;
          el.indeterminate = false;
          break;
        case 1:
          el.checked = false;
          el.indeterminate = true;
          break;
        case 2:
          el.checked = true;
          el.indeterminate = false;
          break;
        }
      }
    }

    $scope.onClickCheckAll = function () {
      if ($scope.isToCommitedAll <= 1) $scope.isToCommitedAll = 2;
      else $scope.isToCommitedAll = 0;

      $scope.files.forEach(function (file) {
        file.isToCommited = !!$scope.isToCommitedAll;
      });

      setCheckAllButtonState();
    };

    $scope.onClickFile = function (file) {
      file.isToCommited = !file.isToCommited;

      var checked = $scope.files[0].isToCommited;

      // 'CommitAll' checkbox state
      for (var i = 0; i < $scope.files.length; i++) {
        if ($scope.files[i].isToCommited !== checked) {
          $scope.isToCommitedAll = 1;
          setCheckAllButtonState();
          return;
        }
      }

      $scope.isToCommitedAll = checked ? 2 : 0;
      setCheckAllButtonState();
    };

    $scope.highlightRow = function ($event) {
      var row = $($event.target).closest('tr');
      row.toggleClass('highlight-selected-row');
    };

    $scope.onClickCheckbox = function (file) {
      file.isToCommited = !file.isToCommited;
    };

    $scope.onClickSubmit = function () {
      $scope.page = 'committing';
      var files = $scope.files.filter(function (file) {
        return file.isToCommited;
      });

      var fileForSubmission = [];

      files.forEach(function (item, index) {
        fileForSubmission.push(item.name);
      });

      VcsApiService.commit(this.commitMessage, fileForSubmission).then(function (response) {
        $scope.page = 'success';
        PubSub.publish(Constant.EVENT.MERGING_RESOLVED);
      }, function (result) {
        displayError(result);
      });
    };

    $scope.onClickBack = function () {
      $scope.page = 'default';
    };
  }]);

;angular.module('monacaIDE').controller('VcsCommitHistoryController', [
  '$scope',
  'VcsApiService',
  function ($scope, VcsApiService) {
  // Forte.MainPanel.LoadMask.show();
    $scope.diff = null;
    $scope.loading = true;

    VcsApiService.localHistory().then(function (response) {
      var commits = response.result;

      if (commits.length > 0) {
        $scope.displayDiff(0, commits[0].commit_id, commits[0].parent);
      }

      $scope.commits = commits;

      $scope.loading = false;

    // Forte.MainPanel.LoadMask.hide();
    }, function (result) {});

    $scope.displayDiff = function ($event, commit_id1, commit_id2) {
    // Forte.MainPanel.LoadMask.show();

      VcsApiService.diff(commit_id1, commit_id2).then(function (response) {
        var diff2htmlUi = new Diff2HtmlUI({diff: response.result});

        diff2htmlUi.draw('#diff-viewer', {inputFormat: 'json', showFiles: true, matching: 'lines'});
        diff2htmlUi.fileListCloseable('#diff-viewer', false);
        diff2htmlUi.highlightCode('#diff-viewer');

        $scope.diff = true;
        // Forte.MainPanel.LoadMask.hide();

        if ($event && $event.target) {
          var $selected = $($event.target).closest('li');
          var $items = $selected.closest('ul').find('li');

          $items.removeClass('selected');
          $selected.addClass('selected');
        } else if (_.isNumber($event)) {
          var $item = $('.vcs-history-list li:eq(' + $event + ')');
          $item.addClass('selected');
        }
      }, function (result) {
        $scope.diff = false;
      // Forte.MainPanel.LoadMask.hide();
      });
    };
  }]);

;angular.module('monacaIDE').controller('VcsConfigurationController', [
  '$scope',
  '$window',
  '$timeout',
  '$q',
  'PubSub',
  'Constant',
  'ProjectFactory',
  'UserFactory',
  'VcsApiService',
  function ($scope, $window, $timeout, $q, PubSub, Constant, ProjectFactory, UserFactory, VcsApiService) {
    $scope.page = 'loading';
    $scope.configOptions = {};
    $scope.uiSetup = {};

    $scope.planChangeUrl = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) + '/plan/change';
    $scope.uiSetup.hasVcsConfiguration = ProjectFactory.hasVcsConfiguration();
    $scope.uiSetup.hasMultipleServices = Object.values(ProjectFactory.getVcsServiceCollection()).filter(function (x) { return x === true; }).length > 1;

    $scope.openPlanChangeUrl = function () {
      $window.open($scope.planChangeUrl);
    };

    $scope.goToServiceSelection = function () {
      $scope.page = 'git-service-selection';
    };

    $scope.isServiceOptionDisabled = function (service) {
      return !UserFactory.hasVcsServiceCheck(service);
    };

    $scope.initialServiceSelection = function (service) {
      $scope.page = 'loading';

      switch (service) {
      case 'gitssh':
        $scope.serviceType = 'GitManual';
        break;

      case 'github':
        $scope.serviceType = 'GitHub';
        break;

      default:
        $scope.page = 'git-service-unknown';
        return;
      }

      return VcsApiService.setup($scope.serviceType)
        .then(configureSetupSuccess, configureSetupFailure)
        .then(
          function () {
            if (service === 'github' && !$scope.repositories.length) {
              $scope.page = 'git-service-' + service + '-no-repository';
            } else {
              $scope.page = 'git-service-' + service;
            }
          },
          function (error) {
            $scope.page = error && error.page ? error.page : 'git-configuration-error';
          }
        );
    };

    function initDialog () {
      $scope.serviceType = ProjectFactory.getVcsServiceType();

      VcsApiService.setup($scope.serviceType)
        .then(configureSetupSuccess, configureSetupFailure)
        .then(
          function () {
            var service = ProjectFactory.getVcsServiceType().toLowerCase();
            service = service === 'gitmanual' ? 'gitssh' : service;

            $scope.page = 'git-service-' + service;
          }, function () {
            $scope.page = 'git-configuration-error';
          }
        );
    }

    function configureSetupSuccess (response) {
      var data = response.result;

      // Server Data Properties
      $scope.repositories = [];
      $scope.branches = [];
      $scope.emails = [];
      $scope.showUpgrade = !data.hasFullRepoAccess;

      // Functionality Properties
      $scope.configOptions.currentRepository = null;
      $scope.configOptions.currentRepoLink = null;
      $scope.configOptions.selectedRepository = null;
      $scope.configOptions.selectedEmail = null;
      $scope.configOptions.selectedBranch = null;
      $scope.configOptions.name = data.name;
      $scope.initCurrentRepository = null;
      $scope.initSelectedBranch = null;

      if ($scope.serviceType === 'GitManual') {
        $scope.uiSetup.sshPublicKey = data.sshPublicKey || false;
        $scope.uiSetup.sshConfigureUrl = window.MonacaApi.Config.getServiceEndpoint(window.MonacaApi.Config.ENDPOINT_WEB) + '/ssh';

        if (!$scope.uiSetup.sshPublicKey) {
          return $q.reject({
            page: 'git-missing-ssh-key'
          });
        }

        // Due to manual configs, scope setup is different.
        $scope.configOptions.selectedEmail = data.email;

        // VCS has already been configured.
        if (typeof data.repo === 'string') {
          $scope.configOptions.currentRepository = data.repo;
          configureBranches(data.branch);
        }

        return;
      }

      if (typeof data.repo === 'string') {
        $scope.configOptions.currentRepository = data.repo;
        $scope.configOptions.currentRepoLink = data.repo_url;

        configureBranches(data.branch);

        for (var i = 0; i < data.email.length; i++) {
          $scope.emails.push({
            value: data.email[i].email,
            name: data.email[i].email
          });

          if (data.email[i].selected) {
            $scope.configOptions.selectedEmail = data.email[i].email;
          }
        }
      } else {
        for (var x = 0; x < data.repo.length; x++) {
          $scope.repositories.push({
            value: data.repo[x].id,
            name: data.repo[x].full_name
          });
        }

        for (var y = 0; y < data.email.length; y++) {
          var email = data.email[y].email;

          $scope.emails.push({
            value: email,
            name: email
          });

          if (data.email[y].selected) {
            $scope.configOptions.selectedEmail = email;
          }
        }
      }
    }

    function configureSetupFailure (result) {
      $scope.title = result.title;
      $scope.message = result.message;

      // continue the reject
      return $q.reject(result);
    }

    function configureBranches (branches) {
      for (var i = 0; i < branches.length; i++) {
        $scope.branches.push({
          value: branches[i].name,
          name: branches[i].name
        });

        if (branches[i].selected) {
          $scope.configOptions.selectedBranch = branches[i].name;
        }
      }
    }

    $scope.onClickAdvanceConfigurations = function () {
      $scope.page = 'loading';
      initDialog();
    };

    $scope.onClickInitialize = function () {
      var options = {
        current_working_branch: $scope.configOptions.selectedBranch,
        commit_email: $scope.configOptions.selectedEmail,
        commit_name: $scope.configOptions.name
      };

      if (!$scope.configOptions.currentRepository) {
        options.type = $scope.serviceType;
        options.repository_id = $scope.configOptions.selectedRepository;
      }

      // display spinner while processing request.
      $scope.page = 'loading';

      VcsApiService.configure(options).then(function (response) {
      // During initialization, the currentRepository will not exist even when the save is successfully.
      // Use the selected repository and master as branch in this case.
        if (!$scope.configOptions.currentRepository) {
          for (var i = 0; i < $scope.repositories.length; i++) {
            if ($scope.repositories[i].value === $scope.configOptions.selectedRepository) {
              $scope.initCurrentRepository = $scope.repositories[i].name;
              break;
            }
          }

          $scope.initSelectedBranch = 'master';
        }

        $scope.page = 'git-configuration-success';
        $scope.message = response.message;

        // Configurations should now be available and other menu items accessable.
        ProjectFactory.setVcsServiceType($scope.serviceType);

        // Update having VCS flags.
        ProjectFactory.setHasVcsConfiguration(true);
        $scope.uiSetup.hasVcsConfiguration = ProjectFactory.hasVcsConfiguration();

        // Update file tree.
        PubSub.publish(Constant.EVENT.TREE_UPDATED);

        // branch changed
        if (response.result && response.result.changedBranch) {
          PubSub.publish(Constant.EVENT.BRANCH_CHANGED);
        }
      }, function (response) {
        $scope.page = 'git-configuration-error';
        $scope.title = response.title;
        $scope.message = response.message;

        if (response.result && response.result.changedBrunch) {
        // @todo Close All Tabs.
        // Message.ProjectPanel.UpdateProject.send();???
        }
      });
    };

    if (!ProjectFactory.hasVcsConfiguration() && $scope.uiSetup.hasMultipleServices) {
      $timeout(function () {
        $scope.page = 'git-service-selection';
      }, 1);
    } else if (!ProjectFactory.hasVcsConfiguration() && ProjectFactory.getHasServiceVcsGitSsh()) {
      $scope.initialServiceSelection('gitssh');
    } else if (!ProjectFactory.hasVcsConfiguration() && ProjectFactory.getHasServiceVcsGitHub()) {
      $scope.initialServiceSelection('github');
    } else if (ProjectFactory.hasVcsConfiguration()) {
      initDialog();
    }
  }]);

;angular.module('monacaIDE').controller('VcsDiscardChangesController', [
  '$scope',
  '$sce',
  'PubSub',
  'Constant',
  'VcsApiService',
  function ($scope, $sce, PubSub, Constant, VcsApiService) {
    $scope.pages = {
      default: 'default',
      loading: 'loading',
      success: 'success',
      error: 'error'
    };
    $scope.page = $scope.pages.default;
    // error title & message
    $scope.errorTitle = '';
    $scope.errorMessage = '';
    // discard local changes
    $scope.onClickDiscardButton = function () {
      $scope.page = $scope.pages.loading;
      VcsApiService.discard().then(onSuccess, onError);
    };

    function onSuccess () {
      $scope.page = $scope.pages.success;
      PubSub.publish(Constant.EVENT.CHANGE_DISCARDED);
      PubSub.publish(Constant.EVENT.MERGING_RESOLVED);
      PubSub.publish(Constant.EVENT.TREE_UPDATED);
    }

    function onError (error) {
      $scope.page = $scope.pages.error;
      $scope.errorTitle = $sce.trustAsHtml(error.title);
      $scope.errorMessage = $sce.trustAsHtml(error.message);
    }
  }
]);

;angular.module('monacaIDE').controller('VcsPullController', [
  '$sce',
  '$scope',
  'PubSub',
  'Constant',
  'VcsApiService',
  'ProjectFactory',
  function ($sce, $scope, PubSub, Constant, VcsApiService, ProjectFactory) {
    // dialog statuses
    $scope.pages = {
      setupSuccess: 'setupSuccess',
      setupError: 'error',
      pullSuccess: 'pullSuccess',
      pullError: 'pullError',
      loading: 'loading',
      pulling: 'pulling'
    };
    // current dialog status
    $scope.page = $scope.pages.loading;
    // branches
    $scope.branches = [];
    $scope.currentBranch = null;
    $scope.selectedBranch = null;
    // messages for setup API
    $scope.setup = {
      error: {
        title: null,
        message: null
      }
    };
    // messages for pull API
    $scope.pull = {
      success: {
        message: null,
        result: null
      },
      error: {
        message: null,
        result: null
      }
    };

    $scope.serviceType = ProjectFactory.getVcsServiceType();
    if (ProjectFactory.getHasServiceVcsGitSsh()) {
      $scope.serviceType = 'gitssh';
    } else if (ProjectFactory.getHasServiceVcsGitHub()) {
      $scope.serviceType = 'github';
    }
    // get remote branches
    VcsApiService.setup($scope.serviceType).then(
      onSetupSuccess,
      onSetupError
    );

    $scope.isSelectedSameBranch = function () {
      return $scope.currentBranch === $scope.selectedBranch;
    };

    $scope.isLoading = function () {
      return (
        $scope.page === $scope.pages.loading ||
        $scope.page === $scope.pages.pulling
      );
    };

    $scope.onClickPullButton = function () {
      $scope.page = $scope.pages.pulling;
      VcsApiService.pull($scope.selectedBranch.name).then(
        onPullSuccess,
        onPullError
      );
    };

    function onSetupSuccess (response) {
      $scope.page = $scope.pages.setupSuccess;
      $scope.branches = response.result.branch;
      $scope.currentBranch = $scope.branches.find(
        function (branch) {
          return branch.selected;
        }
      );
      $scope.selectedBranch = $scope.currentBranch;
    }

    function onSetupError (error) {
      $scope.page = $scope.pages.setupError;
      $scope.setup.error.title = error.title;
      $scope.setup.error.message = error.message;
    }

    function onPullSuccess (response) {
      $scope.page = $scope.pages.pullSuccess;
      $scope.pull.success.message = $sce.trustAsHtml(response.message);
      $scope.pull.success.result = $sce.trustAsHtml(response.result);
      PubSub.publish(Constant.EVENT.TREE_UPDATED);
      PubSub.publish(Constant.EVENT.PULL_FINISHED);
    }

    function onPullError (error) {
      $scope.page = $scope.pages.pullError;
      $scope.pull.error.message = $sce.trustAsHtml(error.message);
      $scope.pull.error.result = $sce.trustAsHtml(error.result.conflictedFiles);
      // If conflict exists, Git yields to merging state
      if (error.result.conflict) {
        PubSub.publish(Constant.EVENT.MERGING_DETECTED);
        PubSub.publish(Constant.EVENT.TREE_UPDATED);
        PubSub.publish(Constant.EVENT.PULL_FINISHED);
      }
    }
  }
]);

;angular.module('monacaIDE').controller('VcsPushController', [
  '$scope',
  'VcsApiService',
  function ($scope, VcsApiService) {
    $scope.pages = {
      default: 'default',
      pushing: 'pushing',
      success: 'success',
      error: 'error'
    };
    $scope.page = $scope.pages.default;

    $scope.onClickPushButton = function () {
      $scope.page = $scope.pages.pushing;
      VcsApiService.push().then(
        onSuccess,
        onError
      );
    };

    function onSuccess (response) {
      $scope.page = $scope.pages.success;
      $scope.message = response.message;
    }

    function onError (error) {
      $scope.page = $scope.pages.error;
      $scope.message = error.message;
    }
  }]);

;angular.module('monacaIDE').controller('BuildTaskDialog', [
  '$scope',
  'title',
  'buildTask',
  'reports',
  'buildTasks',
  'ProjectService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  'CustomBuildSettingsFactory',
  function ($scope, title, buildTask, reports, buildTasks, ProjectService, PubSub, Constant, gettextCatalog, CustomBuildSettingsFactory) {
    $scope.title = title;
    $scope.reports = reports;
    $scope.name = $scope.description = $scope.selectedReport = $scope.execution = null;
    $scope.id = buildTask ? buildTask.id : null;

    $scope.loadData = () => {
      if (buildTask && buildTask.name) {
        $scope.name = buildTask.name;
        $scope.description = buildTask.description;
        $scope.execution = buildTask.execution;
        $scope.selectedReport = Object.assign({}, buildTask.report);
      } else {
        $scope.selectedReport = CustomBuildSettingsFactory.getDefaultReport();
      }
    };

    $scope.delete = () => {
      let params = {};
      params = Object.assign({}, buildTask);
      params.type = 'buildTask';
      params.isDeleted = 1;
      ProjectService.saveCustomBuildTasks(params)
        .then(() => {
          PubSub.publish(Constant.EVENT.CUSTOM_BUILD_RELOAD);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Build task is deleted.')
          });
          $scope.$close();
        })
        .catch(err => {
          console.log(err);
        });
    };

    $scope.isSaveAble = () => {
      if ($scope.name && $scope.execution) return true;
      return false;
    };

    $scope.isDeleteAble = () => {
      if (!$scope.id) return false;
      return true;
    };

    $scope.isDuplicatedName = (id, name) => {
      if (!id) return false;
      if (!buildTasks || !buildTasks.length) return false;
      return buildTasks.findIndex(element => element.id !== id && element.name === name) >= 0;
    };

    $scope.save = () => {
      let params = {};
      params.type = 'buildTask';
      params.isDeleted = 0;
      params.id = $scope.id;
      params.name = $scope.name;
      if ($scope.isDuplicatedName(params.id, params.name)) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('The task name could not be duplicated!')
        });
        return;
      }
      params.description = $scope.description;
      params.execution = $scope.execution;
      params.report = $scope.selectedReport;
      ProjectService.saveCustomBuildTasks(params)
        .then(() => {
          PubSub.publish(Constant.EVENT.CUSTOM_BUILD_RELOAD);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Build task is saved.')
          });
          $scope.$close();
        })
        .catch(err => {
          console.log(err);
        });
    };

    $scope.loadData();

  }]);

;angular.module('monacaIDE').controller('BatchBuildDialog', [
  '$scope',
  'title',
  'batchBuild',
  'availableBuildTasks',
  'batchBuilds',
  'ProjectService',
  'PubSub',
  'Constant',
  'gettextCatalog',
  function ($scope, title, batchBuild, availableBuildTasks, batchBuilds, ProjectService, PubSub, Constant, gettextCatalog) {
    $scope.title = title;
    $scope.availableBuildTasks = availableBuildTasks.slice(0);
    $scope.buildTasks = [];
    $scope.name = $scope.description = '';
    $scope.selectedAvailableBuildTasks = $scope.selectedBuildTasks = [];
    $scope.currentIndex = -1;
    $scope.id = batchBuild && batchBuild.id ? batchBuild.id : null;

    $scope.loadData = () => {
      if (batchBuild && batchBuild.name) {
        $scope.name = batchBuild.name;
        $scope.description = batchBuild.description;
        $scope.buildTasks = batchBuild.buildTasks.slice(0);
        if (batchBuild.buildTasks && batchBuild.buildTasks.length) {
          // remove the assigned build tasks from available build tasks
          $scope.availableBuildTasks = $scope.availableBuildTasks.filter(item => {
            return (batchBuild.buildTasks.findIndex(element => element.id === item.id) < 0);
          });
        }
      }
    };

    $scope.isAbleToMoveUp = () => {
      if (!$scope.selectedBuildTasks || !$scope.selectedBuildTasks.length || $scope.selectedBuildTasks.length > 1) return false;
      if (!$scope.buildTasks || !$scope.buildTasks.length || $scope.buildTasks.length <= 1) return false;
      $scope.currentIndex = $scope.buildTasks.findIndex(item => item.id === JSON.parse($scope.selectedBuildTasks[0]).id);
      if ($scope.currentIndex <= 0) return false;
      return true;
    };

    $scope.isAbleToMoveDown = () => {
      if (!$scope.selectedBuildTasks || !$scope.selectedBuildTasks.length || $scope.selectedBuildTasks.length > 1) return false;
      if (!$scope.buildTasks || !$scope.buildTasks.length || $scope.buildTasks.length <= 1) return false;
      $scope.currentIndex = $scope.buildTasks.findIndex(item => item.id === JSON.parse($scope.selectedBuildTasks[0]).id);
      if ($scope.currentIndex >= $scope.buildTasks.length - 1) return false;
      return true;
    };

    $scope.isAbleToMoveToBuildTasks = () => {
      if (!$scope.selectedAvailableBuildTasks || !$scope.selectedAvailableBuildTasks.length) return false;
      return true;
    };

    $scope.isAbleToMoveToAvailaleTasks = () => {
      if (!$scope.selectedBuildTasks || !$scope.selectedBuildTasks.length) return false;
      return true;
    };

    $scope.moveUp = () => {
      if (!$scope.isAbleToMoveUp()) return;
      $scope.buildTasks.splice($scope.currentIndex - 1, 0, $scope.buildTasks.splice($scope.currentIndex, 1)[0]);
    };

    $scope.moveDown = () => {
      if (!$scope.isAbleToMoveDown()) return;
      $scope.buildTasks.splice($scope.currentIndex + 1, 0, $scope.buildTasks.splice($scope.currentIndex, 1)[0]);
    };

    $scope.moveFromBuildTasksToAvailableTasks = () => {
      if (!$scope.isAbleToMoveToAvailaleTasks()) return;
      $scope.selectedBuildTasks.forEach(item => {
        let selectedBuildTask = JSON.parse(item);
        $scope.availableBuildTasks.push(selectedBuildTask); // add to list 1: availableBuild task list
        let index = $scope.buildTasks.findIndex(item => item.id === selectedBuildTask.id);
        if (index >= 0) $scope.buildTasks.splice(index, 1); // remove from list 2: build tasks list
      });
      $scope.selectedBuildTasks = [];
    };

    $scope.moveFromAvailableTasksToBuildTasks = () => {
      if (!$scope.isAbleToMoveToBuildTasks()) return;
      $scope.selectedAvailableBuildTasks.forEach(item => {
        let selectedBuildTask = JSON.parse(item);
        $scope.buildTasks.push(selectedBuildTask); // add to list 2: build task list
        let index = $scope.availableBuildTasks.findIndex(item => item.id === selectedBuildTask.id);
        if (index >= 0) $scope.availableBuildTasks.splice(index, 1); // remove from list 1: availableBuild tasks list
      });
      $scope.selectedAvailableBuildTasks = [];
    };

    $scope.getBuildTasksIDs = (buildTasks) => {
      let tmp = [];
      if (buildTasks && buildTasks.length) {
        buildTasks.forEach(item => tmp.push(item.id));
      }
      return tmp;
    };

    $scope.isSaveAble = () => {
      if ($scope.name && $scope.buildTasks && $scope.buildTasks.length) return true;
      return false;
    };

    $scope.isDeleteAble = () => {
      if (!$scope.id) return false;
      return true;
    };

    $scope.isDuplicatedName = (id, name) => {
      if (!id) return false;
      if (!batchBuilds || !batchBuilds.length) return false;
      return batchBuilds.findIndex(element => element.id !== id && element.name === name) >= 0;
    };

    $scope.delete = () => {
      let params = {};
      params = Object.assign({}, batchBuild);
      params.type = 'batchBuild';
      params.isDeleted = 1;
      params.buildTasks = $scope.getBuildTasksIDs(batchBuild.buildTasks);
      ProjectService.saveCustomBuildTasks(params)
        .then(() => {
          PubSub.publish(Constant.EVENT.CUSTOM_BUILD_RELOAD);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Batch build is deleted.')
          });
          $scope.$close();
        })
        .catch(err => {
          console.log(err);
        });
    };

    $scope.save = () => {
      let params = {};
      params.type = 'batchBuild';
      params.isDeleted = 0;
      params.id = $scope.id;
      params.name = $scope.name;
      if ($scope.isDuplicatedName(params.id, params.name)) {
        PubSub.publish(Constant.EVENT.NOTIFY_USER, {
          className: 'danger',
          content: gettextCatalog.getString('The build name could not be duplicated!')
        });
        return;
      }
      params.description = $scope.description;
      params.buildTasks = $scope.getBuildTasksIDs($scope.buildTasks);
      ProjectService.saveCustomBuildTasks(params)
        .then(() => {
          PubSub.publish(Constant.EVENT.CUSTOM_BUILD_RELOAD);
          PubSub.publish(Constant.EVENT.NOTIFY_USER, {
            className: 'success',
            content: gettextCatalog.getString('Batch build is saved.')
          });
          $scope.$close();
        })
        .catch(err => {
          console.log(err);
        });
    };

    $scope.loadData();

  }]);

;angular.module('monacaIDE').constant('OnsenTags', {
  'ons-action-sheet-button': {
    'description': 'Component that represent each button of the action sheet.',
    'attributes': [
      {
        'id': 'icon',
        'description': 'Creates an `ons-icon` component with this string. Only visible on Android.'
      },
      {
        'id': 'modifier',
        'description': 'The appearance of the action sheet button.'
      }
    ]
  },
  'ons-action-sheet': {
    'description': 'Action/bottom sheet that is displayed on top of current screen.\n  This element can either be attached directly to the `<body>` or dynamically created from a template using the `ons.createElement(template, { append: true })` utility function and the `<ons-template>` tag.\n  The action sheet is useful for displaying a list of options and asking the user to make a decision. A `ons-action-sheet-button` is provided for this purpose, although it can contain any type of content.\n  It will automatically be displayed as Material Design (bottom sheet) when running on an Android device.\n',
    'attributes': [
      {
        'id': 'title',
        'description': 'Optional title of the action sheet. A new element will be created containing this string.'
      },
      {
        'id': 'modifier',
        'description': 'The appearance of the action sheet.'
      },
      {
        'id': 'cancelable',
        'description': 'If this attribute is set the action sheet can be closed by tapping the background or by pressing the back button on Android devices.'
      },
      {
        'id': 'disabled',
        'description': 'If this attribute is set the action sheet is disabled.'
      },
      {
        'id': 'animation',
        'description': 'The animation used when showing and hiding the action sheet. Can be either `"none"` or `"default"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'mask-color',
        'description': 'Color of the background mask. Default is `"rgba(0, 0, 0, 0.2)"`.'
      }
    ]
  },
  'ons-alert-dialog-button': {
    'description': '',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the button.'
      },
      {
        'id': 'disabled',
        'description': 'Specify if button should be disabled.'
      }
    ]
  },
  'ons-alert-dialog': {
    'description': 'Alert dialog that is displayed on top of the current screen. Useful for displaying questions, warnings or error messages to the user. The title, content and buttons can be easily customized and it will automatically switch style based on the platform.\n  To use the element it can either be attached directly to the `<body>` element or dynamically created from a template using the `ons.createAlertDialog(template)` utility function and the `<ons-template>` tag.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the dialog.'
      },
      {
        'id': 'cancelable',
        'description': 'If this attribute is set the dialog can be closed by tapping the background or by pressing the back button on Android devices.'
      },
      {
        'id': 'disabled',
        'description': 'If this attribute is set the dialog is disabled.'
      },
      {
        'id': 'animation',
        'description': 'The animation used when showing and hiding the dialog. Can be either `"none"` or `"default"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'mask-color',
        'description': 'Color of the background mask. Default is "rgba(0, 0, 0, 0.2)".'
      }
    ]
  },
  'ons-back-button': {
    'description': 'Back button component for `<ons-toolbar>`. Put it in the left part of the `<ons-toolbar>`.\n  It will find the parent `<ons-navigator>` element and pop a page when clicked. This behavior can be overriden by specifying the `onClick` property.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the back button.'
      }
    ]
  },
  'ons-bottom-toolbar': {
    'description': 'Toolbar component that is positioned at the bottom of the page.',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the toolbar.'
      }
    ]
  },
  'ons-button': {
    'description': 'Button component. If you want to place a button in a toolbar, use `<ons-toolbar-button>` or `<ons-back-button>` instead.\n  Will automatically display as a Material Design button with a ripple effect on Android.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the button.'
      },
      {
        'id': 'ripple',
        'description': 'If this attribute is defined, the button will have a ripple effect.'
      },
      {
        'id': 'disabled',
        'description': 'Specify if button should be disabled.'
      }
    ]
  },
  'ons-card': {
    'description': 'Component to create a card that displays some information.\n The card may be composed by divs with specially prepared classes `title` and/or `content`. You can also add your own content as you please.',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the card.'
      }
    ]
  },
  'ons-carousel-item': {
    'description': 'Carousel item component. Used as a child of the `<ons-carousel>` element.\n',
    'attributes': []
  },
  'ons-carousel': {
    'description': 'Carousel component. A carousel can be used to display several items in the same space.\n  The component supports displaying content both horizontally and vertically. The user can scroll through the items by dragging and it can also be controller programmatically.\n',
    'attributes': [
      {
        'id': 'direction',
        'description': 'The direction of the carousel. Can be either "horizontal" or "vertical". Default is "horizontal".'
      },
      {
        'id': 'fullscreen',
        'description': 'If this attribute is set the carousel will cover the whole screen.'
      },
      {
        'id': 'overscrollable',
        'description': 'If this attribute is set the carousel will be scrollable over the edge. It will bounce back when released.'
      },
      {
        'id': 'centered',
        'description': 'If this attribute is set the carousel then the selected item will be in the center of the carousel instead of the beginning. Useful only when the items are smaller than the carousel. '
      },
      {
        'id': 'item-width',
        'description': "ons-carousel-item's width. Only works when the direction is set to \"horizontal\"."
      },
      {
        'id': 'item-height',
        'description': "ons-carousel-item's height. Only works when the direction is set to \"vertical\"."
      },
      {
        'id': 'auto-scroll',
        'description': 'If this attribute is set the carousel will be automatically scrolled to the closest item border when released.'
      },
      {
        'id': 'auto-scroll-ratio',
        'description': 'A number between 0.0 and 1.0 that specifies how much the user must drag the carousel in order for it to auto scroll to the next item.'
      },
      {
        'id': 'swipeable',
        'description': 'If this attribute is set the carousel can be scrolled by drag or swipe.'
      },
      {
        'id': 'disabled',
        'description': 'If this attribute is set the carousel is disabled.'
      },
      {
        'id': 'initial-index',
        'description': 'Specify the index of the ons-carousel-item to show initially. Default is 0.'
      },
      {
        'id': 'auto-refresh',
        'description': 'When this attribute is set the carousel will automatically refresh when the number of child nodes change.'
      },
      {
        'id': 'animation',
        'description': 'If this attribute is set to `"none"` the transitions will not be animated.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      }
    ]
  },
  'ons-checkbox': {
    'description': 'A checkbox element. The component will automatically render as a Material Design checkbox on Android devices.\n  Most attributes that can be used for a normal `<input type="checkbox">` element can also be used on the `<ons-checkbox>` element.\n',
    'attributes': [
      {
        'id': 'input-id',
        'description': 'Specify the "id" attribute of the inner `<input>` element. This is useful when using `<label for="...">` elements.'
      }
    ]
  },
  'ons-col': {
    'description': 'Represents a column in the grid system. Use with `<ons-row>` to layout components.',
    'attributes': [
      {
        'id': 'vertical-align',
        'description': 'Vertical alignment of the column. Valid values are "top", "center", and "bottom".'
      },
      {
        'id': 'width',
        'description': 'The width of the column. Valid values are css width values ("10%", "50px").'
      }
    ]
  },
  'ons-dialog': {
    'description': 'Dialog that is displayed on top of current screen. As opposed to the `<ons-alert-dialog>` element, this component can contain any kind of content.\n  To use the element it can either be attached directly to the `<body>` element or dynamically created from a template using the `ons.createDialog(template)` utility function and the `<ons-template>` tag.\n  The dialog is useful for displaying menus, additional information or to ask the user to make a decision.\n  It will automatically be displayed as Material Design when running on an Android device.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the dialog.'
      },
      {
        'id': 'cancelable',
        'description': 'If this attribute is set the dialog can be closed by tapping the background or by pressing the back button on Android devices.'
      },
      {
        'id': 'disabled',
        'description': 'If this attribute is set the dialog is disabled.'
      },
      {
        'id': 'animation',
        'description': 'The animation used when showing and hiding the dialog. Can be either `"none"` or `"default"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'mask-color',
        'description': 'Color of the background mask. Default is `"rgba(0, 0, 0, 0.2)"`.'
      }
    ]
  },
  'ons-fab': {
    'description': 'The Floating action button is a circular button defined in the [Material Design specification](https://www.google.com/design/spec/components/buttons-floating-action-button.html). They are often used to promote the primary action of the app.\n  It can be displayed either as an inline element or in one of the corners. Normally it will be positioned in the lower right corner of the screen.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the button.'
      },
      {
        'id': 'ripple',
        'description': 'If this attribute is defined, the button will have a ripple effect when tapped.'
      },
      {
        'id': 'position',
        'description': 'The position of the button. Should be a string like `"bottom right"` or `"top left"`. If this attribute is not defined it will be displayed as an inline element.'
      },
      {
        'id': 'disabled',
        'description': 'Specify if button should be disabled.'
      }
    ]
  },
  'ons-gesture-detector': {
    'description': 'Component to detect finger gestures within the wrapped element. Following gestures are supported:\n  - Drag gestures: `drag`, `dragleft`, `dragright`, `dragup`, `dragdown`\n  - Hold gestures: `hold`, `release`\n  - Swipe gestures: `swipe`, `swipeleft`, `swiperight`, `swipeup`, `swipedown`\n  - Tap gestures: `tap`, `doubletap`\n  - Pinch gestures: `pinch`, `pinchin`, `pinchout`\n  - Other gestures: `touch`, `transform`, `rotate`\n',
    'attributes': []
  },
  'ons-icon': {
    'description': 'Displays an icon. The following icon suites are available:\n  * [Font Awesome](https://fortawesome.github.io/Font-Awesome/)\n  * [Ionicons](http://ionicons.com/)\n  * [Material Design Iconic Font](http://zavoloklom.github.io/material-design-iconic-font/)\n',
    'attributes': [
      {
        'id': 'icon',
        'description': 'The icon name. `"md-"` prefix for Material Icons, `"fa-"` for Font Awesome and `"ion-"` prefix for Ionicons.\n  See all available icons on their respective sites:\n  * [Font Awesome](https://fortawesome.github.io/Font-Awesome/)\n  * [Ionicons](http://ionicons.com)\n  * [Material Design Iconic Font](http://zavoloklom.github.io/material-design-iconic-font/)\n  Icons can also be styled based on modifier presence. Add comma-separated icons with `"modifierName:"` prefix.\n  The code:\n  ```\n  <ons-icon\n    icon="ion-edit, material:md-edit">\n  </ons-icon>\n  ```\n  will display `"md-edit"` for Material Design and `"ion-edit"` as the default icon.\n'
      },
      {
        'id': 'size',
        'description': 'The sizes of the icon. Valid values are lg, 2x, 3x, 4x, 5x, or in the size in pixels.\n  Icons can also be styled based on modifier presence. Add comma-separated icons with `"modifierName:"` prefix.\n  The code:\n  ```\n  <ons-icon\n    icon="ion-edit"\n    size="32px, material:24px">\n  </ons-icon>\n  ```\n  will render as a `24px` icon if the `"material"` modifier is present and `32px` otherwise.\n'
      },
      {
        'id': 'rotate',
        'description': 'Number of degrees to rotate the icon. Valid values are 90, 180 and 270.'
      },
      {
        'id': 'fixed-width',
        'description': 'When used in a list, you want the icons to have the same width so that they align vertically by defining this attribute.'
      },
      {
        'id': 'spin',
        'description': 'Specify whether the icon should be spinning.'
      }
    ]
  },
  'ons-if': {
    'description': 'Conditionally display content depending on the platform, device orientation or both.\n  Sometimes it is useful to conditionally hide or show certain components based on platform. When running on iOS the `<ons-if>` element can be used to hide the `<ons-fab>` element.\n',
    'attributes': [
      {
        'id': 'platform',
        'description': 'Space-separated platform names. Possible values are `"ios"`, `"android"`, `"windows"` and `"other"`.'
      },
      {
        'id': 'orientation',
        'description': 'Either `"portrait"` or `"landscape"`.'
      }
    ]
  },
  'ons-input': {
    'description': 'An input element. The `type` attribute can be used to change the input type. All text input types are supported.\n  The component will automatically render as a Material Design input on Android devices.\n  Most attributes that can be used for a normal `<input>` element can also be used on the `<ons-input>` element.\n',
    'attributes': [
      {
        'id': 'placeholder',
        'description': 'Placeholder text. In Material Design, this placeholder will be a floating label.'
      },
      {
        'id': 'float',
        'description': 'If this attribute is present, the placeholder will be animated in Material Design.'
      },
      {
        'id': 'type',
        'description': 'Specify the input type. This is the same as the "type" attribute for normal inputs. It expects strict text types such as `text`, `password`, etc. For checkbox, radio button, select or range, please have a look at the corresponding elements.\n  Please take a look at [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-type) for an exhaustive list of possible values. Depending on the platform and browser version some of these might not work.\n'
      },
      {
        'id': 'input-id',
        'description': 'Specify the "id" attribute of the inner `<input>` element. This is useful when using `<label for="...">` elements.'
      }
    ]
  },
  'ons-lazy-repeat': {
    'description': 'Using this component a list with millions of items can be rendered without a drop in performance.\n  It does that by "lazily" loading elements into the DOM when they come into view and\n  removing items from the DOM when they are not visible.\n',
    'attributes': []
  },
  'ons-list-header': {
    'description': 'Header element for list items. Must be put inside the `<ons-list>` component.',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the list header.'
      }
    ]
  },
  'ons-list-item': {
    'description': 'Component that represents each item in a list. The list item is composed of three parts that are represented with the `left`, `center` and `right` classes. These classes can be used to ensure that the content of the list items is properly aligned.\n  ```\n  <ons-list-item>\n    <div class="left">Left</div>\n    <div class="center">Center</div>\n    <div class="right">Right</div>\n  </ons-list-item>\n  ```\n  There is also a number of classes (prefixed with `list-item__*`) that help when putting things like icons and thumbnails into the list items.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the list item.'
      },
      {
        'id': 'lock-on-drag',
        'description': 'Prevent vertical scrolling when the user drags horizontally.'
      },
      {
        'id': 'tappable',
        'description': 'Makes the element react to taps.'
      },
      {
        'id': 'tap-background-color',
        'description': 'Changes the background color when tapped. For this to work, the attribute "tappable" needs to be set. The default color is "#d9d9d9". It will display as a ripple effect on Android.'
      }
    ]
  },
  'ons-list-title': {
    'description': 'Represents a list title.',
    'attributes': []
  },
  'ons-list': {
    'description': 'Component to define a list, and the container for ons-list-item(s).',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the list.'
      }
    ]
  },
  'ons-modal': {
    'description': 'Modal component that masks current screen. Underlying components are not subject to any events while the modal component is shown.\n  This component can be used to block user input while some operation is running or to show some information to the user.\n',
    'attributes': [
      {
        'id': 'animation',
        'description': 'The animation used when showing and hiding the modal. Can be either `"none"` or `"fade"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      }
    ]
  },
  'ons-navigator': {
    'description': 'A component that provides page stack management and navigation. Stack navigation is the most common navigation pattern for mobile apps.\n  When a page is pushed on top of the stack it is displayed with a transition animation. When the user returns to the previous page the top page will be popped from the top of the stack and hidden with an opposite transition animation.\n',
    'attributes': [
      {
        'id': 'page',
        'description': 'First page to show when navigator is initialized.'
      },
      {
        'id': 'swipeable',
        'description': 'Enable iOS "swipe to pop" feature.'
      },
      {
        'id': 'swipe-target-width',
        'description': 'The width of swipeable area calculated from the edge (in pixels). Use this to enable swipe only when the finger touch on the screen edge.'
      },
      {
        'id': 'swipe-threshold',
        'description': 'Specify how much the page needs to be swiped before popping. A value between `0` and `1`.'
      },
      {
        'id': 'animation',
        'description': 'Animation name. Available animations are `"slide"`, `"lift"`, `"fade"` and `"none"`.\n  These are platform based animations. For fixed animations, add `"-ios"` or `"-md"` suffix to the animation name. E.g. `"lift-ios"`, `"lift-md"`. Defaults values are `"slide-ios"` and `"fade-md"` depending on the platform.\n'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`"
      }
    ]
  },
  'ons-page': {
    'description': 'This component defines the root of each page. If the content is large it will become scrollable.\n  A navigation bar can be added to the top of the page using the `<ons-toolbar>` element.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'Specify modifier name to specify custom styles.'
      },
      {
        'id': 'on-infinite-scroll',
        'description': "Path of the function to be executed on infinite scrolling. Example: `app.loadData`. The function receives a done callback that must be called when it's finished."
      }
    ]
  },
  'ons-popover': {
    'description': 'A component that displays a popover next to an element. The popover can be used to display extra information about a component or a tooltip.\n  To use the element it can either be attached directly to the `<body>` element or dynamically created from a template using the `ons.createPopover(template)` utility function and the `<ons-template>` tag.\n  Another common way to use the popover is to display a menu when a button on the screen is tapped. For Material Design, popover looks exactly as a dropdown menu.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the popover.'
      },
      {
        'id': 'direction',
        'description': 'A space separated list of directions. If more than one direction is specified,\n  it will be chosen automatically. Valid directions are `"up"`, `"down"`, `"left"` and `"right"`.\n'
      },
      {
        'id': 'cancelable',
        'description': 'If this attribute is set the popover can be closed by tapping the background or by pressing the back button.'
      },
      {
        'id': 'cover-target',
        'description': 'If set the popover will cover the target on the screen.'
      },
      {
        'id': 'animation',
        'description': 'The animation used when showing an hiding the popover. Can be either `"none"`, `"default"`, `"fade-ios"` or `"fade-md"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'mask-color',
        'description': 'Color of the background mask. Default is `"rgba(0, 0, 0, 0.2)"`.'
      }
    ]
  },
  'ons-progress-bar': {
    'description': 'The component is used to display a linear progress bar. It can either display a progress bar that shows the user how much of a task has been completed. In the case where the percentage is not known it can be used to display an animated progress bar so the user can see that an operation is in progress.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'Change the appearance of the progress indicator.'
      },
      {
        'id': 'value',
        'description': 'Current progress. Should be a value between 0 and 100.'
      },
      {
        'id': 'secondary-value',
        'description': 'Current secondary progress. Should be a value between 0 and 100.'
      },
      {
        'id': 'indeterminate',
        'description': 'If this attribute is set, an infinite looping animation will be shown.'
      }
    ]
  },
  'ons-progress-circular': {
    'description': 'This component displays a circular progress indicator. It can either be used to show how much of a task has been completed or to show a looping animation to indicate that an operation is currently running.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'Change the appearance of the progress indicator.'
      },
      {
        'id': 'value',
        'description': 'Current progress. Should be a value between 0 and 100.'
      },
      {
        'id': 'secondary-value',
        'description': 'Current secondary progress. Should be a value between 0 and 100.'
      },
      {
        'id': 'indeterminate',
        'description': 'If this attribute is set, an infinite looping animation will be shown.'
      }
    ]
  },
  'ons-pull-hook': {
    'description': 'Component that adds **Pull to refresh** functionality to an `<ons-page>` element.\n  It can be used to perform a task when the user pulls down at the top of the page. A common usage is to refresh the data displayed in a page.\n',
    'attributes': [
      {
        'id': 'disabled',
        'description': 'If this attribute is set the "pull-to-refresh" functionality is disabled.'
      },
      {
        'id': 'height',
        'description': 'Specify the height of the component. When pulled down further than this value it will switch to the "preaction" state. The default value is "64px".'
      },
      {
        'id': 'threshold-height',
        'description': 'Specify the threshold height. The component automatically switches to the "action" state when pulled further than this value. The default value is "96px". A negative value or a value less than the height will disable this property.'
      },
      {
        'id': 'fixed-content',
        'description': 'If this attribute is set the content of the page will not move when pulling.'
      }
    ]
  },
  'ons-radio': {
    'description': 'A radio button element. The component will automatically render as a Material Design radio button on Android devices.\n  Most attributes that can be used for a normal `<input type="radio">` element can also be used on the `<ons-radio>` element.\n',
    'attributes': [
      {
        'id': 'input-id',
        'description': 'Specify the "id" attribute of the inner `<input>` element. This is useful when using `<label for="...">` elements.'
      }
    ]
  },
  'ons-range': {
    'description': 'Range input component. Used to display a draggable slider.\n  Works very similar to the `<input type="range">` element.\n',
    'attributes': [
      {
        'id': 'disabled',
        'description': 'Whether the element is disabled or not.'
      }
    ]
  },
  'ons-ripple': {
    'description': 'Adds a Material Design "ripple" effect to an element. The ripple effect will spread from the position where the user taps.\n  Some elements such as `<ons-button>` and `<ons-fab>`  support a `ripple` attribute.\n',
    'attributes': [
      {
        'id': 'color',
        'description': 'Color of the ripple effect.'
      },
      {
        'id': 'modifier',
        'description': 'The appearance of the ripple effect.'
      },
      {
        'id': 'background',
        'description': 'Color of the background.'
      },
      {
        'id': 'size',
        'description': 'Sizing of the wave on ripple effect. Set "cover" or "contain". Default is "cover".'
      },
      {
        'id': 'center',
        'description': 'If this attribute presents, change the position of wave effect to center of the target element.'
      },
      {
        'id': 'disabled',
        'description': 'If this attribute is set, the ripple effect will be disabled.'
      }
    ]
  },
  'ons-row': {
    'description': 'Represents a row in the grid system. Use with `<ons-col>` to layout components.',
    'attributes': [
      {
        'id': 'vertical-align',
        'description': 'Short hand attribute for aligning vertically. Valid values are top, bottom, and center.'
      }
    ]
  },
  'ons-search-input': {
    'description': 'A search input element. The component will automatically render as a Material Design search input on Android devices.\n  Most attributes that can be used for a normal `<input>` element can also be used on the `<ons-search-input>` element.\n',
    'attributes': [
      {
        'id': 'input-id',
        'description': 'Specify the "id" attribute of the inner `<input>` element. This is useful when using `<label for="...">` elements.'
      }
    ]
  },
  'ons-select': {
    'description': 'Select component. If you want to place a select with an ID of `my-id` on a page, use `<ons-select select-id="my-id">`.\n  The component will automatically display as a Material Design select on Android.\n  Most attributes that can be used for a normal `<select>` element can also be used on the `<ons-select>` element.\n',
    'attributes': [
      {
        'id': 'autofocus',
        'description': 'Element automatically gains focus on page load.'
      },
      {
        'id': 'disabled',
        'description': 'Specify if select input should be disabled.'
      },
      {
        'id': 'form',
        'description': 'Associate a select element to an existing form on the page, even if not nested.'
      },
      {
        'id': 'multiple',
        'description': 'If this attribute is defined, multiple options can be selected at once.'
      },
      {
        'id': 'name',
        'description': 'Name the select element, useful for instance if it is part of a form.'
      },
      {
        'id': 'required',
        'description': 'Make the select input required for submitting the form it is part of.'
      },
      {
        'id': 'select-id',
        'description': 'ID given to the inner select, useful for dynamic manipulation.'
      },
      {
        'id': 'size',
        'description': 'How many options are displayed; if there are more than the size then a scroll appears to navigate them.'
      }
    ]
  },
  'ons-speed-dial-item': {
    'description': 'This component displays the child elements of the Material Design Speed dial component.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the component.'
      }
    ]
  },
  'ons-speed-dial': {
    'description': 'Element that displays a Material Design Speed Dialog component. It is useful when there are more than one primary action that can be performed in a page.\n  The Speed dial looks like a `<ons-fab>` element but will expand a menu when tapped.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the component.'
      },
      {
        'id': 'position',
        'description': 'Specify the vertical and horizontal position of the component.\n  I.e. to display it in the top right corner specify "right top".\n  Choose from "right", "left", "top" and "bottom".\n'
      },
      {
        'id': 'direction',
        'description': 'Specify the direction the items are displayed. Possible values are "up", "down", "left" and "right".'
      },
      {
        'id': 'disabled',
        'description': 'Specify if button should be disabled.'
      }
    ]
  },
  'ons-splitter-content': {
    'description': 'The `<ons-splitter-content>` element is used as a child element of `<ons-splitter>`.\n  It contains the main content of the page while `<ons-splitter-side>` contains the list.\n',
    'attributes': [
      {
        'id': 'page',
        'description': 'The url of the content page. If this attribute is used the content will be loaded from a `<ons-template>` tag or a remote file.\n  It is also possible to put `<ons-page>` element as a child of the element.\n'
      }
    ]
  },
  'ons-splitter-side': {
    'description': "The `<ons-splitter-side>` element is used as a child element of `<ons-splitter>`.\n  It will be displayed on either the left or right side of the `<ons-splitter-content>` element.\n  It supports two modes: collapsed and split. When it's in collapsed mode it will be hidden from view and can be displayed when the user swipes the screen or taps a button. In split mode the element is always shown. It can be configured to automatically switch between the two modes depending on the screen size.\n",
    'attributes': [
      {
        'id': 'animation',
        'description': 'Specify the animation. Use one of `overlay`, `push`, `reveal` or  `default`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'open-threshold',
        'description': 'Specify how much the menu needs to be swiped before opening. A value between `0` and `1`.'
      },
      {
        'id': 'collapse',
        'description': 'Specify the collapse behavior. Valid values are `"portrait"`, `"landscape"` or a media query.\n  The strings `"portrait"` and `"landscape"` means the view will collapse when device is in landscape or portrait orientation.\n  If the value is a media query, the view will collapse when the media query resolves to `true`.\n  If the value is not defined, the view always be in `"collapse"` mode.\n'
      },
      {
        'id': 'swipe-target-width',
        'description': 'The width of swipeable area calculated from the edge (in pixels). Use this to enable swipe only when the finger touch on the screen edge.'
      },
      {
        'id': 'width',
        'description': 'Can be specified in either pixels or as a percentage, e.g. `90%` or `200px`.'
      },
      {
        'id': 'side',
        'description': 'Specify which side of the screen the `<ons-splitter-side>` element is located. Possible values are `"left"` and `"right"`.'
      },
      {
        'id': 'mode',
        'description': 'Current mode. Possible values are `"collapse"` or `"split"`. This attribute is read only.'
      },
      {
        'id': 'page',
        'description': 'The URL of the menu page.'
      },
      {
        'id': 'swipeable',
        'description': 'Whether to enable swipe interaction on collapse mode.'
      }
    ]
  },
  'ons-splitter': {
    'description': 'A component that enables responsive layout by implementing both a two-column layout and a sliding menu layout.\n  It can be configured to automatically expand into a column layout on large screens and collapse the menu on smaller screens. When the menu is collapsed the user can open it by swiping.\n',
    'attributes': []
  },
  'ons-switch': {
    'description': 'Switch component. The switch can be toggled both by dragging and tapping.\n  Will automatically displays a Material Design switch on Android devices.\n',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the switch.'
      },
      {
        'id': 'disabled',
        'description': 'Whether the switch is be disabled.'
      },
      {
        'id': 'checked',
        'description': 'Whether the switch is checked.'
      },
      {
        'id': 'input-id',
        'description': 'Specify the `id` attribute of the inner `<input>` element. This is useful when using `<label for="...">` elements.'
      }
    ]
  },
  'ons-tab': {
    'description': 'Represents a tab inside tab bar. Each `<ons-tab>` represents a page.',
    'attributes': [
      {
        'id': 'page',
        'description': 'The page that is displayed when the tab is tapped.'
      },
      {
        'id': 'icon',
        'description': 'The icon name for the tab. Can specify the same icon name as `<ons-icon>`.\n'
      },
      {
        'id': 'active-icon',
        'description': 'The name of the icon when the tab is active.'
      },
      {
        'id': 'label',
        'description': 'The label of the tab item.'
      },
      {
        'id': 'badge',
        'description': 'Display a notification badge on top of the tab.'
      },
      {
        'id': 'active',
        'description': 'This attribute should be set to the tab that is active by default.'
      }
    ]
  },
  'ons-tabbar': {
    'description': 'A component to display a tab bar on the bottom of a page. Used with `<ons-tab>` to manage pages using tabs.',
    'attributes': [
      {
        'id': 'animation',
        'description': 'Animation name. Available values are `"none"`, `"slide"` and `"fade"`. Default is `"none"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      },
      {
        'id': 'position',
        'description': "Tabbar's position. Available values are `\"bottom\"` and `\"top\"`. Use `\"auto\"` to choose position depending on platform (iOS bottom, Android top)."
      }
    ]
  },
  'ons-template': {
    'description': 'Define a separate HTML fragment and use as a template.\n  These templates can be loaded as pages in `<ons-navigator>`, `<ons-tabbar>` and `<ons-splitter>`. They can also be used to generate dialogs.\n',
    'attributes': []
  },
  'ons-toast': {
    'description': 'The Toast or Snackbar component is useful for displaying dismissable information or simple actions at (normally) the bottom of the page.\n  This component does not block user input, allowing the app to continue its flow. For simple toasts, consider `ons.notification.toast` instead.\n',
    'attributes': [
      {
        'id': 'animation',
        'description': 'The animation used when showing and hiding the toast. Can be either `"default"`, `"ascend"` (Android), `"lift"` (iOS), `"fall"`, `"fade"` or `"none"`.'
      },
      {
        'id': 'animation-options',
        'description': "Specify the animation's duration, timing and delay with an object literal. E.g. `{duration: 0.2, delay: 1, timing: 'ease-in'}`."
      }
    ]
  },
  'ons-toolbar-button': {
    'description': 'Button component for ons-toolbar and ons-bottom-toolbar.',
    'attributes': [
      {
        'id': 'modifier',
        'description': 'The appearance of the button.'
      },
      {
        'id': 'disabled',
        'description': 'Specify if button should be disabled.'
      }
    ]
  },
  'ons-toolbar': {
    'description': 'Toolbar component that can be used with navigation.\n  Left, center and right container can be specified by class names.\n  This component will automatically displays as a Material Design toolbar when running on Android devices.\n',
    'attributes': [
      {
        'id': 'inline',
        'description': 'Display the toolbar as an inline element.'
      },
      {
        'id': 'modifier',
        'description': 'The appearance of the toolbar.'
      }
    ]
  }
});

;angular.module('monacaIDE').constant('JavaKeywords', {
  'abstract': {},
  'continue': {},
  'for': {},
  'new': {},
  'switch': {},
  'assert': {},
  'default': {},
  'goto': {},
  'package': {},
  'synchronized': {},
  'boolean': {},
  'do': {},
  'if': {},
  'private': {},
  'this': {},
  'break': {},
  'double': {},
  'implements': {},
  'protected': {},
  'throw': {},
  'byte': {},
  'else': {},
  'import': {},
  'public': {},
  'throws': {},
  'case': {},
  'enum': {},
  'instanceof': {},
  'return': {},
  'transient': {},
  'catch': {},
  'extends': {},
  'int': {},
  'short': {},
  'try': {},
  'char': {},
  'final': {},
  'interface': {},
  'static': {},
  'void': {},
  'class': {},
  'finally': {},
  'long': {},
  'strictfp': {},
  'volatile': {},
  'const': {},
  'float': {},
  'native': {},
  'super': {},
  'while': {},
  'true': {},
  'false': {}
});

//# sourceMappingURL=app.ide.js.map