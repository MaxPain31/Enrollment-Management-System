document.addEventListener("DOMContentLoaded", () => {
    const addSectionForm = document.querySelector("#addSectionModal form");

    if (addSectionForm) {
        addSectionForm.addEventListener("submit", (event) => {
            event.preventDefault();


            const formData = new FormData(addSectionForm);
            const sectionName = formData.get("section_name");
            const maxSlot = formData.get("max_slot");
            const academicYear = formData.get("academic_year");
            const status = formData.get("status");

            if (!sectionName || !maxSlot || !academicYear || !status) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Please fill out all fields before submitting.",
                });
                return;
            }

            Swal.fire({
                title: "Are you sure?",
                text: "Do you want to add this section?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel",
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(addSectionForm.action, {
                        method: "POST",
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRFToken": formData.get("csrfmiddlewaretoken"),
                        },
                        body: formData,
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            if (data.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Success",
                                    text: data.message,
                                }).then(() => {
                                    location.reload();
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: data.message || "An error occurred while adding the section.",
                                });
                            }
                        })
                        .catch((error) => {
                            console.error("Error:", error);
                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: "An unexpected error occurred. Please try again.",
                            });
                        });
                }
            });
        });
    }

    const editStatusForms = document.querySelectorAll(".edit-status-form");

    editStatusForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const studentStatus = formData.get("student_status");

            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to change the student status to ${studentStatus}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel",
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(form.action, {
                        method: "POST",
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRFToken": formData.get("csrfmiddlewaretoken"),
                        },
                        body: formData,
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            if (data.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Success",
                                    text: data.message,
                                }).then(() => {
                                    location.reload();
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: data.message || "An error occurred while updating the status.",
                                });
                            }
                        })
                        .catch((error) => {
                            console.error("Error:", error);
                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: "An unexpected error occurred. Please try again.",
                            });
                        });
                }
            });
        });
    });

    document.querySelectorAll("[id^='studentStatus']").forEach((statusSelect) => {
        const currentStatus = statusSelect.getAttribute("data-current-status");
        statusSelect.value = currentStatus;
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            const sectionId = button.getAttribute("data-id");

            Swal.fire({
                title: "Are you sure?",
                text: "Do you want to delete this section? This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel",
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/coordinator/delete-section/${sectionId}/`, {
                        method: "DELETE",
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                        },
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            if (data.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Deleted!",
                                    text: data.message,
                                }).then(() => {
                                    location.reload();
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error!",
                                    text: data.message || "An error occurred while deleting the section.",
                                });
                            }
                        })
                        .catch((error) => {
                            console.error("Error:", error);
                            Swal.fire({
                                icon: "error",
                                title: "Error!",
                                text: "An unexpected error occurred. Please try again.",
                            });
                        });
                }
            });
        });
    });
});
function editSection(sectionId) {
    fetch(`/coordinator/get-section/${sectionId}/`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            document.getElementById('editSectionId').value = data.section_id;
            document.getElementById('editSectionName').value = data.section_name;
            document.getElementById('editMaxSlot').value = data.max_slot;
            document.getElementById('currentAdviser').value = data.teacher_name;
            document.getElementById('editAcademicYear').value = data.academic_year;
            document.getElementById('editStatus').value = data.status;
            document.getElementById('editStrand').value = data.strand || "";
        })
        .catch(error => console.error('Error fetching section data:', error));
}

function updateSection() {
    const formData = new FormData(document.getElementById('editSectionForm'));
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    fetch(`/coordinator/update-section/${data.section_id}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': formData.get("csrfmiddlewaretoken"),
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: data.message,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: data.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })
        .catch(error => {
            Swal.fire({
                title: 'Error!',
                text: 'An error occurred while updating the section.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            console.error('Error:', error);
        });
}