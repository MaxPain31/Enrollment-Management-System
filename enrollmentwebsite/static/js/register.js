$(document).ready(function () {
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
