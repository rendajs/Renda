export class PropertiesWindowContent {
	/**
	 * @param {import("../Studio.js").Studio} studioInstance
	 * @param {import("../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	constructor(studioInstance, windowManager) {
		this.studioInstance = studioInstance;
		this.windowManager = windowManager;

		this.el = document.createElement("div");
	}

	destructor() {
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	/**
	 * Override this with an array of types that this window content should be used for
	 * @returns {(new (...args: any) => any)[]?}
	 */
	static get useForTypes() {
		return null;
	}

	/**
	 * @param {any[]} selectedObjects
	 */
	activeObjectsChanged(selectedObjects) {}
}
