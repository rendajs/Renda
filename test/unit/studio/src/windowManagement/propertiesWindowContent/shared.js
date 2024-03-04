import "../../../shared/initializeStudio.js";
import { createPreferencesManager } from "../../../shared/createPreferencesManager.js";
import { getMockWindowManager } from "../shared.js";

export function getMockArgs() {
	const mockWindowManager = getMockWindowManager();

	const { preferencesManagerAny } = createPreferencesManager({});

	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		preferencesManager: preferencesManagerAny,
		windowManager: mockWindowManager,
	});

	/** @type {ConstructorParameters<typeof import("../../../../../../studio/src/propertiesWindowContent/PropertiesWindowContent.js").PropertiesWindowContent>} */
	const args = [mockStudioInstance, mockWindowManager];
	return { args, mockStudioInstance, mockWindowManager };
}
