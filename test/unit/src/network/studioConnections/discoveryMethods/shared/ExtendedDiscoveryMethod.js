import {spy} from "std/testing/mock.ts";
import {DiscoveryMethod} from "../../../../../../../src/network/studioConnections/discoveryMethods/DiscoveryMethod.js";
import {MessageHandler} from "../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js";

export class ExtendedMessageHandler extends MessageHandler {
	/**
	 * @param {import("../../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerOptions} options
	 * @param {number} param1
	 * @param {string} param2
	 */
	constructor(options, param1, param2) {
		super(options);
		this.param1 = param1;
		this.param2 = param2;

		this.closeSpy = spy(this, "close");
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
	 * @param {number} param1
	 * @param {string} param2
	 */
	addActive(otherClientUuid, initiatedByMe, param1, param2) {
		return this.addActiveConnection(otherClientUuid, initiatedByMe, param1, param2);
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
