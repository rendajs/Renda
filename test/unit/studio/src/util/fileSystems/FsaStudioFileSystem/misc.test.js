import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { createBasicFs } from "./shared.js";

Deno.test({
	name: "getRootName",
	fn: async () => {
		const { fs } = createBasicFs();

		const rootName = await fs.getRootName();
		assertEquals(rootName, "actualRoot");
	},
});

Deno.test({
	name: "splitDirFileName",
	fn: async () => {
		const { fs } = createBasicFs();

		const { dirPath, fileName } = fs.splitDirFileName(["path", "to", "file1"]);
		assertEquals(dirPath, ["path", "to"]);
		assertEquals(fileName, "file1");
	},
});

Deno.test({
	name: "setRootName should throw",
	async fn() {
		const { fs } = createBasicFs();

		await assertRejects(async () => {
			await fs.setRootName("test");
		}, Error, "Changing the root name of fsa file systems is not supported.");
	},
});
