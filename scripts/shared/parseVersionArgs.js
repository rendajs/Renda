export function parseVersionArg() {
	let version = Deno.args[0];
	if (version && version.startsWith("v")) version = version.slice(1);
	if (!version) {
		throw new Error("No version provided, specify the package.json version using the first command. I.e. `deno task build-npm-package 1.2.3`");
	}
	return version;
}
