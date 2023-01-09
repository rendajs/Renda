import {TypedMessenger} from "../util/TypedMessenger.js";

/** @typedef {ReturnType<InternalDiscoveryManager["_getIframeRequestHandlers"]>} InternalDiscoveryParentHandlers */
/** @typedef {ReturnType<InternalDiscoveryManager["_getWorkerRequestHandlers"]>} InternalDiscoveryParentWorkerHandlers */
/**
 * @typedef AvailableClientUpdateEvent
 * @property {import("../mod.js").UuidString} clientId
 * @property {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").ClientType} [clientType]
 * @property {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData?} [projectMetaData]
 * @property {boolean} [deleted] Whether the client has become unavailable.
 */
/** @typedef {(event: AvailableClientUpdateEvent) => void} OnAvailableClientUpdateCallback */
/** @typedef {(otherClientId: import("../mod.js").UuidString, port: MessagePort) => void} OnConnectionCreatedCallback */

export class InternalDiscoveryManager {
	constructor() {
		/** @private */
		this.destructed = false;

		window.addEventListener("message", e => {
			if (e.source != this.iframe.contentWindow) return;
			if (!e.data) return;
			this.iframeMessenger.handleReceivedMessage(e.data);
		});

		/** @private */
		this.iframeLoaded = false;
		/** @private @type {Set<() => void>} */
		this.onIframeLoadCbs = new Set();
		/** @private */
		this.iframe = document.createElement("iframe");
		this.iframe.src = "/editor/internalDiscovery.html";
		this.iframe.style.display = "none";
		document.body.appendChild(this.iframe);

		/** @private @type {Set<OnConnectionCreatedCallback>} */
		this.onConnectionCreatedCbs = new Set();
		/** @private @type {Set<OnAvailableClientUpdateCallback>} */
		this.onAvailableClientUpdatedCbs = new Set();

		/** @private @type {TypedMessenger<import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryMain.js").InternalDiscoveryIframeHandlers, InternalDiscoveryParentHandlers>} */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this._getIframeRequestHandlers());
		this.iframeMessenger.setSendHandler(async data => {
			await this._waitForIframeLoad();
			if (!this.iframe.contentWindow) {
				throw new Error("Failed to send message to internal discovery: iframe is not loaded.");
			}
			this.iframe.contentWindow.postMessage(data.sendData, "*", data.transfer);
		});

		/** @private @type {TypedMessenger<import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryWorkerMain.js").InternalDiscoveryWorkerToParentHandlers, InternalDiscoveryParentWorkerHandlers>} */
		this.workerMessenger = new TypedMessenger();
		this.workerMessenger.setResponseHandlers(this._getWorkerRequestHandlers());
		this.workerMessenger.setSendHandler(data => {
			this.iframeMessenger.sendWithTransfer("postWorkerMessage", data.transfer, data.sendData, data.transfer);
		});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	/**
	 * @private
	 */
	_getIframeRequestHandlers() {
		return {
			inspectorDiscoveryLoaded: () => {
				this.iframeLoaded = true;
				this.onIframeLoadCbs.forEach(cb => cb());
				this.onIframeLoadCbs.clear();
			},
			/**
			 * @param {any} data
			 */
			workerToParentWindowMessage: data => {
				this.workerMessenger.handleReceivedMessage(data);
			},
		};
	}

	/**
	 * @private
	 */
	_getWorkerRequestHandlers() {
		return {
			/**
			 * @param {import("../mod.js").UuidString} otherClientId
			 * @param {MessagePort} port
			 */
			connectionCreated: (otherClientId, port) => {
				this.onConnectionCreatedCbs.forEach(cb => cb(otherClientId, port));
			},
			/**
			 * @param {import("../mod.js").UuidString} clientId
			 * @param {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").ClientType} clientType
			 * @param {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData?} projectMetaData
			 */
			availableClientAdded: (clientId, clientType, projectMetaData) => {
				this.onAvailableClientUpdatedCbs.forEach(cb => cb({clientId, clientType, projectMetaData}));
			},
			/**
			 * @param {import("../mod.js").UuidString} clientId
			*/
			availableClientRemoved: clientId => {
				this.onAvailableClientUpdatedCbs.forEach(cb => cb({clientId, projectMetaData: null, deleted: true}));
			},
			/**
			 * @param {import("../mod.js").UuidString} clientId
			 * @param {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData?} metaData
			*/
			projectMetaData: (clientId, metaData) => {
				this.onAvailableClientUpdatedCbs.forEach(cb => cb({clientId, projectMetaData: metaData}));
			},
		};
	}

	async destructor() {
		this.destructed = true;
		await this.iframeMessenger.send("destructor");
	}

	/**
	 * @private
	 */
	async _waitForIframeLoad() {
		if (this.iframeLoaded) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.onIframeLoadCbs.add(r));
		await promise;
	}

	/**
	 * @param {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").ClientType} clientType
	 */
	async registerClient(clientType) {
		await this.workerMessenger.send("registerClient", clientType);
	}

	/**
	 * @param {import("../mod.js").UuidString} otherClientId
	 */
	async requestConnection(otherClientId) {
		await this.workerMessenger.send("requestConnection", otherClientId);
	}

	/**
	 * @param {import("../../editor/src/network/editorConnections/EditorConnectionsManager.js").RemoteEditorMetaData} metaData
	 */
	async sendProjectMetaData(metaData) {
		await this.workerMessenger.send("projectMetaData", metaData);
	}

	/**
	 * @param {OnConnectionCreatedCallback} cb
	 */
	onConnectionCreated(cb) {
		this.onConnectionCreatedCbs.add(cb);
	}

	/**
	 * @param {OnAvailableClientUpdateCallback} cb
	 */
	onAvailableClientUpdated(cb) {
		this.onAvailableClientUpdatedCbs.add(cb);
	}
}
