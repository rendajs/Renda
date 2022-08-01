import {assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "isDir true",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root"]);

		assertEquals(isDir, true);
	},
});

Deno.test({
	name: "isDir false",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root", "file1"]);

		assertEquals(isDir, false);
	},
});

Deno.test({
	name: "isDir non existent",
	fn: async () => {
		const fs = await createBasicFs();

		const isDir = await fs.isDir(["root", "nonExistent"]);

		assertEquals(isDir, false);
	},
});
