import rollup from "../../libs/rollup.browser.js";
import jscomp from "../../libs/jscomp.js";

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
		const code = output[0].code;
		const closureData = jscomp({
			compilationLevel: "ADVANCED",
			languageIn: "ECMASCRIPT_NEXT",
			// formatting: "PRETTY_PRINT",
		}, [{
			src: code,
		}]);
		return closureData.compiledCode;
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
