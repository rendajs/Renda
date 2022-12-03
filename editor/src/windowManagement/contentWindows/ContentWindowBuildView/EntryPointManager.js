import { ProjectAssetTypeHtml } from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import { Button } from "../../../ui/Button.js";
import { ButtonSelectorGui } from "../../../ui/ButtonSelectorGui.js";
import { DroppableGui } from "../../../ui/DroppableGui.js";

const ENTRY_POINTS_SETTING_KEY = "buildView.entryPoints";
const SELECTED_ENTRY_POINT_KEY = "selectedEntryPoint";

export class EntryPointManager {
	#popover;
	#projectSettings;
	#assetManager;
	#persistentData;

	/** @type {HTMLElement?} */
	#currentSelectorEl = null;
	#selectorContainer;
	#droppableGui;

	/**
	 * @param {import("../../../ui/popoverMenus/Popover.js").Popover} popover
	 * @param {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager} projectSettingsManager
	 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
	 * @param {import("../../ContentWindowPersistentData.js").ContentWindowPersistentData} persistentData
	 */
	constructor(popover, projectSettingsManager, assetManager, persistentData) {
		this.#popover = popover;
		this.#projectSettings = projectSettingsManager;
		this.#assetManager = assetManager;
		this.#persistentData = persistentData;

		this.#selectorContainer = document.createElement("div");
		popover.el.appendChild(this.#selectorContainer);

		const addContainer = document.createElement("div");
		addContainer.style.display = "flex";
		popover.el.appendChild(addContainer);

		this.#droppableGui = DroppableGui.of({
			supportedAssetTypes: [ProjectAssetTypeHtml],
		});
		addContainer.appendChild(this.#droppableGui.el);

		const addButton = new Button({
			text: "+",
			tooltip: "Adds the dropped asset to the list of entry points.",
			onClick: () => {
				this.#onAddButtonClick();
			},
		});
		addContainer.appendChild(addButton.el);

		this.#loadPreferences();
	}

	async #loadPreferences() {
		/** @type {string[]} */
		const items = [];
		const settingValue = await this.#projectSettings.get(ENTRY_POINTS_SETTING_KEY);
		if (settingValue && Array.isArray(settingValue)) {
			for (const item of settingValue) {
				items.push(item);
			}
		}
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
			const path = await this.#assetManager.getAssetPathFromUuid(uuid) || [];
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
		const selector = new ButtonSelectorGui({
			items: itemTexts.map(t => {
				return {text: t}
			}),
			vertical: true,
		});
		if (selectedEntryPoint != null) {
			const index = itemDatas.findIndex(item => item.uuid == selectedEntryPoint);
			selector.setValue(index);
		}
		selector.onValueChange(() => {
			const index = selector.getValue();
			if (typeof index != "number") {
				throw new Error("Assertion failed, value is not an index");
			}
			const itemData = itemDatas[index];
			if (!itemData) {
				throw new Error("Assertion failed, item data doesn't exist");
			}
			this.#persistentData.set(SELECTED_ENTRY_POINT_KEY, itemData.uuid);
		})
		if (this.#currentSelectorEl) {
			this.#currentSelectorEl.remove();
		}
		this.#currentSelectorEl = selector.el;
		this.#selectorContainer.appendChild(selector.el);
	}

	async #onAddButtonClick() {
		const addValue = this.#droppableGui.value;
		if (!addValue) return;
		let settingValue = await this.#projectSettings.get(ENTRY_POINTS_SETTING_KEY);
		if (!settingValue || !Array.isArray(settingValue)) {
			settingValue = [];
		}
		const castSettingValue = /** @type {import("../../../../../src/mod.js").UuidString[]} */ (settingValue);
		castSettingValue.push(addValue);
		await this.#projectSettings.set(ENTRY_POINTS_SETTING_KEY, castSettingValue);
		await this.#persistentData.set(SELECTED_ENTRY_POINT_KEY, addValue);
		this.#updateSelector(castSettingValue, addValue);

		this.#droppableGui.value = null;
	}
}
