import {TypedMessenger} from "../../../util/TypedMessenger.js";
import {MessageHandlerInternal} from "../messageHandlers/MessageHandlerInternal.js";
import {DiscoveryManager} from "./DiscoveryManager.js";

/**
 * @fileoverview This DiscoveryManager allows connecting to other clients within the same browser using a SharedWorker.
 * Source code of the discovery server can be found at studio/src/network/studioConnections/internalDiscovery
 */

/** @typedef {ReturnType<DiscoveryManagerInternal["_getIframeRequestHandlers"]>} InternalDiscoveryParentHandlers */
/** @typedef {ReturnType<DiscoveryManagerInternal["_getWorkerResponseHandlers"]>} InternalDiscoveryParentWorkerHandlers */

/**
 * Custom data that can be send when initiating a new connection with another client.
 * The other client can use this data to choose to accept or deny a new connection.
 * @typedef InternalDiscoveryRequestConnectionData
 * @property {string} [token] This token is used to verify if this client is allowed to connect to a studio instance.
 * New connections are usually ignored depending on their origin and whether a studio instance is allowing certain kinds of connections.
 * But a token is generated for each application opened by a build view.
 * When a correct token is provided, the connection is accepted regardless of any origin allow lists or preferences.
 */

/**
 * This class allows you to discover other tabs within the same browser instance and open connections with them, this even works while offline.
 * In order for this to work, the other tab has to also create an InternalDiscoveryManager and use the same discovery url.
 * This creates an iframe with a shared worker which all discovery communication passes through.
 * That way two arbitrary tabs can communicate with each other, and in supported browsers, it might even allow communication across origins.
 * @extends {DiscoveryManager<MessageHandlerInternal>}
 */
export class DiscoveryManagerInternal extends DiscoveryManager {
	static type = /** @type {const} */ ("renda:internal");

	/**
	 * @param {string} discoveryUrl A url that points to the discovery iframe page of a studio instance,
	 * i.e. if two applications wish to communicate with each other, they should both use the same discovery url.
	 */
	constructor(discoveryUrl) {
		super();

		/** @private */
		this.destructed = false;

		window.addEventListener("message", e => {
			if (!e.data) return;
			if (e.source == this.iframe.contentWindow) {
				this.iframeMessenger.handleReceivedMessage(e.data);
			}
		});

		/** @private @type {((id: string) => void) | null} */
		this._clientIdResolve = null;
		/** @private @type {Promise<string>} */
		this._clientIdPromise = new Promise(resolve => {
			this._clientIdResolve = resolve;
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
		this.iframe.src = discoveryUrl;
		document.body.appendChild(this.iframe);

		/**
		 * The messenger between whatever page instantiated the InternalDiscoveryManager and the iframe it created.
		 * @private @type {TypedMessenger<InternalDiscoveryParentHandlers, import("../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryIframeMain.js").InternalDiscoveryIframeHandlers>}
		 */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this._getIframeRequestHandlers());
		this.iframeMessenger.setSendHandler(async data => {
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
		 * @private @type {TypedMessenger<InternalDiscoveryParentWorkerHandlers, import("../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryWorkerMain.js").InternalDiscoveryWorkerToParentHandlers>}
		 */
		this.workerMessenger = new TypedMessenger();
		this.workerMessenger.setResponseHandlers(this._getWorkerResponseHandlers());
		this.workerMessenger.setSendHandler(async data => {
			await this.iframeMessenger.sendWithOptions.postWorkerMessage({transfer: data.transfer}, data.sendData, data.transfer);
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
	_getWorkerResponseHandlers() {
		return {
			/**
			 * @param {import("../../../mod.js").UuidString} otherClientId
			 * @param {MessagePort} port
			 * @param {InternalDiscoveryRequestConnectionData} connectionData
			 */
			connectionCreated: (otherClientId, port, connectionData) => {
				const connection = new MessageHandlerInternal(otherClientId, connectionData);
				connection.assignMessagePort(port);
				this.addActiveConnection(otherClientId, connection);
			},
			/**
			 * @param {import("./DiscoveryManager.js").AvailableStudioData} connectionData
			 */
			availableClientAdded: connectionData => {
				this.addAvailableConnection(connectionData);
			},
			/**
			 * @param {import("../../../mod.js").UuidString} clientId
			 */
			availableClientRemoved: clientId => {
				this.removeAvailableConnection(clientId);
			},
			/**
			 * @param {import("../../../mod.js").UuidString} clientId
			 * @param {import("./DiscoveryManager.js").RemoteStudioMetaData?} metaData
			 */
			projectMetaData: (clientId, metaData) => {
				this.setConnectionProjectMetaData(clientId, metaData);
			},
		};
	}

	/**
	 * Destroys the InternalDiscoverManager and lets the shared worker know
	 * that this client is no longer available.
	 */
	async destructor() {
		this.destructed = true;
		await this.iframeMessenger.send.destructor();
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
	 * @override
	 * @param {import("../StudioConnectionsManager.js").ClientType} clientType
	 */
	async registerClient(clientType) {
		const result = await this.workerMessenger.send.registerClient(clientType);
		if (this._clientIdResolve) this._clientIdResolve(result.clientId);
	}

	/**
	 * Returns the client id of the registered client.
	 * Other tabs can use this id to connect to the registered client.
	 */
	getClientId() {
		return this._clientIdPromise;
	}

	/**
	 * @override
	 * @param {import("../../../mod.js").UuidString} otherClientId
	 * @param {InternalDiscoveryRequestConnectionData} [connectionData]
	 */
	async requestConnection(otherClientId, connectionData) {
		await this.workerMessenger.send.requestConnection(otherClientId, connectionData);
	}

	/**
	 * @override
	 * @param {import("./DiscoveryManager.js").RemoteStudioMetaData?} metaData
	 */
	async setProjectMetaData(metaData) {
		await this.workerMessenger.send.projectMetaData(metaData);
	}
}
