/**
 * @fileoverview This is the entry point for the editorDiscovery page.
 * The page is expected to be loaded in an iframe.
 */

// Create the worker
// @rollup-plugin-resolve-url-objects
const url = new URL("./InternalDiscoveryWorker.js", import.meta.url);
const worker = new SharedWorker(url.href, {type: "module"});

// Handle messages from the worker.
worker.port.addEventListener("message", e => {
	if (!e.data) return;

	window.parent.postMessage({
		op: "workerMessageReceived",
		data: e.data,
	}, "*");
});
worker.port.start();

// Clean up when the page is unloaded or a destructor message is received.
let destructed = false;
function destructor() {
	if (destructed) return;
	destructed = true;
	worker.port.postMessage({op: "unregisterClient"});
	worker.port.close();
}
window.addEventListener("unload", () => {
	destructor();
});

// Handle messages from the parent window
window.addEventListener("message", e => {
	if (!e.data) return;

	const {op, data} = e.data;

	if (op == "postWorkerMessage") {
		worker.port.postMessage(data);
	} else if (op == "destructor") {
		destructor();
	}
});

// Notify the parent window that the page is ready.
if (window.parent !== window) {
	window.parent.postMessage({op: "inspectorDiscoveryLoaded"}, "*");
}
