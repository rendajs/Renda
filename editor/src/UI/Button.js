import editor from "../editorInstance.js";

/**
 * @typedef {Object} ButtonGuiOptionsType
 * @property {string} [text = ""]
 * @property {string} [icon = ""]
 * @property {boolean} [hasDownArrow = false]
 * @property {function(Object) : void} [onClick = null]
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & ButtonGuiOptionsType} ButtonGuiOptions
 */

export default class Button {
	constructor({
		text = null,
		icon = null,
		hasDownArrow = false,
		onClick = null,
		disabled = false,
		draggable = false,
	} = {}) {
		this.iconUrl = icon;
		this.currentText = text;
		const {el, iconEl, textEl} = this.createButtonEl();
		this.el = el;
		this.iconEl = iconEl;
		this.textEl = textEl;

		this.onClick = onClick;
		this.boundClick = this.click.bind(this);
		this.el.addEventListener("click", this.boundClick);
		this.disabled = disabled;

		if (draggable) {
			this.el.draggable = true;
			this.boundDragStart = this.dragStart.bind(this);
			this.el.addEventListener("dragstart", this.boundDragStart);
			this.boundDragEnd = this.dragEnd.bind(this);
			this.el.addEventListener("dragend", this.boundDragEnd);
		}
		this.dragFeedbackEl = null;

		this.setDisabled(disabled);

		this.onContextMenuCbs = new Set();

		this.boundFireContextMenuCbs = this.fireContextMenuCbs.bind(this);
		this.el.addEventListener("contextmenu", this.boundFireContextMenuCbs);
	}

	destructor(){
		this.el.removeEventListener("click", this.boundClick);
		this.el.removeEventListener("contextmenu", this.boundFireContextMenuCbs);
	}

	createButtonEl() {
		const el = document.createElement("div");
		el.classList.add("button", "buttonLike");

		const iconEl = document.createElement("div");
		iconEl.classList.add("buttonIcon");
		el.appendChild(iconEl);
		this.applyIconToEl(iconEl);

		const textEl = document.createElement("span");
		textEl.classList.add("buttonText");
		textEl.textContent = this.currentText;
		el.appendChild(textEl);

		return {el, iconEl, textEl};
	}

	click(){
		if(this.disabled) return;
		if(this.onClick) this.onClick();
	}

	/**
	 * @param {string} text
	 */
	setText(text) {
		this.currentText = text;
		this.textEl.textContent = text;
	}

	setSelectedHighlight(selected){
		this.el.classList.toggle("selected", selected);
	}

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.classList.toggle("disabled", disabled);
	}

	/**
	 * @param {string} iconUrl
	 */
	setIcon(iconUrl) {
		this.iconUrl = iconUrl;
		this.applyIconToEl(this.iconEl);
	}

	applyIconToEl(el) {
		el.style.backgroundImage = `url(${this.iconUrl})`;
		el.style.display = this.iconUrl ? null : "none";
		if (this.iconUrl) {
			editor.colorizerFilterManager.applyFilter(el, "var(--default-button-text-color)");
		}
	}

	/**
	 * @param {number} size
	 */
	setIconSizeMultiplier(size = 1) {
		this.iconEl.style.backgroundSize = `${size * 100}%`;
	}

	fireContextMenuCbs(e) {
		for (const cb of this.onContextMenuCbs) {
			cb(this, e);
		}
	}

	onContextMenu(cb) {
		this.onContextMenuCbs.add(cb);
	}

	removeOnContextMenu(cb) {
		this.onContextMenuCbs.delete(cb);
	}

	/**
	 * @param {DragEvent} e
	 */
	dragStart(e) {
		if (!this.dragFeedbackEl) {
			const {el}	= this.createButtonEl();
			this.dragFeedbackEl = el;
			el.style.position = "absolute";
			el.style.transform = "translateX(-100%)";
			document.body.appendChild(this.dragFeedbackEl);
		}
		e.dataTransfer.setDragImage(this.dragFeedbackEl, this.dragFeedbackEl.offsetWidth / 2, this.dragFeedbackEl.offsetHeight / 2);
	}

	dragEnd(e) {
		if (this.dragFeedbackEl) {
			this.dragFeedbackEl.parentElement.removeChild(this.dragFeedbackEl);
			this.dragFeedbackEl = null;
		}
	}
}
