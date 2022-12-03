import { ProjectAssetTypeHtml } from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import { Button } from "../../../ui/Button.js";
import { ButtonSelectorGui } from "../../../ui/ButtonSelectorGui.js";
import { DroppableGui } from "../../../ui/DroppableGui.js";

const ENTRY_POINTS_SETTING_KEY = "buildView.entryPoints";

export class EntryPointManager {
	#popover;
	#projectSettings;
	#assetManager;

	/** @type {HTMLElement?} */
	#currentSelectorEl = null;
	#selectorContainer;
	#droppableGui;

	/**
	 * @param {import("../../../ui/popoverMenus/Popover.js").Popover} popover
	 * @param {import("../../../projectSelector/ProjectSettingsManager.js").ProjectSettingsManager} projectSettingsManager
	 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
	 */
	constructor(popover, projectSettingsManager, assetManager) {
		this.#popover = popover;
		this.#projectSettings = projectSettingsManager;
		this.#assetManager = assetManager;

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
		this.#updateSelector(items);
	}

	/**
	 * @param {import("../../../../../src/mod.js").UuidString[]} items
	 */
	async #updateSelector(items) {
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
			items: itemTexts,
			vertical: true,
		});
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
		this.#updateSelector(castSettingValue);

		this.#droppableGui.value = null;
	}
}
