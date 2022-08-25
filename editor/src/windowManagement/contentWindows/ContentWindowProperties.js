import {ContentWindow} from "./ContentWindow.js";

export class ContentWindowProperties extends ContentWindow {
	static contentWindowTypeId = "properties";
	static contentWindowUiName = "Properties";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/properties.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		/** @private @type {unknown[]} */
		this.activeObjects = [];
		/** @type {import("../../propertiesWindowContent/PropertiesWindowContent.js").PropertiesWindowContent?} */
		this.activeContent = null;

		this.boundOnSelectionChanged = this.onSelectionChanged.bind(this);
		this.editorInstance.selectionManager.onSelectionChange(this.boundOnSelectionChanged);
	}

	destructor() {
		super.destructor();
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
		this.setActiveObjects(changeData.activeSelectionGroup.currentSelectedObjects);
	}

	/**
	 * @param {unknown[]} objects
	 */
	setActiveObjects(objects) {
		this.activeObjects = [...objects];
		this.updateCurrentContentType();
	}

	updateCurrentContentType() {
		const PropertiesWindowContent = this.editorInstance.propertiesWindowContentManager.getContentTypeForObjects(this.activeObjects);
		if (!this.activeContent || this.activeContent.constructor != PropertiesWindowContent) {
			if (this.activeContent) this.activeContent.destructor();
			this.activeContent = new PropertiesWindowContent(this.editorInstance, this.windowManager);
			this.contentEl.appendChild(this.activeContent.el);
		}

		this.activeContent.activeObjectsChanged([...this.activeObjects]);
	}
}
