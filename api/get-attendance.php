<?php
// 获取考勤记录

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

// 连接数据库
try {
    $db = db_connect();
    
    // 获取月份参数，默认当前月份
    $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
    
    // 构建查询条件
    $whereClause = "WHERE date LIKE :month";
    $params = [':month' => $month . '%'];
    
    // 查询考勤记录
    $stmt = $db->prepare("SELECT id, user_id, projectId, date, status, remark, overtime, checkIn, checkOut, created_at FROM attendance $whereClause ORDER BY date DESC");
    $stmt->execute($params);
    $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 返回考勤记录
    echo json_encode([
        'success' => true,
        'attendance' => $attendance,
        'count' => count($attendance),
        'currentMonth' => $month
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>