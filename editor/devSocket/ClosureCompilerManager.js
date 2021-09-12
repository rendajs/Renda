import closureCompiler from "google-closure-compiler";

const ClosureCompiler = closureCompiler.compiler;

export default class ClosureCompilerManager {
	async compileJs(responseCb, {
		inputFiles = [],
		externs = [],
		args = {},
	}) {
		const compiler = new ClosureCompiler(args);
		const result = await new Promise(r => {
			const proc = compiler.run((exitCode, stdOut, stdErr) => {
				r({exitCode, stdOut, stdErr});
			});
			proc.stdin.on("error", () => {
				// this callback exists to prevent node from throwing an error
				// when the compiler fails before stdin is parsed
				// errors will be handled from the compiler.run() callback
			});
			proc.stdin.write(JSON.stringify(inputFiles));
		});

		responseCb(result);
	}
}
