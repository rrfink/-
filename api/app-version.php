<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../includes/db.php';

try {
    $db = db_connect();

    // 创建版本号表（如果不存在）
    $db->exec("CREATE TABLE IF NOT EXISTS app_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL DEFAULT '1.0.0',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 插入默认版本号（如果不存在）
    $stmt = $db->prepare("INSERT OR IGNORE INTO app_version (id, version) VALUES (1, '1.0.0')");
    $stmt->execute();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // 获取版本号
        $stmt = $db->prepare("SELECT version FROM app_version WHERE id = 1");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'version' => $result['version'] ?? '1.0.0'
        ]);
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // 更新版本号
        $data = json_decode(file_get_contents('php://input'), true);
        $newVersion = $data['version'] ?? null;

        if (!$newVersion) {
            echo json_encode([
                'success' => false,
                'message' => '版本号不能为空'
            ]);
            exit;
        }

        // 验证版本号格式（简单的语义化版本号）
        if (!preg_match('/^\d+\.\d+\.\d+$/', $newVersion)) {
            echo json_encode([
                'success' => false,
                'message' => '版本号格式不正确，应为 x.y.z 格式（如 1.0.0）'
            ]);
            exit;
        }

        $stmt = $db->prepare("UPDATE app_version SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1");
        $stmt->execute([$newVersion]);

        echo json_encode([
            'success' => true,
            'message' => '版本号更新成功',
            'version' => $newVersion
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => '数据库错误: ' . $e->getMessage()
    ]);
}
