var app = angular.module("PL0InfiniteUI");
app.controller("MainController", ["$scope", "$timeout", "fn", "PL0Infinite", "$q", "win32_encoded_header", "win32_symbols", function($scope, $timeout, fn, PL0Infinite, $q, win32_encoded_header, win32_symbols) {

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

  $scope.download_win32 = function() {
    var parser = new PL0Infinite.DefaultParser({});
    var scanner = new PL0Infinite.DefaultScanner({});
    var builder = new PL0Infinite.ASTBuilder();
    var semantic = new PL0Infinite.SemanticAnalyzer({output: builder});

    var scan = scanner.scan($scope.code || "");
    parser.parse(scan, {output: semantic});

    var a = document.createElement("a");
    var blob = win32_compiler.compile(builder.result);
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
          $scope.runner = PL0Infinite.transpile(builder.result);
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
      }
    };

    $scope.$watch("code", fn.debounce(codeChanged, 200));
  };

}])