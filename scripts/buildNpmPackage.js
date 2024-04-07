import * as fs from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import { buildEngine } from "./buildEngine.js";
import { setCwd } from "chdir-anywhere";
import { parseVersionArg } from "./shared/parseVersionArgs.js";
import { verifyVersion } from "./shared/verifyVersion.js";

setCwd();
const destination = path.resolve("..", "npmPackage");

const version = parseVersionArg();
verifyVersion(version);

try {
	await Deno.remove(destination, {
		recursive: true,
	});
} catch {
	// Already removed
}
await fs.ensureDir(destination);

const distPath = path.resolve(destination, "dist");
await buildEngine(distPath);

const packageJson = JSON.stringify({
	name: "renda",
	version,
	description: "A modern rendering engine for the web.",
	type: "module",
	main: "dist/renda.js",
	repository: {
		type: "git",
		url: "git+https://github.com/rendajs/Renda.git",
	},
	bugs: {
		url: "https://github.com/rendajs/Renda/issues",
	},
	homepage: "https://rendajs.org",
	author: "Jesper van den Ende",
	license: "MIT",
	keywords: ["3d", "webgpu", "graphics", "game-development", "gamedev", "rendering", "html5", "renda", "javascript"],
}, null, "\t");
await Deno.writeTextFile(path.resolve(destination, "package.json"), packageJson);

const copyFiles = [
	"README.md",
	"LICENSE",
];
for (const filename of copyFiles) {
	await fs.copy(path.resolve("..", filename), path.resolve(destination, filename));
}
