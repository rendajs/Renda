export default class TreeView{
	constructor(data){
		this.el = document.createElement("div");
		this.el.classList.add("treeViewItem");

		this.rowEl = document.createElement("div");
		this.rowEl.classList.add("treeViewRow");
		this.el.appendChild(this.rowEl);

		this.arrowEl = document.createElement("div");
		this.arrowEl.classList.add("treeViewArrow");
		this.rowEl.appendChild(this.arrowEl);

		this.boundOnArrowClick = this.onArrowClick.bind(this);
		this.arrowEl.addEventListener("click", this.boundOnArrowClick);

		this.myNameEl = document.createElement("div");
		this.myNameEl.classList.add("treeViewName");
		this.rowEl.appendChild(this.myNameEl);

		this.childrenEl = document.createElement("div");
		this.childrenEl.classList.add("treeViewChildList");
		this.el.appendChild(this.childrenEl);

		this.name = "";
		this.children = [];
		this.parent = null;
		this.recursionDepth = 0;
		this.collapsed = false;
		this.selectable = true;

		this.updateArrowHidden();
		if(data) this.updateData(data);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
		this.arrowEl.removeEventListener("click", this.boundOnArrowClick);
		this.arrowEl = null;
		this.myNameEl = null;
		this.childrenEl = null;
		for(const child of this.children){
			child.destructor();
		}
		this.children = null;
		this.parent = null;
	}

	updateData(data = {}){
		this.name = data.name || "";
		this.myNameEl.textContent = this.name;
		if(data.collapsed !== undefined) this.setCollapsed(data.collapsed);
		let newChildren = data.children || [];
		let deltaChildren = newChildren.length - this.children.length;
		if(deltaChildren > 0){
			for(let i=0; i<deltaChildren; i++){
				let child = new TreeView();
				child.recursionDepth = this.recursionDepth + 1;
				this.addChild(child);
			}
		}else if(deltaChildren < 0){
			for(let i=this.children.length-1; i>=newChildren.length; i--){
				this.removeChild(i);
			}
		}
		let padding = this.recursionDepth*12;
		if(this.arrowVisible) padding -= 12;
		this.rowEl.style.paddingLeft = padding+"px";
		for(let i=0; i<this.children.length; i++){
			this.children[i].updateData(newChildren[i]);
		}
	}

	removeChild(index){
		this.children[index].destructor();
		this.children.splice(index, 1);
		this.updateArrowHidden();
	}

	addChild(treeView){
		treeView.parent = this;
		this.children.push(treeView);
		this.childrenEl.appendChild(treeView.el);
		this.updateArrowHidden();
	}

	get arrowVisible(){
		return this.children.length > 0;
	}

	updateArrowHidden(){
		this.arrowEl.classList.toggle("hidden", !this.arrowVisible);
	}

	setCollapsed(collapsed){
		this.collapsed = collapsed;
		this.childrenEl.style.display = collapsed ? "none" : null;
		this.arrowEl.classList.toggle("collapsed", collapsed);
	}

	onArrowClick(){
		this.setCollapsed(!this.collapsed);
	}
}
