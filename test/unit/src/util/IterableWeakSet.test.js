import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { IterableWeakSet } from "../../../../src/util/IterableWeakSet.js";
import { forceCleanup, runWithMockWeakRef } from "../../shared/mockWeakRef.js";

Deno.test({
	name: "Constructing with values and iterating over them",
	fn() {
		runWithMockWeakRef(() => {
			const a = {};
			const b = {};
			const c = {};
			const weakSet = new IterableWeakSet([a, b, c]);

			const values = Array.from(weakSet);
			assertStrictEquals(values[0], a);
			assertStrictEquals(values[1], b);
			assertStrictEquals(values[2], c);
		});
	},
});

Deno.test({
	name: "has",
	fn() {
		runWithMockWeakRef(() => {
			const a = {};
			const weakSet = new IterableWeakSet([a]);

			assertEquals(weakSet.has(a), true);
			assertEquals(weakSet.has({}), false);
		});
	},
});

Deno.test({
	name: "adding the same item twice",
	fn() {
		runWithMockWeakRef(() => {
			const a = {};
			/** @type {IterableWeakSet<{}>} */
			const weakSet = new IterableWeakSet();

			weakSet.add(a);
			weakSet.add(a);

			assertEquals(weakSet.has(a), true);
			assertEquals(weakSet.has({}), false);
			assertEquals(weakSet.size, 1);
		});
	},
});

Deno.test({
	name: "delete",
	fn() {
		runWithMockWeakRef(() => {
			const a = {};
			/** @type {IterableWeakSet<{}>} */
			const weakSet = new IterableWeakSet();

			weakSet.add(a);
			weakSet.add(a);
			weakSet.delete(a);

			assertEquals(weakSet.has(a), false);
			assertEquals(weakSet.size, 0);

			weakSet.add(a);

			assertEquals(weakSet.has(a), true);
			assertEquals(weakSet.has({}), false);
			assertEquals(weakSet.size, 1);
		});
	},
});

Deno.test({
	name: "Garbage collection removes items",
	fn() {
		runWithMockWeakRef(() => {
			const a = {};
			const b = {};
			/** @type {IterableWeakSet<{}>} */
			const weakSet = new IterableWeakSet();

			weakSet.add(a);
			forceCleanup(a);

			assertEquals(Array.from(weakSet), []);

			weakSet.add(b);
			forceCleanup(b);

			assertEquals(weakSet.has(b), false);
			assertEquals(weakSet.size, 0);
		});
	},
});
