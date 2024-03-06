import { assertEquals } from "std/testing/asserts.ts";
import { stringArrayEquals } from "../../../../src/mod.js";

Deno.test({
	name: "two empty arrays",
	fn() {
		const result = stringArrayEquals([], []);
		assertEquals(result, true);
	},
});

Deno.test({
	name: "one empty array",
	fn() {
		const result = stringArrayEquals([], ["a"]);
		assertEquals(result, false);
	},
});

Deno.test({
	name: "two similar non-empty arrays",
	fn() {
		const result = stringArrayEquals(["a", "b"], ["a", "b"]);
		assertEquals(result, true);
	},
});

Deno.test({
	name: "two different non-empty arrays",
	fn() {
		const result = stringArrayEquals(["a", "b"], ["a", "c"]);
		assertEquals(result, false);
	},
});

Deno.test({
	name: "almost similar but different length",
	fn() {
		const result = stringArrayEquals(["a", "b"], ["a", "b", "c"]);
		assertEquals(result, false);
	},
});
