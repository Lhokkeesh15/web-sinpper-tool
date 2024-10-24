if (typeof html2canvas === 'undefined') {
  console.error('html2canvas is not loaded. Make sure the script is included properly.');
}

document.addEventListener("DOMContentLoaded", () => {
  const scrollDown = document.querySelector(".scroll-down");
  const quotesSection = document.querySelector(".quotes-section");
  const snipper = document.querySelector(".snipper");
  const scrollingQuotes = document.querySelector(".scrolling-quotes");
  const dropbox = document.querySelector(".dropbox");
  const dropboxContent = document.querySelector(".dropbox-content");
  const generateButton = document.getElementById("generate-button");

  if (scrollDown && quotesSection) {
    scrollDown.addEventListener("click", () => {
      quotesSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (snipper) {
    snipper.addEventListener("click", startSnipping);
  }

  if (dropbox) {
    dropbox.addEventListener("click", toggleDropbox);
  }

  if (generateButton) {
    generateButton.addEventListener("click", generatePDF);
  }

  // Add event listeners for PDF links
  const pdfLinks = document.querySelectorAll('.pdf-link');
  pdfLinks.forEach(link => {
    link.addEventListener('click', handlePDFClick);
    link.addEventListener('contextmenu', handlePDFRightClick);
  });
});

function startSnipping() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "9999";
  document.body.appendChild(overlay);

  pauseAnimations();
  disableScroll();
  let startX, startY, endX, endY;
  let isDrawing = false;

  overlay.addEventListener("mousedown", (e) => {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    endX = e.clientX;
    endY = e.clientY;
    drawSelection();
  });

  overlay.addEventListener("mouseup", () => {
    isDrawing = false;
    if (Math.abs(endX - startX) > 10 && Math.abs(endY - startY) > 10) {
      captureScreenshot();
    } else {
      cancelSnipping();
    }
  });

  document.addEventListener("keydown", handleKeyPress);

  function handleKeyPress(e) {
    if (e.key === "Escape") {
      cancelSnipping();
    }
  }

  function cancelSnipping() {
    document.body.removeChild(overlay);
    document.removeEventListener("keydown", handleKeyPress);
    resumeAnimations();
    enableScroll();
  }

  function drawSelection() {
    const selection = document.createElement("div");
    selection.style.position = "absolute";
    selection.style.border = "2px solid #fff";
    selection.style.left = `${Math.min(startX, endX)}px`;
    selection.style.top = `${Math.min(startY, endY)}px`;
    selection.style.width = `${Math.abs(endX - startX)}px`;
    selection.style.height = `${Math.abs(endY - startY)}px`;
    overlay.innerHTML = "";
    overlay.appendChild(selection);
  }

  function captureScreenshot() {
    const sx = Math.min(startX, endX);
    const sy = Math.min(startY, endY);
    const sWidth = Math.abs(endX - startX);
    const sHeight = Math.abs(endY - startY);

    overlay.style.display = "none";

    html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      scrollX: -window.pageXOffset,
      scrollY: -window.pageYOffset,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      scale: window.devicePixelRatio,
      onclone: function(clonedDoc) {
        clonedDoc.querySelector('.snipper').style.display = 'none';
      }
    }).then((canvas) => {
      overlay.style.display = "block";

      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      croppedCanvas.width = sWidth;
      croppedCanvas.height = sHeight;

      ctx.drawImage(canvas, sx, sy + window.pageYOffset, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const link = document.createElement("a");
      link.download = "screenshot.png";
      link.href = croppedCanvas.toDataURL("image/png");
      link.click();

      addToDropbox(link.href, 'screenshot');

      cancelSnipping();
    }).catch((error) => {
      console.error("Screenshot failed:", error);
      alert("Failed to capture screenshot. Please try again.");
      cancelSnipping();
    });
  }
}

function pauseAnimations() {
  document.body.classList.add('pause-all-animations');
  const animatedElements = document.querySelectorAll('*');
  animatedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const animation = style.getPropertyValue('animation');
    if (animation && animation !== 'none') {
      el.style.animationPlayState = 'paused';
    }
  });
}

function resumeAnimations() {
  document.body.classList.remove('pause-all-animations');
  const animatedElements = document.querySelectorAll('*');
  animatedElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const animation = style.getPropertyValue('animation');
    if (animation && animation !== 'none') {
      el.style.animationPlayState = 'running';
    }
  });
}

function disableScroll() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  window.onscroll = function() {
    window.scrollTo(scrollLeft, scrollTop);
  };
}

function enableScroll() {
  window.onscroll = function() {};
}

function handlePDFClick(event) {
  event.preventDefault();
  const pdfUrl = event.target.getAttribute('data-pdf');
  openPDFPreview(pdfUrl);
}

function handlePDFRightClick(event) {
  event.preventDefault();
  const pdfUrl = event.target.getAttribute('data-pdf');
  addToDropbox(pdfUrl, 'pdf');
}

function openPDFPreview(pdfUrl) {
  const existingIframe = document.querySelector('.pdf-preview');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.src = pdfUrl;
  iframe.className = 'pdf-preview';
  iframe.style.position = 'fixed';
  iframe.style.top = '50%';
  iframe.style.left = '50%';
  iframe.style.transform = 'translate(-50%, -50%)';
  iframe.style.width = '80%';
  iframe.style.height = '80%';
  iframe.style.border = 'none';
  iframe.style.zIndex = '9999';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.position = 'fixed';
  closeButton.style.top = '10%';
  closeButton.style.right = '11%';
  closeButton.style.zIndex = '10000';
  closeButton.addEventListener('click', () => {
    iframe.remove();
    closeButton.remove();
  });

  document.body.appendChild(iframe);
  document.body.appendChild(closeButton);
}

function addToDropbox(item, type) {
  dropboxItems.push({ item, type });
  updateDropboxContent();
}

function updateDropboxContent() {
  const dropboxItemsElement = document.getElementById('dropbox-items');
  dropboxItemsElement.innerHTML = '';
  dropboxItems.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.textContent = `${item.type}: ${item.item}`;
    dropboxItemsElement.appendChild(itemElement);
  });
}

function toggleDropbox() {
  const dropboxContent = document.querySelector(".dropbox-content");
  dropboxContent.classList.toggle("show");
}

function generatePDF() {
  // Logic to generate PDF with screenshot
  console.log("Generating PDF with screenshot");
  // You'll need to implement the actual PDF generation logic here
}

let dropboxItems = [];
