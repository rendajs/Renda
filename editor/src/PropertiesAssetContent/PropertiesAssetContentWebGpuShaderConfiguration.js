import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {WebGpuShaderConfiguration, ShaderSource} from "../../../src/index.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentWebGpuShaderConfiguration extends PropertiesAssetContent{
	constructor(){
		super();

		this.configStructure = {
			vertexShader: {
				type: ShaderSource,
			},
			fragmentShader: {
				type: ShaderSource,
			},
		}

		this.configTree = this.treeView.addCollapsable("config");
		this.configTree.generateFromSerializableStructure(this.configStructure);
		this.configTree.onChildValueChange(_ => {
			if(this.isUpdatingBundleSettingsTree) return;
			const guiValues = this.getGuiValues();
			const jsonData = {
				outputLocation: guiValues.outputLocation,
				assets: [],
			};
			for(let i=0; i<guiValues.assets.length; i++){
				const asset = guiValues.assets[i];
				const assetUuid = asset?.uuid || "";
				jsonData.assets[i] = assetUuid;
			}
			//todo: handle multiple selected items or no selection
			this.currentSelection[0].writeAssetData(jsonData);
		});
	}

	async selectionUpdated(selectedConfigs){
		super.selectionUpdated(selectedConfigs);
		//todo: handle multiple selected items or no selection
	}
}
