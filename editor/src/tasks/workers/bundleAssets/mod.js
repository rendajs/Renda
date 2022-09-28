import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {bundle} from "./bundle.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleAssetsMessengerResponseHandlers */

/** @type {TypedMessenger<import("../../task/TaskBundleAssets.js").BundleAssetsMessengerResponseHandlers, BundleAssetsMessengerResponseHandlers, true>} */
const messenger = new TypedMessenger({transferSupport: true});

const responseHandlers = {
	/**
	 * @param {import("../../../../../src/mod.js").UuidString[]} assetUuids
	 * @param {number} fileStreamId
	 */
	bundle: async (assetUuids, fileStreamId) => {
		await bundle(assetUuids, fileStreamId, messenger);
	},
};

messenger.initialize(globalThis, responseHandlers);
