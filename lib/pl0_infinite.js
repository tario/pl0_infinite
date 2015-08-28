window.PL0Infinite = (function() {
  var pl0 = {};

  var DefaultScanner = function(opts) {
  };

  var token = function(type) {
    return function(str) {
      return {type: type, value: str};
    };
  };

  var graph = {
    S: [
      [/^[a-zA-Z]$/, "Z1"],
      [/^[0-9]$/, "Z2"],
      [/^=$/, "Z4"],
      [/^<$/, "Z3"],
      [/^[.=,;<>+\-*\/\(\)]$/, "Z5"],
      [/^$/, "S", token("EOF")]
    ],
    Z1: [
      [/^[a-zA-Z0-9]$/, "Z1"],
      [/^.?$/, "S", function(token) {
          if (keywords.indexOf(token) !== -1) {
            return {type: 'keyword', value: token};
          } else {
            return {type: 'ident', value: token};
          }
      }]
    ],
    Z2: [
      [/^[0-9]$/, "Z2"],
      [/^.?$/, "S", token("number")]
    ],
    Z3: [
      [/^>$/, "Z3"],
      [/^=$/, "Z3"],
      [/^.?$/, "S", token("sep")]
    ],
    Z4: [
      [/^>$/, "Z4"],
      [/^.?$/, "S", token("sep")]
    ],
    Z5: [
      [/^.?$/, "S", token("sep")]
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
            if (edge[2]) {
              var token = acc;
              acc = "";
              currentIndex--;
              return edge[2](token);
            } else {
              acc = acc + character;
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

  return pl0;
})();