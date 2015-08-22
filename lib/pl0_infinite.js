window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts, callback) {
    this.callback = callback;
  };

  DefaultScanner.prototype.scan = function(text) {
    this.callback({type: 'keyword', value: text});
    this.callback({type: 'EOF'});
  };

  pl0.DefaultScanner = DefaultScanner;


  return pl0;
})();