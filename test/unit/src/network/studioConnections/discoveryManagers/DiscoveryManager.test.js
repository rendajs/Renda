import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {DiscoveryManager} from "../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManager.js";
import {assertEquals, assertThrows} from "std/testing/asserts.ts";

/**
 * @extends {DiscoveryManager<any>}
 */
class ExtendedDiscoveryManager extends DiscoveryManager {
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
}

Deno.test({
	name: "Adding and removing connections",
	fn() {
		const manager = new ExtendedDiscoveryManager();
		const onChangeSpy = spy();
		manager.onAvailableConnectionsChanged(onChangeSpy);

		manager.addOne({
			id: "id",
			clientType: "studio",
			projectMetaData: null,
		});
		assertSpyCalls(onChangeSpy, 1);
		assertEquals(Array.from(manager.availableConnections()), [
			{
				clientType: "studio",
				id: "id",
				projectMetaData: null,
			},
		]);

		manager.removeOne("id");
		assertSpyCalls(onChangeSpy, 2);
		assertEquals(Array.from(manager.availableConnections()), []);
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
			clientType: "studio",
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
			clientType: "studio",
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
	name: "setProjectMetaData() throws",
	fn() {
		const manager = new DiscoveryManager();
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
			clientType: "studio",
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
