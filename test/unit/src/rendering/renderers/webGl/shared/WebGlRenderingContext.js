import { WebGlCommandLog } from "./WebGlCommandLog.js";

export class WebGlObject {}

export function createWebGlRenderingContext() {
	const commandLog = new WebGlCommandLog();

	const proxy = new Proxy({}, {
		get(target, prop, receiver) {
			if (typeof prop != "string") {
				return undefined;
			}
			if (prop.toUpperCase() == prop) {
				return "GL_" + prop;
			}

			/**
			 * @param  {...unknown[]} args
			 */
			const spyFunction = (...args) => {
				const obj = new WebGlObject();
				commandLog.log.push({ name: prop, args, createdObject: obj });
				return obj;
			};
			return spyFunction;
		},
	});

	return {
		context: /** @type {WebGLRenderingContext} */ (proxy),
		commandLog,
	};
}
