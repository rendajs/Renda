self.addEventListener("install", e => {
});
self.addEventListener("activate", e => {
});

self.addEventListener("fetch", e => {
	const url = new URL(e.request.url);
	const scopeUrl = new URL(self.registration.scope);
	if (url.pathname.startsWith(scopeUrl.pathname)) {
		const pathname = url.pathname.slice(scopeUrl.pathname.length);
		if (pathname.startsWith("projectbuilds/")) {
			e.respondWith(getProjectFileResponse(e, pathname));
		}
	}
});

async function getProjectFileResponse(e, pathname) {
	pathname = pathname.slice(14); // remove /projectbuilds/ from url string
	const slashIndex = pathname.indexOf("/");
	const clientId = pathname.slice(0, slashIndex);
	const filePath = pathname.slice(slashIndex + 1);
	const client = await clients.get(clientId);
	if (!client) {
		return new Response("Editor client not found", {status: 500});
	}
	const file = await asyncMessage(client, {
		type: "getProjectFile",
		filePath,
	});
	const headers = {};
	headers["Content-Length"] = file.size;
	return new Response(file, {
		headers,
	});
}

async function asyncMessage(client, message) {
	const channel = new MessageChannel();
	client.postMessage(message, [channel.port2]);
	return await new Promise(resolve => {
		channel.port1.addEventListener("message", e => {
			channel.port1.close();
			resolve(e.data);
		});
		channel.port1.start();
	});
}

self.addEventListener("message", e => {
	if (e.data.type == "requestClientId") {
		const clientId = e.source.id;
		if (e.ports.length > 0) {
			for (const port of e.ports) {
				port.postMessage(clientId);
			}
		}
	}
});
