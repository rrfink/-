<?php
// 安装分享链接表
require_once 'includes/db.php';

try {
    $db = db_connect();
    
    // 创建分享链接表
    $sql = "
        CREATE TABLE IF NOT EXISTS share_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            share_token VARCHAR(32) UNIQUE NOT NULL,
            worker_id VARCHAR(50) NOT NULL,
            created_by VARCHAR(50) NOT NULL,
            password_hash VARCHAR(255),
            expires_at DATETIME NOT NULL,
            view_count INTEGER DEFAULT 0,
            max_views INTEGER DEFAULT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ";
    $db->exec($sql);
    
    // 创建索引
    $db->exec("CREATE INDEX IF NOT EXISTS idx_share_token ON share_links(share_token)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_worker_id ON share_links(worker_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_expires_at ON share_links(expires_at)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_is_active ON share_links(is_active)");
    
    echo "分享链接表创建成功！\n";
} catch (PDOException $e) {
    echo "创建表失败: " . $e->getMessage() . "\n";
}
