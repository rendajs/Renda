export class EditorWindow {
	constructor() {
		this.el = document.createElement("div");
		this.el.tabIndex = -1;

		/** @type {EditorWindow} */
		this.parent = null;
		/** @type {import("./WindowManager.js").WindowManager} */
		this.windowManager = null;
		this.isRoot = false;

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
		this.el = null;
		this.onWorkspaceChangeCbs.clear();
	}

	init() {}

	setRoot() {
		this.isRoot = true;
		this.parent = null;
		this.el.classList.add("editorWindowRoot");
	}

	/**
	 * @param {(hasFocus: boolean) => void} cb
	 */
	onFocusedChange(cb) {
		this.onFocusedChangeCbs.add(cb);
	}

	fireFocusedChange(hasFocus) {
		for (const cb of this.onFocusedChangeCbs) {
			cb(hasFocus);
		}
	}

	focus() {
		this.el.focus();
	}

	updateEls() {}

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
