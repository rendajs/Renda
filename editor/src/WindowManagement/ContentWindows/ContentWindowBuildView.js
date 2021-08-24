import editor from "../../editorInstance.js";
import ContentWindow from "./ContentWindow.js";
import Button from "../../UI/Button.js";
import ContentWindowEntityEditor from "./ContentWindowEntityEditor.js";
import {CameraComponent} from "../../../../src/index.js";

export default class ContentWindowBuildView extends ContentWindow{

	static contentWindowTypeId = "buildView";

	constructor(){
		super(...arguments);

		this.setContentBehindTopBar(true);

		this.previewCamDomTarget = editor.renderer.createDomTarget();
		this.renderTargetElement = this.previewCamDomTarget.getElement();
		this.contentEl.appendChild(this.renderTargetElement);
		this.previewCamComponent = null;
		this.previewCamRenderDirty = true;
		this.boundMarkPreviewCamRenderDirty = this.markPreviewCamRenderDirty.bind(this);

		this.isRunning = false;
		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("buildViewIframe");
		this.contentEl.appendChild(this.iframeEl);

		const loadFrameButton = new Button({
			text: "Load Frame",
			onClick: () => {
				this.isRunning = true;
				this.updateFrameSrc();
				this.updateIframeVisibility();
			},
		});
		this.addTopBarButton(loadFrameButton);

		this.linkedEntityEditor = null;
		this.setAvailableLinkedEntityEditor();

		this.updateIframeVisibility();
	}

	destructor(){
		super.destructor();

		this.previewCamDomTarget.destructor();
		this.iframeEl = null;
	}

	setAvailableLinkedEntityEditor(){
		for(const entityEditor of editor.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)){
			this.setLinkedEntityEditor(entityEditor);
			break;
		}
	}

	setLinkedEntityEditor(linkedEntityEditor){
		if(linkedEntityEditor == this.linkedEntityEditor) return;
		if(this.linkedEntityEditor) this.linkedEntityEditor.removeOnRenderDirty(this.boundMarkPreviewCamRenderDirty);
		this.linkedEntityEditor = linkedEntityEditor;
		if(linkedEntityEditor) linkedEntityEditor.onRenderDirty(this.boundMarkPreviewCamRenderDirty);
		this.updatePreviewCam();
	}

	markPreviewCamRenderDirty(){
		this.previewCamRenderDirty = true;
	}

	updatePreviewCam(){
		const lastCam = this.previewCamComponent;
		let foundCamComponent = null;
		if(this.linkedEntityEditor){
			for(const obj of this.linkedEntityEditor.selectionManager.currentSelectedObjects){
				for(const camComponent of obj.getComponents(CameraComponent)){
					foundCamComponent = camComponent;
					break;
				}
				if(foundCamComponent) break;
			}

			if(!foundCamComponent){
				for(const camComponent of this.linkedEntityEditor.editingEntity.getChildComponents(CameraComponent)){
					foundCamComponent = camComponent;
					break;
				}
			}
		}
		this.previewCamComponent = foundCamComponent;
		if(lastCam != this.previewCamComponent){
			this.previewCamRenderDirty = true;
		}
	}

	onWindowResize(w, h){
		this.previewCamDomTarget.resize(w,h);
		this.previewCamRenderDirty = true;
	}

	async updateFrameSrc(){
		const clientId = await editor.serviceWorkerManager.getClientId();
		this.iframeEl.src = "projectbuilds/"+clientId+"/Build/index.html";
	}

	loop(){
		if(this.previewCamRenderDirty){
			this.updatePreviewCam(); //todo: find a more efficient moment to update this
			this.renderPreviewCam();
			this.previewCamRenderDirty = false;
		}
	}

	renderPreviewCam(){
		if(this.previewCamComponent){
			this.previewCamDomTarget.render(this.previewCamComponent);
		}
	}

	updateIframeVisibility(){
		this.renderTargetElement.style.display = this.isRunning ? "none" : "block";
		this.iframeEl.style.display = this.isRunning ? null : "none";
	}
}
