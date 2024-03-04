import { basicTest } from "./shared.js";
import { assertEquals } from "std/testing/asserts.ts";
import { ContentWindowEntityEditor } from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import { waitForMicrotasks } from "../../../../../shared/waitForMicroTasks.js";

Deno.test({
	name: "Shows an error message when the renderer fails to initialize",
	async fn() {
		const { args, mockStudioInstance, uninstall } = basicTest();
		try {
			/** @param {string} message */
			let resolveMessage = message => {};
			const promise = new Promise(r => {
				resolveMessage = r;
			});
			mockStudioInstance.rendererErrorMessage = promise;

			const contentWindow1 = new ContentWindowEntityEditor(...args);
			assertEquals(contentWindow1.shadow.childElementCount, 1);
			assertEquals(contentWindow1.shadow.children[0].tagName, "CANVAS");

			resolveMessage("message");
			await waitForMicrotasks();
			assertEquals(contentWindow1.shadow.childElementCount, 2);
			assertEquals(contentWindow1.shadow.children[1].tagName, "DIV");
			assertEquals(contentWindow1.shadow.children[1].textContent, "message");

			const contentWindow2 = new ContentWindowEntityEditor(...args);
			await waitForMicrotasks();
			assertEquals(contentWindow2.shadow.childElementCount, 2);
			assertEquals(contentWindow2.shadow.children[1].tagName, "DIV");
			assertEquals(contentWindow2.shadow.children[1].textContent, "message");
		} finally {
			uninstall();
		}
	},
});
