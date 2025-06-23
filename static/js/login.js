document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const loginMessages = document.getElementById("loginMessages");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        loginButton.disabled = true;
        loginButton.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`;
        const formData = new FormData(loginForm);

        fetch(loginForm.action, {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(response => response.json())
            .then(data => {
                loginButton.disabled = false;
                loginButton.textContent = "Login";

                if (data.success) {
                    window.location.href = data.redirect_url;
                } else {
                    loginMessages.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            })
            .catch(error => {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
                loginMessages.innerHTML = `<div class="alert alert-danger">An error occurred. Please try again.</div>`;
            });
    });
});