import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {testAll} from "../shared.js";
import {registerOnChangeSpy} from "../../shared.js";
import {FsaStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import {MemoryStudioFileSystem} from "../../../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";

testAll({
	name: "getRootName() should return the value passed in setRootName()",
	exclude: [FsaStudioFileSystem],
	ignore: [MemoryStudioFileSystem],
	async fn(ctx) {
		const fs = await ctx.createFs();
		await fs.setRootName("theRootName");

		const result = await fs.getRootName();

		assertEquals(result, "theRootName");
	},
});

testAll({
	name: "setRootName() should fire onChange event",
	exclude: [FsaStudioFileSystem],
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
