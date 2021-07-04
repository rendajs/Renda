export default class EditorWindow{
	constructor(){
		this.el = document.createElement("div");
		this.el.tabIndex = -1;

		this.parent = null;

		this.onFocusedChangeCbs = new Set();
		this.el.addEventListener("focusin", () => {
			this.fireFocusedChange(true);
		});
		this.el.addEventListener("focusout", () => {
			this.fireFocusedChange(false);
		});
	}

	destructor(){
		if(this.el && this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setRoot(){
		this.el.classList.add("editorWindowRoot");
	}

	onFocusedChange(cb){
		this.onFocusedChangeCbs.add(cb);
	}

	fireFocusedChange(hasFocus){
		for(const cb of this.onFocusedChangeCbs){
			cb(hasFocus);
		}
	}

	focus(){
		this.el.focus();
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
