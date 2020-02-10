export default class TreeView{
	constructor(data = {}){
		this.el = document.createElement("div");
		this.el.classList.add("treeViewItem");

		this.rowEl = document.createElement("div");
		this.rowEl.classList.add("treeViewRow");
		this.el.appendChild(this.rowEl);

		this.boundOnRowClick = this.onRowClick.bind(this);
		this.rowEl.addEventListener("click", this.boundOnRowClick);

		this.arrowEl = document.createElement("div");
		this.arrowEl.classList.add("treeViewArrow");
		this.rowEl.appendChild(this.arrowEl);

		this.onArrowClickCbs = [];
		this.boundArrowClickEvent = this.arrowClickEvent.bind(this);
		this.arrowEl.addEventListener("click", this.boundArrowClickEvent);

		this.myNameEl = document.createElement("div");
		this.myNameEl.classList.add("treeViewName");
		this.rowEl.appendChild(this.myNameEl);

		this.childrenEl = document.createElement("div");
		this.childrenEl.classList.add("treeViewChildList");
		this.el.appendChild(this.childrenEl);

		if(data.addCustomEl){
			this.customEl = document.createElement("div");
			this.customEl.classList.add("treeViewCustomEl");
			this.el.appendChild(this.customEl);
		}

		this._name = "";
		this.children = [];
		this.parent = null;
		this.recursionDepth = 0;
		this._collapsed = false;
		this.selectable = true;
		this._alwaysShowArrow = false;
		this.canSelectMultiple = true;
		this.renameable = false;
		this._rowVisible = true;

		if(data.copySettings){
			this.collapsed = data.copySettings.collapsed;
			this.selectable = data.copySettings.selectable;
			this.canSelectMultiple = data.copySettings.canSelectMultiple;
			this.renameable = data.copySettings.renameable;
		}

		this.selected = false;

		this.onSelectedChangeCbs = [];

		this.updateArrowHidden();
		if(data) this.updateData(data);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
		this.rowEl.removeEventListener("click", this.boundOnRowClick);
		this.rowEl = null;
		this.arrowEl.removeEventListener("click", this.boundArrowClickEvent);
		this.arrowEl = null;
		this.myNameEl = null;
		this.childrenEl = null;
		this.customEl = null;
		for(const child of this.children){
			child.destructor();
		}
		this.children = null;
		this.parent = null;

		this.onSelectedChangeCbs = null;
		this.onArrowClickCbs = null;
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
				let child = new TreeView();
				this.addChild(child);
			}
		}else if(deltaChildren < 0){
			for(let i=this.children.length-1; i>=newChildren.length; i--){
				this.removeChild(i);
			}
		}
		for(let i=0; i<this.children.length; i++){
			this.children[i].updateData(newChildren[i]);
		}
	}

	calculateRecursionDepth(){
		if(!this.parent){
			this.recursionDepth = 0;
		}else{
			this.recursionDepth = this.parent.recursionDepth + 1;
	}
		this.updatePadding();
	}

	updatePadding(){
		let padding = this.recursionDepth*12;
		if(this.arrowVisible) padding -= 12;
		this.rowEl.style.paddingLeft = padding+"px";
	}

	removeChild(index){
		this.children[index].destructor();
		this.children.splice(index, 1);
		this.updateArrowHidden();
	}

	addChild(treeView = null){
		return this.addChildAtIndex(-1, treeView);
	}

	addChildAtIndex(index = -1, treeView = null){
		if(index < 0){
			index = this.children.length + index + 1;
		}
		if(treeView == null){
			treeView = new TreeView({
				copySettings: this,
			});
		}
		treeView.parent = this;
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
		this.arrowEl.classList.toggle("hidden", !this.arrowVisible);
	}

	get collapsed(){
		return this._collapsed;
	}

	set collapsed(collapsed){
		this._collapsed = collapsed;
		this.childrenEl.style.display = collapsed ? "none" : null;
		this.arrowEl.classList.toggle("collapsed", collapsed);
	}

	get rowVisible(){
		return this._rowVisible;
	}

	set rowVisible(value){
		this._rowVisible = value;
		this.rowEl.classList.toggle("hidden", !value);
	}

	get alwaysShowArrow(){
		return this._alwaysShowArrow;
	}

	set alwaysShowArrow(value){
		this._alwaysShowArrow = value;
		this.updateArrowHidden();
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

	onRowClick(e){
		if(this.selectable){
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

			this.fireOnSelectionChange(changes);
		}else{
			this.toggleCollapsed();
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

	getNamesPath(){
		let path = [];
		for(const p of this.traverseUp()){
			path.push(p.name);
		}
		return path.reverse();
	}

	findRoot(){
		if(this.parent) return this.parent.findRoot();
		return this;
	}

	includes(name, recursive = false){
		if(recursive){
			for(const child of this.traverseDown()){
				if(child.name == name) return true;
			}
		}else{
			for(const child of this.children){
				if(child.name == name) return true;
			}
		}
		return false;
	}

	deselectAll(){
		for(const view of this.traverseDown()){
			view.deselect();
		}
	}

	onSelectedChange(cb){
		this.onSelectedChangeCbs.push(cb);
	}

	removeOnSelectedChange(cb){
		let index = this.onSelectedChangeCbs.indexOf(cb);
		if(index >= 0){
			this.onSelectedChangeCbs.splice(index, 1);
		}
	}

	fireOnSelectionChange(changes){
		for(const cb of this.onSelectedChangeCbs){
			cb(changes);
		}
		if(this.parent) this.parent.fireOnSelectionChange(changes);
	}
}
