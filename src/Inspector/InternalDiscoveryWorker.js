import {generateUuid} from "../../editor/src/Util/Util.js";

/**
 * @typedef {Object} ActivePortType
 * @property {MessagePort} port
 * @property {string} clientType
 */

/** @type {Map<string, ActivePortType>} */
const activePorts = new Map();

/**
 * @param {import("../../editor/src/Util/Util.js").UuidString} createdClientId
 * @param {MessagePort} messagePort
 */
function sendAllConnectionAddedMessages(createdClientId) {
	const {port: createdPort, clientType: createdClientType} = activePorts.get(createdClientId);
	for (const [id, {port, clientType}] of activePorts) {
		if (port == createdPort) continue;

		createdPort.postMessage({
			op: "availableClientAdded",
			clientId: id,
			clientType,
		});
		port.postMessage({
			op: "availableClientAdded",
			clientId: createdClientId,
			clientType: createdClientType,
		});
	}
}

function sendAllClientRemoved(clientId) {
	for (const {port} of activePorts.values()) {
		port.postMessage({
			op: "availableClientRemoved",
			clientId,
		});
	}
}

self.addEventListener("connect", event => {
	const castEvent = /** @type {MessageEvent} */ (event);
	const [port] = castEvent.ports;

	let createdClientId = null;
	port.addEventListener("message", e => {
		if (!e.data) return;

		const {op} = e.data;

		for (const {port} of activePorts.values()) {
			port.postMessage(JSON.stringify(e.data));
		}
		if (op === "registerClient") {
			if (createdClientId) return;
			const {clientType} = e.data;
			createdClientId = generateUuid();
			activePorts.set(createdClientId, {port, clientType});

			sendAllConnectionAddedMessages(createdClientId);
		} else if (op == "unregisterClient") {
			port.postMessage(op + createdClientId);
			if (!createdClientId) return;
			activePorts.delete(createdClientId);
			sendAllClientRemoved(createdClientId);
			port.postMessage("test");
		} else if (op == "requestConnection") {
			if (!createdClientId) return;

			const {otherClientId} = e.data;
			const {port: otherPort} = activePorts.get(otherClientId);
			if (!otherPort) return;

			const messageChannel = new MessageChannel();
			port.postMessage({
				op: "connectionCreated",
				clientId: otherClientId,
				port: messageChannel.port1,
			}, [messageChannel.port1]);

			otherPort.postMessage({
				op: "connectionCreated",
				clientId: createdClientId,
				port: messageChannel.port2,
			}, [messageChannel.port2]);
		}
	});
	port.start();
});
