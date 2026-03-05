// 数据管理页面专用精简版脚本 - 版本 1.0

// 数据管理页面专用功能
const DataManagementUtils = {
    // 初始化数据管理页面
    init: async function() {
        console.log('Data management utils initialized');
    },
    
    // 导出数据为CSV格式
    exportToCSV: function(data, filename) {
        if (!data || data.length === 0) {
            console.error('No data to export');
            return false;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    },
    
    // 导入数据
    importFromCSV: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const lines = content.split('\n');
                    const headers = lines[0].split(',');
                    const data = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) {
                            const values = lines[i].split(',');
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = values[index] ? values[index].replace(/"/g, '') : '';
                            });
                            data.push(row);
                        }
                    }
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            reader.readAsText(file);
        });
    }
};

// 导出全局对象
window.DataManagementUtils = DataManagementUtils;