export class PropertiesWindowContent {
	/**
	 * @param {import("../Editor.js").Editor} editorInstance
	 * @param {import("../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	constructor(editorInstance, windowManager) {
		this.editorInstance = editorInstance;
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
	selectionChanged(selectedObjects) {}
}
