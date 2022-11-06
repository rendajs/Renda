import {FsaEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {MemoryEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {FakeHandle} from "../FsaEditorFileSystem/shared.js";
import {Importer} from "fake-imports";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/FakeIndexedDbUtil.js");

/** @type {import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js")} */
const IndexedDbEditorFileSystemMod = await importer.import("../../../../../../../editor/src/util/fileSystems/IndexedDbEditorFileSystem.js");
const {IndexedDbEditorFileSystem} = IndexedDbEditorFileSystemMod;

/**
 * @typedef FileSystemTestData
 * @property {Function} ctor
 * @property {(options?: CreateBasicFsOptions) => import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} create
 */

/** @type {FileSystemTestData[]} */
const fileSystems = [
	{
		ctor: FsaEditorFileSystem,
		create() {
			const rootHandle = new FakeHandle("directory", "actualRoot");
			return new FsaEditorFileSystem(/** @type {any} */ (rootHandle));
		},
	},
	{
		ctor: IndexedDbEditorFileSystem,
		create({
			disableStructuredClone = false,
		} = {}) {
			const fs = new IndexedDbEditorFileSystem("fileSystem");
			if (disableStructuredClone) {
				const castDb = /** @type {import("../../../../shared/FakeIndexedDbUtil.js").IndexedDbUtil?} */ (fs.db);
				castDb?.setUseStructuredClone(false);
			}
			return fs;
		},
	},
	{
		ctor: MemoryEditorFileSystem,
		create() {
			return new MemoryEditorFileSystem();
		},
	},
];

/**
 * @typedef CreateBasicFsOptions
 * @property {boolean} [disableStructuredClone]
 */

/**
 * @typedef FileSystemTest
 * @property {string} name
 * @property {(ctx: FileSystemTestContext) => void} fn
 */

/**
 * @typedef FileSystemTestContext
 * @property {(options?: CreateBasicFsOptions) => import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} createFs
 */

/**
 * @param {FileSystemTest} test
 */
export function testAll(test) {
	for (const {ctor, create} of fileSystems) {
		const name = `${ctor.name}: ${test.name}`;
		/** @type {FileSystemTestContext} */
		const ctx = {
			createFs(options) {
				return create(options);
			},
		};
		Deno.test({
			name,
			fn() {
				test.fn(ctx);
			},
		});
	}
}
