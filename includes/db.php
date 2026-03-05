<?php
// 防止重复包含
if (!defined('DB_PHP_INCLUDED')) {
    define('DB_PHP_INCLUDED', true);
}

// SQLite数据库连接函数
function db_connect() {
    $dbPath = __DIR__ . '/../database.db';
    try {
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec("PRAGMA foreign_keys = ON");
        return $db;
    } catch (PDOException $e) {
        die("数据库连接失败: " . $e->getMessage());
    }
}

// 数据库管理函数
function db_backup($filename = null) {
    if (!$filename) {
        $filename = 'backup_' . date('Ymd_His') . '.sql';
    }
    
    $db = db_connect();
    $tables = [];
    $result = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        $tables[] = $row['name'];
    }
    
    $sql = "-- Database Backup\n";
    $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: SQLite\n\n";
    
    foreach ($tables as $table) {
        // 导出表结构
        $result = $db->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='$table'");
        $row = $result->fetch(PDO::FETCH_ASSOC);
        $sql .= "\n-- Table structure for table `$table`\n";
        $sql .= "DROP TABLE IF EXISTS `$table`;\n";
        $sql .= $row['sql'] . ";\n\n";
        
        // 导出数据
        $result = $db->query("SELECT * FROM `$table`");
        $columns = $result->columnCount();
        $columnNames = [];
        for ($i = 0; $i < $columns; $i++) {
            $meta = $result->getColumnMeta($i);
            $columnNames[] = $meta['name'];
        }
        
        $rows = $result->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) > 0) {
            $sql .= "-- Dumping data for table `$table`\n";
            
            foreach ($rows as $row) {
                $values = array_map(function($value) use ($db) {
                    if ($value === null) {
                        return 'NULL';
                    }
                    return $db->quote($value);
                }, $row);
                
                $sql .= "INSERT INTO `$table` (`" . implode('`, `', $columnNames) . "`) VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }
    }
    
    return $sql;
}

function db_restore($sql) {
    $dbPath = __DIR__ . '/../database.db';
    try {
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $db->exec("PRAGMA foreign_keys = OFF");
        
        $queries = explode(';', $sql);
        
        foreach ($queries as $query) {
            $query = trim($query);
            if (!empty($query)) {
                try {
                    $db->exec($query);
                } catch (PDOException $e) {
                    error_log("SQL Error: " . $e->getMessage());
                    error_log("Query: " . $query);
                }
            }
        }
        
        $db->exec("PRAGMA foreign_keys = ON");
        
        return true;
    } catch (PDOException $e) {
        throw new Exception("恢复失败: " . $e->getMessage());
    }
}

// 获取数据库信息
function db_info() {
    $dbPath = __DIR__ . '/../database.db';
    $info = [];
    $info['path'] = $dbPath;
    $info['size'] = filesize($dbPath);
    
    $db = db_connect();
    $result = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    $info['tables'] = $result->fetchAll(PDO::FETCH_COLUMN);
    
    return $info;
}

// CSRF保护功能
function generate_csrf_token() {
    // 确保session已启动
    if (!isset($_SESSION)) {
        session_start();
    }
    
    // 如果已有有效token，复用它
    if (isset($_SESSION['csrf_token']) && !empty($_SESSION['csrf_token'])) {
        return $_SESSION['csrf_token'];
    }
    
    // 生成新的随机令牌
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

function validate_csrf_token($token) {
    if (!isset($_SESSION)) {
        session_start();
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

function get_csrf_token() {
    if (!isset($_SESSION)) {
        session_start();
    }
    
    if (!isset($_SESSION['csrf_token'])) {
        return generate_csrf_token();
    }
    
    return $_SESSION['csrf_token'];
}