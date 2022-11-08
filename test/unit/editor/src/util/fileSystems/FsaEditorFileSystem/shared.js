import {FsaEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";

export class FakeHandle {
	/** @type {FakeHandle[]} */
	#entries = [];

	#mockedQueryPermissionState = "granted";
	#mockedRequestPermissionState = "granted";

	#lastModified = 0;

	#fileContent = new ArrayBuffer(0);

	/**
	 * @param {string} kind
	 * @param {string} name
	 */
	constructor(kind, name) {
		this.kind = kind;
		this.name = name;
	}

	async queryPermission() {
		return this.#mockedQueryPermissionState;
	}

	async requestPermission() {
		if (this.#mockedRequestPermissionState == "granted") {
			this.#mockedQueryPermissionState = "granted";
		}
		return this.#mockedRequestPermissionState;
	}

	/**
	 * @param {string} queryState
	 * @param {string?} requestState
	 */
	mockPermissionState(queryState, requestState = null) {
		this.#mockedQueryPermissionState = queryState;
		if (requestState) {
			this.#mockedRequestPermissionState = requestState;
		} else {
			this.#mockedRequestPermissionState = queryState;
		}
	}

	/**
	 * @param {number} value
	 */
	mockLastModifiedValue(value) {
		this.#lastModified = value;
	}

	/**
	 * @param {string} kind
	 * @param {string} name
	 */
	addFakeEntry(kind, name) {
		const entry = new FakeHandle(kind, name);
		this.#entries.push(entry);
		return entry;
	}

	async *entries() {
		for (const entry of this.#entries) {
			yield [entry.name, entry];
		}
	}

	/**
	 * @param {string} name
	 */
	async getDirectoryHandle(name, {
		create = false,
	} = {}) {
		return this.#getHandle("directory", name, create);
	}

	/**
	 * @param {string} name
	 */
	async getFileHandle(name, {
		create = false,
	} = {}) {
		return this.#getHandle("file", name, create);
	}

	/**
	 * @param {string} kind
	 * @param {string} name
	 */
	#getHandle(kind, name, create = false) {
		for (const entry of this.#entries) {
			if (entry.name == name) {
				if (entry.kind != kind) {
					// We'll want to keep an eye out for https://github.com/whatwg/fs/issues/57
					// since error types might change in the future.
					throw new DOMException("", "TypeMismatchError");
				}
				return entry;
			}
		}
		if (create) {
			return this.addFakeEntry(kind, name);
		}
		// We'll want to keep an eye out for https://github.com/whatwg/fs/issues/57
		// since error types might change in the future.
		throw new DOMException("", "NotFoundError");
	}

	getFile() {
		return new File([this.#fileContent], "", {lastModified: this.#lastModified});
	}

	/**
	 * @param {string} name
	 */
	async removeEntry(name, {
		recursive = false,
	} = {}) {
		for (const entry of this.#entries) {
			if (entry.name == name) {
				let hasChildren = false;
				for await (const _ of entry.entries()) {
					hasChildren = true;
					break;
				}
				if (hasChildren && !recursive) {
					throw new DOMException("", "InvalidModificationError");
				}
				this.#entries.splice(this.#entries.indexOf(entry), 1);
				return;
			}
		}
		throw new DOMException("", "NotFoundError");
	}

	/**
	 * @param {FileSystemCreateWritableOptions} param0
	 */
	createWritable({
		keepExistingData,
	} = {}) {
		if (!keepExistingData) {
			this.#fileContent = new ArrayBuffer(0);
		}
		/** @type {WritableStream<FileSystemWriteChunkType>} */
		const stream = new WritableStream({
			write: async chunk => {
				if (chunk instanceof Blob) {
					chunk = await chunk.arrayBuffer();
				}
				if (typeof chunk == "string") {
					chunk = new TextEncoder().encode(chunk).buffer;
				}
				if (!(chunk instanceof ArrayBuffer)) {
					throw new Error("Writing this type is not supported in the mock file handle.");
				}
				const newBuffer = new ArrayBuffer(this.#fileContent.byteLength + chunk.byteLength);
				const view = new Uint8Array(newBuffer);
				view.set(new Uint8Array(this.#fileContent));
				view.set(new Uint8Array(chunk), this.#fileContent.byteLength);
				this.#fileContent = view.buffer;
			},
		});
		return stream.getWriter();
	}
}

/**
 * @typedef BasicFsData
 * @property {FileSystemDirectoryHandle & FakeHandle} rootHandle
 * @property {FileSystemDirectoryHandle & FakeHandle} rootDirHandle
 * @property {FileSystemFileHandle & FakeHandle} fileHandle1
 * @property {FileSystemFileHandle & FakeHandle} fileHandle2
 * @property {FileSystemDirectoryHandle & FakeHandle} onlyFilesDirHandle
 * @property {FileSystemFileHandle & FakeHandle} subFileHandle1
 * @property {FileSystemFileHandle & FakeHandle} subFileHandle2
 * @property {FileSystemDirectoryHandle & FakeHandle} onlyDirsDirHandle
 * @property {FileSystemDirectoryHandle & FakeHandle} subDirHandle1
 * @property {FileSystemDirectoryHandle & FakeHandle} subDirHandle2
 */

/**
 * @param {((basicFs: BasicFsData) => void)?} beforeCreateHook A hook that fires right before the FileSystem is created.
 * Useful for setting permissions before the FileSystem watch tree is created.
 */
export function createBasicFs(beforeCreateHook = null) {
	const rootHandle = new FakeHandle("directory", "actualRoot");
	const rootDirHandle = rootHandle.addFakeEntry("directory", "root");
	const fileHandle1 = rootDirHandle.addFakeEntry("file", "file1");
	const fileHandle2 = rootDirHandle.addFakeEntry("file", "file2");

	const onlyFilesDirHandle = rootDirHandle.addFakeEntry("directory", "onlyfiles");
	const subFileHandle1 = onlyFilesDirHandle.addFakeEntry("file", "subfile1");
	const subFileHandle2 = onlyFilesDirHandle.addFakeEntry("file", "subfile2");

	const onlyDirsDirHandle = rootDirHandle.addFakeEntry("directory", "onlydirs");
	const subDirHandle1 = onlyDirsDirHandle.addFakeEntry("directory", "subdir1");
	const subDirHandle2 = onlyDirsDirHandle.addFakeEntry("directory", "subdir2");

	const castRootHandle = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (rootHandle);
	const castRootDirHandle = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (rootDirHandle);
	const castFileHandle1 = /** @type {FileSystemFileHandle & FakeHandle} */ (fileHandle1);
	const castFileHandle2 = /** @type {FileSystemFileHandle & FakeHandle} */ (fileHandle2);

	const castOnlyFilesDirHandle = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (onlyFilesDirHandle);
	const castSubFileHandle1 = /** @type {FileSystemFileHandle & FakeHandle} */ (subFileHandle1);
	const castSubFileHandle2 = /** @type {FileSystemFileHandle & FakeHandle} */ (subFileHandle2);

	const castOnlyDirsDirHandle = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (onlyDirsDirHandle);
	const castSubDirHandle1 = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (subDirHandle1);
	const castSubDirHandle2 = /** @type {FileSystemDirectoryHandle & FakeHandle} */ (subDirHandle2);

	/** @type {BasicFsData} */
	const basicFs = {
		rootHandle: castRootHandle,
		rootDirHandle: castRootDirHandle,
		fileHandle1: castFileHandle1,
		fileHandle2: castFileHandle2,

		onlyFilesDirHandle: castOnlyFilesDirHandle,
		subFileHandle1: castSubFileHandle1,
		subFileHandle2: castSubFileHandle2,

		onlyDirsDirHandle: castOnlyDirsDirHandle,
		subDirHandle1: castSubDirHandle1,
		subDirHandle2: castSubDirHandle2,
	};

	if (beforeCreateHook) beforeCreateHook(basicFs);

	const fs = new FsaEditorFileSystem(/** @type {any} */ (rootHandle));

	return {
		fs,
		...basicFs,
	};
}
