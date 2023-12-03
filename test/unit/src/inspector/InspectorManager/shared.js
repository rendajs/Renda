import {TypedMessenger} from "../../../../../src/mod.js";
import {createStudioInspectorHandlers} from "../../../../../studio/src/network/studioConnections/handlers.js";

/**
 * Creates an InspectorManager which responds to messages according to
 * file://./../../../../../studio/src/network/studioConnections/handlers.js
 * @param {object} options
 * @param {boolean} [options.raceReturnsDefault]
 */
export function createMockInspectorManager({
	raceReturnsDefault = false,
} = {}) {
	const mockAssetManager = /** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({});
	const handlers = createStudioInspectorHandlers(mockAssetManager);
	const studioHostMessenger = new TypedMessenger();
	studioHostMessenger.setResponseHandlers(handlers);
	const inspectorMessenger = new TypedMessenger();

	// Link the two messengers to each other
	studioHostMessenger.setSendHandler(data => {
		inspectorMessenger.handleReceivedMessage(data.sendData);
	});
	inspectorMessenger.setSendHandler(data => {
		studioHostMessenger.handleReceivedMessage(data.sendData);
	});

	const mockInspectorManager = /** @type {import("../../../../../src/mod.js").InspectorManager} */ ({
		async raceAllConnections(opts) {
			if (raceReturnsDefault) {
				return opts.defaultReturnValue;
			} else {
				const mockConnection = /** @type {import("../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({
					messenger: inspectorMessenger,
				});
				const result = await opts.cb(mockConnection);
				if (result === undefined) return opts.defaultReturnValue;
				return result;
			}
		},
	});

	return {
		mockAssetManager,
		mockInspectorManager,
	};
}
