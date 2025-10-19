$(document).ready(function () {
    // Wait for modal to be ready and bind password toggle
    function bindPasswordToggle() {
        // Password visibility toggle
        $("#togglePassword").off("click").on("click", function(e) {
            e.preventDefault();
            const passwordInput = $("#password");
            const toggleIcon = $("#toggleIcon");
            if (passwordInput.attr("type") === "password") {
                passwordInput.attr("type", "text");
                toggleIcon.removeClass("bi-eye").addClass("bi-eye-slash");
            } else {
                passwordInput.attr("type", "password");
                toggleIcon.removeClass("bi-eye-slash").addClass("bi-eye");
            }
        });
    }
    
    // Bind immediately
    bindPasswordToggle();
    
    // Also bind when modal is shown
    $("#loginModalToggle").on("shown.bs.modal", function() {
        bindPasswordToggle();
    });

    // Load saved credentials if Remember Me was checked
    function loadSavedCredentials() {
        const savedLRN = localStorage.getItem("rememberedLRN");
        const savedPassword = localStorage.getItem("rememberedPassword");
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        
        if (savedLRN && rememberMe) {
            $("#lrn").val(savedLRN);
            $("#password").val(savedPassword);
            $("#rememberMe").prop("checked", true);
        }
    }

    // Save credentials if Remember Me is checked
    function saveCredentials(lrn, password, remember) {
        if (remember) {
            localStorage.setItem("rememberedLRN", lrn);
            localStorage.setItem("rememberedPassword", password);
            localStorage.setItem("rememberMe", "true");
        } else {
            localStorage.removeItem("rememberedLRN");
            localStorage.removeItem("rememberedPassword");
            localStorage.removeItem("rememberMe");
        }
    }

    // Load saved credentials on page load
    loadSavedCredentials();

    $("#loginForm").on("submit", function (e) {
        e.preventDefault();

        let $form = $(this);
        let $button = $("#loginButton");
        let $messages = $("#loginMessages");
        const lrn = $("#lrn").val();
        const password = $("#password").val();
        const remember = $("#rememberMe").is(":checked");

        $form.find(".form-control").removeClass("is-invalid");
        $form.find(".login-error").text("");

        $button.prop("disabled", true).html(
            `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`
        );

        $.ajax({
            url: $form.attr("action"),
            method: "POST",
            data: $form.serialize(),
            headers: { "X-Requested-With": "XMLHttpRequest" },
            success: function (data) {
                setTimeout(function () {
                    $button.prop("disabled", false).text("Login");

                    if (data.success) {
                        // Save credentials if Remember Me is checked
                        saveCredentials(lrn, password, remember);
                        window.location.href = data.redirect_url;
                    } else if (data.errors) {
                        $.each(data.errors, function (field, messages) {
                            let $input = $("#loginForm").find(`[name="${field}"], #${field}`);
                            if ($input.length) {
                                $input.addClass("is-invalid");
                                $input.closest(".mb-2").find(".login-error").text(messages.join(" "));
                            }
                        });
                    } else if (data.message) {
                        $messages.html(`<div class="alert alert-danger">${data.message}</div>`);
                    }
                }, 1000);
            },
            error: function () {
                setTimeout(function () {
                    $button.prop("disabled", false).text("Login");
                    $messages.html(`<div class="alert alert-danger">An error occurred. Please try again.</div>`);
                }, 1000);
            }
        });
    });

    $("#loginForm .form-control").on("input", function () {
        $(this).removeClass("is-invalid");
        $(this).closest(".mb-2").find(".login-error").text("");
    });
});