import {injectMockEditorInstance} from "../../../../../../../editor/src/editorInstance.js";
import {PathGui} from "../../../../../../../editor/src/ui/PathGui.js";

const mockEditor = /** @type {import("../../../../../../../editor/src/Editor.js").Editor} */ ({
	colorizerFilterManager: {
		applyFilter(el, color) {},
	},
});
injectMockEditorInstance(mockEditor);

const gui = new PathGui();
document.body.appendChild(gui.el);

// Cast in order to prevent TypeScript from thinking this is available from every script:
/** @type {any} */
const g = globalThis;
g.gui = gui;
