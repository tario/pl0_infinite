var app = angular.module("PL0InfiniteUI");
app.controller("MainController", ["$scope", "$timeout", "fn", "PL0Infinite", "$q", "win32_encoded_header", "win32_symbols", "sources", function($scope, $timeout, fn, PL0Infinite, $q, win32_encoded_header, win32_symbols, sources) {

  $scope.log = "";

  $scope.run = function() {
    var stdout = {
      write: function(data) {
        $scope.log = $scope.log + data.toString();
        $scope.$digest();
      }
    };

    var stdin = {
      read: function() {
        return prompt("Please enter a value");
      }
    };

    $timeout(function() {
      $scope.log = "";
      $timeout(function() {
        $scope.runner.run(stdout, stdin);
      });
    });
  };

  $scope.files = [];
  for (var k in sources) {
    $scope.files.push({
      name: k,
      source: sources[k]
    });
  };

  $scope.selectedFileChanged = function() {
    $scope.code = $scope.selectedFile.source;
  };

  var win32_compiler = function() {
    var str = atob(win32_encoded_header);
    var array = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        array[i] = str.charCodeAt(i);
    }
    return new window.PL0Compiler({
      header: array,
      symbols: win32_symbols
    });
  }();

  var hexnum = function(x, relleno) {
    var ret = x.toString(16);
    while (ret.length < relleno) ret = "0" + ret;
    return ret;
  };

  var printableChar = function(c) {
    return c < 127 && c > 31 ? String.fromCharCode(c) : ".";
  };

  var toHexdump = function(b) {
    var ret = "Offset\x09\x09";
    for (var i = 0; i < 16; i++) {
      ret = ret + hexnum(i,0) + "  ";
      if (i%16 == 7) ret = ret + "  ";
    }

    ret = ret + "\n";

    for (var i = 0; i < b.length; i+=16) {
      ret = ret + hexnum(i, 8) + "\x09";
      for (var j = i; j < i + 16; j++) {
        ret = ret + hexnum(b[j], 2) + " ";
        if (j%16 == 7) ret = ret + "  ";
      }

      ret = ret + "   "

      for (var j = i; j < i + 16; j++) {
        ret = ret + printableChar(b[j]);
      }

      ret = ret + "\n";
    }

    return ret;
  }; 

  $scope.download_win32 = function() {
    var parser = new PL0Infinite.DefaultParser({});
    var scanner = new PL0Infinite.DefaultScanner({});
    var builder = new PL0Infinite.ASTBuilder();
    var semantic = new PL0Infinite.SemanticAnalyzer({output: builder});

    var scan = scanner.scan($scope.code || "");
    parser.parse(scan, {output: semantic});

    var a = document.createElement("a");
    var buffer = win32_compiler.buildExe(builder.result);
    var blob = new Blob([buffer], {type: "application/octet-stream"});

    $scope.hexdump = toHexdump(buffer);

    var url = window.URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.style = "display: none";    
    a.href = url;
    a.download = "output.exe";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  $scope.codemirrorLoaded = function(_editor) {
    var doc = _editor.getDoc();

    var clearErrorLines = function(options){
      options = options ||{};
        for (var i=0; i<doc.lineCount(); i++) {
          if (options.except !== i) {
            doc.removeLineClass(i, "background");
          }
        }
    };

    var codeChanged = function() {
      var parser = new PL0Infinite.DefaultParser({});
      var scanner = new PL0Infinite.DefaultScanner({});
      var builder = new PL0Infinite.ASTBuilder();
      var semantic = new PL0Infinite.SemanticAnalyzer({output: builder})
      // parser -> semantic -> builder

      var scan = scanner.scan($scope.code || "");
      try {
        parser.parse(scan, {output: semantic});
        $timeout(function() {
          clearErrorLines();

          SetBasePosition("0000000000401500");
          $scope.runner = PL0Infinite.transpile(builder.result);
          $scope.disasmcode = Disassemble(win32_compiler.compile(builder.result));
          $scope.error = null;
        });
      } catch (e) {
        if (e.expected) {
          var strexpected;
          strexpected = e.expected.length > 1 ? 
            e.expected.slice(0, -1).join(", ") + " or " + e.expected.slice(-1)[0] : e.expected[0];

          clearErrorLines({except: e.found.line});
          doc.addLineClass(e.found.line-1, "background", "errorline");
          $timeout(function() { $scope.error = "Expected " + strexpected + " found " + e.found.type });
        } else if (e.fromOutput) {
          clearErrorLines({except: e.lastToken.line});
          doc.addLineClass(e.lastToken.line-1, "background", "errorline");          
          $timeout(function() { $scope.error = e.fromOutput });
        } else {
          $timeout(function() { $scope.error = e.toString() });
        }
        $timeout(function() { 
          $scope.runner = null;
          $scope.disasmcode = "";
        });
      }
    };

    $scope.$watch("code", fn.debounce(codeChanged, 200));
  };

}])