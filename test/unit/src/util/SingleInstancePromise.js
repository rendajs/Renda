import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {SingleInstancePromise} from "../../../../src/mod.js";
import {assertPromiseResolved} from "../../shared/asserts.js";
import {waitForMicrotasks} from "../../shared/waitForMicroTasks.js";

function basicSpyFn() {
	/** @type {((result: string) => void)?} */
	let resolvePromise = null;
	const spyFn = spy(async (/** @type {string} */ param) => {
		/** @type {Promise<string>} */
		const promise = new Promise(r => {
			resolvePromise = r;
		});
		const promiseResult = await promise;
		return param + promiseResult;
	});
	return {
		/** @param {string} result */
		async resolvePromise(result) {
			await waitForMicrotasks();
			if (!resolvePromise) {
				throw new Error("Spy function hasn't been called yet");
			}
			resolvePromise(result);
		},
		spyFn,
	};
}

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
	name: "Calling run while already running",
	async fn() {
		const {spyFn, resolvePromise} = basicSpyFn();
		const instance = new SingleInstancePromise(spyFn);

		const promise1 = instance.run("run1");
		const promise2 = instance.run("run2");
		const promise3 = instance.run("run3");
		assertSpyCalls(spyFn, 1);

		await resolvePromise("resolve1");
		const result1 = await promise1;
		assertEquals(result1, "run1resolve1");

		await resolvePromise("resolve2");
		const result2 = await promise2;
		assertEquals(result2, "run3resolve2");

		const result3 = await promise3;
		assertEquals(result3, "run3resolve2");
		assertSpyCalls(spyFn, 2);
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
	name: "Calling while already running with once: true",
	async fn() {
		const {spyFn, resolvePromise} = basicSpyFn();
		const instance = new SingleInstancePromise(spyFn, {once: true});

		const promise1 = instance.run("run1");
		const promise2 = instance.run("run2");
		const promise3 = instance.run("run3");
		assertSpyCalls(spyFn, 1);

		await resolvePromise("resolve1");
		const result1 = await promise1;
		assertEquals(result1, "run1resolve1");

		const result2 = await promise2;
		assertEquals(result2, "run1resolve1");

		const result3 = await promise3;
		assertEquals(result3, "run1resolve1");
		assertSpyCalls(spyFn, 1);
	},
});

/**
 * @typedef {{instance: SingleInstancePromise<any>, once: boolean} & ReturnType<typeof basicSpyFn>} RunOnceMatrixContext
 */

/**
 * Runs a test twice, first with `once: false` and then a second time with `once: true`.
 * @param {(ctx: RunOnceMatrixContext) => Promise<void>} test
 */
async function runOnceMatrix(test) {
	{
		const basic = basicSpyFn();
		const instance = new SingleInstancePromise(basic.spyFn);
		await test({
			instance,
			once: false,
			...basic,
		});
	}
	{
		const basic = basicSpyFn();
		const instance = new SingleInstancePromise(basic.spyFn, {once: true});
		await test({
			instance,
			once: true,
			...basic,
		});
	}
}

Deno.test({
	name: "waitForFinish resolves when the first run is done",
	async fn() {
		await runOnceMatrix(async ({instance, resolvePromise}) => {
			await assertPromiseResolved(instance.waitForFinish(), false);
			instance.run("");
			await assertPromiseResolved(instance.waitForFinish(), false);
			await resolvePromise("");
			await assertPromiseResolved(instance.waitForFinish(), true);

			// Running a second time to make sure that waitForFinish() stays resolved
			instance.run("");
			await assertPromiseResolved(instance.waitForFinish(), true);
			await resolvePromise("");
			await assertPromiseResolved(instance.waitForFinish(), true);
		});
	},
});

Deno.test({
	name: "waitForFinishIfRunning resolves when the function is not running",
	async fn() {
		await runOnceMatrix(async ({instance, resolvePromise, once}) => {
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);
			instance.run("");
			await assertPromiseResolved(instance.waitForFinishIfRunning(), false);
			await resolvePromise("");
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);

			// Running a second time to make sure that waitForFinishIfRunning() becomes pending again
			instance.run("");
			await assertPromiseResolved(instance.waitForFinishIfRunning(), once);
			await resolvePromise("");
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);
		});
	},
});
