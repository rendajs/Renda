import { assertEquals } from "std/testing/asserts.ts"
import { parseAttributeLocations } from "../../../../../../../src/rendering/renderers/webGl/glslParsing.js"

Deno.test({
	name: "two basic attributes",
	fn() {
		const code = `
			// @location(0)
			attribute vec3 a_position;
			// @location(1)
			attribute vec3 a_color;
		`
		const locations = parseAttributeLocations(code)
		assertEquals(locations, [
			{
				identifier: "a_position",
				location: 0,
			},
			{
				identifier: "a_color",
				location: 1,
			}
		])
	}
})

Deno.test({
	name: "One location tag is missing",
	fn() {
		const code = `
			// @location(0)
			attribute vec3 a_position;
			attribute vec3 a_missing;
			// @location(1)
			attribute vec3 a_color;
		`
		const locations = parseAttributeLocations(code)
		assertEquals(locations, [
			{
				identifier: "a_position",
				location: 0,
			},
			{
				identifier: "a_color",
				location: 1,
			}
		])
	}
})

Deno.test({
	name: "Some edge cases",
	fn() {
		const code = `
			// @location(0) some extra comment and @another tag
attribute vec3 a_position;
			// @location(1)
			attribute highp vec3 a_color;
			// @location ( 22 ) lots of spaces
			attribute   	   float a_brightness  ;
		`
		const locations = parseAttributeLocations(code)
		assertEquals(locations, [
			{
				identifier: "a_position",
				location: 0,
			},
			{
				identifier: "a_color",
				location: 1,
			},
			{
				identifier: "a_brightness",
				location: 22,
			}
		])
	}
})
