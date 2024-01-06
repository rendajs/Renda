import {assertEquals} from "std/testing/asserts.ts";
import {testAll} from "../shared.js";

testAll({
	name: "isFile true",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isFile = await fs.isFile(["root", "file1"]);

		assertEquals(isFile, true);
	},
});

testAll({
	name: "isFile false",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isFile = await fs.isFile(["root"]);

		assertEquals(isFile, false);
	},
});

testAll({
	name: "isFile non existent",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent"]);

		assertEquals(isFile, false);
	},
});

testAll({
	name: "isFile non existent parent",
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent", "file"]);

		assertEquals(isFile, false);
	},
});

testAll({
	name: "isFile while it is being created",
	ignore: ["serialized-remote"], // TODO #855
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const promise1 = fs.writeFile(["root", "file"], "hello");
		const promise2 = fs.isFile(["root", "file"]);
		await promise1;
		assertEquals(await promise2, true);
	},
});
