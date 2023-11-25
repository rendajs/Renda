import {TypedMessenger} from "../../../../../../../src/util/TypedMessenger/TypedMessenger.js";

/** @typedef {typeof requestHandlers} WorkerWithInitializeHandlers */

const requestHandlers = {
	/**
	 * @param {ArrayBuffer} arr
	 */
	async bar(arr) {
		const result = await messenger.sendWithOptions.foo({transfer: [arr]}, arr);
		const arr2 = result.arr;
		return {
			$respondOptions: {
				returnValue: {arr: arr2},
				transfer: [arr2],
			},
		};
	},
};

/** @type {TypedMessenger<typeof requestHandlers, import("../TypedMessenger.test.js").WorkerWithInitializeHandlers>} */
const messenger = new TypedMessenger();
messenger.initializeWorkerContext(requestHandlers);
