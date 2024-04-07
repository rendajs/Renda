import { TypedMessenger } from "../../../src/util/TypedMessenger/TypedMessenger.js";
import { ENGINE_SOURCE_PATH } from "../studioDefines.js";
import { getStudioInstance } from "../studioInstance.js";

const UP_TO_DATE_DURATION_MS = 30_000;

let openTabCount = 0;
/** @type {Set<() => void>} */
const onOpenTabCountChangeCbs = new Set();

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
	/**
	 * @param {number} newOpenTabCount
	 */
	openTabCountChanged(newOpenTabCount) {
		if (openTabCount != newOpenTabCount) {
			openTabCount = newOpenTabCount;
			onOpenTabCountChangeCbs.forEach((cb) => cb());
		}
	},
};
/** @typedef {typeof messageHandlers} ServiceWorkerManagerMessageHandlers */
/** @typedef {"checking-for-updates" | "installing" | "waiting-for-restart" | "restarting" | "up-to-date" | "idle"} ServiceWorkerInstallingState */

export class ServiceWorkerManager {
	/** @type {ServiceWorkerRegistration?} */
	#registration = null;

	/** @type {ServiceWorkerInstallingState} */
	#installingState = "idle";
	get installingState() {
		return this.#installingState;
	}

	#lastUpdateCheckTime = 0;
	#isCheckingForUpdates = false;
	#isRestarting = false;
	/** @type {Set<() => void>} */
	#onInstallingStateChangeCbs = new Set();

	/** @type {Map<ServiceWorker, TypedMessenger<ServiceWorkerManagerMessageHandlers, import("../../sw.js").ServiceWorkerMessageHandlers>>} */
	#messengers = new Map();

	constructor() {
		if (this.supported) {
			navigator.serviceWorker.addEventListener("message", async (e) => {
				if (e.source instanceof ServiceWorker) {
					const messenger = this.#getOrCreateServiceWorkerMessenger(e.source);
					messenger.handleReceivedMessage(e.data);
				}
			});
			navigator.serviceWorker.addEventListener("controllerchange", () => {
				location.reload();
			});
		}

		window.addEventListener("beforeunload", () => {
			for (const messenger of this.#messengers.values()) {
				messenger.send.unregisterClient();
			}
		});
	}

	get supported() {
		return "serviceWorker" in window.navigator;
	}

	async init() {
		if (!this.supported) return;
		try {
			// @rollup-plugin-resolve-url-objects
			const url = new URL("../../sw.js", import.meta.url);
			this.#registration = await navigator.serviceWorker.register(url.href, {
				type: "module",
			});
		} catch (e) {
			console.error("failed to install serviceWorker", e);
		}
		const registration = this.#registration;
		if (registration) {
			registration.addEventListener("updatefound", () => {
				if (registration.installing) this.#getOrCreateServiceWorkerMessenger(registration.installing);
				this.#updateInstallingState();
				registration.installing?.addEventListener("statechange", () => {
					this.#updateInstallingState();
				});
			});
			if (registration.installing) this.#getOrCreateServiceWorkerMessenger(registration.installing);
			if (registration.waiting) this.#getOrCreateServiceWorkerMessenger(registration.waiting);
			if (registration.active) this.#getOrCreateServiceWorkerMessenger(registration.active);
		}
		this.checkForUpdates();
	}

	async getClientId() {
		const activeServiceWorker = this.#registration?.active;
		if (!activeServiceWorker) {
			throw new Error("Assertion failed, no active service worker exists.");
		}
		const messenger = this.#getOrCreateServiceWorkerMessenger(activeServiceWorker);
		return await messenger.send.requestClientId();
	}

	/**
	 * @param {ServiceWorker} serviceWorker
	 */
	#getOrCreateServiceWorkerMessenger(serviceWorker) {
		let messenger = this.#messengers.get(serviceWorker);
		if (!messenger) {
			messenger = new TypedMessenger();

			messenger.setSendHandler(async (data) => {
				serviceWorker.postMessage(data.sendData, data.transfer);
			});
			messenger.setResponseHandlers(messageHandlers);
			this.#messengers.set(serviceWorker, messenger);
			messenger.send.registerClient();
		}
		return messenger;
	}

	#updateInstallingState() {
		/** @type {ServiceWorkerInstallingState} */
		let state = "idle";
		if (this.#isRestarting) {
			state = "restarting";
		} else if (this.#isCheckingForUpdates) {
			state = "checking-for-updates";
		} else if (this.#registration) {
			if (this.#registration.installing) {
				state = "installing";
			} else if (this.#registration.waiting) {
				state = "waiting-for-restart";
			} else if (performance.now() - this.#lastUpdateCheckTime < UP_TO_DATE_DURATION_MS) {
				state = "up-to-date";
			}
		}

		if (this.#installingState != state) {
			this.#installingState = state;
			this.#onInstallingStateChangeCbs.forEach((cb) => cb());
		}
	}

	/**
	 * @param {() => void} cb
	 */
	onInstallingStateChange(cb) {
		this.#onInstallingStateChangeCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnInstallingStateChange(cb) {
		this.#onInstallingStateChangeCbs.delete(cb);
	}

	get openTabCount() {
		return openTabCount;
	}

	/**
	 * @param {() => void} cb
	 */
	onOpenTabCountChange(cb) {
		onOpenTabCountChangeCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnOpenTabCountChange(cb) {
		onOpenTabCountChangeCbs.delete(cb);
	}

	/**
	 * Checks if there is a service worker update available and installs it if so.
	 */
	async checkForUpdates() {
		if (!this.supported || !this.#registration || this.#isCheckingForUpdates) return;
		if (this.#installingState != "idle") return;

		this.#isCheckingForUpdates = true;
		this.#updateInstallingState();
		try {
			await this.#registration.update();
			this.#lastUpdateCheckTime = performance.now();
			setTimeout(() => {
				this.#updateInstallingState();
			}, UP_TO_DATE_DURATION_MS);
		} finally {
			this.#isCheckingForUpdates = false;
			this.#updateInstallingState();
		}
	}

	/**
	 * Causes the waiting service worker to claim this client and reload the page.
	 * This essentially 'restarts' the application after an update.
	 */
	async restartClients() {
		const waitingServiceWorker = this.#registration?.waiting;
		if (!waitingServiceWorker) {
			throw new Error("Assertion failed, no service worker is waiting.");
		}
		this.#isRestarting = true;
		this.#updateInstallingState();
		const messenger = this.#getOrCreateServiceWorkerMessenger(waitingServiceWorker);
		await messenger.send.skipWaiting();
	}
}
