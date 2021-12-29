import {createRequire} from "https://deno.land/std@0.119.0/node/module.ts";

const require = createRequire(import.meta.url);
const closureCompiler = require("google-closure-compiler");

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
