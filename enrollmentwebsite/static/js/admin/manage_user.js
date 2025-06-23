function confirmDelete(userId) {
    Swal.fire({
        text: "Are you sure you want to delete this user?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteUser(userId);
        }
    });
}

function deleteUser(userId) {
    const csrftoken = getCookie('csrftoken');

    fetch(`/admin/delete_user/${userId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire(
                    'Deleted!',
                    data.message,
                    'success'
                ).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire(
                    'Error!',
                    data.message,
                    'error'
                );
            }
        })
        .catch(error => {
            Swal.fire(
                'Error!',
                'An error occurred while deleting the user.',
                'error'
            );
            console.error('Error:', error);
        });
}

function addUser(userRole) {
    const formData = new FormData(document.getElementById('addUserForm'));
    const data = {};
    let fetchUrl;

    formData.forEach((value, key) => {
        data[key] = value;
    });

    if (userRole === 'Administrator') {
        fetchUrl = "/admin/add_admin/";
    } else if (userRole === 'Coordinator') {
        fetchUrl = "/admin/add_coordinator/";
    } else if (userRole === 'Teacher') {
        fetchUrl = "/admin/add_teacher/";
    } else if (userRole === 'Student') {
        fetchUrl = "/admin/add_student/";
    } else {
        Swal.fire({
            title: 'Error!',
            text: 'Invalid user role specified.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        return;
    }

    console.log('Data: ', data);
    const csrftoken = getCookie('csrftoken');
    fetch(fetchUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
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
                text: 'An error occurred while adding the user.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            console.error('Error:', error);
        });
}

function handleActionUser(userId, isDeactivated) {
    const csrftoken = getCookie('csrftoken');
    const actionText = isDeactivated ? 'activate' : 'deactivate';
    const confirmText = isDeactivated ? 'You are about to activate this user.' : 'You are about to deactivate this user.';
    const confirmButton = isDeactivated ? 'Yes' : 'Yes';
    const loadingText = isDeactivated ? 'Activating user, please wait...' : 'Deactivating user, please wait...';
    const successTitle = isDeactivated ? 'Activated!' : 'Deactivated!';

    Swal.fire({
        text: confirmText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: confirmButton
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Processing...',
                text: loadingText,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            fetch(`/admin/deactivate_user/${userId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => response.json())
                .then(data => {
                    Swal.close();
                    if (data.status === 'success') {
                        Swal.fire(
                            successTitle,
                            data.message,
                            'success'
                        ).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            data.message,
                            'error'
                        );
                    }
                })
                .catch(error => {
                    Swal.close();
                    Swal.fire(
                        'Error!',
                        'An error occurred while updating the user.',
                        'error'
                    );
                    console.error('Error:', error);
                });
        }
    });
}

function submitChangePassword(userId) {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'All password fields are required.',
        });
        return;
    }

    Swal.fire({
        title: 'Change Password',
        text: 'Are you sure you want to change the password for this user?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Processing...',
                text: 'Changing password, please wait...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const csrftoken = getCookie('csrftoken');

            fetch(`/admin/change_password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    user_id: userId,
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            })
                .then(response => response.json())
                .then(data => {
                    Swal.close();
                    if (data.status === 'success') {
                        Swal.fire('Success!', data.message, 'success').then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire('Error!', data.message, 'error');
                    }
                })
                .catch(error => {
                    Swal.close();
                    Swal.fire('Error!', 'An error occurred while changing the password.', 'error');
                    console.error('Error:', error);
                });
        }
    });
}

function viewUser(userId, userRole) {
    fetch(`/admin/get_user_data/${userId}/${userRole}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            if (userRole === 'Student') {
                console.log("User data:", data.enrollment_type);
                const studentContainer = document.getElementById('studentInformation');
                studentContainer.innerHTML = '';
                if (data.enrollment_type === 'JHS') {
                    studentContainer.innerHTML = `
                        <h5>Enrollment Information</h5>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="school_year" class="form-label">School Year</label>
                                    <input type="text" class="form-control text-uppercase" id="school_year" name="school_year" value="${data.school_year || ''}" required readonly>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="grade_level" class="form-label">Grade Level</label>
                                    <select class="form-select form-control" id="grade_level" name="grade_level" required disabled>
                                        <option value="7" ${data.grade_level == 7 ? 'selected' : ''}>Grade 7</option>
                                        <option value="8" ${data.grade_level == 8 ? 'selected' : ''}>Grade 8</option>
                                        <option value="9" ${data.grade_level == 9 ? 'selected' : ''}>Grade 9</option>
                                        <option value="10" ${data.grade_level == 10 ? 'selected' : ''}>Grade 10</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="student_type" class="form-label">Student Type</label>
                                    <input type="text" class="form-control" id="student_type" name="student_type" value="${data.student_type || ''}" required readonly>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="gen_avg" class="form-label">General Average</label>
                                    <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${data.gen_avg || ''}" required readonly>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (data.enrollment_type === 'SHS') {
                    studentContainer.innerHTML = `
                        <h5>Enrollment Information</h5>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="school_year" class="form-label">School Year</label>
                                    <input type="text" class="form-control text-uppercase" id="school_year" name="school_year" value="${data.school_year || ''}" required readonly>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="student_type" class="form-label">Student Type</label>
                                    <select class="form-select form-control" id="student_type" name="student_type" required disabled>
                                        <option value="new student" ${data.student_type === 'new student' ? 'selected' : ''}>New Student</option>
                                        <option value="returning" ${data.student_type === 'returning' ? 'selected' : ''}>Returning (Balik Aral)</option>
                                        <option value="transferee" ${data.student_type === 'transferee' ? 'selected' : ''}>Transferee</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="grade_level" class="form-label">Grade Level</label>
                                    <select class="form-select form-control" id="grade_level" name="grade_level" required disabled>
                                        <option value="11" ${data.grade_level == 11 ? 'selected' : ''}>Grade 11</option>
                                        <option value="12" ${data.grade_level == 12 ? 'selected' : ''}>Grade 12</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="gen_avg" class="form-label">General Average</label>
                                    <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${data.gen_avg || ''}" required readonly>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="semester" class="form-label">Semester</label>
                                    <select class="form-select form-control" id="semester" name="semester" required disabled>
                                        <option value="1st" ${data.semester === '1st' ? 'selected' : ''}>1st</option>
                                        <option value="2nd" ${data.semester === '2nd' ? 'selected' : ''}>2nd</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="strand" class="form-label">Strand</label>
                                    <select class="form-select form-control" id="strand" name="strand" required disabled>
                                        <option value="" ${!data.strand ? 'selected' : ''}>Select strand...</option>
                                        <option value="ABM" ${data.strand === 'ABM' ? 'selected' : ''}>ABM(Accountancy, Business and Management)</option>
                                        <option value="STEM" ${data.strand === 'STEM' ? 'selected' : ''}>STEM(Science, Technology, Engineering and Mathematics)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `;
                }

                const fields = [
                    'psa_no', 'lrn', 'first_name', 'middle_name', 'last_name', 'extension_name', 'birth_date',
                    'age', 'gender', 'place_of_birth', 'mother_tongue'
                ];

                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && data.hasOwnProperty(field)) {
                        element.value = data[field] || '';
                    }
                });

                const documents = data.documents_submitted || [];
                const documentForm = document.getElementById('documentForm');
                documentForm.innerHTML = `
                    <h5>Documents Submitted</h5>
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
            }
            else if (userRole === 'Administrator') {
                const fields = [
                    'first_name', 'middle_name', 'last_name', 'email'
                ];

                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && data.hasOwnProperty(field)) {
                        element.value = data[field] || '';
                    }
                });
            }else if (userRole === 'Coordinator') {
                const fields = [
                    'first_name', 'middle_name', 'last_name', 'email', 'position'
                ];

                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && data.hasOwnProperty(field)) {
                        element.value = data[field] || '';
                    }
                });
            } else if (userRole === 'Teacher') {
                const fields = [
                    'first_name', 'middle_name', 'last_name', 'email', 'position', 'grade_level'
                ];

                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && data.hasOwnProperty(field)) {
                        element.value = data[field] || '';
                    }
                });
            }

        })
        .catch(error => {
            console.error("Error fetching user data:", error);
        });
}


document.addEventListener("DOMContentLoaded", function () {
    const forms = document.querySelectorAll(".edit-status-form");

    forms.forEach(function (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            const status = formData.get("student_status");
            const csrftoken = getCookie("csrftoken");

            Swal.fire({
                title: "Are you sure?",
                text: `Do you want to change the student status to ${status}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "Cancel",
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing...',
                        text: 'Changing student status, please wait...',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    fetch(form.action, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrftoken,
                            "X-Requested-With": "XMLHttpRequest"
                        },
                        body: JSON.stringify({ student_status: status })
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
    });
});


document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('.studentAddForm');
    const form = document.getElementById("studentAddForm");
    const shsFields = document.getElementById("shsFields");
    const enrollmentSelect = form.querySelector('[name="enrollment_type"]');

    function updateFields() {
        const enrollmentType = enrollmentSelect.value;
        console.log("Enrollment Type:", enrollmentType);
        if (enrollmentType === 'SHS') {
            shsFields.innerHTML = `
            <div class="col-md-3">
                <div class="mb-3">
                    <label for="grade_level" class="form-label">Grade
                        Level</label>
                    <select class="form-select form-control" id="grade_level" name="grade_level" required>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                    </select>
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label for="gen_avg" class="form-label">General
                        Average</label>
                    <input type="number" class="form-control" id="gen_avg" name="gen_avg" required>
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label for="semester" class="form-label">Semester</label>
                    <select class="form-select form-control" id="semester" name="semester" required>
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                    </select>
                </div>
            </div>
            <div class="col-md-3">
                <div class="mb-3">
                    <label for="strand" class="form-label">Strand</label>
                    <select class="form-select form-control" id="strand" name="strand" required>
                        <option value="">Select strand...</option>
                        <option value="ABM">ABM(Accountancy, Business and Management)</option>
                        <option value="STEM">STEM(Science, Technology, Engineering and Mathematics)</option>
                    </select>
                </div>
            </div>
        `;
        } else {
            shsFields.innerHTML = `
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="grade_level" class="form-label">Grade
                        Level</label>
                    <select class="form-select form-control" id="grade_level" name="grade_level" required>
                        <option value="7">Grade 7</option>
                        <option value="8">Grade 8</option>
                        <option value="9">Grade 9</option>
                        <option value="10">Grade 10</option>
                    </select>
                </div>
            </div>
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="gen_avg" class="form-label">General
                        Average</label>
                    <input type="number" class="form-control" id="gen_avg" name="gen_avg" required>
                </div>
            </div>
        `;
        }
    }

    updateFields();
    enrollmentSelect.removeEventListener('change', updateFields);
    enrollmentSelect.addEventListener("change", updateFields);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const csrftoken = getCookie("csrftoken");
        const data = {};

        formData.forEach((value, key) => {
            if (key === 'documents_submitted') {
                if (!data[key]) data[key] = [];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });

        if (data["documents_submitted"]) {
            data["documents_submitted"] = JSON.stringify(data["documents_submitted"]);
        }

        Swal.fire({
            text: `Do you want to add this student?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "Cancel",
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Processing...',
                    text: 'Adding student, please wait...',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                fetch(form.action, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrftoken,
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Response:", data);
                        console.log("Success:", data.status);
                        if (data.status === 'success') {
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
    }); // avoid double submission
});

function submitEditUser(userID,userRole) {
    const form = document.getElementById('editUserForm');
    console.log(userRole);
    if (!userID) {
        Swal.fire('Error', 'User ID not found.', 'error');
        return;
    }

    const data = {
        first_name: form.elements['first_name'].value,
        middle_name: form.elements['middle_name'].value,
        last_name: form.elements['last_name'].value,
        position: form.elements['position'].value,
        email: form.elements['email'].value,
        grade_level: form.elements['grade_level'] ? form.elements['grade_level'].value : null,
    };

    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to save the changes for this teacher?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            const csrftoken = getCookie('csrftoken');

            fetch(`/admin/edit_user/${userID}/${userRole}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire('Success', data.message, 'success').then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Error', data.message || 'An error occurred.', 'error');
                    }
                })
                .catch(error => {
                    Swal.fire('Error', 'An error occurred while updating the user.', 'error');
                    console.error('Error:', error);
                });
        }
    });
}
