import autoRegisterContentWindows from "../PropertiesWindowContent/AutoRegisterContentWindows.js";
import PropertiesWindowContent from "../PropertiesWindowContent/PropertiesWindowContent.js";
import ContentWindowProperties from "../WindowManagement/ContentWindows/ContentWindowProperties.js";
import PropertiesWindowEmptyContent from "../PropertiesWindowContent/PropertiesWindowEmptyContent.js";
import PropertiesWindowMultipleContent from "../PropertiesWindowContent/PropertiesWindowMultipleContent.js";
import editor from "../editorInstance.js";

export default class PropertiesWindowContentManager{
	constructor(){
		this.registeredContentTypes = new Map();
	}

	init(){
		for(const t of autoRegisterContentWindows){
			this.registerContentType(t);
		}
	}

	registerContentType(constructor){
		if(!(constructor.prototype instanceof PropertiesWindowContent)){
			console.warn("Tried to register properties content type ("+constructor.name+") that does not extend PropertiesWindowContent class.");
			return;
		}
		if(!constructor.useForTypes){
			console.warn("Tried to register properties content type ("+constructor.name+") with no useForTypes value, override the static useForTypes value in order for this content type to function properly");
			return;
		}
		let useForTypes = constructor.useForTypes;
		if(!(useForTypes instanceof Array)){
			console.warn(constructor.name+" didn't register because its useForTypes value is not an array");
			return;
		}
		if(useForTypes.length == 0){
			console.warn(constructor.name+" didn't register because its useForTypes array is empty");
			return;
		}

		for(const t of useForTypes){
			this.registeredContentTypes.set(t, constructor);
		}

		for(const w of editor.windowManager.getContentWindowsByConstructor(ContentWindowProperties)){
			w.onContentTypeRegistered(constructor);
		}
	}

	getContentTypeForObjects(objects){
		let selectedTypes = new Map();
		for(const obj of objects){
			if(!obj) continue;
			let t = this.registeredContentTypes.get(obj.constructor);
			if(!t) continue;
			let count = 0;
			if(selectedTypes.has(t)){
				count = selectedTypes.get(t);
			}
			count++;
			selectedTypes.set(t, count);
		}
		if(selectedTypes.size == 0){
			return PropertiesWindowEmptyContent;
		}else if(selectedTypes.size == 1){
			let [[onlyType, count]] = selectedTypes; //get the first and only item from selectedTypes
			return onlyType;
		}else{
			return PropertiesWindowMultipleContent;
		}
	}
}
