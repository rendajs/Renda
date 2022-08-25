import {Importer} from "fake-imports";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/FakeIndexedDbUtil.js");

/** @type {import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js")} */
const IndexedDbEditorFileSystemMod = await importer.import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js");
const {IndexedDbEditorFileSystem} = IndexedDbEditorFileSystemMod;

const {forcePendingOperations: forcePendingOperationsImported} = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingOperations = /** @type {typeof import("../../../../shared/FakeIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

export {forcePendingOperations};

export async function createFs(name = "fs") {
	const fs = new IndexedDbEditorFileSystem(name);

	return fs;
}

let lastCreatedFsNameId = 0;
export async function createBasicFs() {
	lastCreatedFsNameId++;
	const fs = await createFs(`fileSystem_${lastCreatedFsNameId}`);
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
