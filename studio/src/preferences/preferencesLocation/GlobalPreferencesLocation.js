import {PreferencesLocation} from "./PreferencesLocation.js";

export class GlobalPreferencesLocation extends PreferencesLocation {
	#db;
	#preferencesLoaded = false;

	/**
	 * @param {import("../../../../src/mod.js").IndexedDbUtil} db
	 */
	constructor(db) {
		super("global");
		this.#db = db;
		this.#loadDbPreferences();
	}

	async #loadDbPreferences() {
		const getPreferences1 = this.#db.get.bind(this.#db);
		/** @type {typeof getPreferences1<Object<string, unknown>>} */
		const getPreferences2 = getPreferences1;
		const preferences = await getPreferences2("globalPreferences") || {};
		this.loadPreferences(preferences);
		this.#preferencesLoaded = true;
	}

	/**
	 * @override
	 */
	async flush() {
		if (!this.#preferencesLoaded) {
			throw new Error("Assertion failed, tried to flush global preferences before they were loaded");
		}
		await this.#db.set("globalPreferences", this.getAllPreferences());
	}
}
