import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {DiscoveryManager} from "../../../../../src/network/studioConnections/DiscoveryManager.js";
import {ExtendedDiscoveryMethod} from "./discoveryMethods/shared/ExtendedDiscoveryMethod.js";
import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {assertPromiseResolved} from "../../../shared/asserts.js";

Deno.test({
	name: "Adding a discovery method",
	fn() {
		const manager = new DiscoveryManager("inspector");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);

		assertSpyCalls(discoveryMethod.registerClientSpy, 1);
		assertSpyCall(discoveryMethod.registerClientSpy, 0, {
			args: ["inspector"],
		});
	},
});

Deno.test({
	name: "Removing method calls its destructor",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		manager.removeDiscoveryMethod(discoveryMethod);
		assertSpyCalls(discoveryMethod.destructorSpy, 1);

		manager.removeDiscoveryMethod(discoveryMethod);
		assertSpyCalls(discoveryMethod.destructorSpy, 1);
	},
});

Deno.test({
	name: "Destructor calls destructor on all created discovery methods",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod1 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		const discoveryMethod2 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		manager.destructor();
		assertSpyCalls(discoveryMethod1.destructorSpy, 1);
		assertSpyCalls(discoveryMethod2.destructorSpy, 1);
	},
});

Deno.test({
	name: "changing available connections",
	fn() {
		const manager = new DiscoveryManager("inspector");
		const onAvailableConnectionsChangedSpy = spy();
		manager.onAvailableConnectionsChanged(onAvailableConnectionsChangedSpy);
		const discoveryMethod1 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);

		discoveryMethod1.addOne({
			clientType: "studio-host",
			id: "id1",
			projectMetadata: null,
		});

		assertSpyCalls(onAvailableConnectionsChangedSpy, 1);
		assertEquals(Array.from(manager.availableConnections()), [
			{
				clientType: "studio-host",
				id: "id1",
				projectMetadata: null,
				connectionType: "test:type",
			},
		]);
		manager.removeDiscoveryMethod(discoveryMethod1);

		assertSpyCalls(onAvailableConnectionsChangedSpy, 2);
		assertEquals(Array.from(manager.availableConnections()), []);

		// Removing a manager without any connections doesn't fire the callback
		const discoveryMethod2 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		manager.removeDiscoveryMethod(discoveryMethod2);
		assertSpyCalls(onAvailableConnectionsChangedSpy, 2);

		// Removing the callback stops firing it
		manager.removeOnAvailableConnectionsChanged(onAvailableConnectionsChangedSpy);

		const discoveryMethod3 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod3.addOne({
			clientType: "inspector",
			id: "id2",
			projectMetadata: null,
		});
		assertSpyCalls(onAvailableConnectionsChangedSpy, 2);
	},
});

Deno.test({
	name: "new active connection fires callbacks and is not closed when no callback accepts",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		/** @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest} request */
		const onConnectionRequest = request => {};
		const onConnectionRequestSpy = spy(onConnectionRequest);
		manager.onConnectionRequest(onConnectionRequestSpy);

		const messageHandler = discoveryMethod.addActive("id1", false, {token: "the_token"}, 42, "str");
		assertSpyCalls(onConnectionRequestSpy, 1);
		assertEquals(onConnectionRequestSpy.calls[0].args[0].otherClientUuid, "id1");
		assertEquals(onConnectionRequestSpy.calls[0].args[0].clientType, "inspector");
		assertEquals(onConnectionRequestSpy.calls[0].args[0].initiatedByMe, false);
		assertEquals(onConnectionRequestSpy.calls[0].args[0].connectionRequestData, {token: "the_token"});
		assertSpyCalls(messageHandler.closeSpy, 0);
	},
});

Deno.test({
	name: "onConnectionRequest callback that doesn't throw, stops other events from firing and connection is not closed",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		manager.onConnectionRequest(request => {
			// An implementation could store the request and accept it later
		});

		/** @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest} request */
		const onConnectionRequest2 = request => {};
		const onConnectionRequest2Spy = spy(onConnectionRequest2);
		manager.onConnectionRequest(onConnectionRequest2Spy);

		const messageHandler = discoveryMethod.addActive("id1", false, {}, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 0);
		assertSpyCalls(messageHandler.closeSpy, 0);
	},
});

Deno.test({
	name: "connection is closed when all onConnectionRequest callbacks throw",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		const consoleErrorSpy = stub(console, "error");
		try {
			const error = new Error("oh no");
			manager.onConnectionRequest(request => {
				throw error;
			});
			manager.onConnectionRequest(request => {
				throw error;
			});

			const messageHandler = discoveryMethod.addActive("id1", false, {}, 42, "str");
			assertSpyCalls(consoleErrorSpy, 2);
			assertStrictEquals(consoleErrorSpy.calls[0].args[0], error);
			assertStrictEquals(consoleErrorSpy.calls[1].args[0], error);
			assertSpyCalls(messageHandler.closeSpy, 1);
		} finally {
			consoleErrorSpy.restore();
		}
	},
});

Deno.test({
	name: "errors in onConnectionRequest does not prevent others from firing",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		const consoleErrorSpy = stub(console, "error");
		try {
			const error = new Error("oh no");
			manager.onConnectionRequest(request => {
				throw error;
			});

			/** @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest} request */
			const onConnectionRequest2 = request => {};
			const onConnectionRequest2Spy = spy(onConnectionRequest2);
			manager.onConnectionRequest(onConnectionRequest2Spy);

			discoveryMethod.addActive("id1", false, {}, 42, "str");
			assertSpyCalls(onConnectionRequest2Spy, 1);
			assertEquals(onConnectionRequest2Spy.calls[0].args[0].otherClientUuid, "id1");
			assertEquals(onConnectionRequest2Spy.calls[0].args[0].clientType, "inspector");
			assertEquals(onConnectionRequest2Spy.calls[0].args[0].initiatedByMe, false);
			assertSpyCalls(consoleErrorSpy, 1);
			assertStrictEquals(consoleErrorSpy.calls[0].args[0], error);
		} finally {
			consoleErrorSpy.restore();
		}
	},
});

Deno.test({
	name: "Accepting a connection creates a StudioConnection",
	fn() {
		const manager = new DiscoveryManager("studio-client");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		let connectionRequest = /** @type {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest?} */ (null);
		manager.onConnectionRequest(request => {
			connectionRequest = request;
		});

		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});
		const messageHandler = discoveryMethod.addActive("id1", false, {}, 42, "str");

		assertExists(connectionRequest);
		const studioConnection = connectionRequest.accept({});
		assertSpyCalls(messageHandler.requestAcceptedSpy, 1);
		assertSpyCalls(messageHandler.requestRejectedSpy, 0);
		assertEquals(studioConnection.otherClientUuid, "id1");
		assertEquals(studioConnection.clientType, "inspector");
		assertEquals(studioConnection.initiatedByMe, false);

		assertThrows(() => {
			connectionRequest?.accept({});
		}, Error, "The connection request has already been accepted.");
		assertThrows(() => {
			connectionRequest?.reject();
		}, Error, "The connection request has already been accepted.");
	},
});
Deno.test({
	name: "Rejection a connection closes the connection",
	fn() {
		const manager = new DiscoveryManager("studio-client");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		let connectionRequest = /** @type {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest?} */ (null);
		manager.onConnectionRequest(request => {
			connectionRequest = request;
		});

		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});
		const messageHandler = discoveryMethod.addActive("id1", false, {}, 42, "str");

		assertExists(connectionRequest);
		connectionRequest.reject();

		assertSpyCalls(messageHandler.requestAcceptedSpy, 0);
		assertSpyCalls(messageHandler.requestRejectedSpy, 1);
		assertSpyCalls(messageHandler.closeSpy, 1);

		assertThrows(() => {
			connectionRequest?.accept({});
		}, Error, "The connection request has already been rejected.");
		assertThrows(() => {
			connectionRequest?.reject();
		}, Error, "The connection request has already been rejected.");
	},
});

Deno.test({
	name: "removeOnConnectionRequest removes the callback",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		/** @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest} request */
		const onConnectionRequest2 = request => {};
		const onConnectionRequest2Spy = spy(onConnectionRequest2);
		manager.onConnectionRequest(onConnectionRequest2Spy);

		discoveryMethod.addActive("id1", false, {}, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);

		manager.removeOnConnectionRequest(onConnectionRequest2Spy);
		discoveryMethod.addActive("id1", false, {}, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);
	},
});

Deno.test({
	name: "No callbacks fire after destructing the manager",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);

		const onAvailableConnectionsChangedSpy = spy();
		manager.onAvailableConnectionsChanged(onAvailableConnectionsChangedSpy);
		const onConnectionRequestSpy = spy();
		manager.onConnectionRequest(onConnectionRequestSpy);

		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null
		})
		assertSpyCalls(onAvailableConnectionsChangedSpy, 1);

		discoveryMethod.addActive("id1", false, {}, 0, "");
		assertSpyCalls(onConnectionRequestSpy, 1);

		manager.destructor();
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id2",
			projectMetadata: null,
		})
		discoveryMethod.addActive("id2", false, {}, 0, "");

		assertSpyCalls(onAvailableConnectionsChangedSpy, 1);
		assertSpyCalls(onConnectionRequestSpy, 1);
	}
})

Deno.test({
	name: "requestConnection()",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod1 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		const spy1 = spy(discoveryMethod1, "requestConnection");
		const discoveryMethod2 = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		const spy2 = spy(discoveryMethod2, "requestConnection");

		discoveryMethod1.addOne({
			id: "id1",
			clientType: "inspector",
			projectMetadata: null,
		});
		discoveryMethod2.addOne({
			id: "id2",
			clientType: "inspector",
			projectMetadata: null,
		});

		manager.requestConnection("id2", {token: "the_token"});
		assertSpyCalls(spy1, 0);
		assertSpyCalls(spy2, 1);
		assertSpyCall(spy2, 0, {
			args: [
				"id2",
				{token: "the_token"},
			],
		});

		assertThrows(() => {
			manager.requestConnection("non existent id");
		}, Error, 'No connection with id "non existent id" was found.');
	},
});

Deno.test({
	name: "waitForConnection() returns project by id when it is already available",
	async fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "wrong connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "wrong project uuid",
			},
		});
		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "expected connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "expected project uuid",
			},
		});

		const connection = await manager.waitForConnection({
			projectUuid: "expected project uuid",
		});
		assertEquals(connection, {
			clientType: "studio-host",
			connectionType: "test:type",
			id: "expected connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "expected project uuid",
			},
		});
	},
});

Deno.test({
	name: "waitForConnection() only returns connections with a matching client type",
	async fn() {
		const manager = new DiscoveryManager("studio-host");
		class UnexpectedDiscoveryMethod extends ExtendedDiscoveryMethod {
			static type = "test:unexpected";
		}
		const unexpectedDiscoveryMethod = manager.addDiscoveryMethod(UnexpectedDiscoveryMethod);
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		unexpectedDiscoveryMethod.addOne({
			clientType: "studio-host",
			id: "unexpected connection id",
			projectMetadata: null,
		});
		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "expected connection id",
			projectMetadata: null,
		});

		const connection = await manager.waitForConnection({
			connectionType: "test:type",
		});
		assertEquals(connection, {
			clientType: "studio-host",
			connectionType: "test:type",
			id: "expected connection id",
			projectMetadata: null,

		});
	},
});

Deno.test({
	name: "waitForConnection() returns client by id when it is already available",
	async fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "expected connection id",
			projectMetadata: null,
		});

		const connection = await manager.waitForConnection({
			clientUuid: "expected connection id",
		});
		assertEquals(connection, {
			clientType: "studio-host",
			connectionType: "test:type",
			id: "expected connection id",
			projectMetadata: null,
		});
	},
});

Deno.test({
	name: "waitForConnection() returns project by id once the connection becomes available",
	async fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);

		const promise = manager.waitForConnection({
			clientUuid: "expected connection id",
		});
		await assertPromiseResolved(promise, false);

		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "wrong connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "wrong project uuid",
			},
		});
		await assertPromiseResolved(promise, false);

		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "expected connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "expected project uuid",
			},
		});

		await assertPromiseResolved(promise, true);
		assertEquals(await promise, {
			clientType: "studio-host",
			connectionType: "test:type",
			id: "expected connection id",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "My Project",
				uuid: "expected project uuid",
			},
		});
	},
});

Deno.test({
	name: "waitForConnection() returns client by id once the connection becomes available",
	async fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);

		const promise = manager.waitForConnection({
			clientUuid: "expected connection id",
		});
		await assertPromiseResolved(promise, false);

		discoveryMethod.addOne({
			clientType: "studio-host",
			id: "expected connection id",
			projectMetadata: null,
		});

		await assertPromiseResolved(promise, true);
		assertEquals(await promise, {
			clientType: "studio-host",
			connectionType: "test:type",
			id: "expected connection id",
			projectMetadata: null,
		});
	},
});

