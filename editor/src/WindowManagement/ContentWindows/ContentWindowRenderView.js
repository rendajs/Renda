import ContentWindow from "./ContentWindow.js";

export default class ContentWindowRenderView extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.contentEl.appendChild(this.canvasEl);

		this.activeCamera = null;
	}

	static get windowName(){
		return "RenderView";
	}

	destructor(){
		super.destructor();

		this.canvasEl = null;
		this.ctx = null;
		this.activeCamera = null;
	}

	onWindowResize(w, h){
		this.canvasEl.width = w;
		this.canvasEl.height = h;
	}

}
