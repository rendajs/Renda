export class EditorWindow {
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

		/** @type {Set<(hasFocus: boolean) => any>} */
		this.onFocusedChangeCbs = new Set();
		this.el.addEventListener("focusin", () => {
			this.fireFocusedChange(true);
		});
		this.el.addEventListener("focusout", () => {
			this.fireFocusedChange(false);
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
	 * @param {(hasFocus: boolean) => any} cb
	 */
	onFocusedChange(cb) {
		this.onFocusedChangeCbs.add(cb);
	}

	/**
	 * @param {boolean} hasFocus
	 */
	fireFocusedChange(hasFocus) {
		for (const cb of this.onFocusedChangeCbs) {
			cb(hasFocus);
		}
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
