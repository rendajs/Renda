import { ProjectAssetType } from "./ProjectAssetType.js";
import { AssetLoaderTypeEntity, Entity, StorageType, Vec3 } from "../../../../src/mod.js";
import { objectToBinary } from "../../../../src/util/binarySerialization.js";

// todo: better types for generics
/**
 * @extends {ProjectAssetType<Entity, null, import("../../../../src/core/Entity.js").EntityJsonData>}
 */
export class ProjectAssetTypeEntity extends ProjectAssetType {
	static type = "renda:entity";
	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";
	static newFileName = "New Entity";

	static usedAssetUuidsSymbol = Symbol("used asset uuids");

	static expectedLiveAssetConstructor = Entity;

	async createNewLiveAssetData() {
		const liveAsset = new Entity();
		this.assetManager.entityAssetManager.setLinkedAssetUuid(liveAsset, this.projectAsset.uuid);
		return {
			liveAsset,
			studioData: null,
		};
	}

	/**
	 * @param {import("../../../../src/core/Entity.js").EntityJsonData} json
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(json, recursionTracker) {
		const liveAsset = this.createEntityFromJsonData(json, recursionTracker);
		this.assetManager.entityAssetManager.setLinkedAssetUuid(liveAsset, this.projectAsset.uuid);
		return { liveAsset, studioData: null };
	}

	/**
	 * @param {Entity} liveAsset
	 */
	async saveLiveAssetData(liveAsset) {
		const entityData = liveAsset.toJson({
			assetManager: this.assetManager,
			assetTypeManager: this.projectAssetTypeManager,
			usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
			getLinkedAssetUuid: uuid => {
				return this.assetManager.entityAssetManager.getLinkedAssetUuid(uuid);
			},
		});
		return /** @type {import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity} */ (entityData);
	}

	/**
	 * @override
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const entityEditor = windowManager.getMostSuitableContentWindow("renda:entityEditor");
		if (entityEditor) {
			await entityEditor.loadEntityAsset(this.projectAsset.uuid);
		}
	}

	/**
	 * @param {Object<string, any>} jsonData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	createEntityFromJsonData(jsonData, recursionTracker) {
		if (!jsonData) {
			return new Entity();
		}
		const entity = new Entity({
			name: jsonData.name || "",
			localMatrix: jsonData.matrix,
		});
		if (jsonData.components) {
			for (const component of jsonData.components) {
				const componentUuid = component.uuid;
				const ComponentConstructor = this.studioInstance.componentTypeManager.getComponentConstructorForUuid(componentUuid);
				if (!ComponentConstructor) {
					throw new Error(`Unable to create component with uuid ${componentUuid}. Unknown component type.`);
				}
				const createdComponent = entity.addComponent(ComponentConstructor, {}, {
					studioOpts: {
						studioAssetTypeManager: this.projectAssetTypeManager,
						usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
						assetManager: this.assetManager,
					},
				});
				this.fillComponentPropertyValuesFromJson(createdComponent, component.propertyValues, ComponentConstructor.guiStructure, recursionTracker);
			}
		}
		if (jsonData.children) {
			for (const childJson of jsonData.children) {
				if (childJson.assetUuid) {
					const child = this.assetManager.entityAssetManager.createTrackedEntity(childJson.assetUuid);
					entity.add(child);
				} else {
					const child = this.createEntityFromJsonData(childJson, recursionTracker);
					entity.add(child);
				}
			}
		}
		return entity;
	}

	/**
	 * @param {{}} newParentObject
	 * @param {Object<string, any>} jsonData
	 * @param {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure?} componentProperties
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	fillComponentPropertyValuesFromJson(newParentObject, jsonData, componentProperties, recursionTracker) {
		if (componentProperties) {
			for (const [name, propertyData] of Object.entries(componentProperties)) {
				this.fillComponentPropertyValueFromJson(newParentObject, jsonData, name, propertyData.type, propertyData.guiOpts, recursionTracker);
			}
		}
	}

	/**
	 * @param {any} newParentObject
	 * @param {Object<string, any>} originalParentObject
	 * @param {string} propertyKey
	 * @param {import("../../ui/propertiesTreeView/types.ts").GuiTypes | undefined} propertyType
	 * @param {import("../../ui/propertiesTreeView/types.ts").GuiOptionsBase | undefined} propertyGuiOpts
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyType, propertyGuiOpts, recursionTracker) {
		const propertyValue = originalParentObject[propertyKey];
		if (propertyValue == null) {
			newParentObject[propertyKey] = null;
		} else if (propertyType == "array") {
			/** @type {any[]} */
			const newArr = [];
			const arrayGuiOpts = /** @type {import("../../ui/ArrayGui.js").ArrayGuiOptions<any>} */ (propertyGuiOpts);
			for (const i of propertyValue.keys()) {
				this.fillComponentPropertyValueFromJson(newArr, propertyValue, i, arrayGuiOpts.arrayType, arrayGuiOpts.arrayGuiOpts, recursionTracker);
			}
			newParentObject[propertyKey] = newArr;
		// todo: support for other types
		// } else if (propertyType == "vec2") {
		// 	newPropertyValue = new Vec2(...propertyValue);
		} else if (propertyType == "vec3") {
			newParentObject[propertyKey] = new Vec3(...propertyValue);
		// } else if (propertyType == "vec4") {
		// 	newPropertyValue = new Vec4(...propertyValue);
		// } else if (propertyType == "mat4") {
		// 	newPropertyValue = new Mat4(propertyValue);
		} else if (propertyType == "droppable") {
			recursionTracker.getLiveAsset(propertyValue, liveAsset => {
				if (!liveAsset) liveAsset = null;
				newParentObject[propertyKey] = liveAsset;
				for (const w of this.studioInstance.windowManager.getContentWindows("renda:entityEditor")) {
					if (w.editingEntity == this.projectAsset.liveAsset) {
						w.markRenderDirty();
					}
				}
			}, { repeatOnLiveAssetChange: true });
			let usedAssetUuids = newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol];
			if (!usedAssetUuids) {
				usedAssetUuids = {};
				newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol] = usedAssetUuids;
			}
			usedAssetUuids[propertyKey] = propertyValue;
		} else {
			newParentObject[propertyKey] = propertyValue;
		}
	}

	async createBundledAssetData() {
		const assetData = await this.projectAsset.readAssetData();
		this.generateComponentArrayBuffers(assetData);
		return objectToBinary(assetData, AssetLoaderTypeEntity.entityBinaryFormat);
	}

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig<ProjectAssetTypeEntity>} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeEntity",
		instanceIdentifier: "entityLoader",
		async extra(ctx) {
			ctx.addImport("ComponentTypeManager", "renda");
			/** @type {Set<typeof import("../../../../src/mod.js").Component>} */
			const usedComponentTypes = new Set();
			for (const asset of ctx.usedAssets) {
				const entity = await asset.getLiveAsset();
				const generator = entity.traverseDown({
					filter: child => {
						const uuid = ctx.assetManager.entityAssetManager.getLinkedAssetUuid(child);
						return !uuid || uuid == asset.uuid;
					},
				});
				for (const child of generator) {
					for (const component of child.components) {
						const castComponent = /** @type {typeof import("../../../../src/mod.js").Component} */ (component.constructor);
						usedComponentTypes.add(castComponent);
					}
				}
			}

			if (ctx.includeAll) {
				for (const component of ctx.studio.componentTypeManager.getAllComponents()) {
					usedComponentTypes.add(component);
				}
			}

			let extraText = `const componentTypeManager = new ComponentTypeManager();
entityLoader.setComponentTypeManager(componentTypeManager);`;

			for (const componentType of usedComponentTypes) {
				ctx.addImport(componentType.name, "renda");
				extraText += `\ncomponentTypeManager.registerComponent(${componentType.name});`;
			}

			return extraText;
		},
	};

	/**
	 * @param {import("../../../../src/core/Entity.js").EntityJsonData} entityData
	 */
	generateComponentArrayBuffers(entityData) {
		const castEntityData = /** @type {import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity} */ (entityData);
		if (castEntityData.components) {
			for (const component of castEntityData.components) {
				const componentConstructor = this.studioInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				if (!componentConstructor) continue;
				if (!componentConstructor.binarySerializationOpts) {
					throw new Error("Assertion failed, component type has no binarySerializationOpts");
				}
				component.propertyValues = objectToBinary(component.propertyValues, {
					...componentConstructor.binarySerializationOpts,
					studioAssetManager: this.assetManager,
					transformValueHook: opts => {
						if (opts.type == StorageType.ASSET_UUID) {
							const uuid = /** @type {import("../../../../src/mod.js").UuidString} */ (opts.value);
							return this.assetManager.resolveDefaultAssetLinkUuid(uuid);
						}
						return opts.value;
					},
				});
			}
		}
		if (castEntityData.children) {
			for (const child of castEntityData.children) {
				this.generateComponentArrayBuffers(child);
			}
		}
	}

	/**
	 * @returns {AsyncGenerator<string>}
	 */
	async *getReferencedAssetUuids() {
		const assetData = await this.projectAsset.readAssetData();
		for (const uuid of this.getReferencedAssetUuidsForEntityData(assetData)) {
			yield uuid;
		}
	}

	/**
	 * @param {import("../../../../src/core/Entity.js").EntityJsonData} entityData
	 * @returns {Generator<import("../../../../src/mod.js").UuidString>}
	 */
	*getReferencedAssetUuidsForEntityData(entityData) {
		if ("assetUuid" in entityData) {
			yield entityData.assetUuid;
		} else {
			if (entityData.components) {
				for (const component of entityData.components) {
					const componentConstructor = this.studioInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
					if (!componentConstructor) continue;
					const binarySerializationOpts = componentConstructor.binarySerializationOpts;
					if (!binarySerializationOpts) continue;
					/** @type {import("../../../../src/mod.js").UuidString[]} */
					const referencedUuids = [];
					objectToBinary(component.propertyValues, {
						...binarySerializationOpts,
						transformValueHook: args => {
							let { value, type } = args;
							if (binarySerializationOpts.transformValueHook) {
								value = binarySerializationOpts.transformValueHook(args);
							}

							if (type == StorageType.ASSET_UUID) {
								const castValue = /** @type {import("../../../../src/mod.js").UuidString} */ (value);
								referencedUuids.push(castValue);
							}
							return value;
						},
					});
					for (const uuid of referencedUuids) {
						yield uuid;
					}
				}
			}
			if (entityData.children) {
				for (const child of entityData.children) {
					for (const uuid of this.getReferencedAssetUuidsForEntityData(child)) {
						yield uuid;
					}
				}
			}
		}
	}
}
