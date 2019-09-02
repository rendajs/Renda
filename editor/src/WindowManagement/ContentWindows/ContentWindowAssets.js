import ContentWindow from "./ContentWindow.js";

export default class ContentWindowAssets extends ContentWindow{
	constructor(editor){
		super(editor);
	}

	static get windowName(){
		return "Assets";
	}
}
