import EditorWindow from "./EditorWindow.js";

export default class EditorWindowTabs extends EditorWindow{
	constructor(){
		super();

		this.el.classList.add("editorWindowTabs");

		this.tabs = [];
	}
}
