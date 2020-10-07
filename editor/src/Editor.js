import WindowManager from "./WindowManagement/WindowManager.js";
import PropertiesWindowContentManager from "./Managers/PropertiesWindowContentManager.js";
import ProjectAssetTypeManager from "./Assets/ProjectAssetTypeManager.js";
import MaterialMapTypeManager from "./Managers/MaterialMapTypeManager.js";
import ProjectManager from "./Managers/ProjectManager.js";
import ScriptBuilder from "./Managers/ScriptBuilder.js";
import AssetBundler from "./Managers/AssetBundler.js";
import DragManager from "./Managers/DragManager.js";
import ServiceWorkerManager from "./Managers/ServiceWorkerManager.js";
import {RealTimeRenderer} from "../../src/index.js";
import ContextMenuManager from "./UI/ContextMenus/ContextMenuManager.js";

export default class Editor{
	constructor(){
		this.renderer = new RealTimeRenderer();
		this.windowManager = new WindowManager();
		this.contextMenuManager = new ContextMenuManager();
		this.propertiesWindowContentManager = new PropertiesWindowContentManager();
		this.projectAssetTypeManager = new ProjectAssetTypeManager();
		this.materialMapTypeManager = new MaterialMapTypeManager();
		this.projectManager = new ProjectManager();
		this.scriptBuilder = new ScriptBuilder();
		this.assetBundler = new AssetBundler();
		this.dragManager = new DragManager();
		this.serviceWorkerManager = new ServiceWorkerManager();
	}

	//convenience function for getting selected object in the browser console
	get selected(){
		//todo: get selection manager from active window, once that's implemented
		let selected = this.windowManager.rootWindow.windowB.windowA.windowA.tabs[0].selectionManager.currentSelectedObjects;
		if(selected.length == 0) return null;
		if(selected.length == 1) return selected[0];
		return [...selected];
	}

	init(){
		this.renderer.init();
		this.windowManager.init(this);
		this.propertiesWindowContentManager.init();
		this.projectAssetTypeManager.init();
		this.materialMapTypeManager.init();

		this.projectManager.openRecentProjectHandle();
	}
}
