import { assertEquals } from "std/testing/asserts.ts";
import { parseMaterialUniforms } from "../../../../../src/util/wgslParsing.js";

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

Deno.test({
	name: "MaterialUniforms with some scalars",
	fn() {
		const result = parseMaterialUniforms(`
			struct MaterialUniforms {
				scalar1: f16,
				scalar2:f32,
				scalar3: i32,
				scalar4:   u32,
			};
		`);

		assertEquals(result, [
			{
				identifier: "scalar1",
				type: "number",
			},
			{
				identifier: "scalar2",
				type: "number",
			},
			{
				identifier: "scalar3",
				type: "number",
			},
			{
				identifier: "scalar4",
				type: "number",
			},
		]);
	},
});

Deno.test({
	name: "MaterialUniforms with unknown fields",
	fn() {
		const result = parseMaterialUniforms(`
			struct MaterialUniforms {
				basic1: f32,
				custom: SomeStruct,
				basic2: f32,
			};

			struct SomeStruct {
				foo: f32,
			};
		`);

		assertEquals(result, [
			{
				identifier: "basic1",
				type: "number",
			},
			{
				identifier: "custom",
				type: "unknown",
			},
			{
				identifier: "basic2",
				type: "number",
			},
		]);
	},
});
