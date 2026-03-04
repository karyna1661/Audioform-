import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = `${url.protocol}//${url.host}`

  const script = `
(function () {
  var scriptEl = document.currentScript;
  if (!scriptEl) return;
  var surveyId = scriptEl.getAttribute("data-survey-id");
  var creatorId = scriptEl.getAttribute("data-creator-id");
  if (!surveyId) return;
  var targetId = scriptEl.getAttribute("data-target") || "audioform-embed";
  var height = scriptEl.getAttribute("data-height") || "760";
  var target = document.getElementById(targetId);
  if (!target) return;

  var iframe = document.createElement("iframe");
  iframe.src = creatorId
    ? "${origin}/embed/by-creator/" + encodeURIComponent(creatorId) + "/" + encodeURIComponent(surveyId)
    : "${origin}/embed/" + encodeURIComponent(surveyId);
  iframe.width = "100%";
  iframe.height = String(height);
  iframe.style.border = "0";
  iframe.style.borderRadius = "16px";
  iframe.loading = "lazy";
  iframe.title = "Audioform embedded survey";
  target.innerHTML = "";
  target.appendChild(iframe);
})();
`.trim()

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
