<?php
/**
 * 批量更新用户信息
 * 用于一次性更新多个字段，减少请求次数
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../includes/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['user_id'])) {
        echo json_encode(['success' => false, 'error' => '缺少用户ID']);
        exit;
    }
    
    $userId = $data['user_id'];
    $db = db_connect();
    
    // 定义可更新的字段
    $allowedFields = ['name', 'job', 'wage', 'monthlyWage', 'overtimeRate', 'employeeType', 'restSystem', 'wageCalculationMethod'];
    
    // 构建更新SQL
    $updates = [];
    $params = [];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = :$field";
            $params[":$field"] = $data[$field];
        }
    }
    
    if (empty($updates)) {
        echo json_encode(['success' => true, 'message' => '没有需要更新的字段']);
        exit;
    }
    
    // 添加user_id到参数
    $params[':user_id'] = $userId;
    
    // 执行更新
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :user_id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode(['success' => true, 'message' => '更新成功']);
    
} catch (Exception $e) {
    error_log('批量更新用户信息失败: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => '更新失败']);
}
?>
