import {parseMimeType} from "../Util/Util.js";

export default class AssetGUI{
	constructor({
		supportedAssetTypes = [],
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("assetGUI", "empty");
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

	setValue(vector){
		let arr = vector.toArray();
		for(let [i, gui] of this.numericGuis.entries()){
			gui.setValue(arr[i]);
		}
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb();
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
				const dataStr = e.dataTransfer.getData(mimeType);
				const dataJson = JSON.parse(dataStr);
				console.log(dataJson);
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
}
