<?php
header('Content-Type: application/json');

// 数据库连接
$dbPath = __DIR__ . '/../database.db';
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 获取用户ID
$userId = isset($_GET['user_id']) ? $_GET['user_id'] : null;

if (!$userId) {
    echo json_encode(['success' => false, 'error' => '用户ID不能为空']);
    exit;
}

try {
    // 查询用户基本信息
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'error' => '用户不存在']);
        exit;
    }
    
    // 查询用户个人信息
    $stmt = $pdo->prepare('SELECT * FROM personalInfo WHERE user_id = ?');
    $stmt->execute([$userId]);
    $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    
    // 解析补贴设置
    $subsidySettings = [];
    if (!empty($personalInfo['subsidySettings'])) {
        $subsidySettings = json_decode($personalInfo['subsidySettings'], true) ?: [];
    }
    
    // 合并用户信息
    $userInfo = [
        'id' => $user['id'],
        'phone' => $user['phone'],
        'name' => $personalInfo['name'] ?? '未设置',
        'email' => $personalInfo['email'] ?? '未设置',
        'idNumber' => $personalInfo['idNumber'] ?? '未设置',
        'job' => $personalInfo['job'] ?? '未设置',
        'wage' => $personalInfo['wage'] ?? 0,
        'monthlyWage' => $personalInfo['monthlyWage'] ?? 0,
        'overtimeRate' => $personalInfo['overtimeRate'] ?? 0,
        'employeeType' => $personalInfo['employeeType'] ?? 'fullTime',
        'restSystem' => $personalInfo['restSystem'] ?? 'doubleRest',
        'wageCalculationMethod' => $personalInfo['wageCalculationMethod'] ?? 'natural',
        'subsidyType' => $subsidySettings['subsidyType'] ?? 'none',
        'monthlySubsidy' => $subsidySettings['monthlySubsidy'] ?? 0,
        'dailySubsidy' => $subsidySettings['dailySubsidy'] ?? 0,
        'perMealSubsidy' => $subsidySettings['perMealSubsidy'] ?? 0,
        'mealsPerDay' => $subsidySettings['mealsPerDay'] ?? 2,
        'subsidyStatuses' => $subsidySettings['subsidyStatuses'] ?? ['present', 'half', 'holiday', 'rest']
    ];
    
    echo json_encode(['success' => true, 'user' => $userInfo]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => '获取用户信息失败: ' . $e->getMessage()]);
}
?>