/**
 * Created by leon on 15/11/9.
 */

angular.module('formlyExample', ['ui.neptune', 'formModule',"ui.neptune.formly.wrapper-validation",
    "ui.neptune.formly.ui-select"])
    .controller("formlyExampleController", function ($scope, formModuleFactory, formlyExampleHelper) {
        var vm = this;

        vm.onSubmit = function onSubmit() {
            if (vm.form.$valid) {
                vm.options.updateInitialValue();
                alert(JSON.stringify(vm.model), null, 2);
            }
        };
        vm.loadingData = formModuleFactory.loadModule("order", "orderid").then(function (module) {
            vm.model = module.model;
            vm.fields = formlyExampleHelper.toFields(module.fields);
            vm.originalFields = angular.copy(vm.fields);
        });
    })
    .run(function (formlyConfig, formlyValidationMessages, $q, formlyExampleConfig, nptResource) {

        formlyConfig.extras.errorExistsAndShouldBeVisibleExpression = 'fc.$touched || form.$submitted';

        formlyExampleConfig.addAsyncValidator("ipAddress",
            {
                expression: function (viewValue, modelValue) {
                    console.log(arguments.length + "...");
                    var deferd = $q.defer();
                    var value = modelValue || viewValue;
                    if (/(\d{1,3}\.){3}\d{1,3}/.test(value)) {
                        deferd.resolve();
                    } else {
                        deferd.reject();
                    }
                    return deferd.promise;
                },
                message: '$viewValue + " is not a valid IP Address"'
            });

        formlyValidationMessages.addStringMessage('required', '这个内容必须填写.');
        formlyValidationMessages.addStringMessage('bizvalidate', '无效的值');

        formlyConfig.setType({
            name: 'ipAddress',
            extends: 'input'
        });

        formlyConfig.setType({
            name: 'choiceAbleInput',
            template: '<div class="input-group"><input ng-model="model[options.key]" readonly="readonly"' +
            'type="text" class="form-control" placeholder="选择用户">' +
            '<span class="input-group-btn">' +
            '<button class="btn btn-default" type="button">选择用户</button></span>' +
            '</div>',
            defaultOptions: {
                ngModelAttrs: {
                    nptChoiceByDialog: {
                        attribute: 'npt-choice-by_dialog'
                    }
                }
            }
        });
    })
    .config(function (nptBizFilterProviderProvider, nptBizValidatorProviderProvider, formlyConfigProvider) {

        nptBizFilterProviderProvider.addConfig('orderFilterSnToName', {
            "bizName": "queryOrderList",
            "bizParams": {"instid": "10000001463017", "userid": "10000001498059"},
            "chains": ['limitTo: 5', 'pick:"ordersn=="+$value', 'pickup:"name"']
        });

        nptBizValidatorProviderProvider.addConfig('ordersnExist', {
            "bizName": "queryOrderList",
            "bizParams": {"userid": "10000001498059", "instid": "10000001463017"},
            "validator": "exist",
            "validExpression": {
                "ordersn": "$value"
            }
        });
    })
    .provider('formlyExampleConfig', function () {
        var config = {
            asyncValidators: {},
            validators: {}
        };
        this.addValidator = function (name, cnf) {
            config.validators[name] = cnf;
        };
        this.addAsyncValidator = function (name, cnf) {
            config.asyncValidators[name] = cnf;
        };
        this.$get = function () {
            return {
                getValidator: function (name) {
                    return config.validators[name];
                },
                getAsyncValidator: function (name) {
                    return config.asyncValidators[name];
                },
                addValidator: function (name, cnf) {
                    config.validators[name] = cnf;
                },
                addAsyncValidator: function (name, cnf) {
                    config.asyncValidators[name] = cnf;
                }
            }
        }
    }).
    factory('formlyExampleHelper', function (formlyExampleConfig) {
        var helper = {};

        helper.toFields = function (fields) {
            // 转换validator
            fields.forEach(function (field) {
                if (field.validators && angular.isString(field.validators)) {
                    field.validators = helper.toValidator(field.validators);
                }
                if (field.asyncValidators && angular.isString(field.asyncValidators)) {
                    field.asyncValidators = helper.toValidator(field.asyncValidators, true);
                }
            });
            return fields;
        };

        helper.toValidator = function (validators, isAsync) {
            validators = angular.isArray(validators) ? validators : [validators];
            var vtors = {};
            angular.forEach(validators, function (vtor) {
                if (isAsync) {
                    vtors[vtor] = formlyExampleConfig.getAsyncValidator(vtor);
                } else {
                    vtors[vtor] = formlyExampleConfig.getValidator(vtor);
                }
            });
            return vtors;
        };
        return helper;
    }).directive('nptChoiceByDialog', function ($parse) {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, elm, attr, ctrl) {
                if (!ctrl) return;
                $(elm).parent().children().find("button").on("click", function () {
                    alert("选择订单");
                    scope.$apply(function () {
                        $parse(attr.ngModel).assign(scope, "10000002322065");
                    });
                });
            }
        };
    });