import {assertEquals} from "std/testing/asserts";
import {WebGpuMaterialMapTypeSerializer} from "../../../../../../../editor/src/assets/materialMapTypeSerializers/WebGpuMaterialMapTypeSerializer.js";
import {ShaderSource} from "../../../../../../../src/mod.js";

/**
 * @param {string} shaderSourceStr
 * @param {Object.<string, import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} expectedMappableValues
 */
function testFillMappableValuesForShaderResult(shaderSourceStr, expectedMappableValues) {
	const shaderSource = new ShaderSource(shaderSourceStr);
	/** @type {Map<string, import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
	const mappableValues = new Map();

	WebGpuMaterialMapTypeSerializer.fillMappableValuesForShader(shaderSource, mappableValues);

	/** @type {Object.<string, import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
	const mappableValuesObj = {};
	for (const [k, v] of mappableValues) {
		mappableValuesObj[k] = v;
	}
	assertEquals(mappableValuesObj, expectedMappableValues);
}

// ==== MaterialUniforms =======================================================

Deno.test({
	name: "fillMappableValuesForShader() with no MaterialUniforms struct",
	fn() {
		testFillMappableValuesForShaderResult("", {});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with MaterialUniforms struct with no fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {};
		`, {});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with MaterialUniforms struct with basic fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {
	numTest:f32,
	vec2Test: vec2<f32>,
	vec3Test :vec3<f32>,
	vec4Test : vec4<f32>,
};
		`, {
			numTest: {
				name: "numTest",
				type: "number",
			},
			vec2Test: {
				name: "vec2Test",
				type: "vec2",
			},
			vec3Test: {
				name: "vec3Test",
				type: "vec3",
			},
			vec4Test: {
				name: "vec4Test",
				type: "vec4",
			},
		});
	},
});

// ==== sampler ================================================================

Deno.test({
	name: "fillMappableValuesForShader() with a sampler",
	fn() {
		testFillMappableValuesForShaderResult(`
// basic sampler
@group(1) @binding(1)
var mySampler1: sampler;

// variable with address space
@group(1) @binding(2)
var<uniform,read_write> mySampler2: sampler;
		`, {
			mySampler1: {
				name: "mySampler1",
				type: "sampler",
			},
			mySampler2: {
				name: "mySampler2",
				type: "sampler",
			},
		});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with a sampler with invalid syntax",
	fn() {
		testFillMappableValuesForShaderResult(`
// sampler without binding
var mySampler: sampler;

// variable that is not a sampler
var myNotSampler: f32;
		`, {});
	},
});

// ==== texture_2d =============================================================

Deno.test({
	name: "fillMappableValuesForShader() with a texture",
	fn() {
		testFillMappableValuesForShaderResult(`
// basic texture
@group(1) @binding(1)
var myTexture: texture_2d<f32>;

// variable with address space
@group(1) @binding(2)
var<uniform> myTexture2: texture_2d<f32>;
		`, {
			myTexture: {
				name: "myTexture",
				type: "texture2d",
			},
			myTexture2: {
				name: "myTexture2",
				type: "texture2d",
			},
		});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with a texture with invalid syntax",
	fn() {
		testFillMappableValuesForShaderResult(`
// texture without binding
var myTexture: texture_2d<f32>;

// variable that is not a texture
var myNotTexture: f32;
		`, {});
	},
});
