import { render } from "preact";
import { App } from "./components/App.js";
import "./app.css";

const root = document.getElementById("app");
if (root) {
	render(<App />, root);
}
