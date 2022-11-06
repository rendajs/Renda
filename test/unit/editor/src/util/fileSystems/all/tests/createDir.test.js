import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {testAll} from "../shared.js";
import {registerOnChangeSpy} from "../../shared.js";

testAll({
	name: "should create a directory and fire onchange",
	fn: async ctx => {
		const fs = ctx.createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		const path = ["root", "newdir"];
		const createDirPromise = fs.createDir(path);

		// Change the path to verify that the initial array value is used
		path.push("extra");

		await createDirPromise;

		let hasNewDir = false;
		const {directories} = await fs.readDir(["root"]);
		for (const name of directories) {
			if (name == "newdir") {
				hasNewDir = true;
				break;
			}
		}
		assertEquals(hasNewDir, true);

		const subResult = await fs.readDir(["root", "newdir"]);
		assertEquals(subResult, {
			directories: [],
			files: [],
		});

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
