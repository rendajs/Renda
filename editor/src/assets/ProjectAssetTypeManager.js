import {autoRegisterAssetTypes} from "./autoRegisterAssetTypes.js";
import {ProjectAssetType} from "./projectAssetType/ProjectAssetType.js";
import {isUuid} from "../../../src/util/mod.js";
import {ProjectAssetTypeMaterial} from "./projectAssetType/ProjectAssetTypeMaterial.js";

export class ProjectAssetTypeManager {
	/** @typedef {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier} ProjectAssetTypeIdentifier */

	constructor() {
		/** @type {Map<ProjectAssetTypeIdentifier, typeof ProjectAssetType>} */
		this.registeredAssetTypes = new Map();
	}

	init() {
		for (const t of autoRegisterAssetTypes) {
			this.registerAssetType(t);
		}
		this.registerAssetType(ProjectAssetTypeMaterial);
	}

	/**
	 * @template {any} TLiveAsset
	 * @template {any} TEditorData
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetDiskDataType} TFileData
	 * @param {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructor<TLiveAsset, TEditorData, TFileData>} constructor
	 */
	registerAssetType(constructor) {
		const castConstructor = /** @type {typeof ProjectAssetType} */ (constructor);
		if (!(constructor.prototype instanceof ProjectAssetType)) {
			console.warn("Tried to register project asset type (" + constructor.name + ") that does not extend ProjectAssetType class.");
			return;
		}
		if (castConstructor.type == null) {
			castConstructor.invalidConfigurationWarning("Tried to register project asset type (" + castConstructor.name + ") with no type value, override the static type value in order for this asset type to function properly.");
			return;
		}
		if (!castConstructor.type.includes(":") || castConstructor.type.split(":")[0].length <= 0) {
			castConstructor.invalidConfigurationWarning("Tried to register project asset type (" + castConstructor.name + ") without a namespace in the type value.");
			return;
		}
		if (!castConstructor.typeUuid || !isUuid(castConstructor.typeUuid)) {
			castConstructor.invalidConfigurationWarning("Tried to register project asset type (" + castConstructor.name + ") without a valid typeUuid, override the static typeUuid value in order for this asset type to function properly.");
			return;
		}

		this.registeredAssetTypes.set(castConstructor.type, castConstructor);
	}

	/**
	 * @param {ProjectAssetTypeIdentifier} type
	 */
	getAssetType(type) {
		return this.registeredAssetTypes.get(type) ?? null;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} uuid
	 */
	getAssetTypeByUuid(uuid) {
		for (const assetType of this.registeredAssetTypes.values()) {
			if (assetType.typeUuid == uuid) {
				return assetType;
			}
		}
		return null;
	}

	/**
	 * @param {new (...args: any) => any} constructor
	 */
	*getAssetTypesForConstructor(constructor) {
		for (const assetType of this.registeredAssetTypes.values()) {
			if (assetType.expectedLiveAssetConstructor == constructor) {
				yield assetType;
			}
		}
	}

	/**
	 * @param {new (...args: any) => any} constructor
	 */
	constructorHasAssetType(constructor) {
		const generatorEmpty = this.getAssetTypesForConstructor(constructor).next().done;
		return !generatorEmpty;
	}

	/**
	 * @param {string} extension
	 */
	*getAssetTypesForExtension(extension) {
		for (const assetType of this.registeredAssetTypes.values()) {
			if (assetType.matchExtensions.length > 0) {
				if (assetType.matchExtensions.includes(extension)) yield assetType;
			} else if (extension == assetType.newFileExtension) {
				yield assetType;
			}
		}
	}
}
