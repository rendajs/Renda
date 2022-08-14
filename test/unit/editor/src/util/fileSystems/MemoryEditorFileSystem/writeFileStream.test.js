import {assert, assertEquals} from "std/testing/asserts.ts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "writeFile()",
	fn: async () => {
		const fs = await createBasicFs();

		const stream = await fs.writeFileStream(["root", "newfile"]);

		await stream.write("hello world hello world hello world");
		await stream.write({
			type: "write",
			position: 0,
			data: "overwrite",
		});
		const blob = new Blob(["overwrite"]);
		await stream.write(blob);
		await stream.close();

		const {files} = await fs.readDir(["root"]);
		assert(files.includes("newfile"), "'newfile' was not created");

		const text = await fs.readText(["root", "newfile"]);

		assertEquals(text, "overwriteoverwriteworld hello world");
	},
});
