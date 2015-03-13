{transformAst} = require './index'
{parse, print} = require 'recast'
{spy} = require 'sinon'
assert = require 'assert'

toAst = (source) -> parse(source).program
toSource = (ast) -> print(ast).code

describe 'AST transformation:' ->
  # Needs to be on the test object, since mocha-given tries to eval().call(this)
  # when tests fail. `toSource` is not in scope in these cases
  Given -> @toSource = toSource

  describe 'passes an array of all encountered variable names to the `createName` callback:' ->
    Given -> @ast = toAst('''
        var variable = 1;
        function aFunction(foo, bar) {
          var baz = 1, anotherFunction = function captureThis() {
            var andCaptureThis;
          };
          function innerFunction(a, b) {}
          return innerFunction(baz, anotherFunction);
        }
        var anotherVariable = aFunction(variable, function(error, data) {
          if (error) {
            var invalidData = data;
          }
        });

        var bar = window;''')
    Given -> @createName = spy(-> 'arbitrary')
    When  -> transformAst(@ast, @createName)
    Then  -> assert.deepEqual @createName.firstCall.args[0].sort(), [
      'a', 'aFunction', 'andCaptureThis', 'anotherFunction', 'anotherVariable',
      'b', 'bar', 'baz', 'captureThis', 'data', 'error', 'foo', 'innerFunction',
      'invalidData', 'variable', 'window',
    ]

  describe 'placement of the string array:' ->
    Given -> @varName = 'arbitrary'
    Given -> @createName = ~> @varName

    describe 'uses the return value of `createName` to place an array at the begin:' ->
      Given -> @source = '1 + 1;'
      When  -> @obfuscated = transformAst(toAst(@source), @createName)
      Then  -> @toSource(@obfuscated) == "var #{@varName} = [];\n#{@source}"

    describe 'places variable name and array as parameter and arguments if the ast represents an IIFE:' ->
      Given -> @source = '(function() { 1 + 1; }());'
      Given -> @expected = "((function(#{@varName}) { 1 + 1; })([]));"
      When  -> @obfuscated = transformAst(toAst(@source), @createName)
      Then  -> @toSource(@obfuscated) == @expected

    describe 'appends to parameter and arguments lists of the IIFE:' ->
      Given -> @source = '(function(win) { alert(1 + 1); }(window));'
      Given -> @expected = "((function(win, #{@varName}) { alert(1 + 1); })(window, []));"
      When  -> @obfuscated = transformAst(toAst(@source), @createName)
      Then  -> @toSource(@obfuscated) == @expected

    describe 'works with variants where the IIFE is invoked with `call()`' ->
      Given -> @source = '(function() { this.alert(1 + 1); }.call(this));'
      Given -> @expected = "((function(#{@varName}) { this.alert(1 + 1); }).call(this, []));"
      When  -> @obfuscated = transformAst(toAst(@source), @createName)
      Then  -> @toSource(@obfuscated) == @expected
