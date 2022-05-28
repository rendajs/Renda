import {assertEquals} from "std/testing/asserts";
import {parseVertexInput} from "../../../../../src/util/wgslParsing.js";

Deno.test({
	name: "No VertexInput struct",
	fn() {
		const result = parseVertexInput("");
		assertEquals(result, []);
	},
});

Deno.test({
	name: "VertexInput struct with no fields",
	fn() {
		const result = parseVertexInput(`
			struct MaterialUniforms {};
		`);
		assertEquals(result, []);
	},
});

Deno.test({
	name: "VertexInput struct with basic fields",
	fn() {
		const result = parseVertexInput(`
			struct VertexInput {
				@location(0) loc0vec2 : vec2<f32>,
				@location(2)
				loc2vec3 : vec3<f32>,
				@location(1) loc1vec4 : vec4<f32>,
				@location(3)

				loc3f32: f32,
			};
		`);

		assertEquals(result, [
			{
				location: 0,
				identifier: "loc0vec2",
			},
			{
				location: 2,
				identifier: "loc2vec3",
			},
			{
				location: 1,
				identifier: "loc1vec4",
			},
			{
				location: 3,
				identifier: "loc3f32",
			},
		]);
	},
});
