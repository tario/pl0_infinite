window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts) {
  };

  var token = function(type) {
    return function(str) {
      return {type: type, value: str};
    };
  };

  var tokenSelf = function(type) {
    return {type: type, value: type};
  };

  var graph = {
    S: [
      [/^[a-zA-Z]$/, "Z1"],
      [/^[0-9]$/, "Z2"],
      [/^=$/, "Z4"],
      [/^<$/, "Z3"],
      [/^:$/, "Z6"],
      [/^[.,;<>+\-*\/\(\)]$/, "Z5"],
      [/^\"$/ /*"*/, "ZSTR", {skip: true}],
      [/^$/, "S", {emit: token("EOF")}]
    ],
    Z1: [
      [/^[a-zA-Z0-9]$/, "Z1"],
      [/^.?$/, "S", {emit: function(token) {
          if (keywords.indexOf(token) !== -1) {
            return {type: token, value: token};
          } else {
            return {type: 'ident', value: token};
          }
      }}]
    ],
    Z2: [
      [/^[0-9]$/, "Z2"],
      [/^.?$/, "S", {emit: token("number")}]
    ],
    Z3: [
      [/^>$/, "Z3"],
      [/^=$/, "Z3"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z4: [
      [/^>$/, "Z4"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z5: [
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z6: [
      [/^=$/, "Z6"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    ZSTR: [
      [/^\"$/ /*"*/, "S", {emit: token("string"), forward:1}],
      [/^.$/, "ZSTR"],
      [/^$/, "S", {emit: token("EOF")}]
    ]
  }

  var separators = [".", "=", ",", ";", "=", "<", ">", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  DefaultScanner.prototype.scan = function(text) {

    var currentIndex = 0;
    var currentState = "S";
    var acc = "";
    var nextToken = function() {
      while(1) {
        var character = text[currentIndex];
        currentIndex++;

        var edges = graph[currentState];
        for (var i = 0; i < edges.length;i++) {
          var edge = edges[i];
          if ((character||"").replace("\n"," ").match(edge[0])) {
            currentState = edge[1];
            if (edge[2] && edge[2].emit) {
              var token = acc;
              acc = "";
              currentIndex--;
              if (edge[2].forward) {
                currentIndex+=edge[2].forward;
              }
              return edge[2].emit(token);
            } else {
              if (!edge[2] || !edge[2].skip) {
                acc = acc + character;
              }
            }

            break;
          }
        };
      }

    };

    return {
      nextToken: nextToken
    };
  };

  pl0.DefaultScanner = DefaultScanner;

  var DefaultParser = function(opts)  {

  };

  DefaultParser.prototype.parse = function(scanner) {
    var token;
    var readToken = function(type) {
        if (token.type !== type) throw "Expected " + type + " found " + token.type;
        token = scanner.nextToken();
    }

    var repeat = function(fcn, separator) {
        var separators = Array.isArray(separator) ? separator : [separator];

        while(1) {
          fcn();
          if (separators.indexOf(token.type)!==-1) {
            readToken(token.type);
          } else {
            break;
          }
        }
    };

    var readOneOf = function(array, tokenName) {
      if (array.indexOf(token.type) === -1) {
        throw "Expected " + tokenName + " found " + token.type;
      }
      token = scanner.nextToken();
    };

    var readFactor = function() {
      if (token.type === "(") {
        readToken("(");
          readExpression();
        readToken(")");
      } else if (token.type === "IDENT") {
        readToken("IDENT");
      } else if (token.type === "NUMBER") {
        readToken("NUMBER");
      } else {
        throw "expected IDENT, NUMBER or (. found " + token.type;
      }
    }

    var readTerm = function() {
      repeat(readFactor, ["*", "/"]);
    }

    var readExpression = function() {
      if (token.type === "+" || token.type === "-") {
        readToken(token.type);
      }
      repeat(readTerm, ["+", "-"]);
    }

    var readCondition = function() {
      if (token.type ===  "ODD") {
        readToken("ODD");
        readToken("NUMBER");
      } else {
        readExpression();
        readOneOf(["=","<>","<","<=",">",">="], "comparator");
        readExpression();
      }
    };

    var readStatement = function() {
      if (token.type === "BEGIN") {
        readToken("BEGIN"); 
          repeat(readStatement, ";");
        readToken("END");
      } else if (token.type === "IDENT") {
        readToken("IDENT"); readToken(":="); readToken("IDENT");
      } else if (token.type === "CALL") {
        readToken("CALL"); readToken("IDENT");
      } else if (token.type === "IF") {
        readToken("IF"); readCondition(); readToken("THEN");
          readStatement();
        readToken("END");
      } else if (token.type === "WHILE") {
        readToken("WHILE"); readCondition(); readToken("DO");
          readStatement();
        readToken("END");
      }
   };

    var token;
    token = scanner.nextToken();
    var readBlock = function() {
      if (token.type === "CONST") {
        readToken("CONST");
        repeat(function() {
          readToken("IDENT");
          readToken("=");
          readToken("NUMBER");
        }, ",")
        readToken(";");
      }

      if (token.type === "VAR") {
        readToken("VAR");
        repeat(function() {
          readToken("IDENT");
        }, ",")
        readToken(";");
      }

      if (token.type === "PROCEDURE") {
        readToken("PROCEDURE");
        readToken("IDENT");
        readToken(";");
        readBlock();
        readToken(";");
      }

      readStatement();
    }
    
    readBlock();
    readToken(".");
    readToken("EOF");

  };

  pl0.DefaultParser = DefaultParser;

  return pl0;
})();