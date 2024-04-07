/** @typedef {"user" | "application" | "load"} WorkspaceChangeTrigger */
/**
 * @typedef WorkspaceChangeEvent
 * @property {WorkspaceChangeTrigger} trigger
 */

export class StudioWindow {
	#focusWithin = false;
	/** @type {Set<(hasFocus: boolean) => any>} */
	#onFocusedChangeCbs = new Set();
	/** @type {Set<(e: MouseEvent) => any>} */
	#onClickWithinCbs = new Set();

	/** @typedef {(event: WorkspaceChangeEvent)  => void} OnWorkspaceChangeCallback */

	/** @type {Set<OnWorkspaceChangeCallback>} */
	#onWorkspaceChangeCbs = new Set();

	/**
	 * @param {import("./WindowManager.js").WindowManager} windowManager
	 */
	constructor(windowManager) {
		this.el = document.createElement("div");
		this.el.tabIndex = -1;

		/** @type {StudioWindow?} */
		this.parent = null;
		this.windowManager = windowManager;
		this.isRoot = false;

		this.el.addEventListener("click", (e) => {
			this.#onClickWithinCbs.forEach((cb) => cb(e));
		});
		this.el.addEventListener("focusin", (e) => {
			this.#updateFocusWithin(e.target);
		});
		this.el.addEventListener("focusout", (e) => {
			this.#updateFocusWithin(e.relatedTarget);
		});
	}

	destructor() {
		if (this.el && this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		this.#onWorkspaceChangeCbs.clear();
	}

	init() {}

	setRoot() {
		this.isRoot = true;
		this.parent = null;
		this.el.classList.add("studio-window-root");
	}

	/**
	 * @param {EventTarget?} target The element receiving focus
	 */
	#updateFocusWithin(target) {
		let focusWithin = false;
		if (target && target instanceof Node && this.el.contains(target)) {
			focusWithin = true;
		}
		if (focusWithin == this.#focusWithin) return;
		this.#focusWithin = focusWithin;
		for (const cb of this.#onFocusedChangeCbs) {
			cb(focusWithin);
		}
	}

	/**
	 * @param {(hasFocus: boolean) => any} cb
	 */
	onFocusedWithinChange(cb) {
		this.#onFocusedChangeCbs.add(cb);
	}

	/**
	 * @param {(e: MouseEvent) => void} cb
	 */
	onClickWithin(cb) {
		this.#onClickWithinCbs.add(cb);
	}

	focus() {
		this.el.focus();
	}

	updateEls() {}

	/**
	 * @param {typeof import("./contentWindows/ContentWindow.js").ContentWindow} constructor
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	onContentWindowRegistered(constructor, trigger) {}

	/**
	 * @param {StudioWindow} parent
	 */
	setParent(parent) {
		this.parent = parent;
	}

	getParent() {}

	/**
	 * @returns {Generator<StudioWindow>}
	 */
	*getChildren() {}

	/**
	 * @param {import("./contentWindows/ContentWindow.js").ContentWindow} contentWindow
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	contentWindowDetached(contentWindow, trigger) {}

	/**
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	onResized(trigger) {}

	/**
	 * @param {OnWorkspaceChangeCallback} cb
	 */
	onWorkspaceChange(cb) {
		this.#onWorkspaceChangeCbs.add(cb);
	}

	/**
	 * @param {OnWorkspaceChangeCallback} cb
	 */
	removeOnWorkspaceChange(cb) {
		this.#onWorkspaceChangeCbs.delete(cb);
	}

	/**
	 * @param {WorkspaceChangeEvent} event
	 */
	fireWorkspaceChangeCbs(event) {
		if (this.parent) {
			this.parent.fireWorkspaceChangeCbs(event);
		} else {
			for (const cb of this.#onWorkspaceChangeCbs) {
				cb(event);
			}
		}
	}
}
