import ediitor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";

export default class AssetGui{
	constructor({
		supportedAssetTypes = [],
		value = null,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("assetGui", "empty");
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = supportedAssetTypes;

		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);

		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragEnd);
		this.el.addEventListener("drop", this.boundOnDrop);

		this.linkedLiveAsset = null;
		this.linkedAssetUuid = null;
	}

	destructor(){
		this.el.removeEventListener("dragenter", this.boundOnDragEnter);
		this.el.removeEventListener("dragover", this.boundOnDragOver);
		this.el.removeEventListener("dragend", this.boundOnDragEnd);
		this.el.removeEventListener("dragleave", this.boundOnDragEnd);
		this.el.removeEventListener("drop", this.boundOnDrop);
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDrop = null;
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	get value(){
		if(this.linkedLiveAsset){
			return this.linkedLiveAsset.asset;
		}
		return null;
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
				this.setAssetUuid(assetUuid);
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
		return this.supportedAssetTypes.includes(params.assettype);
	}

	setDragHoverValidStyle(valid){
		this.el.classList.toggle("dragHovering", valid);
	}

	async setAssetUuid(uuid){
		this.linkedAssetUuid = uuid;
		this.linkedLiveAsset = await editor.projectManager.assetManager.getLiveAsset(uuid);
		this.fireValueChange();
		this.updateContent();
	}

	updateContent(){
		this.el.classList.toggle("empty", !this.linkedLiveAsset);
		this.el.classList.toggle("filled", this.linkedLiveAsset);
		this.el.textContent = this.linkedLiveAsset.fileName;
	}
}
