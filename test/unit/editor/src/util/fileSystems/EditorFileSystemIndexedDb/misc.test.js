import {createFs, finishCoverageMapWrites} from "./shared.js";
import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";

Deno.test({
	name: "assertDbExists() should throw after using deleteDb()",
	fn: async () => {
		const fs = await createFs();
		await fs.deleteDb();

		let didThrow = false;
		try {
			fs.assertDbExists();
		} catch {
			didThrow = true;
		}

		assertEquals(didThrow, true);

		await fs.waitForRootCreate();

		await finishCoverageMapWrites();
	},
});

Deno.test({
	name: "waitForRootCreate() should resolve",
	fn: async () => {
		const fs = await createFs();
		await fs.waitForRootCreate();
		await fs.waitForRootCreate();

		await finishCoverageMapWrites();
	},
});
