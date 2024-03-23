import { basicSetup } from "./shared.js";
import { assertEquals } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { MouseEvent } from "fake-dom/FakeMouseEvent.js";
import { waitForMicrotasks } from "../../../../../src/util/waitForMicroTasks.js";
import { assertIsSpinnerEl } from "../ui/shared.js";

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

/**
 * @param {import("../../../../../studio/src/projectSelector/ProjectSelector.js").ProjectSelector} projectSelector
 */
function clickUpdateButton(projectSelector) {
	const versionEl = getVersionEl(projectSelector);
	const updateButton = versionEl.children[0];
	assertEquals(updateButton.tagName, "BUTTON");
	updateButton.dispatchEvent(new Event("click"));
}

Deno.test({
	name: "Shows the correct buttons on load",
	async fn() {
		const { projectSelector, uninstall } = basicSetup();

		try {
			assertEquals(projectSelector.actionsListEl.children.length, 3);
			assertEquals(projectSelector.recentListEl.children.length, 0);
		} finally {
			await uninstall();
		}
	},
});

function fireInstallPromptEvent() {
	let resolvePromptFn = () => {};

	class BeforeInstallPromptEvent extends Event {
		constructor() {
			super("beforeinstallprompt", {
				cancelable: true,
			});
		}
		prompt() {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => {
				resolvePromptFn = r;
			});
			return promise;
		}
	}

	function resolvePrompt() {
		resolvePromptFn();
	}

	const event = new BeforeInstallPromptEvent();
	const promptSpy = spy(event, "prompt");
	window.dispatchEvent(event);
	return { event, promptSpy, resolvePrompt };
}

Deno.test({
	name: "Shows install button when beforeinstallprompt event fires",
	async fn() {
		const { projectSelector, uninstall } = basicSetup();

		try {
			assertEquals(projectSelector.actionsListEl.children.length, 3);

			const { event, promptSpy, resolvePrompt } = fireInstallPromptEvent();
			assertEquals(projectSelector.actionsListEl.children.length, 4);
			assertEquals(event.defaultPrevented, true);

			const installButton = projectSelector.actionsListEl.children[3].children[0];
			assertEquals(installButton.textContent, "Install Renda Studio");
			installButton.dispatchEvent(new Event("click"));
			assertSpyCalls(promptSpy, 1);
			assertEquals(projectSelector.actionsListEl.children.length, 4);
			resolvePrompt();
			await waitForMicrotasks();
			assertEquals(projectSelector.actionsListEl.children.length, 3);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Install button has the right text depeding on the os",
	async fn() {
		/** @type {{userAgent: string, platform: string, maxTouchPoints: number, expected: string}[]} */
		const tests = [
			{
				userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
				platform: "iPhone",
				maxTouchPoints: 5,
				expected: "Get the iOS App",
			},
			{
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
				platform: "MacIntel",
				maxTouchPoints: 5,
				expected: "Get the iPad App",
			},
			{
				// Android Galaxy S5
				userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; SM-G903F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36",
				platform: "Linux armv8l",
				maxTouchPoints: 5,
				expected: "Get the Android App",
			},
			{
				// Safari macOs
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
				platform: "MacIntel",
				maxTouchPoints: 0,
				expected: "Get the Mac App",
			},
			{
				// Chrome macOS
				userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
				platform: "MacIntel",
				maxTouchPoints: 0,
				expected: "Get the Mac App",
			},
			{
				// Chrome Windows
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
				platform: "Win32",
				maxTouchPoints: 1,
				expected: "Get the Windows App",
			},
		];

		for (const test of tests) {
			const oldUserAgent = navigator.userAgent;
			const oldPlatform = navigator.platform;
			const oldMaxTouchPoints = navigator.maxTouchPoints;
			const { projectSelector, uninstall } = basicSetup();

			try {
				Object.defineProperty(navigator, "userAgent", {
					get: () => test.userAgent,
					configurable: true,
				});
				Object.defineProperty(navigator, "platform", {
					get: () => test.platform,
					configurable: true,
				});
				Object.defineProperty(navigator, "maxTouchPoints", {
					get: () => test.maxTouchPoints,
					configurable: true,
				});
				fireInstallPromptEvent();
				assertEquals(projectSelector.actionsListEl.children.length, 4);

				const installButton = projectSelector.actionsListEl.children[3].children[0];
				assertEquals(installButton.textContent, test.expected);
			} finally {
				Object.defineProperty(navigator, "userAgent", {
					get: () => oldUserAgent,
					configurable: true,
				});
				Object.defineProperty(navigator, "platform", {
					get: () => oldPlatform,
					configurable: true,
				});
				Object.defineProperty(navigator, "maxTouchPoints", {
					get: () => oldMaxTouchPoints,
					configurable: true,
				});
				await uninstall();
			}
		}
	},
});

Deno.test({
	name: "Creates an empty project on studio load",
	async fn() {
		const { projectSelector, openNewDbProjectSpy, triggerStudioLoad, uninstall } = basicSetup();

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
		const { projectSelector, uninstall } = basicSetup({
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
		const { projectSelector, uninstall } = basicSetup({
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
		const { projectSelector, uninstall } = basicSetup({
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
		const { projectSelector, newProjectButton, openNewDbProjectSpy, triggerStudioLoad, uninstall } = basicSetup();

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
		const { projectSelector, newProjectButton, openNewDbProjectSpy, triggerStudioLoad, uninstall } = basicSetup();

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
		const { projectSelector, openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerStudioLoad, uninstall } = basicSetup();

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
		const { projectSelector, openProjectButton, openNewDbProjectSpy, openProjectFromLocalDirectorySpy, triggerStudioLoad, uninstall } = basicSetup();

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
		const { projectSelector, setInstallingState, triggerStudioLoad, uninstall } = basicSetup();

		try {
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

			setInstallingState("idle");
			assertEquals(versionEl.childElementCount, 0);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Update button doesn't restart when there are other tabs open",
	async fn() {
		const { projectSelector, restartClientsSpy, setOpenTabCount, setInstallingState, triggerStudioLoad, uninstall } = basicSetup();

		try {
			triggerStudioLoad();
			await waitForMicrotasks();

			setInstallingState("waiting-for-restart");
			setOpenTabCount(2);
			clickUpdateButton(projectSelector);
			assertSpyCalls(restartClientsSpy, 0);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Update button doesn't restart when the project selector was closed at least once",
	async fn() {
		const { projectSelector, restartClientsSpy, setInstallingState, triggerStudioLoad, uninstall } = basicSetup();

		try {
			triggerStudioLoad();
			await waitForMicrotasks();

			setInstallingState("waiting-for-restart");
			projectSelector.setVisibility(false);
			projectSelector.setVisibility(true);
			clickUpdateButton(projectSelector);
			assertSpyCalls(restartClientsSpy, 0);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Update button restarts and focuses the about window",
	async fn() {
		const { projectSelector, mockStudio, restartClientsSpy, setInstallingState, triggerStudioLoad, uninstall } = basicSetup();

		try {
			const focusSpy = spy(mockStudio.windowManager, "focusOrCreateContentWindow");
			triggerStudioLoad();
			await waitForMicrotasks();

			setInstallingState("waiting-for-restart");

			assertSpyCalls(restartClientsSpy, 0);
			assertSpyCalls(focusSpy, 0);
			clickUpdateButton(projectSelector);

			assertSpyCalls(restartClientsSpy, 1);

			assertSpyCalls(focusSpy, 1);
			assertSpyCall(focusSpy, 0, {
				args: ["renda:about"],
			});
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "Update button still focuses the about window when no restart is triggered",
	async fn() {
		const { projectSelector, mockStudio, restartClientsSpy, setOpenTabCount, setInstallingState, triggerStudioLoad, uninstall } = basicSetup();

		try {
			const focusSpy = spy(mockStudio.windowManager, "focusOrCreateContentWindow");
			triggerStudioLoad();
			await waitForMicrotasks();
			setOpenTabCount(2);

			setInstallingState("waiting-for-restart");

			assertSpyCalls(focusSpy, 0);
			clickUpdateButton(projectSelector);

			assertSpyCalls(restartClientsSpy, 0);

			assertSpyCalls(focusSpy, 1);
			assertSpyCall(focusSpy, 0, {
				args: ["renda:about"],
			});
			assertEquals(projectSelector.visible, false);
		} finally {
			await uninstall();
		}
	},
});
