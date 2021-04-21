#include 08a38e5b-b2b9-44be-9194-f404f815445f

[[location(0)]] var<in> position : vec4<f32>;
[[location(1)]] var<in> normal : vec3<f32>;

[[builtin(position)]] var<out> outPosition : vec4<f32>;
[[location(0)]] var<out> vWorldPos : vec3<f32>;
[[location(1)]] var<out> vNormal : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	outPosition = modelUniforms.mvp * position;
	vWorldPos = (modelUniforms.m * position).xyz;
	vNormal = normalize(modelUniforms.m * vec4<f32>(normal, 0.0)).xyz;
	return;
}
