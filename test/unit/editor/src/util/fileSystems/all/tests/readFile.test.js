import {assert, assertEquals, assertNotEquals, assertRejects} from "std/testing/asserts.ts";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {IndexedDbEditorFileSystem, testAll} from "../shared.js";

testAll({
	name: "readFile()",
	async fn(ctx) {
		const fs = await ctx.createBasicFs({
			disableStructuredClone: true,
		});

		const file = await fs.readFile(["root", "file1"]);

		assert(file instanceof File, "file is not an instance of File");
	},
});

testAll({
	name: "readFile() Two calls at once",
	async fn(ctx) {
		const fs = await ctx.createBasicFs({
			disableStructuredClone: true,
		});

		const promise1 = fs.readFile(["root", "file1"]);
		const promise2 = fs.readFile(["root", "file1"]);

		const file1 = await promise1;
		const file2 = await promise2;

		assert(file1 instanceof File, "file1 is not an instance of File");
		assert(file2 instanceof File, "file2 is not an instance of File");
		assert(file1 === file2, "file1 and file2 are not the same instance");
	},
});

testAll({
	name: "readFile() Two calls at once, missing file",
	ignore: [MemoryEditorFileSystem, IndexedDbEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const promise1 = fs.readFile(["root", "nonExistent"]);
		const promise2 = fs.readFile(["root", "nonExistent"]);

		let error1 = null;
		let error2 = null;
		try {
			await promise1;
		} catch (e) {
			error1 = e;
		}
		try {
			await promise2;
		} catch (e) {
			error2 = e;
		}

		assertNotEquals(error1, null);
		assertNotEquals(error2, null);
		assert(error1 === error2, "error1 and error2 are not the same instance");
	},
});

testAll({
	name: "readFile() should error when reading a directory",
	ignore: [FsaEditorFileSystem, IndexedDbEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readFile(["root", "onlydirs"]);
		}, Error, `"root/onlydirs" is not a file.`);
	},
});

testAll({
	name: "readFile while it is being written",
	ignore: [FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs({disableStructuredClone: true});

		const promise1 = fs.writeFile(["root", "file"], "hello");
		const promise2 = fs.readText(["root", "file"]);

		await promise1;
		assertEquals(await promise2, "hello");
	},
});

testAll({
	name: "readText()",
	ignore: [FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs({disableStructuredClone: true});

		const text = await fs.readText(["root", "file1"]);

		assertEquals(text, "hello");
	},
});
