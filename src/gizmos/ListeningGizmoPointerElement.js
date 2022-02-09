export class ListeningGizmoPointerElement {
	/**
	 * @param {import("./GizmoManager.js").GizmoManager} gizmoManager
	 * @param {HTMLElement} element
	 * @param {import("../mod.js").CameraComponent} camera
	 */
	constructor(gizmoManager, element, camera) {
		this.gizmoManager = gizmoManager;
		this.element = element;
		this.camera = camera;

		this.isListening = false;

		/** @type {Map<number, import("./GizmoPointerDevice.js").GizmoPointerDevice>} */
		this.createdPointerDevices = new Map();

		this.boundOnPointerEvent = this.onPointerEvent.bind(this);
	}

	addEventListeners() {
		this.isListening = true;
		this.element.addEventListener("pointermove", this.boundOnPointerEvent);
	}

	removeEventListeners() {
		this.isListening = false;
		this.element.removeEventListener("pointermove", this.boundOnPointerEvent);

		for (const device of this.createdPointerDevices.values()) {
			this.gizmoManager.destroyPointerDevice(device);
		}
		this.createdPointerDevices.clear();
	}

	/**
	 * @param {PointerEvent} e
	 */
	onPointerEvent(e) {
		if (!this.isListening) {
			throw new Error("Pointer events can only be fired while event listeners are added");
		}

		let device = this.createdPointerDevices.get(e.pointerId);
		if (!device) {
			device = this.gizmoManager.requestPointerDevice();
			this.createdPointerDevices.set(e.pointerId, device);
		}
		device.handle2dEvent(this.camera, this.element, e);
	}
}
