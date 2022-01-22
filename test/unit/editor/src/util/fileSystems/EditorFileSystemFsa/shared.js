import {EditorFileSystemFsa} from "../../../../../../../editor/src/util/fileSystems/EditorFileSystemFsa.js";

export class FakeHandle {
	/** @type {FakeHandle[]} */
	#entries = [];

	#mockedQueryPermissionState = "granted";
	#mockedRequestPermissionState = "granted";

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
	async getDirectoryHandle(name) {
		return this.#getHandle("directory", name);
	}

	/**
	 * @param {string} name
	 */
	async getFileHandle(name) {
		return this.#getHandle("file", name);
	}

	/**
	 * @param {string} kind
	 * @param {string} name
	 */
	#getHandle(kind, name) {
		for (const entry of this.#entries) {
			if (entry.name == name) {
				if (entry.kind != kind) {
					throw new DOMException("", "TypeMismatchError");
				}
				return entry;
			}
		}
		throw new DOMException("", "NotFoundError");
	}

	getFile() {
		return {
			lastModified: 0,
		};
	}
}

export function createBasicFs() {
	const rootHandle = new FakeHandle("directory", "");
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

	const fs = new EditorFileSystemFsa(/** @type {any} */ (rootHandle));

	return {
		fs,
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
}
