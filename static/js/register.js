$(document).ready(function () {
    console.log("Register script loaded");
    
    // Password visibility toggle for main password field
    $("#togglePassword").on("click", function(e) {
        e.preventDefault();
        console.log("Password toggle clicked");
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

    // Password visibility toggle for confirm password field
    $("#toggleConfirmPassword").on("click", function(e) {
        e.preventDefault();
        console.log("Confirm password toggle clicked");
        const confirmPasswordInput = $("#confirm_password");
        const toggleConfirmIcon = $("#toggleConfirmIcon");
        
        if (confirmPasswordInput.attr("type") === "password") {
            confirmPasswordInput.attr("type", "text");
            toggleConfirmIcon.removeClass("bi-eye").addClass("bi-eye-slash");
        } else {
            confirmPasswordInput.attr("type", "password");
            toggleConfirmIcon.removeClass("bi-eye-slash").addClass("bi-eye");
        }
    });

    // Real-time password confirmation validation
    $("#confirm_password").on("input", function() {
        const password = $("#password").val();
        const confirmPassword = $(this).val();
        
        if (confirmPassword && password !== confirmPassword) {
            $(this).addClass("is-invalid");
            $(this).closest(".mb-2").find(".register-error").text("Passwords do not match");
        } else {
            $(this).removeClass("is-invalid");
            $(this).closest(".mb-2").find(".register-error").text("");
        }
    });

    // Clear validation when password changes
    $("#password").on("input", function() {
        const confirmPassword = $("#confirm_password").val();
        if (confirmPassword) {
            $("#confirm_password").trigger("input");
        }
    });

    $("#registerForm").on("submit", function (e) {
        e.preventDefault();

        let $form = $(this);
        let $button = $("#registerButton");
        let $messages = $("#registerMessages");

        $form.find(".form-control").removeClass("is-invalid");
        $form.find(".register-error").text("");

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
                    $button.prop("disabled", false).text("Register");
                    if (data.success) {
                        $messages.html(`<div class="alert alert-success">${data.message}</div>`);
                        $form[0].reset();
                    } else if (data.errors) {
                        $.each(data.errors, function (field, messages) {
                            let $input = $("#registerForm").find(`[name="${field}"], #${field}`);
                            if ($input.length) {
                                $input.addClass("is-invalid");
                                $input.closest(".mb-2").find(".register-error").text(messages.join(" "));
                            }
                            $input.on("input", function () {
                                $(this).removeClass("is-invalid");
                                $(this).closest(".mb-2").find(".register-error").text("");
                            });
                        });
                    } else if (data.message) {
                        $messages.html(`<div class="alert alert-danger">${data.message}</div>`);
                    }
                }, 1000);
            },
            error: function () {
                setTimeout(function () {
                    $button.prop("disabled", false).text("Register");
                    $messages.html(`<div class="alert alert-danger">An error occurred. Please try again.</div>`);
                }, 1000);
            }
        });
    });
});
