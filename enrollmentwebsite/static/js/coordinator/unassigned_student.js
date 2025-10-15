
$(document).ready(function () {
    let grade = $('#unassignedStudentsTable').data('grade');
    let unassignedStudentsTable = $('#unassignedStudentsTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function(data, callback, settings) {
            data.gender = $('#filter-gender').val();
            data.general_average = $('#filter-general-average').val();
            $.ajax({
                url: `/coordinator/student-unassigned-list/${grade}/data/`,
                type: "GET",
                data: data,
                dataType: "json",
                success: function(json) {
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
                data: "lrn",
                className: "align-middle text-center",
            },
            { 
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name}, ${row.first_name}${middle} `.trim();
                }
            },
            { 
                data: "school_year",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
            },
            { 
                data: "grade",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <strong>${row.grade}</strong>
                    `;
                }
            },
            { 
                data: "section",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <span class="badge bg-secondary">${row.section ? row.section : "UNASSIGNED"}</span>
                    `;
                }
            },
            { 
                data: "gen_avg",
                className: "align-middle text-center",
            },
            { 
                data: "gender",
                className: "align-middle text-center",
            },
            { 
                data: "student_status", 
                orderable: false, 
                searchable: false,
                className: "align-middle text-center",
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
        drawCallback: function (settings) {
            $('[data-bs-toggle-second="tooltip"]').each(function () {
                if (!bootstrap.Tooltip.getInstance(this)) {
                    new bootstrap.Tooltip(this);
                }
            });
        }
    });

    // View User Modal
    $(document).on('click', '.view-btn', function () {
        const form = $("#viewStudentForm");
        form.find(".is-invalid").removeClass("is-invalid");
        form.find(".invalid-feedback").text("");
        const app = $(this).data('info');
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
                <h5>Student Information (SHS)</h5>
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

    // Show & Hide Filter
    $('#filter-container-btn').on('click', function () {
        if($('#filter-container').css('display') === 'none') {
            $('#filter-container').css('display', 'block');
        } else {
            $('#filter-container').css('display', 'none');
        }
    });

    // Trigger filter
    $('#filter-gender, #filter-general-average')
    .on('change', function () {
        unassignedStudentsTable.ajax.reload();
    });

    // Clear filters button
    $('#clearFilters').on('click', function () {
        $('#filter-gender').val('');
        $('#filter-general-average').val('');
        unassignedStudentsTable.ajax.reload();
    });
});