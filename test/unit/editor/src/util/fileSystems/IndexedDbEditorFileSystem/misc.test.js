import {createBasicFs, createFs, forcePendingOperations} from "./shared.js";
import {assert, assertEquals, assertExists, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";

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
	name: "getRootName() should return the value passed in setRootName()",
	fn: async () => {
		const fs = await createFs();
		await fs.setRootName("theRootName");

		const result = await fs.getRootName();

		assertEquals(result, "theRootName");
	},
});

Deno.test({
	name: "createDir() should create a directory",
	fn: async () => {
		const {fs} = await createBasicFs();

		await fs.createDir(["root", "newdir"]);

		let hasNewDir = false;
		const {directories} = await fs.readDir(["root"]);
		for (const name of directories) {
			if (name == "newdir") {
				hasNewDir = true;
				break;
			}
		}

		assertEquals(hasNewDir, true);
	},
});

Deno.test({
	name: "createDir() should fire onChange",
	fn: async () => {
		const {fs} = await createBasicFs();

		/** @type {import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} */
		const cb = () => {};
		const onChangeSpy = spy(cb);
		fs.onChange(onChangeSpy);

		const path = ["root", "newdir"];
		await fs.createDir(path);

		// Change the path to verify the event contains a diferent array
		path.push("extra");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: ["root", "newdir"],
					type: "created",
				},
			],
		});
	},
});

Deno.test({
	name: "createDir() the same path twice at the same time",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs({
			disableStructuredClone: true,
		});
		const originalEntryCount = getEntryCount();
		const promise1 = fs.createDir(["root", "created", "dir1"]);
		const promise2 = fs.createDir(["root", "created", "dir1"]);
		await promise1;
		await promise2;

		const result = await fs.readDir(["root", "created"]);
		assertEquals(result, {
			directories: ["dir1"],
			files: [],
		});

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
	name: "readDir",
	fn: async () => {
		const {fs} = await createBasicFs();

		const {directories, files} = await fs.readDir(["root"]);
		directories.sort();
		files.sort();

		assertEquals(directories, ["onlydirs", "onlyfiles"]);
		assertEquals(files, ["file1", "file2"]);
	},
});

Deno.test({
	name: "readDir should error when reading files",
	fn: async () => {
		const {fs} = await createBasicFs();

		let didThrow = false;
		try {
			await fs.readDir(["root", "file1"]);
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "readDir while a new file is being created",
	async fn() {
		const {fs} = await createBasicFs();

		const promise1 = fs.writeFile(["root", "onlyfiles", "createdfile"], "hello");
		const promise2 = fs.readDir(["root", "onlyfiles"]);

		await promise1;
		assertEquals(await promise2, {
			directories: [],
			files: [
				"subfile1",
				"subfile2",
				"createdfile",
			],
		});
	},
});

Deno.test({
	name: "writeFile",
	fn: async () => {
		const {fs} = await createBasicFs();

		await fs.writeFile(["root", "newfile"], "hello world");

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");
	},
});

Deno.test({
	name: "writeFile should fire onBeforeAnyChange",
	fn: async () => {
		const {fs} = await createBasicFs();

		let onBeforeAnyChangeCalled = false;
		fs.onBeforeAnyChange(() => {
			onBeforeAnyChangeCalled = true;
		});

		await fs.writeFile(["root", "newfile"], "hello world");

		assertEquals(onBeforeAnyChangeCalled, true);
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

Deno.test({
	name: "readFile",
	fn: async () => {
		const {fs} = await createBasicFs({disableStructuredClone: true});

		const result = await fs.readFile(["root", "file1"]);

		assertInstanceOf(result, File);
	},
});

Deno.test({
	name: "readFile should error when reading a directory",
	fn: async () => {
		const {fs} = await createBasicFs();

		let didThrow = false;
		try {
			await fs.readFile(["root", "onlydirs"]);
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "readFile while it is being written",
	async fn() {
		const {fs} = await createBasicFs({disableStructuredClone: true});

		const promise1 = fs.writeFile(["root", "file"], "hello");
		const promise2 = fs.readText(["root", "file"]);

		await promise1;
		assertEquals(await promise2, "hello");
	},
});

Deno.test({
	name: "isFile true",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isFile = await fs.isFile(["root", "file1"]);

		assertEquals(isFile, true);
	},
});

Deno.test({
	name: "isFile false",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isFile = await fs.isFile(["root"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile non existent",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile non existent parent",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent", "file"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile while it is being created",
	async fn() {
		const {fs} = await createBasicFs();

		const promise1 = fs.writeFile(["root", "file"], "hello");
		const promise2 = fs.isFile(["root", "file"]);
		await promise1;
		assertEquals(await promise2, true);
	},
});

Deno.test({
	name: "isDir true",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isDir = await fs.isDir(["root"]);

		assertEquals(isDir, true);
	},
});

Deno.test({
	name: "isDir false",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isDir = await fs.isDir(["root", "file1"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir non existent",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir non existent parent",
	fn: async () => {
		const {fs} = await createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent", "dir"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir while it is being created",
	async fn() {
		const {fs} = await createBasicFs();

		const promise1 = fs.createDir(["root", "dir"]);
		const promise2 = fs.isDir(["root", "dir"]);

		await promise1;
		assertEquals(await promise2, true);
	},
});
