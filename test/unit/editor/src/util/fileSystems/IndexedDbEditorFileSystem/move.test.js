import {assertEquals, assertRejects} from "std/testing/asserts.ts";
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

		assertEquals(await fs.readDir(["root", "newdir", "onlyfiles"]), {
			directories: [],
			files: ["subfile1", "subfile2"],
		});

		assertEquals(await fs.isDir(["root", "onlyfiles"]), false);
	},
});

Deno.test({
	name: "move a directory with dirs",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.move(["root", "onlydirs"], ["root", "newdir", "onlydirs"]);

		assertEquals(await fs.readDir(["root", "newdir", "onlydirs"]), {
			directories: ["subdir1", "subdir2"],
			files: [],
		});

		assertEquals(await fs.isDir(["root", "onlydirs"]), false);
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

Deno.test({
	name: "move() should throw when the from path doesn't exist",
	async fn() {
		const fs = await createBasicFs();

		await assertRejects(async () => {
			await fs.move(["root", "file1", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/file1/nonexistent" does not exist.');
		await assertRejects(async () => {
			await fs.move(["root", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/nonexistent" does not exist.');
		await assertRejects(async () => {
			await fs.move(["root", "onlyfiles", "nonexistent"], ["root", "dest"]);
		}, Error, 'Failed to move: The file or directory at "root/onlyfiles/nonexistent" does not exist.');
	},
});

Deno.test({
	name: "move() should throw when overwriting an existing file",
	async fn() {
		const fs = await createBasicFs();

		await assertRejects(async () => {
			await fs.move(["root", "file1"], ["root", "file2"]);
		}, Error, 'Failed to move: "root/file2" is a file.');
	},
});

Deno.test({
	name: "move() should throw when overwriting an existing directory",
	async fn() {
		const fs = await createBasicFs();

		await fs.writeFile(["root", "onlydirs2", "file1"], "hello1");
		await fs.writeFile(["root", "onlydirs2", "file2"], "hello2");

		await assertRejects(async () => {
			await fs.move(["root", "onlydirs"], ["root", "onlydirs2"]);
		}, Error, 'Failed to move: "root/onlydirs2" is a non-empty directory');
	},
});

Deno.test({
	name: "move() should not throw when overwriting an existing directory if it's empty",
	async fn() {
		const fs = await createBasicFs();

		await fs.createDir(["root", "onlyfiles2"]);

		await fs.move(["root", "onlyfiles"], ["root", "onlyfiles2"]);

		assertEquals(await fs.readDir(["root", "onlyfiles2"]), {
			directories: [],
			files: ["subfile1", "subfile2"],
		});
	},
});
