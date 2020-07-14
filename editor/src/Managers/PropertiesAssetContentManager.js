import autoRegisterContentTypes from "../PropertiesAssetContent/AutoRegisterContentTypes.js";
import PropertiesAssetContent from "../PropertiesAssetContent/PropertiesAssetContent.js";
import ContentWindowProperties from "../WindowManagement/ContentWindows/ContentWindowProperties.js";
import PropertiesWindowAssetContent from "../PropertiesWindowContent/PropertiesWindowAssetContent.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentManager{
	constructor(){
		this.registeredContentTypes = new Map();
	}

	init(){
		for(const t of autoRegisterContentTypes){
			this.registerContentType(t);
		}
	}

	registerContentType(constructor){
		if(!(constructor.prototype instanceof PropertiesAssetContent)){
			console.warn("Tried to register properties asset type ("+constructor.name+") that does not extend PropertiesAssetContent class.");
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

		for(const w of editor.windowManager.getContentWindowsByType(ContentWindowProperties)){
			if(w.activeContent && w.activeContent instanceof PropertiesWindowAssetContent){
				w.onAssetContentTypeRegistered(constructor);
			}
		}
	}

	getContentTypeForObjects(selectedObjects){
		console.log("selectedObjects:",selectedObjects);
	}
}
