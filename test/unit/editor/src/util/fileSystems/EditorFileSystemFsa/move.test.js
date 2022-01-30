import {assertEquals} from "asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "rename a file",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		await fs.move(["root", "file2"], ["root", "file3"]);

		let hasFile2 = false;
		let hasFile3 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file2") {
				hasFile2 = true;
			} else if (name == "file3") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);
	},
});

Deno.test({
	name: "move a file",
	fn: async () => {
		const {fs, rootDirHandle, onlyFilesDirHandle} = createBasicFs();

		await fs.move(["root", "file2"], ["root", "onlyfiles", "file2"]);

		let hasFile2 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file2") {
				hasFile2 = true;
			}
		}
		let hasFile3 = false;
		for await (const [name] of onlyFilesDirHandle.entries()) {
			if (name == "file2") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);
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

		await fs.move(["root", "file2"], ["root", "file3"]);

		assertEquals(fired, true);
	},
});
