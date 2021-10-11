import autoRegisterAssetTypes from "./ProjectAssetType/AutoRegisterAssetTypes.js";
import ProjectAssetType from "./ProjectAssetType/ProjectAssetType.js";
import {isUuid} from "../../../src/Util/Util.js";

export default class ProjectAssetTypeManager {
	constructor() {
		this.registeredAssetTypes = new Map();
	}

	init() {
		for (const t of autoRegisterAssetTypes) {
			this.registerAssetType(t);
		}
	}

	registerAssetType(constructor) {
		if (!(constructor.prototype instanceof ProjectAssetType)) {
			console.warn("Tried to register project asset type (" + constructor.name + ") that does not extend ProjectAssetType class.");
			return;
		}
		if (constructor.type == null) {
			constructor.invalidConfigurationWarning("Tried to register project asset type (" + constructor.name + ") with no type value, override the static type value in order for this asset type to function properly.");
			return;
		}
		if (!constructor.type.includes(":") || constructor.type.split(":")[0].length <= 0) {
			constructor.invalidConfigurationWarning("Tried to register project asset type (" + constructor.name + ") without a namespace in the type value.");
			return;
		}
		if (!isUuid(constructor.typeUuid)) {
			constructor.invalidConfigurationWarning("Tried to register project asset type (" + constructor.name + ") without a valid typeUuid, override the static typeUuid value in order for this asset type to function properly.");
			return;
		}

		this.registeredAssetTypes.set(constructor.type, constructor);
	}

	getAssetType(type) {
		return this.registeredAssetTypes.get(type);
	}

	getAssetTypeByUuid(uuid) {
		for (const assetType of this.registeredAssetTypes.values()) {
			if (assetType.typeUuid == uuid) {
				return assetType;
			}
		}
		return null;
	}

	*getAssetTypesForConstructor(constructor) {
		for (const assetType of this.registeredAssetTypes.values()) {
			if (assetType.expectedLiveAssetConstructor == constructor) {
				yield assetType;
			}
		}
	}

	constructorHasAssetType(constructor) {
		const generatorEmpty = this.getAssetTypesForConstructor(constructor).next().done;
		return !generatorEmpty;
	}

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
