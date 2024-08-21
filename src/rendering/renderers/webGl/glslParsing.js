/**
 * Regex string for matching glsl identifiers according to the glsl spec:
 * https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.html#identifiers
 * @param {string} group
 */
export const identifierRegex = "(?:[a-zA-Z_][0-9a-zA-Z_]*)";

/**
 * @typedef ParsedAttributeLocation
 * @property {string} identifier The name of the attribute as it appears in the shader.
 * @property {number} location The shader location that the identifier was tagged with.
 */

/**
 * Finds all attributes in a shader and the value of the `@location` comment they are tagged with.
 * @param {string} shaderSource
 * @returns {ParsedAttributeLocation[]}
 */
export function parseAttributeLocations(shaderSource) {
	// This loosely follows
	// https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.html#shading-language-grammar:~:text=conditional_expression-,declaration%20%3A,-function_prototype%20SEMICOLON%0Ainit_declarator_list
	let attributesRegex = "";
	// Capture the location tag
	attributesRegex += "@location\\s*\\(\\s*(?<location>\\d+)\\s*\\)";
	// Allow whitespace or any other tags after the line that contains the location tag
	attributesRegex += ".*";
	// Only one new line allowed
	attributesRegex += "\\n";
	// Allow whitespace before the attribute keyword
	attributesRegex += "\\s*";
	// Attribute storage qualifier
	attributesRegex += "attribute";
	// any additional `type_qualifier`s
	attributesRegex += ".*";
	// at least one whitespace
	attributesRegex += "\\s";
	// Capture the IDENTIFIER
	attributesRegex += `(?<identifier>${identifierRegex})`;
	// whitespace
	attributesRegex += "\\s*";
	// SEMICOLON
	attributesRegex += ";"


	/** @type {ParsedAttributeLocation[]} */
	const parsedLocations = [];

	for (const match of shaderSource.matchAll(new RegExp(attributesRegex, "g"))) {
		if (!match.groups) continue;
		const identifier = match.groups.identifier;
		if (!identifier) continue;
		const location = match.groups.location;
		if (!location) continue;
		parsedLocations.push({
			identifier,
			location: parseInt(location, 10),
		});
	}

	return parsedLocations;
}
