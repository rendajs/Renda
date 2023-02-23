export const SEPARATE_BROWSER_PROCESSES_ARG = "--separate-browser-processes";
export const PUPPETEER_WS_ENDPOINT_ARG = "--puppeteer-ws-endpoint=";
export const PUPPETEER_NO_HEADLESS_ARG = "--no-headless";

export function parseArgs() {
	const inspect = Deno.args.includes("--inspect") || Deno.args.includes("--inspect-brk") || Deno.args.includes("-i");
	const headless = !Deno.args.includes(PUPPETEER_NO_HEADLESS_ARG) && !inspect;
	const separateBrowserProcesses = Deno.args.includes(SEPARATE_BROWSER_PROCESSES_ARG) || inspect;
	return {inspect, headless, separateBrowserProcesses};
}
