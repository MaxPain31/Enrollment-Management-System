function autoSection(gradeLevel) {
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    Swal.fire({
        title: "Are you sure?",
        text: "This will automatically assign students to sections.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
    }).then((result) => {
        if (result.isConfirmed) {
            fetch("/coordinator/auto-section/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({ grade_level: gradeLevel }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        Swal.fire("Success", data.message, "success").then(() => {
                            location.reload(); // Reload the page to reflect changes
                        });
                    } else {
                        Swal.fire("Error", data.message, "error");
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    Swal.fire("Error", "An unexpected error occurred.", "error");
                });
        }
    });
};


document.querySelectorAll(".btn-danger").forEach((button) => {
    button.addEventListener("click", (event) => {
        const studentId = button.dataset.studentId;
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

        Swal.fire({
            title: "Are you sure?",
            text: "This will permanently delete the student.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "Cancel",
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`/coordinator/delete-student/${studentId}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken,
                    },
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            Swal.fire("Deleted!", data.message, "success").then(() => {
                                location.reload(); // Reload the page to reflect changes
                            });
                        } else {
                            Swal.fire("Error", data.message, "error");
                        }
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                        Swal.fire("Error", "An unexpected error occurred.", "error");
                    });
            }
        });
    });
});