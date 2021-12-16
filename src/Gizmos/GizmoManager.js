import {Entity} from "../core/Entity.js";
import {ENGINE_ASSETS_LIVE_UPDATES_SUPPORT} from "../engineDefines.js";

export class GizmoManager {
	/**
	 * @param {import("../Assets/EngineAssetsManager.js").EngineAssetsManager} engineAssetsManager
	 */
	constructor(engineAssetsManager) {
		this.entity = new Entity("gizmos");
		/**
		 * @type {Set<import("./Gizmos/Gizmo.js").Gizmo>}
		 */
		this.gizmos = new Set();

		this.billboardVertexState = null;
		this.meshVertexState = null;

		this.billboardMaterial = null;
		this.meshMaterial = null;

		engineAssetsManager.watchAsset("9d9ebd2e-c657-4252-b7af-b5889a4986c3", asset => {
			this.billboardVertexState = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("6ebfe5aa-6754-406e-a238-ec052eefa7df", asset => {
			this.billboardMaterial = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("2a5ca9e6-6790-441b-8764-a07fbb438d1a", asset => {
			this.meshVertexState = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("47f64a6d-9629-4921-8b1a-a244af1aa568", asset => {
			this.meshMaterial = asset;
			this.updateGizmoMaterials();
		});
	}

	destructor() {
		for (const gizmo of this.gizmos) {
			this.removeGizmo(gizmo);
		}
		this.entity.detachParents();
	}

	addGizmo(constructor) {
		const gizmo = new constructor(this);
		this.gizmos.add(gizmo);
		this.entity.add(gizmo.entity);
		return gizmo;
	}

	removeGizmo(gizmo) {
		gizmo.destructor();
		this.gizmos.delete(gizmo);
	}

	updateGizmoMaterials() {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		for (const gizmo of this.gizmos) {
			gizmo.updateMaterials();
		}
	}
}
