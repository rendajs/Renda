module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow this in static class methods",
		},
		schema: [],
	},
	create: context => {
		const stack = [];

		function enterFunction(node) {
			stack.push(node);
		}

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
