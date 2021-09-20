import {generateUuid} from "../../editor/src/Util/Util.js";

export default class InspectorManager {
	constructor() {
		this.uuid = generateUuid();

		const url = new URL("./InternalDiscoveryWorker.js", import.meta.url);
		this.internalMessagesWorker = new SharedWorker(url.href, {type: "module"});
		this.internalMessagesWorker.port.addEventListener("message", e => {
			if (!e.data) return;

			const {op} = e.data;
			if (op === "connectionCreated") {
				const {clientId, port} = e.data;
				console.log("connectionCreated", clientId, port);
			}
		});
		this.internalMessagesWorker.port.start();
		this.internalMessagesWorker.port.postMessage({op: "registerClient", clientType: "inspector"});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	destructor() {
		this.internalMessagesWorker.port.postMessage({op: "unregisterClient"});
		this.internalMessagesWorker.port.close();
	}
}
