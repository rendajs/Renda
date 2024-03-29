import { TypedMessenger } from "../src/util/TypedMessenger/TypedMessenger.js";

const swSelf = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

/**
 * Paths that will be fetched and cached when installing the service worker.
 * @type {string[]}
 */
const installCachePaths = [/* GENERATED_FILES_INSERTION_TAG */];

const gitCommit = /* GIT_COMMIT_INSERTION_TAG */"";

/** If we are in a development 'build', we don't want to cache anything. */
const cacheEnabled = Boolean(gitCommit);

const CLIENT_CACHE_PREFIX = "rendaStudio-static-";
const CLIENT_CACHE_KEY = CLIENT_CACHE_PREFIX + gitCommit;
async function openCache() {
	return await caches.open(CLIENT_CACHE_KEY);
}

swSelf.addEventListener("install", (e) => {
	if (cacheEnabled) {
		e.waitUntil((async () => {
			const cache = await openCache();
			await cache.addAll(installCachePaths);
		})());
	}
});
swSelf.addEventListener("activate", (e) => {
	e.waitUntil((async () => {
		// Delete old caches
		const promises = [];
		for (const key of await caches.keys()) {
			let deleteCache = false;
			if (key == "swCache") {
				deleteCache = true;
			} else if (key.startsWith(CLIENT_CACHE_PREFIX) && key != CLIENT_CACHE_KEY) {
				deleteCache = true;
			}
			if (deleteCache) {
				promises.push(caches.delete(key));
			}
		}
		await Promise.all(promises);
	})());
});

/**
 * @param {Client} client
 */
function getMessageHandlers(client) {
	return {
		registerClient() {
			updateOpenTabCount();
		},
		unregisterClient() {
			typedMessengers.delete(client.id);
			updateOpenTabCount();
		},
		requestClientId() {
			return client.id;
		},
		async skipWaiting() {
			await swSelf.skipWaiting();
		},
	};
}
/** @typedef {ReturnType<getMessageHandlers>} ServiceWorkerMessageHandlers */

/** @typedef {TypedMessenger<ServiceWorkerMessageHandlers, import("./src/misc/ServiceWorkerManager.js").ServiceWorkerManagerMessageHandlers>} TypedMessengerWithTypes */

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
	messenger.setSendHandler((data) => {
		client.postMessage(data.sendData, data.transfer);
	});
	messenger.setResponseHandlers(getMessageHandlers(client));
	typedMessengers.set(client.id, messenger);
	return messenger;
}

// Remove old typed messengers in case they something went wrong and they didn't unregister themselves.
setInterval(async () => {
	let deletedAny = false;
	for (const id of typedMessengers.keys()) {
		const client = await swSelf.clients.get(id);
		if (!client) {
			typedMessengers.delete(id);
			deletedAny = true;
		}
	}
	if (deletedAny) {
		updateOpenTabCount();
	}
}, 120_000);

function updateOpenTabCount() {
	const openTabCount = typedMessengers.size;
	for (const messenger of typedMessengers.values()) {
		messenger.send.openTabCountChanged(openTabCount);
	}
}

swSelf.addEventListener("message", (e) => {
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
		return new Response("Studio client not found", { status: 404 });
	}
	const messenger = getTypedMessenger(client);
	const projectFilesPrefix = "projectFiles/";
	if (pathname.startsWith(projectFilesPrefix)) {
		const filePath = pathname.slice(projectFilesPrefix.length);
		const file = await messenger.send.getProjectFile(filePath);
		/** @type {HeadersInit} */
		const headers = {};
		headers["Content-Length"] = String(file.size);
		return new Response(file, {
			headers,
		});
	} else if (pathname == "services.js") {
		const servicesScript = await messenger.send.getGeneratedServices();
		return new Response(servicesScript, {
			headers: {
				"content-type": "application/javascript",
			},
		});
	} else if (pathname == "getGeneratedHtml") {
		const scriptSrc = url.searchParams.get("scriptSrc") || "";
		const html = await messenger.send.getGeneratedHtml(scriptSrc);
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

swSelf.addEventListener("fetch", (e) => {
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
		} else if (cacheEnabled) {
			e.respondWith((async () => {
				const cache = await openCache();
				const cacheResponse = await cache.match(e.request);
				if (cacheResponse) return cacheResponse;

				return await fetch(e.request);
			})());
		}
	}
});
