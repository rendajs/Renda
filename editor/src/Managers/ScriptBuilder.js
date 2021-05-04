import rollup from "../../libs/rollup.browser.js";
import editor from "../editorInstance.js";

export default class ScriptBuilder{
	constructor(){
	}

	async buildScript(input){
		const bundle = await rollup.rollup({
			input,
			plugins: [this.resolveScripts()],
		});
		const {output} = await bundle.generate({
			format: "esm",
		});
		const rollupCode = output[0].code;
		let code = rollupCode;
		//todo: also make this work in production builds
		let foundErrors = [];
		if(IS_DEV_BUILD){
			const {exitCode, stdErr, stdOut} = await editor.devSocket.sendRoundTripMessage("runClosureCompiler", {
				js: code,
				externs: `
					const GPUMapMode = {};
					GPUMapMode.READ = {};

					const GPUTextureUsage = {};
					GPUTextureUsage.RENDER_ATTACHMENT = {};

					const GPUBufferUsage = {};
					GPUBufferUsage.UNIFORM = {};

					const GPUShaderStage = {};
					GPUShaderStage.VERTEX = {};
				`,
			});
			if(stdOut){
				code = stdOut;
			}
			if(stdErr){
				foundErrors.push({
					description: "Errors occurred while building script with closure compiler",
				});
				let foundMatch = false;
				const re = /^.*\.js:(?<line>\d+):(?<char>\d+):\s(\S+)\s-\s\[(?<errorType>\S+)\]\s(?<message>.+)$/gm;
				for(const match of stdErr.matchAll(re)){
					const {message, line, char, errorType} = match.groups;
					foundErrors.push({
						description: `${errorType}: ${message}`,
						line: +line,
						char: +char,
					});
					foundMatch = true;
				}
				if(!foundMatch){
					foundErrors.push({
						description: stdErr,
					});
				}
			}
		}

		if(foundErrors.length > 0){
			const logStyles = [];
			let logText = "";
			const lines = rollupCode.split("\n");
			let codeBackground = "background: white;";
			let codeStyle = "color: black;";
			const blockWidth = 150;
			if(matchMedia("(prefers-color-scheme: dark)").matches){
				codeBackground = "background: #272727;";
				codeStyle = "color: white;";
			}
			codeStyle += codeBackground;
			for(const error of foundErrors){
				logText += "%c"+error.description + "%c\n%c";
				logStyles.push("font-weight: bold", "", codeStyle);
				if(error.line != null){
					const startLine = Math.max(0, error.line - 5);
					const endLine = Math.min(lines.length - 1, error.line + 5);
					for(let i=startLine; i<endLine; i++){
						const line = lines[i];
						const spacesLine = line.replace(/\t/g,"    ");
						const extraSpaces = " ".repeat(Math.max(0, blockWidth - spacesLine.length));
						logText += spacesLine + extraSpaces + "\n";
						if(i == error.line -1 && error.char != null){
							const splitStr = line.slice(0, error.char);
							const splitStr2 = line.slice(error.char);
							const spacesLength = splitStr.replace(/\t/g,"    ").length;
							const spaces = " ".repeat(spacesLength);
							let caretsLength = splitStr2.search(/[^a-zA-Z0-9_.]/);
							if(caretsLength == 0) caretsLength = 1;
							if(caretsLength == -1) caretsLength = splitStr2.length;
							const carets = "^".repeat(caretsLength);
							const spaces2 = " ".repeat(Math.max(0, blockWidth - spacesLength - caretsLength));
							logText += "%c"+spaces + carets + spaces2 + "%c\n";
							logStyles.push(codeBackground+"color: red;", codeStyle);
						}
					}
				}
				logText += "%c";
				logStyles.push("");
			}
			console.error(logText, ...logStyles);
			return null;
		}
		return code;
	}

	resolveScripts(){
		return {
			name: "resolve-scripts",
			resolveId: (source, importer) => {
				let type = null;
				const [sourceType, sourceNoType] = this.getPathType(source);
				const [importerType, importerNoType] = this.getPathType(importer);
				type = sourceType || importerType || null;
				if(sourceNoType == "JJ"){
					type = ScriptBuilder.PathTypes.ENGINE;
				}
				if(!type) type = ScriptBuilder.PathTypes.PROJECT;

				let importerPathArr = [];
				if(importer && importerType == sourceType){
					importerPathArr = importerNoType.split("/");
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
				let resolvedPath = type + ":" + pathArr.join("/");
				return resolvedPath;
			},
			load: async id => {
				const [type, pathNoType] = this.getPathType(id);
				if(type == ScriptBuilder.PathTypes.PROJECT){
					try{
						const file = await editor.projectManager.currentProjectFileSystem.readFile(pathNoType.split("/"));
						const text = await file.text();
						return text;
					}catch(e){
						console.error("unable to read file at "+pathNoType+" it may not exist.");
					}
				}else if(type == ScriptBuilder.PathTypes.ENGINE){
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
