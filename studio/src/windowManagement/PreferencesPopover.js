import { locationTypePriorities } from "../preferences/PreferencesManager.js";
import { DropDownGui } from "../ui/DropDownGui.js";
import { Popover } from "../ui/popoverMenus/Popover.js";
import { PropertiesTreeView } from "../ui/propertiesTreeView/PropertiesTreeView.js";

export class PreferencesPopover extends Popover {
	/** @type {import("../preferences/PreferencesManager.js").PreferencesManager<any>} */
	#preferencesManager;
	/** @type {import("../../../src/mod.js").UuidString} */
	#contentWindowUuid;

	/**
	 * @typedef CreatedEntryData
	 * @property {import("../preferences/PreferencesManager.js").PreferenceValueTypes} type
	 * @property {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny} entry
	 * @property {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]?} allowedLocations
	 */

	/** @type {Map<string, CreatedEntryData>} */
	#createdEntries = new Map();

	locationDropDown;

	/** @type {Map<import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes, string>} */
	#locationUiStrings = new Map([
		["global", "Global"],
		["workspace", "Workspace"],
		["version-control", "Version Control"],
		["project", "Project"],
		["contentwindow-workspace", "Window - Workspace"],
		["contentwindow-project", "Window - Project"],
	]);

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
				...this.#locationUiStrings.values(),
			],
			defaultValue: 0,
		});
		this.locationDropDown.onValueChange(() => {
			this.#updateEntries();
		});
		topBarEl.appendChild(this.locationDropDown.el);

		this.preferencesTreeView = new PropertiesTreeView();
		this.el.appendChild(this.preferencesTreeView.el);

		for (const id of preferenceIds) {
			const { uiName, type, allowedLocations, guiOpts } = preferencesManager.getPreferenceUiData(id);
			if (type == "unknown") {
				throw new Error("Preferences with unknown type can not be added to PreferencesPopovers.");
			}
			/** @type {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} */
			let entry;
			if (type == "gui") {
				if (!guiOpts) {
					throw new Error(`Preference type of "${id}" is "gui" but no guiOpts was set in the preference config.`);
				}
				if (!guiOpts.guiOpts) {
					guiOpts.guiOpts = {};
				}
				guiOpts.guiOpts.label = uiName;
				entry = this.preferencesTreeView.addItem(guiOpts);
			} else {
				entry = this.preferencesTreeView.addItem({
					type,
					guiOpts: {
						label: uiName,
					},
				});
			}
			entry.onValueChange((changeEvent) => {
				if (changeEvent.trigger != "user") return;
				preferencesManager.set(id, entry.getValue(), {
					location: this.#getCurrentLocation(),
					contentWindowUuid,
				});
				this.#updateEntries({ updateValues: false });
			});
			this.#createdEntries.set(id, {
				type,
				entry,
				allowedLocations,
			});
		}

		this.#updateEntries();
	}

	/**
	 * @returns {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes?} The currently selected location type. Or null when the 'default' location has been selected.
	 */
	#getCurrentLocation() {
		const index = this.locationDropDown.getValue({ getAsString: false }) - 1;
		/**
		 * @type {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]}
		 */
		if (index < 0 || index > locationTypePriorities.length - 1) return null;
		return locationTypePriorities[index];
	}

	/**
	 * @param {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} location
	 */
	#getLocationUiString(location) {
		const str = this.#locationUiStrings.get(location);
		if (!str) {
			throw new Error("Assertion failed, no ui string found for " + location);
		}
		return str;
	}

	#updateEntries({
		updateValues = true,
		updateTooltips = true,
		updateDisabled = true,
	} = {}) {
		if (!this.#preferencesManager || !this.#contentWindowUuid) {
			throw new Error("Assertion failed, popover has not been initialized");
		}

		const currentLocation = this.#getCurrentLocation();
		for (const [id, { entry, type, allowedLocations }] of this.#createdEntries) {
			if (updateValues) {
				let value = this.#preferencesManager.getUiValueAtLocation(id, currentLocation, {
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

			/** @type {Set<string>} */
			const modifiedInLocations = new Set();
			for (const locationType of locationTypePriorities) {
				const value = this.#preferencesManager.getUiValueAtLocation(id, locationType, {
					contentWindowUuid: this.#contentWindowUuid,
				});
				if (value !== null) modifiedInLocations.add(this.#getLocationUiString(locationType));
			}

			if (updateTooltips) {
				const tooltipEntries = [];

				let defaultValueEntry = null;
				let finalValueEntry = null;
				if (type == "boolean" || type == "number" || type == "string") {
					let defaultValue = this.#preferencesManager.getDefaultValue(id);
					let finalValue = this.#preferencesManager.get(id, this.#contentWindowUuid);
					if (type == "string") {
						defaultValue = '"' + defaultValue + '"';
						finalValue = '"' + finalValue + '"';
					}
					defaultValueEntry = `Default value: ${defaultValue}`;
					finalValueEntry = `Final value: ${finalValue}`;
				}

				if (defaultValueEntry) tooltipEntries.push(defaultValueEntry);
				if (!currentLocation) {
					const defaultLocation = this.#getLocationUiString(this.#preferencesManager.getDefaultLocation(id));
					tooltipEntries.push("Default location: " + defaultLocation);
				}
				if (modifiedInLocations.size > 0) {
					tooltipEntries.push("Modified in: " + Array.from(modifiedInLocations).join(", "));
				}
				if (finalValueEntry) tooltipEntries.push(finalValueEntry);

				entry.setTooltip(tooltipEntries.join("\n"));
			}

			if (updateDisabled) {
				const allowed = !currentLocation || !allowedLocations || allowedLocations.includes(currentLocation);
				entry.setDisabled(!allowed);
			}
		}
	}
}
