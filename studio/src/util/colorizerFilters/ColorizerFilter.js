import { ColorizerFilterUsageReference } from "./ColorizerFilterUsageReference.js";

export class ColorizerFilter {
	#cssColor;
	get cssColor() {
		return this.#cssColor;
	}

	/**
	 * @param {string} cssColor
	 * @param {HTMLElement} containerEl
	 */
	constructor(cssColor, containerEl) {
		this.#cssColor = cssColor;
		const ns = "http://www.w3.org/2000/svg";
		this.svgEl = document.createElementNS(ns, "svg");
		this.svgEl.setAttribute("xmlns", ns);
		containerEl.appendChild(this.svgEl);

		this.filterEl = document.createElementNS(ns, "filter");
		this.svgEl.appendChild(this.filterEl);

		const feFlood = document.createElementNS(ns, "feFlood");
		feFlood.setAttribute("flood-color", cssColor);
		this.filterEl.appendChild(feFlood);

		const feComposite = document.createElementNS(ns, "feComposite");
		feComposite.setAttribute("in2", "SourceGraphic");
		feComposite.setAttribute("operator", "in");
		this.filterEl.appendChild(feComposite);

		this.finalizationRegistry = new FinalizationRegistry((ref) => {
			this.notifyWeakRefDestructed(ref);
		});

		/** @type {Set<WeakRef<ColorizerFilterUsageReference>>} */
		this.usageReferences = new Set();
		/** @type {WeakMap<ColorizerFilterUsageReference, WeakRef<ColorizerFilterUsageReference>>} */
		this.usageReferencesMap = new WeakMap();

		/** @type {Set<() => void>} */
		this.allReferencesDestructedCbs = new Set();
	}

	destructor() {
		this.usageReferences.clear();
		this.allReferencesDestructedCbs.clear();
		if (this.svgEl.parentElement) this.svgEl.parentElement.removeChild(this.svgEl);
	}

	/**
	 * @param {string} id
	 */
	setFilterId(id) {
		this.filterEl.setAttribute("id", id);
	}

	getFilterId() {
		return this.filterEl.getAttribute("id");
	}

	/**
	 * Creates a usage reference that can be used for tracking when a filter is
	 * no longer being used. Filters are automatically destroyed when all its
	 * usage references are garbage collected. But you can also forcefully
	 * mark usage references as being destructed by using {@linkcode ColorizerFilterUsageReference.destructor}.
	 */
	getUsageReference() {
		const ref = new ColorizerFilterUsageReference(this);
		const weakRef = new WeakRef(ref);
		this.finalizationRegistry.register(ref, weakRef, weakRef);
		this.usageReferences.add(weakRef);
		this.usageReferencesMap.set(ref, weakRef);
		return ref;
	}

	/**
	 * @param {ColorizerFilterUsageReference} ref
	 */
	notifyReferenceDestructed(ref) {
		const weakRef = this.usageReferencesMap.get(ref);
		if (!weakRef) return;
		this.notifyWeakRefDestructed(weakRef);
		this.usageReferencesMap.delete(ref);
	}

	/**
	 * @param {WeakRef<ColorizerFilterUsageReference>} weakRef
	 */
	notifyWeakRefDestructed(weakRef) {
		this.usageReferences.delete(weakRef);
		this.finalizationRegistry.unregister(weakRef);

		if (this.usageReferences.size <= 0) {
			this.fireAllReferencesDestructedCbs();
		}
	}

	/**
	 * @param {() => void} cb
	 */
	onAllReferencesDestructed(cb) {
		this.allReferencesDestructedCbs.add(cb);
	}

	fireAllReferencesDestructedCbs() {
		for (const cb of this.allReferencesDestructedCbs) {
			cb();
		}
	}
}
