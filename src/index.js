import "./styles.css";
import { bufferAll } from "./bufferAll";
import { bufferWhenNeeded } from "./bufferWhenNeeded";

const assetURL = "../video/frag_bunny.mp4";

document.getElementById("app").innerHTML = `
<video controls></video>
<div>
  <button id='ba'>buffer all</button>
  <button id='bwn'>buffer when needed</button>
</div>`;

const buttonBA = document.getElementById("ba");
const buttonBWN = document.getElementById("bwn");

buttonBA.addEventListener("click", () => bufferAll(assetURL));
buttonBWN.addEventListener("click", () => bufferWhenNeeded(assetURL));
