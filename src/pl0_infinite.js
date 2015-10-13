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

    var repeat = function(fcn, separator, options) {
        options = options || {};
        var separators = Array.isArray(separator) ? separator : [separator];
        var lastSeparator;

        if (options.start) {
          if (separators.indexOf(token.type)!==-1) {
            lastSeparator = token.type;
            readToken(token.type);
          }
        }

        while(1) {
          fcn(lastSeparator);
          if (separators.indexOf(token.type)!==-1) {
            lastSeparator = token.type;
            readToken(token.type);
          } else {
            break;
          }
        }
    };

    var readOneOf = function(array, tokenName, cb) {
      if (array.indexOf(token.type) === -1) {
        throw {expected: [tokenName], found: token};
      }
      if (cb) cb(token);
      token = scanner.nextToken();
    };

    var readFactor = function(separator) {
      if (token.type === "(") {
        readToken("(");
          child("factor", "expression", function() {
            readExpression();
            if (separator === "/") currentNode.attr("divide", true);
          });
        readToken(")");
      } else if (token.type === "IDENT") {
        child("factor", "ident", function() {
          currentNode.attr("value", readToken("IDENT").value);
          if (separator === "/") currentNode.attr("divide", true);
        });
      } else if (token.type === "NUMBER") {
        child("factor", "number", function() {
          currentNode.attr("value", parseInt(readToken("NUMBER").value));
          if (separator === "/") currentNode.attr("divide", true);
        });
      } else {
        throw {expected: ["IDENT", "NUMBER", "("], found: token};
      }
    }

    var readTerm = function(separator) {
      child("term", "product", function() {
        if (separator === "-") currentNode.attr("negative", true);
        repeat(readFactor, ["*", "/"]);
      });
    }

    var readExpression = function() {
      repeat(readTerm, ["+", "-"], {start: true});
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
        child("condition", "compare", function() {
          child("expression", "expression", readExpression);
          readOneOf(["=","<>","<","<=",">",">=", "=<", "=>"], "comparator", function(token) {
            currentNode.attr("operator", token.type);
          });
          child("expression", "expression", readExpression);
        });
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

  var SemanticAnalyzer = function(options) {
    this.output = options.output;
    this.context = {currentFrame: {}, nextOffset: 0, nextProcedureNumber: 0};
  };

  var childProcessor = function(ch, context) {
    return function(varname, type, cb) {

        if (type === "ident") {

          cb({
            attr: function(varname_, value) {
              var symbol = context.currentFrame[value];
              if (symbol.type === '_var') {
                ch.child(varname, "offset", function(chch) {
                  chch.attr("offset", symbol.offset);
                });
              } else {
                ch.child(varname, "number", function(chch) {
                  chch.attr("value", symbol.value);
                });
              }
            }
          });
          return;
        }
      
        if (type === "block") {
          ch.child(varname, type, function(ch) {
            var parentFrame = context.currentFrame;
            context.currentFrame = Object.create(parentFrame);
            cb(wrapBlockNode(ch, context));

            context.currentFrame = parentFrame;
          });
        } else if (type === "lasgn") {
          ch.child(varname, type, function(ch) {
            cb(wrapLasgnNode(ch, context));
          });
        } else if (type === "procedure") { 
          ch.child(varname, type, function(ch) {
            cb(wrapProcedureNode(ch, context));
          });
        } else if (type === "call") { 
          ch.child(varname, type, function(ch) {
            cb(wrapCallNode(ch, context));
          });
        } else {
          ch.child(varname, type, function(ch) {
            cb(wrapNode(ch, context));
          });
        }
    };
  };

  var wrapLasgnNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "ident") {
          var symbol = context.currentFrame[value];
          ch.attr("offset", symbol.offset);
          return;
        }
        ch.attr(varname, value);
      }
    };
  };

  var wrapCallNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "ident") {
          var symbol = context.currentFrame[value];
          ch.attr("number", symbol.number);
          return;
        }
        ch.attr(varname, value);
      }
    };
  };  

  var wrapProcedureNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "name") {
          var currentNumber = context.nextProcedureNumber;
          context.currentFrame[value] = {number: currentNumber};
          context.nextProcedureNumber++;
          ch.attr("number", currentNumber);
          return;
        }
        ch.attr(varname, value);
      }
    };
  };

  var wrapBlockNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "_var") {
          context.currentFrame[value] = {type: "_var", offset: context.nextOffset};
          context.nextOffset++;
          return;
        }
        if (varname === "_const") {
          context.currentFrame[value[0]] = {type: "_const", value: value[1]};
          return;
        }
        ch.attr(varname, value);
      }
    };
  };

  var wrapNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        ch.attr(varname, value);
      }
    };
  };

  SemanticAnalyzer.prototype.child = function(variable, type, cb) {
    var self = this;

    this.output.child(variable, type, function(ch) {
      if (type === "block") {
        cb(wrapBlockNode(ch, self.context));
      } else {
        cb(wrapNode(ch, self.context));
      }
    });
  };

  pl0.SemanticAnalyzer = SemanticAnalyzer;

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