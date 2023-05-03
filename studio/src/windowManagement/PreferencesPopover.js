import {DropDownGui} from "../ui/DropDownGui.js";
import {Popover} from "../ui/popoverMenus/Popover.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";

export class PreferencesPopover extends Popover {
	/** @type {import("../preferences/PreferencesManager.js").PreferencesManager<any>} */
	#preferencesManager;
	/** @type {import("../../../src/mod.js").UuidString} */
	#contentWindowUuid;

	/**
	 * @typedef CreatedEntryData
	 * @property {import("../preferences/PreferencesManager.js").PreferenceValueTypes} type
	 * @property {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny} entry
	 */

	/** @type {Map<string, CreatedEntryData>} */
	#createdEntries = new Map();

	locationDropDown;

	/**
	 * @param {ConstructorParameters<typeof Popover>[0]} popoverManager
	 * @param {import("../preferences/PreferencesManager.js").PreferencesManager<any>} preferencesManager
	 * @param {string[]} preferenceIds
	 * @param {import("../../../src/mod.js").UuidString} contentWindowUuid
	 */
	constructor(popoverManager, preferencesManager, preferenceIds, contentWindowUuid) {
		super(popoverManager);

		this.#preferencesManager = preferencesManager;
		this.#contentWindowUuid = contentWindowUuid;

		const topBarEl = document.createElement("div");
		topBarEl.classList.add("preferences-popover-top-bar");
		this.el.appendChild(topBarEl);

		this.locationDropDown = new DropDownGui({
			items: [
				"Default",
				"Global",
				"Workspace",
				"Version Control",
				"Project",
				"Window - Workspace",
				"Window - Project",
			],
			defaultValue: 0,
		});
		this.locationDropDown.onValueChange(() => {
			this.#updateEntryValues();
		});
		topBarEl.appendChild(this.locationDropDown.el);

		this.preferencesTreeView = new PropertiesTreeView();
		this.el.appendChild(this.preferencesTreeView.el);

		for (const id of preferenceIds) {
			const {uiName, type} = preferencesManager.getPreferenceConfig(id);
			if (type == "unknown") {
				throw new Error("Preferences with unknown type can not be added to PreferencesPopovers.");
			}
			const entry = this.preferencesTreeView.addItem({
				type,
				guiOpts: {
					label: uiName,
				},
			});
			entry.onValueChange(changeEvent => {
				if (changeEvent.trigger != "user") return;
				preferencesManager.set(id, entry.getValue(), {
					location: this.#getCurrentLocation(),
					contentWindowUuid,
				});
			});
			this.#createdEntries.set(id, {
				type,
				entry,
			});
		}

		this.#updateEntryValues();
	}

	#getCurrentLocation() {
		const index = this.locationDropDown.getValue({getAsString: false}) - 1;
		/**
		 * @type {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]}
		 */
		const locationTypes = [
			"global",
			"workspace",
			"version-control",
			"project",
			"contentwindow-workspace",
			"contentwindow-project",
		];
		if (index < 0 || index > locationTypes.length - 1) return null;
		return locationTypes[index];
	}

	#updateEntryValues() {
		if (!this.#preferencesManager || !this.#contentWindowUuid) {
			throw new Error("Assertion failed, popover has not been initialized");
		}

		const location = this.#getCurrentLocation();
		for (const [id, {entry, type}] of this.#createdEntries) {
			let value = this.#preferencesManager.getUiValueAtLocation(id, location, {
				contentWindowUuid: this.#contentWindowUuid,
			});
			if (value == null) {
				if (type == "boolean") {
					value = false;
				} else if (type == "number") {
					value = 0;
				} else if (type == "string") {
					value = "";
				}
			}
			entry.setValue(value);
		}
	}
}
