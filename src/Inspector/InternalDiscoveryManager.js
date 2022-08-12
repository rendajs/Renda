import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";

/**
 * @typedef {{
 * 	availableClientAdded: {
 * 		clientId: import("../util/util.js").UuidString,
 * 		clientType: import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").ClientType,
 * 		projectMetaData: import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData?,
 * 	},
 * 	availableClientRemoved: {
 * 		clientId: import("../util/util.js").UuidString,
 * 	},
 * 	projectMetaData: {
 * 		clientId: import("../util/util.js").UuidString,
 * 		projectMetaData: import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData?,
 * 	},
 * 	connectionCreated: {
 * 		clientId: import("../util/util.js").UuidString,
 * 		port: MessagePort,
 * 	},
 * }} InternalDiscoveryClientMessages
 */

/** @typedef {keyof InternalDiscoveryClientMessages} InternalDiscoveryClientMessageOp */
/**
 * @template {InternalDiscoveryClientMessageOp} T
 * @typedef {T extends InternalDiscoveryClientMessageOp ?
 * 	InternalDiscoveryClientMessages[T] extends null ?
 * 		{op: T} :
 * 		{op: T} &
 * 		InternalDiscoveryClientMessages[T] :
 * never} InternalDiscoveryClientMessageHelper
 */
/** @typedef {InternalDiscoveryClientMessageHelper<InternalDiscoveryClientMessageOp>} InternalDiscoveryClientMessage */

class InternalDiscoveryManager {
	constructor() {
		this.destructed = false;

		this.iframeLoaded = false;
		/** @type {Set<() => void>} */
		this.onIframeLoadCbs = new Set();
		this.iframe = document.createElement("iframe");
		this.iframe.src = "/editor/dist/internalDiscovery";
		this.iframe.style.display = "none";
		this.boundOnMessage = this._onIframeMessage.bind(this);
		window.addEventListener("message", this.boundOnMessage);
		document.body.appendChild(this.iframe);

		/** @type {Set<(data: any) => void>} */
		this.onMessageCbs = new Set();

		// this.internalMessagesWorker.port.postMessage({op: "registerClient", clientType: "inspector"});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	destructor() {
		this.destructed = true;
		this._sendMessageInternal("destructor", null);
	}

	/**
	 * @param {MessageEvent} e
	 */
	_onIframeMessage(e) {
		if (e.source != this.iframe.contentWindow) return;
		if (!e.data) return;

		const op = e.data["op"];
		const data = e.data["data"];

		if (op == "inspectorDiscoveryLoaded") {
			this.iframeLoaded = true;
			this.onIframeLoadCbs.forEach(cb => cb());
			this.onIframeLoadCbs.clear();
		} else if (op == "workerMessageReceived") {
			this.onMessageCbs.forEach(cb => cb(data));
		}
	}

	async _waitForIframeLoad() {
		if (this.iframeLoaded) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.onIframeLoadCbs.add(r));
		await promise;
	}

	/**
	 * @template {import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscovery.js").InternalDiscoveryWindowMessageOp} T
	 * @param {T} op
	 * @param {import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscovery.js").InternalDiscoveryWindowMessages[T]} data
	 * @param {boolean} waitForLoad
	 */
	async _sendMessageInternal(op, data, waitForLoad = true) {
		if (waitForLoad) await this._waitForIframeLoad();
		const message = {op, data};
		if (!this.iframe.contentWindow) {
			throw new Error("Failed to send message to internal discovery: iframe is not loaded.");
		}
		this.iframe.contentWindow.postMessage(message, "*");
	}

	/**
	 * @param {(data: InternalDiscoveryClientMessage) => void} cb
	 */
	onMessage(cb) {
		this.onMessageCbs.add(cb);
	}

	/**
	 * @param {import("../../editor/src/network/editorConnections/internalDiscovery/InternalDiscoveryWorker.js").InternalDiscoveryWorkerMessage} data
	 */
	postMessage(data) {
		this._sendMessageInternal("postWorkerMessage", data);
	}
}

let exportedManager = null;
if (ENABLE_INSPECTOR_SUPPORT) {
	exportedManager = InternalDiscoveryManager;
}
const castManager = /** @type {typeof InternalDiscoveryManager} */ (exportedManager);

export {castManager as InternalDiscoveryManager};
