import {MaterialMapTypeSerializer} from "./MaterialMapTypeSerializer.js";
import {ShaderSource, Vec3} from "../../../../../../src/index.js";
import {StorageType} from "../../../../../../src/Util/BinaryComposer.js";
import editor from "../../../../editorInstance.js";

export class MaterialMapTypeSerializerWebGlRenderer extends MaterialMapTypeSerializer {
	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";
	static allowExportInAssetBundles = true;

	constructor() {
		super();

		/** @type {import("../../../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.settingsGuiStructure = {
			vertexShader: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [ShaderSource],
				},
			},
			fragmentShader: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [ShaderSource],
				},
			},
		};

		// todo
		// this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		// this.settingsTreeView.onChildValueChange(() => {
		// });
	}

	// async customAssetDataFromLoad(customData) {
	// 	let vertexShader = null;
	// 	let fragmentShader = null;
	// 	if (customData.vertexShader) vertexShader = await editor.projectManager.assetManager.getProjectAsset(customData.vertexShader);
	// 	if (customData.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getProjectAsset(customData.fragmentShader);
	// 	this.settingsTreeView.fillSerializableStructureValues({vertexShader, fragmentShader});
	// }

	// async getCustomAssetDataForSave() {
	// 	const settings = this.getSettingsValues();
	// 	const data = {
	// 		vertexShader: settings.vertexShader?.uuid || null,
	// 		fragmentShader: settings.fragmentShader?.uuid || null,
	// 	};

	// 	return data;
	// }

	static async getLiveAssetCustomData(customData) {
		let vertexShader = null;
		let fragmentShader = null;
		if (customData.vertexShader) vertexShader = await editor.projectManager.assetManager.getLiveAsset(customData.vertexShader);
		if (customData.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getLiveAsset(customData.fragmentShader);
		return {vertexShader, fragmentShader};
	}

	static async *getLinkedAssetsInCustomData(customData) {
		if (customData.vertexShader) yield editor.projectManager.assetManager.getProjectAsset(customData.vertexShader);
		if (customData.fragmentShader) yield editor.projectManager.assetManager.getProjectAsset(customData.fragmentShader);
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			vertUuid: StorageType.UUID,
			fragUuid: StorageType.UUID,
		},
		nameIds: {
			vertUuid: 1,
			fragUuid: 2,
		},
	};

	static mapDataToAssetBundleData(mapData) {
		return {
			vertUuid: mapData.vertexShader,
			fragUuid: mapData.fragmentShader,
		};
	}

	// getSettingsValues() {
	// 	return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	// }

	static async getMappableValues(customData) {
		const itemsMap = new Map();
		await this.addShaderUniformsToMap(customData.vertexShader, itemsMap);
		await this.addShaderUniformsToMap(customData.fragmentShader, itemsMap);

		const items = [];
		for (const [name, itemData] of itemsMap) {
			const type = itemData.type;
			items.push({name, type});
		}
		return items;
	}

	static async addShaderUniformsToMap(shaderUuid, itemsMap) {
		const shaderAsset = await editor.projectManager.assetManager.getProjectAsset(shaderUuid);
		for (const {name, type} of await this.getMapItemsIteratorFromShaderAsset(shaderAsset)) {
			itemsMap.set(name, {type});
		}
	}

	static async getMapItemsIteratorFromShaderAsset(asset) {
		if (!asset) return [];
		const shader = await asset.getLiveAsset();
		return this.getMapItemsFromShaderSource(shader.source);
	}

	static *getMapItemsFromShaderSource(shaderSrc) {
		const re = /^\s*uniform\s(?<type>.+?)\s+(?<name>.+?)\s*;/gm;
		for (const result of shaderSrc.matchAll(re)) {
			const name = result.groups.name;
			let type = null;
			if (result.groups.type == "float") {
				type = Number;
			} else if (result.groups.type == "vec3") {
				type = Vec3;
			}
			yield {name, type};
		}
	}
}
