import Entity from "../Core/Entity.js";
import Gizmo from "./Gizmos/Gizmo.js";
import VertexState from "../Rendering/VertexState.js";
import Mesh from "../Core/Mesh.js";
import ShaderSource from "../Rendering/ShaderSource.js";
import WebGpuPipelineConfig from "../Rendering/Renderers/WebGpuRenderer/WebGpuPipelineConfig.js";
import {materialMapWebGpuTypeUuid} from "../Rendering/Renderers/WebGpuRenderer/WebGpuRenderer.js";
import Material from "../Rendering/Material.js";

export default class GizmoManager{
	constructor(){
		this.entity = new Entity("gizmos");
		this.gizmos = new Set();

		this.billboardVertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{attributeType: Mesh.AttributeType.POSITION, componentCount: 2},
						{attributeType: Mesh.AttributeType.COLOR},
					],
				}
			],
		});
		this.meshVertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{attributeType: Mesh.AttributeType.POSITION},
						{attributeType: Mesh.AttributeType.COLOR},
					],
				}
			],
		});

		this.billboardMaterial = this.createMaterial(`
			var objPos : vec4<f32> = objectUniforms.m[3];
			outPos = objectUniforms.vp * objPos;
			const w : f32 = outPos.w;
			outPos = outPos / vec4<f32>(w,w,w,w);
			outPos.x = outPos.x + vertexPos.x / viewUniforms.screenSize.x;
			outPos.y = outPos.y + vertexPos.y / viewUniforms.screenSize.y;
			outPos = vec4<f32>(outPos.xy, 0.0, 1.0);
		`);
		this.meshMaterial = this.createMaterial(`
			outPos = objectUniforms.mvp * vec4<f32>(vertexPos, 1.0);
		`);
	}

	destructor(){
		for(const gizmo of this.gizmos){
			this.removeGizmo(gizmo);
		}
		this.entity.detachParent();
	}

	addGizmo(constructor){
		const gizmo = new constructor(this);
		this.gizmos.add(gizmo);
		this.entity.add(gizmo.entity);
		return gizmo;
	}

	removeGizmo(gizmo){
		gizmo.destructor();
		this.gizmos.delete(gizmo);
	}

	createMaterial(mainCode){
		const vertexShader = new ShaderSource(`
			[[block]] struct ViewUniforms {
				[[offset(0)]] screenSize : vec2<f32>;
			};
			[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;

			[[block]] struct ObjectUniforms {
				[[offset(0)]] mvp : mat4x4<f32>;
				[[offset(64)]] vp : mat4x4<f32>;
				[[offset(128)]] m : mat4x4<f32>;
			};
			[[group(2), binding(0)]] var<uniform> objectUniforms : ObjectUniforms;

			[[location(0)]] var<in> vertexPos : vec3<f32>;
			[[location(1)]] var<in> vertexColor : vec3<f32>;

			[[builtin(position)]] var<out> outPos : vec4<f32>;
			[[location(0)]] var<out> vertexColorOut : vec3<f32>;

			[[stage(vertex)]]
			fn main() -> void {
				${mainCode}
				vertexColorOut = vertexColor;
				return;
			}
		`);
		const fragmentShader = new ShaderSource(`
			[[location(0)]] var<in> vertexColor : vec3<f32>;

			[[location(0)]] var<out> outColor : vec4<f32>;

			const lightDir : vec3<f32> = vec3<f32>(0.0, 1.0, 1.0);

			[[stage(fragment)]]
			fn main() -> void {
				outColor = vec4<f32>(vertexColor, 1.0);
				return;
			}
		`);

		const pipelineConfig = new WebGpuPipelineConfig({
			vertexShader, fragmentShader,
			primitiveTopology: "line-list",
		});

		const customMapDatas = new Map();
		customMapDatas.set(materialMapWebGpuTypeUuid, {
			forwardPipelineConfig: pipelineConfig,
		});
		return new Material({customMapDatas});
	}
}
