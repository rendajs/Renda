export class PlaceHolderTextureReference {
	/** @type {Set<() => void>} */
	#onDestructedCbs = new Set();

	destructor() {
		this.#onDestructedCbs.forEach(cb => cb());
	}

	/**
	 * @param {() => void} cb
	 */
	onDestructed(cb) {
		this.#onDestructedCbs.add(cb);
	}
}
