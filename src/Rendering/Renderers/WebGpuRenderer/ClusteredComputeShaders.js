//todo: move this to somewhere better
const viewUniforms = `
[[block]] struct ViewUniforms {
	[[offset(0)]] screenSize : vec4<f32>;
	[[offset(16)]] projectionMatrix : mat4x4<f32>;
	[[offset(80)]] inverseProjectionMatrix : mat4x4<f32>;
	[[offset(144)]] clippingPanes : vec4<f32>;
};
[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;
`;

const lightUniforms = `
[[block]] struct Light {
	[[offset(0)]] pos : vec3<f32>;
	[[offset(16)]] col : vec3<f32>;
};
[[block]] struct Lights {
	[[offset(0)]] lights : [[stride(32)]] array<Light, 2>;
};
[[group(0), binding(1)]] var<storage_buffer> lights : [[access(read)]] Lights;
`;

function clusterBounds(totalClusterCount){
	return `
[[block]] struct ClusterAABB {
	[[offset(0)]] min : vec3<f32>;
	[[offset(16)]] max : vec3<f32>;
};
[[block]] struct ClusterBoundsArray {
	[[offset(0)]] bounds : [[stride(32)]] array<ClusterAABB, ${totalClusterCount}>;
};
[[group(1), binding(0)]] var<storage> clusterBounds : ClusterBoundsArray;
`;
}

function clusterLightIndices(totalClusterCount, maxLightCount){
	return `
[[block]] struct ClusterLightIndices {
	[[offset(0)]] lightCount : u32;
	[[offset(4)]] indices : [[stride(4)]] array<u32, ${maxLightCount}>;
};
[[block]] struct ClusterLightIndicesArray {
	[[offset(0)]] clusters : [[stride(${maxLightCount*4 + 4})]] array<ClusterLightIndices, ${totalClusterCount}>;
};
[[group(1), binding(1)]] var<storage> clusterLightIndices : ClusterLightIndicesArray;
`;
}

export function computeClusterBoundsShaderCode({totalClusterCount, clusterCountX, clusterCountY, clusterCountZ}){
	return`

${viewUniforms}
${lightUniforms}
${clusterBounds(totalClusterCount)}

[[builtin(global_invocation_id)]] var<in> globalId : vec3<u32>;

const clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

fn screen2View(screen : vec4<f32>) -> vec3<f32> {
	const clip : vec4<f32> = vec4<f32>(screen.xy * 2.0 - vec2<f32>(1.0, 1.0), screen.zw);
	var view : vec4<f32> = viewUniforms.inverseProjectionMatrix * clip;
	view = view / vec4<f32>(view.w, view.w, view.w, view.w);
	return view.xyz;
}

[[stage(compute)]]
fn main() -> void {
	const clusterSize : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0) / vec3<f32>(clusterCount.xyz);

	const minPointScreen : vec4<f32> = vec4<f32>(vec2<f32>(globalId.xy) * clusterSize.xy, 1.0, 1.0);
	const maxPointScreen : vec4<f32> = vec4<f32>((vec2<f32>(globalId.xy) + vec2<f32>(1.0, 1.0)) * clusterSize.xy, 1.0, 1.0);

	const minPointView : vec3<f32> = screen2View(minPointScreen);
	const maxPointView : vec3<f32> = screen2View(maxPointScreen);

	const near : f32 = viewUniforms.clippingPanes.x;
	const far : f32 = viewUniforms.clippingPanes.y;
	const clusterNear : f32 = -near * pow(far / near, f32(globalId.z) / f32(clusterCount.z));
	const clusterFar : f32 = -near * pow(far / near, f32(globalId.z + 1u) / f32(clusterCount.z));

	const minNear : vec3<f32> = minPointView * clusterNear;
	const maxNear : vec3<f32> = maxPointView * clusterNear;
	const minFar : vec3<f32> = minPointView * clusterFar;
	const maxFar : vec3<f32> = maxPointView * clusterFar;

	const clusterIndex : u32 = globalId.x + globalId.y * clusterCount.x + globalId.z * clusterCount.x * clusterCount.y;
	clusterBounds.bounds[clusterIndex].min = min(min(minNear, maxNear),min(minFar, maxFar));
	clusterBounds.bounds[clusterIndex].max = max(max(minNear, maxNear),max(minFar, maxFar));
	return;
}
`;
};

export function computeClusterLightsShaderCode({totalClusterCount, maxLightsPerCluster, clusterCountX, clusterCountY, clusterCountZ}){
	return `

${clusterBounds(totalClusterCount)}
${clusterLightIndices(totalClusterCount, maxLightsPerCluster)}

[[builtin(global_invocation_id)]] var<in> globalId : vec3<u32>;

const clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

[[stage(compute)]]
fn main() -> void {
	const clusterIndex : u32 = globalId.x + globalId.y * clusterCount.x + globalId.z * clusterCount.x * clusterCount.y;
	// clusterLightIndices.clusters[clusterIndex].lightCount = 1u;
	// clusterLightIndices.clusters[clusterIndex].indices[0] = (globalId.x + globalId.y + globalId.z) % 2u;

	//todo: don't hardcode lightCount
	for(var i : u32 = 0u; i < 2u; i = i + 1u){
		const range : f32 = 1.0;

	}

	return;
}
`;
}
