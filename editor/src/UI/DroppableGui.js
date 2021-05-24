import editor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class DroppableGui{
	constructor({
		supportedAssetTypes = [],
		value = null,

		//this controls what type of value is expected in setValue() and
		//returned from this.value. Possible values are:
		//"liveAsset", "projectAsset" or "uuid"
		//if null, it guesses the best option based on the supportedAssetTypes:
		//"liveAsset" for assets that support this
		//"projectAsset" for all others
		storageType = null,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		this.el.setAttribute("tabindex", "0");
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = supportedAssetTypes;
		this.storageType = storageType;
		if(this.storageType == null){
			const containsLiveAssetType = this.supportedAssetTypes.some(type => editor.projectAssetTypeManager.constructorHasAssetType(type));
			if(containsLiveAssetType){
				this.storageType = "liveAsset";
			}else{
				this.storageType = "projectAsset";
			}
		}

		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);

		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragEnd);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);

		this.projectAssetValue = null;
		this.setValue(value);
	}

	destructor(){
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragEnd);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.el.removeEventListener("keydown", this.boundOnKeyDown);
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDrop = null;
		this.boundOnKeyDown = null;
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setValue(value){
		let projectAsset = null;
		if(value){
			if(this.storageType == "liveAsset"){
				projectAsset = editor.projectManager.assetManager.getProjectAssetForLiveAsset(value);
			}else if(this.storageType == "projectAsset"){
				projectAsset = value;
			}else if(this.storageType == "uuid"){
				projectAsset = editor.projectManager.assetManager.getProjectAssetImmediate(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset);
	}

	get value(){
		if(this.storageType == "liveAsset"){
			return this.projectAssetValue?.getLiveAssetImmediate() || null;
		}else if(this.storageType == "projectAsset"){
			return this.projectAssetValue;
		}else if(this.storageType == "uuid"){
			return this.projectAssetValue?.uuid;
		}
	}

	setValueFromProjectAsset(projectAsset){
		this.projectAssetValue = projectAsset;
		if(projectAsset){
			this.linkedAssetName = projectAsset.name;
		}else{
			this.linkedAssetName = null;
		}

		this.fireValueChange();
		this.updateContent();
	}

	async setValueFromAssetUuid(uuid){
		if(!uuid){
			this.setValueFromProjectAsset(null);
			this.value = null;
			this.linkedAssetName = null;
		}else{
			const projectAsset = await editor.projectManager.assetManager.getProjectAsset(uuid);
			await editor.projectManager.assetManager.makeAssetUuidConsistent(projectAsset);
			if(this.storageType == "liveAsset"){
				//get the live asset so that it is loaded before this.value is called
				await projectAsset?.getLiveAsset();
			}
			this.setValueFromProjectAsset(projectAsset);
		}
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value);
		}
	}

	onDragEnter(e){
		const valid = this.handleDrag(e);
		if(valid){
			this.setDragHoverValidStyle(true);
		}
	}

	onDragOver(e){
		this.handleDrag(e);
	}

	onDragEnd(e){
		this.setDragHoverValidStyle(false);
	}

	handleDrag(e){
		if(e.dataTransfer.types.some(mimeType => this.validateMimeType(mimeType))){
			e.dataTransfer.dropEffect = "copy";
			e.preventDefault();
			return true;
		}
	}

	onDrop(e){
		e.preventDefault();
		this.setDragHoverValidStyle(false);
		for(const mimeType of e.dataTransfer.types){
			if(this.validateMimeType(mimeType)){
				const assetUuid = e.dataTransfer.getData(mimeType);
				this.setValueFromAssetUuid(assetUuid);
				break;
			}
		}
	}

	validateMimeType(mimeType){
		const parsed = parseMimeType(mimeType);
		if(!parsed) return false;
		const {type, subType, params} = parsed;
		if(type != "text" || subType != "jj") return false;
		if(this.supportedAssetTypes.length <= 0) return true;
		if(params.dragtype == "projectasset"){
			if(this.supportedAssetTypes.includes(ProjectAsset)) return true;
			const assetType = editor.projectAssetTypeManager.getAssetTypeByUuid(params.assettype);
			if(assetType && assetType.expectedLiveAssetConstructor){
				return this.supportedAssetTypes.includes(assetType.expectedLiveAssetConstructor);
			}
		}
		return false;
	}

	setDragHoverValidStyle(valid){
		this.el.classList.toggle("dragHovering", valid);
	}

	onKeyDown(e){
		if(e.code == "Backspace" || e.code == "Delete"){
			this.setValue(null);
		}
	}

	updateContent(){
		this.el.classList.toggle("empty", !this.projectAssetValue);
		this.el.classList.toggle("filled", this.projectAssetValue);
		this.el.textContent = this.linkedAssetName || "";
	}
}
