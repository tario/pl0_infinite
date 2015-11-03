describe("Asm", function() {
  var testAsm = function(text, f, expected) {
    describe(text, function() {
      beforeEach(function() {
        this.result = Asm.process(f);
      });

      describe("length", function() {
        it ("should be " + expected.length, function() {
          chai.expect(this.result.length).to.be.equal(expected.length);
        });
      });


      expected.forEach(function(value, index) {
        describe("index " + index, function() {
          it("should be equal " + value, function() {
            chai.expect(this.result[index]).to.be.equal(value);
          });
        });
      });
    });
  };

  var testPushByte = function(value) {
    testAsm("single byte " + value, function(asm) {
      asm.pushByte(value);
    }, [value]);
  };

  var testMultipleByte = function(values) {
    testAsm("multiple bytes " + values, function(asm) {
      values.forEach(asm.pushByte.bind(asm));
    }, values);
  };

  for (var i=0; i<255; i++) {
    testPushByte(i);
  }

  for (var i=0; i<255; i+=51) {
    for (var j=0; j<255; j+=19) {
      testMultipleByte([i,j]);
    }
  }

  var testDword = function(value, expected) {
    testAsm("when dword number 0x" + value.toString(16), function(asm) {
      asm.pushDword(value);
    }, expected);
  }; 

  testDword(0x00000001, [0x01, 0x00, 0x00, 0x00]);
  testDword(0x00000002, [0x02, 0x00, 0x00, 0x00]);
  testDword(0x00000003, [0x03, 0x00, 0x00, 0x00]);
  testDword(0x00000041, [0x41, 0x00, 0x00, 0x00]);
  testDword(0x4A3B2C1D, [0x1D, 0x2C, 0x3B, 0x4A]);
  testDword(0xFFFFFFFF, [0xFF, 0xFF, 0xFF, 0xFF]);
  testDword(0x00000000, [0x00, 0x00, 0x00, 0x00]);

});

