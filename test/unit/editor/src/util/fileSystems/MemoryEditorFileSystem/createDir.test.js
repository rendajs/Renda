import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.createDir(["root", "newdir"]);

		const {directories} = await fs.readDir(["root"]);
		assert(directories.includes("newdir"), "'newdir' was not created");
	},
});

Deno.test({
	name: "should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		let onBeforeAnyChangeCalled = false;
		fs.onBeforeAnyChange(() => {
			onBeforeAnyChangeCalled = true;
		});
		await fs.createDir(["root", "newdir"]);

		assertEquals(onBeforeAnyChangeCalled, true);
	},
});
