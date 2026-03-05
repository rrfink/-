<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

include_once __DIR__ . '/../includes/db.php';

try {
    $db = db_connect();
    
    // 检查reimbursements表是否存在
    $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='reimbursements'");
    $tableExists = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tableExists) {
        // 如果表不存在，返回空数据
        echo json_encode(['success' => true, 'expenses' => []]);
        exit;
    }
    
    // 获取所有报销数据
    $stmt = $db->query("SELECT * FROM reimbursements");
    $expenses = [];
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $expenses[] = [
            'id' => $row['id'],
            'user_id' => $row['user_id'],
            'title' => $row['title'],
            'amount' => (float)$row['amount'],
            'date' => $row['date'],
            'remark' => $row['remark'],
            'image' => $row['image'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
    
    echo json_encode(['success' => true, 'expenses' => $expenses]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => '服务器错误: ' . $e->getMessage()]);
}
?>