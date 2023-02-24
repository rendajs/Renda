import {STUDIO_ENV} from "../../studioDefines.js";
import {ContentWindowPersistentData} from "../ContentWindowPersistentData.js";

export class ContentWindow {
	/**
	 * Should be overridden by inherited class.
	 * This name will be used for saving the users workspace.
	 * @type {string}
	 */
	static contentWindowTypeId = "";

	/**
	 * Should be overridden by inherited class.
	 * This name will be visible in the UI.
	 * @type {string}
	 */
	static contentWindowUiName = "";

	/**
	 * The icon that is visible in the tab selector.
	 * @type {string}
	 */
	static contentWindowUiIcon = "static/icons/generic.svg";

	/**
	 * Whether the window should get a scroll bar if the contents don't fit
	 * inside the window.
	 */
	static scrollable = true;

	/**
	 * @param {import("../../Studio.js").Studio} studioInstance
	 * @param {import("../WindowManager.js").WindowManager} windowManager
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 */
	constructor(studioInstance, windowManager, uuid) {
		this.studioInstance = studioInstance;
		this.windowManager = windowManager;

		/** @type {import("../TabsStudioWindow.js").TabsStudioWindow?} */
		this.parentStudioWindow = null;
		/**
		 * The instance uuid of the ContentWindow.
		 * This is used for dragging tabs and linking preferences that are stored in a contentwindow location.
		 */
		this.uuid = uuid;

		this.persistentData = new ContentWindowPersistentData();

		this.destructed = false;

		const castConstructor = /** @type {typeof ContentWindow} */ (this.constructor);

		this.el = document.createElement("div");
		this.el.classList.add("studio-content-window");

		if (STUDIO_ENV == "dev") {
			this.el.dataset.contentWindowTypeId = castConstructor.contentWindowTypeId;
		}

		this.topButtonBar = document.createElement("div");
		this.topButtonBar.classList.add("studio-content-window-top-button-bar");
		this.el.appendChild(this.topButtonBar);

		this.tabSelectorSpacer = document.createElement("div");
		this.tabSelectorSpacer.classList.add("studio-content-window-top-button-bar-spacer");
		this.topButtonBar.appendChild(this.tabSelectorSpacer);

		this.contentEl = document.createElement("div");
		this.contentEl.classList.add("studio-content-window-content");
		this.contentEl.classList.toggle("scrollable", castConstructor.scrollable);
		this.el.appendChild(this.contentEl);

		if (this.loop != ContentWindow.prototype.loop) {
			window.requestAnimationFrame(this._loop.bind(this));
		}
	}

	/**
	 * Gets called after the content window is attached to the dom,
	 * {@link onWindowResize} will be called once after this.
	 */
	init() {}

	destructor() {
		this.destructed = true;
	}

	/**
	 * @param {import("../TabsStudioWindow.js").TabsStudioWindow} parentStudioWindow
	 */
	attachParentStudioWindow(parentStudioWindow) {
		this.parentStudioWindow = parentStudioWindow;
	}

	detachParentStudioWindow() {
		if (!this.parentStudioWindow) return;
		this.parentStudioWindow.contentWindowDetached(this);
		this.parentStudioWindow = null;
	}

	/**
	 * @param {boolean} visible
	 */
	setVisible(visible) {
		this.el.classList.toggle("hidden", !visible);
	}

	/**
	 * Gets called when the user clicks this content window so that it receives focus.
	 * Normally you would use this to activate any selection groups related to the contentwindow.
	 * This maybe called multiple times even though the window is already active.
	 */
	activate() {}

	/**
	 * @param {number} w
	 * @param {number} h
	 */
	updateTabSelectorSpacer(w, h) {
		this.tabSelectorSpacer.style.width = w + "px";
		this.tabSelectorSpacer.style.height = h + "px";
	}

	/**
	 * Changes the behaviour of where the content window is rendered.
	 * If true the buttons of the top bar will be rendered on top of the
	 * content and the content will be extended to the top edge of the window.
	 * @param {boolean} value
	 */
	setContentBehindTopBar(value) {
		this.contentEl.classList.toggle("behind-top-button-bar", value);
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

	isMostSuitableContentWindow() {
		const castConstructor = /** @type {typeof ContentWindow} */ (this.constructor);
		const mostSuitable = this.windowManager.getMostSuitableContentWindowByConstructor(castConstructor, false);
		return mostSuitable == this;
	}

	/**
	 * @param {HTMLElement} element
	 */
	addTopBarEl(element) {
		this.topButtonBar.appendChild(element);
	}

	_loop() {
		if (this.destructed) return;
		this.loop();
		window.requestAnimationFrame(this._loop.bind(this));
	}

	loop() {}
}
