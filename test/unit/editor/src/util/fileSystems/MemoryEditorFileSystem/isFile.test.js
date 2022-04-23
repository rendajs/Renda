import {assertEquals} from "std/testing/asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "isFile true",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root", "file1"]);

		assertEquals(isFile, true);
	},
});

Deno.test({
	name: "isFile false",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root"]);

		assertEquals(isFile, false);
	},
});

Deno.test({
	name: "isFile non existent",
	fn: async () => {
		const fs = await createBasicFs();

		const isFile = await fs.isFile(["root", "nonExistent"]);

		assertEquals(isFile, false);
	},
});
