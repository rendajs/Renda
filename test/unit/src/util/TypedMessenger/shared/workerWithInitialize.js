import {TypedMessenger} from "../../../../../../src/util/TypedMessenger.js";

/** @typedef {typeof requestHandlers} WorkerWithInitializeHandlers */

const requestHandlers = {
	/**
	 * @param {ArrayBuffer} arr
	 */
	async bar(arr) {
		const result = await messenger.sendWithTransfer("foo", [arr], arr);
		const arr2 = result.arr;
		return {
			returnValue: {arr: arr2},
			transfer: [arr2],
		};
	},
};

/** @type {TypedMessenger<import("../TypedMessenger.test.js").WorkerWithInitializeHandlers, typeof requestHandlers, true>} */
const messenger = new TypedMessenger({transferSupport: true});
messenger.initialize(globalThis, requestHandlers);
