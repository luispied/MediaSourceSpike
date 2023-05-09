export function bufferWhenNeeded(assetURL) {
  const video = document.querySelector("video");

  // Need to be specific for Blink regarding codecs
  // ./mp4info frag_bunny.mp4 | grep Codec
  const mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
  const totalSegments = 5;
  let segmentLength = 0;
  let segmentDuration = 0;
  let bytesFetched = 0;
  const requestedSegments = [];

  for (let i = 0; i < totalSegments; ++i) requestedSegments[i] = false;

  let mediaSource = null;
  if ("MediaSource" in window && MediaSource.isTypeSupported(mimeCodec)) {
    mediaSource = new MediaSource();
    console.log("readyState", mediaSource.readyState); // closed
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener("sourceopen", sourceOpen);
  } else {
    console.error("Unsupported MIME type or codec: ", mimeCodec);
  }

  let sourceBuffer = null;
  async function sourceOpen(_) {
    sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    const fileLength = await getFileLength(assetURL);
    console.log("fileLength", (fileLength / 1024 / 1024).toFixed(2), "MB");
    const totalLength = fileLength;
    segmentLength = Math.round(fileLength / totalSegments);
    console.log({ totalLength, segmentLength });
    appendSegment(await fetchRange(assetURL, 0, segmentLength));
    requestedSegments[0] = true;
    video.addEventListener("timeupdate", checkBuffer);
    video.addEventListener("canplay", function () {
      segmentDuration = video.duration / totalSegments;
      video.play();
    });
    video.addEventListener("seeking", seek);
  }

  async function getFileLength(url) {
    return fetch(url, {
      method: "HEAD"
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.headers.get("content-length");
    });
  }

  async function fetchRange(url, start, end) {
    const headers = new Headers();
    headers.append("Range", `bytes=${start}-${end}`);

    return fetch(url, {
      headers: headers
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      console.log("fetched bytes: ", start, end);
      bytesFetched += end - start + 1;
      return response.arrayBuffer();
    });
  }

  function appendSegment(chunk) {
    sourceBuffer.appendBuffer(chunk);
  }

  async function checkBuffer(_) {
    const currentSegment = getCurrentSegment();
    if (currentSegment === totalSegments && haveAllSegments()) {
      console.log("last segment", mediaSource.readyState);
      mediaSource.endOfStream();
      video.removeEventListener("timeupdate", checkBuffer);
    } else if (shouldFetchNextSegment(currentSegment)) {
      requestedSegments[currentSegment] = true;
      console.log("time to fetch next chunk", video.currentTime);
      appendSegment(
        await fetchRange(assetURL, bytesFetched, bytesFetched + segmentLength)
      );
    }
    console.log({
      "video.currentTime": video.currentTime,
      currentSegment,
      segmentDuration
    });
  }

  function seek(e) {
    console.log({ e });
    if (mediaSource.readyState === "open") {
      sourceBuffer.abort();
      console.log("readyState", mediaSource.readyState);
    } else {
      console.log("seek but not open?");
      console.log("readyState", mediaSource.readyState);
    }
  }

  function getCurrentSegment() {
    return ((video.currentTime / segmentDuration) | 0) + 1;
  }

  function haveAllSegments() {
    return requestedSegments.every(function (val) {
      return !!val;
    });
  }

  function shouldFetchNextSegment(currentSegment) {
    return (
      video.currentTime > segmentDuration * currentSegment * 0.8 &&
      !requestedSegments[currentSegment]
    );
  }
}
