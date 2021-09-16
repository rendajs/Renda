/**
 * @typedef {Object} AvailableEditorData
 * @property {string} id
 */

/**
 * @typedef {Map<string, AvailableEditorData>} AvailableEditorDataList
 */

/**
 * @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType
 */

export default class EditorConnectionsManager {
	constructor() {
		this.currentEndpoint = null;
		this.ws = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @type {Set<function(DiscoveryServerStatusType):void>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();

		/** @type {AvailableEditorDataList} */
		this.availableEditorsList = new Map();

		this.onOpenOrErrorCbs = new Set();
		/** @type {Set<function(AvailableEditorDataList) : void>} */
		this.onAvailableEditorsChangedCbs = new Set();
	}

	destructor() {
		this.setEndpoint(null);
	}

	static getDefaultEndPoint() {
		return `ws://${window.location.hostname}:8082`;
	}

	/**
	 * @param {DiscoveryServerStatusType} status
	 */
	setDiscoveryServerStatus(status) {
		this.discoveryServerStatus = status;
		this.onDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
	}

	/**
	 * @param {function(DiscoveryServerStatusType):void} cb
	 */
	onDiscoveryServerStatusChange(cb) {
		this.onDiscoveryServerStatusChangeCbs.add(cb);
	}

	/**
	 * @param {string} endpoint
	 */
	setEndpoint(endpoint) {
		if (endpoint == this.currentEndpoint) return;
		this.currentEndpoint = endpoint;

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		if (endpoint) {
			this.setDiscoveryServerStatus("connecting");
			const ws = new WebSocket(endpoint);
			this.ws = ws;
			this.ws.addEventListener("open", () => {
				if (ws != this.ws) return;

				this.setDiscoveryServerStatus("connected");
				this.fireOpenOrError(true);
			});

			this.ws.addEventListener("message", e => {
				if (ws != this.ws) return;

				if (!e.data) return;
				const data = JSON.parse(e.data);
				const {op} = data;

				if (op == "nearbyEditorsList") {
					const {editors} = data;
					this.availableEditorsList.clear();
					for (const editor of editors) {
						this.availableEditorsList.set(editor.id, editor);
					}
					this.fireAvailableEditorsChanged();
				} else if (op == "nearbyEditorAdded") {
					const {editor} = data;
					this.availableEditorsList.set(editor.id, editor);
					this.fireAvailableEditorsChanged();
				} else if (op == "nearbyEditorRemoved") {
					const {id} = data;
					this.availableEditorsList.delete(id);
					this.fireAvailableEditorsChanged();
				}
			});

			this.ws.addEventListener("close", () => {
				this.setDiscoveryServerStatus("disconnected");
			});
		}
	}

	/**
	 * @returns {Promise<boolean>} Whether the connection was opened
	 */
	async waitForOpenOrError() {
		return await new Promise(r => this.onOpenOrErrorCbs.add(r));
	}

	/**
	 * @param {boolean} success
	 */
	fireOpenOrError(success) {
		this.onOpenOrErrorCbs.forEach(cb => cb(success));
		this.onOpenOrErrorCbs.clear();
	}

	async send(data) {
		const open = await this.waitForOpenOrError();
		if (!open) return;

		if (this.ws) {
			this.ws.send(JSON.stringify(data));
		}
	}

	/**
	 * @param {boolean} isHost
	 */
	sendSetIsHost(isHost) {
		this.send({
			op: "setIsHost",
			isHost,
		});
	}

	/**
	 * @param {function(AvailableEditorDataList) : void} cb
	 */
	onAvailableEditorsChanged(cb) {
		this.onAvailableEditorsChangedCbs.add(cb);
	}

	fireAvailableEditorsChanged() {
		this.onAvailableEditorsChangedCbs.forEach(cb => cb(this.availableEditorsList));
	}

	startConnectionToEditor(editorId) {

	}
}
