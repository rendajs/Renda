import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {bundle} from "./bundle.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleAssetsMessengerResponseHandlers */

/** @type {TypedMessenger<BundleAssetsMessengerResponseHandlers, import("../../task/TaskBundleAssets.js").BundleAssetsMessengerResponseHandlers>} */
const messenger = new TypedMessenger();

const responseHandlers = {
	/**
	 * @param {import("../../../../../src/mod.js").UuidString[]} assetUuids
	 * @param {number} fileStreamId
	 */
	bundle: async (assetUuids, fileStreamId) => {
		return await bundle(assetUuids, fileStreamId, messenger);
	},
};

messenger.initializeWorkerContext(responseHandlers);
