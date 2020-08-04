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
			console.warn("Tried to register properties asset content type ("+constructor.name+") that does not extend PropertiesAssetContent class.");
			return;
		}
		if(constructor.useForType == null){
			console.warn("Tried to register properties asset content type ("+constructor.name+") with no useForType value, override the static useForType value in order for this content type to function properly");
			return;
		}

		this.registeredContentTypes.set(constructor.useForType, constructor);

		for(const w of editor.windowManager.getContentWindowsByType(ContentWindowProperties)){
			if(w.activeContent && w.activeContent instanceof PropertiesWindowAssetContent){
				w.onAssetContentTypeRegistered(constructor);
			}
		}
	}

	async getConstructorForProjectAssets(projectAssets){
		for(const projectAsset of projectAssets){
			return await projectAsset.getLiveAssetConstructor();
		}
		return null;
	}

	async getContentTypeForProjectAssets(projectAssets){
		const constructor = await this.getConstructorForProjectAssets(projectAssets);
		if(constructor){
			return this.registeredContentTypes.get(constructor);
		}
		return null;
	}
}
