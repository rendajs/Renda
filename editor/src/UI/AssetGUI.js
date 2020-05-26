export default class AssetGUI{
	constructor({
		supportedAssetTypes = [],
	} = {}){
		this.el = document.createElement("input");
		this.el.classList.add("assetGUI", "buttonLike", "resetInput", "textInput");
		this.onValueChangeCbs = [];
	}

	destructor(){
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
}
