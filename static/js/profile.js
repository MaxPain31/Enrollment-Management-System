$(document).ready(function () {
    function toggleSpinner($button, show) {
        const $spinner = $button.find(".spinner-border");
        if (show) {
            $spinner.removeClass("d-none");
            $button.prop("disabled", true);
        } else {
            $spinner.addClass("d-none");
            $button.prop("disabled", false);
        }
    }

    function handleErrors($form, errors) {
        $form.find(".form-control").removeClass("is-invalid");
        $.each(errors || {}, function (field, message) {
            const $input = $form.find(`[name="${field}"]`);
            if ($input.length) {
                $input.addClass("is-invalid");
                if (Array.isArray(message)) {
                    message = message.join(" ");
                }
                $input
                    .closest(".mb-3")
                    .find(".invalid-feedback")
                    .text(message || "This field is invalid.");
            }
        });
    }

    function clearErrors($form) {
        $form.find(".form-control").removeClass("is-invalid");
        $form.find(".invalid-feedback").text("");
    }

    $(document).on("click", ".toggle-password", function (e) {
        e.preventDefault();
        const targetSelector = $(this).data("target");
        const $target = $(targetSelector);
        if (!$target.length) return;
        const type = $target.attr("type") === "password" ? "text" : "password";
        $target.attr("type", type);

        const $icon = $(this).find("i");
        if ($icon.hasClass("bi-eye")) {
            $icon.removeClass("bi-eye").addClass("bi-eye-slash");
            $(this).addClass("password-visible");
        } else {
            $icon.removeClass("bi-eye-slash").addClass("bi-eye");
            $(this).removeClass("password-visible");
        }
    });

    $("#submitChangeEmail").on("click", function () {
        const $button = $(this);
        const $form = $("#changeEmailForm");
        clearErrors($form);
        toggleSpinner($button, true);

        $.ajax({
            url: "/profile/change-email/",
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
            data: $form.serialize(),
        })
            .done(function (resp) {
                if (resp.success) {
                    hideModalById("changeEmailModal");
                    showProfileAlert("success", resp.message || "Email updated successfully.");
                    $("#currentEmail").val($("#newEmail").val());
                    $form[0].reset();
                } else if (resp.errors) {
                    handleErrors($form, resp.errors);
                } else if (resp.message) {
                    showProfileAlert("danger", resp.message);
                }
            })
            .fail(function (xhr) {
                if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleErrors($form, xhr.responseJSON.errors);
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    showProfileAlert("danger", xhr.responseJSON.message);
                } else {
                    showProfileAlert("danger", "Unable to update email right now. Please try again.");
                }
            })
            .always(function () {
                toggleSpinner($button, false);
            });
    });

    $("#submitChangePassword").on("click", function () {
        const $button = $(this);
        const $form = $("#changePasswordForm");
        clearErrors($form);
        toggleSpinner($button, true);

        $.ajax({
            url: "/profile/change-password/",
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
            data: $form.serialize(),
        })
            .done(function (resp) {
                if (resp.success) {
                    hideModalById("changePasswordModal");
                    showProfileAlert("success", resp.message || "Password updated successfully.");
                    $form[0].reset();
                } else if (resp.errors) {
                    handleErrors($form, resp.errors);
                } else if (resp.message) {
                    showProfileAlert("danger", resp.message);
                }
            })
            .fail(function (xhr) {
                if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleErrors($form, xhr.responseJSON.errors);
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    showProfileAlert("danger", xhr.responseJSON.message);
                } else {
                    showProfileAlert("danger", "Unable to update password right now. Please try again.");
                }
            })
            .always(function () {
                toggleSpinner($button, false);
            });
    });

    function showProfileAlert(type, message) {
        const $wrapper = $("#profileAlertWrapper");
        if (!$wrapper.length) {
            $("section.profile .container").prepend(
                `<div id="profileAlertWrapper" class="pt-2"></div>`
            );
        }
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        $("#profileAlertWrapper").html(alertHtml);
    }

    function hideModalById(id) {
        const modalEl = document.getElementById(id);
        if (!modalEl) return;
        const modalInstance =
            bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
    }
});

