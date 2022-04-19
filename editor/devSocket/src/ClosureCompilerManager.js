import {createRequire} from "std/node";

const compatRequire = createRequire(import.meta.url);
const closureCompiler = compatRequire("google-closure-compiler");

const ClosureCompiler = closureCompiler.compiler;

export class ClosureCompilerManager {
	/**
	 * @param {Object} data
	 * @param {any[]} data.inputFiles
	 * @param {any[]} data.externs
	 * @param {Object.<string, any>} data.args
	 */
	async compileJs({
		inputFiles = [],
		externs = [],
		args = {},
	}) {
		const compiler = new ClosureCompiler(args);
		const result = await new Promise(r => {
			/**
			 * @param {number} exitCode
			 * @param {string} stdOut
			 * @param {string} stdErr
			 */
			const procCallback = (exitCode, stdOut, stdErr) => {
				r({exitCode, stdOut, stdErr});
			};
			const proc = compiler.run(procCallback);
			if (!proc.stdin) {
				throw new Error("Assertion failed: Closeure compiler process has no stdin.");
			}
			proc.stdin.on("error", () => {
				// this callback exists to prevent node from throwing an error
				// when the compiler fails before stdin is parsed
				// errors will be handled from the compiler.run() callback
			});
			proc.stdin.write(JSON.stringify(inputFiles));
		});

		return result;
	}
}
