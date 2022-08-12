import {getEditorInstance} from "../editorInstance.js";
import {parseMimeType} from "../util/util.js";
import {ProjectAsset} from "../assets/ProjectAsset.js";
import {DefaultAssetLinksContentWindow} from "../windowManagement/contentWindows/DefaultAssetLinksContentWindow.js";
import {BuiltInAssetsContentWindow} from "../windowManagement/contentWindows/BuiltInAssetsContentWindow.js";
import {ProjectContentWindow} from "../windowManagement/contentWindows/ProjectContentWindow.js";

/**
 * @typedef DroppableGuiDependencies
 * @property {import("../projectSelector/ProjectManager.js").ProjectManager} projectManager
 * @property {import("../misc/DragManager.js").DragManager} dragManager
 * @property {import("../windowManagement/WindowManager.js").WindowManager} windowManager
 * @property {import("./contextMenus/ContextMenuManager.js").ContextMenuManager} contextMenuManager
 * @property {import("../assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
 */

/**
 * @template {new (...args: any) => any} T
 * @typedef {Object} DroppableGuiOptionsType
 * @property {DroppableGuiDependencies} [dependencies] If set, will use these dependencies instead of making a call to getEditorInstance()
 * @property {T[]} [supportedAssetTypes] A list of constructors from live assets that this droppable can accept.
 * Note that this is not a list of ProjectAssetType constructors, but rather a list of constructors from live assets.
 * So for instance, if you want to accept `MaterialProjectAssetType`, you should use `supportedAssetTypes: [Material]`.
 * By default this is an empty array, which means that this droppable accepts all asset types.
 * @property {T | import("../../../src/mod.js").UuidString | import("../assets/ProjectAsset.js").ProjectAssetAny | null} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 * When set, this will be the value upon creation. When loading serializable data, this value is set when the
 * serializable data is either `undefined` or not set.
 * Additionally, when the `defaultValue` option is provided, this adds a context menu to the gui, allowing the user
 * to reset the value to the default.
 * @property {import("../assets/ProjectAsset.js").ProjectAssetAny?} [embeddedParentAsset] If set, allows the creation
 * of embedded assets via a context menu. When omitted, embedded assets are not supported and this option
 * won't be shown in the context menu.
 * @property {string} [embeddedParentAssetPersistenceKey] The key used for keeping the embedded asset
 * persistent when reloading the parent, this should be the same as what you use
 * for {@linkcode AssetManager.getProjectAssetFromUuidOrEmbeddedAssetData} or
 * {@linkcode AssetManager.getLiveAssetFromUuidOrEmbeddedAssetData}.
 */
/**
 * @template {new (...args: any) => any} T
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & DroppableGuiOptionsType<T>} DroppableGuiOptions
 */

/**
 * @template {boolean} U
 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} V
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
 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
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
 * 			A extends object ?
 * 				A :
 * 				never :
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
 * 		import("./propertiesTreeView/types.js").ReplaceUnknown<T, false> extends infer TDefaulted ?
 * 			TDefaulted extends boolean ?
 * 				import("./propertiesTreeView/types.js").ReplaceUnknown<U, "default"> extends infer UDefaulted ?
 * 					UDefaulted extends import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose ?
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
 * @template {object} T
 */
export class DroppableGui {
	/**
	 * @template {new (...args: any) => any} T
	 * @param {DroppableGuiOptions<T>} [opts]
	 */
	static of(opts) {
		return /** @type {DroppableGui<InstanceType<T>>} */ (new DroppableGui(opts));
	}

	/**
	 * @typedef {(value: import("../../../src/mod.js").UuidString?) => void} OnValueChangeCallback
	 */

	/**
	 * This constructor does not infer the correct generics, use `DroppableGui.of()` instead.
	 * @private
	 * @param {DroppableGuiOptions<new (...args: any) => any>} options
	 */
	constructor({
		dependencies = undefined,
		// TODO: Support dropping drag events that are not assets.
		supportedAssetTypes = [],
		// TODO: load the default value upon creation and handle serializable data
		// when filling properties treeviews.
		defaultValue = null,
		disabled = false,
		embeddedParentAsset = null,
		embeddedParentAssetPersistenceKey = "",
	} = {}) {
		if (!dependencies) {
			dependencies = {
				projectManager: getEditorInstance().projectManager,
				dragManager: getEditorInstance().dragManager,
				windowManager: getEditorInstance().windowManager,
				contextMenuManager: getEditorInstance().contextMenuManager,
				projectAssetTypeManager: getEditorInstance().projectAssetTypeManager,
			};
		}
		this.projectManager = dependencies.projectManager;
		this.dragManager = dependencies.dragManager;
		this.windowManager = dependencies.windowManager;
		this.contextMenuManager = dependencies.contextMenuManager;
		this.projectAssetTypeManager = dependencies.projectAssetTypeManager;

		this.disabled = disabled;
		/** @private */
		this.embeddedParentAsset = embeddedParentAsset;
		/** @private @type {unknown} */
		this.embeddedParentAssetPersistenceKey = embeddedParentAssetPersistenceKey;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		/** @type {OnValueChangeCallback[]} */
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = /** @type {any[]} */ (supportedAssetTypes);
		this.defaultValue = defaultValue;

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.boundOnContextMenu = this.onContextMenu.bind(this);
		this.boundOnDbClick = this.onDblClick.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);
		this.el.addEventListener("contextmenu", this.boundOnContextMenu);
		this.el.addEventListener("dblclick", this.boundOnDbClick);

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
		this.el.removeEventListener("dblclick", this.boundOnDbClick);
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	/**
	 * @param {T | import("../../../src/mod.js").UuidString | import("../assets/ProjectAsset.js").ProjectAssetAny | null} value
	 * If an uuid is provided, make sure to call `AssetManager.waitForAssetListsLoad()` before calling this method, otherwise
	 * the asset might not be loaded yet.
	 * @param {Object} options
	 * @param {boolean} [options.isDiskData] If true, and the passed in value is an object, it will be parsed
	 * as if it is embedded asset data and a new embedded asset is created. If the embedded asset
	 * already exists (based on the current embeddedParentAssetPersistenceKey), the value will
	 * be set to the existing embedded asset without making any changes to it.
	 * @param {boolean} [options.preloadLiveAsset] If true, preloads the live asset and waits with firing value change events
	 * until after the live asset is loaded. This is useful if valueChange callbacks immediately try to request live assets
	 * when they fire. If they use `getValue({returnLiveAsset: true})`, it is possible for the returned value to be
	 * `null`. Setting this flag to true makes sure the callbacks are fired after the live asset is loaded.
	 */
	setValue(value, {
		isDiskData = false,
		preloadLiveAsset = false,
	} = {}) {
		let projectAsset = null;
		this.setDefaultAssetLinkUuid(null);
		if (value) {
			const assetManager = this.projectManager.assertAssetManagerExists();
			if (typeof value == "string") {
				this.setDefaultAssetLinkUuid(value);
				projectAsset = assetManager.getProjectAssetFromUuidSync(value);
			} else if (value instanceof ProjectAsset) {
				projectAsset = value;
			} else if (isDiskData) {
				if (!this.embeddedParentAsset) {
					throw new Error("Tried to set DroppableGui value to embedded asset data, but embedded asset support is not enabled.");
				}
				if (!this.embeddedParentAssetPersistenceKey) {
					throw new Error("Tried to set DroppableGui value to embedded asset data, but no persistence key was set.");
				}
				const supportedAssetTypes = Array.from(this.getProjectAssetTypeFromSupported());
				if (supportedAssetTypes.length == 0) {
					throw new Error("Tried to set DroppableGui value to embedded asset data, but no supported asset types are set.");
				} else if (supportedAssetTypes.length > 1) {
					throw new Error("Tried to set DroppableGui value to embedded asset data, but multiple asset types are supported.");
				}
				projectAsset = assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync(value, {
					assertAssetType: supportedAssetTypes[0],
					parentAsset: this.embeddedParentAsset,
					embeddedAssetPersistenceKey: this.embeddedParentAssetPersistenceKey,
				});
			} else {
				projectAsset = assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, {clearDefaultAssetLink: false, preloadLiveAsset});
	}

	/**
	 * @template {boolean} [U = false]
	 * @template {import("./propertiesTreeView/types.js").TreeViewStructureOutputPurpose} [V = "default"]
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
		let returnValue = null;
		if (returnLiveAsset) {
			returnValue = this.projectAssetValue?.getLiveAssetSync() || null;
		} else if (!resolveDefaultAssetLinks && this.defaultAssetLinkUuid) {
			returnValue = this.defaultAssetLinkUuid;
		} else if (this.projectAssetValue) {
			if (this.projectAssetValue.isEmbedded) {
				returnValue = this.projectAssetValue.readEmbeddedAssetData();
			} else {
				returnValue = this.projectAssetValue?.uuid || null;
			}
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
	 * @private
	 * @param {import("../assets/ProjectAsset.js").ProjectAssetAny?} projectAsset
	 * @param {Object} options
	 * @param {boolean} [options.clearDefaultAssetLink]
	 * @param {boolean} [options.preloadLiveAsset] If true, preloads the live asset and waits with firing value change events
	 * until after the live asset is loaded. This is useful if valueChange callbacks immediately try to request live assets
	 * when they fire. If they use `getValue({returnLiveAsset: true})`, it is possible for the returned value to be
	 * `null`. Setting this flag to true makes sure the callbacks are fired after the live asset is loaded.
	 */
	async setValueFromProjectAsset(projectAsset, {
		clearDefaultAssetLink = true,
		preloadLiveAsset = false,
	} = {}) {
		if (clearDefaultAssetLink) {
			this.defaultAssetLinkUuid = null;
			this.defaultAssetLink = null;
		}
		this.projectAssetValue = projectAsset;

		if (preloadLiveAsset) {
			await projectAsset?.getLiveAsset();
		}

		this.fireValueChange();
		this.updateContent();
		this.updateDeletedState();
	}

	/**
	 * @private
	 */
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
			const assetManager = this.projectManager.assertAssetManagerExists();
			const projectAsset = await assetManager.getProjectAssetFromUuid(uuid);
			await assetManager.makeAssetUuidConsistent(projectAsset);
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, {clearDefaultAssetLink: false, preloadLiveAsset});
		}
	}

	/**
	 * @private
	 * @param {import("../../../src/util/mod.js").UuidString?} uuid
	 */
	setDefaultAssetLinkUuid(uuid) {
		if (uuid) {
			this.defaultAssetLink = this.projectManager.assertAssetManagerExists().getDefaultAssetLink(uuid);
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

	/** @typedef {import("../assets/AssetManager.js").AssetManager} AssetManager */

	/**
	 * Enables/disables embedded asset creation. When a project asset is provided,
	 * it will be used as parent asset when the user creates a new embedded
	 * asset via the context menu. When set to `null`, embedded assets creation
	 * is disabled.
	 * To prevent ambiguity, the current value of the droppable is reset to `null`.
	 * This is to prevent situations where the current value is an embedded asset,
	 * since changing the parent asset won't change the parent of the created embedded asset.
	 * @param {import("../assets/ProjectAsset.js").ProjectAssetAny} parentAsset
	 * @param {unknown} [persistenceKey] The key used for keeping the embedded asset
	 * persistent when reloading the parent, this should be the same as what you use
	 * for {@linkcode AssetManager.getProjectAssetFromUuidOrEmbeddedAssetData} or
	 * {@linkcode AssetManager.getLiveAssetFromUuidOrEmbeddedAssetData}. If this
	 * option is not provided, the previous value is used. But keep in mind
	 * that embedded asset creation will thow an error when no persistence key
	 * is set.
	 */
	setEmbeddedParentAsset(parentAsset, persistenceKey) {
		this.embeddedParentAsset = parentAsset;
		if (persistenceKey) {
			this.embeddedParentAssetPersistenceKey = persistenceKey;
		}
		this.setValueFromProjectAsset(null);
	}

	/**
	 * Removes support for embedded asset creation.
	 * To prevent ambiguity, the current value of the droppable is reset to `null`,
	 * even when the current value is not an embedded asset.
	 */
	removeEmbeddedAssetSupport() {
		this.embeddedParentAsset = null;
		this.embeddedParentAssetPersistenceKey = "";
		this.setValueFromProjectAsset(null);
	}

	/**
	 * Turns the provided supported asset types (which are live asset constructors)
	 * into actual ProjectAssetTypes.
	 * @returns {Generator<typeof import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetType>}
	 */
	*getProjectAssetTypeFromSupported() {
		for (const liveAssetConstructor of this.supportedAssetTypes) {
			for (const projectAssetType of this.projectAssetTypeManager.getAssetTypesForLiveAssetConstructor(liveAssetConstructor)) {
				yield projectAssetType;
			}
		}
	}

	/**
	 * @private
	 * @param {typeof import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} projectAssetType
	 */
	createEmbeddedAsset(projectAssetType) {
		const assetManager = this.projectManager.assertAssetManagerExists();
		if (!this.embeddedParentAsset) {
			throw new Error("Tried to create an embedded asset from a DroppableGui that has no embeddedParentAsset set.");
		}
		const projectAsset = assetManager.createEmbeddedAsset(projectAssetType, this.embeddedParentAsset, this.embeddedParentAssetPersistenceKey);
		this.setValueFromProjectAsset(projectAsset, {
			preloadLiveAsset: true,
		});
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
		if (!e.dataTransfer) return;

		let assetUuid = null;
		if (this.defaultAssetLinkUuid) {
			assetUuid = this.defaultAssetLinkUuid;
		} else if (this.projectAssetValue) {
			assetUuid = this.projectAssetValue.uuid;
		}

		if (!assetUuid) return;

		const {el, x, y} = this.dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		e.dataTransfer.effectAllowed = "all";
		let assetType = null;
		if (this.projectAssetValue) {
			assetType = this.projectAssetValue.projectAssetTypeConstructorSync;
		}

		/** @type {import("../windowManagement/contentWindows/ProjectContentWindow.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType,
			assetUuid,
		};
		const draggingDataUuid = this.dragManager.registerDraggingData(draggingData);
		e.dataTransfer.setData(`text/renda; dragtype=projectasset; draggingdata=${draggingDataUuid}`, "");
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
		if (this.currenDragFeedbackEl) this.dragManager.removeFeedbackText(this.currenDragFeedbackEl);
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
	 * @param {ParsedDraggingData | ParsedDraggingProjectAssetData} dragData
	 * @returns {dragData is ParsedDraggingProjectAssetData}
	 */
	validateMimeType(dragData) {
		if (dragData.isEngineType && dragData.isProjectAsset) {
			if (this.supportedAssetTypes.length <= 0) return true;

			if (dragData.draggingProjectAssetData.dataPopulated) {
				const assetType = dragData.draggingProjectAssetData.assetType;
				if (assetType && assetType.expectedLiveAssetConstructor) {
					return this.supportedAssetTypes.includes(assetType.expectedLiveAssetConstructor);
				}
			}
		}
		return false;
	}

	/**
	 * @typedef {Object} ParsedDraggingData
	 * @property {boolean} isEngineType
	 * @property {false} isProjectAsset
	 */

	/**
	 * @typedef {Object} ParsedDraggingProjectAssetData
	 * @property {true} isEngineType
	 * @property {true} isProjectAsset
	 * @property {import("../windowManagement/contentWindows/ProjectContentWindow.js").DraggingProjectAssetData} draggingProjectAssetData
	 */

	/**
	 * @param {string} mimeType
	 * @returns {ParsedDraggingData | ParsedDraggingProjectAssetData}
	 */
	getDraggingProjectAssetData(mimeType) {
		const parsed = parseMimeType(mimeType);
		let isEngineType = false;
		let isProjectAsset = false;
		if (parsed) {
			const {type, subType, parameters} = parsed;
			isEngineType = (type == "text" && subType == "renda");
			if (isEngineType) {
				isProjectAsset = (parameters.dragtype == "projectasset");
				if (isProjectAsset) {
					const draggingProjectAssetData = /** @type {import("../windowManagement/contentWindows/ProjectContentWindow.js").DraggingProjectAssetData} */ (this.dragManager.getDraggingData(parameters.draggingdata));
					return {
						isEngineType,
						isProjectAsset,
						draggingProjectAssetData,
					};
				}
			}
		}
		return {isEngineType, isProjectAsset};
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
	 * @private
	 * @param {MouseEvent} e
	 */
	onContextMenu(e) {
		e.preventDefault();
		/** @type {import("./contextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [];
		if (!this.disabled) {
			const availableTypes = Array.from(this.getProjectAssetTypeFromSupported());

			if (this.embeddedParentAsset && availableTypes.length > 0) {
				// TODO: hide or disable the embedded asset menu if embedded assets are not explicitly supported.
				/** @type {import("./contextMenus/ContextMenu.js").ContextMenuItemOpts} */
				const createEmbeddedStructure = {
					text: "Create embedded asset",
				};

				if (availableTypes.length == 1) {
					createEmbeddedStructure.onClick = () => {
						this.createEmbeddedAsset(availableTypes[0]);
					};
				} else {
					createEmbeddedStructure.submenu = () => {
						/** @type {import("./contextMenus/ContextMenu.js").ContextMenuStructure} */
						const submenuStructure = [];
						for (const projectAssetType of availableTypes) {
							let text = "<unknown>";
							if (projectAssetType.uiCreateName) {
								text = projectAssetType.uiCreateName;
							} else if (projectAssetType.type) {
								text = `<${projectAssetType.type}>`;
							}
							submenuStructure.push({
								text,
								onClick: () => {
									this.createEmbeddedAsset(projectAssetType);
								},
							});
						}
						return submenuStructure;
					};
				}
				contextMenuStructure.push(createEmbeddedStructure);
			}

			if (this.defaultValue) {
				contextMenuStructure.push({
					text: "Reset to default value",
					onClick: () => {
						this.setValue(this.defaultValue, {preloadLiveAsset: true});
					},
				});
			}
		}
		if (this.projectAssetValue) {
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
					if (this.defaultAssetLink) {
						// todo: highlight assetLink
						// eslint-disable-next-line no-unused-vars
						const assetLinksWindow = this.windowManager.focusOrCreateContentWindow(DefaultAssetLinksContentWindow);
					} else if (this.projectAssetValue) {
						let assetLinksWindow;
						if (this.projectAssetValue.isBuiltIn) {
							const contentWindow = this.windowManager.focusOrCreateContentWindow(BuiltInAssetsContentWindow);
							assetLinksWindow = /** @type {import("../windowManagement/contentWindows/BuiltInAssetsContentWindow.js").BuiltInAssetsContentWindow} */ (contentWindow);
						} else {
							const contentWindow = this.windowManager.focusOrCreateContentWindow(ProjectContentWindow);
							assetLinksWindow = /** @type {import("../windowManagement/contentWindows/ProjectContentWindow.js").ProjectContentWindow} */ (contentWindow);
						}
						assetLinksWindow.highlightPath(this.projectAssetValue.path);
					}
				},
				disabled: this.projectAssetValueDeleted,
			});
		}
		if (contextMenuStructure.length == 0) return;
		const menu = this.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos({x: e.pageX, y: e.pageY});
	}

	onDblClick() {
		if (this.projectAssetValue) this.projectAssetValue.open(this.windowManager);
	}

	get visibleAssetName() {
		if (this.defaultAssetLink?.name) return this.defaultAssetLink.name;

		if (this.projectAssetValue) {
			if (this.projectAssetValue.isEmbedded) {
				return "Embedded asset";
			} else if (this.projectAssetValue.fileName) {
				return this.projectAssetValue.fileName;
			}
		}

		return "";
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
