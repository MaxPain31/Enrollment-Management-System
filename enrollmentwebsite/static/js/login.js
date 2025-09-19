$(document).ready(function () {
    $("#loginForm").on("submit", function (e) {
        e.preventDefault();

        let $form = $(this);
        let $button = $("#loginButton");
        let $messages = $("#loginMessages");

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