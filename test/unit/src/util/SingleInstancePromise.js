import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {SingleInstancePromise} from "../../../../src/mod.js";

Deno.test({
	name: "Single run",
	async fn() {
		const instance = new SingleInstancePromise((/** @type {number} */ x) => {
			return x;
		});

		const result = await instance.run(1337);
		assertEquals(result, 1337);
	},
});

Deno.test({
	name: "once: true, only runs once",
	async fn() {
		const fn = spy((/** @type {number} */ x) => x);
		const instance = new SingleInstancePromise(fn, {once: true});

		await instance.run(123);
		await instance.run(456);

		assertSpyCalls(fn, 1);
		assertSpyCall(fn, 0, {
			args: [123],
			returned: 123,
		});
	},
});
