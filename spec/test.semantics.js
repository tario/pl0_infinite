describe("Semantic", function() {

  var replay = function(tree, output) {
    for (var k in tree) {
      var val = tree[k];
      if (k !== "type" && val.length > 0) {
        if (val[0].type) {
          val.forEach(function(elem) {
            output.child(k, elem.type, function(ch) {
              replay(elem, ch);
            });
          });
        } else {
          val.forEach(function(elem) {
            output.attr(k, elem);
          });
        }
      }
    }
  };

  var testAnalyzer = function(inputTree, outputTree) {
    describe("when input tree is " + JSON.stringify(inputTree), function() {
      beforeEach(function() {
        this.builder = new PL0Infinite.ASTBuilder();
        this.analyzer = new PL0Infinite.SemanticAnalyzer({output: this.builder});

        replay(inputTree, this.analyzer);
      })

      it("should result on tree " + JSON.stringify(outputTree), function() {
        var result = this.builder.result;
        try {
          chai.expect(result).to.deep.equal(outputTree);
        } catch (e) {
          console.log(JSON.stringify(result, null, 4));
          console.log(JSON.stringify(outputTree, null, 4));
          throw e;
        }
      })
    })
  };

  var testInvariant = function(tree) {
    testAnalyzer(tree, tree);
  };

  var testVariant = function(fcn) {
    testAnalyzer(fcn(0), fcn(1));
  };

  testInvariant({type: "program", block: [{type: "block"}]});
  testInvariant({
    type: "program",
    block: [{
      type: "block",
      statement: [{
        type: "if",
        condition: [{
          type: "odd",
          expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [4]}] }] }]
        }],
        statement: [{
          type: "statement-block"
        }]
      }]
    }]
  });

  var _replace = function(tree1, tree2) {
    return function(version) {
      if (version === 0) return tree1;
      return tree2;
    };
  };

  testVariant(function(version) {
    var removeConst = _replace({
        type: "block",
        _const: [["a", 4]]
      }, { 
        type: "block"
      });

    return {
      type: "program", 
      block: [removeConst(version)]
    };
  });

  var first = function(x){ return x[0];};

  var testConst = function(consts) {
    describe("when constants " + consts.map(first).join(","), function() {

      consts.forEach(function(keyvalue) {
        var constName = keyvalue[0];
        var value = keyvalue[1];

        testVariant(function(version) {
          var replaceConst = _replace({
              type: "block",
              _const: consts,
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [constName]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            }, { 
              type: "block",
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [value]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceConst(version)]
          };
        });
      });
    });
  };

  var testConstTwoLevels = function(consts1, consts2, testValues1, testValues2) {
    describe("when constants " + consts1.map(first).join(",") + " and " + consts2.map(first).join(","), function() {
      Object.keys(testValues2).forEach(function(testValue) {
        var constName = testValue;
        var value = testValues2[testValue];

        testVariant(function(version) {
          var replaceConst = _replace({
              type: "block",
              _const: consts1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _const: consts2,
                  statement: [{
                    type: "if",
                    condition: [{
                      type: "odd",
                      expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [constName]}] }] }]
                    }],
                    statement: [{
                      type: "statement-block"
                    }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "if",
                    condition: [{
                      type: "odd",
                      expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [value]}] }] }]
                    }],
                    statement: [{
                      type: "statement-block"
                    }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            });
          
          return {
            type: "program", 
            block: [replaceConst(version)]
          };
        });
      });

      Object.keys(testValues1).forEach(function(testValue) {
        var constName = testValue;
        var value = testValues1[testValue];

        testVariant(function(version) {
          var replaceConst = _replace({
              type: "block",
              _const: consts1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _const: consts2,
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [constName]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [value]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceConst(version)]
          };
        });
      });
 


    });
  };

  var testVars = function(vars) {
    describe("when vars " + vars.join(","), function() {
      vars.forEach(function(varname, offset) {
        testVariant(function(version) {
          var replaceVars = _replace({
              type: "block",
              _var: vars,
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [varname]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            }, { 
              type: "block",
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"offset", offset: [offset]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVars(version)]
          };
        });
      });
    });
  };

  var testVarsTwoLevels = function(vars1, vars2, testValues1, testValues2) {
    describe("when vars " + vars1.join(",") + " and " + vars2.join(","), function() {
      Object.keys(testValues2).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues2[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              _var: vars1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _var: vars2,
                  statement: [{
                    type: "if",
                    condition: [{
                      type: "odd",
                      expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [varName]}] }] }]
                    }],
                    statement: [{
                      type: "statement-block"
                    }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "if",
                    condition: [{
                      type: "odd",
                      expression: [{type: "expression", term: [{type: "product", factor: [{type:"offset", offset: [value]}] }] }]
                    }],
                    statement: [{
                      type: "statement-block"
                    }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });

      Object.keys(testValues1).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues1[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              _var: vars1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _var: vars2,
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"ident", value: [varName]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "if",
                condition: [{
                  type: "odd",
                  expression: [{type: "expression", term: [{type: "product", factor: [{type:"offset", offset: [value]}] }] }]
                }],
                statement: [{
                  type: "statement-block"
                }]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });
 


    });
  };


  var testVarsTwoLevelsLasgn = function(vars1, vars2, testValues1, testValues2) {
    describe("when vars " + vars1.join(",") + " and " + vars2.join(","), function() {
      Object.keys(testValues2).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues2[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              _var: vars1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _var: vars2,
                  statement: [{
                    type: "lasgn",
                    ident: [varName],
                    expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [4]}] }] }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "lasgn",
                    offset: [value],
                    expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [4]}] }] }]
                  }]
                }]
              }],
              statement: [{
                type: "statement-block"
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });

      Object.keys(testValues1).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues1[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              _var: vars1,
              procedure: [{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  _var: vars2,
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "lasgn",
                ident: [varName],
                expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [4]}] }] }]
              }]
            }, { 
              type: "block",
              procedure: [{
                type: "procedure",
                number: [0],
                block: [{
                  type: "block",
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }],
              statement: [{
                type: "lasgn",
                offset: [value],
                expression: [{type: "expression", term: [{type: "product", factor: [{type:"number", value: [4]}] }] }]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });
 


    });
  };


  var testProcedureTwoLevels = function(vars1, vars2, testValues1, testValues2) {

    var makeProcedure = function(name) {
      return {
        type: "procedure",
        name: [name],
        block: [{
          type: "block",
          statement: [{
            type: "statement-block"
          }]
        }]
      };
    };

    var makeProcedureWithIndex = function(array) {
      return function(name) {
        return {
          type: "procedure",
          number: [array[name]],
          block: [{
            type: "block",
            statement: [{
              type: "statement-block"
            }]
          }]
        };
      };
    };

    describe("when procedure " + vars1.join(",") + " and " + vars2.join(","), function() {
      Object.keys(testValues2).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues2[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              procedure: vars1.map(makeProcedure).concat([{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  procedure: vars2.map(makeProcedure),
                  statement: [{
                    type: "call",
                    ident: [varName]
                  }]
                }]
              }]),
              statement: [{
                type: "statement-block"
              }]
            }, { 
              type: "block",
              procedure:  vars1.map(makeProcedureWithIndex(testValues1)).concat([{
                type: "procedure",
                number: [vars1.length],
                block: [{
                  type: "block",
                  procedure: vars2.map(makeProcedureWithIndex(testValues2)),
                  statement: [{
                    type: "call",
                    number: [value]
                  }]
                }]
              }]),
              statement: [{
                type: "statement-block"
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });

      Object.keys(testValues1).forEach(function(testValue) {
        var varName = testValue;
        var value = testValues1[testValue];

        testVariant(function(version) {
          var replaceVar = _replace({
              type: "block",
              procedure: vars1.map(makeProcedure).concat([{
                type: "procedure",
                name: ["x"],
                block: [{
                  type: "block",
                  procedure: vars2.map(makeProcedure),
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }]),
              statement: [{
                type: "call",
                ident: [varName]
              }]
            }, { 
              type: "block",
              procedure: vars1.map(makeProcedureWithIndex(testValues1)).concat([{
                type: "procedure",
                number: [vars1.length],
                block: [{
                  type: "block",
                  procedure: vars2.map(makeProcedureWithIndex(testValues2)),
                  statement: [{
                    type: "statement-block"
                  }]
                }]
              }]),
              statement: [{
                type: "call",
                number: [value]
              }]
            });
          
          return {
            type: "program", 
            block: [replaceVar(version)]
          };
        });
      });

    });
  };



  testConst([["a", 4]]);
  testConst([["a", 5]]);
  testConst([["a", 6], ["b", 7]]);

  testConstTwoLevels([["a", 4], ["b", 7]], [["a", 5]], {a: 4, b: 7}, {a: 5, b: 7});

  testVars(["a"]);
  testVars(["a", "b"]);
  testVars(["a", "b", "c"]);

  testVarsTwoLevels(["a"], ["a", "b"], {a: 0}, {a: 1, b: 2});
  testVarsTwoLevelsLasgn(["a"], ["a", "b"], {a: 0}, {a: 1, b: 2});


  testProcedureTwoLevels(["a"], ["a", "b"], {a: 0}, {a: 2, b: 3});
  testProcedureTwoLevels(["a", "b"], ["a"], {a: 0, b: 1}, {a: 3, b: 1});

});

