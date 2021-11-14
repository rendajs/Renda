import {generateUuid} from "../../editor/src/Util/Util.js";
import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";

export default class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this.uuid = generateUuid();

		// @rollup-plugin-resolve-url-objects
		/* #if _IS_CLOSURE_BUILD
		const url = new URL("./InternalDiscoveryWorker.js");
		//#else */
		const url = new URL("./InternalDiscoveryWorker.js", import.meta.url);
		// #endif
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
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this.internalMessagesWorker.port.postMessage({op: "unregisterClient"});
		this.internalMessagesWorker.port.close();
	}
}
