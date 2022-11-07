import {FsaEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {FakeHandle} from "../FsaEditorFileSystem/shared.js";
import {Importer} from "fake-imports";
import {generateUuid} from "../../../../../../../src/mod.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/FakeIndexedDbUtil.js");

/** @type {import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js")} */
const IndexedDbEditorFileSystemMod = await importer.import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js");
const {IndexedDbEditorFileSystem} = IndexedDbEditorFileSystemMod;
export {IndexedDbEditorFileSystem};

const {forcePendingOperations: forcePendingOperationsImported} = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingIndexedDbOperations = /** @type {typeof import("../../../../shared/FakeIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

/** @typedef {typeof FsaEditorFileSystem | typeof IndexedDbEditorFileSystem | typeof MemoryEditorFileSystem} FileSystemTypes */

/**
 * @typedef FileSystemTestConfig
 * @property {FileSystemTypes} ctor
 * @property {(options?: CreateFsOptions) => import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} create Should
 * create a new instance of the file system.
 * @property {(pending: boolean) => void} forcePendingOperations Should force all read and write promises to stay pending for this
 * file system type.
 */

/** @type {FileSystemTestConfig[]} */
const fileSystems = [
	{
		ctor: FsaEditorFileSystem,
		create() {
			const rootHandle = new FakeHandle("directory", "actualRoot");
			return new FsaEditorFileSystem(/** @type {any} */ (rootHandle));
		},
		forcePendingOperations(pending) {

		},
	},
	{
		ctor: IndexedDbEditorFileSystem,
		create({
			disableStructuredClone = false,
		} = {}) {
			const uuid = generateUuid();
			const fs = new IndexedDbEditorFileSystem("fileSystem" + uuid);
			if (disableStructuredClone) {
				const castDb = /** @type {import("../../../../shared/FakeIndexedDbUtil.js").IndexedDbUtil?} */ (fs.db);
				castDb?.setUseStructuredClone(false);
			}
			return fs;
		},
		forcePendingOperations(pending) {
			forcePendingIndexedDbOperations(pending);
		},
	},
	{
		ctor: MemoryEditorFileSystem,
		create() {
			return new MemoryEditorFileSystem();
		},
		forcePendingOperations(pending) {
			throw new Error("Not yet implemented");
		},
	},
];

/**
 * @typedef CreateFsOptions
 * @property {boolean} [initializeFiles] If true, creates the file system and adds
 * a few basic files that can be used for testing.
 * @property {boolean} [disableStructuredClone]
 */

/**
 * @typedef FileSystemTest
 * @property {string} name
 * @property {(ctx: FileSystemTestContext) => (void | Promise<void>)} fn
 * @property {FileSystemTypes[] | boolean} [ignore] The file system types to ignore this test for.
 * @property {FileSystemTypes[]} [exclude] The file system types to exclude, unlike `ignore` this does not
 * count against the ignored tests in the results, and in stead this test is just completely omitted from the results.
 * @property {boolean} [only] Runs only this test and no others.
 */

/**
 * @typedef FileSystemTestContext
 * @property {(options?: CreateFsOptions) => Promise<import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem>} createFs Creates a
 * new instance of a file system for each file system type that is not ignored.
 * @property {(options?: CreateFsOptions) => Promise<import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem>} createBasicFs Same as
 * `createFs` but has `initializeFiles` set to true.
 * @property {(pending: boolean) => void} forcePendingOperations Forces all read and write promises to stay pending for this
 * file system type.
 */

/**
 * @param {FileSystemTest} test
 */
export function testAll(test) {
	for (const {ctor, create, forcePendingOperations} of fileSystems) {
		if (test.exclude && test.exclude.includes(ctor)) continue;
		let ignore = false;
		if (test.ignore != undefined) {
			if (typeof test.ignore == "boolean") {
				ignore = test.ignore;
			} else {
				ignore = test.ignore.includes(ctor);
			}
		}

		const name = `${ctor.name}: ${test.name}`;
		/**
		 * @param {CreateFsOptions} [options]
		 */
		async function createFs(options) {
			const fs = create(options);
			if (options?.initializeFiles) {
				await fs.createDir(["root"]);
				await fs.writeText(["root", "file1"], "hello");
				await fs.writeText(["root", "file2"], "hello");

				await fs.createDir(["root", "onlyfiles"]);
				await fs.writeText(["root", "onlyfiles", "subfile1"], "hello");
				await fs.writeText(["root", "onlyfiles", "subfile2"], "hello");

				await fs.createDir(["root", "onlydirs"]);
				await fs.createDir(["root", "onlydirs", "subdir1"]);
				await fs.createDir(["root", "onlydirs", "subdir2"]);
			}
			return fs;
		}
		/** @type {FileSystemTestContext} */
		const ctx = {
			createFs,
			async createBasicFs(options) {
				return await createFs({
					...options,
					initializeFiles: true,
				});
			},
			forcePendingOperations,
		};
		Deno.test({
			name,
			ignore,
			only: test.only,
			async fn() {
				await test.fn(ctx);
			},
		});
	}
}
