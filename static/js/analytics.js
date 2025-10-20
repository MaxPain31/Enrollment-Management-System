// Analytics JavaScript for Homepage Charts using ECharts
document.addEventListener('DOMContentLoaded', function() {
    // Check if analytics data is available
    if (typeof analyticsData === 'undefined') {
        console.warn('Analytics data not available');
        return;
    }

    // Initialize JHS Chart
    initializeJHSChart();
    
    // Initialize SHS Chart
    initializeSHSChart();
});

function initializeJHSChart() {
    const jhsChartDom = document.getElementById('jhsChart');
    if (!jhsChartDom) return;

    const jhsChart = echarts.init(jhsChartDom);
    
    const option = {
        title: {
            text: 'JHS Enrollment by Grade Level',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#2d3748'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            textStyle: {
                color: 'white'
            }
        },
        legend: {
            data: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
            top: 40,
            textStyle: {
                fontSize: 12
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: analyticsData.years || [],
            axisLabel: {
                color: '#718096',
                fontSize: 11
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        yAxis: {
            type: 'value',
            name: 'Number of Enrollees',
            nameTextStyle: {
                color: '#4a5568',
                fontSize: 12,
                fontWeight: 'bold'
            },
            axisLabel: {
                color: '#718096',
                fontSize: 11
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        },
        series: [
            {
                name: 'Grade 7',
                type: 'bar',
                data: analyticsData.jhs_data['Grade 7'] || [],
                itemStyle: {
                    color: '#36a2eb',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#2d8ceb'
                    }
                }
            },
            {
                name: 'Grade 8',
                type: 'bar',
                data: analyticsData.jhs_data['Grade 8'] || [],
                itemStyle: {
                    color: '#ff6384',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#ff4d6d'
                    }
                }
            },
            {
                name: 'Grade 9',
                type: 'bar',
                data: analyticsData.jhs_data['Grade 9'] || [],
                itemStyle: {
                    color: '#ffcd56',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#ffc107'
                    }
                }
            },
            {
                name: 'Grade 10',
                type: 'bar',
                data: analyticsData.jhs_data['Grade 10'] || [],
                itemStyle: {
                    color: '#4bc0c0',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#17a2b8'
                    }
                }
            }
        ],
        animation: true,
        animationDuration: 2000,
        animationEasing: 'cubicOut'
    };

    jhsChart.setOption(option);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        jhsChart.resize();
    });
}

function initializeSHSChart() {
    const shsChartDom = document.getElementById('shsChart');
    if (!shsChartDom) return;

    const shsChart = echarts.init(shsChartDom);
    
    const option = {
        title: {
            text: 'SHS Enrollment by Strand',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#2d3748'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            textStyle: {
                color: 'white'
            }
        },
        legend: {
            data: ['Grade 11 ABM', 'Grade 11 STEM', 'Grade 12 ABM', 'Grade 12 STEM'],
            top: 40,
            textStyle: {
                fontSize: 12
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: analyticsData.years || [],
            axisLabel: {
                color: '#718096',
                fontSize: 11
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        yAxis: {
            type: 'value',
            name: 'Number of Enrollees',
            nameTextStyle: {
                color: '#4a5568',
                fontSize: 12,
                fontWeight: 'bold'
            },
            axisLabel: {
                color: '#718096',
                fontSize: 11
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        },
        series: [
            {
                name: 'Grade 11 ABM',
                type: 'bar',
                data: analyticsData.shs_data['Grade 11 ABM'] || [],
                itemStyle: {
                    color: '#9966ff',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#8a4fff'
                    }
                }
            },
            {
                name: 'Grade 11 STEM',
                type: 'bar',
                data: analyticsData.shs_data['Grade 11 STEM'] || [],
                itemStyle: {
                    color: '#ff9f40',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#ff8c1a'
                    }
                }
            },
            {
                name: 'Grade 12 ABM',
                type: 'bar',
                data: analyticsData.shs_data['Grade 12 ABM'] || [],
                itemStyle: {
                    color: '#c9cbcf',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#b8bcc0'
                    }
                }
            },
            {
                name: 'Grade 12 STEM',
                type: 'bar',
                data: analyticsData.shs_data['Grade 12 STEM'] || [],
                itemStyle: {
                    color: '#ff6384',
                    borderRadius: [4, 4, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: '#ff4d6d'
                    }
                }
            }
        ],
        animation: true,
        animationDuration: 2000,
        animationEasing: 'cubicOut'
    };

    shsChart.setOption(option);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        shsChart.resize();
    });
}

// Add scroll reveal animation for analytics section
if (typeof ScrollReveal !== 'undefined') {
    ScrollReveal().reveal('.analytics-card', {
        distance: '50px',
        duration: 1000,
        easing: 'ease-in-out',
        origin: 'bottom',
        interval: 200
    });
}
