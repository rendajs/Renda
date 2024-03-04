import { assertEquals } from "std/testing/asserts.ts";
import { createBasicFs } from "./shared.js";

Deno.test({
	name: "Should delete the file handle",
	fn: async () => {
		const { fs, rootDirHandle } = createBasicFs();

		const path = ["root", "file1"];
		const deletePromise = fs.delete(path);

		// Change the path to verify that the initial array is used
		path.push("extra");

		await deletePromise;

		let hasFile1 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}
		assertEquals(hasFile1, false);
	},
});
