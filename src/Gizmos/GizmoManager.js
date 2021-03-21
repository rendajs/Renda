import Entity from "../Core/Entity.js";
import Gizmo from "./Gizmos/Gizmo.js";
import WebGpuVertexState from "../Rendering/Renderers/WebGpuRenderer/WebGpuVertexState.js";
import Mesh from "../Core/Mesh.js";
import ShaderSource from "../Rendering/ShaderSource.js";
import WebGpuPipelineConfiguration from "../Rendering/Renderers/WebGpuRenderer/WebGpuPipelineConfiguration.js";
import {materialMapWebGpuTypeUuid} from "../Rendering/Renderers/WebGpuRenderer/WebGpuRenderer.js";
import Material from "../Rendering/Material.js";

export default class GizmoManager{
	constructor(){
		this.entity = new Entity("gizmos");
		this.gizmos = new Set();

		this.vertexState = new WebGpuVertexState({
			buffers: [
				{
					attributes: [
						{attributeType: Mesh.AttributeType.POSITION, componentCount: 2},
						{attributeType: Mesh.AttributeType.COLOR},
					],
				}
			],
		});

		this.gizmoMaterial = this.createMaterial();
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

	createMaterial(){
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
				var objPos : vec4<f32> = objectUniforms.m[3];
				outPos = objectUniforms.vp * objPos;
				const w : f32 = outPos.w;
				outPos = outPos / vec4<f32>(w,w,w,w);
				outPos.x = outPos.x + vertexPos.x / viewUniforms.screenSize.x;
				outPos.y = outPos.y + vertexPos.y / viewUniforms.screenSize.y;
				outPos = vec4<f32>(outPos.xy, 0.0, 1.0);
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

		const pipelineConfiguration = new WebGpuPipelineConfiguration({
			vertexShader, fragmentShader,
			primitiveTopology: "line-list",
		});

		const customMapDatas = new Map();
		customMapDatas.set(materialMapWebGpuTypeUuid, {
			forwardPipelineConfiguration: pipelineConfiguration,
		});
		return new Material({customMapDatas});
	}
}
