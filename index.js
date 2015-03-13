'use strict';

var astTypes = require('ast-types');
var replace = require('estraverse').replace;

var namedTypes = astTypes.namedTypes;
var CallExpression = namedTypes.CallExpression;
var ExpressionStatement = namedTypes.ExpressionStatement;
var FunctionExpression = namedTypes.FunctionExpression;
var Identifier = namedTypes.Identifier;
var MemberExpression = namedTypes.MemberExpression;

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
  var place = getPlacement(ast.body);
  place(identifier(variableName), arrayExpression([]));

  return ast;
};

function getPlacement(body) {
  var isSingleStatement = body.length === 1;
  var firstStatement = body[0];
  if (isSingleStatement && isIife(firstStatement)) {
    return function(identifier, arrayExpression) {
      var call = firstStatement.expression, callee = call.callee;
      callee.params.push(identifier);
      call.arguments.push(arrayExpression);
    };
  }

  if (isSingleStatement && isIifeWithCall(firstStatement)) {
    return function(identifier, arrayExpression) {
      var call = firstStatement.expression, callee = call.callee.object;
      callee.params.push(identifier);
      call.arguments.push(arrayExpression);
    };
  }

  return function(identifier, arrayExpression) {
    body.unshift(
      variableDeclaration('var', [
        variableDeclarator(identifier, arrayExpression)
      ])
    );
  };
}

function isCallExpressionStatement(node) {
  return ExpressionStatement.check(node) &&
         CallExpression.check(node.expression);
}

function isIife(node) {
  return isCallExpressionStatement(node) &&
         FunctionExpression.check(node.expression.callee);
}

function isIifeInvokedWithCall(callExpression) {
  return MemberExpression.check(callExpression.callee) &&
         FunctionExpression.check(callExpression.callee.object) &&
         Identifier.check(callExpression.callee.property) &&
         callExpression.callee.property.name === 'call';
}

function isIifeWithCall(node) {
  return isCallExpressionStatement(node) &&
         isIifeInvokedWithCall(node.expression);
}
