import autoRegisterRequestHandlers from "./ProtocolRequestHandlers/AutoRegisterRequestHandlers.js";

/** @typedef {"never" | "always" | "as-needed"} BinaryCondition */

/**
 * @typedef {Object} ProtocolManagerRequestHandler
 * @property {string} command
 * @property {boolean} [needsRequestMetaData = false]
 * @property {function} [preSend]
 * @property {BinaryCondition} [requestBinaryCondition = "never"]
 * @property {function} handleRequest
 * @property {BinaryCondition} [responseBinaryCondition = "never"]
 * @property {function} [handleResponse]
 */

export default class ProtocolManager {
	constructor() {
		/** @type {Map<string, ProtocolManagerRequestHandler>} */
		this.registeredRequestHandlers = new Map();

		for (const handler of autoRegisterRequestHandlers) {
			this.registerRequestHandler(handler.command, handler);
		}
	}

	/**
	 * @param {string} cmd
	 * @param {ProtocolManagerRequestHandler} requestHandler
	 */
	registerRequestHandler(cmd, requestHandler) {
		this.registeredRequestHandlers.set(cmd, requestHandler);
	}

	/**
	 * @param {string} cmd
	 */
	getRequestHandler(cmd) {
		return this.registeredRequestHandlers.get(cmd);
	}
}
