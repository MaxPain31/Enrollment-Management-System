$(document).ready(function () {
    let faqTable = $('#faqTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            $.ajax({
                url: "/admin/faq-data/",
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
                data: 'question',
                className: "align-middle text-center",
            },
            { 
                data: 'answer',
                orderable: false,
                searchable: false,
                className: "align-middle text-center truncate-text",
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
                        <button type="button" class="btn btn-info btn-sm edit-faq-btn" data-bs-toggle="modal" data-bs-target="#editFAQModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Edit" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm delete-btn" data-id='${row.id}' data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Delete">
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

    // Add FAQ
    $('#addFAQForm').on('submit', function (e) {
        e.preventDefault();
        const form = $(this);
        const formData = form.serialize();
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
    
        setTimeout(function () {
            $.ajax({
                url: '/admin/add-faq/',
                type: 'POST',
                data: formData,
                headers: { 'X-CSRFToken': getCookie('csrftoken') },
                success: function (response) {
                    button.prop("disabled", false).html("Save");
                    form.find('.is-invalid').removeClass('is-invalid');
                    form.find('.invalid-feedback').text('');

                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'FAQ added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                            showConfirmButton: true,
                        }).then(() => {
                            $('#addFAQModal').modal('hide');
                            form.trigger("reset");
                            faqTable.ajax.reload();
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

    // Edit FAQ
    $(document).on('click', '.edit-faq-btn', function () {
        const info = $(this).data('info');
        const faq_id = info.id;
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("question", info.question);
        setValue("answer", info.answer);
        $("#editFAQForm").on("submit", function (e) {
            e.preventDefault();
            const form = $(this);
            let formData = form.serialize();
            formData += `&faq_id=${faq_id}`;
            let button = $("#editFAQButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
            setTimeout(function () {
                $.ajax({
                    url: '/admin/edit-faq/',
                    type: 'POST',
                    data: formData,
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    success: function (response) {
                        button.prop("disabled", false).html("Save");
                        form.find('.is-invalid').removeClass('is-invalid');
                        form.find('.invalid-feedback').text('');
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'FAQ updated!',
                                text: response.message,
                                confirmButtonText: 'OK',
                                showConfirmButton: true,
                            }).then(() => {
                                $('#editFAQModal').modal('hide');
                                form.trigger("reset");
                                faqTable.ajax.reload();
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

    // Delete FAQ
    $(document).on('click', '.delete-btn', function () {
        const faq_id = $(this).data('id');
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to delete this FAQ?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                Swal.showLoading();
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: '/admin/delete-faq/',
                            type: 'POST',
                            data: { faq_id: faq_id },
                            headers: { 'X-CSRFToken': getCookie('csrftoken') },
                        })
                        .done(function(response) {
                            if (response.success) {
                                resolve(response);
                            } else {
                                Swal.hideLoading();
                                Swal.showValidationMessage(response.message || "Failed to delete FAQ.");
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
                    title: 'FAQ deleted!',
                    text: result.message,
                    confirmButtonText: 'OK',
                }).then(() => {
                    faqTable.ajax.reload();
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