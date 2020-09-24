import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh, Vec3} from "../../../src/index.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentAssetBundle extends PropertiesAssetContent{
	constructor(){
		super();
		this.bundleSettingsTree = this.treeView.addCollapsable("asset bundle settings");

		this.bundleSettingsStructure = {
			outputLocation: {
				type: String,
				guiOpts: {
					label: "Bundle output location",
				},
			},
			bundleButton: {
				type: "button",
				guiOpts: {
					text: "Bundle",
					onClick: _ => {
						editor.assetBundler.bundle(this.currentSelection[0])
					},
				},
			},
			assets: {
				type: Array,
				arrayOpts:{
					type: ProjectAsset,
				}
			},
		};
		this.isUpdatingBundleSettingsTree = false;
		this.bundleSettingsTree.generateFromSerializableStructure(this.bundleSettingsStructure);
		this.bundleSettingsTree.onChildValueChange(_ => {
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

	async selectionUpdated(selectedBundles){
		super.selectionUpdated(selectedBundles);
		//todo: handle multiple selected items or no selection
		const bundle = selectedBundles[0];
		const bundleData = await bundle.readAssetData();
		const guiValues = {
			outputLocation: bundleData.outputLocation,
			assets: [],
		}
		for(let i=0; i<bundleData.assets.length; i++){
			const assetUuid = bundleData.assets[i];
			const asset = await editor.projectManager.assetManager.getProjectAsset(assetUuid);
			guiValues.assets[i] = asset;
		}
		this.isUpdatingBundleSettingsTree = true;
		this.bundleSettingsTree.fillSerializableStructureValues(guiValues);
		this.isUpdatingBundleSettingsTree = false;
	}

	getGuiValues(){
		return this.bundleSettingsTree.getSerializableStructureValues(this.bundleSettingsStructure);
	}
}
