import {assert, assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
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
	name: "getDirHandle() with path in error",
	fn: async () => {
		const {fs} = createBasicFs();

		let didThrow = false;
		try {
			await fs.getDirHandle(["root", "nonexistent"]);
		} catch (e) {
			const error = /** @type {Error} */ (e);
			didThrow = true;
			assert(error.message.includes("root/nonexistent/"), "Error message is incorrect");

			const cause = /** @type {Error} */ (error.cause);
			assertEquals(cause.name, "NotFoundError");
		}

		assertEquals(didThrow, true);
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
