import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer, {StorageType} from "../../Util/BinaryComposer.js";
import MaterialMapTypeLoader from "../MaterialMapTypeLoader.js";
import Material from "../../Rendering/Material.js";
import {isUuid} from "../../Util/Util.js";

export default class AssetLoaderTypeMaterial extends AssetLoaderType {
	static get typeUuid() {
		return "430f47a8-82cc-4b4c-a664-2360794e80d6";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		this.registeredLoaderTypes = new Map();
	}

	async parseBuffer(buffer) {
		const materialData = BinaryComposer.binaryToObject(buffer, {
			structure: {
				values: [StorageType.INT8],
				mapDatas: [
					{
						typeUuid: StorageType.UUID,
						data: StorageType.ARRAY_BUFFER,
					},
				],
			},
			nameIds: {
				values: 1,
				mapDatas: 2,
				typeUuid: 3,
				data: 4,
			},
		});
		const customMapDatas = new Map();
		for (const mapData of materialData.mapDatas) {
			const mapLoader = this.registeredLoaderTypes.get(mapData.typeUuid);
			if (!mapLoader) {
				// todo: remove this warning in release builds
				console.warn(`Unable to load material map, no mapLoader found for ${mapData.typeUuid}. Make sure to add a MaterialMapTypeLoader using registerMaterialMapTypeLoader()`);
				continue;
			}
			const parsedMapData = await mapLoader.parseBuffer(mapData.data);
			customMapDatas.set(mapData.typeUuid, parsedMapData);
		}
		const material = new Material({
			customMapDatas,
		});
		return material;
	}

	registerMaterialMapTypeLoader(constructor) {
		// todo: remove these warnings in release builds?
		if (!(constructor.prototype instanceof MaterialMapTypeLoader)) {
			console.warn("Tried to register a MaterialMapTypeLoader type (" + constructor.name + ") that does not extend MaterialMapTypeLoader class.");
			return;
		}

		if (!isUuid(constructor.typeUuid)) {
			constructor.invalidConfigurationWarning("Tried to register MaterialMapTypeLoader (" + constructor.name + ") without a valid typeUuid, override the static typeUuid value in order for this MaterialMapTypeLoader to function properly.");
			return;
		}

		const instance = new constructor(this.assetLoader, this);
		this.registeredLoaderTypes.set(constructor.typeUuid, instance);
	}
}
