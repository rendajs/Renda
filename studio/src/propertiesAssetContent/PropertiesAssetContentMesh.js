import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {Mesh, VertexState} from "../../../src/mod.js";
import {createTreeViewStructure} from "../ui/propertiesTreeView/createStructureHelpers.js";
import {ProjectAssetTypeVertexState} from "../assets/projectAssetType/ProjectAssetTypeVertexState.js";

/**
 * @extends {PropertiesAssetContent<import("../assets/projectAssetType/ProjectAssetTypeMesh.js").ProjectAssetTypeMesh>}
 */
export class PropertiesAssetContentMesh extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

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

		this.meshSettingsTree = this.treeView.addCollapsable("Mesh Settings");
		this.meshSettingsTree.renderContainer = true;
		this.meshSettingsTree.generateFromSerializableStructure(this.meshSettingsStructure);
		this.meshSettingsTree.onChildValueChange(changeEvent => {
			if (changeEvent.trigger != "user") return;
			this.saveAsset();
		});
	}

	async loadAssetData() {
		// todo: handle multiple selected items or no selection

		const asset = this.currentSelection[0];
		const {liveAsset, studioData} = await asset.getLiveAssetData();

		if (liveAsset && studioData) {
			const attributeNames = [];
			for (const attributeBuffer of liveAsset.getBuffers()) {
				for (const attribute of attributeBuffer.attributes) {
					const name = Mesh.getAttributeNameForType(attribute.attributeType);
					attributeNames.push(name);
				}
			}
			this.meshSettingsTree.fillSerializableStructureValues({
				vertexState: studioData.vertexStateUuid,
				attributes: attributeNames,
			});
		}
	}

	async saveAsset() {
		const settings = this.meshSettingsTree.getSerializableStructureValues(this.meshSettingsStructure);

		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const {liveAsset, studioData} = await asset.getLiveAssetData();
		if (liveAsset && studioData) {
			studioData.vertexStateUuid = settings.vertexState;
			const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
			const vertexStateLiveAsset = await assetManager.getLiveAsset(settings.vertexState, {
				assertAssetType: ProjectAssetTypeVertexState,
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
