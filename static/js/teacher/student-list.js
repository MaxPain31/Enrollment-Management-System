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
                    if (row.student_information.status === "Missing" || (row.student_information.submission_remarks && row.student_information.submission_remarks.trim() !== "")) {
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
        const student = app.student_information;
        setValue("id", student.id);
        setValue("psa_no", student.psa_no);
        setValue("lrn", student.lrn);
        setValue("first_name", student.first_name);
        setValue("middle_name", student.middle_name);
        setValue("last_name", student.last_name);
        setValue("extension_name", student.extension_name);
        setValue("birth_date", student.birth_date);
        setValue("age", student.age);
        setValue("gender", student.gender);
        setValue("place_of_birth", student.place_of_birth);
        setValue("mother_tongue", student.mother_tongue);
        
        // Current Address
        setValue("current_house_no", student.current_house_no);
        setValue("current_street", student.current_street);
        setValue("current_barangay", student.current_barangay);
        setValue("current_municipality", student.current_municipality);
        setValue("current_province", student.current_province);
        setValue("current_country", student.current_country || "PHILIPPINES");
        setValue("current_zip_code", student.current_zip_code);
        
        // Permanent Address
        setValue("permanent_house_no", student.permanent_house_no);
        setValue("permanent_street", student.permanent_street);
        setValue("permanent_barangay", student.permanent_barangay);
        setValue("permanent_municipality", student.permanent_municipality);
        setValue("permanent_province", student.permanent_province);
        setValue("permanent_country", student.permanent_country || "PHILIPPINES");
        setValue("permanent_zip_code", student.permanent_zip_code);
        
        // Check if permanent address is same as current
        if (student.current_house_no && student.permanent_house_no && 
            student.current_street && student.permanent_street &&
            student.current_house_no === student.permanent_house_no &&
            student.current_street === student.permanent_street) {
            $("#same_as_current_view").prop("checked", true);
        } else {
            $("#same_as_current_view").prop("checked", false);
        }
        
        // Parent's/Guardian's Information
        setValue("father_last_name", student.father_last_name);
        setValue("father_first_name", student.father_first_name);
        setValue("father_middle_name", student.father_middle_name);
        setValue("father_contact_number", student.father_contact_number);
        setValue("mother_last_name", student.mother_last_name);
        setValue("mother_first_name", student.mother_first_name);
        setValue("mother_middle_name", student.mother_middle_name);
        setValue("mother_contact_number", student.mother_contact_number);
        setValue("guardian_last_name", student.guardian_last_name);
        setValue("guardian_first_name", student.guardian_first_name);
        setValue("guardian_middle_name", student.guardian_middle_name);
        setValue("guardian_contact_number", student.guardian_contact_number);
        
        // IP Community
        if (student.ip_community === "yes") {
            $("#ip_community_yes").prop("checked", true);
            $("#ip_community_specify_view").show();
            setValue("ip_community_specify_text", student.ip_community_specify_text);
        } else {
            $("#ip_community_no").prop("checked", true);
            $("#ip_community_specify_view").hide();
        }
        
        // 4Ps Beneficiary
        if (student.beneficiary_4ps === "yes") {
            $("#beneficiary_4ps_yes").prop("checked", true);
            $("#household_id_field_view").show();
            setValue("household_id_number", student.household_id_number);
        } else {
            $("#beneficiary_4ps_no").prop("checked", true);
            $("#household_id_field_view").hide();
        }
        
        // Learner with Disability
        if (student.learner_with_disability === "yes") {
            $("#learner_disability_yes").prop("checked", true);
            $("#disability_types_section_view").show();
            
            // Parse disability types from JSON
            let disabilityTypes = [];
            let disabilityVisualTypes = [];
            let disabilityHealthTypes = [];
            
            try {
                if (student.disability_type) {
                    disabilityTypes = typeof student.disability_type === 'string' ? JSON.parse(student.disability_type) : student.disability_type;
                }
                if (student.disability_visual_type) {
                    disabilityVisualTypes = typeof student.disability_visual_type === 'string' ? JSON.parse(student.disability_visual_type) : student.disability_visual_type;
                }
                if (student.disability_health_type) {
                    disabilityHealthTypes = typeof student.disability_health_type === 'string' ? JSON.parse(student.disability_health_type) : student.disability_health_type;
                }
            } catch (e) {
                console.error("Error parsing disability JSON:", e);
            }
            
            let disabilityHtml = '<div class="row"><div class="col-12 col-md-6">';
            
            if (disabilityTypes.includes('visual_impairment')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Visual Impairment</strong></label></div>';
                if (disabilityVisualTypes.includes('blind')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• blind</label></div>';
                }
                if (disabilityVisualTypes.includes('low_vision')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• low vision</label></div>';
                }
            }
            if (disabilityTypes.includes('hearing_impairment')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Hearing Impairment</strong></label></div>';
            }
            if (disabilityTypes.includes('speech_language_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Speech/Language Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('multiple_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Multiple Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('learning_disability')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Learning Disability</strong></label></div>';
            }
            
            disabilityHtml += '</div><div class="col-12 col-md-6">';
            
            if (disabilityTypes.includes('emotional_behavioral_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Emotional-Behavioral Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('cerebral_palsy')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Cerebral Palsy</strong></label></div>';
            }
            if (disabilityTypes.includes('intellectual_disability')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Intellectual Disability</strong></label></div>';
            }
            if (disabilityTypes.includes('orthopedic_physical_handicap')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Orthopedic/Physical Handicap</strong></label></div>';
            }
            if (disabilityTypes.includes('special_health_problem')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Special Health Problem/Chronic Disease</strong></label></div>';
                if (disabilityHealthTypes.includes('cancer')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• Cancer</label></div>';
                }
            }
            
            disabilityHtml += '</div></div>';
            $("#disability_types_display").html(disabilityHtml);
        } else {
            $("#learner_disability_no").prop("checked", true);
            $("#disability_types_section_view").hide();
        }
        
        // Distance Learning Modalities (SHS only)
        if (student.enrollment_type === "SHS" && student.learning_modality) {
            $("#learning_modality_section").show();
            let learningModalities = [];
            try {
                learningModalities = typeof student.learning_modality === 'string' ? JSON.parse(student.learning_modality) : student.learning_modality;
            } catch (e) {
                console.error("Error parsing learning modality JSON:", e);
            }
            
            const modalityLabels = {
                'modular_print': 'Modular (Print)',
                'online': 'Online',
                'radio_based': 'Radio-Based Instruction',
                'blended': 'Blended',
                'modular_digital': 'Modular (Digital)',
                'educational_tv': 'Educational Television',
                'homeschooling': 'Homeschooling'
            };
            
            let modalityHtml = '<div class="row"><div class="col-12 col-md-6">';
            learningModalities.forEach((mod, index) => {
                if (index > 0 && index % 4 === 0) {
                    modalityHtml += '</div><div class="col-12 col-md-6">';
                }
                modalityHtml += `<div class="form-check mb-2"><label class="form-check-label">✓ ${modalityLabels[mod] || mod}</label></div>`;
            });
            modalityHtml += '</div></div>';
            $("#learning_modality_display").html(modalityHtml);
        } else {
            $("#learning_modality_section").hide();
        }
        
        if (student.status === "Complete") {
            $("#document-status").html(`<span class="badge bg-success">Complete</span>`);
        } else {
            $("#document-status").html(`<span class="badge bg-danger">Missing</span>`);
        }
        $("#documentForm input[type=checkbox]").prop("checked", false);
        if (!app.documents) {
            const documents = $(this).data('documents');
            if (documents) {
                documents.forEach(function(doc) {
                    $("#document-" + doc.document_id).prop("checked", true);
                });
            }
        } else {
            app.documents.forEach(function(doc) {
                $("#document-" + doc.document_id).prop("checked", true);
            });
        }
        
        // Submission Remarks
        if (student.submission_remarks && student.submission_remarks.trim() !== "") {
            $("#submission_remarks_check").prop("checked", true);
            $("#submission_remarks_textarea").show();
            $("#submission_remarks").prop("disabled", true).val(student.submission_remarks);
        } else {
            $("#submission_remarks_check").prop("checked", false);
            $("#submission_remarks_textarea").hide();
            $("#submission_remarks").prop("disabled", true).val("");
        }

        const jhsHtml = `
            <div class="enrollment_information">
                <h5>Student Information (JHS)</h5>
                <div class="row">
                    <div class="col-12 col-md-6 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled readonly>
                            <option value="${student.school_year}">${student.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled readonly>
                            <option value="7" ${student.grade_level=='7'?'selected':''}>GRADE 7</option>
                            <option value="8" ${student.grade_level=='8'?'selected':''}>GRADE 8</option>
                            <option value="9" ${student.grade_level=='9'?'selected':''}>GRADE 9</option>
                            <option value="10" ${student.grade_level=='10'?'selected':''}>GRADE 10</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${student.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${student.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${student.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${student.gen_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ${(student.student_type === 'RETURNING' || student.student_type === 'TRANSFEREE' || student.last_grade_level || student.last_school_year || student.last_school_attended || student.school_id) ? `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_grade_level" class="form-label">Last Grade Level Completed</label>
                        <input type="text" class="form-control" id="last_grade_level" name="last_grade_level" value="${student.last_grade_level || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_year" class="form-label">Last School Year Completed</label>
                        <input type="text" class="form-control" id="last_school_year" name="last_school_year" value="${student.last_school_year || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_attended" class="form-label">Last School Attended</label>
                        <input type="text" class="form-control text-uppercase" id="last_school_attended" name="last_school_attended" value="${student.last_school_attended || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="school_id" class="form-label">School ID</label>
                        <input type="text" class="form-control" id="school_id" name="school_id" value="${student.school_id || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        const shsHtml = `
            <div class="enrollment_information">
                <h5>Student Information (SHS)</h5>
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled>
                            <option value="${student.school_year}">${student.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${student.grade_level=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${student.grade_level=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${student.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${student.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled>
                            <option value="new student" ${student.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${student.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${student.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ${(student.student_type === 'RETURNING' || student.student_type === 'TRANSFEREE' || student.last_grade_level || student.last_school_year || student.last_school_attended || student.school_id) ? `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_grade_level" class="form-label">Last Grade Level Completed</label>
                        <input type="text" class="form-control" id="last_grade_level" name="last_grade_level" value="${student.last_grade_level || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_year" class="form-label">Last School Year Completed</label>
                        <input type="text" class="form-control" id="last_school_year" name="last_school_year" value="${student.last_school_year || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_attended" class="form-label">Last School Attended</label>
                        <input type="text" class="form-control text-uppercase" id="last_school_attended" name="last_school_attended" value="${student.last_school_attended || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="school_id" class="form-label">School ID</label>
                        <input type="text" class="form-control" id="school_id" name="school_id" value="${student.school_id || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ` : ''}
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${student.gen_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="science_avg" class="form-label">Science Average</label>
                        <input type="number" step="0.01" class="form-control" id="science_avg" name="science_avg" value="${student.science_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="math_avg" class="form-label">Math Average</label>
                        <input type="number" step="0.01" class="form-control" id="math_avg" name="math_avg" value="${student.math_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="track" class="form-label">Track</label>
                        <select class="form-select" id="track" name="track" disabled>
                            <option value="">--</option>
                            <option value="Academic Track" ${student.track=='Academic Track'?'selected':''}>Academic Track</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="strand" class="form-label">Strand</label>
                        <select class="form-select" id="strand" name="strand" disabled>
                            <option value="">--</option>
                            <option value="ABM" ${student.strand=='ABM'?'selected':''}>ABM</option>
                            <option value="STEM" ${student.strand=='STEM'?'selected':''}>STEM</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        if (student.enrollment_type === "JHS") {
            $("#enrollemnt_jhs").html(jhsHtml);
            $("#enrollemnt_shs").empty();
        }  
        if (student.enrollment_type === "SHS") {
            $("#enrollemnt_shs").html(shsHtml);
            $("#enrollemnt_jhs").empty();
        }
        
        // Reset modal state when it closes
        $("#viewStudentModal").on('hidden.bs.modal', function () {
            $("#submission_remarks_check").off("click");
            $("#submission_remarks_textarea").hide();
            $("#submission_remarks").val("").prop("disabled", true);
        });
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