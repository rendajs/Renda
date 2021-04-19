[[block]] struct Uniforms {
	[[offset(0)]] mvp : mat4x4<f32>;
	[[offset(64)]] vp : mat4x4<f32>;
	[[offset(128)]] m : mat4x4<f32>;
};

[[group(2), binding(0)]] var<uniform> uniforms : Uniforms;

[[location(0)]] var<in> position : vec4<f32>;
[[location(1)]] var<in> normal : vec3<f32>;

[[builtin(position)]] var<out> outPosition : vec4<f32>;
[[location(0)]] var<out> vWorldPos : vec3<f32>;
[[location(1)]] var<out> vNormal : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	outPosition = uniforms.mvp * position;
	vWorldPos = (uniforms.m * position).xyz;
	vNormal = normalize(uniforms.m * vec4<f32>(normal, 0.0)).xyz;
	return;
}
