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

      var mov = asm.mov.bind(asm);
      var xor = asm.xor.bind(asm);
      var push = asm.push.bind(asm);
      var pop = asm.pop.bind(asm);
      var add = asm.add.bind(asm);
      var imul = asm.imul.bind(asm);
      var inc = asm.inc.bind(asm);
      var eax = r.eax;
      var ebx = r.ebx;
      var edi = r.edi;

      asm.base = self.symbols.base;

      readln.position = self.symbols.symbols.readln - self.symbols.base;
      write.position = self.symbols.symbols.write - self.symbols.base;
      writeenter.position = self.symbols.symbols.writeenter - self.symbols.base;
      exit.position = self.symbols.symbols.exit - self.symbols.base;

      var _needEbxSave = {
        number: function() {
          return false;
        },

        offset: function() {
          return false;
        },

        product: function(node) {
          if (node.factor.length > 1) return true;
          return needEbxSave(node.factor[0]);
        },

        expression: function(node) {
          if (node.term.length > 1) return true;
          return needEbxSave(node.term[0]);
        }
      };

      var needEbxSave = function(node) {
        if (!_needEbxSave[node.type]) return true;
        return _needEbxSave[node.type](node);
      };

      var _compile = {
        "statement-block": function(node) {
          node.statement.forEach(function(subnode) {
            compile(subnode);
          });
        },

        offset: function(node) {
          mov(eax, [edi, node.offset]);
        },

        number: function(node) {
          mov(eax, node.value);
        },

        product: function(node) {
          if (node.factor.length === 0) {
          } else if (node.factor.length === 1) {
            compile(node.factor[0]);
          } else {
            compile(node.factor[0]);
            mov(ebx, eax);
            node.factor.slice(1).forEach(function(f) {
              var _save = needEbxSave(f);
              if (_save) push(ebx);
              compile(f);
              if (_save) pop(ebx);
              imul(eax, ebx);
            });
            mov(eax, ebx);
          }

        },

        expression: function(node) {
          if (node.term.length === 0) {
          } else if (node.term.length === 1) {
            compile(node.term[0]);
          } else {
            compile(node.term[0]);
            mov(ebx, eax);
            node.term.slice(1).forEach(function(t) {
              var _save = needEbxSave(t);
              if (_save) push(ebx);
              compile(t);
              if (_save) pop(ebx);
              add(ebx, eax);
            });
            mov(eax, ebx);
          }
        },

        writeln: function() {
          asm.call(writeenter);
        },
               
        write: function(node) {
          compile(node.expression[0]);
          asm.call(write);
        },

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
        if (!_compile[node.type]) throw "Unimplemented node: " + node.type;
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