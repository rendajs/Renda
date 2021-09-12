import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDB from "../Util/FileSystems/EditorFileSystemIndexedDB.js";
import AssetManager from "../Assets/AssetManager.js";
import IndexedDbUtil from "../Util/IndexedDbUtil.js";
import EditorConnectionServer from "../Network/EditorConnectionServer.js";

export default class ProjectManager {
	constructor() {
		/** @type {?import("../Util/FileSystems/EditorFileSystem.js").default} */
		this.currentProjectFileSystem = null;
		this.assetManager = null;
		this.editorConnectionServer = null;

		this.tmpNativeHandleDb = new IndexedDbUtil("tmpNFShandles");

		this.onExternalChangeCbs = new Set();
		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this.suggestCheckExternalChanges();
			}
		});

		this.onAssetManagerLoadCbs = new Set();
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").default} fileSystem
	 */
	openProject(fileSystem) {
		this.currentProjectFileSystem = fileSystem;
		// todo remove this event when opening a new fileSystem
		fileSystem.onExternalChange(e => {
			for (const cb of this.onExternalChangeCbs) {
				cb(e);
			}
		});
		editor.windowManager.reloadCurrentWorkspace();
		this.reloadAssetManager();
	}

	async reloadAssetManager() {
		if (this.assetManager) {
			this.assetManager.destructor();
		}
		this.assetManager = new AssetManager();
		await this.assetManager.waitForAssetSettingsLoad();
		for (const cb of this.onAssetManagerLoadCbs) {
			cb();
		}
		this.onAssetManagerLoadCbs.clear();
	}

	async waitForAssetManagerLoad() {
		if (this.assetManager && this.assetManager.assetSettingsLoaded) return;
		await new Promise(r => this.onAssetManagerLoadCbs.add(r));
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await EditorFileSystemNative.openUserDir();
		this.tmpNativeHandleDb.set("lastHandle", fileSystem.handle);
		this.openProject(fileSystem);
	}

	async openRecentProjectHandle() {
		const handle = await this.tmpNativeHandleDb.get("lastHandle");
		if (handle) {
			const fileSystem = new EditorFileSystemNative(handle);
			this.openProject(fileSystem);
		}
	}

	async openDb() {
		const fileSystem = new EditorFileSystemIndexedDB("test project");
		this.openProject(fileSystem);
	}

	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	removeOnExternalChange(cb) {
		this.onExternalChangeCbs.delete(cb);
	}

	suggestCheckExternalChanges() {
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.suggestCheckExternalChanges();
		}
	}

	/**
	 * @param {string?} endpoint
	 */
	setEditorConnectionServerEndpoint(endpoint) {
		if (!endpoint && this.editorConnectionServer) {
			this.editorConnectionServer.destructor();
			this.editorConnectionServer = null;
		} else if (endpoint) {
			if (!this.editorConnectionServer) {
				this.editorConnectionServer = new EditorConnectionServer();
			}
			this.editorConnectionServer.setEndpoint(endpoint);
		}
	}
}
