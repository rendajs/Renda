import {assertEquals} from "std/testing/asserts.ts";
import {getNameAndExtension} from "../../../../../../../editor/src/util/fileSystems/pathUtil.js";

Deno.test({
	name: "Basic",
	fn: () => {
		const path = "name.ext";

		const result = getNameAndExtension(path);

		assertEquals(result, {
			name: "name",
			extension: "ext",
		});
	},
});

Deno.test({
	name: "No extension",
	fn: () => {
		const path = "name";

		const result = getNameAndExtension(path);

		assertEquals(result, {
			name: "name",
			extension: null,
		});
	},
});

Deno.test({
	name: "Full path",
	fn: () => {
		const path = "full/path/to/name.ext";

		const result = getNameAndExtension(path);

		assertEquals(result, {
			name: "full/path/to/name",
			extension: "ext",
		});
	},
});
