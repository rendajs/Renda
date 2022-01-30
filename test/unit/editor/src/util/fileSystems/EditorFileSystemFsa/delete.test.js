import {assertEquals} from "asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "Should delete files",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		await fs.delete(["root", "file1"]);

		let hasFile1 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}

		assertEquals(hasFile1, false);
	},
});

Deno.test({
	name: "should fire onBeforeAnyChange",
	fn: async () => {
		const {fs} = createBasicFs();

		let fired = false;
		fs.onBeforeAnyChange(() => {
			fired = true;
		});

		await fs.delete(["root", "file1"]);

		assertEquals(fired, true);
	},
});
