const util = require("util");
if (!util.styleText) {
  util.styleText = function(style, text) {
    return text || style;
  };
}
