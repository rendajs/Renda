import ContentWindow from "./ContentWindow.js";
import {GameObject, CameraComponent, Mesh, Vector3, Shader, Material, MeshComponent} from "../../../../src/index.js";
import editor from "../../editorInstance.js";

export default class ContentWindowObjectEditor extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.contentEl.appendChild(this.canvasEl);

		this.editorScene = new GameObject({name: "editorScene"});
		this.editorCamera = new GameObject({name: "editorCamera"});
		this.editorCamera.worldMatrix.translate(0,0,-5);
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(CameraComponent);

		this.editingObject = null;
	}

	static get windowName(){
		return "ObjectEditor";
	}

	onWindowResize(w, h){
		this.canvasEl.width = w;
		this.canvasEl.height = h;
	}

	newEmptyEditingObject(){
		this.editingObject = new GameObject({name: "object"});
		this.editorScene.add(this.editingObject);

		let cube = new GameObject({name:"cube"});
		let cubeMesh = new Mesh();
		cubeMesh.positions = [
			new Vector3(-1,-1,-1),
			new Vector3(-1,-1, 1),
			new Vector3(-1, 1,-1),
			new Vector3(-1, 1, 1),

			new Vector3( 1,-1,-1),
			new Vector3( 1,-1, 1),
			new Vector3( 1, 1,-1),
			new Vector3( 1, 1, 1),

			new Vector3(-1,-1,-1),
			new Vector3(-1,-1, 1),
			new Vector3( 1,-1,-1),
			new Vector3( 1,-1, 1),

			new Vector3(-1, 1,-1),
			new Vector3(-1, 1, 1),
			new Vector3( 1, 1,-1),
			new Vector3( 1, 1, 1),

			new Vector3(-1,-1,-1),
			new Vector3(-1, 1,-1),
			new Vector3( 1,-1,-1),
			new Vector3( 1, 1,-1),

			new Vector3(-1,-1, 1),
			new Vector3(-1, 1, 1),
			new Vector3( 1,-1, 1),
			new Vector3( 1, 1, 1),
		];
		cubeMesh.indices = [0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23];
		let cubeShader = new Shader(`
			attribute vec4 aVertexPosition;

			uniform mat4 uMvpMatrix;

			varying lowp vec4 vColor;

			void main() {
			  gl_Position = uMvpMatrix * aVertexPosition;
			  vColor = aVertexPosition;
			}
		`,`
			varying lowp vec4 vColor;

			void main() {
				gl_FragColor = vec4(abs(vColor).rgb, 1.0);
			}
		`);
		let cubeMat = new Material(cubeShader);
		cube.addComponent(new MeshComponent({mesh: cubeMesh, material: cubeMat}));

		this.editingObject.add(cube);

		this.render();
	}

	async render(){
		let renderer = editor.renderer;
		renderer.render(this.editorCamComponent);
		this.ctx.transferFromImageBitmap(await renderer.getImageBitmap());
	}
}
