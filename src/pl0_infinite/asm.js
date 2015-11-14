window.Asm = (function() {

  if (!Uint8Array.prototype.slice) {
    Uint8Array.prototype.slice = function(offset, length) {
      var u = new Uint8Array(length);

      for (var i=offset; i<=offset+length; i++) {
        u[i] = this[i];
      }

      return u;
    };
  }

  var asm = function() {
    this.result = new Uint8Array(512);
    this.nextPosition = 0;
  };

  var reg = function(name, number) {
    return {type: "reg", name: name, number: number};
  };

  asm.regs = {
    eax: reg("eax", 0),
    ecx: reg("ecx", 1),
    edx: reg("edx", 2),
    ebx: reg("ebx", 3),
    esp: reg("esp", 4),
    ebp: reg("ebp", 5),
    esi: reg("esi", 6),
    edi: reg("edi", 7)
  };

  asm.prototype.byte = function(value) {
    this.result[this.nextPosition] = value;
    this.nextPosition++;

    if (this.nextPosition >= this.result.length) {
      var oldArray = this.result;
      this.result = new Uint8Array(this.result.length*2);
      this.result.set(oldArray,0);
    }    
  };

  asm.prototype.dword = function(value) {
    this.byte(value & 0xFF);
    this.byte((value>>8) & 0xFF);
    this.byte((value>>16) & 0xFF);
    this.byte((value>>24) & 0xFF);
  };

  asm.prototype.symbol = function() {
    var f = [];
    return {type: "symbol", onSet: f.push.bind(f), set: function() {
      f.forEach(function(f) {
        f();
      });
    }};
  };

  asm.prototype.tag = function(s) {
    s.position = this.nextPosition;
    s.set();
  };

  asm.prototype.seek = function(position, f) {
    var oldPosition = this.nextPosition;
    this.nextPosition = position;
    f(this);
    this.nextPosition = oldPosition;
  };

  asm.prototype._jmp = function(s, short_code, long_code) {
    if (typeof s.position === "undefined") {
      var currentPosition;
      var self = this;

      if (Array.isArray(long_code)) {
        for (var i=0; i<long_code.length; i++) this.byte(long_code[i]);
      } else {
        this.byte(long_code);
      }

      currentPosition = this.nextPosition;
      s.onSet(function() {
        self.seek(currentPosition, function(asm) {
          var rel = s.position - self.nextPosition;
          asm.dword(rel-4);
        });
      });
      this.dword(0x0);
    } else {
      var rel = s.position - this.nextPosition;
      if ((!short_code) || rel < -126 ||rel > 127) {
        if (Array.isArray(long_code)) {
          for (var i=0; i<long_code.length; i++) this.byte(long_code[i]);
          this.dword(rel-4-long_code.length);
        } else {
          this.byte(long_code);
          this.dword(rel-5);
        }
    } else {
        this.byte(short_code);
        this.byte(rel-2);
      }
    }
  };

  asm.prototype.jmp = function(s) {
    this._jmp(s, 0xeb, 0xe9);
  };

  var jmpcode = function(name, code){
    asm.prototype[name] = function(s) {
      this._jmp(s, 0x70+code, [0x0f, 0x80+code]);
    };
  };

  jmpcode("je", 0x04);
  jmpcode("jne", 0x05);
  jmpcode("jpe", 0x0a);
  jmpcode("jl", 0x0c);
  jmpcode("jge", 0x0d);
  jmpcode("jle", 0x0e);
  jmpcode("jg", 0x0f);

  asm.prototype.call = function(s) {
    this._jmp(s, null, 0xe8);
  };

  asm.prototype.push = function(r) {
    this.byte(0x50 + r.number);
  };

  asm.prototype.pop = function(r) {
    this.byte(0x58 + r.number);
  };

  asm.prototype.inc = function(r) {
    this.byte(0x40 + r.number);
  };

  asm.prototype.ret = function() {
    this.byte(0xC3);
  };

  asm.prototype.xor = function(r1, r2) {
    this.byte(0x31);
    this.byte(0xc0 + (r2.number << 3) + r1.number);
  };

  asm.prototype.imul = function(r1, r2) {
    this.byte(0x0f);
    this.byte(0xaf);
    this.byte(0xc0 + (r2.number << 3) + r1.number);
  };

  asm.prototype.add = function(r1, r2) {
    this.byte(0x01);
    this.byte(0xc0 + (r2.number << 3) + r1.number);
  };

  asm.prototype.cmp = function(r1, r2) {
    this.byte(0x39);
    this.byte(0xc0 + (r2.number << 3) + r1.number);
  };

  asm.prototype.and = function(r1, r2) {
    this.byte(0x21);
    this.byte(0xc0 + (r2.number << 3) + r1.number);
  };

  asm.prototype.mov = function(destination, origin) {
    if (destination.type === "reg") {
      if (origin.type === "reg") {
        this.byte(0x89);
        this.byte(0xc0 + destination.number + (origin.number << 3));
      } else if (isFinite(origin)) {
        this.byte(0xb8 + destination.number);
        this.dword(origin);
      } else if (origin.type === "symbol") {
        var self = this;
        this.byte(0xb8 + destination.number);
        var currentPosition = this.nextPosition;
        origin.onSet(function() {
          self.seek(currentPosition, function(asm) {
            asm.dword(origin.position + self.base);
          });
        });
        this.dword(0x0);
      } else if (Array.isArray(origin)) {
        this.byte(0x8b);
        this.byte(0x80 + origin[0].number + (destination.number << 3));
        this.dword(origin[1]);
      }
    } else if (Array.isArray(destination)) {
      this.byte(0x89);
      this.byte(0x80 + destination[0].number + (origin.number << 3));
      this.dword(destination[1]);
    }
  };

  asm.process = function(f) {
    var a = new Asm();
    f(a);

    return a.result.slice(0,a.nextPosition);
  };

  return asm;
})();