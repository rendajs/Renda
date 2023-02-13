import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {FsaEditorFileSystem} from "../../../../../../../../studio/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../../studio/src/util/fileSystems/MemoryEditorFileSystem.js";
import {registerOnChangeSpy} from "../../shared.js";
import {testAll} from "../shared.js";

testAll({
	name: "move() rename a file",
	ignore: [MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.move(["root", "file2"], ["root", "file3"]);

		let hasFile2 = false;
		let hasFile3 = false;
		const {files} = await fs.readDir(["root"]);
		for (const name of files) {
			if (name == "file2") {
				hasFile2 = true;
			} else if (name == "file3") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);

		assertSpyCalls(onChangeSpy, 2);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "file3"],
					type: "created",
				},
			],
		});
		assertSpyCall(onChangeSpy, 1, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file2"],
					type: "deleted",
				},
			],
		});
	},
});

testAll({
	name: "move() a file",
	ignore: [MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.move(["root", "file2"], ["root", "onlyfiles", "file2"]);

		let hasFile2 = false;
		const {files} = await fs.readDir(["root"]);
		for (const name of files) {
			if (name == "file2") {
				hasFile2 = true;
			}
		}
		let hasFile3 = false;
		const {files: files2} = await fs.readDir(["root", "onlyfiles"]);
		for (const name of files2) {
			if (name == "file2") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);

		assertSpyCalls(onChangeSpy, 2);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "onlyfiles", "file2"],
					type: "created",
				},
			],
		});
		assertSpyCall(onChangeSpy, 1, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file2"],
					type: "deleted",
				},
			],
		});
	},
});

testAll({
	name: "move() rename a directory with files",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.move(["root", "onlyfiles"], ["root", "onlyfiles2"]);

		const result = await fs.readDir(["root", "onlyfiles2"]);

		assertEquals(result, {
			directories: [],
			files: ["subfile1", "subfile2"],
		});

		assertSpyCalls(onChangeSpy, 2);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "onlyfiles2"],
					type: "created",
				},
			],
		});
		assertSpyCall(onChangeSpy, 1, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "onlyfiles"],
					type: "deleted",
				},
			],
		});
	},
});

testAll({
	name: "move() rename a directory with dirs",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.move(["root", "onlydirs"], ["root", "onlydirs2"]);

		const result = await fs.readDir(["root", "onlydirs2"]);

		assertEquals(result, {
			directories: ["subdir1", "subdir2"],
			files: [],
		});
	},
});

testAll({
	name: "move() a directory with files",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.move(["root", "onlyfiles"], ["root", "newdir", "onlyfiles"]);

		assertEquals(await fs.readDir(["root", "newdir", "onlyfiles"]), {
			directories: [],
			files: ["subfile1", "subfile2"],
		});

		assertEquals(await fs.isDir(["root", "onlyfiles"]), false);
	},
});

testAll({
	name: "move() a directory with dirs",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.move(["root", "onlydirs"], ["root", "newdir", "onlydirs"]);

		assertEquals(await fs.readDir(["root", "newdir", "onlydirs"]), {
			directories: ["subdir1", "subdir2"],
			files: [],
		});

		assertEquals(await fs.isDir(["root", "onlydirs"]), false);
	},
});

testAll({
	name: "move() should throw when the from path doesn't exist",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.move(["root", "file1", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/file1/nonexistent" does not exist.');
		await assertRejects(async () => {
			await fs.move(["root", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/nonexistent" does not exist.');
		await assertRejects(async () => {
			await fs.move(["root", "onlyfiles", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/onlyfiles/nonexistent" does not exist.');
	},
});

testAll({
	name: "move() should throw when overwriting an existing file",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.move(["root", "file1"], ["root", "file2"]);
		}, Error, 'Failed to move: "root/file2" is a file.');
	},
});

testAll({
	name: "move() should throw when overwriting an existing directory",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.writeFile(["root", "onlydirs2", "file1"], "hello1");
		await fs.writeFile(["root", "onlydirs2", "file2"], "hello2");

		await assertRejects(async () => {
			await fs.move(["root", "onlydirs"], ["root", "onlydirs2"]);
		}, Error, 'Failed to move: "root/onlydirs2" is a non-empty directory');
	},
});

testAll({
	name: "move() should not throw when overwriting an existing directory if it's empty",
	ignore: [MemoryEditorFileSystem, FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await fs.createDir(["root", "onlyfiles2"]);

		await fs.move(["root", "onlyfiles"], ["root", "onlyfiles2"]);

		assertEquals(await fs.readDir(["root", "onlyfiles2"]), {
			directories: [],
			files: ["subfile1", "subfile2"],
		});
	},
});
