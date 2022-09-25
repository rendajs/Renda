import {assert, assertExists} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should write files",
	async fn() {
		const {fs, rootDirHandle} = createBasicFs();
		await fs.writeFile(["root", "created"], "hello");

		let file1Handle = null;
		for await (const [name, handle] of rootDirHandle.entries()) {
			if (name == "created") {
				file1Handle = handle;
			}
		}

		// The mock file handle doesn't have reading and writing implemented,
		// so we'll only check for its existence.
		assertExists(file1Handle);
		assert(file1Handle.kind == "file");
	},
});

Deno.test({
	name: "writeFile should fire onChange",
	async fn() {
		const {fs} = createBasicFs();
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
