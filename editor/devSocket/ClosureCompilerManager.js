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

	async compileJs({js, externs}, responseCb){
		this.lastCreatedId++;

		const args = [
			`--compilation_level=ADVANCED`,
			`--language_in=ECMASCRIPT_NEXT`,
			`--language_out=ECMASCRIPT_NEXT`,
		];

		const fileName = this.lastCreatedId+"_in.js";
		const filePath = path.resolve(this.tmpFilesPath, fileName);
		await writeFile(filePath, js);
		args.push(`--js=${filePath}`);

		let externsFilePath = null;
		if(externs){
			const externsFileName = this.lastCreatedId+"_externs.js";
			externsFilePath = path.resolve(this.tmpFilesPath, externsFileName);
			await writeFile(externsFilePath, externs);
			args.push(`--externs=${externsFilePath}`);
		}

		const result = await this.runCompiler(args);

		responseCb(result);

		await unlink(filePath);
		if(externs){
			await unlink(externsFilePath);
		}
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
