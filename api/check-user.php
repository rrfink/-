<?php
header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

$databasePath = __DIR__ . '/../database.db';

try {
    if (!file_exists($databasePath)) {
        echo json_encode(['success' => false, 'message' => '数据库文件不存在']);
        exit;
    }
    
    $db = new PDO('sqlite:' . $databasePath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $userId = $data['id'] ?? '';
    
    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => '用户ID不能为空']);
        exit;
    }
    
    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'exists' => !empty($row)
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>