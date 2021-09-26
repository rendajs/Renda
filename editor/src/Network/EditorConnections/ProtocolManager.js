import autoRegisterRequestHandlers from "./ProtocolRequestHandlers/AutoRegisterRequestHandlers.js";

/**
 * Whether the returned result of a hook should be serialized.
 * - `always` Serialize the returned value, it will be passed to JSON.stringify before sending.
 * - `never` Send the returned value as-is.
 * - `if-not-supported` Serialize the returned value if and only if {@link RequestMetaData.autoSerializationSupported}
 * is `false` (this is the default).
 *
 * You can generally get away with the default if all you're doing is returning a simple object.
 *
 * If your return value contains special objects, but one that is still serializable by postMessage:
 * Use `never` and serialize the returned value yourself if {@link RequestMetaData.autoSerializationSupported}
 * is `false`, return the serializable object otherwise.
 * @typedef {"always" | "never" | "if-not-supported"} SerializeCondition
 */

/**
 * @typedef {Object} RequestMetaData
 * @property {boolean} autoSerializationSupported
 */

/**
 * @typedef {Object} ProtocolManagerRequestHandler
 * @property {string} command
 * @property {SerializeCondition} [requestSerializeCondition = "if-not-supported"]
 * @property {function} [prepare]
 * @property {boolean} [needsRequestMetaData = false]
 * @property {SerializeCondition} [responseSerializeCondition = "if-not-supported"]
 * @property {function} handleRequest
 * @property {function(RequestMetaData, ArrayBuffer) : *} [handleResponse]
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
