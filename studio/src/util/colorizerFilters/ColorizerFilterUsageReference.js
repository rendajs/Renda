export class ColorizerFilterUsageReference {
	/**
	 * @param {import("./ColorizerFilter.js").ColorizerFilter} filter
	 */
	constructor(filter) {
		this.filter = filter;
		this.destructed = false;
	}

	destructor() {
		if (this.destructed) return;
		this.destructed = true;
		this.filter.notifyReferenceDestructed(this);
	}
}
