export class EditorWindow {
	#focusWithin = false;
	/** @type {Set<(hasFocus: boolean) => any>} */
	#onFocusedChangeCbs = new Set();
	/** @type {Set<() => any>} */
	#onClickWithinCbs = new Set();

	/**
	 * @param {import("./WindowManager.js").WindowManager} windowManager
	 */
	constructor(windowManager) {
		this.el = document.createElement("div");
		this.el.tabIndex = -1;

		/** @type {EditorWindow?} */
		this.parent = null;
		this.windowManager = windowManager;
		this.isRoot = false;

		this.el.addEventListener("click", () => {
			this.#onClickWithinCbs.forEach(cb => cb());
		});
		this.el.addEventListener("focusin", e => {
			this.#updateFocusWithin(e.target);
		});
		this.el.addEventListener("focusout", e => {
			this.#updateFocusWithin(e.relatedTarget);
		});

		/** @type {Set<function() : void>} */
		this.onWorkspaceChangeCbs = new Set();
	}

	destructor() {
		if (this.el && this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		this.onWorkspaceChangeCbs.clear();
	}

	init() {}

	setRoot() {
		this.isRoot = true;
		this.parent = null;
		this.el.classList.add("editorWindowRoot");
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
	 * @param {() => void} cb
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
	 */
	onContentWindowRegistered(constructor) {}

	/**
	 * @param {EditorWindow} parent
	 */
	setParent(parent) {
		this.parent = parent;
	}

	getParent() {}

	/**
	 * @returns {Generator<EditorWindow>}
	 */
	*getChildren() {}

	/**
	 * @param {import("./contentWindows/ContentWindow.js").ContentWindow} contentWindow
	 */
	contentWindowDetached(contentWindow) {}

	onResized() {}

	/**
	 * @param {function() : void} cb
	 */
	onWorkspaceChange(cb) {
		this.onWorkspaceChangeCbs.add(cb);
	}

	fireWorkspaceChangeCbs() {
		for (const cb of this.onWorkspaceChangeCbs) {
			cb();
		}
	}
}
