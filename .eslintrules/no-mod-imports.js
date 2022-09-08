/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow imports of paths that end with 'mod.js'",
		},
		schema: [],
	},
	create: context => {
		const message = "Imports to 'mod.js' files are not allowed, import the object directly instead. Third party libraries should use the importmap.json";

		return {
			ImportDeclaration(node) {
				if (node.source.value.endsWith("mod.js")) {
					context.report({
						loc: node.source.loc,
						message,
					});
				}
			},
		};
	},
};
