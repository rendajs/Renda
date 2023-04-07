import {ProjectAssetTypeHtml} from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {ProjectAssetTypeJavascript} from "../../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {Button} from "../../../ui/Button.js";
import {ButtonSelectorGui} from "../../../ui/ButtonSelectorGui.js";
import {DroppableGui} from "../../../ui/DroppableGui.js";
import {Popover} from "../../../ui/popoverMenus/Popover.js";

const ENTRY_POINTS_SETTING_KEY = "buildView.entryPoints";
const SELECTED_ENTRY_POINT_KEY = "selectedEntryPoint";

/**
 * @param {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager} projectSettingsManager
 */
async function getEntryPointsSetting(projectSettingsManager) {
	/** @type {import("../../../../../src/mod.js").UuidString[]} */
	const items = [];
	const settingValue = await projectSettingsManager.get(ENTRY_POINTS_SETTING_KEY);
	if (settingValue && Array.isArray(settingValue)) {
		for (const item of settingValue) {
			if (typeof item == "string") {
				items.push(item);
			}
		}
	}
	return items;
}

/**
 * @param {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager} projectSettingsManager
 * @param {import("../../ContentWindowPersistentData.js").ContentWindowPersistentData} contentWindowPersistentData
 * @returns {Promise<import("../../../../../src/mod.js").UuidString?>}
 */
export async function getSelectedEntryPoint(projectSettingsManager, contentWindowPersistentData) {
	const selectedUuid = await contentWindowPersistentData.get(SELECTED_ENTRY_POINT_KEY);
	if (typeof selectedUuid == "string") {
		return selectedUuid;
	}
	const entryPoints = await getEntryPointsSetting(projectSettingsManager);
	return entryPoints[0] || null;
}

export class EntryPointPopover extends Popover {
	/** @type {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager?} */
	#projectSettings = null;

	/** @type {import("../../../assets/AssetManager.js").AssetManager?} */
	#assetManager = null;

	/** @type {import("../../ContentWindowPersistentData.js").ContentWindowPersistentData?} */
	#persistentData = null;

	/** @type {HTMLElement?} */
	#currentSelectorEl = null;

	#selectorContainer;
	#droppableGui;

	/**
	 * @param {ConstructorParameters<typeof Popover>} args
	 */
	constructor(...args) {
		super(...args);

		this.#selectorContainer = document.createElement("div");
		this.el.appendChild(this.#selectorContainer);

		const addContainer = document.createElement("div");
		addContainer.style.display = "flex";
		addContainer.style.width = "150px";
		this.el.appendChild(addContainer);

		this.#droppableGui = DroppableGui.of({
			supportedAssetTypes: [ProjectAssetTypeHtml, ProjectAssetTypeJavascript],
		});
		this.#droppableGui.el.style.flexGrow = "1";
		addContainer.appendChild(this.#droppableGui.el);

		const addButton = new Button({
			text: "+",
			tooltip: "Adds the dropped asset to the list of entry points.",
			onClick: () => {
				this.#onAddButtonClick();
			},
		});

		addContainer.appendChild(addButton.el);
	}

	/**
	 * @param {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager} projectSettingsManager
	 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
	 * @param {import("../../ContentWindowPersistentData.js").ContentWindowPersistentData} persistentData
	 */
	initialize = (projectSettingsManager, assetManager, persistentData) => {
		if (this.#projectSettings) {
			throw new Error("Error initializing EntryPointPopover: already initialized.");
		}

		this.#projectSettings = projectSettingsManager;
		this.#assetManager = assetManager;
		this.#persistentData = persistentData;

		this.#loadPreferences();
	}

	async #loadPreferences() {
		if (!this.#projectSettings || !this.#assetManager || !this.#persistentData) {
			throw new Error("Error loading preferences for EntryPointPopover: not initialized.");
		}

		const items = await getEntryPointsSetting(this.#projectSettings);
		let entryPoint = null;

		const entryPointSetting = await this.#persistentData.get(SELECTED_ENTRY_POINT_KEY);
		if (typeof entryPointSetting == "string") {
			entryPoint = entryPointSetting;
		}
		this.#updateSelector(items, entryPoint);
	}

	/**
	 * @param {import("../../../../../src/mod.js").UuidString[]} items
	 * @param {import("../../../../../src/mod.js").UuidString?} selectedEntryPoint
	 */
	async #updateSelector(items, selectedEntryPoint) {
		if (!this.#assetManager) {
			throw new Error("Error updating selector for EntryPointPopover: not initialized.");
		}

		/**
		 * @typedef ItemData
		 * @property {string} fileName
		 * @property {string} fullPath
		 * @property {import("../../../../../src/mod.js").UuidString} uuid
		 */
		/** @type {ItemData[]} */
		const itemDatas = [];
		/** @type {Set<string>} */
		const fileNames = new Set();
		/** @type {Set<string>} */
		const duplicateFileNames = new Set();
		for (const uuid of items) {
			const path = await this.#assetManager.getAssetPathFromUuid(uuid);
			if (!path) continue;
			const fullPath = path.join("/");
			const fileName = path.at(-1) || "";
			itemDatas.push({uuid, fullPath, fileName});
			if (fileNames.has(fileName)) {
				duplicateFileNames.add(fileName);
			}
			fileNames.add(fileName);
		}
		const itemTexts = itemDatas.map(item => {
			if (duplicateFileNames.has(item.fileName)) {
				return item.fullPath;
			} else {
				return item.fileName;
			}
		});
		if (this.#currentSelectorEl) {
			this.#currentSelectorEl.remove();
		}
		if (itemTexts.length > 0) {
			const selector = new ButtonSelectorGui({
				items: itemTexts,
				vertical: true,
			});
			if (selectedEntryPoint != null) {
				const index = itemDatas.findIndex(item => item.uuid == selectedEntryPoint);
				selector.setValue(index);
			}
			selector.onValueChange(() => {
				const index = selector.getValue({getIndex: true});
				const itemData = itemDatas[index];
				if (!itemData) {
					throw new Error("Assertion failed, item data doesn't exist");
				}
				if (!this.#persistentData) {
					throw new Error("Error updating selector for EntryPointPopover: persistentData is not initialized.");
				}
				this.#persistentData.set(SELECTED_ENTRY_POINT_KEY, itemData.uuid);
			});
			this.#currentSelectorEl = selector.el;
			this.#selectorContainer.appendChild(selector.el);
		}
	}

	async #onAddButtonClick() {
		if (!this.#projectSettings || !this.#persistentData) {
			throw new Error("Error adding entry point: not initialized.");
		}

		const addValue = this.#droppableGui.value;
		if (!addValue) return;
		const settingsValue = await getEntryPointsSetting(this.#projectSettings);
		settingsValue.push(addValue);
		await this.#projectSettings.set(ENTRY_POINTS_SETTING_KEY, settingsValue);
		await this.#persistentData.set(SELECTED_ENTRY_POINT_KEY, addValue);
		this.#updateSelector(settingsValue, addValue);

		this.#droppableGui.value = null;
	}
}
