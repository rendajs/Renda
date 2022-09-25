import {assert, assertExists} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "writeFile should write files and fire onChange",
	async fn() {
		const {fs, rootDirHandle} = createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		fs.onChange(onChangeSpy);

		const path = ["root", "created"];
		const writeFilePromise = fs.writeFile(path, "text");

		// Change the path to verify that the initial array is used
		path.push("extra");

		await writeFilePromise;

		// The mock file handle doesn't have reading and writing implemented,
		// so we'll only check for its existence.
		let file1Handle = null;
		for await (const [name, handle] of rootDirHandle.entries()) {
			if (name == "created") {
				file1Handle = handle;
			}
		}
		assertExists(file1Handle);
		assert(file1Handle.kind == "file");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "file",
					path: ["root", "created"],
					type: "changed",
				},
			],
		});
	},
});
