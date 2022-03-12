export class FakeMouseEvent extends Event {
	/**
	 * @param {ConstructorParameters<typeof MouseEvent>[0]} type
	 * @param {ConstructorParameters<typeof MouseEvent>[1]} [eventInit]
	 */
	constructor(type, eventInit) {
		super(type, eventInit);

		this.clientX = eventInit?.clientX ?? 0;
		this.clientY = eventInit?.clientY ?? 0;
		this.buttons = eventInit?.buttons ?? 0;
	}
}

const cast = /** @type {typeof FakeMouseEvent & typeof MouseEvent} */(FakeMouseEvent);
export {cast as MouseEvent};
