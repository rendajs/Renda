/**
 * @typedef {Object} EntitySelectionMetaData
 * @property {import("../ui/TreeView.js").TreeView} outlinerTreeView
 * @property {import("../windowManagement/contentWindows/ContentWindowOutliner.js").ContentWindowOutliner} outliner
 */

/**
 * Helper class used to attach metadata to selected entities.
 *
 * Since entities can have multiple instances, it is possible for them to be selected
 * multiple times. But in order to make modifications to transform data of
 * specific instances, we need to know its chain of parent entities.
 * This class allows us to attach TreeViews from the outliner to the entities.
 */
export class EntitySelection {
	/**
	 * @param {import("../../../src/core/Entity.js").Entity} entity
	 * @param {EntitySelectionMetaData} metaData
	 */
	constructor(entity, metaData) {
		this.entity = entity;
		this.metaData = metaData;
	}
}
