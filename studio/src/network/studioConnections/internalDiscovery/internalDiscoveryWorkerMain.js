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
	const availableConnections = [];
	for (const activeConnection of activeConnections.values()) {
		if (activeConnection.port == createdConnection.port) continue;

		availableConnections.push(activeConnection.getConnectionData());
		activeConnection.parentMessenger.send.addAvailableConnection(createdConnection.getConnectionData());
	}
	createdConnection.parentMessenger.send.setAvailableConnections(availableConnections);
}

/**
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 * @param {import("../../../../../src/util/mod.js").UuidString} clientUuid
 */
async function sendAllClientRemoved(activeConnections, clientUuid) {
	const promises = [];
	for (const connection of activeConnections.values()) {
		const promise = connection.parentMessenger.send.removeAvailableConnection(clientUuid);
		promises.push(promise);
	}
	await Promise.all(promises);
}

/**
 * @param {Map<import("../../../../../src/mod.js").UuidString, InternalDiscoveryWorkerConnection>} activeConnections
 * @param {InternalDiscoveryWorkerConnection} connection
 */
function sendAllProjectMetadata(activeConnections, connection) {
	for (const otherConnection of activeConnections.values()) {
		if (connection == otherConnection) continue;
		otherConnection.parentMessenger.send.setConnectionProjectMetadata(connection.id, connection.projectMetadata);
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
			 * @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} clientType
			 */
			registerClient(clientType) {
				if (createdConnection) {
					throw new Error("A client has already been registered.");
				}

				createdConnection = new InternalDiscoveryWorkerConnection(port, clientType, iframeMessenger, parentWindowMessenger);
				activeConnections.set(createdConnection.id, createdConnection);
				sendAllClientAddedMessages(activeConnections, createdConnection);
				return {
					/** The uuid of the client that was just registered. */
					clientUuid: createdConnection.id,
				};
			},
			/**
			 * @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
			 */
			projectMetadata(metadata) {
				if (!createdConnection) return;
				createdConnection.setProjectMetadata(metadata);
				sendAllProjectMetadata(activeConnections, createdConnection);
			},
			/**
			 * @param {import("../../../../../src/mod.js").UuidString} otherClientUuid
			 * @param {import("../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryRequestConnectionData} [connectionData]
			 */
			requestConnection(otherClientUuid, connectionData) {
				if (!createdConnection) return;

				const otherConnection = activeConnections.get(otherClientUuid);
				if (!otherConnection) return;

				const messageChannel = new MessageChannel();
				createdConnection.parentMessenger.sendWithOptions.addActiveConnection({transfer: [messageChannel.port1]}, otherClientUuid, true, messageChannel.port1, {});
				otherConnection.parentMessenger.sendWithOptions.addActiveConnection({transfer: [messageChannel.port2]}, createdConnection.id, false, messageChannel.port2, connectionData || {});
			},
		},
	};
}
/** @typedef {ReturnType<getResponseHandlers>["iframeResponseHandlers"]} InternalDiscoveryWorkerToIframeHandlers */
/** @typedef {TypedMessenger<InternalDiscoveryWorkerToIframeHandlers, import("./internalDiscoveryIframeMain.js").InternalDiscoveryIframeWorkerHandlers>} WorkerToIframeTypedMessengerType */
/** @typedef {ReturnType<getResponseHandlers>["parentWindowResponseHandlers"]} InternalDiscoveryWorkerToParentHandlers */
/** @typedef {TypedMessenger<InternalDiscoveryWorkerToParentHandlers, import("../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryParentWorkerHandlers>} WorkerToParentTypedMessengerType */

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
			iframeMessenger.sendWithOptions.sendToParentWindow({transfer: data.transfer}, data.sendData, data.transfer);
		});
	});
}

