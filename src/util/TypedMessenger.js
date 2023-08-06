
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} TReqType
 * @template {boolean} [TRequireHandlerReturnObjects = false]
 * @typedef {Awaited<ReturnType<TReq[TReqType]>> extends infer HandlerReturn ?
 * 	TRequireHandlerReturnObjects extends true ?
 * 		HandlerReturn extends void ?
 * 			void :
 * 			HandlerReturn extends RequestHandlerReturn ?
 * 				HandlerReturn["returnValue"] :
 * 				never :
 * 		HandlerReturn :
 * never} GetReturnType
 */

/**
 * @typedef {Object<string, (...args: any[]) => any>} TypedMessengerSignatures
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef TypedMessengerRequestMessageSendData
 * @property {"request"} direction
 * @property {number} id
 * @property {TReqType} type
 * @property {Parameters<TReq[TReqType]>} args
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef TypedMessengerRequestMessage
 * @property {TypedMessengerRequestMessageSendData<TReq, TReqType>} sendData
 * @property {Transferable[]} transfer
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef {TReqType extends keyof TReq ? TypedMessengerRequestMessage<TReq, TReqType> : never} TypedMessengerRequestMessageHelper
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} [TReqType = keyof TReq]
 * @typedef {TReqType extends keyof TReq ? TypedMessengerRequestMessageSendData<TReq, TReqType> : never} TypedMessengerRequestMessageSendDataHelper
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef TypedMessengerResponseMessageSendData
 * @property {"response"} direction
 * @property {number} id
 * @property {TResType} type
 * @property {boolean} didThrow
 * @property {GetReturnType<TRes, TResType, TRequireHandlerReturnObjects>} returnValue
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef TypedMessengerResponseMessage
 * @property {TypedMessengerResponseMessageSendData<TRes, TResType, TRequireHandlerReturnObjects>} sendData
 * @property {Transferable[]} transfer
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {TResType extends keyof TRes ? TypedMessengerResponseMessage<TRes, TResType, TRequireHandlerReturnObjects> : never} TypedMessengerResponseMessageHelper
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {TResType extends keyof TRes ? TypedMessengerResponseMessageSendData<TRes, TResType, TRequireHandlerReturnObjects> : never} TypedMessengerResponseMessageSendDataHelper
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {TypedMessengerRequestMessageHelper<TReq> | TypedMessengerResponseMessageHelper<TRes, keyof TRes, TRequireHandlerReturnObjects>} TypedMessengerMessage
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {TypedMessengerRequestMessageSendDataHelper<TReq> | TypedMessengerResponseMessageSendDataHelper<TRes, keyof TRes, TRequireHandlerReturnObjects>} TypedMessengerMessageSendData
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {(data: TypedMessengerMessage<TReq, TRes, TRequireHandlerReturnObjects>) => void | Promise<void>} TypedMessengerSendHandler
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {{[x in keyof TReq]: (...args: Parameters<TReq[x]>) => Promise<GetReturnType<TReq, x, TRequireHandlerReturnObjects>>}} TypedMessengerProxy
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {boolean} TRequireHandlerReturnObjects
 * @typedef {{[x in keyof TReq]: (transfer: Transferable[], ...args: Parameters<TReq[x]>) => Promise<GetReturnType<TReq, x, TRequireHandlerReturnObjects>>}} TypedMessengerWithTransferProxy
 */

/**
 * @typedef RequestHandlerReturn
 * @property {any} returnValue
 * @property {Transferable[]} [transfer]
 */

/**
 * Utility class that helps with creating a protocol between two processes.
 * This can be used for messaging between workers, serviceworkers, iframes and even websockets.
 * Type safety is built in, so changing message signatures on one end will
 * automatically result in emitted TypeScript errors on the other end.
 *
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @template {boolean} [TRequireHandlerReturnObjects = false]
 */
export class TypedMessenger {
	/**
	 * Allows for easy request/response messaging between two applications, such as
	 * a worker and a main thread, two workers or a messageport for example. You may
	 * also be able to use this for messages that will be sent over the network.
	 * Using WebSockets or WebRTC for instance.
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
	 * ## Usage
	 * To create a TypedMessenger you should first create an object that contains
	 * all of your handlers:
	 *
	 * ```ts
	 * const myRequestHandlers = {
	 * 	foo() {
	 * 		return "result";
	 * 	},
	 * 	bar(x: number) {
	 * 		return x;
	 * 	},
	 * }
	 * ```
	 * You should do the same on the other end of your messenger. So for instance,
	 * your worker/server/messageport or whatever you want to communicate with contains
	 * a similar list of handlers.
	 *
	 * You can then create a new TypedMessenger using the two handler objects as
	 * generic parameters. The first argument is the set of request handlers of the
	 * other end, the second argument is the set of request handlers on this end.
	 *
	 * ```ts
	 * import type {workerRequestHandlers} from "./yourWorkerOrServerFile";
	 * const messenger = new TypedMessenger<typeof workerRequestHandlers, typeof myRequestHandlers>();
	 * ```
	 *
	 * Now your types are setup correctly, so when using `messenger.send` you will
	 * get autocompletion and type checking for the arguments you pass in.
	 *
	 * But you still need to connect the two messengers to each other. There are two ways
	 * to do this:
	 * - Using {@linkcode initialize}. This is the best method when you are dealing with workers.
	 * - Using {@linkcode setResponseHandlers}, {@linkcode setSendHandler} and {@linkcode handleReceivedMessage}. This is for all other situations.
	 *
	 * See these respective functions for usage examples.
	 *
	 * @param {object} options
	 * @param {TRequireHandlerReturnObjects} [options.returnTransferSupport] Whether the
	 * messenger has support for transferring objects from return values. When this is true,
	 * the return values of your handlers are expected to be different:
	 * When this is false, you can just return whatever you want from your handlers.
	 * But when this is true you should return an object with the format
	 * `{returnValue: any, transfer?: Transferable[]}`.
	 * Note that transferring objects that are passed in as arguments is always
	 * supported. You can use {@linkcode sendWithTransfer} for this. This option
	 * is only useful if you wish to transfer objects from return values.
	 * For more info see
	 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects.
	 * @param {((error: unknown) => unknown)?} [options.serializeErrorHook] This hook allows you to
	 * serialize thrown errors before transferring them to the other TypedMessenger.
	 * If you are using a worker or iframe, regular 'Error' objects are automatically serialized.
	 * But if you have extended the 'Error' object, or you are sending json to websockets, then you'll have to
	 * serialize your errors manually.
	 *
	 * ## Example
	 * This hook is called whenever an error is about to get sent to the other end, giving you a chance to transform it.
	 * For instance you could check if the error is an instance of your custom error like so:
	 *
	 * ```js
	 * const messenger = new TypedMessenger({
	 * 	serializeErrorHook(error) {
	 * 		if (error instanceof MyError) {
	 * 			return {
	 * 				type: "MyError",
	 * 				message: error.message,
	 * 			}
	 * 		}
	 * 		return error;
	 * 	},
	 * });
	 * ```
	 *
	 * Then on the receiving end:
	 * ```js
	 * const messenger = new TypedMessenger({
	 * 	deserializeErrorHook(error) {
	 * 		if (error.type == "MyError") {
	 * 			return new MyError(error.message);
	 * 		}
	 * 		return error;
	 * 	},
	 * });
	 * ```
	 * @param {((error: unknown) => unknown)?} [options.deserializeErrorHook] See {@linkcode serializeErrorHook}.
	 */
	constructor({
		returnTransferSupport = /** @type {TRequireHandlerReturnObjects} */ (false),
		serializeErrorHook = null,
		deserializeErrorHook = null,
	} = {}) {
		/** @private */
		this.returnTransferSupport = returnTransferSupport;

		/** @private */
		this.lastRequestId = 0;

		/** @private @type {TypedMessengerSendHandler<TReq, TRes, TRequireHandlerReturnObjects>?} */
		this.sendHandler = null;

		/** @private */
		this.responseHandlers = null;

		/** @private @type {Map<number, Set<(message: TypedMessengerResponseMessageSendData<TReq, keyof TReq, TRequireHandlerReturnObjects>) => void>>} */
		this.onRequestIdMessageCbs = new Map();

		/** @private */
		this.serializeErrorHook = serializeErrorHook;
		/** @private */
		this.deserializeErrorHook = deserializeErrorHook;

		const proxy = new Proxy({}, {
			get: (target, prop, receiver) => {
				if (typeof prop == "symbol") {
					return undefined;
				}
				/**
				 * @param {Parameters<TReq[string]>} args
				 */
				return async (...args) => {
					return await this._sendInternal(prop, [], ...args);
				};
			},
		});
		/**
		 * The proxy property allows you send messages to the other TypedMessenger.
		 *
		 * ## Example
		 *
		 * ```js
		 * const result = await messenger.proxy.myFunction(1, 2, 3);
		 * ```
		 * where `myFunction` is the name of one of the functions provided in {@linkcode initialize} or {@linkcode setResponseHandlers}.
		 *
		 */
		this.send = /** @type {TypedMessengerProxy<TReq, TRequireHandlerReturnObjects>} */ (proxy);

		const sendWithTransferProxy = new Proxy({}, {
			get: (target, prop, receiver) => {
				if (typeof prop == "symbol") {
					return undefined;
				}
				/**
				 * @param {[transfer: Transferable[], ...rest: Parameters<TReq[string]>]} args
				 */
				return async (...args) => {
					const [transfer, ...restArgs] = args;
					return await this._sendInternal(prop, transfer, ...restArgs);
				};
			},
		});
		/**
		 * This is the same as {@linkcode send}, but the first argument is an array
		 * that contains the objects that should be transferred.
		 * For more info see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
		 */
		this.sendWithTransfer = /** @type {TypedMessengerWithTransferProxy<TReq, TRequireHandlerReturnObjects>} */ (sendWithTransferProxy);
	}

	/**
	 * Utility function meant for replacing boilerplate code. This registers
	 * the appropriate events on the window or worker needed for communication,
	 * as well as registering response handlers.
	 *
	 * For example, on the main thread you can call
	 * ```js
	 * const worker = new Worker(...);
	 * messenger.initialize(worker, responseHandlers);
	 * ```
	 * and then inside the worker thread you can call
	 * ```js
	 * messenger.initialize(globalThis, responseHandlers);
	 * ```
	 * @param {Worker | globalThis} workerOrWorkerContext
	 * @param {ResponseHandlers} responseHandlers
	 */
	initialize(workerOrWorkerContext, responseHandlers) {
		if (workerOrWorkerContext instanceof Worker) {
			this.setSendHandler(data => {
				workerOrWorkerContext.postMessage(data.sendData, data.transfer);
			});
			workerOrWorkerContext.addEventListener("message", event => {
				this.handleReceivedMessage(event.data);
			});
		} else {
			this.setSendHandler(data => {
				workerOrWorkerContext.postMessage(data.sendData, {
					transfer: data.transfer,
				});
			});
			workerOrWorkerContext.addEventListener("message", event => {
				this.handleReceivedMessage(event.data);
			});
		}
		this.setResponseHandlers(responseHandlers);
	}

	/**
	 * Use this for hooking up the messenger to the worker, main thread, or messageport.
	 * The handler should pass the data along to however you plan on sending it.
	 * No matter how you do it, the end goal is to have this data be passed to {@linkcode handleReceivedMessage}
	 * of the other TypedMessenger.
	 *
	 * ## Usage
	 *
	 * ```ts
	 * const messenger = new TypedMessenger();
	 * messenger.setSendHandler(data => {
	 * 	worker.postMessage(data.sendData, data.transfer);
	 * });
	 * ```
	 *
	 * @param {TypedMessengerSendHandler<TReq, TRes, TRequireHandlerReturnObjects>} sendHandler
	 */
	setSendHandler(sendHandler) {
		this.sendHandler = sendHandler;
	}

	/**
	 * Use this to hook up the worker, main thread, or messageport to the second
	 * TypedMessenger. The first argument should be the data that was passed as
	 * `sendData` in the handler from {@linkcode setSendHandler}.
	 *
	 * ## Usage
	 *
	 * ```ts
	 * const messenger = new TypedMessenger();
	 * globalThis.addEventListener("message", event => {
	 * 	messenger.handleReceivedMessage(event.data);
	 * })
	 * ```
	 * @param {TypedMessengerMessageSendData<TRes, TReq, TRequireHandlerReturnObjects>} data
	 */
	async handleReceivedMessage(data) {
		if (data.direction == "request") {
			if (!this.responseHandlers) {
				throw new Error("Failed to handle message, no request handlers set. Make sure to call `setRequestHandlers` before handling messages.");
			}
			if (!this.sendHandler) {
				throw new Error("Failed to handle message, no send handler set. Make sure to call `setSendHandler` before handling messages.");
			}
			const handler = this.responseHandlers[data.type];
			let returnValue;
			/** @type {Transferable[]} */
			let transfer = [];
			let didThrow = false;
			if (handler) {
				try {
					returnValue = await handler(...data.args);
				} catch (e) {
					returnValue = e;
					if (this.serializeErrorHook) {
						returnValue = this.serializeErrorHook(returnValue);
					}
					didThrow = true;
				}
			}

			if (this.returnTransferSupport && returnValue && !didThrow) {
				const castReturn = /** @type {RequestHandlerReturn} */ (returnValue);
				transfer = castReturn.transfer || [];
				returnValue = castReturn.returnValue;
			}

			await this.sendHandler(/** @type {TypedMessengerResponseMessageHelper<TRes, typeof data.type, TRequireHandlerReturnObjects>} */ ({
				sendData: {
					direction: "response",
					id: data.id,
					didThrow,
					type: data.type,
					returnValue,
				},
				transfer,
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
	 * 	TRequireHandlerReturnObjects extends true ?
	 * 		ReturnType extends (RequestHandlerReturn | Promise<RequestHandlerReturn> | void | Promise<void>) ?
	 * 			(...args: Args) => (Promise<ReturnType> | ReturnType) :
	 * 			never :
	 *		(...args: Args) => (Promise<ReturnType> | ReturnType) :
	 * never} PromisifyReturnValue
	 */

	/**
	 * @typedef {{[key in keyof TRes]: PromisifyReturnValue<TRes[key]>}} ResponseHandlers
	 */

	/**
	 * Sets the collection of functions that the other end can call.
	 *
	 * ## Usage
	 *
	 * ```
	 * export const myHandlers = {
	 * 	foo() {
	 * 		return "value";
	 * 	},
	 * };
	 *
	 * const messenger = new TypedMessenger<typeof otherHandlers, myHandlers>();
	 * messenger.setResponseHandlers(myHandlers);
	 * ```
	 *
	 * Now whenever the other end makes a call using {@linkcode send} on its own messenger (when
	 * hooked up correctly to {@linkcode handleReceivedMessage}), your respective handler
	 * will be called and its return value will be sent back to the other end.
	 * @param {ResponseHandlers} handlers
	 */
	setResponseHandlers(handlers) {
		this.responseHandlers = handlers;
	}

	/**
	 * Sends a message to the other TypedMessenger.
	 * @private
	 * @template {keyof TReq} T
	 * @param {T} type
	 * @param {Transferable[]} transfer
	 * @param {Parameters<TReq[T]>} args
	 */
	async _sendInternal(type, transfer, ...args) {
		if (!this.sendHandler) {
			throw new Error("Failed to send message, no send handler set. Make sure to call `setSendHandler` before sending messages.");
		}
		const requestId = this.lastRequestId++;

		/**
		 * @type {Promise<GetReturnType<TReq, T, TRequireHandlerReturnObjects>>}
		 */
		const promise = new Promise((resolve, reject) => {
			this.onResponseMessage(requestId, message => {
				if (message.didThrow) {
					/** @type {unknown} */
					let rejectValue = message.returnValue;
					if (this.deserializeErrorHook) {
						rejectValue = this.deserializeErrorHook(rejectValue);
					}
					reject(rejectValue);
				} else {
					resolve(message.returnValue);
				}
			});
		});

		await this.sendHandler(/** @type {TypedMessengerRequestMessageHelper<TReq, T>} */ ({
			sendData: {
				direction: "request",
				id: requestId,
				type,
				args,
			},
			transfer,
		}));
		return await promise;
	}

	/**
	 * Adds a callback that fires when a response with a specific id is received.
	 * @private
	 * @param {number} requestId
	 * @param {(message: TypedMessengerResponseMessageSendData<TReq, keyof TReq, TRequireHandlerReturnObjects>) => void} callback
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
