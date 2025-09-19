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

$(document).ready(function () {
    let x = null;
    $(document).on('click', '.view-btn', function () {
        const a = $(this).data('id');
        x = a;
        const $form = $('#enrollmentForm');
        $form.find(".is-invalid").removeClass("is-invalid");
        $form.find(".invalid-feedback").text("");
        console.log(x)
        const $jhs = $("#enrollemnt_jhs");
        const $shs = $("#enrollemnt_shs");
        $jhs.empty();
        $shs.empty();

        // fetchDocumentData(applicationId);
        $.ajax({
            url: `/admin/get_application/${x}/`,
            type: "GET",
            dataType: "json",
            success: function(data) {
                const setValue = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.value = value ?? '';
                };

                setValue("psa_no", data.psa_no);
                setValue("lrn", data.lrn);
                setValue("first_name", data.first_name);
                setValue("middle_name", data.middle_name);
                setValue("last_name", data.last_name);
                setValue("extension_name", data.extension_name);
                setValue("birth_date", data.birth_date);
                setValue("age", data.age);
                setValue("gender", data.gender);
                setValue("place_of_birth", data.place_of_birth);
                setValue("mother_tongue", data.mother_tongue);

                const jhsHtml = `
                    <div class="enrollment_information">
                        <h5>Enrollment Information (JHS)</h5>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="school_year" class="form-label">School Year</label>
                                <input type="text" class="form-control" id="school_year" name="school_year" value="${data.school_year}" disabled>
                                <div class="invalid-feedback"></div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="grade_level" class="form-label">Grade Level</label>
                                <select class="form-select" id="grade_level" name="grade_level" disabled>
                                    <option value="7" ${data.grade_level=='7'?'selected':''}>GRADE 7</option>
                                    <option value="8" ${data.grade_level=='8'?'selected':''}>GRADE 8</option>
                                    <option value="9" ${data.grade_level=='9'?'selected':''}>GRADE 9</option>
                                    <option value="10" ${data.grade_level=='10'?'selected':''}>GRADE 10</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="student_type" class="form-label">Student Type</label>
                                <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                    <option value="new student" ${data.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                    <option value="returning" ${data.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                    <option value="transferee" ${data.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="gen_avg" class="form-label">General Average</label>
                                <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${data.gen_avg}" disabled>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                    </div>
                `;

                const shsHtml = `
                    <div class="enrollment_information">
                        <h5>Enrollment Information (SHS)</h5>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="school_year" class="form-label">School Year</label>
                                <input type="text" class="form-control" id="school_year" name="school_year" value="${data.school_year}" disabled>
                                <div class="invalid-feedback"></div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="student_type" class="form-label">Student Type</label>
                                    <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                        <option value="new student" ${data.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                        <option value="returning" ${data.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                        <option value="transferee" ${data.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                                    </select>
                                </div>
                                <div class="invalid-feedback"></div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="grade_level" class="form-label">Grade Level</label>
                                <select class="form-select" id="grade_level" name="grade_level" disabled>
                                    <option value="11" ${data.grade_level=='11'?'selected':''}>GRADE 11</option>
                                    <option value="12" ${data.grade_level=='12'?'selected':''}>GRADE 12</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="gen_avg" class="form-label">General Average</label>
                                    <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${data.gen_avg}" disabled>
                                    <div class="invalid-feedback"></div>
                                </div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="semester" class="form-label">Semester</label>
                                <select class="form-select" id="semester" name="semester" disabled>
                                    <option value="1st" ${data.semester=='1st'?'selected':''}>1st</option>
                                    <option value="2nd" ${data.semester=='2nd'?'selected':''}>2nd</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="strand" class="form-label">Strand</label>
                                <select class="form-select" id="strand" name="strand" disabled>
                                    <option value="">Select strand...</option>
                                    <option value="ABM" ${data.strand=='ABM'?'selected':''}>ABM</option>
                                    <option value="STEM" ${data.strand=='STEM'?'selected':''}>STEM</option>
                                </select>
                                <div class="invalid-feedback"></div>
                            </div>
                        </div>
                    </div>
                `;

                const documents = data.documents_submitted || [];
                const html = `
                    <h5>Document Submitted</h5>
                    <input type="hidden" name="application_id" value="${x}">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="psa" name="documents_submitted" value="PSA" ${documents.includes('PSA') ? 'checked' : ''} disabled>
                        <label class="form-check-label" for="psa">PSA <span class="text-danger">(Required)</span></label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="report_card" name="documents_submitted" value="Report Card" ${documents.includes('Report Card') ? 'checked' : ''} disabled>
                        <label class="form-check-label" for="report_card">Report Card <span class="text-danger">(Required)</span></label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="sf10" name="documents_submitted" value="SF10" ${documents.includes('SF10') ? 'checked' : ''} disabled>
                        <label class="form-check-label" for="sf10">SF10 (Optional)</label>
                    </div>
                    <div class="invalid-feedback"></div>
                `;
                $("#documentForm").html(html);

                if (data.enrollment_type === "JHS") {
                    $jhs.html(jhsHtml);
                    $shs.empty();
                }  
                if (data.enrollment_type === "SHS"){
                    $shs.html(shsHtml);
                    $jhs.empty();
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX error fetching application data:", error);
            }
        });
        
        $("#editButton").on("click", function () {
            enableEditForm();
        });

        $("#saveButton").on("click", function () {
            saveApplicationData();
        });

        $("#closeButton").on("click", function () {
            disableEditForm();
        });

        $("#viewApplicationModal").on("hidden.bs.modal", function () {
            disableEditForm();
        });
    });

    $("#saveButton").on("click", function () {
        console.log(x)
        const formData = new FormData(document.getElementById('enrollmentForm'));
        const documentData = new FormData(document.getElementById('documentForm'));
        const documents = [];
        const $saveButton = $(this);
        const $form = $('#enrollmentForm');

        $form.find(".is-invalid").removeClass("is-invalid");
        $form.find(".invalid-feedback").text("");

        documentData.forEach((value, key) => {
            if (key === 'documents_submitted') documents.push(value);
        });

        disabledLoadingSpinner($saveButton);

        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        setTimeout(function() {
            $.ajax({
                url: `/admin/update_application/${x}/`,
                type: "PUT",
                contentType: "application/json",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest"
                },
                data: JSON.stringify({
                    action: 'save',
                    application_id: x,
                    documents_submitted: documents,
                    data: data
                }),
                success: function (res) {
                    enabledLoadingSpinner($saveButton);
                    if (res.success) {
                        Swal.fire({ 
                            title: "Success!", 
                            text: res.message, 
                            icon: "success", 
                            confirmButtonText: "OK" 
                        }).then(() => { 
                            location.reload();
                        });
                    } else if (res.errors) {
                        $.each(res.errors, function (field, messages) {
                            let $input = $form.find(`[name="${field}"]`);
                            $input.addClass("is-invalid");
                            let $feedback = $input.closest(".mb-3").find(".invalid-feedback");
                            $feedback.text(messages.join(" ")).addClass("d-block");
                        });
                    } else {
                        enabledLoadingSpinner($saveButton);
                        Swal.fire({ 
                            title: "Error!", 
                            text: res.message, 
                            icon: "error", 
                            confirmButtonText: "OK" 
                        });
                    }
                },
                error: function (xhr, status, error) {
                    enabledLoadingSpinner($saveButton);
                    Swal.fire({
                        title: "Error!",
                        text: "An error occurred while saving the application data.",
                        icon: "error"
                    });
                    console.error("AJAX error:", error);
                },
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

function enableEditForm() {
    $("#enrollmentForm input, #enrollmentForm select, #documentForm input").prop("disabled", false);
    $("#saveButton").show();
    $("#editButton").hide();
}

function disableEditForm() {
    $("#enrollmentForm input, #enrollmentForm select, #documentForm input").prop("disabled", true);
    $("#editButton").show();
    $("#saveButton").hide();
}

function disabledLoadingSpinner($button){
    $button.prop("disabled", true).html(`
        <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden"></span>
        </div>
    `);
}

function enabledLoadingSpinner($button){
    $button.prop("disabled", false).text("Submit");
}

$(document).ready(function () {
    // Initialize DataTable if not already initialized
    let table = $("#applicationTable").DataTable({
        pageLength: 10, // default rows
        lengthChange: true,
    });

    $("#application-filter-form").on("submit", function (e) {
        e.preventDefault();
        let $form = $(this);

        $.ajax({
            url: $form.attr("action") || window.location.pathname,
            type: "GET",
            data: $form.serialize(),
            success: function (response) {
                $("#applicationTable tbody").html(
                    $(response).find("#applicationTable tbody").html()
                );
                table.clear().destroy();
                table = $("#applicationTable").DataTable({
                    pageLength: 10,
                    lengthChange: true,
                });
            },
            error: function () {
                Swal.fire({
                    title: "Error!",
                    text: "Could not apply filters.",
                    icon: "error",
                });
            },
        });
    });
});

function clearFiltersAndSubmit() {
    $("#application-filter-form")[0].reset();
    $("#application-filter-form").submit();
}



$(document).ready(function () {
    const $approveAllBtn = $("#approveAllBtn");
    const $reapproveAllBtn = $("#reapproveAllBtn"); // <-- new button
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    enforceMissingRule();

    $("#checkAll").on("change", function () {
        if ($(this).is(":checked")) {
            $(".row-check").each(function () {
                if ($(this).data("status") === "Complete") {
                    $(this).prop("checked", true);
                }
            });
        } else {
            $(".row-check").prop("checked", false);
        }
        enforceMissingRule();
        toggleApproveBtn();
    });

    $(document).on("change", ".row-check", function () {
        enforceMissingRule();
        toggleApproveBtn();
    });

    function toggleApproveBtn() {
        const anyChecked = $(".row-check:checked").length > 0;
        $approveAllBtn.prop("disabled", !anyChecked);
        $reapproveAllBtn.prop("disabled", !anyChecked); // toggle reapprove too
    }

    function enforceMissingRule() {
        $(".row-check").each(function () {
            if ($(this).data("status") === "Missing") {
                $(this).prop("disabled", true).prop("checked", false);
            }
        });
    }

    // Bulk Approve
    $approveAllBtn.on("click", function () {
        bulkAction("/admin/bulk_approve/", "Approve");
    });

    // Bulk Reapprove
    $reapproveAllBtn.on("click", function () {
        bulkAction("/admin/bulk_reapprove/", "Re-Approve");
    });


    // Shared function for both
    function bulkAction(url, actionName) {
        const ids = $(".row-check:checked").map((_, el) => $(el).data("id")).get();

        if (ids.length === 0) {
            Swal.fire({
                icon: "warning",
                title: `No applications selected`,
                text: `Please select at least one application to ${actionName.toLowerCase()}.`,
            });
            return;
        }

        Swal.fire({
            title: `${actionName} All`,
            html: `Do you want to ${actionName.toLowerCase()} all <span class="text-danger">${ids.length}</span> selected applications?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes",
            confirmButtonColor: '#1a742dff',
            cancelButtonText: "Cancel",
            reverseButtons: true,
            allowOutsideClick: false,
            preConfirm: () => {
                Swal.showLoading();

                return $.ajax({
                    url: url,
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ application_ids: ids }),
                    headers: { "X-CSRFToken": getCookie("csrftoken"), },
                }).then((res) => {
                    if (!res.success) {
                        throw new Error(res.message || `Failed to start bulk ${actionName.toLowerCase()}.`);
                    }
                    return res;
                }).catch(err => {
                    Swal.showValidationMessage(`Request failed: ${err}`);
                });
            }
        }).then((result) => {
            if (!result.isConfirmed) return;

            const batchKey = result.value.batch_key;
            const total = result.value.total;

            Swal.fire({
                title: `${actionName}ing applications...`,
                html: `<div id="progressText">0 / ${total} ${actionName.toLowerCase()}d</div>`,
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                    const interval = setInterval(function () {
                        let progressUrl = "";

                        if (actionName === "Approve") {
                            progressUrl = `/admin/bulk-approve-progress/${batchKey}/`;
                        } else if (actionName === "Re-Approve") {
                            progressUrl = `/admin/bulk-reapprove-progress/${batchKey}/`;
                        }

                        $.get(progressUrl, function (data) {
                            // ✅ Safe handling for 0 values
                            const processed = (data.reapproved !== undefined) ? data.reapproved : data.approved;

                            $("#progressText").html(
                                `<strong>${processed} / ${data.total}</strong> ${actionName.toLowerCase()}d`
                            );

                            if (processed >= data.total) {
                                clearInterval(interval);
                                Swal.fire({
                                    icon: "success",
                                    title: "All done!",
                                    html: `<strong>${data.total}</strong> applications ${actionName.toLowerCase()}d successfully.`,
                                    confirmButtonText: "OK"
                                }).then(() => location.reload());
                            }
                        });
                    }, 1000);

                }
            });
        });
    }
});


function handleAction(applicationId, action) {
    if (action === 'approve') {
        Swal.fire({
            title: 'Are you sure?',
            text: "You are about to approve this application.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Loading...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                confirmAction(applicationId, action);
            }
        });
    } else if (action === 'reject') {
        $('#rejectApplicationModal').data('application-id', applicationId).modal('show');
    }
}


//Application Confirmation
function confirmAction(applicationId, action, messageRejected = "") {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    $.ajax({
        url: "/admin/application_action/",
        type: "POST",
        data: JSON.stringify({
            action: action,
            application_id: applicationId,
            message_rejected: messageRejected
        }),
        contentType: "application/json",
        headers: {
            "X-CSRFToken": csrfToken,
            "X-Requested-With": "XMLHttpRequest"
        },
        success: function (data) {
            Swal.close(); 
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message,
                    confirmButtonText: 'OK'
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                    confirmButtonText: 'OK'
                });
            }
        },
        error: function (xhr, status, error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while processing the action.',
                confirmButtonText: 'OK'
            });
            console.error('Error:', error);
        }
    });
}

function submitRejectReason() {
    const applicationId = $('#rejectApplicationModal').data('application-id');
    const messageRejected = document.getElementById('rejectReason').value;

    if (!messageRejected.trim()) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Reason for rejection cannot be empty.',
            confirmButtonText: 'OK'
        });
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to pending this application.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Processing...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            confirmAction(applicationId, 'reject', messageRejected);
        }
    });
}

$(document).on("click", "#reApproveBtn", function (e) { 
    e.preventDefault();
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    const applicationId = $(this).data("id");

    Swal.fire({
        title: "Re-Approve Application",
        text: "Are you sure you want to re-approve this application?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        confirmButtonColor: "#1a742dff",
        cancelButtonText: "Cancel",
        allowOutsideClick: false,
        preConfirm: () => {
            Swal.showLoading();

            return $.ajax({
                url: "/admin/reapprove_action/",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ application_id: applicationId }),
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest"
                },
            })
            .then((res) => {
                if (!res.success) {
                    throw new Error(res.message || "Failed to re-approve application.");
                }
                return res;
            })
            .catch((jqXHR) => {
                // Extract custom error message
                let errMsg = "Request failed.";
                if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                    errMsg = jqXHR.responseJSON.message;
                } else if (jqXHR.responseText) {
                    errMsg = jqXHR.responseText;
                }
                Swal.showValidationMessage(errMsg);
            });
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                icon: "success",
                title: "Re-Approved!",
                text: "The application has been successfully re-approved.",
                confirmButtonText: "OK",
            }).then(() => {
                location.reload();
            });
        }
    });
});
