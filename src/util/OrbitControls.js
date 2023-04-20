import {Quat} from "../math/Quat.js";
import {Vec3} from "../math/Vec3.js";

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
		this._boundOnWheel = this.onWheel.bind(this);
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
		elem.addEventListener("wheel", this._boundOnWheel);
	}

	/**
	 * @private
	 * @param {WheelEvent} e
	 */
	onWheel(e) {
		e.preventDefault();
		const dx = this.invertScrollX ? e.deltaX : -e.deltaX;
		const dy = this.invertScrollY ? e.deltaY : -e.deltaY;
		if (e.ctrlKey) {
			this.lookDist -= dy * 0.01;
		} else if (e.shiftKey) {
			const xDir = Vec3.right.rotate(this.lookRot).multiply(-dx * 0.01);
			const yDir = Vec3.up.rotate(this.lookRot).multiply(dy * 0.01);
			this.lookPos.add(xDir).add(yDir);
		} else {
			this.lookRot.rotateAxisAngle(new Vec3(0, 1, 0), dx * 0.01);
			const pitchAxis = Vec3.right.rotate(this.lookRot);
			this.lookRot.rotateAxisAngle(pitchAxis, dy * 0.01);
		}
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
		const lookDir = Vec3.back.rotate(this.lookRot);
		this.camera.pos = lookDir.clone().multiply(2 ** this.lookDist).add(this.lookPos);
		this.camera.rot = this.lookRot.clone();
	}
}
