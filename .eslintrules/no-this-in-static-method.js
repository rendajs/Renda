/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow this in static class methods",
		},
		schema: [],
	},
	create: context => {
		/** @typedef {import("eslint").Rule.NodeParentExtension} ASTNode */

		/** @type {ASTNode[]} */
		const stack = [];

		/**
		 * @param {ASTNode} node
		 */
		function enterFunction(node) {
			stack.push(node);
		}

		/**
		 * @param {ASTNode} node
		 */
		function exitFunction(node) {
			stack.pop();
		}

		function getCurrentStackNode() {
			return stack[stack.length - 1];
		}

		return {
			FunctionDeclaration: enterFunction,
			"FunctionDeclaration:exit": exitFunction,
			FunctionExpression: enterFunction,
			"FunctionExpression:exit": exitFunction,

			ThisExpression(node) {
				const current = getCurrentStackNode();
				if (current && current.parent.static) {
					context.report({
						node,
						message: "Closure Compiler does not support `this` inside static functions.",
					});
				}
			},
		};
	},
};
