import {parse} from "std/flags/mod.ts";

export function parseArgs() {
	const parsed = parse(Deno.args);
	const inspect = parsed.inspect || parsed["inspect-brk"] || parsed.i;
	let headless = !inspect;
	if (parsed.headless || parsed.h) {
		headless = !headless;
	}
	return {inspect, headless};
}
