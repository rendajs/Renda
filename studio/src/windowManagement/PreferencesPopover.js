import {DropDownGui} from "../ui/DropDownGui.js";
import {Popover} from "../ui/popoverMenus/Popover.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";

export class PreferencesPopover extends Popover {
	/** @type {import("../preferences/PreferencesManager.js").PreferencesManager<any>?} */
	#preferencesManager = null;
	/** @type {import("../../../src/mod.js").UuidString?} */
	#contentWindowUuid = null;

	/** @type {Map<string, import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny>} */
	#createdEntries = new Map();

	#locationDropDown;

	/**
	 * @param {ConstructorParameters<typeof Popover>} args
	 */
	constructor(...args) {
		super(...args);

		const topBarEl = document.createElement("div");
		topBarEl.classList.add("preferences-popover-top-bar");
		this.el.appendChild(topBarEl);

		this.#locationDropDown = new DropDownGui({
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
		this.#locationDropDown.onValueChange(() => {
			this.#updateEntryValues();
		});
		topBarEl.appendChild(this.#locationDropDown.el);

		this.preferencesTreeView = new PropertiesTreeView();
		this.el.appendChild(this.preferencesTreeView.el);
	}

	/**
	 * @param {import("../preferences/PreferencesManager.js").PreferencesManager<any>} preferencesManager
	 * @param {string[]} preferenceIds
	 * @param {HTMLElement} buttonEl
	 * @param {import("../../../src/mod.js").UuidString} contentWindowUuid
	 */
	initialize(preferencesManager, preferenceIds, buttonEl, contentWindowUuid) {
		if (this.#preferencesManager) {
			throw new Error("Already initialized");
		}
		this.#preferencesManager = preferencesManager;
		this.#contentWindowUuid = contentWindowUuid;

		for (const id of preferenceIds) {
			const {uiName, type} = preferencesManager.getPreferenceConfig(id);
			const entry = this.preferencesTreeView.addItem({
				type,
				guiOpts: {
					label: uiName,
				},
			});
			entry.onValueChange(() => {
				// TODO: Ignore events from loading state
				preferencesManager.set(id, entry.getValue(), {
					location: this.#getCurrentLocation(),
					contentWindowUuid,
				});
			});
			this.#createdEntries.set(id, entry);
		}

		this.#updateEntryValues();

		this.setPos(buttonEl);
	}

	#getCurrentLocation() {
		const index = this.#locationDropDown.getValue({getAsString: false}) - 1;
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
		if (index < 0 || index > locationTypes.length - 1) return undefined;
		return locationTypes[index];
	}

	#updateEntryValues() {
		if (!this.#preferencesManager || !this.#contentWindowUuid) {
			throw new Error("Assertion failed, popover has not been initialized");
		}
		// const location = this.#getCurrentLocation();

		for (const [id, entry] of this.#createdEntries) {
			const value = this.#preferencesManager.get(id, {
				contentWindowUuid: this.#contentWindowUuid,
			});
			entry.setValue(value);
		}
	}
}
