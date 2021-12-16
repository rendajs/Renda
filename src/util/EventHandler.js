/**
 * @template TRegisterType
 * @template TEvent
 */
export class EventHandler {
	constructor() {
		/** @type {Map<TRegisterType, Set<(e: TEvent) => void>>} */
		this.callbacks = new Map();
	}

	/**
	 * @param {TRegisterType} type
	 * @param {(e: TEvent) => void} callback
	 */
	addEventListener(type, callback) {
		let callbacks = this.callbacks.get(type);
		if (!callbacks) {
			callbacks = new Set();
			this.callbacks.set(type, callbacks);
		}
		callbacks.add(callback);
	}

	/**
	 * @param {TRegisterType} type
	 * @param {(e: TEvent) => void} callback
	 */
	removeEventListener(type, callback) {
		const callbacks = this.callbacks.get(type);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size <= 0) {
				this.callbacks.delete(type);
			}
		}
	}

	/**
	 * @param {TRegisterType} type
	 * @param {TEvent} event
	 */
	fireEvent(type, event) {
		const callbacks = this.callbacks.get(type);
		if (callbacks) {
			callbacks.forEach(callback => callback(event));
		}
	}
}
