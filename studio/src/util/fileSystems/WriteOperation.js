/**
 * This is a basic class used for letting filesystems know if there
 * are any pending write operations. Request an object using
 * `StudioFileSystem.requestWriteOperation()` at the start of functions such as
 * `writeFile()` and `delete()` and call {@linkcode done} when the data is known
 * to be written.
 */
export class WriteOperation {
	constructor() {
		/** @private @type {Set<() => void>} */
		this.onDoneCbs = new Set();
		/** @private */
		this.isDone = false;
	}

	done() {
		if (this.isDone) return;
		this.isDone = true;
		this.onDoneCbs.forEach((cb) => cb());
		this.onDoneCbs.clear();
	}

	/**
	 * @param {() => void} cb
	 */
	onDone(cb) {
		if (this.isDone) cb();
		this.onDoneCbs.add(cb);
	}
}
