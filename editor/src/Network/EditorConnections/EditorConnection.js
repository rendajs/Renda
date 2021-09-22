import handlers from "./protocol.js";

export default class EditorConnection {
	/**
	 * @param {import("./MessageHandlers/MessageHandler.js").default} messageHandler
	 */
	constructor(messageHandler) {
		this.messageHandler = messageHandler;

		/** @type {import("./MessageHandlers/MessageHandler.js").EditorConnectionState} */
		this.connectionState = "offline";
		this.onConnectionStateChangeCbs = new Set();

		this.messageHandler.onConnectionStateChange(newState => {
			this.connectionState = newState;
			this.onConnectionStateChangeCbs.forEach(cb => cb(newState));
		});
		this.messageHandler.onMessage(data => {
			this.handleMessage(data);
		});

		this.requestIdCounter = 0;
		/** @type {Map<number, (data: *, isError: boolean) => void>} */
		this.onResponseCbs = new Map();

		/** @type {import("./protocol.js").FunctionHandler} */
		this.call = async (...args) => {
			this.sendRequest(...args);
		};
	}

	/**
	 * @param {function(import("./MessageHandlers/MessageHandler.js").EditorConnectionState) : void} cb
	 */
	onConnectionStateChange(cb) {
		this.onConnectionStateChangeCbs.add(cb);
	}

	/**
	 * @param {*} messageData
	 */
	handleMessage(messageData) {
		const {op, data} = messageData;

		if (op == "request") {
			const {id, cmd, args} = data;
			this.handleRequest(id, cmd, args);
		} else if (op == "response") {
			const {id, data: responseData, isError} = data;
			const cb = this.onResponseCbs.get(id);
			if (cb) {
				this.onResponseCbs.delete(id);
				cb(responseData, isError);
			}
		}
	}

	/**
	 * @param {number} id
	 * @param {keyof import("./protocol.js").CmdParamsMap} cmd
	 * @param {Parameters<*>} args
	 */
	async handleRequest(id, cmd, args) {
		/** @type {(...rest: *[]) => Promise} */
		let handler = async (...rest) => {};

		if (handlers.has(cmd)) {
			handler = handlers.get(cmd);
		}

		let result = null;
		let error = null;
		let didReject = false;
		try {
			result = await handler(...args);
		} catch (e) {
			error = e;
			didReject = true;
		}
		const responseData = didReject ? error : result;
		this.sendResponse(id, responseData, didReject);
	}

	/**
	 * @param {string} op
	 * @param {*} data
	 */
	send(op, data) {
		this.messageHandler.send({op, data});
	}

	/**
	 * @param {string} cmd
	 * @param {...*} args
	 */
	async sendRequest(cmd, ...args) {
		const id = this.requestIdCounter++;
		this.send("request", {id, cmd, args});
		return await this.waitForResponse(id);
	}

	/**
	 * @param {number} id
	 */
	async waitForResponse(id) {
		return await new Promise((resolve, reject) => {
			this.onResponseCbs.set(id, (data, isError) => {
				if (isError) {
					reject(data);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * @param {number} id
	 * @param {*} data
	 * @param {boolean} [isError]
	 */
	sendResponse(id, data, isError = false) {
		this.send("response", {id, data, isError});
	}
}
