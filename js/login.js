/**
 * login.js — Halaman Login (index.html)
 * -----------------------------------------------------------------------------
 * Form login, modal Lupa Password, dan modal Daftar.
 * Membutuhkan data.js dan script.js (dimuat lebih dulu di HTML).
 */

function findUserByEmail(email) {
  return dataPengguna.find(user => user.email.toLowerCase() === email.trim().toLowerCase());
}

function initLoginPage() {
  const form = $('#loginForm');
  const emailInput = $('#loginEmail');
  const passwordInput = $('#loginPassword');
  enableLiveValidation(form);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const user = findUserByEmail(emailInput.value);
    if (!user || user.password !== passwordInput.value) {
      await showConfirm({
        type: 'error',
        title: 'Login gagal',
        text: 'Email/password yang anda masukkan salah. Silakan periksa kembali.',
        okText: 'Coba Lagi',
        showCancel: false
      });
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    saveSession(user, $('#loginRemember').checked);
    showMessage('success', `Login berhasil. Selamat datang, ${user.nama}!`);
    setTimeout(() => location.replace('dashboard.html'), 800);
  });

  $('#fillDemo').addEventListener('click', () => {
    emailInput.value = 'rina@ut.ac.id';
    passwordInput.value = 'rina123';
    validateField(emailInput);
    validateField(passwordInput);
  });

  initForgotPasswordModal(emailInput);
  initRegisterModal(emailInput, passwordInput);
}

function initForgotPasswordModal(loginEmailInput) {
  const dialog = $('#forgotModal');
  const form = $('#forgotForm');
  const emailInput = $('#forgotEmail');
  enableLiveValidation(form);

  const showStep = step => {
    $$('[data-step]', dialog).forEach(el => { el.hidden = el.dataset.step !== step; });
  };

  // Email yang sudah diketik di form login langsung dipakai.
  $('[data-modal-open="forgotModal"]').addEventListener('click', () => {
    emailInput.value = loginEmailInput.value;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    if (!findUserByEmail(emailInput.value)) {
      setFieldError(emailInput, 'Email tidak terdaftar di SITTA');
      return;
    }
    $('#forgotSentTo').textContent = emailInput.value.trim();
    showStep('done');
  });

  dialog.addEventListener('close', () => {
    resetForm(form);
    showStep('form');
  });
}

function initRegisterModal(loginEmailInput, loginPasswordInput) {
  const dialog = $('#registerModal');
  const form = $('#registerForm');
  enableLiveValidation(form);
  dialog.addEventListener('close', () => resetForm(form));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const data = Object.fromEntries(new FormData(form));
    if (findUserByEmail(data.email)) {
      setFieldError($('#regEmail'), 'Email sudah terdaftar, silakan login');
      return;
    }

    const newUser = {
      id: dataPengguna.length + 1,
      nama: data.nama.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      lokasi: data.lokasi.trim()
    };
    dataPengguna.push(newUser);
    saveToStorage(STORAGE_KEY.users, [...loadFromStorage(STORAGE_KEY.users, []), newUser]);

    dialog.close();
    showMessage('success', 'Pendaftaran berhasil! Silakan login dengan akun baru Anda.');
    loginEmailInput.value = newUser.email;
    loginPasswordInput.focus();
  });
}

onPageReady(initLoginPage);
