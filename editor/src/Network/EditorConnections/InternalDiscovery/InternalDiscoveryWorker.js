/**
 * @fileoverview This is the entry point for the editorDiscovery SharedWorker.
 */

import {InternalDiscoveryWorkerConnection} from "./InternalDiscoveryWorkerConnection.js";

/** @type {Map<string, InternalDiscoveryWorkerConnection>} */
const activeConnections = new Map();

/**
 * When a client registers itself, this gets called.
 * This broadcasts the existence of the client to all other clients.
 * And sends a list of all other clients to the new client.
 * @param {InternalDiscoveryWorkerConnection} createdConnection
 */
function sendAllConnectionAddedMessages(createdConnection) {
	const {port: createdPort, clientType: createdClientType} = createdConnection;
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
			clientId: createdConnection.id,
			clientType: createdClientType,
		});
	}
}

/**
 * @param {import("../../../../../src/util/mod.js").UuidString} clientId
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

	/** @type {InternalDiscoveryWorkerConnection?} */
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
			sendAllConnectionAddedMessages(createdConnection);
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
			const otherConnection = activeConnections.get(otherClientId);
			if (!otherConnection) return;
			const {port: otherPort} = otherConnection;
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
