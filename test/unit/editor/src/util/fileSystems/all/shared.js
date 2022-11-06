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
 * @property {() => import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} create
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
		create() {
			return new IndexedDbEditorFileSystem("fileSystem");
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
 * @typedef FileSystemTest
 * @property {string} name
 * @property {(ctx: FileSystemTestContext) => void} fn
 */

/**
 * @typedef FileSystemTestContext
 * @property {() => import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} createBasicFs
 */

/**
 * @param {FileSystemTest} test
 */
export function testAll(test) {
	for (const {ctor, create} of fileSystems) {
		const name = `${ctor.name}: ${test.name}`;
		/** @type {FileSystemTestContext} */
		const ctx = {
			createBasicFs() {
				return create();
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
