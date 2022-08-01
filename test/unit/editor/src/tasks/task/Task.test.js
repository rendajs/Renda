import {assertRejects} from "std/testing/asserts";
import {Task} from "../../../../../../editor/src/tasks/task/Task.js";

Deno.test({
	name: "runTask() throws when not implemented",
	async fn() {
		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
			static workerUrl = new URL("../shared/basicWorker.js", import.meta.url);
		}

		const task = new ExtendedTask();
		await assertRejects(async () => {
			await task.runTask({});
		}, Error, `Task "ExtendedTask" does not implement runTask().`);

		task.worker.terminate();
	},
});
