import {FsaStudioFileSystem} from "../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import {MemoryStudioFileSystem} from "../../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {FakeHandle} from "../FsaStudioFileSystem/shared.js";
import {Importer} from "fake-imports";
import {TypedMessenger, generateUuid} from "../../../../../../../src/mod.js";
import {RemoteStudioFileSystem} from "../../../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js";
import {createFileSystemHandlers} from "../../../../../../../studio/src/network/studioConnections/responseHandlers/fileSystem.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../../../src/util/IndexedDbUtil.js", "../../../../shared/MockIndexedDbUtil.js");

/** @type {import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js")} */
const IndexedDbStudioFileSystemMod = await importer.import("../../../../../../../studio/src/util/fileSystems/IndexedDbStudioFileSystem.js");
const {IndexedDbStudioFileSystem} = IndexedDbStudioFileSystemMod;
export {IndexedDbStudioFileSystem};

const {forcePendingOperations: forcePendingOperationsImported} = await importer.import("../../../../../../../src/util/IndexedDbUtil.js");
const forcePendingIndexedDbOperations = /** @type {typeof import("../../../../shared/MockIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

/** @typedef {typeof FsaStudioFileSystem | typeof IndexedDbStudioFileSystem | typeof MemoryStudioFileSystem | typeof RemoteStudioFileSystem} FileSystemTypes */

/**
 * @typedef FileSystemTestConfig
 * @property {FileSystemTypes} ctor
 * @property {(options?: CreateFsOptions) => import("../../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} create Should
 * create a new instance of the file system.
 * @property {(pending: boolean) => void} forcePendingOperations Should force all read and write promises to stay pending for this
 * file system type.
 */

/** @type {FileSystemTestConfig[]} */
const fileSystems = [
	{
		ctor: FsaStudioFileSystem,
		create() {
			const rootHandle = new FakeHandle("directory", "actualRoot");
			return new FsaStudioFileSystem(/** @type {any} */ (rootHandle));
		},
		forcePendingOperations(pending) {

		},
	},
	{
		ctor: IndexedDbStudioFileSystem,
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
		ctor: MemoryStudioFileSystem,
		create() {
			return new MemoryStudioFileSystem();
		},
		forcePendingOperations(pending) {
			throw new Error("Not yet implemented");
		},
	},
	{
		ctor: RemoteStudioFileSystem,
		create() {
			const memoryFs = new MemoryStudioFileSystem();
			const handlers = createFileSystemHandlers(memoryFs);
			const hostMessenger = new TypedMessenger();
			hostMessenger.setResponseHandlers(handlers);
			const clientMessenger = new TypedMessenger();

			// Link the two messengers to each other
			hostMessenger.setSendHandler(data => {
				clientMessenger.handleReceivedMessage(structuredClone(data.sendData));
			});
			clientMessenger.setSendHandler(data => {
				hostMessenger.handleReceivedMessage(structuredClone(data.sendData));
			});

			const clientConnection = /** @type {import("../../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioClientHostConnection} */ (/** @type {unknown} */ ({
				messenger: clientMessenger,
			}));
			const remoteFs = new RemoteStudioFileSystem();
			remoteFs.setConnection(clientConnection);
			return remoteFs;
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
 * count against the ignored tests in the results, and instead this test is just completely omitted from the results.
 * @property {boolean} [only] Runs only this test and no others.
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
