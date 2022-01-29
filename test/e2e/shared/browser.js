import puppeteer from "https://deno.land/x/puppeteer@9.0.2/mod.ts";

/** @type {import("https://deno.land/x/puppeteer@9.0.2/mod.ts").Browser?} */
let browser = null;
export async function init() {
	if (browser) {
		throw new Error("Browser already initialized.");
	}

	let headless = true;
	if (Deno.args.includes("--no-headless")) {
		headless = false;
	}

	browser = await puppeteer.launch({headless});
}

export async function getContext() {
	if (!browser) {
		throw new Error("Browser not initialized.");
	}

	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	await page.goto("http://localhost:8080/editor/dist/");
	return {context, page};
}
