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


  var testParse = function(text, tokens) {
    describe("when scan text '" + text + "'", function() {
      beforeEach(function() {
        this.scanner.scan(text);
      });

      tokens.forEach(function(token, index) {
        describe("token " + index, function() {
          it ("should have type " + token.type, function(){
            expect(this.tokens[index].type).to.be(token.type);
          });

          if (token.value) {
            it ("should have value " + token.value, function(){
              expect(this.tokens[index].value).to.be(token.value);
            });
          }
        });
      });
    });
  };

  testParse("PROCEDURE", [ {type: 'keyword', value: 'PROCEDURE'}, {type: 'EOF'}]);


});
