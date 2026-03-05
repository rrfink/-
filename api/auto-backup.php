<?php
// 自动备份脚本
// 该脚本用于定时执行数据库备份，根据系统设置的备份频率和时间

// 设置错误报告
ini_set('display_errors', 0);
error_reporting(E_ALL);

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 包含数据库连接文件
include __DIR__ . '/../includes/db.php';

// 日志文件路径
$logFile = __DIR__ . '/../logs/auto-backup.log';

// 日志函数
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    echo $logEntry;
}

// 加载系统设置
function loadSettings() {
    try {
        // 从数据库加载设置
        $db = db_connect();
        $stmt = $db->prepare("SELECT settings FROM system_settings WHERE id = 1");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['settings']) {
            return json_decode($result['settings'], true);
        }
        
        // 从localStorage模拟加载（如果数据库中没有）
        $localStorageFile = __DIR__ . '/../database/localStorage.json';
        if (file_exists($localStorageFile)) {
            $localStorage = json_decode(file_get_contents($localStorageFile), true);
            if (isset($localStorage['systemSettings'])) {
                return json_decode($localStorage['systemSettings'], true);
            }
        }
        
    } catch (Exception $e) {
        logMessage('加载设置失败: ' . $e->getMessage());
    }
    
    // 默认设置
    return [
        'autoBackupEnabled' => true,
        'backupFrequency' => 'weekly',
        'backupTime' => '02:00',
        'backupRetention' => 2
    ];
}

// 检查是否应该执行备份
function shouldBackup($settings) {
    // 检查是否启用自动备份
    if (!$settings['autoBackupEnabled']) {
        return false;
    }
    
    // 检查当前时间是否匹配备份时间
    $currentTime = date('H:i');
    if ($currentTime !== $settings['backupTime']) {
        return false;
    }
    
    // 检查是否到达备份频率
    $currentDate = date('Y-m-d');
    $currentDayOfWeek = date('w'); // 0 = 周日, 6 = 周六
    $currentDayOfMonth = date('j');
    
    switch ($settings['backupFrequency']) {
        case 'daily':
            return true; // 每天备份
        case 'weekly':
            return $currentDayOfWeek === 0; // 每周日备份
        case 'monthly':
            return $currentDayOfMonth === 1; // 每月1号备份
        default:
            return false;
    }
}

// 清理旧备份
function cleanupOldBackups($retention) {
    $backupDir = __DIR__ . '/../backups';
    
    if (!is_dir($backupDir)) {
        return;
    }
    
    // 获取所有备份文件
    $files = glob($backupDir . '/backup_*.sql');
    
    // 按修改时间排序（最新的在前）
    usort($files, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    // 删除超出保留数量的备份
    if (count($files) > $retention) {
        $filesToDelete = array_slice($files, $retention);
        foreach ($filesToDelete as $file) {
            if (unlink($file)) {
                logMessage('已删除旧备份: ' . basename($file));
            } else {
                logMessage('删除旧备份失败: ' . basename($file));
            }
        }
    }
}

// 主函数
function main($forceBackup = false) {
    logMessage('开始执行自动备份');
    
    // 加载设置
    $settings = loadSettings();
    logMessage('加载设置: ' . json_encode($settings));
    
    // 检查是否应该备份
    if (!$forceBackup && !shouldBackup($settings)) {
        logMessage('未到达备份时间，跳过备份');
        return;
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
        
        logMessage('备份成功: ' . $backupFileName . ' (' . filesize($backupFilePath) . ' bytes)');
        
        // 清理旧备份
        cleanupOldBackups($settings['backupRetention']);
        
    } catch (Exception $e) {
        logMessage('备份失败: ' . $e->getMessage());
    }
    
    logMessage('自动备份执行完成');
}

// 执行主函数
$forceBackup = isset($argv[1]) && $argv[1] === 'force';
main($forceBackup);
?>