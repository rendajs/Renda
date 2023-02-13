import {MemoryEditorFileSystem} from "../../../../../../../studio/src/util/fileSystems/MemoryEditorFileSystem.js";

export async function createBasicFs() {
	const fs = new MemoryEditorFileSystem();
	await fs.createDir(["root"]);
	await fs.writeText(["root", "file1"], "hello");
	await fs.writeText(["root", "file2"], "hello");

	await fs.createDir(["root", "onlyfiles"]);
	await fs.writeText(["root", "onlyfiles", "subfile1"], "hello");
	await fs.writeText(["root", "onlyfiles", "subfile2"], "hello");

	await fs.createDir(["root", "onlydirs"]);
	await fs.createDir(["root", "onlydirs", "subdir1"]);
	await fs.createDir(["root", "onlydirs", "subdir2"]);

	return fs;
}
