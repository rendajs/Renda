import ContentWindow from "./ContentWindow.js";
import {GameObject, CameraComponent} from "../../../../src/index.js";
import editor from "../../editorInstance.js";

export default class ContentWindowObjectEditor extends ContentWindow{
	constructor(){
		super();

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.el.appendChild(this.canvasEl);

		this.editorScene = new GameObject({name: "editorScene"});
		this.editorCamera = new GameObject({name: "editorCamera"});
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(CameraComponent);
	}

	static get windowName(){
		return "ObjectEditor";
	}

	render(){
		let renderer = editor.renderer;
		renderer.render(this.editorCamComponent);
		this.ctx.transferFromImageBitmap(renderer.getImageBitmap());
	}
}
