import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {DiscoveryMethod} from "../../../../../../src/network/studioConnections/discoveryMethods/DiscoveryMethod.js";
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
 * @extends {DiscoveryMethod<typeof ExtendedMessageHandler>}
 */
class ExtendedDiscoveryMethod extends DiscoveryMethod {
	static type = "test:type";

	constructor() {
		super(ExtendedMessageHandler);
	}

	/**
	 * @param {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableStudioData} connectionData
	 */
	addOne(connectionData) {
		this.addAvailableConnection(connectionData);
	}

	/**
	 * @param {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableStudioData[]} connections
	 */
	setMultiple(connections) {
		this.setAvailableConnections(connections);
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
	 * @param {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").RemoteStudioMetadata?} projectMetaData
	 */
	modifyOne(id, projectMetaData) {
		this.setConnectionProjectMetadata(id, projectMetaData);
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
		const manager = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, 1);
		assertEquals(Array.from(manager.availableConnections()), [
			{
				clientType: "studio-host",
				id: "id",
				projectMetadata: null,
			},
		]);

		assertEquals(manager.hasAvailableConnection("id"), true);

		manager.removeOne("id");
		assertSpyCalls(onChangeSpy, 2);
		assertEquals(Array.from(manager.availableConnections()), []);

		assertEquals(manager.hasAvailableConnection("id"), false);
	},
});

Deno.test({
	name: "addAvailableConnection() clones the connection data.",
	fn() {
		const manager = new ExtendedDiscoveryMethod();

		/**
		 * @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableStudioData}
		 */
		const connection = {
			id: "id",
			clientType: "studio-host",
			projectMetadata: {
				name: "old project name",
				fileSystemHasWritePermissions: false,
				uuid: "uuid",
			},
		};
		manager.addOne(connection);
		connection.clientType = "studio-client";
		if (connection.projectMetadata) {
			connection.projectMetadata.name = "new project name";
			connection.projectMetadata.fileSystemHasWritePermissions = true;
		}

		assertEquals(Array.from(manager.availableConnections()), [
			{
				id: "id",
				clientType: "studio-host",
				projectMetadata: {
					fileSystemHasWritePermissions: false,
					name: "old project name",
					uuid: "uuid",
				},
			},
		]);
	},
});

Deno.test({
	name: "Clear available connections",
	fn() {
		const manager = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "1",
			clientType: "studio-host",
			projectMetadata: null,
		});
		manager.addOne({
			id: "2",
			clientType: "inspector",
			projectMetadata: {
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
	name: "setAvailableConnections()",
	fn() {
		const manager = new ExtendedDiscoveryMethod();

		const onChangeSpy = spy();
		let spyCallCount = 0;
		manager.onAvailableConnectionsChanged(onChangeSpy);

		// Setting an empty array while the array is already empty shouldn't fire the callback
		manager.setMultiple([]);
		assertSpyCalls(onChangeSpy, spyCallCount);

		// This connection should be removed once we call setAvailableConnections()
		manager.addOne({
			id: "shouldnotexist",
			clientType: "inspector",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, ++spyCallCount);

		manager.setMultiple([
			{
				id: "1",
				clientType: "studio-client",
				projectMetadata: null,
			},
			{
				id: "2",
				clientType: "studio-host",
				projectMetadata: null,
			},
		]);
		assertSpyCalls(onChangeSpy, ++spyCallCount);
		assertEquals(Array.from(manager.availableConnections()), [
			{
				id: "1",
				clientType: "studio-client",
				projectMetadata: null,
			},
			{
				id: "2",
				clientType: "studio-host",
				projectMetadata: null,
			},
		]);
	},
});

Deno.test({
	name: "onAvailableConnectionsChanged callbacks stop firing when removed",
	fn() {
		const manager = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, 1);

		manager.removeOnAvailableConnectionsChanged(onChangeSpy);
		manager.addOne({
			id: "id2",
			clientType: "inspector",
			projectMetadata: null,
		});

		assertSpyCalls(onChangeSpy, 1);
	},
});

Deno.test({
	name: "registerClient() throws",
	fn() {
		const manager = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			manager.registerClient("studio-client");
		}, Error, "base class");
	},
});

Deno.test({
	name: "setProjectMetaData() throws",
	fn() {
		const manager = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			manager.setProjectMetadata(null);
		}, Error, "base class");
	},
});

Deno.test({
	name: "requestConnection() throws",
	fn() {
		const manager = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			manager.requestConnection("id");
		}, Error, "base class");
	},
});

Deno.test({
	name: "setConnectionProjectMetaData()",
	fn() {
		const manager = new ExtendedDiscoveryMethod();
		manager.addOne({
			id: "A",
			clientType: "studio-host",
			projectMetadata: null,
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
		const manager = new ExtendedDiscoveryMethod();

		assertThrows(() => {
			manager.addActive("non existent", true, 0, "");
		});
	},
});

Deno.test({
	name: "addActiveConnections() adds connections",
	fn() {
		const manager = new ExtendedDiscoveryMethod();

		const spyFn = spy();
		manager.onConnectionRequest(spyFn);

		manager.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetadata: null,
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
		const manager = new ExtendedDiscoveryMethod();
		/** @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").RemoteStudioMetadata} */
		const projectMetaData = {
			fileSystemHasWritePermissions: true,
			name: "old name",
			uuid: "project id",
		};
		manager.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetadata: projectMetaData,
		});

		const messageHandler = manager.addActive("id", true, 0, "");

		projectMetaData.name = "new name";

		assertEquals(messageHandler.projectMetadata?.name, "old name");
	},
});
