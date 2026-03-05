<?php
/**
 * 导出服务器数据库中的考勤数据为JSON
 */

header('Content-Type: application/json; charset=utf-8');

// 包含数据库连接
include 'includes/db.php';

try {
    $db = db_connect();
    
    // 获取所有考勤数据
    $stmt = $db->query("SELECT * FROM attendance ORDER BY date DESC");
    $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 获取所有项目数据
    $stmt = $db->query("SELECT * FROM projects ORDER BY created_at DESC");
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 获取所有节假日数据
    $stmt = $db->query("SELECT * FROM holidays ORDER BY date DESC");
    $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 获取所有个人信息
    $stmt = $db->query("SELECT * FROM personalInfo LIMIT 1");
    $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'attendance' => $attendance,
            'projects' => $projects,
            'holidays' => $holidays,
            'personalInfo' => $personalInfo
        ],
        'counts' => [
            'attendance' => count($attendance),
            'projects' => count($projects),
            'holidays' => count($holidays)
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>