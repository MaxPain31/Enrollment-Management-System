
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
        
        // Current Address
        setValue("current_house_no", app.current_house_no);
        setValue("current_street", app.current_street);
        setValue("current_barangay", app.current_barangay);
        setValue("current_municipality", app.current_municipality);
        setValue("current_province", app.current_province);
        setValue("current_country", app.current_country || "PHILIPPINES");
        setValue("current_zip_code", app.current_zip_code);
        
        // Permanent Address
        setValue("permanent_house_no", app.permanent_house_no);
        setValue("permanent_street", app.permanent_street);
        setValue("permanent_barangay", app.permanent_barangay);
        setValue("permanent_municipality", app.permanent_municipality);
        setValue("permanent_province", app.permanent_province);
        setValue("permanent_country", app.permanent_country || "PHILIPPINES");
        setValue("permanent_zip_code", app.permanent_zip_code);
        
        // Check if permanent address is same as current
        if (app.current_house_no && app.permanent_house_no && 
            app.current_street && app.permanent_street &&
            app.current_house_no === app.permanent_house_no &&
            app.current_street === app.permanent_street) {
            $("#same_as_current_view").prop("checked", true);
        } else {
            $("#same_as_current_view").prop("checked", false);
        }
        
        // Parent's/Guardian's Information
        setValue("father_last_name", app.father_last_name);
        setValue("father_first_name", app.father_first_name);
        setValue("father_middle_name", app.father_middle_name);
        setValue("father_contact_number", app.father_contact_number);
        setValue("mother_last_name", app.mother_last_name);
        setValue("mother_first_name", app.mother_first_name);
        setValue("mother_middle_name", app.mother_middle_name);
        setValue("mother_contact_number", app.mother_contact_number);
        setValue("guardian_last_name", app.guardian_last_name);
        setValue("guardian_first_name", app.guardian_first_name);
        setValue("guardian_middle_name", app.guardian_middle_name);
        setValue("guardian_contact_number", app.guardian_contact_number);
        
        // IP Community
        if (app.ip_community === "yes") {
            $("#ip_community_yes").prop("checked", true);
            $("#ip_community_specify_view").show();
            setValue("ip_community_specify_text", app.ip_community_specify_text);
        } else {
            $("#ip_community_no").prop("checked", true);
            $("#ip_community_specify_view").hide();
        }
        
        // 4Ps Beneficiary
        if (app.beneficiary_4ps === "yes") {
            $("#beneficiary_4ps_yes").prop("checked", true);
            $("#household_id_field_view").show();
            setValue("household_id_number", app.household_id_number);
        } else {
            $("#beneficiary_4ps_no").prop("checked", true);
            $("#household_id_field_view").hide();
        }
        
        // Learner with Disability
        if (app.learner_with_disability === "yes") {
            $("#learner_disability_yes").prop("checked", true);
            $("#disability_types_section_view").show();
            
            // Parse disability types from JSON
            let disabilityTypes = [];
            let disabilityVisualTypes = [];
            let disabilityHealthTypes = [];
            
            try {
                if (app.disability_type) {
                    disabilityTypes = typeof app.disability_type === 'string' ? JSON.parse(app.disability_type) : app.disability_type;
                }
                if (app.disability_visual_type) {
                    disabilityVisualTypes = typeof app.disability_visual_type === 'string' ? JSON.parse(app.disability_visual_type) : app.disability_visual_type;
                }
                if (app.disability_health_type) {
                    disabilityHealthTypes = typeof app.disability_health_type === 'string' ? JSON.parse(app.disability_health_type) : app.disability_health_type;
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
        if (app.enrollment_type === "SHS" && app.learning_modality) {
            $("#learning_modality_section").show();
            let learningModalities = [];
            try {
                learningModalities = typeof app.learning_modality === 'string' ? JSON.parse(app.learning_modality) : app.learning_modality;
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
        
        if (app.status === "Complete") {
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
        if (app.submission_remarks && app.submission_remarks.trim() !== "") {
            $("#submission_remarks_check").prop("checked", true);
            $("#submission_remarks_textarea").show();
            $("#submission_remarks").prop("disabled", true).val(app.submission_remarks);
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
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
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
                    <div class="col-12 col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ${(app.student_type === 'RETURNING' || app.student_type === 'TRANSFEREE' || app.last_grade_level || app.last_school_year || app.last_school_attended || app.school_id) ? `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_grade_level" class="form-label">Last Grade Level Completed</label>
                        <input type="text" class="form-control" id="last_grade_level" name="last_grade_level" value="${app.last_grade_level || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_year" class="form-label">Last School Year Completed</label>
                        <input type="text" class="form-control" id="last_school_year" name="last_school_year" value="${app.last_school_year || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_attended" class="form-label">Last School Attended</label>
                        <input type="text" class="form-control text-uppercase" id="last_school_attended" name="last_school_attended" value="${app.last_school_attended || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="school_id" class="form-label">School ID</label>
                        <input type="text" class="form-control" id="school_id" name="school_id" value="${app.school_id || ''}" disabled>
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
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${app.grade_level=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${app.grade_level=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${app.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${app.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled>
                            <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ${(app.student_type === 'RETURNING' || app.student_type === 'TRANSFEREE' || app.last_grade_level || app.last_school_year || app.last_school_attended || app.school_id) ? `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_grade_level" class="form-label">Last Grade Level Completed</label>
                        <input type="text" class="form-control" id="last_grade_level" name="last_grade_level" value="${app.last_grade_level || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_year" class="form-label">Last School Year Completed</label>
                        <input type="text" class="form-control" id="last_school_year" name="last_school_year" value="${app.last_school_year || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="last_school_attended" class="form-label">Last School Attended</label>
                        <input type="text" class="form-control text-uppercase" id="last_school_attended" name="last_school_attended" value="${app.last_school_attended || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="school_id" class="form-label">School ID</label>
                        <input type="text" class="form-control" id="school_id" name="school_id" value="${app.school_id || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                ` : ''}
                <div class="row">
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="science_avg" class="form-label">Science Average</label>
                        <input type="number" step="0.01" class="form-control" id="science_avg" name="science_avg" value="${app.science_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="math_avg" class="form-label">Math Average</label>
                        <input type="number" step="0.01" class="form-control" id="math_avg" name="math_avg" value="${app.math_avg || ''}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-2 mb-3">
                        <label for="track" class="form-label">Track</label>
                        <select class="form-select" id="track" name="track" disabled>
                            <option value="">--</option>
                            <option value="Academic Track" ${app.track=='Academic Track'?'selected':''}>Academic Track</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-3 mb-3">
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