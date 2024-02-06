import {basicSetup} from "./shared.js";
import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertIsSpinnerEl} from "../ui/shared.js";

/**
 * @param {import("../../../../../studio/src/projectSelector/ProjectSelector.js").ProjectSelector} projectSelector
 */
function getHeaderEl(projectSelector) {
	return projectSelector.el.children[0];
}

/**
 * @param {import("../../../../../studio/src/projectSelector/ProjectSelector.js").ProjectSelector} projectSelector
 */
function getVersionEl(projectSelector) {
	const header = getHeaderEl(projectSelector);
	return header.children[2];
}

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
	name: "Creates an empty project on studio load",
	async fn() {
		const {projectSelector, openNewDbProjectSpy, triggerStudioLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);

			triggerStudioLoad();
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCall(openNewDbProjectSpy, 0, {
				args: [false],
			});
			assertEquals(projectSelector.visible, true);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Lists recent projects",
	async fn() {
		const {projectSelector, uninstall} = basicSetup({
			async databasesImpl() {
				return [
					{
						name: "fileSystem_uuid1",
						version: 1,
					},
					{
						name: "fileSystem_uuid2",
						version: 1,
					},
				];
			},
			initializeIndexedDbHook(indexedDb) {
				/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny[]} */
				const entries = [
					{
						name: "project1",
						fileSystemType: "db",
						projectUuid: "uuid1",
						isWorthSaving: true,
					},
					{
						name: "project2",
						fileSystemType: "db",
						projectUuid: "uuid2",
						isWorthSaving: true,
					},
				];
				indexedDb.set("recentProjectsList", entries);
			},
		});

		try {
			await waitForMicrotasks();
			assertEquals(projectSelector.recentListEl.children.length, 2);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Don't lists recent projects that have been deleted",
	async fn() {
		const {projectSelector, uninstall} = basicSetup({
			async databasesImpl() {
				return [
					{
						name: "fileSystem_uuid1",
						version: 1,
					},
				];
			},
			initializeIndexedDbHook(indexedDb) {
				/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny[]} */
				const entries = [
					{
						name: "project1",
						fileSystemType: "db",
						projectUuid: "uuid1",
						isWorthSaving: true,
					},
					{
						name: "project2",
						fileSystemType: "db",
						projectUuid: "uuid2",
						isWorthSaving: true,
					},
				];
				indexedDb.set("recentProjectsList", entries);
			},
		});

		try {
			await waitForMicrotasks();
			assertEquals(projectSelector.recentListEl.children.length, 1);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Lists all recent projects when databases() is not supported",
	async fn() {
		const {projectSelector, uninstall} = basicSetup({
			async databasesImpl() {
				throw new Error("emulating a browser without databases() support.");
			},
			initializeIndexedDbHook(indexedDb) {
				/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny[]} */
				const entries = [
					{
						name: "project1",
						fileSystemType: "db",
						projectUuid: "uuid1",
						isWorthSaving: true,
					},
					{
						name: "project2",
						fileSystemType: "db",
						projectUuid: "uuid2",
						isWorthSaving: true,
					},
				];
				indexedDb.set("recentProjectsList", entries);
			},
		});

		try {
			await waitForMicrotasks();
			assertEquals(projectSelector.recentListEl.children.length, 2);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening new project by clicking only opens a new project once",
	async fn() {
		const {projectSelector, newProjectButton, openNewDbProjectSpy, triggerStudioLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);

			newProjectButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(openNewDbProjectSpy, 0);

			triggerStudioLoad();
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCall(openNewDbProjectSpy, 0, {
				args: [true],
			});
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening new project by clicking after studio has loaded only hides the project selector",
	async fn() {
		const {projectSelector, newProjectButton, openNewDbProjectSpy, triggerStudioLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);

			triggerStudioLoad();
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);

			newProjectButton.dispatchEvent(new MouseEvent("click"));
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertEquals(projectSelector.visible, false);

			// Unhiding the project selector and clicking a second time does open a new project
			projectSelector.setVisibility(true);

			newProjectButton.dispatchEvent(new MouseEvent("click"));
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 2);
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening project directory by clicking doesn't open empty project",
	async fn() {
		const {projectSelector, openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerStudioLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			openProjectButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			triggerStudioLoad();
			await waitForMicrotasks();

			assertSpyCalls(openProjectFromLocalDirectorySpy, 1);
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Opening project directory after studio has already loaded",
	async fn() {
		const {projectSelector, openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerStudioLoad, uninstall} = basicSetup();

		try {
			assertSpyCalls(openNewDbProjectSpy, 0);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			triggerStudioLoad();
			await waitForMicrotasks();

			assertSpyCalls(openNewDbProjectSpy, 1);
			assertSpyCalls(openProjectFromLocalDirectorySpy, 0);

			openProjectButton.dispatchEvent(new MouseEvent("click"));
			await waitForMicrotasks();

			assertSpyCalls(openProjectFromLocalDirectorySpy, 1);
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Updates service worker install state",
	async fn() {
		const {projectSelector, mockStudio, setInstallingState, triggerStudioLoad, uninstall} = basicSetup();

		try {
			const focusSpy = spy(mockStudio.windowManager, "focusOrCreateContentWindow");
			triggerStudioLoad();
			await waitForMicrotasks();

			const versionEl = getVersionEl(projectSelector);
			assertEquals(versionEl.childElementCount, 0);
			setInstallingState("checking-for-updates");
			assertEquals(versionEl.childElementCount, 0);
			setInstallingState("installing");
			assertEquals(versionEl.childElementCount, 1);
			assertIsSpinnerEl(versionEl.children[0]);
			setInstallingState("waiting-for-restart");
			assertEquals(versionEl.childElementCount, 1);
			const updateButton = versionEl.children[0];
			assertEquals(updateButton.tagName, "BUTTON");

			assertSpyCalls(focusSpy, 0);
			updateButton.dispatchEvent(new Event("click", {}));
			assertSpyCalls(focusSpy, 1);
			assertSpyCall(focusSpy, 0, {
				args: ["renda:about"],
			});
			assertEquals(projectSelector.visible, false);

			projectSelector.setVisibility(true);
			setInstallingState("idle");
			assertEquals(versionEl.childElementCount, 0);
		} finally {
			await uninstall();
		}
	},
});
