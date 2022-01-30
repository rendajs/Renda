import {createBasicFs, createFs, finishCoverageMapWrites} from "./shared.js";
import {assert, assertEquals} from "asserts";

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

		await finishCoverageMapWrites();
	},
});

Deno.test({
	name: "waitForRootCreate() should resolve",
	fn: async () => {
		const fs = await createFs();
		await fs.waitForRootCreate();
		await fs.waitForRootCreate();

		await finishCoverageMapWrites();
	},
});

Deno.test({
	name: "getRootName() should return the value passed in setRootName()",
	fn: async () => {
		const fs = await createFs();
		await fs.setRootName("theRootName");

		const result = await fs.getRootName();

		assertEquals(result, "theRootName");

		await finishCoverageMapWrites();
	},
});

Deno.test({
	name: "createDir() should create a directory",
	fn: async () => {
		const fs = await createBasicFs();

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
	name: "createDir() should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		let onBeforeAnyChangeCalled = false;
		fs.onBeforeAnyChange(() => {
			onBeforeAnyChangeCalled = true;
		});
		await fs.createDir(["root", "newdir"]);

		assertEquals(onBeforeAnyChangeCalled, true);
	},
});

Deno.test({
	name: "readDir",
	fn: async () => {
		const fs = await createBasicFs();

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
		const fs = await createBasicFs();

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
	name: "writeFile",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.writeFile(["root", "newfile"], "hello world");

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");
	},
});

Deno.test({
	name: "writeFile should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

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
		const fs = await createBasicFs();

		let didThrow = false;
		try {
			await fs.writeFile(["root", "file1", "newfile"], "hello world");
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "writeFile should error when a parent of parent is not a directory",
	fn: async () => {
		const fs = await createBasicFs();

		let didThrow = false;
		try {
			await fs.writeFile(["root", "file1", "anotherdir", "newfile"], "hello world");
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

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
	name: "delete() should error when deleting the root directory",
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
	name: "readFile",
	fn: async () => {
		const fs = await createBasicFs();

		const result = await fs.readFile(["root", "file1"]);

		assert(result instanceof File, "file1");
	},
});

Deno.test({
	name: "readFile should error when reading a directory",
	fn: async () => {
		const fs = await createBasicFs();

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
	name: "isFile true",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root", "file1"]);

		assertEquals(isFile, true);
	},
});

Deno.test({
	name: "isFile false",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile non existent",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isDir true",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root"]);

		assertEquals(isDir, true);
	},
});

Deno.test({
	name: "isDir false",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root", "file1"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir non existent",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent"]);

		assertEquals(isDir, false);
	},
});
