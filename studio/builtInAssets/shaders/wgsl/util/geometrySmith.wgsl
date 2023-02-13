// This is an estimation of how many of the microfacets are self shadowing.
// The rougher a surface is, the more self shadowing there is when light
// comes in at an angle.
// This uses smith's method with schlick-ggx as Gsub.
fn geometrySmith(normal : vec3<f32>, halfwayVector : vec3<f32>, lightDir : vec3<f32>, roughness : f32) -> f32 {
	let NdotV : f32 = max(dot(normal, halfwayVector), 0.0);
	let NdotL : f32 = max(dot(normal, lightDir), 0.0);
	let r : f32 = roughness + 1.0;
	let k : f32 = (r * r) / 8.0;
	let ggx1 : f32 = NdotV / (NdotV * (1.0 - k) + k);
	let ggx2 : f32 = NdotL / (NdotL * (1.0 - k) + k);
	return ggx1 * ggx2;
}
