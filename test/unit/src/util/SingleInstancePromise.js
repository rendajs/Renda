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

Deno.test({
	name: "Calling run while already running",
	async fn() {
		/** @param {string} result */
		let resolvePromise = result => {};
		const fn = spy(async (/** @type {string} */ param) => {
			/** @type {Promise<string>} */
			const promise = new Promise(r => {
				resolvePromise = r;
			});
			const promiseResult = await promise;
			return param + promiseResult;
		});
		const instance = new SingleInstancePromise(fn);

		const promise1 = instance.run("run1");
		const promise2 = instance.run("run2");
		const promise3 = instance.run("run3");
		assertSpyCalls(fn, 1);

		resolvePromise("resolve1");
		const result1 = await promise1;
		assertEquals(result1, "run1resolve1");

		resolvePromise("resolve2");
		const result2 = await promise2;
		assertEquals(result2, "run3resolve2");

		const result3 = await promise3;
		assertEquals(result3, "run3resolve2");
		assertSpyCalls(fn, 2);
	},
});
