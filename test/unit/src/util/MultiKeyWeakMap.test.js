import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {MultiKeyWeakMap} from "../../../../src/mod.js";
import {forceCleanup, forceCleanupAll, runWithMockWeakRef} from "../../shared/mockWeakRef.js";

Deno.test({
	name: "Constructing with values",
	fn() {
		runWithMockWeakRef(() => {
			const symA = Symbol("a");
			const symB = Symbol("b");
			const map = new MultiKeyWeakMap([
				[[symA, symB], 1],
				[[symA], 2],
			]);

			assertEquals(map.get([symA, symB]), 1);
			assertEquals(map.get([symA]), 2);
		});
	},
});

Deno.test({
	name: "Getting and setting values with different key lengths",
	fn() {
		runWithMockWeakRef(() => {
			const map = new MultiKeyWeakMap();
			const symA = Symbol("a");
			const symB = Symbol("b");
			const symC = Symbol("c");
			const symD = Symbol("d");

			const objectA = Symbol("objectA");
			const objectB = Symbol("objectB");
			const objectC = Symbol("objectC");

			map.set([symA, symB, symC], objectA);
			map.set([symA, symB], objectB);
			map.set([symA, symB, symD], objectC);

			assertEquals(map.get([symA]), undefined);
			assertStrictEquals(map.get([symA, symB, symC]), objectA);
			assertStrictEquals(map.get([symA, symB]), objectB);
			assertStrictEquals(map.get([symA, symB, symD]), objectC);

			assertEquals(map.has([symA]), false);
			assertEquals(map.has([symA, symB, symC]), true);
			assertEquals(map.has([symA, symB]), true);
			assertEquals(map.has([symA, symB, symD]), true);

			forceCleanup(symB);

			assertEquals(map.get([symA, symB, symC]), undefined);
			assertEquals(map.get([symA, symB]), undefined);
			assertEquals(map.get([symA, symB, symD]), undefined);

			assertEquals(map.has([symA, symB, symC]), false);
			assertEquals(map.has([symA, symB]), false);
			assertEquals(map.has([symA, symB, symD]), false);
		});
	},
});

Deno.test({
	name: "Overwriting keys",
	fn() {
		runWithMockWeakRef(() => {
			const map = new MultiKeyWeakMap();
			const symA = Symbol("a");
			const symB = Symbol("b");
			const symC = Symbol("c");

			const objectA = Symbol("objectA");
			const objectB = Symbol("objectB");

			map.set([symA, symB, symC], objectA);
			map.set([symA, symB], objectB);
			map.set([symA, symB, symC], objectB);

			assertStrictEquals(map.get([symA, symB]), objectB);
			assertStrictEquals(map.get([symA, symB, symC]), objectB);

			forceCleanup(symC);

			assertStrictEquals(map.get([symA, symB]), objectB);
			assertEquals(map.get([symA, symB, symC]), undefined);
		});
	},
});

Deno.test({
	name: "Deleting keys",
	fn() {
		runWithMockWeakRef(() => {
			const map = new MultiKeyWeakMap();
			const symA = Symbol("a");
			const symB = Symbol("b");
			const symC = Symbol("c");

			const object = Symbol("object");

			map.set([symA, symB], object);
			map.set([symA, symB, symC], object);

			assertStrictEquals(map.get([symA, symB]), object);
			assertStrictEquals(map.get([symA, symB, symC]), object);

			const result1 = map.delete([symA, symB]);
			assertEquals(result1, true);

			const result2 = map.delete([symA, symB]);
			assertEquals(result2, false);

			assertEquals(map.get([symA, symB]), undefined);
			assertStrictEquals(map.get([symA, symB, symC]), object);

			map.delete([symA, symB, symC]);

			assertEquals(map.get([symA, symB]), undefined);
			assertEquals(map.get([symA, symB, symC]), undefined);
		});
	},
});

Deno.test({
	name: "Deleting key that has been garbage collected",
	fn() {
		runWithMockWeakRef(() => {
			const map = new MultiKeyWeakMap();
			const symA = Symbol("a");
			const symB = Symbol("b");

			const object = Symbol("object");

			map.set([symA, symB], object);

			forceCleanup(symB);

			assertEquals(map.delete([symA, symB]), false);
		});
	},
});

Deno.test({
	name: "Using non-objects as keys throws by default",
	fn() {
		runWithMockWeakRef(() => {
			assertThrows(() => {
				new MultiKeyWeakMap([[["a", "b"], 1]]);
			}, Error, "MultiKeyWeakMap only supports objects as keys. If you want to use non-objects as keys, set allowNonObjects to true.");

			const map = new MultiKeyWeakMap();
			assertThrows(() => {
				map.set(["a", "b"], 1);
			}, Error, "MultiKeyWeakMap only supports objects as keys. If you want to use non-objects as keys, set allowNonObjects to true.");
			assertThrows(() => {
				map.set([1, 2], 1);
			}, Error, "MultiKeyWeakMap only supports objects as keys. If you want to use non-objects as keys, set allowNonObjects to true.");
			assertThrows(() => {
				map.set([null, undefined], 1);
			}, Error, "MultiKeyWeakMap only supports objects as keys. If you want to use non-objects as keys, set allowNonObjects to true.");
		});
	},
});

Deno.test({
	name: "Using string as keys",
	fn() {
		const symA = Symbol("a");
		const symB = Symbol("b");
		const stringKey = "stringKey";

		const tests = [
			[symA, stringKey, symB],
			[symA, stringKey],
			[symA, stringKey, symB, stringKey],
			[symA, stringKey, symB, stringKey, symB],
			[stringKey, symA, symB],
			[stringKey, symA, symB, stringKey],
		];

		for (const test of tests) {
			runWithMockWeakRef(() => {
				const object = Symbol("object");
				const map = new MultiKeyWeakMap([], {allowNonObjects: true});
				map.set(test, object);
				assertStrictEquals(map.get(test), object);
				assertEquals(map.has(test), true);
				assertEquals(map.delete(test), true);
				assertEquals(map.delete(test), false);
				assertEquals(map.get(test), undefined);
				assertEquals(map.has(test), false);
			});

			runWithMockWeakRef(() => {
				const object = Symbol("object");
				const map = new MultiKeyWeakMap([], {allowNonObjects: true});
				map.set(test, object);
				assertStrictEquals(map.get(test), object);
				assertEquals(map.has(test), true);
				forceCleanupAll();
				assertEquals(map.delete(test), false);
				assertEquals(map.get(test), undefined);
				assertEquals(map.has(test), false);
			});
		}
	},
});

Deno.test({
	name: "Multiple strings",
	fn() {
		runWithMockWeakRef(() => {
			const map = new MultiKeyWeakMap([], {allowNonObjects: true});

			const objectA = Symbol("objectA");
			const objectB = Symbol("objectB");

			map.set(["a", "b"], objectA);
			map.set(["a", "c"], objectB);

			assertStrictEquals(map.get(["a", "b"]), objectA);
			assertStrictEquals(map.get(["a", "c"]), objectB);
		});
	},
});
