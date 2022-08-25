import {basicSetup} from "./shared.js";
import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

Deno.test({
	name: "Shows the correct buttons on load",
	async fn() {
		const {projectSelector, uninstall} = basicSetup();

		try {
			assertEquals(projectSelector.actionsListEl.children.length, 3);
			assertEquals(projectSelector.recentListEl.children.length, 0);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Creates an empty project on editor load",
	async fn() {
		const {openNewDbProjectSpy, triggerEditorLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);

			triggerEditorLoad();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCall(openNewDbProjectSpy, 0, {
				args: [false],
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening new project by clicking only opens a new project once",
	async fn() {
		const {newProjectButton, openNewDbProjectSpy, triggerEditorLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);

			newProjectButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(openNewDbProjectSpy, 0);

			triggerEditorLoad();

			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCall(openNewDbProjectSpy, 0, {
				args: [true],
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening project directory by clicking doesn't open empty project",
	async fn() {
		const {openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerEditorLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			openProjectButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			triggerEditorLoad();
			await waitForMicrotasks();

			assertSpyCalls(openProjectFromLocalDirectorySpy, 1);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening project directory after editor has already loaded",
	async fn() {
		const {openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerEditorLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			triggerEditorLoad();
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			openProjectButton.dispatchEvent(new MouseEvent("click"));
			await waitForMicrotasks();

			assertSpyCalls(openProjectFromLocalDirectorySpy, 1);
		} finally {
			await uninstall();
		}
	},
});
