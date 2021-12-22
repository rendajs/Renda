import {WindowManager} from "./windowManagement/WindowManager.js";
import {SelectionManager} from "./Managers/SelectionManager.js";
import {ContextMenuManager} from "./UI/ContextMenus/ContextMenuManager.js";
import {KeyboardShortcutManager} from "./KeyboardShortcuts/KeyboardShortcutManager.js";
import {PropertiesWindowContentManager} from "./Managers/PropertiesWindowContentManager.js";
import {ProjectAssetTypeManager} from "./Assets/ProjectAssetTypeManager.js";
import {ComponentGizmosManager} from "./Managers/ComponentGizmosManager.js";
import {MaterialMapTypeSerializerManager} from "./Managers/MaterialMapTypeSerializerManager.js";
import {ProjectManager} from "./Managers/ProjectManager.js";
import {BuiltInDefaultAssetLinksManager} from "./Assets/BuiltInDefaultAssetLinksManager.js";
import {BuiltInAssetManager} from "./Assets/BuiltInAssetManager.js";
import {ScriptBuilder} from "./Managers/ScriptBuilder.js";
import {AssetBundler} from "./Managers/AssetBundler.js";
import {DragManager} from "./Managers/DragManager.js";
import {ColorizerFilterManager} from "./Util/ColorizerFilters/ColorizerFilterManager.js";
import {ServiceWorkerManager} from "./Managers/ServiceWorkerManager.js";
import {IS_DEV_BUILD} from "./editorDefines.js";
import {DevSocketManager} from "./Managers/DevSocketManager.js";
import {ComponentTypeManager} from "../../src/Components/ComponentTypeManager.js";

import {AssetLoader, EngineAssetsManager, ShaderBuilder, WebGpuRenderer, builtInComponents} from "../../src/mod.js";

export class Editor {
	constructor() {
		this.engineAssetManager = new EngineAssetsManager(new AssetLoader());
		this.renderer = new WebGpuRenderer(this.engineAssetManager);
		this.webGpuShaderBuilder = new ShaderBuilder();
		this.windowManager = new WindowManager();
		this.selectionManager = new SelectionManager();
		this.contextMenuManager = new ContextMenuManager();
		this.keyboardShortcutManager = new KeyboardShortcutManager();
		this.propertiesWindowContentManager = new PropertiesWindowContentManager();
		this.projectAssetTypeManager = new ProjectAssetTypeManager();
		this.componentGizmosManager = new ComponentGizmosManager();
		this.materialMapTypeManager = new MaterialMapTypeSerializerManager();
		this.projectManager = new ProjectManager();
		this.builtInDefaultAssetLinksManager = new BuiltInDefaultAssetLinksManager();
		this.builtInAssetManager = new BuiltInAssetManager();
		this.scriptBuilder = new ScriptBuilder();
		this.assetBundler = new AssetBundler();
		this.dragManager = new DragManager();
		this.colorizerFilterManager = new ColorizerFilterManager();
		this.serviceWorkerManager = new ServiceWorkerManager();

		if (IS_DEV_BUILD) {
			this.devSocket = new DevSocketManager();
		}

		this.componentTypeManager = new ComponentTypeManager();
		for (const component of builtInComponents) {
			this.componentTypeManager.registerComponent(component);
		}

		this.lastUsedSelectionManager = null;
	}

	// convenience function for getting selected object in the browser console
	get selected() {
		const contentWindow = /** @type {any} */ (this.windowManager.lastFocusedContentWindow);
		let selectionManager = contentWindow?.selectionManager;
		if (selectionManager && selectionManager != this.lastUsedSelectionManager) {
			this.lastUsedSelectionManager = selectionManager;
		} else {
			selectionManager = this.lastUsedSelectionManager;
		}
		const selected = selectionManager?.currentSelectedObjects ?? [];
		if (selected.length == 0) return null;
		if (selected.length == 1) return selected[0];
		return [...selected];
	}

	init() {
		if (IS_DEV_BUILD && this.devSocket) {
			this.builtInAssetManager.init(this.devSocket);
		}
		this.engineAssetManager.addGetAssetHandler(async uuid => {
			await this.builtInAssetManager.waitForLoad();
			await this.projectManager.waitForAssetManagerLoad();
			const projectAsset = this.builtInAssetManager.assets.get(uuid);
			if (!projectAsset) return null;
			return await projectAsset.getLiveAsset();
		});
		if (IS_DEV_BUILD) {
			this.builtInAssetManager.onAssetChange(uuid => {
				this.engineAssetManager.notifyAssetChanged(uuid);
			});
		}

		this.renderer.init();
		this.windowManager.init();
		this.contextMenuManager.init();
		this.propertiesWindowContentManager.init();
		this.projectAssetTypeManager.init();
		this.componentGizmosManager.init();
		this.materialMapTypeManager.init();
		this.builtInDefaultAssetLinksManager.init();

		this.webGpuShaderBuilder.onShaderUuidRequested(async uuid => {
			const projectAsset = await this.projectManager.assetManager.getProjectAsset(uuid);
			if (projectAsset) {
				if (projectAsset.assetType == "JJ:shaderSource") {
					const assetData = await projectAsset.readAssetData();
					const assetDataStr = /** @type {string} */ (assetData);
					return assetDataStr;
				}
			}
			return null;
		});

		this.projectManager.onExternalChange(async e => {
			const uuid = await this.projectManager.assetManager.getAssetUuidFromPath(e.path);
			this.webGpuShaderBuilder.invalidateShader(uuid);
		});
	}
}
