export default class EditorWindow{
	constructor(){
		this.el = document.createElement("div");
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

	updateEls(){}

	onContentWindowRegistered(constructor){}

	*getChildren(){}

	onResized(){}
}
