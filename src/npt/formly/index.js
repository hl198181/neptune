/*!
 * mars
 * Copyright(c) 2015 huangbinglong
 * MIT Licensed
 */

angular.module("ui.neptune.formly", [
    "ui.neptune.formly.ui-select",
    "ui.neptune.formly.ui-mask",
    "ui.neptune.formly.ui-validation",
    "ui.neptune.formly.wrapper-validation",
    "ui.neptune.formly.select-tree-single",
    "ui.neptune.formly.select-image",
    "ui.neptune.formly.select-file",
    "ui.neptune.formly.messages"]);

angular.module("ui.neptune.formly.ui-select",
    ["ui.neptune.service.resource", 'ui.select', 'ngSanitize',
        'ngAnimate',
        'ngMessages', "angular.filter"]);

angular.module("ui.neptune.formly.ui-mask", ['ui.utils.masks', "ui.mask"]);

angular.module("ui.neptune.formly.ui-validation", []).constant('is', window.is);
angular.module("ui.neptune.formly.ui-mask", ['ui.utils.masks', "ui.mask"]);

angular.module("ui.neptune.formly.wrapper-validation", []);

angular.module("ui.neptune.formly.messages",[]);
