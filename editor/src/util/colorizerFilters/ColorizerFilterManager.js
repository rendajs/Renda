/**
 * @fileoverview Manages SVG filters that can be used for applying colors to icons.
 */

import {ColorizerFilter} from "./ColorizerFilter.js";
import {generateUuid} from "../../../../src/util/mod.js";

const elementUsageReferenceSym = Symbol("colorizer filter usage reference");

export class ColorizerFilterManager {
	constructor() {
		this.containerEl = document.createElement("div");
		this.containerEl.style.width = "0";
		this.containerEl.style.height = "0";
		this.containerEl.style.pointerEvents = "none";
		document.body.appendChild(this.containerEl);

		/** @type {Map<string,ColorizerFilter>} */
		this.createdFilters = new Map();
	}

	/**
	 * @param {string} cssColor Can be any valid CSS color string.
	 * @returns {ColorizerFilter}
	 */
	getFilter(cssColor) {
		const existingFilter = this.createdFilters.get(cssColor);
		if (existingFilter) return existingFilter;

		const filter = new ColorizerFilter(cssColor, this.containerEl);
		filter.setFilterId("colorizerFilter-" + generateUuid());
		filter.onAllReferencesDestructed(() => {
			filter.destructor();
			this.createdFilters.delete(cssColor);
		});
		this.createdFilters.set(cssColor, filter);
		return filter;
	}

	/** @typedef {HTMLElement & {[elementUsageReferenceSym]: import("./ColorizerFilterUsageReference.js").ColorizerFilterUsageReference}} ElWithSym */

	/**
	 * @param {HTMLElement} element The element to apply the filter to.
	 * @param {string} cssColor Can be any valid CSS color string.
	 */
	applyFilter(element, cssColor) {
		const filter = this.getFilter(cssColor);
		element.style.filter = `url(#${filter.getFilterId()})`;
		const castEl = /** @type {ElWithSym} */ (element);
		const existingRef = castEl[elementUsageReferenceSym];
		if (existingRef) existingRef.destructor();
		const ref = filter.getUsageReference();
		castEl[elementUsageReferenceSym] = ref;
		return ref;
	}
}
