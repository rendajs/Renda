// file://./pi.wgsl
// @import 2704bc9a-1996-41f5-a203-7a67b5d211a7

// This is a normal distribution function that estimates how many microfacets
// are aligned in such a way that the incoming light is reflected towards the
// camera.
fn trowbridgeReitzGgx(normal: vec3<f32>, halfwayVector: vec3<f32>, roughness: f32) -> f32 {
	let a2 : f32 = roughness * roughness;
	let NdotH : f32 = max(dot(normal, halfwayVector), 0.0);
	let NdotH2 : f32 = NdotH * NdotH;

	var denom : f32 = (NdotH2 * (a2 - 1.0) + 1.0);
	denom = denom * denom * PI;

	return a2 / denom;
}
