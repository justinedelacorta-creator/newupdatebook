// ==========================================
// 1. CONFIGURATION & SHOP LOCATION
// ==========================================
const SHOP_LAT = 7.0205237;   
const SHOP_LNG = 125.4967342; 

let currentRefNo = "TF-" + Math.floor(1000 + Math.random() * 9000);
let clientDistanceKM = 0;
let clientLat = 0;
let clientLng = 0;
let hasLocationPermission = false;
let mapInstance = null;

// ==========================================
// 2. HELPER FUNCTIONS & DISTANCE FORMULA
// ==========================================
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

      clientDistanceKM = getKilometers(SHOP_LAT, SHOP_LNG, clientLat, clientLng);
      hasLocationPermission = true;

      if (statusTxt) {
        statusTxt.className = "location-status-text location-success";
        statusTxt.innerHTML = `<i class="fa-solid fa-circle-check"></i> Nakuha ang lokasyon! Layo: <strong>${clientDistanceKM.toFixed(2)} km</strong>`;
      }
      
      if (locBtn) locBtn.disabled = false;

      renderClientMap(clientLat, clientLng);
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

function renderClientMap(lat, lng) {
  const mapContainer = document.getElementById("receiptMapContainer");
  const gmapLink = document.getElementById("googleMapsLink");

  if (mapContainer) mapContainer.style.display = "block";

  if (gmapLink) {
    gmapLink.href = `https://www.google.com/maps/dir/?api=1&origin=${SHOP_LAT},${SHOP_LNG}&destination=${lat},${lng}`;
  }

  if (typeof L !== "undefined" && document.getElementById("receiptMap")) {
    if (mapInstance) {
      mapInstance.remove();
    }

    mapInstance = L.map('receiptMap');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance);

    const shopMarker = L.marker([SHOP_LAT, SHOP_LNG]).addTo(mapInstance)
      .bindTooltip("👨‍🔧 Tech Location", { 
        permanent: true, 
        direction: 'top',
        className: 'map-label-tech'
      });

    const clientMarker = L.marker([lat, lng]).addTo(mapInstance)
      .bindTooltip("📍 Client Location", { 
        permanent: true, 
        direction: 'top',
        className: 'map-label-client'
      });

    const latlngs = [
      [SHOP_LAT, SHOP_LNG],
      [lat, lng]
    ];
    L.polyline(latlngs, { color: '#38bdf8', weight: 3, dashArray: '5, 10' }).addTo(mapInstance);

    const group = new L.featureGroup([shopMarker, clientMarker]);
    mapInstance.fitBounds(group.getBounds().pad(0.3));

    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);
  }
}

// ==========================================
// 4. COMPUTATION & RECEIPT BREAKDOWN
// ==========================================
function calculatePCTotal() {
  const pcServiceSelect = document.getElementById("pcServiceSelect");
  const unitQuantity = document.getElementById("unitQuantity");
  const clientAddressInput = document.getElementById("clientAddress");
  const gamesOptionGroup = document.getElementById("gamesOptionGroup");
  const gameQuantityInput = document.getElementById("gameQuantity");
  const windowsFreebieGroup = document.getElementById("windowsFreebieGroup");

  if (!pcServiceSelect || !unitQuantity) return;

  // Kumuha ng value mula sa dropdown
  let serviceBasePrice = parseFloat(pcServiceSelect.value) || 0;
  const quantity = parseInt(unitQuantity.value) || 1;
  const selectedService = pcServiceSelect.options[pcServiceSelect.selectedIndex]?.getAttribute("data-name") || "Pumili ng Serbisyo...";

  const isGamesService = selectedService.includes("Software & Games Installation");
  const isWindowsService = selectedService.includes("Windows Installation");
  const isPCRepairService = selectedService.toLowerCase().includes("pc repair") || selectedService.toLowerCase().includes("troubleshooting");

  // I-override ang rate sa ₱600 kapag PC Repair Service ang napili
  if (isPCRepairService) {
    serviceBasePrice = 600;
  }

  if (gamesOptionGroup) gamesOptionGroup.style.display = isGamesService ? "block" : "none";
  if (windowsFreebieGroup) windowsFreebieGroup.style.display = isWindowsService ? "block" : "none";

  if (serviceBasePrice === 0) {
    if (document.getElementById("receiptRefNo")) {
      document.getElementById("receiptRefNo").textContent = "REF: #" + currentRefNo;
      document.getElementById("receiptAddress").textContent = clientAddressInput && clientAddressInput.value.trim() !== "" ? clientAddressInput.value : "---";

      document.getElementById("receiptServiceName").textContent = "Service Subtotal:";
      document.getElementById("receiptServiceCost").textContent = "₱0.00";

      document.getElementById("receiptLocationName").textContent = "Base Home Service Fee:";
      document.getElementById("receiptFareCost").textContent = "₱0.00";

      const extraContainer = document.getElementById("receiptExtraContainer");
      if (extraContainer) {
        extraContainer.innerHTML = `
          <div class="receipt-note">
            📌 Pumili muna ng serbisyo sa itaas para lumabas ang aktwal na kalkulasyon.
          </div>
        `;
      }

      document.getElementById("pcTotalPrice").textContent = "₱0.00";
    }
    return;
  }

  let subtotalService = 0;
  let serviceLabelText = "";

  if (isGamesService) {
    const gameCount = parseInt(gameQuantityInput.value) || 1;
    subtotalService = (250 * gameCount) * quantity;
    serviceLabelText = `Software & Games (${gameCount} pcs x ₱250, ${quantity} unit/s):`;
  } else if (isWindowsService) {
    subtotalService = serviceBasePrice * quantity;
    serviceLabelText = `Windows Format (w/ FREE MS Office) (x${quantity}):`;
  } else if (isPCRepairService) {
    subtotalService = 600 * quantity;
    serviceLabelText = `PC Repair Service (₱600 x ${quantity}):`;
  } else {
    subtotalService = serviceBasePrice * quantity;
    serviceLabelText = `${selectedService} (x${quantity}):`;
  }

  const BASE_DIST = 7.5; 
  const BASE_FEE = 300; // ₱300 Minimum Distance Fee
  const RATE_PER_KM = BASE_FEE / BASE_DIST;

  let extraDistanceFee = 0;
  let extraKM = 0;

  if (clientDistanceKM > BASE_DIST) {
    extraKM = clientDistanceKM - BASE_DIST;
    extraDistanceFee = extraKM * RATE_PER_KM;
  }

  const grandTotal = subtotalService + BASE_FEE + extraDistanceFee;

  if (document.getElementById("receiptRefNo")) {
    document.getElementById("receiptRefNo").textContent = "REF: #" + currentRefNo;
    document.getElementById("receiptAddress").textContent = clientAddressInput && clientAddressInput.value.trim() !== "" ? clientAddressInput.value : "---";

    document.getElementById("receiptServiceName").textContent = serviceLabelText;
    document.getElementById("receiptServiceCost").textContent = "₱" + subtotalService.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById("receiptLocationName").textContent = `Base Home Service Fee (${BASE_DIST} km):`;
    document.getElementById("receiptFareCost").textContent = "₱" + BASE_FEE.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const extraContainer = document.getElementById("receiptExtraContainer");

    if (extraContainer) {
      let noteText = "";
      let extraColor = (clientDistanceKM > BASE_DIST) ? "#f59e0b" : "#10b981";

      if (clientDistanceKM > BASE_DIST) {
        noteText = `📌 Paalala: Dahil ${clientDistanceKM.toFixed(1)}km ang iyong lokasyon (lagpas sa standard ${BASE_DIST}km), may karagdagang ₱${RATE_PER_KM.toFixed(2)} bawat lumagpas na kilometro.`;
      } else {
        const currentLocDisplay = clientDistanceKM > 0 ? `${clientDistanceKM.toFixed(1)} km` : "N/A";
        noteText = `📌 Paalala: Ang iyong lokasyon (${currentLocDisplay}) ay pasok sa standard distance (≤${BASE_DIST}km) kaya walang karagdagang charge.`;
      }

      extraContainer.innerHTML = `
        <div class="receipt-row">
          <span class="receipt-label">Detected Client Distance:</span>
          <strong class="receipt-value">${clientDistanceKM > 0 ? clientDistanceKM.toFixed(1) + " km" : "Hindi pa na-detect"}</strong>
        </div>
        <div class="receipt-row">
          <span class="receipt-label" style="color: ${extraColor};">+ Extra Distance (+${extraKM.toFixed(1)} km):</span>
          <strong class="receipt-value" style="color: ${extraColor};">+₱${extraDistanceFee.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
        <div class="receipt-note">
          ${noteText}
        </div>
      `;
    }

    document.getElementById("pcTotalPrice").textContent = "₱" + grandTotal.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const elementsToWatch = [
    "pcServiceSelect",
    "unitQuantity",
    "clientAddress",
    "gameQuantity"
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
// 5. ACCURATE DOWNLOAD & REDIRECT (iOS / ANDROID)
// ==========================================
function sendPCBooking(event) {
  event.preventDefault();

  const pcServiceSelect = document.getElementById("pcServiceSelect");
  if (!pcServiceSelect || pcServiceSelect.value === "0") {
    alert("⚠️ PAALALA: Pumili muna ng serbisyo sa dropdown list bago mag-kumpirma.");
    pcServiceSelect.focus();
    return;
  }

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

  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Inihahanda ang Resibo...`;
  submitBtn.disabled = true;

  window.scrollTo(0, receiptElement.offsetTop - 50);

  setTimeout(() => {
    html2canvas(receiptElement, {
      scale: 2, 
      backgroundColor: "#0f172a",
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: receiptElement.offsetWidth,
      height: receiptElement.offsetHeight
    }).then(canvas => {
      
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `Receipt_${currentRefNo}.png`;

      // 1. KUSANG I-DOWNLOAD AGAD ANG FILE
      executeDownload(dataUrl, fileName);

      // 2. IPREPARE ANG MESSENGER REDIRECT
      const clientAddress = document.getElementById("clientAddress") ? document.getElementById("clientAddress").value : "";
      const total = document.getElementById("pcTotalPrice") ? document.getElementById("pcTotalPrice").textContent : "";
      const distText = `${clientDistanceKM.toFixed(2)} km`;
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${SHOP_LAT},${SHOP_LNG}&destination=${clientLat},${clientLng}`;

      const textMsg = encodeURIComponent(`Hi! Magbo-book po ako ng PC Service (#${currentRefNo}).\nAddress: ${clientAddress}\nDistance: ${distText}\nMap Route: ${gmapsUrl}\nTotal: ${total}`);
      const messengerUrl = `https://m.me/${messengerUsername}?text=${textMsg}`;

      const messengerBtn = document.getElementById("proceedMessengerBtn");
      if (messengerBtn) messengerBtn.href = messengerUrl;

      const reDownloadBtn = document.getElementById("downloadReceiptBtn");
      if (reDownloadBtn) {
        reDownloadBtn.onclick = function() {
          executeDownload(dataUrl, fileName);
        };
      }

      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      
      const modal = document.getElementById("receiptModal");
      if (modal) modal.classList.add("active");

    }).catch(err => {
      console.error("Error generating receipt image:", err);
      alert("Nagkaroon ng problema sa pag-download. Direkta ka na naming ililipat sa Messenger.");
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      window.location.href = `https://m.me/${messengerUsername}`;
    });
  }, 350);
}

// Function na accurate para sa Safari (iOS/iPhone) at Chrome (Android)
function executeDownload(dataUrl, fileName) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`<img src="${dataUrl}" style="width:100%; height:auto;" />`);
      newTab.document.title = fileName;
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } else {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function closeReceiptModal() {
  const modal = document.getElementById("receiptModal");
  if (modal) modal.classList.remove("active");
}