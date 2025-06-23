
var id;
document.getElementById('enrollmentForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: "Success!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "success"
                }).then(() => {
                    window.location.href = data.redirect_url;
                });
            } else {
                Swal.fire({
                    title: "Error!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "error"
                });
            }
        })
        .catch(error => {
            Swal.fire({
                title: "Error!",
                text: "An error occurred while submitting the form.",
                icon: "error"
            });
            console.error('Error:', error);
        });
});

function fetchApplicationData(applicationId) {
    id = applicationId;
    fetch(`/admin/get_application/${applicationId}/`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("school_year").value = data.school_year;
            document.getElementById("grade_level").value = data.grade_level;
            document.getElementById("with_lrn").value = data.with_lrn ? "True" : "False";
            document.getElementById("gen_avg").value = data.gen_avg;
            document.getElementById("psa_no").value = data.psa_no;
            document.getElementById("lrn").value = data.lrn;
            document.getElementById("first_name").value = data.first_name;
            document.getElementById("middle_name").value = data.middle_name || "";
            document.getElementById("last_name").value = data.last_name;
            document.getElementById("extension_name").value = data.extension_name || "";
            document.getElementById("birth_date").value = data.birth_date;
            document.getElementById("age").value = data.age;
            document.getElementById("gender").value = data.gender;
            document.getElementById("place_of_birth").value = data.place_of_birth;
            document.getElementById("mother_tongue").value = data.mother_tongue;
            document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
                field.setAttribute("disabled", "true");
            });
        })
        .catch(error => console.error("Error fetching application data:", error));
}

function saveApplicationData(applicationId) {
    const formData = new FormData(document.getElementById('enrollmentForm'));
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    const csrftoken = getCookie('csrftoken');

    fetch(`/admin/update_application/${applicationId}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    title: "Success!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "success"
                })
            } else {
                Swal.fire({
                    title: "Error!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "error"
                });
            }
        })
        .catch(error => {
            Swal.fire({
                title: "Error!",
                text: "An error occurred while saving the application data.",
                icon: "error"
            });
            console.error('Error:', error);
        });
}

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

function fetchDocumentData(applicationId) {
    console.log("Application ID:", applicationId);
    id = applicationId;
    fetch(`/admin/get_documents/${applicationId}/`)
        .then(response => response.json())
        .then(data => {
            const documents = data.documents_submitted;
            const documentForm = document.getElementById('documentForm');
            documentForm.innerHTML = `
                <input type="hidden" name="application_id" value="${applicationId}">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="psa" name="documents_submitted" value="PSA" ${documents.includes('PSA') ? 'checked' : ''}>
                    <label class="form-check-label" for="psa">PSA</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="report_card" name="documents_submitted" value="Report Card" ${documents.includes('Report Card') ? 'checked' : ''}>
                    <label class="form-check-label" for="report_card">Report Card</label>
                </div>
            `;
        })
        .catch(error => console.error("Error fetching document data:", error));
}

function saveDocumentChanges(applicationId) {
    console.log("Application ID:", applicationId);
    const formData = new FormData(document.getElementById('documentForm'));
    const documents = [];
    formData.forEach((value, key) => {
        if (key === 'documents_submitted') {
            documents.push(value);
        }
    });

    const csrftoken = getCookie('csrftoken');

    fetch(`/admin/update_application/${applicationId}/`, {
        method: 'PUT',
        body: JSON.stringify({ documents_submitted: documents }),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    title: "Success!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "success"
                });
            } else {
                Swal.fire({
                    title: "Error!",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                    confirmButtonText: "DONE",
                    icon: "error"
                });
            }
        })
        .catch(error => {
            Swal.fire({
                title: "Error!",
                text: "An error occurred while saving the document changes.",
                icon: "error"
            });
            console.error('Error:', error);
        });
}

function enableEditForm() {
    document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
        field.removeAttribute("disabled");
    });
    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("editButton").style.display = "none";
}

function disableEditForm() {
    document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
        field.setAttribute("disabled", "true");
    });

    document.getElementById("editButton").style.display = "inline-block";
    document.getElementById("saveButton").style.display = "none";
}

document.getElementById("editButton").addEventListener("click", function () {
    enableEditForm();
});

document.getElementById("saveButton").addEventListener("click", function () {
    saveApplicationData(id);
    disableEditForm();
});

document.getElementById("closeButton").addEventListener("click", function () {
    disableEditForm();
});

document.getElementById("saveDocumentBtn").addEventListener("click", function () {
    saveDocumentChanges(id);
});
