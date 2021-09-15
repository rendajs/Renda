export default class EditorConnectionsManager {
	constructor() {
		this.currentEndpoint = null;
		this.ws = null;

		this.onOpenOrErrorCbs = new Set();
	}

	destructor() {
		this.setEndpoint(null);
	}

	static getDefaultEndPoint() {
		return `ws://${window.location.hostname}:8082`;
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
			const ws = new WebSocket(endpoint);
			this.ws = ws;
			this.ws.addEventListener("open", () => {
				if (ws != this.ws) return;

				this.fireOpenOrError(true);
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
}
