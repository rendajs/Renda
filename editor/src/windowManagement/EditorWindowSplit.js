import {EditorWindow} from "./EditorWindow.js";
import {clamp01, mapValue} from "../../../src/util/mod.js";
import {getEditorInstance} from "../editorInstance.js";

export class EditorWindowSplit extends EditorWindow {
	constructor() {
		super();

		this.el.classList.add("editorWindowSplit");

		this.splitHorizontal = false;
		this.splitPercentage = 0.5;
		this.windowA = null;
		this.windowB = null;

		this.isResizing = false;
		this.boundOnResizerDown = this.onResizerDown.bind(this);
		this.boundOnResizerMove = this.onResizerMove.bind(this);
		this.boundOnResizerUp = this.onResizerUp.bind(this);

		this.resizeStartBounds = null;

		this.elA = document.createElement("div");
		this.elA.classList.add("editorWindowSplitHalf");
		this.el.appendChild(this.elA);

		this.resizer = document.createElement("div");
		this.resizer.classList.add("editorWindowSplitResizer");
		this.el.appendChild(this.resizer);

		this.resizer.addEventListener("mousedown", this.boundOnResizerDown);

		this.elB = document.createElement("div");
		this.elB.classList.add("editorWindowSplitHalf");
		this.el.appendChild(this.elB);
	}

	/**
	 * @param {EditorWindow} windowA
	 * @param {EditorWindow} windowB
	 */
	setWindows(windowA, windowB) {
		this.windowA = windowA;
		this.windowB = windowB;
		this.windowA.setParent(this);
		this.windowB.setParent(this);
		this.windowA.onWorkspaceChange(() => this.fireWorkspaceChangeCbs());
		this.windowB.onWorkspaceChange(() => this.fireWorkspaceChangeCbs());
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
		this.elA = null;
		this.onResizerUp();
		this.resizer.removeEventListener("mousedown", this.boundOnResizerDown);
		this.resizer = null;
		this.elB = null;
		super.destructor();
	}

	updateEls() {
		while (this.elA.firstChild) {
			this.elA.removeChild(this.elA.firstChild);
		}
		while (this.elB.firstChild) {
			this.elB.removeChild(this.elB.firstChild);
		}

		if (this.windowA.el) this.elA.appendChild(this.windowA.el);
		if (this.windowB.el) this.elB.appendChild(this.windowB.el);

		this.updateSplit();

		this.windowA.updateEls();
		this.windowB.updateEls();
	}

	updateSplit() {
		this.el.style.flexDirection = this.splitHorizontal ? "column" : "row";

		this.resizer.style.width = this.splitHorizontal ? null : "3px";
		this.resizer.style.height = this.splitHorizontal ? "3px" : null;
		this.resizer.style.cursor = this.splitHorizontal ? "row-resize" : "col-resize";
		this.resizer.style.transform = this.splitHorizontal ? "scale(1, 2.5)" : "scale(2.5, 1)";

		this.elA.style.flexGrow = String(this.splitPercentage);
		this.elB.style.flexGrow = String(1 - this.splitPercentage);
		this.elA.style.flexBasis = "0";
		this.elB.style.flexBasis = "0";
	}

	onResizerDown(e) {
		this.isResizing = true;
		this.resizeStartBounds = this.el.getBoundingClientRect();
		window.addEventListener("mouseup", this.boundOnResizerUp);
		window.addEventListener("mousemove", this.boundOnResizerMove);
	}

	onResizerMove(e) {
		this.calcNewPercentage(
			this.splitHorizontal ? this.resizeStartBounds.top : this.resizeStartBounds.left,
			this.splitHorizontal ? this.resizeStartBounds.bottom : this.resizeStartBounds.right,
			this.splitHorizontal ? e.clientY : e.clientX
		);
	}

	calcNewPercentage(boundStart, boundEnd, newValue) {
		const newPercentage = mapValue(boundStart, boundEnd, 0, 1, newValue);
		this.setNewSplitPercentage(newPercentage);
	}

	setNewSplitPercentage(newPercentage) {
		this.splitPercentage = clamp01(newPercentage);
		this.updateSplit();
		this.onResized();
	}

	onResizerUp(e) {
		this.isResizing = false;
		window.removeEventListener("mouseup", this.boundOnResizerUp);
		window.removeEventListener("mousemove", this.boundOnResizerMove);
	}

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
	 * @param {EditorWindow} closedSplitWindow
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
		if (this.isRoot) {
			getEditorInstance().windowManager.replaceRootWindow(remainingWindow);
		} else if (this.parent && this.parent instanceof EditorWindowSplit) {
			this.parent.replaceWindow(this, remainingWindow);
			this.destructor();
		}
	}

	/**
	 * @param {EditorWindow} oldWindow
	 * @param {EditorWindow} newWindow
	 */
	replaceWindow(oldWindow, newWindow) {
		if (this.windowA === oldWindow) {
			this.windowA = newWindow;
		} else if (this.windowB === oldWindow) {
			this.windowB = newWindow;
		}
		newWindow.setParent(this);
		this.updateEls();
	}

	onResized() {
		super.onResized();
		if (this.windowA) this.windowA.onResized();
		if (this.windowB) this.windowB.onResized();
		this.fireWorkspaceChangeCbs();
	}
}
