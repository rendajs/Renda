import {ContentWindow} from "./ContentWindow.js";
import {Button} from "../../ui/Button.js";
import {ContentWindowEntityEditor} from "./ContentWindowEntityEditor.js";
import {CameraComponent} from "../../../../src/mod.js";

export class ContentWindowBuildView extends ContentWindow {
	static contentWindowTypeId = "buildView";
	static contentWindowUiName = "Build";
	static contentWindowUiIcon = "icons/contentWindowTabs/buildView.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.setContentBehindTopBar(true);

		this.previewCamDomTarget = this.editorInstance.renderer.createDomTarget();
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
		this.addTopBarEl(loadFrameButton.el);

		/** @type {ContentWindowEntityEditor?} */
		this.linkedEntityEditor = null;
		this.setAvailableLinkedEntityEditor();

		this.updateIframeVisibility();
	}

	destructor() {
		this.setLinkedEntityEditor(null);
		super.destructor();

		this.previewCamDomTarget.destructor();
	}

	setAvailableLinkedEntityEditor() {
		for (const entityEditor of this.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			this.setLinkedEntityEditor(entityEditor);
			break;
		}
	}

	/**
	 * @param {ContentWindowEntityEditor?} linkedEntityEditor
	 */
	setLinkedEntityEditor(linkedEntityEditor) {
		if (linkedEntityEditor == this.linkedEntityEditor) return;
		if (this.linkedEntityEditor) this.linkedEntityEditor.removeOnRenderDirty(this.boundMarkPreviewCamRenderDirty);
		this.linkedEntityEditor = linkedEntityEditor;
		if (linkedEntityEditor) linkedEntityEditor.onRenderDirty(this.boundMarkPreviewCamRenderDirty);
		this.updatePreviewCam();
	}

	markPreviewCamRenderDirty() {
		this.previewCamRenderDirty = true;
	}

	updatePreviewCam() {
		const lastCam = this.previewCamComponent;
		let foundCamComponent = null;
		if (this.linkedEntityEditor) {
			for (const {entity} of this.linkedEntityEditor.selectionManager.currentSelectedObjects) {
				for (const camComponent of entity.getComponents(CameraComponent)) {
					foundCamComponent = camComponent;
					break;
				}
				if (foundCamComponent) break;
			}

			if (!foundCamComponent && this.linkedEntityEditor.editingEntity) {
				for (const camComponent of this.linkedEntityEditor.editingEntity.getChildComponents(CameraComponent)) {
					foundCamComponent = camComponent;
					break;
				}
			}
		}
		this.previewCamComponent = foundCamComponent;
		if (lastCam != this.previewCamComponent) {
			this.previewCamRenderDirty = true;
		}
	}

	/**
	 * @param {number} w
	 * @param {number} h
	 */
	onWindowResize(w, h) {
		this.previewCamDomTarget.resize(w, h);
		this.previewCamRenderDirty = true;
	}

	async updateFrameSrc() {
		const clientId = await this.editorInstance.serviceWorkerManager.getClientId();
		this.iframeEl.src = "projectbuilds/" + clientId + "/Build/index.html";
	}

	loop() {
		if (this.previewCamRenderDirty) {
			this.updatePreviewCam(); // todo: find a more efficient moment to update this
			this.renderPreviewCam();
			this.previewCamRenderDirty = false;
		}
	}

	renderPreviewCam() {
		if (this.previewCamComponent) {
			this.previewCamDomTarget.render(this.previewCamComponent);
		}
	}

	updateIframeVisibility() {
		this.renderTargetElement.style.display = this.isRunning ? "none" : "block";
		this.iframeEl.style.display = this.isRunning ? "" : "none";
	}
}
