import {transformAst} from '.';
import {parse, print} from 'recast';
import {spy} from 'sinon';
import assert from 'assert';

const toAst = source => parse(source).program;
const toSource = ast => print(ast).code;

describe('AST transformation:', function() {
  // `toSource` needs to be a property of the test object, since mocha-given
  // tries to eval().call(testObject) when tests fail. `toSource` is not in
  // scope in that case.
  Given(() => this.toSource = toSource);

  describe('passes an array of all encountered variable names to the `createName` callback:', () => {
    Given(() => this.ast = toAst(`
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

        var bar = window;
    `));

    Given(() => this.createName = spy(() => 'arbitrary'));
    When(() => transformAst(this.ast, this.createName));
    Then(() => assert.deepEqual(this.createName.firstCall.args[0].sort(), [
      'a', 'aFunction', 'andCaptureThis', 'anotherFunction', 'anotherVariable',
      'b', 'bar', 'baz', 'captureThis', 'data', 'error', 'foo', 'innerFunction',
      'invalidData', 'variable', 'window'
    ]));
  });

  describe('placement of the string array:', () => {
    Given(() => this.varName = 'arbitrary');
    Given(() => this.createName = () => this.varName);

    describe('uses the return value of `createName` to place an array at the begin:', () => {
      Given(() => this.source = '1 + 1;');
      When(() => this.obfuscated = transformAst(toAst(this.source), this.createName));
      Then(() => this.toSource(this.obfuscated) === `var ${this.varName} = [];\n${this.source}`);
    });

    describe('places variable name and array as parameter and arguments if the ast represents an IIFE:', () => {
      Given(() => this.source = '(function() { 1 + 1; }());');
      Given(() => this.expected = `((function(${this.varName}) { 1 + 1; })([]));`);
      When(() => this.obfuscated = transformAst(toAst(this.source), this.createName));
      Then(() => this.toSource(this.obfuscated) === this.expected);
    });

    describe('appends to parameter and arguments lists of the IIFE:', () => {
      Given(() => this.source = '(function(win) { alert(1 + 1); }(window));');
      Given(() => this.expected = `((function(win, ${this.varName}) { alert(1 + 1); })(window, []));`);
      When(() => this.obfuscated = transformAst(toAst(this.source), this.createName));
      Then(() => this.toSource(this.obfuscated) === this.expected);
    });

    describe('works with variants where the IIFE is invoked with `call()`', () => {
      Given(() => this.source = '(function() { this.alert(1 + 1); }.call(this));');
      Given(() => this.expected = `((function(${this.varName}) { this.alert(1 + 1); }).call(this, []));`);
      When(() => this.obfuscated = transformAst(toAst(this.source), this.createName));
      Then(() => this.toSource(this.obfuscated) === this.expected);
    });
  });
});
