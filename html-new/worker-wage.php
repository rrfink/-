<?php
// 首先包含数据库连接（在 header.php 之前）
include_once '../includes/db.php';
$db = db_connect();

// 启动会话
session_start();

// 分享链接验证
function checkShareLink($db, $token) {
    if (!$token) {
        return ['allowed' => false, 'message' => '分享链接无效'];
    }
    
    try {
        $stmt = $db->prepare("SELECT * FROM share_links WHERE share_token = ? AND is_active = 1");
        $stmt->execute([$token]);
        $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$shareLink) {
            return ['allowed' => false, 'message' => '分享链接不存在或已失效'];
        }
        
        if (strtotime($shareLink['expires_at']) < time()) {
            return ['allowed' => false, 'message' => '分享链接已过期'];
        }
        
        if ($shareLink['max_views'] !== null && $shareLink['max_views'] > 0 && $shareLink['view_count'] >= $shareLink['max_views']) {
            return ['allowed' => false, 'message' => '分享链接已达到最大查看次数'];
        }
        
        // 检查是否需要密码
        if ($shareLink['password_hash']) {
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
                if (!password_verify($_POST['password'], $shareLink['password_hash'])) {
                    return ['allowed' => false, 'message' => '密码错误', 'requirePassword' => true];
                }
            } else {
                return ['allowed' => false, 'message' => '需要密码', 'requirePassword' => true, 'shareLink' => $shareLink];
            }
        }
        
        // 更新查看次数
        $stmt = $db->prepare("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?");
        $stmt->execute([$shareLink['id']]);
        
        return ['allowed' => true, 'worker_id' => $shareLink['worker_id'], 'shareLink' => $shareLink];
        
    } catch (PDOException $e) {
        return ['allowed' => false, 'message' => '验证失败'];
    }
}

// 权限验证（登录用户）
function checkViewPermission($db, $workerId) {
    // 检查是否已登录
    $currentUserId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : (isset($_COOKIE['user_id']) ? $_COOKIE['user_id'] : null);
    
    if (!$currentUserId) {
        return ['allowed' => false, 'message' => '请先登录'];
    }
    
    try {
        // 获取当前用户角色
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$currentUserId]);
        $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$currentUser) {
            return ['allowed' => false, 'message' => '用户不存在'];
        }
        
        // 管理员可以看所有人的
        if ($currentUser['role'] === 'admin') {
            return ['allowed' => true, 'role' => 'admin'];
        }
        
        // 工头只能看被分配到自己项目的工人
        if ($currentUser['role'] === 'foreman') {
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM foreman_workers
                WHERE foreman_id = ? AND worker_id = ?
            ");
            $stmt->execute([$currentUserId, $workerId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                return ['allowed' => true, 'role' => 'foreman'];
            } else {
                return ['allowed' => false, 'message' => '您没有权限查看此工人的工资信息'];
            }
        }
        
        return ['allowed' => false, 'message' => '您没有权限查看工资信息'];
        
    } catch (PDOException $e) {
        return ['allowed' => false, 'message' => '权限验证失败'];
    }
}

$pageTitle = '工人工资详情';
$isHome = false;
$page = 'worker-wage';

// 获取URL参数
$workerId = isset($_GET['worker_id']) ? $_GET['worker_id'] : '';
$token = isset($_GET['token']) ? $_GET['token'] : '';
$isShareLink = !empty($token);
$shareLinkData = null;
$requirePassword = false;

// 验证权限（分享链接优先）
if ($isShareLink) {
    // 检查是否已经通过密码验证（存在session中）
    $sessionKey = 'share_link_' . $token;
    if (isset($_SESSION[$sessionKey]) && $_SESSION[$sessionKey]['verified'] === true) {
        // 已验证过，直接使用session中的数据
        $workerId = $_SESSION[$sessionKey]['worker_id'];
        $shareLinkData = $_SESSION[$sessionKey]['share_link'];
    } else {
        $shareCheck = checkShareLink($db, $token);
        if (!$shareCheck['allowed']) {
            if (isset($shareCheck['requirePassword']) && $shareCheck['requirePassword']) {
                $requirePassword = true;
                $shareLinkData = $shareCheck['shareLink'];
            } else {
                header('Location: /jg/html-new/login.php?error=' . urlencode($shareCheck['message']));
                exit;
            }
        } else {
            $workerId = $shareCheck['worker_id'];
            $shareLinkData = $shareCheck['shareLink'];
            // 将验证状态存入session，避免切换月份时重复验证
            $_SESSION[$sessionKey] = [
                'verified' => true,
                'worker_id' => $workerId,
                'share_link' => $shareLinkData,
                'verified_at' => time()
            ];
        }
    }
} else {
    $permissionCheck = checkViewPermission($db, $workerId);
    if (!$permissionCheck['allowed']) {
        header('Location: /jg/html-new/login.php?error=' . urlencode($permissionCheck['message']));
        exit;
    }
}

// 获取选择的年月（默认为当前年月）
$selectedYear = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$selectedMonth = isset($_GET['month']) ? intval($_GET['month']) : date('m');

// 处理月份选择器的提交
if (isset($_GET['monthPicker']) && !empty($_GET['monthPicker'])) {
    $monthPickerValue = $_GET['monthPicker']; // 格式: YYYY-MM
    $pickerParts = explode('-', $monthPickerValue);
    if (count($pickerParts) === 2) {
        $selectedYear = intval($pickerParts[0]);
        $selectedMonth = intval($pickerParts[1]);
    }
}

// 确保年月有效
if ($selectedYear < 2000 || $selectedYear > 2100) {
    $selectedYear = date('Y');
}
if ($selectedMonth < 1 || $selectedMonth > 12) {
    $selectedMonth = date('m');
}

// 格式化为两位数月份
$selectedMonthPadded = str_pad($selectedMonth, 2, '0', STR_PAD_LEFT);

// 初始化数据
$workerData = [
    'name' => '未设置',
    'phone' => $workerId,
    'email' => '未设置',
    'idNumber' => '未设置',
    'job' => '未设置',
    'employeeType' => 'daily',
    'restSystem' => 'doubleRest',
    'wage' => 0,
    'monthlyWage' => 0,
    'overtimeRate' => 0,
    'wageCalculationMethod' => 'natural',
    'subsidySettings' => null
];

$wageData = [
    'workDays' => 0,
    'overtimeHours' => 0,
    'overtimeWage' => 0,
    'subsidyWage' => 0,
    'totalWage' => 0,
    'actualWage' => 0
];

$workRecords = [];
$reimbursements = [];
$totalReimbursement = 0;

// 如果有工人ID，从数据库获取真实数据
if ($workerId) {
    try {
        // 使用数据库连接
        $db = db_connect();
        
        // 获取工人个人信息
        $stmt = $db->prepare("SELECT * FROM personalInfo WHERE user_id = ? LIMIT 1");
        $stmt->execute([$workerId]);
        $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($personalInfo) {
            $workerData['name'] = $personalInfo['name'] ?? '未设置';
            $workerData['email'] = $personalInfo['email'] ?? '未设置';
            $workerData['idNumber'] = $personalInfo['idNumber'] ?? '未设置';
            $workerData['job'] = $personalInfo['job'] ?? '未设置';
            $workerData['employeeType'] = $personalInfo['employeeType'] ?? 'daily';
            $workerData['restSystem'] = $personalInfo['restSystem'] ?? 'doubleRest';
            $workerData['wage'] = $personalInfo['wage'] ?? 0;
            $workerData['monthlyWage'] = $personalInfo['monthlyWage'] ?? 0;
            $workerData['overtimeRate'] = $personalInfo['overtimeRate'] ?? 0;
            $workerData['wageCalculationMethod'] = $personalInfo['wageCalculationMethod'] ?? 'natural';
            $workerData['subsidySettings'] = isset($personalInfo['subsidySettings']) ? json_decode($personalInfo['subsidySettings'], true) : null;
        }
        
        // 使用选择的年月
        $currentYear = $selectedYear;
        $currentMonth = $selectedMonthPadded;
        $daysInMonth = date('t', strtotime("$currentYear-$currentMonth-01"));
        
        // 获取选择月份的考勤记录
        $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date ASC");
        $stmt->execute([$workerId, "$currentYear-$currentMonth-%"]);
        $attendanceRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 将考勤记录转换为以日期为键的数组，方便查找
        $attendanceMap = [];
        foreach ($attendanceRecords as $record) {
            $attendanceMap[$record['date']] = $record;
        }
        
        // 计算工资数据
        $totalWorkDays = 0;
        $totalOvertimeHours = 0;
        $totalOvertimeWage = 0;
        $totalBaseWage = 0;
        
        // 星期数组
        $weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        
        // 生成整个月的所有日期
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = "$currentYear-$currentMonth-" . str_pad($day, 2, '0', STR_PAD_LEFT);
            $weekDay = $weekDays[date('w', strtotime($date))];
            
            // 检查是否有考勤记录
            if (isset($attendanceMap[$date])) {
                $record = $attendanceMap[$date];
                $status = $record['status'] ?? 'absent';
                $overtime = floatval($record['overtime'] ?? 0);
                $remark = $record['remark'] ?? '';
            } else {
                // 没有考勤记录，显示为未打卡
                $status = 'none';
                $overtime = 0;
                $remark = '';
            }
            
            // 判断是否带薪休假（放假和休息有工资）
            $isPaidLeave = ($status === 'absent' && ($remark === '放假' || $remark === '休息'));
            
            // 计算工作状态 - 根据对话框逻辑
            $workDay = 0;
            $statusText = '未打卡';
            $statusClass = 'badge-absent';
            $basicSalary = 0;
            $overtimeSalary = 0;
            $totalSalary = 0;
            
            if ($status === 'normal' || $status === 'late' || $status === 'present') {
                // 满勤 - 算工资
                $workDay = 1;
                $statusText = '满勤';
                $statusClass = 'badge-present';
                $basicSalary = $workerData['wage'];
                $totalWorkDays++;
            } elseif ($status === 'half') {
                // 半天 - 算一半工资
                $workDay = 0.5;
                $statusText = '半天';
                $statusClass = 'badge-half';
                $basicSalary = $workerData['wage'] * 0.5;
                $totalWorkDays += 0.5;
            } elseif ($isPaidLeave) {
                // 带薪休假（放假/休息）- 有工资
                $workDay = 1;
                $basicSalary = $workerData['wage'];
                $totalWorkDays++;
                if ($remark === '放假') {
                    $statusText = '放假';
                    $statusClass = 'badge-holiday';
                } else {
                    $statusText = '休息';
                    $statusClass = 'badge-rest';
                }
            } elseif ($status === 'absent') {
                // 缺勤 - 根据备注判断类型
                if ($remark === '请假') {
                    $statusText = '请假';
                    $statusClass = 'badge-absent';
                } else {
                    $statusText = '缺勤';
                    $statusClass = 'badge-absent';
                }
                // 缺勤不算工资
                $workDay = 0;
                $basicSalary = 0;
            } elseif ($status === 'rest') {
                // 休息状态 - 带薪休假
                $workDay = 1;
                $statusText = '休息';
                $statusClass = 'badge-rest';
                $basicSalary = $workerData['wage'];
                $totalWorkDays++;
            } elseif ($status === 'holiday') {
                // 放假状态 - 带薪休假
                $workDay = 1;
                $statusText = '放假';
                $statusClass = 'badge-holiday';
                $basicSalary = $workerData['wage'];
                $totalWorkDays++;
            } elseif ($status === 'none') {
                // 未打卡
                $statusText = '未打卡';
                $statusClass = 'badge-absent';
                $workDay = 0;
                $basicSalary = 0;
            }
            
            // 计算加班费
            if ($overtime > 0 && $workerData['overtimeRate'] > 0) {
                $hourlyWage = $workerData['wage'] / 8;
                $overtimeSalary = $overtime * $hourlyWage * $workerData['overtimeRate'];
                $totalOvertimeHours += $overtime;
                $totalOvertimeWage += $overtimeSalary;
            }
            
            $totalSalary = $basicSalary + $overtimeSalary;
            $totalBaseWage += $basicSalary;
            
            $workRecords[] = [
                'date' => $date,
                'day' => $day,
                'weekDay' => $weekDay,
                'status' => $statusText,
                'statusClass' => $statusClass,
                'workDay' => $workDay,
                'basicSalary' => $basicSalary,
                'overtime' => $overtime,
                'overtimeSalary' => $overtimeSalary,
                'totalSalary' => $totalSalary,
                'remark' => $remark
            ];
        }
        
        // 设置工资统计数据
        $wageData['workDays'] = $totalWorkDays;
        $wageData['overtimeHours'] = $totalOvertimeHours;
        $wageData['overtimeWage'] = $totalOvertimeWage;
        $wageData['subsidyWage'] = 0; // 补贴需要从其他表获取
        $wageData['totalWage'] = $totalBaseWage;
        $wageData['actualWage'] = $totalBaseWage + $totalOvertimeWage;
        
        // 获取报销数据
        // 连接报销数据库
        $reimbursementDbPath = __DIR__ . '/../database/users.db';
        if (file_exists($reimbursementDbPath)) {
            try {
                $reimbursementDb = new PDO('sqlite:' . $reimbursementDbPath);
                $reimbursementDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // 获取选择月份的报销记录
                $stmt = $reimbursementDb->prepare("SELECT * FROM reimbursements WHERE user_id = ? AND date LIKE ? ORDER BY date DESC");
                $stmt->execute([$workerId, "$currentYear-$currentMonth-%"]);
                $reimbursements = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // 计算报销总额
                foreach ($reimbursements as $r) {
                    $totalReimbursement += floatval($r['amount'] ?? 0);
                }
            } catch (Exception $e) {
                error_log('获取报销数据失败: ' . $e->getMessage());
            }
        }
        
    } catch (Exception $e) {
        // 数据库连接失败，使用默认空数据
        error_log('获取工人数据失败: ' . $e->getMessage());
    }
}

// 如果需要密码验证，显示密码输入页面
if ($requirePassword):
include 'header.php';
?>
<style>
    .password-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 20px;
    }
    .password-box {
        background: #1e293b;
        border-radius: 16px;
        padding: 40px;
        width: 100%;
        max-width: 400px;
        border: 1px solid #334155;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    .password-box h2 {
        color: #f1f5f9;
        margin-bottom: 24px;
        text-align: center;
    }
    .password-box input {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid #334155;
        border-radius: 8px;
        background: #0f172a;
        color: #f1f5f9;
        font-size: 16px;
        margin-bottom: 16px;
        box-sizing: border-box;
    }
    .password-box button {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #06b6d4, #0891b2);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
    }
    .password-box .error {
        color: #ef4444;
        margin-bottom: 16px;
        text-align: center;
    }
    .password-box .info {
        color: #94a3b8;
        font-size: 14px;
        text-align: center;
        margin-top: 16px;
    }
</style>
<div class="password-container">
    <div class="password-box">
        <h2><i class="fas fa-lock"></i> 需要密码访问</h2>
        <?php if ($error): ?>
        <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        <form method="POST" action="">
            <input type="password" name="password" placeholder="请输入访问密码" required autofocus>
            <button type="submit">进入查看</button>
        </form>
        <div class="info">
            此链接为私密分享，需要密码才能查看
        </div>
    </div>
</div>
<?php
include 'footer.php';
exit;
endif;

include 'header.php';
?>
    <link rel="stylesheet" href="/jg/css-new/skeleton.css?v=<?php echo file_exists('css-new/skeleton.css') ? filemtime('css-new/skeleton.css') : time(); ?>">
    <style>
        .wage-skeleton-container {
            display: none;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .wage-skeleton-container.active {
            display: block;
        }
        
        .wage-skeleton-container:not(.active) {
            pointer-events: none;
            visibility: hidden;
        }
        
        .wage-skeleton-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 16px;
            background: var(--card-bg, #fff);
            border-radius: 12px;
        }
        
        .wage-skeleton-title {
            width: 180px;
            height: 28px;
        }
        
        .wage-skeleton-actions {
            display: flex;
            gap: 8px;
        }
        
        .wage-skeleton-btn {
            width: 70px;
            height: 32px;
            border-radius: 6px;
        }
        
        .wage-skeleton-section {
            background: var(--card-bg, #fff);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        
        .wage-skeleton-section-title {
            width: 120px;
            height: 22px;
            margin-bottom: 16px;
        }
        
        .wage-skeleton-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
        }
        
        .wage-skeleton-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .wage-skeleton-label {
            width: 60px;
            height: 14px;
        }
        
        .wage-skeleton-value {
            width: 100%;
            height: 20px;
        }
        
        .wage-skeleton-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        
        .wage-skeleton-stat {
            text-align: center;
            padding: 16px;
            background: var(--bg-dark);
            border-radius: 8px;
        }
        
        .wage-skeleton-stat-value {
            width: 80px;
            height: 32px;
            margin: 0 auto 8px;
        }
        
        .wage-skeleton-stat-label {
            width: 60px;
            height: 14px;
            margin: 0 auto;
        }
        
        .wage-skeleton-table {
            width: 100%;
        }
        
        .wage-skeleton-table-header {
            display: flex;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 8px;
        }
        
        .wage-skeleton-th {
            height: 16px;
        }
        
        .wage-skeleton-row {
            display: flex;
            gap: 12px;
            padding: 10px 0;
        }
        
        .wage-skeleton-cell {
            height: 18px;
        }
        
        .wage-content-container {
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .wage-content-container.loading {
            opacity: 0;
        }
        
        @media (max-width: 768px) {
            .wage-skeleton-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .wage-skeleton-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>

    <!-- 骨架屏 -->
    <div class="wage-skeleton-container active" id="skeletonContainer">
        <div class="wage-skeleton-header">
            <div class="wage-skeleton-title skeleton"></div>
            <div class="wage-skeleton-actions">
                <div class="wage-skeleton-btn skeleton"></div>
                <div class="wage-skeleton-btn skeleton"></div>
            </div>
        </div>
        
        <div class="wage-skeleton-section">
            <div class="wage-skeleton-section-title skeleton"></div>
            <div class="wage-skeleton-grid">
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
            </div>
        </div>
        
        <div class="wage-skeleton-section">
            <div class="wage-skeleton-section-title skeleton"></div>
            <div class="wage-skeleton-grid">
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
                <div class="wage-skeleton-item"><div class="wage-skeleton-label skeleton"></div><div class="wage-skeleton-value skeleton"></div></div>
            </div>
        </div>
        
        <div class="wage-skeleton-section">
            <div class="wage-skeleton-section-title skeleton"></div>
            <div class="wage-skeleton-stats">
                <div class="wage-skeleton-stat"><div class="wage-skeleton-stat-value skeleton"></div><div class="wage-skeleton-stat-label skeleton"></div></div>
                <div class="wage-skeleton-stat"><div class="wage-skeleton-stat-value skeleton"></div><div class="wage-skeleton-stat-label skeleton"></div></div>
                <div class="wage-skeleton-stat"><div class="wage-skeleton-stat-value skeleton"></div><div class="wage-skeleton-stat-label skeleton"></div></div>
                <div class="wage-skeleton-stat"><div class="wage-skeleton-stat-value skeleton"></div><div class="wage-skeleton-stat-label skeleton"></div></div>
            </div>
        </div>
        
        <div class="wage-skeleton-section">
            <div class="wage-skeleton-section-title skeleton"></div>
            <div class="wage-skeleton-table">
                <div class="wage-skeleton-table-header">
                    <div class="wage-skeleton-th skeleton" style="width: 15%;"></div>
                    <div class="wage-skeleton-th skeleton" style="width: 15%;"></div>
                    <div class="wage-skeleton-th skeleton" style="width: 20%;"></div>
                    <div class="wage-skeleton-th skeleton" style="width: 20%;"></div>
                    <div class="wage-skeleton-th skeleton" style="width: 15%;"></div>
                    <div class="wage-skeleton-th skeleton" style="width: 15%;"></div>
                </div>
                <div class="wage-skeleton-row"><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div></div>
                <div class="wage-skeleton-row"><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div></div>
                <div class="wage-skeleton-row"><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 20%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div><div class="wage-skeleton-cell skeleton" style="width: 15%;"></div></div>
            </div>
        </div>
    </div>

    <!-- 实际内容 -->
    <div class="wage-content-container loading" id="contentContainer">

<main class="app-main">
    <div class="container">
        <!-- 页面标题 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-money-bill-wave"></i> 工人工资详情</h2>
                <div class="section-actions">
                    <button class="btn btn-primary btn-sm" onclick="showShareDialog()">
                        <i class="fas fa-share-alt"></i> 分享
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> 返回
                    </button>
                </div>
            </div>
        </div>

        <!-- 工人基本信息 -->
        <div class="section" id="personalInfoSection">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-user-circle"></i> 个人信息</h2>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">姓名</div>
                    <div class="info-value" id="workerName"><?php echo htmlspecialchars($workerData['name']); ?></div>
                </div>
                <div class="info-item">
                    <div class="info-label">电话</div>
                    <div class="info-value" id="workerPhone"><?php echo htmlspecialchars($workerData['phone']); ?></div>
                </div>
                <div class="info-item">
                    <div class="info-label">邮箱</div>
                    <div class="info-value" id="workerEmail"><?php echo htmlspecialchars($workerData['email']); ?></div>
                </div>
                <div class="info-item">
                    <div class="info-label">身份证号</div>
                    <div class="info-value" id="workerIdNumber"><?php echo htmlspecialchars($workerData['idNumber']); ?></div>
                </div>
            </div>
        </div>

        <!-- 工作设置 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-briefcase"></i> 工作设置</h2>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">工种</div>
                    <div class="info-value" id="workerType"><?php echo htmlspecialchars($workerData['job']); ?></div>
                </div>
                <div class="info-item">
                    <div class="info-label">员工类型</div>
                    <div class="info-value" id="employeeType"><?php echo $workerData['employeeType'] === 'fullTime' ? '全职' : '点工'; ?></div>
                </div>
                <div class="info-item">
                    <div class="info-label">休息制度</div>
                    <div class="info-value" id="restSystem">
                        <?php 
                        $restSystemMap = [
                            'doubleRest' => '双休',
                            'singleRest' => '单休',
                            'freeRest' => '自由休'
                        ];
                        echo $restSystemMap[$workerData['restSystem']] ?? '双休';
                        ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- 工资设置 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-money-bill-wave"></i> 工资设置</h2>
            </div>
            <div class="info-grid">
                <?php if ($workerData['employeeType'] === 'fullTime'): ?>
                <div class="info-item">
                    <div class="info-label">月工资</div>
                    <div class="info-value" id="monthlyWage">¥<?php echo number_format($workerData['monthlyWage'], 2); ?>/月</div>
                </div>
                <?php else: ?>
                <div class="info-item">
                    <div class="info-label">日工资</div>
                    <div class="info-value" id="workerWage">¥<?php echo number_format($workerData['wage'], 2); ?>/天</div>
                </div>
                <?php endif; ?>
                <div class="info-item">
                    <div class="info-label">加班倍率</div>
                    <div class="info-value" id="overtimeRate"><?php echo $workerData['overtimeRate']; ?>倍</div>
                </div>
                <div class="info-item">
                    <div class="info-label">工资计算方式</div>
                    <div class="info-value" id="wageCalculationMethod">
                        <?php 
                        $methodMap = [
                            'natural' => '按自然日（30天）',
                            'legal' => '按法定工作日（21.75天）',
                            'attendance' => '按标准工作日（26天）',
                            'currentMonth' => '按当月天数'
                        ];
                        echo $methodMap[$workerData['wageCalculationMethod']] ?? '按自然日（30天）';
                        ?>
                    </div>
                </div>
            </div>
            <?php if ($workerData['subsidySettings']): ?>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <div class="info-label" style="margin-bottom: 8px; font-weight: 600;">补贴设置</div>
                <div class="subsidy-info" style="display: flex; flex-wrap: wrap; gap: 12px;">
                    <?php 
                    $subsidy = $workerData['subsidySettings'];
                    $subsidyType = $subsidy['subsidyType'] ?? ($subsidy['type'] ?? 'none');
                    
                    if ($subsidyType !== 'none'):
                        $subsidyTypeMap = [
                            'daily' => '按天补贴',
                            'monthly' => '按月补贴',
                            'perMeal' => '按餐补贴'
                        ];
                    ?>
                    <span class="badge" style="background: var(--primary-light); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        <?php echo $subsidyTypeMap[$subsidyType] ?? '补贴'; ?>
                    </span>
                    <?php 
                        if ($subsidyType === 'daily'):
                    ?>
                    <span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        日补贴: ¥<?php echo number_format($subsidy['dailySubsidy'] ?? 0, 2); ?>/天
                    </span>
                    <?php elseif ($subsidyType === 'monthly'): ?>
                    <span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        月补贴: ¥<?php echo number_format($subsidy['monthlySubsidy'] ?? 0, 2); ?>/月
                    </span>
                    <?php elseif ($subsidyType === 'perMeal'): ?>
                    <span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        每餐补贴: ¥<?php echo number_format($subsidy['perMealSubsidy'] ?? 0, 2); ?>/餐
                    </span>
                    <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        每日餐数: <?php echo $subsidy['mealsPerDay'] ?? 2; ?>餐
                    </span>
                    <?php endif; ?>
                    
                    <?php 
                        // 显示补贴适用状态
                        $statuses = $subsidy['subsidyStatuses'] ?? ['present', 'half', 'holiday', 'rest'];
                        $statusLabels = [
                            'present' => '满勤',
                            'half' => '半天',
                            'holiday' => '放假',
                            'rest' => '休息'
                        ];
                        $statusTexts = [];
                        foreach ($statuses as $s) {
                            if (isset($statusLabels[$s])) {
                                $statusTexts[] = $statusLabels[$s];
                            }
                        }
                        if (!empty($statusTexts)):
                    ?>
                    <span class="badge" style="background: rgba(100, 116, 139, 0.1); color: #64748b; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                        适用: <?php echo implode('、', $statusTexts); ?>
                    </span>
                    <?php endif; ?>
                    <?php endif; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- 月份选择器 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-calendar-alt"></i> 月份选择</h2>
            </div>
            <div class="month-selector-wrapper" style="padding: 16px;">
                <!-- 年月显示和快速切换 -->
                <div class="month-selector" style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
                    <a href="?worker_id=<?php echo urlencode($workerId); ?>&year=<?php echo $selectedMonth == 1 ? $selectedYear - 1 : $selectedYear; ?>&month=<?php echo $selectedMonth == 1 ? 12 : $selectedMonth - 1; ?>" 
                       class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 20px;">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                    
                    <div class="current-month" style="font-size: 24px; font-weight: 700; color: var(--primary-color); min-width: 140px; text-align: center; letter-spacing: 1px;">
                        <?php echo $selectedYear; ?>.<?php echo $selectedMonthPadded; ?>
                    </div>
                    
                    <a href="?worker_id=<?php echo urlencode($workerId); ?>&year=<?php echo $selectedMonth == 12 ? $selectedYear + 1 : $selectedYear; ?>&month=<?php echo $selectedMonth == 12 ? 1 : $selectedMonth + 1; ?>" 
                       class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 20px;">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
                
                <!-- 日期选择器 -->
                <div class="date-picker-container" style="display: flex; justify-content: center;">
                    <form method="GET" action="" style="display: flex; align-items: center; gap: 8px; background: var(--bg-dark); padding: 8px 12px; border-radius: 12px;">
                        <?php if ($isShareLink): ?>
                        <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                        <?php else: ?>
                        <input type="hidden" name="worker_id" value="<?php echo htmlspecialchars($workerId); ?>">
                        <?php endif; ?>
                        <i class="fas fa-calendar" style="color: var(--text-secondary); font-size: 14px;"></i>
                        <input type="month" name="monthPicker" id="monthPicker" 
                               value="<?php echo $selectedYear . '-' . $selectedMonthPadded; ?>"
                               style="padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--bg-light); color: var(--text-color); cursor: pointer; appearance: none; -webkit-appearance: none;">
                        <button type="submit" class="btn btn-primary btn-sm" style="padding: 6px 14px; border-radius: 6px;">
                            查询
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- 本月工作记录 - 与主页格式一致 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-clipboard-list"></i> <?php echo $selectedMonth; ?>月工作记录</h2>
            </div>
            <div id="workTableContainer">
                <table class="work-table" style="width: 100%; border-collapse: collapse; border: 1px solid var(--border-color); background-color: var(--bg-light);">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-dark);">
                            <th style="width: 10%; padding: 8px; text-align: left; vertical-align: top;">日期</th>
                            <th style="width: 8%; padding: 8px; text-align: left; vertical-align: top;">星期</th>
                            <th style="width: 12%; padding: 8px; text-align: left; vertical-align: top;">状态</th>
                            <th style="width: 8%; padding: 8px; text-align: left; vertical-align: top;">工日</th>
                            <th style="width: 10%; padding: 8px; text-align: left; vertical-align: top;">日薪</th>
                            <th style="width: 52%; padding: 8px; text-align: left; vertical-align: top;">备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($workRecords)): ?>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                <i class="fas fa-calendar" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                                <p>本月暂无工作记录</p>
                            </td>
                        </tr>
                        <?php else: ?>
                        <?php foreach ($workRecords as $record): ?>
                        <tr style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-light); transition: background-color 0.2s ease;">
                            <td class="date-cell" style="vertical-align: top; padding: 8px;"><?php echo date('n', strtotime($record['date'])); ?>.<?php echo $record['day']; ?></td>
                            <td class="week-cell" style="vertical-align: top; padding: 8px;"><?php echo $record['weekDay']; ?></td>
                            <td style="vertical-align: top; padding: 8px;">
                                <span class="status-badge <?php echo $record['statusClass']; ?>"><?php echo $record['status']; ?></span>
                            </td>
                            <td style="vertical-align: top; padding: 8px;"><?php echo $record['workDay']; ?></td>
                            <td class="salary-cell" style="vertical-align: top; padding: 8px;">
                                <?php if ($record['basicSalary'] > 0): ?>
                                <div><strong>¥<?php echo number_format($record['basicSalary'], 2); ?></strong></div>
                                <?php endif; ?>
                                <?php if ($record['overtimeSalary'] > 0): ?>
                                <div class="text-xs text-warning" style="font-size: 12px; color: #ff9800;">加班: ¥<?php echo number_format($record['overtimeSalary'], 2); ?></div>
                                <?php endif; ?>
                                <?php if ($record['totalSalary'] > 0): ?>
                                <div class="text-xs text-success" style="font-size: 12px; color: #16a34a;">总计: ¥<?php echo number_format($record['totalSalary'], 2); ?></div>
                                <?php endif; ?>
                            </td>
                            <td class="note-cell" style="vertical-align: top; padding: 8px; background-color: transparent;">
                                <div style="width: 100%;">
                                    <?php if ($record['overtime'] > 0): ?>
                                    <div style="margin-bottom: 4px; font-weight: 500; color: #ff9800; transition: color 0.2s ease;"><?php echo $record['overtime']; ?>h 加班</div>
                                    <?php endif; ?>
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                                        <span class="note-text" style="flex: 1; margin-right: 10px; word-break: break-word; white-space: normal; overflow-wrap: break-word; line-height: 1.3;"><?php echo $record['remark'] ? htmlspecialchars($record['remark']) : '-'; ?></span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 工资统计 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chart-line"></i> 工资统计</h2>
            </div>
            <div class="stats-grid">
                <div class="stat-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%); color: white;">
                    <div class="stat-label" style="color: rgba(255,255,255,0.9);">实发工资</div>
                    <div class="stat-value" id="actualWage" style="font-size: 32px; font-weight: 700; color: white;">¥<?php echo number_format($wageData['actualWage'], 2); ?></div>
                    <div class="stat-change" id="actualWageFormula" style="color: rgba(255,255,255,0.8); font-size: 12px;">总工资+补贴+加班费</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">工作天数</div>
                    <div class="stat-value" id="workDays"><?php echo $wageData['workDays']; ?></div>
                    <div class="stat-change positive" id="workDaysDetail">天</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">加班小时</div>
                    <div class="stat-value" id="overtimeHours"><?php echo $wageData['overtimeHours']; ?></div>
                    <div class="stat-change positive">小时</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">加班费</div>
                    <div class="stat-value" id="overtimeWage">¥<?php echo number_format($wageData['overtimeWage'], 2); ?></div>
                    <div class="stat-change positive">元</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">补贴</div>
                    <div class="stat-value" id="subsidyWage">¥<?php echo number_format($wageData['subsidyWage'], 2); ?></div>
                    <div class="stat-change positive">元</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">总工资</div>
                    <div class="stat-value" id="totalWage">¥<?php echo number_format($wageData['totalWage'], 2); ?></div>
                    <div class="stat-change positive" id="totalWageFormula" style="font-size: 10px; color: var(--text-secondary);">日薪×计薪天数</div>
                </div>
            </div>
        </div>

        <!-- 报销记录 -->
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-receipt"></i> <?php echo $selectedMonth; ?>月报销记录</h2>
            </div>
            <?php if (!empty($reimbursements)): ?>
            <div class="reimbursement-list" style="display: flex; flex-direction: column; gap: 12px;">
                <?php foreach ($reimbursements as $r): ?>
                <div class="reimbursement-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div class="reimbursement-info">
                        <div class="reimbursement-title" style="font-weight: 600; color: var(--text-color);"><?php echo htmlspecialchars($r['title']); ?></div>
                        <div class="reimbursement-meta" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            <span><?php echo $r['date']; ?></span>
                            <?php if (!empty($r['remark'])): ?>
                            <span style="margin-left: 8px;">| <?php echo htmlspecialchars($r['remark']); ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="reimbursement-amount" style="font-weight: 600; color: #16a34a; font-size: 16px;">
                        ¥<?php echo number_format(floatval($r['amount']), 2); ?>
                    </div>
                </div>
                <?php endforeach; ?>
                <div class="reimbursement-total" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%); border: 1px solid rgba(22, 163, 74, 0.2); border-radius: 8px; margin-top: 8px;">
                    <div style="font-weight: 600; color: var(--text-color);">报销总额</div>
                    <div style="font-weight: 700; color: #16a34a; font-size: 20px;">¥<?php echo number_format($totalReimbursement, 2); ?></div>
                </div>
            </div>
            <?php else: ?>
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p style="margin: 0; font-size: 14px;">本月暂无报销记录</p>
            </div>
            <?php endif; ?>
        </div>
    </div>
</main>
    </div>

    <!-- 分享对话框 -->
    <div id="shareDialog" class="dialog-overlay" style="z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div class="dialog-content" style="background: var(--bg-light); border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px;"><i class="fas fa-share-alt"></i> 分享工资信息</h3>
                <button onclick="closeShareDialog()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-secondary);">&times;</button>
            </div>
            <div class="dialog-body">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">访问密码（可选）</label>
                    <input type="text" id="sharePassword" placeholder="不设置则无需密码" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-dark); color: var(--text-color); box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">有效期</label>
                    <select id="shareExpireDays" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-dark); color: var(--text-color); box-sizing: border-box;">
                        <option value="1">1天</option>
                        <option value="3">3天</option>
                        <option value="7" selected>7天</option>
                        <option value="15">15天</option>
                        <option value="30">30天</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">最大查看次数（可选）</label>
                    <input type="number" id="shareMaxViews" placeholder="不限制" min="1" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-dark); color: var(--text-color); box-sizing: border-box;">
                </div>
                <div id="shareResult" style="display: none; margin-top: 16px; padding: 12px; background: var(--bg-dark); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">分享链接：</div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="shareUrl" readonly style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-light); font-size: 12px;">
                        <button onclick="copyShareUrl()" class="btn btn-primary btn-sm" style="white-space: nowrap;">复制</button>
                    </div>
                    <div id="sharePasswordDisplay" style="display: none; margin-top: 8px; font-size: 12px; color: var(--text-secondary);"></div>
                </div>
            </div>
            <div class="dialog-footer" style="display: flex; gap: 12px; margin-top: 20px;">
                <button onclick="createShareLink()" class="btn btn-primary" style="flex: 1;">生成链接</button>
                <button onclick="closeShareDialog()" class="btn btn-secondary" style="flex: 1;">取消</button>
            </div>
        </div>
    </div>

<style>
/* 隐藏月份选择器的上下按钮 */
input[type="month"]::-webkit-calendar-picker-indicator {
    display: none;
}
input[type="month"]::-webkit-inner-spin-button,
input[type="month"]::-webkit-outer-spin-button {
    display: none;
}
input[type="month"] {
    -moz-appearance: textfield;
}

/* 工作记录表格样式 - 与主页一致 */
.work-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border-color);
    background-color: var(--bg-light);
}

.work-table th {
    background-color: var(--bg-dark);
    font-weight: 600;
    color: var(--text-secondary);
    padding: 8px;
    text-align: left;
    vertical-align: top;
}

.work-table td {
    padding: 8px;
    vertical-align: top;
    color: var(--text-color);
}

.work-table tbody tr {
    border-bottom: 1px solid var(--border-color);
    background-color: var(--bg-light);
    transition: background-color 0.2s ease;
}

.work-table tbody tr:hover {
    background-color: var(--bg-tertiary);
}

/* 状态标签样式 - 与主页一致 */
.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    margin-right: 8px;
}

.badge-present {
    background-color: rgba(34, 197, 94, 0.1);
    color: #16a34a;
}

.badge-half {
    background-color: rgba(234, 179, 8, 0.1);
    color: #ca8a04;
}

.badge-rest {
    background-color: rgba(100, 116, 139, 0.1);
    color: #64748b;
}

.badge-holiday {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.badge-absent {
    background-color: rgba(239, 68, 68, 0.1);
    color: #dc2626;
}

.badge-leave {
    background-color: rgba(245, 158, 11, 0.1);
    color: #d97706;
}

/* 日薪单元格样式 */
.salary-cell {
    vertical-align: top;
}

.text-xs {
    font-size: 12px;
}

.text-warning {
    color: #ff9800;
}

.text-success {
    color: #16a34a;
}

/* 备注单元格样式 */
.note-cell {
    vertical-align: top;
    background-color: transparent;
}

.note-text {
    flex: 1;
    margin-right: 10px;
    word-break: break-word;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.3;
}

/* 手机端适配 - 与主页一致 */
@media (max-width: 768px) {
    /* 确保头部按钮可点击 */
    .app-header {
        z-index: 100 !important;
    }
    
    .menu-btn {
        position: relative;
        z-index: 101 !important;
        pointer-events: auto !important;
    }
    
    .work-table {
        width: auto !important;
        min-width: 100% !important;
        table-layout: auto !important;
    }

    .work-table th {
        white-space: nowrap !important;
        font-size: 12px !important;
        padding: 4px 3px !important;
    }

    .work-table th:nth-child(3) {
        width: auto !important;
        min-width: 50px !important;
    }

    .work-table td {
        font-size: 12px !important;
        padding: 4px 6px !important;
    }

    .work-table td:nth-child(3) {
        width: auto !important;
        min-width: 50px !important;
        white-space: nowrap !important;
    }

    .status-badge {
        font-size: 10px !important;
        padding: 2px 6px !important;
        margin-right: 0 !important;
    }

    .salary-cell {
        font-size: 11px !important;
    }

    .salary-cell strong {
        font-size: 12px !important;
    }

    .text-xs {
        font-size: 10px !important;
    }
}
</style>

<script>
    // 异步加载脚本并初始化（与工头页保持一致）
    (async function() {
        const loadScript = (src) => new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.head.appendChild(script);
        });
        
        try {
            const version = window.appVersion || '1.0.0';
            
            // 检查核心脚本是否已加载
            const coreScriptsLoaded = window.eventBus && window.storage && window.toast && window.dialog;
            
            if (!coreScriptsLoaded) {
                // 并行加载所有核心脚本
                await Promise.all([
                    loadScript(`/jg/js-core/event-bus.js?v=${version}`),
                    loadScript(`/jg/js-core/logger.js?v=${version}`),
                    loadScript(`/jg/js-core/utils.js?v=${version}`),
                    loadScript(`/jg/js-core/storage.js?v=${version}`),
                    loadScript(`/jg/js-core/intelligent-storage.js?v=${version}`),
                    loadScript(`/jg/js-shared/theme.js?v=${version}`),
                    loadScript(`/jg/js-shared/login-icon.js?v=${version}`),
                    loadScript(`/jg/js-components/dialog.js?v=${version}`),
                    loadScript(`/jg/js-components/toast.js?v=${version}`)
                ]);
            }
            
            // 加载菜单处理器
            await loadScript(`/jg/js-shared/menu-handler.js?v=${version}`);
            
            const EventBus = window.EventBus || function() { return { on: () => {}, emit: () => {} }; };
            const IntelligentStorageManager = window.IntelligentStorageManager || function() { return { init: () => Promise.resolve(), setLocal: () => {}, getLocal: () => null }; };
            const Toast = window.Toast || function() { return { init: () => {}, error: () => {}, success: () => {} }; };
            const Dialog = window.Dialog || function() { return { init: () => {} }; };
            const Logger = window.Logger || { info: () => {}, error: () => {} };
            const ThemeManager = window.ThemeManager || function() { return { init: () => {} }; };
            
            const eventBus = window.eventBus || new EventBus();
            const storage = window.storage || new IntelligentStorageManager();
            const toast = window.toast || new Toast(eventBus);
            const dialog = window.dialog || new Dialog(eventBus);
            const theme = window.themeManager || new ThemeManager(storage, eventBus);
            
            if (!window.storage) {
                await storage.init();
                window.storage = storage;
            }
            if (!window.eventBus) window.eventBus = eventBus;
            if (!window.toast) { toast.init(); window.toast = toast; }
            if (!window.dialog) { dialog.init(); window.dialog = dialog; }
            if (!window.themeManager) { theme.init(); window.themeManager = theme; }
            if (window.loginIconManager) window.loginIconManager.init();
            
            // 初始化菜单处理器
            if (window.MenuHandler) {
                const menuHandler = new MenuHandler({
                    toast: window.toast,
                    logger: Logger
                });
                menuHandler.init();
            }
        } catch (e) {
            console.error('页面初始化失败:', e);
        }
        
        // 隐藏骨架屏，显示实际内容
        const skeletonContainer = document.getElementById('skeletonContainer');
        const contentContainer = document.getElementById('contentContainer');
        if (skeletonContainer) skeletonContainer.classList.remove('active');
        if (contentContainer) contentContainer.classList.remove('loading');
    })();

    // 分享功能
    const workerId = '<?php echo htmlspecialchars($workerId); ?>';
    const csrfToken = '<?php echo generate_csrf_token(); ?>';

    function showShareDialog() {
        console.log('showShareDialog called');
        const dialog = document.getElementById('shareDialog');
        console.log('dialog element:', dialog);
        if (dialog) {
            dialog.classList.add('dialog-overlay-show');
            document.getElementById('shareResult').style.display = 'none';
            document.getElementById('sharePassword').value = '';
            document.getElementById('shareMaxViews').value = '';
            document.getElementById('shareExpireDays').value = '7';
        } else {
            console.error('shareDialog element not found');
        }
    }

    function closeShareDialog() {
        const dialog = document.getElementById('shareDialog');
        if (dialog) {
            dialog.classList.remove('dialog-overlay-show');
        }
    }

    async function createShareLink() {
        const password = document.getElementById('sharePassword').value;
        const expireDays = parseInt(document.getElementById('shareExpireDays').value);
        const maxViews = document.getElementById('shareMaxViews').value;

        try {
            const response = await fetch('/jg/api/share-link.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    worker_id: workerId,
                    password: password || null,
                    expire_days: expireDays,
                    max_views: maxViews ? parseInt(maxViews) : null,
                    csrf_token: csrfToken
                })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('shareUrl').value = data.data.share_url;
                document.getElementById('shareResult').style.display = 'block';

                const passwordDisplay = document.getElementById('sharePasswordDisplay');
                if (data.data.has_password) {
                    passwordDisplay.textContent = '密码：' + password;
                    passwordDisplay.style.display = 'block';
                } else {
                    passwordDisplay.style.display = 'none';
                }

                if (window.toast) {
                    window.toast.success('分享链接已生成');
                }
            } else {
                if (window.toast) {
                    window.toast.error(data.error || '生成分享链接失败');
                } else {
                    alert(data.error || '生成分享链接失败');
                }
            }
        } catch (error) {
            console.error('创建分享链接失败:', error);
            if (window.toast) {
                window.toast.error('创建分享链接失败');
            } else {
                alert('创建分享链接失败');
            }
        }
    }

    function copyShareUrl() {
        const shareUrl = document.getElementById('shareUrl');
        shareUrl.select();
        document.execCommand('copy');

        if (window.toast) {
            window.toast.success('链接已复制到剪贴板');
        } else {
            alert('链接已复制到剪贴板');
        }
    }

    // 点击遮罩层关闭对话框
    document.getElementById('shareDialog').addEventListener('click', function(e) {
        if (e.target === this) {
            closeShareDialog();
        }
    });
</script>

<?php
include 'menu.php';
include 'footer.php';
?>
</body>
</html>
