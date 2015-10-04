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
      [/^>$/, "Z3"],
      [/^:$/, "Z6"],
      [/^[.,;<>+\-*\/\(\)]$/, "Z5"],
      [/^\"$/ /*"*/, "ZSTR", {skip: true}],
      [/^$/, "S", {emit: token("EOF")}]
    ],
    Z1: [
      [/^[a-zA-Z0-9]$/, "Z1"],
      [/^.?$/, "S", {emit: function(token) {
          if (keywords.indexOf(token.toUpperCase()) !== -1) {
            return {type: token.toUpperCase(), value: token};
          } else {
            return {type: 'IDENT', value: token};
          }
      }}]
    ],
    Z2: [
      [/^[0-9]$/, "Z2"],
      [/^.?$/, "S", {emit: token("NUMBER")}]
    ],
    Z3: [
      [/^>$/, "Z3"],
      [/^=$/, "Z3"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z4: [
      [/^>$/, "Z4"],
      [/^<$/, "Z4"],
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
      [/^\"$/ /*"*/, "S", {emit: token("STRING"), forward:1}],
      [/^.$/, "ZSTR"],
      [/^$/, "S", {emit: token("EOF")}]
    ]
  }

  var separators = [".", "=", ",", ";", "=", "<", ">", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  DefaultScanner.prototype.scan = function(text) {

    var currentIndex = 0;
    var currentState = "S";
    var currentLine = 1;
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
              var ret = edge[2].emit(token);
              ret.line = currentLine;
              return ret;
            } else {
              if (!edge[2] || !edge[2].skip) {
                acc = acc + character;
              }
            }

            break;
          }
        };

        if (character === "\n") currentLine++;
      }

    };

    return {
      nextToken: nextToken
    };
  };

  pl0.DefaultScanner = DefaultScanner;

  var DefaultParser = function(opts)  {

  };

  DefaultParser.prototype.parse = function(scanner, options) {
    options = options || {};
    var token;
    var currentNode = options.output;

    var child = function(attrName, nodeType, fcn) {

      var oldNode = currentNode;
      currentNode.child(attrName, nodeType, function(newNode) {
        currentNode = newNode;
        fcn(newNode);
        currentNode = oldNode;
      });
    };

    var readToken = function(type) {
        var currToken = token;
        if (token.type !== type) throw {expected: [type], found: token};
        token = scanner.nextToken();
        return currToken;
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
        throw {expected: [tokenName], found: token};
      }
      token = scanner.nextToken();
    };

    var readFactor = function() {
      if (token.type === "(") {
        readToken("(");
          child("factor", "expression", function() {
            readExpression();
          });
        readToken(")");
      } else if (token.type === "IDENT") {
        child("factor", "ident", function() {
          currentNode.attr("value", readToken("IDENT").value);
        });
      } else if (token.type === "NUMBER") {
        child("factor", "number", function() {
          currentNode.attr("value", parseInt(readToken("NUMBER").value));
        });
      } else {
        throw {expected: ["IDENT", "NUMBER", "("], found: token};
      }
    }

    var readTerm = function() {
      child("term", "product", function() {
        repeat(readFactor, ["*", "/"]);
      });
    }

    var readExpression = function() {
      if (token.type === "+" || token.type === "-") {
        readToken(token.type);
      }
      repeat(readTerm, ["+", "-"]);
    }

    var readCondition = function() {
      if (token.type ===  "ODD") {
        child("condition", "odd", function() {
          readToken("ODD");
          child("expression", "expression", function() {
            readExpression();
          });
        });
      } else {
        readExpression();
        readOneOf(["=","<>","<","<=",">",">=", "=<", "=>"], "comparator");
        readExpression();
      }
    };

    var readStatement = function() {
      if (token.type === "BEGIN") {
        child("statement", "statement-block", function() {
          readToken("BEGIN"); 
            repeat(readStatement, ";");
          readToken("END");
        });
      } else if (token.type === "IDENT") {

        child("statement", "lasgn", function() {
          currentNode.attr("ident", readToken("IDENT").value); 
          readToken(":="); 
          child("expression", "expression", function() {
            readExpression();
          });
        });

      } else if (token.type === "CALL") {
        child("statement", "call", function() {
          readToken("CALL"); currentNode.attr("ident", readToken("IDENT").value);
        });
      } else if (token.type === "IF") {
        child("statement", "if", function() {
          readToken("IF"); readCondition(); readToken("THEN");
            readStatement();
        });
      } else if (token.type === "WHILE") {
        child("statement", "while", function() {
          readToken("WHILE"); readCondition(); readToken("DO");
            readStatement();
        });
      }
   };

    var token;
    token = scanner.nextToken();
    var readBlock = function() {
      child("block", "block", function() {
        if (token.type === "CONST") {
          readToken("CONST");
          repeat(function() {
            var id = readToken("IDENT");
            readToken("=");
            var num = readToken("NUMBER");

            currentNode.attr("_const", [id.value, parseInt(num.value)])
          }, ",")
          readToken(";");
        }

        if (token.type === "VAR") {
          readToken("VAR");
          repeat(function() {
            var id = readToken("IDENT");
            currentNode.attr("_var", id.value)
          }, ",")
          readToken(";");
        }

        while(1) {
          if (token.type === "PROCEDURE") {

            child("procedure", "procedure", function() {
              readToken("PROCEDURE");
              currentNode.attr("name", readToken("IDENT").value);
              readToken(";");
              readBlock();
              readToken(";");
            });
          } else {
            break;
          }
        };

        readStatement();
      });
    }
    
    readBlock();
    readToken(".");
    readToken("EOF");

  };

  pl0.DefaultParser = DefaultParser;

  var NodeBuilder = function(node) {
    return {
      attr: function(keyName, obj) {
        node[keyName] = node[keyName] ||[];
        node[keyName].push(obj);
      },
      child: function(keyName, typeName, cb) {
        node[keyName] = node[keyName] ||[];
        var child = {type: typeName};
        if (cb) cb(NodeBuilder(child));
        node[keyName].push(child);
      }
    };
  };

  var ASTBuilder = function() {
    this.result = {type: "program"};
    var mainBuilder = NodeBuilder(this.result);
    this.attr = mainBuilder.attr.bind(mainBuilder);
    this.child = mainBuilder.child.bind(mainBuilder);
  };

  pl0.ASTBuilder = ASTBuilder;

  return pl0;
})();