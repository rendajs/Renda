import {assert} from "std/testing/asserts";
import {FsaEditorFileSystem} from "../../../../../../../editor/src/util/fileSystems/FsaEditorFileSystem.js";
import {FakeHandle} from "./shared.js";

Deno.test({
	name: "openUserDir",
	fn: async () => {
		const mockHandle = /** @type {any} */ (new FakeHandle("directory", ""));
		const mockShowDirectoryPicker = async () => {
			return mockHandle;
		};
		const castGlobalThis = /** @type {any} */ (globalThis);
		castGlobalThis.showDirectoryPicker = mockShowDirectoryPicker;

		const fs = await FsaEditorFileSystem.openUserDir();

		assert(fs.handle === mockHandle);
	},
});
