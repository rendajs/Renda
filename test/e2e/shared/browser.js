import puppeteer from "puppeteer";
import {PUPPETEER_REVISIONS} from "puppeteer/vendor/puppeteer-core/puppeteer/revisions.js";

let mainPageUrl = "";
/**
 * @param {string} url
 */
export function setMainPageUrl(url) {
	mainPageUrl = url;
}
function getMainPageUrl() {
	if (!mainPageUrl) {
		throw new Error("Failed to get main page url, no test server address provided via args.");
	}
	return mainPageUrl;
}

globalThis.addEventListener("error", e => {
	if (e.message.includes("WebSocket protocol error: Connection reset without closing handshake")) {
		e.preventDefault();
	}
});

async function installIfNotInstalled() {
	const fetcher = puppeteer.createBrowserFetcher({
		product: "chrome",
	});
	const revision = PUPPETEER_REVISIONS.chromium;
	let revisionInfo = fetcher.revisionInfo(revision);
	if (!revisionInfo.local) {
		console.log(`Downloading chromium ${revision}...`);
		revisionInfo = await fetcher.download(revision, (current, total) => {
			if (current >= total) {
				console.log("Installing chromium...");
			}
		});
		console.log(`Downloaded and installed chromium revision ${revision}.`);
	}
	return revisionInfo.executablePath;
}

/** @type {import("puppeteer").Browser?} */
let browser = null;

/**
 * @param {object} options
 * @param {boolean} options.headless
 */
export async function launch({headless}) {
	const executablePath = await installIfNotInstalled();
	browser = await puppeteer.launch({
		headless,
		args: ["--enable-unsafe-webgpu"],
		devtools: !headless,
		executablePath,
	});
	return browser;
}

/**
 * Connects to the browser instance created by the test runner and creates a new
 * incognito page.
 */
export async function getContext(url = getMainPageUrl() + "/studio/") {
	if (!browser) {
		throw new Error("Assertion failed, browser was not launched, call `launch` first.");
	}

	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	page.on("console", async message => {
		const jsonArgs = [];
		for (const arg of message.args()) {
			jsonArgs.push(await arg.jsonValue());
		}
		console.log(...jsonArgs);
	});
	await page.goto(url);
	return {
		context,
		page,
		async disconnect() {
			await page.close();
		},
	};
}

/**
 * Opens the file at resources/basicScriptPage/page.html with the given script.
 *
 * @param {string} scriptLocation
 * @param {string} relativeTo If set, the scriptLocation is relative to this url.
 * Use `import.meta.url` to easily set a script location relative to the current file
 */
export async function openBasicScriptPage(scriptLocation, relativeTo) {
	const fullScriptLocation = new URL(scriptLocation, relativeTo);
	/** The top most directory that can be accessed from the created http server. */
	const hostedRoot = new URL("../../../", import.meta.url);
	if (!fullScriptLocation.href.startsWith(hostedRoot.href)) {
		throw new Error(`Files outside the project are not accessible from the http server. The provided script is not inside the project folder: ${fullScriptLocation.href}`);
	}
	const relativeScriptLocation = fullScriptLocation.href.slice(hostedRoot.href.length);
	const pageUrl = new URL(`${getMainPageUrl()}/test/e2e/resources/basicScriptPage/page.html`);
	pageUrl.searchParams.set("script", "/" + relativeScriptLocation);

	return await getContext(pageUrl.href);
}
