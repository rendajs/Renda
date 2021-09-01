export default class ColorizerFilterUsageReference {
	/**
	 * @param {import("./ColorizerFilter.js").default} filter
	 */
	constructor(filter) {
		this.filter = filter;
		this.destructed = false;
	}

	destructor() {
		this.destructed = true;
		this.filter.notifyReferenceDestructed(this);
	}
}
