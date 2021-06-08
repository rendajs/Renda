import ProjectAssetType from "./ProjectAssetType.js";
import {Entity, defaultComponentTypeManager, Mesh, Material, Vec2, Vec3, Vec4, Mat4, AssetLoaderTypeEntity} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import ContentWindowEntityEditor from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class ProjectAssetTypeEntity extends ProjectAssetType{

	static type = "JJ:entity";
	static typeUuid = "0654611f-c908-4ec0-8bbf-c109a33c0914";
	static newFileName = "New Entity";

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
				const componentPropertyValues = await this.componentPropertyValuesFromJson(component.propertyValues, componentData);
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

	async componentPropertyValuesFromJson(jsonData, componentData){
		const componentProperties = componentData?.properties;
		const newPropertyValues = {}
		if(componentProperties){
			for(const [name, propertyData] of Object.entries(componentProperties)){
				newPropertyValues[name] = await this.componentPropertyValueFromJson(jsonData[name], propertyData);
			}
		}
		return newPropertyValues;
	}

	async componentPropertyValueFromJson(propertyValue, propertyData){
		if(propertyValue == null) return null;
		if(propertyData.type == Array){
			const newArr = [];
			for(const item of propertyValue){
				newArr.push(await this.componentPropertyValueFromJson(item, propertyData.arrayOpts));
			}
			return newArr;
		}
		if(propertyData.type == Vec2){
			return new Vec2(...propertyValue);
		}else if(propertyData.type == Vec3){
			return new Vec3(...propertyValue);
		}else if(propertyData.type == Vec4){
			return new Vec4(...propertyValue);
		}else if(propertyData.type == Mat4){
			return new Mat4(propertyValue);
		}
		if(editor.projectAssetTypeManager.constructorHasAssetType(propertyData.type)){
			return await editor.projectManager.assetManager.getLiveAsset(propertyValue);
		}
		return propertyValue;
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
