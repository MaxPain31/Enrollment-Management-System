/**
 * Reports and Analytics JavaScript
 * Handles all chart rendering, data fetching, and interactive features
 */

class ReportsManager {
    constructor() {
        this.charts = {};
        this.data = null;
        this.isLoading = false;
        this.init();
    }

    /**
     * Initialize the reports manager
     */
    init() {
        this.showLoadingSpinner();
        this.setupEventListeners();
        this.fetchReportsData();
    }

    /**
     * Show loading spinner
     */
    showLoadingSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'block';
        }
    }

    /**
     * Hide loading spinner
     */
    hideLoadingSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    /**
     * Fetch reports data from the API
     */
    async fetchReportsData() {
        try {
            this.isLoading = true;
            const response = await fetch('/admin/reports-data/');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            this.hideLoadingSpinner();
            this.updateSummaryCards();
            this.initializeCharts();
            this.loadSchoolYears();
            
        } catch (error) {
            console.error('Error fetching reports data:', error);
            this.hideLoadingSpinner();
            this.showError('Error loading reports data. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Update summary cards with data
     */
    updateSummaryCards() {
        if (!this.data || !this.data.summary) return;

        const summary = this.data.summary;
        
        // Update total applications
        this.updateCardValue('total-applications', summary.total_applications);
        
        // Update approved applications
        this.updateCardValue('approved-applications', summary.approved_applications);
        
        // Update total students
        this.updateCardValue('total-students', summary.total_students);
        
        // Update pending applications
        this.updateCardValue('pending-applications', summary.pending_applications);
    }

    /**
     * Update a card value with animation
     */
    updateCardValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animate the number change
            this.animateNumber(element, 0, value, 1000);
        }
    }

    /**
     * Animate number change
     */
    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        const isPercentage = element.id === 'approval-rate';
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * progress;
            
            if (isPercentage) {
                element.textContent = Math.round(current) + '%';
            } else {
                element.textContent = Math.round(current).toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        if (!this.data) return;

        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        // Initialize each chart
        this.initApplicationStatusChart();
        this.initUserRoleChart();
        this.initMonthlyTrendsChart();
        this.initGenderChart();
        this.initEnrollmentTypeChart();
        this.initStudentTypeChart();
        this.initGradeLevelChart();
        this.initRegistrationTypeChart();
        this.initDocumentStatusChart();
        this.initStrandChart();
        this.initStudentStatusChart();
        this.initAgeGroupChart();
        this.initSemesterChart();
        this.initAssessmentChart();
        this.initContentChart();
        
        // Setup window resize handler
        this.setupResizeHandler();
        
        // Apply consistent styling to all charts
        setTimeout(() => {
            this.applyConsistentStyling();
        }, 100);
    }

    /**
     * Application Status Chart
     */
    initApplicationStatusChart() {
        const chartElement = document.getElementById('applicationStatusChart');
        if (!chartElement) return;

        this.charts.applicationStatus = echarts.init(chartElement);
        
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        // Ensure data exists and has values
        const chartData = this.data.application_status || [];

        
        const option = {
            backgroundColor: '#ffffff',
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    return `${params.seriesName}<br/>${params.name}: ${params.value} (${params.percent}%)`;
                },
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderColor: '#333',
                borderWidth: 1,
                textStyle: { 
                    color: '#fff',
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 'bold'
                },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-radius: 6px;'
            },
            legend: {
                orient: isMobile ? 'horizontal' : 'vertical',
                left: isMobile ? 'center' : 'left',
                top: isMobile ? 'bottom' : 'middle',
                textStyle: { 
                    fontSize: isMobile ? 10 : 12,
                    color: '#333',
                    fontWeight: 'normal'
                },
                itemGap: isMobile ? 5 : 10
            },
            series: [{
                name: 'Application Status',
                type: 'pie',
                radius: isMobile ? '50%' : '60%',
                center: isMobile ? ['50%', '45%'] : ['65%', '50%'],
                data: chartData,
                label: {
                    show: !isMobile,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: isMobile ? 9 : 12,
                    color: '#333',
                    fontWeight: 'bold',
                    position: 'outside'
                },
                labelLine: {
                    show: !isMobile,
                    length: 15,
                    length2: 10,
                    lineStyle: {
                        color: '#666',
                        width: 1
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    },
                    label: {
                        show: true,
                        fontSize: isMobile ? 10 : 14,
                        fontWeight: 'bold',
                        color: '#333'
                    },
                    labelLine: {
                        show: true,
                        lineStyle: {
                            color: '#333',
                            width: 2
                        }
                    }
                },
                avoidLabelOverlap: true,
                animationType: 'scale',
                animationEasing: 'elasticOut',
                animationDelay: function (idx) {
                    return Math.random() * 200;
                }
            }]
        };
        
        this.charts.applicationStatus.setOption(option);
        
        // Ensure no blank hover elements
        setTimeout(() => {
            this.charts.applicationStatus.dispatchAction({
                type: 'highlight',
                seriesIndex: 0
            });
            this.charts.applicationStatus.dispatchAction({
                type: 'downplay',
                seriesIndex: 0
            });
        }, 100);
    }

    /**
     * User Role Chart
     */
    initUserRoleChart() {
        const chartElement = document.getElementById('userRoleChart');
        if (!chartElement) return;

        this.charts.userRole = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'User Roles',
                type: 'pie',
                radius: '50%',
                data: this.data.user_roles,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.userRole.setOption(option);
    }

    /**
     * Monthly Trends Chart
     */
    initMonthlyTrendsChart() {
        const chartElement = document.getElementById('monthlyTrendsChart');
        if (!chartElement) return;

        this.charts.monthlyTrends = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['Applications']
            },
            xAxis: {
                type: 'category',
                data: this.data.monthly_trends.map(item => item.month),
                axisLabel: {
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Number of Applications'
            },
            series: [{
                name: 'Applications',
                type: 'line',
                data: this.data.monthly_trends.map(item => item.applications),
                smooth: true,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(65, 84, 241, 0.3)' },
                            { offset: 1, color: 'rgba(65, 84, 241, 0.05)' }
                        ]
                    }
                },
                lineStyle: {
                    color: '#4154f1',
                    width: 3
                },
                symbol: 'circle',
                symbolSize: 6
            }]
        };
        
        this.charts.monthlyTrends.setOption(option);
    }

    /**
     * Gender Chart
     */
    initGenderChart() {
        const chartElement = document.getElementById('genderChart');
        if (!chartElement) return;

        this.charts.gender = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Gender',
                type: 'pie',
                radius: '50%',
                data: this.data.gender_distribution,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.gender.setOption(option);
    }

    /**
     * Enrollment Type Chart
     */
    initEnrollmentTypeChart() {
        const chartElement = document.getElementById('enrollmentTypeChart');
        if (!chartElement) return;

        this.charts.enrollmentType = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Enrollment Type',
                type: 'pie',
                radius: '50%',
                data: this.data.enrollment_types,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.enrollmentType.setOption(option);
    }

    /**
     * Student Type Chart
     */
    initStudentTypeChart() {
        const chartElement = document.getElementById('studentTypeChart');
        if (!chartElement) return;

        this.charts.studentType = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Student Type',
                type: 'pie',
                radius: '50%',
                data: this.data.student_types,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.studentType.setOption(option);
    }

    /**
     * Grade Level Chart
     */
    initGradeLevelChart() {
        const chartElement = document.getElementById('gradeLevelChart');
        if (!chartElement) return;

        this.charts.gradeLevel = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            xAxis: {
                type: 'category',
                data: this.data.grade_levels.map(item => item.grade),
                axisLabel: {
                    interval: 0
                }
            },
            yAxis: {
                type: 'value',
                name: 'Number of Students'
            },
            series: [{
                name: 'Students',
                type: 'bar',
                data: this.data.grade_levels.map(item => item.count),
                itemStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: '#4154f1' },
                            { offset: 1, color: '#2c3e50' }
                        ]
                    }
                },
                barWidth: '60%'
            }]
        };
        
        this.charts.gradeLevel.setOption(option);
    }

    /**
     * Registration Type Chart
     */
    initRegistrationTypeChart() {
        const chartElement = document.getElementById('registrationTypeChart');
        if (!chartElement) return;

        this.charts.registrationType = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Registration Type',
                type: 'pie',
                radius: '50%',
                data: this.data.registration_types,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.registrationType.setOption(option);
    }

    /**
     * Document Status Chart
     */
    initDocumentStatusChart() {
        const chartElement = document.getElementById('documentStatusChart');
        if (!chartElement) return;

        this.charts.documentStatus = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Document Status',
                type: 'pie',
                radius: '50%',
                data: this.data.document_status,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        this.charts.documentStatus.setOption(option);
    }

    /**
     * Strand Chart (SHS only)
     */
    initStrandChart() {
        // Use shs_strand_distribution data from backend
        const strandData = this.data.shs_strand_distribution || [];
        
        if (!strandData || strandData.length === 0) {
            return;
        }

        const strandSection = document.getElementById('strandSection');
        if (strandSection) {
            strandSection.style.display = 'block';
        }

        const chartElement = document.getElementById('strandChart');
        if (!chartElement) return;

        this.charts.strand = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            xAxis: {
                type: 'category',
                data: strandData.map(item => item.name),
                axisLabel: {
                    interval: 0,
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Number of Students'
            },
            series: [{
                name: 'Students',
                type: 'bar',
                data: strandData.map(item => item.value),
                itemStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: '#2eca6a' },
                            { offset: 1, color: '#1e7e34' }
                        ]
                    }
                },
                barWidth: '60%'
            }]
        };
        
        this.charts.strand.setOption(option);
    }

    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.resizeCharts();
            }, 100);
        });
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add any additional event listeners here
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.charts) {
                this.resizeCharts();
            }
        });
        
        // School year filter
        const schoolYearFilter = document.getElementById('schoolYearFilter');
        if (schoolYearFilter) {
            schoolYearFilter.addEventListener('change', (e) => {
                this.filterBySchoolYear(e.target.value);
            });
        }
    }
    
    /**
     * Filter data by school year
     */
    async filterBySchoolYear(schoolYear) {
        try {
            this.showLoadingSpinner();
            
            const url = schoolYear === 'all' 
                ? '/admin/reports-data/' 
                : `/admin/reports-data/?school_year=${encodeURIComponent(schoolYear)}`;
                
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            this.hideLoadingSpinner();
            
            // Debug: Log the data to console
            console.log('Reports data received:', this.data);
            console.log('Application status data:', this.data.application_status);
            console.log('SHS strand data:', this.data.shs_strand_distribution);
            
            // Check if there's data for the selected school year
            if (this.hasDataForSchoolYear()) {
                this.updateSummaryCards();
                this.initializeCharts();
                this.loadSchoolYears();
            } else {
                this.showNoDataMessage(schoolYear);
            }
            
        } catch (error) {
            console.error('Error filtering reports data:', error);
            this.hideLoadingSpinner();
            this.showError('Error filtering reports data. Please try again.');
        }
    }
    
    /**
     * Check if there's data available for the selected school year
     */
    hasDataForSchoolYear() {
        if (!this.data) return false;
        
        // Check application status data
        const applicationStatusData = this.data.application_status || [];
        const hasApplicationData = applicationStatusData.some(item => item.value > 0);
        
        // Check SHS strand data
        const shsStrandData = this.data.shs_strand_distribution || [];
        const hasSHSData = shsStrandData.some(item => item.value > 0);
        
        // Check summary data
        const totalApplications = this.data.summary?.total_applications || 0;
        const totalStudents = this.data.summary?.total_students || 0;
        const approvedApplications = this.data.summary?.approved_applications || 0;
        
        return hasApplicationData || hasSHSData || totalApplications > 0 || totalStudents > 0 || approvedApplications > 0;
    }
    
    /**
     * Show no data message for selected school year
     */
    showNoDataMessage(schoolYear) {
        // Clear all charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose();
            }
        });
        this.charts = {};
        
        // Update summary cards to show 0
        this.updateSummaryCards();
        
        // Show no data message in charts
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            container.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <i class="bi bi-inbox display-1 mb-3"></i>
                    <h5>No Data Available</h5>
                    <p class="text-center">No data found for school year <strong>${schoolYear}</strong></p>
                    <small>Try selecting a different school year or check back later.</small>
                </div>
            `;
        });
        
        // Still load school years dropdown
        this.loadSchoolYears();
    }
    
    /**
     * Load school years for filter
     */
    loadSchoolYears() {
        const schoolYearFilter = document.getElementById('schoolYearFilter');
        if (schoolYearFilter && this.data) {
            console.log('Loading school years:', this.data.available_school_years);
            
            // Store current selection before clearing
            const currentSelection = schoolYearFilter.value;
            
            // Clear existing options
            schoolYearFilter.innerHTML = '<option value="all">All School Years</option>';
            
            // Add school years from backend data
            if (this.data.available_school_years && Array.isArray(this.data.available_school_years)) {
                this.data.available_school_years.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    schoolYearFilter.appendChild(option);
                });
            }
            
            // Restore selection or set default
            if (currentSelection && currentSelection !== 'all') {
                // Keep the user's selection if it exists
                schoolYearFilter.value = currentSelection;
            } else if (this.data.selected_school_year && this.data.selected_school_year !== 'all') {
                // Use the selected school year from API
                schoolYearFilter.value = this.data.selected_school_year;
            } else if (this.data.current_school_year && this.data.current_school_year !== 'all') {
                // Fall back to current school year
                schoolYearFilter.value = this.data.current_school_year;
            } else {
                // Default to "All School Years"
                schoolYearFilter.value = 'all';
            }
            
            console.log('School year filter value set to:', schoolYearFilter.value);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>Error!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at the top of the page
        const container = document.querySelector('.section');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
        }
    }

    /**
     * Refresh data
     */
    async refreshData() {
        this.showLoadingSpinner();
        await this.fetchReportsData();
    }

    /**
     * Export chart as image
     */
    exportChart(chartName, filename) {
        if (this.charts[chartName]) {
            const url = this.charts[chartName].getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: '#fff'
            });
            
            const link = document.createElement('a');
            link.download = filename || `${chartName}.png`;
            link.href = url;
            link.click();
        }
    }

    /**
     * Get chart data
     */
    getChartData(chartName) {
        return this.charts[chartName] ? this.charts[chartName].getOption() : null;
    }

    /**
     * Student Status Chart
     */
    initStudentStatusChart() {
        const chartElement = document.getElementById('studentStatusChart');
        if (!chartElement) return;

        this.charts.studentStatus = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Student Status',
                type: 'pie',
                radius: '50%',
                data: this.data.student_status,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.studentStatus.setOption(option);
    }

    /**
     * Age Group Chart
     */
    initAgeGroupChart() {
        const chartElement = document.getElementById('ageGroupChart');
        if (!chartElement) return;

        this.charts.ageGroup = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Age Groups',
                type: 'pie',
                radius: '50%',
                data: this.data.age_groups,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.ageGroup.setOption(option);
    }

    /**
     * Semester Chart
     */
    initSemesterChart() {
        const chartElement = document.getElementById('semesterChart');
        if (!chartElement) return;

        this.charts.semester = echarts.init(chartElement);
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Semester Distribution',
                type: 'pie',
                radius: '50%',
                data: this.data.semester_distribution,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.semester.setOption(option);
    }

    /**
     * Assessment Status Chart
     */
    initAssessmentChart() {
        const chartElement = document.getElementById('assessmentChart');
        if (!chartElement) return;

        this.charts.assessment = echarts.init(chartElement);
        
        const assessmentData = [
            {"value": this.data.assessment_stats.assessed_count, "name": "Assessed"},
            {"value": this.data.assessment_stats.not_assessed_count, "name": "Not Assessed"}
        ];
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Assessment Status',
                type: 'pie',
                radius: '50%',
                data: assessmentData,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.assessment.setOption(option);
    }

    /**
     * Content Management Chart
     */
    initContentChart() {
        const chartElement = document.getElementById('contentChart');
        if (!chartElement) return;

        this.charts.content = echarts.init(chartElement);
        
        const contentData = [
            {"value": this.data.content_stats.total_faqs, "name": "FAQs"},
            {"value": this.data.content_stats.total_announcements, "name": "Announcements"},
            {"value": this.data.content_stats.active_announcements, "name": "Active Announcements"}
        ];
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: 'Content Management',
                type: 'pie',
                radius: '50%',
                data: contentData,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        this.charts.content.setOption(option);
    }

    /**
     * Apply consistent styling to all charts
     */
    applyConsistentStyling() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.setOption === 'function') {
                const currentOption = chart.getOption();
                if (currentOption) {
                    // Set white background
                    currentOption.backgroundColor = '#ffffff';
                    
                    // Update tooltip styling
                    if (currentOption.tooltip) {
                        currentOption.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        currentOption.tooltip.textStyle = { color: '#fff' };
                    }
                    
                    // Update legend styling
                    if (currentOption.legend) {
                        currentOption.legend.textStyle = { 
                            color: '#333',
                            fontSize: 12
                        };
                    }
                    
                    // Update series label styling
                    if (currentOption.series) {
                        currentOption.series.forEach(series => {
                            if (series.label) {
                                series.label.color = '#333';
                                series.label.fontSize = 12;
                            }
                        });
                    }
                    
                    // Update axis styling for line/bar charts
                    if (currentOption.xAxis) {
                        if (Array.isArray(currentOption.xAxis)) {
                            currentOption.xAxis.forEach(axis => {
                                if (axis.axisLabel) {
                                    axis.axisLabel.color = '#333';
                                    axis.axisLabel.fontSize = 12;
                                }
                            });
                        } else if (currentOption.xAxis.axisLabel) {
                            currentOption.xAxis.axisLabel.color = '#333';
                            currentOption.xAxis.axisLabel.fontSize = 12;
                        }
                    }
                    
                    if (currentOption.yAxis) {
                        if (Array.isArray(currentOption.yAxis)) {
                            currentOption.yAxis.forEach(axis => {
                                if (axis.axisLabel) {
                                    axis.axisLabel.color = '#333';
                                    axis.axisLabel.fontSize = 12;
                                }
                            });
                        } else if (currentOption.yAxis.axisLabel) {
                            currentOption.yAxis.axisLabel.color = '#333';
                            currentOption.yAxis.axisLabel.fontSize = 12;
                        }
                    }
                    
                    chart.setOption(currentOption, true);
                }
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize reports manager
    window.reportsManager = new ReportsManager();
    
    // Add refresh button functionality if it exists
    const refreshBtn = document.getElementById('refreshReports');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.reportsManager.refreshData();
        });
    }
    
    // Add export functionality if buttons exist
    document.querySelectorAll('[data-export-chart]').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartName = e.target.dataset.exportChart;
            const filename = e.target.dataset.filename || `${chartName}.png`;
            window.reportsManager.exportChart(chartName, filename);
        });
    });
});

// Utility functions
const ReportsUtils = {
    /**
     * Format number with commas
     */
    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * Format percentage
     */
    formatPercentage: (num) => {
        return `${num.toFixed(1)}%`;
    },
    
    /**
     * Get color by index
     */
    getColorByIndex: (index) => {
        const colors = [
            '#4154f1', '#2eca6a', '#ff771d', '#e74c3c', '#9b59b6',
            '#f39c12', '#1abc9c', '#34495e', '#e67e22', '#3498db'
        ];
        return colors[index % colors.length];
    }
};
