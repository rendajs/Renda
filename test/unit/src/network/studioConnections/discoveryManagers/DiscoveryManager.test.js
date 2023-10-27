import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {DiscoveryManager} from "../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js";
import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {MessageHandler} from "../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js";

class ExtendedMessageHandler extends MessageHandler {
	/**
	 * @param {import("../../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerOptions} options
	 * @param {number} param1
	 * @param {string} param2
	 */
	constructor(options, param1, param2) {
		super(options);
		this.param1 = param1;
		this.param2 = param2;
	}
}

/**
 * @extends {DiscoveryManager<typeof ExtendedMessageHandler>}
 */
class ExtendedDiscoveryManager extends DiscoveryManager {
	static type = "test:type";

	constructor() {
		super(ExtendedMessageHandler);
	}

	/**
	 * @param {import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").AvailableStudioData} connectionData
	 */
	addOne(connectionData) {
		this.addAvailableConnection(connectionData);
	}

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString} id
	 */
	removeOne(id) {
		this.removeAvailableConnection(id);
	}

	clearAll() {
		this.clearAvailableConnections();
	}

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString} id
	 * @param {import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} projectMetaData
	 */
	modifyOne(id, projectMetaData) {
		this.setConnectionProjectMetaData(id, projectMetaData);
	}

	/**
	 * @param {import("../../../../../../src/mod.js").UuidString} otherClientUuid
	 * @param {boolean} initiatedByMe
	 * @param {number} param1
	 * @param {string} param2
	 */
	addActive(otherClientUuid, initiatedByMe, param1, param2) {
		return this.addActiveConnection(otherClientUuid, initiatedByMe, param1, param2);
	}
}

Deno.test({
	name: "Adding and removing connections",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetaData: null,
		});
		assertSpyCalls(onChangeSpy, 1);
		assertEquals(Array.from(manager.availableConnections()), [
			{
				clientType: "studio-host",
				id: "id",
				projectMetaData: null,
			},
		]);

		assertEquals(manager.hasConnection("id"), true);

		manager.removeOne("id");
		assertSpyCalls(onChangeSpy, 2);
		assertEquals(Array.from(manager.availableConnections()), []);

		assertEquals(manager.hasConnection("id"), false);
	},
});

Deno.test({
	name: "Clear available connections",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "1",
			clientType: "studio-host",
			projectMetaData: null,
		});
		manager.addOne({
			id: "2",
			clientType: "inspector",
			projectMetaData: {
				name: "project",
				uuid: "id",
				fileSystemHasWritePermissions: false,
			},
		});
		assertSpyCalls(onChangeSpy, 2);

		manager.clearAll();
		assertSpyCalls(onChangeSpy, 3);
		assertEquals(Array.from(manager.availableConnections()), []);
	},
});

Deno.test({
	name: "onAvailableConnectionsChanged callbacks stop firing when removed",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetaData: null,
		});
		assertSpyCalls(onChangeSpy, 1);

		manager.removeOnAvailableConnectionsChanged(onChangeSpy);
		manager.addOne({
			id: "id2",
			clientType: "inspector",
			projectMetaData: null,
		});

		assertSpyCalls(onChangeSpy, 1);
	},
});

Deno.test({
	name: "registerClient() throws",
	fn() {
		const manager = new DiscoveryManager(ExtendedMessageHandler);
		assertThrows(() => {
			manager.registerClient("studio-client");
		});
	},
});

Deno.test({
	name: "setProjectMetaData() throws",
	fn() {
		const manager = new DiscoveryManager(ExtendedMessageHandler);
		assertThrows(() => {
			manager.setProjectMetaData(null);
		});
	},
});

Deno.test({
	name: "setConnectionProjectMetaData()",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		manager.addOne({
			id: "A",
			clientType: "studio-host",
			projectMetaData: null,
		});

		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.modifyOne("A", {
			fileSystemHasWritePermissions: false,
			name: "project",
			uuid: "id",
		});
		assertSpyCalls(onChangeSpy, 1);

		manager.modifyOne("B", {
			fileSystemHasWritePermissions: false,
			name: "project",
			uuid: "id",
		});
		assertSpyCalls(onChangeSpy, 1);
	},
});

Deno.test({
	name: "addActiveConnection() throws when the otherClientUuid doesn't exist",
	fn() {
		const manager = new ExtendedDiscoveryManager();

		assertThrows(() => {
			manager.addActive("non existent", true, 0, "");
		});
	},
});

Deno.test({
	name: "addActiveConnections() adds connections",
	fn() {
		const manager = new ExtendedDiscoveryManager();

		const spyFn = spy();
		manager.onConnectionRequest(spyFn);

		manager.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetaData: null,
		});
		const messageHandler = manager.addActive("id", true, 42, "foo");

		assertSpyCalls(spyFn, 1);
		assertStrictEquals(spyFn.calls[0].args[0], messageHandler);
		assertEquals(messageHandler.initiatedByMe, true);
		assertEquals(messageHandler.param1, 42);
		assertEquals(messageHandler.param2, "foo");
	},
});

Deno.test({
	name: "addActiveConnection() clones connectionData",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		/** @type {import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData} */
		const projectMetaData = {
			fileSystemHasWritePermissions: true,
			name: "old name",
			uuid: "project id",
		};
		manager.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetaData,
		});

		const messageHandler = manager.addActive("id", true, 0, "");

		projectMetaData.name = "new name";

		assertEquals(messageHandler.projectMetaData?.name, "old name");
	},
});
