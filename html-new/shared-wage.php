<?php
// 分享链接访问页面
include_once '../includes/db.php';
$db = db_connect();

$token = isset($_GET['token']) ? $_GET['token'] : '';
$error = '';
$workerData = null;
$shareInfo = null;
$workRecords = [];
$monthStats = null;

if (!$token) {
    $error = '分享链接无效';
} else {
    try {
        $stmt = $db->prepare("SELECT * FROM share_links WHERE share_token = ? AND is_active = 1");
        $stmt->execute([$token]);
        $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$shareLink) {
            $error = '分享链接不存在或已失效';
        } else if (strtotime($shareLink['expires_at']) < time()) {
            $error = '分享链接已过期';
        } else if ($shareLink['max_views'] !== null && $shareLink['max_views'] > 0 && $shareLink['view_count'] >= $shareLink['max_views']) {
            $error = '分享链接已达到最大查看次数';
        } else {
            if ($shareLink['password_hash']) {
                if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
                    if (!password_verify($_POST['password'], $shareLink['password_hash'])) {
                        $error = '密码错误';
                    } else {
                        $workerId = $shareLink['worker_id'];
                    }
                } else {
                    $requirePassword = true;
                }
            } else {
                $workerId = $shareLink['worker_id'];
            }
            
            if (isset($workerId)) {
                $stmt = $db->prepare("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?");
                $stmt->execute([$shareLink['id']]);
                
                $stmt = $db->prepare("
                    SELECT u.id, u.name as user_name, u.phone, p.name as personal_name, p.job, p.employeeType, p.restSystem,
                           p.wage, p.monthlyWage, p.overtimeRate, p.wageCalculationMethod,
                           p.email, p.idNumber, p.subsidySettings
                    FROM users u
                    LEFT JOIN personalInfo p ON u.id = p.user_id
                    WHERE u.id = ?
                    ORDER BY p.created_at DESC
                    LIMIT 1
                ");
                $stmt->execute([$workerId]);
                $worker = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($worker) {
                    $subsidySettings = $worker['subsidySettings'] ? json_decode($worker['subsidySettings'], true) : null;
                    
                    $workerData = [
                        'id' => $worker['id'],
                        'name' => $worker['personal_name'] ?: $worker['user_name'] ?: '未设置',
                        'phone' => $worker['phone'] ?: '未设置',
                        'job' => $worker['job'] ?: '未设置',
                        'employeeType' => $worker['employeeType'] ?: 'fullTime',
                        'restSystem' => $worker['restSystem'] ?: 'doubleRest',
                        'wage' => floatval($worker['wage']) ?: 0,
                        'monthlyWage' => floatval($worker['monthlyWage']) ?: 0,
                        'overtimeRate' => floatval($worker['overtimeRate']) ?: 0,
                        'wageCalculationMethod' => $worker['wageCalculationMethod'] ?: 'natural',
                        'email' => $worker['email'] ?: '未设置',
                        'idNumber' => $worker['idNumber'] ?: '未设置',
                        'subsidySettings' => $subsidySettings
                    ];
                    
                    $shareInfo = [
                        'expires_at' => $shareLink['expires_at'],
                        'view_count' => $shareLink['view_count'] + 1,
                        'max_views' => $shareLink['max_views']
                    ];
                    
                    $selectedYear = date('Y');
                    $selectedMonth = date('m');
                    
                    $stmt = $db->prepare("
                        SELECT date, status, workHours, overtimeHours, overtime, remark
                        FROM attendance
                        WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?
                        ORDER BY date ASC
                    ");
                    $stmt->execute([$workerId, $selectedYear, $selectedMonth]);
                    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $selectedMonth, $selectedYear);
                    for ($day = 1; $day <= $daysInMonth; $day++) {
                        $date = sprintf('%04d-%02d-%02d', $selectedYear, $selectedMonth, $day);
                        $record = null;
                        foreach ($records as $r) {
                            if ($r['date'] === $date) {
                                $record = $r;
                                break;
                            }
                        }
                        
                        $dayOfWeek = date('w', strtotime($date));
                        $isWeekend = ($dayOfWeek == 0 || $dayOfWeek == 6);
                        
                        $workRecords[] = [
                            'date' => $date,
                            'day' => $day,
                            'status' => $record ? $record['status'] : null,
                            'hours' => $record ? floatval($record['workHours']) : 0,
                            'overtimeHours' => $record ? floatval($record['overtimeHours']) : 0,
                            'overtime' => $record ? floatval($record['overtime']) : 0,
                            'remark' => $record ? $record['remark'] : '',
                            'isWeekend' => $isWeekend
                        ];
                    }
                    
                    $totalDays = 0;
                    $totalHours = 0;
                    $totalOvertimeHours = 0;
                    $totalDailyWage = 0;
                    $totalOvertimeWage = 0;
                    $totalSubsidy = 0;
                    
                    foreach ($workRecords as $r) {
                        if (in_array($r['status'], ['present', 'normal', 'half', 'holiday'])) {
                            $dayCount = ($r['status'] === 'half') ? 0.5 : 1;
                            $totalDays += $dayCount;
                            $totalDailyWage += $workerData['wage'] * $dayCount;
                            
                            if ($subsidySettings && isset($subsidySettings['subsidyType'])) {
                                if ($subsidySettings['subsidyType'] === 'daily' && in_array($r['status'], $subsidySettings['subsidyStatuses'] ?? ['present'])) {
                                    $totalSubsidy += floatval($subsidySettings['dailySubsidy'] ?? 0) * $dayCount;
                                }
                            }
                        }
                        $totalHours += $r['hours'];
                        $totalOvertimeHours += $r['overtimeHours'];
                        $totalOvertimeWage += $r['overtime'];
                    }
                    
                    if ($subsidySettings && $subsidySettings['subsidyType'] === 'monthly') {
                        $totalSubsidy = floatval($subsidySettings['monthlySubsidy'] ?? 0);
                    }
                    
                    $monthStats = [
                        'totalDays' => $totalDays,
                        'totalHours' => $totalHours,
                        'totalOvertimeHours' => $totalOvertimeHours,
                        'totalDailyWage' => $totalDailyWage,
                        'totalOvertimeWage' => $totalOvertimeWage,
                        'totalSubsidy' => $totalSubsidy,
                        'total' => $totalDailyWage + $totalOvertimeWage + $totalSubsidy
                    ];
                } else {
                    $error = '工人信息不存在';
                }
            }
        }
    } catch (PDOException $e) {
        error_log('分享链接访问错误: ' . $e->getMessage());
        $error = '系统错误: ' . $e->getMessage();
    } catch (Exception $e) {
        error_log('分享链接访问错误: ' . $e->getMessage());
        $error = '错误: ' . $e->getMessage();
    }
}

$statusMap = [
    'present' => ['text' => '出勤', 'class' => 'status-present'],
    'normal' => ['text' => '出勤', 'class' => 'status-present'],
    'absent' => ['text' => '缺勤', 'class' => 'status-absent'],
    'leave' => ['text' => '请假', 'class' => 'status-leave'],
    'half' => ['text' => '半天', 'class' => 'status-half'],
    'holiday' => ['text' => '节假日', 'class' => 'status-holiday'],
    'rest' => ['text' => '休息', 'class' => 'status-rest']
];

$employeeTypeMap = [
    'fullTime' => '全职',
    'partTime' => '兼职', 
    'daily' => '点工'
];

$restSystemMap = [
    'singleRest' => '单休',
    'doubleRest' => '双休',
    'freeRest' => '自由休息'
];

$wageMethodMap = [
    'natural' => '自然月',
    'currentMonth' => '当月',
    'nextMonth' => '次月'
];
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>工资详情分享</title>
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/jg/css-new/bundle.min.css">
    <style>
        :root {
            --primary-color: #06b6d4;
            --primary-light: rgba(6, 182, 212, 0.1);
            --primary-dark: #0891b2;
            --bg-dark: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.8);
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
            --border-color: rgba(6, 182, 212, 0.2);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #0f172a;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ffffff;
            padding-bottom: 40px;
        }
        
        .share-header {
            background: #0f172a;
            border-bottom: 2px solid #334155;
            padding: 20px;
            text-align: center;
        }
        
        .share-header h1 {
            font-size: 20px;
            color: #06b6d4;
            margin-bottom: 8px;
        }
        
        .share-header p {
            color: #94a3b8;
            font-size: 14px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #0f172a;
        }
        
        .section {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #475569;
        }
        
        .section:hover {
            border-color: #06b6d4;
        }
        
        .section:hover .section-title {
            color: #06b6d4;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #334155;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #06b6d4;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            background: #1e293b;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #334155;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: #0f172a;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #475569;
        }
        
        .info-item:hover {
            border-color: #06b6d4;
        }
        
        .info-item:hover .info-value {
            color: #06b6d4 !important;
        }
        
        .info-label {
            font-size: 12px;
            color: #64748b;
        }
        
        .info-value {
            font-size: 16px;
            color: #ffffff;
            font-weight: 600;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            background: #1e293b;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #334155;
        }
        
        .stat-card {
            background: #0f172a;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            border: 1px solid #475569;
        }
        
        .stat-card:hover {
            border-color: #06b6d4;
        }
        
        .stat-card:hover .stat-value {
            color: #06b6d4 !important;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .stat-label {
            font-size: 13px;
            color: #64748b;
            margin-top: 6px;
        }
        
        .work-table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #334155;
            background: #0f172a;
        }
        
        .work-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        .work-table th {
            background: #1e293b;
            color: #94a3b8;
            font-weight: 600;
            padding: 12px 8px;
            text-align: center;
            border-bottom: 2px solid #334155;
        }
        
        .work-table td {
            padding: 10px 8px;
            text-align: center;
            border-bottom: 1px solid #334155;
            color: #ffffff;
        }
        
        .work-table tbody tr {
            background: #0f172a;
        }
        
        .work-table tbody tr:nth-child(even) {
            background: #1e293b;
        }
        
        .work-table tbody tr:hover {
            background: #1e293b;
        }
        
        .work-table tbody tr:hover td {
            color: #06b6d4;
        }
        
        .work-table tbody tr.weekend {
            background: #1e293b;
        }
        
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-present { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .status-absent { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .status-leave { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .status-half { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .status-holiday { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
        .status-rest { background: rgba(107, 114, 128, 0.2); color: #6b7280; }
        
        .wage-detail {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .wage-main {
            font-weight: 600;
            color: var(--primary-color);
        }
        
        .wage-sub {
            font-size: 11px;
            color: #94a3b8;
        }
        
        .subsidy-info {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }
        
        .subsidy-tag {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            color: #94a3b8;
        }
        
        .error-container {
            text-align: center;
            padding: 80px 20px;
        }
        
        .error-container i {
            font-size: 64px;
            color: #ef4444;
            margin-bottom: 20px;
        }
        
        .error-container h2 {
            color: #f1f5f9;
            margin-bottom: 12px;
        }
        
        .error-container p {
            color: #94a3b8;
        }
        
        .password-form {
            max-width: 400px;
            margin: 60px auto;
            text-align: center;
        }
        
        .password-form i {
            font-size: 48px;
            color: var(--primary-color);
            margin-bottom: 20px;
        }
        
        .password-form h2 {
            color: #f1f5f9;
            margin-bottom: 24px;
        }
        
        .password-form input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #334155;
            border-radius: 8px;
            background: #0f172a;
            color: #ffffff;
            font-size: 16px;
            margin-bottom: 16px;
        }
        
        .password-form button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .password-form button:hover {
            background: linear-gradient(135deg, #0891b2, #06b6d4);
        }
        
        .share-footer {
            text-align: center;
            padding: 30px 20px;
            color: #64748b;
            font-size: 13px;
            border-top: 1px solid #334155;
            margin-top: 20px;
        }
        
        .share-footer p {
            margin: 4px 0;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 12px;
            }
            
            .section {
                padding: 16px;
            }
            
            .info-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                padding: 12px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .work-table {
                font-size: 12px;
            }
            
            .work-table th,
            .work-table td {
                padding: 8px 4px;
            }
        }
    </style>
</head>
<body>
    <?php if ($error): ?>
        <div class="error-container">
            <i class="fas fa-exclamation-circle"></i>
            <h2>访问失败</h2>
            <p><?php echo htmlspecialchars($error); ?></p>
        </div>
    <?php elseif (isset($requirePassword)): ?>
        <div class="password-form">
            <i class="fas fa-lock"></i>
            <h2>请输入访问密码</h2>
            <form method="POST">
                <input type="password" name="password" placeholder="请输入密码" required autofocus>
                <button type="submit">进入查看</button>
            </form>
        </div>
    <?php elseif ($workerData): ?>
        <div class="share-header">
            <h1><i class="fas fa-money-bill-wave"></i> 工资详情</h1>
            <p><?php echo htmlspecialchars($workerData['name']); ?> - <?php echo date('Y年m月'); ?></p>
        </div>
        
        <div class="container">
            <!-- 个人信息 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-user"></i> 个人信息
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">姓名</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo htmlspecialchars($workerData['name']); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">电话</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo htmlspecialchars($workerData['phone']); ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">工种</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo $workerData['job'] ? htmlspecialchars($workerData['job']) : '<span style="color:#64748b;">未设置</span>'; ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">员工类型</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo $employeeTypeMap[$workerData['employeeType']] ?? '全职'; ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">休息制度</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo $restSystemMap[$workerData['restSystem']] ?? '双休'; ?></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">工资计算方式</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo $wageMethodMap[$workerData['wageCalculationMethod']] ?? '自然月'; ?></div>
                    </div>
                </div>
            </div>
            
            <!-- 工资标准 -->
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-coins"></i> 工资标准
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">日工资</div>
                        <div class="info-value" style="color: #ffffff;">¥<?php echo number_format($workerData['wage'], 2); ?>/天</div>
                    </div>
                    <?php if ($workerData['monthlyWage'] > 0): ?>
                    <div class="info-item">
                        <div class="info-label">月工资</div>
                        <div class="info-value" style="color: #ffffff;">¥<?php echo number_format($workerData['monthlyWage'], 2); ?>/月</div>
                    </div>
                    <?php endif; ?>
                    <div class="info-item">
                        <div class="info-label">加班倍率</div>
                        <div class="info-value" style="color: #ffffff;"><?php echo $workerData['overtimeRate']; ?>倍</div>
                    </div>
                    <?php if ($workerData['subsidySettings']): ?>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">补贴设置</div>
                        <div class="subsidy-info">
                            <?php if ($workerData['subsidySettings']['subsidyType'] === 'monthly'): ?>
                                <span class="subsidy-tag">月补贴: ¥<?php echo number_format($workerData['subsidySettings']['monthlySubsidy'] ?? 0, 2); ?></span>
                            <?php elseif ($workerData['subsidySettings']['subsidyType'] === 'daily'): ?>
                                <span class="subsidy-tag">日补贴: ¥<?php echo number_format($workerData['subsidySettings']['dailySubsidy'] ?? 0, 2); ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- 本月统计 -->
            <?php if ($monthStats): ?>
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-chart-bar"></i> <?php echo date('Y年m月'); ?> 统计
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;"><?php echo $monthStats['totalDays']; ?></div>
                        <div class="stat-label">出勤天数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;"><?php echo number_format($monthStats['totalHours'], 1); ?>h</div>
                        <div class="stat-label">工作时长</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;"><?php echo number_format($monthStats['totalOvertimeHours'], 1); ?>h</div>
                        <div class="stat-label">加班时长</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;">¥<?php echo number_format($monthStats['totalDailyWage'], 2); ?></div>
                        <div class="stat-label">基本工资</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;">¥<?php echo number_format($monthStats['totalOvertimeWage'], 2); ?></div>
                        <div class="stat-label">加班工资</div>
                    </div>
                    <?php if ($monthStats['totalSubsidy'] > 0): ?>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #ffffff;">¥<?php echo number_format($monthStats['totalSubsidy'], 2); ?></div>
                        <div class="stat-label">补贴</div>
                    </div>
                    <?php endif; ?>
                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(8, 145, 178, 0.1) 100%);">
                        <div class="stat-value" style="color: #fff;">¥<?php echo number_format($monthStats['total'], 2); ?></div>
                        <div class="stat-label" style="color: rgba(255,255,255,0.8);">本月总工资</div>
                    </div>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- 工作记录 -->
            <?php if (!empty($workRecords)): ?>
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-calendar-alt"></i> 工作记录
                    </div>
                </div>
                <div class="work-table-container">
                    <table class="work-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>星期</th>
                                <th>状态</th>
                                <th>工时</th>
                                <th>工资明细</th>
                                <th>备注</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $weekDays = ['日', '一', '二', '三', '四', '五', '六'];
                            foreach ($workRecords as $record): 
                                $weekDay = date('w', strtotime($record['date']));
                                $isWeekend = $record['isWeekend'];
                                $hasData = $record['status'] !== null;
                                $dailyWage = 0;
                                if (in_array($record['status'], ['present', 'normal', 'half', 'holiday'])) {
                                    $dayCount = ($record['status'] === 'half') ? 0.5 : 1;
                                    $dailyWage = $workerData['wage'] * $dayCount;
                                }
                            ?>
                            <tr class="<?php echo $isWeekend ? 'weekend' : ''; ?>">
                                <td><?php echo date('n', strtotime($record['date'])); ?>.<?php echo $record['day']; ?></td>
                                <td><?php echo $weekDays[$weekDay]; ?></td>
                                <td>
                                    <?php if ($record['status']): ?>
                                        <span class="status-badge <?php echo $statusMap[$record['status']]['class'] ?? ''; ?>">
                                            <?php echo $statusMap[$record['status']]['text'] ?? $record['status']; ?>
                                        </span>
                                    <?php else: ?>
                                        <span style="color: #64748b;">-</span>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo ($record['hours'] > 0 && in_array($record['status'], ['present', 'normal', 'half', 'holiday'])) ? $record['hours'] . 'h' : '-'; ?></td>
                                <td>
                                    <?php if ($hasData && $dailyWage > 0): ?>
                                        <div class="wage-detail">
                                            <span class="wage-main" style="color: #06b6d4;">¥<?php echo number_format($dailyWage, 2); ?></span>
                                            <?php if ($record['overtime'] > 0): ?>
                                                <span class="wage-sub" style="color: #f59e0b;">+¥<?php echo number_format($record['overtime'], 2); ?> 加班</span>
                                            <?php endif; ?>
                                        </div>
                                    <?php else: ?>
                                        <span style="color: #64748b;">-</span>
                                    <?php endif; ?>
                                </td>
                                <td style="max-width: 150px;">
                                    <div style="word-break: break-word; white-space: normal; line-height: 1.4;">
                                        <?php if ($record['overtimeHours'] > 0): ?>
                                            <div style="color: #f59e0b; font-weight: 500; margin-bottom: 4px;"><?php echo $record['overtimeHours']; ?>h 加班</div>
                                        <?php endif; ?>
                                        <?php echo $record['remark'] ? htmlspecialchars($record['remark']) : '<span style="color:#64748b;">-</span>'; ?>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="share-footer">
            <p><i class="fas fa-shield-alt"></i> 此链接为私密分享，请勿转发给他人</p>
            <?php if ($shareInfo): ?>
            <p>
                查看次数: <?php echo $shareInfo['view_count']; ?>
                <?php if ($shareInfo['max_views']): ?> / <?php echo $shareInfo['max_views']; ?><?php endif; ?>
                | 过期时间: <?php echo date('Y-m-d', strtotime($shareInfo['expires_at'])); ?>
            </p>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</body>
</html>
