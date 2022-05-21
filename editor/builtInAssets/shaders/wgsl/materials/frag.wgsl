// file://./structs/lightUniforms.wgsl
// @import 8cd64104-1d45-4536-972a-5685a2523725

// file://./structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2

// file://./../util/trowbridgeReitzGgx.wgsl
// @import 76ed4a0e-36ac-4419-af53-4890041b673a

// file://./../util/geometrySmith.wgsl
// @import 29f11b37-5501-4d58-bfe3-e9c831fcd3e2

// file://./../util/fresnelSchlick.wgsl
// @import 98c32773-068b-4368-9a55-a3d046624acd

//todo: import this from clusterBoundsStruct.wgsl
struct ClusterLightIndices {
	lightCount : u32,
	indices: array<u32, ${maxLightsPerClusterPass}>,
};
struct ClusterLightIndicesArray {
	clusters: array<ClusterLightIndices, ${totalClusterCount}>,
};
@group(0) @binding(2)
var<storage,read_write> clusterLightIndices : ClusterLightIndicesArray;

fn depthToLinear(z : f32) -> f32 {
	// let m : mat4x4<f32> = viewUniforms.projectionMatrix;
	return - (z * viewUniforms.projectionMatrix[3][3] - viewUniforms.projectionMatrix[3][2]) / (z * viewUniforms.projectionMatrix[2][3] - viewUniforms.projectionMatrix[2][2]);
}

let clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

fn getClusterCoord(fragCoord : vec4<f32>) -> vec3<u32> {
	let viewCoord : vec2<f32> = fragCoord.xy / viewUniforms.screenSize.xy;

	//todo: precompute sliceScale and sliceBias on the cpu
	let sliceScale : f32 = f32(clusterCount.z) / log2(viewUniforms.clippingPanes.y / viewUniforms.clippingPanes.x);
	let sliceBias : f32 = - (f32(clusterCount.z) * log2(viewUniforms.clippingPanes.x) / log2(viewUniforms.clippingPanes.y / viewUniforms.clippingPanes.x));
	let zTile : u32 = u32(max(log2(depthToLinear(fragCoord.z)) * sliceScale + sliceBias, 0.0));

	let clusterCoord : vec3<u32> = vec3<u32>(vec2<u32>(viewCoord.xy * vec2<f32>(clusterCount.xy)), zTile);
	return clusterCoord;
}

fn getClusterIndex(fragCoord : vec4<f32>) -> u32 {
	let clusterCoord : vec3<u32> = getClusterCoord(fragCoord);
	return clusterCoord.x + clusterCoord.y * clusterCount.x + clusterCoord.z * clusterCount.x * clusterCount.y;
}


struct MaterialUniforms {
	metallicAdjust : f32,
	roughnessAdjust : f32,
};
@group(1) @binding(0)
var<uniform> materialUniforms : MaterialUniforms;

@group(1) @binding(1) var albedoSampler : sampler;
@group(1) @binding(2) var albedoTexture : texture_2d<f32>;
@group(1) @binding(3) var normalSampler : sampler;
@group(1) @binding(4) var normalTexture : texture_2d<f32>;
@group(1) @binding(5) var metallicSampler : sampler;
@group(1) @binding(6) var metallicTexture : texture_2d<f32>;
@group(1) @binding(7) var roughnessSampler : sampler;
@group(1) @binding(8) var roughnessTexture : texture_2d<f32>;

struct FragmentInput {
	@builtin(position) fragCoord : vec4<f32>,
	@location(0) vWorldPos : vec3<f32>,
	@location(1) normal : vec3<f32>,
	@location(2) vUv1 : vec2<f32>,
	@location(3) vTangent : vec3<f32>,
	@location(4) vBitangent : vec3<f32>,
};

struct FragmentOutput {
	@location(0) outColor : vec4<f32>,
};

@stage(fragment)
fn main(input : FragmentInput) -> FragmentOutput {
	let albedo : vec3<f32> = pow(textureSample(albedoTexture, albedoSampler, input.vUv1).rgb, vec3<f32>(2.2));
	let metallic : f32 = textureSample(metallicTexture, metallicSampler, input.vUv1).r + materialUniforms.metallicAdjust;
	let roughness : f32 = textureSample(roughnessTexture, roughnessSampler, input.vUv1).r + materialUniforms.roughnessAdjust;
	let tangentNormal : vec3<f32> = normalize(textureSample(normalTexture, normalSampler, input.vUv1).rgb * 2.0 - 1.0);

	let worldToTangentMatrix : mat3x3<f32> = mat3x3<f32>(input.vTangent, input.vBitangent, input.normal);

	let worldNormal : vec3<f32> = normalize(worldToTangentMatrix * tangentNormal);
	let viewVector : vec3<f32> = normalize(viewUniforms.camPos -  input.vWorldPos);

	// How reflective this fragment is for each rgb component. For dielectrics
	// this value is always 0.04. For metals we take the value from the albedo.
	let baseReflectivity : vec3<f32> = mix(vec3<f32>(0.04, 0.04, 0.04), albedo, metallic);

	// The output luminance that we'll accumulate by looping over the lights below.
	var totalLightOutput : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

	// We're using pow(roughness, 2) to make the roughness slider more usable.
	// This is the behavior in most renderers.
	var roughness2 = roughness * roughness;

	let clusterIndex : u32 = getClusterIndex(input.fragCoord);
	let cluster : ClusterLightIndices = clusterLightIndices.clusters[clusterIndex];
	for(var i : u32 = 0u; i < cluster.lightCount; i = i + 1u) {
		let lightIndex : u32 = clusterLightIndices.clusters[clusterIndex].indices[i];
		let light : Light = lightUniforms.lights[lightIndex];

		let deltaLightPos : vec3<f32> = light.pos - input.vWorldPos;
		let lightDir : vec3<f32> = normalize(deltaLightPos);
		let halfwayVector: vec3<f32> = normalize(lightDir + viewVector);
		let lightDist : f32 = length(deltaLightPos);
		let attenuation : f32 = 1.0 / (lightDist * lightDist);
		// radiance is the total amount of light coming in from this light source.
		let radiance : vec3<f32> = light.col * attenuation;

		// NdotV and NdotL are clamped at 0.000000001 to avoid divide by zero errors later on.
		let NdotV : f32 = max(dot(worldNormal, halfwayVector), 0.000000001);
		let NdotL : f32 = max(dot(worldNormal, lightDir), 0.000000001);
		let HdotV : f32 = max(dot(halfwayVector, viewVector), 0.0);

		// cook-torrance brdf
		let normalDistributionBrdf : f32 = trowbridgeReitzGgx(worldNormal, halfwayVector, roughness2);
		let geometryBrdf : f32 = geometrySmith(worldNormal, halfwayVector, lightDir, roughness2);
		let fresnelBrdf : vec3<f32> = fresnelSchlick(HdotV, baseReflectivity);

		let specular : vec3<f32> = (normalDistributionBrdf * (geometryBrdf * fresnelBrdf)) / (4.0 * NdotV * NdotL);

		// The specular is brighter when there is a high angle between the light
		// and the view vector, so we need to lower the diffuse lighting
		// for energy conservation.
		var diffuseLightAmount : vec3<f32> = vec3<f32>(1.0) - fresnelBrdf;

		// only dielectrics have a diffuse component, so we lower the diffuse
		// lighting for metals.
		diffuseLightAmount *= 1.0 - metallic;

		totalLightOutput += (diffuseLightAmount * albedo / vec3<f32>(PI) + specular) * radiance * NdotL;
	}

	var color : vec3<f32> = totalLightOutput;

	// Reinhard tonemapping
	color = color / (color + vec3<f32>(1.0));

	// gamma correction
	color = pow(color, vec3<f32>(1.0/2.2));

	var fragOut : FragmentOutput;
	fragOut.outColor = vec4<f32>(color, 1.0);
	return fragOut;
}
