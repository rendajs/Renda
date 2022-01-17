import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {EditorFileSystemFsa} from "../../../../../../editor/src/util/fileSystems/EditorFileSystemFsa.js";

class FakeHandle {
	/** @type {FakeHandle[]} */
	#entries = [];

	/**
	 * @param {string} kind
	 * @param {string} name
	 */
	constructor(kind, name) {
		this.kind = kind;
		this.name = name;
	}

	async queryPermission() {
		return "granted";
	}

	async requestPermission() {
		return "granted";
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

Deno.test("should resolve when permission is granted", async () => {
	const path = ["root", "file"];
	const stubRootHandle = new FakeHandle("directory", "");
	stubRootHandle.addFakeEntry("directory", "root").addFakeEntry("file", "file");
	const fs = new EditorFileSystemFsa(stubRootHandle);

	const permisionPromise = fs.waitForPermission(path);

	await fs.getPermission(path);

	const permissionPromiseResult = await permisionPromise;
	assertEquals(permissionPromiseResult, undefined);
});
