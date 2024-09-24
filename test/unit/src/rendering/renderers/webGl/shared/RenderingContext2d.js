import { assertEquals } from "std/testing/asserts.ts";

export class RenderingContext2d {
	/**
	 * @param {CanvasImageSource} image
	 * @param {number} dx
	 * @param {number} dy
	 */
	drawImage(image, dx, dy) {}

	clearRect() {}
}

/** @type {RenderingContext2d[]} */
let created2dRenderingContexts = [];

/**
 * @param {{width: number, height: number}} canvas
 */
export function create2dRenderingContext(canvas) {
	const context = new RenderingContext2d();
	created2dRenderingContexts.push(context);
	return context;
}

export function assertHasSingle2dRenderingContext() {
	assertEquals(created2dRenderingContexts.length, 1, 'Expected to have exactly one canvas with getContext("2d")');
	return created2dRenderingContexts[0];
}

export function clearCreated2dRenderingContexts() {
	created2dRenderingContexts = [];
}
