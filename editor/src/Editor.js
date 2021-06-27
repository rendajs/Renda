import WindowManager from "./WindowManagement/WindowManager.js";
import ContextMenuManager from "./UI/ContextMenus/ContextMenuManager.js";
import KeyboardShortcutManager from "./KeyboardShortcuts/KeyboardShortcutManager.js";
import PropertiesWindowContentManager from "./Managers/PropertiesWindowContentManager.js";
import ProjectAssetTypeManager from "./Assets/ProjectAssetTypeManager.js";
import ComponentGizmosManager from "./Managers/ComponentGizmosManager.js";
import MaterialMapTypeManager from "./Managers/MaterialMapTypeManager.js";
import ProjectManager from "./Managers/ProjectManager.js";
import BuiltInDefaultAssetLinksManager from "./Assets/BuiltInDefaultAssetLinksManager.js";
import BuiltInAssetManager from "./Assets/BuiltInAssetManager.js";
import ScriptBuilder from "./Managers/ScriptBuilder.js";
import AssetBundler from "./Managers/AssetBundler.js";
import DragManager from "./Managers/DragManager.js";
import ServiceWorkerManager from "./Managers/ServiceWorkerManager.js";
import DevSocketManager from "./Managers/DevSocketManager.js";
import {IS_DEV_BUILD} from "./editorDefines.js";

import {WebGpuRenderer, builtInComponents, defaultComponentTypeManager, defaultEngineAssetsManager, ShaderBuilder} from "../../src/index.js";

export default class Editor{
	constructor(){
		this.renderer = new WebGpuRenderer();
		this.webGpuShaderBuilder = new ShaderBuilder();
		this.windowManager = new WindowManager();
		this.contextMenuManager = new ContextMenuManager();
		this.keyboardShortcutManager = new KeyboardShortcutManager();
		this.propertiesWindowContentManager = new PropertiesWindowContentManager();
		this.projectAssetTypeManager = new ProjectAssetTypeManager();
		this.componentGizmosManager = new ComponentGizmosManager();
		this.materialMapTypeManager = new MaterialMapTypeManager();
		this.projectManager = new ProjectManager();
		this.builtInDefaultAssetLinksManager = new BuiltInDefaultAssetLinksManager();
		this.builtInAssetManager = new BuiltInAssetManager();
		this.scriptBuilder = new ScriptBuilder();
		this.assetBundler = new AssetBundler();
		this.dragManager = new DragManager();
		this.serviceWorkerManager = new ServiceWorkerManager();

		if(IS_DEV_BUILD){
			this.devSocket = new DevSocketManager();
		}

		for(const component of builtInComponents){
			defaultComponentTypeManager.registerComponent(component);
		}

		this.lastUsedSelectionManager = null;
	}

	//convenience function for getting selected object in the browser console
	get selected(){
		let selectionManager = this.windowManager.lastFocusedContentWindow?.selectionManager;
		if(selectionManager && selectionManager != this.lastUsedSelectionManager){
			this.lastUsedSelectionManager = selectionManager;
		}else{
			selectionManager = this.lastUsedSelectionManager;
		}
		const selected = selectionManager?.currentSelectedObjects ?? [];
		if(selected.length == 0) return null;
		if(selected.length == 1) return selected[0];
		return [...selected];
	}

	init(){
		this.builtInAssetManager.init();
		defaultEngineAssetsManager.addGetAssetHandler(async (uuid) => {
			await this.builtInAssetManager.waitForLoad();
			await this.projectManager.waitForAssetManagerLoad();
			const projectAsset = this.builtInAssetManager.assets.get(uuid);
			if(!projectAsset) return null;
			return await projectAsset.getLiveAsset();
		});
		if(IS_DEV_BUILD){
			this.builtInAssetManager.onAssetChange(uuid => {
				defaultEngineAssetsManager.notifyAssetChanged(uuid);
			});
		}

		this.renderer.init();
		this.windowManager.init(this);
		this.propertiesWindowContentManager.init();
		this.projectAssetTypeManager.init();
		this.componentGizmosManager.init();
		this.materialMapTypeManager.init();
		this.builtInDefaultAssetLinksManager.init();

		this.webGpuShaderBuilder.onShaderUuidRequested(async uuid => {
			const projectAsset = await this.projectManager.assetManager.getProjectAsset(uuid);
			if(projectAsset){
				if(projectAsset.assetType == "JJ:shaderSource"){
					return await projectAsset.readAssetData();
				}
			}
		});

		this.projectManager.onExternalChange(async e => {
			const uuid = await this.projectManager.assetManager.getAssetUuidFromPath(e.path);
			editor.webGpuShaderBuilder.invalidateShader(uuid);
		});
	}
}
