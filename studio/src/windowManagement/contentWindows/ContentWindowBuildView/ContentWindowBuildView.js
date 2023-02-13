import {ContentWindow} from "../ContentWindow.js";
import {Button} from "../../../ui/Button.js";
import {getStudioInstance} from "../../../studioInstance.js";
import {ButtonGroup} from "../../../ui/ButtonGroup.js";
import {EntryPointManager, getSelectedEntryPoint} from "./EntryPointManager.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {ProjectAssetTypeHtml} from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";

/**
 * @typedef {ReturnType<ContentWindowBuildView["getIframeResponseHandlers"]>} BuildViewIframeResponseHandlers
 */

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

		this.isRunning = false;
		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("buildViewIframe");
		this.contentEl.appendChild(this.iframeEl);

		/** @type {TypedMessenger<{}, BuildViewIframeResponseHandlers>} */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this.getIframeResponseHandlers());
		this.iframeMessenger.setSendHandler(data => {
			if (!this.iframeEl.contentWindow) {
				throw new Error("Failed to send message to build view iframe because it hasn't loaded yet.");
			}
			this.iframeEl.contentWindow.postMessage(data.sendData, "*", data.transfer);
		});

		window.addEventListener("message", this.onIframeMessage);

		const colorizerFilterManager = getStudioInstance().colorizerFilterManager;

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
			hasDownArrow: true,
			colorizerFilterManager,
			onClick: async () => {
				const editor = getStudioInstance();
				const projectSettings = editor.projectManager.projectSettings;
				const assetManager = editor.projectManager.assetManager;
				if (!projectSettings || !assetManager) return;
				const popover = await editor.popoverManager.createPopover();
				// eslint-disable-next-line no-new
				new EntryPointManager(popover, projectSettings, assetManager, this.persistentData);

				popover.setNeedsCurtain(false);
				popover.setPos(this.entryPointButton);
			},
		});
		this.addTopBarEl(this.entryPointButton.el);

		this.updateButtonVisibilities();
		this.updateIframeVisibility();
	}

	destructor() {
		super.destructor();
		window.removeEventListener("message", this.onIframeMessage);
	}

	/**
	 * @param {boolean} isRunning
	 */
	setIsRunning(isRunning) {
		this.isRunning = isRunning;
		this.updateButtonVisibilities();
		this.updateIframeVisibility();
		this.updateFrameSrc();
		if (isRunning) {
			getStudioInstance().projectManager.markCurrentProjectAsWorthSaving();
		}
	}

	updateButtonVisibilities() {
		this.playButton.setVisibility(!this.isRunning);
		this.stopButton.setVisibility(this.isRunning);
		this.reloadButton.setVisibility(this.isRunning);
		this.entryPointButton.setVisibility(!this.isRunning);
	}

	async updateFrameSrc(allowReload = false) {
		if (this.isRunning) {
			const projectManager = getStudioInstance().projectManager;
			const assetManager = projectManager.assetManager;
			const projectSettings = projectManager.projectSettings;
			if (!assetManager) {
				throw new Error("Assertion failed, no asset manager");
			}
			if (!projectSettings) {
				throw new Error("Assertion failed, no project settings");
			}
			const entryPointUuid = await getSelectedEntryPoint(projectSettings, this.persistentData);
			if (!entryPointUuid) {
				throw new Error("Assertion failed, no entry point has been selected");
			}
			const projectAsset = await assetManager.getProjectAssetFromUuid(entryPointUuid, {
				assertAssetType: [ProjectAssetTypeJavascript, ProjectAssetTypeHtml],
				assertExists: true,
			});
			const path = projectAsset.path;
			if (!path) {
				throw new Error("Assertion failed, selected entry point doesn't exist or has been removed.");
			}
			const clientId = await this.editorInstance.serviceWorkerManager.getClientId();
			const projectAssetType = await projectAsset.getProjectAssetType();
			const projectAssetTypeAny = /** @type {any} */ (projectAssetType);
			let newSrc;
			if (projectAssetTypeAny instanceof ProjectAssetTypeHtml) {
				newSrc = `sw/clients/${clientId}/projectFiles/${path.join("/")}`;
			} else if (projectAssetTypeAny instanceof ProjectAssetTypeJavascript) {
				newSrc = `sw/clients/${clientId}/getGeneratedHtml?scriptSrc=projectFiles/${path.join("/")}`;
			} else {
				throw new Error(`Unexpected asset type for project asset with uuid "${entryPointUuid}"`);
			}
			if (this.iframeEl.src != newSrc || allowReload) {
				this.iframeEl.src = newSrc;
			}
		} else {
			this.iframeEl.src = "";
		}
	}

	getIframeResponseHandlers() {
		return {
			requestInternalDiscoveryUrl() {
				const url = new URL("internalDiscovery.html", window.location.href);
				return url.href;
			},
		};
	}

	/**
	 * @param {MessageEvent} e
	 */
	onIframeMessage = e => {
		if (e.source == this.iframeEl.contentWindow) {
			this.iframeMessenger.handleReceivedMessage(e.data);
		}
	};

	updateIframeVisibility() {
		this.iframeEl.style.display = this.isRunning ? "" : "none";
	}
}
