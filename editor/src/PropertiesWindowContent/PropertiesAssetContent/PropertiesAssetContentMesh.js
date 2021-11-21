import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh, VertexState} from "../../../../src/index.js";
import editor from "../../editorInstance.js";

export default class PropertiesAssetContentMesh extends PropertiesAssetContent {
	constructor() {
		super();

		this.meshSettingsTree = this.treeView.addCollapsable("mesh settings");

		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.meshSettingsStructure = {
			vertexState: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [VertexState],
				},
			},
			attributes: {
				type: "array",
				guiOpts: {
					arrayType: "dropdown",
					arrayGuiOpts: {
						items: Array.from(Object.keys(Mesh.AttributeType)),
					},
				},
			},
		};

		this.meshSettingsTree.generateFromSerializableStructure(this.meshSettingsStructure);
		this.meshSettingsTree.onChildValueChange(() => {
			if (this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	async loadAssetData() {
		// todo: handle multiple selected items or no selection

		const asset = this.currentSelection[0];
		const {liveAsset, editorData} = await asset.getLiveAssetData();
		this.isUpdatingUi = true;

		if (liveAsset) {
			const attributeNames = [];
			for (const attributeBuffer of liveAsset.getBuffers()) {
				const name = Mesh.getAttributeNameForType(attributeBuffer.attributeType);
				attributeNames.push(name);
			}
			this.meshSettingsTree.fillSerializableStructureValues({
				vertexState: editorData.vertexStateUuid,
				attributes: attributeNames,
			});
		}

		this.isUpdatingUi = false;
	}

	async saveAsset() {
		const settings = this.meshSettingsTree.getSerializableStructureValues(this.meshSettingsStructure);

		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const {liveAsset, editorData} = await asset.getLiveAssetData();
		editorData.vertexStateUuid = settings.vertexState;
		if (liveAsset) {
			const vertexStateLiveAsset = await editor.projectManager.assetManager.getLiveAsset(settings.vertexState);
			liveAsset.setVertexState(vertexStateLiveAsset);
			await asset.saveLiveAssetData();
		}
	}

	async selectionUpdated(selectedAssets) {
		super.selectionUpdated(selectedAssets);
		this.loadAssetData();
	}
}
