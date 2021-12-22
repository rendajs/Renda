import {generateUuid} from "../../../src/util/mod.js";

export class DragManager {
	constructor() {
		this.createdDragFeedbackEls = new Set();
		this.draggingData = new Map();
	}
	/**
	 * @param {Object} opts
	 * @param {string | string[]} [opts.text]
	 */
	createDragFeedbackText({
		text = "",
	} = {}) {
		if (!Array.isArray(text)) text = [text];

		const el = document.createElement("div");
		el.classList.add("drag-feedback-text-container");
		document.body.appendChild(el);

		for (const t of text) {
			const textEl = document.createElement("div");
			textEl.classList.add("drag-feedback-text");
			textEl.textContent = t;
			el.appendChild(textEl);
		}
		let x = 10;
		let y = 10;
		if (text.length == 1) {
			x = el.offsetWidth / 2;
			y = el.offsetHeight / 2;
		}
		this.createdDragFeedbackEls.add(el);
		return {el, x, y};
	}

	/**
	 * @param {HTMLDivElement} el
	 */
	removeFeedbackText(el) {
		if (!this.createdDragFeedbackEls.has(el)) {
			throw new Error("Element not a Drag Feedback Text");
		}
		this.createdDragFeedbackEls.delete(el);
		if (el.parentElement) el.parentElement.removeChild(el);
	}

	/**
	 * @param {*} data
	 * @returns {import("../../../src/util/mod.js").UuidString}
	 */
	registerDraggingData(data) {
		const id = generateUuid();
		this.draggingData.set(id, data);
		return id;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} id
	 */
	getDraggingData(id) {
		return this.draggingData.get(id);
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} id
	 */
	unregisterDraggingData(id) {
		this.draggingData.delete(id);
	}
}
