import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "readFile()",
	fn: async () => {
		const fs = await createBasicFs();

		const file = await fs.readFile(["root", "file1"]);

		assert(file instanceof File, "file is not an instance of File");
	},
});

Deno.test({
	name: "readText()",
	fn: async () => {
		const fs = await createBasicFs();

		const text = await fs.readText(["root", "file1"]);

		assertEquals(text, "hello");
	},
});
