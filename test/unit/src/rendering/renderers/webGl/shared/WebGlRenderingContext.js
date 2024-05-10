import { assertEquals } from "std/testing/asserts.ts";

export class WebGlCommandLog {
	/**
	 * @typedef CommandLogEntry
	 * @property {string} name
	 * @property {unknown[]} args
	 */

	/** @type {CommandLogEntry[]} */
	log = [];

	/**
	 * @param {number} count
	 */
	assertCount(count) {
		assertEquals(this.log.length, count);
	}
}

export function createWebGlRenderingContext() {
	const commandLog = new WebGlCommandLog();

	const proxy = new Proxy({}, {
		get(target, prop, receiver) {
			if (typeof prop != "string") {
				return undefined;
			}
			if (prop.toUpperCase() == prop) {
				return "WEBGL_CONSTANT_" + prop;
			}

			/**
			 * @param  {...unknown[]} args
			 */
			const spyFunction = (...args) => {
				commandLog.log.push({ name: prop, args });
			};
			return spyFunction;
		},
	});

	return {
		context: /** @type {WebGLRenderingContext} */ (proxy),
		commandLog,
	};
}
