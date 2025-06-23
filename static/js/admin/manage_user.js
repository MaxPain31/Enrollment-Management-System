function confirmDelete(userId) {
    Swal.fire({
        text: "Are you sure you want to delete this user?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
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

function addAdmin() {
    const formData = new FormData(document.getElementById('addAdminUserForm'));
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    console.log('Data: ', data);
    const csrftoken = getCookie('csrftoken');
    fetch("/admin/add_admin/", {
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
                text: 'An error occurred while adding the admin user.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            console.error('Error:', error);
        });
}