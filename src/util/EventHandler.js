/**
 * @template {object} TRegisterType
 * @template TEvent
 */
export class EventHandler {
	/**
	 * A helper class for registering and triggering events on a map of different types.
	 * TRegisterType is the type of the map key.
	 * TEventType is the type used for the first parameter of the callbacks.
	 * It is not recommended to use this class for events where the types are known
	 * in advance, as this makes it more difficult to track down where specific events
	 * are fired and where callbacks are being used.
	 * In that case it's better to create individual `new Map()`s
	 * and `onX(cb)`/`removeOnX(cb)` methods for each event type.
	 */
	constructor() {
		/** @type {WeakMap<TRegisterType, Set<(e: TEvent) => void>>} */
		this.callbacks = new WeakMap();
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
			callbacks.forEach((callback) => callback(event));
		}
	}
}
