export default class DragManager {
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
		return {el, x, y};
	}

	removeFeedbackEl(el) {
		if (el.parentElement) el.parentElement.removeChild(el);
	}
}
