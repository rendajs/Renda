import {bundle} from "./bundle.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

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

/** @type {TypedMessenger<import("../../task/TaskBundleScripts.js").BundleScriptsMessengerResponseHandlers, BundleScriptsMessengerResponseHandlers>} */
const messenger = new TypedMessenger();
messenger.initialize(globalThis, responseHandlers);

