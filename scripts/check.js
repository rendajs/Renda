import {dev} from "./dev.js";

await dev({
	needsTypes: true,
});

const proc = Deno.run({
	cmd: ["deno", "run", "--allow-env", "--allow-read", "--unstable", "npm:typescript@4.8.3/tsc", "--noEmit", "-p", "./jsconfig.json"],
});

const status = await proc.status();
if (!status.success) {
	Deno.exit(1);
} else {
	console.log("No type errors!");
}
