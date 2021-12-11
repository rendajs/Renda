/**
 * @template TCallbacksContext
 * @typedef {Object} ButtonGuiOptionsType
 * @property {string} [text = ""] The text to show on the button.
 * @property {string} [icon = ""] The icon to show on the button.
 * @property {import("../Util/ColorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} [colorizerFilterManager = null] The colorizer filter manager if you want theme support for icons to work.
 * @property {boolean} [hasDownArrow = false] Whether the button should show a down arrow.
 * @property {function(TCallbacksContext) : void} [onClick = null] The function to call when the button is clicked.
 * @property {boolean} [draggable = false] Whether the button should be draggable.
 * @property {function(DragEvent) : void} [onDragStart] The function to call when the button starts getting dragged.
 * @property {function(DragEvent) : void} [onDragEnd] The function to call when the dragged button is released.
 */

/**
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & ButtonGuiOptionsType<*>} ButtonGuiOptions
 */
/**
 * @template TCallbacksContext
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & ButtonGuiOptionsType<TCallbacksContext>} ButtonGuiOptionsWithCallbacksContext<TCallbacksContext>
 */

export class Button {
	/**
	 * @param {ButtonGuiOptions} opts
	 */
	constructor({
		disabled = false,
		text = null,
		icon = null,
		colorizerFilterManager = null,
		hasDownArrow = false,
		onClick = null,
		draggable = false,
		onDragStart = null,
		onDragEnd = null,
	} = {}) {
		this.iconUrl = icon;
		this.colorizerFilterManager = colorizerFilterManager;
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
			this.onDragStart = onDragStart;
			this.onDragEnd = onDragEnd;
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

	destructor() {
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

	click() {
		if (this.disabled) return;
		if (this.onClick) this.onClick({});
	}

	/**
	 * @param {string} text
	 */
	setText(text) {
		this.currentText = text;
		this.textEl.textContent = text;
	}

	setSelectedHighlight(selected) {
		this.el.classList.toggle("selected", selected);
	}

	setDisabled(disabled) {
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

	/**
	 * @param {HTMLElement} el
	 */
	applyIconToEl(el) {
		el.style.backgroundImage = `url(${this.iconUrl})`;
		el.style.display = this.iconUrl ? null : "none";
		if (this.iconUrl && this.colorizerFilterManager) {
			this.colorizerFilterManager.applyFilter(el, "var(--default-button-text-color)");
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
		if (this.onDragStart) this.onDragStart(e);
	}

	/**
	 * @param {DragEvent} e
	 */
	dragEnd(e) {
		if (this.dragFeedbackEl) {
			this.dragFeedbackEl.parentElement.removeChild(this.dragFeedbackEl);
			this.dragFeedbackEl = null;
		}
		if (this.onDragEnd) this.onDragEnd(e);
	}
}
