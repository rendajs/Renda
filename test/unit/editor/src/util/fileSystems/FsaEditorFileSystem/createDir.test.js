import {assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		await fs.createDir(["root", "newdir"]);

		let hasNewDir = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "newdir") {
				hasNewDir = true;
				break;
			}
		}

		assertEquals(hasNewDir, true);
	},
});

Deno.test({
	name: "should fire onBeforeAnyChange",
	fn: async () => {
		const {fs} = createBasicFs();

		let onBeforeAnyChangeCalled = false;
		fs.onBeforeAnyChange(() => {
			onBeforeAnyChangeCalled = true;
		});
		await fs.createDir(["root", "newdir"]);

		assertEquals(onBeforeAnyChangeCalled, true);
	},
});
