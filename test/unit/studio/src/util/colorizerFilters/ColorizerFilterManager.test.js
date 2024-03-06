import { assert, assertEquals, assertNotEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { ColorizerFilterManager } from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";
import { runWithDom } from "../../../shared/runWithDom.js";

Deno.test({
	name: "constructor",
	fn: () => {
		runWithDom(() => {
			new ColorizerFilterManager();

			assertEquals(document.body.children.length, 1);
		});
	},
});

Deno.test({
	name: "getFilter",
	fn: () => {
		runWithDom(() => {
			const manager = new ColorizerFilterManager();

			const filter1 = manager.getFilter("red");
			const filter2 = manager.getFilter("red");
			const filter3 = manager.getFilter("green");

			assertStrictEquals(filter1, filter2);
			assert(filter1 !== filter3);
		});
	},
});

Deno.test({
	name: "applyFilter",
	fn: () => {
		runWithDom(() => {
			const manager = new ColorizerFilterManager();
			const el = document.createElement("div");

			manager.applyFilter(el, "red");

			assertNotEquals(el.style.filter, "");
		});
	},
});

Deno.test({
	name: "applyFilter twice",
	fn: () => {
		runWithDom(() => {
			const manager = new ColorizerFilterManager();
			const el = document.createElement("div");

			manager.applyFilter(el, "red");
			const redFilter = el.style.filter;

			manager.applyFilter(el, "blue");

			assertNotEquals(el.style.filter, redFilter);

			// The first filter should no longer exist
			assertEquals(manager.createdFilters.size, 1);
		});
	},
});
