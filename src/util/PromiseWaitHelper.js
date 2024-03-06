export class PromiseWaitHelper {
	constructor({
		once = true,
	} = {}) {
		this.once = once;
		this.done = false;
		/** @type {Set<() => void>} */
		this.onFireCbs = new Set();
	}

	fire() {
		if (this.done && this.once) return;

		for (const cb of this.onFireCbs) {
			cb();
		}
		this.onFireCbs.clear();
		this.done = true;
	}

	async wait() {
		if (this.done && this.once) return;
		/** @type {Promise<void>} */
		const promise = new Promise((r) => this.onFireCbs.add(r));
		await promise;
	}
}
