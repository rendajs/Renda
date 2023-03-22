import {PreferencesManager} from "../../../../../../studio/src/preferences/PreferencesManager.js";
import "../../../shared/initializeStudio.js";

const DEFAULT_CONTENT_WINDOW_UUID = "content window uuid";

export function getMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
	return mockWindowManager;
}

export function getMockArgs() {
	const mockWindowManager = getMockWindowManager();

	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: new PreferencesManager(),
		windowManager: mockWindowManager,
		keyboardShortcutManager: {
			onCommand(command, cb) {},
			removeOnCommand(command, cb) {},
		},
	});

	/** @type {ConstructorParameters<typeof import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow>} */
	const args = [mockStudioInstance, mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID];
	return {args, mockStudioInstance, mockWindowManager};
}
