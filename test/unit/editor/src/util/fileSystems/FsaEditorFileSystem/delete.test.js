import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "Should delete files and fire onChange",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "file1"];
		const deletePromise = fs.delete(path);

		// Change the path to verify that the initial array is used
		path.push("extra");

		await deletePromise;

		let hasFile1 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}
		assertEquals(hasFile1, false);

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "unknown",
					path: ["root", "file1"],
					type: "deleted",
				},
			],
		});
	},
});
