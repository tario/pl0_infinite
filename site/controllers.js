var app = angular.module("PL0InfiniteUI");
app.controller("MainController", ["$scope", "$timeout", "fn", "PL0Infinite", function($scope, $timeout, fn, PL0Infinite) {

  var codeChanged = function() {
    var parser = new PL0Infinite.DefaultParser({});
    var scanner = new PL0Infinite.DefaultScanner({});

    var scan = scanner.scan($scope.code || "");
    try {
      parser.parse(scan);
      $timeout(function() { $scope.error = null });
    } catch (e) {
      $timeout(function() { $scope.error = e.toString() });
    }
  };

  $scope.$watch(fn.debounce(codeChanged, 200));
}])