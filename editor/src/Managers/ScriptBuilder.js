import rollup from "../../libs/rollup.browser.js";
import editor from "../editorInstance.js";

export default class ScriptBuilder{
	constructor(){
	}

	async buildScript(input, {
		useClosureCompiler = true,
	} = {}){
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
		if(useClosureCompiler && IS_DEV_BUILD){
			const externsAsset = await editor.projectManager.assetManager.getProjectAsset("2c2abb9a-8c5a-4faf-a605-066d33242391");
			const externs = await externsAsset.readAssetData();
			const {exitCode, stdErr, stdOut} = await editor.devSocket.sendRoundTripMessage("runClosureCompiler", {
				js: code,
				externs,
				args: {
					compilation_level: "ADVANCED",
					language_in: "ECMASCRIPT_NEXT",
					language_out: "ECMASCRIPT_NEXT",
					error_format: "JSON",
					formatting: "PRETTY_PRINT",
				},
			});
			if(stdOut){
				code = stdOut;
			}
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
		}

		return code;
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
						caretsLength = Math.min(caretsLength, 1);
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
