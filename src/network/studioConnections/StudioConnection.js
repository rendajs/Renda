import {StorageType, binaryToObject, createObjectToBinaryOptions, objectToBinary} from "../../util/binarySerialization.js";
import {TypedMessenger} from "../../util/TypedMessenger/TypedMessenger.js";

const typedMessengerSendDataBinaryOpts = createObjectToBinaryOptions({
	structure: [
		StorageType.UNION_ARRAY,
		{
			id: StorageType.UINT16,
			type: StorageType.STRING,
			args: StorageType.ARRAY_BUFFER,
		},
		{
			id: StorageType.UINT16,
			type: StorageType.STRING,
			returnValue: StorageType.ARRAY_BUFFER,
			didThrow: StorageType.BOOL,
		},
		{
			json: StorageType.STRING,
		},
	],
	nameIds: {
		id: 1,
		type: 2,
		args: 3,
		returnValue: 4,
		didThrow: 5,
		json: 6,
	},
});

/**
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRespondHandlers
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRequestHandlers
 */
export class StudioConnection {
	#messageHandler;

	/**
	 * @param {import("./messageHandlers/MessageHandler.js").MessageHandler} messageHandler
	 * @param {import("./DiscoveryManager.js").ConnectionRequestAcceptOptions<TReliableRespondHandlers>} options
	 */
	constructor(messageHandler, options) {
		this.#messageHandler = messageHandler;

		/** @type {TypedMessenger<TReliableRespondHandlers, TReliableRequestHandlers>} */
		this.messenger = new TypedMessenger();
		this.messenger.setResponseHandlers(options.reliableResponseHandlers || /** @type {TReliableRespondHandlers} */ ({}));
		this.messenger.setSendHandler(async data => {
			if (messageHandler.supportsSerialization) {
				await messageHandler.send(data.sendData, {transfer: data.transfer});
			} else {
				const castType = /** @type {string} */ (data.sendData.type);
				/** @type {ArrayBuffer} */
				let buffer;
				if (data.sendData.direction == "request" && options.requestSerializers && options.requestSerializers[castType]) {
					const serializedArguments = await options.requestSerializers[castType](...data.sendData.args);
					buffer = objectToBinary({
						id: data.sendData.id,
						type: castType,
						args: serializedArguments,
					}, typedMessengerSendDataBinaryOpts);
				} else if (data.sendData.direction == "response" && options.responseSerializers && options.responseSerializers[castType]) {
					const serializedReturnType = await options.responseSerializers[castType](data.sendData.returnValue);
					buffer = objectToBinary({
						id: data.sendData.id,
						type: castType,
						didThrow: data.sendData.didThrow,
						returnValue: serializedReturnType,
					}, typedMessengerSendDataBinaryOpts);
				} else {
					buffer = objectToBinary({
						json: JSON.stringify(data.sendData),
					}, typedMessengerSendDataBinaryOpts);
				}
				await messageHandler.send(buffer);
			}
		});
		messageHandler.onMessage(async data => {
			/** @type {import("../../mod.js").TypedMessengerMessageSendData<any, any>} */
			let decodedData;
			if (messageHandler.supportsSerialization) {
				decodedData = /** @type {import("../../mod.js").TypedMessengerMessageSendData<any, any>} */ (data);
			} else {
				if (!(data instanceof ArrayBuffer)) {
					throw new Error("This message handler is expected to only receive ArrayBuffer messages.");
				}
				const decoded = binaryToObject(data, typedMessengerSendDataBinaryOpts);
				if ("args" in decoded) {
					if (!options.requestDeserializers || !options.requestDeserializers[decoded.type]) {
						throw new Error(`Unexpected serialized request message was received for "${decoded.type}". The message was serialized by the sender in the 'requestSerializers' object, but no deserializer was defined in the 'requestDeserializers' object.`);
					}
					const decodedArgs = await options.requestDeserializers[decoded.type](decoded.args);
					decodedData = {
						direction: "request",
						type: decoded.type,
						id: decoded.id,
						args: /** @type {any} */ (decodedArgs),
					};
				} else if ("returnValue" in decoded) {
					if (!options.responseDeserializers || !options.responseDeserializers[decoded.type]) {
						throw new Error(`Unexpected serialized response message was received for "${decoded.type}". The message was serialized by the sender in the 'responseSerializers' object, but no deserializer was defined in the 'responseDeserializers' object.`);
					}
					const decodedReturnValue = await options.responseDeserializers[decoded.type](decoded.returnValue);
					decodedData = {
						direction: "response",
						type: decoded.type,
						id: decoded.id,
						didThrow: decoded.didThrow,
						returnValue: decodedReturnValue,
					};
				} else if ("json" in decoded) {
					decodedData = JSON.parse(decoded.json);
				} else {
					throw new Error("An error occurred while deserializing the message.");
				}
			}
			const castData = /** @type {import("../../mod.js").TypedMessengerMessageSendData<TReliableRespondHandlers, TReliableRequestHandlers>} */ (decodedData);
			await this.messenger.handleReceivedMessage(castData);
		});
	}

	get otherClientUuid() {
		return this.#messageHandler.otherClientUuid;
	}

	get clientType() {
		return this.#messageHandler.clientType;
	}

	get connectionType() {
		return this.#messageHandler.connectionType;
	}

	/**
	 * True when the connection was initiated by our client (i.e. the client that holds the instance of this class in memory).
	 */
	get initiatedByMe() {
		return this.#messageHandler.initiatedByMe;
	}

	get projectMetadata() {
		return this.#messageHandler.projectMetadata;
	}

	close() {
		this.#messageHandler.close();
	}

	/**
	 * @param {import("./messageHandlers/MessageHandler.js").OnStatusChangeCallback} cb
	 */
	onStatusChange(cb) {
		this.#messageHandler.onStatusChange(cb);
	}

	get status() {
		return this.#messageHandler.status;
	}
}
