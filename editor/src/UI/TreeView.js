import editor from "../editorInstance.js";
import {iLerp, parseMimeType} from "../Util/Util.js";

/**
 * @typedef {Object} TreeViewEvent
 * @property {TreeView} target
 * @property {Event} [rawEvent]
 */

/**
 * @typedef {Object} TreeViewDragEventType
 * @property {DragEvent} rawEvent
 *
 * @typedef {TreeViewEvent & TreeViewDragEventType} TreeViewDragEvent
 */

/**
 * @typedef {Object} TreeViewNameChangeEventType
 * @property {string} oldName
 * @property {string} newName
 *
 * @typedef {TreeViewEvent & TreeViewNameChangeEventType} TreeViewNameChangeEvent
 */

/**
 * @callback showContextMenuCallback
 * @param {import("./ContextMenus/ContextMenu.js").ContextMenuStructure} [structure]
 * @returns {import("./ContextMenus/ContextMenu.js").default}
 */

/**
 * @typedef {Object} TreeViewContextMenuEventType
 * @property {showContextMenuCallback} showContextMenu
 *
 * @typedef {TreeViewEvent & TreeViewContextMenuEventType} TreeViewContextMenuEvent
 */

/**
 * @typedef {Object} TreeViewSelectionChangeEventType
 * @property {boolean} reset
 * @property {Array<TreeView>} added
 * @property {Array<TreeView>} removed
 *
 * @typedef {TreeViewEvent & TreeViewSelectionChangeEventType} TreeViewSelectionChangeEvent
 */

export default class TreeView {
	#draggable = false;
	#rearrangeable = false;
	#elDraggable = false;

	#boundDragStart = null;
	#boundDragEnd = null;
	#boundDragEnter = null;
	#boundDragOver = null;
	#boundDragLeave = null;
	#boundDrop = null;

	#currenDragFeedbackText = null;
	#currentDraggingRearrangeDataId = null;

	#currenDragFeedbackEl = null;

	constructor(data = {}) {
		this.el = document.createElement("div");
		this.el.classList.add("treeViewItem");

		this.rowEl = document.createElement("div");
		this.rowEl.classList.add("treeViewRow");
		this.el.appendChild(this.rowEl);

		this.boundOnRowClick = this.onRowClick.bind(this);
		this.rowEl.addEventListener("click", this.boundOnRowClick);

		this.boundOnDblClick = this.onDblClick.bind(this);
		this.rowEl.addEventListener("dblclick", this.boundOnDblClick.bind(this));

		this.#boundDragEnter = this.#onDragEnterEvent.bind(this);
		this.#boundDragOver = this.#onDragOverEvent.bind(this);
		this.#boundDragLeave = this.#onDragLeaveEvent.bind(this);
		this.#boundDrop = this.#onDropEvent.bind(this);
		this.rowEl.addEventListener("dragenter", this.#boundDragEnter);
		this.rowEl.addEventListener("dragover", this.#boundDragOver);
		this.rowEl.addEventListener("dragleave", this.#boundDragLeave);
		this.rowEl.addEventListener("drop", this.#boundDrop);

		this.boundOnContextMenuEvent = this.onContextMenuEvent.bind(this);
		this.rowEl.addEventListener("contextmenu", this.boundOnContextMenuEvent);

		this.arrowContainerEl = document.createElement("div");
		this.arrowContainerEl.classList.add("treeViewArrowContainer");
		this.rowEl.appendChild(this.arrowContainerEl);

		this.arrowEl = document.createElement("div");
		this.arrowEl.classList.add("treeViewArrow");
		this.arrowContainerEl.appendChild(this.arrowEl);

		this.onCollapsedChangeCbs = [];
		this.boundArrowClickEvent = this.arrowClickEvent.bind(this);
		this.arrowContainerEl.addEventListener("click", this.boundArrowClickEvent);

		this.boundArrowHoverStartEvent = this.arrowHoverStartEvent.bind(this);
		this.boundArrowHoverEndEvent = this.arrowHoverEndEvent.bind(this);
		this.arrowContainerEl.addEventListener("pointerenter", this.boundArrowHoverStartEvent);
		this.arrowContainerEl.addEventListener("pointerleave", this.boundArrowHoverEndEvent);

		this.hasFocusWithin = false;
		this.boundOnFocusIn = this.onFocusIn.bind(this);
		this.boundOnFocusOut = this.onFocusOut.bind(this);

		this.boundOnSelectPreviousKeyPressed = this.onSelectPreviousKeyPressed.bind(this);
		this.boundOnSelectNextKeyPressed = this.onSelectNextKeyPressed.bind(this);
		this.boundOnExpandSelectedKeyPressed = this.onExpandSelectedKeyPressed.bind(this);
		this.boundOnCollapseSelectedKeyPressed = this.onCollapseSelectedKeyPressed.bind(this);

		this.myNameEl = document.createElement("div");
		this.myNameEl.classList.add("treeViewName");
		this.rowEl.appendChild(this.myNameEl);

		this.addedButtons = [];
		this.buttonsEl = document.createElement("div");
		this.buttonsEl.classList.add("treeViewButtons");
		this.rowEl.appendChild(this.buttonsEl);

		this.childrenEl = document.createElement("div");
		this.childrenEl.classList.add("treeViewChildList");
		this.el.appendChild(this.childrenEl);

		if (data.addCustomEl) {
			this.customEl = document.createElement("div");
			this.customEl.classList.add("treeViewCustomEl");
			this.el.appendChild(this.customEl);
		}

		this.destructed = false;
		this._name = "";
		this.children = [];
		this.parent = data.parent ?? null;
		this.recursionDepth = 0;
		this._collapsed = false;
		this.selectable = data.selectable ?? true; // todo: make this private or a getter/setter
		this._alwaysShowArrow = false;
		this.canSelectMultiple = true;
		this.renameable = false;
		this._textFieldVisible = false;
		this.renameTextField = null;
		this._rowVisible = data.rowVisible ?? true;
		this._visible = data.visible ?? true;

		if (this.selectable) {
			// todo: update at runtime when this.selectable changes
			this.rowEl.tabIndex = 0;
		}

		if (data.copySettings) {
			this.collapsed = data.copySettings.collapsed;
			this.selectable = data.copySettings.selectable;
			this.canSelectMultiple = data.copySettings.canSelectMultiple;
			this.renameable = data.copySettings.renameable;
			this.draggable = data.copySettings.draggable;
			this.rearrangeable = data.copySettings.rearrangeable;
		}

		this.selected = false; // todo: make this private or a getter/setter

		this.lastHighlightTime = 0;
		this.boundOnBodyClick = this.onBodyClick.bind(this);

		this.eventCbs = new Map();
		for (const eventType of ["selectionchange", "namechange", "dragstart", "drop", "dblclick", "contextmenu"]) {
			this.registerNewEventType(eventType);
		}

		this.updateArrowHidden();
		if (data) this.updateData(data);
		this.updatePadding();

		this.hasRootEventListeners = false;
		this.updeteRootEventListeners();

		this.updateRowVisibility();
		this.#updateElDraggable();
	}

	destructor() {
		this.destructed = true;
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		this.rowEl.removeEventListener("click", this.boundOnRowClick);
		this.boundOnRowClick = null;
		this.rowEl.removeEventListener("contextmenu", this.boundOnContextMenuEvent);
		this.boundOnContextMenuEvent = null;
		this.arrowContainerEl.removeEventListener("click", this.boundArrowClickEvent);
		this.boundArrowClickEvent = null;

		this.rowEl.removeEventListener("dragstart", this.#boundDragStart);
		this.rowEl.removeEventListener("dragend", this.#boundDragEnd);
		this.rowEl.removeEventListener("dragenter", this.#boundDragEnter);
		this.rowEl.removeEventListener("dragover", this.#boundDragOver);
		this.rowEl.removeEventListener("dragleave", this.#boundDragLeave);
		this.rowEl.removeEventListener("drop", this.#boundDrop);

		this.rowEl = null;
		this.arrowContainerEl = null;
		this.arrowEl = null;
		this.myNameEl = null;
		for (const b of this.addedButtons) {
			b.destructor();
		}
		this.addedButtons = [];

		this.updeteRootEventListeners();
		this.boundOnFocusIn = null;
		this.boundOnFocusOut = null;
		this.boundOnSelectPreviousKeyPressed = null;
		this.boundOnSelectNextKeyPressed = null;
		this.boundOnExpandSelectedKeyPressed = null;
		this.boundOnCollapseSelectedKeyPressed = null;

		this.childrenEl = null;
		this.customEl = null;
		for (const child of this.children) {
			child.destructor();
		}
		this.children = null;
		this.setParent(null);

		this.onCollapsedChangeCbs = null;
		this.eventCbs = null;

		this.el = null;
	}

	get name() {
		return this._name;
	}

	set name(value) {
		this._name = value;
		this.myNameEl.textContent = value;
	}

	updateData(data = {}) {
		this.name = data.name || "";
		if (data.collapsed !== undefined) this.collapsed = data.collapsed;
		const newChildren = data.children || [];
		const deltaChildren = newChildren.length - this.children.length;
		if (deltaChildren > 0) {
			for (let i = 0; i < deltaChildren; i++) {
				this.addChild();
			}
		} else if (deltaChildren < 0) {
			for (let i = this.children.length - 1; i >= newChildren.length; i--) {
				this.removeChildIndex(i);
			}
		}
		for (let i = 0; i < this.children.length; i++) {
			this.children[i].updateData(newChildren[i]);
		}
	}

	addButton(button) {
		this.addedButtons.push(button);
		this.buttonsEl.appendChild(button.el);
	}

	calculateRecursionDepth() {
		if (this.isRoot) {
			this.recursionDepth = 0;
		} else {
			this.recursionDepth = this.parent.recursionDepth + 1;
		}
		this.updatePadding();
	}

	updatePadding() {
		const padding = this.recursionDepth * 12 + 18;
		this.rowEl.style.paddingLeft = padding + "px";
	}

	get isRoot() {
		return !this.parent;
	}

	removeChild(child, destructChild = true) {
		for (const [i, c] of this.children.entries()) {
			if (child == c) {
				this.removeChildIndex(i, destructChild);
				break;
			}
		}
	}

	removeChildIndex(index, destructChild = true) {
		if (destructChild) this.children[index].destructor();
		this.children.splice(index, 1);
		this.updateArrowHidden();
	}

	clearChildren() {
		for (const child of this.children) {
			child.destructor();
		}
		this.children = [];
		this.updateArrowHidden();
	}

	/**
	 * @param {TreeView} parent
	 * @param {boolean} addChild Whether a call should be made to parent.addChild().
	 */
	setParent(parent, addChild = true) {
		if (parent != this.parent) {
			if (this.parent) {
				this.parent.removeChild(this, false);
			}
			this.parent = parent;
			if (parent && addChild) {
				parent.addChild(this);
			}

			this.updeteRootEventListeners();
		}
	}

	/**
	 * @param {?TreeView} treeView The TreeView to insert, creates a new one when null.
	 * @returns {TreeView} The created TreeView.
	 */
	addChild(treeView = null) {
		return this.addChildAtIndex(-1, treeView);
	}

	/**
	 * @param {number} index Index to insert the TreeView at, starts counting from the back when negative.
	 * @param {?TreeView} treeView The TreeView to insert, creates a new one when null.
	 * @returns {TreeView} The created TreeView.
	 */
	addChildAtIndex(index = -1, treeView = null) {
		if (index < 0) {
			index = this.children.length + index + 1;
		}
		if (treeView == null) {
			treeView = new TreeView({
				copySettings: this,
				parent: this,
			});
		}
		treeView.setParent(this, false);
		treeView.calculateRecursionDepth();
		if (index >= this.children.length) {
			this.children.push(treeView);
			this.childrenEl.appendChild(treeView.el);
		} else {
			this.children.splice(index, 0, treeView);
			this.childrenEl.insertBefore(treeView.el, this.childrenEl.children[index]);
		}
		this.updateArrowHidden();
		return treeView;
	}

	get arrowVisible() {
		return this.children.length > 0 || this._alwaysShowArrow;
	}

	updateArrowHidden() {
		if (this.destructed) return;
		this.arrowEl.classList.toggle("hidden", !this.arrowVisible);
	}

	get collapsed() {
		return this._collapsed;
	}

	set collapsed(collapsed) {
		this._collapsed = collapsed;
		this.childrenEl.style.display = collapsed ? "none" : null;
		this.arrowContainerEl.classList.toggle("collapsed", collapsed);
		this.fireOnCollapsedChange();
	}

	get expanded() {
		return !this.collapsed;
	}

	set expanded(value) {
		this.collapsed = !value;
	}

	get rowVisible() {
		return this._rowVisible;
	}

	set rowVisible(value) {
		this._rowVisible = value;
		this.updateRowVisibility();
	}

	get visible() {
		return this._visible;
	}

	set visible(value) {
		this._visible = value;
		this.el.style.display = value ? null : "none";
	}

	updateRowVisibility() {
		this.rowEl.classList.toggle("hidden", !this.rowVisible);
	}

	get alwaysShowArrow() {
		return this._alwaysShowArrow;
	}

	set alwaysShowArrow(value) {
		this._alwaysShowArrow = value;
		this.updateArrowHidden();
	}

	get rearrangeable() {
		return this.#rearrangeable;
	}

	set rearrangeable(value) {
		if (this.#rearrangeable != value) {
			this.#rearrangeable = value;
			this.#updateElDraggable();
		}
	}

	get draggable() {
		return this.#draggable;
	}

	set draggable(value) {
		if (this.#draggable != value) {
			this.#draggable = value;
			this.#updateElDraggable();
		}
	}

	#updateElDraggable() {
		const draggable = this.draggable || this.rearrangeable;
		if (draggable == this.#elDraggable) return;

		this.#elDraggable = draggable;
		this.rowEl.draggable = draggable;
		if (draggable) {
			this.#boundDragStart = this.#onDragStartEvent.bind(this);
			this.#boundDragEnd = this.#onDragEndEvent.bind(this);
			this.rowEl.addEventListener("dragstart", this.#boundDragStart);
			this.rowEl.addEventListener("dragend", this.#boundDragEnd);
		} else {
			this.rowEl.removeEventListener("dragstart", this.#boundDragStart);
			this.rowEl.removeEventListener("dragend", this.#boundDragEnd);
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDragStartEvent(e) {
		const root = this.findRoot();
		const selectedItems = new Set();
		for (const child of root.getSelectedItems()) {
			selectedItems.add(child);
		}
		let draggingItems = [];
		if (selectedItems.has(this)) {
			draggingItems = Array.from(selectedItems);
		} else {
			draggingItems = [this];
		}
		if (this.rearrangeable) {
			e.dataTransfer.effectAllowed = "move";
			this.#currentDraggingRearrangeDataId = editor.dragManager.registerDraggingData({
				root, draggingItems,
			});
			e.dataTransfer.setData("text/jj; dragtype=rearrangingtreeview", this.#currentDraggingRearrangeDataId);
		}
		const {el, x, y} = editor.dragManager.createDragFeedbackText({
			text: draggingItems.map(item => item.name),
		});
		this.#currenDragFeedbackText = el;
		e.dataTransfer.setDragImage(el, x, y);
		this.fireEvent("dragstart", {
			rawEvent: e,
			target: this,
		});
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDragEndEvent(e) {
		if (this.#currenDragFeedbackText) editor.dragManager.removeFeedbackText(this.#currenDragFeedbackText);
		this.#currenDragFeedbackText = null;
		if (this.#currentDraggingRearrangeDataId) editor.dragManager.unregisterDraggingData(this.#currentDraggingRearrangeDataId);
		this.#currentDraggingRearrangeDataId = null;
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDragEnterEvent(e) {
		if (this.#validateDragEvent(e)) {
			e.dataTransfer.dropEffect = "move";
			e.preventDefault();
			this.#updateDragFeedback(e);
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDragOverEvent(e) {
		if (this.#validateDragEvent(e)) {
			e.dataTransfer.dropEffect = "move";
			e.preventDefault();
			this.#updateDragFeedback(e);
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDragLeaveEvent(e) {
		this.#removeDragFeedbackEl();
	}

	/**
	 * @param {DragEvent} e
	 */
	#onDropEvent(e) {
		e.preventDefault();
		this.fireEvent("drop", {
			target: this,
			rawEvent: e,
		});
		this.#removeDragFeedbackEl();
	}

	/**
	 * @param {DragEvent} e
	 * @returns {boolean}
	 */
	#validateDragEvent(e) {
		return e.dataTransfer.types.some(mimeType => this.#validateDragMimeType(mimeType));
	}

	/**
	 * @param {string} mimeType
	 * @returns {boolean}
	 */
	#validateDragMimeType(mimeType) {
		const parsed = parseMimeType(mimeType);
		if (!parsed) return false;
		const {type, subType, params} = parsed;
		if (type != "text" || subType != "jj") return false;
		if (params.dragtype == "rearrangingtreeview") {
			return true;
		}
		return false;
	}

	/**
	 * @param {DragEvent} e
	 */
	#updateDragFeedback(e) {
		if (!this.#currenDragFeedbackEl) {
			this.#currenDragFeedbackEl = document.createElement("div");
			this.#currenDragFeedbackEl.classList.add("tree-view-drag-feedback", "top");
			this.rowEl.appendChild(this.#currenDragFeedbackEl);
		}
		const pos = this.#getDragPosition(e);
		this.#currenDragFeedbackEl.classList.toggle("top", pos == "top");
		this.#currenDragFeedbackEl.classList.toggle("bottom", pos == "bottom");
		this.rowEl.classList.toggle("drag-over-feedback", pos == "middle");
	}

	/**
	 * @param {DragEvent} e
	 * @returns {"top" | "bottom" | "middle"}
	 */
	#getDragPosition(e) {
		const bounds = this.rowEl.getBoundingClientRect();
		const percent = iLerp(bounds.top, bounds.bottom, e.clientY);
		if (percent < 0.25) return "top";
		if (percent > 0.75) return "bottom";
		return "middle";
	}

	#removeDragFeedbackEl() {
		if (!this.#currenDragFeedbackEl) return;
		this.rowEl.removeChild(this.#currenDragFeedbackEl);
		this.#currenDragFeedbackEl = null;
		this.rowEl.classList.remove("drag-over-feedback");
	}

	/**
	 * @returns {Generator<TreeView>}
	 */
	*traverseDown() {
		yield this;
		for (const child of this.children) {
			for (const c of child.traverseDown()) {
				yield c;
			}
		}
	}

	*traverseUp() {
		yield this;
		if (this.parent) {
			for (const p of this.parent.traverseUp()) {
				yield p;
			}
		}
	}

	arrowClickEvent(e) {
		e.stopPropagation();
		this.toggleCollapsed();
	}

	arrowHoverStartEvent(e) {
		if (!this.arrowVisible) return;
		this.arrowContainerEl.classList.toggle("hover", true);
	}

	arrowHoverEndEvent(e) {
		this.arrowContainerEl.classList.toggle("hover", false);
	}

	fireOnCollapsedChange() {
		for (const cb of this.onCollapsedChangeCbs) {
			cb();
		}
	}

	onCollapsedChange(cb) {
		this.onCollapsedChangeCbs.push(cb);
	}

	toggleCollapsed() {
		this.collapsed = !this.collapsed;
	}

	expandWithParents() {
		for (const treeView of this.traverseUp()) {
			treeView.expanded = true;
		}
	}

	highlight() {
		this.lastHighlightTime = Date.now();
		this.rowEl.classList.add("highlighted");
		document.body.addEventListener("click", this.boundOnBodyClick);
	}

	onBodyClick() {
		if (Date.now() - this.lastHighlightTime > 1000) {
			this.rowEl.classList.remove("highlighted");
			document.body.removeEventListener("click", this.boundOnBodyClick);
		}
	}

	onRowClick(e) {
		if (this.selectable) {
			if (this.renameable && this.selected) {
				this.setTextFieldVisible(true);
			} else {
				/** @type {TreeViewSelectionChangeEvent} */
				const changes = {
					target: this,
					rawEvent: null,
					reset: false,
					added: [],
					removed: [],
				};
				const selectExtra = this.canSelectMultiple && (e.metaKey || e.ctrlKey);
				if (selectExtra) {
					if (this.selected) {
						this.deselect();
						changes.removed = [this];
					} else {
						this.select();
						changes.added = [this];
					}
				} else {
					const root = this.findRoot();
					root.deselectAll();
					this.select();
					changes.reset = true;
					changes.added = [this];
				}

				this.fireEvent("selectionchange", changes);
			}
		} else {
			this.toggleCollapsed();
		}
	}

	onDblClick(e) {
		this.fireEvent("dblclick", {
			target: this,
			rawEvent: e,
		});
	}

	setTextFieldVisible(textFieldVisible) {
		if (textFieldVisible != this._textFieldVisible) {
			this._textFieldVisible = textFieldVisible;
			if (textFieldVisible) {
				const oldName = this.myNameEl.textContent;
				this.myNameEl.textContent = "";
				const textEl = document.createElement("input");
				this.renameTextField = textEl;
				textEl.classList.add("resetInput", "textInput", "buttonLike", "treeViewRenameField");
				textEl.value = oldName;
				this.myNameEl.appendChild(textEl);
				textEl.addEventListener("input", () => {
					this.updateDataRenameValue();
				});
				// use "focusout" instead of "blur" to ensure the "focusout" event bubbles to the root treeview
				textEl.addEventListener("focusout", () => {
					this.setTextFieldVisible(false);
				});
				textEl.focus();
				const dotIndex = oldName.lastIndexOf(".");
				if (dotIndex <= 0) {
					textEl.select();
				} else {
					textEl.setSelectionRange(0, dotIndex);
				}
			} else if (this.renameTextField) {
				const newName = this.renameTextField.value;
				this.myNameEl.removeChild(this.renameTextField);
				this.renameTextField = null;
				const oldName = this.name;
				this.name = newName;
				/** @type {TreeViewNameChangeEvent} */
				const event = {
					target: this,
					rawEvent: null,
					oldName, newName,
				};
				this.fireEvent("namechange", event);
			}
		}
		this.updateDataRenameValue();
	}

	updateDataRenameValue() {
		if (this.renameTextField) {
			this.myNameEl.dataset.renameValue = this.renameTextField.value;
		} else {
			delete this.myNameEl.dataset.renameValue;
		}
	}

	select() {
		this.selected = true;
		this.updateSelectedStyle();
	}

	deselect() {
		if (!this.selected) return;
		this.selected = false;
		this.updateSelectedStyle();
	}

	updateSelectedStyle() {
		this.rowEl.classList.toggle("selected", this.selected);
		if (this.selected) {
			const root = this.findRoot();
			this.rowEl.classList.toggle("noFocus", !root.hasFocusWithin);
		}
	}

	updateSelectedChildrenStyle() {
		for (const item of this.getSelectedItems()) {
			item.updateSelectedStyle();
		}
	}

	updeteRootEventListeners() {
		const needsEventHandlers = !this.destructed && this.selectable && this.isRoot;
		if (this.hasRootEventListeners != needsEventHandlers) {
			this.hasRootEventListeners = needsEventHandlers;
			if (needsEventHandlers) {
				this.el.addEventListener("focusin", this.boundOnFocusIn);
				this.el.addEventListener("focusout", this.boundOnFocusOut);

				editor.keyboardShortcutManager.onCommand("treeView.selection.up", this.boundOnSelectPreviousKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.selection.down", this.boundOnSelectNextKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.expandSelected", this.boundOnExpandSelectedKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.collapseSelected", this.boundOnCollapseSelectedKeyPressed);
			} else {
				this.el.removeEventListener("focusin", this.boundOnFocusIn);
				this.el.removeEventListener("focusout", this.boundOnFocusOut);

				editor.keyboardShortcutManager.removeOnCommand("treeView.selection.up", this.boundOnSelectPreviousKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.selection.down", this.boundOnSelectNextKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.expandSelected", this.boundOnExpandSelectedKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.collapseSelected", this.boundOnCollapseSelectedKeyPressed);
			}
		}
	}

	onFocusIn() {
		this.hasFocusWithin = true;
		this.updateSelectedChildrenStyle();
	}

	onFocusOut() {
		this.hasFocusWithin = false;
		this.updateSelectedChildrenStyle();
	}

	onSelectPreviousKeyPressed() {
		if (!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if (!item) return;

		const parent = item.parent;
		if (!parent) return;
		const index = parent.children.indexOf(item);
		let selectItem = null;
		if (index == 0) {
			selectItem = parent;
		} else {
			let deepestItem = parent.children[index - 1];
			while (true) {
				if (deepestItem.collapsed || deepestItem.children.length <= 0) break;

				const lastItem = deepestItem.children[deepestItem.children.length - 1];
				deepestItem = lastItem;
			}
			selectItem = deepestItem;
		}
		item.deselect();
		/** @type {TreeViewSelectionChangeEvent} */
		const changes = {
			target: this,
			rawEvent: null,
			reset: true,
			added: [],
			removed: [],
		};
		if (selectItem) {
			selectItem.select();
			changes.added = [selectItem];
		}
		this.fireEvent("selectionchange", changes);
	}

	onSelectNextKeyPressed() {
		if (!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if (!item) return;

		let selectItem = null;
		if (item.children.length > 0 && item.expanded) {
			selectItem = item.children[0];
		} else {
			let firstParentWithItemBelow = item;
			let firstItemWithItemBelowIndex = 0;
			while (true) {
				const parent = firstParentWithItemBelow.parent;
				const prevParentWithItemBelow = firstParentWithItemBelow;
				firstParentWithItemBelow = parent;
				if (!parent) break;
				firstItemWithItemBelowIndex = parent.children.indexOf(prevParentWithItemBelow);

				// If the item is not the last in the list, this item has an item below
				if (firstItemWithItemBelowIndex < parent.children.length - 1) break;
			}

			if (!firstParentWithItemBelow) return;
			const itemBelow = firstParentWithItemBelow.children[firstItemWithItemBelowIndex + 1];
			selectItem = itemBelow;
		}
		item.deselect();
		/** @type {TreeViewSelectionChangeEvent} */
		const changes = {
			target: this,
			rawEvent: null,
			reset: true,
			added: [],
			removed: [],
		};
		if (selectItem) {
			selectItem.select();
			changes.added = [selectItem];
		}
		this.fireEvent("selectionchange", changes);
	}

	onExpandSelectedKeyPressed() {
		if (!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if (!item) return;
		if (item.arrowVisible && !item.expanded) {
			item.expanded = true;
		} else {
			this.onSelectNextKeyPressed();
		}
	}

	onCollapseSelectedKeyPressed() {
		if (!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if (!item) return;
		if (item.arrowVisible && !item.collapsed) {
			item.collapsed = true;
		} else {
			this.onSelectPreviousKeyPressed();
		}
	}

	getLastSelectedItem() {
		// todo: track last clicked item and use that if it is selected

		const selectedItem = this.getSelectedItems().next().value;
		if (selectedItem) return selectedItem;

		return null;
	}

	*getSelectedItems() {
		for (const item of this.traverseDown()) {
			if (item.selected) {
				yield item;
			}
		}
	}

	*getSelectionIndices() {
		for (const item of this.getSelectedItems()) {
			yield item.getIndicesPath();
		}
	}

	*getSelectionPaths() {
		for (const item of this.getSelectedItems()) {
			yield item.getNamesPath();
		}
	}

	/**
	 * Gets a list of indices that can be traversed from the
	 * root in order to get to this TreeView.
	 * @returns {Array<number>} List of indices.
	 */
	getIndicesPath() {
		const path = [];
		let parent = this.parent;
		let child = this;
		while (parent) {
			const index = parent.children.indexOf(child);
			path.push(index);
			child = parent;
			parent = parent.parent;
		}
		return path.reverse();
	}

	/**
	 * Gets array of TreeView names from the root
	 * traversed down until this element.
	 * @returns {Array<string>} List of TreeView names.
	 */
	getNamesPath() {
		const path = [];
		for (const p of this.traverseUp()) {
			path.push(p.name);
		}
		return path.reverse();
	}

	/**
	 * Traverses a list of names to find the specified child.
	 * @param {Array<string>} path List of TreeView names.
	 * @returns {?TreeView}
	 */
	findChildFromNamesPath(path = []) {
		if (path.length <= 0) {
			return this;
		} else {
			const child = this.getChildByName(path[0]);
			if (!child) {
				return null;
			} else {
				return child.findChildFromNamesPath(path.slice(1));
			}
		}
	}

	/**
	 * Traverses up the tree and returns the first item without a parent.
	 * @returns {TreeView}
	 */
	findRoot() {
		if (this.parent) return this.parent.findRoot();
		return this;
	}

	/**
	 * @param {string} name The name of the child.
	 * @param {boolean} recursive Whether or not the full tree should be searched, defaults to false.
	 * @returns {?TreeView}
	 */
	getChildByName(name, recursive = false) {
		if (recursive) {
			for (const child of this.traverseDown()) {
				if (child.name == name) return child;
			}
		} else {
			for (const child of this.children) {
				if (child.name == name) return child;
			}
		}
		return null;
	}

	/**
	 * Tests if one of the children contains a TreeView with this name.
	 * @param {string} name Name of the child.
	 * @param {boolean} recursive Whether or not the full tree should be searched.
	 * @returns {boolean}
	 */
	includes(name, recursive = false) {
		return !!this.getChildByName(name, recursive);
	}

	deselectAll() {
		for (const view of this.traverseDown()) {
			view.deselect();
		}
	}

	onContextMenuEvent(e) {
		let menuCreated = false;
		let eventExpired = false;
		/** @type {TreeViewContextMenuEvent} */
		const eventData = {
			rawEvent: e,
			target: this,
			showContextMenu: structure => {
				if (eventExpired) {
					console.warn("showContextMenu should be called from within the contextmenu event");
					return null;
				}
				if (menuCreated) {
					console.log("showContextMenu can only be called once");
					return null;
				}

				menuCreated = true;
				e.preventDefault();
				const menu = editor.contextMenuManager.createContextMenu(structure);
				menu.setPos(e.pageX, e.pageY);
				return menu;
			},
		};
		this.fireEvent("contextmenu", eventData);
		eventExpired = true;
	}

	registerNewEventType(name) {
		this.eventCbs.set(name, new Set());
	}

	getEventCbs(eventType) {
		const cbs = this.eventCbs.get(eventType);
		if (!cbs) {
			console.warn("unknown event type: " + eventType + " for TreeView");
			return null;
		}
		return cbs;
	}

	/**
	 * @param {string} eventType The identifier of the event type.
	 * @param {function(TreeViewEvent) : void} cb The callback to invoke when the event occurs.
	 */
	addEventListener(eventType, cb) {
		const cbs = this.getEventCbs(eventType);
		if (!cbs) return;
		cbs.add(cb);
	}

	/**
	 * @param {string} eventType The identifier of the event type.
	 * @param {function(TreeViewEvent) : void} cb The callback to remove.
	 */
	removeEventListener(eventType, cb) {
		const cbs = this.getEventCbs(eventType);
		if (!cbs) return;
		cbs.delete(cb);
	}

	/**
	 * Fires an event on this TreeView and its parents.
	 * @param {string} eventType The identifier of the event type.
	 * @param {TreeViewEvent} event The data to pass to the event callbacks.
	 */
	fireEvent(eventType, event) {
		const cbs = this.getEventCbs(eventType);
		if (cbs) {
			for (const cb of cbs) {
				cb(event);
			}
		}
		if (this.parent) this.parent.fireEvent(eventType, event);
	}
}
