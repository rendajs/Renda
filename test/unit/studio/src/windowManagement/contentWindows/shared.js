import "../../../shared/initializeStudio.js";
import {createPreferencesManager} from "../../../shared/createPreferencesManager.js";

export const DEFAULT_CONTENT_WINDOW_UUID = "content window uuid";

export function getMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
	return mockWindowManager;
}

export function getMockArgs() {
	const mockWindowManager = getMockWindowManager();

	const {preferencesManagerAny} = createPreferencesManager({});

	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: preferencesManagerAny,
		windowManager: mockWindowManager,
		keyboardShortcutManager: {
			onCommand(command, cb) {},
			removeOnCommand(command, cb) {},
			getCondition(name) {
				const condition = /** @type {import("../../../../../../studio/src/keyboardShortcuts/ShortcutCondition.js").ShortcutCondition<any>} */ ({
					requestValueSetter(priority) {},
				});
				return condition;
			},
		},
	});

	/** @type {ConstructorParameters<typeof import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow>} */
	const args = [mockStudioInstance, mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID];
	return {args, mockStudioInstance, mockWindowManager};
}
