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
        this.loadSchoolYears();
        this.fetchReportsData();
        this.setupEventListeners();
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
            this.loadSchoolYears();
            this.initializeCharts();
            
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
        
        // Ensure data exists and has values
        const chartData = this.data.application_status || [];
        const hasData = chartData.some(item => item.value > 0);
        
        if (!hasData) {
            // Show message when no data
            const option = {
                backgroundColor: '#ffffff',
                title: {
                    text: 'No Application Data Available',
                    left: 'center',
                    top: 'center',
                    textStyle: {
                        color: '#999',
                        fontSize: 16
                    }
                }
            };
            this.charts.applicationStatus.setOption(option);
            return;
        }
        
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
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-radius: 6px;'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                textStyle: { 
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'normal'
                },
                itemGap: 10
            },
            series: [{
                name: 'Application Status',
                type: 'pie',
                radius: '60%',
                center: ['65%', '50%'],
                data: chartData,
                label: {
                    show: true,
                    formatter: function(params) {
                        return `${params.name}: ${params.value}`;
                    },
                    fontSize: 12,
                    color: '#333',
                    fontWeight: 'bold',
                    position: 'outside'
                },
                labelLine: {
                    show: true,
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
                        fontSize: 14,
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
        if (!this.data.strands || this.data.strands.length === 0) {
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
                data: this.data.strands.map(item => item.strand),
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
                data: this.data.strands.map(item => item.count),
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
                : `/admin/reports-data/?school_year=${schoolYear}`;
                
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            this.hideLoadingSpinner();
            this.updateSummaryCards();
            this.loadSchoolYears();
            this.initializeCharts();
            
        } catch (error) {
            console.error('Error filtering reports data:', error);
            this.hideLoadingSpinner();
            this.showError('Error filtering reports data. Please try again.');
        }
    }
    
    /**
     * Load school years for filter
     */
    loadSchoolYears() {
        const schoolYearFilter = document.getElementById('schoolYearFilter');
        if (schoolYearFilter && this.data && this.data.available_school_years) {
            // Clear existing options except "All School Years"
            schoolYearFilter.innerHTML = '<option value="all">All School Years</option>';
            
            // Add school years from backend data
            this.data.available_school_years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                schoolYearFilter.appendChild(option);
            });
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
