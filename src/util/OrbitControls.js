import { Quat } from "../math/Quat.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";

export class OrbitControls {
	/**
	 * @param {import("../core/Entity.js").Entity} cameraEntity
	 * @param {HTMLElement} [eventElement]
	 */
	constructor(cameraEntity, eventElement) {
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
	_inputOffset(deltaX, deltaY, event) {
		if (event.ctrlKey) {
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
		e.preventDefault();
		const dx = this.invertScrollX ? -e.deltaX : e.deltaX;
		const dy = this.invertScrollY ? -e.deltaY : e.deltaY;
		this._inputOffset(dx, dy, e);
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
