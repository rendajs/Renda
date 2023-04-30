import {StudioWindow} from "./StudioWindow.js";
import {clamp01, mapValue} from "../../../src/util/mod.js";
import {getStudioInstance} from "../studioInstance.js";

export class SplitStudioWindow extends StudioWindow {
	/** @type {{stopGesture: () => void}?} */
	#currentGesture = null;

	/**
	 * @param {ConstructorParameters<typeof StudioWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.el.classList.add("studio-window-split");

		this.splitHorizontal = false;
		this.splitPercentage = 0.5;
		this.windowA = null;
		this.windowB = null;

		this.isResizing = false;

		this.resizeStartBounds = null;

		this.elA = document.createElement("div");
		this.elA.classList.add("studio-window-split-half");
		this.el.appendChild(this.elA);

		this.resizer = document.createElement("div");
		this.el.appendChild(this.resizer);

		this.resizer.addEventListener("mousedown", this.#onResizerDown);

		this.elB = document.createElement("div");
		this.elB.classList.add("studio-window-split-half");
		this.el.appendChild(this.elB);
	}

	/**
	 * @param {StudioWindow?} windowA
	 * @param {StudioWindow?} windowB
	 */
	setWindows(windowA, windowB) {
		this.windowA = windowA;
		this.windowB = windowB;
		if (this.windowA) this.windowA.setParent(this);
		if (this.windowB) this.windowB.setParent(this);
		if (this.windowA) this.windowA.onWorkspaceChange(() => this.fireWorkspaceChangeCbs());
		if (this.windowB) this.windowB.onWorkspaceChange(() => this.fireWorkspaceChangeCbs());
	}

	init() {
		if (this.windowA) this.windowA.init();
		if (this.windowB) this.windowB.init();
	}

	destructor() {
		if (this.windowA) this.windowA.destructor();
		if (this.windowB) this.windowB.destructor();
		this.windowA = null;
		this.windowB = null;
		this.#onResizerUp();
		this.resizer.removeEventListener("mousedown", this.#onResizerDown);
		super.destructor();
	}

	updateEls() {
		while (this.elA.firstChild) {
			this.elA.removeChild(this.elA.firstChild);
		}
		while (this.elB.firstChild) {
			this.elB.removeChild(this.elB.firstChild);
		}

		if (this.windowA?.el) this.elA.appendChild(this.windowA.el);
		if (this.windowB?.el) this.elB.appendChild(this.windowB.el);

		this.updateSplit();

		this.windowA?.updateEls();
		this.windowB?.updateEls();
	}

	updateSplit() {
		this.el.style.flexDirection = this.splitHorizontal ? "column" : "row";

		this.resizer.style.width = this.splitHorizontal ? "" : "3px";
		this.resizer.style.height = this.splitHorizontal ? "3px" : "";
		this.resizer.style.cursor = this.splitHorizontal ? "row-resize" : "col-resize";
		this.resizer.style.transform = this.splitHorizontal ? "scale(1, 2.5)" : "scale(2.5, 1)";

		this.elA.style.flexGrow = String(this.splitPercentage);
		this.elB.style.flexGrow = String(1 - this.splitPercentage);
		this.elA.style.flexBasis = "0";
		this.elB.style.flexBasis = "0";
	}

	#onResizerDown = () => {
		this.isResizing = true;
		this.resizeStartBounds = this.el.getBoundingClientRect();
		window.addEventListener("mouseup", this.#onResizerUp);
		window.addEventListener("mousemove", this.#onResizerMove);
		const previousGesture = this.#currentGesture;
		this.#currentGesture = getStudioInstance().gestureInProgressManager.startGesture();
		if (previousGesture) previousGesture.stopGesture();
	};

	/**
	 * @param {MouseEvent} e
	 */
	#onResizerMove = e => {
		if (!this.resizeStartBounds) return;
		this.calcNewPercentage(
			this.splitHorizontal ? this.resizeStartBounds.top : this.resizeStartBounds.left,
			this.splitHorizontal ? this.resizeStartBounds.bottom : this.resizeStartBounds.right,
			this.splitHorizontal ? e.clientY : e.clientX
		);
	};

	/**
	 * @param {number} boundStart
	 * @param {number} boundEnd
	 * @param {number} newValue
	 */
	calcNewPercentage(boundStart, boundEnd, newValue) {
		const newPercentage = mapValue(boundStart, boundEnd, 0, 1, newValue);
		this.setNewSplitPercentage(newPercentage);
	}

	/**
	 * @param {number} newPercentage
	 */
	setNewSplitPercentage(newPercentage) {
		this.splitPercentage = clamp01(newPercentage);
		this.updateSplit();
		this.onResized();
	}

	#onResizerUp = () => {
		this.isResizing = false;
		window.removeEventListener("mouseup", this.#onResizerUp);
		window.removeEventListener("mousemove", this.#onResizerMove);
		if (this.#currentGesture) {
			this.#currentGesture.stopGesture();
			this.#currentGesture = null;
		}
	};

	*getChildren() {
		if (this.windowA) {
			yield this.windowA;
			for (const child of this.windowA.getChildren()) {
				yield child;
			}
		}
		if (this.windowB) {
			yield this.windowB;
			for (const child of this.windowB.getChildren()) {
				yield child;
			}
		}
	}

	/**
	 * @param {StudioWindow} closedSplitWindow
	 */
	unsplitWindow(closedSplitWindow) {
		let remainingWindow;
		if (closedSplitWindow === this.windowA) {
			remainingWindow = this.windowB;
			this.windowB = null;
		} else if (closedSplitWindow === this.windowB) {
			remainingWindow = this.windowA;
			this.windowA = null;
		}
		if (!remainingWindow) {
			throw new Error("closedSplitWindow is not a child of this split window.");
		}
		if (this.isRoot) {
			this.windowManager.replaceRootWindow(remainingWindow);
		} else if (this.parent && this.parent instanceof SplitStudioWindow) {
			this.parent.replaceWindow(this, remainingWindow);
			this.destructor();
		}
	}

	/**
	 * @param {StudioWindow} oldWindow
	 * @param {StudioWindow} newWindow
	 */
	replaceWindow(oldWindow, newWindow) {
		if (this.windowA === oldWindow) {
			this.windowA = newWindow;
		} else if (this.windowB === oldWindow) {
			this.windowB = newWindow;
		}
		newWindow.setParent(this);
		this.updateEls();
		this.fireWorkspaceChangeCbs();
	}

	onResized() {
		super.onResized();
		if (this.windowA) this.windowA.onResized();
		if (this.windowB) this.windowB.onResized();
		this.fireWorkspaceChangeCbs();
	}
}
