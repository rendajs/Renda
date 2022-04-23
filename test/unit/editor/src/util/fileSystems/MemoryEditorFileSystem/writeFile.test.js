import {assert} from "std/testing/asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "writeFile()",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.writeFile(["root", "newfile"], "hello world");

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");
	},
});
