import {assertEquals} from "asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "getRootName",
	fn: async () => {
		const {fs} = createBasicFs();

		const rootName = await fs.getRootName();
		assertEquals(rootName, "actualRoot");
	},
});

Deno.test({
	name: "splitDirFileName",
	fn: async () => {
		const {fs} = createBasicFs();

		const {dirPath, fileName} = fs.splitDirFileName(["path", "to", "file1"]);
		assertEquals(dirPath, ["path", "to"]);
		assertEquals(fileName, "file1");
	},
});

Deno.test({
	name: "writeFileStream should fire onBeforeAnyChange",
	fn: async () => {
		const {fs} = createBasicFs();

		let onBeforeAnyChangeCalled = false;
		fs.onBeforeAnyChange(() => {
			onBeforeAnyChangeCalled = true;
		});
		await fs.writeFileStream(["root", "file1"]);

		assertEquals(onBeforeAnyChangeCalled, true);
	},
});

Deno.test({
	name: "isFile true",
	fn: async () => {
		const {fs} = createBasicFs();

		const isFile = await fs.isFile(["root", "file1"]);

		assertEquals(isFile, true);
	},
});

Deno.test({
	name: "isFile false",
	fn: async () => {
		const {fs} = createBasicFs();

		const isFile = await fs.isFile(["root"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile non existent",
	fn: async () => {
		const {fs} = createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isDir true",
	fn: async () => {
		const {fs} = createBasicFs();

		const isDir = await fs.isDir(["root"]);

		assertEquals(isDir, true);
	},
});

Deno.test({
	name: "isDir false",
	fn: async () => {
		const {fs} = createBasicFs();

		const isDir = await fs.isDir(["root", "file1"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir non existent",
	fn: async () => {
		const {fs} = createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent"]);

		assertEquals(isDir, false);
	},
});
