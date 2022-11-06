import {assert, assertEquals} from "std/testing/asserts.ts";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {IndexedDbEditorFileSystem, testAll} from "../shared.js";

testAll({
	name: "writeFileStream()",
	ignore: [IndexedDbEditorFileSystem, FsaEditorFileSystem],
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
