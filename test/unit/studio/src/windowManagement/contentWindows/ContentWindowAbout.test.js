import { getMockArgs } from "./shared.js";
import { runWithDomAsync } from "../../../shared/runWithDom.js";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { runWithMockStudioAsync } from "../../../shared/runWithMockStudio.js";
import { ContentWindowAbout } from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowAbout.js";
import { assertIsSpinnerEl } from "../../ui/shared.js";
import { HtmlElement } from "fake-dom/FakeHtmlElement.js";

/**
 * @param {ContentWindowAbout} contentWindow
 */
function getUpdateEl(contentWindow) {
	return contentWindow.contentEl.children[0];
}

/**
 * @param {ContentWindowAbout} contentWindow
 * @param {boolean} checkVisible
 * @param {boolean} spinnerVisible
 * @param {string} textContent
 * @param {string?} buttonText
 */
function assertUpdateElementVisibilities(contentWindow, checkVisible, spinnerVisible, textContent, buttonText) {
	const updateEl = getUpdateEl(contentWindow);
	assertEquals(updateEl.childElementCount, 4);
	const checkEl = updateEl.children[0];
	const spinnerEl = updateEl.children[1];
	const textEl = updateEl.children[2];
	const buttonEl = updateEl.children[3];
	assertIsSpinnerEl(spinnerEl);
	assertInstanceOf(checkEl, HtmlElement);
	assertInstanceOf(spinnerEl, HtmlElement);
	assertInstanceOf(textEl, HtmlElement);
	assertInstanceOf(buttonEl, HtmlElement);
	assertEquals(checkEl.style.display, checkVisible ? "" : "none", "Expected check to " + (checkVisible ? "be visible" : "not be visible"));
	assertEquals(spinnerEl.style.display, spinnerVisible ? "" : "none", "Expected spinner to " + (spinnerVisible ? "be visible" : "not be visible"));
	assertEquals(textEl.textContent, textContent);
	const buttonVisible = buttonText != null;
	assertEquals(buttonEl.classList.contains("hidden"), !buttonVisible, "Expected button to " + (buttonVisible ? "be visible" : "not be visible"));
	if (buttonVisible) {
		const buttonTextEl = buttonEl.children[1];
		assertEquals(buttonTextEl.textContent, buttonText);
	}
}

/**
 * @param {ContentWindowAbout} contentWindow
 */
function clickUpdateButton(contentWindow) {
	const updateEl = getUpdateEl(contentWindow);
	const buttonEl = updateEl.children[3];
	assertInstanceOf(buttonEl, HtmlElement);
	buttonEl.dispatchEvent(new Event("click"));
}

function basicSetup() {
	const { args, mockStudioInstance } = getMockArgs();

	/** @type {import("../../../../../../studio/src/misc/ServiceWorkerManager.js").ServiceWorkerInstallingState} */
	let installingState = "idle";
	/** @type {Set<() => void>} */
	const onInstallingStateChangeCbs = new Set();

	let openTabCount = 1;
	/** @type {Set<() => void>} */
	const onOpenTabCountChangeCbs = new Set();

	mockStudioInstance.colorizerFilterManager = /** @type {import("../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} */ ({
		applyFilter(element, cssColor) {
			return /** @type {import("../../../../../../studio/src/util/colorizerFilters/ColorizerFilterUsageReference.js").ColorizerFilterUsageReference} */ ({
				destructor() {},
			});
		},
	});
	mockStudioInstance.serviceWorkerManager = /** @type {import("../../../../../../studio/src/misc/ServiceWorkerManager.js").ServiceWorkerManager} */ ({
		get installingState() {
			return installingState;
		},
		onInstallingStateChange(cb) {
			onInstallingStateChangeCbs.add(cb);
		},
		removeOnInstallingStateChange(cb) {
			onInstallingStateChangeCbs.delete(cb);
		},
		get openTabCount() {
			return openTabCount;
		},
		onOpenTabCountChange(cb) {
			onOpenTabCountChangeCbs.add(cb);
		},
		removeOnOpenTabCountChange(cb) {
			onOpenTabCountChangeCbs.delete(cb);
		},
		async checkForUpdates() {},
		async restartClients() {},
	});

	const checkForUpdatesSpy = spy(mockStudioInstance.serviceWorkerManager, "checkForUpdates");
	const restartClientsSpy = spy(mockStudioInstance.serviceWorkerManager, "restartClients");

	/**
	 * @param {import("../../../../../../studio/src/misc/ServiceWorkerManager.js").ServiceWorkerInstallingState} newState
	 */
	function setInstallingState(newState) {
		installingState = newState;
		onInstallingStateChangeCbs.forEach((cb) => cb());
	}

	/**
	 * @param {number} newCount
	 */
	function setOpenTabCount(newCount) {
		openTabCount = newCount;
		onOpenTabCountChangeCbs.forEach((cb) => cb());
	}

	return {
		args,
		mockStudioInstance,
		checkForUpdatesSpy,
		restartClientsSpy,
		setInstallingState,
		setOpenTabCount,
	};
}

Deno.test({
	name: "Service worker updates are shown",
	async fn() {
		await runWithDomAsync(async () => {
			const { args, mockStudioInstance, checkForUpdatesSpy, restartClientsSpy, setInstallingState, setOpenTabCount } = basicSetup();
			await runWithMockStudioAsync(mockStudioInstance, async () => {
				const contentWindow = new ContentWindowAbout(...args);
				assertUpdateElementVisibilities(contentWindow, false, false, "", "Check for Updates");

				assertSpyCalls(checkForUpdatesSpy, 0);
				clickUpdateButton(contentWindow);
				assertSpyCalls(checkForUpdatesSpy, 1);

				setInstallingState("checking-for-updates");
				assertUpdateElementVisibilities(contentWindow, false, true, "Checking for updates...", null);

				setInstallingState("installing");
				assertUpdateElementVisibilities(contentWindow, false, true, "Installing update...", null);

				setInstallingState("waiting-for-restart");
				assertUpdateElementVisibilities(contentWindow, false, false, "Almost up to date!", "Restart");

				setOpenTabCount(2);
				assertUpdateElementVisibilities(contentWindow, false, false, "Almost up to date!", "Reload 2 Tabs");

				assertSpyCalls(restartClientsSpy, 0);
				clickUpdateButton(contentWindow);
				assertSpyCalls(restartClientsSpy, 1);

				setInstallingState("restarting");
				assertUpdateElementVisibilities(contentWindow, false, true, "Restarting...", null);

				setInstallingState("up-to-date");
				assertUpdateElementVisibilities(contentWindow, true, false, "Renda Studio is up to date!", null);

				// State is no longer updated after the window is destructed
				contentWindow.destructor();
				setInstallingState("idle");
				assertUpdateElementVisibilities(contentWindow, true, false, "Renda Studio is up to date!", null);
				setOpenTabCount(3);
				assertUpdateElementVisibilities(contentWindow, true, false, "Renda Studio is up to date!", null);
			});
		});
	},
});

Deno.test({
	name: "Cecks for updates when the window becomes visible",
	async fn() {
		await runWithDomAsync(async () => {
			const { args, mockStudioInstance, checkForUpdatesSpy } = basicSetup();
			await runWithMockStudioAsync(mockStudioInstance, async () => {
				const contentWindow = new ContentWindowAbout(...args);

				assertSpyCalls(checkForUpdatesSpy, 0);
				contentWindow.setVisibilityFromTabWindow(true);
				assertSpyCalls(checkForUpdatesSpy, 1);
				contentWindow.setVisibilityFromTabWindow(false);
				assertSpyCalls(checkForUpdatesSpy, 1);

				function togglePageVisibility() {
					// @ts-ignore
					document.visibilityState = "hidden";
					document.dispatchEvent(new Event("visibilitychange"));
					// @ts-ignore
					document.visibilityState = "visible";
					document.dispatchEvent(new Event("visibilitychange"));
				}

				togglePageVisibility();
				assertSpyCalls(checkForUpdatesSpy, 1);

				contentWindow.setVisibilityFromTabWindow(true);
				assertSpyCalls(checkForUpdatesSpy, 2);

				togglePageVisibility();
				assertSpyCalls(checkForUpdatesSpy, 3);
			});
		});
	},
});
