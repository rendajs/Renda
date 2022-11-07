import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {testAll} from "../shared.js";
import {registerOnChangeSpy} from "../../shared.js";
import {FsaEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";

testAll({
	name: "getRootName() should return the value passed in setRootName()",
	exclude: [FsaEditorFileSystem],
	ignore: [MemoryEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();
		await fs.setRootName("theRootName");

		const result = await fs.getRootName();

		assertEquals(result, "theRootName");
	},
});

testAll({
	name: "setRootName() should fire onChange event",
	exclude: [FsaEditorFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.setRootName("new root name");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: [],
					type: "changed",
				},
			],
		});
	},
});
