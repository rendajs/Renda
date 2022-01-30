import {Importer} from "fake-imports";

/** @type {Importer?} */
let importer = null;
export function getImporter() {
	if (importer) return importer;

	importer = new Importer(import.meta.url);
	importer.fakeModule("../../../../../../../src/util/IndexedDbUtil.js", `
		import {FakeIndexedDbUtil} from "../../test/unit/editor/src/util/fileSystems/EditorFileSystemIndexedDb/FakeIndexedDbUtil.js";
		export {FakeIndexedDbUtil as IndexedDbUtil};
	`);
	return importer;
}

let isLoadingEditorFileSystemIndexedDb = false;
/** @type {typeof import("../../../../../../../editor/src/util/fileSystems/EditorFileSystemIndexedDb.js").EditorFileSystemIndexedDb?} */
let loadedEditorFileSystemIndexedDb = null;
const onEditorFileSystemIndexedDbLoadCbs = new Set();

/**
 * @returns {Promise<typeof import("../../../../../../../editor/src/util/fileSystems/EditorFileSystemIndexedDb.js").EditorFileSystemIndexedDb>}
 */
export async function getEditorFileSystemIndexedDb() {
	if (loadedEditorFileSystemIndexedDb) return loadedEditorFileSystemIndexedDb;
	if (isLoadingEditorFileSystemIndexedDb) {
		return await new Promise(r => onEditorFileSystemIndexedDbLoadCbs.add(r));
	}
	isLoadingEditorFileSystemIndexedDb = true;
	const importer = getImporter();
	const {EditorFileSystemIndexedDb} = await importer.import("../../../../../../../editor/src/util/fileSystems/EditorFileSystemIndexedDb.js");
	loadedEditorFileSystemIndexedDb = EditorFileSystemIndexedDb;
	onEditorFileSystemIndexedDbLoadCbs.forEach(r => r());
	if (!loadedEditorFileSystemIndexedDb) throw new Error("EditorFileSystemIndexedDb not loaded");
	return loadedEditorFileSystemIndexedDb;
}

export async function createFs(name = "fs") {
	const EditorFileSystemIndexedDb = await getEditorFileSystemIndexedDb();

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

export async function finishCoverageMapWrites() {
	const importer = getImporter();
	await importer.finishCoverageMapWrites();
}
