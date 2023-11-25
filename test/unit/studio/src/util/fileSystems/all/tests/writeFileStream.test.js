import {assert, assertEquals, assertRejects} from "std/testing/asserts.ts";
import {FsaStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import {IndexedDbStudioFileSystem, testAll} from "../shared.js";
import {RemoteStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js";

testAll({
	name: "writeFileStream()",
	ignore: [IndexedDbStudioFileSystem, FsaStudioFileSystem, RemoteStudioFileSystem],
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

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		const text = await fs.readText(["root", "newfile"]);

		assertEquals(text, "overwriteoverwriteworld hello world");
	},
});

testAll({
	name: "writeFileStream should error when the target is a directory",
	ignore: [IndexedDbStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFileStream(["root", "onlydirs"]);
		}, Error, `Couldn't writeFileStream, "root/onlydirs" is not a file.`);
	},
});

testAll({
	name: "writeFileStream should error when a parent is a file",
	ignore: [IndexedDbStudioFileSystem, RemoteStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createBasicFs();

		await assertRejects(async () => {
			await fs.writeFileStream(["root", "file1", "newfile"]);
		}, Error, `Couldn't writeFileStream at "root/file1/newfile", "root/file1" is not a directory.`);
	},
});
