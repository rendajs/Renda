import {createBasicFs, forcePendingOperations} from "./shared.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {registerOnChangeSpy} from "../shared.js";

Deno.test({
	name: "delete() should delete files",
	fn: async () => {
		const {fs} = await createBasicFs();

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
	name: "delete() should fire onChange",
	fn: async () => {
		const {fs} = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "file1"];
		await fs.delete(path);

		// Change the path to verify the event contains a diferent array
		path.push("extra");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file1"],
					type: "deleted",
				},
			],
		});
	},
});

Deno.test({
	name: "delete() should throw when deleting the root directory",
	fn: async () => {
		const {fs} = await createBasicFs();

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
		const {fs} = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles", "nonexistent"]);
		}, Error, 'Failed to delete "root/onlyfiles/nonexistent" because it does not exist.');
	},
});

Deno.test({
	name: "delete() should throw when deleting a non-existent with non-existent parent",
	fn: async () => {
		const {fs} = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "nonexistent", "nonexistent"]);
		}, Error, 'Failed to delete "root/nonexistent/nonexistent" because it does not exist.');
	},
});

Deno.test({
	name: "delete() should throw when deleting a non-empty directory with recursive=false",
	fn: async () => {
		const {fs} = await createBasicFs();

		await assertRejects(async () => {
			await fs.delete(["root", "onlyfiles"]);
		}, Error, 'Failed to delete "root/onlyfiles" because it is a non-empty directory. Use recursive = true to delete non-empty directories.');
	},
});

Deno.test({
	name: "delete() a directory with recursive = true",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs();

		const initialEntryCount = getEntryCount();

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
		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, initialEntryCount - 3);
	},
});

Deno.test({
	name: "delete() causes waitForWritesFinish to stay pending until done",
	async fn() {
		const {fs} = await createBasicFs();

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
