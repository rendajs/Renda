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
			}
		});

		this.broadcastMyInfo();

		window.addEventListener("beforeunload", () => {
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
			connectionType: "inspector",
		});
	}

	broadcastDisconnect() {
		this.broadcastChannel.postMessage({
			op: "availableConnectionDisconnect",
			uuid: this.uuid,
		});
	}
}
