import * as fs from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import { setCwd } from "chdir-anywhere";
import { parseVersionArg } from "./shared/parseVersionArgs.js";

setCwd();
const destination = path.resolve("..", "jsrPackage");

try {
	await Deno.remove(destination, {
		recursive: true,
	});
} catch {
	// Already removed
}
await fs.ensureDir(destination);

const jsrJson = JSON.stringify({
	name: "@renda/renda",
	version: parseVersionArg(),
	exports: "./mod.js",
	exclude: ["!."],
}, null, "\t");
await Deno.writeTextFile(path.resolve(destination, "jsr.json"), jsrJson);

const copyFiles = [
	"README.md",
	"LICENSE",
	"src",
	"mod.js",
];
for (const filename of copyFiles) {
	await fs.copy(path.resolve("..", filename), path.resolve(destination, filename));
}

// WebRtcDiscoveryMethod imports types from studio-discovery-server on github.
// We use these types for development, but jsr doesn't allow external imports.
// Since this is only a private type, it's fine to replace it with `any`.

const webRtcDiscoveryMethodPath = path.resolve(destination, "src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js");
let webRtcDiscoveryMethodContent = await Deno.readTextFile(webRtcDiscoveryMethodPath);
const importString = webRtcDiscoveryMethodContent.match(/import\("https:\/\/raw\.githubusercontent\.com.+\)\.[a-z]+/gi);
if (!importString || importString.length != 1) {
	throw new Error("Assertion failed, no import string was found");
}
webRtcDiscoveryMethodContent = webRtcDiscoveryMethodContent.replace(importString[0], "any");
await Deno.writeTextFile(webRtcDiscoveryMethodPath, webRtcDiscoveryMethodContent);
