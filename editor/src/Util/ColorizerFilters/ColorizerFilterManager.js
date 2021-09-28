/**
 * @fileoverview Manages SVG filters that can be used for applying colors to icons.
 */

import ColorizerFilter from "./ColorizerFilter.js";
import {generateUuid} from "../Util.js";

export default class ColorizerFilterManager {
	constructor() {
		this.containerEl = document.createElement("div");
		this.containerEl.style.width = "0";
		this.containerEl.style.height = "0";
		this.containerEl.style.pointerEvents = "none";
		document.body.appendChild(this.containerEl);

		/** @type {Map<string,ColorizerFilter>} */
		this.createdFilters = new Map();

		this.elementUsageReferenceSym = Symbol("colorizer filter usage reference");
	}

	/**
	 * @param {string} cssColor Can be any valid CSS color string.
	 * @returns {ColorizerFilter}
	 */
	getFilter(cssColor) {
		if (this.createdFilters.has(cssColor)) return this.createdFilters.get(cssColor);

		const filter = new ColorizerFilter(cssColor, this.containerEl);
		filter.setFilterId("colorizerFilter-" + generateUuid());
		filter.onAllReferencesDestructed(() => {
			filter.destructor();
			this.createdFilters.delete(cssColor);
		});
		this.createdFilters.set(cssColor, filter);
		return filter;
	}

	/**
	 * @param {HTMLElement} element The element to apply the filter to.
	 * @param {string} cssColor Can be any valid CSS color string.
	 * @returns {import("./ColorizerFilterUsageReference.js").default}
	 */
	applyFilter(element, cssColor) {
		const filter = this.getFilter(cssColor);
		element.style.filter = `url(#${filter.getFilterId()})`;
		const existingRef = /** @type {import("./ColorizerFilterUsageReference.js").default} */ (element[this.elementUsageReferenceSym]);
		if (existingRef) existingRef.destructor();
		const ref = filter.getUsageReference();
		element[this.elementUsageReferenceSym] = ref;
		return ref;
	}
}
