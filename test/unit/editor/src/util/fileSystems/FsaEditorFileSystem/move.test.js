import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "rename a file",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		await fs.move(["root", "file2"], ["root", "file3"]);

		let hasFile2 = false;
		let hasFile3 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file2") {
				hasFile2 = true;
			} else if (name == "file3") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);
	},
});

Deno.test({
	name: "move a file",
	fn: async () => {
		const {fs, rootDirHandle, onlyFilesDirHandle} = createBasicFs();

		await fs.move(["root", "file2"], ["root", "onlyfiles", "file2"]);

		let hasFile2 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file2") {
				hasFile2 = true;
			}
		}
		let hasFile3 = false;
		for await (const [name] of onlyFilesDirHandle.entries()) {
			if (name == "file2") {
				hasFile3 = true;
			}
		}

		assertEquals(hasFile2, false);
		assertEquals(hasFile3, true);
	},
});

Deno.test({
	name: "renaming should fire onChange",
	fn: async () => {
		const {fs} = createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.move(["root", "file2"], ["root", "file3"]);

		assertSpyCalls(onChangeSpy, 2);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "file3"],
					type: "changed",
				},
			],
		});
		assertSpyCall(onChangeSpy, 1, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file2"],
					type: "deleted",
				},
			],
		});
	},
});
