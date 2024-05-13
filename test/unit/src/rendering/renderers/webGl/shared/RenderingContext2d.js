export class RenderingContext2d {
	/**
	 * @param {CanvasImageSource} image
	 * @param {number} dx
	 * @param {number} dy
	 */
	drawImage(image, dx, dy) {}
}

/**
 * @param {{width: number, height: number}} canvas
 */
export function create2dRenderingContext(canvas) {
	const context = new RenderingContext2d();
	return context;
}
