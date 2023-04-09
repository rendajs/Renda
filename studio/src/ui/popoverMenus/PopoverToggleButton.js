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
	 * @typedef {(popover: T) => void} onPopoverCreatedCallback
	 * @type {Set<onPopoverCreatedCallback>}
	 */
	#onPopoverCreatedCbs = new Set();

	/**
	 * @param {new (...args: any[]) => T} PopoverConstructor
	 * @param {import("./PopoverManager.js").PopoverManager} popoverManager
	 * @param {import("../Button.js").ButtonGuiOptions} buttonArgs
	 */
	constructor(PopoverConstructor, popoverManager, buttonArgs) {
		const {onClick} = buttonArgs;

		buttonArgs.onClick = (ctx) => {
			if(!this.#popoverConstructorInstance || this.#popoverConstructorInstance.destroyed) {
				this.#popoverConstructorInstance = /** @type {T} */ (popoverManager.addPopover(PopoverConstructor));
				this.#onPopoverCreatedCbs.forEach(cb => cb(/** @type {T} */ (this.#popoverConstructorInstance)));
			}

			this.#popoverConstructorInstance?.close();
			this.#popoverConstructorInstance = null;
			if (onClick) {
				onClick(ctx);
			}
		};

		super(buttonArgs);

		this.#popoverManager = popoverManager;

		/**
		 * @type {new (...args: any[]) => T} PopoverConstructor
		 */
		this.PopoverConstructor = PopoverConstructor;
	}

	get popoverInstance() {
		return this.#popoverConstructorInstance;
	}

	/**
	 * @param {(popover: T) => void} cb
	 */
	onPopoverCreated(cb) {
		this.#onPopoverCreatedCbs.add(cb);
	}
}
