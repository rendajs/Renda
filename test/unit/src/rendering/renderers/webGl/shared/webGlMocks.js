import { create2dRenderingContext } from "./RenderingContext2d.js";
import { createWebGlRenderingContext } from "./WebGlRenderingContext.js";

const oldDocument = globalThis.document;
let installed = false;

/** @type {{canvas: HTMLCanvasElement, context: WebGLRenderingContext, commandLog: import("./WebGlCommandLog.js").WebGlCommandLog}[]} */
let createdContexts = [];

export function installWebGlMocks() {
	if (installed) {
		throw new Error("WebGL mocks have already been installed.");
	}
	webGlContextSupported = true;
	context2dSupported = true;
	createdContexts = [];
	globalThis.document = /** @type {Document} */ ({
		/**
		 * @param {string} tagName
		 */
		createElement(tagName) {
			if (tagName.toLowerCase() != "canvas") {
				throw new Error("Only canvas elements can be created with WebGL mocks installed.");
			}

			let contextRequested = false;
			const canvas = /** @type {HTMLCanvasElement} */ ({
				width: 300,
				height: 150,
				getContext(contextId) {
					if (contextRequested) {
						throw new Error("Context has already been requested for this canvas");
					}
					contextRequested = true;
					if (contextId == "webgl") {
						if (!webGlContextSupported) return null;
						const { context, commandLog } = createWebGlRenderingContext();
						createdContexts.push({ canvas, context, commandLog });
						return context;
					} else if (contextId == "2d") {
						if (!context2dSupported) return null;
						return create2dRenderingContext(canvas);
					} else {
						throw new Error("Unexpected canvas context: " + contextId);
					}
				},
			});
			return canvas;
		},
	});
	installed = true;
}

export function uninstallWebGlMocks() {
	globalThis.document = oldDocument;
	installed = false;
}

/**
 * @param {() => Promise<void>} cb
 */
export async function runWithWebGlMocksAsync(cb) {
	installWebGlMocks();
	try {
		await cb();
	} finally {
		uninstallWebGlMocks();
	}
}

let webGlContextSupported = false;
/**
 * Sets whether HTMLCanvasElement.getContext("webgl") should return a webgl context or null.
 * @param {boolean} supported
 */
export function setWebGlContextSupported(supported) {
	webGlContextSupported = supported;
}

let context2dSupported = false;
/**
 * Sets whether HTMLCanvasElement.getContext("2d") should return a rendering context or null.
 * @param {boolean} supported
 */
export function set2dContextSupported(supported) {
	context2dSupported = supported;
}

export function assertHasSingleContext() {
	if (createdContexts.length != 1) {
		throw new Error("Expected exactly one webgl context to be created");
	}
	return createdContexts[0];
}
