export class ButtonGroup {
	/**
	 * @param {...import("./Button.js").Button} buttons
	 */
	constructor(...buttons) {
		this.el = document.createElement("div");
		this.el.classList.add("buttonGroup", "buttonGroupLike");

		/** @type {Array<import("./Button.js").Button>} */
		this.buttons = [];

		for (const button of buttons) {
			this.addButton(button);
		}

		this.boundFireContextMenuCbs = this.fireContextMenuCbs.bind(this);
		this.onContextMenuCbs = new Set();
	}

	destructor() {
		this.el = null;
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
	}

	fireContextMenuCbs(button, e) {
		for (const cb of this.onContextMenuCbs) {
			cb(button, e);
		}
	}

	onContextMenu(cb) {
		this.onContextMenuCbs.add(cb);
	}
}
