const url = new URL(location.href);
const scriptUrl = url.searchParams.get("script");
if (!scriptUrl) {
	document.body.appendChild(document.createTextNode("No script url provided"));
	throw new Error("No script url");
}

await import(scriptUrl);

export {};
