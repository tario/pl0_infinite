window.PL0Compiler = (function() {

  var compiler = function(options) {
    this.header = options.header;
    this.symbols = options.symbols;
  };

  compiler.prototype.compile = function(ast) {
    var self = this;
    var r = Asm.regs;

    var result = Asm.process(function(asm) {
      var readln = asm.symbol();
      var write = asm.symbol();
      var writeenter = asm.symbol();
      var exit = asm.symbol();

      asm.base = self.symbols.base;

      readln.position = self.symbols.symbols.readln - self.symbols.base;
      write.position = self.symbols.symbols.write - self.symbols.base;
      writeenter.position = self.symbols.symbols.writeenter - self.symbols.base;
      exit.position = self.symbols.symbols.exit - self.symbols.base;

      var _compile = {
        program: function(node) {
          var variable_section = asm.symbol();

          asm.mov(r.edi, variable_section);
          compile(node.block[0]);
          asm.jmp(exit);

          asm.tag(variable_section);
        },

        block: function(node) {
          if (node.statement) {
            compile(node.statement[0]);
          }
        },

        readln: function(node) {
          asm.call(readln);
          asm.mov([r.edi, node.offset[0]],r.eax);
        }

      };

      var compile = function(node) {
        _compile[node.type](node);
      };

      compile(ast);
    });

    var sectionSize = this.symbols.baseSectionSize + result.length + 0x100 - (result.length & 0xFF) ;

    var dword = function(array, address, value) {
      array[address+0] = value & 0xff;
      array[address+1] = (value>>8) & 0xFF;
      array[address+2] = (value>>16) & 0xFF;
      array[address+3] = (value>>24) & 0xFF;
    };

    dword(this.header, 0x000000F0, sectionSize+0x1000);
    dword(this.header, 0x000001a0, sectionSize);
    dword(this.header, 0x000001a8, sectionSize);

    var payload = new Uint8Array(0x200 + sectionSize - this.header.length - result.length);
    return new Blob([this.header, result, payload], {type: "application/octet-stream"});
  };

  return compiler;
})();