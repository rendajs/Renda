import { assert, assertEquals, assertRejects } from "std/testing/asserts.ts";
import { testAll } from "../shared.js";

testAll({
	name: "writeFileStream()",
	ignore: ["indexedDb", "fsa", "remote", "serialized-remote"],
	async fn(ctx) {
		const fs = await ctx.createFs();

		const stream = await fs.writeFileStream(["root", "newfile"]);

		await stream.write("hello world hello world hello world");
		await stream.write({
			type: "write",
			position: 0,
			data: "overwrite",
		});
		const blob = new Blob(["overwrite"]);
		await stream.write(blob);
		await stream.close();

		const { files } = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		const text = await fs.readText(["root", "newfile"]);

		assertEquals(text, "overwriteoverwriteworld hello world");
	},
});

testAll({
	name: "writeFileStream should error when the target is a directory",
	ignore: ["indexedDb", "remote", "serialized-remote"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFileStream(["root", "onlydirs"]);
		}, Error, `Failed to write, "root/onlydirs" is not a file.`);
	},
});

testAll({
	name: "writeFileStream should error when a parent is a file",
	ignore: ["indexedDb", "remote", "serialized-remote"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFileStream(["root", "file1", "newfile"]);
		}, Error, `Failed to write "root/file1/newfile", "root/file1" is not a directory.`);
	},
});

testAll({
	name: "writing to file streams fail when missing arguments",
	ignore: ["indexedDb", "fsa", "remote", "serialized-remote"],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		const stream = await fs.writeFileStream(["root", "newfile"]);

		await assertRejects(async () => {
			await stream.write({ type: "seek" });
		}, DOMException, "Invalid params passed. seek requires a position argument");
		await assertRejects(async () => {
			await stream.write({ type: "truncate" });
		}, DOMException, "Invalid params passed. truncate requires a size argument");
		await assertRejects(async () => {
			await stream.write({ type: "write" });
		}, DOMException, "Invalid params passed. write requires a data argument");
	},
});
