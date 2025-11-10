$(document).ready(function () {
    const $unverifiedNotice = $("#loginUnverifiedNotice");
    const $unverifiedEmail = $("#loginUnverifiedEmail");
    const $resendBtn = $("#loginResendVerificationBtn");
    const $resendFeedback = $("#loginResendVerificationFeedback");
    const resendCooldownSeconds = 60;
    const resendBtnBaseText = $resendBtn.length ? ($resendBtn.text().trim() || "Resend verification email") : "Resend verification email";
    let resendTimer = null;

    function clearResendTimer() {
        if (resendTimer) {
            clearInterval(resendTimer);
            resendTimer = null;
        }
    }

    function setResendButtonText(text) {
        if ($resendBtn.length) {
            $resendBtn.text(text);
        }
    }

    function resetResendButton() {
        if (!$resendBtn.length) return;
        clearResendTimer();
        $resendBtn.prop("disabled", false);
        setResendButtonText(resendBtnBaseText);
    }

    function startResendCountdown(seconds) {
        if (!$resendBtn.length) return;
        clearResendTimer();
        let remaining = seconds;
        $resendBtn.prop("disabled", true);
        setResendButtonText(`${resendBtnBaseText} (${remaining}s)`);
        resendTimer = setInterval(function () {
            remaining -= 1;
            if (remaining <= 0) {
                resetResendButton();
            } else {
                setResendButtonText(`${resendBtnBaseText} (${remaining}s)`);
            }
        }, 1000);
    }

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

    function hideUnverifiedNotice() {
        if ($unverifiedNotice.length) {
            $unverifiedNotice.addClass("d-none").removeData("email");
            $unverifiedEmail.text("");
            $resendFeedback.removeClass("text-success text-danger").text("");
            resetResendButton();
        }
    }

    if ($resendBtn.length) {
        $resendBtn.on("click", function () {
            if ($resendBtn.prop("disabled")) {
                return;
            }
            const email = $unverifiedNotice.data("email");
            if (!email) {
                $resendFeedback
                    .removeClass("text-success")
                    .addClass("text-danger")
                    .text("Email address unavailable. Please contact the administrator.");
                return;
            }

            clearResendTimer();
            $resendBtn.prop("disabled", true);
            setResendButtonText(`${resendBtnBaseText} (sending...)`);
            $resendFeedback
                .removeClass("text-success text-danger")
                .text("Sending verification email...");

            $.ajax({
                url: "/authentication/resend-verification/",
                method: "POST",
                data: $.param({ email: email }),
                headers: { "X-Requested-With": "XMLHttpRequest" },
            }).done(function(resp){
                const cls = resp.success ? "text-success" : "text-danger";
                $resendFeedback
                    .removeClass("text-success text-danger")
                    .addClass(cls)
                    .text(resp.message || (resp.success ? "Verification email re-sent." : "Unable to resend verification email."));
                if (resp.success) {
                    startResendCountdown(resendCooldownSeconds);
                } else {
                    resetResendButton();
                }
            }).fail(function(){
                $resendFeedback
                    .removeClass("text-success text-danger")
                    .addClass("text-danger")
                    .text("Something went wrong. Please try again later.");
                resetResendButton();
            });
        });
    }

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
                    hideUnverifiedNotice();

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
                    } else if (data.unverified) {
                        $messages.empty();
                        // Show only the inline unverified notice, suppress extra alert message
                        const email = data.email || "";
                        if ($unverifiedNotice.length) {
                            $unverifiedNotice
                                .removeClass("d-none")
                                .data("email", email);
                            $unverifiedEmail.text(email || "your email address");
                            $resendFeedback.removeClass("text-success text-danger").text("");
                            resetResendButton();
                            if (data.email_sent) {
                                $resendFeedback
                                    .removeClass("text-danger")
                                    .addClass("text-success")
                                    .text("Verification email sent. Please check your inbox or spam folder.");
                                startResendCountdown(resendCooldownSeconds);
                            }
                        }
                    } else if (data.message) {
                        $messages.html(`<div class="alert alert-danger">${data.message}</div>`);
                    }
                }, 1000);
            },
            error: function () {
                setTimeout(function () {
                    $button.prop("disabled", false).text("Login");
                    hideUnverifiedNotice();
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