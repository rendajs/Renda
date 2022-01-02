import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeEntity, BinaryComposer, Entity, StorageType, Vec3} from "../../../../src/mod.js";
import {ContentWindowEntityEditor} from "../../windowManagement/contentWindows/ContentWindowEntityEditor.js";

const entityAssetRootUuidSymbol = Symbol("entityAssetUuid");

// todo: better types for generics
/**
 * @extends {ProjectAssetType<Entity, null, import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity>}
 */
export class ProjectAssetTypeEntity extends ProjectAssetType {
	static type = "JJ:entity";
	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";
	static newFileName = "New Entity";

	static usedAssetUuidsSymbol = Symbol("used asset uuids");

	static expectedLiveAssetConstructor = Entity;

	/** @typedef {Entity & {[entityAssetRootUuidSymbol]? : import("../../../../src/mod.js").UuidString}} EntityWithAssetRootUuid */

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
		return {liveAsset};
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
						if (!child) child = new Entity();
						ent.removeAtIndex(insertionIndex); // Remove the old dummy entity
						ent.addAtIndex(child, insertionIndex);
						if (childJson.pos) {
							child.setInstancePos(childJson.pos, ent, insertionIndex);
						}
						if (childJson.rot) {
							child.setInstanceRot(childJson.rot, ent, insertionIndex);
						}
						if (childJson.scale) {
							child.setInstanceScale(childJson.scale, ent, insertionIndex);
						}
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
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure?} componentProperties
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getComponentPropertyValuesFromJson(jsonData, componentProperties, recursionTracker) {
		/** @type {Object.<string, unknown>} */
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
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryType | undefined} propertyType
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions | undefined} propertyGuiOpts
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyType, propertyGuiOpts, recursionTracker) {
		const propertyValue = originalParentObject[propertyKey];
		if (propertyValue == null) {
			newParentObject[propertyKey] = null;
		} else if (propertyType == "array") {
			/** @type {any[]} */
			const newArr = [];
			const arrayGuiOpts = /** @type {import("../../UI/ArrayGui.js").ArrayGuiOptions} */ (propertyGuiOpts);
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
		return BinaryComposer.objectToBinary(assetData, AssetLoaderTypeEntity.entityBinaryFormat);
	}

	/**
	 * @param {import("../../../../src/core/Entity.js").EntityJsonData} entityData
	 */
	generateComponentArrayBuffers(entityData) {
		const castEntityData = /** @type {import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity} */ (entityData);
		if (castEntityData.components) {
			for (const component of castEntityData.components) {
				const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				if (!componentConstructor) continue;
				component.propertyValues = BinaryComposer.objectToBinary(component.propertyValues, {
					...componentConstructor.binaryComposerOpts,
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
		const castEntityData = /** @type {import("../../../../src/core/Entity.js").EntityJsonDataInlineEntity} */ (entityData);

		if (castEntityData.components) {
			for (const component of castEntityData.components) {
				const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				if (!componentConstructor) continue;
				const binaryComposerOpts = componentConstructor.binaryComposerOpts;
				if (!binaryComposerOpts) continue;
				/** @type {import("../../../../src/mod.js").UuidString[]} */
				const referencedUuids = [];
				BinaryComposer.objectToBinary(component.propertyValues, {
					...binaryComposerOpts,
					transformValueHook: args => {
						let {value, type} = args;
						if (binaryComposerOpts.transformValueHook) {
							value = binaryComposerOpts.transformValueHook(args);
						}

						if (type == StorageType.ASSET_UUID) {
							referencedUuids.push(value);
						}
						return value;
					},
				});
				for (const uuid of referencedUuids) {
					yield uuid;
				}
			}
		}
		if (castEntityData.children) {
			for (const child of castEntityData.children) {
				for (const uuid of this.getReferencedAssetUuidsForEntityData(child)) {
					yield uuid;
				}
			}
		}
	}
}
