import {createBasicFs, createFs, forcePendingOperations} from "./shared.js";
import {assert, assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {registerOnChangeSpy} from "../shared.js";

Deno.test({
	name: "assertDbExists() should throw after using deleteDb()",
	fn: async () => {
		const fs = await createFs();
		await fs.deleteDb();

		let didThrow = false;
		try {
			fs.assertDbExists();
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);

		await fs.waitForRootCreate();
	},
});

Deno.test({
	name: "waitForRootCreate() should resolve",
	fn: async () => {
		const fs = await createFs();
		await fs.waitForRootCreate();
		await fs.waitForRootCreate();
	},
});

Deno.test({
	name: "createDir() the same path twice at the same time shouldn't create extra entries",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs();
		const originalEntryCount = getEntryCount();
		const promise1 = fs.createDir(["root", "created", "dir1"]);
		const promise2 = fs.createDir(["root", "created", "dir1"]);
		await promise1;
		await promise2;

		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, originalEntryCount + 2);
	},
});

Deno.test({
	name: "createDir() causes waitForWritesFinish to stay pending until done",
	async fn() {
		const {fs} = await createBasicFs();

		const createPromise = fs.createDir(["root", "newdir"]);
		const waitPromise = fs.waitForWritesFinish();
		forcePendingOperations(true);
		let waitPromiseResolved = false;
		waitPromise.then(() => {
			waitPromiseResolved = true;
		});

		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, false);

		forcePendingOperations(false);
		await createPromise;
		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, true);
	},
});

Deno.test({
	name: "writeFile should create the file and fire onChange",
	async fn() {
		const {fs} = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "newfile"];
		const writeFilePromise = fs.writeFile(path, "text");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "newfile"],
					type: "changed",
				},
			],
		});
	},
});

Deno.test({
	name: "writeFile should error when a parent is not a directory",
	fn: async () => {
		const {fs} = await createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "newfile"], "hello world");
		}, Error, 'Failed to write to "root/file1/newfile", "root/file1" is not a directory.');
	},
});

Deno.test({
	name: "writeFile should error when a parent of parent is not a directory",
	fn: async () => {
		const {fs} = await createBasicFs();

		await assertRejects(async () => {
			await fs.writeFile(["root", "file1", "anotherdir", "newfile"], "hello world");
		}, Error, 'Failed to create directory at "root/file1/anotherdir", "root/file1" is file.');
	},
});

Deno.test({
	name: "writeFile() causes waitForWritesFinish to stay pending until done",
	async fn() {
		const {fs} = await createBasicFs();

		const writeFilePromise = fs.writeFile(["root", "newfile"], "hello world");
		const waitPromise = fs.waitForWritesFinish();
		forcePendingOperations(true);
		let waitPromiseResolved = false;
		waitPromise.then(() => {
			waitPromiseResolved = true;
		});

		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, false);

		forcePendingOperations(false);
		await writeFilePromise;
		await waitForMicrotasks();
		assertEquals(waitPromiseResolved, true);
	},
});

Deno.test({
	name: "Multiple writeFile() calls run in sequence",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs({
			disableStructuredClone: true,
		});
		const originalEntryCount = getEntryCount();
		assertExists(fs.db);
		const originalGet = fs.db.get.bind(fs.db);
		let currentlyRunningCalls = 0;
		fs.db.get = async function(key, objectStoreName) {
			currentlyRunningCalls++;
			if (currentlyRunningCalls > 1) {
				throw new Error("More than one get call running at a time");
			}
			const result = await originalGet(key, objectStoreName);
			currentlyRunningCalls--;
			return result;
		};

		forcePendingOperations(true);
		const promises = [];
		for (let i = 0; i < 10; i++) {
			const promise = fs.writeFile(["root", "file1"], "hello" + i);
			promises.push(promise);
			// await promise;
		}
		forcePendingOperations(false);
		await Promise.all(promises);

		const result = await fs.readText(["root", "file1"]);
		assertEquals(result, "hello9");

		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, originalEntryCount);
	},
});
