import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {EditorFileSystem} from "../../../../../../editor/src/util/fileSystems/EditorFileSystem.js";

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
