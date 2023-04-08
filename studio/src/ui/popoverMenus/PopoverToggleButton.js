import {Button} from "../Button.js";

/**
 * @template {import("./Popover.js").Popover} T
 *
 * Toggles a popover. Encapsulates the logic of creating a popover and handling toggle logic.
 */
export class PopoverToggleButton extends Button {
	/**
	 * @type T | null
	 */
	#popoverConstructorInstance = null;

	/**
	 * @type {import("./PopoverManager.js").PopoverManager}
	 */
	#popoverManager;

	/**
	 * @param {new (...args: any[]) => T} PopoverConstructor
	 * @param {import("./PopoverManager.js").PopoverManager} popoverManager
	 * @param {import("../Button.js").ButtonGuiOptions} buttonArgs
	 */
	constructor(PopoverConstructor, popoverManager, buttonArgs) {
		super(buttonArgs);

		this.#popoverManager = popoverManager;

		/**
		 * @type {new (...args: any[]) => T} PopoverConstructor
		 */
		this.PopoverConstructor = PopoverConstructor;
	}

	/**
	 * Toggles the associated popover. Additionally runs callback on popover instantiation, if provided.
	 *
	 * @param {((popover: T) => void) | null} successCallback optional callback function to run if the popover is added to the popoverManager.
	 * @returns {boolean} true if the popover is added to the popoverManager, false if the popover is removed from the popoverManager.
	 */
	togglePopover(successCallback = null) {
		if (!this.#popoverConstructorInstance || this.#popoverConstructorInstance.destroyed) {
			this.#popoverConstructorInstance = /** @type {T} */ (this.#popoverManager.addPopover(this.PopoverConstructor));
			if (successCallback) {
				successCallback(this.#popoverConstructorInstance);
			}
			return true;
		}

		this.#popoverConstructorInstance.close();
		this.#popoverConstructorInstance = null;

		return false;
	}
}
