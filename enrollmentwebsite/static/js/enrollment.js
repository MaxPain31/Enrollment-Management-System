$(document).ready(function () {
    $("#enrollmentForm").on("submit", function (e) {
        e.preventDefault();

        let $form = $(this);
        let $submitButton = $("#submitButton");

        $form.find(".is-invalid").removeClass("is-invalid");
        $form.find(".invalid-feedback").text("");


        $submitButton.prop("disabled", true).html(`
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden"></span>
            </div>
        `);

        setTimeout(function () {
            $.ajax({
                url: $form.attr("action"),
                method: "POST",
                data: $form.serialize(),
                headers: { "X-Requested-With": "XMLHttpRequest" },
                success: function (data) {
                    if (data.success) {
                        Swal.fire({
                            title: "Success!",
                            html: data.message,
                            confirmButtonColor: "#0d6efd",
                            confirmButtonText: "DONE",
                            icon: "success"
                        }).then(() => {
                            window.location.href = data.redirect_url;
                        });
                    } else if (data.errors) {
                        $.each(data.errors, function (field, messages) {
                            let $input = $form.find(`[name="${field}"]`);
                            $input.addClass("is-invalid");
                            $input.siblings(".invalid-feedback").text(messages.join(" "));
                        });
                    } else {
                        Swal.fire({
                            title: "Error!",
                            text: data.message || "An error occurred while submitting the form.",
                            confirmButtonColor: "#0d6efd",
                            confirmButtonText: "DONE",
                            icon: "error"
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        title: "Error!",
                        text: "An unexpected error occurred while submitting the form.",
                        icon: "error"
                    });
                },
                complete: function () {
                    $submitButton.prop("disabled", false).text("Submit");
                }
            });
        }, 1000);

        $form.on("input change", ".form-control, .form-select, .form-check-input", function () {
            $(this).removeClass("is-invalid");
            $(this).siblings(".invalid-feedback").text("");
        });
    });
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}