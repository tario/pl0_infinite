window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts) {
  };

  var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  var numbers = ["0","1","2","3","4","5","6","7","8","9"];
  DefaultScanner.prototype.scan = function(text) {

    var tokens = [];
    var self = this;
    var emit = function(text) {
      if (text == "") return;
      if (separators.indexOf(text) !== -1) {
        tokens.push({type: 'sep', value: text});
      } else if (keywords.indexOf(text) !== -1) {
        tokens.push({type: 'keyword', value: text});
      } else if (numbers.indexOf(text.slice(0,1)) != -1) {
        tokens.push({type: 'number', value: text});
      } else {
        tokens.push({type: 'ident', value: text});
      }
    }

    text.split(/[ \x09\n]/).forEach(emit);
    tokens.push({type: 'EOF'});

    var currentToken = 0;
    var nextToken = function() {
      currentToken++;
      return tokens[currentToken-1];
    };
    return {
      nextToken: nextToken
    };

  };

  pl0.DefaultScanner = DefaultScanner;

  return pl0;
})();