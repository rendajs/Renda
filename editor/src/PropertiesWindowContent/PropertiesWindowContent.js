export default class PropertiesWindowContent {
	constructor() {
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
