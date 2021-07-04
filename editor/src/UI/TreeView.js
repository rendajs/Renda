import editor from "../editorInstance.js";

export default class TreeView{
	constructor(data = {}){
		this.el = document.createElement("div");
		this.el.classList.add("treeViewItem");

		this.rowEl = document.createElement("div");
		this.rowEl.classList.add("treeViewRow");
		this.el.appendChild(this.rowEl);

		this.boundOnRowClick = this.onRowClick.bind(this);
		this.rowEl.addEventListener("click", this.boundOnRowClick);

		this.boundOnDblClick = this.onDblClick.bind(this);
		this.rowEl.addEventListener("dblclick", this.boundOnDblClick.bind(this));

		this.boundOnDragOverEvent = this.onDragOverEvent.bind(this);
		this.rowEl.addEventListener("dragover", this.boundOnDragOverEvent);
		this.boundOnDropEvent = this.onDropEvent.bind(this);
		this.rowEl.addEventListener("drop", this.boundOnDropEvent);

		this.boundOnContextMenuEvent = this.onContextMenuEvent.bind(this);
		this.rowEl.addEventListener("contextmenu", this.boundOnContextMenuEvent);

		this.arrowContainerEl = document.createElement("div");
		this.arrowContainerEl.classList.add("treeViewArrowContainer");
		this.rowEl.appendChild(this.arrowContainerEl);

		this.arrowEl = document.createElement("div");
		this.arrowEl.classList.add("treeViewArrow");
		this.arrowContainerEl.appendChild(this.arrowEl);

		this.onArrowClickCbs = [];
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

		if(data.addCustomEl){
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
		this.selectable = data.selectable ?? true; //todo: make this private or a getter/setter
		this._alwaysShowArrow = false;
		this.canSelectMultiple = true;
		this.renameable = false;
		this._textFieldVisible = false;
		this.renameTextField = null;
		this._rowVisible = data.rowVisible ?? true;
		this._draggable = false;
		this.rearrangeable = true;

		if(this.selectable){
			//todo: update at runtime when this.selectable changes
			this.rowEl.tabIndex = 0;
		}

		if(data.copySettings){
			this.collapsed = data.copySettings.collapsed;
			this.selectable = data.copySettings.selectable;
			this.canSelectMultiple = data.copySettings.canSelectMultiple;
			this.renameable = data.copySettings.renameable;
			this.draggable = data.copySettings.draggable;
			this.rearrangeable = data.copySettings.rearrangeable;
		}

		this.selected = false; //todo: make this private or a getter/setter

		this.lastHighlightTime = 0;
		this.boundOnBodyClick = this.onBodyClick.bind(this);

		this.eventCbs = new Map();
		for(const eventType of ["selectionchange", "namechange", "dragstart", "drop", "dblclick", "contextmenu"]){
			this.registerNewEventType(eventType);
		}

		this.updateArrowHidden();
		if(data) this.updateData(data);
		this.updatePadding();

		this.hasRootEventListeners = false;
		this.updeteRootEventListeners();

		this.updateRowVisibility();
	}

	destructor(){
		this.destructed = true;
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.rowEl.removeEventListener("click", this.boundOnRowClick);
		this.boundOnRowClick = null;
		this.rowEl.removeEventListener("dragover", this.boundOnDragOverEvent);
		this.boundOnDragOverEvent = null;
		this.rowEl.removeEventListener("drop", this.boundOnDropEvent);
		this.boundOnDropEvent = null;
		this.rowEl.removeEventListener("contextmenu", this.boundOnContextMenuEvent);
		this.boundOnContextMenuEvent = null;
		this.rowEl = null;
		this.arrowContainerEl.removeEventListener("click", this.boundArrowClickEvent);
		this.boundArrowClickEvent = null;
		this.arrowContainerEl = null;
		this.arrowEl = null;
		this.myNameEl = null;
		for(const b of this.addedButtons){
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
		for(const child of this.children){
			child.destructor();
		}
		this.children = null;
		this.setParent(null);

		this.onArrowClickCbs = null;
		this.eventCbs = null;

		this.el = null;
	}

	get name(){
		return this._name;
	}

	set name(value){
		this._name = value;
		this.myNameEl.textContent = value;
	}

	updateData(data = {}){
		this.name = data.name || "";
		if(data.collapsed !== undefined) this.collapsed = data.collapsed;
		let newChildren = data.children || [];
		let deltaChildren = newChildren.length - this.children.length;
		if(deltaChildren > 0){
			for(let i=0; i<deltaChildren; i++){
				this.addChild();
			}
		}else if(deltaChildren < 0){
			for(let i=this.children.length-1; i>=newChildren.length; i--){
				this.removeChildIndex(i);
			}
		}
		for(let i=0; i<this.children.length; i++){
			this.children[i].updateData(newChildren[i]);
		}
	}

	addButton(button){
		this.addedButtons.push(button);
		this.buttonsEl.appendChild(button.el);
	}

	calculateRecursionDepth(){
		if(this.isRoot){
			this.recursionDepth = 0;
		}else{
			this.recursionDepth = this.parent.recursionDepth + 1;
	}
		this.updatePadding();
	}

	updatePadding(){
		let padding = this.recursionDepth*12 + 18;
		this.rowEl.style.paddingLeft = padding+"px";
	}

	get isRoot(){
		return !this.parent;
	}

	removeChild(child, destructChild = true){
		for(const [i, c] of this.children.entries()){
			if(child == c){
				this.removeChildIndex(i, destructChild);
				break;
			}
		}
	}

	removeChildIndex(index, destructChild = true){
		if(destructChild) this.children[index].destructor();
		this.children.splice(index, 1);
		this.updateArrowHidden();
	}

	clearChildren(){
		for(const child of this.children){
			child.destructor();
		}
		this.children = [];
		this.updateArrowHidden();
	}

	/**
	 * @param {TreeView} parent
	 * @param {boolean} addChild whether a call should be made to parent.addChild()
	 */
	setParent(parent, addChild = true){
		if(parent != this.parent){
			if(this.parent){
				this.parent.removeChild(this, false);
			}
			this.parent = parent;
			if(parent && addChild){
				parent.addChild(this);
			}

			this.updeteRootEventListeners();
		}
	}

	/**
	 * @param {?TreeView} treeView the TreeView to insert, creates a new one when null
	 * @returns {TreeView} the created TreeView
	 */
	addChild(treeView = null){
		return this.addChildAtIndex(-1, treeView);
	}

	/**
	 * @param {number} index index to insert the TreeView at, starts counting from the back when negative
	 * @param {?TreeView} treeView the TreeView to insert, creates a new one when null
	 * @returns {TreeView} the created TreeView
	 */
	addChildAtIndex(index = -1, treeView = null){
		if(index < 0){
			index = this.children.length + index + 1;
		}
		if(treeView == null){
			treeView = new TreeView({
				copySettings: this,
				parent: this,
			});
		}
		treeView.setParent(this, false);
		treeView.calculateRecursionDepth();
		if(index >= this.children.length){
			this.children.push(treeView);
			this.childrenEl.appendChild(treeView.el);
		}else{
			this.children.splice(index, 0, treeView);
			this.childrenEl.insertBefore(treeView.el, this.childrenEl.children[index]);
		}
		this.updateArrowHidden();
		return treeView;
	}

	get arrowVisible(){
		return this.children.length > 0 || this._alwaysShowArrow;
	}

	updateArrowHidden(){
		if(this.destructed) return;
		this.arrowEl.classList.toggle("hidden", !this.arrowVisible);
	}

	get collapsed(){
		return this._collapsed;
	}

	set collapsed(collapsed){
		this._collapsed = collapsed;
		this.childrenEl.style.display = collapsed ? "none" : null;
		this.arrowContainerEl.classList.toggle("collapsed", collapsed);
	}

	get expanded(){
		return !this.collapsed;
	}

	set expanded(value){
		this.collapsed = !value;
	}

	get rowVisible(){
		return this._rowVisible;
	}

	set rowVisible(value){
		this._rowVisible = value;
		this.updateRowVisibility();
	}

	updateRowVisibility(){
		this.rowEl.classList.toggle("hidden", !this.rowVisible);
	}

	get alwaysShowArrow(){
		return this._alwaysShowArrow;
	}

	set alwaysShowArrow(value){
		this._alwaysShowArrow = value;
		this.updateArrowHidden();
	}

	get draggable(){
		return this._draggable;
	}

	set draggable(value){
		if(this._draggable != value){
			this._draggable = value;
			this.rowEl.draggable = value;
			if(value){
				this.boundDragStart = this.onDragStart.bind(this);
				this.rowEl.addEventListener("dragstart", this.boundDragStart);
				this.boundDragEnd = this.onDragEnd.bind(this);
				this.rowEl.addEventListener("dragend", this.boundDragEnd);
			}else{
				this.rowEl.removeEventListener("dragstart", this.boundDragStart);
				this.rowEl.removeEventListener("onDragEnd", this.boundDragEnd);
			}
		}
	}

	onDragStart(e){
		let {el, x, y} = editor.dragManager.createDragFeedbackText({
			text: this.name,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);
		this.fireEvent("dragstart", {
			draggedElement: this,
			event: e,
		});
	}

	onDragEnd(e){
		if(this.currenDragFeedbackEl) editor.dragManager.removeFeedbackEl(this.currenDragFeedbackEl);
		this.currenDragFeedbackEl = null;
	}

	*traverseDown(){
		yield this;
		for(const child of this.children){
			for(const c of child.traverseDown()){
				yield c;
			}
		}
	}

	*traverseUp(){
		yield this;
		if(this.parent){
			for(const p of this.parent.traverseUp()){
				yield p;
			}
		}
	}

	arrowClickEvent(e){
		e.stopPropagation();
		this.toggleCollapsed();
		this.fireOnArrowClickCbs();
	}

	arrowHoverStartEvent(e){
		if(!this.arrowVisible) return;
		this.arrowContainerEl.classList.toggle("hover", true);
	}

	arrowHoverEndEvent(e){
		this.arrowContainerEl.classList.toggle("hover", false);
	}

	fireOnArrowClickCbs(){
		for(const cb of this.onArrowClickCbs){
			cb();
		}
	}

	onArrowClick(cb){
		this.onArrowClickCbs.push(cb);
	}

	toggleCollapsed(){
		this.collapsed = !this.collapsed;
	}

	expandWithParents(){
		for(const treeView of this.traverseUp()){
			treeView.expanded = true;
		}
	}

	highlight(){
		this.lastHighlightTime = Date.now();
		this.rowEl.classList.add("highlighted");
		document.body.addEventListener("click", this.boundOnBodyClick);
	}

	onBodyClick(){
		if(Date.now() - this.lastHighlightTime > 1000){
			this.rowEl.classList.remove("highlighted");
			document.body.removeEventListener("click", this.boundOnBodyClick);
		}
	}

	onRowClick(e){
		if(this.selectable){
			if(this.renameable && this.selected){
				this.setTextFieldVisible(true);
			}else{
				let changes = {
					reset: false,
					added: [],
					removed: [],
				};
				let selectExtra = this.canSelectMultiple && (e.metaKey || e.ctrlKey);
				if(selectExtra){
					if(this.selected){
						this.deselect();
						changes.removed = [this];
					}else{
						this.select();
						changes.added = [this];
					}
				}else{
					let root = this.findRoot();
					root.deselectAll();
					this.select();
					changes.reset = true;
					changes.added = [this];
				}

				this.fireEvent("selectionchange", changes);
			}
		}else{
			this.toggleCollapsed();
		}
	}

	onDblClick(e){
		this.fireEvent("dblclick", {clickedElement: this});
	}

	setTextFieldVisible(textFieldVisible){
		if(textFieldVisible != this._textFieldVisible){
			this._textFieldVisible = textFieldVisible;
			if(textFieldVisible){
				let oldName = this.myNameEl.textContent;
				this.myNameEl.textContent = "";
				let textEl = document.createElement("input");
				this.renameTextField = textEl;
				textEl.classList.add("resetInput", "textInput", "buttonLike", "treeViewRenameField");
				textEl.value = oldName;
				this.myNameEl.appendChild(textEl);
				textEl.addEventListener("input", () => {
					this.updateDataRenameValue();
				});
				textEl.addEventListener("blur", () => {
					this.setTextFieldVisible(false);
				});
				textEl.focus();
				const dotIndex = oldName.lastIndexOf(".");
				if(dotIndex <= 0){
					textEl.select();
				}else{
					textEl.setSelectionRange(0,dotIndex);
				}
			}else if(this.renameTextField){
				let newName = this.renameTextField.value;
				this.myNameEl.removeChild(this.renameTextField);
				this.renameTextField = null;
				let oldName = this.name;
				this.name = newName;
				this.fireEvent("namechange", {
					changedElement: this,
					oldName, newName,
				});
			}
		}
		this.updateDataRenameValue();
	}

	updateDataRenameValue(){
		if(this.renameTextField){
			this.myNameEl.dataset.renameValue = this.renameTextField.value;
		}else{
			delete this.myNameEl.dataset.renameValue;
		}
	}

	select(){
		this.selected = true;
		this.updateSelectedStyle();
	}

	deselect(){
		if(!this.selected) return;
		this.selected = false;
		this.updateSelectedStyle();
	}

	updateSelectedStyle(){
		this.rowEl.classList.toggle("selected", this.selected);
		if(this.selected){
			const root = this.findRoot();
			this.rowEl.classList.toggle("noFocus", !root.hasFocusWithin);
		}
	}

	updateSelectedChildrenStyle(){
		for(const item of this.getSelectedItems()){
			item.updateSelectedStyle();
		}
	}

	updeteRootEventListeners(){
		const needsEventHandlers = !this.destructed && this.selectable && this.isRoot;
		if(this.hasRootEventListeners != needsEventHandlers){
			this.hasRootEventListeners = needsEventHandlers;
			if(needsEventHandlers){
				this.el.addEventListener("focusin", this.boundOnFocusIn);
				this.el.addEventListener("focusout", this.boundOnFocusOut);

				editor.keyboardShortcutManager.onCommand("treeView.selection.up", this.boundOnSelectPreviousKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.selection.down", this.boundOnSelectNextKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.expandSelected", this.boundOnExpandSelectedKeyPressed);
				editor.keyboardShortcutManager.onCommand("treeView.collapseSelected", this.boundOnCollapseSelectedKeyPressed);
			}else{
				this.el.removeEventListener("focusin", this.boundOnFocusIn);
				this.el.removeEventListener("focusout", this.boundOnFocusOut);

				editor.keyboardShortcutManager.removeOnCommand("treeView.selection.up", this.boundOnSelectPreviousKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.selection.down", this.boundOnSelectNextKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.expandSelected", this.boundOnExpandSelectedKeyPressed);
				editor.keyboardShortcutManager.removeOnCommand("treeView.collapseSelected", this.boundOnCollapseSelectedKeyPressed);
			}
		}
	}

	onFocusIn(){
		this.hasFocusWithin = true;
		this.updateSelectedChildrenStyle();
	}

	onFocusOut(){
		this.hasFocusWithin = false;
		this.updateSelectedChildrenStyle();
	}

	onSelectPreviousKeyPressed(){
		if(!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if(!item) return;

		const parent = item.parent;
		if(!parent) return;
		const index = parent.children.indexOf(item);
		if(index == 0){
			parent.select();
		}else{
			let deepestItem = parent.children[index - 1];
			while(true){
				if(deepestItem.collapsed || deepestItem.children.length <= 0) break;

				const lastItem = deepestItem.children[deepestItem.children.length - 1];
				deepestItem = lastItem;
			}
			deepestItem.select();
		}
		item.deselect();
	}

	onSelectNextKeyPressed(){
		if(!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if(!item) return;

		if(item.children.length > 0 && item.expanded){
			item.children[0].select();
		}else{
			let firstParentWithItemBelow = item;
			let firstItemWithItemBelowIndex = 0;
			while(true){
				const parent = firstParentWithItemBelow.parent;
				const prevParentWithItemBelow = firstParentWithItemBelow;
				firstParentWithItemBelow = parent;
				if(!parent) break;
				firstItemWithItemBelowIndex = parent.children.indexOf(prevParentWithItemBelow);

				//If the item is not the last in the list, this item has an item below
				if(firstItemWithItemBelowIndex < parent.children.length - 1) break;
			}

			if(!firstParentWithItemBelow) return;
			const itemBelow = firstParentWithItemBelow.children[firstItemWithItemBelowIndex + 1];
			itemBelow.select();
		}
		item.deselect();
	}

	onExpandSelectedKeyPressed(){
		if(!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if(!item) return;
		if(item.arrowVisible && !item.expanded){
			item.expanded = true;
		}else{
			this.onSelectNextKeyPressed();
		}
	}

	onCollapseSelectedKeyPressed(){
		if(!this.hasFocusWithin) return;

		const item = this.getLastSelectedItem();
		if(!item) return;
		if(item.arrowVisible && !item.collapsed){
			item.collapsed = true;
		}else{
			this.onSelectPreviousKeyPressed();
		}
	}

	getLastSelectedItem(){
		//todo: track last clicked item and use that if it is selected

		const selectedItem = this.getSelectedItems().next().value;
		if(selectedItem) return selectedItem;

		return null;
	}

	*getSelectedItems(){
		for(const item of this.traverseDown()){
			if(item.selected){
				yield item;
			}
		}
	}

	*getSelectionIndices(){
		for(const item of this.getSelectedItems()){
			yield item.getIndicesPath();
		}
	}

	*getSelectionPaths(){
		for(const item of this.getSelectedItems()){
			yield item.getNamesPath();
		}
	}

	/**
	 * Gets a list of indices that can be traversed from the
	 * root in order to get to this TreeView
	 * @returns Array<number> list of indices
	 */
	getIndicesPath(){
		let path = [];
		let parent = this.parent;
		let child = this;
		while(parent){
			let index = parent.children.indexOf(child);
			path.push(index);
			child = parent;
			parent = parent.parent;
		}
		return path.reverse();
	}

	/**
	 * Gets array of TreeView names from the root
	 * traversed down until this element
	 * @returns {Array<string>} list of TreeView names
	 */
	getNamesPath(){
		let path = [];
		for(const p of this.traverseUp()){
			path.push(p.name);
		}
		return path.reverse();
	}

	/**
	 * Traverses a list of names to find the specified child
	 * @param {Array<string>} path list of TreeView names
	 * @returns {?TreeView}
	 */
	findChildFromNamesPath(path = []){
		if(path.length <= 0){
			return this;
		}else{
			const child = this.getChildByName(path[0]);
			if(!child){
				return null;
			}else{
				return child.findChildFromNamesPath(path.slice(1));
			}
		}
	}

	/**
	 * @returns {TreeView}
	 */
	findRoot(){
		if(this.parent) return this.parent.findRoot();
		return this;
	}

	/**
	 * @param {string} name the name of the child
	 * @param {boolean} recursive whether or not the full tree should be searched, defaults to false
	 * @returns
	 */
	getChildByName(name, recursive = false){
		if(recursive){
			for(const child of this.traverseDown()){
				if(child.name == name) return child;
			}
		}else{
			for(const child of this.children){
				if(child.name == name) return child;
			}
		}
		return null;
	}

	/**
	 * Tests if one of the children contains a TreeView with this name
	 * @param {string} name name of the child
	 * @param {boolean} recursive whether or not the full tree should be searched
	 * @returns {boolean}
	 */
	includes(name, recursive = false){
		return !!this.getChildByName(name, recursive);
	}

	deselectAll(){
		for(const view of this.traverseDown()){
			view.deselect();
		}
	}

	onDragOverEvent(e){
		e.preventDefault();
	}

	onDropEvent(e){
		e.preventDefault();
		this.fireEvent("drop", {
			droppedOnElement: this,
			event: e,
		});
	}

	onContextMenuEvent(e){
		let menuCreated = false;
		let eventExpired = false;
		this.fireEvent("contextmenu", {
			event: e,
			clickedElement: this,
			showContextMenu: structure => {
				if(eventExpired){
					console.warn("showContextMenu should be called from within the contextmenu event");
					return;
				}
				if(menuCreated){
					console.log("showContextMenu can only be called once");
					return;
				}

				menuCreated = true;
				e.preventDefault();
				const menu = editor.contextMenuManager.createContextMenu(structure);
				menu.setPos(e.pageX, e.pageY);
				return menu;
			},
		});
		eventExpired = true;
	}

	registerNewEventType(name){
		this.eventCbs.set(name, new Set());
	}

	getEventCbs(eventType){
		let cbs = this.eventCbs.get(eventType);
		if(!cbs){
			console.warn("unknown event type: "+eventType+" for TreeView");
			return null;
		}
		return cbs;
	}

	addEventListener(eventType, cb){
		let cbs = this.getEventCbs(eventType);
		if(!cbs) return;
		cbs.add(cb);
	}

	removeEventListener(eventType, cb){
		let cbs = this.getEventCbs(eventType);
		if(!cbs) return;
		cbs.delete(cb);
	}

	//fires event on this TreeView and its parents
	fireEvent(eventType, event){
		let cbs = this.getEventCbs(eventType);
		if(cbs){
			for(const cb of cbs){
				cb(event);
			}
		}
		if(this.parent) this.parent.fireEvent(eventType, event);
	}
}
