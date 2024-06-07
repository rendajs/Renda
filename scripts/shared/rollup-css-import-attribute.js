/**
 * A rollup plugin that allows you to import css files like so:
 * ```js
 * import sheet from "./path/to/style.css" with { type: "css" }
 * document.adoptedStyleSheets = [sheet];
 * ```
 * @returns {import("$rollup").Plugin}
 */
export function cssImportAttributesPlugin() {
	return {
		name: "css-import-attributes",
		async resolveId(source, importer, options) {
			const { attributes } = options;
			if ("type" in attributes && attributes.type == "css") {
				const resolution = await this.resolve(source, importer, options);
				if (!resolution || resolution.external) return resolution;
				return {
					id: resolution.id,
					meta: {
						cssImportAttributes: {
							isCssType: true,
						},
					},
				};
			}
			return null;
		},
		transform(code, id) {
			const moduleInfo = this.getModuleInfo(id);
			const meta = moduleInfo?.meta;
			if (meta && "cssImportAttributes" in meta && meta.cssImportAttributes.isCssType) {
				const newCode = `const sheet = new CSSStyleSheet();sheet.replaceSync(\`${code}\`);export default sheet;`;
				return { code: newCode };
			}
		},
	};
}
