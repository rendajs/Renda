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
				const value = node.source.value;
				if (value && typeof value == "string" && value.endsWith("mod.js")) {
					const loc = node.source.loc;
					if (loc) {
						context.report({loc, message});
					}
				}
			},
		};
	},
};
