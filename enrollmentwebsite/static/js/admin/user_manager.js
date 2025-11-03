let allUsersTable;
let studentUsersTable;
let teacherUsersTable;
let coordinatorUsersTable;
let adminUsersTable;

$(document).ready(function () {

    // All Users Table
    allUsersTable = $('#allUsersTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.user_role = $('#filter-user-role').val();
            data.is_active = $('#filter-is-active').val();
            $.ajax({
                url: "/admin/users/data/",
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
                data: "name",
                className: "align-middle text-center",
            },
            { 
                data: "email",
                className: "align-middle text-center",
            },
            {
                data: "user_role",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const role = row.user_role;
                    let colorClass = "";
            
                    switch (role) {
                        case "Administrator": colorClass = "bg-admin"; break;
                        case "Coordinator": colorClass = "bg-coordinator"; break;
                        case "Teacher": colorClass = "bg-teacher"; break;
                        case "Student": colorClass = "bg-student"; break;
                        default: colorClass = "bg-guest";
                    }
            
                    return `<span class="badge ${colorClass}">${role.toUpperCase()}</span>`;
                }
            },
            { 
                data: "created_at",
                className: "align-middle text-center",
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {
                data: "updated_at",
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
                data: "is_active",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const updatedAt = new Date(row.updated_at);
                    const now = new Date();
                    const diffMs = now - updatedAt;
            
                    const seconds = Math.floor(diffMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
            
                    let timeAgo = "";
                    if (years > 0) {
                        timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
                    } else if (months > 0) {
                        timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    } else if (weeks > 0) {
                        timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else if (days > 0) {
                        timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
                    } else if (hours > 0) {
                        timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
                    } else if (minutes > 0) {
                        timeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    } else {
                        timeAgo = "Just now";
                    }
            
                    if (row.is_active) {
                        return `<span class="badge bg-success">ACTIVE</span>`;
                    } else {
                        return `<span class="badge bg-secondary">${timeAgo}</span>`;
                    }
                }
            },
            { 
                data:  null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    if (row.id === 1) {
                        return `
                            <button class="btn btn-warning btn-sm" data-user-id="${row.id}" data-bs-toggle="modal"
                                data-bs-target="#changePasswordModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Change Password">
                                <i class="bi bi-key"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" disabled
                                data-bs-toggle-second="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Cannot deactivate super admin">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `;
                    }
                    return `
                        <button class="btn btn-warning btn-sm" data-user-id="${row.id}" data-bs-toggle="modal"
                            data-bs-target="#changePasswordModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Change Password">
                            <i class="bi bi-key"></i>
                        </button>
                        ${row.deactivated ? `
                            <button class="btn btn-success btn-sm" onclick="handleActionUser('${row.id}', true)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Activate User">
                                <i class="bi bi-person-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="handleActionUser('${row.id}', false)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Deactivate User">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `}
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

    // Student Users Table
    studentUsersTable = $('#studentUsersTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.student_status = $('#filter-student-status').val();
            data.is_active = $('#filter-is-active').val();
            data.status = $('#filter-status').val();
            $.ajax({
                url: "/admin/student-users/data/",
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
                data: "lrn",
                className: "align-middle text-center",
            },
            {
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    if (row.status === "Missing" || (row.submission_remarks && row.submission_remarks.trim() !== "")) {
                        return `<p class="text-danger mb-0">${row.last_name}, ${row.first_name}${middle} </p>`.trim();
                    } else {
                        return `<p class="text-success mb-0">${row.last_name}, ${row.first_name}${middle} </p>`.trim();
                    }
                }
            },
            {
                data: "user.email",
                className: "align-middle text-center",
            },
            {
                data: "user.user_role",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const role = row.user.user_role;
                    let colorClass = "";
            
                    switch (role) {
                        case "Administrator": colorClass = "bg-admin"; break;
                        case "Coordinator": colorClass = "bg-coordinator"; break;
                        case "Teacher": colorClass = "bg-teacher"; break;
                        case "Student": colorClass = "bg-student"; break;
                        default: colorClass = "bg-guest";
                    }
            
                    return `<span class="badge ${colorClass}">${role.toUpperCase()}</span>`;
                }
            },
            {
                data: "student_status",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `<strong>${row.student_status}</strong>`;
                }
            },
            {
                data: "user.is_active",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const updatedAt = new Date(row.user.updated_at);
                    const now = new Date();
                    const diffMs = now - updatedAt;
            
                    const seconds = Math.floor(diffMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
            
                    let timeAgo = "";
                    if (years > 0) {
                        timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
                    } else if (months > 0) {
                        timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    } else if (weeks > 0) {
                        timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else if (days > 0) {
                        timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
                    } else if (hours > 0) {
                        timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
                    } else if (minutes > 0) {
                        timeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    } else {
                        timeAgo = "Just now";
                    }
            
                    if (row.user.is_active) {
                        return `<span class="badge bg-success">ACTIVE</span>`;
                    } else {
                        return `<span class="badge bg-secondary">${timeAgo}</span>`;
                    }
                }
            },
            {
                data: null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-primary btn-sm view-btn" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="View User" data-bs-target="#viewUserModal" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-eye"></i>                       
                        </button>
                        <button type="button" class="btn btn-info btn-sm" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Edit Student Status" data-bs-target="#editStudentStatusModal" data-id="${row.id}" data-student-status="${row.student_status}">
                            <i class="bi bi-pencil-square"></i>                       
                        </button>
                        <button class="btn btn-warning btn-sm" data-user-id="${row.user.id}" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Change Password"
                            data-bs-target="#changePasswordModal">
                            <i class="bi bi-key"></i>
                        </button>
                        ${row.user.deactivated ? `
                            <button class="btn btn-success btn-sm" onclick="handleActionUser('${row.user.id}', true)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Activate User">
                                <i class="bi bi-person-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="handleActionUser('${row.user.id}', false)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Deactivate User">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `}
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

    // Teacher Users Table
    teacherUsersTable = $('#teacherUsersTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.is_active = $('#filter-is-active').val();
            $.ajax({
                url: "/admin/teacher-users/data/",
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
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name.toUpperCase()}, ${row.first_name.toUpperCase()}${middle.toUpperCase()} `.trim();
                }
            },
            {
                data: "user.email",
                className: "align-middle text-center",
            },
            {
                data: "user.user_role",
                className: "align-middle text-center",
            },
            {
                data: "position",
                className: "align-middle text-center",
                render: function (data, type, row) {
                    return `<strong>${row.position}</strong>`;
                }
            },
            {
                data: "grade_level",
                className: "align-middle text-center",
            },
            { 
                data: "user.created_at",
                className: "align-middle text-center",
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {
                data: "user.updated_at",
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
                data: "user.is_active",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const updatedAt = new Date(row.user.updated_at);
                    const now = new Date();
                    const diffMs = now - updatedAt;
            
                    const seconds = Math.floor(diffMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
            
                    let timeAgo = "";
                    if (years > 0) {
                        timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
                    } else if (months > 0) {
                        timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    } else if (weeks > 0) {
                        timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else if (days > 0) {
                        timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
                    } else if (hours > 0) {
                        timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
                    } else if (minutes > 0) {
                        timeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    } else {
                        timeAgo = "Just now";
                    }
            
                    if (row.user.is_active) {
                        return `<span class="badge bg-success">ACTIVE</span>`;
                    } else {
                        return `<span class="badge bg-secondary">${timeAgo}</span>`;
                    }
                }
            },
            { 
                data:  null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-primary btn-sm teacher-view-btn" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="View User" data-bs-target="#editTeacherUserModal" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-eye"></i>                       
                        </button>
                        <button class="btn btn-warning btn-sm" data-user-id="${row.user.id}" data-bs-toggle="modal" data-bs-target="#changePasswordModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Change Password">
                            <i class="bi bi-key"></i>
                        </button>
                        ${row.user.deactivated ? `
                            <button class="btn btn-success btn-sm" onclick="handleActionUser('${row.user.id}', true)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Activate User">
                                <i class="bi bi-person-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="handleActionUser('${row.user.id}', false)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Deactivate User">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `}
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

    // Coordinator Users Table
    coordinatorUsersTable = $('#coordinatorUsersTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.is_active = $('#filter-is-active').val();
            $.ajax({
                url: "/admin/coordinator-users/data/",
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
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name.toUpperCase()}, ${row.first_name.toUpperCase()}${middle.toUpperCase()} `.trim();
                }
            },
            {
                data: "user.email",
                className: "align-middle text-center",
            },
            {
                data: "user.user_role",
                className: "align-middle text-center",
            },
            { 
                data: "user.created_at",
                className: "align-middle text-center",
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {
                data: "user.updated_at",
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
                data: "user.is_active",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const updatedAt = new Date(row.user.updated_at);
                    const now = new Date();
                    const diffMs = now - updatedAt;
            
                    const seconds = Math.floor(diffMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
            
                    let timeAgo = "";
                    if (years > 0) {
                        timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
                    } else if (months > 0) {
                        timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    } else if (weeks > 0) {
                        timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else if (days > 0) {
                        timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
                    } else if (hours > 0) {
                        timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
                    } else if (minutes > 0) {
                        timeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    } else {
                        timeAgo = "Just now";
                    }
            
                    if (row.user.is_active) {
                        return `<span class="badge bg-success">ACTIVE</span>`;
                    } else {
                        return `<span class="badge bg-secondary">${timeAgo}</span>`;
                    }
                }
            },
            { 
                data:  null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-primary btn-sm coordinator-view-btn" data-bs-toggle="modal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="View User" data-bs-target="#editCoordinatorUserModal" data-info='${JSON.stringify(row)}'>
                            <i class="bi bi-eye"></i>                       
                        </button>
                        <button class="btn btn-warning btn-sm" data-user-id="${row.user.id}" data-bs-toggle="modal" data-bs-target="#changePasswordModal" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Change Password">
                            <i class="bi bi-key"></i>
                        </button>
                        ${row.user.deactivated ? `
                            <button class="btn btn-success btn-sm" onclick="handleActionUser('${row.user.id}', true)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Activate User">
                                <i class="bi bi-person-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm" onclick="handleActionUser('${row.user.id}', false)" data-bs-toggle-second="tooltip" data-bs-placement="top" data-bs-title="Deactivate User">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `}
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

    // Admin Users Table
    adminUsersTable = $('#adminUsersTable').DataTable({
        serverSide: true,
        processing: true,
        ajax: function (data, callback, settings) {
            data.is_active = $('#filter-is-active').val();
            $.ajax({
                url: "/admin/admin-users/data/",
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
                data: null,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name.toUpperCase()}, ${row.first_name.toUpperCase()}${middle.toUpperCase()} `.trim();
                }
            },
            {
                data: "user.email",
                className: "align-middle text-center",
            },
            {
                data: "user.user_role",
                className: "align-middle text-center",
            },
            { 
                data: "user.created_at",
                className: "align-middle text-center",
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }) : "";
                }
            },
            {
                data: "user.updated_at",
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
                data: "user.is_active",
                orderable: false,
                searchable: false,
                className: "align-middle text-center",
                render: function (data, type, row) {
                    const updatedAt = new Date(row.user.updated_at);
                    const now = new Date();
                    const diffMs = now - updatedAt;
            
                    const seconds = Math.floor(diffMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
            
                    let timeAgo = "";
                    if (years > 0) {
                        timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
                    } else if (months > 0) {
                        timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
                    } else if (weeks > 0) {
                        timeAgo = `${weeks} week${weeks > 1 ? "s" : ""} ago`;
                    } else if (days > 0) {
                        timeAgo = `${days} day${days > 1 ? "s" : ""} ago`;
                    } else if (hours > 0) {
                        timeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
                    } else if (minutes > 0) {
                        timeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    } else {
                        timeAgo = "Just now";
                    }
            
                    if (row.user.is_active) {
                        return `<span class="badge bg-success">ACTIVE</span>`;
                    } else {
                        return `<span class="badge bg-secondary">${timeAgo}</span>`;
                    }
                }
            },
            { 
                data:  null,
                orderable: false,
                className: "text-center align-middle",
                searchable: false,
                render: function (data, type, row) {
                    if (row.user.id === 1) {
                        return `
                            <button class="btn btn-warning btn-sm"
                                data-user-id="${row.user.id}"
                                data-bs-toggle="modal"
                                data-bs-target="#changePasswordModal"
                                data-bs-toggle-second="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Change Password">
                                <i class="bi bi-key"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" disabled
                                data-bs-toggle-second="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Cannot deactivate super admin">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `;
                    }
                    return `
                        <button class="btn btn-warning btn-sm"
                            data-user-id="${row.user.id}"
                            data-bs-toggle="modal"
                            data-bs-target="#changePasswordModal"
                            data-bs-toggle-second="tooltip"
                            data-bs-placement="top"
                            data-bs-title="Change Password">
                            <i class="bi bi-key"></i>
                        </button>
                        ${row.user.deactivated ? `
                            <button class="btn btn-success btn-sm"
                                onclick="handleActionUser('${row.user.id}', true)"
                                data-bs-toggle-second="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Activate User">
                                <i class="bi bi-person-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-danger btn-sm"
                                onclick="handleActionUser('${row.user.id}', false)"
                                data-bs-toggle-second="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Deactivate User">
                                <i class="bi bi-person-x"></i>
                            </button>
                        `}
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


    // Change Password
    $('#changePasswordModal').on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const userId = button.data('user-id');
        $('#currentPassword').val("");
        $('#newPassword').val("");
        $('#confirmPassword').val("");

        $(document).on('submit', '#changePasswordForm', function (e) {
            e.preventDefault();
            let modal = $('#changePasswordModal');
            const form = $(this);
            let formData = form.serialize();
            formData = formData + `&user_id=${userId}`;
            let currentPassword = form.find('#currentPassword').val();
            let newPassword = form.find('#newPassword').val();
            let confirmPassword = form.find('#confirmPassword').val();
            Swal.fire({
                title: 'Change Password',
                text: 'Are you sure you want to change the password for this user?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes',
                preConfirm: () => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                        Swal.showValidationMessage('All password fields are required.');
                        return false;
                    }
                    if (newPassword !== confirmPassword) {
                        Swal.showValidationMessage('Passwords do not match.');
                        return false;
                    }
                    Swal.showLoading();
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            $.ajax({
                                url: '/admin/change_password/',
                                type: 'POST',
                                data: formData,
                                headers: {
                                    'X-CSRFToken': getCookie('csrftoken'),
                                }
                            })
                            .done(function(response) {
                                if (response.success) {
                                    resolve(response);
                                } else {
                                    Swal.hideLoading();
                                    Swal.showValidationMessage(response.message || "Failed to change password.");
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
                        icon: "success",
                        title: "Success!",
                        text: "The password has been successfully changed.",
                        confirmButtonText: "OK",
                    }).then(() => {
                        modal.modal("hide");
                        allUsersTable.ajax.reload();
                        studentUsersTable.ajax.reload();
                    });
                }
            });
        });
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
    $('#filter-user-role, #filter-is-active,#filter-student-status, #filter-status')
    .on('change', function () {
        allUsersTable.ajax.reload();
        studentUsersTable.ajax.reload();
        teacherUsersTable.ajax.reload();
        coordinatorUsersTable.ajax.reload();
        adminUsersTable.ajax.reload();
    });

    // Clear filters button
    $('#clearFilters').on('click', function () {
        $('#filter-user-role').val('');
        $('#filter-is-active').val('');
        $('#filter-student-status').val('');
        $('#filter-status').val('');
        allUsersTable.ajax.reload();
        studentUsersTable.ajax.reload();
        teacherUsersTable.ajax.reload();
        coordinatorUsersTable.ajax.reload();
        adminUsersTable.ajax.reload();
    });


    // View User Modal
    $(document).on('click', '.view-btn', function () {
        const form = $("#enrollmentForm");
        form.find(".is-invalid").removeClass("is-invalid");
        form.find(".invalid-feedback").text("");
        const app = $(this).data('info');
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("id", app.id);
        console.log(app.id);
        setValue("psa_no", app.psa_no);
        setValue("lrn", app.lrn);
        setValue("first_name", app.first_name);
        setValue("middle_name", app.middle_name);
        setValue("last_name", app.last_name);
        setValue("extension_name", app.extension_name);
        setValue("birth_date", app.birth_date);
        setValue("age", app.age);
        setValue("gender", app.gender);
        setValue("place_of_birth", app.place_of_birth);
        setValue("mother_tongue", app.mother_tongue);
        
        // Current Address
        setValue("current_house_no", app.current_house_no);
        setValue("current_street", app.current_street);
        setValue("current_barangay", app.current_barangay);
        setValue("current_municipality", app.current_municipality);
        setValue("current_province", app.current_province);
        setValue("current_country", app.current_country || "PHILIPPINES");
        setValue("current_zip_code", app.current_zip_code);
        
        // Permanent Address
        setValue("permanent_house_no", app.permanent_house_no);
        setValue("permanent_street", app.permanent_street);
        setValue("permanent_barangay", app.permanent_barangay);
        setValue("permanent_municipality", app.permanent_municipality);
        setValue("permanent_province", app.permanent_province);
        setValue("permanent_country", app.permanent_country || "PHILIPPINES");
        setValue("permanent_zip_code", app.permanent_zip_code);
        
        // Check if permanent address is same as current
        if (app.current_house_no && app.permanent_house_no && 
            app.current_street && app.permanent_street &&
            app.current_house_no === app.permanent_house_no &&
            app.current_street === app.permanent_street) {
            $("#same_as_current_view").prop("checked", true);
        } else {
            $("#same_as_current_view").prop("checked", false);
        }
        
        // Parent's/Guardian's Information
        setValue("father_last_name", app.father_last_name);
        setValue("father_first_name", app.father_first_name);
        setValue("father_middle_name", app.father_middle_name);
        setValue("father_contact_number", app.father_contact_number);
        setValue("mother_last_name", app.mother_last_name);
        setValue("mother_first_name", app.mother_first_name);
        setValue("mother_middle_name", app.mother_middle_name);
        setValue("mother_contact_number", app.mother_contact_number);
        setValue("guardian_last_name", app.guardian_last_name);
        setValue("guardian_first_name", app.guardian_first_name);
        setValue("guardian_middle_name", app.guardian_middle_name);
        setValue("guardian_contact_number", app.guardian_contact_number);
        
        // IP Community
        if (app.ip_community === "yes") {
            $("#ip_community_yes").prop("checked", true);
            $("#ip_community_specify_view").show();
            setValue("ip_community_specify_text", app.ip_community_specify_text);
        } else {
            $("#ip_community_no").prop("checked", true);
            $("#ip_community_specify_view").hide();
        }
        
        // 4Ps Beneficiary
        if (app.beneficiary_4ps === "yes") {
            $("#beneficiary_4ps_yes").prop("checked", true);
            $("#household_id_field_view").show();
            setValue("household_id_number", app.household_id_number);
        } else {
            $("#beneficiary_4ps_no").prop("checked", true);
            $("#household_id_field_view").hide();
        }
        
        // Learner with Disability
        if (app.learner_with_disability === "yes") {
            $("#learner_disability_yes").prop("checked", true);
            $("#disability_types_section_view").show();
            
            // Parse disability types from JSON
            let disabilityTypes = [];
            let disabilityVisualTypes = [];
            let disabilityHealthTypes = [];
            
            try {
                if (app.disability_type) {
                    disabilityTypes = typeof app.disability_type === 'string' ? JSON.parse(app.disability_type) : app.disability_type;
                }
                if (app.disability_visual_type) {
                    disabilityVisualTypes = typeof app.disability_visual_type === 'string' ? JSON.parse(app.disability_visual_type) : app.disability_visual_type;
                }
                if (app.disability_health_type) {
                    disabilityHealthTypes = typeof app.disability_health_type === 'string' ? JSON.parse(app.disability_health_type) : app.disability_health_type;
                }
            } catch (e) {
                console.error("Error parsing disability JSON:", e);
            }
            
            let disabilityHtml = '<div class="row">';
            disabilityHtml += '<div class="col-12 col-md-6">';
            
            if (disabilityTypes.includes('visual_impairment')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Visual Impairment</strong></label></div>';
                if (disabilityVisualTypes.includes('blind')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• blind</label></div>';
                }
                if (disabilityVisualTypes.includes('low_vision')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• low vision</label></div>';
                }
            }
            if (disabilityTypes.includes('hearing_impairment')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Hearing Impairment</strong></label></div>';
            }
            if (disabilityTypes.includes('speech_language_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Speech/Language Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('multiple_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Multiple Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('learning_disability')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Learning Disability</strong></label></div>';
            }
            
            disabilityHtml += '</div><div class="col-12 col-md-6">';
            
            if (disabilityTypes.includes('emotional_behavioral_disorder')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Emotional-Behavioral Disorder</strong></label></div>';
            }
            if (disabilityTypes.includes('cerebral_palsy')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Cerebral Palsy</strong></label></div>';
            }
            if (disabilityTypes.includes('intellectual_disability')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Intellectual Disability</strong></label></div>';
            }
            if (disabilityTypes.includes('orthopedic_physical_handicap')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Orthopedic/Physical Handicap</strong></label></div>';
            }
            if (disabilityTypes.includes('special_health_problem')) {
                disabilityHtml += '<div class="form-check mb-2"><label class="form-check-label"><strong>Special Health Problem/Chronic Disease</strong></label></div>';
                if (disabilityHealthTypes.includes('cancer')) {
                    disabilityHtml += '<div class="ms-4 mb-2"><label class="form-check-label">• Cancer</label></div>';
                }
            }
            
            disabilityHtml += '</div></div>';
            $("#disability_types_display").html(disabilityHtml);
        } else {
            $("#learner_disability_no").prop("checked", true);
            $("#disability_types_section_view").hide();
        }
        
        // Distance Learning Modalities (SHS only)
        if (app.enrollment_type === "SHS" && app.learning_modality) {
            $("#learning_modality_section").show();
            let learningModalities = [];
            try {
                learningModalities = typeof app.learning_modality === 'string' ? JSON.parse(app.learning_modality) : app.learning_modality;
            } catch (e) {
                console.error("Error parsing learning modality JSON:", e);
            }
            
            const modalityLabels = {
                'modular_print': 'Modular (Print)',
                'online': 'Online',
                'radio_based': 'Radio-Based Instruction',
                'blended': 'Blended',
                'modular_digital': 'Modular (Digital)',
                'educational_tv': 'Educational Television',
                'homeschooling': 'Homeschooling'
            };
            
            let modalityHtml = '<div class="row"><div class="col-12 col-md-6">';
            learningModalities.forEach((mod, index) => {
                if (index > 0 && index % 4 === 0) {
                    modalityHtml += '</div><div class="col-12 col-md-6">';
                }
                modalityHtml += `<div class="form-check mb-2"><label class="form-check-label">✓ ${modalityLabels[mod] || mod}</label></div>`;
            });
            modalityHtml += '</div></div>';
            $("#learning_modality_display").html(modalityHtml);
        } else {
            $("#learning_modality_section").hide();
        }
        
        if (app.status === "Complete") {
            $("#document-status").html(`<span class="badge bg-success">Complete</span>`);
        } else {
            $("#document-status").html(`<span class="badge bg-danger">Missing</span>`);
        }
        $("#documentForm input[type=checkbox]").prop("checked", false);
        if (!app.documents) {
            const documents = $(this).data('documents');
            documents.forEach(function(doc) {
                $("#document-" + doc.document_id).prop("checked", true);
            });
        } else {
            app.documents.forEach(function(doc) {
                $("#document-" + doc.document_id).prop("checked", true);
            });
        }
        
        // Submission Remarks
        if (app.submission_remarks && app.submission_remarks.trim() !== "") {
            $("#submission_remarks_check").prop("checked", true);
            $("#submission_remarks_textarea").show();
            setValue("submission_remarks", app.submission_remarks);
        } else {
            $("#submission_remarks_check").prop("checked", false);
            $("#submission_remarks_textarea").hide();
            setValue("submission_remarks", "");
        }


        const jhsHtml = `
            <div class="enrollment_information">
                <h5>Enrollment Information (JHS)</h5>
                <div class="row">
                    <div class="col-12 col-md-6 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled readonly>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled readonly>
                            <option value="7" ${app.grade_level=='7' || app.grade=='7'?'selected':''}>GRADE 7</option>
                            <option value="8" ${app.grade_level=='8' || app.grade=='8'?'selected':''}>GRADE 8</option>
                            <option value="9" ${app.grade_level=='9' || app.grade=='9'?'selected':''}>GRADE 9</option>
                            <option value="10" ${app.grade_level=='10' || app.grade=='10'?'selected':''}>GRADE 10</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${app.student_type=='new student' || app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_type=='returning' || app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_type=='transferee' || app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div id="returning_transferee_section_view" style="display: none;">
                    <div class="row mb-3">
                        <div class="col-12">
                            <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_grade_level_view" class="form-label">Last Grade Level Completed</label>
                            <input type="text" class="form-control" id="last_grade_level_view" name="last_grade_level" value="${app.last_grade_level || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_school_year_view" class="form-label">Last School Year Completed</label>
                            <input type="text" class="form-control" id="last_school_year_view" name="last_school_year" value="${app.last_school_year || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_school_attended_view" class="form-label">Last School Attended</label>
                            <input type="text" class="form-control text-uppercase" id="last_school_attended_view" name="last_school_attended" value="${app.last_school_attended || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="school_id_view" class="form-label">School ID</label>
                            <input type="text" class="form-control" id="school_id_view" name="school_id" value="${app.school_id || ''}" maxlength="6" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const shsHtml = `
            <div class="enrollment_information">
                <h5>Enrollment Information (SHS)</h5>
                <div class="row">
                    <div class="col-12 col-md-4 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-4 mb-3">
                        <div class="mb-3">
                            <label for="student_type" class="form-label">Student Type</label>
                            <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                <option value="new student" ${app.student_type=='new student' || app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                <option value="returning" ${app.student_type=='returning' || app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                <option value="transferee" ${app.student_type=='transferee' || app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                            </select>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-4 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${app.grade_level=='11' || app.grade=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${app.grade_level=='12' || app.grade=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 col-md-4 mb-3">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" step="0.01" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${app.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${app.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-12 col-md-4 mb-3">
                        <label for="strand" class="form-label">Strand</label>
                        <select class="form-select" id="strand" name="strand" disabled>
                            <option value="">--</option>
                            <option value="ABM" ${app.strand=='ABM'?'selected':''}>ABM</option>
                            <option value="STEM" ${app.strand=='STEM'?'selected':''}>STEM</option>
                        </select>
                        <div class="invalid-feedback">                        </div>
                    </div>
                </div>
                <div id="returning_transferee_section_view" style="display: none;">
                    <div class="row mb-3">
                        <div class="col-12">
                            <h6 class="text-primary mb-3">For Returning Learner (Balik-Aral) and Those Who will Transfer/Move In:</h6>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_grade_level_view" class="form-label">Last Grade Level Completed</label>
                            <input type="text" class="form-control" id="last_grade_level_view" name="last_grade_level" value="${app.last_grade_level || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_school_year_view" class="form-label">Last School Year Completed</label>
                            <input type="text" class="form-control" id="last_school_year_view" name="last_school_year" value="${app.last_school_year || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="last_school_attended_view" class="form-label">Last School Attended</label>
                            <input type="text" class="form-control text-uppercase" id="last_school_attended_view" name="last_school_attended" value="${app.last_school_attended || ''}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3 mb-3">
                            <label for="school_id_view" class="form-label">School ID</label>
                            <input type="text" class="form-control" id="school_id_view" name="school_id" value="${app.school_id || ''}" maxlength="6" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (app.enrollment_type === "JHS") {
            $("#enrollemnt_jhs").html(jhsHtml);
            $("#enrollemnt_shs").empty();
        } else if (app.enrollment_type === "SHS") {
            $("#enrollemnt_shs").html(shsHtml);
            $("#enrollemnt_jhs").empty();
        }
        
        // Show/hide returning/transferee section based on student_type
        const studentType = app.student_type ? app.student_type.toLowerCase() : '';
        if (studentType === 'returning' || studentType === 'transferee') {
            $("#returning_transferee_section_view").show();
        } else {
            $("#returning_transferee_section_view").hide();
        }
        
        // Handle submission remarks checkbox change
        $("#submission_remarks_check").off("click").on("click", function () {
            if ($(this).is(":checked")) {
                $("#submission_remarks_textarea").show();
                $("#submission_remarks").prop("disabled", false);
            } else {
                $("#submission_remarks_textarea").hide();
                $("#submission_remarks").prop("disabled", true).val("");
            }
        });
        
        // Handle same as current address checkbox
        $("#same_as_current_view").off("change").on("change", function () {
            if ($(this).is(":checked")) {
                // Copy current address to permanent address
                setValue("permanent_house_no", app.current_house_no);
                setValue("permanent_street", app.current_street);
                setValue("permanent_barangay", app.current_barangay);
                setValue("permanent_municipality", app.current_municipality);
                setValue("permanent_province", app.current_province);
                setValue("permanent_country", app.current_country || "PHILIPPINES");
                setValue("permanent_zip_code", app.current_zip_code);
                $("#permanent_address_fields_view").hide();
            } else {
                $("#permanent_address_fields_view").show();
            }
        });
        
        // Handle IP Community radio change
        $("input[name='ip_community']").off("change").on("change", function () {
            if ($(this).val() === "yes") {
                $("#ip_community_specify_view").show();
            } else {
                $("#ip_community_specify_view").hide();
                setValue("ip_community_specify_text", "");
            }
        });
        
        // Handle 4Ps Beneficiary radio change
        $("input[name='beneficiary_4ps']").off("change").on("change", function () {
            if ($(this).val() === "yes") {
                $("#household_id_field_view").show();
            } else {
                $("#household_id_field_view").hide();
                setValue("household_id_number", "");
            }
        });
        
        // Handle Learner with Disability radio change
        $("input[name='learner_with_disability']").off("change").on("change", function () {
            if ($(this).val() === "yes") {
                $("#disability_types_section_view").show();
            } else {
                $("#disability_types_section_view").hide();
            }
        });
    });

    // Edit Student Status Modal
    $("#editStudentStatusModal").on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget);
        const userId = button.data('id');
        const studentStatus = button.data('student-status');
        $("#studentStatus").val(studentStatus);
        $(document).on('submit', '#editStatusForm', function (e) {
            e.preventDefault();
            let formData = $(this).serialize();
            formData = formData + `&student_id=${userId}`;
            Swal.fire({
                title: 'Edit Student Status',
                text: 'Are you sure you want to edit the student status?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes',
                preConfirm: () => {
                    Swal.showLoading();
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            $.ajax({
                                url: '/admin/edit_student_status/',
                                type: 'POST',
                                data: formData,
                                headers: {
                                    'X-CSRFToken': getCookie('csrftoken'),
                                }
                            })
                            .done(function(response) {
                                if (response.success) {
                                    resolve(response);
                                } else {
                                    Swal.hideLoading();
                                    Swal.showValidationMessage(response.message || "Failed to edit student status.");
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
                        icon: "success",
                        title: "Success!",
                        text: "The student status has been successfully edited.",
                        confirmButtonText: "OK",
                    }).then(() => {
                        studentUsersTable.ajax.reload();
                    });
                }
            });
        })
    });

    // Edit Button functionality for View User Modal
    $("#editButton").on("click", function () {
        enableEditForm();
    });

    $("#closeButton").on("click", function () {
        disableEditForm();
    });

    $("#viewUserModal").on("hidden.bs.modal", function () {
        disableEditForm();
    });

    // Save Student Information
    $("#editStudentUserButton").on("click", function () {
        const $form = $("#enrollmentForm");
        
        // Validate returning/transferee fields if student_type is returning or transferee
        const studentType = $("#student_type").val();
        let hasErrors = false;
        
        if (studentType === "returning" || studentType === "transferee") {
            const lastGradeLevel = $("#last_grade_level_view").val()?.trim();
            const lastSchoolYear = $("#last_school_year_view").val()?.trim();
            const lastSchoolAttended = $("#last_school_attended_view").val()?.trim();
            const schoolId = $("#school_id_view").val()?.trim();
            
            // Clear previous errors
            $("#last_grade_level_view, #last_school_year_view, #last_school_attended_view, #school_id_view").removeClass("is-invalid");
            $("#last_grade_level_view").closest(".mb-3").find(".invalid-feedback").text("");
            $("#last_school_year_view").closest(".mb-3").find(".invalid-feedback").text("");
            $("#last_school_attended_view").closest(".mb-3").find(".invalid-feedback").text("");
            $("#school_id_view").closest(".mb-3").find(".invalid-feedback").text("");
            
            if (!lastGradeLevel) {
                $("#last_grade_level_view").addClass("is-invalid");
                $("#last_grade_level_view").closest(".mb-3").find(".invalid-feedback").text("Last Grade Level Completed is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!lastSchoolYear) {
                $("#last_school_year_view").addClass("is-invalid");
                $("#last_school_year_view").closest(".mb-3").find(".invalid-feedback").text("Last School Year Completed is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!lastSchoolAttended) {
                $("#last_school_attended_view").addClass("is-invalid");
                $("#last_school_attended_view").closest(".mb-3").find(".invalid-feedback").text("Last School Attended is required for returning/transferee students.");
                hasErrors = true;
            }
            if (!schoolId) {
                $("#school_id_view").addClass("is-invalid");
                $("#school_id_view").closest(".mb-3").find(".invalid-feedback").text("School ID is required for returning/transferee students.");
                hasErrors = true;
            }
            
            if (hasErrors) {
                Swal.fire({
                    icon: 'error',
                    title: 'Validation Error',
                    text: 'Please fill in all required fields for returning/transferee students.'
                });
                return;
            }
        }
        
        let formData = $form.serialize();
        
        // Handle submission remarks: if checkbox is unchecked, set value to empty/null
        if (!$("#submission_remarks_check").is(":checked")) {
            // Remove submission_remarks from formData if exists (handle both start and middle positions)
            formData = formData.replace(/^submission_remarks=[^&]*&?/, '')
                               .replace(/&submission_remarks=[^&]*/g, '');
            // Add empty submission_remarks parameter
            if (formData) {
                formData += "&submission_remarks=";
            } else {
                formData = "submission_remarks=";
            }
        }
        
        const $button = $(this);
        $button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
        setTimeout(function() {
            $.ajax({
                url: "/admin/update_student_information/", 
                type: "POST",
                data: formData,
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest"
                },
                success: function (response) {
                    $button.prop("disabled", false).html("Save changes");
                    if (response.success) {
                        Swal.fire({
                            title: "Saved!",
                            text: response.message,
                            icon: "success",
                            confirmButtonText: "OK",
                            showConfirmButton: true,
                        }).then(() => {
                            $("#viewUserModal").modal("hide");
                            studentUsersTable.ajax.reload();
                        });
                    } else {
                        if (response.errors) {
                            Object.keys(response.errors).forEach(function (field) {
                                const input = $(`[name="${field}"]`);
                                input.addClass("is-invalid");
                                input.siblings(".invalid-feedback").text(response.errors[field][0]);
                            });
                        } else {
                            Swal.fire({
                                title: "Error!",
                                text: response.message,
                                icon: "error",
                                confirmButtonText: "OK",
                                showConfirmButton: true,
                            });
                        }
                    }
                },
                error: function (xhr, status, error) {
                    $button.prop("disabled", false).html("Save changes");
                    Swal.fire({
                        title: "Error!",
                        text: "An error occurred while saving the student information.",
                        icon: "error",
                        confirmButtonText: "OK",
                        showConfirmButton: true,
                    });
                }
            });
        }, 500);
    });

    // Add Student User Modal
    $("#addStudentUserModal").on("show.bs.modal", function () {
        const $enrollmentType = $("#enrollment_type");
        const $enrollmentFields = $("#enrollmentFields");
        
        // Initialize submission remarks section
        $("#submission_remarks_check_add").prop("checked", false);
        $("#submission_remarks_textarea_add").hide();
        $("#submission_remarks_add").prop("disabled", true).val("");
    
        function updateEnrollmentFields() {
            const enrollmentType = $enrollmentType.val();
            if (enrollmentType === "SHS") {
                $enrollmentFields.html(`
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="grade_level" class="form-label">Grade Level</label>
                            <select class="form-select form-control" id="grade_level" name="grade_level">
                                <option value="11">GRADE 11</option>
                                <option value="12">GRADE 12</option>
                            </select>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" class="form-control" id="gen_avg" name="gen_avg">
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="semester" class="form-label">Semester</label>
                            <select class="form-select form-control" id="semester" name="semester">
                                <option value="1st">1st</option>
                                <option value="2nd">2nd</option>
                            </select>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="mb-3">
                            <label for="strand" class="form-label">Strand</label>
                            <select class="form-select form-control" id="strand" name="strand">
                                <option value="">Select strand...</option>
                                <option value="ABM">ABM (Accountancy, Business and Management)</option>
                                <option value="STEM">STEM (Science, Technology, Engineering and Mathematics)</option>
                            </select>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                `);
            } else {
                $enrollmentFields.html(`
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="grade_level" class="form-label">Grade Level</label>
                            <select class="form-select form-control" id="grade_level" name="grade_level">
                                <option value="7">GRADE 7</option>
                                <option value="8">GRADE 8</option>
                                <option value="9">GRADE 9</option>
                                <option value="10">GRADE 10</option>
                            </select>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" class="form-control" id="gen_avg" name="gen_avg">
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                `);
            }
        }
        updateEnrollmentFields();
        // Handle changes dynamically
        $enrollmentType.off("change").on("change", function() {
            updateEnrollmentFields();
            // Show/hide learning modality section based on enrollment type
            if ($enrollmentType.val() === "SHS") {
                $("#learning_modality_section_add").show();
            } else {
                $("#learning_modality_section_add").hide();
            }
        });
        
        // Initialize learning modality section visibility
        if ($enrollmentType.val() === "SHS") {
            $("#learning_modality_section_add").show();
        } else {
            $("#learning_modality_section_add").hide();
        }
        
        // Handle returning/transferee section visibility based on student_type
        function updateReturningTransfereeSection() {
            const studentType = $("#student_type").val();
            if (studentType === "returning" || studentType === "transferee") {
                $("#returning_transferee_section_add").slideDown();
            } else {
                $("#returning_transferee_section_add").slideUp();
                // Clear returning/transferee fields
                $("#last_grade_level_add").val("");
                $("#last_school_year_add").val("");
                $("#last_school_attended_add").val("");
                $("#school_id_add").val("");
            }
        }
        
        // Handle student_type change
        $("#student_type").off("change").on("change", function() {
            updateReturningTransfereeSection();
        });
        
        // Initialize returning/transferee section visibility
        updateReturningTransfereeSection();
        
        // IP Community conditional display
        $('input[name="ip_community"]').off("change").on("change", function() {
            if ($(this).val() === "yes") {
                $("#ip_community_specify_add").show();
            } else {
                $("#ip_community_specify_add").hide();
                $("#ip_community_specify_text").val("");
            }
        });
        
        // 4Ps Beneficiary conditional display
        $('input[name="beneficiary_4ps"]').off("change").on("change", function() {
            if ($(this).val() === "yes") {
                $("#household_id_field_add").show();
            } else {
                $("#household_id_field_add").hide();
                $("#household_id_number").val("");
            }
        });
        
        // Learner with Disability conditional display
        $('input[name="learner_with_disability"]').off("change").on("change", function() {
            if ($(this).val() === "yes") {
                $("#disability_types_section_add").show();
            } else {
                $("#disability_types_section_add").hide();
                $('input[name="disability_type"]:checked').prop("checked", false);
                $('input[name="disability_visual_type"]:checked').prop("checked", false);
                $('input[name="disability_health_type"]:checked').prop("checked", false);
            }
        });
        
        // Same as current address checkbox (scope to Add Student modal to avoid ID collisions)
        const $addStudentModal = $("#addStudentUserModal");
        $addStudentModal.find("#same_as_current_add").off("change").on("change", function() {
            if ($(this).is(":checked")) {
                // Copy current address values to permanent address
                $addStudentModal.find("#permanent_house_no").val($addStudentModal.find("#current_house_no").val());
                $addStudentModal.find("#permanent_street").val($addStudentModal.find("#current_street").val());
                $addStudentModal.find("#permanent_barangay").val($addStudentModal.find("#current_barangay").val());
                $addStudentModal.find("#permanent_municipality").val($addStudentModal.find("#current_municipality").val());
                $addStudentModal.find("#permanent_province").val($addStudentModal.find("#current_province").val());
                $addStudentModal.find("#permanent_country").val($addStudentModal.find("#current_country").val());
                $addStudentModal.find("#permanent_zip_code").val($addStudentModal.find("#current_zip_code").val());
                // Disable permanent address fields
                $addStudentModal.find("#permanent_address_fields_add input").prop("disabled", true);
            } else {
                // Clear permanent address fields
                $addStudentModal.find("#permanent_address_fields_add input").val("");
                $addStudentModal.find("#permanent_country").val("PHILIPPINES");
                // Enable permanent address fields
                $addStudentModal.find("#permanent_address_fields_add input").prop("disabled", false);
            }
        });
        
        // Copy current address values to permanent address when current address fields change (scoped)
        $addStudentModal.find("#current_house_no, #current_street, #current_barangay, #current_municipality, #current_province, #current_country, #current_zip_code").off("input").on("input", function() {
            if ($addStudentModal.find("#same_as_current_add").is(":checked")) {
                const fieldMap = {
                    "current_house_no": "permanent_house_no",
                    "current_street": "permanent_street",
                    "current_barangay": "permanent_barangay",
                    "current_municipality": "permanent_municipality",
                    "current_province": "permanent_province",
                    "current_country": "permanent_country",
                    "current_zip_code": "permanent_zip_code"
                };
                const currentFieldId = $(this).attr("id");
                const permanentFieldId = fieldMap[currentFieldId];
                if (permanentFieldId) {
                    $addStudentModal.find("#" + permanentFieldId).val($(this).val());
                }
            }
        });
        
        // Submission Remarks Checkbox Toggle
        $("#submission_remarks_check_add").off("change").on("change", function() {
            if ($(this).is(":checked")) {
                $("#submission_remarks_textarea_add").show();
                $("#submission_remarks_add").prop("disabled", false);
            } else {
                $("#submission_remarks_textarea_add").hide();
                $("#submission_remarks_add").prop("disabled", true).val("");
            }
        });
        
        // Handle form submission
        $("#addStudentUserForm").on("submit", function (e) {
            e.preventDefault();
            handleAddStudentSubmit();
        });
        
        // Handle save button click
        $("#addStudentUserModal #saveButton").off("click").on("click", function () {
            handleAddStudentSubmit();
        });
        
        function handleAddStudentSubmit() {
            let form = $("#addStudentUserForm");
            
            // Validate returning/transferee fields if student_type is returning or transferee
            const studentType = $("#student_type").val();
            let hasErrors = false;
            
            if (studentType === "returning" || studentType === "transferee") {
                const lastGradeLevel = $("#last_grade_level_add").val()?.trim();
                const lastSchoolYear = $("#last_school_year_add").val()?.trim();
                const lastSchoolAttended = $("#last_school_attended_add").val()?.trim();
                const schoolId = $("#school_id_add").val()?.trim();
                
                // Clear previous errors
                $("#last_grade_level_add, #last_school_year_add, #last_school_attended_add, #school_id_add").removeClass("is-invalid");
                $("#last_grade_level_add").closest(".mb-3").find(".invalid-feedback").text("");
                $("#last_school_year_add").closest(".mb-3").find(".invalid-feedback").text("");
                $("#last_school_attended_add").closest(".mb-3").find(".invalid-feedback").text("");
                $("#school_id_add").closest(".mb-3").find(".invalid-feedback").text("");
                
                if (!lastGradeLevel) {
                    $("#last_grade_level_add").addClass("is-invalid");
                    $("#last_grade_level_add").closest(".mb-3").find(".invalid-feedback").text("Last Grade Level Completed is required for returning/transferee students.");
                    hasErrors = true;
                }
                if (!lastSchoolYear) {
                    $("#last_school_year_add").addClass("is-invalid");
                    $("#last_school_year_add").closest(".mb-3").find(".invalid-feedback").text("Last School Year Completed is required for returning/transferee students.");
                    hasErrors = true;
                }
                if (!lastSchoolAttended) {
                    $("#last_school_attended_add").addClass("is-invalid");
                    $("#last_school_attended_add").closest(".mb-3").find(".invalid-feedback").text("Last School Attended is required for returning/transferee students.");
                    hasErrors = true;
                }
                if (!schoolId) {
                    $("#school_id_add").addClass("is-invalid");
                    $("#school_id_add").closest(".mb-3").find(".invalid-feedback").text("School ID is required for returning/transferee students.");
                    hasErrors = true;
                }
                
                if (hasErrors) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Validation Error',
                        text: 'Please fill in all required fields for returning/transferee students.'
                    });
                    return;
                }
            }
            
            // Enable permanent address fields before serialization if "same as current address" is checked
            if ($("#same_as_current_add").is(":checked")) {
                $("#permanent_address_fields_add input").prop("disabled", false);
            }
            
            // Enable submission remarks textarea before serialization if checkbox is checked
            if ($("#submission_remarks_check_add").is(":checked")) {
                $("#submission_remarks_add").prop("disabled", false);
            }
            
            let formData = form.serialize();
            
            // Re-disable permanent address fields after serialization if "same as current address" is checked
            if ($("#same_as_current_add").is(":checked")) {
                $("#permanent_address_fields_add input").prop("disabled", true);
            }
            
            // Handle submission remarks: if checkbox is unchecked, set value to empty/null
            if (!$("#submission_remarks_check_add").is(":checked")) {
                // Remove submission_remarks from formData if exists (handle both start and middle positions)
                formData = formData.replace(/^submission_remarks=[^&]*&?/, '')
                                   .replace(/&submission_remarks=[^&]*/g, '');
                // Add empty submission_remarks parameter
                if (formData) {
                    formData += "&submission_remarks=";
                } else {
                    formData = "submission_remarks=";
                }
            }
            
            // Re-disable submission remarks textarea after serialization if checkbox is checked
            if ($("#submission_remarks_check_add").is(":checked")) {
                $("#submission_remarks_add").prop("disabled", true);
            }
            let button = $("#addStudentUserModal #saveButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');

            setTimeout(function() {
                $.ajax({
                    url: '/admin/add_student/',
                    type: 'POST',
                    data: formData,
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    success: function (response) {
                        button.prop("disabled", false).html('<i class="bi bi-check-circle me-1"></i>Save');
                        form.find('.is-invalid').removeClass('is-invalid');
                        form.find('.invalid-feedback').text('');
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Student added!',
                                text: response.message,
                                confirmButtonText: 'OK',
                                showConfirmButton: true,
                            }).then(() => {
                                $('#addStudentUserModal').modal('hide');
                                form.trigger("reset");
                                studentUsersTable.ajax.reload();
                            });
                        } else {
                            let errors = response.message;
                            for (let fieldName in errors) {
                                let field = form.find(`[name="${fieldName}"]`);
                                let feedback = field.closest('.mb-3').find('.invalid-feedback');
                                field.addClass('is-invalid');
                                feedback.text(errors[fieldName][0]);
                            }
                            Swal.fire({
                                icon: 'error',
                                title: 'Validation Error',
                                text: 'Please correct the highlighted fields.'
                            });
                        }
                    },
                    error: function () {
                        button.prop("disabled", false).html('<i class="bi bi-check-circle me-1"></i>Save');
                        Swal.fire({
                            icon: 'error',
                            title: 'Server Error',
                            text: 'Something went wrong. Please try again later.'
                        });
                    }
                });
            },500);
        }
        
        $("#addStudentUserForm").on("input change", ".form-control, .form-select, .form-check-input", function () {
            $(this).removeClass("is-invalid");
            $(this).closest(".mb-3").find(".invalid-feedback").text("");
        });        
    });


    // Add Teacher User
    $("#addTeacherUserForm").on("submit", function (e) {
        e.preventDefault();
        const form = $(this);
        const formData = form.serialize();
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
    
        setTimeout(function () {
            $.ajax({
                url: '/admin/add_teacher/',
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
                            title: 'Teacher added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                            showConfirmButton: true,
                        }).then(() => {
                            $('#addTeacherUserModal').modal('hide');
                            form.trigger("reset");
                            teacherUsersTable.ajax.reload();
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

    // Edit Teacher User
    $(document).on('click', '.teacher-view-btn', function () {
        const info = $(this).data('info');
        const teacher_id = info.id;
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("first_name", info.first_name);
        setValue("middle_name", info.middle_name);
        setValue("last_name", info.last_name);
        setValue("position", info.position);
        setValue("grade_level", info.grade_level);
        setValue("email", info.user.email);
        // console.log(info);
        $("#editTeacherUserForm").on("submit", function (e) {
            e.preventDefault();
            const form = $(this);
            let formData = form.serialize();
            formData += `&teacher_id=${teacher_id}`;
            let button = $("#editTeacherUserButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
            setTimeout(function () {
                $.ajax({
                    url: '/admin/edit_teacher/',
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
                                title: 'Teacher updated!',
                                text: response.message,
                                confirmButtonText: 'OK',
                                showConfirmButton: true,
                            }).then(() => {
                                $('#editTeacherUserModal').modal('hide');
                                teacherUsersTable.ajax.reload();
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

    // Add Coordinator User
    $("#addCoordinatorUserForm").on("submit", function (e) {
        e.preventDefault();
        const form = $(this);
        const formData = form.serialize();
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
        setTimeout(function () {
            $.ajax({
                url: '/admin/add_coordinator/',
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
                            title: 'Coordinator added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                            showConfirmButton: true,
                        }).then(() => {
                            $('#addCoordinatorUserModal').modal('hide');
                            form.trigger("reset");
                            coordinatorUsersTable.ajax.reload();
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

    // Edit Coordinator User
    $(document).on('click', '.coordinator-view-btn', function () {
        const info = $(this).data('info');
        const coordinator_id = info.id;
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };
        setValue("first_name", info.first_name);
        setValue("middle_name", info.middle_name);
        setValue("last_name", info.last_name);
        setValue("position", info.position);
        setValue("email", info.user.email);
        $("#editCoordinatorUserForm").on("submit", function (e) {
            e.preventDefault();
            const form = $(this);
            let formData = form.serialize();
            formData += `&coordinator_id=${coordinator_id}`;
            let button = $("#editCoordinatorUserButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
            setTimeout(function () {
                $.ajax({
                    url: '/admin/edit_coordinator/',
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
                                title: 'Coordinator updated!',
                                text: response.message,
                                confirmButtonText: 'OK',
                                showConfirmButton: true,
                            }).then(() => {
                                $('#editCoordinatorUserModal').modal('hide');
                                coordinatorUsersTable.ajax.reload();
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

    // Add Administrator 
    $("#addAdminUserForm").on("submit", function (e) {
        e.preventDefault();
        const form = $(this);
        const formData = form.serialize();
        let button = $("#saveButton");
        button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');
        setTimeout(function () {
            $.ajax({
                url: '/admin/add_admin/',
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
                            title: 'Admin added!',
                            text: response.message,
                            confirmButtonText: 'OK',
                            showConfirmButton: true,
                        }).then(() => {
                            $('#addAdminUserModal').modal('hide');
                            form.trigger("reset");
                            adminUsersTable.ajax.reload();
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


function handleActionUser(userId, isActive) {
    const actionText = isActive ? 'activate' : 'deactivate';
    Swal.fire({
        title: `${isActive ? "Activate" : "Deactivate"} User`,
        text: `Are you sure you want to ${actionText} this user?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        preConfirm: () => {
            Swal.showLoading();
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    $.ajax({
                        url: `/admin/deactivate_user/${userId}/`,
                        type: 'POST',
                        data: { user_id: userId, is_active: isActive },
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken'),
                        }
                    })
                    .done(function(response) {
                        if (response.success) {
                            resolve(response);
                        } else {
                            Swal.hideLoading();
                            Swal.showValidationMessage(response.message || "Failed to change user status.");
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
                icon: "success",
                title: "Success!",
                text: `The user has been successfully ${actionText}.`,
                confirmButtonText: "OK",
            }).then(() => {
                allUsersTable.ajax.reload();
                studentUsersTable.ajax.reload();
                teacherUsersTable.ajax.reload();
                coordinatorUsersTable.ajax.reload();
                adminUsersTable.ajax.reload();
            });
        }
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

function enableEditForm() {
    $("#enrollmentForm input, #enrollmentForm select, #documentForm input, input[name='ip_community'], input[name='beneficiary_4ps'], input[name='learner_with_disability'], input[name='same_as_current'], #submissionRemarksForm input, #submissionRemarksForm textarea").prop("disabled", false);
    // If submission remarks checkbox is checked, enable textarea
    if ($("#submission_remarks_check").is(":checked")) {
        $("#submission_remarks_textarea").show();
        $("#submission_remarks").prop("disabled", false);
    }
    
    // Handle student_type change in edit mode to show/hide returning/transferee section
    $("#student_type").off("change").on("change", function() {
        const studentType = $(this).val();
        if (studentType === "returning" || studentType === "transferee") {
            $("#returning_transferee_section_view").slideDown();
        } else {
            $("#returning_transferee_section_view").slideUp();
            // Clear returning/transferee fields
            $("#last_grade_level_view").val("");
            $("#last_school_year_view").val("");
            $("#last_school_attended_view").val("");
            $("#school_id_view").val("");
        }
    });
    
    $("#editStudentUserButton").show();
    $("#editButton").hide();
}

function disableEditForm() {
    $("#enrollmentForm input, #enrollmentForm select, #documentForm input, input[name='ip_community'], input[name='beneficiary_4ps'], input[name='learner_with_disability'], input[name='same_as_current']").prop("disabled", true);
    $("#submissionRemarksForm input, #submissionRemarksForm textarea").prop("disabled", true);
    $("#editButton").show();
    $("#editStudentUserButton").hide();
}
