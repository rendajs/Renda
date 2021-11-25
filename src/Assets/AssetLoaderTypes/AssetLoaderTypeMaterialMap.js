import {BinaryComposer, StorageType, isUuid} from "../../index.js";
import {MaterialMap} from "../../Rendering/MaterialMap.js";
import {MaterialMapType} from "../../Rendering/MaterialMapType.js";
import {MaterialMapTypeLoader} from "../MaterialMapTypeLoader.js";
import AssetLoaderType from "./AssetLoaderType.js";

export class AssetLoaderTypeMaterialMap extends AssetLoaderType {
	static get typeUuid() {
		return "dd28f2f7-254c-4447-b041-1770ae451ba9";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {Map<import("../../../editor/src/Util/Util.js").UuidString, MaterialMapTypeLoader>} */
		this.registeredLoaderTypes = new Map();
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const materialMapData = await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				mapDatas: [
					{
						typeUuid: StorageType.UUID,
						data: StorageType.ARRAY_BUFFER,
					},
				],
			},
			nameIds: {
				mapDatas: 1,
				typeUuid: 2,
				data: 3,
			},
		});

		/** @type {MaterialMapType[]} */
		const materialMapTypes = [];
		for (const mapData of materialMapData.mapDatas) {
			const mapLoader = this.registeredLoaderTypes.get(mapData.typeUuid);
			if (!mapLoader) {
				// todo: remove this warning in release builds
				console.warn(`Unable to load material map, no mapLoader found for ${mapData.typeUuid}. Make sure to add a MaterialMapTypeLoader using registerMaterialMapTypeLoader()`);
				continue;
			}
			const parsedMapData = await mapLoader.parseBuffer(mapData.data);
			materialMapTypes.push(parsedMapData);
		}
		const material = new MaterialMap({
			materialMapTypes,
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
