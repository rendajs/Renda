import rollup from "../../libs/rollup.browser.js";
import editor from "../editorInstance.js";

export default class ScriptBuilder{
	constructor(){
	}

	async buildScript(inputPath, outputPath, {
		useClosureCompiler = true,
	} = {}){
		const bundle = await rollup.rollup({
			input: inputPath.join("/"),
			plugins: [this.resolveScripts()],
		});
		const {output: rollupOutput} = await bundle.generate({
			format: "esm",
			sourcemap: true,
		});

		if(!useClosureCompiler){
			this.writeRollupOutput(rollupOutput, outputPath);
		}else{
			await this.runClosureCompiler(rollupOutput, outputPath);
		}
	}

	writeRollupOutput(rollupOutput, outputPath){
		for(const chunkOrAsset of rollupOutput){
			if(chunkOrAsset.type == "chunk"){
				const chunk = chunkOrAsset;
				const codeOutputPath = [...outputPath, chunk.fileName];
				let code = chunk.code;
				if(chunk.map){
					const sourcemapName = chunk.fileName+".map";
					const sourcemapPath = [...outputPath, sourcemapName];
					editor.projectManager.currentProjectFileSystem.writeText(sourcemapPath, JSON.stringify(chunk.map));

					code += "\n\n//# sourceMappingURL=./"+sourcemapName;
				}

				editor.projectManager.currentProjectFileSystem.writeText(codeOutputPath, code);
			}
			//todo: handle chunkOrAsset.type == "asset"
		}
	}

	async runClosureCompiler(rollupOutput, outputPath){
		const rollupCode = rollupOutput[0].code;
		const externsAsset = await editor.projectManager.assetManager.getProjectAsset("2c2abb9a-8c5a-4faf-a605-066d33242391");
		const webGpuExterns = await externsAsset.readAssetData();
		const inputFiles = rollupOutput.map(chunk => {
			return {
				path: chunk.fileName,
				src: chunk.code,
				sourceMap: JSON.stringify(chunk.map),
				chunkName: chunk.fileName,
				chunkDependencies: chunk.dynamicImports,
			}
		});
		inputFiles.push({
			path: "webGpuExterns.js",
			src: webGpuExterns,
		});
		//todo: also make this work in production builds
		const {exitCode, stdErr, stdOut} = await editor.devSocket.sendRoundTripMessage("runClosureCompiler", {
			inputFiles,
			args: {
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
			},
		});
		if(stdErr){
			let closureErrors = [];
			let extraLines = [];
			for(const line of stdErr.split("\n")){
				let json = null;
				if(!!line.trim()){
					try{
						json = JSON.parse(line);
					}catch(_){}
				}
				if(json){
					closureErrors = json;
				}else{
					extraLines.push(line);
				}
			}
			const message = extraLines.join("\n");
			if(!!message.trim()){
				console.error(message);
			}

			this.printCodeErrors(closureErrors, rollupCode);
		}
		if(stdOut){
			const outFiles = JSON.parse(stdOut);
			for(const file of outFiles){
				const fileName = file.path;
				const codeOutputPath = [...outputPath, fileName];
				let code = file.src;
				if(file.source_map){
					const sourcemapName = fileName+".map";
					const sourcemapPath = [...outputPath, sourcemapName];
					editor.projectManager.currentProjectFileSystem.writeText(sourcemapPath, file.source_map);

					code += "\n\n//# sourceMappingURL=./"+sourcemapName;
				}

				editor.projectManager.currentProjectFileSystem.writeText(codeOutputPath, code);
			}
		}
	}

	printCodeErrors(errors, code){
		if(errors.length == 0) return;

		const lines = code.split("\n");

		let codeBackground = "background: white;";
		let codeStyle = "color: black;";
		const blockWidth = 150;
		if(matchMedia("(prefers-color-scheme: dark)").matches){
			codeBackground = "background: #272727;";
			codeStyle = "color: white;";
		}
		codeStyle += codeBackground;

		for(const error of errors){
			const logStyles = [];
			let logText = "";

			if(error.key){
				logText += `%c${error.key} : %c${error.description}`;
				logStyles.push("font-weight: bold", "");
			}else{
				logText += error.description;
			}

			if(error.line >= 0){
				logText += `\n%c`;
				logStyles.push(codeStyle);
				const startLine = Math.max(0, error.line - 5);
				const endLine = Math.min(lines.length - 1, error.line + 5);
				for(let i=startLine; i<endLine; i++){
					const line = lines[i];
					const spacesLine = line.replace(/\t/g,"    ");
					const extraSpaces = " ".repeat(Math.max(0, blockWidth - spacesLine.length));
					logText += spacesLine + extraSpaces + "\n";
					if(i == error.line -1 && error.column != null){
						const splitStr = line.slice(0, error.column);
						const splitStr2 = line.slice(error.column);
						const spacesLength = splitStr.replace(/\t/g,"    ").length;
						const spaces = " ".repeat(spacesLength);
						let caretsLength = splitStr2.search(/[^a-zA-Z0-9_.]/);
						if(caretsLength == -1) caretsLength = splitStr2.length;
						caretsLength = Math.max(caretsLength, 1);
						const carets = "^".repeat(caretsLength);
						const spaces2 = " ".repeat(Math.max(0, blockWidth - spacesLength - caretsLength));
						logText += "%c"+spaces + carets + spaces2 + "%c\n";
						logStyles.push(codeBackground+"color: red;", codeStyle);
					}
				}
			}

			if(error.level == "error"){
				console.error(logText, ...logStyles);
			}else if(error.level == "warning"){
				console.warn(logText, ...logStyles);
			}else if(error.level == "info"){
				console.log(logText, ...logStyles);
			}
		}
	}

	resolveScripts(){
		const context = this;
		return {
			name: "editor-resolve-scripts",
			resolveId(source, importer, opts){
				const importerInfo = this.getModuleInfo(importer);
				let scriptType = null;
				const [sourceType, sourceNoType] = context.getPathType(source);
				const importerType = importerInfo?.meta?.editorResolve?.scriptType ?? null;
				scriptType = sourceType || importerType || null;
				if(sourceNoType == "JJ"){
					scriptType = ScriptBuilder.PathTypes.ENGINE;
				}
				if(!scriptType) scriptType = ScriptBuilder.PathTypes.PROJECT;

				let importerPathArr = [];
				if(importer && importerType == sourceType){
					importerPathArr = importer.split("/");
					importerPathArr.pop();
				}
				const pathArr = [...importerPathArr];
				const sourcePathArr = sourceNoType.split("/");
				for(const dir of sourcePathArr){
					if(dir == ".") continue;
					if(dir == ".."){
						pathArr.pop();
					}else{
						pathArr.push(dir);
					}
				}
				let resolvedPath = pathArr.join("/");
				return {
					id: resolvedPath,
					meta: {
						editorResolve: {
							scriptType,
						},
					}
				};
			},
			async load(id){
				const moduleInfo = this.getModuleInfo(id);
				const scriptType = moduleInfo.meta.editorResolve.scriptType;
				if(scriptType == ScriptBuilder.PathTypes.PROJECT){
					try{
						const file = await editor.projectManager.currentProjectFileSystem.readFile(id.split("/"));
						const text = await file.text();
						return text;
					}catch(e){
						console.error("unable to read file at "+id+" it may not exist.");
					}
				}else if(scriptType == ScriptBuilder.PathTypes.ENGINE){
					const resp = await fetch("/build/game-engine.js");
					return await resp.text();
				}
			},
		}
	}

	static get PathTypes(){
		return {
			PROJECT: "project",
			ENGINE: "engine",
			REMOTE: "remote",
		}
	}

	getPathType(path){
		if(path){
			const splitPath = path.split("/");
			if(splitPath.length > 0){
				const splitFirst = splitPath[0].split(":");
				if(splitFirst.length > 1){
					const type = splitFirst[0];
					if(Object.values(ScriptBuilder.PathTypes).includes(type)){
						const pathNoType = path.slice(type.length + 1);
						return [type, pathNoType];
					}
				}
			}
		}
		return [null, path];
	}
}
