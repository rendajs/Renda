/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow default exports.",
		},
		schema: [],
	},
	create: context => {
		const message = "Default exports are not allowed";

		return {
			ExportDefaultDeclaration(node) {
				const tokens = context.getSourceCode().getFirstTokens(node);
				for (const token of tokens) {
					if (token.type == "Keyword" && token.value == "default") {
						context.report({
							loc: token.loc,
							message,
						});
						break;
					}
				}
			},

			ExportNamedDeclaration(node) {
				const defaultExports = node.specifiers.filter(specifier => specifier.exported.name == "default");
				for (const defaultExport of defaultExports) {
					const loc = defaultExport.exported.loc;
					if (loc) {
						context.report({loc, message});
					}
				}
			},
		};
	},
};
