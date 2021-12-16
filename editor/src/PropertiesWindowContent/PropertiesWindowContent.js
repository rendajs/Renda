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
		if (this.el) {
			if (this.el.parentElement) {
				this.el.parentElement.removeChild(this.el);
			}
			this.el = null;
		}
	}

	// Override this with a array of types that this window content should be used for
	static get useForTypes() {
		return null;
	}

	selectionChanged(selectedObjects) {}
}
