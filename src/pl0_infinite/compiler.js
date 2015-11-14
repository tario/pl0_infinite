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
      var writestring = asm.symbol();
      var writeenter = asm.symbol();
      var exit = asm.symbol();

      var mov = asm.mov.bind(asm);
      var xor = asm.xor.bind(asm);
      var push = asm.push.bind(asm);
      var pop = asm.pop.bind(asm);
      var add = asm.add.bind(asm);
      var imul = asm.imul.bind(asm);
      var inc = asm.inc.bind(asm);
      var jmp = asm.jmp.bind(asm);
      var tag = asm.tag.bind(asm);
      var and = asm.and.bind(asm);
      var call = asm.call.bind(asm);

      var je = asm.je.bind(asm);
      var jne = asm.jne.bind(asm);
      var jl = asm.jl.bind(asm);
      var jge = asm.jge.bind(asm);
      var jle = asm.jle.bind(asm);
      var jg = asm.jg.bind(asm);
      var jpe = asm.jpe.bind(asm);

      var cmp = asm.cmp.bind(asm);
      var eax = r.eax;
      var ebx = r.ebx;
      var edi = r.edi;

      asm.base = self.symbols.base;

      readln.position = self.symbols.symbols.readln - self.symbols.base;
      write.position = self.symbols.symbols.write - self.symbols.base;
      writestring.position = self.symbols.symbols.writestring - self.symbols.base;
      writeenter.position = self.symbols.symbols.writeenter - self.symbols.base;
      exit.position = self.symbols.symbols.exit - self.symbols.base;

      var globalsize = 0;

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

      var _procedure = {};
      var stringconstants = [];

      var _compile = {
        "statement-block": function(node) {
          node.statement.forEach(function(subnode) {
            compile(subnode);
          });
        },

        offset: function(node) {
          if (node.offset[0]+1 > globalsize) globalsize = node.offset[0]+1
          mov(eax, [edi, node.offset[0]*4]);
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
          if (node.string) {
            var newstrconst = {symbol: asm.symbol(), value: node.string[0]};
            stringconstants.push(newstrconst);
            mov(eax, newstrconst.symbol);
            asm.call(writestring);
          } else {
            compile(node.expression[0]);
            asm.call(write);
          }
        },

        program: function(node) {
          var variable_section = asm.symbol();

          mov(edi, variable_section);
          compile(node.block[0]);
          jmp(exit);

          tag(variable_section);
        },

        call: function(node) { // el call de PL/0
          asm.call(_procedure[node.number[0]]); // este es el call del assembler
        },

        procedure: function(node) {
          var newProcedureSymbol = asm.symbol();
          _procedure[node.number[0]] = newProcedureSymbol;
          compile(node.block[0], newProcedureSymbol);

          asm.ret();
        },

        block: function(node, codeStartSymbol) {
          if (node.procedure && node.procedure.length > 0) {
            var avoidProcedure = asm.symbol();
            jmp(avoidProcedure);
              node.procedure.forEach(function(p){
                compile(p);
              });
            tag(avoidProcedure);
          }

          if (node.statement) {
            if (codeStartSymbol) tag(codeStartSymbol);
            compile(node.statement[0]);
          }
        },

        odd: function(node) {
          compile(node.expression[0]);
          xor(ebx, ebx);
          inc(ebx);
          and(eax, ebx);
          cmp(eax, ebx);
          return jne;
        },

        compare: function(node) {
          compile(node.expression[0]);
          mov(ebx, eax);
          var _save = needEbxSave(node.expression[1]);
          if (_save) push(ebx);
          compile(node.expression[1]);
          if (_save) pop(ebx);
          cmp(ebx, eax);

          return {
            '>': jle,
            '<': jge,
            '=': jne,
            '<>': je,
            '<=': jg,
            '=<': jg,
            '>=': jl,
            '=>': jl
          }[node.operator[0]];
        },

        readln: function(node) {
          call(readln);

          if (node.offset[0]+1 > globalsize) globalsize = node.offset[0]+1
          mov([edi, node.offset[0]*4],eax);
        },

        "if": function(node) {
          var _conditional_jmp = compile(node.condition[0]); // devuelve el jmp que deberias hacer segun la condition
                                                             // si esta NO se cumple
          var endif = asm.symbol();
          _conditional_jmp(endif);
          compile(node.statement[0]);
          tag(endif);
        },

        "while": function(node) {
          var repeat = asm.symbol();
          var out = asm.symbol();
          
          tag(repeat);
          
          var _conditional_jmp = compile(node.condition[0]); // devuelve el jmp que deberias hacer segun la condition
                                                             // si esta NO se cumple
          _conditional_jmp(out);
          compile(node.statement[0]);

          jmp(repeat);
          tag(out);
        },

        lasgn: function(node) {
          compile(node.expression[0]);

          if (node.offset[0]+1 > globalsize) globalsize = node.offset[0]+1
          mov([edi, node.offset[0]*4], eax);
        }

      };

      var compile = function(node, extrarg) {
        if (!_compile[node.type]) throw "Unimplemented node: " + node.type;
        return _compile[node.type](node, extrarg);
      };

      compile(ast);

      for(var i=0;i<globalsize;i++) {
        asm.dword(0);
      }

      stringconstants.forEach(function(strconst) {
        asm.tag(strconst.symbol);
        for (var i=0; i<strconst.value.length; i++) {
          asm.byte(strconst.value.charCodeAt(i));
        }
        asm.byte(0);
      });
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