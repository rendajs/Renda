export default class ContentWindow{
	constructor(editor){
		this.editor = editor;
		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");
	}

	static get windowName(){
		return "Empty";
	}
}
