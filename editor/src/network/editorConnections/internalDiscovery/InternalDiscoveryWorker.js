/**
 * @fileoverview This is the entry point for the editorDiscovery SharedWorker.
 */

/**
 * @typedef {{
 * 	registerClient: {
 * 		clientType: import("../EditorConnectionsManager.js").ClientType,
 * 	},
 * 	unregisterClient: null,
 * 	projectMetaData: {
 * 		projectMetaData: import("../EditorConnectionsManager.js").RemoteEditorMetaData,
 * 	},
 * 	requestConnection: {
 * 		otherClientId: import("../../../../../src/mod.js").UuidString,
 * 	},
 * }} InternalDiscoveryWorkerMessages
 */

/** @typedef {keyof InternalDiscoveryWorkerMessages} InternalDiscoveryWorkerMessageOp */
/**
 * @template {InternalDiscoveryWorkerMessageOp} T
 * @typedef {T extends InternalDiscoveryWorkerMessageOp ?
 * 	InternalDiscoveryWorkerMessages[T] extends null ?
 * 		{op: T} :
 * 		{op: T} &
 * 		InternalDiscoveryWorkerMessages[T] :
 * never} InternalDiscoveryWorkerMessageHelper
 */
/** @typedef {InternalDiscoveryWorkerMessageHelper<InternalDiscoveryWorkerMessageOp>} InternalDiscoveryWorkerMessage */

import {InternalDiscoveryWorkerConnection} from "./InternalDiscoveryWorkerConnection.js";

/** @type {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} */
const activeConnections = new Map();

/**
 * When a client registers itself, this gets called.
 * This broadcasts the existence of the client to all other clients.
 * And sends a list of all other clients to the new client.
 * @param {InternalDiscoveryWorkerConnection} createdConnection
 */
function sendAllConnectionAddedMessages(createdConnection) {
	for (const [id, activeConnection] of activeConnections) {
		if (activeConnection.port == createdConnection.port) continue;

		createdConnection.postMessage({
			op: "availableClientAdded",
			clientId: id,
			clientType: activeConnection.clientType,
			projectMetaData: activeConnection.projectMetaData,
		});
		activeConnection.postMessage({
			op: "availableClientAdded",
			clientId: createdConnection.id,
			clientType: createdConnection.clientType,
			projectMetaData: null,
		});
	}
}

/**
 * @param {import("../../../../../src/util/mod.js").UuidString} clientId
 */
function sendAllClientRemoved(clientId) {
	for (const connection of activeConnections.values()) {
		connection.postMessage({
			op: "availableClientRemoved",
			clientId,
		});
	}
}

/**
 * @param {InternalDiscoveryWorkerConnection} connection
 */
function sendAllProjectMetaData(connection) {
	for (const connection of activeConnections.values()) {
		connection.postMessage({
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

		/** @type {InternalDiscoveryWorkerMessage} */
		const message = e.data;
		const op = message.op;

		if (op === "registerClient") {
			if (createdConnection) return;

			createdConnection = new InternalDiscoveryWorkerConnection(port, message.clientType);
			activeConnections.set(createdConnection.id, createdConnection);
			sendAllConnectionAddedMessages(createdConnection);
		} else if (op == "unregisterClient") {
			if (!createdConnection) return;
			activeConnections.delete(createdConnection.id);
			sendAllClientRemoved(createdConnection.id);
			createdConnection = null;
		} else if (op == "projectMetaData") {
			if (!createdConnection) return;
			createdConnection.setProjectMetaData(message.projectMetaData);
			sendAllProjectMetaData(createdConnection);
		} else if (op == "requestConnection") {
			if (!createdConnection) return;

			const otherClientId = message.otherClientId;
			const otherConnection = activeConnections.get(otherClientId);
			if (!otherConnection) return;

			const messageChannel = new MessageChannel();
			/** @type {import("../../../../../src/Inspector/InternalDiscoveryManager.js").InternalDiscoveryClientMessage} */
			const sendMessage = {
				op: "connectionCreated",
				clientId: otherClientId,
				port: messageChannel.port1,
			};
			port.postMessage(sendMessage, [messageChannel.port1]);

			otherConnection.postMessage({
				op: "connectionCreated",
				clientId: createdConnection.id,
				port: messageChannel.port2,
			}, [messageChannel.port2]);
		}
	});
	port.start();
});
