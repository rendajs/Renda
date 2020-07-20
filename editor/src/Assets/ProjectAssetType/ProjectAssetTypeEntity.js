import ProjectAssetType from "./ProjectAssetType.js";
import {Entity, defaultComponentTypeManager, Mesh, Material} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import ContentWindowEntityEditor from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";

export default class ProjectAssetTypeEntity extends ProjectAssetType{

	static type = "entity";
	static newFileName = "New Entity";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		const entity = new Entity("New Entity");
		return entity.toJson();
	}

	async getLiveAsset(json){
		return await this.createEntityFromJsonData(json);
	}

	async open(){
		const entity = await this.projectAsset.getLiveAsset();
		for(const entityEditor of editor.windowManager.getContentWindowsByType(ContentWindowEntityEditor)){
			entityEditor.loadEntityAsset(entity, this.projectAsset.uuid);
		}
	}

	async createEntityFromJsonData(jsonData){
		let ent = new Entity({
			name: jsonData.name || "",
			matrix: jsonData.matrix,
		});
		if(jsonData.components){
			for(const component of jsonData.components){
				const componentType = component.type;
				const componentNamespace = component.namespace;
				const componentData = defaultComponentTypeManager.getComponentData(componentType, componentNamespace);
				const componentPropertyValues = await this.componentPropertyValuesFromJson(component.propertyValues, componentData);
				ent.addComponent(componentType, componentPropertyValues, {componentNamespace});
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
				newArr.push(await this.componentPropertyValueFromJson(item, propertyData.arrayTypeOpts));
			}
			return newArr;
		}
		//todo: make the list of types more scalable
		if(propertyData.type == Mesh || propertyData.type == Material){
			return await editor.projectManager.assetManager.getLiveAsset(propertyValue);
		}
		return propertyValue;
	}
}
