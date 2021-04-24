//todo: move this to somewhere better
const viewUniforms = `
[[block]] struct ViewUniforms {
	screenSize : vec4<f32>;
	projectionMatrix : mat4x4<f32>;
	inverseProjectionMatrix : mat4x4<f32>;
	viewMatrix : mat4x4<f32>;
	clippingPanes : vec4<f32>;
};
[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;
`;

const lightUniforms = `
struct Light {
	pos : vec3<f32>;
	col : vec3<f32>;
};
[[block]] struct Lights {
	lightCount : u32;
	lights : [[stride(32)]] array<Light, 10>;
};
[[group(0), binding(1)]] var<storage_buffer> lightUniforms : [[access(read)]] Lights;
`;

function clusterBounds(totalClusterCount){
	return `
struct ClusterAABB {
	min : vec3<f32>;
	max : vec3<f32>;
};
[[block]] struct ClusterBoundsArray {
	bounds : [[stride(32)]] array<ClusterAABB, ${totalClusterCount}>;
};
[[group(1), binding(0)]] var<storage> clusterBounds : [[access(write)]] ClusterBoundsArray;
`;
}

function clusterLightIndices(totalClusterCount, maxLightCount){
	return `
struct ClusterLightIndices {
	lightCount : u32;
	indices : [[stride(4)]] array<u32, ${maxLightCount}>;
};
[[block]] struct ClusterLightIndicesArray {
	clusters : [[stride(${maxLightCount*4 + 4})]] array<ClusterLightIndices, ${totalClusterCount}>;
};
[[group(1), binding(1)]] var<storage> clusterLightIndices : [[access(write)]] ClusterLightIndicesArray;
`;
}

export function computeClusterBoundsShaderCode({totalClusterCount, clusterCountX, clusterCountY, clusterCountZ}){
	return`

${viewUniforms}
${lightUniforms}
${clusterBounds(totalClusterCount)}

let clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

fn screen2View(screen : vec2<f32>) -> vec3<f32> {
	let flippedScreen : vec2<f32> = vec2<f32>(screen.x, 1.0 - screen.y);
	let clip : vec4<f32> = vec4<f32>(flippedScreen.xy * 2.0 - vec2<f32>(1.0, 1.0), 1.0, 1.0);
	var view : vec4<f32> = viewUniforms.inverseProjectionMatrix * clip;
	view = view / vec4<f32>(view.w, view.w, view.w, view.w);
	return view.xyz;
}

[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] globalId : vec3<u32>) {
	let clusterSize : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0) / vec3<f32>(clusterCount.xyz);

	let minPointScreen : vec2<f32> = vec2<f32>(globalId.xy) * clusterSize.xy;
	let maxPointScreen : vec2<f32> = (vec2<f32>(globalId.xy) + vec2<f32>(1.0, 1.0)) * clusterSize.xy;

	let minPointView : vec3<f32> = screen2View(minPointScreen);
	let maxPointView : vec3<f32> = screen2View(maxPointScreen);

	let near : f32 = viewUniforms.clippingPanes.x;
	let far : f32 = viewUniforms.clippingPanes.y;
	let clusterNear : f32 = near * pow(far / near, f32(globalId.z) / f32(clusterCount.z));
	let clusterFar : f32 = near * pow(far / near, f32(globalId.z + 1u) / f32(clusterCount.z));

	let minNear : vec3<f32> = minPointView * (clusterNear / far);
	let maxNear : vec3<f32> = maxPointView * (clusterNear / far);
	let minFar : vec3<f32> = minPointView * (clusterFar / far);
	let maxFar : vec3<f32> = maxPointView * (clusterFar / far);

	let clusterIndex : u32 = globalId.x + globalId.y * clusterCount.x + globalId.z * clusterCount.x * clusterCount.y;
	clusterBounds.bounds[clusterIndex].min = min(min(minNear, maxNear),min(minFar, maxFar));
	clusterBounds.bounds[clusterIndex].max = max(max(minNear, maxNear),max(minFar, maxFar));
	return;
}
`;
};

export function computeClusterLightsShaderCode({totalClusterCount, maxLightsPerCluster, clusterCountX, clusterCountY, clusterCountZ}){
	return `

${viewUniforms}
${lightUniforms}
${clusterBounds(totalClusterCount)}
${clusterLightIndices(totalClusterCount, maxLightsPerCluster)}

let clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

fn squareDistPointToAabb(point : vec3<f32>, minAabb : vec3<f32>, maxAabb : vec3<f32>) -> f32 {

var sqDist : f32 = 0.0;
    for(var i : i32 = 0; i < 3; i = i + 1) {
      var v : f32 = point[i];
      if(v < minAabb[i]) {
        sqDist = sqDist + (minAabb[i] - v) * (minAabb[i] - v);
      }
      if(v > maxAabb[i]) {
        sqDist = sqDist + (v - maxAabb[i]) * (v - maxAabb[i]);
      }
    }
    return sqDist;
}

[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] globalId : vec3<u32>) {
	let clusterIndex : u32 = globalId.x + globalId.y * clusterCount.x + globalId.z * clusterCount.x * clusterCount.y;

	var clusterLightCount : u32 = 0u;

	for(var i : u32 = 0u; i < lightUniforms.lightCount; i = i + 1u){
		let range : f32 = 10.0;
		let lightViewPos : vec4<f32> = viewUniforms.viewMatrix * vec4<f32>(lightUniforms.lights[i].pos, 1.0);

		let squareDist : f32 = squareDistPointToAabb(lightViewPos.xyz, clusterBounds.bounds[clusterIndex].min, clusterBounds.bounds[clusterIndex].max);

		if(squareDist <= (range * range)) {
			clusterLightIndices.clusters[clusterIndex].indices[clusterLightCount] = i;
			clusterLightCount = clusterLightCount + 1u;
		}
	}
	clusterLightIndices.clusters[clusterIndex].lightCount = clusterLightCount;

	return;
}
`;
}
