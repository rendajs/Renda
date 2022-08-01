import {assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "rename a file",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "file2"], ["root", "file3"]);

		let hasFile2 = false;
		let hasFile3 = false;
		const {files} = await fs.readDir(["root"]);
		for (const name of files) {
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
		const fs = await createBasicFs();

		await fs.move(["root", "file2"], ["root", "onlyfiles", "file2"]);

		let hasFile2 = false;
		const {files} = await fs.readDir(["root"]);
		for (const name of files) {
			if (name == "file2") {
				hasFile2 = true;
			}
		}
		let hasFile3 = false;
		const {files: files2} = await fs.readDir(["root", "onlyfiles"]);
		for (const name of files2) {
			if (name == "file2") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);
	},
});

Deno.test({
	name: "rename a directory with files",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "onlyfiles"], ["root", "onlyfiles2"]);

		const result = await fs.readDir(["root", "onlyfiles2"]);

		assertEquals(result, {
			directories: [],
			files: ["subfile1", "subfile2"],
		});
	},
});

Deno.test({
	name: "rename a directory with dirs",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "onlydirs"], ["root", "onlydirs2"]);

		const result = await fs.readDir(["root", "onlydirs2"]);

		assertEquals(result, {
			directories: ["subdir1", "subdir2"],
			files: [],
		});
	},
});

Deno.test({
	name: "move a directory with files",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "onlyfiles"], ["root", "newdir", "onlyfiles"]);

		const result = await fs.readDir(["root", "newdir", "onlyfiles"]);

		assertEquals(result, {
			directories: [],
			files: ["subfile1", "subfile2"],
		});
	},
});

Deno.test({
	name: "move a directory with dirs",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "onlydirs"], ["root", "newdir", "onlydirs"]);

		const result = await fs.readDir(["root", "newdir", "onlydirs"]);

		assertEquals(result, {
			directories: ["subdir1", "subdir2"],
			files: [],
		});
	},
});

Deno.test({
	name: "move() should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		let fired = false;
		fs.onBeforeAnyChange(() => {
			fired = true;
		});

		await fs.move(["root", "file2"], ["root", "file3"]);

		assertEquals(fired, true);
	},
});
