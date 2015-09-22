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

    describe("when parse " + _tokens.join(" "), function() {
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

  var validExpressions = [
    ["NUMBER/55"],
    ["IDENT/c"],
    ["IDENT/c","+","IDENT/b"],
    ["NUMBER/888","+","IDENT/b"],
    ["(","NUMBER/888","+","IDENT/b",")","*","NUMBER/2"],
    ["IDENT/Z","*","NUMBER/2"]
  ];

  var validStatements = [
    ["IDENT/a", ":=", "IDENT/b"],
    ["BEGIN", "END"],
    ["CALL", "IDENT/a"],
    ["IF", "ODD", "NUMBER/4", "THEN", "IDENT/a", ":=", "IDENT/b", "END"]
  ];

  validExpressions.forEach(function(validExpression) {
    testParse(["IDENT/a", ":=", validExpression, ".", "EOF"], true); // es un programa valido

  });

  testParse([".", "EOF"], true); // es un programa valido
  testParse(["CONST", ".", "EOF"], false); // no es un programa valido
  testParse(["CONST", "IDENT/a", "=", "NUMBER/4", ";", ".", "EOF"], true); // es un programa valido
  testParse(["CONST", "IDENT/a", "=", "NUMBER/4", ",", "IDENT/z", "=", "NUMBER/14", ";", ".", "EOF"], true); // es un programa valido

  testParse(["VAR", "IDENT/a", ";", ".", "EOF"], true); // es un programa valido
  testParse(["VAR", "IDENT/a", ",", "IDENT/z", ";", ".", "EOF"], true); // es un programa valido

  testParse(["PROCEDURE", "IDENT/a", ";","IDENT/a", ":=", "IDENT/b", ";", ".", "EOF"], true); // es un programa valido
  testParse(["PROCEDURE", "IDENT/a", ";","IDENT/a", ";", ".", "EOF"], false); // NO es un programa valido

  testParse(["PROCEDURE", "IDENT/a", ";","IDENT/a", ":=", "IDENT/b", ";", "PROCEDURE", "IDENT/xxx", ";","IDENT/a", ":=", "IDENT/b", ";", ".", "EOF"], true); // es un programa valido

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
    ["IDENT/Z", "=", "NUMBER/10"],
    ["IDENT/Z", "=", "NUMBER/10"],
    ["(", "IDENT/M", "+", "NUMBER/1", ")", "<=", "NUMBER/10"],
    ["(", "IDENT/M", "+", "NUMBER/1", "-", "IDENT/Q", ")", "<=", "NUMBER/10"],
    ["IDENT/M", "+", "NUMBER/1", "<=", "NUMBER/10"],
    ["-", "NUMBER/1", "<=", "NUMBER/10"],
    ["+", "NUMBER/1", "<=", "NUMBER/10"],
    ["IDENT/M", "*", "NUMBER/2", "<=", "NUMBER/10"],
    ["IDENT/M", {type: "/", value: "/"}, "NUMBER/2", "<=", "NUMBER/10"],
    ["IDENT/Z", "+", "IDENT/M", "*", "NUMBER/2", "<=", "NUMBER/10"]
  ];

  validStatements.forEach(function(statement) {
    conditions.forEach(function(condition) {
      testParse(["IF", condition, "THEN", statement, "END", ".", "EOF"], true);
      testParse(["WHILE", condition, "DO", statement, "END", ".", "EOF"], true);
    });

    testParse(["IF", ["IDENT/M", "*", ">", "NUMBER/5"], "THEN", statement, "END", ".", "EOF"], false);
  });

});

