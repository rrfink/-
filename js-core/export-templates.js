/* ==================== 导出模板 ==================== */

class ExportTemplates {
    /**
     * 生成Excel格式的工资单
     * @param {Object} personalInfo 个人信息
     * @param {Object} project 项目信息
     * @param {string} currentMonth 当前月份
     * @param {Object} projectData 项目数据
     * @returns {string} Excel格式的HTML内容
     */
    static generateExcel(personalInfo, project, currentMonth, projectData) {
        const parts = currentMonth.split('-');
        const year = parts[0];
        const month = parts[1];
        const monthText = year + '年' + month + '月';
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 处理空个人信息
        const name = personalInfo?.name || '未设置';
        const job = personalInfo?.job || personalInfo?.type || '-';
        const wage = Number(personalInfo?.wage || 0);
        const monthlyWage = Number(personalInfo?.monthlyWage || 0);
        const overtimeRate = Number(personalInfo?.overtimeRate || 0);
        const wageCalculationMethod = personalInfo?.wageCalculationMethod || 'natural';
        const restSystem = personalInfo?.restSystem || 'doubleRest';
        const subsidyType = personalInfo?.subsidyType || 'none';
        const monthlySubsidy = Number(personalInfo?.monthlySubsidy || 0);
        const dailySubsidy = Number(personalInfo?.dailySubsidy || 0);
        const perMealSubsidy = Number(personalInfo?.perMealSubsidy || 0);
        const mealsPerDay = Number(personalInfo?.mealsPerDay || 2);
        const subsidyStatuses = personalInfo?.subsidyStatuses || ['present', 'half', 'holiday', 'rest'];
        
        // 根据休息制度计算应工作天数
        // 主页逻辑：不管单休、双休还是自由休，expectedWorkDays 都固定为26天
        // 单休：每月休息4天，工作26天
        // 双休：每月休息8天，但工资计算仍按26天
        // 自由休：灵活安排，工资计算按26天
        const expectedWorkDays = 26;
        
        // 调试日志
        console.log('ExportTemplates - personalInfo:', {
            name,
            wage,
            monthlyWage,
            wageCalculationMethod,
            restSystem,
            expectedWorkDays,
            overtimeRate
        });
        
        let totalWorkDays = 0;
        let basicSalary = 0;
        let overtimeHours = 0;
        let overtimeSalary = 0;
        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let restDays = 0;
        let holidayDays = 0;
        
        const workDetails = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const status = projectData?.attendance?.[dateStr];
            const noteData = projectData?.notes?.[dateStr];
            const note = noteData && noteData.note ? noteData.note : '';
            const overtime = Number(noteData && noteData.overtime ? noteData.overtime : 0);
            const overtimeType = noteData && noteData.overtimeType ? noteData.overtimeType : 'weekday';
            
            let statusText = '未记录';
            let workDay = 0;
            let dayBasicSalary = 0;
            let dayOvertimeSalary = 0;
            let isRecorded = false;
            
            if (status === 'present') {
                statusText = '满勤';
                workDay = 1;
                presentDays++;
                isRecorded = true;
            } else if (status === 'half') {
                statusText = '半天';
                workDay = 0.5;
                halfDays++;
                isRecorded = true;
            } else if (status === 'absent') {
                // 与主页逻辑一致：只有请假才扣工资
                if (note === '请假') {
                    statusText = '请假';
                    workDay = 0;
                    absentDays++;
                } else if (note === '休息') {
                    statusText = '休息';
                    workDay = 0;
                    restDays++;
                } else if (note === '放假') {
                    statusText = '放假';
                    workDay = 0;
                    holidayDays++;
                } else {
                    // 缺勤但没有备注，不计入 absentDays（与主页逻辑一致）
                    statusText = '缺勤';
                    workDay = 0;
                    // 注意：这里不加到 absentDays，因为主页只统计 remark === '请假' 的情况
                }
                isRecorded = true;
            } else if (note === '休息') {
                statusText = '休息';
                workDay = 0;
                restDays++;
                isRecorded = true;
            } else if (note === '放假') {
                statusText = '放假';
                workDay = 0;
                holidayDays++;
                isRecorded = true;
            }
            
            // 计算当日工资
            // 对于全职员工，根据 monthlyWage 和 wageCalculationMethod 计算日工资
            let dailyWage;
            if (monthlyWage && monthlyWage > 0) {
                if (wageCalculationMethod === 'natural') {
                    dailyWage = monthlyWage / 30; // 按自然日30天计算
                } else if (wageCalculationMethod === 'currentMonth') {
                    dailyWage = monthlyWage / daysInMonth; // 按自然日当月天数计算
                } else if (wageCalculationMethod === 'legal') {
                    dailyWage = monthlyWage / 21.75; // 按法定工作日计算
                } else if (wageCalculationMethod === 'attendance') {
                    dailyWage = monthlyWage / 26; // 按标准工作日计算（26天）
                } else {
                    dailyWage = wage; // 默认使用保存的 wage
                }
            } else {
                dailyWage = wage; // 点工使用保存的 wage
            }
            
            if (status === 'present') {
                dayBasicSalary = Number(dailyWage);
            } else if (status === 'half') {
                dayBasicSalary = Number(dailyWage * 0.5);
            }
            
            // 计算加班费
            // 只有当有加班且加班倍率大于0时才计算（与主页逻辑一致）
            if (overtime > 0 && status !== 'absent' && overtimeRate > 0) {
                const hourlyWage = dailyWage / 8;
                
                // 使用与主页一致的加班倍率
                const rate = overtimeRate;
                
                dayOvertimeSalary = Number(hourlyWage * overtime * rate);
                overtimeHours = Number(overtimeHours + overtime);
                overtimeSalary = Number(overtimeSalary + dayOvertimeSalary);
            }
            
            totalWorkDays = Number(totalWorkDays + workDay);
            basicSalary = Number(basicSalary + dayBasicSalary);
            
            // 确保所有数值都是数字类型
            const dayTotalSalary = Number(dayBasicSalary || 0) + Number(dayOvertimeSalary || 0);
            
            // 始终添加记录，即使没有状态、备注或加班
            workDetails.push({
                day: day,
                week: ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek],
                status: statusText,
                workDay: workDay,
                basicSalary: Number(dayBasicSalary || 0),
                overtime: Number(overtime || 0),
                overtimeSalary: Number(dayOvertimeSalary || 0),
                totalSalary: dayTotalSalary,
                note: note
            });
        }
        
        // 计算未考勤的天数（需要扣工资）
        // 未考勤天数 = 总天数 - 已记录天数（出勤+半天+请假+休息+放假）
        const recordedDays = presentDays + halfDays + absentDays + restDays + holidayDays;
        const unrecordedDays = Math.max(0, daysInMonth - recordedDays);
        // 未考勤天数加到 absentDays 中（需要扣工资）
        absentDays = absentDays + unrecordedDays;
        
        let totalSalary = 0;
        let subsidyTotal = 0;
        
        if (monthlyWage && monthlyWage > 0) {
            // 全职：根据用户需求计算工资
            // 计算有工资的天数（考勤 + 半天×0.5 + 放假 + 休息）
            const paidDays = presentDays + (halfDays * 0.5) + restDays + holidayDays;
            
            // 计算应工作天数（单休每月4天休息）
            const expectedWorkDays = daysInMonth - 4;
            
            // 计算日工资
            let dailyWage;
            if (wageCalculationMethod === 'natural') {
                dailyWage = monthlyWage / 30;
            } else if (wageCalculationMethod === 'currentMonth') {
                dailyWage = monthlyWage / daysInMonth;
            } else if (wageCalculationMethod === 'legal') {
                dailyWage = monthlyWage / 21.75;
            } else if (wageCalculationMethod === 'attendance') {
                dailyWage = monthlyWage / 26;
            } else {
                dailyWage = wage;
            }
            
            // 如果有工资天数 >= 应工作天数，给满月工资
            // 否则按日工资计算
            if (paidDays >= expectedWorkDays) {
                totalSalary = Number(monthlyWage) + Number(overtimeSalary);
            } else {
                totalSalary = Number(dailyWage * paidDays) + Number(overtimeSalary);
            }
            
            // 计算补贴
            subsidyTotal = ExportTemplates.calculateSubsidy(subsidyType, subsidyStatuses, presentDays, halfDays, restDays, holidayDays, monthlySubsidy, dailySubsidy, perMealSubsidy, mealsPerDay, daysInMonth);
            totalSalary = Number(totalSalary) + Number(subsidyTotal);
        } else {
            // 点工：根据日工资和实际工作天数计算工资
            // 注意：这里遵循主页逻辑，basicSalary 已经在循环中累加
            // totalWorkDays 是实际工作天数（满勤 + 半天）
            const dailyWage = Number(wage);
            // 按照主页逻辑：工资 = 工作天数工资 + 加班费（workDays 已包含出勤和半天，不包含请假）
            const workDaysWage = Number(totalWorkDays * dailyWage);
            
            // 计算补贴
            subsidyTotal = ExportTemplates.calculateSubsidy(subsidyType, subsidyStatuses, presentDays, halfDays, restDays, holidayDays, monthlySubsidy, dailySubsidy, perMealSubsidy, mealsPerDay, daysInMonth);
            
            totalSalary = Number(workDaysWage + Number(overtimeSalary) + Number(subsidyTotal));
        }
        
        let excelContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head>' +
                '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' +
                '<meta name="ProgId" content="Excel.Sheet">' +
                '<meta name="Generator" content="Microsoft Excel 15">' +
                '<!--[if gte mso 9]>' +
                '<xml>' +
                '<x:ExcelWorkbook>' +
                '<x:ExcelWorksheets>' +
                '<x:ExcelWorksheet>' +
                '<x:Name>工资单</x:Name>' +
                '<x:WorksheetOptions>' +
                '<x:DisplayGridlines/>' +
                '</x:WorksheetOptions>' +
                '</x:ExcelWorksheet>' +
                '</x:ExcelWorksheets>' +
                '</x:ExcelWorkbook>' +
                '</xml>' +
                '<![endif]-->' +
                '<style>' +
                    '@page { size: A4; margin: 1cm; }' +
                    'table { border-collapse: collapse; width: 100%; }' +
                    'td, th { border: 1px solid #000000; padding: 6px 8px; font-family: 宋体, SimSun, serif; font-size: 12px; line-height: 1.3; mso-number-format:"\@"; }' +
                    'th { background: #4CAF50; color: white; font-weight: bold; text-align: center; font-size: 13px; }' +
                    'tr { height: 22px; }' +
                    'tr:nth-child(even) { background-color: #f2f2f2; }' +
                    '.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 15px; color: #333; }' +
                    '.info { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #4CAF50; font-size: 12px; }' +
                    '.summary { margin-top: 15px; font-weight: bold; padding: 12px; background: #f5f5f5; font-size: 12px; }' +
                    '.status-full { color: #4CAF50; font-weight: bold; }' +
                    '.status-half { color: #ff9800; font-weight: bold; }' +
                    '.status-absent { color: #f44336; font-weight: bold; }' +
                    '.status-rest { color: #2196F3; font-weight: bold; }' +
                    '.status-holiday { color: #9C27B0; font-weight: bold; }' +
                    '.salary-highlight { color: #ff6600; font-weight: bold; font-size: 14px; }' +
                '</style>' +
            '</head>' +
            '<body>' +
                '<table>' +
                '<tr><td colspan="6" class="title">' + monthText + ' 工资结算单</td></tr>' +
                '<tr><td colspan="6" class="info">姓名：' + name + '　　工种：' + job + '　　' + (monthlyWage ? '月工资：¥' + monthlyWage + '/月' : '日工资：¥' + wage + '/天') + '</td></tr>' +
                '</table>' +
                '<table>' +
                    '<tr>' +
                        '<th>日期</th>' +
                        '<th>星期</th>' +
                        '<th>状态</th>' +
                        '<th>工日</th>' +
                        '<th>当日工资</th>' +
                        '<th>备注</th>' +
                    '</tr>';
        
        workDetails.forEach(function(detail) {
            const overtimeText = detail.overtime > 0 ? ' (+' + detail.overtime + '小时)' : '';
            const salaryText = detail.totalSalary > 0 ? '¥' + detail.totalSalary.toFixed(0) : '-';
            
            // 根据状态应用不同的样式类
            let statusClass = '';
            if (detail.status === '满勤') {
                statusClass = 'status-full';
            } else if (detail.status === '半天') {
                statusClass = 'status-half';
            } else if (detail.status === '缺勤') {
                statusClass = 'status-absent';
            } else if (detail.status === '休息') {
                statusClass = 'status-rest';
            } else if (detail.status === '放假') {
                statusClass = 'status-holiday';
            }
            
            excelContent += '<tr>' +
                '<td style="text-align: center;">' + month + '月' + detail.day + '日</td>' +
                '<td style="text-align: center;">' + detail.week + '</td>' +
                '<td style="text-align: center;"><span class="' + statusClass + '">' + detail.status + '</span>' + overtimeText + '</td>' +
                '<td style="text-align: center;">' + detail.workDay + '</td>' +
                '<td style="text-align: right; font-weight: bold;">' + salaryText + '</td>' +
                '<td style="text-align: left;">' + (detail.note || '-') + '</td>' +
            '</tr>';
        });
        
        // 根据员工类型生成不同的汇总信息显示
        let summaryContent = '';
        if (monthlyWage && monthlyWage > 0) {
            // 全职：显示固定月工资和扣除项
            // 根据 wageCalculationMethod 计算日工资（与循环中一致）
            let dailyWage;
            if (wageCalculationMethod === 'natural') {
                dailyWage = monthlyWage / 30;
            } else if (wageCalculationMethod === 'legal') {
                dailyWage = monthlyWage / 21.75;
            } else if (wageCalculationMethod === 'attendance') {
                dailyWage = monthlyWage / expectedWorkDays;
            } else {
                dailyWage = wage;
            }
            const basicWage = Number(monthlyWage);
            const absentWage = Number(absentDays * dailyWage);
            let extraWage = 0;
            if (totalWorkDays > expectedWorkDays) {
                const extraDays = totalWorkDays - expectedWorkDays;
                extraWage = Number(extraDays * dailyWage);
            }
            
            summaryContent = 
                '满勤天数：<span style="color: #4CAF50;">' + presentDays + '</span>　　' +
                '半天次数：<span style="color: #ff9800;">' + halfDays + '</span>　　' +
                '缺勤天数：<span style="color: #f44336;">' + absentDays + '</span>　　' +
                '总工日：<span style="font-weight: bold;">' + totalWorkDays.toFixed(1) + '</span><br>' +
                '固定月工资：<span style="font-weight: bold;">¥' + basicWage.toFixed(0) + '</span>　　' +
                '请假扣款：<span style="color: #f44336;">-¥' + absentWage.toFixed(0) + '</span>　　' +
                (extraWage > 0 ? '额外工资：<span style="color: #4CAF50;">+¥' + extraWage.toFixed(0) + '</span>　　' : '') +
                '加班工资：<span style="font-weight: bold;">¥' + overtimeSalary.toFixed(0) + '</span>　　' +
                '补贴：<span style="font-weight: bold;">¥' + subsidyTotal.toFixed(0) + '</span><br>' +
                '本月实发工资：<span class="salary-highlight">¥' + totalSalary.toFixed(0) + '</span>';
        } else {
            // 点工：显示日工资和实际工作天数
            summaryContent = 
                '满勤天数：<span style="color: #4CAF50;">' + presentDays + '</span>　　' +
                '半天次数：<span style="color: #ff9800;">' + halfDays + '</span>　　' +
                '缺勤天数：<span style="color: #f44336;">' + absentDays + '</span>　　' +
                '总工日：<span style="font-weight: bold;">' + totalWorkDays.toFixed(1) + '</span><br>' +
                '基础工资：<span style="font-weight: bold;">¥' + basicSalary.toFixed(0) + '</span>　　' +
                '加班工资：<span style="font-weight: bold;">¥' + overtimeSalary.toFixed(0) + '</span>　　' +
                '补贴：<span style="font-weight: bold;">¥' + subsidyTotal.toFixed(0) + '</span><br>' +
                '本月实发工资：<span class="salary-highlight">¥' + totalSalary.toFixed(0) + '</span>';
        }
        
        excelContent += '</table>' +
            '<table>' +
                '<tr><td colspan="6" class="summary">' + summaryContent + '</td></tr>' +
            '</table>' +
            '</body>' +
            '</html>';
        
        return excelContent;
    }

    /**
     * 生成PDF格式的工资单
     * @param {Object} personalInfo 个人信息
     * @param {Object} project 项目信息
     * @param {string} currentMonth 当前月份
     * @param {Object} projectData 项目数据
     * @returns {string} PDF格式的HTML内容
     */
    static generatePDF(personalInfo, project, currentMonth, projectData) {
        // 这里可以使用与Excel类似的模板，但添加PDF特定的样式
        const excelContent = this.generateExcel(personalInfo, project, currentMonth, projectData);
        
        // 替换为PDF特定的样式
        let pdfContent = excelContent.replace('<style>', '<style>@media print { body { font-family: 宋体; margin: 20px; } table { width: 100%; } } ');
        
        return pdfContent;
    }

    /**
     * 生成JSON格式的完整数据
     * @param {Object} personalInfo 个人信息
     * @param {Array} projects 项目列表
     * @param {string} currentProjectId 当前项目ID
     * @param {Object} projectData 项目数据
     * @returns {Object} JSON格式的数据
     */
    static generateJSON(personalInfo, projects, currentProjectId, projectData) {
        return {
            personalInfo: personalInfo,
            projects: projects,
            currentProjectId: currentProjectId,
            projectData: projectData,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
    }

    // 计算补贴的方法
    static calculateSubsidy(subsidyType, subsidyStatuses, presentDays, halfDays, restDays, holidayDays, monthlySubsidy, dailySubsidy, perMealSubsidy, mealsPerDay, daysInMonth) {
        if (subsidyType === 'none') {
            return 0;
        }
        
        // 获取有补贴天数
        let subsidyDays = 0;
        
        if (subsidyStatuses.includes('present')) {
            subsidyDays += presentDays;
        }
        if (subsidyStatuses.includes('half')) {
            subsidyDays += halfDays * 0.5;
        }
        if (subsidyStatuses.includes('holiday')) {
            subsidyDays += holidayDays;
        }
        if (subsidyStatuses.includes('rest')) {
            subsidyDays += restDays;
        }
        
        // 应工作天数（单休每月4天休息）
        const expectedWorkDays = 26;
        
        let subsidyTotal = 0;
        
        switch (subsidyType) {
            case 'monthly':
                // 按月计算：如果有补贴天数 >= 应工作天数，给满月补贴
                // 否则按日补贴计算
                if (subsidyDays >= expectedWorkDays) {
                    subsidyTotal = monthlySubsidy;
                } else {
                    const dailySubsidyFromMonthly = monthlySubsidy / daysInMonth;
                    subsidyTotal = dailySubsidyFromMonthly * subsidyDays;
                }
                break;
                
            case 'daily':
                // 按天计算：日补贴 × 有补贴天数
                subsidyTotal = dailySubsidy * subsidyDays;
                break;
                
            case 'perMeal':
                // 按餐计算：每餐补贴 × 每日餐数 × 有补贴天数
                subsidyTotal = perMealSubsidy * mealsPerDay * subsidyDays;
                break;
        }
        
        return subsidyTotal;
    }
}

// 添加全局引用
window.ExportTemplates = ExportTemplates;