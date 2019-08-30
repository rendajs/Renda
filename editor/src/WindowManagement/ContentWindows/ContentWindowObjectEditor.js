import ContentWindow from "./ContentWindow.js";

export default class ContentWindowObjectEditor extends ContentWindow{
	constructor(){
		super();

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.el.appendChild(this.canvasEl);
	}

	static get windowName(){
		return "ObjectEditor";
	}
}
