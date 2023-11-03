import {TypedMessenger} from "../../../util/TypedMessenger.js";
import {InternalMessageHandler} from "../messageHandlers/InternalMessageHandler.js";
import {DiscoveryMethod} from "./DiscoveryMethod.js";

/**
 * @fileoverview This DiscoveryMethod allows connecting to other clients within the same browser using a SharedWorker.
 * Source code of the discovery iframe and SharedWorker can be found at studio/src/network/studioConnections/internalDiscovery
 */

/** @typedef {ReturnType<InternalDiscoveryMethod["_getIframeRequestHandlers"]>} InternalDiscoveryParentHandlers */
/** @typedef {ReturnType<InternalDiscoveryMethod["_getWorkerResponseHandlers"]>} InternalDiscoveryParentWorkerHandlers */

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
 * In order for this to work, the other tab has to also create an InternalDiscoveryMethod and use the same discovery url.
 * This creates an iframe with a shared worker which all discovery communication passes through.
 * That way two arbitrary tabs can communicate with each other, and in supported browsers, it might even allow communication across origins.
 * See https://github.com/rendajs/Renda/issues/805 for updates on cross origin communication.
 * @extends {DiscoveryMethod<typeof InternalMessageHandler>}
 */
export class InternalDiscoveryMethod extends DiscoveryMethod {
	static type = /** @type {const} */ ("renda:internal");

	/**
	 * @param {string} discoveryUrl A url that points to the discovery iframe page of a studio instance,
	 * If two applications wish to communicate with each other, they should both use the same discovery url.
	 */
	constructor(discoveryUrl) {
		super(InternalMessageHandler);

		/** @private */
		this.destructed = false;

		window.addEventListener("message", e => {
			if (!e.data) return;
			if (e.source == this.iframe.contentWindow) {
				this.iframeMessenger.handleReceivedMessage(e.data);
			}
		});

		/** @private @type {(id: string) => void} */
		this._resolveClientUuidPromise = id => {};
		/** @private @type {Promise<string>} */
		this._clientUuidPromise = new Promise(resolve => {
			this._resolveClientUuidPromise = resolve;
		});

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
		 * The messenger between whatever page instantiated the InternalDiscoveryMethod and the iframe it created.
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
		 * The messenger between whatever page instantiated the InternalDiscoveryMethod and the shared
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
			 * @param {import("../../../mod.js").UuidString} otherClientUuid
			 * @param {boolean} initiatedByMe
			 * @param {MessagePort} port
			 * @param {InternalDiscoveryRequestConnectionData} connectionData
			 */
			addActiveConnection: (otherClientUuid, initiatedByMe, port, connectionData) => {
				this.addActiveConnection(otherClientUuid, initiatedByMe, connectionData, port);
			},
			/**
			 * @param {import("../DiscoveryManager.js").AvailableConnection[]} connections
			 */
			setAvailableConnections: connections => {
				this.setAvailableConnections(connections);
			},
			/**
			 * @param {import("../DiscoveryManager.js").AvailableConnection} connectionData
			 */
			addAvailableConnection: connectionData => {
				this.addAvailableConnection(connectionData);
			},
			/**
			 * @param {import("../../../mod.js").UuidString} clientUuid
			 */
			removeAvailableConnection: clientUuid => {
				this.removeAvailableConnection(clientUuid);
			},
			/**
			 * @param {import("../../../mod.js").UuidString} clientUuid
			 * @param {import("../DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
			 */
			setConnectionProjectMetadata: (clientUuid, metadata) => {
				this.setConnectionProjectMetadata(clientUuid, metadata);
			},
		};
	}

	/**
	 * @override
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
	 * @param {import("../DiscoveryManager.js").ClientType} clientType
	 */
	async registerClient(clientType) {
		const result = await this.workerMessenger.send.registerClient(clientType);
		this._resolveClientUuidPromise(result.clientUuid);
	}

	/**
	 * Returns the client uuid of the registered client.
	 * Other tabs can use this id to connect to the registered client.
	 */
	getClientUuid() {
		return this._clientUuidPromise;
	}

	/**
	 * @override
	 * @param {import("../../../mod.js").UuidString} otherClientUuid
	 * @param {InternalDiscoveryRequestConnectionData} [connectionData]
	 */
	async requestConnection(otherClientUuid, connectionData) {
		await this.workerMessenger.send.requestConnection(otherClientUuid, connectionData);
	}

	/**
	 * @override
	 * @param {import("../DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
	 */
	async setProjectMetadata(metadata) {
		console.log("set internal: ", metadata);
		await this.workerMessenger.send.projectMetadata(metadata);
	}
}
