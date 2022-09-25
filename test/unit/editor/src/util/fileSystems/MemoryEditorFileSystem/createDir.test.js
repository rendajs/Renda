import {assert} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory and fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		/** @type {import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} */
		const cb = () => {};
		const onChangeSpy = spy(cb);
		fs.onChange(onChangeSpy);

		const path = ["root", "newdir"];
		const createDirPromise = fs.createDir(path);

		// Change the path to verify the initial array value is used
		path.push("extra");

		await createDirPromise;

		const {directories} = await fs.readDir(["root"]);
		assert(directories.includes("newdir"), "'newdir' was not created");

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
