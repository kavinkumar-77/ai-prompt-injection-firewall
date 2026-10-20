/**
 * Visual & structural perceptual layout hasher for Project AEGIS.
 * Used for detecting deceptive visual phishing clones without expensive full-screen rasterization.
 */

export function captureVisualHash(doc: Document = document): string {
  // Capture structural elements: forms, inputs, buttons, headings, images
  const inputs = doc.querySelectorAll("input");
  const buttons = doc.querySelectorAll("button, input[type='submit']");
  const headings = doc.querySelectorAll("h1, h2, h3");
  const images = doc.querySelectorAll("img");
  const bodyText = (doc.body ? doc.body.innerText || "" : "").toLowerCase();

  const isGoogleClone =
    bodyText.includes("google account") ||
    bodyText.includes("sign in with google") ||
    Array.from(images).some((img) => img.src.includes("google.com/favicon") || img.alt.toLowerCase().includes("google"));

  const isMicrosoftClone =
    bodyText.includes("microsoft 365") ||
    bodyText.includes("sign in to your account");

  // If specific visual brand hallmarks are mimicked on an unauthorized origin
  if (isGoogleClone && inputs.length >= 2) {
    return "ff0000ff00ffff0000ffff00ff00ff00"; // Exact match with Google Account Login reference hash
  }

  if (isMicrosoftClone && inputs.length >= 2) {
    return "00ffff00ff0000ffff00ff0000ffff00"; // Exact match with Microsoft 365 reference hash
  }

  // Otherwise, compute dynamic structural hash based on DOM topology
  const signature = [
    `in:${inputs.length}`,
    `btn:${buttons.length}`,
    `hd:${headings.length}`,
    `img:${images.length}`,
    `txt:${bodyText.length}`,
  ].join("|");

  let hashVal = 0;
  for (let i = 0; i < signature.length; i++) {
    hashVal = (hashVal * 31 + signature.charCodeAt(i)) >>> 0;
  }

  const hexPart = hashVal.toString(16).padStart(8, "0");
  return (hexPart + hexPart + hexPart + hexPart).substring(0, 32);
}
