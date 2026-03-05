<?php
// 获取备份列表API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$backupsDir = __DIR__ . '/../backups';
$backups = [];

// 检查备份目录是否存在
if (is_dir($backupsDir)) {
    $files = scandir($backupsDir);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        $filePath = $backupsDir . '/' . $file;
        if (is_file($filePath) && pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
            $backups[] = [
                'name' => $file,
                'size' => filesize($filePath),
                'modified' => date('Y-m-d H:i:s', filemtime($filePath))
            ];
        }
    }
    
    // 按修改时间排序，最新的在前面
    usort($backups, function($a, $b) {
        return strtotime($b['modified']) - strtotime($a['modified']);
    });
}

echo json_encode([
    'success' => true,
    'backups' => $backups,
    'count' => count($backups)
]);
?>