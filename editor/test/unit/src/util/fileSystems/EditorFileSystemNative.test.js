import {expect, test} from "@playwright/test";
import {EditorFileSystemNative} from "../../../../../src/Util/FileSystems/EditorFileSystemNative.js";

class FakeHandle {
	/** @type {FakeHandle[]} */
	#entries = [];

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

	async getDirectoryHandle(name) {
		return this.#getHandle("directory", name);
	}

	async getFileHandle(name) {
		return this.#getHandle("file", name);
	}

	#getHandle(kind, name) {
		for (const entry of this.#entries) {
			if (entry.name == name) {
				if (entry.kind != kind) {
					throw {name: "TypeMismatchError"};
				}
				return entry;
			}
		}
		throw {name: "NotFoundError"};
	}

	getFile() {
		return {
			lastModified: 0,
		};
	}
}

test.describe("waitForPermission()", async () => {
	test("should resolve when permission is granted", async () => {
		const path = ["root", "file"];
		const stubRootHandle = new FakeHandle("directory", "");
		stubRootHandle.addFakeEntry("directory", "root").addFakeEntry("file", "file");
		const fs = new EditorFileSystemNative(stubRootHandle);

		const permisionPromise = fs.waitForPermission(path);

		await fs.getPermission(path);

		await expect(permisionPromise).resolves.toBe(undefined);
	});
});
