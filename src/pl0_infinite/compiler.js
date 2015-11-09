window.PL0Compiler = (function() {

  var compiler = function(options) {
    this.header = options.header;
  };

  compiler.prototype.compile = function(ast) {
    var result = new Uint8Array([0x90, 0x90]);
    return new Blob([this.header, result], {type: "application/octet-stream"});
  };

  return compiler;
})();