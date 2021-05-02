import {writeFile, stat, mkdir, unlink} from 'fs/promises';
import path from "path";
import {fileURLToPath} from "url";
import closureCompiler from "google-closure-compiler";

const ClosureCompiler = closureCompiler.compiler;

export default class ClosureCompilerManager{
	constructor(){
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		this.tmpFilesPath = path.resolve(__dirname, "./closureSources/");
		this.createTmpDir();

		this.lastCreatedId = 0;
	}

	async createTmpDir(){
		let exists = false;
		try{
			const s = await stat(this.tmpFilesPath);
			if(s) exists = true;
		}catch(_){}
		if(!exists){
			await mkdir(this.tmpFilesPath);
		}
	}

	async compileJs(connection, {js, referenceData}){
		this.lastCreatedId++;

		const fileName = this.lastCreatedId+"_in.js";
		const filePath = path.resolve(this.tmpFilesPath, fileName);
		await writeFile(filePath, js);

		const {exitCode, stdOut, stdErr} = await this.runCompiler({
			js: filePath,
			compilation_level: "ADVANCED",
		});

		connection.send(JSON.stringify({
			op: "runClosureCompilerResponse",
			referenceData,
			exitCode, stdOut, stdErr,
		}));

		await unlink(filePath);
	}

	async runCompiler(opts){
		const compiler = new ClosureCompiler(opts);
		return await new Promise(r => {
			//todo: support for aborting the process
			const proc = compiler.run((exitCode, stdOut, stdErr) => {
				r({exitCode, stdOut, stdErr});
			});
		});
	}
}
