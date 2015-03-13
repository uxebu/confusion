{transformAst} = require './index'
{parse, print} = require 'recast'
{spy, assert} = require 'sinon'
assert = require('assert') <<< assert

toAst = (source) -> parse(source).program
toSource = (ast) -> print(ast).code

describe 'AST transformation:' ->

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

  describe 'uses the return value of `createName` to place an array at the begin:' ->
    Given -> @source = '1 + 1;'
    Given -> @varName = 'arbitrary'
    Given -> @createName = ~> @varName
    When  -> @obfuscated = transformAst(toAst(@source), @createName)
    Then  -> toSource(@obfuscated) == "var #{@varName} = [];\n#{@source}"
