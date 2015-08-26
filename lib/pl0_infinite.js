window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts) {
  };

  var separators = [".", "=", ",", ";", "=", "<", ">", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  DefaultScanner.prototype.scan = function(text) {
    var isAlphanumeric = function(char) {
      if (!char) return false;
      return /^[a-zA-Z0-9]+$/.test(char);
    }

    var isAlpha = function(char) {
      if (!char) return false;
      return /^[a-zA-Z]+$/.test(char);
    }

    var isNum = function(char) {
      if (!char) return false;
      return /^[0-9]+$/.test(char);
    }

    var currentIndex = 0;
    var acc = "";
    var currentState = "S";

    var nextToken = function() {
      var shouldExit = false;

      while(!shouldExit) {
        var character = text[currentIndex];
        currentIndex++;

        switch(currentState) {
          case "S":
            if (isAlpha(character)) {
              acc = acc + character;
              currentState = "Z1";
              break;
            }

            if (isAlphanumeric(character)) {
              acc = acc + character;
              currentState = "Z2";
              break;
            }

            if (character === "=") {
              acc = acc + character;
              currentState = "Z4";
              break;
            }

            if (character === "<") {
              acc = acc + character;
              currentState = "Z3";
              break;
            }

            if (separators.indexOf(character) !== -1) {
              currentState = "S";
              acc = "";
              return {type: "sep", value: character};
            }     

            if (!character) {
              return {type: 'EOF'};
            }
            break;
          case "Z1":
            if (isAlphanumeric(character)) {
              acc = acc + character;
              currentState = "Z1";
            } else {
              var token = acc;
              currentState = "S";
              acc = "";
              if (keywords.indexOf(token) !== -1) {
                return {type: 'keyword', value: token};
              } else {
                return {type: 'ident', value: token};
              }
            }
            break;
          case "Z2":
            if (isNum(character)) {
              acc = acc + character;
              currentState = "Z2";
            } else {
              var token = acc;
              currentState = "S";
              acc = "";
              return {type: 'number', value: token};
            }
            break;
          case "Z3":
            if (character === '>') {
              acc = acc + character;
              currentState = "Z3";
            } else if (character === '=') {
              acc = acc + character;
              currentState = "Z3";
            } else {
              var token = acc;
              currentState = "S";
              acc = "";
              return {type: 'sep', value: token};
            }
            break;            
          case "Z4":
            if (character === '>') {
              acc = acc + character;
              currentState = "Z4";
            } else {
              var token = acc;
              currentState = "S";
              acc = "";
              return {type: 'sep', value: token};
            }
            break;            
        }

      };
    };

    return {
      nextToken: nextToken
    };

  };

  pl0.DefaultScanner = DefaultScanner;

  return pl0;
})();