/**
 * Utilitiy function to create a request handler with inferred generic types.
 * In JavaScript this simply returns the first argument. But TypeScript will
 * infer the return value from the first argument.
 * @template {string} TCommand
 * @template {true | false} TNeedsRequestMetaData
 * @template {((...args: any) => any) | undefined} TPrepareSignature
 * @template {(...args: any) => any} THandleRequestSignature
 * @template {((meta: import("../ProtocolManager.js").RequestMetaData, buffer: ArrayBuffer) => any) | undefined} THandleResponseSignature
 * @param {import("../ProtocolManager.js").ProtocolManagerRequestHandler<TCommand, TNeedsRequestMetaData, TPrepareSignature, THandleRequestSignature, THandleResponseSignature>} handlerData
 */
export function createRequestHandler(handlerData) {
	return handlerData;
}
