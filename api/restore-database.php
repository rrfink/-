<?php
// 数据库恢复API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error' => '只支持 POST 请求'
    ]);
    exit;
}

// 检查是否有文件上传
if (!isset($_FILES['backup_file'])) {
    echo json_encode([
        'success' => false,
        'error' => '请选择备份文件'
    ]);
    exit;
}

$backupFile = $_FILES['backup_file'];

// 检查文件类型
$allowedExtensions = ['sql'];
$fileExtension = strtolower(pathinfo($backupFile['name'], PATHINFO_EXTENSION));
if (!in_array($fileExtension, $allowedExtensions)) {
    echo json_encode([
        'success' => false,
        'error' => '只支持 .sql 文件'
    ]);
    exit;
}

// 检查文件是否上传成功
if ($backupFile['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'success' => false,
        'error' => '文件上传失败'
    ]);
    exit;
}

try {
    // 读取备份文件内容
    $sql = file_get_contents($backupFile['tmp_name']);
    
    // 包含数据库连接文件
    include '../includes/db.php';
    
    // 恢复数据库
    db_restore($sql);
    
    // 返回恢复信息
    echo json_encode([
        'success' => true,
        'message' => '数据库恢复成功',
        'restore_time' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => '恢复失败: ' . $e->getMessage()
    ]);
}
?>