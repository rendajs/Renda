import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeEntity, Entity, StorageType, Vec3} from "../../../../src/mod.js";
import {objectToBinary} from "../../../../src/util/binarySerialization.js";
import {ContentWindowEntityEditor} from "../../windowManagement/contentWindows/ContentWindowEntityEditor.js";

export const entityAssetRootUuidSymbol = Symbol("entityAssetUuid");

// This function is never called, but it is used for creating the
// 'EntityWithAssetRootUuid' type without getting a TypeScript error.
// See https://github.com/microsoft/TypeScript/issues/47259
// eslint-disable-next-line no-unused-vars
function getEntityWithAssetRootUuidType() {
	const x = /** @type {unknown} */ (null);
	const y = /** @type {Entity & {[entityAssetRootUuidSymbol]? : import("../../../../src/mod.js").UuidString}} */ (x);
	return y;
}
/** @typedef {ReturnType<getEntityWithAssetRootUuidType>} EntityWithAssetRootUuid */

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
		/** @type {EntityWithAssetRootUuid} */
		const liveAsset = new Entity();
		liveAsset[entityAssetRootUuidSymbol] = this.projectAsset.uuid;
		return {
			liveAsset,
			editorData: null,
		};
	}

	/**
	 * @param {*} json
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(json, recursionTracker) {
		/** @type {EntityWithAssetRootUuid} */
		const liveAsset = await this.createEntityFromJsonData(json, recursionTracker);
		liveAsset[entityAssetRootUuidSymbol] = this.projectAsset.uuid;
		return {liveAsset, editorData: null};
	}

	/**
	 * @param {Entity} liveAsset
	 */
	async saveLiveAssetData(liveAsset) {
		const entityData = liveAsset.toJson({
			assetManager: this.assetManager,
			assetTypeManager: this.projectAssetTypeManager,
			usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
			entityAssetRootUuidSymbol,
		});
		return /** @type {import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity} */ (entityData);
	}

	/**
	 * @override
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const entityEditor = windowManager.getMostSuitableContentWindowByConstructor(ContentWindowEntityEditor);
		if (entityEditor) {
			await entityEditor.loadEntityAsset(this.projectAsset.uuid);
		}
	}

	/**
	 * @param {*} jsonData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async createEntityFromJsonData(jsonData, recursionTracker) {
		if (!jsonData) {
			return new Entity();
		}
		const ent = new Entity({
			name: jsonData.name || "",
			matrix: jsonData.matrix,
		});
		if (jsonData.components) {
			for (const component of jsonData.components) {
				const componentUuid = component.uuid;
				const ComponentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(componentUuid);
				if (!ComponentConstructor) {
					throw new Error(`Unable to create component with uuid ${componentUuid}. Unknown component type.`);
				}
				const componentPropertyValues = await this.getComponentPropertyValuesFromJson(component.propertyValues, ComponentConstructor.guiStructure, recursionTracker);
				ent.addComponent(ComponentConstructor, componentPropertyValues, {
					editorOpts: {
						editorAssetTypeManager: this.projectAssetTypeManager,
						usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
						assetManager: this.assetManager,
					},
				});
			}
		}
		if (jsonData.children) {
			for (const childJson of jsonData.children) {
				if (childJson.assetUuid) {
					const insertionIndex = ent.childCount;
					ent.add(new Entity());
					recursionTracker.getLiveAsset(childJson.assetUuid, child => {
						if (child) {
							child = child.clone();
						} else {
							child = new Entity("Missing entity asset");
						}
						const castChild = /** @type {EntityWithAssetRootUuid} */ (child);
						castChild[entityAssetRootUuidSymbol] = childJson.assetUuid;
						ent.removeAtIndex(insertionIndex); // Remove the old dummy entity
						ent.addAtIndex(child, insertionIndex);
					}, {
						assertAssetType: ProjectAssetTypeEntity,
					});
				} else {
					const child = await this.createEntityFromJsonData(childJson, recursionTracker);
					ent.add(child);
				}
			}
		}
		return ent;
	}

	/**
	 * @param {*} jsonData
	 * @param {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?} componentProperties
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getComponentPropertyValuesFromJson(jsonData, componentProperties, recursionTracker) {
		/** @type {Object<string, unknown>} */
		const newPropertyValues = {};
		if (componentProperties) {
			for (const [name, propertyData] of Object.entries(componentProperties)) {
				await this.fillComponentPropertyValueFromJson(newPropertyValues, jsonData, name, propertyData.type, propertyData.guiOpts, recursionTracker);
			}
		}
		return newPropertyValues;
	}

	/**
	 *
	 * @param {*} newParentObject
	 * @param {*} originalParentObject
	 * @param {string} propertyKey
	 * @param {import("../../ui/propertiesTreeView/types.js").GuiTypes | undefined} propertyType
	 * @param {import("../../ui/propertiesTreeView/types.js").GuiOptionsBase | undefined} propertyGuiOpts
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyType, propertyGuiOpts, recursionTracker) {
		const propertyValue = originalParentObject[propertyKey];
		if (propertyValue == null) {
			newParentObject[propertyKey] = null;
		} else if (propertyType == "array") {
			/** @type {any[]} */
			const newArr = [];
			const arrayGuiOpts = /** @type {import("../../ui/ArrayGui.js").ArrayGuiOptions<any>} */ (propertyGuiOpts);
			for (const i of propertyValue.keys()) {
				await this.fillComponentPropertyValueFromJson(newArr, propertyValue, i, arrayGuiOpts.arrayType, arrayGuiOpts.arrayGuiOpts, recursionTracker);
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
				for (const w of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
					if (w.editingEntity == this.projectAsset.liveAsset) {
						w.markRenderDirty();
					}
				}
			}, {repeatOnLiveAssetChange: true});
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
						const castChild = /** @type {EntityWithAssetRootUuid} */ (child);
						const uuid = castChild[entityAssetRootUuidSymbol];
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
				const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				if (!componentConstructor) continue;
				if (!componentConstructor.binarySerializationOpts) {
					throw new Error("Assertion failed, component type has no binarySerializationOpts");
				}
				component.propertyValues = objectToBinary(component.propertyValues, {
					...componentConstructor.binarySerializationOpts,
					editorAssetManager: this.assetManager,
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
					const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
					if (!componentConstructor) continue;
					const binarySerializationOpts = componentConstructor.binarySerializationOpts;
					if (!binarySerializationOpts) continue;
					/** @type {import("../../../../src/mod.js").UuidString[]} */
					const referencedUuids = [];
					objectToBinary(component.propertyValues, {
						...binarySerializationOpts,
						transformValueHook: args => {
							let {value, type} = args;
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
