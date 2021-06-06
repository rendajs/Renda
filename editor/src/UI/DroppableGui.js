import editor from "../editorInstance.js";
import {parseMimeType} from "../Util/Util.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class DroppableGui{
	constructor({
		supportedAssetTypes = [],
		//todo: default value support
		disabled = false,
	} = {}){
		this.disabled = disabled;

		this.el = document.createElement("div");
		this.el.classList.add("droppableGui", "empty");
		this.onValueChangeCbs = [];

		this.supportedAssetTypes = supportedAssetTypes;

		this.currenDragFeedbackEl = null;

		this.boundOnDragStart = this.onDragStart.bind(this);
		this.boundOnDragEnter = this.onDragEnter.bind(this);
		this.boundOnDragOver = this.onDragOver.bind(this);
		this.boundOnDragEnd = this.onDragEnd.bind(this);
		this.boundOnDragLeave = this.onDragLeave.bind(this);
		this.boundOnDrop = this.onDrop.bind(this);
		this.boundOnKeyDown = this.onKeyDown.bind(this);
		this.boundOnContextMenu = this.onContextMenu.bind(this);

		this.el.addEventListener("dragstart", this.boundOnDragStart);
		this.el.addEventListener("dragenter", this.boundOnDragEnter);
		this.el.addEventListener("dragover", this.boundOnDragOver);
		this.el.addEventListener("dragend", this.boundOnDragEnd);
		this.el.addEventListener("dragleave", this.boundOnDragLeave);
		this.el.addEventListener("drop", this.boundOnDrop);
		this.el.addEventListener("keydown", this.boundOnKeyDown);
		this.el.addEventListener("contextmenu", this.boundOnContextMenu);

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
		this.el.removeEventListener("contextmenu", this.boundOnContextMenu);
		this.boundOnDragStart = null;
		this.boundOnDragEnter = null;
		this.boundOnDragOver = null;
		this.boundOnDragEnd = null;
		this.boundOnDragLeave = null;
		this.boundOnDrop = null;
		this.boundOnKeyDown = null;
		this.boundOnContextMenu = null;
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setValue(value){
		let projectAsset = null;
		if(value){
			if(typeof value == "string"){
				this.setDefaultAssetLinkUuid(value);
				projectAsset = editor.projectManager.assetManager.getProjectAssetImmediate(value);
			}else if(value instanceof ProjectAsset){
				projectAsset = value;
			}else{
				projectAsset = editor.projectManager.assetManager.getProjectAssetForLiveAsset(value);
			}
		}
		this.setValueFromProjectAsset(projectAsset, false);
	}

	set value(value){
		this.setValue(value);
	}

	getValue({
		resolveDefaultAssetLinks = false,
		returnLiveAsset = false,
		purpose = "default",
	} = {}){
		if(purpose == "script"){
			returnLiveAsset = true;
		}
		if(returnLiveAsset){
			return this.projectAssetValue?.getLiveAssetImmediate() || null;
		}else{
			if(!resolveDefaultAssetLinks && this.defaultAssetLinkUuid){
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
			// todo
			// if(this.storageType == "liveAsset"){
			// 	//get the live asset so that it is loaded before this.value is accessed from the onValueChange callbacks
			// 	await projectAsset?.getLiveAsset();
			// }
			this.setDefaultAssetLinkUuid(uuid);
			this.setValueFromProjectAsset(projectAsset, false);
		}
	}

	setDefaultAssetLinkUuid(uuid){
		this.defaultAssetLink = editor.projectManager.assetManager.getDefaultAssetLink(uuid);
		if(this.defaultAssetLink){
			this.defaultAssetLinkUuid = uuid;
		}else{
			this.defaultAssetLinkUuid = null;
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

	onContextMenu(e){
		e.preventDefault();
		if(!this.projectAssetValue) return;
		const contextMenuStructure = [
			{
				text: "Unlink",
				cb: () => {
					this.setValue(null);
				},
			},
		];
		const copyAssetUuidText = "Copy asset UUID";
		if(this.defaultAssetLinkUuid){
			contextMenuStructure.push({
				text: copyAssetUuidText,
				cb: async () => {
					if(this.projectAssetValue){
						await navigator.clipboard.writeText(this.defaultAssetLinkUuid);
					}
				},
			});
		}
		const resolvedText = this.defaultAssetLinkUuid ? "Copy resolved asset link UUID" : copyAssetUuidText;
		contextMenuStructure.push({
			text: resolvedText,
			cb: async () => {
				if(this.projectAssetValue){
					await navigator.clipboard.writeText(this.projectAssetValue.uuid);
				}
			},
		});
		const menu = editor.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos(e.pageX, e.pageY);
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
