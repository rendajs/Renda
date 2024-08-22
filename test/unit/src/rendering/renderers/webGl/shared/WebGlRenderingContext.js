import { WebGlCommandLog } from "./WebGlCommandLog.js";

export class WebGlObject {}

export function createWebGlRenderingContext() {
	const commandLog = new WebGlCommandLog();

	/** @type {Map<string, number>} */
	let attributeLocations = new Map();

	const proxy = new Proxy({}, {
		get(target, prop, receiver) {
			if (typeof prop != "string") {
				return undefined;
			}
			if (prop.toUpperCase() == prop) {
				return "GL_" + prop;
			}
			if (prop == "getAttribLocation") {
				/** @type {WebGLRenderingContext["getAttribLocation"]} */
				const fn = (program, name) => {
					return attributeLocations.get(name) ?? -1;
				}
				return fn;
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
		/**
		 * @param {Object.<string, number>} locations
		 */
		setAttributeLocations(locations) {
			attributeLocations = new Map(Object.entries(locations));
		}
	};
}
