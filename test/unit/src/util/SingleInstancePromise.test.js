import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { SingleInstancePromise } from "../../../../src/mod.js";
import { assertPromiseResolved } from "../../shared/asserts.js";
import { waitForMicrotasks } from "../../shared/waitForMicroTasks.js";

function basicSpyFn() {
	/** @type {((result: string) => void)?} */
	let resolvePromise = null;
	/**
	 * @param {string} param
	 */
	const fn = async param => {
		/** @type {Promise<string>} */
		const promise = new Promise(r => {
			resolvePromise = r;
		});
		const promiseResult = await promise;
		return param + promiseResult;
	};
	const spyFn = spy(fn);
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
		/**
		 * @param {number} x
		 */
		const fn = x => x;
		const instance = new SingleInstancePromise(fn);

		const result = await instance.run(1337);
		assertEquals(result, 1337);
	},
});

Deno.test({
	name: "Calling run while already running",
	async fn() {
		const { spyFn, resolvePromise } = basicSpyFn();
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
		/**
		 * @param {number} x
		 */
		const spyFn = x => x;
		const fn = spy(spyFn);
		const instance = new SingleInstancePromise(fn, { once: true });

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
		const { spyFn, resolvePromise } = basicSpyFn();
		const instance = new SingleInstancePromise(spyFn, { once: true });

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
		const instance = new SingleInstancePromise(basic.spyFn, { once: true });
		await test({
			instance,
			once: true,
			...basic,
		});
	}
}

Deno.test({
	name: "waitForFinish resolves when the any run is done",
	async fn() {
		const basic = basicSpyFn();
		const instance = new SingleInstancePromise(basic.spyFn);

		await assertPromiseResolved(instance.waitForFinish(), false);
		instance.run("");
		const promise = instance.waitForFinish();
		await assertPromiseResolved(promise, false);
		await basic.resolvePromise("");
		await assertPromiseResolved(promise, true);
		await assertPromiseResolved(instance.waitForFinish(), false);

		// Running a second time to make sure that waitForFinish() becomes pending again
		instance.run("");
		const promise2 = instance.waitForFinish();
		await assertPromiseResolved(promise2, false);
		await basic.resolvePromise("");
		await assertPromiseResolved(promise2, true);
		await assertPromiseResolved(instance.waitForFinish(), false);
	},
});

Deno.test({
	name: "waitForFinish throws when once is true",
	async fn() {
		const instance = new SingleInstancePromise(async () => {}, { once: true });
		await assertRejects(async () => {
			await instance.waitForFinish();
		}, Error, "waitForFinish() would stay pending forever when once has been set, use waitForFinishOnce() instead.");
	},
});

Deno.test({
	name: "waitForFinishOnce resolves when the first run is done",
	async fn() {
		await runOnceMatrix(async ({ instance, resolvePromise }) => {
			const promise1 = instance.waitForFinishOnce();
			await assertPromiseResolved(promise1, false);
			instance.run("");
			await assertPromiseResolved(promise1, false);
			await assertPromiseResolved(instance.waitForFinishOnce(), false);
			await resolvePromise("");
			await assertPromiseResolved(promise1, true);
			await assertPromiseResolved(instance.waitForFinishOnce(), true);

			// Running a second time to make sure that waitForFinish() stays resolved
			instance.run("");
			await assertPromiseResolved(instance.waitForFinishOnce(), true);
			await resolvePromise("");
			await assertPromiseResolved(instance.waitForFinishOnce(), true);
		});
	},
});

Deno.test({
	name: "waitForFinishIfRunning resolves when the function is not running",
	async fn() {
		await runOnceMatrix(async ({ instance, resolvePromise, once }) => {
			const promise1 = instance.waitForFinishIfRunning();
			await assertPromiseResolved(promise1, true);
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);
			instance.run("");
			const promise2 = instance.waitForFinishIfRunning();
			await assertPromiseResolved(promise2, false);
			await assertPromiseResolved(instance.waitForFinishIfRunning(), false);
			await resolvePromise("");
			await assertPromiseResolved(promise2, true);
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);

			// Running a second time to make sure that waitForFinishIfRunning() becomes pending again
			instance.run("");
			const promise3 = instance.waitForFinishIfRunning();
			await assertPromiseResolved(promise3, once);
			await assertPromiseResolved(instance.waitForFinishIfRunning(), once);
			await resolvePromise("");
			await assertPromiseResolved(promise3, true);
			await assertPromiseResolved(instance.waitForFinishIfRunning(), true);
		});
	},
});

Deno.test({
	name: "waitForFinishIfRunning does not resolve when the queue is not empty yet",
	async fn() {
		const basic = basicSpyFn();
		const instance = new SingleInstancePromise(basic.spyFn);
		const promiseA = instance.run("a");
		const promiseB = instance.run("b");

		const waitPromise = instance.waitForFinishIfRunning();
		await assertPromiseResolved(promiseA, false);
		await assertPromiseResolved(promiseB, false);
		await assertPromiseResolved(waitPromise, false);

		await basic.resolvePromise("resolved");
		await assertPromiseResolved(promiseA, true);
		assertEquals(await promiseA, "aresolved");
		await assertPromiseResolved(promiseB, false);
		await assertPromiseResolved(waitPromise, false);

		await basic.resolvePromise("resolved");
		await assertPromiseResolved(promiseB, true);
		assertEquals(await promiseB, "bresolved");
		await assertPromiseResolved(waitPromise, true);
	},
});

Deno.test({
	name: "promises are resolved in the correct order",
	async fn() {
		await runOnceMatrix(async ({ instance, resolvePromise }) => {
			/** @type {number[]} */
			const order = [];
			const promise1 = instance.run("run1");
			const promise2 = instance.run("run2");
			const promise3 = instance.run("run3");

			(async () => {
				await promise1;
				order.push(1);
			})();
			(async () => {
				await promise2;
				order.push(2);
			})();
			(async () => {
				await promise3;
				order.push(3);
			})();

			await resolvePromise("1");
			await resolvePromise("2");
			await resolvePromise("3");
			await promise1;
			await promise2;
			await promise3;
			assertEquals(order, [1, 2, 3]);
		});
	},
});
