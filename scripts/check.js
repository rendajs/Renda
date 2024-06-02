import { dev } from "./dev.js";

await dev({
	needsTypes: true,
	needsTypesSync: true,
	needsDependencies: true,
});

const command = new Deno.Command(Deno.execPath(), {
	args: ["run", "--allow-env", "--allow-read", "npm:typescript@5.4.5/tsc", "--noEmit", "-p", "./jsconfig.json"],
	stdout: "inherit",
	stderr: "inherit",
});

const output = await command.output();
if (!output.success) {
	Deno.exit(1);
} else {
	console.log("No type errors!");
}
