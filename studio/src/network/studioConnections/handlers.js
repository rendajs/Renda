import { createFileSystemClientHandlers, createFileSystemHostHandlers, createFileSystemRequestDeserializers, createFileSystemRequestSerializers, createFileSystemResponseDeserializers, createFileSystemResponseSerializers } from "./responseHandlers/fileSystem.js";
import { createAssetsHandlers } from "./responseHandlers/assets.js";

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<ExtractResponseHandlers<typeof createStudioClientHandlers>, ExtractResponseHandlers<typeof createStudioHostHandlers>>} StudioClientHostConnection */
/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<ExtractResponseHandlers<typeof createStudioHostHandlers>, ExtractResponseHandlers<typeof createStudioClientHandlers>>} StudioHostClientConnection */

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<import("../../../../src/mod.js").InspectorManager["getResponseHandlers"]>["reliableResponseHandlers"]>, StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<typeof createStudioInspectorHandlers>["reliableResponseHandlers"]>>} InspectorStudioConnection */
/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<typeof createStudioInspectorHandlers>["reliableResponseHandlers"]>, StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<import("../../../../src/mod.js").InspectorManager["getResponseHandlers"]>["reliableResponseHandlers"]>>} StudioInspectorConnection */

/**
 * @template {any[]} TArgs
 * @template TReturn
 * @typedef StudioConnectionRequestHandlerObject
 * @property {(...args: TArgs) => TReturn | import("../../../../src/util/TypedMessenger/TypedMessenger.js").TypedMessengerRequestHandlerReturn<TReturn> | Promise<TReturn | import("../../../../src/util/TypedMessenger/TypedMessenger.js").TypedMessengerRequestHandlerReturn<TReturn>>} handler
 * @property {(buffer: ArrayBuffer) => TArgs} [requestDeserializer]
 * @property {(returnValue: TReturn) => ArrayBuffer} [responseSerializer]
 */
/**
 * @typedef {Object<string, StudioConnectionRequestHandlerObject<any[], any> | ((...args: any[]) => any)>} StudioConnectionRequestHandlers
 */

/**
 * @template {StudioConnectionRequestHandlers} THandlers
 * @typedef {{
 * 	[x in keyof THandlers]: THandlers[x] extends StudioConnectionRequestHandlerObject<any, any> ? THandlers[x]["handler"] : THandlers[x];
 * }} StudioConnectionRequestHandlersToTypedMessengerHandlers
 */

/**
 * @template {(...args: any) => {reliableResponseHandlers: any}} T
 * @typedef {StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<T>["reliableResponseHandlers"]>} ExtractResponseHandlers
 */

/**
 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
 */
export function createStudioHostHandlers(fileSystem) {
	/** @satisfies {import("../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<any>} */
	const handlers = {
		reliableResponseHandlers: {
			...createFileSystemHostHandlers(fileSystem),
		},
		requestDeserializers: {
			...createFileSystemRequestDeserializers(),
		},
		responseSerializers: {
			...createFileSystemResponseSerializers(),
		},
	};
	return handlers;
}

/**
 * @param {import("../../util/fileSystems/RemoteStudioFileSystem.js").RemoteStudioFileSystem} fileSystem
 */
export function createStudioClientHandlers(fileSystem) {
	/** @satisfies {import("../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<any>} */
	const handlers = {
		reliableResponseHandlers: {
			...createFileSystemClientHandlers(fileSystem),
		},
		requestSerializers: {
			...createFileSystemRequestSerializers(),
		},
		responseDeserializers: {
			...createFileSystemResponseDeserializers(),
		},
	};
	return handlers;
}

/**
 * @param {import("../../assets/AssetManager.js").AssetManager} assetManager
 */
export function createStudioInspectorHandlers(assetManager) {
	return {
		reliableResponseHandlers: {
			...createAssetsHandlers(assetManager),
		},
	};
}
