#!/usr/bin/env node

const rollup = require("rollup");
const fs = require("fs").promises;

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

(async _ => {
	if(process.argv.includes("--dev")){
		try{
			await fs.unlink("editor/dist/index.js");
		}catch(e){
			//fail silently
		}
		await setScriptSrc("../src/index.js");
	}else{
		const bundle = await rollup.rollup({
			input: "editor/src/index.js",
		});
		await bundle.write({
			file: "editor/dist/index.js",
			format: "esm",
		});
		await setScriptSrc("./index.js");
	}
})();
