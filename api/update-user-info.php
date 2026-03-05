<?php
header('Content-Type: application/json');

// 数据库连接
$dbPath = __DIR__ . '/../database.db';
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);

// 验证必要参数
if (!isset($data['user_id']) || !isset($data['field']) || !isset($data['value'])) {
    echo json_encode(['success' => false, 'error' => '缺少必要参数']);
    exit;
}

$userId = $data['user_id'];
$field = $data['field'];
$value = $data['value'];

// 映射字段名到数据库列名
$fieldMapping = [
    'name' => 'name',
    'email' => 'email',
    'phone' => 'phone',
    'idNumber' => 'idNumber',
    'job' => 'job',
    'wage' => 'wage',
    'monthlyWage' => 'monthlyWage',
    'overtimeRate' => 'overtimeRate',
    'subsidySettings' => 'subsidySettings',
    'employeeType' => 'employeeType',
    'restSystem' => 'restSystem',
    'wageCalculationMethod' => 'wageCalculationMethod'
];

if (!isset($fieldMapping[$field])) {
    echo json_encode(['success' => false, 'error' => '无效的字段名']);
    exit;
}

$dbField = $fieldMapping[$field];

try {
    // 检查用户是否存在
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => '用户不存在']);
        exit;
    }
    
    // 处理不同表的字段
    if ($field === 'phone') {
        // phone字段在users表中
        $sql = "UPDATE users SET $dbField = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$value, $userId]);
    } else {
        // 其他字段在personalInfo表中
        // 检查personalInfo表中是否已有该用户的记录
        $stmt = $pdo->prepare('SELECT id FROM personalInfo WHERE user_id = ?');
        $stmt->execute([$userId]);
        $personalInfoExists = $stmt->fetch();
        
        if ($personalInfoExists) {
            // 更新现有记录
            $sql = "UPDATE personalInfo SET $dbField = ? WHERE user_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$value, $userId]);
        } else {
            // 插入新记录
            $sql = "INSERT INTO personalInfo (user_id, $dbField) VALUES (?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $value]);
        }
    }
    
    echo json_encode(['success' => true, 'message' => '个人信息更新成功']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => '更新个人信息失败: ' . $e->getMessage()]);
}
?>