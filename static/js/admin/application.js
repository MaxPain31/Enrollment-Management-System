$(document).ready(function () {

    // Application Approved Table
    let applicationApprovedTable = $('#applicationApprovedTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.grade_level = $('#filter-grade-level').val();
            data.student_type = $('#filter-student-type').val();
            data.enrollment_type = $('#filter-enrollment-type').val();
            data.early_reg = $('#filter-early-reg').val();
            data.school_year = $('#filter-school-year').val();
            $.ajax({
                url: "/admin/applications/approved/data/",
                type: "GET",
                data: data,
                dataType: "json",
                success: function (json) {
                setTimeout(function () {
                        callback(json);
                    }, 500);
                },
                error: function (jqXHR) {
                    if (jqXHR.status === 401) {
                        window.location.href = "/authentication/sign-in/";
                    }
                    return false;
                }
            });
        },
        searchable: true,
        fixedHeight: true,
        order: [],
        columns: [
            { data: "enrollment.application_no" },
            {
                data: null,
                render: function (data, type, row) {
                    let middle = row.enrollment.middle_name ? ` ${row.enrollment.middle_name}` : "";
                    return `${row.enrollment.last_name}, ${row.enrollment.first_name}${middle} `.trim();
                }
            },
            { data: "enrollment.student_type" },
            { data: "enrollment.grade_level" },
            { data: "enrollment.gen_avg" },
            { 
                data: "enrollment.created_at",
                searchable: false,
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {   
                data: "enrollment.status",
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <span class="badge bg-${row.enrollment.status === "Complete" ? "success" : "danger"} application-status">${row.enrollment.status.toUpperCase()}</span>
                    `;
                }
            },
            { 
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <div>
                            <button type="button" class="btn btn-primary btn-sm view-btn" data-bs-toggle="modal" data-bs-target="#viewApplicationModal" data-app='${JSON.stringify(row.enrollment)}' data-documents='${JSON.stringify(row.documents)}'>
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    `;
                }
            },
        ],
        language: {
            sLoadingRecords: '<div class="text-center">' +
                '<div class="spinner-border text-primary" role="status">' +
                '<span class="visually-hidden">Loading...</span>' +
                '</div>' +
            '</div>'
        },
    });

    // Application Pending Table
    let applicationPendingTable = $('#applicationRejectedTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.grade_level = $('#filter-grade-level').val();
            data.student_type = $('#filter-student-type').val();
            data.enrollment_type = $('#filter-enrollment-type').val();
            data.early_reg = $('#filter-early-reg').val();
            data.school_year = $('#filter-school-year').val();
            $.ajax({
                url: "/admin/applications/pending/data/",
                type: "GET",
                data: data,
                dataType: "json",
                success: function (json) {
                setTimeout(function () {
                    callback(json);
                    }, 500);
                },
                error: function (jqXHR) {
                    if (jqXHR.status === 401) {
                        window.location.href = "/authentication/sign-in/";
                    }
                    return false;
                }
            });
        },
        searchable: true,
        fixedHeight: true,
        order: [],
        columns: [
            // {
            //     data:null,
            //     orderable: false,
            //     className: "text-center align-middle",
            //     searchable: false,
            //     render: function (data, type, row) {
            //         const disabled = row.enrollment.status === "Missing" ? "disabled" : "";
            //         return `
            //             <input class="form-check-input row-check"
            //                 type="checkbox"
            //                 data-id="${row.enrollment.id}"
            //                 data-status="${row.enrollment.status}"
            //                 ${disabled}
            //             >
            //         `;
            //     }
            // },
            { data: "enrollment.application_no" },
            {
                data: null,
                render: function (data, type, row) {
                    let middle = row.enrollment.middle_name ? ` ${row.enrollment.middle_name}` : "";
                    return `${row.enrollment.last_name}, ${row.enrollment.first_name}${middle} `.trim();
                }
            },
            { data: "enrollment.grade_level" },
            { data: "enrollment.gen_avg" },
            { 
                data: "message_pending",
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <input type="text" data-bs-toggle="modal" data-bs-target="#messagePendingModal" data-id="${row.id}" class="form-control" name="message_pending" value="${row.message_pending || ""}" style="min-width: 100%; cursor: pointer" readonly>
                    `;
                }
            },
            {
                data: "enrollment.created_at",
                searchable: false,
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {   
                data: "enrollment.status",
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <span class="badge bg-${row.enrollment.status === "Complete" ? "success" : "danger"} application-status">${row.enrollment.status.toUpperCase()}</span>
                    `;
                }
            },
            { 
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <div>
                            <button type="button" class="btn btn-primary btn-sm view-btn" data-bs-toggle="modal" data-bs-target="#viewApplicationModal" data-app='${JSON.stringify(row.enrollment)}' data-documents='${JSON.stringify(row.documents)}'>
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    `;
                }
            },
            {
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <div class="d-flex gap-2 d-md-block">
                            <button class="btn btn-success btn-sm reApproveBtn" data-id="${row.id}">
                                <i class="bi bi-check2"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            sLoadingRecords: '<div class="text-center">' +
                '<div class="spinner-border text-primary" role="status">' +
                '<span class="visually-hidden">Loading...</span>' +
                '</div>' +
            '</div>'
        },
    });


    // Application Table
    let applicationTable = $('#applicationTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.grade_level = $('#filter-grade-level').val();
            data.student_type = $('#filter-student-type').val();
            data.enrollment_type = $('#filter-enrollment-type').val();
            data.early_reg = $('#filter-early-reg').val();
            data.school_year = $('#filter-school-year').val();
            $.ajax({
                url: "/admin/applications/data/",
                type: "GET",
                data: data,
                dataType: "json",
                success: function (json) {
                setTimeout(function () {
                    callback(json);
                    }, 500);
                },
                error: function (jqXHR) {
                    if (jqXHR.status === 401) {
                        window.location.href = "/authentication/sign-in/";
                    }
                    return false;
                }
            });
        },
        searchable: true,
        fixedHeight: true,
        order: [],
        columns: [
            {
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    const disabled = row.status === "Missing" ? "disabled" : "";
                    return `
                        <input class="form-check-input row-check"
                            type="checkbox"
                            data-id="${row.id}"
                            data-status="${row.status}"
                            ${disabled}
                        >
                    `;
                }
            },
            { data: "application_no" },
            {
                data: null,
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name}, ${row.first_name}${middle} `.trim();
                }
            },
            { data: "student_type" },
            { data: "grade_level" },
            { data: "gen_avg" },
            { 
                data: "created_at",
                searchable: false,
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {   
                data: "status",
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <span class="badge bg-${row.status === "Complete" ? "success" : "danger"} application-status">${row.status.toUpperCase()}</span>
                    `;
                }
            },
            { 
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <div>
                            <button type="button" class="btn btn-primary btn-sm view-btn" data-bs-toggle="modal" data-bs-target="#viewApplicationModal" data-app='${JSON.stringify(row)}'>
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    `;
                }
            },
            {
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <div class="d-flex gap-2 d-md-block">
                            <button class="btn btn-success btn-sm approveBtn" data-id="${row.id}">
                                <i class="bi bi-check2"></i>
                            </button>
                            <button type="button" class="btn btn-warning btn-sm pendingBtn"
                                data-bs-toggle="modal" data-bs-target="#pendingApplicationModal" data-id="${row.id}">
                                <i class="bi bi-clock-history"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            sLoadingRecords: '<div class="text-center">' +
                '<div class="spinner-border text-primary" role="status">' +
                '<span class="visually-hidden">Loading...</span>' +
                '</div>' +
            '</div>'
        },
    })
    // Message Pending Open
    $('#messagePendingModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        applicaionPendingId = button.data('id');
        const currentValue = button.val() === '--' ? '' : button.val();
        $('#message_pending').val(currentValue);
    });
    
    // Message Pending Open Closes — reset ID and form
    $('#messagePendingModal').on('hidden.bs.modal', function () {
        $('#message_pending').val('');
        applicaionPendingId = null;
    });

    // Message Pending Form is Submitted
    $('#messagePendingForm').off('submit').on('submit', function (e) {
        e.preventDefault();
        if (!applicaionPendingId) return;
        const btn = $('.save-message-pending-btn');
        btn.prop('disabled', true).html(
            `<span class="spinner-border spinner-border-sm me-1" role="status"></span>`
        );

        const messagePending = $('#message_pending').val().trim() || '--';
        const rowInput = $(`#applicationRejectedTable input[name="message_pending"][data-id="${applicaionPendingId}"]`);
        rowInput.val(messagePending).trigger('change');
        setTimeout(function() {
            $.ajax({
                url: '/admin/message-pending/update/',
                type: 'POST',
                data: {
                    id: applicaionPendingId,
                    message_pending: messagePending
                },
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                success: function (response) {
                    if (!response.success) {
                        console.error(`Update failed for message pending:`, response.message);
                        btn.prop('disabled', false).html('Save');
                    } else {
                        $('#messagePendingModal').modal('hide');
                    }
                },
                error: function (xhr, status, error) {
                    console.error(`AJAX error updating message pending:`, error);
                    btn.prop('disabled', false).html('Save');
                },
                complete: function () {
                    btn.prop('disabled', false).html('Save');
                }
            });
        }, 300);
    });


    // Show & Hide Filter
    $('#filter-container-btn').on('click', function () {
        if($('#filter-container').css('display') === 'none') {
            $('#filter-container').css('display', 'block');
        } else {
            $('#filter-container').css('display', 'none');
        }
    });

    // Trigger filter
    $('#filter-grade-level, #filter-student-type, #filter-enrollment-type, #filter-early-reg, #filter-school-year')
    .on('change', function () {
        applicationTable.ajax.reload();
        applicationApprovedTable.ajax.reload();
        applicationPendingTable.ajax.reload();
    });

    // Clear filters button
    $('#clearFilters').on('click', function () {
        $('#filter-grade-level').val('');
        $('#filter-student-type').val('');
        $('#filter-enrollment-type').val('');
        $('#filter-early-reg').val('');
        $('#filter-school-year').val('');
        applicationTable.ajax.reload();
        applicationApprovedTable.ajax.reload();
        applicationPendingTable.ajax.reload();
    });

    $('#numeracyResultModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        currentNumeracyId = button.data('id');
        const currentValue = button.val() === '--' ? '' : button.val();
        $('#numeracy_result').val(currentValue);
    });

    // View Application
    $(document).on('click', '.view-btn', function () {
        const form = $("#enrollmentForm");
        form.find(".is-invalid").removeClass("is-invalid");
        form.find(".invalid-feedback").text("");
        const app = $(this).data('app');
        // console.log(app);
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("id", app.id);
        setValue("psa_no", app.psa_no);
        setValue("lrn", app.lrn);
        setValue("first_name", app.first_name);
        setValue("middle_name", app.middle_name);
        setValue("last_name", app.last_name);
        setValue("extension_name", app.extension_name);
        setValue("birth_date", app.birth_date);
        setValue("age", app.age);
        setValue("gender", app.gender);
        setValue("place_of_birth", app.place_of_birth);
        setValue("mother_tongue", app.mother_tongue);
        if (app.submission_remarks && app.submission_remarks.trim() !== "") {
            $("#submission_remarks_check").prop("checked", true);
            $("#submission_remarks_textarea").show();
            $("#submission_remarks").prop("disabled", true).val(app.submission_remarks);
        } else {
            $("#submission_remarks_check").prop("checked", false);
            $("#submission_remarks_textarea").hide();
            $("#submission_remarks").prop("disabled", true).val("");
        }
        //if checkbox is clicked show the textarea and the data
        $("#submission_remarks_check").on("click", function () {
            if ($(this).is(":checked")) {
                $("#submission_remarks_textarea").show();
                $("#submission_remarks").prop("disabled", false).val(app.submission_remarks);
            } else {
                $("#submission_remarks_textarea").hide();
                $("#submission_remarks").prop("disabled", true).val("");
            }
        });

        $("#documentForm input[type=checkbox]").prop("checked", false);
        if (!app.documents) {
            const documents = $(this).data('documents');
            // console.log(documents);
            documents.forEach(function(doc) {
                $("#document-" + doc.document_id).prop("checked", true);
            });
        } else {
            app.documents.forEach(function(doc) {
                $("#document-" + doc.document_id).prop("checked", true);
            });
        }


        const jhsHtml = `
            <div class="enrollment_information">
                <h5>Enrollment Information (JHS)</h5>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled readonly>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled readonly>
                            <option value="7" ${app.grade_level=='7'?'selected':''}>GRADE 7</option>
                            <option value="8" ${app.grade_level=='8'?'selected':''}>GRADE 8</option>
                            <option value="9" ${app.grade_level=='9'?'selected':''}>GRADE 9</option>
                            <option value="10" ${app.grade_level=='10'?'selected':''}>GRADE 10</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
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
                        <select class="form-select" id="school_year" name="school_year" disabled>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="student_type" class="form-label">Student Type</label>
                            <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                            </select>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${app.grade_level=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${app.grade_level=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${app.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${app.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="strand" class="form-label">Strand</label>
                        <select class="form-select" id="strand" name="strand" disabled>
                            <option value="">--</option>
                            <option value="ABM" ${app.strand=='ABM'?'selected':''}>ABM</option>
                            <option value="STEM" ${app.strand=='STEM'?'selected':''}>STEM</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        if (app.enrollment_type === "JHS") {
            $("#enrollemnt_jhs").html(jhsHtml);
            $("#enrollemnt_shs").empty();
        }  
        if (app.enrollment_type === "SHS") {
            $("#enrollemnt_shs").html(shsHtml);
            $("#enrollemnt_jhs").empty();
        }
    });

    // Application Approved Action
    $(document).on("click", ".approveBtn", function () {
        let dataId = $(this).data("id");
        console.log("ID:", dataId);
    
        Swal.fire({
            text: 'Are you sure you want to approve this application?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: "#1a742dff",
            cancelButtonText: "Cancel",
            confirmButtonText: "Yes",
            reverseButtons: true,
            allowOutsideClick: false,
            preConfirm: () => {
                Swal.showLoading();
    
                return new Promise((resolve, reject) => {
                    // Add 500ms delay before sending request
                    setTimeout(() => {
                        $.ajax({
                            url: "/admin/applications/approved/action/",
                            type: "POST",
                            data: { application_id: dataId },
                            headers: {
                                "X-CSRFToken": getCookie("csrftoken"),
                                "X-Requested-With": "XMLHttpRequest"
                            },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to approve application.");
                                reject(response);
                            }
                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            let errMsg = "Request failed: " + errorThrown;
                            if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                                errMsg = jqXHR.responseJSON.message;
                            } else if (jqXHR.responseText) {
                                errMsg = jqXHR.responseText;
                            }
    
                            Swal.hideLoading();
                            Swal.showValidationMessage(errMsg);
                            reject(errMsg);
                        });
                    }, 500);
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: "success",
                    title: "Approved!",
                    text: "The application has been successfully approved.",
                    confirmButtonText: "OK",
                }).then(() => {
                    applicationTable.ajax.reload();
                });
            }
        });
    });

    // Application Reapprove Action
    $(document).on("click", ".reApproveBtn", function () {
        let dataId = $(this).data("id");
        console.log("ID:", dataId);
        Swal.fire({
            text: 'Are you sure you want to re-approve this application?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: "#1a742dff",
            cancelButtonText: "Cancel",
            confirmButtonText: "Yes",
            reverseButtons: true,
            allowOutsideClick: false,
            preConfirm: () => {
                Swal.showLoading();
    
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: "/admin/applications/reapprove/action/",
                            type: "POST",
                            data: { application_id: dataId },
                            headers: {
                                "X-CSRFToken": getCookie("csrftoken"),
                                "X-Requested-With": "XMLHttpRequest"
                            },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to re-approve application.");
                                reject(response);
                            }
                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            let errMsg = "Request failed: " + errorThrown;
                            if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                                errMsg = jqXHR.responseJSON.message;
                            } else if (jqXHR.responseText) {
                                errMsg = jqXHR.responseText;
                            }
    
                            Swal.hideLoading();
                            Swal.showValidationMessage(errMsg);
                            reject(errMsg);
                        });
                    }, 500);
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
                    applicationPendingTable.ajax.reload();
                });
            }
        });
    });

    // Append Application ID to Modal
    $(document).on("click", ".pendingBtn", function () {
        let dataId = $(this).data("id");
        let modal = $("#pendingApplicationModal");
        modal.find("#application_id").val(dataId);
        modal.find("#message_pending").val("");
    });

    // Application Pending Action
    $(document).on("submit", "#pendingApplicationForm", function (e) {
        e.preventDefault();
        let modal = $("#pendingApplicationModal");
        let form = $(this);
        let formData = form.serialize();
        let pendingReason = form.find("#message_pending").val();
        console.log(formData);

        Swal.fire({
            text: "Are you sure you want to pending this application?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#1a742dff",
            cancelButtonText: "Cancel",
            confirmButtonText: "Yes",
            reverseButtons: true,
            allowOutsideClick: false,
            preConfirm: () => {
                if (pendingReason === "") {
                    Swal.showValidationMessage("Reason for pending cannot be empty.");
                    return false;
                }
                Swal.showLoading();
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: "/admin/applications/pending/action/",
                            type: "POST",
                            data: formData,
                            headers: {
                                "X-CSRFToken": getCookie("csrftoken"),
                                "X-Requested-With": "XMLHttpRequest"
                            },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to pending application.");
                                reject(response);
                            }
                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            let errMsg = "Request failed: " + errorThrown;
                            if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                                errMsg = jqXHR.responseJSON.message;
                            } else if (jqXHR.responseText) {
                                errMsg = jqXHR.responseText;
                            }
    
                            Swal.hideLoading();
                            Swal.showValidationMessage(errMsg);
                            reject(errMsg);
                        });
                    }, 500);
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: "success",
                    title: "Pending!",
                    text: "The application has been successfully pending.",
                    confirmButtonText: "OK",
                }).then(() => {
                    modal.modal("hide");
                    applicationTable.ajax.reload();
                });
            }
        });
    });

    // Save Application or Update Application
    $("#saveButton").on("click", function () {
        const $form = $("#enrollmentForm, #documentForm");
        let formData = $form.serialize();
        const $button = $(this);
        $button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
        setTimeout(function() {
            $.ajax({
                url: "/admin/applications/update/", 
                type: "POST",
                data: formData,
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest"
                },
                success: function (response) {
                    $button.prop("disabled", false).html("Save"); // Reset button
                    if (response.success) {
                        Swal.fire({
                            title: "Saved!",
                            text: response.message,
                            icon: "success",
                            confirmButtonText: "OK" 
                        });

                        $("#viewApplicationModal").modal("hide");
                        applicationTable.ajax.reload();
                        applicationPendingTable.ajax.reload();
                    } else if (response.errors) {
                        // Show validation errors
                        $.each(response.errors, function (field, messages) {
                            let $input = $form.find(`[name="${field}"]`);
                            $input.addClass("is-invalid");
                            let $feedback = $input.closest(".mb-3").find(".invalid-feedback");
                            $feedback.text(messages.join(" ")).addClass("d-block");
                        });
                    } else {
                        Swal.fire({ 
                            title: "Error!", 
                            text: response.message, 
                            icon: "error", 
                            confirmButtonText: "OK" 
                        });
                    }
                },
                error: function (xhr) {
                    $button.prop("disabled", false).html("Save"); // Reset button
                    Swal.fire("Error", "Something went wrong: " + xhr.statusText, "error");
                }
            });

            // Remove validation errors on input/change
            $form.on("input change", ".form-control, .form-select, .form-check-input", function () {
                $(this).removeClass("is-invalid");
                $(this).closest(".mb-3").find(".invalid-feedback").text("");
            });
        }, 1000);
    });


    $("#editButton").on("click", function () {
        enableEditForm();
    });

    $("#closeButton").on("click", function () {
        disableEditForm();
    });

    $("#viewApplicationModal").on("hidden.bs.modal", function () {
        disableEditForm();
    });

    // Submission Remarks Checkbox Toggle
    $(document).on('change', '#submission_remarks_check', function() {
        const isChecked = $(this).is(':checked');
        const textarea = $('#submission_remarks_textarea');
        const textareaInput = $('#submission_remarks');
        
        if (isChecked) {
            textarea.show();
            textareaInput.prop('disabled', false);
        } else {
            textarea.hide();
            textareaInput.prop('disabled', true).val('');
        }
    });

    $("#checkAll").on("change", function () {
        const isChecked = $(this).is(":checked");
    
        $(".row-check").each(function () {
            const status = $(this).data("status");
            if (status === "Complete") {
                $(this).prop("checked", isChecked);
            } else {
                $(this).prop("checked", false);
            }
        });
        toggleApproveButton();
        toggleReapproveButton();
    });

    $(document).on("change", ".row-check", function () {
        toggleApproveButton();
        toggleReapproveButton();
    });

    // Bulk Approve
    $("#approveAllBtn").on("click", function () {
        bulkAction("/admin/bulk_approve/", "Approve");
    });

    // Bulk Reapprove
    $("#reapproveAllBtn").on("click", function () {
        bulkAction("/admin/bulk_reapprove/", "Re-Approve");
    });

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
            console.log(result);
            if (!result.isConfirmed) return;

            const batchKey = result.value.batch_key;
            const total = result.value.total;

            Swal.fire({
                title: `Approving All`,
                html: `<div id="progressText">Approving all applications...</div>`,
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
                                }).then(() => {
                                    applicationTable.ajax.reload();
                                    applicationPendingTable.ajax.reload();
                                });
                            }
                        });
                    }, 1000);

                }
            });
        });
    }


});

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

function toggleApproveButton() {
    const anyChecked = $(".row-check:checked").length > 0;
    $("#approveAllBtn").prop("disabled", !anyChecked);
}

function toggleReapproveButton() {
    const anyChecked = $(".row-check:checked").length > 0;
    $("#reapproveAllBtn").prop("disabled", !anyChecked);
}

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