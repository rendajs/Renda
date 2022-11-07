import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "getDirHandle()",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		const handle = await fs.getDirHandle(["root"]);

		assert(handle === rootDirHandle, "Unexpected handle received.");
	},
});

Deno.test({
	name: "getDirHandle() not a directory",
	fn: async () => {
		const {fs} = createBasicFs();

		let didThrow = false;
		try {
			await fs.getDirHandle(["root", "file1"], {overrideError: false});
		} catch (e) {
			const error = /** @type {Error} */ (e);
			didThrow = true;
			assertEquals(error.name, "TypeMismatchError");
		}

		assertEquals(didThrow, true);
	},
});
