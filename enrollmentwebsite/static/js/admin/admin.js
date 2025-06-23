document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);

    if (params.toString()) {
        document.getElementById("filter-container").style.display = "block";
        const gradeLevel = params.get("grade_level");
        const studentType = params.get("student_type");
        const earlyReg = params.get("early_reg");
        const userRole = params.get("user_role");
        const isActive = params.get("is_active");
        const studentStatus = params.get("student_status");
        const enrollmentType = params.get("enrollment_type");
        const gender = params.get("gender");
        if (gradeLevel) {
            document.getElementById("filter-grade-level").value = gradeLevel;
        }
        if (studentType) {
            document.getElementById("filter-student-type").value = studentType;
        }
        if (earlyReg) {
            document.getElementById("filter-early-reg").value = earlyReg;
        }
        if (userRole) {
            document.getElementById("filter-user-role").value = userRole;
        }
        if (isActive) {
            document.getElementById("filter-is-active").value = isActive;
        }
        if (studentStatus) {
            document.getElementById("filter-student-status").value = studentStatus;
        }
        if (enrollmentType) {
            document.getElementById("filter-enrollment-type").value = enrollmentType;
        }
        if (gender) {
            document.getElementById("filter-gender").value = gender;
        }
    }
});

function toggleFilter() {
    const filterContainer = document.getElementById("filter-container");
    if (filterContainer.style.display === "none" || !filterContainer.style.display) {
        filterContainer.style.display = "block";
    } else {
        filterContainer.style.display = "none";
    }
}


function clearFiltersAndSubmit(pageName) {
    if(pageName === 'all_users') {
        document.getElementById('filter-user-role').value = '';
        document.getElementById('filter-is-active').value = '';
    } else if(pageName === 'student_users') {
        document.getElementById('filter-student-status').value = '';
        document.getElementById('filter-is-active').value = '';
    } else if (pageName === 'coordinator_users' || pageName === 'admin_users' || pageName === 'teacher_users') {
        document.getElementById('filter-is-active').value = '';
    } else if (pageName === 'teacher_list') {
        document.getElementById('filter-gender').value = '';
    } else {
        document.getElementById('filter-enrollment-type').value = '';
        document.getElementById('filter-grade-level').value = '';
        document.getElementById('filter-student-type').value = '';
        document.getElementById('filter-early-reg').value = '';
    }
    const baseUrl = window.location.pathname;
    console.log(baseUrl);
    window.location.href = baseUrl;
}

