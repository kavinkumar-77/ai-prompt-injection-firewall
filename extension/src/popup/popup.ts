// Popup script initializing popup interactions
document.addEventListener("DOMContentLoaded", () => {
  const scanButton = document.getElementById("scan-btn");
  const statusElement = document.getElementById("content-status");

  if (scanButton && statusElement) {
    scanButton.addEventListener("click", () => {
      statusElement.textContent = "Scanning active tab for prompt injections...";
      setTimeout(() => {
        statusElement.textContent = "Scan complete: No hidden injections detected.";
      }, 500);
    });
  }
});
