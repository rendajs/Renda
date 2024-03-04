import { TimeoutError } from "../TimeoutError.js";

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {keyof TReq} TReqType
 * @typedef {Awaited<ReturnType<TReq[TReqType]>> extends infer HandlerReturn ?
 * 	HandlerReturn extends TypedMessengerRequestHandlerReturn ?
 * 		HandlerReturn["$respondOptions"] extends infer Options ?
 * 			Options extends TypedMessengerRespondOptions ?
 * 				Options extends {respond: false} ?
 * 					never :
 * 					Options extends {returnValue: any} ?
 * 						Options["returnValue"] :
 * 						void :
 * 				never :
 * 			never :
 * 		HandlerReturn :
 * 	never} GetReturnType
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
 * @typedef TypedMessengerResponseMessageSendData
 * @property {"response"} direction
 * @property {number} id
 * @property {TResType} type
 * @property {boolean} didThrow
 * @property {GetReturnType<TRes, TResType>} returnValue
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @typedef TypedMessengerResponseMessage
 * @property {TypedMessengerResponseMessageSendData<TRes, TResType>} sendData
 * @property {Transferable[]} transfer
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @typedef {TResType extends keyof TRes ? TypedMessengerResponseMessage<TRes, TResType> : never} TypedMessengerResponseMessageHelper
 */
/**
 * @template {TypedMessengerSignatures} TRes
 * @template {keyof TRes} TResType
 * @typedef {TResType extends keyof TRes ? TypedMessengerResponseMessageSendData<TRes, TResType> : never} TypedMessengerResponseMessageSendDataHelper
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @typedef {TypedMessengerRequestMessageHelper<TReq> | TypedMessengerResponseMessageHelper<TRes, keyof TRes>} TypedMessengerMessage
 */
/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @typedef {TypedMessengerRequestMessageSendDataHelper<TReq> | TypedMessengerResponseMessageSendDataHelper<TRes, keyof TRes>} TypedMessengerMessageSendData
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @template {TypedMessengerSignatures} TRes
 * @typedef {(data: TypedMessengerMessage<TReq, TRes>) => void | Promise<void>} TypedMessengerSendHandler
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @typedef {{[x in keyof TReq]: (...args: Parameters<TReq[x]>) => Promise<GetReturnType<TReq, x>>}} TypedMessengerProxy
 */

/**
 * @typedef TypedMessengerSendOptions
 * @property {Transferable[]} [transfer] An array of objects that should be transferred.
 * For this to work, the `TypedMessenger.setSendHandler()` callback should pass the `transfer` data to the correct `postMessage()` argument.
 * For more info see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects.
 * @property {number} [timeout] Timeout in milliseconds at which point the promise will reject.
 * The default is `0`, which disables the timeout completely. Meaning that the promise would stay unresolved indefinitely if the other end never responds.
 * @property {boolean} [expectResponse] Defaults to `true`, set to `false` to notify the garbage collector that the returned promise can be collected.
 * If you know in advance that the other end will not respond to the message,
 * (it might have `respond` set to `false` in its `$respondOptions` for example), the promise would keep hanging forever.
 *
 * This might result in a severe memory leak if you `await` the call in a function that allocates a lot of memory.
 * But even if you don't `await` the call, it would still result in a minor memory leak,
 * because the `TypedMessenger` still has to keep some internal state while waiting for the response.
 *
 * If you set this to `false`, the promise would still stay pending forever, but no reference to the promise is held.
 * That way the garbage collector will eventually get rid of your running code, even if you `await` it.
 */

/**
 * @template {any} [TReturn = any]
 * @typedef TypedMessengerRespondOptions
 * @property {Transferable[]} [transfer] An array of objects that should be transferred.
 * For this to work, the `TypedMessenger.setSendHandler()` callback should pass the `transfer` data to the correct `postMessage()` argument.
 * For more info see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects.
 * @property {TReturn} [returnValue] The value that should be sent to the requester.
 * @property {boolean} [respond] Defaults to true, set to false to not send any response at all.
 *
 * **Warning:** Make sure to also set `expectResponse` to `false` on the sending end to avoid memory leaks.
 * Otherwise the call from the other end would result in a promise that never resolves, but also isn't garbage collected.
 *
 * Alternatively you could set a `timeout` or `globalTimeout`, causing the promise to reject once the timeout is reached.
 * @property {() => void} [afterSendHook]
 */

/**
 * @template {any} [TReturn = any]
 * @typedef {{"$respondOptions"?: TypedMessengerRespondOptions<TReturn>}} TypedMessengerRequestHandlerReturn
 */

/**
 * @template {TypedMessengerSignatures} TReq
 * @typedef {{[x in keyof TReq]: (options: TypedMessengerSendOptions, ...args: Parameters<TReq[x]>) => Promise<GetReturnType<TReq, x>>}} TypedMessengerWithOptionsProxy
 */

/**
 * Utility class that helps with creating a protocol between two processes.
 * This can be used for messaging between workers, serviceworkers, iframes and even websockets.
 * Type safety is built in, so changing message signatures on one end will
 * automatically result in emitted TypeScript errors on the other end.
 *
 * To ensure type safety, pass the handlers to the generic parameters:
 * @example
 * ```ts
 * import type {workerRequestHandlers} from "./yourWorkerOrServerFile";
 * const myRequestHandlers = {
 * 	// ...
 * };
 * const messenger = new TypedMessenger<typeof myRequestHandlers, typeof workerRequestHandlers>();
 * ```
 * @template {TypedMessengerSignatures} TRes The handlers of this messenger.
 * @template {TypedMessengerSignatures} TReq The handlers of the other messenger.
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
	 * You can then create a new TypedMessenger using the two handler objects as generic parameters.
	 *
	 * ```ts
	 * import type {workerRequestHandlers} from "./yourWorkerOrServerFile";
	 * const messenger = new TypedMessenger<typeof myRequestHandlers, typeof workerRequestHandlers>();
	 * ```
	 *
	 * Now your types are setup correctly, so when using `messenger.send` you will
	 * get autocompletion and type checking for the arguments you pass in.
	 *
	 * ## Connecting two messengers
	 *
	 * But you still need to connect the two messengers to each other. There are two ways
	 * to do this:
	 * - Using one of the initialize functions such as {@linkcode initializeWorker}, {@linkcode initializeWorkerContext} or {@linkcode initializeWebSocket}.
	 * - Using {@linkcode setResponseHandlers}, {@linkcode setSendHandler} and {@linkcode handleReceivedMessage} for all other situations or if you want more control.
	 *
	 * See these respective functions for usage examples.
	 *
	 * ## Sending messages
	 *
	 * Once the two TypedMessengers are set up, you can send a message to the other end using `TypedMessenger.send`.
	 * For example, the following invokes the `bar` handler on the other TypedMessenger and waits for its response.
	 *
	 * ```js
	 * const result = await messenger.send.bar(1234);
	 * ```
	 *
	 * The `result` will be whatever the handler returned on the other end.
	 *
	 * Alternatively, you can use {@linkcode sendWithOptions} for extra control:
	 *
	 * ```js
	 * const result = await messenger.sendWithOptions.bar({timeout: 30_000}, 1234);
	 * ```
	 *
	 * ## Responding
	 *
	 * The handlers you provided in {@linkcode setResponseHandlers} or one of the initialze functions will automatically
	 * respond with whatever you return in them. So let's say you have the following handlers:
	 *
	 * ```js
	 * const handlers = {
	 * 	foo() {
	 * 		return true;
	 * 	}
	 * }
	 * ```
	 *
	 * when the other end invokes the `messenger.send.foo()` it will return a `Promise<true>`.
	 *
	 * However, in some cases you need more control over how responses are being sent.
	 * Let's say you'd like to transfer an `ArrayBuffer` for example.
	 * In that case you can also return an object with the `$respondOptions` property:
	 *
	 * ```js
	 * const handlers = {
	 * 	foo() {
	 * 		const buffer = new ArrayBuffer(0);
	 * 		return {
	 * 			$respondOptions: {
	 * 				returnValue: buffer,
	 * 				transfer: [buffer],
	 * 			}
	 * 		}
	 * 	}
	 * }
	 * ```
	 *
	 * In the example above, a call to `messenger.send.foo()` would return the created ArrayBuffer and also transfer it.
	 *
	 * If you want autocompletions, you can make use of the TypeScript `satisfies` operator:
	 *
	 * ```js
	 * import type {TypedMessengerRequestHandlerReturn} from "./TypedMessenger.js";
	 * const handlers = {
	 * 	foo() {
	 * 		return {
	 * 			$respondOptions: {
	 * 				returnValue: "result",
	 * 			}
	 * 		} satisfies TypedMessengerRequestHandlerReturn;
	 * 	}
	 * }
	 * ```
	 *
	 * @param {object} options
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
	 * @param {number} [options.globalTimeout] Timeout in milliseconds at which point the calls on `send` and `sendWithOptions` will reject.
	 * The default is `0`, which disables the timeout completely. Meaning that promises would stay unresolved indefinitely if the other end never responds.
	 * You can also set timeouts for individual messages using the `timeout` option of `sendWithOptions`.
	 *
	 * Note that setting a global timeout may cause errors for all messages, even if you don't expect or need a response from one of the messages.
	 * For example:
	 * ```js
	 * // In this case we are clearly requesting data from the other end,
	 * // so timeout errors are likely desired.
	 * async function getDataFromServer() {
	 * 	return await messenger.send.getMyData();
	 * }
	 *
	 * // But here we don't expect a response, so it's easy to forget that a global timeout could still cause an error here.
	 * // In this case the function is not async and neither does it return the promise from `notify()`,
	 * // resulting in an uncaught promise rejection that is very difficult to catch for the caller of `notifyServerAboutSomething()`.
	 * function notifyServerAboutSomething() {
	 * 	messenger.send.notify();
	 * }
	 * ```
	 */
	constructor({
		serializeErrorHook = null,
		deserializeErrorHook = null,
		globalTimeout = 0,
	} = {}) {
		/** @private */
		this.lastRequestId = 0;

		/** @private @type {TypedMessengerSendHandler<TReq, TRes>?} */
		this.sendHandler = null;

		/** @private */
		this.responseHandlers = null;
		/** @private @type {SendOptions} */
		this.sendOptions = {};

		/** @private @type {Map<number, Set<(message: TypedMessengerResponseMessageSendData<TReq, keyof TReq>) => void>>} */
		this.onRequestIdMessageCbs = new Map();

		/** @private */
		this.serializeErrorHook = serializeErrorHook;
		/** @private */
		this.deserializeErrorHook = deserializeErrorHook;

		/**
		 * Timeout in milliseconds at which point the calls on `send` and `sendWithOptions` will reject.
		 * Setting this to `0` disables the timeout completely. Meaning that promises would stay unresolved indefinitely if the other end never responds.
		 * Changing this value does not retroactively change timeouts of existing messages.
		 * You can also set timeouts for individual messages using the `timeout` option of `sendWithOptions`.
		 *
		 * Note that setting a global timeout may cause errors for all messages, even if you don't expect or need a response from one of the messages.
		 * For example:
		 * ```js
		 * // In this case we are clearly requesting data from the other end,
		 * // so timeout errors are likely desired.
		 * async function getDataFromServer() {
		 * 	return await messenger.send.getMyData();
		 * }
		 *
		 * // But here we don't expect a response, so it's easy to forget that a global timeout could still cause an error here.
		 * // In this case the function is not async and neither does it return the promise from `notify()`,
		 * // resulting in an uncaught promise rejection that is very difficult to catch for the caller of `notifyServerAboutSomething()`.
		 * function notifyServerAboutSomething() {
		 * 	messenger.send.notify();
		 * }
		 * ```
		 */
		this.globalTimeout = globalTimeout;

		const proxy = new Proxy({}, {
			get: (target, prop, receiver) => {
				if (typeof prop == "symbol") {
					return undefined;
				}
				/**
				 * @param {Parameters<TReq[string]>} args
				 */
				return async (...args) => {
					return await this._sendInternal({}, prop, ...args);
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
		this.send = /** @type {TypedMessengerProxy<TReq>} */ (proxy);

		const sendWithOptionsProxy = new Proxy({}, {
			get: (target, prop, receiver) => {
				if (typeof prop == "symbol") {
					return undefined;
				}
				/**
				 * @param {[options: TypedMessengerSendOptions, ...rest: Parameters<TReq[string]>]} args
				 */
				return async (...args) => {
					const [options, ...restArgs] = args;
					return await this._sendInternal(options, prop, ...restArgs);
				};
			},
		});
		/**
		 * This is the same as {@linkcode send}, but the first argument is an object with options.
		 */
		this.sendWithOptions = /** @type {TypedMessengerWithOptionsProxy<TReq>} */ (sendWithOptionsProxy);
	}

	/**
	 * Utility function for communicating with a worker thread.
	 * This registers the message event on the worker and registers the response handlers of the main thread.
	 *
	 * For example, on the main thread you can call:
	 * ```js
	 * const messenger = new TypedMessenger();
	 * const worker = new Worker(...);
	 * messenger.initializeWorker(worker, responseHandlers);
	 * ```
	 * and then inside the worker thread you can call:
	 * ```js
	 * const messenger = new TypedMessenger();
	 * messenger.initializeWorkerContext(responseHandlers);
	 * ```
	 * @param {Worker} worker
	 * @param {TRes} responseHandlers
	 */
	initializeWorker(worker, responseHandlers) {
		this.setSendHandler(data => {
			worker.postMessage(data.sendData, data.transfer);
		});
		worker.addEventListener("message", event => {
			this.handleReceivedMessage(event.data);
		});
		this.setResponseHandlers(responseHandlers);
	}

	/**
	 * Utility function for communicating with the main thread from within a worker.
	 * This registers the message event on `globalThis` and registers response handlers of the worker.
	 *
	 * For example, on the main thread you can call:
	 * ```js
	 * const messenger = new TypedMessenger();
	 * const worker = new Worker(...);
	 * messenger.initializeWorker(worker, responseHandlers);
	 * ```
	 * and then inside the worker thread you can call:
	 * ```js
	 * const messenger = new TypedMessenger();
	 * messenger.initializeWorkerContext(responseHandlers);
	 * ```
	 * @param {TRes} responseHandlers
	 */
	initializeWorkerContext(responseHandlers) {
		this.setSendHandler(data => {
			globalThis.postMessage(data.sendData, {
				transfer: data.transfer,
			});
		});
		globalThis.addEventListener("message", event => {
			this.handleReceivedMessage(event.data);
		});
		this.setResponseHandlers(responseHandlers);
	}

	/**
	 * Utility function for connecting two WebSockets.
	 * This registers the message event on `globalThis` and registers response handlers of the worker.
	 *
	 * For example, on the main thread you can call:
	 * ```js
	 * const messenger = new TypedMessenger();
	 * const socket = new WebSocket(...);
	 * messenger.initializeWebSocket(socket, responseHandlers);
	 * ```
	 *
	 * @param {WebSocket} webSocket
	 * @param {TRes} responseHandlers
	 * @param {object} [options]
	 * @param {boolean} [options.waitForOpen]
	 */
	initializeWebSocket(webSocket, responseHandlers) {
		this.setSendHandler(async data => {
			if (webSocket.readyState == WebSocket.CONNECTING) {
				/** @type {Promise<void>} */
				const promise = new Promise((resolve, reject) => {
					function onOpen() {
						resolve();
						removeListeners();
					}
					function onError() {
						reject(new Error("Failed to connect to WebSocket."));
						removeListeners();
					}
					function removeListeners() {
						webSocket.removeEventListener("open", onOpen);
						webSocket.removeEventListener("error", onError);
					}
					webSocket.addEventListener("open", onOpen);
					webSocket.addEventListener("error", onError);
				});
				await promise;
			}
			webSocket.send(JSON.stringify(data.sendData));
		});
		webSocket.addEventListener("message", async message => {
			try {
				if (typeof message.data == "string") {
					const parsed = JSON.parse(message.data);
					this.handleReceivedMessage(parsed);
				}
			} catch (e) {
				console.error("An error occurred while handling a websocket message.", message.data, e);
			}
		});
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
	 * @param {TypedMessengerSendHandler<TReq, TRes>} sendHandler
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
	 * @param {TypedMessengerMessageSendData<TRes, TReq>} data
	 */
	async handleReceivedMessage(data) {
		if (data.direction == "request") {
			if (!this.responseHandlers) {
				throw new Error("Failed to handle message, no request handlers set. Make sure to call `setResponseHandlers` before handling messages.");
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

			const castReturn = /** @type {TypedMessengerRequestHandlerReturn} */ (returnValue);
			let respondOptions;
			if (castReturn && typeof castReturn == "object" && "$respondOptions" in castReturn && castReturn.$respondOptions) {
				respondOptions = castReturn.$respondOptions;
			}
			if (!didThrow && respondOptions) {
				if (respondOptions.respond == false) {
					return;
				}
				transfer = respondOptions.transfer || [];
				returnValue = respondOptions.returnValue;
			}

			await this.sendHandler(/** @type {TypedMessengerResponseMessageHelper<TRes, typeof data.type>} */ ({
				sendData: {
					direction: "response",
					id: data.id,
					didThrow,
					type: data.type,
					returnValue,
				},
				transfer,
			}));

			if (respondOptions && respondOptions.afterSendHook) {
				respondOptions.afterSendHook();
			}
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
	 * const messenger = new TypedMessenger<myHandlers, typeof otherHandlers>();
	 * messenger.setResponseHandlers(myHandlers);
	 * ```
	 *
	 * Now whenever the other end makes a call using {@linkcode send} on its own messenger (when
	 * hooked up correctly to {@linkcode handleReceivedMessage}), your respective handler
	 * will be called and its return value will be sent back to the other end.
	 * @param {TRes} handlers
	 */
	setResponseHandlers(handlers) {
		this.responseHandlers = handlers;
	}

	/** @typedef {{[key in keyof TReq]?: TypedMessengerSendOptions}} SendOptions */
	/**
	 * This allows you to configure options for specific handlers.
	 * That way you won't have to call {@linkcode sendWithOptions} all the time.
	 *
	 * For example, let's say you know in advance that `messenger.send.foo()` will always result in a TimeoutError
	 * (it might have `respond` set to `false` in its `$respondOptions` for example).
	 * You could always call `messenger.sendWithOptions.foo({expectResponse: false})` every time you call it,
	 * but if you call `foo()` in many places, it might be easier to use `configureSendOptions()` instead:
	 *
	 * ```js
	 * messenger.configureSendOptions({
	 * 	foo: {
	 * 		expectResponse: false,
	 * 	},
	 * });
	 * ```
	 *
	 * Now you can just call `messenger.send.foo()` without providing options all the time.
	 * You can still override the behaviour by using {@linkcode sendWithOptions} in case you want to make an exception.
	 * @param {SendOptions} sendOptions
	 */
	configureSendOptions(sendOptions) {
		this.sendOptions = sendOptions;
	}

	/**
	 * Sends a message to the other TypedMessenger.
	 * @private
	 * @template {keyof TReq} T
	 * @param {TypedMessengerSendOptions} options
	 * @param {T} type
	 * @param {Parameters<TReq[T]>} args
	 */
	async _sendInternal(options, type, ...args) {
		const defaultOptions = this.sendOptions[type];
		const sendOptions = {
			...defaultOptions,
			...options,
		};
		const disableResponse = sendOptions.expectResponse == false;
		const responsePromise = (async () => {
			if (!this.sendHandler) {
				throw new Error("Failed to send message, no send handler set. Make sure to call `setSendHandler` before sending messages.");
			}
			const requestId = this.lastRequestId++;

			/**
			 * @type {Promise<GetReturnType<TReq, T>>}
			 */
			let promise;
			if (disableResponse) {
				// The type attached to the function depends on handler set on the other end,
				// so returning `Promise<void>` would actually clash with the expected return type.
				// So we'll simply return a promise that stays pending forever.
				promise = new Promise(() => {});
			} else {
				promise = new Promise((resolve, reject) => {
					this.onResponseMessage(requestId, message => {
						if (message.didThrow) {
							/** @type {unknown} */
							let rejectValue = message.returnValue;
							if (this.deserializeErrorHook) {
								rejectValue = this.deserializeErrorHook(rejectValue);
							}
							if (!rejectValue || typeof rejectValue != "object" || !("stack" in rejectValue) || !rejectValue.stack) {
								rejectValue = new Error("An unknown error occurred while handling the message.");
							}
							reject(rejectValue);
						} else {
							resolve(message.returnValue);
						}
					});
				});
			}

			await this.sendHandler(/** @type {TypedMessengerRequestMessageHelper<TReq, T>} */ ({
				sendData: {
					direction: "request",
					id: requestId,
					type,
					args,
				},
				transfer: sendOptions.transfer || [],
			}));
			return await promise;
		})();

		const timeout = sendOptions.timeout || this.globalTimeout;

		if (timeout > 0 && !disableResponse) {
			const promise = new Promise((resolve, reject) => {
				const createdTimeout = globalThis.setTimeout(() => {
					reject(new TimeoutError("TypedMessenger response timed out."));
				}, timeout);

				responsePromise.then(result => {
					resolve(result);
					globalThis.clearTimeout(createdTimeout);
				}).catch(err => {
					reject(err);
					globalThis.clearTimeout(createdTimeout);
				});
			});
			return await promise;
		} else {
			return await responsePromise;
		}
	}

	/**
	 * Adds a callback that fires when a response with a specific id is received.
	 * @private
	 * @param {number} requestId
	 * @param {(message: TypedMessengerResponseMessageSendData<TReq, keyof TReq>) => void} callback
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
