import {TypedMessenger} from "../../../src/util/TypedMessenger.js";
import {ENGINE_SOURCE_PATH} from "../studioDefines.js";
import {getStudioInstance} from "../studioInstance.js";

/**
 * Asserts
 * @param {import("../tasks/task/Task.js").RunTaskReturn} runTaskResult
 */
function getAssertedStringWriteAsset(runTaskResult) {
	if (!runTaskResult.writeAssets || runTaskResult.writeAssets.length != 1) {
		throw new Error("Assertion failed: no services script was generated");
	}
	const fileData = runTaskResult.writeAssets[0].fileData;
	if (typeof fileData != "string") {
		throw new Error("Assertion failed, unexpected file data type");
	}
	return fileData;
}

const messageHandlers = {
	/**
	 * @param {string} filePath
	 */
	async getProjectFile(filePath) {
		const splitPath = filePath.split("/");
		const fileSystem = getStudioInstance().projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Assertion failed, there is no active project file system");
		}
		return await fileSystem.readFile(splitPath);
	},
	async getGeneratedServices() {
		const result = await getStudioInstance().taskManager.runTask("renda:generateServices", {
			outputLocation: ["services.js"],
			usedAssets: [],
			entryPoints: [],
			includeAll: true,
		});
		return getAssertedStringWriteAsset(result);
	},
	/**
	 * @param {string} scriptSrc The location of the main entry point to include in the html.
	 */
	async getGeneratedHtml(scriptSrc) {
		const engineUrl = new URL(ENGINE_SOURCE_PATH, location.href);
		const importMap = {
			imports: {
				renda: engineUrl.href,
				"renda:services": "./services.js",
			},
		};
		const importMapTag = `<script type="importmap">${JSON.stringify(importMap)}</script>`;
		const result = await getStudioInstance().taskManager.runTask("renda:generateHtml", {
			outputLocation: ["index.html"],
			replacements: [
				{
					find: "HTML_SCRIPT_SRC",
					replace: scriptSrc,
				},
				{
					find: "RENDA_IMPORT_MAP_TAG",
					replace: importMapTag,
				},
			],
			template: "264a38b9-4e43-4261-b57d-28a778a12dd9",
		});
		return getAssertedStringWriteAsset(result);
	},
};
/** @typedef {typeof messageHandlers} ServiceWorkerManagerMessageHandlers */

export class ServiceWorkerManager {
	constructor() {
		this.registration = null;

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
		return "serviceWorker" in window.navigator;
	}

	async init() {
		if (!this.supported) return;
		try {
			// @rollup-plugin-resolve-url-objects
			const url = new URL("../../sw.js", import.meta.url);
			this.registration = await navigator.serviceWorker.register(url.href, {
				type: "module",
			});
		} catch (e) {
			console.error("failed to install serviceWorker", e);
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
		return await this.messenger.send.requestClientId();
	}
}
