let currentLiteracyId = null;
let currentNumeracyId = null;

$(document).ready(function() {
    let assessmentTable = $("#assessmentTable").DataTable({
        serverSide: true,
        processing: true,
        ajax: function(data, callback, settings) {
            $.ajax({
                url: "/coordinator/assessment/data/",
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
                className: "text-center align-middle",
                render: function (data, type, row) {
                    const isDisabled =
                        !row.literacy_level || row.literacy_level === "--" ||
                        !row.literacy_result || row.literacy_result === "--" ||
                        !row.numeracy_level || row.numeracy_level === "--" ||
                        !row.numeracy_result || row.numeracy_result === "--";

                    const disabledAttr = isDisabled ? 'disabled="disabled"' : '';
                    return `
                        <input class="form-check-input row-check"
                               type="checkbox"
                               data-id="${row.id}"
                               ${disabledAttr}>
                    `;
                }
            },
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
                data: "application_approved.enrollment.lrn",
                className: "align-middle text-center",
            },
            { 
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.application_approved.enrollment.middle_name ? ` ${row.application_approved.enrollment.middle_name}` : "";
                    return `${row.application_approved.enrollment.last_name}, ${row.application_approved.enrollment.first_name}${middle} `.trim();
                }
            },
            { 
                data: "application_approved.enrollment.grade_level",
                className: "align-middle text-center",
            },
            { 
                data: null,
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <select class="form-select auto-save" id="literacy_level" name="literacy_level" style="min-width: 150px;" data-id="${row.id}">
                            <option>--</option>
                            <option value="Advanced" ${row.literacy_level === "Advanced" ? "selected" : ""}>Advanced</option>
                            <option value="Independent" ${row.literacy_level === "Independent" ? "selected" : ""}>Independent</option>
                            <option value="Instructional" ${row.literacy_level === "Instructional" ? "selected" : ""}>Instructional</option>
                            <option value="Frustration" ${row.literacy_level === "Frustration" ? "selected" : ""}>Frustration</option>
                        </select>
                    `;
                }
            },
            { 
                data: "literacy_result",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <input type="text" data-bs-toggle="modal" data-bs-target="#literacyResultModal" data-id="${row.id}" class="form-control" name="literacy_result" value="${row.literacy_result || ""}" style="min-width: 100%; cursor: pointer" readonly>
                    `;
                }
            },
            { 
                data: null,
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <select class="form-select auto-save" id="numeracy_level" name="numeracy_level" style="min-width: 150px;" data-id="${row.id}">
                            <option>--</option>
                            <option value="Advanced" ${row.numeracy_level === "Advanced" ? "selected" : ""}>Advanced</option>
                            <option value="Independent" ${row.numeracy_level === "Independent" ? "selected" : ""}>Independent</option>
                            <option value="Instructional" ${row.numeracy_level === "Instructional" ? "selected" : ""}>Instructional</option>
                            <option value="Frustration" ${row.numeracy_level === "Frustration" ? "selected" : ""}>Frustration</option>
                        </select>
                    `;
                }
            },
            { 
                data: "numeracy_result",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <input type="text" data-bs-toggle="modal" data-bs-target="#numeracyResultModal" data-id="${row.id}" class="form-control" name="numeracy_result" value="${row.numeracy_result || ""}" style="min-width: 100%; cursor: pointer" readonly>
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
                        <button type="button" class="btn btn-success btn-sm save-assessment-btn" data-id="${row.id}" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Done Assessment" disabled>
                            <i class="bi bi-check2"></i>
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

    // Check Assessment Row
    function checkAssessmentRow(currentId) {
        const literacyLevel = $(`select[name="literacy_level"][data-id="${currentId}"]`).val();
        const literacyResult = $(`input[name="literacy_result"][data-id="${currentId}"]`).val();
        const numeracyLevel = $(`select[name="numeracy_level"][data-id="${currentId}"]`).val();
        const numeracyResult = $(`input[name="numeracy_result"][data-id="${currentId}"]`).val();
    
        const allFilled = (
            literacyLevel && literacyLevel !== '--' &&
            literacyResult && literacyResult !== '--' &&
            numeracyLevel && numeracyLevel !== '--' &&
            numeracyResult && numeracyResult !== '--'
        );
    
        const saveBtn = $(`.save-assessment-btn[data-id="${currentId}"]`);
        const markAllasDoneBtn = $('#markAllAsDoneBtn')
        saveBtn.prop('disabled', false);
        markAllasDoneBtn.prop('disabled', !false);
    }
    
    // Run check when input or select changes
    $('#assessmentTable').on('change', 'select, input', function() {
        const currentId = $(this).data('id');
        if (currentId) {
            checkAssessmentRow(currentId);
        }
    });
    
    // Run check for all rows when DataTable loads or redraws
    $('#assessmentTable').on('draw.dt', function() {
        $('#assessmentTable .save-assessment-btn').each(function() {
            const currentId = $(this).data('id');
            checkAssessmentRow(currentId);
        });
    });
    
    // Literacy Modal Opens
    $('#literacyResultModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        currentLiteracyId = button.data('id');
        const currentValue = button.val() === '--' ? '' : button.val();
        $('#literacy_result').val(currentValue);
    });
    
    // Literacy Modal Closes — reset ID and form
    $('#literacyResultModal').on('hidden.bs.modal', function () {
        $('#literacy_result').val('');
        currentLiteracyId = null;
    });
    
    // Literacy Form is Submitted
    $('#literacyResultForm').off('submit').on('submit', function (e) {
        e.preventDefault();
        if (!currentLiteracyId) return;
        const btn = $('.save-literacy-result-btn');
        btn.prop('disabled', true).html(
            `<span class="spinner-border spinner-border-sm me-1" role="status"></span>`
        );

        const literacyResult = $('#literacy_result').val().trim() || '--';
        const rowInput = $(`#assessmentTable input[name="literacy_result"][data-id="${currentLiteracyId}"]`);

        rowInput.val(literacyResult).trigger('change');
        setTimeout(function() {
            $.ajax({
                url: '/coordinator/assessment/update/',
                type: 'POST',
                data: {
                    assessment_id: currentLiteracyId,
                    literacy_result: literacyResult
                },
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                success: function (response) {
                    if (!response.success) {
                        console.error(`Update failed for literacy result:`, response.message);
                        btn.prop('disabled', false).html('Save');
                    } else {
                        $('#literacyResultModal').modal('hide');
                    }
                },
                error: function (xhr, status, error) {
                    console.error(`AJAX error updating literacy result:`, error);
                    btn.prop('disabled', false).html('Save');
                },
                complete: function () {
                    btn.prop('disabled', false).html('Save');
                }
            });
        }, 300);
    });

    // Numeracy Modal Opens
    $('#numeracyResultModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        currentNumeracyId = button.data('id');
        const currentValue = button.val() === '--' ? '' : button.val();
        $('#numeracy_result').val(currentValue);
    });
    
    // Numeracy Modal Closes — reset ID and form
    $('#numeracyResultModal').on('hidden.bs.modal', function () {
        $('#numeracy_result').val('');
        currentNumeracyId = null;
    });
    
    // Numeracy Form is Submitted
    $('#numeracyResultForm').off('submit').on('submit', function (e) {
        e.preventDefault();
        if (!currentNumeracyId) return;
        const btn = $('.save-numeracy-result-btn');
        btn.prop('disabled', true).html(
            `<span class="spinner-border spinner-border-sm me-1" role="status"></span>`
        );

        const numeracyResult = $('#numeracy_result').val().trim() || '--';
        const rowInput = $(`#assessmentTable input[name="numeracy_result"][data-id="${currentNumeracyId}"]`);
        rowInput.val(numeracyResult).trigger('change');
        setTimeout(function() {
            $.ajax({
                url: '/coordinator/assessment/update/',
                type: 'POST',
                data: {
                    assessment_id: currentNumeracyId,
                    numeracy_result: numeracyResult
                },
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                success: function (response) {
                    if (!response.success) {
                        console.error(`Update failed for numeracy result:`, response.message);
                        btn.prop('disabled', false).html('Save');
                    } else {
                        $('#numeracyResultModal').modal('hide');
                    }
                },
                error: function (xhr, status, error) {
                    console.error(`AJAX error updating numeracy result:`, error);
                    btn.prop('disabled', false).html('Save');
                },
                complete: function () {
                    btn.prop('disabled', false).html('Save');
                }
            });
        }, 300);
    });

    $('#assessmentTable').on('change', '.auto-save', function () {
        const id = $(this).data('id');
        console.log(id);
        const fieldName = $(this).attr('name');
        const value = $(this).val();
        const payload = {
            assessment_id: id,
        };
        payload[fieldName] = value;
    
        $.ajax({
            url: '/coordinator/assessment/update/',
            type: 'POST',
            data: payload,
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            success: function (response) {
                if (!response.success) {
                    console.error(`Update failed for ${fieldName}:`, response.message);
                }
            },
            error: function (xhr, status, error) {
                console.error(`AJAX error updating ${fieldName}:`, error);
            }
        });
    });

    // Done Assessment
    $(document).on('click', '.save-assessment-btn', function (e) {
        let assessmentId = $(this).data('id');
        Swal.fire({
            title: 'Are you sure?',
            text: 'Mark this assessment as done.',
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
                            url: `/coordinator/assessment/done/`,
                            type: 'POST',
                            data: { assessment_id: assessmentId },
                            headers: {
                                'X-CSRFToken': getCookie('csrftoken'),
                            }
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to change user status.");
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
                    icon: 'success',
                    title: 'Success',
                    text: 'The assessment has been successfully marked as done.',
                    confirmButtonText: 'OK',
                }).then(() => {
                    assessmentTable.ajax.reload();
                });
            }
        });
    });

    // Check All Assessment
    $('#checkAll').on('change', function () {
        const isChecked = $(this).is(":checked");
        $('.row-check').each(function () {
            if (!$(this).is(':disabled')) {
                $(this).prop('checked', isChecked);
            }
        });
        toggleMarkAllAsDoneButton();
    });

    // Check Assessment Row
    $(document).on('change', '.row-check', function () {
        toggleMarkAllAsDoneButton();
    });

    // Mark All As Done
    $('#markAllAsDoneBtn').on('click', function () {
        const ids = $('.row-check:checked').map((_, el) => $(el).data('id')).get();
        if (ids.length === 0) {
            Swal.fire("No rows selected!", "", "warning");
            return;
        }
        console.log(ids);
        Swal.fire({
            title: 'Are you sure?',
            text: 'Mark all assessments as done.',
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
                            url: '/coordinator/assessment/mark-all-as-done/',
                            type: 'POST',
                            data: JSON.stringify({ assessment_ids: ids }),
                            headers: {
                                'X-CSRFToken': getCookie('csrftoken'),
                            }
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to mark all assessments as done.");
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
                    icon: 'success',
                    title: 'Success',
                    text: 'All assessments marked as done successfully.',
                    confirmButtonText: 'OK',
                }).then(() => {
                    assessmentTable.ajax.reload();
                });
            }
        });
    });

    // Toggle Mark All As Done Button
    function toggleMarkAllAsDoneButton() {
        const anyChecked = $('.row-check:checked').length > 0;
        $('#markAllAsDoneBtn').prop('disabled', !anyChecked);
    }
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
