import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {GlobalPreferencesLocation} from "../../../../../../studio/src/preferences/preferencesLocation/GlobalPreferencesLocation.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {IndexedDbUtil, forcePendingOperations} from "../../../shared/MockIndexedDbUtil.js";

Deno.test({
	name: "Saving and loading",
	async fn() {
		const mockIndexedDb1 = new IndexedDbUtil("savingAndLoadingTest");
		const location1 = new GlobalPreferencesLocation(mockIndexedDb1);

		// Wait for load
		await waitForMicrotasks();

		location1.set("preference1", "value");
		location1.set("preference1", "new value");
		location1.set("preference2", true);

		await location1.flush();

		const mockIndexedDb2 = new IndexedDbUtil("savingAndLoadingTest");
		const location2 = new GlobalPreferencesLocation(mockIndexedDb2);

		// Wait for load
		await waitForMicrotasks();

		assertEquals(location2.get("preference1"), "new value");
		assertEquals(location2.get("preference2"), true);
	},
});

Deno.test({
	name: "Flushing while preferences are loading fails",
	async fn() {
		const mockIndexedDb1 = new IndexedDbUtil("flushingWhileLoadingTest");
		const location1 = new GlobalPreferencesLocation(mockIndexedDb1);

		// Wait for load
		await waitForMicrotasks();

		location1.set("preference", "value");
		await location1.flush();

		forcePendingOperations(true);
		const mockIndexedDb2 = new IndexedDbUtil("flushingWhileLoadingTest");
		const location2 = new GlobalPreferencesLocation(mockIndexedDb2);

		await assertRejects(async () => {
			await location2.flush();
		});

		// Wait for load
		forcePendingOperations(false);
		await waitForMicrotasks();
		await location2.flush();

		// Make sure the preference still exists
		assertEquals(location2.get("preference"), "value");
	},
});
