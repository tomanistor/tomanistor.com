'use strict';

var _netlifyCms = require('netlify-cms');
var _netlifyCms2 = _interopRequireDefault(_netlifyCms);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Registry is available via the CMS object
_netlifyCms2.default.registerPreviewTemplate('cms-template', CmsTemplate);
