import * as fs from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import {buildEngine} from "./buildEngine.js";
import {setCwd} from "chdir-anywhere";

setCwd();
const destination = path.resolve("..", "npmPackage");

try {
	await Deno.remove(destination, {
		recursive: true,
	});
} catch {
	// Already removed
}
await fs.ensureDir(destination);

const distPath = path.resolve(destination, "dist");
const engineSource = await buildEngine();
await fs.ensureDir(distPath);
await Deno.writeTextFile(path.resolve(distPath, "renda.js"), engineSource);

const version = Deno.args[0];
if (!version) {
	throw new Error("No version provided, specify the package.json version using the first command. I.e. `deno task build-npm-package 1.2.3`");
}
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
