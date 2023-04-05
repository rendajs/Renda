import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {MultiKeyWeakMap} from "../../../../src/mod.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../shared/mockWeakRef.js";

Deno.test({
	name: "Getting and setting values with different key lengths",
	fn() {
		installMockWeakRef();

		try {
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
		} finally {
			uninstallMockWeakRef();
		}
	},
});

Deno.test({
	name: "Overwriting keys",
	fn() {
		installMockWeakRef();

		try {
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
		} finally {
			uninstallMockWeakRef();
		}
	},
});

Deno.test({
	name: "Deleting keys",
	fn() {
		installMockWeakRef();

		try {
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
		} finally {
			uninstallMockWeakRef();
		}
	},
});

Deno.test({
	name: "Deleting key that has been garbage collected",
	fn() {
		installMockWeakRef();

		try {
			const map = new MultiKeyWeakMap();
			const symA = Symbol("a");
			const symB = Symbol("b");

			const object = Symbol("object");

			map.set([symA, symB], object);

			forceCleanup(symB);

			assertEquals(map.delete([symA, symB]), false);
		} finally {
			uninstallMockWeakRef();
		}
	},
});
