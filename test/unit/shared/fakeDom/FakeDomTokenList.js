export class FakeDomTokenList {
	/** @type {Set<string>} */
	#list = new Set();

	get length() {
		return this.#list.size;
	}

	get value() {
		return Array.from(this.#list).join(" ");
	}

	/**
	 * @param  {...string} tokens
	 */
	add(...tokens) {
		for (const token of tokens) {
			this.#list.add(token);
		}
	}

	/**
	 * @param {string} token
	 * @param {boolean} force
	 */
	toggle(token, force) {
		let hasToken;
		if (force === undefined) {
			hasToken = this.#list.has(token);
		} else {
			hasToken = force;
		}
		hasToken = !hasToken;
		if (hasToken) {
			this.#list.delete(token);
		} else {
			this.#list.add(token);
		}
	}
}

const cast = /** @type {typeof FakeDomTokenList & typeof DOMTokenList & (new (...args: any) => FakeDomTokenList & DOMTokenList)} */(FakeDomTokenList);
export {cast as DomTokenList};
