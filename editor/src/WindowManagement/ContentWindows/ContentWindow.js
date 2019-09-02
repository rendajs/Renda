export default class ContentWindow{
	constructor(editor){
		this.editor = editor;
		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");
	}

	setVisible(visible){
		this.el.classList.toggle("hidden", !visible);
	}

	static get windowName(){
		return "Empty";
	}
}
