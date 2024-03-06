import { assertRejects } from "std/testing/asserts.ts";
import { Task } from "../../../../../../studio/src/tasks/task/Task.js";

Deno.test({
	name: "runTask() throws when not implemented",
	async fn() {
		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
			static workerUrl = new URL("../shared/basicWorker.js", import.meta.url);
		}

		const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});

		const task = new ExtendedTask(mockStudio);
		await assertRejects(async () => {
			await task.runTask(/** @type {any} */ ({}));
		}, Error, `Task "ExtendedTask" does not implement runTask().`);

		task.worker.terminate();
	},
});

Deno.test({
	name: "Getting the worker from a task without a workerUrl throws",
	async fn() {
		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
		}

		const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});

		const task = new ExtendedTask(mockStudio);
		await assertRejects(async () => {
			task.worker.terminate();
		}, Error, "This task does not have a worker. If you wish to use a worker, make sure the the static workerUrl property is set.");
	},
});
