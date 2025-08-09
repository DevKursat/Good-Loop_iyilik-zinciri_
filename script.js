import 'buffer';
import 'process';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, getCurrentUser, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import amplifyconfiguration from './src/amplifyconfiguration.json';
import { getBasePath } from './src/utils.js';

Amplify.configure(amplifyconfiguration);



// --- Route Protection for Protected Pages ---
(async () => {
    const currentPath = window.location.pathname;
    const isPublicPage = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath.includes('verify.html') || currentPath.includes('forgot-password.html');

    // If we are on a protected page, check for a session.
    if (!isPublicPage) {
        try {
            // This will throw an error if the user is not authenticated.
            await getCurrentUser();
        } catch (error) {
            // No session, redirect to login.
            window.location.href = getBasePath() + 'index.html';
        }
    }
})();




// --- Logic for index.html (Login/Signup Page) ---
if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
    const container = document.getElementById('auth-container-animated');
    const signInForm = document.querySelector('.form-container.sign-in');
    const signUpForm = document.querySelector('.form-container.sign-up');

    // --- Device-specific form toggling ---
    if (window.innerWidth <= 768) {
        // --- MOBILE ---
        const toggleContainer = document.querySelector('.toggle-container');
        if (toggleContainer) {
            toggleContainer.remove(); // Remove the element entirely on mobile
        }

        const showLoginMobileBtn = document.getElementById('show-login-mobile');
        const showSignupMobileBtn = document.getElementById('show-signup-mobile');

        signInForm.style.display = 'flex';
        signUpForm.style.display = 'none';

        if (showSignupMobileBtn) {
            showSignupMobileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signInForm.style.display = 'none';
                signUpForm.style.display = 'flex';
            });
        }
        if (showLoginMobileBtn) {
            showLoginMobileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signInForm.style.display = 'flex';
                signUpForm.style.display = 'none';
            });
        }
    } else {
        // --- DESKTOP ---
        const registerBtn = document.getElementById('register');
        const loginBtn = document.getElementById('login');
        if (registerBtn) registerBtn.addEventListener('click', () => container.classList.add('active'));
        if (loginBtn) loginBtn.addEventListener('click', () => container.classList.remove('active'));
    }

    // --- Signup Logic ---
    const signupPasswordInput = document.getElementById('signup-password');
    const strengthMeterContainer = document.getElementById('strength-meter-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const signupFormEl = document.getElementById('signup-form');

    if (signupPasswordInput) {
        strengthText.textContent = "Kayıt Ol";
        signupPasswordInput.addEventListener('input', () => {
            const password = signupPasswordInput.value;
            const requirements = [
                { regex: /.{8,}/, message: "En az 8 karakter" },
                { regex: /[A-Z]/, message: "Büyük harf (A-Z)" },
                { regex: /[a-z]/, message: "Küçük harf (a-z)" },
                { regex: /[0-9]/, message: "Sayı (0-9)" },
                { regex: /[!@#$%^&*]/, message: "Özel karakter (!@#$%^&*)" }
            ];
            if (password.length === 0) {
                strengthText.textContent = "Kayıt Ol";
                strengthMeterContainer.classList.remove('transformed');
                strengthBar.style.width = '0%';
                strengthBar.className = 'strength-bar';
                return;
            }
            let strength = 0;
            let firstUnmetRequirement = null;
            requirements.forEach(req => {
                if (req.regex.test(password)) strength++;
                else if (!firstUnmetRequirement) firstUnmetRequirement = req.message;
            });
            const strengthPercentage = (strength / requirements.length) * 100;
            strengthBar.style.width = `${strengthPercentage}%`;
            if (strength === requirements.length) {
                strengthText.textContent = "Kayıt Ol";
                strengthMeterContainer.classList.add('transformed');
            } else {
                strengthText.textContent = `${strength}/${requirements.length}: ${firstUnmetRequirement || ''}`;
                strengthMeterContainer.classList.remove('transformed');
            }
            strengthBar.className = 'strength-bar';
            if (strengthPercentage === 100) strengthBar.classList.add('strong');
            else if (strengthPercentage >= 60) strengthBar.classList.add('medium');
            else strengthBar.classList.add('weak');
        });
        strengthMeterContainer.addEventListener('click', () => {
            if (strengthMeterContainer.classList.contains('transformed')) {
                signupFormEl.requestSubmit();
            }
        });
    }

    // --- Login Logic ---
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButtonContainer = document.getElementById('login-button-container');
    const loginFormEl = document.getElementById('login-form');

    function validateLoginInputs() {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        loginButtonContainer.classList.toggle('transformed', email.length > 0 && password.length > 0);
    }
    if (loginEmailInput && loginPasswordInput) {
        loginEmailInput.addEventListener('input', validateLoginInputs);
        loginPasswordInput.addEventListener('input', validateLoginInputs);
    }
    if (loginButtonContainer) {
        loginButtonContainer.addEventListener('click', () => {
            if (loginButtonContainer.classList.contains('transformed')) {
                loginFormEl.requestSubmit();
            }
        });
    }

    // --- Form Submissions ---
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginEmailInput.value;
            const password = loginPasswordInput.value;

            try {
                await signIn({ username, password });
                // After successful sign-in, get user attributes to decide the redirect.
                const { attributes } = await getCurrentUser();
                const isProfileComplete = attributes['custom:setup_complete'] && attributes['custom:setup_complete'].toLowerCase() === 'evet';

                if (isProfileComplete) {
                    window.location.href = `${getBasePath()}home.html`;
                } else {
                    window.location.href = `${getBasePath()}profile-setup.html`;
                }

            } catch (error) {
                console.error('Giriş hatası:', error);
                loginPasswordInput.classList.remove('input-error'); // Clear previous errors

                if (error.name === 'UserNotConfirmedException') {
                    window.location.href = `${getBasePath()}verify.html?email=${encodeURIComponent(username)}`;
                } else if (error.name === 'NotAuthorizedException') {
                    loginPasswordInput.classList.add('input-error');
                    setTimeout(() => loginPasswordInput.classList.remove('input-error'), 500);
                    alert('Kullanıcı adı veya şifre hatalı.');
                } else {
                    alert(error.message);
                }
            }
        });
    }
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = signupPasswordInput.value;
            try {
                await signUp({ username: email, password, attributes: { email } });
                alert('Hesap başarıyla oluşturuldu! Doğrulama kodu e-postana gönderildi. Spam (gereksiz) klasörünü kontrol etmeyi unutma.');
                window.location.href = `${getBasePath()}verify.html?email=${encodeURIComponent(email)}`;
            } catch (error) {
                console.error('Kayıt hatası:', error);
                alert(error.message);
            }
        });
    }
}

// --- Logic for verify.html ---
if (window.location.pathname.includes('verify.html')) {
    (async () => {
        const { confirmSignUp, resendSignUpCode } = await import('aws-amplify/auth');
        const emailDisplay = document.getElementById('verify-email-display');
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        if (emailFromUrl) emailDisplay.textContent = emailFromUrl;

        document.getElementById('verify-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('verification-code').value;
            if (!emailFromUrl || !code) return alert('E-posta veya doğrulama kodu eksik.');
            try {
                await confirmSignUp({ username: emailFromUrl, confirmationCode: code });
                alert('E-posta başarıyla doğrulandı! Lütfen giriş yapın.');
                window.location.href = `${getBasePath()}index.html`;
            } catch (error) {
                console.error('Doğrulama hatası:', error);
                alert(error.message);
            }
        });

        const resendContainer = document.getElementById('resend-code-container');
        const securityMessages = [
            "Bu sayfa tamamen güvenlidir.",
            "E-posta ulaşmadıysa spam (gereksiz) klasörünüzü kontrol edin."
        ];
        let messageIndex = 0;

        function setupResendButton() {
            resendContainer.innerHTML = `
            <div id="resend-code-progress"></div>
            <div id="resend-code-text"></div>
        `;
            const progressEl = document.getElementById('resend-code-progress');
            const textEl = document.getElementById('resend-code-text');
            
            let countdown = 30; // Countdown changed to 30 seconds
            resendContainer.classList.remove('ready');
            progressEl.style.transition = 'none'; // Disable transition for immediate reset
            progressEl.style.width = '0%';
            
            const interval = setInterval(() => {
                countdown--;
                const progressPercentage = ((30 - countdown) / 30) * 100;
                progressEl.style.transition = 'width 1s linear'; // Re-enable for smooth progress
                progressEl.style.width = `${progressPercentage}%`;
                textEl.textContent = `TEKRAR GÖNDER (${countdown}s)`;

                if (countdown <= 0) {
                    clearInterval(interval); 
                    resendContainer.classList.add('ready');
                    textEl.textContent = 'KODU TEKRAR GÖNDER';
                }
            }, 1000);
        }

        resendContainer.addEventListener('click', async () => {
            if (resendContainer.classList.contains('ready')) {
                if (!emailFromUrl) return alert('E-posta adresi bulunamadı.');
                try {
                    await resendSignUpCode({ username: emailFromUrl });
                    alert('Doğrulama kodu tekrar gönderildi. Spam (gereksiz) klasörünü kontrol etmeyi unutma.');
                    setupResendButton(); // Restart timer
                } catch (error) {
                    console.error('Kodu tekrar gönderme hatası:', error);
                    alert(error.message);
                }
            } else {
                alert(securityMessages[messageIndex]); // Changed to alert
                messageIndex = (messageIndex + 1) % securityMessages.length;
            }
        });

        setupResendButton(); // Initial setup
    })();
}

// --- Logic for forgot-password.html ---
if (window.location.pathname.includes('forgot-password.html')) {
    (async () => { const sendCodeForm = document.getElementById('send-code-form'); const resetPasswordForm = document.getElementById('reset-password-form'); const emailInput = document.getElementById('reset-email'); sendCodeForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await resetPassword({ username: emailInput.value }); alert('Sıfırlama kodu e-postana gönderildi. Spam (gereksiz) klasörünü kontrol etmeyi unutma.'); // Switch forms by toggling the 'hidden' class, which is the correct way sendCodeForm.classList.add('hidden'); resetPasswordForm.classList.remove('hidden'); } catch (error) { console.error('Şifre sıfırlama hatası:', error); if (error.name === 'UserNotConfirmedException' || error.name === 'InvalidParameterException') { const { resendSignUpCode } = await import('aws-amplify/auth'); try { await resendSignUpCode({ username: emailInput.value }); alert('Şifrenizi sıfırlamak için önce e-postanızı doğrulamanız gerekiyor. Size yeni bir doğrulama kodu gönderdik, lütfen spam (gereksiz) klasörünüzü kontrol edin.'); window.location.href = `${getBasePath()}verify.html?email=${encodeURIComponent(emailInput.value)}`; } catch (resendError) { console.error('Doğrulama kodu gönderme hatası:', resendError); alert('Bir hata oluştu. Lütfen tekrar deneyin.'); } } else { alert(error.message); } } }); resetPasswordForm.addEventListener('submit', async (e) => { e.preventDefault(); const confirmationCode = document.getElementById('reset-code').value; const newPassword = document.getElementById('new-password').value; try { await confirmResetPassword({ username: emailInput.value, confirmationCode, newPassword }); alert('Şifren başarıyla değiştirildi. Şimdi giriş yapabilirsin.'); window.location.href = `${getBasePath()}index.html`; } catch (error) { console.error('Yeni şifre ayarlama hatası:', error); alert(error.message); } }); })();
}

// --- Logic for home.html ---
if (window.location.pathname.includes('home.html')) {
    // NOTE: The settings menu and edit profile button are assumed to be dynamically added.
    // This code adds a listener to the document to catch the click on the button when it appears.
    document.addEventListener('click', (e) => {
        // Assuming the button or its parent has an ID like 'edit-profile-option'
        if (e.target.matches('#edit-profile-option') || e.target.closest('#edit-profile-option')) {
            e.preventDefault();
            window.location.href = `${getBasePath()}profile-setup.html?mode=edit`;
        }
    });

    const dailyTaskText = document.getElementById('daily-task-text');
    const streakCircles = document.querySelectorAll('.streak-circle');

    const goodDeeds = [
        "Bir sokak hayvanına su ver.",
        "Yaşlı bir komşunun poşetlerini taşımasına yardım et.",
        "Toplu taşımada birine yer ver.",
        "Bugün birine içten bir şekilde iltifat et.",
        "Çevrendeki bir çöpü yere atma, çöp kutusuna at.",
        "Bir arkadaşına nasıl olduğunu sor.",
        "Okuduğun güzel bir kitabı birine hediye et.",
        "Bir fidan dik."
    ];

    function setRandomDeed() {
        const randomIndex = Math.floor(Math.random() * goodDeeds.length);
        dailyTaskText.textContent = goodDeeds[randomIndex];
    }

    streakCircles.forEach(circle => {
        circle.addEventListener('click', () => {
            circle.classList.toggle('completed');
        });
    });

    setRandomDeed();
}

// --- Logic for profile-setup.html ---
if (window.location.pathname.includes('profile-setup.html')) {
    (async () => {
        try {
            const { attributes } = await getCurrentUser();
            const { updateUserAttributes } = await import('aws-amplify/auth');

            const urlParams = new URLSearchParams(window.location.search);
            const mode = urlParams.get('mode');
            const isEditMode = mode === 'edit';

            // --- DOM Elements ---
            const steps = document.querySelectorAll('.setup-step');
            const progressBarInner = document.querySelector('.progress-bar-inner');
            const h1 = document.querySelector('h1');
            const p = document.querySelector('p');
            const step1Btn = document.getElementById('step-1-btn');
            const step2Btn = document.getElementById('step-2-btn');
            const completeProfileBtn = document.getElementById('complete-profile-btn');
            const finalSubmitBtn = document.querySelector('#step-3-form button[type="submit"]');

            // --- Form Inputs ---
            const nameInput = document.getElementById('name');
            const birthdateInput = document.getElementById('birthdate');
            const genderInput = document.getElementById('gender');
            const genderOptions = document.querySelectorAll('.gender-option');
            const preferenceCards = document.querySelectorAll('.preference-card');
            const interestCounter = document.getElementById('interest-counter');
            const socialInputs = {
                instagram: document.getElementById('instagram'),
                tiktok: document.getElementById('tiktok'),
                x: document.getElementById('x'),
                facebook: document.getElementById('facebook'),
                reddit: document.getElementById('reddit'),
                linkedin: document.getElementById('linkedin'),
            };

            let currentStep = 0;
            const preferences = [];

            // --- Page Setup for Edit Mode ---
            if (isEditMode) {
                // Change texts
                h1.textContent = 'Profilini Düzenle';
                p.textContent = 'Bilgilerini aşağıdan güncelleyebilirsin.';
                step1Btn.textContent = 'Değişiklikleri Kaydet';
                step2Btn.textContent = 'Değişiklikleri Kaydet';
                completeProfileBtn.textContent = 'Vazgeç';
                finalSubmitBtn.textContent = 'Değişiklikleri Kaydet';

                // Pre-fill data
                nameInput.value = attributes.name || '';
                birthdateInput.value = attributes.birthdate || '';
                genderInput.value = attributes.gender || '';

                // Select gender
                if (attributes.gender) {
                    genderOptions.forEach(opt => {
                        if (opt.dataset.gender === attributes.gender) {
                            opt.classList.add('selected');
                        }
                    });
                }

                // Pre-fill social media
                for (const key in socialInputs) {
                    if (socialInputs[key]) {
                        socialInputs[key].value = attributes[`custom:social_${key}`] || '';
                    }
                }

                // Select interests
                const savedPreferences = attributes['custom:iyilik_tercihleri'] ? attributes['custom:iyilik_tercihleri'].split(',') : [];
                savedPreferences.forEach(pref => {
                    preferences.push(pref);
                    const card = document.querySelector(`.preference-card[data-preference="${pref}"]`);
                    if (card) card.classList.add('selected');
                });
                interestCounter.textContent = `(${preferences.length}/6)`;
            }

            // --- General Logic (applies to both modes) ---
            const updateProgressBar = () => {
                const progress = (currentStep / (steps.length - 1)) * 100;
                progressBarInner.style.width = `${progress}%`;
            };

            const showStep = (stepIndex) => {
                steps.forEach((step, index) => step.classList.toggle('active', index === stepIndex));
                updateProgressBar();
            };

            // Step 1 Logic
            genderOptions.forEach(option => {
                option.addEventListener('click', () => {
                    genderOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    genderInput.value = option.dataset.gender;
                });
            });

            document.getElementById('step-1-btn').addEventListener('click', () => {
                if (nameInput.value.trim() && birthdateInput.value && genderInput.value) {
                    if (isEditMode) return submitProfile(false); // Save and stay
                    currentStep = 1;
                    showStep(currentStep);
                } else {
                    alert('Lütfen devam etmeden önce tüm alanları doldurun.');
                }
            });

            // Step 2 Logic
            preferenceCards.forEach(card => {
                card.addEventListener('click', () => {
                    const preference = card.dataset.preference;
                    if (preferences.includes(preference)) {
                        preferences.splice(preferences.indexOf(preference), 1);
                        card.classList.remove('selected');
                    } else {
                        if (preferences.length < 6) {
                            preferences.push(preference);
                            card.classList.add('selected');
                        } else {
                            alert('En fazla 6 ilgi alanı seçebilirsiniz.');
                        }
                    }
                    interestCounter.textContent = `(${preferences.length}/6)`;
                    const isStepValid = preferences.length >= 1;
                    step2Btn.disabled = !isStepValid;
                    completeProfileBtn.disabled = !isStepValid;
                });
            });

            step2Btn.addEventListener('click', () => {
                if (preferences.length >= 1) {
                    if (isEditMode) return submitProfile(false); // Save and stay
                    currentStep = 2;
                    showStep(currentStep);
                } else {
                    alert('Lütfen en az 1 ilgi alanı seçin.');
                }
            });

            // Submission Logic
            const submitProfile = async (goToHome = true) => {
                try {
                    const attributesToUpdate = {
                        name: String(nameInput.value),
                        birthdate: String(birthdateInput.value),
                        gender: String(genderInput.value),
                        'custom:social_instagram': String(socialInputs.instagram.value),
                        'custom:social_tiktok': String(socialInputs.tiktok.value),
                        'custom:social_x': String(socialInputs.x.value),
                        'custom:social_facebook': String(socialInputs.facebook.value),
                        'custom:social_reddit': String(socialInputs.reddit.value),
                        'custom:social_linkedin': String(socialInputs.linkedin.value),
                        'custom:iyilik_tercihleri': String(preferences.join(',')),
                        'custom:setup_complete': 'evet'
                    };

                    await updateUserAttributes({ userAttributes: attributesToUpdate });

                    if (goToHome) {
                        window.location.href = `${getBasePath()}home.html`;
                    } else {
                        alert('Profilin başarıyla güncellendi!');
                    }
                } catch (error) {
                    console.error('Profil güncelleme hatası:', error);
                    alert('Profiliniz güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
                }
            };

            completeProfileBtn.addEventListener('click', () => {
                if (isEditMode) return window.location.href = `${getBasePath()}home.html`; // Cancel and go home
                submitProfile(true);
            });

            document.getElementById('step-3-form').addEventListener('submit', (e) => {
                e.preventDefault();
                submitProfile(true);
            });

            // Initial State
            const isStepValid = preferences.length >= 1;
            step2Btn.disabled = !isStepValid;
            completeProfileBtn.disabled = !isStepValid;
            showStep(currentStep);

        } catch (error) {
            console.error("Authentication error on profile setup page, redirecting.", error);
            window.location.href = `${getBasePath()}index.html`;
        }
    })();