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


});

