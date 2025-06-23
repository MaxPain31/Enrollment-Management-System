document.addEventListener('DOMContentLoaded', function() {
    const updateBtn = document.getElementById('updateAcademicYearBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            Swal.fire({
                title: 'Are you sure?',
                text: 'This will update the academic year for all sections in this grade.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes'
            }).then((result) => {
                if (result.isConfirmed) {
                    const grade = updateBtn.getAttribute('data-grade');
                    fetch(`/coordinator/update-academic-year/${grade}/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken'),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire({
                            title: data.success ? 'Success' : 'Info',
                            text: data.message,
                            icon: data.success ? 'success' : 'info',
                        }).then(() => {
                            if (data.success) {
                                window.location.reload();
                            }
                        });
                    })
                    .catch(() => {
                        Swal.fire('Error', 'Something went wrong.', 'error');
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
