import editor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class DroppableGui{
	constructor({
		supportedAssetTypes = [],
		//todo: default value support
		disabled = false,

		//this controls what type of value is expected in setValue() and
		//returned from this.value. Possible values are:
		//"liveAsset", "projectAsset" or "uuid"
		//if null, it guesses the best option based on the supportedAssetTypes:
		//"liveAsset" for assets that support this
		//"projectAsset" for all others
		storageType = null,
	} = {}){
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
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

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);

		this.defaultAssetLinkUuid = null;
		this.defaultAssetLink = null;
		this.projectAssetValue = null;
		this.setValue(null);
		this.setDisabled(disabled);
	}

	destructor(){
		this.el.removeEventListener("dragstart", this.boundOnDragStart);
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragLeave);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.el.removeEventListener("keydown", this.boundOnKeyDown);
		this.boundOnDragStart = null;
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDragLeave = null;
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
				this.defaultAssetLinkUuid = value;
				this.defaultAssetLink = editor.projectManager.assetManager.getDefaultAssetLink(value);
				projectAsset = editor.projectManager.assetManager.getProjectAssetImmediate(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, false);
	}

	set value(value){
		this.setValue(value);
	}

	getValue({
		resolveDefaultAssetUuids = true,
	} = {}){
		if(this.storageType == "liveAsset"){
			return this.projectAssetValue?.getLiveAssetImmediate() || null;
		}else if(this.storageType == "projectAsset"){
			return this.projectAssetValue;
		}else if(this.storageType == "uuid"){
			if(!resolveDefaultAssetUuids && this.defaultAssetLinkUuid){
				return this.defaultAssetLinkUuid;
			}else{
				return this.projectAssetValue?.uuid;
			}
		}
	}

	get value(){
		return this.getValue();
	}

	setValueFromProjectAsset(projectAsset, clearDefaultAssetLink = true){
		if(clearDefaultAssetLink){
			this.defaultAssetLinkUuid = null;
			this.defaultAssetLink = null;
		}
		this.projectAssetValue = projectAsset;

		this.fireValueChange();
		this.updateContent();
	}

	async setValueFromAssetUuid(uuid){
		if(!uuid){
			this.setValueFromProjectAsset(null);
			this.value = null;
		}else{
			const projectAsset = await editor.projectManager.assetManager.getProjectAsset(uuid);
			await editor.projectManager.assetManager.makeAssetUuidConsistent(projectAsset);
			if(this.storageType == "liveAsset"){
				//get the live asset so that it is loaded before this.value is accessed from the onValueChange callbacks
				await projectAsset?.getLiveAsset();
			}
			this.defaultAssetLinkUuid = uuid;
			this.defaultAssetLink = editor.projectManager.assetManager.getDefaultAssetLink(uuid);
			this.setValueFromProjectAsset(projectAsset, false);
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

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.ariaDisabled = disabled;
		if(disabled){
			this.el.removeAttribute("tabIndex");
		}else{
			this.el.setAttribute("tabindex", "0");
		}
	}

	onDragStart(e){
		let {el, x, y} = editor.dragManager.createDragFeedbackText({
			text: this.visibleAssetName,
		});
		this.currenDragFeedbackEl = el;
		e.dataTransfer.setDragImage(el, x, y);

		event.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(this.projectAssetValue.assetType);
		if(assetType){
			assetTypeUuid = assetType.typeUuid;
		}
		const uuid = this.defaultAssetLinkUuid || this.projectAssetValue.uuid;
		event.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, uuid);

	}

	onDragEnter(e){
		const valid = this.handleDrag(e) && !this.disabled;
		if(valid){
			this.setDragHoverValidStyle(true);
		}
	}

	onDragOver(e){
		this.handleDrag(e);
	}

	onDragEnd(e){
		if(this.currenDragFeedbackEl) editor.dragManager.removeFeedbackEl(this.currenDragFeedbackEl);
		this.currenDragFeedbackEl = null;
	}

	onDragLeave(){
		this.setDragHoverValidStyle(false);
	}

	handleDrag(e){
		if(this.disabled) return false;
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
		if(this.disabled) return;
		if(e.code == "Backspace" || e.code == "Delete"){
			this.setValue(null);
		}
	}

	get visibleAssetName(){
		return this.defaultAssetLink?.name || this.projectAssetValue?.name || "";
	}

	updateContent(){
		this.el.classList.toggle("empty", !this.projectAssetValue);
		this.el.classList.toggle("filled", this.projectAssetValue);
		this.el.textContent = this.visibleAssetName;
		this.el.draggable = this.projectAssetValue || this.defaultAssetLink;
	}
}
