/**
 * Created by leon on 15/11/24.
 */

angular.module("ui.neptune.directive.grid",
    ['ui.grid', "ui.grid.pagination", 'ui.grid.resizeColumns',
        'ui.grid.moveColumns', 'ui.grid.autoResize', 'ngRoute',
        'ng-context-menu', 'ui.bootstrap'])
    .provider("nptGridStore", function () {

        this.$get = function () {

            function NptGridStore(name, setting) {
                if (!name) {
                    throw new Error("npt grid store must set name.");
                }
                this._name = name;
                if (setting) {
                    this.setting(setting);
                }
            }

            NptGridStore.prototype.setting = function (setting) {
                this._gridOptions = {
                    paginationPageSizes: [10, 20, 30],
                    paginationPageSize: 10,
                    showGridFooter: true,
                    showColumnFooter: true,
                    //enableSorting: false,
                    enableRowSelection: true,
                    enableSelectAll: false,
                    multiSelect: false,
                    enableFullRowSelection: true,
                    enableGridMenu: true,
                    selectionRowHeaderWidth: 35,
                    rowHeight: 35,
                    rowTemplate: "/template/grid/npt-grid-row.html"
                };
                this._gridOptions = angular.extend({}, this._gridOptions, setting.gridOptions);
                this._action = setting.action;
                this._gridStyle = setting.gridStyle;
                this._mobile = setting.mobile;
            };

            NptGridStore.prototype.gridOptions = function () {
                return this._gridOptions;
            };

            NptGridStore.prototype.action = function () {
                return this._action;
            };

            NptGridStore.prototype.mobile = function () {
                return this._mobile;
            };

            NptGridStore.prototype.getGridStyle = function () {
                return this._gridStyle;
            };

            function nptGridStoreFactory(name, setting) {
                return new NptGridStore(name, setting);
            }

            return nptGridStoreFactory;
        };

    })
    .controller("GridController", function ($scope, i18nService, $q, $injector, $uibModal,MobileGridService) {
        var vm = this;

        //设置中文
        i18nService.setCurrentLang('zh-cn');

        vm.forms = {
            init: function () {
            },
            open: function (formlyStore, data) {
                this.originData = data;

                var result = $uibModal.open({
                    animation: true,
                    templateUrl: '/template/grid/grid-edit.html',
                    controller: 'editGridController',
                    controllerAs: 'vm',
                    resolve: {
                        formData: function ($q) {
                            var deferd = $q.defer();
                            deferd.resolve({
                                model: data,
                                store: formlyStore
                            });
                            return deferd.promise;
                        }
                    }
                }).result;

                return result;
            },
            close: function () {
                $uibModal.close();
            }
        };

        function NptGridApi(nptGridOptions) {
            var self = this;
            this._options = nptGridOptions;
            this._config = {};
            if (nptGridOptions.store) {
                this._config.gridOptions = angular.copy(nptGridOptions.store.gridOptions()) || {};
                this._config.action = angular.copy(nptGridOptions.store.action());
                this._config.gridStyle = angular.copy(nptGridOptions.store.getGridStyle());
                //设置注册Api回调,如果用户在配置中设置会被替换
                this._config.gridOptions.onRegisterApi = function (uiGridApi) {
                    self.uiGridApi = uiGridApi;

                    //如果存在注册Api回调则执行
                    if (self._options.onRegisterApi) {
                        self._options.onRegisterApi(self);
                    }

                    if (angular.isDefined(nptGridOptions.store.gridOptions().autoHeight)) {
                        var maxVisibleRowCount = nptGridOptions.store.gridOptions().maxVisibleRowCount || 10;
                        var minRowsToShow = nptGridOptions.store.gridOptions().minRowsToShow || 1;
                        // 32导航，30底部total+30顶部条+30底部条
                        $scope.$watch("model", function (datas) {
                            datas = datas || [];
                            var row = datas.length;
                            row = row < minRowsToShow?minRowsToShow:row;
                            row = row > maxVisibleRowCount?maxVisibleRowCount:row;
                            $(self.uiGridApi.grid.element).height(
                                (row * nptGridOptions.store.gridOptions().rowHeight) +
                                32 + 30 + 30 + 30
                            );
                        });
                    }
                };

                //添加操作区域
                if (this._config.action) {
                    this._config.gridOptions.columnDefs.push({
                        field: 'actionScope',
                        displayName: "操作",
                        width: 100,
                        cellTemplate: "/template/grid/npt-grid-row-cell.html"
                    });
                }

                //添加序号区域,
                this._config.gridOptions.columnDefs.unshift({
                    name: '$index',
                    displayName: "序号",
                    enableSorting: true,
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope">{{row.grid.appScope.model.indexOf(row.entity)+1}}</div>',
                    width: 60
                });

                // 增加菜单动作
                this.action = {};
                if (this._config.action) {
                    angular.forEach(this._config.action, function (action, key) {
                        self.action[key] = function () {
                            return self.triggerAction(action);
                        };

                        self.action[key].addListener = function (listener) {
                            action.listens = action.listens || [];
                            if (listener) {
                                action.listens.push(listener);
                            }
                        };

                        self.action[key].addPreListener = function (listener) {
                            action.listens = action.listens || [];
                            if (listener) {
                                action.listens.unshift(listener);
                            }
                        };
                    });
                }

                //设置数据
                this._config.gridOptions.data = "model";
            }

            // 定义框架支持的菜单操作
            this._handler = {
                fireListener: function (action, params) {
                    var deferd = $q.defer();
                    var promise = deferd.promise;
                    deferd.resolve(params);
                    var promisesArr = [promise];
                    //配置中的listen
                    angular.forEach(action.listens, function (listen) {
                        promisesArr.push($q.when($injector.invoke(listen, this, {
                            "params": params
                        })));
                    });
                    return $q.all(promisesArr);
                },
                add: function (action, item, index) {
                    var _handlerSelf = this;
                    var result = vm.forms.open(action.target, {});
                    if (result) {
                        result = result.then(function (data) {
                            var params = {
                                action: action,
                                index: index,
                                data: data
                            };

                            _handlerSelf.fireListener(action, params).then(function () {
                                //执行成功,将数据添加到表格
                                $scope.model.unshift(params.data);
                                console.info("添加执行成功.");
                            }, function (error) {
                                console.info("添加执行失败!" + JSON.stringify(error));
                            });

                        }, function (error) {
                            console.info("添加操作取消");
                        });
                        return result;
                    }
                },
                del: function (action, item, index) {
                    var params = {
                        action: action,
                        item: item,
                        index: index
                    };
                    var result = this.fireListener(action, params).then(function () {
                        $scope.model.splice(params.index, 1);
                    }, function (error) {
                        console.info("删除失败!" + error);
                    });

                    return result;
                },
                edit: function (action, item, index) {
                    var _handlerSelf = this;
                    var result = vm.forms.open(action.target, item);
                    if (result) {
                        result.then(function (data) {
                            //重新组织参数
                            var params = {
                                action: action,
                                index: index,
                                data: data,
                                item: angular.copy(item) //防止修改
                            };

                            _handlerSelf.fireListener(action, params).then(function (data) {
                                console.info("编辑操作成功!");
                                //将新数据更新到表格
                                angular.extend(item, params.data);
                            }, function (error) {
                                console.info("编辑操作失败!");
                            });

                        }, function (error) {
                            console.info("编辑操作取消");
                        });
                    }

                    return result;
                },
                none: function (action, item, index) {
                    var params = {
                        action: action,
                        item: angular.copy(item),
                        index: index
                    };
                    this.fireListener(action, params).then(function (data) {
                        console.info("操作成功!", data);
                    }, function (error) {
                        console.info("操作失败!", error);
                    });
                }
            };
        }

        NptGridApi.prototype.gridOptions = function () {
            return this._config.gridOptions;
        };

        NptGridApi.prototype.getActions = function () {
            return this._config.action;
        };
        NptGridApi.prototype.getGridStyle = function () {
            return this._config.gridStyle;
        };

        NptGridApi.prototype.triggerAction = function (action,datas) {
            var selectedData = datas || this.uiGridApi.selection.getSelectedRows();
            var oneData;
            if (selectedData.length > 0) {
                oneData = selectedData[0];
            }
            if (this._handler[action.type]) {
                this._handler[action.type](action, oneData, $scope.model.indexOf(oneData));
            } else {
                this._handler.none(action, selectedData);
            }
        };

        vm.init = function (nptGrid) {
            //创建API
            vm.nptGridApi = new NptGridApi(nptGrid);
            vm.gridOptions = vm.nptGridApi.gridOptions();
            vm.action = vm.nptGridApi.getActions();
            vm.gridStyle = vm.nptGridApi.getGridStyle();
        };

        vm.triggerAction = function (menu,data) {
            if (data) {
                data = angular.isArray(data)?data:[data];
            }
            vm.nptGridApi.triggerAction(menu,data);
        };

        if ($scope.nptGrid) {
            vm.init($scope.nptGrid);
            MobileGridService.service($scope,vm);
        }

    })
    .controller("editGridController", function ($uibModalInstance, formData) {
        var vm = this;
        // function assignment
        vm.ok = ok;
        vm.cancel = cancel;

        // variable assignment
        vm.formData = formData;
        vm.fields = angular.copy(formData.store.getFields());
        vm.options = angular.copy(formData.store.getOptions());
        vm.originalFields = angular.copy(vm.fields);
        vm.model = angular.copy(formData.model);

        // function definition
        function ok() {
            $uibModalInstance.close(vm.model);
        }

        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }
    })
    .service("MobileGridService",function($templateCache,$parse) {
        this.service = function($scope,vm) {
            $scope.mobile = $scope.nptGrid.store.mobile() || {};
            $scope.mobile.templateUrl = $scope.mobile.templateUrl || "/template/grid/npt-grid-mobile-defaultContent.html";
            vm.mobileContent = $templateCache.get($scope.mobile.templateUrl);


            vm.parseField = function(field) {
                return $parse(field)(this.pData);
            };

            vm.mobileClickItem = function($index,pData) {
                // 如果有菜单弹出，则关闭菜单
                if ($("div[id^='nptGridContextMenu_']").hasClass("open")){
                    $("div[id^='nptGridContextMenu_']").removeClass("open");
                    return;
                }
                var menu = vm.action.view || vm.action.edit;
                vm.nptGridApi.triggerAction(menu,[pData]);
            };

        };
    })
    .directive("nptGrid", function () {
        return {
            restrict: "EA",
            controller: "GridController as vm",
            replace: true,
            templateUrl: function (element, attrs) {
                return attrs.templateUrl || function(){
                        if (is.desktop()) {
                            return "/template/grid/npt-grid.html";
                        }
                        return "/template/grid/npt-grid-mobile.html";

                    }();
            },
            scope: {
                nptGrid: "=",
                model: "="
            }
        };
    });