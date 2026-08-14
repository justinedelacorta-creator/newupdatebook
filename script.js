// ==========================================
// 1. CONFIGURATION & SHOP LOCATION
// ==========================================
// 📍 EKSAKTONG COORDINATES NG SHOP MO (Toril, Davao City):
const SHOP_LAT = 7.0205237;   
const SHOP_LNG = 125.4967342; 

let currentRefNo = "TF-" + Math.floor(1000 + Math.random() * 9000);
let clientDistanceKM = 0;
let clientLat = 0;
let clientLng = 0;
let hasLocationPermission = false;
let mapInstance = null; // Para sa Leaflet Map

// ==========================================
// 2. HELPER FUNCTIONS & DISTANCE FORMULA
// ==========================================

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
// 3. LIVE LOCATION GPS FUNCTION & MAP RENDER
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
      clientLat = position.coords.latitude;
      clientLng = position.coords.longitude;

      // Kwentahin ang distansya
      clientDistanceKM = getKilometers(SHOP_LAT, SHOP_LNG, clientLat, clientLng);
      hasLocationPermission = true;

      if (statusTxt) {
        statusTxt.className = "location-status-text location-success";
        statusTxt.innerHTML = `<i class="fa-solid fa-circle-check"></i> Nakuha ang lokasyon! Layo: <strong>${clientDistanceKM.toFixed(2)} km</strong>`;
      }
      
      if (locBtn) locBtn.disabled = false;

      // Render ng Live Map Image (Kasama ang Shop at Client Location)
      renderClientMap(clientLat, clientLng);

      // I-update ang resibo
      calculatePCTotal();
    },
    (error) => {
      hasLocationPermission = false;
      if (statusTxt) {
        statusTxt.className = "location-status-text location-error";
        statusTxt.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Hindi ma-detect ang lokasyon. Paki-payagan ang Location Access sa iyong browser o phone settings.`;
      }
      if (locBtn) locBtn.disabled = false;
      alert("Kailangan po naming ma-detect ang inyong lokasyon bago mag-proceed sa booking. Pakisuri ang Location Permission sa iyong browser settings.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// Function para mag-draw ng Map sa Resibo (May Permanent Labels sa Pin)
function renderClientMap(lat, lng) {
  const mapContainer = document.getElementById("receiptMapContainer");
  const gmapLink = document.getElementById("googleMapsLink");

  if (mapContainer) mapContainer.style.display = "block";

  // Google Maps Direct Route Link (Mula Shop hanggang Client)
  if (gmapLink) {
    gmapLink.href = `https://www.google.com/maps/dir/?api=1&origin=${SHOP_LAT},${SHOP_LNG}&destination=${lat},${lng}`;
  }

  // Render Leaflet Map Visual
  if (typeof L !== "undefined" && document.getElementById("receiptMap")) {
    if (mapInstance) {
      mapInstance.remove(); // Reset map kung re-clicked
    }

    mapInstance = L.map('receiptMap');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance);

    // 1. Marker para sa TECH / SHOP LOCATION (May Nakalitaw na Label)
    const shopMarker = L.marker([SHOP_LAT, SHOP_LNG]).addTo(mapInstance)
      .bindTooltip("👨‍🔧 Tech Location", { 
        permanent: true, 
        direction: 'top',
        className: 'map-label-tech'
      });

    // 2. Marker para sa CLIENT LOCATION (May Nakalitaw na Label)
    const clientMarker = L.marker([lat, lng]).addTo(mapInstance)
      .bindTooltip("📍 Client Location", { 
        permanent: true, 
        direction: 'top',
        className: 'map-label-client'
      });

    // 3. Guhit / Linya mula sa Shop papunta sa Client
    const latlngs = [
      [SHOP_LAT, SHOP_LNG],
      [lat, lng]
    ];
    L.polyline(latlngs, { color: '#38bdf8', weight: 3, dashArray: '5, 10' }).addTo(mapInstance);

    // I-fit ang mapa para kitang-kita pareho ang Shop at Client
    const group = new L.featureGroup([shopMarker, clientMarker]);
    mapInstance.fitBounds(group.getBounds().pad(0.3));
  }
}

// ==========================================
// 4. COMPUTATION & CLEAR RECEIPT BREAKDOWN
// ==========================================
function calculatePCTotal() {
  const pcServiceSelect = document.getElementById("pcServiceSelect");
  const unitQuantity = document.getElementById("unitQuantity");
  const clientNameInput = document.getElementById("clientName");
  const clientAddressInput = document.getElementById("clientAddress");

  if (!pcServiceSelect || !unitQuantity) return;

  const serviceBasePrice = parseFloat(pcServiceSelect.value) || 0;
  const quantity = parseInt(unitQuantity.value) || 1;
  const subtotalService = serviceBasePrice * quantity;

  // PATAKARAN SA LOKASYON
  const BASE_DIST = 7.5; 
  const BASE_FEE = 350;  
  const RATE_PER_KM = BASE_FEE / BASE_DIST; // ₱46.6667 per km

  let extraDistanceFee = 0;
  let extraKM = 0;

  if (clientDistanceKM > BASE_DIST) {
    extraKM = clientDistanceKM - BASE_DIST;
    extraDistanceFee = extraKM * RATE_PER_KM;
  }

  const grandTotal = subtotalService + BASE_FEE + extraDistanceFee;
  const selectedService = pcServiceSelect.options[pcServiceSelect.selectedIndex]?.getAttribute("data-name") || "Service";

  if (document.getElementById("receiptRefNo")) {
    document.getElementById("receiptRefNo").textContent = "REF: #" + currentRefNo;
    document.getElementById("receiptClientName").textContent = clientNameInput && clientNameInput.value.trim() !== "" ? clientNameInput.value : "---";
    document.getElementById("receiptAddress").textContent = clientAddressInput && clientAddressInput.value.trim() !== "" ? clientAddressInput.value : "---";

    // 1. Service Cost
    document.getElementById("receiptServiceName").textContent = `${selectedService} (x${quantity}):`;
    document.getElementById("receiptServiceCost").textContent = "₱" + subtotalService.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 2. Base Home Service Fee
    document.getElementById("receiptLocationName").textContent = `Base Home Service Fee standard (${BASE_DIST} km):`;
    document.getElementById("receiptFareCost").textContent = "₱" + BASE_FEE.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 3. Extra Distance & Location Breakdown
    let extraContainer = document.getElementById("receiptExtraContainer");
    const fareRow = document.getElementById("receiptFareCost").parentElement;

    if (!extraContainer) {
      extraContainer = document.createElement("div");
      extraContainer.id = "receiptExtraContainer";
      fareRow.parentNode.insertBefore(extraContainer, fareRow.nextSibling);
    }

    let noteText = "";
    let extraFeeTextColor = "#f59e0b";

    if (clientDistanceKM > BASE_DIST) {
      noteText = `📌 Paalala: Dahil ${clientDistanceKM.toFixed(1)}km ang iyong lokasyon (lagpas sa standard ${BASE_DIST}km), may karagdagang ₱${RATE_PER_KM.toFixed(2)} bawat lumagpas na kilometro.`;
    } else {
      extraFeeTextColor = "#10b981";
      const currentLocDisplay = clientDistanceKM > 0 ? `${clientDistanceKM.toFixed(1)} km` : "N/A";
      noteText = `📌 Paalala: Ang iyong lokasyon (${currentLocDisplay}) ay pasok sa standard distance (≤${BASE_DIST}km) kaya walang karagdagang charge.`;
    }

    extraContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-top: 4px; color: #94a3b8; font-size: 13px;">
        <span>Your location now is:</span>
        <strong>(${clientDistanceKM > 0 ? clientDistanceKM.toFixed(1) + " km" : "Hindi pa na-detect"})</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px; color: ${extraFeeTextColor}; font-weight: bold;">
        <span>+ Extra Distance (+${extraKM.toFixed(1)} km):</span>
        <span>+₱${extraDistanceFee.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div style="font-size: 11px; color: #cbd5e1; font-style: italic; margin-top: 6px; margin-bottom: 8px; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px;">
        ${noteText}
      </div>
    `;

    // 4. TOTAL PAYMENT
    document.getElementById("pcTotalPrice").textContent = "₱" + grandTotal.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

// Event Listeners & Initialization
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
  showSlides(slideIndex); // Simulan ang Slideshow sa pag-load ng page
});

// ==========================================
// 5. BOOKING SUBMIT (CROSS-PLATFORM SAFE)
// ==========================================
function sendPCBooking(event) {
  event.preventDefault();

  if (!hasLocationPermission) {
    alert("⚠️ PAALALA: Pindutin muna ang 'Gamitin ang Aking Live Location' button para ma-detect ang iyong lokasyon bago mag-kumpirma.");
    
    const locBtn = document.getElementById("getLocBtn");
    if (locBtn) {
      locBtn.focus();
      locBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const messengerUsername = "justine.delacorta"; 
  const receiptElement = document.querySelector(".receipt-container");
  if (!receiptElement) return;

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);
  const isInApp = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Messenger") > -1);

  // Android In-App Redirect Fix
  if (isAndroid && isInApp) {
    const currentUrl = window.location.href.replace(/^https?:\/\//, ''); 
    const chromeIntent = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = chromeIntent;
    return;
  }

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
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${SHOP_LAT},${SHOP_LNG}&destination=${clientLat},${clientLng}`;

    const textMsg = encodeURIComponent(`Hi! Magbo-book po ako ng PC Service (#${currentRefNo}).\nName: ${clientName}\nAddress: ${clientAddress}\nDistance: ${distText}\nMap Route: ${gmapsUrl}\nTotal: ${total}`);
    
    // Cross-Platform Universal Messenger Link
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
// 6. SLIDESHOW / GALLERY CONTROLLER
// ==========================================
let slideIndex = 1;

function changeSlide(n) {
  showSlides(slideIndex += n);
}

function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("slide");
  let dots = document.getElementsByClassName("dot");
  if (!slides || slides.length === 0) return;
  
  if (n > slides.length) { slideIndex = 1 }
  if (n < 1) { slideIndex = slides.length }
  
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }
  
  slides[slideIndex-1].style.display = "block";
  if (dots[slideIndex-1]) {
    dots[slideIndex-1].className += " active";
  }
}
