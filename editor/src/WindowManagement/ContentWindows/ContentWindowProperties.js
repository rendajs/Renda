import {ContentWindow} from "./ContentWindow.js";
import editor from "../../editorInstance.js";

export class ContentWindowProperties extends ContentWindow {
	static contentWindowTypeId = "properties";
	static contentWindowUiName = "Properties";
	static contentWindowUiIcon = "icons/contentWindowTabs/properties.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.activeSelectionManager = null;
		this.activeContent = null;
	}

	destructor() {
		super.destructor();
		this.activeSelectionManager = null;
		if (this.activeContent) this.activeContent.destructor();
		this.activeContent = null;
	}

	onContentTypeRegistered(constructor) {
		this.updateCurrentContentType();
	}

	onSelectionChanged(selectionManager) {
		this.activeSelectionManager = selectionManager;
		this.updateCurrentContentType();
	}

	updateCurrentContentType() {
		if (!this.activeSelectionManager) return;
		const selectedObjects = this.activeSelectionManager.currentSelectedObjects;

		const PropertiesWindowContent = editor.propertiesWindowContentManager.getContentTypeForObjects(selectedObjects);
		if (!this.activeContent || this.activeContent.constructor != PropertiesWindowContent) {
			if (this.activeContent) this.activeContent.destructor();
			this.activeContent = new PropertiesWindowContent();
			this.contentEl.appendChild(this.activeContent.el);
		}

		this.activeContent.selectionChanged(selectedObjects);
	}
}
