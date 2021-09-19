import {generateUuid} from "../../editor/src/Util/Util.js";

export default class InspectorManager {
	constructor() {
		this.uuid = generateUuid();

		this.broadcastChannel = new BroadcastChannel("editor-discovery");
		this.broadcastChannel.addEventListener("message", e => {
			if (!e.data) return;

			const {op} = e.data;
			if (op == "requestInspectorManagerInfo") {
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
			op: "inspectorManagerInfo",
			uuid: this.uuid,
		});
	}

	broadcastDisconnect() {
		this.broadcastChannel.postMessage({
			op: "inspectorManagerDisconnect",
			uuid: this.uuid,
		});
	}
}
