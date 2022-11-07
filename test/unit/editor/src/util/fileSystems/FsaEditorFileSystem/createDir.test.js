import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory on the file handle",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		const path = ["root", "newdir"];
		const createDirPromise = fs.createDir(path);

		// Change the path to verify that the initial array value is used
		path.push("extra");

		await createDirPromise;

		let newDirHandle;
		for await (const [name, handle] of rootDirHandle.entries()) {
			if (name == "newdir") {
				newDirHandle = handle;
				break;
			}
		}
		assertExists(newDirHandle);
		assert(newDirHandle.kind == "directory", "Created handle is not a directory");
		let subChildCount = 0;
		for await (const _ of newDirHandle.entries()) {
			subChildCount++;
		}
		assertEquals(subChildCount, 0);
	},
});
