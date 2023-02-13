import {TypedMessenger} from "../src/util/TypedMessenger.js";

const castSelf = /** @type {unknown} */ (self);
const swSelf = /** @type {ServiceWorkerGlobalScope} */ (castSelf);

self.addEventListener("install", e => {
});
self.addEventListener("activate", e => {
});

/**
 * @param {Client} client
 */
function getMessageHandlers(client) {
	return {
		requestClientId() {
			return client.id;
		},
	};
}
/** @typedef {ReturnType<getMessageHandlers>} ServiceWorkerMessageHandlers */

/** @typedef {TypedMessenger<import("./src/misc/ServiceWorkerManager.js").ServiceWorkerManagerMessageHandlers, ServiceWorkerMessageHandlers>} TypedMessengerWithTypes */

/** @type {Map<string, TypedMessengerWithTypes>} */
const typedMessengers = new Map();
/**
 * @param {Client} client
 */
function getTypedMessenger(client) {
	const existing = typedMessengers.get(client.id);
	if (existing) return existing;

	/** @type {TypedMessengerWithTypes} */
	const messenger = new TypedMessenger();
	messenger.setSendHandler(data => {
		client.postMessage(data.sendData, data.transfer);
	});
	messenger.setResponseHandlers(getMessageHandlers(client));
	typedMessengers.set(client.id, messenger);
	return messenger;
}

// Remove old typed messengers
setInterval(async () => {
	for (const id of typedMessengers.keys()) {
		const client = await swSelf.clients.get(id);
		if (!client) {
			typedMessengers.delete(id);
		}
	}
}, 120_000);

swSelf.addEventListener("message", e => {
	if (e.source instanceof Client) {
		const messenger = getTypedMessenger(e.source);
		messenger.handleReceivedMessage(e.data);
	}
});

/**
 * @param {string} clientId
 * @param {string} pathname
 * @param {URL} url
 */
async function getClientResponse(clientId, pathname, url) {
	const client = await swSelf.clients.get(clientId);
	if (!client) {
		return new Response("Editor client not found", {status: 404});
	}
	const messenger = getTypedMessenger(client);
	const projectFilesPrefix = "projectFiles/";
	if (pathname.startsWith(projectFilesPrefix)) {
		const filePath = pathname.slice(projectFilesPrefix.length);
		const file = await messenger.send("getProjectFile", filePath);
		/** @type {HeadersInit} */
		const headers = {};
		headers["Content-Length"] = String(file.size);
		return new Response(file, {
			headers,
		});
	} else if (pathname == "services.js") {
		const servicesScript = await messenger.send("getGeneratedServices");
		return new Response(servicesScript, {
			headers: {
				"content-type": "application/javascript",
			},
		});
	} else if (pathname == "getGeneratedHtml") {
		const scriptSrc = url.searchParams.get("scriptSrc") || "";
		const html = await messenger.send("getGeneratedHtml", scriptSrc);
		return new Response(html, {
			headers: {
				"content-type": "text/html; charset=UTF-8",
			},
		});
	}
	return new Response("Not found", {
		status: 404,
	});
}

swSelf.addEventListener("fetch", e => {
	const url = new URL(e.request.url);
	const scopeUrl = new URL(swSelf.registration.scope);
	if (url.pathname.startsWith(scopeUrl.pathname)) {
		const pathname = url.pathname.slice(scopeUrl.pathname.length);
		const swPrefix = "sw/";
		if (pathname.startsWith(swPrefix)) {
			const swPathname = pathname.slice(swPrefix.length);
			const clientsPrefix = "clients/";
			if (swPathname.startsWith(clientsPrefix)) {
				const clientsPathname = swPathname.slice(clientsPrefix.length);
				const slashIndex = clientsPathname.indexOf("/");
				const clientId = clientsPathname.slice(0, slashIndex);
				const clientPath = clientsPathname.slice(slashIndex + 1);
				e.respondWith(getClientResponse(clientId, clientPath, url));
			}
		}
	}
});
