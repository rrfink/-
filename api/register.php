<?php
// 处理用户注册请求

// 包含工具文件
include '../includes/api-utils.php';
include '../includes/db.php';

// 设置响应头
setApiHeaders();

// 启动会话
session_start();

// 检查请求方法
if (!isPostRequest()) {
    sendResponse(false, null, '只支持 POST 请求');
}

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);

// 清理输入数据
$data = sanitizeInput($data);

// 验证请求数据
if (!validateRequestData($data, ['phone', 'password', 'csrf_token'])) {
    sendResponse(false, null, '缺少必要的注册信息');
}

// 验证CSRF令牌
if (!validate_csrf_token($data['csrf_token'])) {
    sendResponse(false, null, '无效的CSRF令牌');
}

$name = trim($data['name'] ?? '');
if (empty($name)) {
    $name = $data['phone'];
}
$phone = trim($data['phone']);
$password = $data['password'];

// 验证手机号格式
if (!validatePhone($phone)) {
    sendResponse(false, null, '手机号格式不正确');
}

// 验证密码长度
if (!validatePassword($password)) {
    sendResponse(false, null, '密码长度至少为6位');
}

// 生成基于手机号的固定用户ID
function generateUserId($phone) {
    return $phone;
}

// 初始化数据库表
function initDatabaseSimple($db) {
    try {
        // 启用外键约束
        $db->exec("PRAGMA foreign_keys = ON");
        
        // 创建用户表
        $db->exec("CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // 为现有表添加name字段（如果不存在）
        try {
            // 首先检查表结构
            $stmt = $db->query("PRAGMA table_info(users)");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $hasNameColumn = false;
            foreach ($columns as $column) {
                if ($column['name'] === 'name') {
                    $hasNameColumn = true;
                    break;
                }
            }
            
            if (!$hasNameColumn) {
                $db->exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
            }
        } catch (Exception $e) {
            // 列已存在或其他错误，忽略
        }

        // 创建管理员表
        $db->exec("CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");

        // 添加默认管理员账号
        $db->exec("INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', 'admin123')");

        // 创建项目表
        $db->exec("CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            description TEXT,
            `order` INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建考勤表
        $db->exec("CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            date TEXT NOT NULL,
            clockIn TEXT,
            clockOut TEXT,
            workHours REAL DEFAULT 0,
            restHours REAL DEFAULT 0,
            overtimeHours REAL DEFAULT 0,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建联系人表
        $db->exec("CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            name TEXT NOT NULL,
            phone TEXT,
            position TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建个人信息表
        $db->exec("CREATE TABLE IF NOT EXISTS personalInfo (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT,
            job TEXT,
            employeeType TEXT DEFAULT 'fullTime',
            restSystem TEXT DEFAULT 'doubleRest',
            wage REAL DEFAULT 0,
            monthlyWage REAL DEFAULT 0,
            wageCalculationMethod TEXT DEFAULT 'natural',
            overtimeRate REAL DEFAULT 0,
            subsidySettings TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建工资历史表
        $db->exec("CREATE TABLE IF NOT EXISTS wageHistory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            year INTEGER,
            month INTEGER,
            days INTEGER DEFAULT 0,
            hours REAL DEFAULT 0,
            wage REAL DEFAULT 0,
            overtimeWage REAL DEFAULT 0,
            totalWage REAL DEFAULT 0,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建节假日表
        $db->exec("CREATE TABLE IF NOT EXISTS holidays (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            date TEXT NOT NULL,
            name TEXT,
            type TEXT DEFAULT 'holiday',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建用户设置表
        $db->exec("CREATE TABLE IF NOT EXISTS userSettings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建索引以提高查询性能
        $db->exec("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_attendance_projectId ON attendance(projectId)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_contacts_projectId ON contacts(projectId)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_personalInfo_user_id ON personalInfo(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_wageHistory_user_id ON wageHistory(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_holidays_user_id ON holidays(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_holidays_projectId ON holidays(projectId)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_userSettings_user_id ON userSettings(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_userSettings_key ON userSettings(key)");
    } catch (PDOException $e) {
        // 忽略错误，表可能已经存在
    }
}

// 连接数据库
try {
    $db = db_connect();
    
    // 初始化数据库
    initDatabaseSimple($db);
    
    // 检查用户是否已存在
    $stmt = $db->prepare("SELECT id FROM users WHERE phone = :phone");
    $stmt->bindParam(':phone', $phone);
    $stmt->execute();
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingUser) {
        // 用户已存在
        sendResponse(false, null, '用户已存在');
    } else {
        // 生成用户ID
        $userId = generateUserId($phone);
        
        // 用户不存在，注册新用户
        try {
            // 尝试使用包含name字段的插入语句
            $stmt = $db->prepare("INSERT INTO users (id, name, phone, password) VALUES (:id, :name, :phone, :password)");
            $stmt->bindParam(':id', $userId);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':password', $password);
            $stmt->execute();
        } catch (PDOException $e) {
            // 如果失败（可能是因为name字段不存在），尝试不包含name字段的插入语句
            $stmt = $db->prepare("INSERT INTO users (id, phone, password) VALUES (:id, :phone, :password)");
            $stmt->bindParam(':id', $userId);
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':password', $password);
            $stmt->execute();
        }
        
        // 同时在personalInfo表中创建记录，存储姓名
        try {
            $stmt = $db->prepare("INSERT OR IGNORE INTO personalInfo (id, user_id, name) VALUES (:id, :user_id, :name)");
            $personalInfoId = 'personal_' . $userId;
            $stmt->bindParam(':id', $personalInfoId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':name', $name);
            $stmt->execute();
        } catch (PDOException $e) {
            // 忽略错误，personalInfo表可能不存在
        }
        
        // 注册成功
        sendResponse(true, [
            'user' => [
                'id' => $userId,
                'name' => $name,
                'phone' => $phone
            ]
        ]);
    }
    
} catch (PDOException $e) {
    sendResponse(false, null, '数据库错误: ' . $e->getMessage());
}
?>