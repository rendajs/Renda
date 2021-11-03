import ProjectAssetType from "./ProjectAssetType.js";
import {AssetLoaderTypeEntity, Entity, Vec3, defaultComponentTypeManager} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import {ContentWindowEntityEditor} from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import BinaryComposer, {StorageType} from "../../../../src/Util/BinaryComposer.js";

const entityAssetRootUuidSymbol = Symbol("entityAssetUuid");

export default class ProjectAssetTypeEntity extends ProjectAssetType {
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

	async getLiveAssetData(json) {
		const liveAsset = await this.createEntityFromJsonData(json);
		liveAsset[entityAssetRootUuidSymbol] = this.projectAsset.uuid;
		return {liveAsset};
	}

	async saveLiveAssetData(liveAsset, editorData) {
		return liveAsset.toJson({
			assetManager: editor.projectManager.assetManager,
			assetTypeManager: editor.projectAssetTypeManager,
			usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
			entityAssetRootUuidSymbol,
		});
	}

	async open() {
		const entityEditor = editor.windowManager.getMostSuitableContentWindowByConstructor(ContentWindowEntityEditor);
		await entityEditor.loadEntityAsset(this.projectAsset.uuid);
	}

	async createEntityFromJsonData(jsonData) {
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
				const ComponentConstructor = defaultComponentTypeManager.getComponentConstructorForUuid(componentUuid);
				const componentPropertyValues = await this.getComponentPropertyValuesFromJson(component.propertyValues, ComponentConstructor.guiStructure);
				ent.addComponent(ComponentConstructor, componentPropertyValues, {
					editorOpts: {
						editorAssetTypeManager: editor.projectAssetTypeManager,
						usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
						assetManager: editor.projectManager.assetManager,
					},
				});
			}
		}
		if (jsonData.children) {
			for (const childJson of jsonData.children) {
				const child = await this.createEntityFromJsonData(childJson);
				ent.add(child);
			}
		}
		return ent;
	}

	/**
	 * @param {*} jsonData
	 * @param {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} componentProperties
	 */
	async getComponentPropertyValuesFromJson(jsonData, componentProperties) {
		const newPropertyValues = {};
		if (componentProperties) {
			for (const [name, propertyData] of Object.entries(componentProperties)) {
				await this.fillComponentPropertyValueFromJson(newPropertyValues, jsonData, name, propertyData.type, propertyData.guiOpts);
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
	 */
	async fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyType, propertyGuiOpts) {
		const propertyValue = originalParentObject[propertyKey];
		let newPropertyValue = propertyValue;
		if (propertyValue == null) {
			newPropertyValue = null;
		} else if (propertyType == "array") {
			const newArr = [];
			const arrayGuiOpts = /** @type {import("../../UI/ArrayGui.js").ArrayGuiOptions} */ (propertyGuiOpts);
			for (const i of propertyValue.keys()) {
				await this.fillComponentPropertyValueFromJson(newArr, propertyValue, i, arrayGuiOpts.arrayType, arrayGuiOpts.arrayGuiOpts);
			}
			newPropertyValue = newArr;
		// todo: support for other types
		// } else if (propertyType == "vec2") {
		// 	newPropertyValue = new Vec2(...propertyValue);
		} else if (propertyType == "vec3") {
			newPropertyValue = new Vec3(...propertyValue);
		// } else if (propertyType == "vec4") {
		// 	newPropertyValue = new Vec4(...propertyValue);
		// } else if (propertyType == "mat4") {
		// 	newPropertyValue = new Mat4(propertyValue);
		} else if (propertyType == "droppable") {
			newPropertyValue = await editor.projectManager.assetManager.getLiveAsset(propertyValue);
			let usedAssetUuids = newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol];
			if (!usedAssetUuids) {
				usedAssetUuids = {};
				newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol] = usedAssetUuids;
			}
			usedAssetUuids[propertyKey] = propertyValue;
		}
		newParentObject[propertyKey] = newPropertyValue;
	}

	async createBundledAssetData() {
		const assetData = await this.projectAsset.readAssetData();
		this.generateComponentArrayBuffers(assetData);
		return BinaryComposer.objectToBinary(assetData, AssetLoaderTypeEntity.entityBinaryFormat);
	}

	generateComponentArrayBuffers(entityData) {
		if (entityData.components) {
			for (const component of entityData.components) {
				const componentConstructor = defaultComponentTypeManager.getComponentConstructorForUuid(component.uuid);
				component.propertyValues = BinaryComposer.objectToBinary(component.propertyValues, {
					...componentConstructor.binaryComposerOpts,
					editorAssetManager: editor.projectManager.assetManager,
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
				const componentConstructor = defaultComponentTypeManager.getComponentConstructorForUuid(component.uuid);
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
