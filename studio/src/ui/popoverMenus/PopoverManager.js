import { waitForEventLoop } from "../../../../src/util/util.js";
import { ColorizerFilterManager } from "../../util/colorizerFilters/ColorizerFilterManager.js";
import { ContextMenu } from "./ContextMenu.js";
import { Popover } from "./Popover.js";

export class PopoverManager {
	/**
	 * @type {Popover[]}
	 */
	#activePopovers = [];

	constructor() {
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("popover-curtain");

		const iconDefaultColorFilter = ColorizerFilterManager.instance().getFilter("var(--text-color-level0)");
		const iconHoverColorFilter = ColorizerFilterManager.instance().getFilter("var(--selected-text-color)");

		// References are kept around to ensure the filters don't get garbage collected.
		this.iconDefaultColorFilterRef = iconDefaultColorFilter.getUsageReference();
		this.iconHoverColorFilterRef = iconHoverColorFilter.getUsageReference();

		const styleBlock = document.createElement("style");
		styleBlock.textContent = `
			.context-menu-item-icon {
				filter: url(#${iconDefaultColorFilter.getFilterId()});
			}
			.context-menu-item:hover:not(.disabled) .context-menu-item-icon {
				filter: url(#${iconHoverColorFilter.getFilterId()});
			}
		`;
		document.head.appendChild(styleBlock);

		this.#updateCurtainActive();
	}

	/**
	 * Adds a new popover instance to the manager. Returns the instantiated popover which can then be further configured
	 * using the instantiate() method.
	 *
	 * @template {Popover} TConstructor
	 * @template {any[]} TArgs
	 * @param {new (manager: PopoverManager, ...args: TArgs) => TConstructor} PopoverConstructor The popover class constructor to add. Defaults to Popover.
	 * @param {TArgs} args
	 */
	addPopover(PopoverConstructor = /** @type  {new (...args: any[]) => TConstructor} */ (Popover), ...args) {
		const popover = new PopoverConstructor(this, ...args);

		popover.onNeedsCurtainChange(this.#updateCurtainActive);
		this.#activePopovers.push(popover);
		this.#updateCurtainActive();

		// If a popover is opened as part of clicking a button, the click event will fire on the body immediately
		// after clicking that button. This would cause the popover to immediately close again.
		// To prevent this, we run this code in the next event loop.
		waitForEventLoop().then(() => {
			this.#updateBodyClickListener();
		});

		return popover;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure?} structure
	 * @returns {ContextMenu}
	 */
	createContextMenu(structure = null) {
		return this.addPopover(ContextMenu, { structure });
	}

	getLastPopover() {
		if (this.#activePopovers.length > 0) {
			return this.#activePopovers[this.#activePopovers.length - 1];
		} else {
			throw new Error("Error retrieving last popover from manager: No popovers exist");
		}
	}

	/**
	 * Removes the specified popover from the manager.
	 *
	 * @param {Popover} popover
	 * @returns {boolean} Returns true if the popover was successfully removed, false otherwise
	 */
	removePopover(popover) {
		const idx = this.#activePopovers.indexOf(popover);

		if (idx === -1) {
			return false;
		}

		this.#activePopovers.splice(idx, 1);
		this.#updateCurtainActive();
		this.#updateBodyClickListener();
		return true;
	}

	#updateBodyClickListener() {
		const needsListener = Boolean(this.#activePopovers.length);
		if (needsListener == this.#hasBodyClickListener) return;
		if (needsListener) {
			document.body.addEventListener("click", this.#onBodyClick);
		} else {
			document.body.removeEventListener("click", this.#onBodyClick);
		}
		this.#hasBodyClickListener = needsListener;
	}

	#hasBodyClickListener = false;

	/**
	 * @param {MouseEvent} e
	 */
	#onBodyClick = (e) => {
		if (this.#activePopovers.length === 0) {
			throw new Error("Error handling body click: No popovers exist");
		}

		if (this.#activePopovers.some((p) => p.el === e.target || p.el.contains(/** @type {Node} */(e.target)))) {
			return;
		}

		this.#activePopovers.forEach((p) => {
			p.close();
		});
	};

	#updateCurtainActive = () => {
		const needsCurtain = this.#activePopovers.some((p) => p.needsCurtain);
		if (needsCurtain) {
			document.body.appendChild(this.curtainEl);
		} else {
			this.curtainEl.remove();
		}
	};
}
