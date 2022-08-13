import transpiledRollup from "../../deps/rollup.browser.js";
import {getEditorInstance} from "../editorInstance.js";
import resolveUrlObjects from "../../deps/rollup-plugin-resolve-url-objects.js";
import {ProjectAssetTypeJavascript} from "../assets/projectAssetType/ProjectAssetTypeJavascript.js";

const rollup = /** @type {import("rollup")} */ (transpiledRollup);

/**
 * @typedef {"project" | "engine" | "remote" | null} ScriptType
 */

/**
 * @typedef {Object} ScriptBuilderOptions
 * @property {boolean} [useClosureCompiler]
 */

export class ScriptBuilder {
	/**
	 * @typedef {[import("rollup").OutputChunk, ...(import("rollup").OutputChunk | import("rollup").OutputAsset)[]]} RollupOutput
	 */
	/**
	 * @param {string[]} inputPath
	 * @param {string[]} outputPath
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {import("../network/DevSocketManager.js").DevSocketManager?} devSocket
	 * @param {ScriptBuilderOptions} options
	 */
	async buildScript(inputPath, outputPath, fileSystem, devSocket, {
		useClosureCompiler = true,
	} = {}) {
		const bundle = await rollup.rollup({
			input: inputPath.join("/"),
			plugins: [this.resolveScripts(fileSystem), resolveUrlObjects()],
			preserveEntrySignatures: false,
		});
		const {output: rollupOutput} = await bundle.generate({
			format: "esm",
			sourcemap: true,
		});

		if (!useClosureCompiler) {
			this.writeRollupOutput(rollupOutput, outputPath, fileSystem);
		} else {
			if (!devSocket) {
				throw new Error("DevSocketManager is required to build with closure compiler");
			}
			await this.runClosureCompiler(fileSystem, devSocket, rollupOutput, outputPath);
		}
	}

	/**
	 * @param {RollupOutput} rollupOutput
	 * @param {string[]} outputPath
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 */
	writeRollupOutput(rollupOutput, outputPath, fileSystem) {
		for (const chunkOrAsset of rollupOutput) {
			if (chunkOrAsset.type == "chunk") {
				const chunk = chunkOrAsset;
				const codeOutputPath = [...outputPath, chunk.fileName];
				let code = chunk.code;
				if (chunk.map) {
					const sourcemapName = chunk.fileName + ".map";
					const sourcemapPath = [...outputPath, sourcemapName];
					fileSystem.writeText(sourcemapPath, JSON.stringify(chunk.map));

					code += "\n\n//# sourceMappingURL=./" + sourcemapName;
				}

				fileSystem.writeText(codeOutputPath, code);
			}
			// todo: handle chunkOrAsset.type == "asset"
		}
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {import("../network/DevSocketManager.js").DevSocketManager} devSocket
	 * @param {RollupOutput} rollupOutput
	 * @param {string[]} outputPath
	 */
	async runClosureCompiler(fileSystem, devSocket, rollupOutput, outputPath) {
		const rollupCode = rollupOutput[0].code;
		const chunks = rollupOutput.filter(chunkOrAsset => chunkOrAsset.type == "chunk");
		const castChunks = /** @type {import("rollup").OutputChunk[]} */ (chunks);

		/**
		 * @typedef {Object} ClosureInputFile
		 * @property {string} path
		 * @property {string} src
		 * @property {string} [sourceMap]
		 * @property {string} [chunkName]
		 * @property {string[]} [chunkDependencies]
		 */

		/** @type {ClosureInputFile[]} */
		const inputFiles = castChunks.map(chunk => {
			return {
				path: chunk.fileName,
				src: chunk.code,
				sourceMap: JSON.stringify(chunk.map),
				chunkName: chunk.fileName,
				chunkDependencies: chunk.dynamicImports,
			};
		});

		let externsAsset = null;
		const assetManager = getEditorInstance().projectManager.assetManager;
		if (assetManager) {
			externsAsset = await assetManager.getProjectAssetFromUuid("2c2abb9a-8c5a-4faf-a605-066d33242391", {
				assertAssetType: ProjectAssetTypeJavascript,
			});
		}
		if (externsAsset) {
			const webGpuExterns = await externsAsset.readAssetData();
			inputFiles.push({
				path: "webGpuExterns.js",
				src: webGpuExterns,
			});
		}
		// todo: also make this work in production builds
		const {stdErr, stdOut} = await devSocket.sendRoundTripMessage("runClosureCompiler", {
			inputFiles,
			args: {
				/* eslint-disable camelcase */
				compilation_level: "ADVANCED",
				language_in: "ECMASCRIPT_NEXT",
				language_out: "ECMASCRIPT_NEXT",
				error_format: "JSON",
				formatting: "PRETTY_PRINT",
				chunk_output_type: "ES_MODULES",
				json_streams: "BOTH",
				source_map_include_content: true,
				emit_use_strict: false,
				debug: true,
				/* eslint-enable camelcase */
			},
		});
		if (stdErr) {
			let closureErrors = [];
			const extraLines = [];
			for (const line of stdErr.split("\n")) {
				let json = null;
				if (line.trim()) {
					try {
						json = JSON.parse(line);
					} catch (_) {
						// ignore
					}
				}
				if (json) {
					closureErrors = json;
				} else {
					extraLines.push(line);
				}
			}
			const message = extraLines.join("\n");
			if (message.trim()) {
				console.error(message);
			}

			this.printCodeErrors(closureErrors, rollupCode);
		}
		if (stdOut) {
			const outFiles = JSON.parse(stdOut);
			for (const file of outFiles) {
				const fileName = file.path;
				const codeOutputPath = [...outputPath, fileName];
				let code = file.src;
				if (file.source_map) {
					const sourcemapName = fileName + ".map";
					const sourcemapPath = [...outputPath, sourcemapName];
					fileSystem.writeText(sourcemapPath, file.source_map);

					code += "\n\n//# sourceMappingURL=./" + sourcemapName;
				}

				fileSystem.writeText(codeOutputPath, code);
			}
		}
	}

	/**
	 * @typedef {Object} ClosureCompilerError
	 * @property {string} [key]
	 * @property {string} [description]
	 * @property {number} line
	 * @property {number} column
	 * @property {string} context
	 * @property {"error" | "warning" | "info"} level
	 */

	/**
	 * @param {ClosureCompilerError[]} errors
	 * @param {string} code
	 */
	printCodeErrors(errors, code) {
		if (errors.length == 0) return;

		const lines = code.split("\n");

		let codeBackground = "background: white;";
		let codeStyle = "color: black;";
		const blockWidth = 150;
		if (matchMedia("(prefers-color-scheme: dark)").matches) {
			codeBackground = "background: #272727;";
			codeStyle = "color: white;";
		}
		codeStyle += codeBackground;

		for (const error of errors) {
			const logStyles = [];
			let logText = "";

			if (error.key) {
				logText += `%c${error.key} : %c${error.description}`;
				logStyles.push("font-weight: bold", "");
			} else {
				logText += error.description;
			}

			let needsContext = false;
			if (error.line >= 0) {
				logText += "\n%c";
				logStyles.push(codeStyle);
				const startLine = Math.max(0, error.line - 5);
				const endLine = Math.min(lines.length - 1, error.line + 5);
				if (startLine > endLine) {
					needsContext = true;
				}
				for (let i = startLine; i < endLine; i++) {
					const line = lines[i];
					const spacesLine = line.replace(/\t/g, "    ");
					const extraSpaces = " ".repeat(Math.max(0, blockWidth - spacesLine.length));
					logText += spacesLine + extraSpaces + "\n";
					if (i == error.line - 1 && error.column != null) {
						const splitStr = line.slice(0, error.column);
						const splitStr2 = line.slice(error.column);
						const spacesLength = splitStr.replace(/\t/g, "    ").length;
						const spaces = " ".repeat(spacesLength);
						let caretsLength = splitStr2.search(/[^a-zA-Z0-9_.]/);
						if (caretsLength == -1) caretsLength = splitStr2.length;
						caretsLength = Math.max(caretsLength, 1);
						const carets = "^".repeat(caretsLength);
						const spaces2 = " ".repeat(Math.max(0, blockWidth - spacesLength - caretsLength));
						logText += "%c" + spaces + carets + spaces2 + "%c\n";
						logStyles.push(codeBackground + "color: red;", codeStyle);
					}
				}
			}

			if (needsContext) {
				logText += error.context;
			}

			if (error.level == "error") {
				console.error(logText, ...logStyles);
			} else if (error.level == "warning") {
				console.warn(logText, ...logStyles);
			} else if (error.level == "info") {
				console.log(logText, ...logStyles);
			}
		}
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @return {import("rollup").Plugin}
	 */
	resolveScripts(fileSystem) {
		const scriptBuilder = this;
		return {
			name: "editor-resolve-scripts",
			resolveId(source, importer, opts) {
				const castThis = /** @type {import("rollup").PluginContext} */ (/** @type {unknown} */ (this));
				let importerInfo = null;
				if (importer) {
					importerInfo = castThis.getModuleInfo(importer);
				}
				let {scriptType, sourcePath} = scriptBuilder.getPathType(source);
				/** @type {ScriptType} */
				const importerType = importerInfo?.meta?.editorResolve?.scriptType ?? null;
				scriptType = scriptType || importerType || null;

				const originalIsRelative = !sourcePath.startsWith("/");
				/** @type {string[]} */
				let resolvedPathArr = [];

				if (sourcePath == "renda") {
					scriptType = "engine";
					sourcePath = "/dist/mod.js";
				}

				if (!scriptType) scriptType = "project";

				if (importer && importerType == scriptType && originalIsRelative) {
					resolvedPathArr = importer.split("/");
					resolvedPathArr.pop();
				}
				const sourcePathArr = sourcePath.split("/");
				for (const dir of sourcePathArr) {
					if (dir == ".") continue;
					if (dir == "..") {
						resolvedPathArr.pop();
					} else {
						resolvedPathArr.push(dir);
					}
				}
				const resolvedPath = resolvedPathArr.join("/");
				return {
					id: resolvedPath,
					meta: {
						editorResolve: {
							scriptType,
						},
					},
				};
			},
			async load(id) {
				const castThis = /** @type {import("rollup").PluginContext} */ (/** @type {unknown} */ (this));
				const moduleInfo = castThis.getModuleInfo(id);
				/** @type {ScriptType} */
				const scriptType = moduleInfo?.meta?.editorResolve?.scriptType ?? null;
				if (scriptType == "project") {
					try {
						const file = await fileSystem.readFile(id.split("/"));
						const text = await file.text();
						return text;
					} catch (e) {
						console.error("unable to read file at " + id + " it may not exist.");
					}
				} else if (scriptType == "engine") {
					const resp = await fetch(id);
					return await resp.text();
				}
				return null;
			},
		};
	}

	/**
	 * @typedef {Object} GetPathTypeResult
	 * @property {ScriptType} scriptType
	 * @property {string} sourcePath
	 */

	/**
	 * Splits the rollup id using the `:` character.
	 * @param {string} id
	 * @returns {GetPathTypeResult}
	 */
	getPathType(id) {
		if (id) {
			const splitPath = id.split("/");
			if (splitPath.length > 0) {
				const splitFirst = splitPath[0].split(":");
				if (splitFirst.length > 1) {
					const type = /** @type {ScriptType} */ (splitFirst[0]);
					if (type == "project" || type == "engine" || type == "remote") {
						const pathNoType = id.slice(type.length + 1);
						return {
							scriptType: type,
							sourcePath: pathNoType,
						};
					}
				}
			}
		}
		return {
			scriptType: null,
			sourcePath: id,
		};
	}
}
