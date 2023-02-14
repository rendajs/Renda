import {assertEquals} from "std/testing/asserts.ts";
import {ColorizerFilter} from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilter.js";
import {forceCleanup, installMockWeakRef, uninstallMockWeakRef} from "../../../../shared/mockWeakRef.js";
import {runWithDom} from "../../../shared/runWithDom.js";

Deno.test({
	name: "Construction",
	fn: () => {
		runWithDom(() => {
			const container = document.createElement("div");
			new ColorizerFilter("blue", container);

			assertEquals(container.children.length, 1);
		});
	},
});

Deno.test({
	name: "Destruction",
	fn: () => {
		runWithDom(() => {
			const container = document.createElement("div");
			const filter = new ColorizerFilter("blue", container);

			filter.destructor();

			assertEquals(container.children.length, 0);
		});
	},
});

Deno.test({
	name: "setFilterId getFilterId",
	fn: () => {
		runWithDom(() => {
			const container = document.createElement("div");
			const filter = new ColorizerFilter("blue", container);
			const filterId = "filterId";

			filter.setFilterId(filterId);

			assertEquals(filter.getFilterId(), filterId);

			const filterEl = container.children[0].children[0];
			assertEquals(filterEl?.id, filterId);
		});
	},
});

Deno.test({
	name: "getUsageReference",
	fn: () => {
		runWithDom(() => {
			const container = document.createElement("div");
			const filter = new ColorizerFilter("blue", container);
			let allReferencesDestructedCallCount = 0;

			const usageRef = filter.getUsageReference();
			filter.onAllReferencesDestructed(() => {
				allReferencesDestructedCallCount++;
			});
			filter.notifyReferenceDestructed(usageRef);

			assertEquals(allReferencesDestructedCallCount, 1);
		});
	},
});

Deno.test({
	name: "garbage collection",
	fn: () => {
		runWithDom(() => {
			installMockWeakRef();
			try {
				const container = document.createElement("div");
				const filter = new ColorizerFilter("blue", container);
				let allReferencesDestructedCallCount = 0;

				const usageRef = filter.getUsageReference();
				filter.onAllReferencesDestructed(() => {
					allReferencesDestructedCallCount++;
				});
				forceCleanup(usageRef);

				assertEquals(allReferencesDestructedCallCount, 1);
			} finally {
				uninstallMockWeakRef();
			}
		});
	},
});
