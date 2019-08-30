export default class ContentWindow{
	constructor(){
		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");
	}

	static get windowName(){
		return "Empty";
	}
}
