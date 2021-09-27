export default class DragManager {
	createDragFeedbackText({
		text = "",
	} = {}) {
		const el = document.createElement("div");
		el.classList.add("dragFeedbackText");
		el.textContent = text;
		document.body.appendChild(el);
		const x = el.offsetWidth / 2;
		const y = el.offsetHeight / 2;
		return {el, x, y};
	}

	removeFeedbackEl(el) {
		if (el.parentElement) el.parentElement.removeChild(el);
	}
}
