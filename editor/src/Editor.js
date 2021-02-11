import WindowManager from "./WindowManagement/WindowManager.js";
import PropertiesWindowContentManager from "./Managers/PropertiesWindowContentManager.js";
import ProjectAssetTypeManager from "./Assets/ProjectAssetTypeManager.js";
import MaterialMapTypeManager from "./Managers/MaterialMapTypeManager.js";
import ProjectManager from "./Managers/ProjectManager.js";
import BuiltInAssetManager from "./Assets/BuiltInAssetManager.js";
import ScriptBuilder from "./Managers/ScriptBuilder.js";
import AssetBundler from "./Managers/AssetBundler.js";
import DragManager from "./Managers/DragManager.js";
import ServiceWorkerManager from "./Managers/ServiceWorkerManager.js";
import ContextMenuManager from "./UI/ContextMenus/ContextMenuManager.js";

import ProjectAssetTypeShaderSource from "./Assets/ProjectAssetType/ProjectAssetTypeShaderSource.js";

import {WebGpuRenderer, defaultComponents, defaultComponentTypeManager, ShaderBuilder} from "../../src/index.js";
import BinaryComposer from "../../src/Util/BinaryComposer.js";

export default class Editor{
	constructor(){
		this.renderer = new WebGpuRenderer();
		this.webGpuShaderBuilder = new ShaderBuilder();
		this.windowManager = new WindowManager();
		this.contextMenuManager = new ContextMenuManager();
		this.propertiesWindowContentManager = new PropertiesWindowContentManager();
		this.projectAssetTypeManager = new ProjectAssetTypeManager();
		this.materialMapTypeManager = new MaterialMapTypeManager();
		this.projectManager = new ProjectManager();
		this.builtInAssetManager = new BuiltInAssetManager();
		this.scriptBuilder = new ScriptBuilder();
		this.assetBundler = new AssetBundler();
		this.dragManager = new DragManager();
		this.serviceWorkerManager = new ServiceWorkerManager();

		for(const [type, component] of defaultComponents){
			defaultComponentTypeManager.registerComponentType(type, component);
		}
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

	doIt(){
		const structure = {
			strArr: [BinaryComposer.StructureTypes.STRING],
		};
		const nameIds = {
			strArr: 1,
		};
		const binary = BinaryComposer.objectToBinary({
			strArr: ["a","b","c"],
		}, {structure, nameIds});
		const reconstructed = BinaryComposer.binaryToObject(binary, {structure, nameIds});
		console.log(reconstructed);
	}
}
