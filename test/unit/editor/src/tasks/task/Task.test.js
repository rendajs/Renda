import {assertRejects} from "std/testing/asserts.ts";
import {Task} from "../../../../../../editor/src/tasks/task/Task.js";

Deno.test({
	name: "runTask() throws when not implemented",
	async fn() {
		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
			static workerUrl = new URL("../shared/basicWorker.js", import.meta.url);
		}

		const mockEditor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({});

		const task = new ExtendedTask(mockEditor);
		await assertRejects(async () => {
			await task.runTask({});
		}, Error, `Task "ExtendedTask" does not implement runTask().`);

		task.worker.terminate();
	},
});
