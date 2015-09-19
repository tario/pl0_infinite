describe("Scanner", function() {
  beforeEach(function() {
    this.scanner = new PL0Infinite.DefaultScanner({});
  });

  it ("should have nextToken function", function(){
    expect(typeof this.scanner.scan).to.be("function");
  });

  var convertNotation = function(str) {
    if (str.type) return str;

    return {
      type: str.split("/")[0],
      value: str.split("/")[1]
    }
  };

  var testScan = function(text, tokens) {
    tokens = tokens.map(convertNotation);
    describe("when scan text '" + text + "'", function() {
      beforeEach(function() {
        var tokens = [];
        this.tokens = tokens;
        var scan = this.scanner.scan(text);
        var token;
        while(1) {
          token = scan.nextToken();
          tokens.push(token);
          if (token.type === "EOF") break;
        };
      });

      it ("should have " + tokens.length + " tokens", function(){
        expect(this.tokens.length).to.be(tokens.length);
      }); 

      tokens.forEach(function(token, index) {
        describe("token " + index, function() {
          it ("should have type '" + token.type + "'", function(){
            expect(this.tokens[index].type).to.be(token.type);
          }); 

          if (token.value) {
            it ("should have value '" + token.value + "'", function(){
              expect(this.tokens[index].value).to.be(token.value);
            });
          }
        });
      });
    });
  };

  describe("keywords", function() {
    var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
    keywords.forEach(function(keyword) {
      testScan(keyword, [keyword, 'EOF']);

      keywords.forEach(function(keyword2) {
        testScan(keyword + " " + keyword2, [keyword, keyword2, 'EOF']);
      });

    });
  });

  describe("separators", function() {
    var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/", "(", ")", ":="]
    separators.forEach(function(separator) {
      testScan(separator, [{type: separator, value: separator}, {type: 'EOF'}]);
    });
  });

  describe("idents", function() {
    var idents = ["variable1", "proc1", "proc2", "PROCEDURE42", "var3", "VAR43"];
    idents.forEach(function(ident) {
      testScan(ident, ["IDENT/"+ident, "EOF"]);
    });
  });

  describe("numbers", function() {
    var numbers = ["0", "1", "9330", "90000"];
    numbers.forEach(function(number) {
      testScan(number, ["NUMBER/"+number, "EOF"]);
    });
  });

  testScan("CONST     VAR", ['CONST', 'VAR', 'EOF']);
  testScan("CONST\x09\x09VAR", ['CONST', 'VAR', 'EOF']);
  testScan("CONST\nVAR", ['CONST', 'VAR', 'EOF']);
  testScan("CONST\n\n\nVAR", ['CONST', 'VAR', 'EOF']);

  testScan("6VAR", ['NUMBER/6', 'VAR', 'EOF']);

  describe("strings", function() {
    testScan('"alpha"', ['STRING/alpha', 'EOF']);
    testScan('"beta"', ['STRING/beta', 'EOF']);
    testScan('"gamma"', ['STRING/gamma', 'EOF']);
    testScan('"x"6', ['STRING/x', 'number/6', 'EOF']);
  });
});
