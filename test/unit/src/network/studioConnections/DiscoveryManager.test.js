import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {DiscoveryManager} from "../../../../../src/network/studioConnections/DiscoveryManager.js";
import {ExtendedDiscoveryMethod} from "./discoveryMethods/shared/ExtendedDiscoveryMethod.js";
import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";

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
	name: "new active connection fires callbacks and is closed when no callback accepts",
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

		const messageHandler = discoveryMethod.addActive("id1", false, 42, "str");
		assertSpyCalls(messageHandler.closeSpy, 1);
	},
});

Deno.test({
	name: "accepting a connection stops other events from firing, and connection is not closed",
	fn() {
		const manager = new DiscoveryManager("studio-host");
		const discoveryMethod = manager.addDiscoveryMethod(ExtendedDiscoveryMethod);
		discoveryMethod.addOne({
			clientType: "inspector",
			id: "id1",
			projectMetadata: null,
		});

		let firstCallCount = 0;
		manager.onConnectionRequest(request => {
			firstCallCount++;
			if (firstCallCount > 1) {
				request.accept({});
			}
		});

		/** @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").OnConnectionCreatedRequest} request */
		const onConnectionRequest2 = request => {};
		const onConnectionRequest2Spy = spy(onConnectionRequest2);
		manager.onConnectionRequest(onConnectionRequest2Spy);

		discoveryMethod.addActive("id1", false, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);

		const messageHandler2 = discoveryMethod.addActive("id1", false, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);
		assertSpyCalls(messageHandler2.closeSpy, 0);
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

			discoveryMethod.addActive("id1", false, 42, "str");
			assertSpyCalls(onConnectionRequest2Spy, 1);
			assertSpyCalls(consoleErrorSpy, 1);
			assertStrictEquals(consoleErrorSpy.calls[0].args[0], error);
		} finally {
			consoleErrorSpy.restore();
		}
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

		discoveryMethod.addActive("id1", false, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);

		manager.removeOnConnectionRequest(onConnectionRequest2Spy);
		discoveryMethod.addActive("id1", false, 42, "str");
		assertSpyCalls(onConnectionRequest2Spy, 1);
	},
});

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

		manager.requestConnection("id2", "extra data");
		assertSpyCalls(spy1, 0);
		assertSpyCalls(spy2, 1);
		assertSpyCall(spy2, 0, {
			args: [
				"id2",
				"extra data",
			],
		});

		assertThrows(() => {
			manager.requestConnection("non existent id");
		}, Error, 'No connection with id "non existent id" was found.');
	},
});
