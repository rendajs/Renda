import Component from "./Component.js";
import RealTimeRenderer from "../Rendering/Renderers/RealTimeRenderer.js";
import Mat4 from "../Math/Mat4.js";

export default class CameraComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			autoManageRootRenderEntities: true,
		}, ...opts}
		this.autoManageRootRenderEntities = opts.autoManageRootRenderEntities;

		this.autoUpdateProjectionMatrix = true;
		this.fov = 70;
		this.clipNear = 0.01;
		this.clipFar = 1000;
		this.aspect = 1;
		this.projectionMatrix = null;
		this.updateProjectionMatrix();

		this.rootRenderEntities = [];
		this.renderer = null;

		this.setComponentProperties({
			fov: {
				min:0, max:180,
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
			clipNear: {
				min: 0,
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
			clipFar: {
				min: 0,
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
			aspect: {
				min: 0,
				onChange: _ => {this.updateProjectionMatrixAuto()},
			},
		});
	}

	static get componentName(){
		return "camera";
	}

	//todo: destructor

	onAttachedToEntity(){
		this.setRootRenderEntities();
	}

	onParentChanged(){
		this.setRootRenderEntities();
	}

	setRootRenderEntities(){
		if(this.autoManageRootRenderEntities){
			if(this.entity){
				this.rootRenderEntities = [this.entity.getRoot()];
			}else{
				this.rootRenderEntities = [];
			}
		}
	}

	render(){
		this.renderer.render(this);
	}

	updateProjectionMatrixAuto(){
		if(this.autoUpdateProjectionMatrix) this.updateProjectionMatrix();
	}

	updateProjectionMatrix(){
		this.projectionMatrix = Mat4.createDynamicAspectProjection(this.fov, this.clipNear, this.clipFar, this.aspect);
	}

	getVpMatrix(){
		return Mat4.multiplyMatrices(this.entity.worldMatrix.inverse(), this.projectionMatrix);
	}
}
