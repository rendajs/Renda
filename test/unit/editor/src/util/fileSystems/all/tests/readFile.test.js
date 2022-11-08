import {assert, assertEquals, assertIsError, assertNotEquals, assertRejects} from "std/testing/asserts.ts";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {testAll} from "../shared.js";

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
	name: "readFile() missing file",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readFile(["root", "nonExistent"]);
		}, Error, `Couldn't readFile, "root/nonExistent" does not exist.`);
	},
});

testAll({
	name: "readFile() missing parent",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readFile(["root", "nonExistent", "nonExistent"]);
		}, Error, `Couldn't readFile at "root/nonExistent/nonExistent", "root/nonExistent" does not exist.`);
	},
});

testAll({
	name: "readFile() parent is a file",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readFile(["root", "file1", "nonExistent"]);
		}, Error, `Couldn't readFile at "root/file1/nonExistent", "root/file1" is not a directory.`);
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
		assertIsError(error1, Error, `Couldn't readFile, "root/nonExistent" does not exist.`);
		assertIsError(error2, Error, `Couldn't readFile, "root/nonExistent" does not exist.`);
	},
});

testAll({
	name: "readFile() should error when reading a directory",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readFile(["root", "onlydirs"]);
		}, Error, `Couldn't readFile, "root/onlydirs" is not a file.`);
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
	async fn(ctx) {
		const fs = await ctx.createBasicFs({disableStructuredClone: true});

		const text = await fs.readText(["root", "file1"]);

		assertEquals(text, "hello");
	},
});
