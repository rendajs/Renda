/**
 * @fileoverview This is used by the entry point for the internalDiscovery page.
 * The page is expected to be loaded in an iframe.
 */

import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

/**
 * @param {object} params
 * @param {TypedMessenger<any, any>} params.workerTypedMessenger
 * @param {TypedMessenger<any, any>} params.parentWindowTypedMessenger
 * @param {() => Promise<void>} params.destructorFunction
 */
function getHandlers({workerTypedMessenger, parentWindowTypedMessenger, destructorFunction}) {
	return {
		parentToIframeHandlers: {
			/**
			 * @param {any} data
			 * @param {Transferable[]} transfer
			 */
			postWorkerMessage(data, transfer) {
				workerTypedMessenger.sendWithTransfer.parentWindowToWorkerMessage(transfer, data);
			},
			async destructor() {
				await destructorFunction();
			},
		},
		workerToIframeHandlers: {
			/**
			 * @param {any} data
			 * @param {Transferable[]} transfer
			 */
			sendToParentWindow(data, transfer) {
				parentWindowTypedMessenger.sendWithTransfer.workerToParentWindowMessage(transfer, data);
			},
		},
	};
}
/** @typedef {ReturnType<getHandlers>["parentToIframeHandlers"]} InternalDiscoveryIframeHandlers */
/** @typedef {ReturnType<getHandlers>["workerToIframeHandlers"]} InternalDiscoveryIframeWorkerHandlers */

/**
 * @param {Window} window
 */
export function initializeIframe(window) {
	let destructed = false;
	async function destructor() {
		if (destructed) return;
		destructed = true;
		await workerTypedMessenger.send.unregisterClient();
		worker.port.close();
	}

	/** @type {TypedMessenger<InternalDiscoveryIframeWorkerHandlers, import("./internalDiscoveryWorkerMain.js").InternalDiscoveryWorkerToIframeHandlers>} */
	const workerTypedMessenger = new TypedMessenger();

	/** @type {TypedMessenger<InternalDiscoveryIframeHandlers, import("../../../../../src/inspector/InternalDiscoveryManager.js").InternalDiscoveryParentHandlers>} */
	const parentWindowTypedMessenger = new TypedMessenger();

	const {parentToIframeHandlers, workerToIframeHandlers} = getHandlers({workerTypedMessenger, parentWindowTypedMessenger, destructorFunction: destructor});

	parentWindowTypedMessenger.setResponseHandlers(parentToIframeHandlers);
	parentWindowTypedMessenger.setSendHandler(data => {
		window.parent.postMessage(data.sendData, "*", data.transfer);
	});
	window.addEventListener("message", e => {
		if (!e.data) return;
		parentWindowTypedMessenger.handleReceivedMessage(e.data);
	});

	// @rollup-plugin-resolve-url-objects
	const url = new URL("./internalDiscoveryWorkerEntryPoint.js", import.meta.url);
	const worker = new SharedWorker(url.href, {type: "module"});

	workerTypedMessenger.setResponseHandlers(workerToIframeHandlers);
	workerTypedMessenger.setSendHandler(data => {
		worker.port.postMessage(data.sendData, data.transfer);
	});
	worker.port.addEventListener("message", e => {
		if (!e.data) return;

		workerTypedMessenger.handleReceivedMessage(e.data);
	});
	worker.port.start();

	// Clean up when the page is unloaded or a destructor message is received.
	window.addEventListener("unload", () => {
		destructor();
	});

	// Notify the parent window that the page is ready.
	if (window.parent !== window) {
		parentWindowTypedMessenger.send.inspectorDiscoveryLoaded();
	}
}

