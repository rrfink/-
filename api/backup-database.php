<?php
// 数据库备份API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// 包含数据库连接文件
include '../includes/db.php';

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error' => '只支持 POST 请求'
    ]);
    exit;
}

try {
    // 生成备份SQL
    $sql = db_backup();
    
    // 生成备份文件名
    $backupFileName = 'backup_' . date('Ymd_His') . '.sql';
    $backupFilePath = __DIR__ . '/../backups/' . $backupFileName;
    
    // 确保备份目录存在
    if (!is_dir(__DIR__ . '/../backups')) {
        mkdir(__DIR__ . '/../backups', 0755, true);
    }
    
    // 写入备份文件
    file_put_contents($backupFilePath, $sql);
    
    // 返回备份信息
    echo json_encode([
        'success' => true,
        'message' => '数据库备份成功',
        'backup_file' => $backupFileName,
        'backup_size' => filesize($backupFilePath),
        'backup_time' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => '备份失败: ' . $e->getMessage()
    ]);
}
?>