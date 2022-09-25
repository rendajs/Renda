import {assert} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should create a directory and fire onBeforeAnyChange",
	fn: async () => {
		const fs = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

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
