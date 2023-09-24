import {TypedMessenger} from "../../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof responseHandlers} BasicWorkerResponseHandlers */

/** @type {TypedMessenger<BasicWorkerResponseHandlers, {}>} */
const messenger = new TypedMessenger();
messenger.setSendHandler(data => {
	globalThis.postMessage(data.sendData);
});
globalThis.addEventListener("message", e => {
	messenger.handleReceivedMessage(e.data);
});

const responseHandlers = {
	/**
	 * @param {string} str
	 */
	repeatString: str => {
		return str;
	},
};

messenger.setResponseHandlers(responseHandlers);
