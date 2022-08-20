import {bundle} from "./bundle.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleScriptsMessengerResponseHandlers */

/** @type {TypedMessenger<import("../../task/TaskBundleScripts.js").BundleScriptsMessengerResponseHandlers, BundleScriptsMessengerResponseHandlers>} */
const messenger = new TypedMessenger();
messenger.setSendHandler(data => {
	globalThis.postMessage(data.sendData);
});
globalThis.addEventListener("message", e => {
	messenger.handleReceivedMessage(e.data);
});

const responseHandlers = {
	/**
	 * @param {import("./bundle.js").BundleOptions} options
	 */
	bundle: async options => {
		return await bundle(options, messenger);
	},
};

messenger.setResponseHandlers(responseHandlers);
