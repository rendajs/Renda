import closureCompiler from "google-closure-compiler";
import stream from "stream";

const ClosureCompiler = closureCompiler.compiler;

export default class ClosureCompilerManager{
	constructor(){
	}

	async compileJs(responseCb, {
		inputFiles = [],
		externs = [],
		args = {},
	}){
		const compiler = new ClosureCompiler(args);
		const result = await new Promise(r => {
			const proc = compiler.run((exitCode, stdOut, stdErr) => {
				r({exitCode, stdOut, stdErr});
			});
			const stdInStream = new stream.Readable({read: function(){}});
			stdInStream.pipe(proc.stdin);
			process.nextTick(() => {
				stdInStream.push(JSON.stringify(inputFiles));
				stdInStream.push(null);
			});
		});

		responseCb(result);
	}
}
