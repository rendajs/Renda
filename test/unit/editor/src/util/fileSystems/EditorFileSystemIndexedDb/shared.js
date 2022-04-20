import {Importer} from "fake-imports";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "./FakeIndexedDbUtil.js");

const {EditorFileSystemIndexedDb: EditorFileSystemIndexedDbImported} = await importer.import("../../../../../../../editor/src/util/fileSystems/EditorFileSystemIndexedDb.js");
const EditorFileSystemIndexedDb = /** @type {typeof import("../../../../../../../editor/src/util/fileSystems/EditorFileSystemIndexedDb.js").EditorFileSystemIndexedDb} */ (EditorFileSystemIndexedDbImported);

const {forcePendingOperations: forcePendingOperationsImported} = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingOperations = /** @type {typeof import("./FakeIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

export {forcePendingOperations};

export async function createFs(name = "fs") {
	const fs = new EditorFileSystemIndexedDb(name);

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
