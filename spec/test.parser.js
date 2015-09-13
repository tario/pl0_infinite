describe("Parser", function() {
  beforeEach(function() {
    this.parser = new PL0Infinite.DefaultParser({});
  });

  it ("should have parse function", function(){
    expect(typeof this.parser.parse).to.be("function");
  });

  var convertNotation = function(str) {
    if (str.type) return str;

    return {
      type: str.split("/")[0],
      value: str.split("/")[1]
    }
  };

  var concatSubArrays = function(a, b) {
    if (!Array.isArray(a)) a=[a];
    if (!Array.isArray(b)) b=[b];

    return a.concat(b);
  };

  var testParse = function(_tokens, valid) {
    var tokens = _tokens.reduce(concatSubArrays).map(convertNotation);

    describe("when parse " + JSON.stringify(_tokens), function() {
      beforeEach(function() {
        var x = -1;
        var nextToken = function() {
          x++;
          return tokens[x];
        };
        this.scanner = {
          nextToken: nextToken
        };
      });

      var parse = function() {
        return this.parser.parse(this.scanner);
      };

      if (valid) {
        it("should be valid", function() {
          chai.expect(parse.bind(this)).to.not.throw();
        });
      } else {
        it("should not be valid", function() {
          chai.expect(parse.bind(this)).to.throw();
        });
      }
    });
  };

  var validStatements = [
    ["IDENT/a", ":=", "IDENT/b"],
    ["BEGIN", "END"],
    ["CALL", "IDENT/a"],
    ["IF", "ODD", "NUMBER/4", "THEN", "IDENT/a", ":=", "IDENT/b", "END"]
  ];

  testParse([".", "EOF"], true); // es un programa valido
  testParse(["CONST", ".", "EOF"], false); // no es un programa valido

  testParse(["IDENT/a", ":=", "IDENT/b", ".", "EOF"], true); // es un programa valido
  testParse(["IDENT/a", ":=", ".", "EOF"], false); // no es un programa valido

  testParse(["BEGIN", "END", ".", "EOF"], true); // es un programa valido
  testParse(["BEGIN", "END", "END", ".", "EOF"], false); // no es un programa valido
  testParse(["BEGIN", ".", "EOF"], false); // no es un programa valido

  validStatements.forEach(function(statement) {
    testParse(["BEGIN", statement, "END", ".", "EOF"], true); // es un programa valido
    validStatements.forEach(function(statement2) {
      testParse(["BEGIN", statement, ";", statement2, "END", ".", "EOF"], true); // es un programa valido
    });
  });

  testParse(["IDENT/a", ":=", "IDENT/b", "EOF"], false); // NO es un programa valido porque le falta .

  testParse(["CALL", "IDENT/a", ".", "EOF"], true); // es un programa valido
  testParse(["CALL", "NUMBER/4", ".", "EOF"], false); // NO un programa valido
  testParse(["CALL", ".", "EOF"], false); // NO un programa valido

  testParse(["IF", "ODD", "NUMBER/4", "THEN", "IDENT/a", ":=", "IDENT/b", "END", ".", "EOF"], true);

  var conditions = [
    ["ODD", "NUMBER/4"],
    ["NUMBER/4", ">", "NUMBER/3"],
    ["IDENT/Z", "=", "NUMBER/10"]
  ];

  validStatements.forEach(function(statement) {
    conditions.forEach(function(condition) {
      testParse(["IF", condition, "THEN", statement, "END", ".", "EOF"], true);
      testParse(["WHILE", condition, "DO", statement, "END", ".", "EOF"], true);
    });
  });

});

