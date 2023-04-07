export const PUPPETEER_NO_HEADLESS_ARG = "--no-headless";

export function parseArgs() {
	const inspect = Deno.args.includes("--inspect") || Deno.args.includes("--inspect-brk") || Deno.args.includes("-i");
	const headless = !Deno.args.includes(PUPPETEER_NO_HEADLESS_ARG) && !inspect;
	return {inspect, headless};
}
