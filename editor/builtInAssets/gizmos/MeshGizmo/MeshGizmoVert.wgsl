#include 08a38e5b-b2b9-44be-9194-f404f815445f

[[location(0)]] var<in> vertexPos : vec3<f32>;
[[location(1)]] var<in> vertexColor : vec3<f32>;

[[builtin(position)]] var<out> outPos : vec4<f32>;
[[location(0)]] var<out> vertexColorOut : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	outPos = modelUniforms.mvp * vec4<f32>(vertexPos, 1.0);
	vertexColorOut = vertexColor;
	return;
}
