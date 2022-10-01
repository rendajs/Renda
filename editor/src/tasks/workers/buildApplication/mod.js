import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof responseHandlers} BuildApplicationMessengerResponseHandlers */

/** @type {TypedMessenger<import("../../task/TaskBuildApplication.js").BuildApplicationMessengerResponseHandlers, BuildApplicationMessengerResponseHandlers>} */
const messenger = new TypedMessenger();
messenger.setSendHandler(data => {
	globalThis.postMessage(data.sendData);
});
globalThis.addEventListener("message", e => {
	messenger.handleReceivedMessage(e.data);
});

const responseHandlers = {
	foo() {

	},
};

messenger.setResponseHandlers(responseHandlers);
