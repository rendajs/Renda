import Editor from "./Editor.js";

let editor = new Editor();
editor.init();
window["editor"] = editor;
export default editor;
