import {ContentWindow} from "./ContentWindow.js";
import {Button} from "../../ui/Button.js";
import {ContentWindowEntityEditor} from "./ContentWindowEntityEditor.js";
import {CameraComponent} from "../../../../src/mod.js";
import {getEditorInstance} from "../../editorInstance.js";
import {ButtonGroup} from "../../ui/ButtonGroup.js";
import {ProjectAssetTypeHtml} from "../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {DroppableGui} from "../../ui/DroppableGui.js";
import {ButtonSelectorGui} from "../../ui/ButtonSelectorGui.js";

export class ContentWindowBuildView extends ContentWindow {
	static contentWindowTypeId = "buildView";
	static contentWindowUiName = "Build";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/buildView.svg";
	static scrollable = false;

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

		const colorizerFilterManager = getEditorInstance().colorizerFilterManager;

		const playStateButtonsGroup = new ButtonGroup();
		this.addTopBarEl(playStateButtonsGroup.el);

		this.playButton = new Button({
			icon: "static/icons/buildView/play.svg",
			colorizerFilterManager,
			onClick: () => {
				this.setIsRunning(true);
			},
		});
		playStateButtonsGroup.addButton(this.playButton);

		this.stopButton = new Button({
			icon: "static/icons/buildView/stop.svg",
			colorizerFilterManager,
			onClick: () => {
				this.setIsRunning(false);
			},
		});
		playStateButtonsGroup.addButton(this.stopButton);

		this.reloadButton = new Button({
			icon: "static/icons/buildView/reload.svg",
			colorizerFilterManager,
			onClick: () => {
				this.updateFrameSrc(true);
				this.updateIframeVisibility();
			},
		});
		playStateButtonsGroup.addButton(this.reloadButton);

		this.entryPointButton = new Button({
			text: "Entry Point",
			onClick: async () => {
				const popover = await getEditorInstance().popoverManager.createPopover();

				const selector = new ButtonSelectorGui({
					items: ["a", "b", "c"],
					vertical: true,
				});
				popover.el.appendChild(selector.el);

				const droppableGui = DroppableGui.of({
					supportedAssetTypes: [ProjectAssetTypeHtml],
				});
				popover.el.appendChild(droppableGui.el);

				popover.setNeedsCurtain(false);
				popover.setPos(this.entryPointButton);
			},
		});
		this.addTopBarEl(this.entryPointButton.el);

		/** @type {ContentWindowEntityEditor?} */
		this.linkedEntityEditor = null;
		this.setAvailableLinkedEntityEditor();

		this.updateButtonVisibilities();
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
			for (const {entity} of this.linkedEntityEditor.selectionGroup.currentSelectedObjects) {
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

	/**
	 * @param {boolean} isRunning
	 */
	setIsRunning(isRunning) {
		this.isRunning = isRunning;
		this.updateButtonVisibilities();
		this.updateIframeVisibility();
		this.updateFrameSrc();
	}

	updateButtonVisibilities() {
		this.playButton.setVisibility(!this.isRunning);
		this.stopButton.setVisibility(this.isRunning);
		this.reloadButton.setVisibility(this.isRunning);
	}

	async updateFrameSrc(allowReload = false) {
		if (this.isRunning) {
			const clientId = await this.editorInstance.serviceWorkerManager.getClientId();
			const newSrc = `projectbuilds/${clientId}/Build/index.html`;
			if (this.iframeEl.src != newSrc || allowReload) {
				this.iframeEl.src = newSrc;
			}
		} else {
			this.iframeEl.src = "";
		}
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
