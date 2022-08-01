import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof responseHandlers} BundleScriptsMessengerResponseHandlers */

/** @type {TypedMessenger<{}, BundleScriptsMessengerResponseHandlers>} */
const messenger = new TypedMessenger();
messenger.setSendHandler(data => {
	globalThis.postMessage(data);
});
globalThis.addEventListener("message", e => {
	messenger.handleReceivedMessage(e.data);
});

const responseHandlers = {
	/**
	 * @param {import("../../task/TaskBundleScripts.js").TaskBundleScriptsConfig} config
	 */
	bundle: config => {

	},
};

messenger.setResponseHandlers(responseHandlers);
