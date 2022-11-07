import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {testAll} from "../shared.js";

testAll({
	name: "readDir() basic directory",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const result = await fs.readDir(["root"]);

		assertEquals(result, {
			files: ["file1", "file2"],
			directories: ["onlyfiles", "onlydirs"],
		});
	},
});

testAll({
	name: "readDir() only files",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const result = await fs.readDir(["root", "onlyfiles"]);

		assertEquals(result, {
			files: ["subfile1", "subfile2"],
			directories: [],
		});
	},
});

testAll({
	name: "readDir() only dirs",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const result = await fs.readDir(["root", "onlydirs"]);

		assertEquals(result, {
			files: [],
			directories: ["subdir1", "subdir2"],
		});
	},
});

testAll({
	name: "readDir() empty directory",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const result = await fs.readDir(["root", "onlydirs", "subdir1"]);

		assertEquals(result, {
			files: [],
			directories: [],
		});
	},
});

testAll({
	name: "readDir() should error when reading files",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readDir(["root", "file1"]);
		}, Error, `Couldn't readDir, "root/file1" is not a directory.`);
	},
});

testAll({
	name: "readDir() should error when parent is a file",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readDir(["root", "file1", "file2"]);
		}, Error, `Couldn't readDir at "root/file1/file2", "root/file1" is not a directory.`);
	},
});

testAll({
	name: "readDir() should error when parent doesn't exist",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.readDir(["root", "nonExistent", "nonExistent"]);
		}, Error, `Couldn't readDir at "root/nonExistent/nonExistent", "root/nonExistent" does not exist.`);
	},
});

testAll({
	name: "readDir while a new file is being created",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

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
