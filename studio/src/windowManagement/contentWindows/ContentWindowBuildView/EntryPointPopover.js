import {ProjectAssetTypeHtml} from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {ProjectAssetTypeJavascript} from "../../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {Button} from "../../../ui/Button.js";
import {ButtonSelectorGui} from "../../../ui/ButtonSelectorGui.js";
import {DroppableGui} from "../../../ui/DroppableGui.js";
import {Popover} from "../../../ui/popoverMenus/Popover.js";

/**
 * @param {import("../../../Studio.js").Studio["preferencesManager"]} preferencesManager
 * @param {import("../../../../../src/mod.js").UuidString} contentWindowUuid
 */
function getEntryPointsPreference(preferencesManager, contentWindowUuid) {
	/** @type {import("../../../../../src/mod.js").UuidString[]} */
	const items = [];
	const preference = preferencesManager.get("buildView.availableEntryPoints", contentWindowUuid);
	if (preference && Array.isArray(preference)) {
		for (const item of preference) {
			if (typeof item == "string") {
				items.push(item);
			}
		}
	}
	return items;
}

/**
 * @param {import("../../../Studio.js").Studio["preferencesManager"]} preferencesManager
 * @param {import("../../../../../src/mod.js").UuidString} contentWindowUuid
 * @returns {import("../../../../../src/mod.js").UuidString?}
 */
export function getSelectedEntryPoint(preferencesManager, contentWindowUuid) {
	const selectedUuid = preferencesManager.get("buildView.selectedEntryPoint", contentWindowUuid);
	if (typeof selectedUuid == "string") {
		return selectedUuid;
	}
	const entryPoints = getEntryPointsPreference(preferencesManager, contentWindowUuid);
	return entryPoints[0] || null;
}

export class EntryPointPopover extends Popover {
	/** @type {import("../../../assets/AssetManager.js").AssetManager} */
	#assetManager;

	#preferencesManager;
	#contentWindowUuid;

	/** @type {HTMLElement?} */
	#currentSelectorEl = null;

	#selectorContainer;
	#droppableGui;

	/**
	 * @param {ConstructorParameters<typeof Popover>[0]} popoverManager
	 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
	 * @param {import("../../../Studio.js").Studio["preferencesManager"]} preferencesManager
	 * @param {import("../../../../../src/mod.js").UuidString} contentWindowUuid
	 */
	constructor(popoverManager, assetManager, preferencesManager, contentWindowUuid) {
		super(popoverManager);

		this.#assetManager = assetManager;
		this.#preferencesManager = preferencesManager;
		this.#contentWindowUuid = contentWindowUuid;

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

		const items = getEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);
		let entryPoint = null;

		const entryPointPreference = this.#preferencesManager.get("buildView.selectedEntryPoint", this.#contentWindowUuid);
		if (typeof entryPointPreference == "string") {
			entryPoint = entryPointPreference;
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
			if (selectedEntryPoint) {
				const index = itemDatas.findIndex(item => item.uuid == selectedEntryPoint);
				selector.setValue(index);
			}
			selector.onValueChange(() => {
				const index = selector.getValue({getIndex: true});
				const itemData = itemDatas[index];
				if (!itemData) {
					throw new Error("Assertion failed, item data doesn't exist");
				}
				if (!this.#preferencesManager) {
					throw new Error("Error updating selector for EntryPointPopover: persistentData is not initialized.");
				}
				this.#preferencesManager.set("buildView.selectedEntryPoint", itemData.uuid, {contentWindowUuid: this.#contentWindowUuid});
			});
			this.#currentSelectorEl = selector.el;
			this.#selectorContainer.appendChild(selector.el);
		}
	}

	#onAddButtonClick() {
		const addValue = this.#droppableGui.value;
		if (!addValue) return;
		const availableEntryPoints = getEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);
		availableEntryPoints.push(addValue);
		this.#preferencesManager.set("buildView.availableEntryPoints", availableEntryPoints);
		this.#preferencesManager.set("buildView.selectedEntryPoint", addValue, {contentWindowUuid: this.#contentWindowUuid});
		this.#updateSelector(availableEntryPoints, addValue);

		this.#droppableGui.value = null;
	}
}
