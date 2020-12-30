import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh, WebGpuVertexState} from "../../../src/index.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class PropertiesAssetContentMesh extends PropertiesAssetContent{
	constructor(){
		super();

		this.meshSettingsTree = this.treeView.addCollapsable("mesh settings");

		this.meshSettingsStructure = {
			vertexState: {
				type: WebGpuVertexState,
				guiOpts: {
					storageType: "uuid",
				}
			},
		};

		this.meshSettingsTree.generateFromSerializableStructure(this.meshSettingsStructure);
		this.meshSettingsTree.onChildValueChange(_ => {
			if(this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	async loadAssetData(){
		//todo: handle multiple selected items or no selection

		const asset = this.currentSelection[0];
		const file = await asset.readAssetData();
		this.isUpdatingUi = true;

		const vertexStateUuidSlice = file.slice(4, 4 + 16);
		const vertexStateUuidBuffer = await vertexStateUuidSlice.arrayBuffer();
		const vertexStateUuid = BinaryComposer.binaryToUuid(vertexStateUuidBuffer);
		await this.meshSettingsTree.fillSerializableStructureValues({
			vertexState: vertexStateUuid,
		});

		this.isUpdatingUi = false;
	}

	async saveAsset(){
		const settings = this.meshSettingsTree.getSerializableStructureValues(this.meshSettingsStructure);
		const layoutUuidBuffer = new Uint8Array(BinaryComposer.uuidToBinary(settings.vertexState));

		for(const asset of this.currentSelection){
			const file = await asset.readAssetData();
			const buffer = await file.arrayBuffer();
			const view = new Uint8Array(buffer);
			view.set(layoutUuidBuffer, 4);

			asset.writeAssetData(new File([buffer], file.name));
		}
	}

	async selectionUpdated(selectedAssets){
		super.selectionUpdated(selectedAssets);
		this.loadAssetData();
	}
}
