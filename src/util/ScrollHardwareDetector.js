/** @typedef {"unknown" | "mouse" | "touchpad"} ScrollHardwareType */
/** @typedef {(type: ScrollHardwareType) => void} OnEstimatedTypeChangeCallback */

/**
 * Monitors wheel events and tries to determine whether a touchpad or a mouse scrollwheel is used.
 * This can be used in combination with OrbitControls to automatically apply the desired `OrbitControls.scrollBehavior`.
 */
export class ScrollHardwareDetector {
	#betweenGesturesCooldownMs;

	/** @type {ScrollHardwareType} */
	#estimatedType = "unknown";
	get estimatedType() {
		return this.#estimatedType;
	}

	/** @type {Set<OnEstimatedTypeChangeCallback>} */
	#onEstimatedTypeChangeCbs = new Set();

	#lastWheelEventTime = -Infinity;
	/** @type {WheelEvent?} */
	#lastHandledWheelEvent = null;
	/**
	 * Whether we have determined the hardware type for the current scroll gesture.
	 * This becomes false again once an event is received more than `betweenGesturesCooldownMs` milliseconds after the previous event.
	 */
	#currentGestureDetermined = false;
	#currentGestureEventCount = 0;

	/**
	 * Monitors wheel events and tries to determine whether a touchpad or a mouse scrollwheel is used.
	 * This can be used in combination with OrbitControls to automatically apply the desired `OrbitControls.scrollBehavior`.
	 *
	 * # Usage
	 *
	 * ```js
	 * const orbitControls = new OrbitControls();
	 * const detector = new ScrollHardwareDetector();
	 * detector.onEstimatedTypeChange((type) => {
	 * 	if (type == "mouse") {
	 * 		orbitControls.scrollBehavior = "zoom";
	 * 	} else if (type == "touchpad") {
	 * 		orbitControls.scrollBehavior = "orbit";
	 * 	}
	 * })
	 * ```
	 *
	 * @param {object} options
	 * @param {number} [options.betweenGesturesCooldownMs] How long in milliseconds the user has to not scroll for
	 * a change in hardware type to be accepted.
	 * The idea here is that it takes at least half a second or so for the user to move their hand from the touchpad to the mouse.
	 * So once the user starts scrolling and a hardware type is determined, the estimated type won't rapidly change as the user is scrolling.
	 * Of course there is a chance that the user switched to another device within this cooldown, but this should be pretty rare.
	 *
	 * Note that this does not mean that the estimated type can't suddenly change mid gesture.
	 * When the first scroll events come rolling in, they may not contain enough information yet to determine a hardware type.
	 * In that case the estimated hardware type might still switch after a few events.
	 * But once that switch has been made, it is guaranteed to not suddenly switch back again until the user stops
	 * scrolling for a while.
	 */
	constructor({
		betweenGesturesCooldownMs = 350,
	} = {}) {
		this.#betweenGesturesCooldownMs = betweenGesturesCooldownMs;
		document.body.addEventListener("wheel", this.#onWheel, {
			passive: true,
		});
	}

	/**
	 * Removes all registered event listeners from the document.
	 */
	destructor() {
		document.body.removeEventListener("wheel", this.#onWheel);
	}

	/**
	 * When creating a new ScrollHardwareDetector, an event listener is automatically registered on `document.body`.
	 * However, this means that if you are listening for wheel events on another element and
	 * are acting upon them immediately, there's a good chance that `ScrollHardwareDetector.estimatedType` hasn't
	 * been updated yet. You can call this to immediately handle any wheel events.
	 * You can safely call this multiple times from different event listeners, the ScrollHardwareDetector
	 * ignores any duplicate events.
	 * @param {WheelEvent} event
	 */
	handleWheelEvent(event) {
		this.#onWheel(event);
	}

	/**
	 * @param {WheelEvent} e
	 */
	#onWheel = (e) => {
		if (e == this.#lastHandledWheelEvent) return;
		this.#lastHandledWheelEvent = e;
		if (performance.now() - this.#lastWheelEventTime > this.#betweenGesturesCooldownMs) {
			this.#currentGestureDetermined = false;
			this.#currentGestureEventCount = 0;
		}
		this.#lastWheelEventTime = performance.now();

		if (this.#currentGestureDetermined) return;

		this.#currentGestureEventCount++;

		if (e.deltaMode != WheelEvent.DOM_DELTA_PIXEL) {
			this.#setEstimatedType("mouse");
			this.#currentGestureDetermined = true;
		}

		// It seems like scrollwheel gestures from a mouse are pretty much always higher than 4.
		// On Chrome Windows it is at least 33.
		// On Firefox Windows it is at least 36
		// On Edge Windows it is at least 200
		// On Firefox macOS it is at least 16
		// On Chrome/Safari macOS it is awfully close to 4, but it's just about a bit higher than that.
		// On touchpads the delta MAY be higher than 4 when the user scrolls quickly,
		// so we'll want to set this check as high as possible to prevent touchpads getting detected as mouse.
		if (Math.abs(e.deltaY) <= 4) {
			this.#setEstimatedType("touchpad");
			this.#currentGestureDetermined = true;
		}
		if (Math.abs(e.deltaY) >= 10) {
			this.#setEstimatedType("mouse");
			this.#currentGestureDetermined = true;
		}
		if (e.deltaX) {
			this.#setEstimatedType("touchpad");
			this.#currentGestureDetermined = true;
		}
		if (this.#currentGestureEventCount > 7) {
			this.#setEstimatedType("mouse");
			this.#currentGestureDetermined = true;
		}
	};

	/**
	 * @param {ScrollHardwareType} type
	 */
	#setEstimatedType(type) {
		if (this.#currentGestureDetermined) return;
		if (type == this.#estimatedType) return;
		this.#estimatedType = type;
		this.#onEstimatedTypeChangeCbs.forEach((cb) => cb(type));
	}

	/**
	 * Registers a callback that fires when {@linkcode estimatedType} changes.
	 * @param {OnEstimatedTypeChangeCallback} cb
	 */
	onEstimatedTypeChange(cb) {
		this.#onEstimatedTypeChangeCbs.add(cb);
	}

	/**
	 * @param {OnEstimatedTypeChangeCallback} cb
	 */
	removeOnEstimatedTypeChange(cb) {
		this.#onEstimatedTypeChangeCbs.delete(cb);
	}
}
