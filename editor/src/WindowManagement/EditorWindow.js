export default class EditorWindow{
	constructor(){
		this.el = document.createElement("div");

		this.parent = null;

		this.editorWindowClickCbs = new Set();
		this.el.addEventListener("click", () => {
			for(const cb of this.editorWindowClickCbs){
				cb();
			}
		});
	}

	destructor(){
		if(this.el && this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
		this.editorWindowClickCbs = null;
	}

	setRoot(){
		this.el.classList.add("editorWindowRoot");
	}

	onEditorWindowClick(cb){
		this.editorWindowClickCbs.add(cb);
	}

	setFocused(focused){
		this.el.classList.toggle("focused", focused);
	}

	updateEls(){}

	onContentWindowRegistered(constructor){}

	setParent(parent){
		this.parent = parent;
	}

	getParent(){}

	*getChildren(){}

	onResized(){}
}
