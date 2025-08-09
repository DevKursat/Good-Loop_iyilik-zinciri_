import 'buffer';
import 'process';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, getCurrentUser, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import amplifyconfiguration from './amplifyconfiguration.json'; // Relative to src/
import { getBasePath } from './utils.js';

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
        }
        catch (error) {
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
    (async () => {
        const sendCodeForm = document.getElementById('send-code-form');
        const resetPasswordForm = document.getElementById('reset-password-form');
        const emailInput = document.getElementById('reset-email');

        sendCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await resetPassword({ username: emailInput.value });
                alert('Sıfırlama kodu e-postana gönderildi. Spam (gereksiz) klasörünü kontrol etmeyi unutma.');
                
                // Switch forms by toggling the 'hidden' class, which is the correct way
                sendCodeForm.classList.add('hidden');
                resetPasswordForm.classList.remove('hidden');

            } catch (error) {
                console.error('Şifre sıfırlama hatası:', error);

                if (error.name === 'UserNotConfirmedException' || error.name === 'InvalidParameterException') {
                    const { resendSignUpCode } = await import('aws-amplify/auth');
                    try {
                        await resendSignUpCode({ username: emailInput.value });
                        alert('Şifrenizi sıfırlamak için önce e-postanızı doğrulamanız gerekiyor. Size yeni bir doğrulama kodu gönderdik, lütfen spam (gereksiz) klasörünüzü kontrol edin.');
                        window.location.href = `${getBasePath()}verify.html?email=${encodeURIComponent(emailInput.value)}`;
                    } catch (resendError) {
                        console.error('Doğrulama kodu gönderme hatası:', resendError);
                        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
                    }
                } else {
                    alert(error.message);
                }
            }
        });

        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const confirmationCode = document.getElementById('reset-code').value;
            const newPassword = document.getElementById('new-password').value;
            try {
                await confirmResetPassword({ username: emailInput.value, confirmationCode, newPassword });
                alert('Şifren başarıyla değiştirildi. Şimdi giriş yapabilirsin.');
                window.location.href = `${getBasePath()}index.html`;
            } catch (error) {
                console.error('Yeni şifre ayarlama hatası:', error);
                alert(error.message);
            }
        });
    })();
}