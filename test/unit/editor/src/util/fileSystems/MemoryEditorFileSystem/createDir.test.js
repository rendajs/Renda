import {assert, assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.createDir(["root", "newdir"]);

		const {directories} = await fs.readDir(["root"]);
		assert(directories.includes("newdir"), "'newdir' was not created");
	},
});

Deno.test({
	name: "should fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();

		/** @type {import("../../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} */
		const cb = () => {};
		const onChangeSpy = spy(cb);
		fs.onChange(onChangeSpy);

		const path = ["root", "newdir"];
		await fs.createDir(path);

		// Change the path to verify the event contains a diferent array
		path.push("extra");

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
