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
    return {};
  };

  asm.prototype.tag = function(s) {
    s.position = this.nextPosition;
  };

  asm.prototype.jmp = function(s) {

    var rel = s.position - this.nextPosition;

    if (rel < -127 ||rel > 127) {
      this.byte(0xe9);
      this.dword(rel-5);

    } else {
      this.byte(0xeb);
      this.byte(rel-2);
    }
  };

  asm.process = function(f) {
    var a = new Asm();
    f(a);

    return a.result.slice(0,a.nextPosition);
  };

  return asm;
})();