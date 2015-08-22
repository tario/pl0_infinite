window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts, callback) {
    this.callback = callback;
  };

  var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/"];
  DefaultScanner.prototype.scan = function(text) {

    if (separators.indexOf(text) !== -1) {
      this.callback({type: 'sep', value: text});
    } else {
      this.callback({type: 'keyword', value: text});
    }
    this.callback({type: 'EOF'});
  };

  pl0.DefaultScanner = DefaultScanner;


  return pl0;
})();