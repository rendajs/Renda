[[block]] struct ViewUniforms {
	[[offset(0)]] screenSize : vec4<f32>;
	[[offset(16)]] projectionMatrix : mat4x4<f32>;
	[[offset(80)]] inverseProjectionMatrix : mat4x4<f32>;
	[[offset(144)]] viewMatrix : mat4x4<f32>;
	[[offset(208)]] clippingPanes : vec4<f32>;
};
[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;
