import {assert, assertNotEquals} from "asserts";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "should get a file",
	fn: async () => {
		const {fs} = createBasicFs();

		const file = await fs.readFile(["root", "file1"]);

		assert(file instanceof File, "file is not an instance of File");
	},
});

Deno.test({
	name: "Two calls at once",
	fn: async () => {
		const {fs} = createBasicFs();

		const promise1 = fs.readFile(["root", "file1"]);
		const promise2 = fs.readFile(["root", "file1"]);

		const file1 = await promise1;
		const file2 = await promise2;

		assert(file1 instanceof File, "file1 is not an instance of File");
		assert(file2 instanceof File, "file2 is not an instance of File");
		assert(file1 === file2, "file1 and file2 are not the same instance");
	},
});

Deno.test({
	name: "Two calls at once, missing file",
	fn: async () => {
		const {fs} = createBasicFs();

		const promise1 = fs.readFile(["root", "nonExistent"]);
		const promise2 = fs.readFile(["root", "nonExistent"]);

		let error1 = null;
		let error2 = null;
		try {
			await promise1;
		} catch (e) {
			error1 = e;
		}
		try {
			await promise2;
		} catch (e) {
			error2 = e;
		}

		assertNotEquals(error1, null);
		assertNotEquals(error2, null);
		assert(error1 === error2, "error1 and error2 are not the same instance");
	},
});
