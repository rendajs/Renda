import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "Should delete files",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();

		await fs.delete(["root", "file1"]);

		let hasFile1 = false;
		for await (const [name] of rootDirHandle.entries()) {
			if (name == "file1") {
				hasFile1 = true;
			}
		}

		assertEquals(hasFile1, false);
	},
});

Deno.test({
	name: "should fire onChange",
	fn: async () => {
		const {fs} = createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "file1"];
		await fs.delete(path);

		// Change the path to verify the event contains a diferent array
		path.push("extra");

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
