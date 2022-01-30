// file://./../materials/structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2

// file://./../materials/structs/lightUniforms.wgsl
// @import 8cd64104-1d45-4536-972a-5685a2523725

// file://./ClusterBoundsStruct.wgsl
// @import 26ace8e7-7181-4e44-b507-f723b3567e9d

// file://./ClusterLightsStruct.wgsl
// @import 0e0f87de-6305-45df-9513-c5c08d08a2d7

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

//todo: use a more efficient workgroup size
@stage(compute) @workgroup_size(1u,1u,1u)
fn main(@builtin(global_invocation_id) globalId : vec3<u32>) {
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
