import editor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import {ProjectAsset} from "../Assets/ProjectAsset.js";
import {ContentWindowDefaultAssetLinks} from "../WindowManagement/ContentWindows/ContentWindowDefaultAssetLinks.js";
import {ContentWindowBuiltInAssets} from "../WindowManagement/ContentWindows/ContentWindowBuiltInAssets.js";
import {ContentWindowProject} from "../WindowManagement/ContentWindows/ContentWindowProject.js";

/**
 * @typedef {Object} DroppableGuiOptionsType
 * @property {*[]} [supportedAssetTypes]
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & DroppableGuiOptionsType} DroppableGuiOptions
 */

export class DroppableGui {
	/**
	 * @param {DroppableGuiOptions} options
	 */
	constructor({
		supportedAssetTypes = [],
		// todo: default value support
		disabled = false,
	} = {}) {
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = supportedAssetTypes;

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.boundOnContextMenu = this.onContextMenu.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);
		this.el.addEventListener("contextmenu", this.boundOnContextMenu);

		/** @type {import("../Util/Util.js").UuidString}*/
		this.defaultAssetLinkUuid = null;
		/** @type {?import("../Assets/DefaultAssetLink.js").DefaultAssetLink}*/
		this.defaultAssetLink = null;
		/** @type {?ProjectAsset}*/
		this.projectAssetValue = null;
		/** @type {boolean}*/
		this.projectAssetValueDeleted = false;
		this.setValue(null);
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("dragstart", this.boundOnDragStart);
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragLeave);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.el.removeEventListener("keydown", this.boundOnKeyDown);
		this.el.removeEventListener("contextmenu", this.boundOnContextMenu);
		this.boundOnDragStart = null;
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDragLeave = null;
		this.boundOnDrop = null;
		this.boundOnKeyDown = null;
		this.boundOnContextMenu = null;
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setValue(value) {
		let projectAsset = null;
		this.setDefaultAssetLinkUuid(null);
		if (value) {
			if (typeof value == "string") {
				this.setDefaultAssetLinkUuid(value);
				projectAsset = editor.projectManager.assetManager.getProjectAssetImmediate(value);
			} else if (value instanceof ProjectAsset) {
				projectAsset = value;
			} else {
				projectAsset = editor.projectManager.assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, false);
	}

	/**
	 * @param {Object} opts
	 * @param {boolean} [opts.resolveDefaultAssetLinks]
	 * @param {boolean} [opts.returnLiveAsset]
	 * @param {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [opts.purpose]
	 */
	getValue({
		resolveDefaultAssetLinks = false,
		returnLiveAsset = false,
		purpose = "default",
	} = {}) {
		if (purpose == "script") {
			returnLiveAsset = true;
		}
		if (returnLiveAsset) {
			return this.projectAssetValue?.getLiveAssetImmediate() || null;
		} else if (!resolveDefaultAssetLinks && this.defaultAssetLinkUuid) {
			return this.defaultAssetLinkUuid;
		} else {
			return this.projectAssetValue?.uuid;
		}
	}

	set value(value) {
		this.setValue(value);
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {ProjectAsset} projectAsset
	 * @param {boolean} clearDefaultAssetLink
	 */
	setValueFromProjectAsset(projectAsset, clearDefaultAssetLink = true) {
		if (clearDefaultAssetLink) {
			this.defaultAssetLinkUuid = null;
			this.defaultAssetLink = null;
		}
		this.projectAssetValue = projectAsset;

		this.fireValueChange();
		this.updateContent();
		this.updateDeletedState();
	}

	async updateDeletedState() {
		this.projectAssetValueDeleted = false;
		if (this.projectAssetValue) {
			this.projectAssetValueDeleted = await this.projectAssetValue.getIsDeleted();
		}
		this.updateContent();
	}

	async setValueFromAssetUuid(uuid, preloadLiveAsset = false) {
		if (!uuid) {
			this.setValueFromProjectAsset(null);
			this.value = null;
		} else {
			const projectAsset = await editor.projectManager.assetManager.getProjectAsset(uuid);
			await editor.projectManager.assetManager.makeAssetUuidConsistent(projectAsset);
			if (preloadLiveAsset) {
				// get the live asset so that it is loaded before this.value is accessed from the onValueChange callbacks
				await projectAsset?.getLiveAsset();
			}
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, false);
		}
	}

	setDefaultAssetLinkUuid(uuid) {
		if (uuid) {
			this.defaultAssetLink = editor.projectManager.assetManager.getDefaultAssetLink(uuid);
		} else {
			this.defaultAssetLink = null;
		}
		if (this.defaultAssetLink) {
			this.defaultAssetLinkUuid = uuid;
		} else {
			this.defaultAssetLink = null;
			this.defaultAssetLinkUuid = null;
		}
	}

	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.setAttribute("aria-disabled", disabled);
		if (disabled) {
			this.el.removeAttribute("tabIndex");
		} else {
			this.el.setAttribute("tabindex", "0");
		}
	}

	onDragStart(e) {
		const {el, x, y} = editor.dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		e.dataTransfer.effectAllowed = "all";
		const assetType = editor.projectAssetTypeManager.getAssetType(this.projectAssetValue.assetType);
		const assetUuid = this.defaultAssetLinkUuid || this.projectAssetValue.uuid;

		/** @type {import("../WindowManagement/ContentWindows/ContentWindowProject.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType,
			assetUuid,
		};
		const draggingDataUuid = editor.dragManager.registerDraggingData(draggingData);
		e.dataTransfer.setData(`text/jj; dragtype=projectasset; draggingdata=${draggingDataUuid}`, "");
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragEnter(e) {
		const valid = this.handleDrag(e) && !this.disabled;
		if (valid) {
			this.setDragHoverValidStyle(true);
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragOver(e) {
		this.handleDrag(e);
	}

	onDragEnd() {
		if (this.currenDragFeedbackEl) editor.dragManager.removeFeedbackText(this.currenDragFeedbackEl);
		this.currenDragFeedbackEl = null;
	}

	onDragLeave() {
		this.setDragHoverValidStyle(false);
	}

	/**
	 * @param {DragEvent} e
	 * @returns {boolean} True if the dragged element is valid for this gui.
	 */
	handleDrag(e) {
		if (this.disabled) return false;
		if (e.dataTransfer.types.some(mimeType => {
			const dragData = this.getDraggingProjectAssetData(mimeType);
			return this.validateMimeType(dragData);
		})) {
			e.dataTransfer.dropEffect = "link";
			e.preventDefault();
			return true;
		}
		return false;
	}

	onDrop(e) {
		e.preventDefault();
		this.setDragHoverValidStyle(false);
		for (const mimeType of e.dataTransfer.types) {
			const dragData = this.getDraggingProjectAssetData(mimeType);
			if (this.validateMimeType(dragData)) {
				const assetUuid = dragData.draggingProjectAssetData.assetUuid;
				this.setValueFromAssetUuid(assetUuid, true);
				break;
			}
		}
	}

	/**
	 * @param {ParsedDraggingProjectAssetData} dragData
	 * @returns {boolean}
	 */
	validateMimeType(dragData) {
		if (dragData.isEngineType) {
			if (this.supportedAssetTypes.length <= 0) return true;
			if (dragData.isProjectAsset) {
				if (this.supportedAssetTypes.includes(ProjectAsset)) return true;

				if (dragData.draggingProjectAssetData.dataPopulated) {
					const assetType = dragData.draggingProjectAssetData.assetType;
					if (assetType && assetType.expectedLiveAssetConstructor) {
						return this.supportedAssetTypes.includes(assetType.expectedLiveAssetConstructor);
					}
				}
			}
		}
		return false;
	}

	/**
	 * @typedef {Object} ParsedDraggingProjectAssetData
	 * @property {boolean} isEngineType
	 * @property {boolean} isProjectAsset
	 * @property {import("../WindowManagement/ContentWindows/ContentWindowProject.js").DraggingProjectAssetData} draggingProjectAssetData
	 */

	/**
	 * @param {string} mimeType
	 * @returns {ParsedDraggingProjectAssetData}
	 */
	getDraggingProjectAssetData(mimeType) {
		const parsed = parseMimeType(mimeType);
		let isEngineType = false;
		let isProjectAsset = false;
		let draggingProjectAssetData = null;
		if (parsed) {
			const {type, subType, parameters} = parsed;
			isEngineType = (type == "text" && subType == "jj");
			if (isEngineType) {
				isProjectAsset = (parameters.dragtype == "projectasset");
				if (isProjectAsset) {
					draggingProjectAssetData = editor.dragManager.getDraggingData(parameters.draggingdata);
				}
			}
		}
		return {isEngineType, isProjectAsset, draggingProjectAssetData};
	}

	setDragHoverValidStyle(valid) {
		this.el.classList.toggle("dragHovering", valid);
	}

	onKeyDown(e) {
		if (this.disabled) return;
		if (e.code == "Backspace" || e.code == "Delete") {
			this.setValue(null);
		}
	}

	onContextMenu(e) {
		e.preventDefault();
		if (!this.projectAssetValue) return;
		/** @type {import("./ContextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [];
		if (!this.disabled) {
			contextMenuStructure.push({
				text: "Unlink",
				onClick: () => {
					this.setValue(null);
				},
			});
		}
		const copyAssetUuidText = "Copy asset UUID";
		if (this.defaultAssetLinkUuid) {
			contextMenuStructure.push({
				text: copyAssetUuidText,
				onClick: async () => {
					if (this.projectAssetValue) {
						await navigator.clipboard.writeText(this.defaultAssetLinkUuid);
					}
				},
			});
		}
		const resolvedText = this.defaultAssetLinkUuid ? "Copy resolved asset link UUID" : copyAssetUuidText;
		contextMenuStructure.push({
			text: resolvedText,
			onClick: async () => {
				if (this.projectAssetValue) {
					await navigator.clipboard.writeText(this.projectAssetValue.uuid);
				}
			},
		});
		contextMenuStructure.push({
			text: "View location",
			onClick: async () => {
				if (this.defaultAssetLink) {
					// todo: highlight assetLink
					// eslint-disable-next-line no-unused-vars
					const assetLinksWindow = editor.windowManager.focusOrCreateContentWindow(ContentWindowDefaultAssetLinks);
				} else if (this.projectAssetValue) {
					let assetLinksWindow;
					if (this.projectAssetValue.isBuiltIn) {
						const contentWindow = editor.windowManager.focusOrCreateContentWindow(ContentWindowBuiltInAssets);
						assetLinksWindow = /** @type {import("../WindowManagement/ContentWindows/ContentWindowBuiltInAssets.js").ContentWindowBuiltInAssets} */ (contentWindow);
					} else {
						const contentWindow = editor.windowManager.focusOrCreateContentWindow(ContentWindowProject);
						assetLinksWindow = /** @type {import("../WindowManagement/ContentWindows/ContentWindowProject.js").ContentWindowProject} */ (contentWindow);
					}
					assetLinksWindow.highlightPath(this.projectAssetValue.path);
				}
			},
			disabled: this.projectAssetValueDeleted,
		});
		const menu = editor.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos({x: e.pageX, y: e.pageY});
	}

	get visibleAssetName() {
		return this.defaultAssetLink?.name || this.projectAssetValue?.fileName || "";
	}

	updateContent() {
		const filled = this.projectAssetValue && !this.projectAssetValueDeleted;
		this.el.classList.toggle("empty", !filled);
		this.el.classList.toggle("filled", filled);
		if (!this.projectAssetValueDeleted) {
			this.el.textContent = this.visibleAssetName;
		} else {
			while (this.el.firstChild) {
				this.el.removeChild(this.el.firstChild);
			}
			const deletedText = document.createElement("span");
			deletedText.textContent = "Deleted";
			deletedText.classList.add("droppableGuiDeletedText");
			this.el.appendChild(deletedText);
			if (this.visibleAssetName) {
				this.el.appendChild(document.createTextNode(" (" + this.visibleAssetName + ")"));
			}
		}
		this.el.draggable = (this.projectAssetValue && !this.projectAssetValueDeleted) || !!this.defaultAssetLink;
	}
}
