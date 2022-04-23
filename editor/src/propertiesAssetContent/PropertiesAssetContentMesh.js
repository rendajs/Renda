import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {Mesh, VertexState} from "../../../src/mod.js";
import {createTreeViewStructure} from "../ui/propertiesTreeView/createStructureHelpers.js";
import {VertexStateProjectAssetType} from "../assets/projectAssetType/VertexStateProjectAssetType.js";

/**
 * @extends {PropertiesAssetContent<import("../assets/projectAssetType/MeshProjectAssetType.js").MeshProjectAssetType>}
 */
export class PropertiesAssetContentMesh extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		this.meshSettingsTree = this.treeView.addCollapsable("mesh settings");

		this.meshSettingsStructure = createTreeViewStructure({
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
		});

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

		if (liveAsset && editorData) {
			const attributeNames = [];
			for (const attributeBuffer of liveAsset.getBuffers()) {
				for (const attribute of attributeBuffer.attributes) {
					const name = Mesh.getAttributeNameForType(attribute.attributeType);
					attributeNames.push(name);
				}
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
		if (liveAsset && editorData) {
			editorData.vertexStateUuid = settings.vertexState;
			const assetManager = this.editorInstance.projectManager.assertAssetManagerExists();
			const vertexStateLiveAsset = await assetManager.getLiveAsset(settings.vertexState, {
				assertAssetType: VertexStateProjectAssetType,
			});
			liveAsset.setVertexState(vertexStateLiveAsset);
			await asset.saveLiveAssetData();
		}
	}

	/**
	 * @override
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedAssets
	 */
	async selectionUpdated(selectedAssets) {
		super.selectionUpdated(selectedAssets);
		this.loadAssetData();
	}
}
