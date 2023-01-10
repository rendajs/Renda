import {TypedMessenger} from "../../../src/util/TypedMessenger.js";
import {getEditorInstance} from "../editorInstance.js";

const messageHandlers = {
	/**
	 * @param {string} filePath
	 */
	async getProjectFile(filePath) {
		const splitPath = filePath.split("/");
		const fileSystem = getEditorInstance().projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Assertion failed, there is no active project file system");
		}
		return await fileSystem.readFile(splitPath);
	},
	async getGeneratedServices() {
		const result = await getEditorInstance().taskManager.runTask("renda:generateServices", {
			outputLocation: ["services.js"],
			usedAssets: [],
			entryPoints: [],
			includeAll: true,
		});
		if (!result.writeAssets || result.writeAssets.length != 1) {
			throw new Error("Assertion failed: no services script was generated");
		}
		const fileData = result.writeAssets[0].fileData;
		if (typeof fileData != "string") {
			throw new Error("Assertion failed, unexpected file data type");
		}
		return fileData;
	},
};
/** @typedef {typeof messageHandlers} ServiceWorkerManagerMessageHandlers */

export class ServiceWorkerManager {
	constructor() {
		this.registration = null;

		this.installationFailed = false;
		this.installSw();

		if (this.supported) {
			/** @type {TypedMessenger<import("../../sw.js").ServiceWorkerMessageHandlers, ServiceWorkerManagerMessageHandlers>} */
			this.messenger = new TypedMessenger();
			this.messenger.setSendHandler(async data => {
				await navigator.serviceWorker.ready;
				if (!this.registration || !this.registration.active) {
					throw new Error("Failed to send message, no active service worker.");
				}
				this.registration.active.postMessage(data.sendData, data.transfer);
			});
			navigator.serviceWorker.addEventListener("message", async e => {
				this.messenger.handleReceivedMessage(e.data);
			});
			this.messenger.setResponseHandlers(messageHandlers);
		}
	}

	get supported() {
		return "serviceWorker" in window.navigator && !this.installationFailed;
	}

	async installSw() {
		if (!this.supported) return;
		try {
			// @rollup-plugin-resolve-url-objects
			const url = new URL("../../sw.js", import.meta.url);
			this.registration = await navigator.serviceWorker.register(url.href, {
				type: "module",
			});
		} catch (e) {
			console.error("failed to install serviceWorker", e);
			this.installationFailed = true;
		}
		const registration = this.registration;
		if (registration) {
			registration.onupdatefound = () => {
				if (registration.active != null) {
					const installingWorker = registration.installing;
					if (installingWorker) {
						installingWorker.onstatechange = () => {
							if (installingWorker.state == "installed") {
								// TODO: show update notification
							}
						};
					}
				}
			};
		}
	}

	async getClientId() {
		if (!this.messenger) {
			throw new Error("Assertion failed, no connection with the service worker is established.");
		}
		return await this.messenger.send("requestClientId");
	}
}
