window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts) {
  };

  var token = function(type) {
    return function(str) {
      return {type: type, value: str};
    };
  };

  var tokenSelf = function(type) {
    return {type: type, value: type};
  };

  var graph = {
    S: [
      [/^[a-zA-Z]$/, "Z1"],
      [/^[0-9]$/, "Z2"],
      [/^=$/, "Z4"],
      [/^<$/, "Z3"],
      [/^[.=,;<>+\-*\/\(\)]$/, "Z5"],
      [/^\"$/ /*"*/, "ZSTR", {skip: true}],
      [/^$/, "S", {emit: token("EOF")}]
    ],
    Z1: [
      [/^[a-zA-Z0-9]$/, "Z1"],
      [/^.?$/, "S", {emit: function(token) {
          if (keywords.indexOf(token) !== -1) {
            return {type: 'keyword', value: token};
          } else {
            return {type: 'ident', value: token};
          }
      }}]
    ],
    Z2: [
      [/^[0-9]$/, "Z2"],
      [/^.?$/, "S", {emit: token("number")}]
    ],
    Z3: [
      [/^>$/, "Z3"],
      [/^=$/, "Z3"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z4: [
      [/^>$/, "Z4"],
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    Z5: [
      [/^.?$/, "S", {emit: tokenSelf}]
    ],
    ZSTR: [
      [/^\"$/ /*"*/, "S", {emit: token("string"), forward:1}],
      [/^.$/, "ZSTR"],
      [/^$/, "S", {emit: token("EOF")}]
    ]
  }

  var separators = [".", "=", ",", ";", "=", "<", ">", "+", "-", "*", "/", "(", ")"];
  var keywords = ["PROCEDURE", "CONST", "VAR", "CALL", "IF", "THEN", "WHILE", "DO", "BEGIN", "END", "ODD"];
  DefaultScanner.prototype.scan = function(text) {

    var currentIndex = 0;
    var currentState = "S";
    var acc = "";
    var nextToken = function() {
      while(1) {
        var character = text[currentIndex];
        currentIndex++;

        var edges = graph[currentState];
        for (var i = 0; i < edges.length;i++) {
          var edge = edges[i];
          if ((character||"").replace("\n"," ").match(edge[0])) {
            currentState = edge[1];
            if (edge[2] && edge[2].emit) {
              var token = acc;
              acc = "";
              currentIndex--;
              if (edge[2].forward) {
                currentIndex+=edge[2].forward;
              }
              return edge[2].emit(token);
            } else {
              if (!edge[2] || !edge[2].skip) {
                acc = acc + character;
              }
            }

            break;
          }
        };
      }

    };

    return {
      nextToken: nextToken
    };
  };

  pl0.DefaultScanner = DefaultScanner;

  var DefaultParser = function(opts)  {

  };

  DefaultParser.prototype.parse = function(scanner) {
    var token = scanner.nextToken();
    if (token.type === "CONST") throw "";
  };

  pl0.DefaultParser = DefaultParser;

  return pl0;
})();