function getCSRFToken() {
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value;
    return csrfToken || "";
}

function validateFormFields(form) {
    const requiredFields = form.querySelectorAll("[required]");
    let isValid = true;

    requiredFields.forEach((field) => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add("is-invalid");
            const errorMessage = document.createElement("div");
            errorMessage.className = "invalid-feedback";
            errorMessage.textContent = "This field is required.";
            if (!field.nextElementSibling || !field.nextElementSibling.classList.contains("invalid-feedback")) {
                field.parentNode.appendChild(errorMessage);
            }
        } else {
            field.classList.remove("is-invalid");
            if (field.nextElementSibling && field.nextElementSibling.classList.contains("invalid-feedback")) {
                field.nextElementSibling.remove();
            }
        }
    });

    return isValid;
}

function handleSaveAssessment(button) {
    let form = button.closest("form");

    if (!form) {
        form = button.closest(".modal-content")?.querySelector("form");
    }

    if (!form) {
        console.error("Form not found for the 'Save' button.");
        return;
    }

    if (!validateFormFields(form)) {
        Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Please fill out all required fields.",
        });
        return;
    }

    const formData = new FormData(form);

    fetch(form.action, {
        method: form.method,
        body: formData,
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("Failed to save assessment.");
            }
        })
        .then((data) => {
            if (data.success) {
                Swal.fire({
                    text: "Do you want to mark this assessment as done?",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes",
                    cancelButtonText: "Cancel",
                }).then((result) => {
                    if (result.isConfirmed) {
                        const formData = new FormData(form);

                        fetch(form.action, {
                            method: form.method,
                            body: formData,
                        })
                            .then((response) => {
                                if (response.ok) {
                                    return response.json();
                                } else {
                                    throw new Error("Failed to mark assessment as done.");
                                }
                            })
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
                                        text: data.message,
                                    });
                                }
                            })
                            .catch((error) => {
                                console.error("Error during form submission:", error);
                                Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: "An error occurred while marking the assessment as done.",
                                });
                            });
                    }
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.message,
                });
            }
        })
        .catch((error) => {
            console.error("Error during form submission:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "An error occurred while saving the assessment.",
            });
        });
}

const saveButtons = document.querySelectorAll(".save-assessment-btn");
saveButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
        handleSaveAssessment(button);
    });
});
document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
        const row = button.closest("tr");
        const modal = document.querySelector(`#editAssessmentModal${button.dataset.id}`);

        if (row && modal) {
            const literacyLevel = row.querySelector(".literacy-level")?.textContent.trim() || "";
            const literacyResult = row.querySelector(".literacy-result")?.textContent.trim() || "";
            const numeracyLevel = row.querySelector(".numeracy-level")?.textContent.trim() || "";
            const numeracyResult = row.querySelector(".numeracy-result")?.textContent.trim() || "";

            modal.querySelector("#literacy_level").value = literacyLevel;
            modal.querySelector("#literacy_result").value = literacyResult;
            modal.querySelector("#numeracy_level").value = numeracyLevel;
            modal.querySelector("#numeracy_result").value = numeracyResult;
        } else {
            console.error("Row or modal not found for the 'View' button.");
        }
    });
});