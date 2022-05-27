/**
 * Regex string for matching wgsl identifiers according to the wgsl spec:
 * https://gpuweb.github.io/gpuweb/wgsl/#identifiers
 * @param {string} group
 */
export const identifierRegex = "(?:(?:[a-zA-Z_][0-9a-zA-Z][0-9a-zA-Z_]*)|(?:[a-zA-Z][0-9a-zA-Z_]*))";

/**
 * @typedef ParsedMaterialUniform
 * @property {string} identifier The name of the uniform as it appears in the shader
 * @property {"number" | "vec2" | "vec3" | "vec4"} type The type of the uniform
 */

/**
 * Finds a struct in the shader named MaterialUniforms and returns the fields of that struct.
 * @param {string} shaderSource
 */
export function parseMaterialUniforms(shaderSource) {
	const blockRegex = /struct\s+MaterialUniforms\s*{(?<uniformsBlock>[\s\S]+?)}\s*;/;
	const match = shaderSource.match(blockRegex);
	/** @type {ParsedMaterialUniform[]} */
	const parsedUniforms = [];
	if (match && match.groups) {
		const uniformsBlock = match.groups.uniformsBlock;
		if (uniformsBlock) {
			let membersRegex = "";
			// Capture the identifier https://gpuweb.github.io/gpuweb/wgsl/#identifiers
			membersRegex += `(?<identifier>${identifierRegex})`;
			// [whitespace] : [whitespace]
			membersRegex += "\\s*:\\s*";
			// Capture the type
			membersRegex += "(?<type>.+?)";
			// [whitespace] ;
			membersRegex += "\\s*,";
			const vectorTypeRegex = /vec(?<vectorSize>[234])<(?<vectorType>\S+)>/;
			const matrixTypeRegex = /mat(?<rows>[234])x(?<columns>[234])<(?<matrixType>\S+)>/;
			for (const match of uniformsBlock.matchAll(new RegExp(membersRegex, "g"))) {
				if (!match.groups) continue;
				const identifier = match.groups.identifier;
				let type = match.groups.type;
				if (!identifier || !type) continue;
				const vectorMatch = match[0].match(vectorTypeRegex);
				let isVector = false;
				let vectorSize = 0;
				let isMatrix = false;
				// let matrixRows = 0;
				// let matrixColumns = 0;
				if (vectorMatch && vectorMatch.groups) {
					isVector = true;
					vectorSize = Number(vectorMatch.groups.vectorSize);
					type = vectorMatch.groups.vectorType;
				} else {
					const matrixMatch = match[0].match(matrixTypeRegex);
					if (matrixMatch && matrixMatch.groups) {
						isMatrix = true;
						// matrixRows = Number(matrixMatch.groups.rows);
						// matrixColumns = Number(matrixMatch.groups.columns);
						type = matrixMatch.groups.matrixType;
					}
				}
				/** @type {import("../../editor/src/ui/propertiesTreeView/types.js").GuiTypes} */
				let mappableValueType = "number";
				if (isVector) {
					if (vectorSize == 2) {
						mappableValueType = "vec2";
					} else if (vectorSize == 3) {
						mappableValueType = "vec3";
					} else if (vectorSize == 4) {
						mappableValueType = "vec4";
					}
				} else if (isMatrix) {
					// todo implement matrix ui
					continue;
				}
				parsedUniforms.push({
					identifier,
					type: mappableValueType,
				});
			}
		}
	}
	return parsedUniforms;
}

/**
 * @typedef {"sampler" | "texture2d"} BindingType
 */

/**
 * @typedef ParsedBinding
 * @property {string} identifier The name of the binding as it appears in the shader
 * @property {BindingType} type The type of the binding
 * @property {number} group The value of the group parameter of the binding
 * @property {number} binding The value of the binding parameter of the binding
 */

/**
 * Gets top level bindings in the shader with the syntax
 * `@group(1) @binding(1) var identifier : sampler;`
 * For now only samplers and textures are supported.
 * @param {string} shaderSource
 */
export function parseBindings(shaderSource) {
	/** @type {ParsedBinding[]} */
	const parsedBindings = [];
	/** @type {{wlslType: string, mappableValueType: BindingType}[]} */
	const variableTypes = [
		{wlslType: "sampler", mappableValueType: "sampler"},
		{wlslType: "texture_2d", mappableValueType: "texture2d"},
	];
	for (const varType of variableTypes) {
		let varRegex = "";
		// Capture one or more attributes, each individual attribute will
		// be parsed later to find out if the variable contains at least
		// a group and a binding.
		varRegex += `(?<attributes>(?:@${identifierRegex}+\\(\\d+\\)\\s*)*)`;
		// find the var keyword
		varRegex += "var";
		// allow an optional address space such as var<uniform>
		// We'll use a basic \S+ regex to to allow for multiple identifiers
		// such as var<uniform, read_write>. We won't use `identifierRegex`
		// here as it would cause catastrophic backtracking
		// https://www.regular-expressions.info/catastrophic.html
		// If we ever need to parse the address space values later, we will
		// do so using a separate regex.
		varRegex += `(?:<\\S+?>)?`;
		// allow optional whitespace
		varRegex += "\\s*";
		// capture the variable name
		varRegex += `(?<identifier>${identifierRegex})`;
		// [whitespace] : [whitespace]
		varRegex += "\\s*:\\s*";
		// find only variables of type sampler or texture_2d, depending on
		// which loop we are in
		varRegex += varType.wlslType;

		const variableMatches = Array.from(shaderSource.matchAll(new RegExp(varRegex, "g")));
		for (const variableMatch of variableMatches) {
			if (!variableMatch.groups) continue;
			const identifier = variableMatch.groups.identifier;
			if (!identifier) continue;
			const attributes = variableMatch.groups.attributes;
			if (!attributes) continue;
			let attributesRegex = "";
			// @
			attributesRegex += "@";
			// capture the identifier
			attributesRegex += `(?<name>${identifierRegex})`;
			// (
			attributesRegex += "\\(";
			// capture the value
			attributesRegex += `(?<value>\\d+)`;
			// )
			attributesRegex += "\\)";

			let group = null;
			let binding = null;
			for (const attributeMatch of attributes.matchAll(new RegExp(attributesRegex, "g"))) {
				if (!attributeMatch.groups) continue;
				const name = attributeMatch.groups.name;
				const value = attributeMatch.groups.value;
				if (!name || !value) continue;
				if (name == "group") {
					group = parseInt(value, 10);
				}
				if (name == "binding") {
					binding = parseInt(value, 10);
				}
			}
			if (binding == null || group == null) continue;
			parsedBindings.push({
				identifier,
				type: varType.mappableValueType,
				group,
				binding,
			});
		}
	}
	parsedBindings.sort((a, b) => a.binding - b.binding);

	return parsedBindings;
}
