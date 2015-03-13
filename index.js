'use strict';

var astTypes = require('ast-types');
var replace = require('estraverse').replace;

var Identifier = astTypes.namedTypes.Identifier;

var arrayExpression = astTypes.builders.arrayExpression;
var identifier = astTypes.builders.identifier;
var variableDeclaration = astTypes.builders.variableDeclaration;
var variableDeclarator = astTypes.builders.variableDeclarator;

exports.transformAst = function(ast, createVariableName) {
  var usedVariables = {};

  replace(ast, {
    enter: function(node) {
      if (Identifier.check(node)) {
        usedVariables[node.name] = true;
      }
    }
  });

  var variableName = createVariableName(Object.keys(usedVariables));
  ast.body.unshift(
    variableDeclaration('var', [
      variableDeclarator(identifier(variableName), arrayExpression([]))
    ])
  );

  return ast;
};
