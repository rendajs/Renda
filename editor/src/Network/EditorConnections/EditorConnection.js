import {BinaryComposer, StorageType} from "../../../../src/index.js";

export default class EditorConnection {
	/**
	 * @param {import("./MessageHandlers/MessageHandler.js").default} messageHandler
	 * @param {import("./ProtocolManager.js").default} protocolManager
	 */
	constructor(messageHandler, protocolManager) {
		this.messageHandler = messageHandler;
		this.protocolManager = protocolManager;

		this.textEncoder = new TextEncoder();
		this.textDecoder = new TextDecoder();

		this.messageHandler.onMessage(data => {
			this.handleMessage(data);
		});

		this.requestIdCounter = 0;
		/** @type {Map<number, (data: *, isError: boolean) => void>} */
		this.onResponseCbs = new Map();

		this.sendBinaryOpts = {
			structure: {
				op: StorageType.STRING,
				data: StorageType.ARRAY_BUFFER,
			},
			nameIds: {
				op: 0,
				data: 1,
			},
		};

		/** @type {import("../../../../src/Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
		this.sendRequestBinaryOpts = {
			structure: {
				id: StorageType.UINT32,
				cmd: StorageType.STRING,
				data: StorageType.ARRAY_BUFFER,
			},
			nameIds: {
				id: 0,
				cmd: 1,
				data: 2,
			},
		};

		/** @type {import("../../../../src/Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
		this.sendResponseBinaryOpts = {
			structure: {
				id: StorageType.UINT32,
				data: StorageType.ARRAY_BUFFER,
				isError: StorageType.BOOL,
			},
			nameIds: {
				id: 0,
				data: 1,
				isError: 2,
			},
		};

		/** @type {import("../../../../src/Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
		this.sendErrorBinaryOpts = {
			structure: {
				name: StorageType.STRING,
				message: StorageType.STRING,
			},
			nameIds: {
				name: 0,
				message: 1,
			},
		};
	}

	/**
	 * @param {function(import("./MessageHandlers/MessageHandler.js").EditorConnectionState) : void} cb
	 */
	onConnectionStateChange(cb) {
		this.messageHandler.onConnectionStateChange(cb);
	}

	get connectionState() {
		return this.messageHandler.connectionState;
	}

	/**
	 * @param {*} messageData
	 */
	handleMessage(messageData) {
		if (!this.messageHandler.autoSerializationSupported) {
			messageData = BinaryComposer.binaryToObject(messageData, this.sendBinaryOpts);
		}
		const {op, data} = messageData;

		if (op == "request") {
			this.handleRequest(data);
		} else if (op == "response") {
			this.handleResponse(data);
		}
	}

	/**
	 * @param {string} op
	 * @param {* | ArrayBuffer} data
	 */
	send(op, data) {
		/** @type {*} */
		let sendData = {op, data};
		if (!this.messageHandler.autoSerializationSupported) {
			sendData = BinaryComposer.objectToBinary(sendData, this.sendBinaryOpts);
		}
		this.messageHandler.send(sendData);
	}

	/**
	 * @param {string} cmd
	 * @param {* | ArrayBuffer} data
	 */
	async sendRequest(cmd, data) {
		const id = this.requestIdCounter++;
		/** @type {*} */
		let sendData = {id, cmd, data};
		if (!this.messageHandler.autoSerializationSupported) {
			sendData = BinaryComposer.objectToBinary(sendData, this.sendRequestBinaryOpts);
		}
		this.send("request", sendData);
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
	 * @param {*} requestData
	 */
	async handleRequest(requestData) {
		if (!this.messageHandler.autoSerializationSupported) {
			requestData = BinaryComposer.binaryToObject(requestData, this.sendRequestBinaryOpts);
		}
		const {id, cmd, data} = requestData;

		/** @type {ArrayBuffer} */
		let result = null;
		let error = null;
		let didReject = false;
		try {
			const commandData = this.protocolManager.getRequestHandler(cmd);
			if (!commandData) {
				throw new Error(`Unknown command: "${cmd}"`);
			}

			const handler = commandData.handleRequest;
			/** @type {*[]}*/
			let args = data;
			if (!this.messageHandler.autoSerializationSupported) {
				const argsJsonStr = this.textDecoder.decode(data);
				args = JSON.parse(argsJsonStr);
			}
			if (commandData.needsRequestMetaData) {
				/** @type {import("./ProtocolManager.js").RequestMetaData} */
				const meta = {
					autoSerializationSupported: this.messageHandler.autoSerializationSupported,
				};
				args.unshift(meta);
			}
			const returnResult = await handler(...args);

			let serializeResult = true;
			const serializeCondition = commandData.responseSerializeCondition || "if-not-supported";
			if (serializeCondition == "always") {
				serializeResult = true;
			} else if (serializeCondition == "if-not-supported") {
				serializeResult = !this.messageHandler.autoSerializationSupported;
			} else if (serializeCondition == "never") {
				serializeResult = false;
			}
			if (serializeResult) {
				const jsonResponseStr = JSON.stringify(returnResult);
				result = this.textEncoder.encode(jsonResponseStr);
			} else {
				result = returnResult;
			}
		} catch (e) {
			error = e;
			didReject = true;
		}
		let serializedError = null;
		if (didReject) {
			serializedError = {
				name: error.name,
				message: error.message,
			};
			if (!this.messageHandler.autoSerializationSupported) {
				serializedError = BinaryComposer.objectToBinary(serializedError, this.sendErrorBinaryOpts);
			}
		}
		const responseData = didReject ? serializedError : result;
		this.sendResponse(id, responseData, didReject);
	}

	/**
	 * @param {number} id
	 * @param {*} data
	 * @param {boolean} [isError]
	 */
	sendResponse(id, data, isError = false) {
		/** @type {*} */
		let sendData = {id, data, isError};
		if (!this.messageHandler.autoSerializationSupported) {
			sendData = BinaryComposer.objectToBinary(sendData, this.sendResponseBinaryOpts);
		}
		this.send("response", sendData);
	}

	/**
	 * @param {*} responseData
	 */
	handleResponse(responseData) {
		if (!this.messageHandler.autoSerializationSupported) {
			responseData = BinaryComposer.binaryToObject(responseData, this.sendResponseBinaryOpts);
		}
		const {id, data, isError} = responseData;
		let returnData = data;
		if (isError) {
			let errorData = data;
			if (!this.messageHandler.autoSerializationSupported) {
				errorData = BinaryComposer.binaryToObject(data, this.sendErrorBinaryOpts);
			}
			returnData = new Error(errorData.message);
			returnData.name = errorData.name;
		}
		const cb = this.onResponseCbs.get(id);
		if (cb) {
			this.onResponseCbs.delete(id);
			cb(returnData, isError);
		}
	}

	async call(cmd, ...args) {
		const commandData = this.protocolManager.getRequestHandler(cmd);
		if (!commandData) {
			throw new Error(`Unknown command: "${cmd}"`);
		}

		// todo:
		// if (commandData.preSend) {
		// 	const preSendArgs = [];
		// 	if (commandData.needsRequestMetaData) {
		// 		preSendArgs.push({});
		// 	}
		// 	preSendArgs.push(...args);
		// 	commandData.preSend(...preSendArgs);
		// }

		let sendData;
		if (this.messageHandler.autoSerializationSupported) {
			sendData = [...args];
		} else {
			const jsonStr = JSON.stringify(args);
			sendData = this.textEncoder.encode(jsonStr);
		}
		const responseData = await this.sendRequest(cmd, sendData);

		let returnData = responseData;
		if (!this.messageHandler.autoSerializationSupported) {
			if (commandData.handleResponse) {
				/** @type {import("./ProtocolManager.js").RequestMetaData} */
				const meta = {
					autoSerializationSupported: this.messageHandler.autoSerializationSupported,
				};
				returnData = commandData.handleResponse(meta, responseData);
			} else {
				const returnDataJsonStr = this.textDecoder.decode(responseData);
				if (returnDataJsonStr) {
					returnData = JSON.parse(returnDataJsonStr);
				} else {
					returnData = null;
				}
			}
		}
		return returnData;
	}
}
