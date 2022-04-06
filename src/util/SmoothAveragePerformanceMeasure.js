import {lerp} from "./util.js";

/**
 * Utility class for measuring performance accross multiple frames.
 * Create a new instance once, then at every frame call
 * `PerformanceMeasure.start()` and `PerformanceMeasure.end()`.
 * You can monitor the smooth average of the duration using
 * `PerformanceMeasure.smoothDuration`.
 */
export class SmoothAveragePerformanceMeasure {
	/**
	 * @param {Object} options
	 * @param {string?} [options.label]
	 * @param {number} [options.smoothness]
	 */
	constructor({
		label = null,
		smoothness = 0.98,
	} = {}) {
		this.label = label;

		this.isRunning = false;
		this.lastStartTime = 0;

		this.smootness = smoothness;
		this.smoothDuration = 0;
	}

	start() {
		if (this.isRunning) return;

		this.isRunning = true;
		this.lastStartTime = performance.now();
	}

	end() {
		if (!this.isRunning) return;

		const deltaTime = performance.now() - this.lastStartTime;
		this.isRunning = false;
		this.smoothDuration = lerp(deltaTime, this.smoothDuration, this.smootness);
	}

	get [Symbol.toStringTag]() {
		const labelText = this.label || "PerformanceMeasure";
		const durationText = Math.round(this.smoothDuration * 100) / 100;
		return `<${labelText} ${durationText}>`;
	}
}
