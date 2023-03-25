import {dev} from "./dev.js";

await dev({
	needsTypes: true,
	needsDependencies: true,
});

const proc = Deno.run({
	// Also update the version in ./scripts/dev.js
	cmd: ["deno", "run", "--allow-env", "--allow-read", "npm:typescript@5.0.2/tsc", "--noEmit", "-p", "./jsconfig.json"],
});

const status = await proc.status();
if (!status.success) {
	Deno.exit(1);
} else {
	console.log("No type errors!");
}
