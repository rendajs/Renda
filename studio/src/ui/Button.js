/**
 * @template TCallbacksContext
 * @typedef {object} ButtonGuiOptionsType
 * @property {string} [text = ""] The text to show on the button.
 * @property {string} [icon = ""] The icon to show on the button.
 * @property {string} [tooltip = ""] The text to show when hovering over the button.
 * @property {import("../util/colorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager?} [colorizerFilterManager = null] The colorizer filter manager if you want theme support for icons to work.
 * @property {boolean} [hasDownArrow = false] Whether the button should show a down arrow.
 * @property {((ctx: TCallbacksContext) => any)?} [onClick = null] The function to call when the button is clicked.
 * @property {boolean} [draggable = false] Whether the button should be draggable.
 * @property {((event: DragEvent) => any)?} [onDragStart] The function to call when the button starts getting dragged.
 * @property {((event: DragEvent) => any)?} [onDragEnd] The function to call when the dragged button is released.
 */

/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & ButtonGuiOptionsType<*>} ButtonGuiOptions
 */
/**
 * @template TCallbacksContext
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & ButtonGuiOptionsType<TCallbacksContext>} ButtonGuiOptionsWithCallbacksContext<TCallbacksContext>
 */

/** @typedef {(button: Button, event: MouseEvent) => any} ContextMenuCallback */
/** @typedef {(visible: boolean) => void} OnVisibilityChangeCallback */

export class Button {
	#visible = true;
	/** @type {Set<OnVisibilityChangeCallback>} */
	#onVisibilityChangeCbs = new Set();

	#hasDownArrow;

	/**
	 * @param {ButtonGuiOptions} opts
	 */
	constructor({
		disabled = false,
		text = "",
		icon = "",
		tooltip = "",
		colorizerFilterManager = null,
		hasDownArrow = false,
		onClick = null,
		draggable = false,
		onDragStart = null,
		onDragEnd = null,
	} = {}) {
		this.iconUrl = icon;
		this.#hasDownArrow = hasDownArrow;
		this.colorizerFilterManager = colorizerFilterManager;
		this.currentText = text;
		const {el, iconEl, textEl} = this.createButtonEl();
		this.el = el;
		this.iconEl = iconEl;
		this.textEl = textEl;
		el.title = tooltip;

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

		/** @type {Set<ContextMenuCallback>} */
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
		el.classList.add("button", "button-like");

		const iconEl = document.createElement("div");
		iconEl.classList.add("button-icon");
		el.appendChild(iconEl);
		this.#applyIconToEl(iconEl, this.iconUrl);

		const textEl = document.createElement("span");
		textEl.classList.add("buttonText");
		textEl.textContent = this.currentText;
		el.appendChild(textEl);

		if (this.#hasDownArrow) {
			const downArrowEl = document.createElement("div");
			downArrowEl.classList.add("button-icon", "button-down-arrow");
			el.appendChild(downArrowEl);
			this.#applyIconToEl(downArrowEl, "static/icons/generic/buttonDownArrow.svg");
		}

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

	/**
	 * @param {boolean} selected
	 */
	setSelectedHighlight(selected) {
		this.el.classList.toggle("selected", selected);
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.classList.toggle("disabled", disabled);
	}

	/**
	 * @param {boolean} visible
	 */
	setVisibility(visible) {
		if (visible == this.#visible) return;
		this.#visible = visible;
		this.el.classList.toggle("hidden", !visible);
		this.#onVisibilityChangeCbs.forEach(cb => cb(visible));
	}

	get visible() {
		return this.#visible;
	}

	/**
	 * @param {OnVisibilityChangeCallback} cb
	 */
	onVisibilityChange(cb) {
		this.#onVisibilityChangeCbs.add(cb);
	}

	/**
	 * @param {OnVisibilityChangeCallback} cb
	 */
	removeOnVisibilityChange(cb) {
		this.#onVisibilityChangeCbs.delete(cb);
	}

	/**
	 * @param {string} iconUrl
	 */
	setIcon(iconUrl) {
		this.iconUrl = iconUrl;
		this.#applyIconToEl(this.iconEl, this.iconUrl);
	}

	/**
	 * @param {HTMLElement} el
	 * @param {string} iconUrl
	 */
	#applyIconToEl(el, iconUrl) {
		el.style.backgroundImage = `url(${iconUrl})`;
		el.style.display = iconUrl ? "" : "none";
		if (iconUrl && this.colorizerFilterManager) {
			this.colorizerFilterManager.applyFilter(el, "var(--default-button-text-color)");
		}
	}

	/**
	 * @param {number} size
	 */
	setIconSizeMultiplier(size = 1) {
		this.iconEl.style.backgroundSize = `${size * 100}%`;
	}

	/**
	 * @param {string} text
	 */
	setTooltip(text) {
		this.el.title = text;
	}

	/**
	 * @param {MouseEvent} e
	 */
	fireContextMenuCbs(e) {
		for (const cb of this.onContextMenuCbs) {
			cb(this, e);
		}
	}

	/**
	 * @param {ContextMenuCallback} cb
	 */
	onContextMenu(cb) {
		this.onContextMenuCbs.add(cb);
	}

	/**
	 * @param {ContextMenuCallback} cb
	 */
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
		if (e.dataTransfer) {
			e.dataTransfer.setDragImage(this.dragFeedbackEl, this.dragFeedbackEl.offsetWidth / 2, this.dragFeedbackEl.offsetHeight / 2);
		}
		if (this.onDragStart) this.onDragStart(e);
	}

	/**
	 * @param {DragEvent} e
	 */
	dragEnd(e) {
		if (this.dragFeedbackEl) {
			if (this.dragFeedbackEl.parentElement) {
				this.dragFeedbackEl.parentElement.removeChild(this.dragFeedbackEl);
			}
			this.dragFeedbackEl = null;
		}
		if (this.onDragEnd) this.onDragEnd(e);
	}
}
