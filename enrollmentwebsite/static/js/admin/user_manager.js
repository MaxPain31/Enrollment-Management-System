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
                render: function (data, type, row) {
                    let middle = row.middle_name ? ` ${row.middle_name}` : "";
                    return `${row.last_name}, ${row.first_name}${middle} `.trim();
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
    $('#filter-user-role, #filter-is-active,#filter-student-status, #filter-is-active')
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
        $('#filter-is-active').val('');
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


        const jhsHtml = `
            <div class="enrollment_information">
                <h5>Student Information (JHS)</h5>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled readonly>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled readonly>
                            <option value="7" ${app.grade_level=='7'?'selected':''}>GRADE 7</option>
                            <option value="8" ${app.grade_level=='8'?'selected':''}>GRADE 8</option>
                            <option value="9" ${app.grade_level=='9'?'selected':''}>GRADE 9</option>
                            <option value="10" ${app.grade_level=='10'?'selected':''}>GRADE 10</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="student_type" class="form-label">Student Type</label>
                        <select class="form-select form-control" id="student_type" name="student_type" disabled readonly>
                            <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                            <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                            <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="gen_avg" class="form-label">General Average</label>
                        <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        const shsHtml = `
            <div class="enrollment_information">
                <h5>Student Information (SHS)</h5>
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="school_year" class="form-label">School Year</label>
                        <select class="form-select" id="school_year" name="school_year" disabled>
                            <option value="${app.school_year}">${app.school_year}</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="student_type" class="form-label">Student Type</label>
                            <select class="form-select form-control" id="student_type" name="student_type" disabled>
                                <option value="new student" ${app.student_type=='NEW STUDENT'?'selected':''}>NEW STUDENT</option>
                                <option value="returning" ${app.student_type=='RETURNING'?'selected':''}>RETURNING (BALIK ARAL)</option>
                                <option value="transferee" ${app.student_type=='TRANSFEREE'?'selected':''}>TRANSFEREE</option>
                            </select>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="grade_level" class="form-label">Grade Level</label>
                        <select class="form-select" id="grade_level" name="grade_level" disabled>
                            <option value="11" ${app.grade_level=='11'?'selected':''}>GRADE 11</option>
                            <option value="12" ${app.grade_level=='12'?'selected':''}>GRADE 12</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="gen_avg" class="form-label">General Average</label>
                            <input type="number" class="form-control" id="gen_avg" name="gen_avg" value="${app.gen_avg}" disabled>
                            <div class="invalid-feedback"></div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="semester" class="form-label">Semester</label>
                        <select class="form-select" id="semester" name="semester" disabled>
                            <option value="">--</option>
                            <option value="1st" ${app.semester=='1st'?'selected':''}>1st</option>
                            <option value="2nd" ${app.semester=='2nd'?'selected':''}>2nd</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="strand" class="form-label">Strand</label>
                        <select class="form-select" id="strand" name="strand" disabled>
                            <option value="">--</option>
                            <option value="ABM" ${app.strand=='ABM'?'selected':''}>ABM</option>
                            <option value="STEM" ${app.strand=='STEM'?'selected':''}>STEM</option>
                        </select>
                        <div class="invalid-feedback"></div>
                    </div>
                </div>
            </div>
        `;

        if (app.enrollment_type === "JHS") {
            $("#enrollemnt_jhs").html(jhsHtml);
            $("#enrollemnt_shs").empty();
        }  
        if (app.enrollment_type === "SHS") {
            $("#enrollemnt_shs").html(shsHtml);
            $("#enrollemnt_jhs").empty();
        }
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


    // Add Student User Modal
    $("#addStudentUserModal").on("show.bs.modal", function () {
        const $enrollmentType = $("#enrollment_type");
        const $enrollmentFields = $("#enrollmentFields");
    
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
        $enrollmentType.off("change").on("change", updateEnrollmentFields);
        $("#addStudentUserForm").on("submit", function (e) {
            e.preventDefault();
            let form = $(this);
            let formData = form.serialize();
            let button = $("#saveButton");
            button.prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span>');

            setTimeout(function() {
                $.ajax({
                    url: '/admin/add_student/',
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
                        Swal.fire({
                            icon: 'error',
                            title: 'Server Error',
                            text: 'Something went wrong. Please try again later.'
                        });
                    }
                });
            },500);
            form.on("input change", ".form-control, .form-select, .form-check-input", function () {
                $(this).removeClass("is-invalid");
                $(this).closest(".mb-3").find(".invalid-feedback").text("");
            });
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