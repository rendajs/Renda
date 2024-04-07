import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { forceCleanup, forceCleanupAll, runWithMockWeakRef } from "../../shared/mockWeakRef.js";
import { WeakValueMap } from "../../../../src/util/WeakValueMap.js";

Deno.test({
	name: "Passed array in constructor is applied",
	fn() {
		runWithMockWeakRef(() => {
			const refA = Symbol("A");
			const refB = Symbol("B");

			// @ts-expect-error #773
			const map = new WeakValueMap([
				[1, refA],
				[2, refB],
			]);

			assertStrictEquals(map.get(1), refA);
			assertEquals(map.has(1), true);

			forceCleanup(refA);

			assertEquals(map.get(1), undefined);
			assertEquals(map.has(1), false);
		});
	},
});

Deno.test({
	name: "Garbage collection removes values",
	fn() {
		runWithMockWeakRef(() => {
			const ref = Symbol("ref");

			const map = new WeakValueMap();
			// @ts-expect-error #773
			map.set(1, ref);

			assertStrictEquals(map.get(1), ref);
			assertEquals(map.has(1), true);

			forceCleanup(ref);

			assertEquals(map.get(1), undefined);
			assertEquals(map.has(1), false);
		});
	},
});

Deno.test({
	name: "Deleting deletes values",
	fn() {
		runWithMockWeakRef(() => {
			const ref = Symbol("ref");

			const map = new WeakValueMap();
			// @ts-expect-error #773
			map.set(1, ref);

			map.delete(1);

			const result = map.get(1);
			assertEquals(result, undefined);
		});
	},
});

Deno.test({
	name: "Overwriting values does not trigger deletion when the old ref is garbage collected",
	fn() {
		runWithMockWeakRef(() => {
			const refA = Symbol("ref A");
			const refB = Symbol("ref B");

			const map = new WeakValueMap();
			// @ts-expect-error #773
			map.set(1, refA);
			// @ts-expect-error #773
			map.set(1, refB);

			forceCleanup(refA);

			assertStrictEquals(map.get(1), refB);
		});
	},
});

Deno.test({
	name: "Multiple values",
	fn() {
		runWithMockWeakRef(() => {
			const refA = Symbol("ref A");
			const refB = Symbol("ref B");
			const refC = Symbol("ref D");

			// @ts-expect-error #773
			/** @type {WeakValueMap<string, symbol>} */
			// @ts-expect-error #773
			const map = new WeakValueMap();
			map.set("A", refA);
			map.set("B", refB);
			map.set("C", refC);
			map.set("B again", refB);

			// Deleting A
			assertStrictEquals(map.get("A"), refA);
			assertEquals(map.has("A"), true);

			map.delete("A");

			assertEquals(map.get("A"), undefined);
			assertEquals(map.has("A"), false);

			// Deleting B
			assertStrictEquals(map.get("B"), refB);
			assertStrictEquals(map.get("B again"), refB);
			assertEquals(map.has("B"), true);
			assertEquals(map.has("B again"), true);

			forceCleanup(refB);

			assertEquals(map.get("B"), undefined);
			assertEquals(map.get("B again"), undefined);
			assertEquals(map.has("B"), false);
			assertEquals(map.has("B again"), false);

			// Deleting C
			assertStrictEquals(map.get("C"), refC);
			assertEquals(map.has("C"), true);

			forceCleanupAll();

			assertEquals(map.get("C"), undefined);
			assertEquals(map.has("C"), false);
		});
	},
});
