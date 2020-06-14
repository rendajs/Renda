import ContentWindow from "./ContentWindow.js";
import ContentWindowOutliner from "./ContentWindowOutliner.js";
import {Entity, Mesh, Vector3, Shader, Material, ComponentTypes} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import SelectionManager from "../../Managers/SelectionManager.js";
import OrbitControls from "../../Util/OrbitControls.js";

export default class ContentWindowEntityEditor extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.contentEl.appendChild(this.canvasEl);

		this.renderDirty = false;

		this.editorScene = new Entity({name: "editorScene"});
		this.editorCamera = new Entity({name: "editorCamera"});
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(ComponentTypes.camera);

		this.orbitControls = new OrbitControls(this.editorCamera, this.canvasEl);

		this._editingEntity = null;
		this.selectionManager = new SelectionManager();

		this.newEmptyEditingEntity();
	}

	static get windowName(){
		return "entityEditor";
	}

	destructor(){
		super.destructor();

		this.canvasEl = null;
		this.ctx = null;
		this.editorScene.destructor();
		this._editingEntity = null;
		this.selectionManager.destructor();
		this.selectionManager = null;
	}

	get editingEntity(){
		return this._editingEntity;
	}

	set editingEntity(val){
		this._editingEntity = val;
		this.editorScene.add(val);
		this.render();
		this.updateOutliners();
	}

	onWindowResize(w, h){
		this.canvasEl.width = w;
		this.canvasEl.height = h;

		this.editorCamComponent.aspect = w / h;
		this.renderDirty = true;
	}

	newEmptyEditingEntity(){
		this.editingEntity = new Entity();
	}

	createTempDebugObject(){
		this.editingEntity = new Entity({name: "object"});

		let cube = new Entity({name:"cube"});
		let cubeMesh = new Mesh();
		cubeMesh.setBuffer(Mesh.AttributeTypes.INDEX, [0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		cubeMesh.setBuffer(Mesh.AttributeTypes.POSITION, [
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
		]);
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
		cube.addComponent(ComponentTypes.mesh, {mesh: cubeMesh, materials: [cubeMat]});

		this.editingEntity.add(cube);

		let cam = new Entity({name:"cam"});
		this.editingEntity.add(cam);
		cam.addComponent(ComponentTypes.camera);
	}

	loop(){
		this.orbitControls.loop();
		this.renderDirty = true;

		if(this.renderDirty){
			this.render();
			this.renderDirty = false;
		}
	}

	async render(){
		let renderer = editor.renderer;
		renderer.render(this.editorCamComponent);
		this.ctx.transferFromImageBitmap(await renderer.getImageBitmap());
	}

	updateOutliners(){
		for(const outliner of editor.windowManager.getContentWindowsByType(ContentWindowOutliner)){
			outliner.setLinkedEntityEditor(this);
		}
	}
}
