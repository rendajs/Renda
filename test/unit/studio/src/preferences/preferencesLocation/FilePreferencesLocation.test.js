import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {FilePreferencesLocation} from "../../../../../../studio/src/preferences/preferencesLocation/FilePreferencesLocation.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";

Deno.test({
	name: "Does not create a file until a setting is changed",
	async fn() {
		const fs = new MemoryStudioFileSystem();
		const location = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		// Wait for load
		await waitForMicrotasks();

		assertEquals(await fs.exists(["preferences.json"]), false);

		location.set("preference", "value");
		assertEquals(await fs.exists(["preferences.json"]), false);
		await location.flush();
		assertEquals(await fs.exists(["preferences.json"]), true);
	},
});

Deno.test({
	name: "Saving and loading",
	async fn() {
		const fs = new MemoryStudioFileSystem();
		const location1 = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		// Wait for load
		await waitForMicrotasks();

		location1.set("preference1", "value");
		location1.set("preference1", "new value");
		location1.set("preference2", true);

		await location1.flush();

		const location2 = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		// Wait for load
		await waitForMicrotasks();

		assertEquals(location2.get("preference1"), "new value");
		assertEquals(location2.get("preference2"), true);
	},
});

Deno.test({
	name: "Flushing while preferences are loading fails",
	async fn() {
		const fs = new MemoryStudioFileSystem();
		const location1 = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		// Wait for load
		await waitForMicrotasks();

		location1.set("preference", "value");
		await location1.flush();

		const location2 = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		await assertRejects(async () => {
			await location2.flush();
		}, Error, 'Assertion failed, tried to flush "project" preferences location before it was loaded.');

		// Wait for load
		await waitForMicrotasks();
		await location2.flush();

		// Make sure the preference still exists
		assertEquals(location2.get("preference"), "value");
	},
});

Deno.test({
	name: "onFileCreated fires when the file is created for the first time",
	async fn() {
		const fs = new MemoryStudioFileSystem();
		const location = new FilePreferencesLocation("project", fs, ["preferences.json"], true);

		const onCreatedSpy = spy();
		location.onFileCreated(onCreatedSpy);

		// Wait for load
		await waitForMicrotasks();

		assertSpyCalls(onCreatedSpy, 0);

		location.set("preference", "value");
		assertSpyCalls(onCreatedSpy, 0);
		await location.flush();
		assertSpyCalls(onCreatedSpy, 1);

		// Make sure it doesn't fire again
		location.set("preference", "new value");
		await location.flush();
		assertSpyCalls(onCreatedSpy, 1);
	},
});

Deno.test({
	name: "Waits for permission when loaded without a user gesture",
	async fn() {
		const fs = new MemoryStudioFileSystem();
		let resolveWait = () => {};
		const waitForPermissionSpy = stub(fs, "waitForPermission", () => {
			return new Promise(resolve => {
				resolveWait = resolve;
			});
		});
		const location = new FilePreferencesLocation("project", fs, ["preferences.json"], false);

		assertSpyCalls(waitForPermissionSpy, 1);
		assertSpyCall(waitForPermissionSpy, 0, {
			args: [["preferences.json"], {writable: false}],
		});

		// Wait for load
		await waitForMicrotasks();

		await assertRejects(async () => {
			await location.flush();
		}, Error, 'Assertion failed, tried to flush "project" preferences location before it was loaded.');

		resolveWait();
		await waitForMicrotasks();
		await location.flush();
	},
});
