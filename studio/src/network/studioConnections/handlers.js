import {createFileSystemHandlers, createFileSystemRequestDeserializers, createFileSystemRequestSerializers, createFileSystemResponseDeserializers, createFileSystemResponseSerializers} from "./responseHandlers/fileSystem.js";
import {createAssetsHandlers} from "./responseHandlers/assets.js";

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<{}, StudioConnectionRequestHandlersToTypedMessengerHandlers<ReturnType<typeof createStudioHostHandlers>["reliableResponseHandlers"]>>} StudioClientHostConnection */

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
 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
 */
export function createStudioHostHandlers(fileSystem) {
	/** @satisfies {import("../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<any>} */
	const handlers = {
		reliableResponseHandlers: {
			...createFileSystemHandlers(fileSystem),
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

export function createStudioClientHandlers() {
	/** @satisfies {import("../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<any>} */
	const handlers = {
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
