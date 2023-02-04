import {TypedMessenger} from "../util/TypedMessenger.js";

/** @typedef {ReturnType<InternalDiscoveryManager["_getIframeRequestHandlers"]>} InternalDiscoveryParentHandlers */
/** @typedef {ReturnType<InternalDiscoveryManager["_getWorkerResponseHandlers"]>} InternalDiscoveryParentWorkerHandlers */
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
	/**
	 * @param {object} options
	 * @param {string} [options.fallbackDiscoveryUrl] When the current page is inside an iframe, the discovery manager
	 * will ask the parent window for a discovery url. If the parent window is an editor, it will respond with a url.
	 * But if the current page is either not in an iframe or the parent doesn't respond, this fallback url will be used.
	 * The discovery url should point to the discovery iframe page of an editor, i.e. if two applications wish to
	 * communicate with each other, they should both use the same discovery url.
	 * @param {string} [options.forceDiscoveryUrl] When set, no attempt is made to get the discovery url from the parent
	 * window, and the forced url is used immediately instead.
	 */
	constructor({
		fallbackDiscoveryUrl = "",
		forceDiscoveryUrl = "",
	} = {}) {
		/** @private */
		this.destructed = false;

		window.addEventListener("message", e => {
			if (!e.data) return;
			if (e.source == this.iframe.contentWindow) {
				this.iframeMessenger.handleReceivedMessage(e.data);
			} else if (e.source == window.parent) {
				this.parentMessenger.handleReceivedMessage(e.data);
			}
		});

		/** @private */
		this._setIframeUrlCalled = false;
		/** @private */
		this.iframeLoaded = false;
		/** @private @type {Set<() => void>} */
		this.onIframeLoadCbs = new Set();
		/** @private */
		this.iframe = document.createElement("iframe");
		this.iframe.style.display = "none";
		document.body.appendChild(this.iframe);

		/** @private @type {Set<OnConnectionCreatedCallback>} */
		this.onConnectionCreatedCbs = new Set();
		/** @private @type {Set<OnAvailableClientUpdateCallback>} */
		this.onAvailableClientUpdatedCbs = new Set();

		/**
		 * The messenger between whatever page instantiated the InternalDiscoveryManager and the iframe it created.
		 * @private @type {TypedMessenger<import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryMain.js").InternalDiscoveryIframeHandlers, InternalDiscoveryParentHandlers>}
		 */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this._getIframeRequestHandlers());
		this.iframeMessenger.setSendHandler(async data => {
			await this._setIframeUrl(fallbackDiscoveryUrl, forceDiscoveryUrl);
			await this._waitForIframeLoad();
			if (!this.iframe.contentWindow) {
				throw new Error("Failed to send message to internal discovery: iframe is not loaded.");
			}
			this.iframe.contentWindow.postMessage(data.sendData, "*", data.transfer);
		});

		/**
		 * The messenger between whatever page instantiated the InternalDiscoveryManager and the shared
		 * worker that was created by the iframe. Messages first go through the iframe messenger which then
		 * passes messages on to the sharedworker.
		 * @private @type {TypedMessenger<import("../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryWorkerMain.js").InternalDiscoveryWorkerToParentHandlers, InternalDiscoveryParentWorkerHandlers>}
		 */
		this.workerMessenger = new TypedMessenger();
		this.workerMessenger.setResponseHandlers(this._getWorkerResponseHandlers());
		this.workerMessenger.setSendHandler(async data => {
			await this.iframeMessenger.sendWithTransfer("postWorkerMessage", data.transfer, data.sendData, data.transfer);
		});

		/**
		 * The messenger between whatever page instantiated the InternalDiscoveryManager and the potential
		 * parent window of that page. This exists to make it possible to communicate with the editor and request
		 * the url of the to be created iframe. If the page that created the InternalDiscoveryManager is not
		 * in an iframe, this messenger is useless.
		 * @private @type {TypedMessenger<import("../../editor/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers, {}>}
		 */
		this.parentMessenger = new TypedMessenger();
		this.parentMessenger.setSendHandler(data => {
			if (!this.isInIframe()) {
				throw new Error("Failed to send message to parent, the page is not embedded in an iframe");
			}
			window.parent.postMessage(data.sendData, "*", data.transfer);
		});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	/**
	 * @private
	 */
	isInIframe() {
		return window.parent != window;
	}

	/**
	 * Requests the iframe url from the parent window. If either the parent window doesn't exist
	 * or it doesn't respond, a fallback url will be used.
	 * @private
	 * @param {string} fallbackDiscoveryUrl
	 * @param {string} forceDiscoveryUrl
	 */
	async _setIframeUrl(fallbackDiscoveryUrl, forceDiscoveryUrl) {
		if (this._setIframeUrlCalled) return;
		this._setIframeUrlCalled = true;
		if (forceDiscoveryUrl) {
			this.iframe.src = forceDiscoveryUrl;
			return;
		}
		const parentPromise = (async () => {
			if (this.isInIframe()) {
				const url = await this.parentMessenger.send("requestInternalDiscoveryUrl");
				return url;
			} else {
				return "";
			}
		})();
		let timeoutId = -1;
		let timeoutResolve = /** @type {((url: string) => void)?} */ (null);
		const timeoutPromise = new Promise(resolve => {
			timeoutResolve = resolve;
			timeoutId = setTimeout(() => {
				resolve("");
			}, 1000);
		});
		let url = await Promise.race([parentPromise, timeoutPromise]);
		clearTimeout(timeoutId);
		if (timeoutResolve) timeoutResolve("");
		if (!url) {
			if (!fallbackDiscoveryUrl) {
				throw new Error("Failed to initialize InternalDiscoveryManager. Either the current page is not in an iframe, or the parent didn't respond with a discovery url in a timely manner. Make sure to set a fallback discovery url if you wish to use an inspector on pages not hosted by the editor.");
			}
			url = fallbackDiscoveryUrl;
		}
		this.iframe.src = url;
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
	_getWorkerResponseHandlers() {
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
