#!/usr/bin/env node

import {rollup} from "rollup";
import define from "rollup-plugin-define";
import {promises as fs} from "fs";

const isDevBuild = process.argv.includes("--dev");

const defines = {
	"EDITOR_ENV": isDevBuild ? "dev" : "production",
	"IS_DEV_BUILD": isDevBuild,
};

for(const [name, value] of Object.entries(defines)){
	defines[name] = JSON.stringify(value);
}

async function setScriptSrc(src){
	const filePath = "editor/dist/index.html";
	let data = await fs.readFile(filePath, {encoding: "utf8"});
	let startPos = data.indexOf("<!--editor script tag-->");
	let searchStr = "<script type=\"module\" src=\"";
	startPos = data.indexOf(searchStr, startPos);
	startPos += searchStr.length;
	let endPos = data.indexOf("\"></script>", startPos);
	let newData = data.substring(0, startPos)+src+data.substring(endPos, data.length);
	await fs.writeFile(filePath, newData);
}

async function generateDefines(filePath, defines){
	const data = await fs.readFile(filePath, {encoding: "utf8"});
	const startString = "/*start build defines*/";
	const endString = "/*end build defines*/";
	const startPos = data.indexOf(startString);
	const endPos = data.indexOf(endString);

	let definesString = "\n";
	for(const [defineName, defineValue] of Object.entries(defines)){
		definesString += `\twindow["${defineName}"] = ${defineValue};`;
		definesString += "\n";
	}
	definesString += "\t";

	const newData = data.substring(0, startPos + startString.length) + definesString + data.substring(endPos, data.length);
	await fs.writeFile(filePath, newData);
}

(async _ => {
	if(isDevBuild){
		try{
			await fs.unlink("editor/dist/index.js");
		}catch(e){
			//fail silently
		}
		await setScriptSrc("../src/index.js");

		await generateDefines("editor/src/editorInstance.js", defines);
	}else{
		const bundle = await rollup({
			input: "editor/src/index.js",
			plugins: [define({
				replacements: {
					"ROLLUP_DEFINES_APPLIED": "true",
					...defines,
				},
			})],
			onwarn: message => {
				if(message.code == "CIRCULAR_DEPENDENCY") return;
				console.error(message.message);
			},
		});
		await bundle.write({
			file: "editor/dist/index.js",
			format: "esm",
		});
		await setScriptSrc("./index.js");
	}
})();
