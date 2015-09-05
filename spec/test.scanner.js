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

  var testParse = function(text, tokens) {
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
      testParse(keyword, ['keyword/' + keyword, 'EOF']);

      keywords.forEach(function(keyword2) {
        testParse(keyword + " " + keyword2, ['keyword/' + keyword, 'keyword/' + keyword2, 'EOF']);
      });

    });
  });

  describe("separators", function() {
    var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/", "(", ")"]
    separators.forEach(function(separator) {
      testParse(separator, [{type: separator, value: separator}, {type: 'EOF'}]);
    });
  });

  describe("idents", function() {
    var idents = ["variable1", "proc1", "proc2", "PROCEDURE42", "var3", "VAR43"];
    idents.forEach(function(ident) {
      testParse(ident, ["ident/"+ident, "EOF"]);
    });
  });

  describe("numbers", function() {
    var numbers = ["0", "1", "9330", "90000"];
    numbers.forEach(function(number) {
      testParse(number, ["number/"+number, "EOF"]);
    });
  });

  testParse("CONST     VAR", ['keyword/CONST', 'keyword/VAR', 'EOF']);
  testParse("CONST\x09\x09VAR", ['keyword/CONST', 'keyword/VAR', 'EOF']);
  testParse("CONST\nVAR", ['keyword/CONST', 'keyword/VAR', 'EOF']);
  testParse("CONST\n\n\nVAR", ['keyword/CONST', 'keyword/VAR', 'EOF']);

  testParse("6VAR", ['number/6', 'keyword/VAR', 'EOF']);

  describe("strings", function() {
    testParse('"alpha"', ['string/alpha', 'EOF']);
    testParse('"beta"', ['string/beta', 'EOF']);
    testParse('"gamma"', ['string/gamma', 'EOF']);
    testParse('"x"6', ['string/x', 'number/6', 'EOF']);
  });
});
