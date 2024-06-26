import puppeteer from "puppeteer";
import { parseArgs } from "../../shared/testArgs.js";

let mainPageUrl = "";
/**
 * @param {string} url
 */
export function setMainPageUrl(url) {
	mainPageUrl = url;
}
function getMainPageUrl() {
	if (!mainPageUrl) {
		throw new Error("Failed to get main page url, use `setMainPageUrl` first.");
	}
	return mainPageUrl;
}

globalThis.addEventListener("error", (e) => {
	if (e.message.includes("WebSocket protocol error: Connection reset without closing handshake")) {
		e.preventDefault();
	}
});

export async function installIfNotInstalled() {
	const fetcher = puppeteer.createBrowserFetcher({
		product: "chrome",
	});
	// Ideally we would use the revision bundled with puppeteer,
	// but unfortunately some tests seem to be failing when we do this.
	// This version seems to work though, so we'll roll with it.
	let revision;
	if (Deno.build.os == "windows" || Deno.build.os == "darwin") {
		revision = "1287751";
	} else {
		// Linux seems to have a different snapshot, not sure why
		revision = "1287757";
	}
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
let browserStartedWithHeadless = false;

/** @type {import("puppeteer").Page?} */
let defaultPage = null;

/**
 * @param {object} options
 * @param {boolean} options.headless
 */
export async function launch({ headless }) {
	const executablePath = await installIfNotInstalled();
	console.log(`Launching ${executablePath}`);
	browser = await puppeteer.launch({
		headless,
		args: ["--enable-unsafe-webgpu"],
		devtools: !headless,
		executablePath,
	});
	browserStartedWithHeadless = headless;
	const pages = await browser.pages();
	defaultPage = pages[0];
	return browser;
}

/** @type {Set<import("puppeteer").BrowserContext>} */
const contexts = new Set();

/** @type {Set<import("puppeteer").Page>} */
const pages = new Set();

/** @type {{location: import("puppeteer").ConsoleMessageLocation, argsPromise: Promise<unknown[]>}[]} */
const consoleQueue = [];
let isDrainingConsoleQueue = false;

const args = parseArgs();

/**
 * Creates a new incognito context and a page.
 * Contexts are automatically cleaned up after each test, even if the test fails.
 */
export async function getPage(url = getMainPageUrl() + "/studio/") {
	const browser = await launch({ headless: args.headless });

	const context = await browser.createIncognitoBrowserContext();
	contexts.add(context);

	/** @type {Set<import("puppeteer").Page>} */
	const createdPages = new Set();
	async function createPage(url = getMainPageUrl() + "/studio/") {
		const page = await context.newPage();
		pages.add(page);
		createdPages.add(page);
		await updateDefaultPageVisibility();

		page.on("console", async (message) => {
			// We need to request `jsonValue` right away, if we only add the message
			// to the queue and request it later the browser context might already be lost.
			const args = message.args();
			let argsPromises;
			if (args.length > 0) {
				argsPromises = message.args().map((arg) => arg.jsonValue());
			} else {
				argsPromises = [Promise.resolve(message.text())];
			}
			consoleQueue.push({
				location: message.location(),
				argsPromise: Promise.all(argsPromises),
			});
			drainConsoleQueue();
		});
		page.on("pageerror", (error) => {
			console.log("-- Browser console error");
			console.log(error);
			console.log("--");
		});

		await page.goto(url);

		return page;
	}

	const page = await createPage(url);
	return {
		context,
		page,
		createPage,
		async discard() {
			for (const page of createdPages) {
				pages.delete(page);
			}
			contexts.delete(context);
			await updateDefaultPageVisibility();
			await context.close();
			await browser.close();
		},
	};
}

async function drainConsoleQueue() {
	if (isDrainingConsoleQueue) return;
	isDrainingConsoleQueue = true;

	while (true) {
		const message = consoleQueue.shift();
		if (!message) break;

		const jsonArgs = await message.argsPromise;
		let locationString;

		// Strip domain name if it is localhost
		const urlstring = message.location.url;
		if (urlstring) {
			let locationUrl;
			try {
				locationUrl = new URL(urlstring);
			} catch {
				// We'll just use the raw string instead
			}

			if (locationUrl && locationUrl.hostname == "localhost") {
				locationString = locationUrl.pathname;
			}
		}
		if (!locationString) {
			locationString = message.location.url || "unknown";
		}
		if (message.location.lineNumber) {
			locationString += ":" + message.location.lineNumber;
			if (message.location.columnNumber) {
				locationString += ":" + message.location.columnNumber;
			}
		}

		console.log(`-- Browser console message from ${locationString}`);
		console.log(...jsonArgs);
		console.log("--");
	}

	isDrainingConsoleQueue = false;
}

/**
 * The page from the default context is always empty and only sits in the way.
 * But the Chrome process exits when the last page is closed, herefore we can't close it on startup.
 * Instead we'll close it once at least one other page is opened.
 * Then we open it again right before the last page is closed.
 * That way the browser process never exits.
 */
async function updateDefaultPageVisibility() {
	// If we're in headless mode, let's not do any of this.
	// We don't want to make ci more flaky.
	// Even though in headless mode the browser does not seem to exit when the last page is closed.
	if (browserStartedWithHeadless) return;

	if (!browser) {
		throw new Error("Assertion failed, browser was not launched.");
	}
	const needsDefaultPage = pages.size === 0;
	const hasDefaultPage = Boolean(defaultPage);
	if (needsDefaultPage != hasDefaultPage) {
		if (defaultPage) {
			await defaultPage.close();
			defaultPage = null;
		} else {
			const ctx = browser.defaultBrowserContext();
			defaultPage = await ctx.newPage();
		}
	}
}

/**
 * Discards all created contexts. Called by the test runner at the end of a test.
 */
export async function discardCurrentContexts() {
	contexts.clear();
	pages.clear();

	if (browser) {
		await browser.close();
	}
	browser = null;
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

	return await getPage(pageUrl.href);
}
