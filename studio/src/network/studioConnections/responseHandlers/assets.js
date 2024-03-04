import { bundledAssetDataToArrayBufferOrString } from "../../../util/bundledAssetDataToArrayBufferOrString.js";

/**
 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
 */
export function createAssetsHandlers(assetManager) {
	return {
		/**
		 * @param {import("../../../../../src/mod.js").UuidString} uuid
		 */
		"assets.hasAsset": async (uuid) => {
			const projectAsset = await assetManager.getProjectAssetFromUuid(uuid);
			return Boolean(projectAsset);
		},
		/**
		 * Converts asset data to binary or a string, similar to what would happen to an asset when bundled.
		 * @param {import("../../../../../src/mod.js").UuidString} uuid
		 */
		"assets.getBundledAssetData": async (uuid) => {
			const projectAsset = await assetManager.getProjectAssetFromUuid(uuid);
			if (projectAsset) {
				const assetTypeUuid = await projectAsset.getAssetTypeUuid();
				if (!assetTypeUuid) {
					const path = projectAsset.path.join("/");
					throw new Error(`Failed to get bundled asset data for asset with uuid "${uuid}" and path "${path}". Asset does not have a known asset type.`);
				}
				const assetData = await projectAsset.getBundledAssetData();
				const bufferOrString = await bundledAssetDataToArrayBufferOrString(assetData);
				let buffer;
				if (typeof bufferOrString == "string") {
					const encoder = new TextEncoder();
					buffer = encoder.encode(bufferOrString).buffer;
				} else {
					buffer = bufferOrString;
				}

				/** @type {import("../../../../../src/mod.js").AssetBundleGetAssetResult} */
				const returnValue = {
					buffer,
					type: assetTypeUuid,
				};

				/** @satisfies {import("../../../../../src/mod.js").TypedMessengerRequestHandlerReturn} */
				const messengerReturnValue = {
					$respondOptions: {
						returnValue,
						transfer: [buffer],
					},
				};
				return messengerReturnValue;
			}
			return null;
		},
	};
}
