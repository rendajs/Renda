import { ContentWindow } from "../ContentWindow.js";
import { Button } from "../../../ui/Button.js";
import { ButtonGroup } from "../../../ui/ButtonGroup.js";
import { EntryPointPopover, getSelectedScriptEntryPoint } from "./EntryPointPopover.js";
import { TypedMessenger } from "../../../../../src/util/TypedMessenger/TypedMessenger.js";
import { ProjectAssetTypeJavascript } from "../../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import { ProjectAssetTypeHtml } from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import { PopoverToggleButton } from "../../../ui/popoverMenus/PopoverToggleButton.js";

/**
 * @typedef {ReturnType<ContentWindowBuildView["getIframeResponseHandlers"]>} BuildViewIframeResponseHandlers
 */

export class ContentWindowBuildView extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:buildView");
	static contentWindowUiName = "Build";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/buildView.svg";
	static scrollable = false;

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.addPreferencesButton([
			"buildView.availableEntityEntryPoints",
			"buildView.availableScriptEntryPoints",
		], {
			needsCurtain: false,
		});

		this.setContentBehindTopBar(true);

		this.isRunning = false;
		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("build-view-iframe");
		this.contentEl.appendChild(this.iframeEl);

		/** @type {TypedMessenger<BuildViewIframeResponseHandlers, {}>} */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this.getIframeResponseHandlers());
		this.iframeMessenger.setSendHandler((data) => {
			if (!this.iframeEl.contentWindow) {
				throw new Error("Failed to send message to build view iframe because it hasn't loaded yet.");
			}
			this.iframeEl.contentWindow.postMessage(data.sendData, "*", data.transfer);
		});

		this.studioInstance.gestureInProgressManager.onGestureInProgressChange(this.#onGestureInProgressChange);

		window.addEventListener("message", this.onIframeMessage);

		const colorizerFilterManager = this.studioInstance.colorizerFilterManager;

		const playStateButtonsGroup = new ButtonGroup();
		this.addTopBarEl(playStateButtonsGroup.el);

		this.playButton = new Button({
			icon: "static/icons/buildView/play.svg",
			colorizerFilterManager,
			tooltip: "Run Application",
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

		this.entryPointButton = new PopoverToggleButton({
			text: "Entry Point",
			hasDownArrow: true,
			colorizerFilterManager,
		}, () => {
			const assetManager = this.studioInstance.projectManager.assetManager;

			if (!assetManager) {
				throw new Error("Assertion failed, no project settings or asset manager.");
			}

			const popover = this.studioInstance.popoverManager.addPopover(EntryPointPopover, assetManager, this.studioInstance.preferencesManager, this.uuid);
			popover.setNeedsCurtain(false);
			popover.setPos(this.entryPointButton);

			return popover;
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
			this.studioInstance.projectManager.markCurrentProjectAsWorthSaving();
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
			const projectManager = this.studioInstance.projectManager;
			const assetManager = projectManager.assetManager;
			if (!assetManager) {
				throw new Error("Assertion failed, no asset manager");
			}
			const entryPointUuid = getSelectedScriptEntryPoint(this.studioInstance.preferencesManager, this.uuid);
			if (!entryPointUuid) {
				throw new Error("Assertion failed, no entry point has been selected");
			}
			const projectAsset = await assetManager.getProjectAssetFromUuid(entryPointUuid, {
				assertAssetType: [ProjectAssetTypeJavascript, ProjectAssetTypeHtml],
				assertExists: true,
			});
			const assetPath = projectAsset.path;
			if (!assetPath) {
				throw new Error("Assertion failed, selected entry point doesn't exist or has been removed.");
			}
			const clientId = await this.studioInstance.serviceWorkerManager.getClientId();
			let path;
			if (projectAsset.isBuiltIn) {
				path = `builtinAssets/${assetPath.join("/")}`;
			} else {
				path = `sw/clients/${clientId}/projectFiles/${assetPath.join("/")}`;
			}

			const projectAssetType = await projectAsset.getProjectAssetType();
			const projectAssetTypeAny = /** @type {any} */ (projectAssetType);
			let newSrc;
			if (projectAssetTypeAny instanceof ProjectAssetTypeHtml) {
				newSrc = path;
			} else if (projectAssetTypeAny instanceof ProjectAssetTypeJavascript) {
				newSrc = `sw/clients/${clientId}/getGeneratedHtml?scriptSrc=/studio/${path}`;
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
			/**
			 * Requests the desired method for connecting inspectors to the studio instance that hosts the application.
			 */
			requestDesiredStudioConnectionMethod: async () => {
				const clientUuid = await this.studioInstance.studioConnectionsManager.getInternalClientUuid();
				if (!clientUuid) throw new Error("Failed to get internal client id");
				const internalConnectionToken = this.studioInstance.studioConnectionsManager.createConnectionToken();

				const url = new URL("internalDiscovery", window.location.href);
				// TODO: #803 Support for providing a webrtc connection type
				return {
					type: /** @type {const} */ ("renda:internal"),
					discoveryUrl: url.href,
					clientUuid,
					internalConnectionToken,
				};
			},
		};
	}

	/**
	 * @param {MessageEvent} e
	 */
	onIframeMessage = (e) => {
		if (e.source == this.iframeEl.contentWindow) {
			this.iframeMessenger.handleReceivedMessage(e.data);
		}
	};

	updateIframeVisibility() {
		this.iframeEl.style.display = this.isRunning ? "" : "none";
	}

	/**
	 * @param {boolean} gestureInProgress
	 */
	#onGestureInProgressChange = (gestureInProgress) => {
		this.iframeEl.style.pointerEvents = gestureInProgress ? "none" : "";
	};
}
