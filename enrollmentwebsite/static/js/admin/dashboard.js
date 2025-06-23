document.addEventListener("DOMContentLoaded", function () {
    const approvedCountElem = document.getElementById("approvedCount");
    const rejectedCountElem = document.getElementById("rejectedCount");
    const juniorCountElem = document.getElementById("juniorCount");
    const seniorCountElem = document.getElementById("seniorCount");
    const usersCountElem = document.getElementById("usersCount");
    const allApplicantCountElem = document.getElementById("allApplicantCount");
    const allStudentCountElem = document.getElementById("allStudent");
    const studentJuniorCountElem = document.getElementById("juniorStudent");
    const studentSeniorCountElem = document.getElementById("seniorStudent");
    const femaleCountElem = document.getElementById("femaleCount");
    const maleCountElem = document.getElementById("maleCount");

    const fetchData = async () => {
        try {
            const response = await fetch("/admin/dashboard-data/");
            const data = await response.json();
            console.log(data);

            if (approvedCountElem) approvedCountElem.textContent = data.approved;
            if (rejectedCountElem) rejectedCountElem.textContent = data.rejected;
            if (juniorCountElem) juniorCountElem.textContent = data.junior;
            if (seniorCountElem) seniorCountElem.textContent = data.senior;
            if (usersCountElem) usersCountElem.textContent = data.users;
            if (allApplicantCountElem) allApplicantCountElem.textContent = data.total_applicant;
            if (allStudentCountElem) allStudentCountElem.textContent = data.all_student_count;
            if (studentJuniorCountElem) studentJuniorCountElem.textContent = data.student_junior;
            if (studentSeniorCountElem) studentSeniorCountElem.textContent = data.student_senior;
            if (femaleCountElem) femaleCountElem.textContent = data.female;
            if (maleCountElem) maleCountElem.textContent = data.male;

            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const fetchApplicationReportData = (data) => {
        try {
            const applicationReportData = data.application_report;

            echarts.init(document.querySelector("#trafficChart")).setOption({
                color: ['rgb(0, 227, 150)', 'rgb(255, 69, 96)'],
                tooltip: {
                    trigger: 'item'
                },
                legend: {
                    top: '5%',
                    left: 'center'
                },
                series: [{
                    name: 'Access From',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: applicationReportData
                }]
            });
        } catch (error) {
            console.error("Error rendering application report chart:", error);
        }
    };

    const fetchUserReportData = (data) => {
        try {
            const userReportData = data.user_report;
            const labels = userReportData.map(item => item.name);
            const values = userReportData.map(item => item.value);

            if (window.barChartInstance) {
                window.barChartInstance.destroy();
            }

            window.barChartInstance = new Chart(document.querySelector('#barChart'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: "User Roles",
                        data: values,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(255, 159, 64, 0.2)',
                            'rgba(255, 205, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(54, 162, 235, 0.2)'
                        ],
                        borderColor: [
                            'rgb(255, 99, 132)',
                            'rgb(255, 159, 64)',
                            'rgb(255, 205, 86)',
                            'rgb(75, 192, 192)',
                            'rgb(54, 162, 235)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                },
            });
        } catch (error) {
            console.error("Error rendering user report chart:", error);
        }
    };

    const renderGenderChart = (data) => {
        const ctx = document.getElementById('genderChart');
        if (!ctx) return;
        if (window.genderChartInstance) window.genderChartInstance.destroy();
        window.genderChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{
                    data: [data.male || 0, data.female || 0],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgb(54, 162, 235)',
                        'rgb(255, 99, 132)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    };

    const renderStudentTypeChart = (data) => {
        const ctx = document.getElementById('studentTypeChart');
        if (!ctx) return;
        if (window.studentTypeChartInstance) window.studentTypeChartInstance.destroy();
        // Try to use student_junior and student_senior if available, else fallback
        const labels = ['Junior', 'Senior'];
        const values = [data.student_junior || data.junior || 0, data.student_senior || data.senior || 0];
        window.studentTypeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(255, 205, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    };

    // Export as Excel (XLSX) using SheetJS (if available)
    const exportAsExcel = (data) => {
        if (typeof XLSX === 'undefined') {
            alert('Excel export requires SheetJS (XLSX) library.');
            return;
        }
        const wsData = [
            ['Metric', 'Value'],
            ['Approved', data.approved],
            ['Rejected', data.rejected],
            ['Junior', data.junior],
            ['Senior', data.senior],
            ['Users', data.users],
            ['Total Applicants', data.total_applicant],
            ['All Students', data.all_student_count],
            ['Junior Students', data.student_junior],
            ['Senior Students', data.student_senior],
            ['Male', data.male],
            ['Female', data.female],
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Report');

        // Add chart image as a new worksheet (as a clickable link to the base64 image)
        let chartImgSheet = null;
        let chartImgDataUrl = null;
        if (window.genderChartInstance) {
            chartImgDataUrl = window.genderChartInstance.toBase64Image();
        } else if (window.studentTypeChartInstance) {
            chartImgDataUrl = window.studentTypeChartInstance.toBase64Image();
        }
        if (chartImgDataUrl) {
            chartImgSheet = XLSX.utils.aoa_to_sheet([
                ['Gender Chart (click link to view):'],
                [ { l: { Target: chartImgDataUrl, Tooltip: 'Click to view chart image' }, t: 'Chart Image' } ]
            ]);
            XLSX.utils.book_append_sheet(wb, chartImgSheet, 'Chart Image');
        }

        XLSX.writeFile(wb, 'dashboard_report.xlsx');
    };

    // Export as CSV
    const exportAsCSV = (data) => {
        const rows = [
            ['Metric', 'Value'],
            ['Approved', data.approved],
            ['Rejected', data.rejected],
            ['Junior', data.junior],
            ['Senior', data.senior],
            ['Users', data.users],
            ['Total Applicants', data.total_applicant],
            ['All Students', data.all_student_count],
            ['Junior Students', data.student_junior],
            ['Senior Students', data.student_senior],
            ['Male', data.male],
            ['Female', data.female],
        ];
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'dashboard_report.csv';
        link.click();
    };

    // Attach export button listeners
    let lastDashboardData = null;
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        if (lastDashboardData) exportAsExcel(lastDashboardData);
    });
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        if (lastDashboardData) exportAsCSV(lastDashboardData);
    });

    const initDashboard = async () => {
        const data = await fetchData();
        if (data) {
            lastDashboardData = data;
            fetchUserReportData(data);
            fetchApplicationReportData(data);
            renderGenderChart(data);
            renderStudentTypeChart(data);
        }
    };

    initDashboard();
    setInterval(initDashboard, 60000); // Refresh every 60 seconds
});
