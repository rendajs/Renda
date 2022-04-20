import puppeteer from "puppeteer";

const MAIN_PAGE_URL = "http://localhost:8080/";

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
};

/** @type {import("puppeteer").Browser?} */
let browser = null;
export async function initBrowser() {
	if (browser) {
		throw new Error("Browser already initialized.");
	}

	let headless = true;
	if (Deno.args.includes("--no-headless")) {
		headless = false;
	}

	browser = await puppeteer.launch({
		headless,
		args: ["--enable-unsafe-webgpu"],
		executablePath: "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
	});
}

export async function getContext(url = MAIN_PAGE_URL + "editor/dist/") {
	if (!browser) {
		throw new Error("Browser not initialized.");
	}

	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	await page.goto(url);
	return {context, page};
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
	const pageUrl = new URL(`${MAIN_PAGE_URL}test/e2e/resources/basicScriptPage/page.html`);
	pageUrl.searchParams.set("script", "/" + relativeScriptLocation);

	return await getContext(pageUrl.href);
}
