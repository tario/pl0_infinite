describe("Scanner", function() {
  beforeEach(function() {
    this.scanner = PL0Infinite.defaultScanner();
  });
  
  it ("should have scan function", function(){
    expect(typeof this.scanner.scan).to.be("function");
  });
});
