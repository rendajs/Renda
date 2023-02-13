import {assertEquals} from "std/testing/asserts.ts";
import {StudioFileSystem} from "../../../../../../studio/src/util/fileSystems/StudioFileSystem.js";
import {Importer} from "fake-imports";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

Deno.test({
	name: "writeText",
	fn: async () => {
		let writtenPath = null;
		let writtenFile = new File([], "");
		class ImplementedFileSystem extends StudioFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
			 * @param {File} file
			 */
			async writeFile(path, file) {
				writtenPath = path;
				writtenFile = file;
			}
		}

		const fs = new ImplementedFileSystem();

		fs.writeText(["text.txt"], "Hello World!");

		assertEquals(writtenPath, ["text.txt"]);
		assertEquals(writtenFile.type, "text/plain");
		assertEquals(await writtenFile.text(), "Hello World!");
	},
});

Deno.test({
	name: "readText",
	fn: async () => {
		class ImplementedFileSystem extends StudioFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
			 */
			async readFile(path) {
				assertEquals(path, ["text.txt"]);
				return new File(["Hello World!"], "", {type: "text/plain"});
			}
		}

		const fs = new ImplementedFileSystem();
		const text = await fs.readText(["text.txt"]);

		assertEquals(text, "Hello World!");
	},
});

Deno.test({
	name: "writeJson",
	fn: async () => {
		const importer = new Importer(import.meta.url);
		importer.fakeModule("../../../../../../src/util/toFormattedJsonString.js", `
			export const toFormattedJsonString = (json) => JSON.stringify(json);
		`);
		/** @type {{path: import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath, text: string}[]} */
		const writeCalls = [];

		const {EditorFileSystem: EditorFileSystem2} = await importer.import("../../../../../../studio/src/util/fileSystems/EditorFileSystem.js");
		const CastEditorFileSystem = /** @type {typeof StudioFileSystem} */ (EditorFileSystem2);
		class ImplementedFileSystem extends CastEditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
			 * @param {string} text
			 */
			async writeText(path, text) {
				writeCalls.push({path, text});
			}
		}

		const fs = new ImplementedFileSystem();
		fs.writeJson(["file.json"], {hello: "world"});

		assertEquals(writeCalls, [
			{
				path: ["file.json"],
				text: '{"hello":"world"}',
			},
		]);
	},
});

Deno.test({
	name: "readJson",
	fn: async () => {
		class ImplementedFileSystem extends StudioFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
			 */
			async readFile(path) {
				assertEquals(path, ["data.json"]);
				return new File(['{"hello":"world"}'], "", {type: "application/json"});
			}
		}

		const fs = new ImplementedFileSystem();
		const text = await fs.readJson(["data.json"]);

		assertEquals(text, {hello: "world"});
	},
});

Deno.test({
	name: "readJson tries to parse as json even when mimeType is not application/json",
	fn: async () => {
		class ImplementedFileSystem extends StudioFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
			 */
			async readFile(path) {
				assertEquals(path, ["data.json"]);
				return new File(['{"hello":"world"}'], "", {type: "text/plain"});
			}
		}

		const fs = new ImplementedFileSystem();
		const text = await fs.readJson(["data.json"]);

		assertEquals(text, {hello: "world"});
	},
});

Deno.test({
	name: "waitForWritesFinish() resolves without any pending operations",
	async fn() {
		const fs = new StudioFileSystem();
		await fs.waitForWritesFinish();
	},
});

Deno.test({
	name: "waitForWritesFinish() resolves when the last pending operation is resolved",
	async fn() {
		const fs = new StudioFileSystem();
		const writeOp = fs.requestWriteOperation();
		const promise = fs.waitForWritesFinish();

		let promiseResolved = false;
		promise.then(() => {
			promiseResolved = true;
		});
		await waitForMicrotasks();
		assertEquals(promiseResolved, false);

		writeOp.done();
		await waitForMicrotasks();
		assertEquals(promiseResolved, true);
	},
});

Deno.test({
	name: "waitForWritesFinish() with multiple pending operations",
	async fn() {
		const fs = new StudioFileSystem();
		const op1 = fs.requestWriteOperation();
		const op2 = fs.requestWriteOperation();
		const promise = fs.waitForWritesFinish();

		let promiseResolved = false;
		promise.then(() => {
			promiseResolved = true;
		});
		await waitForMicrotasks();
		assertEquals(promiseResolved, false);

		op1.done();
		await waitForMicrotasks();
		assertEquals(promiseResolved, false);

		op2.done();
		await waitForMicrotasks();
		assertEquals(promiseResolved, true);
	},
});
