/**
 * In case a call triggers a promise resolve, you'll need to wait for the
 * resolved promise to be handled.
 *
 * #### Usage
 *
 * ```js
 * let finishPromise = null;
 *
 * async function someAsyncFunction() {
 * 	await new Promise(r => {
 * 		finishPromise = r;
 * 	});
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 * 	console.log("done!");
 * }
 * someAsyncFunction();
 *
 * finishPromise();
 * // "done!" won't be printed just yet.
 *
 * await waitForMicrotasks();
 * // now it will.
 * ```
 *
 * However, keep in mind that if a function creates new Promises that resolve
 * in the next event loop, this will not wait for those:
 *
 * ```js
 * let finishPromise = null;
 *
 * async function someAsyncFunction() {
 * 	await new Promise(r => {
 * 		finishPromise = r;
 * 	});
 *
 * 	// queue some extra microtasks
 * 	await fetch("some resource");
 *
 * 	console.log("done!");
 * }
 * someAsyncFunction();
 *
 * finishPromise();
 * // "done!" won't be printed just yet.
 *
 * await waitForMicrotasks();
 * // "done!" will still not be printed.
 * ```
 *
 * If you want to wait until only the current microtasks are handled,
 * use {@linkcode waitForCurrentMicroTasks}.
 *
 * @returns {Promise<void>}
 */
export function waitForMicrotasks() {
	return new Promise((r) => setTimeout(r, 0));
}

/**
 * In case a call triggers a promise resolve, you'll need to wait for the
 * resolved promise to be handled. You can do this by queueing a new microtask.
 *
 * #### Usage
 *
 * ```js
 * let finishPromise = null;
 *
 * async function someAsyncFunction() {
 * 	await new Promise(r => {
 * 		finishPromise = r;
 * 	});
 * 	console.log("done!");
 * }
 * someAsyncFunction();
 *
 * finishPromise();
 * // "done!" won't be printed just yet.
 *
 * await waitForCurrentMicroTasks();
 * // now it will.
 * ```
 *
 * However, keep in mind that if a function queues new microtasks, this will
 * not wait for those:
 *
 * ```js
 * let finishPromise = null;
 *
 * async function someAsyncFunction() {
 * 	await new Promise(r => {
 * 		finishPromise = r;
 * 	});
 *
 * 	// queue some extra microtasks
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 * 	await Promise.resolve();
 *
 * 	console.log("done!");
 * }
 * someAsyncFunction();
 *
 * finishPromise();
 * // "done!" won't be printed just yet.
 *
 * await waitForCurrentMicroTasks();
 * // "done!" will still not be printed.
 * ```
 *
 * If you want to wait until all microtasks are handled,
 * use {@linkcode waitForMicrotasks}.
 *
 * @returns {Promise<void>}
 */
export function waitForCurrentMicroTasks() {
	return new Promise((r) => queueMicrotask(r));
}
