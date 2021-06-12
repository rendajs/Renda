import ProjectAssetType from "./ProjectAssetType.js";
import {Entity, defaultComponentTypeManager, Mesh, Material, Vec2, Vec3, Vec4, Mat4, AssetLoaderTypeEntity} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import ContentWindowEntityEditor from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class ProjectAssetTypeEntity extends ProjectAssetType{

	static type = "JJ:entity";
	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";
	static newFileName = "New Entity";

	static usedAssetUuidsSymbol = Symbol("used asset uuids");

	constructor(){
		super(...arguments);
	}

	static expectedLiveAssetConstructor = Entity;

	async getLiveAssetData(json){
		const liveAsset = await this.createEntityFromJsonData(json);
		return {liveAsset};
	}

	async saveLiveAssetData(liveAsset, editorData){
		return liveAsset.toJson({
			assetManager: editor.projectManager.assetManager,
			assetTypeManager: editor.projectAssetTypeManager,
			usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
		});
	}

	async open(){
		const entity = await this.projectAsset.getLiveAsset();
		for(const entityEditor of editor.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)){
			entityEditor.loadEntityAsset(entity, this.projectAsset.uuid);
		}
	}

	async createEntityFromJsonData(jsonData){
		if(!jsonData){
			return new Entity();
		}
		let ent = new Entity({
			name: jsonData.name || "",
			matrix: jsonData.matrix,
		});
		if(jsonData.components){
			for(const component of jsonData.components){
				const componentUuid = component.uuid;
				const componentData = defaultComponentTypeManager.getComponentDataForUuid(componentUuid);
				const componentPropertyValues = await this.getComponentPropertyValuesFromJson(component.propertyValues, componentData);
				ent.addComponent(componentData, componentPropertyValues);
			}
		}
		if(jsonData.children){
			for(const childJson of jsonData.children){
				let child = await this.createEntityFromJsonData(childJson);
				ent.add(child);
			}
		}
		return ent;
	}

	async getComponentPropertyValuesFromJson(jsonData, componentData){
		const componentProperties = componentData?.properties;
		const newPropertyValues = {}
		if(componentProperties){
			for(const [name, propertyData] of Object.entries(componentProperties)){
				await this.fillComponentPropertyValueFromJson(newPropertyValues, jsonData, name, propertyData);
			}
		}
		return newPropertyValues;
	}

	async fillComponentPropertyValueFromJson(newParentObject, originalParentObject, propertyKey, propertyData){
		const propertyValue = originalParentObject[propertyKey];
		let newPropertyValue = propertyValue;
		if(propertyValue == null){
			newPropertyValue = null;
		}else if(propertyData.type == Array){
			const newArr = [];
			for(const i of propertyValue.keys()){
				await this.fillComponentPropertyValueFromJson(newArr, propertyValue, i, propertyData.arrayOpts);
			}
			newPropertyValue = newArr;
		}else if(propertyData.type == Vec2){
			newPropertyValue = new Vec2(...propertyValue);
		}else if(propertyData.type == Vec3){
			newPropertyValue = new Vec3(...propertyValue);
		}else if(propertyData.type == Vec4){
			newPropertyValue = new Vec4(...propertyValue);
		}else if(propertyData.type == Mat4){
			newPropertyValue = new Mat4(propertyValue);
		}else if(editor.projectAssetTypeManager.constructorHasAssetType(propertyData.type)){
			newPropertyValue = await editor.projectManager.assetManager.getLiveAsset(propertyValue);
			let usedAssetUuids = newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol];
			if(!usedAssetUuids){
				usedAssetUuids = newParentObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol] = {};
			}
			usedAssetUuids[propertyKey] = propertyValue;
		}
		newParentObject[propertyKey] = newPropertyValue;
	}

	async createBundledAssetData(){
		const assetData = await this.projectAsset.readAssetData();
		this.generateComponentArrayBuffers(assetData);
		return BinaryComposer.objectToBinary(assetData, AssetLoaderTypeEntity.entityBinaryFormat);
	}

	generateComponentArrayBuffers(entityData){
		if(entityData.components){
			for(const component of entityData.components){
				const componentData = defaultComponentTypeManager.getComponentDataForUuid(component.uuid);
				component.propertyValues = BinaryComposer.objectToBinary(component.propertyValues, componentData.binaryComposerOpts);
			}
		}
		if(entityData.children){
			for(const child of entityData.children){
				this.generateComponentArrayBuffers(child);
			}
		}
	}

	async *getReferencedAssetUuids(){
		const assetData = await this.projectAsset.readAssetData();
		for(const uuid of this.getReferencedAssetUuidsForEntityData(assetData)){
			yield uuid;
		}
	}

	*getReferencedAssetUuidsForEntityData(entityData){
		if(entityData.components){
			for(const component of entityData.components){
				const componentData = defaultComponentTypeManager.getComponentDataForUuid(component.uuid);
				const referencedUuids = [];
				BinaryComposer.objectToBinary(component.propertyValues, {
					...componentData.binaryComposerOpts,
					transformValueHook: args => {
						let {value, type} = args;
						if(componentData.binaryComposerOpts.transformValueHook){
							value = transformValueHook(args);
						}

						if(type == BinaryComposer.StructureTypes.ASSET_UUID){
							referencedUuids.push(value);
						}
						return value;
					},
				});
				for(const uuid of referencedUuids){
					yield uuid;
				}
			}
		}
		if(entityData.children){
			for(const child of entityData.children){
				for(const uuid of this.getReferencedAssetUuidsForEntityData(child)){
					yield uuid;
				}
			}
		}
	}
}
