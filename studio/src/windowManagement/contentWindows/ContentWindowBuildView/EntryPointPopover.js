import {ButtonSelectorGui} from "../../../ui/ButtonSelectorGui.js";
import {Popover} from "../../../ui/popoverMenus/Popover.js";

/**
 * @param {import("../../../Studio.js").Studio["preferencesManager"]} preferencesManager
 * @param {import("../../../../../src/mod.js").UuidString} contentWindowUuid
 */
function getEntryPointsPreference(preferencesManager, contentWindowUuid) {
	/** @type {import("../../../../../src/mod.js").UuidString[]} */
	const items = [];
	const preference = preferencesManager.get("buildView.availableScriptEntryPoints", contentWindowUuid);
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
 */
function getEntityEntryPointsPreference(preferencesManager, contentWindowUuid) {
	/** @type {import("../../../../../src/mod.js").UuidString[]} */
	const items = [];
	const preference = preferencesManager.get("buildView.availableEntityEntryPoints", contentWindowUuid);
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
	if (selectedUuid && typeof selectedUuid == "string") {
		return selectedUuid;
	}
	const entryPoints = getEntryPointsPreference(preferencesManager, contentWindowUuid);
	return entryPoints[0] || null;
}

export class EntryPointPopover extends Popover {
	#assetManager;
	#preferencesManager;
	#contentWindowUuid;

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

		const entityEntryPointUuids = getEntityEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);
		const entryPointUuids = getEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);

		this.#createSelector("buildView.selectedEntityEntryPoint", "Current Entity", entityEntryPointUuids);
		this.#createSelector("buildView.selectedEntryPoint", "Default", entryPointUuids);
	}

	/**
	 * @param {Parameters<import("../../../Studio.js").Studio["preferencesManager"]["set"]>[0]} selectedPreferenceId
	 * @param {string} defaultText
	 * @param {import("../../../../../src/mod.js").UuidString[]} entryPointUuids
	 */
	#createSelector(selectedPreferenceId, defaultText, entryPointUuids) {
		const containerEl = document.createElement("div");
		this.el.appendChild(containerEl);

		(async () => {
			/** @type {string?} */
			let selectedEntryPoint = null;
			const entryPointPreference = this.#preferencesManager.get(selectedPreferenceId, this.#contentWindowUuid);
			if (typeof entryPointPreference == "string") {
				selectedEntryPoint = entryPointPreference;
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
			for (const uuid of entryPointUuids) {
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
			itemTexts.unshift(defaultText);
			const selector = new ButtonSelectorGui({
				items: itemTexts,
				vertical: true,
			});
			if (selectedEntryPoint) {
				const index = itemDatas.findIndex(item => item.uuid == selectedEntryPoint);
				selector.setValue(index + 1);
			} else {
				selector.setValue(0);
			}
			selector.onValueChange(() => {
				const index = selector.getValue({getIndex: true});
				if (index == 0) {
					this.#preferencesManager.reset(selectedPreferenceId, {contentWindowUuid: this.#contentWindowUuid});
				} else {
					const itemData = itemDatas[index - 1];
					if (!itemData) {
						throw new Error("Assertion failed, item data doesn't exist");
					}
					this.#preferencesManager.set(selectedPreferenceId, itemData.uuid, {contentWindowUuid: this.#contentWindowUuid});
				}
			});
			containerEl.appendChild(selector.el);
		})();
	}
}
