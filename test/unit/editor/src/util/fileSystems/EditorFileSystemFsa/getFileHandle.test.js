import {assert, assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "getFileHandle()",
	fn: async () => {
		const {fs, fileHandle1} = createBasicFs();

		const handle = await fs.getFileHandle(["root", "file1"]);

		assert(handle === fileHandle1, "Unexpected handle received.");
	},
});

Deno.test({
	name: "getFileHandle() with path in error",
	fn: async () => {
		const {fs} = createBasicFs();

		let didThrow = false;
		try {
			await fs.getFileHandle(["root", "nonexistent"]);
		} catch (e) {
			const error = /** @type {Error} */ (e);
			didThrow = true;
			assert(error.message.includes("root/nonexistent"), "Error message is incorrect");

			const cause = /** @type {Error} */ (error.cause);
			assertEquals(cause.name, "NotFoundError");
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "getFileHandle() not a file",
	fn: async () => {
		const {fs} = createBasicFs();

		let didThrow = false;
		try {
			await fs.getFileHandle(["root"], {overrideError: false});
		} catch (e) {
			const error = /** @type {Error} */ (e);
			didThrow = true;
			assertEquals(error.name, "TypeMismatchError");
		}

		assertEquals(didThrow, true);
	},
});
