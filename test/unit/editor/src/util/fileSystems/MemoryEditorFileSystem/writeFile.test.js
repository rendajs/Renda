import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";
import {registerOnChangeSpy} from "../shared.js";

Deno.test({
	name: "writeFile should create a file and fire onChange",
	async fn() {
		const fs = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "newfile"];
		const writeFilePromise = fs.writeFile(path, "text");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		const text = await fs.readText(["root", "newfile"]);
		assertEquals(text, "hello world");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "newfile"],
					type: "changed",
				},
			],
		});
	},
});
