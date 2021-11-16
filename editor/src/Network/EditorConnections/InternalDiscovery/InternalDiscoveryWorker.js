/**
 * @fileoverview This is the entry point for the editorDiscovery SharedWorker.
 */

import InternalDiscoveryWorkerConnection from "./InternalDiscoveryWorkerConnection.js";

/** @type {Map<string, InternalDiscoveryWorkerConnection>} */
const activeConnections = new Map();

/**
 * @param {import("../../../Util/Util.js").UuidString} createdClientId
 */
function sendAllConnectionAddedMessages(createdClientId) {
	const {port: createdPort, clientType: createdClientType} = activeConnections.get(createdClientId);
	for (const [id, {port, clientType, projectMetaData}] of activeConnections) {
		if (port == createdPort) continue;

		createdPort.postMessage({
			op: "availableClientAdded",
			clientId: id,
			clientType,
			projectMetaData,
		});
		port.postMessage({
			op: "availableClientAdded",
			clientId: createdClientId,
			clientType: createdClientType,
		});
	}
}

/**
 * @param {import("../../../Util/Util.js").UuidString} clientId
 */
function sendAllClientRemoved(clientId) {
	for (const {port} of activeConnections.values()) {
		port.postMessage({
			op: "availableClientRemoved",
			clientId,
		});
	}
}

/**
 * @param {InternalDiscoveryWorkerConnection} connection
 */
function sendAllProjectMetaData(connection) {
	for (const {port} of activeConnections.values()) {
		port.postMessage({
			op: "projectMetaData",
			clientId: connection.id,
			projectMetaData: connection.projectMetaData,
		});
	}
}

self.addEventListener("connect", event => {
	const castEvent = /** @type {MessageEvent} */ (event);
	const [port] = castEvent.ports;

	/** @type {InternalDiscoveryWorkerConnection} */
	let createdConnection = null;
	port.addEventListener("message", e => {
		if (!e.data) return;

		const {data} = e;
		const {op} = data;

		if (op === "registerClient") {
			if (createdConnection) return;
			const {clientType} = data;

			createdConnection = new InternalDiscoveryWorkerConnection(port, clientType);
			activeConnections.set(createdConnection.id, createdConnection);
			sendAllConnectionAddedMessages(createdConnection.id);
		} else if (op == "unregisterClient") {
			if (!createdConnection) return;
			activeConnections.delete(createdConnection.id);
			sendAllClientRemoved(createdConnection.id);
			createdConnection = null;
		} else if (op == "projectMetaData") {
			if (!createdConnection) return;
			const {projectMetaData} = data;
			createdConnection.setProjectMetaData(projectMetaData);
			sendAllProjectMetaData(createdConnection);
		} else if (op == "requestConnection") {
			if (!createdConnection) return;

			const {otherClientId} = data;
			const {port: otherPort} = activeConnections.get(otherClientId);
			if (!otherPort) return;

			const messageChannel = new MessageChannel();
			port.postMessage({
				op: "connectionCreated",
				clientId: otherClientId,
				port: messageChannel.port1,
			}, [messageChannel.port1]);

			otherPort.postMessage({
				op: "connectionCreated",
				clientId: createdConnection.id,
				port: messageChannel.port2,
			}, [messageChannel.port2]);
		}
	});
	port.start();
});
