[[block]] struct ModelUniforms {
	[[offset(0)]] mvp : mat4x4<f32>;
	[[offset(64)]] vp : mat4x4<f32>;
	[[offset(128)]] m : mat4x4<f32>;
};
[[group(2), binding(0)]] var<uniform> modelUniforms : ModelUniforms;
