$(document).ready(function () {
    let studentListTable = $('#studentListTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function(data, callback, settings) {
            data.gender = $('#filter-gender').val();
            $.ajax({
                url: `/teacher/student_list/data/`,
                type: "GET",
                data: data,
                dataType: "json",
                success: function(json) {
                    if (json.haveAllFinalAverage) {
                        $('#markAsCompletedSectionBtn').prop('disabled', false);
                        if (json.section_status === 'Completed' || json.section_status === 'Inactive') {
                            $('#markAsCompletedSectionBtn').prop('disabled', true);
                        }
                    } else {
                        $('#markAsCompletedSectionBtn').prop('disabled', true);
                    }
                    setTimeout(function() {
                        callback(json);
                    }, 500);
                },
                error: function(jqXHR) {
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
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart;
                }
            },
            {
                data: "student_information.lrn",
                className: "align-middle text-center",
            },
            { 
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.student_information.middle_name ? ` ${row.student_information.middle_name}` : "";
                    if (row.status === "Missing" || (row.student_information.submission_remarks && row.student_information.submission_remarks.trim() !== "")) {
                        return `<p class="text-danger mb-0">${row.student_information.last_name}, ${row.student_information.first_name}${middle} </p>`.trim();
                    } else {
                        return `<p class="text-success mb-0">${row.student_information.last_name}, ${row.student_information.first_name}${middle} </p>`.trim();
                    }
                }
            },
            {
                data: "grade_level",
                className: "align-middle text-center",
                searchable: false,
                orderable: false,
            },
            {
                data: "student_information.section",
                className: "align-middle text-center",
                searchable: false,
                orderable: false,
            },
            {
                data: "previous_final_average",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return data ? data : "-";
                }
            },
            {
                data: "final_average",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return data ? data : "-";
                }
            },
            {
                data: "student_information.gender",
                className: "align-middle text-center",
            },
            {
                data: null,
                searchable: false,
                orderable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.teacher_information.middle_name ? ` ${row.teacher_information.middle_name}` : "";
                    return `${row.teacher_information.first_name}${middle} ${row.teacher_information.last_name}`.trim();
                }
            },
            {
                data: "student_information.student_status",
                className: "align-middle text-center",
                searchable: false,
                orderable: false,
                render: function (data, type, row) {
                    return `<strong>${data}</strong>`;
                }
            },
            {
                data: "created_at",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    if (!data) return ""; 
                    const date = new Date(data);
                    const options = {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                    };
            
                    return date.toLocaleString("en-US", options);
                }
            },
            {
                data: null,
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-primary btn-sm view-btn" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="View Student" data-bs-target="#viewStudentModal" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-eye"></i>                       
                        </button>
                        <button type="button" class="btn btn-info btn-sm input-grade-btn" data-bs-toggle="modal" data-bs-target="#inputGradeModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Input Final Grade" data-id="${row.id}" ${row.section.status === 'Completed' || row.section.status === 'Inactive' ? 'disabled' : ''}>
                            <i class="bi bi-pencil-square"></i>
                        </button>
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
        drawCallback: function (settings) {
            $('[data-bs-toggle-second="tooltip"]').each(function () {
                if (!bootstrap.Tooltip.getInstance(this)) {
                    new bootstrap.Tooltip(this);
                }
            });
            
        }
    });

    // Edit Student Status Modal
    $("#editStudentStatusModal").on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const userId = button.data('id');
        const studentStatus = button.data('student-status');
        $("#studentStatus").val(studentStatus);
        $(document).on('submit', '#editStatusForm', function (e) {
            e.preventDefault();
            let formData = $(this).serialize();
            formData = formData + `&student_id=${userId}`;
            Swal.fire({
                title: 'Edit Student Status',
                text: 'Are you sure you want to edit the student status?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes',
                preConfirm: () => {
                    Swal.showLoading();
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            $.ajax({
                                url: '/coordinator/edit-student-status/',
                                type: 'POST',
                                data: formData,
                                headers: {
                                    'X-CSRFToken': getCookie('csrftoken'),
                                }
                            })
                            .done(function(response) {
                                if (response.success) {
                                    resolve(response);
                                } else {
                                    Swal.hideLoading();
                                    Swal.showValidationMessage(response.message || "Failed to edit student status.");
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
                            });
                        }, 500);
                    });
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        icon: "success",
                        title: "Success!",
                        text: "The student status has been successfully edited.",
                        confirmButtonText: "OK",
                    }).then(() => {
                        studentListTable.ajax.reload();
                    });
                }
            });
        })
    });

    // View User Modal
    $(document).on('click', '.view-btn', function () {
        const form = $("#viewStudentForm");
        form.find(".is-invalid").removeClass("is-invalid");
        form.find(".invalid-feedback").text("");
        const app = $(this).data('info');
        // console.log(app);
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("id", app.student_information.id);
        setValue("psa_no", app.student_information.psa_no);
        setValue("lrn", app.student_information.lrn);
        setValue("first_name", app.student_information.first_name);
        setValue("middle_name", app.student_information.middle_name);
        setValue("last_name", app.student_information.last_name);
        setValue("extension_name", app.student_information.extension_name);
        setValue("birth_date", app.student_information.birth_date);
        setValue("age", app.student_information.age);
        setValue("gender", app.student_information.gender);
        setValue("place_of_birth", app.student_information.place_of_birth);
        setValue("mother_tongue", app.student_information.mother_tongue);
        if (app.student_information.status === "Complete") {
            $("#document-status").html(`<span class="badge bg-success">Complete</span>`);
        } else {
            $("#document-status").html(`<span class="badge bg-danger">Missing</span>`);
        }
        $("#documentForm input[type=checkbox]").prop("checked", false);
        if (!app.documents) {
            const documents = $(this).data('documents');
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
                <h5>Student Information (JHS)</h5>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled readonly>
                            <option value="${app.student_information.school_year}">${app.student_information.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled readonly>
                            <option value="7" ${app.student_information.grade_level=='7'?'selected':''}>GRADE 7</option>
                            <option value="8" ${app.student_information.grade_level=='8'?'selected':''}>GRADE 8</option>
                            <option value="9" ${app.student_information.grade_level=='9'?'selected':''}>GRADE 9</option>
                            <option value="10" ${app.student_information.grade_level=='10'?'selected':''}>GRADE 10</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${app.student_information.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_information.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_information.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.student_information.gen_avg}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        const shsHtml = `
            <div class="enrollment_information">
                <h5>Student Information (SHS)</h5>
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled>
                            <option value="${app.student_information.school_year}">${app.student_information.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="student_type" class="form-label">Student Type</label>
                            <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                <option value="new student" ${app.student_information.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                <option value="returning" ${app.student_information.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                <option value="transferee" ${app.student_information.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                            </select>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${app.student_information.grade_level=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${app.student_information.grade_level=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.student_information.gen_avg}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${app.student_information.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${app.student_information.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="strand" class="form-label">Strand</label>
                        <select class="form-select" id="strand" name="strand" disabled>
                            <option value="">--</option>
                            <option value="ABM" ${app.student_information.strand=='ABM'?'selected':''}>ABM</option>
                            <option value="STEM" ${app.student_information.strand=='STEM'?'selected':''}>STEM</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        // Always clear the submission remarks form first
        $("#submissionRemarksForm").empty();

        // Only show submission remarks if status is Missing or if there are actual remarks
        if (app.status === "Missing" || (app.submission_remarks && app.submission_remarks.trim() !== "")) {
            const submissionRemarksHtml = `
                <div class="d-flex align-items-center gap-2 my-2">
                    <h5 class="mt-2">Submission Remarks</h5>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="mb-3">
                            <textarea class="form-control" id="submission_remarks" name="submission_remarks" rows="5" style="resize: none;" disabled>${app.submission_remarks || ''}</textarea>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                </div>
            `;
            $("#submissionRemarksForm").html(submissionRemarksHtml);
        }

        if (app.student_information.enrollment_type === "JHS") {
            $("#enrollemnt_jhs").html(jhsHtml);
            $("#enrollemnt_shs").empty();
        }  
        if (app.student_information.enrollment_type === "SHS") {
            $("#enrollemnt_shs").html(shsHtml);
            $("#enrollemnt_jhs").empty();
        }
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
    $('#filter-gender')
    .on('change', function () {
        studentListTable.ajax.reload();
    });

    // Clear filters button
    $('#clearFilters').on('click', function () {
        $('#filter-gender').val('');
        studentListTable.ajax.reload();
    });

    // Input Final Grade Modal
    $(document).on('click', '.input-grade-btn', function () {
        const student_id = $(this).data('id');
        $("#final_average").val('');
        
        // Unbind previous submit handlers to prevent duplicates
        $("#inputFinalGradeForm").off("submit").on("submit", function (e) {
            e.preventDefault();
            const form = $(this);
            const button = $("#saveButton");
            let formData = form.serialize();
            formData += `&student_id=${student_id}`;
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
            setTimeout(function () {
                $.ajax({
                    url: '/teacher/input_final_average/',
                    type: 'POST',
                    data: formData,
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    success: function (response) {
                        button.prop("disabled", false).html("Save");
                        form.find('.is-invalid').removeClass('is-invalid');
                        form.find('.invalid-feedback').text('').hide();
        
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Final grade updated!',
                                text: response.message,
                                confirmButtonText: 'OK'
                            }).then(() => {
                                $('#inputGradeModal').modal('hide');
                                studentListTable.ajax.reload();
                            });
                        } else {
                            let errors = response.message;
                            for (let fieldName in errors) {
                                let field = form.find(`[name="${fieldName}"]`);
                                let feedback = field.siblings(".invalid-feedback");
                                field.addClass("is-invalid");
                                feedback.text(errors[fieldName][0]).show();
                            }
                            Swal.fire({
                                icon: 'error',
                                title: 'Validation Error',
                                text: 'Please correct the highlighted fields.'
                            });
                        }
                    },
                    error: function () {
                        button.prop("disabled", false).html("Save");
                        Swal.fire({
                            icon: 'error',
                            title: 'Server Error',
                            text: 'Something went wrong. Please try again later.'
                        });
                    }
                });
            }, 500);
            form.on("input change", ".form-control, .form-select, .form-check-input", function () {
                $(this).removeClass("is-invalid");
                $(this).siblings(".invalid-feedback").text("").hide();
            });
        });
    });

    

    // Mark Section as Completed Button
    $('#markAsCompletedSectionBtn').on('click', function () {
        const section_id = $(this).data('section-id');
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to mark the section as completed?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                Swal.showLoading();
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: '/teacher/mark_as_completed_section/',
                            type: 'POST',
                            data: { section_id: section_id },
                            headers: { 'X-CSRFToken': getCookie('csrftoken') },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to mark section as completed.");
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
                    icon: 'success',
                    title: 'Section marked as completed!',
                    text: result.message,
                }).then(() => {
                    location.reload();
                });
            }
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