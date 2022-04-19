import {assertEquals} from "std/testing/asserts";
import {EditorFileSystem} from "../../../../../../editor/src/util/fileSystems/EditorFileSystem.js";
import {Importer} from "fake-imports";

Deno.test({
	name: "writeText",
	fn: async () => {
		let writtenPath = null;
		let writtenFile = new File([], "");
		class ImplementedFileSystem extends EditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
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
		class ImplementedFileSystem extends EditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
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
		/** @type {{path: import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath, text: string}[]} */
		const writeCalls = [];

		const {EditorFileSystem: EditorFileSystem2} = await importer.import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js");
		const CastEditorFileSystem = /** @type {typeof EditorFileSystem} */ (EditorFileSystem2);
		class ImplementedFileSystem extends CastEditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
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
		class ImplementedFileSystem extends EditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
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
		class ImplementedFileSystem extends EditorFileSystem {
			/**
			 * @override
			 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
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
