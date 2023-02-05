import puppeteer from "puppeteer";
import {PUPPETEER_REVISIONS} from "puppeteer/vendor/puppeteer-core/puppeteer/revisions.js";

export const SEPARATE_BROWSER_PROCESSES_ARG = "--separate-browser-processes";
export const PUPPETEER_WS_ENDPOINT_ARG = "--puppeteer-ws-endpoint=";
export const PUPPETEER_NO_HEADLESS_ARG = "--no-headless";

function getMainPageUrl() {
	const prefix = "--test-server-addr=";
	for (const arg of Deno.args) {
		if (arg.startsWith(prefix)) {
			return arg.substring(prefix.length);
		}
	}
	throw new Error("Failed to get main page url, no test server address provided via args.");
}

/**
 * A collection of sanitizer options for tests that are using puppeteer.
 * Use this of setting sanitizer options yourself so that they can easily be
 * modified globally in the future. This is in case new sanitizers are added
 * to Deno. Or if a way is added to easily find out where async ops are being
 * leaked.
 */
export const puppeteerSanitizers = {
	sanitizeOps: false,
	sanitizeExit: false,
	sanitizeResources: false,
};

globalThis.addEventListener("error", e => {
	if (e.message.includes("WebSocket protocol error: Connection reset without closing handshake")) {
		e.preventDefault();
	}
});

export async function installIfNotInstalled() {
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

/**
 * @param {object} options
 * @param {boolean} options.headless
 * @param {string} options.executablePath
 */
export async function launch({headless, executablePath}) {
	return await puppeteer.launch({
		headless,
		args: ["--enable-unsafe-webgpu"],
		devtools: !headless,
		executablePath,
	});
}

/**
 * Connects to the browser instance created by the test runner and creates a new
 * incognito page.
 */
export async function getContext(url = getMainPageUrl() + "/editor/") {
	let wsEndpoint = null;
	for (const arg of Deno.args) {
		if (arg.startsWith(PUPPETEER_WS_ENDPOINT_ARG)) {
			wsEndpoint = arg.slice(PUPPETEER_WS_ENDPOINT_ARG.length);
		}
	}
	const separateProcesses = Deno.args.includes(SEPARATE_BROWSER_PROCESSES_ARG);
	let browser;
	if (separateProcesses) {
		const executablePath = await installIfNotInstalled();
		const headless = !Deno.args.includes(PUPPETEER_NO_HEADLESS_ARG);
		browser = await launch({headless, executablePath});
	} else {
		if (!wsEndpoint) {
			throw new Error(`Failed to connect to browser, no ws endpoint provided. Either provide one using '${PUPPETEER_WS_ENDPOINT_ARG}' or use '${SEPARATE_BROWSER_PROCESSES_ARG}' to create a new browser process for every test.`);
		}
		browser = await puppeteer.connect({
			browserWSEndpoint: wsEndpoint,
		});
	}

	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	await page.goto(url);
	const browserRef = browser;
	return {
		context,
		page,
		async disconnect() {
			await page.close();
			if (separateProcesses) {
				await browserRef.close();
			} else {
				browserRef.disconnect();
			}
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
