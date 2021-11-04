import {ContentWindowPersistentData} from "../ContentWindowPersistentData.js";

export default class ContentWindow {
	/**
	 * Should be overridden by inherited class.
	 * This name will be used for saving the users workspace.
	 * @type {string}
	 */
	static contentWindowTypeId = null;

	/**
	 * Should be overridden by inherited class.
	 * This name will be visible in the UI.
	 * @type {string}
	 */
	static contentWindowUiName = null;

	/**
	 * The icon that is visible in the tab selector.
	 * @type {string}
	 */
	static contentWindowUiIcon = "icons/generic.svg";

	constructor() {
		/** @type {import("../EditorWindowTabs.js").default}*/
		this.parentEditorWindow = null;
		/**
		 * The instance uuid of the ContentWindow.
		 * This is used for dragging tabs and associating the ContentWindow with the persistent data.
		 * @type {import("../../Util/Util.js").UuidString}
		 */
		this.uuid = null;
		/** @type {import("../WindowManager.js").default} */
		this.windowManager = null;

		this.persistentData = new ContentWindowPersistentData();

		this.destructed = false;

		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");

		this.topButtonBar = document.createElement("div");
		this.topButtonBar.classList.add("editorContentWindowTopButtonBar");
		this.el.appendChild(this.topButtonBar);

		this.tabSelectorSpacer = document.createElement("div");
		this.tabSelectorSpacer.classList.add("editorContentWindowTopButtonBarSpacer");
		this.topButtonBar.appendChild(this.tabSelectorSpacer);

		this.contentEl = document.createElement("div");
		this.contentEl.classList.add("editorContentWindowContent");
		this.el.appendChild(this.contentEl);

		this.addedButtons = [];

		if (this.loop != ContentWindow.prototype.loop) {
			window.requestAnimationFrame(this._loop.bind(this));
		}
	}

	destructor() {
		this.destructed = true;
		this.el = null;
		this.topButtonBar = null;
		this.tabSelectorSpacer = null;
		this.contentEl = null;
		for (const b of this.addedButtons) {
			b.destructor();
		}
		this.addedButtons = [];
	}

	/**
	 * @param {import("../EditorWindowTabs.js").default} parentEditorWindow
	 */
	attachParentEditorWindow(parentEditorWindow) {
		this.parentEditorWindow = parentEditorWindow;
	}

	detachParentEditorWindow() {
		if (!this.parentEditorWindow) return;
		this.parentEditorWindow.contentWindowDetached(this);
		this.parentEditorWindow = null;
	}

	setVisible(visible) {
		this.el.classList.toggle("hidden", !visible);
	}

	updateTabSelectorSpacer(w, h) {
		this.tabSelectorSpacer.style.width = w + "px";
		this.tabSelectorSpacer.style.height = h + "px";
	}

	setContentBehindTopBar(value) {
		this.contentEl.classList.toggle("behindTopButtonBar", value);
	}

	get contentWidth() {
		return this.contentEl.clientWidth;
	}
	get contentHeight() {
		return this.contentEl.clientHeight;
	}

	fireOnWindowResize() {
		this.onWindowResize(this.contentWidth, this.contentHeight);
	}

	/**
	 * This will be called once when the content window is attached to the dom,
	 * and subsequently when the window is resized.
	 * @param {number} w
	 * @param {number} h
	 */
	onWindowResize(w, h) {}

	addTopBarButton(button) {
		this.addedButtons.push(button);
		this.topButtonBar.appendChild(button.el);
	}

	_loop() {
		if (!this.el) return; // if destructed
		this.loop();
		window.requestAnimationFrame(this._loop.bind(this));
	}

	loop() {}
}
