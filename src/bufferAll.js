export function bufferAll(assetURL) {
  const video = document.querySelector("video");

  // Need to be specific for Blink regarding codecs
  // ./mp4info frag_bunny.mp4 | grep Codec
  const mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

  if ("MediaSource" in window && MediaSource.isTypeSupported(mimeCodec)) {
    const mediaSource = new MediaSource();
    console.log("readyState", mediaSource.readyState); // closed
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener("sourceopen", sourceOpen);
  } else {
    console.error("Unsupported MIME type or codec: ", mimeCodec);
  }

  async function sourceOpen(_) {
    console.log("readyState", this.readyState); // open
    const mediaSource = this;
    const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    try {
      const buf = await fetchAB(assetURL);
      sourceBuffer.addEventListener("updateend", function (_) {
        mediaSource.endOfStream();
        video.play();
        console.log("readyState", mediaSource.readyState); // ended
      });
      sourceBuffer.appendBuffer(buf);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAB(url) {
    console.log({ url });
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.arrayBuffer();
  }
}
