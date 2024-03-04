import { assertEquals } from "std/testing/asserts.ts";
import { waitForCurrentMicroTasks, waitForMicrotasks } from "./waitForMicroTasks.js";

Deno.test({
	name: "waitForCurrentMicroTasks() waits for microtasks",
	async fn() {
		/** @type {() => void} */
		let finishPromise = () => undefined;
		let endReached = false;

		async function someAsyncFunction() {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => {
				finishPromise = r;
			});
			await promise;
			endReached = true;
		}
		const functionPromise = someAsyncFunction();

		if (finishPromise) finishPromise();
		assertEquals(endReached, false);

		await waitForCurrentMicroTasks();
		assertEquals(endReached, true);

		// wait for functionPromise to keep Deno sanitizers happy
		await functionPromise;
	},
});

Deno.test({
	name: "waitForCurrentMicroTasks() doesn't wait for any newly created microtasks",
	async fn() {
		/** @type {() => void} */
		let finishPromise = () => undefined;
		let endReached = false;

		async function someAsyncFunction() {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => {
				finishPromise = r;
			});
			await promise;
			await Promise.resolve();
			await Promise.resolve();
			endReached = true;
		}
		const functionPromise = someAsyncFunction();

		if (finishPromise) finishPromise();
		assertEquals(endReached, false);

		await waitForCurrentMicroTasks();
		assertEquals(endReached, false);

		// wait for functionPromise to keep Deno sanitizers happy
		await functionPromise;
	},
});

Deno.test({
	name: "waitForMicrotasks() waits for current microtasks and newly created ones",
	async fn() {
		/** @type {() => void} */
		let finishPromise = () => undefined;
		let endReached = false;

		async function someAsyncFunction() {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => {
				finishPromise = r;
			});
			await promise;
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();
			endReached = true;
		}
		const functionPromise = someAsyncFunction();

		if (finishPromise) finishPromise();
		assertEquals(endReached, false);

		await waitForMicrotasks();
		assertEquals(endReached, true);

		// wait for functionPromise to keep Deno sanitizers happy
		await functionPromise;
	},
});

Deno.test({
	name: "waitForMicrotasks() doesn't wait for promises that resolve in the next event loop",
	async fn() {
		/** @type {() => void} */
		let finishPromise = () => undefined;
		let endReached = false;

		async function someAsyncFunction() {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => {
				finishPromise = r;
			});
			await promise;

			await new Promise((r) => setTimeout(r, 0));
			endReached = true;
		}
		const functionPromise = someAsyncFunction();

		if (finishPromise) finishPromise();
		assertEquals(endReached, false);

		await waitForMicrotasks();
		assertEquals(endReached, false);

		// wait for functionPromise to keep Deno sanitizers happy
		await functionPromise;
	},
});
