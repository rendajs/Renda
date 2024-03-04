import { bundle } from "./bundle.js";
import { TypedMessenger } from "../../../../../src/util/TypedMessenger/TypedMessenger.js";

/** @typedef {typeof messenger} BundleScriptsMessenger */
/** @typedef {typeof responseHandlers} BundleScriptsMessengerResponseHandlers */

const responseHandlers = {
	/**
	 * @param {import("./bundle.js").BundleOptions} options
	 */
	bundle: async options => {
		return await bundle(options, messenger);
	},
};

/** @type {TypedMessenger<BundleScriptsMessengerResponseHandlers, import("../../task/TaskBundleScripts.js").BundleScriptsMessengerResponseHandlers>} */
const messenger = new TypedMessenger();
messenger.initializeWorkerContext(responseHandlers);

