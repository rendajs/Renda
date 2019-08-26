import ContentWindow from "./ContentWindow.js";

export default class ContentWindowObjectEditor extends ContentWindow{
	constructor(){
		super();
	}

	static get windowName(){
		return "ObjectEditor";
	}
}
