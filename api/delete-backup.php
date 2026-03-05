<?php
// 删除备份文件

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error' => '只支持 POST 请求'
    ]);
    exit;
}

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['backupName'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少备份文件名'
    ]);
    exit;
}

$backupName = $data['backupName'];

// 备份目录
$backupDir = '../backups/';

// 验证备份文件是否存在
$backupPath = $backupDir . $backupName;
if (!file_exists($backupPath)) {
    echo json_encode([
        'success' => false,
        'error' => '备份文件不存在'
    ]);
    exit;
}

// 验证文件是否在备份目录中（防止路径遍历攻击）
if (realpath($backupPath) !== realpath($backupDir . basename($backupName))) {
    echo json_encode([
        'success' => false,
        'error' => '无效的备份文件名'
    ]);
    exit;
}

// 删除备份文件
try {
    if (unlink($backupPath)) {
        echo json_encode([
            'success' => true,
            'message' => '备份删除成功'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => '删除备份文件失败'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => '删除备份文件时发生错误: ' . $e->getMessage()
    ]);
}
?>