window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts, callback) {
    this.callback = callback;
  };

  var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  var numbers = ["0","1","2","3","4","5","6","7","8","9"];
  DefaultScanner.prototype.scan = function(text) {

    if (separators.indexOf(text) !== -1) {
      this.callback({type: 'sep', value: text});
    } else if (keywords.indexOf(text) !== -1) {
      this.callback({type: 'keyword', value: text});
    } else if (numbers.indexOf(text.slice(0,1)) != -1) {
      this.callback({type: 'number', value: text});
    } else {
      this.callback({type: 'ident', value: text});
    }
    this.callback({type: 'EOF'});
  };

  pl0.DefaultScanner = DefaultScanner;


  return pl0;
})();