$(document).ready(function () {
    $("#enrollmentForm").on("submit", function (e) {
        e.preventDefault();

        let $form = $(this);
        let $submitButton = $("#submitButton");

        // Enable permanent address fields before serialization if "same as current" is checked
        // This ensures disabled fields are submitted
        if ($("#same_as_current").is(":checked")) {
            $("#permanent_address_fields input").prop("disabled", false);
        }

        $form.find(".is-invalid").removeClass("is-invalid");
        $form.find(".invalid-feedback").text("");
        
        // Validate returning/transferee fields if student_type is returning or transferee
        const studentType = $("#student_type").val();
        let hasErrors = false;
        
        if (studentType === "returning" || studentType === "transferee") {
            const lastGradeLevel = $("#last_grade_level").val()?.trim();
            const lastSchoolYear = $("#last_school_year").val()?.trim();
            const lastSchoolAttended = $("#last_school_attended").val()?.trim();
            const schoolId = $("#school_id").val()?.trim();
            
            // Clear previous errors
            $("#last_grade_level, #last_school_year, #last_school_attended, #school_id").removeClass("is-invalid");
            $("#last_grade_level").closest(".mb-3").find(".invalid-feedback").text("");
            $("#last_school_year").closest(".mb-3").find(".invalid-feedback").text("");
            $("#last_school_attended").closest(".mb-3").find(".invalid-feedback").text("");
            $("#school_id").closest(".mb-3").find(".invalid-feedback").text("");
            
            if (!lastGradeLevel) {
                $("#last_grade_level").addClass("is-invalid");
                $("#last_grade_level").closest(".mb-3").find(".invalid-feedback").text("Last Grade Level Completed is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!lastSchoolYear) {
                $("#last_school_year").addClass("is-invalid");
                $("#last_school_year").closest(".mb-3").find(".invalid-feedback").text("Last School Year Completed is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!lastSchoolAttended) {
                $("#last_school_attended").addClass("is-invalid");
                $("#last_school_attended").closest(".mb-3").find(".invalid-feedback").text("Last School Attended is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!schoolId) {
                $("#school_id").addClass("is-invalid");
                $("#school_id").closest(".mb-3").find(".invalid-feedback").text("School ID is required for returning/transferee students.");
                hasErrors = true;
            }
            
            if (hasErrors) {
                $submitButton.prop("disabled", false).text("Submit");
                // Re-disable permanent address fields if checkbox is still checked
                if ($("#same_as_current").is(":checked")) {
                    $("#permanent_address_fields input").prop("disabled", true);
                }
                return;
            }
        }


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
                    // Re-disable permanent address fields after submission if checkbox is still checked
                    if ($("#same_as_current").is(":checked")) {
                        $("#permanent_address_fields input").prop("disabled", true);
                    }
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