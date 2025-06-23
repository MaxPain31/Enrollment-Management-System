document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const registerButton = document.getElementById("registerButton");
    const registerMessages = document.getElementById("registerMessages");

    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        registerButton.disabled = true;
        registerButton.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`;
        const formData = new FormData(registerForm);

        fetch(registerForm.action, {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(response => response.json())
            .then(data => {
                registerButton.disabled = false;
                registerButton.textContent = "Register";

                if (data.success) {
                    registerMessages.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                } else {
                    registerMessages.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            })
            .catch(error => {
                registerButton.disabled = false;
                registerButton.textContent = "Register";
                registerMessages.innerHTML = `<div class="alert alert-danger">An error occurred. Please try again.</div>`;
            });
    });
});
