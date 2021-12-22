import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeEntity, Entity, Vec3} from "../../../../src/mod.js";
import {ContentWindowEntityEditor} from "../../windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {BinaryComposer, StorageType} from "../../../../src/util/BinaryComposer.js";

const entityAssetRootUuidSymbol = Symbol("entityAssetUuid");

export class ProjectAssetTypeEntity extends ProjectAssetType {
	static type = "JJ:entity";
	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";
	static newFileName = "New Entity";

	static usedAssetUuidsSymbol = Symbol("used asset uuids");

	static expectedLiveAssetConstructor = Entity;

	async createNewLiveAssetData() {
		const liveAsset = new Entity();
		liveAsset[entityAssetRootUuidSymbol] = this.projectAsset.uuid;
		return {
			liveAsset,
			editorData: null,
		};
	}

	/**
	 * @param {*} json
	 * @param {import("../LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(json, recursionTracker) {
		const liveAsset = await this.createEntityFromJsonData(json, recursionTracker);
		liveAsset[entityAssetRootUuidSymbol] = this.projectAsset.uuid;
		return {liveAsset};
	}

	async saveLiveAssetData(liveAsset, editorData) {
		return liveAsset.toJson({
			assetManager: this.assetManager,
			assetTypeManager: this.projectAssetTypeManager,
			usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
			entityAssetRootUuidSymbol,
		});
	}

	/**
	 * @override
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const entityEditor = windowManager.getMostSuitableContentWindowByConstructor(ContentWindowEntityEditor);
		await entityEditor.loadEntityAsset(this.projectAsset.uuid);
	}

	/**
	 * @param {*} jsonData
	 * @param {import("../LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
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
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} componentProperties
	 * @param {import("../LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getComponentPropertyValuesFromJson(jsonData, componentProperties, recursionTracker) {
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
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryType} propertyType
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions} propertyGuiOpts
	 * @param {import("../LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyType, propertyGuiOpts, recursionTracker) {
		const propertyValue = originalParentObject[propertyKey];
		if (propertyValue == null) {
			newParentObject[propertyKey] = null;
		} else if (propertyType == "array") {
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

	generateComponentArrayBuffers(entityData) {
		if (entityData.components) {
			for (const component of entityData.components) {
				const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				component.propertyValues = BinaryComposer.objectToBinary(component.propertyValues, {
					...componentConstructor.binaryComposerOpts,
					editorAssetManager: this.assetManager,
				});
			}
		}
		if (entityData.children) {
			for (const child of entityData.children) {
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

	*getReferencedAssetUuidsForEntityData(entityData) {
		if (entityData.components) {
			for (const component of entityData.components) {
				const componentConstructor = this.editorInstance.componentTypeManager.getComponentConstructorForUuid(component.uuid);
				const referencedUuids = [];
				BinaryComposer.objectToBinary(component.propertyValues, {
					...componentConstructor.binaryComposerOpts,
					transformValueHook: args => {
						let {value, type} = args;
						if (componentConstructor.binaryComposerOpts.transformValueHook) {
							value = componentConstructor.binaryComposerOpts.transformValueHook(args);
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
		if (entityData.children) {
			for (const child of entityData.children) {
				for (const uuid of this.getReferencedAssetUuidsForEntityData(child)) {
					yield uuid;
				}
			}
		}
	}
}
