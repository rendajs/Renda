import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh, Vec3} from "../../../src/index.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class PropertiesAssetContentAssetBundle extends PropertiesAssetContent{
	constructor(){
		super();
		this.bundleSettingsTree = this.treeView.addCollapsable("asset bundle settings");

		this.bundleSettingsStructure = {
			assets: {
				type: Array,
				guiItemOpts:{
					arrayTypeOpts:{
						type: ProjectAsset,
					}
				},
			}
		};
		this.bundleSettingsTree.generateFromSerializableStructure(this.bundleSettingsStructure);
		this.bundleSettingsTree.onChildValueChange(_ => {
			for(const projectAsset of this.currentSelection){
				console.log(projectAsset);
			}
			console.log(this.getGuiValues());
		});
	}

	selectionUpdated(selectedBundles){
		super.selectionUpdated(selectedBundles);
		console.log(selectedBundles);
	}

	getGuiValues(){
		return this.bundleSettingsTree.getSerializableStructureValues(this.bundleSettingsStructure);
	}
}
