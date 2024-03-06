import { assertEquals } from "std/testing/asserts.ts";
import { parseBindings } from "../../../../../src/util/wgslParsing.js";

Deno.test({
	name: "with a sampler",
	fn() {
		const result = parseBindings(`
// basic sampler
@group(1) @binding(1)
var mySampler1: sampler;

// variable with address space
@group(1) @binding(2)
var<uniform,read_write> mySampler2: sampler;

// one line
@group(2) @binding(3) var mySampler3: sampler;

// sampler without binding
var mySampler4: sampler;

// variable that is not a sampler
@group(1) @binding(2)
var myNotSampler5: f32;

// invalid group value
@group(NaN) @binding(2)
var mySampler6: sampler;

// invalid binding value
@group(1) @binding()
var mySampler7: sampler;
		`);
		assertEquals(result, [
			{
				identifier: "mySampler1",
				type: "sampler",
				group: 1,
				binding: 1,
			},
			{
				identifier: "mySampler2",
				type: "sampler",
				group: 1,
				binding: 2,
			},
			{
				identifier: "mySampler3",
				type: "sampler",
				group: 2,
				binding: 3,
			},
		]);
	},
});

Deno.test({
	name: "with a texture",
	fn() {
		const result = parseBindings(`
// basic sampler
@group(1) @binding(1)
var myTexture1: texture_2d<f32>;

// variable with address space
@group(1) @binding(2)
var<uniform,read_write> myTexture2: texture_2d<f32>;

// one line
@group(2) @binding(3) var myTexture3: texture_2d<f32>;

// sampler without binding
var myTexture4: texture_2d<f32>;

// variable that is not a sampler
@group(1) @binding(2)
var myNotSampler5: f32;

// invalid group value
@group(NaN) @binding(2)
var myTexture6: texture_2d<f32>;

// invalid binding value
@group(1) @binding()
var myTexture7: texture_2d<f32>;
		`);
		assertEquals(result, [
			{
				identifier: "myTexture1",
				type: "texture2d",
				group: 1,
				binding: 1,
			},
			{
				identifier: "myTexture2",
				type: "texture2d",
				group: 1,
				binding: 2,
			},
			{
				identifier: "myTexture3",
				type: "texture2d",
				group: 2,
				binding: 3,
			},
		]);
	},
});

Deno.test({
	name: "with multiple different asset types interleaved",
	fn() {
		const result = parseBindings(`
@group(1) @binding(1)
var texture1: texture_2d<f32>;

@group(1) @binding(2)
var sampler1: sampler;

@group(1) @binding(3)
var texture2: texture_2d<f32>;

@group(1) @binding(4)
var sampler2: sampler;
		`);
		assertEquals(result, [
			{
				identifier: "texture1",
				type: "texture2d",
				group: 1,
				binding: 1,
			},
			{
				identifier: "sampler1",
				type: "sampler",
				group: 1,
				binding: 2,
			},
			{
				identifier: "texture2",
				type: "texture2d",
				group: 1,
				binding: 3,
			},
			{
				identifier: "sampler2",
				type: "sampler",
				group: 1,
				binding: 4,
			},
		]);
	},
});

Deno.test({
	name: "ignores the order in the shader and uses binding attribute for ordering",
	fn() {
		const result = parseBindings(`
@group(1) @binding(4)
var sampler2: sampler;

@group(1) @binding(1)
var texture1: texture_2d<f32>;

@group(1) @binding(3)
var texture2: texture_2d<f32>;

@group(1) @binding(2)
var sampler1: sampler;
		`);

		assertEquals(result, [
			{
				identifier: "texture1",
				type: "texture2d",
				group: 1,
				binding: 1,
			},
			{
				identifier: "sampler1",
				type: "sampler",
				group: 1,
				binding: 2,
			},
			{
				identifier: "texture2",
				type: "texture2d",
				group: 1,
				binding: 3,
			},
			{
				identifier: "sampler2",
				type: "sampler",
				group: 1,
				binding: 4,
			},
		]);
	},
});
