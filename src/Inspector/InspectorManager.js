import {generateUuid} from "../../editor/src/Util/Util.js";

export default class InspectorManager {
	constructor() {
		this.uuid = generateUuid();

		this.broadcastChannel = new BroadcastChannel("editor-connection-discovery");
		this.broadcastChannel.addEventListener("message", e => {
			if (!e.data) return;

			const {op} = e.data;
			if (op == "requestConnectionInfo") {
				this.broadcastMyInfo();
			} else if (op == "requestMessagePort") {
				const {requestId, receiverUuid} = e.data;
				if (receiverUuid != this.uuid) return;
				const messageChannel = new MessageChannel();
				messageChannel.port1.addEventListener("message", e => {
					console.log("message:", e.data);
				});
				this.broadcastMessagePort(messageChannel.port2, requestId);
			}
		});

		this.broadcastMyInfo();

		window.addEventListener("unload", () => {
			this.broadcastDisconnect();
		});
	}

	destructor() {
		this.broadcastChannel.close();
	}

	broadcastMyInfo() {
		this.broadcastChannel.postMessage({
			op: "connectionInfo",
			uuid: this.uuid,
			clientType: "inspector",
		});
	}

	broadcastDisconnect() {
		this.broadcastChannel.postMessage({
			op: "availableConnectionDisconnect",
			uuid: this.uuid,
		});
	}

	/**
	 * @param {MessagePort} messagePort
	 * @param {import("../../editor/src/Util/Util.js").UuidString} requestUuid
	 */
	broadcastMessagePort(messagePort, requestUuid) {
		this.broadcastChannel.postMessage({
			op: "messagePort",
			requestUuid,
			// messagePort,
		});
	}
}
