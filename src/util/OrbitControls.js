import { DEBUG_INCLUDE_ERROR_MESSAGES, DEBUG_INCLUDE_ERROR_THROWS } from "../engineDefines.js";
import { Quat } from "../math/Quat.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { neverNoOp } from "./neverNoOp.js";
import { clamp } from "./util.js";

/** @typedef {"auto" | "zoom" | "orbit"} OrbitControlsScrollBehavior */

export class OrbitControls {
	/** @type {OrbitControlsScrollBehavior} */
	#scrollBehavior = "auto";

	/**
	 * The behaviour of the scrollwheel.
	 * - `"auto"` Automatically detects the desired behavior based on the `ScrollHardwareDetector`
	 * that was provided in the constructor.
	 * - `"zoom"` is recommended when a physical mousewheel is used.
	 * The camera moves forwards and backwards when scrolling.
	 * Since the user is using a mouse, they can likely orbit the camera using middle mouse button instead.
	 * - `"orbit"` is recommended when a precision touchpad is used.
	 * The user typically scrolls pages using gestures with two finger,
	 * and scroll events often contain scroll information from two axes.
	 * This mode allows the user to orbit the camera using this gesture,
	 * and moving the camera forwards and backwards can be achieved using a
	 * pinch gesture or by holding the ctrl key.
	 */
	get scrollBehavior() {
		return this.#scrollBehavior;
	}

	set scrollBehavior(value) {
		if (DEBUG_INCLUDE_ERROR_THROWS && value == "auto" && !this.#scrollHardwareDetector) {
			if (DEBUG_INCLUDE_ERROR_MESSAGES) {
				throw new Error("Can't set scrollBehavior to 'auto' because `scrollHardwareDetector` was explicitly set to null in the constructor.");
			} else {
				throw new Error();
			}
		}
		this.#scrollBehavior = value;
	}

	#scrollHardwareDetector;

	/**
	 * @param {import("../core/Entity.js").Entity} cameraEntity The camera that needs to be moved.
	 * @param {object} options
	 * @param {HTMLElement} [options.eventElement] Providing this value is equivalent to calling `orbitControls.addEventElement()`.
	 * @param {import("./ScrollHardwareDetector.js").ScrollHardwareDetector?} options.scrollHardwareDetector If you plan on creating multiple OrbitControls instances,
	 * you should reuse a single ScrollHardwareDetector instance for a better user experience.
	 * This ScrollHardwareDetector is used for detecting the desired scroll behavior when
	 * {@linkcode scrollBehavior} is set to `"auto"` (which is the default).
	 * You may also explicitly set this to `null` if you know in advance that you won't
	 * be setting it to `"auto"`, but you should set `scrollBehavior` to something other
	 * than `"auto"` in these OrbitControls constructor options, otherwise an error will be thrown.
	 * @param {OrbitControlsScrollBehavior} [options.scrollBehavior] See {@linkcode scrollBehavior}.
	 */
	constructor(cameraEntity, {
		eventElement,
		scrollHardwareDetector,
		scrollBehavior,
	}) {
		this.#scrollHardwareDetector = scrollHardwareDetector;
		this.camera = cameraEntity;

		this.invertScrollX = false;
		this.invertScrollY = false;

		/** @private */
		this._camTransformDirty = true;
		/** @private */
		this._boundMarkTransformDirty = this.markTransformDirty.bind(this);
		/** @private */
		this._lookPos = new Vec3();
		this._lookPos.onChange(this._boundMarkTransformDirty);
		/** @private */
		this._lookRot = new Quat();
		this._lookRot.onChange(this._boundMarkTransformDirty);
		/** @private */
		this._lookDist = 3;

		/** @private */
		this._boundOnWheel = this._onWheel.bind(this);
		/** @private */
		this._boundOnPointerDown = this._onPointerDown.bind(this);
		/** @private */
		this._registeredClickDraggingEvents = false;
		/** @private */
		this._boundBodyOnPointerUp = this._bodyOnPointerUp.bind(this);
		/** @private */
		this._boundBodyOnPointerMove = this._bodyOnPointerMove.bind(this);
		this._lastPointerPos = new Vec2();

		if (!this.#scrollHardwareDetector && DEBUG_INCLUDE_ERROR_THROWS) {
			if (DEBUG_INCLUDE_ERROR_MESSAGES) {
				if (!scrollBehavior) {
					throw new Error("scrollHardwareDetector was set to null but no scrollBehavior was configured. Set `scrollBehavior` to something other than 'auto' (which is the default).");
				} else if (scrollBehavior == "auto") {
					throw new Error("scrollBehavior was set to 'auto' but scrollHardwareDetector was explicitly set to null. Automatic scroll mode detection requires a ScrollHardwareDetector.");
				}
			} else {
				throw new Error();
			}
		}
		this.scrollBehavior = scrollBehavior || "auto";

		/** @private @type {HTMLElement[]} */
		this._addedEventElements = [];
		if (eventElement) this.addEventElement(eventElement);
	}

	get lookPos() {
		return this._lookPos;
	}

	set lookPos(val) {
		this._lookPos.set(val);
	}

	get lookRot() {
		return this._lookRot;
	}

	set lookRot(val) {
		this._lookRot.set(val);
	}

	get lookDist() {
		return this._lookDist;
	}

	set lookDist(val) {
		this._lookDist = val;
		this.markTransformDirty();
	}

	markTransformDirty() {
		this._camTransformDirty = true;
	}

	destructor() {
		for (const elem of this._addedEventElements) {
			elem.removeEventListener("wheel", this._boundOnWheel);
		}
	}

	/**
	 * @param {HTMLElement} elem
	 */
	addEventElement(elem) {
		this._addedEventElements.push(elem);
		elem.addEventListener("wheel", this._boundOnWheel, { passive: false });
		elem.addEventListener("pointerdown", this._boundOnPointerDown);
	}

	/**
	 * Translates, rotates, or changes the lookDist depending on modifier keys used.
	 * @param {number} deltaX
	 * @param {number} deltaY
	 * @param {MouseEvent} event
	 */
	_inputOffset(deltaX, deltaY, event, forceZoom = false) {
		if (event.ctrlKey || forceZoom) {
			this.lookDist += deltaY * 0.01;
		} else if (event.shiftKey) {
			const xDir = Vec3.right.rotate(this.lookRot).multiply(deltaX * 0.01);
			const yDir = Vec3.up.rotate(this.lookRot).multiply(-deltaY * 0.01);
			this.lookPos.add(xDir).add(yDir);
		} else {
			this.lookRot.rotateAxisAngle(new Vec3(0, 1, 0), deltaX * 0.01);
			const pitchAxis = Vec3.right.rotate(this.lookRot);
			this.lookRot.rotateAxisAngle(pitchAxis, deltaY * 0.01);
		}
	}

	/**
	 * @private
	 * @param {WheelEvent} e
	 */
	_onWheel(e) {
		let dx = e.deltaX;
		let dy = e.deltaY;
		if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
			dx *= 8;
			dy *= 8;
		} else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
			dx *= 36;
			dy *= 36;
		}
		e.preventDefault();
		if (this.#scrollHardwareDetector) {
			this.#scrollHardwareDetector.handleWheelEvent(e);
		}
		let behavior = this.#scrollBehavior;
		if (behavior == "auto") {
			if (!this.#scrollHardwareDetector) {
				if (DEBUG_INCLUDE_ERROR_THROWS) {
					if (DEBUG_INCLUDE_ERROR_MESSAGES) {
						throw new Error("Assertion failed, behavior is auto without a hardware detector");
					} else {
						throw new Error();
					}
				} else {
					neverNoOp();
				}
			}
			if (this.#scrollHardwareDetector.estimatedType == "touchpad") {
				behavior = "orbit";
			} else {
				behavior = "zoom";
			}
		}
		if (behavior == "zoom") {
			dy = clamp(dy, -36, 36);
			this._inputOffset(0, dy, e, true);
		} else if (behavior == "orbit") {
			dx = this.invertScrollX ? -dx : dx;
			dy = this.invertScrollY ? -dy : dy;
			this._inputOffset(dx, dy, e);
		}
	}

	/**
	 * @private
	 * @param {PointerEvent} e
	 */
	_onPointerDown(e) {
		if (e.button != 1) return;
		this._lastPointerPos.set(e.clientX, e.clientY);
		document.body.setPointerCapture(e.pointerId);
		this._setClickDraggingEventsRegistered(true);
	}

	/**
	 * @param {boolean} registered
	 */
	_setClickDraggingEventsRegistered(registered) {
		if (registered == this._registeredClickDraggingEvents) return;
		this._registeredClickDraggingEvents = registered;
		if (registered) {
			document.body.addEventListener("pointerup", this._boundBodyOnPointerUp);
			document.body.addEventListener("pointermove", this._boundBodyOnPointerMove);
		} else {
			document.body.removeEventListener("pointerup", this._boundBodyOnPointerUp);
			document.body.removeEventListener("pointermove", this._boundBodyOnPointerMove);
		}
	}

	/**
	 * @private
	 */
	_bodyOnPointerUp() {
		this._setClickDraggingEventsRegistered(false);
	}

	/**
	 * @private
	 * @param {PointerEvent} e
	 */
	_bodyOnPointerMove(e) {
		const newPos = new Vec2(e.clientX, e.clientY);
		const delta = newPos.clone().sub(this._lastPointerPos);
		this._lastPointerPos.set(newPos);
		this._inputOffset(-delta.x, -delta.y, e);
	}

	loop() {
		if (this._camTransformDirty) {
			this.updateCamPos();
			this._camTransformDirty = false;
			return true;
		}
		return false;
	}

	updateCamPos() {
		const lookDir = Vec3.forward.rotate(this.lookRot);
		this.camera.pos = lookDir.clone().multiply(2 ** this.lookDist).add(this.lookPos);
		this.camera.rot = this.lookRot.clone();
	}
}
