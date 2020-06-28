import editor from "../../editorInstance.js";
import ContentWindow from "./ContentWindow.js";
import Button from "../../UI/Button.js";

export default class ContentWindowBuildView extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("buildViewIframe");
		this.contentEl.appendChild(this.iframeEl);


		const loadFrameButton = new Button({
			text: "Load Frame",
			onClick: _ => {
				this.updateFrameSrc();
			},
		});
		this.addTopBarButton(loadFrameButton);
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

	async updateFrameSrc(){
		const clientId = await editor.serviceWorkerManager.getClientId();
		this.iframeEl.src = "projectbuilds/"+clientId+"/Build/index.html";
	}
}
