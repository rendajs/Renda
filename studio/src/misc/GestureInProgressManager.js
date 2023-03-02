/**
 * When a mouse hovers over an iframe on the page,
 * any mousemove events that would normally fire on our window are not fired.
 * But sometimes we need these events when resizing windows or dragging objects for instance.
 * We can notify the GestureInProgressManager from any started or stopped gestures,
 * so that things like iframes can be temporarily disabled during gestures.
 */
export class GestureInProgressManager {
	/** @type {Set<symbol>} */
	#currentGestures = new Set();
	#gestureInProgress = false;

	get gestureInProgress() {
		return this.#gestureInProgress;
	}

	/** @typedef {(gestureInProgress: boolean) => void} OnGestureInProgressChangeCallback */
	/** @type {Set<OnGestureInProgressChangeCallback>} */
	#onGestureInProgressChangeCallbacks = new Set();

	/**
	 * Notifies the GestureInProgressManager of a new gesture.
	 * This temporarily disables all iframes in order to prevent them from capturing mouse events.
	 */
	startGesture() {
		const gesture = Symbol("gesture");
		this.#currentGestures.add(gesture);
		this.#updateHasActiveGesture();

		const stopGesture = () => {
			this.#currentGestures.delete(gesture);
			this.#updateHasActiveGesture();
		};

		return {stopGesture};
	}

	#updateHasActiveGesture() {
		const gestureInProgress = this.#currentGestures.size > 0;
		if (gestureInProgress != this.#gestureInProgress) {
			this.#gestureInProgress = gestureInProgress;
			this.#onGestureInProgressChangeCallbacks.forEach(cb => cb(gestureInProgress));
		}
	}

	/** @param {OnGestureInProgressChangeCallback} cb */
	onGestureInProgressChange(cb) {
		this.#onGestureInProgressChangeCallbacks.add(cb);
		cb(this.#gestureInProgress);
	}

	/** @param {OnGestureInProgressChangeCallback} cb */
	removeOnGestureInProgressChange(cb) {
		this.#onGestureInProgressChangeCallbacks.delete(cb);
	}
}
