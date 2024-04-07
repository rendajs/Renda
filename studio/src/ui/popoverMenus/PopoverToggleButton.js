import { Button } from "../Button.js";

/**
 * @template {import("./Popover.js").Popover} T
 */
export class PopoverToggleButton extends Button {
	/** @type {T | null} */
	#popoverInstance = null;

	/**
	 * Toggles a popover. Encapsulates the logic of creating a popover and handling toggle logic.
	 * @param {import("../Button.js").ButtonGuiOptions} buttonArgs
	 * @param {() => T} onPopoverRequiredCallback
	 */
	constructor(buttonArgs, onPopoverRequiredCallback) {
		const innerOnClick = buttonArgs.onClick;

		super({
			...buttonArgs,
			onClick: (ctx) => {
				if (!this.#popoverInstance || this.#popoverInstance.destructed) {
					this.#popoverInstance = onPopoverRequiredCallback();
					this.#popoverInstance.setPos(this);
				} else {
					this.#popoverInstance.close();
					this.#popoverInstance = null;
				}

				if (innerOnClick) {
					innerOnClick(ctx);
				}
			},
		});
	}

	get popoverInstance() {
		return this.#popoverInstance;
	}
}
