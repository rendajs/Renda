import {getEditorInstanceCertain} from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import {ProjectAsset} from "../assets/ProjectAsset.js";
import {ContentWindowDefaultAssetLinks} from "../windowManagement/contentWindows/ContentWindowDefaultAssetLinks.js";
import {ContentWindowBuiltInAssets} from "../windowManagement/contentWindows/ContentWindowBuiltInAssets.js";
import {ContentWindowProject} from "../windowManagement/contentWindows/ContentWindowProject.js";

/**
 * @template {new (...args: any) => any} T
 * @typedef {Object} DroppableGuiOptionsType
 * @property {T[]} [supportedAssetTypes]
 */
/**
 * @template {new (...args: any) => any} T
 * @typedef {import("./PropertiesTreeView/types.js").GuiOptionsBase & DroppableGuiOptionsType<T>} DroppableGuiOptions
 */

/**
 * @template {boolean} U
 * @template {import("./PropertiesTreeView/types.js").TreeViewStructureOutputPurpose} V
 * @typedef {Object} DroppableGuiGetValueOptions
 * @property {boolean} [resolveDefaultAssetLinks = false]
 * @property {U} [returnLiveAsset = false]
 * @property {V} [purpose = "default"]
 */

/**
 * @template U
 * @template V
 * @typedef {Object} DroppableGuiGetValueOptionsNoConstraints
 * @property {boolean} [resolveDefaultAssetLinks]
 * @property {U} [returnLiveAsset]
 * @property {V} [purpose]
 */

/**
 * @template T
 * @template {boolean} [U = false]
 * @template {import("./PropertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
 * @typedef {V extends "script" ?
 * 		T? :
 * 		U extends true ?
 * 			T? :
 * 			import("../../../src/util/mod.js").UuidString?} DroppableGuiGetValueReturn
 */

/**
 * @template T
 * @typedef {T extends DroppableGuiOptions<any> ?
 * 		T["supportedAssetTypes"] extends (new (...args: any) => infer A)[] ?
 * 			A :
 * 			never :
 * 		never} GuiOptionsToTemplate
 */

/**
 * @template TOpts
 * @typedef {DroppableGui<GuiOptionsToTemplate<TOpts>>} GetGuiReturnTypeForOptions
 */

/**
 * @template TDroppableInstance
 * @template TOpts
 * @typedef {TOpts extends DroppableGuiGetValueOptionsNoConstraints<infer T, infer U> ?
 * 		import("./PropertiesTreeView/types.js").ReplaceUnknown<T, false> extends infer TDefaulted ?
 * 			TDefaulted extends boolean ?
 * 				import("./PropertiesTreeView/types.js").ReplaceUnknown<U, "default"> extends infer UDefaulted ?
 * 					UDefaulted extends import("./PropertiesTreeView/types.js").TreeViewStructureOutputPurpose ?
 * 						TDroppableInstance extends DroppableGui<infer TAssetType> ?
 * 							DroppableGuiGetValueReturn<TAssetType, TDefaulted, UDefaulted> :
 * 							never :
 * 						never :
 * 					never :
 * 				never :
 * 			never :
 * 		never} GetDroppableValueTypeForOptions
 */

/**
 * @template T
 */
export class DroppableGui {
	/**
	 * @template {new (...args: any) => any} T
	 * @param {DroppableGuiOptions<T>} opts
	 */
	static of(opts) {
		return /** @type {DroppableGui<InstanceType<T>>} */ (new DroppableGui(opts));
	}

	/**
	 * @typedef {(value: import("../../../src/mod.js").UuidString?) => void} OnValueChangeCallback
	 */

	/**
	 * @private
	 * @param {DroppableGuiOptions<new (...args: any) => any>} options
	 */
	constructor({
		supportedAssetTypes = [],
		// todo: default value support
		disabled = false,
	} = {}) {
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		/** @type {OnValueChangeCallback[]} */
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = /** @type {any[]} */ (supportedAssetTypes);

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

		/** @type {import("../../../src/util/mod.js").UuidString?}*/
		this.defaultAssetLinkUuid = null;
		/** @type {import("../assets/DefaultAssetLink.js").DefaultAssetLink?}*/
		this.defaultAssetLink = null;
		/** @type {import("../assets/ProjectAsset.js").ProjectAssetAny?}*/
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
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	/**
	 * @param {T | import("../../../src/mod.js").UuidString | import("../assets/ProjectAsset.js").ProjectAssetAny | null} value
	 */
	setValue(value) {
		let projectAsset = null;
		this.setDefaultAssetLinkUuid(null);
		if (value) {
			const assetManager = getEditorInstanceCertain().projectManager.assertAssetManagerExists();
			if (typeof value == "string") {
				this.setDefaultAssetLinkUuid(value);
				projectAsset = assetManager.getProjectAssetImmediate(value);
			} else if (value instanceof ProjectAsset) {
				projectAsset = value;
			} else {
				projectAsset = assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, false);
	}

	/**
	 * @template {boolean} [U = false]
	 * @template {import("./PropertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
	 * @param {DroppableGuiGetValueOptions<U, V>} options
	 * @returns {DroppableGuiGetValueReturn<T, U, V>}
	 */
	getValue({
		resolveDefaultAssetLinks = false,
		returnLiveAsset = /** @type {U} */ (false),
		purpose = /** @type {V} */ ("default"),
	} = {}) {
		if (purpose == "script") {
			returnLiveAsset = /** @type {U} */ (true);
		}
		let returnValue;
		if (returnLiveAsset) {
			returnValue = this.projectAssetValue?.getLiveAssetImmediate() || null;
		} else if (!resolveDefaultAssetLinks && this.defaultAssetLinkUuid) {
			returnValue = this.defaultAssetLinkUuid;
		} else {
			returnValue = this.projectAssetValue?.uuid;
		}
		return /** @type {DroppableGuiGetValueReturn<T, U, V>} */ (returnValue);
	}

	/**
	 * @param {T | import("../../../src/mod.js").UuidString | null} value
	 */
	set value(value) {
		this.setValue(value);
	}

	/**
	 * @returns {import("../../../src/mod.js").UuidString?}
	 */
	get value() {
		return this.getValue();
	}

	/**
	 * @param {import("../assets/ProjectAsset.js").ProjectAssetAny?} projectAsset
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

	/**
	 * @param {import("../../../src/util/mod.js").UuidString?} uuid
	 */
	async setValueFromAssetUuid(uuid, preloadLiveAsset = false) {
		if (!uuid) {
			this.setValueFromProjectAsset(null);
			this.value = null;
		} else {
			const assetManager = getEditorInstanceCertain().projectManager.assertAssetManagerExists();
			const projectAsset = await assetManager.getProjectAsset(uuid);
			await assetManager.makeAssetUuidConsistent(projectAsset);
			if (preloadLiveAsset) {
				// get the live asset so that it is loaded before this.value is accessed from the onValueChange callbacks
				await projectAsset?.getLiveAsset();
			}
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, false);
		}
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString?} uuid
	 */
	setDefaultAssetLinkUuid(uuid) {
		if (uuid) {
			this.defaultAssetLink = getEditorInstanceCertain().projectManager.assertAssetManagerExists().getDefaultAssetLink(uuid);
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

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.setAttribute("aria-disabled", disabled ? "true" : "false");
		if (disabled) {
			this.el.removeAttribute("tabIndex");
		} else {
			this.el.setAttribute("tabindex", "0");
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragStart(e) {
		const dragManager = getEditorInstanceCertain().dragManager;
		if (!e.dataTransfer) return;

		let assetUuid = null;
		if (this.defaultAssetLinkUuid) {
			assetUuid = this.defaultAssetLinkUuid;
		} else if (this.projectAssetValue) {
			assetUuid = this.projectAssetValue.uuid;
		}

		if (!assetUuid) return;

		const {el, x, y} = dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		e.dataTransfer.effectAllowed = "all";
		let assetType = null;
		if (this.projectAssetValue) {
			assetType = this.projectAssetValue.projectAssetTypeConstructor;
		}

		/** @type {import("../windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType,
			assetUuid,
		};
		const draggingDataUuid = dragManager.registerDraggingData(draggingData);
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
		if (this.currenDragFeedbackEl) getEditorInstanceCertain().dragManager.removeFeedbackText(this.currenDragFeedbackEl);
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
		if (!e.dataTransfer) return false;

		const hasValidMimeType = e.dataTransfer.types.some(mimeType => {
			const dragData = this.getDraggingProjectAssetData(mimeType);
			return this.validateMimeType(dragData);
		});
		if (hasValidMimeType) {
			e.dataTransfer.dropEffect = "link";
			e.preventDefault();
			return true;
		}
		return false;
	}

	/**
	 * @param {DragEvent} e
	 */
	onDrop(e) {
		e.preventDefault();
		this.setDragHoverValidStyle(false);
		if (!e.dataTransfer) return;

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
	 * @property {import("../windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} draggingProjectAssetData
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
					draggingProjectAssetData = getEditorInstanceCertain().dragManager.getDraggingData(parameters.draggingdata);
				}
			}
		}
		return {isEngineType, isProjectAsset, draggingProjectAssetData};
	}

	/**
	 * @param {boolean} valid
	 */
	setDragHoverValidStyle(valid) {
		this.el.classList.toggle("dragHovering", valid);
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	onKeyDown(e) {
		if (this.disabled) return;
		// Todo: use shortcutmanager
		if (e.code == "Backspace" || e.code == "Delete") {
			this.setValue(null);
		}
	}

	/**
	 * @param {MouseEvent} e
	 */
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
		const defaultAssetLink = this.defaultAssetLinkUuid;
		if (defaultAssetLink) {
			contextMenuStructure.push({
				text: copyAssetUuidText,
				onClick: async () => {
					if (this.projectAssetValue) {
						await navigator.clipboard.writeText(defaultAssetLink);
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
				const windowManager = getEditorInstanceCertain().windowManager;
				if (this.defaultAssetLink) {
					// todo: highlight assetLink
					// eslint-disable-next-line no-unused-vars
					const assetLinksWindow = windowManager.focusOrCreateContentWindow(ContentWindowDefaultAssetLinks);
				} else if (this.projectAssetValue) {
					let assetLinksWindow;
					if (this.projectAssetValue.isBuiltIn) {
						const contentWindow = windowManager.focusOrCreateContentWindow(ContentWindowBuiltInAssets);
						assetLinksWindow = /** @type {import("../windowManagement/contentWindows/ContentWindowBuiltInAssets.js").ContentWindowBuiltInAssets} */ (contentWindow);
					} else {
						const contentWindow = windowManager.focusOrCreateContentWindow(ContentWindowProject);
						assetLinksWindow = /** @type {import("../windowManagement/contentWindows/ContentWindowProject.js").ContentWindowProject} */ (contentWindow);
					}
					assetLinksWindow.highlightPath(this.projectAssetValue.path);
				}
			},
			disabled: this.projectAssetValueDeleted,
		});
		const menu = getEditorInstanceCertain().contextMenuManager.createContextMenu(contextMenuStructure);
		if (menu) {
			menu.setPos({x: e.pageX, y: e.pageY});
		}
	}

	get visibleAssetName() {
		return this.defaultAssetLink?.name || this.projectAssetValue?.fileName || "";
	}

	updateContent() {
		const filled = !!this.projectAssetValue && !this.projectAssetValueDeleted;
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
