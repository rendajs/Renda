import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";
import {registerOnChangeSpy} from "../shared.js";

Deno.test({
	name: "writeFile()",
	fn: async () => {
		const fs = await createBasicFs();

		await fs.writeFile(["root", "newfile"], "hello world");

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		const text = await fs.readText(["root", "newfile"]);

		assertEquals(text, "hello world");
	},
});

Deno.test({
	name: "writeFile should fire onChange",
	async fn() {
		const fs = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "file1"];
		await fs.writeFile(path, "text");

		// Change the path to verify the event contains a diferent array
		path.push("extra");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "file1"],
					type: "changed",
				},
			],
		});
	},
});
