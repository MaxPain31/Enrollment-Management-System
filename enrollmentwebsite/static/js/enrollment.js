let id;
document.getElementById('enrollmentForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const submitButton = document.getElementById('submitButton');

    // Show loading spinner
    submitButton.innerHTML = `
        <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </div> Submitting...
    `;
    submitButton.disabled = true;

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
                    html: `${data.message}`,
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
        })
        .finally(() => {
            // Reset button state
            submitButton.innerHTML = "Submit";
            submitButton.disabled = false;
        });
});



function fetchApplicationData(applicationId) {
    id = applicationId;
    fetch(`/admin/get_application/${applicationId}/`)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            const setValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
                else console.warn(`Element with ID '${id}' not found.`);
            };

            setValue("school_year", data.school_year);
            setValue("grade_level", data.grade_level);
            setValue("gen_avg", data.gen_avg);
            setValue("psa_no", data.psa_no);
            setValue("lrn", data.lrn);
            setValue("semester", data.semester);
            setValue("strand", data.strand);
            setValue("student_type", data.student_type.toLowerCase());
            setValue("first_name", data.first_name);
            setValue("middle_name", data.middle_name || "");
            setValue("last_name", data.last_name);
            setValue("extension_name", data.extension_name || "");
            setValue("birth_date", data.birth_date);
            setValue("age", data.age);
            setValue("gender", data.gender);
            setValue("place_of_birth", data.place_of_birth);
            setValue("mother_tongue", data.mother_tongue);

            document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
                field.setAttribute("disabled", "true");
            });
        })
        .catch(error => console.error("Error fetching application data:", error));
}

function saveApplicationData(applicationId) {
    const formData = new FormData(document.getElementById('enrollmentForm'));
    const documentData = new FormData(document.getElementById('documentForm'));
    const documents = [];
    documentData.forEach((value, key) => {
        if (key === 'documents_submitted') {
            documents.push(value);
        }
    });
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    console.log(data);
    const csrftoken = getCookie('csrftoken');
    fetch(`/admin/update_application/${applicationId}/`, {
        method: 'PUT',
        body: JSON.stringify({
            action: 'save',
            application_id: applicationId,
            documents_submitted: documents,
            data: data
        }),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: "Success!",
                    text: data.message,
                    icon: "success",
                    confirmButtonText: "OK"
                }).then(() => {
                    location.reload()
                });
            } else {
                Swal.fire({
                    title: "Error!",
                    text: data.message,
                    icon: "error",
                    confirmButtonText: "OK"
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

function getStrandSelection() {
    const selectedStrand = document.getElementById("strand");
    const science_avg = document.getElementById("science_avg").value;
    const math_avg = document.getElementById("math_avg").value;
    if (science_avg >= 85 && math_avg >= 85) {
        selectedStrand.innerHTML = `
            <option value="">Select strand...</option>
            <option value="ABM">ABM(Accountancy, Business and Management)</option>
            <option value="STEM">STEM(Science, Technology, Engineering and Mathematics)
            </option>
        `;
    } else {
        selectedStrand.innerHTML = `
            <option value="">Select strand...</option>
            <option value="ABM">ABM(Accountancy, Business and Management)</option>
        `;
    }
} function getStrandSelection() {
    const selectedStrand = document.getElementById("strand");
    const science_avg = document.getElementById("science_avg").value;
    const math_avg = document.getElementById("math_avg").value;
    if (science_avg >= 85 && math_avg >= 85) {
        selectedStrand.innerHTML = `
            <option value="">Select strand...</option>
            <option value="ABM">ABM(Accountancy, Business and Management)</option>
            <option value="STEM">STEM(Science, Technology, Engineering and Mathematics)
            </option>
        `;
    } else {
        selectedStrand.innerHTML = `
            <option value="">Select strand...</option>
            <option value="ABM">ABM(Accountancy, Business and Management)</option>
        `;
    }
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
                <h5>Document Submitted</h5>
                <input type="hidden" name="application_id" value="${applicationId}">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="psa" name="documents_submitted" value="PSA" ${documents.includes('PSA') ? 'checked' : ''} disabled>
                    <label class="form-check-label" for="psa">PSA <span class="text-danger">(Required)</span></label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="report_card" name="documents_submitted" value="Report Card" ${documents.includes('Report Card') ? 'checked' : ''} disabled>
                    <label class="form-check-label" for="report_card">Report Card <span class="text-danger">(Required)</span></label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sf10" name="documents_submitted" value="SF10" ${documents.includes('SF10') ? 'checked' : ''} disabled>
                    <label class="form-check-label" for="sf10">SF10 (Optional)</label>
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
                console.log("Document changes saved successfully.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function fetchData(applicationId) {
    fetchApplicationData(applicationId);
    fetchDocumentData(applicationId);
}


function enableEditForm() {
    document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
        field.removeAttribute("disabled");
    });
    document.querySelectorAll("#documentForm input").forEach(field => {
        field.removeAttribute("disabled");
    });
    document.getElementById("saveButton").style.display = "inline-block";
    document.getElementById("editButton").style.display = "none";
}

function disableEditForm() {
    document.querySelectorAll("#enrollmentForm input, #enrollmentForm select").forEach(field => {
        field.setAttribute("disabled", "true");
    });
    document.querySelectorAll("#documentForm input").forEach(field => {
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

