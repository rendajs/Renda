import { assertExists } from "std/testing/asserts.ts";
import { Importer } from "fake-imports";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/MockIndexedDbUtil.js");

/** @type {import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js")} */
const IndexedDbStudioFileSystemMod = await importer.import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js");
const { IndexedDbStudioFileSystem } = IndexedDbStudioFileSystemMod;

const { forcePendingOperations: forcePendingOperationsImported } = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingOperations = /** @type {typeof import("../../../../shared/MockIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

export { forcePendingOperations };

export async function createFs(name = "fs") {
	const fs = new IndexedDbStudioFileSystem(name);

	return fs;
}

let lastCreatedFsNameId = 0;
export async function createBasicFs({
	disableStructuredClone = false,
} = {}) {
	lastCreatedFsNameId++;
	const fs = await createFs(`fileSystem_${lastCreatedFsNameId}`);
	if (disableStructuredClone) {
		const castDb = /** @type {import("../../../../shared/MockIndexedDbUtil.js").MockIndexedDbUtil?} */ (fs.db);
		castDb?.setUseStructuredClone(false);
	}
	await fs.createDir(["root"]);
	await fs.writeText(["root", "file1"], "hello");
	await fs.writeText(["root", "file2"], "hello");

	await fs.createDir(["root", "onlyfiles"]);
	await fs.writeText(["root", "onlyfiles", "subfile1"], "hello");
	await fs.writeText(["root", "onlyfiles", "subfile2"], "hello");

	await fs.createDir(["root", "onlydirs"]);
	await fs.createDir(["root", "onlydirs", "subdir1"]);
	await fs.createDir(["root", "onlydirs", "subdir2"]);

	return {
		fs,
		getEntryCount() {
			const db = /** @type {import("../../../../shared/MockIndexedDbUtil.js").MockIndexedDbUtil?} */ (fs.db);
			assertExists(db);
			return Array.from(db.entries()).length;
		},
	};
}
