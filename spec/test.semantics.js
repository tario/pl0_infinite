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

  var testConst = function(constName, value) {
    testVariant(function(version) {
      var replaceConst = _replace({
          type: "block",
          _const: [[constName, value]],
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
  };

  testConst("a", 4);
  testConst("a", 5);

});

