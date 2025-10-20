$(document).ready(function () {
    const shouldShowDepartment = (designationValue) => {
        return designationValue === 'Junior High School Faculty';
    };

    const toggleDepartmentVisibility = (formEl, designationValue) => {
        const departmentField = $(formEl).find('[name="department"]');
        const departmentGroup = departmentField.closest('.mb-3');
        if (shouldShowDepartment(designationValue)) {
            departmentGroup.show();
        } else {
            departmentGroup.hide();
            // Also clear invalid state when hiding
            departmentField.removeClass('is-invalid');
            departmentField.siblings('.invalid-feedback').text('').hide();
        }
    };

    let organizationalChartTable = $('#organizationalChartTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            $.ajax({
                url: "/admin/organization-chart-data/",
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
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row, meta) {
                    return meta.row + 1 + meta.settings._iDisplayStart;
                }
            },
            { 
                data: 'name',
                className: "align-middle text-center",
            },
            { 
                data: 'position',
                orderable: false,
                searchable: false,
                className: "align-middle text-center truncate-text",
            },
            { 
                data: 'department',
                orderable: false,
                searchable: false,
                className: "align-middle text-center truncate-text",
            },
            { 
                data: 'designation',
                orderable: false,
                searchable: false,
                className: "align-middle text-center truncate-text",
            },
            { 
                data: 'image',
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <img src="${data}" alt="Announcement Image" class="img-fluid" style="max-width: 100px; max-height: 100px;">
                    `;
                }
            },
            { 
                data: 'created_at',
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
                data: "updated_at",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    if (!data) return "-"; 
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
                        <button type="button" class="btn btn-info btn-sm edit-organizational-chart-btn" data-bs-toggle="modal" data-bs-target="#editOrganizationalChartModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Edit" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm delete-organizational-chart-btn" data-id='${row.id}' data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Delete">
                            <i class="bi bi-trash"></i>
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

    // // Show & Hide Filter
    // $('#filter-container-btn').on('click', function () {
    //     if($('#filter-container').css('display') === 'none') {
    //         $('#filter-container').css('display', 'block');
    //     } else {
    //         $('#filter-container').css('display', 'none');
    //     }
    // });

    // // Trigger filter
    // $('#filter-question, #filter-answer')
    // .on('change', function () {
    //     faqTable.ajax.reload();
    // });

    // // Clear filters button
    // $('#clearFilters').on('click', function () {
    //     $('#filter-user-role').val('');
    //     $('#filter-is-active').val('');
    //     $('#filter-student-status').val('');
    //     $('#filter-is-active').val('');
    //     faqTable.ajax.reload();
    // });

    // Add Organization Chart
    $('#addOrganizationChartForm').on('submit', function (e) {
        e.preventDefault();
        const form = $(this);
        const formData = new FormData(form[0]);
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');

        setTimeout(function () {
            $.ajax({
                url: '/admin/add-organization-chart/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                success: function (response) {
                    button.prop("disabled", false).html("Save");
                    form.find('.is-invalid').removeClass('is-invalid');
                    form.find('.invalid-feedback').text('');

                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Organization chart added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                            showConfirmButton: true,
                        }).then(() => {
                            $('#addOrganizationChartModal').modal('hide');
                            form.trigger("reset");
                            organizationalChartTable.ajax.reload();
                        });
                    } else {
                        let errors = response.message || {};
                        for (let fieldName in errors) {
                            let field = form.find(`[name="${fieldName}"]`);
                            let feedback = field.siblings(".invalid-feedback");
                            field.addClass("is-invalid");
                            feedback.text(errors[fieldName][0] || errors[fieldName]).show();
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
    });

    // Toggle department visibility on Add modal designation change
    $(document).on('change', '#addDesignation', function () {
        const form = $('#addOrganizationChartForm');
        toggleDepartmentVisibility(form, $(this).val());
    });

    // Initialize department visibility on Add modal open
    $('#addOrganizationChartModal').on('shown.bs.modal', function () {
        const form = $('#addOrganizationChartForm');
        const designationValue = $('#addDesignation').val();
        toggleDepartmentVisibility(form, designationValue);
    });

    // Clear validation on input change for Org Chart forms
    $(document).on("input change", "#addOrganizationChartForm .form-control, #addOrganizationChartForm .form-select, #editOrganizationChartForm .form-control, #editOrganizationChartForm .form-select", function () {
        $(this).removeClass("is-invalid");
        $(this).siblings(".invalid-feedback").text("").hide();
    });

    // Edit Organization Chart
    $(document).on('click', '.edit-organizational-chart-btn', function () {
        const info = $(this).data('info');
        const orgId = info.id;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'currentImage') {
                el.src = value || '';
            } else {
                el.value = value ?? '';
            }
        };

        setValue("name", info.name);
        setValue("position", info.position);
        setValue("department", info.department);
        // Set designation select for edit
        const editDesignationEl = document.getElementById('editDesignation');
        if (editDesignationEl) {
            editDesignationEl.value = info.designation || '';
        }
        setValue("currentImage", info.image);

        // Initialize department visibility based on current designation in Edit modal
        toggleDepartmentVisibility('#editOrganizationChartForm', info.designation);

        // Bind change listener for designation in Edit modal
        $(document).off('change.editDesignation').on('change.editDesignation', '#editDesignation', function () {
            toggleDepartmentVisibility('#editOrganizationChartForm', $(this).val());
        });

        $("#editOrganizationChartForm").off("submit").on("submit", function (e) {
            e.preventDefault();
            const form = $(this);
            const formData = new FormData(form[0]);
            formData.append('id', orgId);

            let button = $("#editOrganizationChartButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');

            setTimeout(function () {
                $.ajax({
                    url: '/admin/edit-organization-chart/',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    success: function (response) {
                        button.prop("disabled", false).html("Save");
                        form.find('.is-invalid').removeClass('is-invalid');
                        form.find('.invalid-feedback').text('');
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Organization chart updated!',
                                text: response.message,
                                confirmButtonText: 'OK',
                                showConfirmButton: true,
                            }).then(() => {
                                $('#editOrganizationalChartModal').modal('hide');
                                form.trigger("reset");
                                organizationalChartTable.ajax.reload();
                            });
                        } else {
                            let errors = response.message || {};
                            for (let fieldName in errors) {
                                let field = form.find(`[name="${fieldName}"]`);
                                let feedback = field.siblings(".invalid-feedback");
                                field.addClass("is-invalid");
                                feedback.text(errors[fieldName][0] || errors[fieldName]).show();
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
        });
    });

    // Delete Organization Chart
    $(document).on('click', '.delete-organizational-chart-btn', function () {
        const orgId = $(this).data('id');
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to delete this organization chart?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                Swal.showLoading();
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: '/admin/delete-organization-chart/',
                            type: 'POST',
                            data: { id: orgId },
                            headers: {
                                'X-CSRFToken': getCookie('csrftoken'),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to delete organization chart.");
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
                    title: 'Organization chart deleted!',
                    text: result.message,
                    confirmButtonText: 'OK',
                }).then(() => {
                    organizationalChartTable.ajax.reload();
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