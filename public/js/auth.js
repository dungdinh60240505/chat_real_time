// Cấu hình API endpoint
const API_BASE_URL = 'http://localhost:3000/api'; // Thay đổi URL server của bạn tại đây

// Toggle giữa form đăng nhập và đăng kí
function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    loginForm.classList.toggle('visible-form');
    loginForm.classList.toggle('hidden-form');
    signupForm.classList.toggle('visible-form');
    signupForm.classList.toggle('hidden-form');

    // Xóa các thông báo lỗi khi chuyển form
    clearMessages();
}

// Xóa tất cả thông báo
function clearMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

// Hiển thị thông báo lỗi
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Hiển thị thông báo thành công
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Xử lý form đăng nhập
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validation
    if (!email) {
        showError('loginEmailError', 'Vui lòng nhập email');
        return;
    }
    if (!password) {
        showError('loginPasswordError', 'Vui lòng nhập mật khẩu');
        return;
    }

    try {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Đang xử lý...';

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('loginSuccess', 'Đăng nhập thành công! Chuyển hướng...');
            // Lưu token nếu server trả về
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            // Chuyển hướng sau 1 giây
            setTimeout(() => {
                window.location.href = '/main';
            }, 1000);
        } else {
            showError('loginError', data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        }
    } catch (error) {
        showError('loginError', 'Lỗi kết nối: ' + error.message);
        console.error('Login error:', error);
    } finally {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Đăng Nhập';
    }
});

// Xử lý form đăng kí
document.getElementById('formSignup').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirm').value;

    // Validation
    if (!username) {
        showError('signupNameError', 'Vui lòng nhập tên đầy đủ');
        return;
    }
    if (!email) {
        showError('signupEmailError', 'Vui lòng nhập email');
        return;
    }
    if (!password) {
        showError('signupPasswordError', 'Vui lòng nhập mật khẩu');
        return;
    }
    if (password.length < 6) {
        showError('signupPasswordError', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    if (password !== confirmPassword) {
        showError('signupConfirmError', 'Mật khẩu xác nhận không khớp');
        return;
    }

    try {
        const signupBtn = document.getElementById('signupBtn');
        signupBtn.disabled = true;
        signupBtn.textContent = 'Đang xử lý...';

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('signupSuccess', 'Đăng kí thành công! Chuyển về đăng nhập...');
            // Reset form
            document.getElementById('formSignup').reset();
            // Chuyển về form đăng nhập sau 1 giây
            setTimeout(() => {
                toggleForm();
            }, 1000);
        } else {
            showError('signupError', data.message || 'Đăng kí thất bại. Email có thể đã tồn tại.');
        }
    } catch (error) {
        showError('signupError', 'Lỗi kết nối: ' + error.message);
        console.error('Signup error:', error);
    } finally {
        const signupBtn = document.getElementById('signupBtn');
        signupBtn.disabled = false;
        signupBtn.textContent = 'Đăng Kí';
    }
});