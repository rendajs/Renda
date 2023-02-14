import {assertEquals} from "std/testing/asserts.ts";
import {testAll} from "../shared.js";

testAll({
	name: "isDir true",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isDir = await fs.isDir(["root"]);

		assertEquals(isDir, true);
	},
});

testAll({
	name: "isDir false",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isDir = await fs.isDir(["root", "file1"]);

		assertEquals(isDir, false);
	},
});

testAll({
	name: "isDir non existent",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent"]);

		assertEquals(isDir, false);
	},
});

testAll({
	name: "isDir non existent parent",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent", "dir"]);

		assertEquals(isDir, false);
	},
});

testAll({
	name: "isDir while it is being created",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const promise1 = fs.createDir(["root", "dir"]);
		const promise2 = fs.isDir(["root", "dir"]);

		await promise1;
		assertEquals(await promise2, true);
	},
});
