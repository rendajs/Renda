export default class EditorWindow{
	constructor(windowManager){
		this.windowManager = windowManager;
		this.el = document.createElement("div");
	}

	setRoot(){
		this.el.classList.add("editorWindowRoot");
	}

	updateEls(){}

	onContentWindowRegistered(constructor){}

	*getChildren(){}
}
