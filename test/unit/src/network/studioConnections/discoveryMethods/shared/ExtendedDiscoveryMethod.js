import {spy} from "std/testing/mock.ts";
import {DiscoveryMethod} from "../../../../../../../src/network/studioConnections/discoveryMethods/DiscoveryMethod.js";
import {MessageHandler} from "../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js";

/** @type {Set<ExtendedMessageHandler>} */
const createdMessageHandlers = new Set();

export function *getCreatedMessageHandlers() {
	yield* createdMessageHandlers;
}

export function clearCreatedMessageHandlers() {
	createdMessageHandlers.clear();
}

/**
 * @typedef ExtendedMessageHandlerOptions
 * @property {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus} [initialStatus]
 */

export class ExtendedMessageHandler extends MessageHandler {
	/**
	 * @param {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerOptions} options
	 * @param {number} param1
	 * @param {string} param2
	 * @param {ExtendedMessageHandlerOptions} [extendedOptions]
	 */
	constructor(options, param1, param2, {
		initialStatus = "connecting",
	} = {}) {
		super(options);
		this.param1 = param1;
		this.param2 = param2;

		this.closeSpy = spy(this, "close");
		this.requestAcceptedSpy = spy(this, "requestAccepted");
		this.requestRejectedSpy = spy(this, "requestRejected");
		this.setStatus(initialStatus);
		createdMessageHandlers.add(this);
	}

	markAsConnected() {
		this.setStatus("connected");
	}
}

/**
 * @extends {DiscoveryMethod<typeof ExtendedMessageHandler>}
 */
export class ExtendedDiscoveryMethod extends DiscoveryMethod {
	static type = "test:type";

	constructor() {
		super(ExtendedMessageHandler);
		this.registerClientSpy = spy(this, "registerClient");
		this.setProjectMetadataSpy = spy(this, "setProjectMetadata");
		this.destructorSpy = spy(this, "destructor");
	}

	destructed = false;

	destructor() {
		this.destructed = true;
	}

	/**
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnection} connectionData
	 */
	addOne(connectionData) {
		this.addAvailableConnection(connectionData);
	}

	/**
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnection[]} connections
	 */
	setMultiple(connections) {
		this.setAvailableConnections(connections);
	}

	/**
	 * @param {import("../../../../../../../src/mod.js").UuidString} id
	 */
	removeOne(id) {
		this.removeAvailableConnection(id);
	}

	clearAll() {
		this.clearAvailableConnections();
	}

	/**
	 * @param {import("../../../../../../../src/mod.js").UuidString} id
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} projectMetaData
	 */
	modifyOne(id, projectMetaData) {
		this.setConnectionProjectMetadata(id, projectMetaData);
	}

	/**
	 * @param {import("../../../../../../../src/mod.js").UuidString} otherClientUuid
	 * @param {boolean} initiatedByMe
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestData} connectionRequestData
	 * @param {number} param1
	 * @param {string} param2
	 * @param {ExtendedMessageHandlerOptions} [options]
	 */
	addActive(otherClientUuid, initiatedByMe, connectionRequestData, param1, param2, options) {
		return this.addActiveConnection(otherClientUuid, initiatedByMe, connectionRequestData, param1, param2, options);
	}

	/**
	 * @override
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} clientType
	 */
	registerClient(clientType) {}

	/**
	 * @override
	 * @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
	 */
	setProjectMetadata(metadata) {}

	/**
	 * @override
	 * @param {string} otherClientUuid
	 * @param {unknown} connectionData
	 */
	requestConnection(otherClientUuid, connectionData) {}
}
