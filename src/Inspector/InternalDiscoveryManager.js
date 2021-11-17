import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";

export class InternalDiscoveryManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this.destructed = false;

		this.iframeLoaded = false;
		this.onIframeLoadCbs = new Set();
		this.iframe = document.createElement("iframe");
		this.iframe.src = "/editor/dist/internalDiscovery";
		this.iframe.style.display = "none";
		this.boundOnMessage = this._onIframeMessage.bind(this);
		window.addEventListener("message", this.boundOnMessage);
		document.body.appendChild(this.iframe);

		this.onMessageCbs = new Set();

		// this.internalMessagesWorker.port.postMessage({op: "registerClient", clientType: "inspector"});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	destructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this.destructed = true;
		this._sendMessageInternal("destructor");
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
		await new Promise(r => this.onIframeLoadCbs.add(r));
	}

	/**
	 * @param {string} op
	 * @param {*} data
	 * @param {boolean} waitForLoad
	 */
	async _sendMessageInternal(op, data = null, waitForLoad = true) {
		if (waitForLoad) await this._waitForIframeLoad();
		const message = {};
		message["op"] = op;
		if (data) message["data"] = data;
		this.iframe.contentWindow.postMessage(message, "*");
	}

	/**
	 * @typedef {{
	 * op: string,
	 * [x: string]: any,
	 * }} OnMessageData
	 */

	/**
	 * @param {(data: OnMessageData) => void} cb
	 */
	onMessage(cb) {
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this.onMessageCbs.add(cb);
	}

	postMessage(data) {
		if (!ENABLE_INSPECTOR_SUPPORT) return;
		this._sendMessageInternal("postWorkerMessage", data);
	}
}
