/**
 * Created by leon on 15/11/12.
 */

angular.module("ui.neptune.service.repository", [])
    .provider("nptRepository", function () {
        this.baseURL = "/service";
        this.actionKey = "y9action";
        this._interceptors = [processParams];

        //重新组织参数结构
        function processParams(response) {
            return {
                originResponse: response,
                data: response.data.data,
                cache: response.data.cache,
                cause: response.data.cause,
                code: response.data.code,
                throwable: response.data.throwable
            };
        }

        this.setBaseURL = function (baseURL) {
            if (baseURL) {
                this.baseURL = baseURL;
            }
        };

        this.setActionKey = function (key) {
            if (key) {
                this.actionKey = key;
            }
        };

        this.$get = function ($http, $q, nptCache) {
            var self = this;
            //资源对象
            function Repository() {
                this._params = {};
                this._lastParams = undefined;
                this._header = {};
                this._baseURL = self.baseURL;
                this._action = undefined;
                this._responseInterceptors = [];
                this._requestInterceptors = [];
            }

            Repository.prototype.params = function (key, value) {
                putKeyValue(key, value, this._params);
                return this;
            };

            Repository.prototype.header = function (key, value) {
                putKeyValue(key, value, this._header);
                return this;
            };

            Repository.prototype.setAction = function (action) {
                this._action = action;
                return this;
            };

            Repository.prototype.addResponseInterceptor = function (interceptor) {
                if (angular.isFunction(interceptor)) {
                    this._responseInterceptors.push(interceptor);
                }
                return this;
            };

            Repository.prototype.addRequestInterceptor = function (interceptor) {
                if (angular.isFunction(interceptor)) {
                    this._requestInterceptors.push(interceptor);
                }
                return this;
            };

            Repository.prototype.post = function (params) {
                var runParams = {};
                var selfRepository = this;
                //自上而下合并查询参数
                angular.extend(runParams, self.params || {});
                angular.extend(runParams, this._params || {});
                angular.extend(runParams, params || {});

                var request = {
                    params: runParams || {}
                };

                //pre拦截器
                var deferd = $q.defer();
                var promise = deferd.promise;
                deferd.resolve(request);

                //写入实例请求拦截器
                if (this._requestInterceptors) {
                    angular.forEach(this._requestInterceptors, function (value) {
                        promise = promise.then(value);
                    });
                }

                return promise.then(function (request) {
                    //记录最后一次的查询参数
                    this._lastParams = request.params;
                    return request;
                }).then(function (request) {
                    //执行查询
                    return post(request, selfRepository);
                });
            };

            Repository.prototype.refresh = function () {
                if (this._lastParams) {
                    return post(this._lastParams, this);
                }
            };

            function post(request, scope) {
                var postData = {};
                postData[self.actionKey] = {
                    name: scope._action,
                    params: request.params
                };

                var result = $http.post(scope._baseURL, postData).then(function (response) {
                    //处理逻辑code
                    if (response.data.code === "100") {
                        return response;
                    } else {
                        return $q.reject(response.data.cause);
                    }
                }, function (error) {
                    return error;
                });

                //将全局响应拦截器插入
                angular.forEach(self._interceptors, function (value) {
                    result = result.then(value);
                });

                //写入请求对象
                result = result.then(function (response) {
                    response.request = request;
                    return response;
                });

                //记录Cache
                result = result.then(function (response) {
                    nptCache.useByResponse(response);
                    return response;
                });

                //将实例拦响应截器插入
                angular.forEach((scope._responseInterceptors), function (value) {
                    result = result.then(value);
                });

                return result;
            }

            function putKeyValue(key, value, target) {
                if (!key) {
                    return;
                }

                if (!value) {
                    if (angular.isArray(key)) {
                        angular.forEach(key, function (value) {
                            angular.extend(target, value);
                        });
                    } else {
                        angular.extend(target, key);
                    }
                }

                if (key && value) {
                    angular.extend(target, {key: value});
                }
            }

            function repositoryFactory(action) {
                var repository = new Repository();
                repository.setAction(action);

                return repository;
            }

            return repositoryFactory;
        };
    })
;