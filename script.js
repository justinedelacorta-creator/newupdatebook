// ==========================================
// 1. CONFIGURATION & SHOP LOCATION
// ==========================================
// 📍 EKSAKTONG COORDINATES NG SHOP MO (Toril, Davao City):
const SHOP_LAT = 7.0205237;   
const SHOP_LNG = 125.4967342; 

let currentRefNo = "TF-" + Math.floor(1000 + Math.random() * 9000);
let clientDistanceKM = 0;
let computedFare = 350; // Default base rate
let hasLocationPermission = false; // Flag para i-check kung kinuha na ang location!

// ==========================================
// 2. HELPER FUNCTIONS & DISTANCE FORMULA
// ==========================================

// Helper: Convert Base64/DataURL to Blob File Object
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// Compute Fare batay sa kilometro (≤7.5km = ₱350, >7.5km = +₱35/km)
function calculateFare(distanceKM) {
  const BASE_DIST = 7.5;       
  const BASE_RATE = 350;       
  const EXTRA_RATE_PER_KM = 35; 

  if (distanceKM <= BASE_DIST) {
    return BASE_RATE;
  } else {
    const extraDistance = distanceKM - BASE_DIST;
    return BASE_RATE + (extraDistance * EXTRA_RATE_PER_KM);
  }
}

// Haversine Formula: GPS Distance Computation
function getKilometers(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

// ==========================================
// 3. LIVE LOCATION GPS FUNCTION
// ==========================================
function getClientLocation() {
  const statusTxt = document.getElementById("locationStatus");
  const locBtn = document.getElementById("getLocBtn");

  if (!navigator.geolocation) {
    alert("Hindi suportado ng browser mo ang Geolocation/GPS.");
    return;
  }

  if (statusTxt) {
    statusTxt.className = "location-status-text";
    statusTxt.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Kukunin ang iyong lokasyon...`;
  }
  if (locBtn) locBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const clientLat = position.coords.latitude;
      const clientLng = position.coords.longitude;

      // Kwentahin ang distansya
      clientDistanceKM = getKilometers(SHOP_LAT, SHOP_LNG, clientLat, clientLng);
      computedFare = calculateFare(clientDistanceKM);

      // NA-SET NA ANG PERMISSION!
      hasLocationPermission = true;

      // Display Status
      if (statusTxt) {
        statusTxt.className = "location-status-text location-success";
        statusTxt.innerHTML = `<i class="fa-solid fa-circle-check"></i> Nakuha ang lokasyon! Layo: <strong>${clientDistanceKM.toFixed(2)} km</strong>`;
      }
      
      if (locBtn) locBtn.disabled = false;

      // I-update ang resibo sa screen
      calculatePCTotal();
    },
    (error) => {
      hasLocationPermission = false;
      if (statusTxt) {
        statusTxt.className = "location-status-text location-error";
        statusTxt.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Hindi ma-detect ang lokasyon. Pakisuri ang Permiso sa GPS.`;
      }
      if (locBtn) locBtn.disabled = false;
      alert("Kailangan po naming ma-detect ang inyong lokasyon para makwenta ang Home Service Rate bago mag-proceed.");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ==========================================
// 4. COMPUTATION & LIVE RECEIPT DISPLAY
// ==========================================
function calculatePCTotal() {
  const pcServiceSelect = document.getElementById("pcServiceSelect");
  const unitQuantity = document.getElementById("unitQuantity");
  const clientNameInput = document.getElementById("clientName");
  const clientAddressInput = document.getElementById("clientAddress");

  if (!pcServiceSelect || !unitQuantity) return;

  const serviceBasePrice = parseFloat(pcServiceSelect.value) || 0;
  const quantity = parseInt(unitQuantity.value) || 1;
  const fareFee = computedFare; 

  const subtotalService = serviceBasePrice * quantity;
  const grandTotal = subtotalService + fareFee;

  const selectedService = pcServiceSelect.options[pcServiceSelect.selectedIndex]?.getAttribute("data-name") || "Service";

  if (document.getElementById("receiptRefNo")) {
    document.getElementById("receiptRefNo").textContent = "REF: #" + currentRefNo;
    document.getElementById("receiptClientName").textContent = clientNameInput && clientNameInput.value.trim() !== "" ? clientNameInput.value : "---";
    document.getElementById("receiptAddress").textContent = clientAddressInput && clientAddressInput.value.trim() !== "" ? clientAddressInput.value : "---";

    document.getElementById("receiptServiceName").textContent = `${selectedService} (x${quantity}):`;
    document.getElementById("receiptServiceCost").textContent = "₱" + subtotalService.toLocaleString('en-PH', { minimumFractionDigits: 2 });

    const distText = clientDistanceKM > 0 ? `(${clientDistanceKM.toFixed(1)} km)` : "(Base Rate ≤7.5km)";
    document.getElementById("receiptLocationName").textContent = `Home Service Fee ${distText}:`;
    document.getElementById("receiptFareCost").textContent = "₱" + fareFee.toLocaleString('en-PH', { minimumFractionDigits: 2 });

    document.getElementById("pcTotalPrice").textContent = "₱" + grandTotal.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  const elementsToWatch = [
    "pcServiceSelect",
    "unitQuantity",
    "clientName",
    "clientAddress"
  ];

  elementsToWatch.forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", calculatePCTotal);
      element.addEventListener("input", calculatePCTotal);
      element.addEventListener("keyup", calculatePCTotal);
    }
  });

  calculatePCTotal();
});

// ==========================================
// 5. BOOKING SUBMIT (STRICT LOCATION CHECK)
// ==========================================
function sendPCBooking(event) {
  event.preventDefault();

  // ⚠️ STRICT CHECK: KUNG HINDI PA NAG-LIVELOCATION ANG CLIENT
  if (!hasLocationPermission) {
    alert("⚠️ PAALALA: Pindutin muna ang 'Gamitin ang Aking Live Location' button para makwenta ang tamang Home Service Rate bago mag-kumpirma.");
    
    // I-highlight ang GPS button para makita agad ng client
    const locBtn = document.getElementById("getLocBtn");
    if (locBtn) {
      locBtn.focus();
      locBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return; // HIHINTO DITO, HINDI MAG-PROCEED SA RESIBO!
  }

  const messengerUsername = "justine.delacorta"; 
  const receiptElement = document.querySelector(".receipt-container");
  if (!receiptElement) return;

  // Detect kung naka-In-App Browser ng Messenger / Facebook
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isMessenger = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Messenger") > -1);

  // KUNG NAKA-MESSENGER: Force Chrome Open
  if (isMessenger) {
    const currentUrl = window.location.href.replace(/^https?:\/\//, ''); 
    const chromeIntent = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    
    window.location.href = chromeIntent;
    return;
  }

  // KUNG OK NA ANG LAHAT: Proceed sa Receipt Generation
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Ginagawa ang Resibo...`;
  submitBtn.disabled = true;

  html2canvas(receiptElement, {
    scale: 2,
    backgroundColor: "#0f172a",
    useCORS: true,
    logging: false
  }).then(canvas => {
    const imageDataUrl = canvas.toDataURL("image/png");

    const blob = dataURItoBlob(imageDataUrl);
    const blobUrl = URL.createObjectURL(blob);

    const imgContainer = document.getElementById("modalImageContainer");
    if (imgContainer) {
      imgContainer.innerHTML = `<img src="${imageDataUrl}" alt="Booking Receipt">`;
    }

    const downloadBtn = document.getElementById("downloadReceiptBtn");
    if (downloadBtn) {
      downloadBtn.href = blobUrl;
      downloadBtn.download = `Receipt_${currentRefNo}.png`;
    }

    const clientName = document.getElementById("clientName") ? document.getElementById("clientName").value : "";
    const clientAddress = document.getElementById("clientAddress") ? document.getElementById("clientAddress").value : "";
    const total = document.getElementById("pcTotalPrice") ? document.getElementById("pcTotalPrice").textContent : "";
    const distText = `${clientDistanceKM.toFixed(2)} km`;

    const textMsg = encodeURIComponent(`Hi! Magbo-book po ako ng PC Service (#${currentRefNo}).\nName: ${clientName}\nAddress: ${clientAddress}\nDistance: ${distText}\nTotal: ${total}`);
    const messengerUrl = `https://m.me/${messengerUsername}?text=${textMsg}`;
    
    const messengerBtn = document.getElementById("proceedMessengerBtn");
    if (messengerBtn) {
      messengerBtn.href = messengerUrl;
    }

    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    
    const modal = document.getElementById("receiptModal");
    if (modal) modal.classList.add("active");

  }).catch(err => {
    console.error("Error generating receipt image:", err);
    alert("Nagkaroon ng problema. Direkta ka na naming ililipat sa Messenger.");
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    window.location.href = `https://m.me/${messengerUsername}`;
  });
}

function closeReceiptModal() {
  const modal = document.getElementById("receiptModal");
  if (modal) modal.classList.remove("active");
}

// ==========================================
// 6. SLIDESHOW JAVASCRIPT
// ==========================================
let slideIndex = 1;
let autoSlideTimer;

document.addEventListener("DOMContentLoaded", function() {
  showSlides(slideIndex);
  startAutoSlide();
});

function changeSlide(n) {
  showSlides(slideIndex += n);
  resetAutoSlide();
}

function currentSlide(n) {
  showSlides(slideIndex = n);
  resetAutoSlide();
}

function showSlides(n) {
  let slides = document.getElementsByClassName("slide");
  let dots = document.getElementsByClassName("dot");

  if (slides.length === 0) return;

  if (n > slides.length) { slideIndex = 1; }
  if (n < 1) { slideIndex = slides.length; }

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  for (let i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }

  slides[slideIndex - 1].style.display = "block";
  if (dots.length > 0) {
    dots[slideIndex - 1].className += " active";
  }
}

function startAutoSlide() {
  autoSlideTimer = setInterval(() => {
    slideIndex++;
    showSlides(slideIndex);
  }, 4000);
}

function resetAutoSlide() {
  clearInterval(autoSlideTimer);
  startAutoSlide();
}