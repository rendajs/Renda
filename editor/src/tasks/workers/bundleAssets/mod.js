import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {bundle} from "./bundle.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleAssetsMessengerResponseHandlers */

/** @type {TypedMessenger<import("../../task/TaskBundleAssets.js").BundleAssetsMessengerResponseHandlers, BundleAssetsMessengerResponseHandlers, true>} */
const messenger = new TypedMessenger({transferSupport: true});
messenger.setSendHandler(data => {
	globalThis.postMessage(data.sendData);
});
globalThis.addEventListener("message", e => {
	messenger.handleReceivedMessage(e.data);
});

const responseHandlers = {
	/**
	 * @param {import("../../../../../src/mod.js").UuidString[]} assetUuids
	 * @param {number} fileStreamId
	 */
	bundle: async (assetUuids, fileStreamId) => {
		await bundle(assetUuids, fileStreamId, messenger);
	},
};

messenger.setResponseHandlers(responseHandlers);
