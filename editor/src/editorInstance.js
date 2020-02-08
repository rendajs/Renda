import Editor from "./Editor.js";

let editor = new Editor();
window["editor"] = editor;
export default editor;

editor.init();

//temporary: create a cube
//remove this later when project management is working correctly
editor.windowManager.rootWindow.windowB.windowA.windowA.tabs[0].newEmptyEditingObject();
