describe("Scanner", function() {
  beforeEach(function() {
    var tokens = [];
    this.tokens = tokens;
    this.scanner = new PL0Infinite.DefaultScanner({}, function(token) {
      tokens.push(token);
    });
  });

  it ("should have scan function", function(){
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
        this.scanner.scan(text);
      });

      tokens.forEach(function(token, index) {
        it ("should have " + tokens.length + " tokens", function(){
          expect(this.tokens.length).to.be(tokens.length);
        }); 

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
      testParse(separator, [{type: 'sep', value: separator}, {type: 'EOF'}]);
    });
  });

  describe("idents", function() {
    var idents = ["variable1", "proc1", "proc2", "PROCEDURE42", "var3", "VAR43"];
    idents.forEach(function(ident) {
      testParse(ident, ["ident/"+ident, "EOF"]);
    });
  });

  describe("numbers", function() {
    var numbers = ["0", "1", "9330", "91.32", "90000"];
    numbers.forEach(function(number) {
      testParse(number, ["number/"+number, "EOF"]);
    });
  });
});
