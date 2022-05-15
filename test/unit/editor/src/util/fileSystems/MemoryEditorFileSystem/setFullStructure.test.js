import {assertEquals} from "std/testing/asserts";
import {MemoryEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";

Deno.test({
	name: "basic structure",
	async fn() {
		const fs = new MemoryEditorFileSystem();

		const file1 = new File(["file1"], "file1.txt");
		const file2 = "file2";
		const file3 = new Blob(["file3"]);
		const file4 = await (new Blob(["file4"])).arrayBuffer();

		fs.setFullStructure({
			"file1.txt": file1,
			"folder/file2.txt": file2,
			"folder/file3.txt": file3,
			"folder/subfolder/file4.txt": file4,
		});

		const readDirResult1 = await fs.readDir([]);
		assertEquals(readDirResult1, {
			directories: ["folder"],
			files: ["file1.txt"],
		});

		const readDirResult2 = await fs.readDir(["folder"]);
		assertEquals(readDirResult2, {
			directories: ["subfolder"],
			files: ["file2.txt", "file3.txt"],
		});

		const fileContent1 = await fs.readText(["file1.txt"]);
		assertEquals(fileContent1, "file1");
		const fileContent2 = await fs.readText(["folder", "file2.txt"]);
		assertEquals(fileContent2, "file2");
		const fileContent3 = await fs.readText(["folder", "file3.txt"]);
		assertEquals(fileContent3, "file3");
		const fileContent4 = await fs.readText(["folder", "subfolder", "file4.txt"]);
		assertEquals(fileContent4, "file4");
	},
});
