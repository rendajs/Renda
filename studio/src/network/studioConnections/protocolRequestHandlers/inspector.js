import {getStudioInstance} from "../../../studioInstance.js";
import {createRequestHandler} from "./createRequestHandler.js";

function getAssetManager() {
	const assetManager = getStudioInstance().projectManager.assetManager;
	if (!assetManager) throw new Error("Assertion failed: no asset manager.");
	return assetManager;
}

const hasAsset = createRequestHandler({
	command: "inspector.hasAsset",
	needsRequestMetaData: true,
	/**
	 * @param {import("../../../../../src/mod.js").UuidString} uuid
	 */
	handleRequest: async uuid => {
		const projectAsset = getAssetManager().getProjectAssetFromUuid(uuid);
		return Boolean(projectAsset);
	},
});

const getAssetData = createRequestHandler({
	command: "inspector.getAssetData",
	needsRequestMetaData: true,
	/**
	 * @param {import("../../../../../src/mod.js").UuidString} uuid
	 */
	handleRequest: async uuid => {
		const projectAsset = getAssetManager().getProjectAssetFromUuid(uuid);
		return Boolean(projectAsset);
	},
});

export const inspectorProtocolHandlers = [
	hasAsset,
	getAssetData,
];
