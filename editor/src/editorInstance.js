import Editor from "./Editor.js";

let editor = new Editor();
window["editor"] = editor;
export default editor;

editor.init();
