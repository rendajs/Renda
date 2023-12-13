import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {DiscoveryMethod} from "../../../../../../src/network/studioConnections/discoveryMethods/DiscoveryMethod.js";
import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {ExtendedDiscoveryMethod, ExtendedMessageHandler} from "./shared/ExtendedDiscoveryMethod.js";

Deno.test({
	name: "Adding and removing connections",
	fn() {
		const method = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		method.onAvailableConnectionsChanged(onChangeSpy);

		method.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, 1);
		assertEquals(Array.from(method.availableConnections()), [
			{
				clientType: "studio-host",
				id: "id",
				projectMetadata: null,
			},
		]);

		assertEquals(method.hasAvailableConnection("id"), true);

		method.removeOne("id");
		assertSpyCalls(onChangeSpy, 2);
		assertEquals(Array.from(method.availableConnections()), []);

		assertEquals(method.hasAvailableConnection("id"), false);
	},
});

Deno.test({
	name: "addAvailableConnection() clones the connection data.",
	fn() {
		const method = new ExtendedDiscoveryMethod();

		/**
		 * @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnection}
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
		method.addOne(connection);
		connection.clientType = "studio-client";
		if (connection.projectMetadata) {
			connection.projectMetadata.name = "new project name";
			connection.projectMetadata.fileSystemHasWritePermissions = true;
		}

		assertEquals(Array.from(method.availableConnections()), [
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
		const method = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		method.onAvailableConnectionsChanged(onChangeSpy);

		method.addOne({
			id: "1",
			clientType: "studio-host",
			projectMetadata: null,
		});
		method.addOne({
			id: "2",
			clientType: "inspector",
			projectMetadata: {
				name: "project",
				uuid: "id",
				fileSystemHasWritePermissions: false,
			},
		});
		assertSpyCalls(onChangeSpy, 2);

		method.clearAll();
		assertSpyCalls(onChangeSpy, 3);
		assertEquals(Array.from(method.availableConnections()), []);
	},
});

Deno.test({
	name: "setAvailableConnections()",
	fn() {
		const method = new ExtendedDiscoveryMethod();

		const onChangeSpy = spy();
		let spyCallCount = 0;
		method.onAvailableConnectionsChanged(onChangeSpy);

		// Setting an empty array while the array is already empty shouldn't fire the callback
		method.setMultiple([]);
		assertSpyCalls(onChangeSpy, spyCallCount);

		// This connection should be removed once we call setAvailableConnections()
		method.addOne({
			id: "shouldnotexist",
			clientType: "inspector",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, ++spyCallCount);

		method.setMultiple([
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
		assertEquals(Array.from(method.availableConnections()), [
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
		const method = new ExtendedDiscoveryMethod();
		const onChangeSpy = spy();
		method.onAvailableConnectionsChanged(onChangeSpy);

		method.addOne({
			id: "id",
			clientType: "studio-host",
			projectMetadata: null,
		});
		assertSpyCalls(onChangeSpy, 1);

		method.removeOnAvailableConnectionsChanged(onChangeSpy);
		method.addOne({
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
		const method = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			method.registerClient("studio-client");
		}, Error, "base class");
	},
});

Deno.test({
	name: "setProjectMetaData() throws",
	fn() {
		const method = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			method.setProjectMetadata(null);
		}, Error, "base class");
	},
});

Deno.test({
	name: "requestConnection() throws",
	fn() {
		const method = new DiscoveryMethod(ExtendedMessageHandler);
		assertThrows(() => {
			method.requestConnection("id");
		}, Error, "base class");
	},
});

Deno.test({
	name: "setConnectionProjectMetaData()",
	fn() {
		const method = new ExtendedDiscoveryMethod();
		method.addOne({
			id: "A",
			clientType: "studio-host",
			projectMetadata: null,
		});

		const onChangeSpy = spy();
		method.onAvailableConnectionsChanged(onChangeSpy);

		method.modifyOne("A", {
			fileSystemHasWritePermissions: false,
			name: "project",
			uuid: "id",
		});
		assertSpyCalls(onChangeSpy, 1);

		method.modifyOne("B", {
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
		const method = new ExtendedDiscoveryMethod();

		assertThrows(() => {
			method.addActive("non existent", true, {}, 0, "");
		});
	},
});

Deno.test({
	name: "addActiveConnections() adds connections",
	fn() {
		class ExtendedDiscoveryMethod2 extends ExtendedDiscoveryMethod {
			getActiveConnections() {
				return this.activeConnections;
			}
		}
		const method = new ExtendedDiscoveryMethod2();

		const spyFn = spy();
		method.onConnectionRequest(spyFn);

		method.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetadata: null,
		});
		const messageHandler = method.addActive("id", true, {token: "the_token"}, 42, "foo");

		assertSpyCalls(spyFn, 1);
		assertStrictEquals(spyFn.calls[0].args[0], messageHandler);
		assertEquals(messageHandler.initiatedByMe, true);
		assertEquals(messageHandler.connectionRequestData, {token: "the_token"});
		assertEquals(messageHandler.param1, 42);
		assertEquals(messageHandler.param2, "foo");
		assertEquals(method.getActiveConnections().size, 1);
	},
});

Deno.test({
	name: "addActiveConnection() clones connectionData",
	fn() {
		const method = new ExtendedDiscoveryMethod();
		/** @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata} */
		const projectMetaData = {
			fileSystemHasWritePermissions: true,
			name: "old name",
			uuid: "project id",
		};
		method.addOne({
			id: "id",
			clientType: "studio-client",
			projectMetadata: projectMetaData,
		});
		/** @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestData} */
		const connectionRequestData = {
			token: "token"
		}

		const messageHandler = method.addActive("id", true, connectionRequestData, 0, "");

		projectMetaData.name = "new name";
		connectionRequestData.token = "new token";

		assertEquals(messageHandler.projectMetadata?.name, "old name");
		assertEquals(messageHandler.connectionRequestData, {token: "token"});
	},
});
