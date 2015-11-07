describe("Asm", function() {
  var testAsm = function(text, f, expected, options) {
    options = options ||{};
    options.start = options.start || 0;

    describe(text, function() {
      beforeEach(function() {
        this.result = Asm.process(f);
      });

      describe("length", function() {
        it ("should be " + expected.length, function() {
          chai.expect(this.result.length).to.be.equal(expected.length + options.start);
        });
      });


      if (expected.length - options.start < 256)
        expected.forEach(function(value, index) {
          describe("index " + index, function() {
            it("should be equal " + value, function() {
              chai.expect(this.result[index+options.start]).to.be.equal(value);
            });
          });
        });

    });
  };

  var testbyte = function(value) {
    testAsm("single byte " + value, function(asm) {
      asm.byte(value);
    }, [value]);
  };

  var testMultipleByte = function(values) {
    testAsm("multiple bytes " + values, function(asm) {
      values.forEach(asm.byte.bind(asm));
    }, values);
  };

  for (var i=0; i<255; i++) {
    testbyte(i);
  }

  for (var i=0; i<255; i+=51) {
    for (var j=0; j<255; j+=19) {
      testMultipleByte([i,j]);
    }
  }

  var testDword = function(value, expected) {
    testAsm("when dword number 0x" + value.toString(16), function(asm) {
      asm.dword(value);
    }, expected);
  }; 

  testDword(0x00000001, [0x01, 0x00, 0x00, 0x00]);
  testDword(0x00000002, [0x02, 0x00, 0x00, 0x00]);
  testDword(0x00000003, [0x03, 0x00, 0x00, 0x00]);
  testDword(0x00000041, [0x41, 0x00, 0x00, 0x00]);
  testDword(0x4A3B2C1D, [0x1D, 0x2C, 0x3B, 0x4A]);
  testDword(0xFFFFFFFF, [0xFF, 0xFF, 0xFF, 0xFF]);
  testDword(0x00000000, [0x00, 0x00, 0x00, 0x00]);
  testDword(-1, [0xFF, 0xFF, 0xFF, 0xFF]);

  testAsm("when byte 0x76, dword 0x44909037 and byte 0x43", function(asm) {
    asm.byte(0x76);
    asm.dword(0x44909037);
    asm.byte(0x43);
  }, [0x76, 0x37, 0x90, 0x90, 0x44, 0x43]);

  var testRepeatedByte = function(value, count) {
    var array = [];
    for (var j=0; j<count; j++) array.push(value);
    testAsm("when byte " + value + " is repeated " + count + " times", function(asm) {
      for (var j=0; j<count; j++) asm.byte(value);
    }, array);
  };

  for (var i=1; i<=256; i+=64) {
    testRepeatedByte(0x90, i);
  };


  testRepeatedByte(0x90, 1000);
  testRepeatedByte(0x90, 4000);
  testRepeatedByte(0x90, 16384);


  var testBackJmp = function(str, f, expected, options) {
    testAsm(str, function(asm) {
      var s1 = asm.symbol();
      asm.tag(s1);
      f(asm);
      asm.jmp(s1);
    }, expected, options);
  };

  var testFrontJmp = function(str, f, expected) {
    testAsm(str, function(asm) {
      var s1 = asm.symbol();
      asm.jmp(s1);
      f(asm);
      asm.tag(s1);
    }, expected);
  };

  testBackJmp("when s1: 0x90, 0x90 and jmp", function(asm) {
    asm.byte(0x90);
    asm.byte(0x90);
  }, [0x90, 0x90, 0xeb, 0xfc]);

  testBackJmp("when s1: 0x90 and jmp", function(asm) {
    asm.byte(0x90);
  }, [0x90, 0xeb, 0xfd]);

  testBackJmp("when s1: jmp", function(asm) {
  }, [0xeb, 0xfe]);

  testBackJmp("when s1: 0x90... x 512 ...  and jmp", function(asm) {
    for (var i=0; i<512; i++) asm.byte(0x90);
  }, [0xe9, 0xfb, 0xfd, 0xff, 0xff], {start: 512});

  testFrontJmp("when jmp s1; s1:", function(asm) {
  }, [0xe9, 0x00, 0x00, 0x00, 0x00]);

  testFrontJmp("when jmp s1; nop; s1:", function(asm) {
    asm.byte(0x90);
  }, [0xe9, 0x01, 0x00, 0x00, 0x00, 0x90]);

  testFrontJmp("when jmp s1; nop; nop; s1:", function(asm) {
    asm.byte(0x90);
    asm.byte(0x90);
  }, [0xe9, 0x02, 0x00, 0x00, 0x00, 0x90, 0x90]);


  var testStandardJmp = function(name, short_code, long_code) {
    describe("when using " + name, function() {
      var s1;
      beforeEach(function() {
        this.spy = sinon.spy();
        this.asm = new Asm();
        this.asm._jmp = this.spy;

        s1 = this.asm.symbol();
        this.asm[name].bind(this.asm)(s1);
      });

      it ("should call _jmp one time", function() {
        chai.expect(this.spy.called).to.be.equal(true);
      });

      describe("first argument", function() {
        it ("should be " + JSON.stringify(s1), function() {
          chai.expect(this.spy.args[0][0]).to.be.equal(s1);
        });
      });


      [short_code, long_code].forEach(function(value, index) {
        describe("argument on index " + index, function() {
          it ("should be " + JSON.stringify(value), function() {
            chai.expect(this.spy.args[0][index+1]).to.deep.equal(value);
          });
        });
      });
    });
  };

  testStandardJmp("jmp", 0xeb, 0xe9);
  testStandardJmp("je", 0x74, [0x0f, 0x84]);

  var testBackJe = function(str, f, expected, options) {
    testAsm(str, function(asm) {
      var s1 = asm.symbol();
      asm.tag(s1);
      f(asm);
      asm.je(s1);
    }, expected, options);
  };

  var testFrontJe = function(str, f, expected) {
    testAsm(str, function(asm) {
      var s1 = asm.symbol();
      asm.je(s1);
      f(asm);
      asm.tag(s1);
    }, expected);
  };

  testFrontJe("when je s1; s1:", function() {
  }, [0x0f, 0x84, 0x00, 0x00, 0x00, 0x00]);

  testFrontJe("when je s1; nop; s1", function(asm) {
      asm.byte(0x90);
  }, [0x0f, 0x84, 0x01, 0x00, 0x00, 0x00, 0x90]);

  testBackJe("when s1: 0x90... x 512 ...  and je", function(asm) {
    for (var i=0; i<512; i++) asm.byte(0x90);
  }, [0x0f, 0x84, 0xfa, 0xfd, 0xff, 0xff], {start: 512});  

  testBackJe("when s1: je", function(asm) {
  }, [0x74, 0xfe]);

});


