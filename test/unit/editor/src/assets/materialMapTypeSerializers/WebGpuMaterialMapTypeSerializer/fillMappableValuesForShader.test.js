import {assertEquals} from "std/testing/asserts";
import {WebGpuMaterialMapTypeSerializer} from "../../../../../../../editor/src/assets/materialMapTypeSerializers/WebGpuMaterialMapTypeSerializer.js";
import {ShaderSource} from "../../../../../../../src/mod.js";

/**
 * @param {string} shaderSourceStr
 * @param {[string, import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue][]} expectedMappableValues
 */
function testFillMappableValuesForShaderResult(shaderSourceStr, expectedMappableValues) {
	const shaderSource = new ShaderSource(shaderSourceStr);
	/** @type {Map<string, import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
	const mappableValues = new Map();

	WebGpuMaterialMapTypeSerializer.fillMappableValuesForShader(shaderSource, mappableValues);

	assertEquals(Array.from(mappableValues), expectedMappableValues);
}

// ==== MaterialUniforms =======================================================

Deno.test({
	name: "with no MaterialUniforms struct",
	fn() {
		testFillMappableValuesForShaderResult("", []);
	},
});

Deno.test({
	name: "with MaterialUniforms struct with no fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {};
		`, []);
	},
});

Deno.test({
	name: "with MaterialUniforms struct with basic fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {
	numTest:f32,
	vec2Test: vec2<f32>,
	vec3Test :vec3<f32>,
	vec4Test : vec4<f32>,
};
		`, [
			[
				"numTest", {
					name: "numTest",
					type: "number",
				},
			],
			[
				"vec2Test", {
					name: "vec2Test",
					type: "vec2",
				},
			],
			[
				"vec3Test", {
					name: "vec3Test",
					type: "vec3",
				},
			],
			[
				"vec4Test", {
					name: "vec4Test",
					type: "vec4",
				},
			],
		]);
	},
});

// ==== sampler ================================================================

Deno.test({
	name: "with a sampler",
	fn() {
		testFillMappableValuesForShaderResult(`
// basic sampler
@group(1) @binding(1)
var mySampler1: sampler;

// variable with address space
@group(1) @binding(2)
var<uniform,read_write> mySampler2: sampler;
		`, [
			[
				"mySampler1", {
					name: "mySampler1",
					type: "sampler",
				},
			],
			[
				"mySampler2", {
					name: "mySampler2",
					type: "sampler",
				},
			],
		]);
	},
});

Deno.test({
	name: "with a sampler with invalid syntax",
	fn() {
		testFillMappableValuesForShaderResult(`
// sampler without binding
var mySampler: sampler;

// variable that is not a sampler
var myNotSampler: f32;
		`, []);
	},
});

// ==== texture_2d =============================================================

Deno.test({
	name: "with a texture",
	fn() {
		testFillMappableValuesForShaderResult(`
// basic texture
@group(1) @binding(1)
var myTexture: texture_2d<f32>;

// variable with address space
@group(1) @binding(2)
var<uniform> myTexture2: texture_2d<f32>;
		`, [
			[
				"myTexture", {
					name: "myTexture",
					type: "texture2d",
				},
			],
			[
				"myTexture2", {
					name: "myTexture2",
					type: "texture2d",
				},
			],
		]);
	},
});

Deno.test({
	name: "with a texture with invalid syntax",
	fn() {
		testFillMappableValuesForShaderResult(`
// texture without binding
var myTexture: texture_2d<f32>;

// variable that is not a texture
var myNotTexture: f32;
		`, []);
	},
});

// ==== misc ===================================================================

Deno.test({
	name: "with multiple different asset types interleaved",
	fn() {
		testFillMappableValuesForShaderResult(`
@group(1) @binding(1)
var texture1: texture_2d<f32>;

@group(1) @binding(2)
var sampler1: sampler;

@group(1) @binding(3)
var texture2: texture_2d<f32>;

@group(1) @binding(4)
var sampler2: sampler;
		`, [
			[
				"texture1",
				{
					name: "texture1",
					type: "texture2d",
				},
			],
			[
				"sampler1", {
					name: "sampler1",
					type: "sampler",
				},
			],
			[
				"texture2", {
					name: "texture2",
					type: "texture2d",
				},
			],
			[
				"sampler2",
				{
					name: "sampler2",
					type: "sampler",
				},
			],
		]);
	},
});

Deno.test({
	name: "ignores the order in the shader and uses binding attribute for ordering",
	fn() {
		testFillMappableValuesForShaderResult(`
@group(1) @binding(4)
var sampler2: sampler;

@group(1) @binding(1)
var texture1: texture_2d<f32>;

@group(1) @binding(3)
var texture2: texture_2d<f32>;

@group(1) @binding(2)
var sampler1: sampler;
		`, [
			[
				"texture1",
				{
					name: "texture1",
					type: "texture2d",
				},
			],
			[
				"sampler1", {
					name: "sampler1",
					type: "sampler",
				},
			],
			[
				"texture2", {
					name: "texture2",
					type: "texture2d",
				},
			],
			[
				"sampler2",
				{
					name: "sampler2",
					type: "sampler",
				},
			],
		]);
	},
});
