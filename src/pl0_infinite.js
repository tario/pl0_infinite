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
      [/^\'$/ /*'*/, "ZSTR", {skip: true}],
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
      [/^\'$/ /*'*/, "S", {emit: token("STRING"), forward:1}],
      [/^.$/, "ZSTR"],
      [/^$/, "S", {emit: token("EOF")}]
    ]
  }

  var separators = [".", "=", ",", ";", "=", "<", ">", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD", "WRITELN", "READLN", "WRITE", "INFINITE"];
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

  DefaultParser.prototype.parse = function(_scanner, options) {
    options = options || {};
    var token;
    var currentNode = options.output;

    var lastToken;
    var scanner = {
      nextToken: function() {
        lastToken = _scanner.nextToken();
        return lastToken;
      }
    };

    var wrap = function(node) {
      return {
        child: function(attrName, nodeType, cb) {
          try {
            return node.child(attrName, nodeType, cb);
          } catch(e) {
            if (e.fromOutput || e.expected) throw e;
            // error from output
            throw {fromOutput: e, lastToken: lastToken};
          }
        },
        attr: function(attrName, value) {
          try {
            return node.attr(attrName, value);
          } catch (e) {
            if (e.fromOutput || e.expected) throw e;
            // error from output
            throw {fromOutput: e, lastToken: lastToken};
          }
        }
      }
    };

    var child = function(attrName, nodeType, fcn) {

      var oldNode = currentNode;
      currentNode.child(attrName, nodeType, function(newNode) {
        currentNode = wrap(newNode);
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
      } else if (token.type === "INFINITE") {
        child("statement", "infinite", function() {
          readToken("INFINITE"); readToken("DO");
            readStatement();
        });
      } else if (token.type === "WHILE") {
        child("statement", "while", function() {
          readToken("WHILE"); readCondition(); readToken("DO");
            readStatement();
        });
      } else if (token.type === "READLN") {
        child("statement", "readln", function() {
          readToken("READLN");
          readToken("(");
            currentNode.attr("ident", readToken("IDENT").value); 
          readToken(")");
        });
      } else if (token.type === "WRITELN" || token.type === "WRITE") {
        child("statement", token.type.toLowerCase(), function() {
          readToken(token.type);

          var readExpressionOrString = function() {
            if (token.type === "STRING") {
              var currToken = token;
              readToken("STRING");
              child("expression", "string", function() {
                currentNode.attr("value", currToken.value);
              });
            } else {
              child("expression", "expression", function() {
                readExpression();
              });
            }
          };

          if (token.type === "(") {
            readToken("(");
              repeat(readExpressionOrString, ",");
            readToken(")");
          } else {
            child("expression", "string", function() {
              currentNode.attr("value", "");
            });
          }

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
          var symbol;
          var extraAttr = {};

          cb({
            attr: function(varname_, value) {
              if (varname_ === "value") {
                symbol = context.currentFrame[value];
                if (!symbol) throw "Undeclared indentifier " + value;
              } else {
                extraAttr[varname_] = extraAttr[varname_] || [];
                extraAttr[varname_].push(value);
              }
            }
          });

          if (symbol.type === '_var') {
            ch.child(varname, "offset", function(chch) {
              chch.attr("offset", symbol.offset);
              for (var k in extraAttr) {
                for (var v in extraAttr[k]) {
                  chch.attr(k, v)
                }
              }
            });
          } else if (symbol.type === '_const') {
            ch.child(varname, "number", function(chch) {
              chch.attr("value", symbol.value);
              for (var k in extraAttr) {
                for (var v in extraAttr[k]) {
                  chch.attr(k, v)
                }
              }
            });
          } else {
            throw "Cannot read symbol of type " + symbol.type;
          }

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
        } else if (type === "write" || type === "writeln") { 
          ch.child(varname, "statement-block", function(ch){
            cb(wrapWriteNode(ch, context, type));
            if (type === "writeln") {
              ch.child("statement", "writeln", function(ch_) {
                ch_.attr("string", "");
              });
            }
          });
        } else if (type === "readln") { 
          ch.child(varname, type, function(ch){
            cb(wrapReadLnNode(ch, context));
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

  var wrapWriteNode = function(ch, context, _type) {
    return {
      child: function(varname, type, cb) {
        var wrapStringExpression = function(ch, context) {
          return {
            child: function(varname, type, cb) {
            },
            attr: function(varname, value) {
              if (varname === "value") {
                ch.attr("string", value);
              }
            }
          };
        };

        var wrapExpressionExpression = function(ch, context) {
          return {
            child: function(varname, type, cb) {
              ch.child(varname, type, cb);
            },
            attr: function(varname, value) {

            }
          };
        };

        if (varname === "expression") {
          if (type === "string") {
            ch.child("statement", "write", function(ch_) {
              cb(wrapStringExpression(ch_, context));
            });
          } else if (type === "expression") {
            ch.child("statement", "write", function(ch_) {
              ch_.child("expression", "expression", function(ch__) {
                cb(wrapNode(ch__, context));
              });
            });
          }
        }
      },
      attr: function(varname, value) {
      }
    };
  };

  var wrapReadLnNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "ident") {
          var symbol = context.currentFrame[value];
          if (!symbol) throw "Undeclared indentifier " + value;
          if (symbol.type != "_var") throw "Bad l-value: " + symbol.type;
          ch.attr("offset", symbol.offset);
          return;
        }
        ch.attr(varname, value);
      }
    };
  };

  var wrapLasgnNode = function(ch, context) {
    return {
      child: childProcessor(ch, context),
      attr: function(varname, value) {
        if (varname === "ident") {
          var symbol = context.currentFrame[value];
          if (!symbol) throw "Undeclared indentifier " + value;
          if (symbol.type != "_var") throw "Bad l-value: " + symbol.type;
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
          if (!symbol) throw "Undeclared indentifier " + value;
          if (symbol.type != "proc") throw "Cannot call symbol of type " + symbol.type;

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
          if (context.currentFrame.hasOwnProperty(value)) throw "Duplicated declaration: procedure " + value;
          context.currentFrame[value] = {type: "proc", number: currentNumber};
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
          if (context.currentFrame.hasOwnProperty(value)) throw "Duplicated declaration: variable " + value;
          context.currentFrame[value] = {type: "_var", offset: context.nextOffset};
          context.nextOffset++;
          return;
        }
        if (varname === "_const") {
          if (context.currentFrame.hasOwnProperty(value[0])) throw "Duplicated declaration: const " + value;
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

  pl0.transpile = function(ast) {
    var body = "";
    var prologue = "";

    var variables = 0;

    var compareOperators = {
      "=": "===",
      "<": "<",
      ">": ">",
      "<=": "<=",
      "=<": "<=",
      ">=": ">=",
      "=>": ">="
    };

    var translateFcn = {
      "lasgn": function(tree) {
        if (tree.offset[0] + 1 > variables) variables = tree.offset [0] + 1;
        return "_v" + tree.offset[0] + " = " + translate(tree.expression[0]) + " ;"
      },
      "expression": function(tree) {
        var code = "( ";
        tree.term.forEach(function(term) {
          if (term.negative && term.negative[0]) {
            code = code + " - ";
          } else {
            code = code + " + ";
          }
          code = code + translate(term);
        });

        code = code + " )";

        return code;
      },
      "product": function(tree) {
        var factor = tree.factor[0];
        var code = "";
        if (factor.divide && factor.divide[0]) {
          code = code + " 1 / ";
        }
        code = code + translate(factor);

        tree.factor.slice(1).forEach(function(factor) {
          if (factor.divide && factor.divide[0]) {
            code = code + " / ";
          } else {
            code = code + " * ";
          }
          code = code + translate(factor);
        });

        return code;
      },
      "number": function(tree) {
        return tree.value[0].toString();
      },
      "offset": function(tree) {
        return "_v" + tree.offset[0];
      },
      "block": function(tree) {
        if (tree.statement) {
          return (tree.procedure||[]).map(translate).join(";\n")+translate(tree.statement[0]);
        } else {
          return "";
        }
      },
      "statement-block": function(tree) {
        return ";\n" + tree.statement.map(translate).join(";\n") + ";\n";
      },
      "procedure": function(tree) {
        return "var _p" + tree.number[0] + " = function() {" + translate(tree.block[0]) + "};\n";
      },
      "compare": function(tree) {
        return translate(tree.expression[0]) + compareOperators[tree.operator[0]] + translate(tree.expression[1]);
      },
      "odd": function(tree) {
        return translate(tree.expression[0]) + " % 2 === 1"
      },
      "if": function(tree) {
        return "if("+ translate(tree.condition[0]) + ") {" + translate(tree.statement[0]) + "}";
      },
      "write": function(tree) {
        return ";_write("+ (tree.expression ? translate(tree.expression[0]) : JSON.stringify(tree.string))+");";
      },
      "writeln": function(tree) {
        return ";_write(("+ (tree.expression ? translate(tree.expression[0]) : JSON.stringify(tree.string))+")+'\\n');";
      },
      "readln": function(tree) {
        return "_v" + tree.offset[0] + " = _readln();"
      },
      "while": function(tree) {
        return "while("+ translate(tree.condition[0]) + ") {" + translate(tree.statement[0]) + "}";
      },
      "infinite": function(tree) {
        return "while(1) {" + translate(tree.statement[0]) + "}";
      },
      "call": function(tree) {
        return "_p"+tree.number[0]+"()";
      }
    };

    var translate = function(tree) {
      var f = translateFcn[tree.type];
      if (f) {
        return f(tree);
      }
    };

    var translateProgram = function(tree) {
      return translate(tree.block[0]);
    };

    body = translateProgram(ast);

    if (variables > 0) {
      var vars = [];
      for (var i=0; i<variables; i++) {
        vars.push("_v"+i + " = 0");
      }
      prologue = "var " + vars.join(",") + ";\n";
    }
    var code = prologue + body;

    return {
      code: code,
      run: function(stdout, stdin) {
        var self = this;
        var _write = function(value) {
          stdout.write(value);
        };
        var _readln = function() {
          return stdin.read();
        };

        eval(code);
      }
    }
  };

  return pl0;
})();