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

  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  keywords.forEach(function(keyword) {
    testParse(keyword, ['keyword/' + keyword, 'EOF']);
  });

  var separators = [".", "=", ",", ";", "=", "<>", "<", ">", "<=", "=>", "+", "-", "*", "/", "(", ")"]

  separators.forEach(function(separator) {
    testParse(separator, [{type: 'sep', value: separator}, {type: 'EOF'}]);
  });
});
