import {Popover} from "../../../ui/popoverMenus/Popover.js";
import {PropertiesTreeView} from "../../../ui/propertiesTreeView/PropertiesTreeView.js";

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
export function getSelectedScriptEntryPoint(preferencesManager, contentWindowUuid) {
	const selectedUuid = preferencesManager.get("buildView.selectedScriptEntryPoint", contentWindowUuid);
	if (selectedUuid && typeof selectedUuid == "string") {
		return selectedUuid;
	}
	const entryPoints = getEntryPointsPreference(preferencesManager, contentWindowUuid);
	return entryPoints[0] || null;
}

/**
 * @param {import("../../../Studio.js").Studio["preferencesManager"]} preferencesManager
 * @param {import("../../../../../src/mod.js").UuidString} contentWindowUuid
 * @returns {import("../../../../../src/mod.js").UuidString?}
 */
export function getSelectedEntityEntryPoint(preferencesManager, contentWindowUuid) {
	const selectedUuid = preferencesManager.get("buildView.selectedEntityEntryPoint", contentWindowUuid);
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

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		const entityEntryPointUuids = getEntityEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);
		const entryPointUuids = getEntryPointsPreference(this.#preferencesManager, this.#contentWindowUuid);

		this.#createSelector({
			selectedPreferenceId: "buildView.selectedEntityEntryPoint",
			label: "Entity",
			tooltip: "The entity that will be loaded when pressing play. When 'Current Entity' is selected, the entity of the most recently focused entity editor will be used. Additional entities can be added in the preferences menu.",
			defaultText: "Current Entity",
			entryPointUuids: entityEntryPointUuids,
		});
		this.#createSelector({
			selectedPreferenceId: "buildView.selectedScriptEntryPoint",
			label: "Script",
			tooltip: "The script that will be loaded when pressing play. By default, a script with basic functionality is used. You can add additional entry points in the preferences menu.",
			defaultText: "Default",
			entryPointUuids,
		});
	}

	/**
	 * @param {object} options
	 * @param {Parameters<import("../../../Studio.js").Studio["preferencesManager"]["set"]>[0]} options.selectedPreferenceId
	 * @param {string} options.label
	 * @param {string} options.tooltip
	 * @param {string} options.defaultText
	 * @param {import("../../../../../src/mod.js").UuidString[]} options.entryPointUuids
	 */
	#createSelector({selectedPreferenceId, label, tooltip, defaultText, entryPointUuids}) {
		const entry = this.treeView.addItem({
			type: "buttonSelector",
			guiOpts: {
				label,
				items: [defaultText],
				vertical: true,
			},
			tooltip,
			forceMultiLine: true,
		});

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
				const asset = await this.#assetManager.getProjectAssetFromUuid(uuid);
				if (!asset) continue;
				const fullPath = asset.path.join("/");
				const fileName = asset.path.at(-1) || "";
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
			entry.gui.setItems(itemTexts);

			if (selectedEntryPoint) {
				const index = itemDatas.findIndex(item => item.uuid == selectedEntryPoint);
				entry.gui.setValue(index + 1);
			} else {
				entry.gui.setValue(0);
			}
			entry.gui.onValueChange(() => {
				const index = entry.gui.getValue({getIndex: true});
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
		})();
	}
}
