import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { parseExpression, verifyExpression } from "../../../../../studio/src/keyboardShortcuts/conditionExpressions.js";

/** @type {Object<string, string[] | boolean | null>} */
const basicConditions = {
	isTrue: true,
	isFalse: false,
	isFoo: ["foo"],
	isBar: ["bar"],
	hasSpaces: ["space space space"],
	hasSyntax: ["syntax&&more||syntax"],
	multiple: ["foo", "bar"],
	missing: null,
};

/**
 * @param {string} expression
 * @param {import("../../../../../studio/src/keyboardShortcuts/conditionExpressions.js").ShortcutCommandAstNode} expectedAst
 * @param {boolean} expectedResult
 * @param {Partial<Deno.TestDefinition>} [options]
 */
function expressionAstTest(expression, expectedAst, expectedResult, options) {
	Deno.test({
		name: expression,
		fn() {
			const ast = parseExpression(expression);
			assertEquals(ast, expectedAst);
			const result = verifyExpression(ast, name => {
				return basicConditions[name] || false;
			});
			assertEquals(result, expectedResult);
		},
		...options,
	});
}

// basic booleans
expressionAstTest("isTrue", {
	type: "variable",
	name: "isTrue",
	isBoolean: true,
	value: "",
}, true);
expressionAstTest("isFalse", {
	type: "variable",
	name: "isFalse",
	isBoolean: true,
	value: "",
}, false);
expressionAstTest("isTrue && isFalse", {
	type: "operator",
	isAndOperation: true,
	leftCondition: {
		type: "variable",
		name: "isTrue",
		isBoolean: true,
		value: "",
	},
	rightCondition: {
		type: "variable",
		name: "isFalse",
		isBoolean: true,
		value: "",
	},
}, false);

// string equality
expressionAstTest("isFoo == 'foo'", {
	type: "variable",
	name: "isFoo",
	isBoolean: false,
	value: "foo",
}, true);
expressionAstTest("isFoo=='bar'", {
	type: "variable",
	name: "isFoo",
	isBoolean: false,
	value: "bar",
}, false);
expressionAstTest(`isFoo == "foo" `, {
	type: "variable",
	name: "isFoo",
	isBoolean: false,
	value: "foo",
}, true);
expressionAstTest(`isFoo != "foo" `, {
	type: "negate",
	child: {
		type: "variable",
		name: "isFoo",
		isBoolean: false,
		value: "foo",
	},
}, false);
expressionAstTest(`isFoo != "notfoo" `, {
	type: "negate",
	child: {
		type: "variable",
		name: "isFoo",
		isBoolean: false,
		value: "notfoo",
	},
}, true);

// Multiple
expressionAstTest("multiple == 'foo'", {
	type: "variable",
	isBoolean: false,
	name: "multiple",
	value: "foo",
}, true);
expressionAstTest("multiple == 'bar'", {
	type: "variable",
	isBoolean: false,
	name: "multiple",
	value: "bar",
}, true);
expressionAstTest("multiple == 'baz'", {
	type: "variable",
	isBoolean: false,
	name: "multiple",
	value: "baz",
}, false);

// Missing
expressionAstTest("missing", {
	type: "variable",
	isBoolean: true,
	name: "missing",
	value: "",
}, false);
expressionAstTest("missing == 'yes'", {
	type: "variable",
	isBoolean: false,
	name: "missing",
	value: "yes",
}, false);
expressionAstTest("missing != 'yes'", {
	type: "negate",
	child: {
		type: "variable",
		isBoolean: false,
		name: "missing",
		value: "yes",
	},
}, true);

// string edge cases
expressionAstTest(`hasSpaces == "space space space" `, {
	type: "variable",
	name: "hasSpaces",
	isBoolean: false,
	value: "space space space",
}, true);
expressionAstTest("hasSyntax == 'syntax&&more||syntax'", {
	type: "variable",
	name: "hasSyntax",
	isBoolean: false,
	value: "syntax&&more||syntax",
}, true);

// Brackets and operator order
expressionAstTest("(isTrue)", {
	type: "variable",
	name: "isTrue",
	isBoolean: true,
	value: "",
}, true);
expressionAstTest("(isTrue && isFalse) || !isFalse", {
	type: "operator",
	isAndOperation: false,
	leftCondition: {
		type: "operator",
		isAndOperation: true,
		leftCondition: {
			type: "variable",
			name: "isTrue",
			isBoolean: true,
			value: "",
		},
		rightCondition: {
			type: "variable",
			name: "isFalse",
			isBoolean: true,
			value: "",
		},
	},
	rightCondition: {
		type: "negate",
		child: {
			type: "variable",
			name: "isFalse",
			isBoolean: true,
			value: "",
		},
	},
}, true);
expressionAstTest("!(isTrue || isFalse) && isFalse", {
	type: "operator",
	isAndOperation: true,
	leftCondition: {
		type: "negate",
		child: {
			type: "operator",
			isAndOperation: false,
			leftCondition: {
				type: "variable",
				name: "isTrue",
				isBoolean: true,
				value: "",
			},
			rightCondition: {
				type: "variable",
				name: "isFalse",
				isBoolean: true,
				value: "",
			},
		},
	},
	rightCondition: {
		type: "variable",
		name: "isFalse",
		isBoolean: true,
		value: "",
	},
}, false);
expressionAstTest("isFalse && isTrue || isTrue", {
	type: "operator",
	isAndOperation: false,
	leftCondition: {
		type: "operator",
		isAndOperation: true,
		leftCondition: {
			type: "variable",
			name: "isFalse",
			isBoolean: true,
			value: "",
		},
		rightCondition: {
			type: "variable",
			name: "isTrue",
			isBoolean: true,
			value: "",
		},
	},
	rightCondition: {
		type: "variable",
		name: "isTrue",
		isBoolean: true,
		value: "",
	},
}, true);
expressionAstTest("isFalse && (isTrue || isTrue)", {
	type: "operator",
	isAndOperation: true,
	leftCondition: {
		type: "variable",
		name: "isFalse",
		isBoolean: true,
		value: "",
	},
	rightCondition: {
		type: "operator",
		isAndOperation: false,
		leftCondition: {
			type: "variable",
			name: "isTrue",
			isBoolean: true,
			value: "",
		},
		rightCondition: {
			type: "variable",
			name: "isTrue",
			isBoolean: true,
			value: "",
		},
	},
}, false);
expressionAstTest("isTrue || isFalse && isTrue", {
	type: "operator",
	isAndOperation: false,
	leftCondition: {
		type: "variable",
		name: "isTrue",
		isBoolean: true,
		value: "",
	},
	rightCondition: {
		type: "operator",
		isAndOperation: true,
		leftCondition: {
			type: "variable",
			name: "isFalse",
			isBoolean: true,
			value: "",
		},
		rightCondition: {
			type: "variable",
			name: "isTrue",
			isBoolean: true,
			value: "",
		},
	},
}, true);

/**
 * @param {string} expression
 * @param {Partial<Deno.TestDefinition>} [options]
 */
function invalidExpressionTest(expression, options) {
	Deno.test({
		name: expression,
		fn() {
			assertThrows(() => {
				parseExpression(expression);
			});
		},
		...options,
	});
}

invalidExpressionTest("missing ( bracket");
invalidExpressionTest("missing == quotes");
invalidExpressionTest("value_with_brackets == (other_variable)");
invalidExpressionTest("missing operator");
invalidExpressionTest(") wrong brackets (");
invalidExpressionTest("variable ( == 'yes' )");
invalidExpressionTest("&&");
invalidExpressionTest("variable &&");
invalidExpressionTest("&& variable");
