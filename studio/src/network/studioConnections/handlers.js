import {createFileSystemHandlers} from "./responseHandlers/fileSystem.js";
import {createAssetsHandlers} from "./responseHandlers/assets.js";

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<{}, ReturnType<typeof createStudioHostHandlers>>} StudioClientHostConnection */

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<ReturnType<import("../../../../src/mod.js").InspectorManager["getResponseHandlers"]>, ReturnType<typeof createStudioInspectorHandlers>>} InspectorStudioConnection */
/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<ReturnType<typeof createStudioInspectorHandlers>, ReturnType<import("../../../../src/mod.js").InspectorManager["getResponseHandlers"]>>} StudioInspectorConnection */

/**
 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
 */
export function createStudioHostHandlers(fileSystem) {
	return createFileSystemHandlers(fileSystem);
}

/**
 * @param {import("../../assets/AssetManager.js").AssetManager} assetManager
 */
export function createStudioInspectorHandlers(assetManager) {
	return createAssetsHandlers(assetManager);
}
