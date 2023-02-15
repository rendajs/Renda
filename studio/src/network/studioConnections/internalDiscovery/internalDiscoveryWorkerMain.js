/**
 * @fileoverview This is the entry point for the internalDiscovery SharedWorker.
 */

import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {InternalDiscoveryWorkerConnection} from "./InternalDiscoveryWorkerConnection.js";

/**
 * When a client registers itself, this gets called.
 * This broadcasts the existence of the client to all other clients.
 * And sends a list of all other clients to the new client.
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 * @param {InternalDiscoveryWorkerConnection} createdConnection
 */
function sendAllClientAddedMessages(activeConnections, createdConnection) {
	for (const [id, activeConnection] of activeConnections) {
		if (activeConnection.port == createdConnection.port) continue;

		createdConnection.parentMessenger.send.availableClientAdded(id, activeConnection.clientType, activeConnection.projectMetaData);
		activeConnection.parentMessenger.send.availableClientAdded(createdConnection.id, createdConnection.clientType, null);
	}
}

/**
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 * @param {import("../../../../../src/util/mod.js").UuidString} clientId
 */
async function sendAllClientRemoved(activeConnections, clientId) {
	const promises = [];
	for (const connection of activeConnections.values()) {
		const promise = connection.parentMessenger.send.availableClientRemoved(clientId);
		promises.push(promise);
	}
	await Promise.all(promises);
}

/**
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 * @param {InternalDiscoveryWorkerConnection} connection
 */
function sendAllProjectMetaData(activeConnections, connection) {
	for (const otherConnection of activeConnections.values()) {
		if (connection == otherConnection) continue;
		otherConnection.parentMessenger.send.projectMetaData(connection.id, connection.projectMetaData);
	}
}

/**
 * @param {MessagePort} port
 * @param {TypedMessenger<any, any>} iframeMessenger
 * @param {TypedMessenger<any, any>} parentWindowMessenger
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 */
function getResponseHandlers(port, iframeMessenger, parentWindowMessenger, activeConnections) {
	/** @type {InternalDiscoveryWorkerConnection?} */
	let createdConnection = null;

	return {
		iframeResponseHandlers: {
			/**
			 * @param {any} data
			 */
			parentWindowToWorkerMessage(data) {
				parentWindowMessenger.handleReceivedMessage(data);
			},
			async unregisterClient() {
				if (!createdConnection) return;
				activeConnections.delete(createdConnection.id);
				await sendAllClientRemoved(activeConnections, createdConnection.id);
				createdConnection = null;
			},
		},
		parentWindowResponseHandlers: {
			/**
			 * @param {import("../StudioConnectionsManager.js").ClientType} clientType
			 */
			registerClient(clientType) {
				if (createdConnection) return;

				createdConnection = new InternalDiscoveryWorkerConnection(port, clientType, iframeMessenger, parentWindowMessenger);
				activeConnections.set(createdConnection.id, createdConnection);
				sendAllClientAddedMessages(activeConnections, createdConnection);
			},
			/**
			 * @param {import("../StudioConnectionsManager.js").RemoteStudioMetaData?} metaData
			 */
			projectMetaData(metaData) {
				if (!createdConnection) return;
				createdConnection.setProjectMetaData(metaData);
				sendAllProjectMetaData(activeConnections, createdConnection);
			},
			/**
			 * @param {import("../../../../../src/mod.js").UuidString} otherClientId
			 */
			requestConnection(otherClientId) {
				if (!createdConnection) return;

				const otherConnection = activeConnections.get(otherClientId);
				if (!otherConnection) return;

				const messageChannel = new MessageChannel();
				createdConnection.parentMessenger.sendWithTransfer.connectionCreated([messageChannel.port1], otherClientId, messageChannel.port1);
				otherConnection.parentMessenger.sendWithTransfer.connectionCreated([messageChannel.port2], createdConnection.id, messageChannel.port2);
			},
		},
	};
}
/** @typedef {ReturnType<getResponseHandlers>["iframeResponseHandlers"]} InternalDiscoveryWorkerToIframeHandlers */
/** @typedef {TypedMessenger<import("./internalDiscoveryIframeMain.js").InternalDiscoveryIframeWorkerHandlers, InternalDiscoveryWorkerToIframeHandlers>} WorkerToIframeTypedMessengerType */
/** @typedef {ReturnType<getResponseHandlers>["parentWindowResponseHandlers"]} InternalDiscoveryWorkerToParentHandlers */
/** @typedef {TypedMessenger<import("../../../../../src/inspector/InternalDiscoveryManager.js").InternalDiscoveryParentWorkerHandlers, InternalDiscoveryWorkerToParentHandlers>} WorkerToParentTypedMessengerType */

/**
 * @param {typeof globalThis} workerGlobal
 */
export function initializeWorker(workerGlobal) {
	/** @type {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} */
	const activeConnections = new Map();

	workerGlobal.addEventListener("connect", event => {
		const castEvent = /** @type {MessageEvent} */ (event);
		const [port] = castEvent.ports;

		/** @type {WorkerToIframeTypedMessengerType} */
		const iframeMessenger = new TypedMessenger();
		/** @type {WorkerToParentTypedMessengerType} */
		const parentMessenger = new TypedMessenger();

		const {iframeResponseHandlers, parentWindowResponseHandlers} = getResponseHandlers(port, iframeMessenger, parentMessenger, activeConnections);

		iframeMessenger.setResponseHandlers(iframeResponseHandlers);
		iframeMessenger.setSendHandler(data => {
			port.postMessage(data.sendData, data.transfer);
		});
		port.addEventListener("message", e => {
			if (!e.data) return;

			iframeMessenger.handleReceivedMessage(e.data);
		});
		port.start();

		parentMessenger.setResponseHandlers(parentWindowResponseHandlers);
		parentMessenger.setSendHandler(data => {
			iframeMessenger.sendWithTransfer.sendToParentWindow(data.transfer, data.sendData, data.transfer);
		});
	});
}

