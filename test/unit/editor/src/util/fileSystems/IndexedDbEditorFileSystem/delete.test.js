import {createBasicFs, forcePendingOperations} from "./shared.js";
import {assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";

Deno.test({
	name: "delete() should delete files",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.delete(["root", "file1"]);

		let hasFile1 = false;
		const {directories} = await fs.readDir(["root"]);
		for (const name of directories) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}

		assertEquals(hasFile1, false);
	},
});

Deno.test({
	name: "delete() should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		let fired = false;
		fs.onBeforeAnyChange(() => {
			fired = true;
		});

		await fs.delete(["root", "file1"]);

		assertEquals(fired, true);
	},
});

Deno.test({
	name: "delete() should throw when deleting the root directory",
	fn: async () => {
		const fs = await createBasicFs();

		let didThrow = false;
		try {
			await fs.delete([]);
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "delete() should throw when deleting a non-existent file",
	fn: async () => {
		const fs = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles", "nonexistent"]);
		}, Error, 'Failed to delete "root/onlyfiles/nonexistent" because it does not exist.');
	},
});

Deno.test({
	name: "delete() should throw when deleting a non-existent with non-existent parent",
	fn: async () => {
		const fs = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "nonexistent", "nonexistent"]);
		}, Error, 'Failed to delete "root/nonexistent/nonexistent" because it does not exist.');
	},
});

Deno.test({
	name: "delete() should throw when deleting a non-empty directory with recursive=false",
	fn: async () => {
		const fs = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles"]);
		}, Error, 'Failed to delete "root/onlyfiles" because it is a non-empty directory. Use recursive = true to delete non-empty directories.');
	},
});

Deno.test({
	name: "delete() a directory with recursive = true",
	async fn() {
		const fs = await createBasicFs();

		const db = /** @type {import("../../../../shared/FakeIndexedDbUtil.js").IndexedDbUtil?} */ (fs.db);
		assertExists(db);
		const entryCount = Array.from(db.entries()).length;

		await fs.delete(["root", "onlyfiles"], true);

		assertEquals(await fs.readDir(["root"]), {
			directories: ["onlydirs"],
			files: [
				"file1",
				"file2",
			],
		});

		// The "onlyfiles" directory contains two files, so including itself
		// 3 items should have been removed
		const newEntryCount = Array.from(db.entries()).length;
		assertEquals(newEntryCount, entryCount - 3);
	},
});

Deno.test({
	name: "delete() causes waitForWritesFinish to stay pending until done",
	async fn() {
		const fs = await createBasicFs();

		const deletePromise = fs.delete(["root", "file1"]);
		const waitPromise = fs.waitForWritesFinish();
		forcePendingOperations(true);
		let waitPromiseResolved = false;
		waitPromise.then(() => {
			waitPromiseResolved = true;
		});

		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, false);

		forcePendingOperations(false);
		await deletePromise;
		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, true);
	},
});
