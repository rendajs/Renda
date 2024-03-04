import { assert } from "std/testing/asserts.ts";
import { FsaStudioFileSystem } from "../../../../../../../studio/src/util/fileSystems/FsaStudioFileSystem.js";
import { FakeHandle } from "./shared.js";

Deno.test({
	name: "openUserDir",
	fn: async () => {
		const mockHandle = /** @type {any} */ (new FakeHandle("directory", ""));
		const mockShowDirectoryPicker = async () => {
			return mockHandle;
		};
		const castGlobalThis = /** @type {any} */ (globalThis);
		castGlobalThis.showDirectoryPicker = mockShowDirectoryPicker;

		const fs = await FsaStudioFileSystem.openUserDir();

		assert(fs.handle === mockHandle);
	},
});
