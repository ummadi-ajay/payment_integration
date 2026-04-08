import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";
import { getDatabase, ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { FIREBASE_CONFIG, RAZORPAY_KEY } from "./config.js";

const firebaseConfig = FIREBASE_CONFIG;

let db = null;
let analytics = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  analytics = getAnalytics(app);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

// ===== State =====
let orderData = {
  name: '', email: '', phone: '', address: '', companyName: '', gstNumber: '',
  itemName: '', unitPrice: 0,
  subtotal: 0, tax: 0, grandTotal: 0,
  paymentId: '', billNumber: '',
  tshirt: '', paymentFreq: 'Quarterly', country: 'India'
};

document.addEventListener('DOMContentLoaded', () => {
  // Auto-fill form from Enrollment redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('name')) {
    const nameEl = document.getElementById('fullName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    if (nameEl) nameEl.value = urlParams.get('name');
    if (emailEl) emailEl.value = urlParams.get('email');
    if (phoneEl) phoneEl.value = urlParams.get('phone');

    const prog = urlParams.get('program');
    const amount = parseInt(urlParams.get('amount')) || 0;
    const hours = parseInt(urlParams.get('hours')) || 2;
    orderData.tshirt = urlParams.get('tshirt') || '';
    orderData.paymentFreq = urlParams.get('freq') || 'Quarterly';
    orderData.address = urlParams.get('address') || '';
    orderData.companyName = urlParams.get('company') || '';
    orderData.gstNumber = urlParams.get('gst') || '';
    orderData.country = urlParams.get('country') || 'India';
    
    if (document.getElementById('address')) document.getElementById('address').value = orderData.address;
    if (document.getElementById('companyName')) document.getElementById('companyName').value = orderData.companyName;
    if (document.getElementById('gstNumber')) document.getElementById('gstNumber').value = orderData.gstNumber;

    if (prog && amount > 0) {
      let months = 1;
      const isFullProgram = prog.includes('Level');
      
      if (isFullProgram) {
        if (orderData.paymentFreq === 'Quarterly') months = 3;
        else if (orderData.paymentFreq === 'Half-Yearly') months = 6;
        else if (orderData.paymentFreq === 'Yearly') months = 12;
      }

      const baseClassesPerMonth = (hours === 3 ? 15 : hours === 4 ? 20 : 10);
      const totalClasses = baseClassesPerMonth * months;
      
      let itemTitle = "";
      if (isFullProgram) {
        itemTitle = `${prog} (${totalClasses} Classes)`;
      } else {
        // Handle standalone Kit or Experiment Month
        itemTitle = prog;
        if (prog.includes('Month')) itemTitle += ` (10 Sessions)`;
      }
      
      const itemValue = `${itemTitle}|${amount}`;

      const itemSelect = document.getElementById('item');
      if (itemSelect) {
        itemSelect.innerHTML = '';
        const customOption = new Option(`${itemTitle} — ₹${amount.toLocaleString('en-IN')}`, itemValue, true, true);
        itemSelect.appendChild(customOption);
        itemSelect.value = itemValue;
        itemSelect.disabled = true;
      }

      // Show program info badge
      const badge = document.getElementById('program-info-badge');
      const badgeText = document.getElementById('program-info-text');
      if (badge && badgeText) {
        badgeText.textContent = `✓ Auto-filled from enrollment: ${itemTitle}`;
        badge.classList.remove('hidden');
      }
    }
  }

  setupFormListeners();
  setupButtons();
  updatePrice();
});

// ===== Price Calculation =====
function setupFormListeners() {
  const itemSelect = document.getElementById('item');
  if (itemSelect) itemSelect.addEventListener('change', updatePrice);
}

function updatePrice() {
  const itemSelect = document.getElementById('item');
  if (!itemSelect) return;

  let unitPrice = 0;
  let itemName = '';

  if (itemSelect.value) {
    const parts = itemSelect.value.split('|');
    itemName = parts[0];
    unitPrice = parseInt(parts[1]) || 0;
  }

  const displayTotal = document.getElementById('display-total');
  if (displayTotal) displayTotal.textContent = formatCurrency(unitPrice);

  orderData.itemName = itemName;
  orderData.unitPrice = unitPrice;
  orderData.subtotal = unitPrice;
}

// ===== Button Handlers =====
function setupButtons() {
  const btnProceed = document.getElementById('btn-proceed');
  const btnBack = document.getElementById('btn-back');
  const btnPay = document.getElementById('btn-pay');
  const btnPrint = document.getElementById('btn-print');
  const btnNew = document.getElementById('btn-new');

  if (btnProceed) btnProceed.addEventListener('click', (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    orderData.name = document.getElementById('fullName').value.trim();
    orderData.email = document.getElementById('email').value.trim();
    orderData.phone = document.getElementById('phone').value.trim();
    orderData.address = document.getElementById('address').value.trim();
    orderData.companyName = document.getElementById('companyName') ? document.getElementById('companyName').value.trim() : '';
    orderData.gstNumber = document.getElementById('gstNumber') ? document.getElementById('gstNumber').value.trim().toUpperCase() : '';

    const tax = Math.round(orderData.subtotal * 0.18);
    orderData.tax = tax;
    orderData.grandTotal = orderData.subtotal + tax;

    setEl('conf-name', orderData.name);
    setEl('conf-email', orderData.email);
    setEl('conf-address', orderData.address);
    setEl('conf-item-name', orderData.itemName);
    setEl('conf-item-qty', '1 enrollment');
    setEl('conf-item-price', formatCurrency(orderData.subtotal));
    setEl('conf-subtotal', formatCurrency(orderData.subtotal));
    setEl('conf-tax', formatCurrency(orderData.tax));
    setEl('conf-grand-total', formatCurrency(orderData.grandTotal));

    goToStep(2);
  });

  if (btnBack) btnBack.addEventListener('click', () => goToStep(1));
  if (btnPay) btnPay.addEventListener('click', () => openRazorpay());
  if (btnPrint) btnPrint.addEventListener('click', () => window.print());
  if (btnNew) btnNew.addEventListener('click', () => {
    const form = document.getElementById('customer-form');
    if (form) form.reset();
    goToStep(1);
  });
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function validateForm() {
  let valid = true;
  const fields = ['fullName', 'email', 'phone', 'address'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add('!border-red-400');
      el.classList.remove('border-transparent');
      valid = false;
    } else {
      el.classList.remove('!border-red-400');
    }
  });
  if (!valid) {
    // Scroll to first error
    const first = document.querySelector('.\\!border-red-400');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return valid;
}

function goToStep(num) {
  document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
  const targetSection = document.getElementById('step-' + num);
  if (targetSection) targetSection.classList.add('active');

  for (let i = 1; i <= 3; i++) {
    const bar = document.getElementById('prog-bar-' + i);
    const prog = document.getElementById('prog-' + i);
    if (!bar || !prog) continue;
    const span = prog.querySelector('span');

    if (i <= num) {
      bar.style.background = 'linear-gradient(90deg, #4f46e5, #a855f7)';
      if (span) { span.classList.remove('text-slate-400'); span.classList.add('text-primary'); }
    } else {
      bar.style.background = '#e2e8f0';
      if (span) { span.classList.add('text-slate-400'); span.classList.remove('text-primary'); }
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Razorpay & Firebase Storage =====
async function saveOrderToFirebase() {
  if (!db) return;
  try {
    const ordersRef = ref(db, 'orders');
    await push(ordersRef, {
      ...orderData,
      timestamp: serverTimestamp(),
      status: 'PAID'
    });
    
    const pendingJson = sessionStorage.getItem('pendingEnrollment');
    if (pendingJson) {
      const pendingEnrollment = JSON.parse(pendingJson);
      pendingEnrollment.paymentId = orderData.paymentId;
      pendingEnrollment.status = 'PAID';
      
      const enrollmentsRef = ref(db, 'enrollments');
      await push(enrollmentsRef, pendingEnrollment);
      sessionStorage.removeItem('pendingEnrollment');
    }
  } catch (e) {
    console.error("Firebase Save Error:", e);
  }
}


function openRazorpay() {
  if (!RAZORPAY_KEY) {
    const btnPay = document.getElementById('btn-pay');
    if (btnPay) {
      btnPay.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">sync</span> Processing...';
      btnPay.disabled = true;
    }
    
    setTimeout(() => {
      orderData.paymentId = 'pay_DEMO_' + Date.now();
      saveOrderToFirebase();
      generateBill();
      goToStep(3);
    }, 1500);
    return;
  }

  const options = {
    key: RAZORPAY_KEY,
    amount: orderData.grandTotal * 100,
    currency: 'INR',
    name: 'MakerWorks Lab',
    description: orderData.itemName,
    prefill: { name: orderData.name, email: orderData.email, contact: orderData.phone },
    theme: { color: '#4f46e5' },
    handler: function (response) {
      orderData.paymentId = response.razorpay_payment_id;
      saveOrderToFirebase();
      generateBill();
      goToStep(3);
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

function generateBill() {
  const now = new Date();
  orderData.billNumber = 'BILL-' + now.getFullYear() + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');

  const dueDate = new Date();
  dueDate.setDate(now.getDate() + 14);

  const dateOpts = { year: 'numeric', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-IN', dateOpts);
  const dueDateStr = dueDate.toLocaleDateString('en-IN', dateOpts);

  // Extract class count from item name
  const classMatch = orderData.itemName.match(/\((\d+)\s*Classes?\)/i);
  const classCount = classMatch ? classMatch[1] : '—';

  setEl('bill-number', orderData.billNumber);
  setEl('bill-bot-no', orderData.billNumber);
  setEl('bill-date', dateStr);
  setEl('bill-bot-date', dateStr);
  setEl('bill-due-date', dueDateStr);

  setEl('bill-name', orderData.name);
  setEl('bill-bot-name', orderData.name);
  setEl('bill-email', orderData.email);
  setEl('bill-phone', orderData.phone);
  setEl('bill-address', orderData.address || '');

  const billCompanyEl = document.getElementById('bill-company');
  const billGstEl = document.getElementById('bill-gst');
  const billGstVal = document.getElementById('bill-gst-val');
  
  if (billCompanyEl) {
    if (orderData.companyName) {
      billCompanyEl.textContent = orderData.companyName;
      billCompanyEl.classList.remove('hidden');
    } else {
      billCompanyEl.classList.add('hidden');
    }
  }
  
  if (billGstEl && billGstVal) {
    if (orderData.gstNumber) {
      billGstVal.textContent = orderData.gstNumber;
      billGstEl.classList.remove('hidden');
    } else {
      billGstEl.classList.add('hidden');
    }
  }

  // Add T-shirt and Frequency to Bill To section if elements exist
  const billToBox = document.querySelector('.bg-indigo-50');
  if (billToBox) {
    // Check if we already added these to avoid duplicates if generateBill is called twice
    if (!document.getElementById('bill-tshirt-row')) {
      const extraInfo = document.createElement('div');
      extraInfo.id = 'bill-tshirt-row';
      extraInfo.className = 'mt-2 pt-2 border-t border-indigo-100/50 space-y-0.5';
      extraInfo.innerHTML = `
        <p><strong>T-Shirt Size:</strong> ${orderData.tshirt || '—'}</p>
        <p><strong>Payment Plan:</strong> ${orderData.paymentFreq || 'Quarterly'}</p>
      `;
      billToBox.appendChild(extraInfo);
    }
  }

  const subtotal = orderData.subtotal;
  const halfTax = orderData.tax / 2;

  const billItems = document.getElementById('bill-items');
  if (billItems) {
    billItems.innerHTML = `
      <tr class="bg-primary/5 border-b border-slate-100">
        <td class="p-3">
          <p class="font-bold text-slate-800">${orderData.itemName}</p>
          <p class="text-[0.6rem] text-slate-400 mt-1 uppercase tracking-wider">Ref: ${orderData.paymentId || '—'}</p>
        </td>
        <td class="p-3 text-center text-slate-700 font-medium">${classCount}</td>
        <td class="p-3 text-right text-slate-700 font-medium">${formatCurrency(subtotal)}</td>
        <td class="p-3 text-right font-black text-slate-900">${formatCurrency(orderData.grandTotal)}</td>
      </tr>`;
  }

  setEl('bill-subtotal', formatCurrency(subtotal));
  setEl('bill-tax', formatCurrency(orderData.tax));
  setEl('bill-grand-total', formatCurrency(orderData.grandTotal));
  setEl('bill-words', numberToWords(orderData.grandTotal) + " RUPEES ONLY");
}

function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  num = Math.floor(Math.abs(num));
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim();
}

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
