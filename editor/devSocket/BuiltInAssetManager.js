import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {sendAllConnections} from "./index.js";

export default class BuiltInAssetManager{
	constructor(){
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const builtInAssetsPath = path.resolve(__dirname, "../builtInAssets/");
		console.log("watching for file changes in " + builtInAssetsPath);
		fs.watch(builtInAssetsPath, {recursive:true}, (eventType, filename) => {
			sendAllConnections({
				type: "builtInAssetChange",
				path: filename,
			});
		});

	}
}
