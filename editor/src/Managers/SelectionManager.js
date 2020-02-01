import editor from "../editorInstance.js";
import ContentWindowProperties from "../WindowManagement/ContentWindows/ContentWindowProperties.js";

export default class SelectionManager{
	constructor(){
		this.currentSelectedObjects = [];
	}

	destructor(){
		this.currentSelectedObjects = null;
	}

	changeSelection(changes){
		if(changes.reset) this.currentSelectedObjects = [];
		this.currentSelectedObjects.push(...changes.added);
		for(const removed of changes.removed){
			for(let i=this.currentSelectedObjects.length -1; i>=0; i--){
				let obj = this.currentSelectedObjects[i];
				if(obj == removed) this.currentSelectedObjects.splice(i, 1);
			}
		}

		this.updatePropertyWindows();
	}

	updatePropertyWindows(){
		for(const propertyWindow of editor.windowManager.getContentWindowsByType(ContentWindowProperties)){
			propertyWindow.onSelectionChanged(this);
		}
	}
}
