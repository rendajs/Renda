import {bundle} from "./bundle.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleScriptsMessengerResponseHandlers */

/** @type {TypedMessenger<import("../../task/TaskBundleScripts.js").BundleScriptsMessengerResponseHandlers, BundleScriptsMessengerResponseHandlers>} */
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
	bundle: async config => {
		return await bundle(config, messenger);
	},
};

messenger.setResponseHandlers(responseHandlers);
