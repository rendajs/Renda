import {assertEquals} from "std/testing/asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "basic directory",
	fn: async () => {
		const {fs} = createBasicFs();

		const result = await fs.readDir(["root"]);

		assertEquals(result, {
			files: ["file1", "file2"],
			directories: ["onlyfiles", "onlydirs"],
		});
	},
});

Deno.test({
	name: "only files",
	fn: async () => {
		const {fs} = createBasicFs();

		const result = await fs.readDir(["root", "onlyfiles"]);

		assertEquals(result, {
			files: ["subfile1", "subfile2"],
			directories: [],
		});
	},
});

Deno.test({
	name: "only dirs",
	fn: async () => {
		const {fs} = createBasicFs();

		const result = await fs.readDir(["root", "onlydirs"]);

		assertEquals(result, {
			files: [],
			directories: ["subdir1", "subdir2"],
		});
	},
});

Deno.test({
	name: "empty directory",
	fn: async () => {
		const {fs} = createBasicFs();

		const result = await fs.readDir(["root", "onlydirs", "subdir1"]);

		assertEquals(result, {
			files: [],
			directories: [],
		});
	},
});
