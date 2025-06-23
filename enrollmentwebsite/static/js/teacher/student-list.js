document.addEventListener("DOMContentLoaded", function () {
    let selectedStudentId = null;
    document.querySelectorAll(".input-grade-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const row = btn.closest("tr");
            selectedStudentId = row.getAttribute("data-student-id");
        });
    });

    const saveBtn = document.getElementById("saveFinalGradeBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", function () {
            const genAvg = document.getElementById("gen_avg").value;
            const csrftoken = getCookie("csrftoken");
            if (!selectedStudentId || !genAvg) {
                Swal.fire('Error', 'Missing student or grade.', 'error');
                return;
            }
            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to save this final grade?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel",
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing...',
                        text: 'Saving final grade, please wait...',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    fetch(`/teacher/input_final_grade/${selectedStudentId}/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrftoken,
                            "X-Requested-With": "XMLHttpRequest"
                        },
                        body: JSON.stringify({ gen_avg: genAvg })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Success",
                                    text: data.message
                                }).then(() => {
                                    location.reload();
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: data.message || "An error occurred while updating the status."
                                });
                            }
                        })
                        .catch(error => {
                            console.error("Error:", error);
                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: "An unexpected error occurred. Please try again."
                            });
                        });
                }
            });
        });
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