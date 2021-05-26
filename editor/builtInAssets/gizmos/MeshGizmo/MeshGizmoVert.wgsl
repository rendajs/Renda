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
	outPos = objectUniforms.mvp * vec4<f32>(vertexPos, 1.0);
	vertexColorOut = vertexColor;
	return;
}
