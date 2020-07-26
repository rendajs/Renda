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
		}, [{
			src: code,
		}]);
		return closureData.compiledCode;
	}

	resolveScripts(){
		return {
			name: "resolve-scripts",
			resolveId(source, importer){
				if(!importer) return source;
				const importerPathArr = importer.split("/");
				importerPathArr.pop();
				const pathArr = [...importerPathArr];
				const sourcePathArr = source.split("/");
				for(const dir of sourcePathArr){
					if(dir == ".") continue;
					if(dir == ".."){
						pathArr.pop();
					}else{
						pathArr.push(dir);
					}
				}
				const resolvedPath = pathArr.join("/");
				return resolvedPath;
			},
			async load(id){
				const path = id.split("/");
				try{
					const file = await editor.projectManager.currentProjectFileSystem.readFile(path);
					const text = await file.text();
					return text;
				}catch(e){
					console.error("unable to read file at "+id+" it may not exist.");
				}
			},
		}
	}
}
