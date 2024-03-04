import { FsaStudioFileSystem } from "../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import { MemoryStudioFileSystem } from "../../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import { FakeHandle } from "../FsaStudioFileSystem/shared.js";
import { Importer } from "fake-imports";
import { generateUuid } from "../../../../../../../src/mod.js";
import { RemoteStudioFileSystem } from "../../../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js";
import { createFileSystemClientHandlers, createFileSystemHostHandlers, createFileSystemRequestDeserializers, createFileSystemRequestSerializers, createFileSystemResponseDeserializers, createFileSystemResponseSerializers } from "../../../../../../../studio/src/network/studioConnections/responseHandlers/fileSystem.js";
import { createLinkedStudioConnections } from "../../../../../src/network/studioConnections/shared.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/MockIndexedDbUtil.js");

/** @type {import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js")} */
const IndexedDbStudioFileSystemMod = await importer.import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js");
const { IndexedDbStudioFileSystem } = IndexedDbStudioFileSystemMod;

const { forcePendingOperations: forcePendingOperationsImported } = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingIndexedDbOperations = /** @type {typeof import("../../../../shared/MockIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

/** @typedef {"fsa" | "indexedDb" | "memory" | "remote" | "serialized-remote"} FileSystemTestTypes */

/**
 * @typedef FileSystemTestConfig
 * @property {FileSystemTestTypes} type
 * @property {(options?: CreateFsOptions) => import("../../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} create Should
 * create a new instance of the file system.
 * @property {(pending: boolean) => void} forcePendingOperations Should force all read and write promises to stay pending for this
 * file system type.
 */

/**
 * @param {FileSystemTestTypes} type
 * @param {boolean} supportsSerialization
 * @returns {FileSystemTestConfig}
 */
function createRemoteFileSystemTestConfig(type, supportsSerialization) {
	return {
		type,
		create() {
			const memoryFs = new MemoryStudioFileSystem();
			const remoteFs = new RemoteStudioFileSystem();
			const { connectionA, connectionB } = createLinkedStudioConnections({
				reliableResponseHandlers: {
					...createFileSystemHostHandlers(memoryFs),
				},
				requestDeserializers: {
					...createFileSystemRequestDeserializers(),
				},
				responseSerializers: {
					...createFileSystemResponseSerializers(),
				},
			}, {
				reliableResponseHandlers: {
					...createFileSystemClientHandlers(remoteFs),
				},
				requestSerializers: {
					...createFileSystemRequestSerializers(),
				},
				responseDeserializers: {
					...createFileSystemResponseDeserializers(),
				},
			}, {
				supportsSerialization,
			});
			remoteFs.setConnection(connectionB);
			memoryFs.onChange((e) => {
				connectionA.messenger.send["fileSystem.changeEvent"](e);
			});
			return remoteFs;
		},
		forcePendingOperations(pending) {
			throw new Error("Not yet implemented");
		},
	};
}

/** @type {FileSystemTestConfig[]} */
const fileSystems = [
	{
		type: "fsa",
		create() {
			const rootHandle = new FakeHandle("directory", "actualRoot");
			return new FsaStudioFileSystem(/** @type {any} */ (rootHandle));
		},
		forcePendingOperations(pending) {

		},
	},
	{
		type: "indexedDb",
		create({
			disableStructuredClone = false,
		} = {}) {
			const uuid = generateUuid();
			const fs = new IndexedDbStudioFileSystem("fileSystem" + uuid);
			if (disableStructuredClone) {
				const castDb = /** @type {import("../../../../shared/MockIndexedDbUtil.js").MockIndexedDbUtil?} */ (fs.db);
				castDb?.setUseStructuredClone(false);
			}
			return fs;
		},
		forcePendingOperations(pending) {
			forcePendingIndexedDbOperations(pending);
		},
	},
	{
		type: "memory",
		create() {
			return new MemoryStudioFileSystem();
		},
		forcePendingOperations(pending) {
			throw new Error("Not yet implemented");
		},
	},
	createRemoteFileSystemTestConfig("remote", true),
	createRemoteFileSystemTestConfig("serialized-remote", false),
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
 * @property {FileSystemTestTypes[] | boolean} [ignore] The file system types to ignore this test for.
 * @property {FileSystemTestTypes[]} [exclude] The file system types to exclude, unlike `ignore` this does not
 * count against the ignored tests in the results, and instead this test is just completely omitted from the results.
 * @property {boolean | FileSystemTestTypes} [only] Runs only this test and no others.
 */

/**
 * @typedef FileSystemTestContext
 * @property {(options?: CreateFsOptions) => Promise<import("../../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem>} createFs Creates a
 * new instance of a file system for each file system type that is not ignored.
 * @property {(options?: CreateFsOptions) => Promise<import("../../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem>} createBasicFs Same as
 * `createFs` but has `initializeFiles` set to true.
 * @property {(pending: boolean) => void} forcePendingOperations Forces all read and write promises to stay pending for this
 * file system type.
 */

/**
 * @param {FileSystemTest} test
 */
export function testAll(test) {
	for (const { type, create, forcePendingOperations } of fileSystems) {
		if (test.exclude && test.exclude.includes(type)) continue;
		let ignore = false;
		if (test.ignore != undefined) {
			if (typeof test.ignore == "boolean") {
				ignore = test.ignore;
			} else {
				ignore = test.ignore.includes(type);
			}
		}

		const name = `${type}: ${test.name}`;
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
			only: test.only === true || test.only == type,
			async fn() {
				await test.fn(ctx);
			},
		});
	}
}
