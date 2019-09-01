import Component from "./Component.js";
import RealTimeRenderer from "../rendering/renderers/RealTimeRenderer.js";
import Mat4 from "../math/Mat4.js";

export default class CameraComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			autoManageRootRenderObjects: true,
		}, ...opts}
		this.autoManageRootRenderObjects = opts.autoManageRootRenderObjects;

		this.fov = 70;
		this.clipNear = 0.01;
		this.clipFar = 1000;
		this.projectionMatrix = null;
		this.updateProjectionMatrix();

		this.rootRenderObjects = [];
		this.renderer = null;
	}

	onAttachedToObject(){
		this.setRootRenderObjects();
	}

	onParentChanged(){
		this.setRootRenderObjects();
	}

	setRootRenderObjects(){
		if(this.autoManageRootRenderObjects){
			if(this.gameObject){
				this.rootRenderObjects = [this.gameObject.getRoot()];
			}else{
				this.rootRenderObjects = [];
			}
		}
	}

	render(){
		this.renderer.render(this);
	}

	updateProjectionMatrix(){
		this.projectionMatrix = Mat4.createProjection(this.fov, 100, 100, this.clipNear, this.clipFar);
	}

	getVpMatrix(){
		return Mat4.multiplyMatrices(this.gameObject.worldMatrix.inverse(), this.projectionMatrix);
	}
}
