import editor from "../../editorInstance.js";

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
			const {id, cmd, data: requestData} = data;
			this.handleRequest(id, cmd, requestData);
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
	 * @param {string} cmd
	 * @param {*} data
	 */
	async handleRequest(id, cmd, data) {
		/** @type {(data: *) => Promise} */
		let handler = async () => {};

		if (cmd == "fileSystem.readDir") {
			handler = this.handleRequestFileSystemReadDir;
		}

		let result = null;
		let error = null;
		let didReject = false;
		try {
			result = await handler(data);
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
	 * @param {*} data
	 */
	async sendRequest(cmd, data) {
		const id = this.requestIdCounter++;
		this.send("request", {id, cmd, data});
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

	/**
	 * @param {import("../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns
	 */
	async requestFileSystemReadDir(path) {
		return await this.sendRequest("fileSystem.readDir", path);
	}

	/**
	 * @param {import("../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns
	 */
	async handleRequestFileSystemReadDir(path) {
		return await editor.projectManager.currentProjectFileSystem.readDir(path);
	}
}
