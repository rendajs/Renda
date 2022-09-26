import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory and fire onchange",
	fn: async () => {
		const {fs, rootDirHandle} = createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "newdir"];
		const createDirPromise = fs.createDir(path);

		// Change the path to verify that the initial array value is used
		path.push("extra");

		await createDirPromise;

		let newDirHandle;
		for await (const [name, handle] of rootDirHandle.entries()) {
			if (name == "newdir") {
				newDirHandle = handle;
				break;
			}
		}
		assertExists(newDirHandle);
		assert(newDirHandle.kind == "directory", "Created handle is not a directory");
		let subChildCount = 0;
		for await (const _ of newDirHandle.entries()) {
			subChildCount++;
		}
		assertEquals(subChildCount, 0);

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: ["root", "newdir"],
					type: "created",
				},
			],
		});
	},
});
