import ContentWindow from "./ContentWindow.js";

export default class ContentWindowBuildView extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("buildViewIframe");
		this.contentEl.appendChild(this.iframeEl);

		this.activeCamera = null;
	}

	static get windowName(){
		return "buildView";
	}

	destructor(){
		super.destructor();

		this.iframeEl = null;
	}

	onWindowResize(w, h){
	}
}
