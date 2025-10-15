$(document).ready(function() {
    let announcementTable = $('#announcementTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.status = $('#filter-announcement-status').val();
            $.ajax({
                url: "/admin/announcement-data/",
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
                data: 'title',
                className: "align-middle text-center",
            },
            { 
                data: 'content',
                orderable: false,
                searchable: false,
                className: "align-middle text-center truncate-text",
            },
            { 
                data: 'type',
                className: "align-middle text-center",
            },
            { 
                data: 'status',
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <span class="badge bg-${row.status === 'Active' ? 'success' : 'danger'}">${row.status}</span>
                    `;
                }
            },
            { 
                data: 'date',
                className: "align-middle text-center",
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
                data: null,
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `
                        <button type="button" class="btn btn-info btn-sm edit-announcement-btn" data-bs-toggle="modal" data-bs-target="#editAnnouncementModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Edit" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm delete-btn" data-id="${row.id}" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Delete">
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

    // Show & Hide Filter
    $('#filter-container-btn').on('click', function () {
        if($('#filter-container').css('display') === 'none') {
            $('#filter-container').css('display', 'block');
        } else {
            $('#filter-container').css('display', 'none');
        }
    });

    // Trigger filter
    $('#filter-announcement-status')
    .on('change', function () {
        announcementTable.ajax.reload();
    });

    // Clear filters button
    $('#clearFilters').on('click', function () {
        $('#filter-announcement-status').val('');
        announcementTable.ajax.reload();
    });

    // Add Announcement
    $('#addAnnouncementForm').on('submit', function (e) {
        e.preventDefault();
    
        let form = $(this);
        let formData = new FormData(form[0]);
        console.log([...formData.entries()]);
    
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
    
        setTimeout(function () {
            $.ajax({
                url: '/admin/add-announcement/',
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
                            title: 'Announcement added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                        }).then(() => {
                            $('#addAnnouncementModal').modal('hide');
                            form.trigger("reset");
                            announcementTable.ajax.reload();
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
                }
            });
        }, 500);
    });

    $(document).on("input change", "#addAnnouncementForm .form-control, #addAnnouncementForm .form-select, #editAnnouncementForm .form-control, #editAnnouncementForm .form-select", function () {
        $(this).removeClass("is-invalid");
        $(this).siblings(".invalid-feedback").text("").hide();
    });

    // Edit Announcement
    $(document).on('click', '.edit-announcement-btn', function () {
        const info = $(this).data('info');
        const announcementId = info.id;

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
            if (id === "currentImage") {
                document.getElementById("currentImage").src = value;
            }
        };

        setValue("title", info.title);
        setValue("content", info.content);
        setValue("type", info.type);
        setValue("status", info.status);
        setValue("date", info.date);
        setValue("currentImage", info.image);
        $("#editAnnouncementForm").off("submit").on("submit", function (e) {
            e.preventDefault();

            let form = $(this);
            let formData = new FormData(form[0]);
            formData.append("announcement_id", announcementId);

            let button = $("#editAnnouncementButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');

            setTimeout(function () {
                $.ajax({
                    url: '/admin/edit-announcement/',
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
                                title: 'Announcement updated!',
                                text: response.message,
                                confirmButtonText: 'OK',
                            }).then(() => {
                                $('#editAnnouncementModal').modal('hide');
                                form.trigger("reset");
                                announcementTable.ajax.reload();
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
                                text: 'Please correct the highlighted fields.',
                            });
                        }
                    },
                    error: function () {
                        button.prop("disabled", false).html("Save");
                    }
                });
            }, 500);
        });
    });


    // Delete Announcement
    $(document).on('click', '.delete-btn', function () {
        const announcementId = $(this).data('id');
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to delete this announcement?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                Swal.showLoading();
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        $.ajax({
                            url: '/admin/delete-announcement/',
                            type: 'POST',
                            data: { announcement_id: announcementId },
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
                                Swal.showValidationMessage(response.message || "Failed to delete announcement.");
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
                        });
                    }, 500);
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Announcement deleted!',
                    text: result.message,
                    confirmButtonText: 'OK',
                }).then(() => {
                    announcementTable.ajax.reload();
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

// Show the viewer
$("#currentImage").click(function() {
    $("#imageViewer").attr("src", $(this).attr("src"));
    $("#image-viewer").fadeIn();
});

// Close the viewer
$("#image-viewer .close").click(function() {
    $("#image-viewer").fadeOut();
});
