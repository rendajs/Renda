[[block]] struct Light {
	[[offset(0)]] pos : vec3<f32>;
	[[offset(16)]] col : vec3<f32>;
};
[[block]] struct LightUniforms {
	[[offset(0)]] lightCount : u32;
	[[offset(16)]] lights : [[stride(32)]] array<Light, 10>;
};
[[group(0), binding(1)]] var<storage_buffer> lightUniforms : [[access(read)]] LightUniforms;
