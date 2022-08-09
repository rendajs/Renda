/**
 * @typedef {Object.<string, (...args: any[]) => any>} TypedMessengerSignatures
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef TypedMessengerRequestMessage
 * @property {"request"} direction
 * @property {number} id
 * @property {TReqType} type
 * @property {Parameters<TReq[TReqType]>} args
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef {TReqType extends keyof TReq ? TypedMessengerRequestMessage<TReq, TReqType> : never} TypedMessengerRequestMessageHelper
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} [TResType = keyof TRes]
 * @typedef TypedMessengerResponseMessage
 * @property {"response"} direction
 * @property {number} id
 * @property {TResType} type
 * @property {boolean} didThrow
 * @property {ReturnType<TRes[TResType]>} returnValue
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} [TResType = keyof TRes]
 * @typedef {TResType extends keyof TRes ? TypedMessengerResponseMessage<TRes, TResType> : never} TypedMessengerResponseMessageHelper
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @typedef {TypedMessengerRequestMessageHelper<TReq> | TypedMessengerResponseMessageHelper<TRes>} TypedMessengerMessage
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @typedef {(data: TypedMessengerMessage<TReq, TRes>) => void} TypedMessengerSendHandler
 */

/**
 * Allows for easy request/response messaging between two applications, such as
 * a worker and a main thread, two workers or a messageport for example. You may
 * also be able to use this for messages that will be sent over the network.
 * Using WebSockets wor WebRTC for instance.
 * When using this, ids are automatically assigned to requests, so that the
 * receiving end can respond to a specific message.
 * This way you can send messages and wait for a response using promises.
 * If the receiving end fails to handle a message and throws an error, the error
 * will be catched and the promise will be rejected with the serialized error.
 *
 * Another helpful feature is that messages maintain type safety. Using the
 * generic parameters of the class you can specify the signatures of the
 * response handlers. That way, the arguments and return type of `send` is
 * automatically set based on the message provided in the first argument.
 *
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 */
export class TypedMessenger {
	constructor() {
		/** @private */
		this.lastRequestId = 0;

		/** @private @type {TypedMessengerSendHandler<TReq, TRes>?} */
		this.sendHandler = null;

		/** @private */
		this.requestHandlers = null;

		/** @private @type {Map<number, Set<(message: TypedMessengerResponseMessage<TReq>) => void>>} */
		this.onRequestIdMessageCbs = new Map();
	}

	/**
	 * Use this for hooking up the messenger to the worker, main thread, or messageport.
	 * The handler should pass the first argument along to however you plan on sending
	 * data. But the end goal is to have this data be passed to `handleReceivedMessage`
	 * of the other TypedMessenger.
	 * @param {TypedMessengerSendHandler<TReq, TRes>} sendHandler
	 */
	setSendHandler(sendHandler) {
		this.sendHandler = sendHandler;
	}

	/**
	 * Use this to hook up the worker, main thread, or messageport to the second
	 * TypedMessenger. The first argument should be the data that was passed as
	 * first argument in the handler from `setSendHandler.
	 * @param {TypedMessengerMessage<TRes, TReq>} data
	 */
	async handleReceivedMessage(data) {
		if (data.direction == "request") {
			if (!this.requestHandlers) {
				throw new Error("Failed to handle message, no request handlers set. Make sure to call `setRequestHandlers` before handling messages.");
			}
			if (!this.sendHandler) {
				throw new Error("Failed to handle message, no send handler set. Make sure to call `setSendHandler` before handling messages.");
			}
			const handler = this.requestHandlers[data.type];
			let returnValue;
			let didThrow = false;
			if (handler) {
				try {
					returnValue = await handler(...data.args);
				} catch (e) {
					returnValue = e;
					didThrow = true;
				}
			}

			this.sendHandler(/** @type {TypedMessengerResponseMessageHelper<TRes, typeof data.type>} */ ({
				direction: "response",
				id: data.id,
				didThrow,
				type: data.type,
				returnValue,
			}));
		} else if (data.direction == "response") {
			const cbs = this.onRequestIdMessageCbs.get(data.id);
			if (cbs) {
				for (const cb of cbs) {
					cb(data);
				}
			}
			this.onRequestIdMessageCbs.delete(data.id);
		}
	}

	/**
	 * Changes the type of a signature to allow both synchronous and asynchronous signatures.
	 * @template {(...args: any[]) => any} T
	 * @typedef {T extends (...args: infer Args) => infer ReturnType ?
	 * 	(...args: Args) => (Promise<ReturnType> | ReturnType) :
	 * 	T} PromisifyReturnValue
	 */

	/**
	 * @param {{[key in keyof TRes]: PromisifyReturnValue<TRes[key]>}} handlers
	 */
	setResponseHandlers(handlers) {
		this.requestHandlers = handlers;
	}

	/**
	 * @template {keyof TReq} T
	 * @param {T} type
	 * @param {Parameters<TReq[T]>} args
	 */
	async send(type, ...args) {
		if (!this.sendHandler) {
			throw new Error("Failed to send message, no send handler set. Make sure to call `setSendHandler` before sending messages.");
		}
		const requestId = this.lastRequestId++;

		/**
		 * @type {Promise<ReturnType<TReq[T]>>}
		 */
		const promise = new Promise((resolve, reject) => {
			this.onResponseMessage(requestId, message => {
				if (message.didThrow) {
					reject(message.returnValue);
				} else {
					resolve(message.returnValue);
				}
			});
		});

		this.sendHandler(/** @type {TypedMessengerRequestMessageHelper<TReq, T>} */ ({
			direction: "request",
			id: requestId,
			type,
			args,
		}));
		return await promise;
	}

	/**
	 * Adds a callback that fires when a response with a specific id is received.
	 * @private
	 * @param {number} requestId
	 * @param {(message: TypedMessengerResponseMessage<TReq>) => void} callback
	 */
	onResponseMessage(requestId, callback) {
		let cbs = this.onRequestIdMessageCbs.get(requestId);
		if (!cbs) {
			cbs = new Set();
			this.onRequestIdMessageCbs.set(requestId, cbs);
		}
		cbs.add(callback);
	}
}