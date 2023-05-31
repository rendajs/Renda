/**
 * @typedef ButtonGroupOptions
 * @property {boolean} [vertical] Whether to render the buttons from top to bottom rather than left to right.
 */

export class ButtonGroup {
	/**
	 * @param {ButtonGroupOptions} param0
	 */
	constructor({
		vertical = false,
	} = {}) {
		this.el = document.createElement("div");
		this.el.classList.add("button-group", "button-group-like");
		this.el.classList.toggle("vertical", vertical);

		/** @type {import("./Button.js").Button[]} */
		this.buttons = [];

		this.boundFireContextMenuCbs = this.fireContextMenuCbs.bind(this);
		/** @type {Set<import("./Button.js").ContextMenuCallback>} */
		this.onContextMenuCbs = new Set();
	}

	destructor() {
		for (const button of this.buttons) {
			button.destructor();
		}
		this.buttons = [];
	}

	/**
	 * @param {import("./Button.js").Button} button
	 */
	addButton(button) {
		this.buttons.push(button);
		this.el.appendChild(button.el);
		button.onContextMenu(this.boundFireContextMenuCbs);
		button.onVisibilityChange(this.#updateFirstLastButtonClasses);
		this.#updateFirstLastButtonClasses();
	}

	/**
	 * @param {number} buttonIndex
	 */
	removeButton(buttonIndex) {
		const button = this.buttons[buttonIndex];
		if (!button) return;

		this.buttons.splice(buttonIndex, 1);
		this.el.removeChild(button.el);
		button.removeOnContextMenu(this.boundFireContextMenuCbs);
		button.removeOnVisibilityChange(this.#updateFirstLastButtonClasses);
		this.#updateFirstLastButtonClasses();
	}

	#updateFirstLastButtonClasses = () => {
		let hasSeenFirst = false;
		for (let i = 0; i < this.buttons.length; i++) {
			const button = this.buttons[i];
			let visible = false;
			if (!hasSeenFirst && button.visible) {
				visible = true;
				hasSeenFirst = true;
			}
			button.el.classList.toggle("first-visible-child", visible);
		}

		let hasSeenLast = false;
		for (let i = this.buttons.length - 1; i >= 0; i--) {
			const button = this.buttons[i];
			let visible = false;
			if (!hasSeenLast && button.visible) {
				visible = true;
				hasSeenLast = true;
			}
			button.el.classList.toggle("last-visible-child", visible);
		}
	};

	/**
	 * @param {import("./Button.js").Button} button
	 * @param {MouseEvent} e
	 */
	fireContextMenuCbs(button, e) {
		for (const cb of this.onContextMenuCbs) {
			cb(button, e);
		}
	}

	/**
	 * @param {import("./Button.js").ContextMenuCallback} cb
	 */
	onContextMenu(cb) {
		this.onContextMenuCbs.add(cb);
	}
}
