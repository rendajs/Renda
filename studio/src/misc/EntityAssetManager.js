/**
 * @fileoverview It's possible for entities to contain other entity assets as children.
 * This allows for reusing common entities across scenes.
 *
 * These links are only stored in the project files, however.
 * Once entities are bundled, and loaded inside applications, they will be a cloned.
 * Meaning that changes to one entity no longer updates other instances of that entity.
 *
 * Inside Studio, on the other hand, we'll want to show real time updates to any changes by the user.
 * When an entity is modified in one place, it should immediately show the new state on other entities as well.
 * The `EntityAssetManager` takes care of tracking which entities are instances of an entity asset.
 * When a change has been made, the EntityAssetManager is notified of the change,
 * which in turns modifies all the other entities to match the modified one.
 *
 * For simple position/rotation/scale transformations, the entities are modified directly,
 * but for more complex tasks the entity is cloned and replaced entirely.
 */

export class EntityAssetManager {
	constructor() {

	}
}
