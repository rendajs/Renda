import {PreferencesManager} from "../../../../../../studio/src/preferences/PreferencesManager.js";
import "../../../shared/initializeStudio.js";

export function getMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
	return mockWindowManager;
}

export function getDefaultArgs() {
	const mockWindowManager = getMockWindowManager();

	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: new PreferencesManager(),
		windowManager: mockWindowManager,
	});

	/** @type {ConstructorParameters<typeof import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow>} */
	const args = [mockStudioInstance, getMockWindowManager(), "uuid"];
	return {args, mockStudioInstance, mockWindowManager};
}
