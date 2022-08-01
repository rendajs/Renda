import {assertEquals} from "std/testing/asserts.ts";
import {parseMaterialUniforms} from "../../../../../src/util/wgslParsing.js";

Deno.test({
	name: "no MaterialUniforms struct",
	fn() {
		const result = parseMaterialUniforms("");
		assertEquals(result, []);
	},
});

Deno.test({
	name: "MaterialUniforms struct with no fields",
	fn() {
		const result = parseMaterialUniforms(`
			struct MaterialUniforms {};
		`);
		assertEquals(result, []);
	},
});

Deno.test({
	name: "MaterialUniforms struct with basic fields",
	fn() {
		const result = parseMaterialUniforms(`
struct MaterialUniforms {
	numTest:f32,
	vec2Test: vec2<f32>,
	vec3Test :vec3<f32>,
	vec4Test : vec4<f32>,
};
		`);

		assertEquals(result, [
			{
				identifier: "numTest",
				type: "number",
			},
			{
				identifier: "vec2Test",
				type: "vec2",
			},
			{
				identifier: "vec3Test",
				type: "vec3",
			},
			{
				identifier: "vec4Test",
				type: "vec4",
			},
		]);
	},
});
