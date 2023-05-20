import {autoRegisterRequestHandlers} from "./protocolRequestHandlers/autoRegisterRequestHandlers.js";

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
 * @typedef {object} RequestMetaData
 * @property {boolean} autoSerializationSupported Whether serialization is supported by the message handler. For
 * instance, WebSockets have no built-in serialization because all data is sent as string or binary. But
 * `window.postMessage` and `MessageChannel` do have built-in serialization by the browser.
 */

// This procedure is needed to not leak types in the global scope while still
// being able to use it in `@linkcode`
let StudioConnection;
{
	const x = /** @type {import("./StudioConnection.js").StudioConnection?} */ (null);
	// eslint-disable-next-line no-unused-vars
	StudioConnection = x;
}

/**
 * An object that can be registered on the ProtocolManager. It contains several configurable properties and hooks
 * needed for sending roundtrip requests on StudioConnections.
 *
 * ### Hooks
 *
 * Hooks are called in the following order:
 *
 * - `prepare`: Called on the client before the request is sent. It should
 * return data that will be sent to the server.
 * - `handleRequest`: Called on the server when a request is received. It should
 * return response data that will be sent back to the client.
 * - `handleResponse`: Called on the client when a response is received. It
 * should return data that you want {@linkcode StudioConnection.call} to return.
 *
 * Only `handleRequest` is required, the rest is optional. If a hook is omitted,
 * a best attempt at serializing the arguments and return values will be made.
 *
 * More info on how to serialize the return values of these hooks at {@linkcode SerializeCondition}.
 * @template {string} TCommand
 * @template {true | false} TNeedsRequestMetaData
 * @template {((...args: any) => any) | undefined} TPrepareSignature
 * @template {(...args: any) => any} THandleRequestSignature
 * @template {((meta: RequestMetaData, buffer: ArrayBuffer) => any) | undefined} THandleResponseSignature
 * @typedef {object} ProtocolManagerRequestHandler
 * @property {TCommand} command
 * @property {SerializeCondition} [requestSerializeCondition = "if-not-supported"]
 * @property {TPrepareSignature} [prepare] Called on the client before the request is sent.
 * @property {TNeedsRequestMetaData} [needsRequestMetaData = false] If true, adds an extra argument to the hooks with metadata.
 * @property {SerializeCondition} [responseSerializeCondition = "if-not-supported"]
 * @property {THandleRequestSignature} handleRequest Called on the server when a request is received.
 * @property {THandleResponseSignature} [handleResponse] Called on the client when a response is received.
 */

/** @typedef {ProtocolManagerRequestHandler<any, any, any, any, any>} ProtocolManagerRequestHandlerAny */

export class ProtocolManager {
	constructor() {
		/** @type {Map<string, ProtocolManagerRequestHandlerAny>} */
		this.registeredRequestHandlers = new Map();

		for (const handler of autoRegisterRequestHandlers) {
			this.registerRequestHandler(handler);
		}
	}

	/**
	 * @param {ProtocolManagerRequestHandlerAny} requestHandler
	 */
	registerRequestHandler(requestHandler) {
		this.registeredRequestHandlers.set(requestHandler.command, requestHandler);
	}

	/**
	 * @template {string} TCommand
	 * @typedef {import("./protocolRequestHandlers/getRequestHandlerType.ts").getRequestHandlerType<TCommand>} getRequestHandlerType
	 */

	/**
	 * @template {string} TCommand
	 * @param {TCommand} cmd
	 */
	getRequestHandler(cmd) {
		const handler = this.registeredRequestHandlers.get(cmd) || null;
		return /** @type {getRequestHandlerType<TCommand> extends null ? ProtocolManagerRequestHandlerAny? : getRequestHandlerType<TCommand>} */ (handler);
	}
}
