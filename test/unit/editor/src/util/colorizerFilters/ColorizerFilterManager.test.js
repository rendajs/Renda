import {assert, assertEquals, assertNotEquals, assertStrictEquals} from "asserts";
import {ColorizerFilterManager} from "../../../../../../editor/src/util/colorizerFilters/ColorizerFilterManager.js";
import {initializeDom} from "../../../shared/initializeDom.js";

initializeDom();

Deno.test({
	name: "constructor",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		new ColorizerFilterManager();

		assertEquals(document.body.childElementCount, 1);
	},
});

Deno.test({
	name: "getFilter",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const manager = new ColorizerFilterManager();

		const filter1 = manager.getFilter("red");
		const filter2 = manager.getFilter("red");
		const filter3 = manager.getFilter("green");

		assertStrictEquals(filter1, filter2);
		assert(filter1 !== filter3);
	},
});

Deno.test({
	name: "applyFilter",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const manager = new ColorizerFilterManager();
		const el = document.createElement("div");

		manager.applyFilter(el, "red");

		assertNotEquals(el.style.filter, "");
	},
});

Deno.test({
	name: "applyFilter twice",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const manager = new ColorizerFilterManager();
		const el = document.createElement("div");

		manager.applyFilter(el, "red");
		const redFilter = el.style.filter;

		manager.applyFilter(el, "blue");

		assertNotEquals(el.style.filter, redFilter);

		// The first filter should no longer exist
		assertEquals(manager.createdFilters.size, 1);
	},
});
