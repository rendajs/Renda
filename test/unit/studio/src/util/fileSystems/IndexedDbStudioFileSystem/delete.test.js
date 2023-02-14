import {createBasicFs} from "./shared.js";
import {assertEquals} from "std/testing/asserts.ts";

Deno.test({
	name: "delete() should throw when deleting the root directory",
	fn: async () => {
		const {fs} = await createBasicFs();

		let didThrow = false;
		try {
			await fs.delete([]);
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);
	},
});

Deno.test({
	name: "delete() a directory with recursive = true should clean up all entries",
	async fn() {
		const {fs, getEntryCount} = await createBasicFs();

		const initialEntryCount = getEntryCount();

		await fs.delete(["root", "onlyfiles"], true);

		// The "onlyfiles" directory contains two files, so including itself
		// 3 items should have been removed
		const newEntryCount = getEntryCount();
		assertEquals(newEntryCount, initialEntryCount - 3);
	},
});
