import { waitForEventLoop } from "../../../../src/mod.js";
import { assertPromiseResolved } from "../../shared/asserts.js";

Deno.test({
	name: "waitForEventLoop()",
	async fn() {
		// There's not a whole lot to test here. There's no way to synchronously check the state of promises.
		// We need to wait for the next event loop in order to make the check, and by that time the promise has
		// already resolved. The best we can do is just check if it resolves.
		const p = waitForEventLoop();
		await assertPromiseResolved(p, true);
	},
});
