import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { FIREBASE_CONFIG } from "./config.js";

const firebaseConfig = FIREBASE_CONFIG;

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

const PRICING = {
  Beginner: { 2: 9999, 3: 14999, 4: 19999 },
  Intermediate: { 2: 14999, 3: 22499, 4: 29999 },
  TINKERING_KIT: 10000,
  EXPERIMENT_MONTH: 9999
};

const CLASS_MAPPING = { 2: 10, 3: 15, 4: 20 };

function calculatePrice(program, hours, hasKit = false, hasMonth = false) {
  let total = 0;
  if (program && PRICING[program]) {
    total = PRICING[program][hours] || PRICING[program][2];
  }

  if (hasKit) total += PRICING.TINKERING_KIT;
  if (hasMonth) total += PRICING.EXPERIMENT_MONTH;

  return total;
}

function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

function updatePriceDisplay() {
  const selectedProgram = document.querySelector('input[name="programDivision"]:checked');
  const selectedHours = document.querySelector('input[name="tinkeringHours"]:checked');
  const hasKit = document.getElementById('check-kit')?.checked || false;
  const hasMonth = document.getElementById('check-month')?.checked || false;

  const program = selectedProgram ? selectedProgram.value : null;
  const hours = selectedHours ? parseInt(selectedHours.value) : 2;

  const price = calculatePrice(program, hours, hasKit, hasMonth);
  const classes = CLASS_MAPPING[hours] || 10;

  const summaryProgram = document.getElementById('summaryProgram');
  const summaryClasses = document.getElementById('summaryClasses');
  const summaryPrice = document.getElementById('summaryPrice');

  if (summaryProgram) {
    if (program) {
      let label = `${program} Level`;
      if (hasKit && hasMonth) label += " + Kit + Exp Month";
      else if (hasKit) label += " + Kit";
      else if (hasMonth) label += " + Exp Month";
      summaryProgram.textContent = label;
    } else {
      let label = "";
      if (hasKit && hasMonth) label = "Kit + Exp Month";
      else if (hasKit) label = "Tinkering Kit";
      else if (hasMonth) label = "Experiment Month";
      summaryProgram.textContent = label || "-";
    }
  }

  if (summaryClasses) {
    summaryClasses.textContent = program ? `${classes} Classes` : (hasMonth ? "10 sessions" : "-");
  }

  if (summaryPrice) {
    summaryPrice.textContent = formatCurrency(price);
  }

  // Update mobile bar
  const mobilePrice = document.getElementById('mobileTotalPrice');
  if (mobilePrice) mobilePrice.textContent = formatCurrency(price);

  // Update selection cards
  const beginnerCardPrice = calculatePrice('Beginner', hours, false, false);
  const intermediateCardPrice = calculatePrice('Intermediate', hours, false, false);
  const classText = `for ${classes} classes`;

  const begPriceEl = document.getElementById('price-beginner');
  const intPriceEl = document.getElementById('price-intermediate');
  if (begPriceEl) {
    begPriceEl.textContent = formatCurrency(beginnerCardPrice);
    const label = begPriceEl.parentElement.querySelector('span:last-child');
    if (label) label.textContent = classText;
  }
  if (intPriceEl) {
    intPriceEl.textContent = formatCurrency(intermediateCardPrice);
    const label = intPriceEl.parentElement.querySelector('span:last-child');
    if (label) label.textContent = classText;
  }
}

// Mobile bar scroll behavior
window.addEventListener('scroll', () => {
  const bar = document.getElementById('mobilePriceBar');
  if (bar) {
    if (window.scrollY > 300) {
      bar.classList.remove('translate-y-full');
    } else {
      bar.classList.add('translate-y-full');
    }
  }
});

function suggestProgramFromGrade(grade) {
  const gradeNum = parseInt(grade);
  let suggestedProgram = null;
  let hint = '';

  // Logical allotment
  if (gradeNum >= 3 && gradeNum <= 5) {
    suggestedProgram = 'Beginner';
    hint = 'Beginner Level is recommended for your grade';
  } else if (gradeNum >= 6 && gradeNum <= 12) {
    suggestedProgram = 'Intermediate';
    hint = 'Intermediate program is recommended for higher grades';
  }

  // Update badges
  const beginnerBadge = document.getElementById('badge-beginner');
  const intermediateBadge = document.getElementById('badge-intermediate');
  if (beginnerBadge) beginnerBadge.classList.add('hidden');
  if (intermediateBadge) intermediateBadge.classList.add('hidden');

  const gradeSelectHint = document.getElementById('gradeSelectHint');
  const gradeSelectHintText = document.getElementById('gradeSelectHintText');
  const gradeHint = document.getElementById('gradeHint');
  const gradeHintText = document.getElementById('gradeHintText');

  // Update select-level hint
  if (gradeSelectHint && gradeSelectHintText) {
    if (hint) {
      gradeSelectHintText.textContent = hint;
      gradeSelectHint.classList.remove('hidden');
    } else {
      gradeSelectHint.classList.add('hidden');
    }
  }

  // Update block-level hint
  if (gradeHint && gradeHintText) {
    if (hint) {
      gradeHintText.textContent = hint;
      gradeHint.classList.remove('hidden');
    } else {
      gradeHint.classList.add('hidden');
    }
  }

  if (suggestedProgram) {
    const radio = document.querySelector(`input[name="programDivision"][value="${suggestedProgram}"]`);
    if (radio) {
      radio.checked = true;
      // Show appropriate badge
      const badge = document.getElementById(`badge-${suggestedProgram.toLowerCase()}`);
      if (badge) badge.classList.remove('hidden');

      radio.dispatchEvent(new Event('change'));
    }
  }

  updatePriceDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
  // Photo preview
  const photoFileInput = document.getElementById('photoFile');
  if (photoFileInput) {
    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const previewContainer = document.getElementById('photoPreviewContainer');
      const preview = document.getElementById('photoPreview');
      const photoIcon = document.getElementById('photoIcon');
      const photoText = document.getElementById('photoText');

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          previewContainer.classList.remove('hidden');
          previewContainer.style.animation = 'bounce 0.5s ease';
          photoIcon.textContent = "check_circle";
          photoIcon.className = "material-symbols-outlined text-4xl text-success mb-3 transition-colors";
          photoText.textContent = file.name;
          photoText.className = "text-sm font-bold text-success";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.classList.add('hidden');
        preview.src = '';
      }
    });
  }

  // Grade change
  const gradeSelect = document.getElementById('studyGrade');
  if (gradeSelect) {
    gradeSelect.addEventListener('change', (e) => {
      suggestProgramFromGrade(e.target.value);
    });
  }

  // Price update listeners
  document.querySelectorAll('input[name="programDivision"], input[name="tinkeringHours"]').forEach(radio => {
    radio.addEventListener('change', updatePriceDisplay);
  });

  const checkKit = document.getElementById('check-kit');
  const checkMonth = document.getElementById('check-month');
  if (checkKit) checkKit.addEventListener('change', updatePriceDisplay);
  if (checkMonth) checkMonth.addEventListener('change', updatePriceDisplay);

  // Setup progress tracking
  const requiredFields = [
    'studentName', 'dob', 'schoolName', 'studyGrade',
    'parentName', 'parentPhone', 'email', 'address',
    'expRobotics', 'expProgramming', 'exp3D'
  ];

  function updateFormProgress() {
    let filled = 0;

    // Check text/selects
    requiredFields.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value.trim() !== "") filled++;
    });

    // Check program radios
    if (document.querySelector('input[name="programDivision"]:checked')) filled++;

    // Total steps (11 fields + 1 program)
    const total = requiredFields.length + 1;
    const progress = (filled / total) * 100;

    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${progress}%`;
  }

  // Attach listeners for progress
  [...requiredFields, 'programDivision'].forEach(idOrName => {
    const els = idOrName === 'programDivision'
      ? document.querySelectorAll(`input[name="${idOrName}"]`)
      : [document.getElementById(idOrName)];

    els.forEach(el => {
      if (el) {
        el.addEventListener('input', updateFormProgress);
        el.addEventListener('change', updateFormProgress);
      }
    });
  });

  // Initialize
  updatePriceDisplay();
  updateFormProgress();

  // Handle mobile scroll
  window.dispatchEvent(new Event('scroll'));

  // Form submission
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(reader.result);
      };
      reader.onerror = error => reject(error);
    });
  };

  const form = document.getElementById('enrollment-form');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('btn-submit');
      submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> Processing...`;
      submitBtn.disabled = true;

      let studentPhotoBase64 = null;
      if (photoFileInput && photoFileInput.files && photoFileInput.files[0]) {
        try {
          studentPhotoBase64 = await getBase64(photoFileInput.files[0]);
        } catch (err) {
          console.error("Failed to parse image file", err);
        }
      }

      const selectedProgram = document.querySelector('input[name="programDivision"]:checked');
      const selectedHours = document.querySelector('input[name="tinkeringHours"]:checked');
      const selectedFreq = document.querySelector('input[name="paymentFreq"]:checked');

      const programName = selectedProgram ? selectedProgram.value : '';
      const hours = selectedHours ? parseInt(selectedHours.value) : 2;
      const freq = selectedFreq ? selectedFreq.value : 'Quarterly';

      const hasKit = document.getElementById('check-kit')?.checked || false;
      const hasMonth = document.getElementById('check-month')?.checked || false;
      const totalPrice = calculatePrice(programName, hours, hasKit, hasMonth);

      const enrollmentData = {
        studentName: document.getElementById('studentName').value.trim(),
        dob: document.getElementById('dob').value,
        tshirt: document.getElementById('tshirt').value,
        schoolName: document.getElementById('schoolName').value.trim(),
        studyGrade: document.getElementById('studyGrade').value,
        photoData: studentPhotoBase64,
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        country: document.getElementById('country').value,
        companyName: document.getElementById('companyName') ? document.getElementById('companyName').value.trim() : '',
        gstNumber: document.getElementById('gstNumber') ? document.getElementById('gstNumber').value.trim().toUpperCase() : '',
        expRobotics: document.getElementById('expRobotics').value,
        expProgramming: document.getElementById('expProgramming').value,
        exp3D: document.getElementById('exp3D').value,
        program: programName,
        tinkeringHours: hours,
        paymentFrequency: freq,
        tinkeringKit: hasKit ? "Yes" : "No",
        experimentMonth: hasMonth ? "Yes" : "No",
        totalPrice: totalPrice,
        timestamp: serverTimestamp()
      };

      try {
        sessionStorage.setItem('pendingEnrollment', JSON.stringify(enrollmentData));
      } catch (error) {
        console.error("Error saving to session storage:", error);
      }

      let itemDescription = programName ? `${programName} Level` : "";
      if (hasKit && hasMonth) itemDescription += (itemDescription ? " + " : "") + "Kit & Exp Month";
      else if (hasKit) itemDescription += (itemDescription ? " + " : "") + "Tinkering Kit";
      else if (hasMonth) itemDescription += (itemDescription ? " + " : "") + "Exp Month";

      const params = new URLSearchParams({
        name: enrollmentData.parentName,
        email: enrollmentData.email,
        phone: enrollmentData.parentPhone,
        address: enrollmentData.address,
        company: enrollmentData.companyName || '',
        gst: enrollmentData.gstNumber || '',
        program: itemDescription,
        hours: enrollmentData.tinkeringHours,
        amount: enrollmentData.totalPrice,
        tshirt: enrollmentData.tshirt,
        freq: freq
      });

      window.location.href = `checkout.html?${params.toString()}`;
    });
  }
});
