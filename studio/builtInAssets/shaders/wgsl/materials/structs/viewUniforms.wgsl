struct ViewUniforms {
	screenSize : vec4<f32>,
	camPos : vec3<f32>,
	projectionMatrix : mat4x4<f32>,
	inverseProjectionMatrix : mat4x4<f32>,
	viewMatrix : mat4x4<f32>,
	viewProjectionMatrix : mat4x4<f32>,
	clippingPanes : vec4<f32>,
};
@group(0) @binding(0)
var<uniform> viewUniforms : ViewUniforms;
