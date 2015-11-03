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

  asm.prototype.pushByte = function(value) {
    this.result[this.nextPosition] = value;
    this.nextPosition++;

    if (this.nextPosition >= this.result.length) {
      var oldArray = this.result;
      this.result = new Uint8Array(this.result.length*2);
      this.result.set(oldArray,0);
    }    
  };

  asm.prototype.pushDword = function(value) {
    this.pushByte(value & 0xFF);
    this.pushByte((value>>8) & 0xFF);
    this.pushByte((value>>16) & 0xFF);
    this.pushByte((value>>24) & 0xFF);
  };

  asm.process = function(f) {
    var a = new Asm();
    f(a);

    return a.result.slice(0,a.nextPosition);
  };

  return asm;
})();