import Quat from "../Math/Quat.js";
import Vec3 from "../Math/Vec3.js";

export default class OrbitControls {
	constructor(cameraEntity, eventElement) {
		this.camera = cameraEntity;

		this.camTransformDirty = true;
		this._boundMarkTransformDirty = this.markTransformDirty.bind(this);
		this._lookPos = new Vec3();
		this._lookPos.onChange(this._boundMarkTransformDirty);
		this._lookRot = new Quat();
		this._lookRot.onChange(this._boundMarkTransformDirty);
		this._lookDist = 3;

		this.boundOnWheel = this.onWheel.bind(this);
		this.addedEventElements = [];
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
		this.camTransformDirty = true;
	}

	destructor() {
		for (const elem of this.addedEventElements) {
			elem.removeEventListener("wheel", this.boundOnWheel);
		}
		this.boundOnWheel = null;
	}

	addEventElement(elem) {
		this.addedEventElements.push(elem);
		elem.addEventListener("wheel", this.boundOnWheel);
	}

	onWheel(e) {
		e.preventDefault();
		const dx = e.deltaX;
		const dy = e.deltaY;
		if (e.ctrlKey) {
			this.lookDist += e.deltaY * 0.01;
		} else if (e.shiftKey) {
			const xDir = this.lookRot.rotateVector(Vec3.right).multiply(dx * 0.01);
			const yDir = this.lookRot.rotateVector(Vec3.up).multiply(-dy * 0.01);
			this.lookPos.add(xDir).add(yDir);
		} else {
			this.lookRot.rotateAxisAngle(new Vec3(0, 1, 0), dx * 0.01);
			const pitchAxis = this.lookRot.rotateVector(Vec3.right);
			this.lookRot.rotateAxisAngle(pitchAxis, e.deltaY * 0.01);
		}
	}

	loop() {
		if (this.camTransformDirty) {
			this.updateCamPos();
			this.camTransformDirty = false;
			return true;
		}
		return false;
	}

	updateCamPos() {
		const lookDir = this.lookRot.rotateVector(Vec3.back);
		this.camera.pos = lookDir.clone().multiply(2 ** this.lookDist).add(this.lookPos);
		this.camera.rot = this.lookRot.clone().invert();
	}
}
