import {ContentWindow} from "./ContentWindow.js";

export class ContentWindowProperties extends ContentWindow {
	static contentWindowTypeId = "properties";
	static contentWindowUiName = "Properties";
	static contentWindowUiIcon = "icons/contentWindowTabs/properties.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.activeSelectionGroup = null;
		/** @type {import("../../propertiesWindowContent/PropertiesWindowContent.js").PropertiesWindowContent?} */
		this.activeContent = null;

		this.boundOnSelectionChanged = this.onSelectionChanged.bind(this);
		this.editorInstance.selectionManager.onSelectionChange(this.boundOnSelectionChanged);
	}

	destructor() {
		super.destructor();
		this.activeSelectionGroup = null;
		if (this.activeContent) this.activeContent.destructor();
		this.activeContent = null;
		this.editorInstance.selectionManager.removeOnSelectionChange(this.boundOnSelectionChanged);
	}

	onContentTypeRegistered() {
		this.updateCurrentContentType();
	}

	/**
	 * @param {import("../../misc/SelectionManager.js").SelectionChangeData} changeData
	 */
	onSelectionChanged(changeData) {
		if (!this.isMostSuitableContentWindow()) return;
		this.activeSelectionGroup = changeData.activeSelectionGroup;
		this.updateCurrentContentType();
	}

	updateCurrentContentType() {
		if (!this.activeSelectionGroup) return;
		const selectedObjects = this.activeSelectionGroup.currentSelectedObjects;

		const PropertiesWindowContent = this.editorInstance.propertiesWindowContentManager.getContentTypeForObjects(selectedObjects);
		if (!this.activeContent || this.activeContent.constructor != PropertiesWindowContent) {
			if (this.activeContent) this.activeContent.destructor();
			this.activeContent = new PropertiesWindowContent(this.editorInstance, this.windowManager);
			this.contentEl.appendChild(this.activeContent.el);
		}

		this.activeContent.selectionChanged(selectedObjects);
	}
}
