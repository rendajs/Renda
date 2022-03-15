import {getEditorInstance} from "../editorInstance.js";

export class ServiceWorkerManager {
	constructor() {
		this.registration = null;

		this.installationFailed = false;
		this.installSw();

		if (this.supported) {
			navigator.serviceWorker.addEventListener("message", async e => {
				if (e.data.type == "getProjectFile") {
					const {filePath} = e.data;
					const splitPath = filePath.split("/");
					const fileSystem = getEditorInstance().projectManager.currentProjectFileSystem;
					let file;
					if (fileSystem) {
						file = await fileSystem.readFile(splitPath);
					} else {
						file = null;
					}
					if (e.ports.length > 0) {
						for (const port of e.ports) {
							port.postMessage(file);
						}
					}
				}
			});
		}
	}

	get supported() {
		return "serviceWorker" in window.navigator && !this.installationFailed;
	}

	async installSw() {
		if (!this.supported) return;
		try {
			this.registration = await navigator.serviceWorker.register("sw.js");
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

	/**
	 * @param {any} message
	 */
	async roundTripMessage(message) {
		await navigator.serviceWorker.ready;
		const channel = new MessageChannel();
		if (!this.registration || !this.registration.active) {
			throw new Error("Failed to send message, no active service worker.");
		}
		this.registration.active.postMessage(message, [channel.port2]);
		return await new Promise(resolve => {
			channel.port1.addEventListener("message", e => {
				channel.port1.close();
				resolve(e.data);
			});
			channel.port1.start();
		});
	}

	async getClientId() {
		return await this.roundTripMessage({
			type: "requestClientId",
		});
	}
}
