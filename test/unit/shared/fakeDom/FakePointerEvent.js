import {FakeMouseEvent} from "./FakeMouseEvent.js";

/** @typedef {"pointerover" | "pointerenter" | "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "pointerout" | "pointerleave"} PointerEventType */

export class FakePointerEvent extends FakeMouseEvent {
	/**
	 * @param {PointerEventType} type
	 * @param {ConstructorParameters<typeof PointerEvent>[1]} eventInit
	 */
	constructor(type, eventInit) {
		super(type, eventInit);

		this.pointerId = eventInit?.pointerId ?? 0;
	}
}

const cast = /** @type {typeof FakePointerEvent & typeof PointerEvent & (new (...args: any) => FakePointerEvent & PointerEvent)} */(FakePointerEvent);
export {cast as PointerEvent};
