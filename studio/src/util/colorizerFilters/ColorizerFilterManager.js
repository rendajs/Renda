/**
 * @fileoverview Manages SVG filters that can be used for applying colors to icons.
 */

import { ColorizerFilter } from "./ColorizerFilter.js";
import { generateUuid } from "../../../../src/util/mod.js";

const elementUsageReferenceSym = Symbol("colorizer filter usage reference");

/** @type {ColorizerFilterManager?} */
let manager = null;

export class ColorizerFilterManager {
	static instance() {
		if (manager) return manager;
		manager = new ColorizerFilterManager();
		return manager;
	}

	constructor() {
		this.containerEl = document.createElement("div");
		this.containerEl.style.width = "0";
		this.containerEl.style.height = "0";
		this.containerEl.style.pointerEvents = "none";
		document.body.appendChild(this.containerEl);

		/** @type {Map<string,ColorizerFilter>} */
		this.createdFilters = new Map();
	}

	/** @typedef {import("./ColorizerFilterUsageReference.js").ColorizerFilterUsageReference} ColorizerFilterUsageReference */

	/**
	 * Creates a filter if no filter with this color exists yet, otherwise returns
	 * an existing filter. Created filters are not destructed until all references
	 * have been garbage collected. You can use {@linkcode ColorizerFilterUsageReference.destructor}
	 * to immediately dispose filters. Use {@linkcode ColorizerFilter.getUsageReference}
	 * to obtain a usage reference.
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

	/** @typedef {HTMLElement & {[elementUsageReferenceSym]: ColorizerFilterUsageReference}} ElWithSym */

	/**
	 * Applies a filter to an element in order to change its colors.
	 * The returned reference can be used to destroy the filter when it's no
	 * longer needed. But the filter will also be automatically be destroyed
	 * once the element is garbage collected.
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

	/**
	 * Mainly useful for tests.
	 * Checks if an element currently has a filter applied to it and returns it if so.
	 * @param {HTMLElement} element
	 */
	elementHasFilter(element) {
		const castEl = /** @type {ElWithSym} */ (element);
		const ref = castEl[elementUsageReferenceSym];
		if (ref) {
			return ref.filter;
		}
		return null;
	}
}
