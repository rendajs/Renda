// file://./structs/modelUniforms.wgsl
// @import 08a38e5b-b2b9-44be-9194-f404f815445f

struct VertexInput {
	@location(0) position : vec4<f32>;
	@location(1) normal : vec3<f32>;
};

struct VertexOutput {
	@builtin(position) position : vec4<f32>;
	@location(0) vWorldPos : vec3<f32>;
	@location(1) vNormal : vec3<f32>;
};

@stage(vertex)
fn main(input : VertexInput) -> VertexOutput {
	var vertOut : VertexOutput;
	vertOut.position = modelUniforms.mvp * input.position;
	vertOut.vWorldPos = (modelUniforms.m * input.position).xyz;
	vertOut.vNormal = normalize(modelUniforms.m * vec4<f32>(input.normal, 0.0)).xyz;
	return vertOut;
}
