import {BinaryComposer, StorageType} from "../../../../src/mod.js";

export class EditorConnection {
	/**
	 * @param {import("./MessageHandlers/MessageHandler.js").MessageHandler} messageHandler
	 * @param {import("./ProtocolManager.js").ProtocolManager} protocolManager
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
		/** @type {Map<number, (data: unknown, isError: boolean) => void>} */
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

		/** @type {import("../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
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

		/** @type {import("../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
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

		/** @type {import("../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
		this.sendErrorBinaryOpts = {
			structure: {
				name: StorageType.STRING,
				message: StorageType.STRING,
				stack: StorageType.STRING,
			},
			nameIds: {
				name: 0,
				message: 1,
				stack: 2,
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

	/** @typedef {import("./ProtocolRequestHandlers/getRequestHandlerType.js").HandlerCommands} HandlerCommands */

	/**
	 * @template {HandlerCommands} TCommand
	 * @typedef {import("./ProtocolRequestHandlers/getRequestHandlerType.js").getRequestHandlerArgs<TCommand>} getRequestHandlerArgs
	 */

	/**
	 * @template {HandlerCommands} TCommand
	 * @typedef {import("./ProtocolRequestHandlers/getRequestHandlerType.js").getRequestHandlerReturnType<TCommand>} getRequestHandlerReturnType
	 */

	/**
	 * @template {HandlerCommands} TCommand
	 * @param {TCommand} cmd
	 * @param {unknown | ArrayBuffer} data
	 */
	async sendRequest(cmd, data) {
		const id = this.requestIdCounter++;
		/** @type {*} */
		let sendData = {id, cmd, data};
		if (!this.messageHandler.autoSerializationSupported) {
			sendData = BinaryComposer.objectToBinary(sendData, this.sendRequestBinaryOpts);
		}
		this.send("request", sendData);
		const response = await this.waitForResponse(id);
		return /** @type {getRequestHandlerReturnType<TCommand>} */ (response);
	}

	/**
	 * @param {number} id
	 */
	async waitForResponse(id) {
		/** @type {unknown} */
		const response = await new Promise((resolve, reject) => {
			this.onResponseCbs.set(id, (data, isError) => {
				if (isError) {
					reject(data);
				} else {
					resolve(data);
				}
			});
		});
		return response;
	}

	/**
	 * @returns {import("./ProtocolManager.js").RequestMetaData}
	 */
	getRequestMetaData() {
		return {
			autoSerializationSupported: this.messageHandler.autoSerializationSupported,
		};
	}

	/**
	 * @param {import("./ProtocolManager.js").SerializeCondition} serializeCondition
	 */
	getShouldSerialize(serializeCondition = "if-not-supported") {
		if (serializeCondition == "always") {
			return true;
		} else if (serializeCondition == "if-not-supported") {
			return !this.messageHandler.autoSerializationSupported;
		} else if (serializeCondition == "never") {
			return false;
		}
		return false;
	}

	/**
	 * @param {*} requestData
	 */
	async handleRequest(requestData) {
		if (!this.messageHandler.autoSerializationSupported) {
			requestData = BinaryComposer.binaryToObject(requestData, this.sendRequestBinaryOpts);
		}
		const {id, cmd, data} = requestData;

		/** @type {*} */
		let result = null;
		let error = null;
		let didReject = false;
		try {
			const commandDataAny = this.protocolManager.getRequestHandler(cmd);
			const commandData = /** @type {import("./ProtocolManager.js").ProtocolManagerRequestHandlerAny} */ (commandDataAny);
			if (!commandData) {
				throw new Error(`Unknown command: "${cmd}"`);
			}

			const handler = commandData.handleRequest;
			/** @type {unknown[]}*/
			let args = data;
			if (this.getShouldSerialize(commandData.requestSerializeCondition)) {
				const argsJsonStr = this.textDecoder.decode(data);
				args = JSON.parse(argsJsonStr);
			}
			if (commandData.prepare) {
				// The prepare function can return any type so we need to wrap it
				// in order to pass it as an argument.
				args = [args];
			}
			if (commandData.needsRequestMetaData) {
				const meta = this.getRequestMetaData();
				args.unshift(meta);
			}
			const returnResult = await handler(...args);

			if (this.getShouldSerialize(commandData.responseSerializeCondition)) {
				const jsonResponseStr = JSON.stringify(returnResult);
				result = this.textEncoder.encode(jsonResponseStr);
			} else {
				result = returnResult;
			}
		} catch (e) {
			error = e;
			didReject = true;
		}
		/** @type {{name: string, message: string, stack: string} | ArrayBuffer | null} */
		let serializedError = null;
		if (didReject) {
			if (error instanceof Error) {
				serializedError = {
					name: error.name,
					message: error.message,
					stack: error.stack ?? "",
				};
			} else if (typeof error == "string") {
				serializedError = {
					name: "Error",
					message: error,
					stack: "",
				};
			} else {
				serializedError = {
					name: "Error",
					message: JSON.stringify(error),
					stack: "",
				};
			}
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
	 * @param {boolean} isError
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
			returnData.stack = errorData.stack;
		}
		const cb = this.onResponseCbs.get(id);
		if (cb) {
			this.onResponseCbs.delete(id);
			cb(returnData, isError);
		}
	}

	/**
	 * Makes a roundtrip request to a to the connection. Arguments and the
	 * return value is either automatically serialized/deserialized by the
	 * ProtocolManager, or they are handled by registered request handlers.
	 * @template {HandlerCommands} TCommand
	 * @param {TCommand} cmd
	 * @param {getRequestHandlerArgs<TCommand>} args
	 */
	async call(cmd, ...args) {
		const commandData = this.protocolManager.getRequestHandler(cmd);
		if (!commandData) {
			throw new Error(`Unknown command: "${cmd}"`);
		}

		const meta = this.getRequestMetaData();

		/** @type {any} */
		let sendData = args;

		if (commandData.prepare) {
			/** @type {unknown[]} */
			const preSendArgs = [...args];
			if (commandData.needsRequestMetaData) {
				preSendArgs.unshift(meta);
			}
			sendData = await commandData.prepare(...preSendArgs);
		}

		if (this.getShouldSerialize(commandData.requestSerializeCondition)) {
			const jsonStr = JSON.stringify(sendData);
			sendData = this.textEncoder.encode(jsonStr);
		}

		const responseData = await this.sendRequest(cmd, sendData);

		let returnData = responseData;
		if (!this.messageHandler.autoSerializationSupported) {
			const responseBuffer = /** @type {ArrayBuffer} */ (responseData);
			if (commandData.handleResponse) {
				/** @type {unknown[]} */
				const args = [responseBuffer];
				if (commandData.needsRequestMetaData) {
					args.unshift(meta);
				}
				returnData = commandData.handleResponse(...args);
			} else {
				const returnDataJsonStr = this.textDecoder.decode(responseBuffer);
				returnData = JSON.parse(returnDataJsonStr);
			}
		}
		return returnData;
	}
}
