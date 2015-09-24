describe("ASTBuilder", function() {
  beforeEach(function() {
    this.builder = new PL0Infinite.ASTBuilder();
    this.expectTree = function(tree) {
      chai.expect(this.builder.result).to.deep.equal(tree);
    };
  });

  var expectTree = function(tree) {
    return function() {
      return this.expectTree(tree);
    };
  };

  describe("when no input is given", function() {
    it ("should have only one node of type program", function(){
      this.expectTree({type: "program"});
    });
  });

  describe("when attr a -> b is given", function() {
    beforeEach(function() {
      this.builder.attr("a", "b");
    });

    it ("should have a array a with only one element b", expectTree({type: "program", a: ["b"]}))
  });


  describe("when two attr a -> b and a -> c are given", function() {
    beforeEach(function() {
      this.builder.attr("a", "b");
      this.builder.attr("a", "c");
    });

    it ("should have a array a with only two elements b and c", expectTree({type: "program", a: ["b", "c"]}))
  });

  describe("when one child a of type b is given", function() {
    beforeEach(function() {
      this.builder.child("a", "b");
    });

    it ("should have a object a with type b", expectTree({type: "program", a: [{type: "b"}]}))
  });

  describe("when one child a of type b is given and attr c is given", function() {
    beforeEach(function() {
      this.builder.child("a", "b", function(child) {
        child.attr("c", 4);
      });
    });

    it ("should have a object a with type b and attr c", expectTree({type: "program", a: [{type: "b", "c": [4]}]}))
  });

  describe("when one child a of type b is given and attr c and d is given", function() {
    beforeEach(function() {
      this.builder.child("a", "b", function(child) {
        child.attr("c", 4);
        child.attr("d", 5);
      });
    });

    it ("should have a object a with type b and attr c and d", expectTree({type: "program", a: [{type: "b", "c": [4], "d": [5]}]}))
  });

  describe("when one child a of type b is given and attr c two times", function() {
    beforeEach(function() {
      this.builder.child("a", "b", function(child) {
        child.attr("c", 4);
        child.attr("c", 5);
      });
    });

    it ("should have a object a with type b and attr c", expectTree({type: "program", a: [{type: "b", "c": [4, 5]}]}))
  });

  describe("when one child a of type b is given and child c", function() {
    beforeEach(function() {
      this.builder.child("a", "b", function(child) {
        child.child("c", "d");
      });
    });

    it ("should have a object a with type b, and child c", expectTree({type: "program", a: [{type: "b", "c": [{type: "d"}]}]}))
  });

});

