import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";

export class DevSocketManager {
	/**
	 * @typedef RoundTripCallbackData
	 * @property {number} id
	 * @property {(...args: any[]) => void} cb
	 */

	constructor() {
		/** @type {Map<string, Set<(...args: any[]) => void>>} */
		this.listeners = new Map();
		/** @type {Set<RoundTripCallbackData>} */
		this.roundTripCbs = new Set();

		this.ws = null;
		this.connectedOnce = false;
		this.isTryingConnectMultiple = false;

		this.lastRoundtripId = 0;

		this.tryConnectionOnceInstance = new SingleInstancePromise(async () => {
			return await this.tryConnectionOnceFn();
		}, {once: false});

		this.tryConnectionMultipleInstance = new SingleInstancePromise(async () => {
			return await this.tryConnectionMultipleFn();
		}, {once: false});

		this.tryConnectionOnce();
	}

	get connected() {
		if (!this.ws) return false;
		return this.ws.readyState == WebSocket.OPEN;
	}

	async tryConnectionOnceFn() {
		const ws = new WebSocket(`ws://${globalThis.location.host}/devSocket`);
		this.ws = ws;
		this.ws.addEventListener("message", e => {
			if (this.ws != ws) return;
			this.handleMessage(e);
		});
		return await new Promise(resolve => {
			ws.addEventListener("open", e => {
				if (this.ws != ws) return;
				this.connectedOnce = true;
				resolve(true);
			});
			ws.addEventListener("close", e => {
				if (this.ws != ws) return;
				this.ws = null;
				resolve(false);
				this.handleClose();
			});
		});
	}

	async tryConnectionOnce() {
		return await this.tryConnectionOnceInstance.run();
	}

	async tryConnectionMultipleFn() {
		let attempts = 0;
		while (true) {
			attempts++;
			if (attempts > 3) return false;

			await new Promise(r => setTimeout(r, attempts * 1000));

			const success = await this.tryConnectionOnce();
			if (success) return true;
		}
	}

	async tryConnectionMultiple() {
		return await this.tryConnectionMultipleInstance.run();
	}

	/**
	 * @param {MessageEvent<any>} e
	 */
	handleMessage(e) {
		const data = JSON.parse(e.data);
		if (!data.op) return;
		if (data.op == "roundTripResponse") {
			for (const roundTripItem of this.roundTripCbs) {
				if (roundTripItem.id == data.data.roundTripId) {
					roundTripItem.cb(data.data.responseData);
					this.roundTripCbs.delete(roundTripItem);
				}
			}
		} else {
			const cbs = this.listeners.get(data.op);
			if (cbs) {
				for (const cb of cbs) {
					cb(data.data);
				}
			}
		}
	}

	handleClose() {
		if (this.connectedOnce) {
			this.tryConnectionMultiple();
		}
	}

	/**
	 * Listen for socket messages of a specific type.
	 * @param {string} type
	 * @param {(data: any) => any} cb
	 */
	addListener(type, cb) {
		let cbsList = this.listeners.get(type);
		if (!cbsList) {
			cbsList = new Set();
			this.listeners.set(type, cbsList);
		}
		cbsList.add(cb);
	}

	/**
	 * @param {string} op
	 * @param {unknown} data
	 */
	async sendRoundTripMessage(op, data) {
		if (!this.connected || !this.ws) {
			let success;
			if (this.connectedOnce) {
				success = await this.tryConnectionMultiple();
			} else {
				success = await this.tryConnectionOnce();
			}
			if (!success || !this.ws) {
				throw new Error("Failed to connect to devsocket");
			}
		}
		const roundTripId = this.lastRoundtripId++;
		this.ws.send(JSON.stringify({
			op: "roundTripRequest",
			roundTripOp: op,
			roundTripId, data,
		}));
		return await new Promise(r => {
			this.roundTripCbs.add({
				id: roundTripId,
				cb: r,
			});
		});
	}
}
