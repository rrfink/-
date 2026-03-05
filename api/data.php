<?php
// 数据管理API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

// 启动会话
session_start();

// 包含数据库连接文件
include '../includes/db.php';
include '../includes/api-utils.php';

// 初始化数据库表
function initDatabase($db) {
    try {
        // 启用外键约束
        $db->exec("PRAGMA foreign_keys = ON");
        
        // 创建用户表
        $db->exec("CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'worker',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // 为现有用户表添加role字段
        try {
            $db->exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'worker'");
        } catch (Exception $e) {
            // 列已存在，忽略错误
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
        

        
        // 为现有表添加缺失的列
        try {
            // 添加personalInfo列
            $db->exec("ALTER TABLE projects ADD COLUMN personalInfo TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        
        try {
            // 添加workHours列
            $db->exec("ALTER TABLE projects ADD COLUMN workHours TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        
        try {
            // 添加createdAt列
            $db->exec("ALTER TABLE projects ADD COLUMN createdAt TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        
        try {
            // 添加updatedAt列
            $db->exec("ALTER TABLE projects ADD COLUMN updatedAt TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        
        try {
            // 添加isEnded列
            $db->exec("ALTER TABLE projects ADD COLUMN isEnded INTEGER DEFAULT 0");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }

        // 创建考勤表
        $db->exec("CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            checkIn TEXT,
            checkOut TEXT,
            remark TEXT,
            overtime REAL DEFAULT 0,
            overtimeType TEXT DEFAULT 'weekday',
            updatedAt TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");
        
        // 为attendance表添加缺失的列
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN status TEXT NOT NULL DEFAULT 'normal'");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN checkIn TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN checkOut TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN remark TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN overtime REAL DEFAULT 0");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN overtimeType TEXT DEFAULT 'weekday'");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE attendance ADD COLUMN updatedAt TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }

        // 创建联系人表
        $db->exec("CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            job TEXT,
            note TEXT,
            projectId TEXT,
            updatedAt INTEGER,
            createdAt INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");
        
        // 为contacts表添加缺失的列
        try {
            $db->exec("ALTER TABLE contacts ADD COLUMN job TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE contacts ADD COLUMN note TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE contacts ADD COLUMN projectId TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE contacts ADD COLUMN updatedAt INTEGER");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            $db->exec("ALTER TABLE contacts ADD COLUMN createdAt INTEGER");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }

        // 创建个人信息表
        $db->exec("CREATE TABLE IF NOT EXISTS personalInfo (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT,
            email TEXT,
            idNumber TEXT,
            job TEXT,
            employeeType TEXT DEFAULT 'fullTime',
            restSystem TEXT DEFAULT 'doubleRest',
            wage REAL,
            monthlyWage REAL,
            wageCalculationMethod TEXT DEFAULT 'natural',
            overtimeRate REAL DEFAULT 0,
            subsidySettings TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 为现有personalInfo表添加缺失的字段
        try {
            $db->exec("ALTER TABLE personalInfo ADD COLUMN email TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        
        try {
            $db->exec("ALTER TABLE personalInfo ADD COLUMN idNumber TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }

        // 创建工资历史表
        $db->exec("CREATE TABLE IF NOT EXISTS wageHistory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            month TEXT,
            year INTEGER,
            workDays INTEGER,
            totalWage REAL,
            overtime REAL DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");

        // 创建节假日表
        $db->exec("CREATE TABLE IF NOT EXISTS holidays (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            date TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'statutory',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");
        
        // 为现有holidays表添加缺失的列
        try {
            // 添加category列
            $db->exec("ALTER TABLE holidays ADD COLUMN category TEXT DEFAULT 'statutory'");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }
        try {
            // 添加description列
            $db->exec("ALTER TABLE holidays ADD COLUMN description TEXT");
        } catch (Exception $e) {
            // 列已存在，忽略错误
        }

        // 创建用户设置表
        $db->exec("CREATE TABLE IF NOT EXISTS userSettings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");
        
        // 为userSettings表添加索引
        $db->exec("CREATE INDEX IF NOT EXISTS idx_userSettings_user_id ON userSettings(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_userSettings_key ON userSettings(key)");
        
        // 创建用户项目关联表
        $db->exec("CREATE TABLE IF NOT EXISTS user_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            UNIQUE(user_id, project_id)
        )");
        
        // 为user_projects表添加索引
        $db->exec("CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_user_projects_project_id ON user_projects(project_id)");
        
        // 创建工头-工人关系表
        $db->exec("CREATE TABLE IF NOT EXISTS foreman_workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            foreman_id TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (foreman_id) REFERENCES users(id),
            FOREIGN KEY (worker_id) REFERENCES users(id),
            UNIQUE(foreman_id, worker_id)
        )");
        
        // 为foreman_workers表添加索引
        $db->exec("CREATE INDEX IF NOT EXISTS idx_foreman_workers_foreman_id ON foreman_workers(foreman_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_foreman_workers_worker_id ON foreman_workers(worker_id)");


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
        die(json_encode(['success' => false, 'error' => 'Database initialization failed: ' . $e->getMessage()]));
    }
}

// 处理JSON字段
function processJsonFields(&$data) {
    if (isset($data['personalInfo']) && $data['personalInfo']) {
        $decoded = json_decode($data['personalInfo'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $data['personalInfo'] = $decoded;
        }
    }
    if (isset($data['workHours']) && $data['workHours']) {
        $decoded = json_decode($data['workHours'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $data['workHours'] = $decoded;
        }
    }
    // 处理isEnded字段，转换为布尔类型
    if (isset($data['isEnded'])) {
        $data['isEnded'] = (bool)$data['isEnded'];
    }
}

// 获取单个数据
function getFromDatabase($db, $storeName, $key, $userId) {
    try {
        // 确保用户ID是字符串类型
        $processedUserId = (string)$userId;
        
        // 检查用户角色
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$processedUserId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $role = $user['role'] ?? 'worker';
        
        // 对于personalInfo，当key为'current'时，获取该用户的任意一条记录
        if ($storeName === 'personalInfo' && $key === 'current') {
            $stmt = $db->prepare("SELECT * FROM $storeName WHERE user_id = ? LIMIT 1");
            $stmt->execute([$processedUserId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 如果没有记录，返回默认值
            if (!$result) {
                $result = [
                    'id' => 'current',
                    'user_id' => $processedUserId,
                    'name' => '未设置',
                    'job' => '未设置',
                    'employeeType' => 'fullTime',
                    'restSystem' => 'doubleRest',
                    'wage' => 0,
                    'monthlyWage' => 0,
                    'wageCalculationMethod' => 'natural',
                    'overtimeRate' => 0
                ];
            }
        } else {
            // 对于personalInfo，当key包含projectId时，获取该用户的项目特定记录
            if ($storeName === 'personalInfo' && strpos($key, 'personalInfo_') === 0) {
                // 尝试获取项目特定的个人信息
                $stmt = $db->prepare("SELECT * FROM $storeName WHERE id = ? AND user_id = ?");
                $stmt->execute([$key, $processedUserId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // 如果没有项目特定的记录，尝试获取全局个人信息
                if (!$result) {
                    $stmt = $db->prepare("SELECT * FROM $storeName WHERE user_id = ? AND id = 'current' LIMIT 1");
                    $stmt->execute([$processedUserId]);
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);
                }
            } else {
                // 对于其他数据，使用普通查询
                if ($role === 'foreman') {
                    // 工头可以查看自己和所有工人的数据
                    // 首先获取数据的所有者
                    $stmt = $db->prepare("SELECT user_id FROM $storeName WHERE id = ?");
                    $stmt->execute([$key]);
                    $data = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($data) {
                        $dataOwnerId = $data['user_id'];
                        
                        // 检查是否是工头自己的数据
                        if ($dataOwnerId === $processedUserId) {
                            // 是工头自己的数据，直接获取
                            $stmt = $db->prepare("SELECT * FROM $storeName WHERE id = ? AND user_id = ?");
                            $stmt->execute([$key, $processedUserId]);
                            $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        } else {
                            // 检查是否是工头管理的工人的数据
                            $stmt = $db->prepare("SELECT * FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                            $stmt->execute([$processedUserId, $dataOwnerId]);
                            $foremanRelation = $stmt->fetch(PDO::FETCH_ASSOC);
                            
                            if ($foremanRelation) {
                                // 是工头管理的工人的数据，获取
                                $stmt = $db->prepare("SELECT * FROM $storeName WHERE id = ?");
                                $stmt->execute([$key]);
                                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                            } else {
                                // 不是工头管理的工人的数据，返回null
                                $result = null;
                            }
                        }
                    } else {
                        // 数据不存在
                        $result = null;
                    }
                } else {
                    // 普通工人只能查看自己的数据
                    $stmt = $db->prepare("SELECT * FROM $storeName WHERE id = ? AND user_id = ?");
                    $stmt->execute([$key, $processedUserId]);
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);
                }
            }
        }
        
        // 处理JSON字段
        if ($result) {
            processJsonFields($result);
        }
        
        return $result;
    } catch (PDOException $e) {
        // 如果发生异常，对于personalInfo返回默认值
        if ($storeName === 'personalInfo' && $key === 'current') {
            return [
                'id' => 'current',
                'user_id' => (string)$userId,
                'name' => '未设置',
                'job' => '未设置',
                'employeeType' => 'fullTime',
                'restSystem' => 'doubleRest',
                'wage' => 0,
                'monthlyWage' => 0,
                'wageCalculationMethod' => 'natural',
                'overtimeRate' => 0
            ];
        }
        return null;
    }
}

// 获取所有数据
function getAllFromDatabase($db, $storeName, $userId) {
    try {
        // 确保用户ID是字符串类型
        $processedUserId = (string)$userId;
        
        // 无论用户角色如何，主页只显示自己的数据
        // 这样工头在主页上只能看到自己的数据，而不是管理的工人的数据
        $stmt = $db->prepare("SELECT * FROM $storeName WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$processedUserId]);
        
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 处理JSON字段
        foreach ($result as &$item) {
            processJsonFields($item);
        }
        
        return $result;
    } catch (PDOException $e) {
        return [];
    }
}

// 存储数据
function setToDatabase($db, $storeName, $data, $userId) {
    try {
        // 确保用户ID是字符串类型
        $processedUserId = (string)$userId;
        
        // 检查用户角色
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$processedUserId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $role = $user['role'] ?? 'worker';
        
        // 检查是否是工头，如果是，需要验证数据的所有者是否是工头管理的工人
        if ($role === 'foreman' && isset($data['user_id'])) {
            $dataOwnerId = (string)$data['user_id'];
            
            // 检查是否是工头自己的数据
            if ($dataOwnerId !== $processedUserId) {
                // 检查是否是工头管理的工人的数据
                $stmt = $db->prepare("SELECT * FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                $stmt->execute([$processedUserId, $dataOwnerId]);
                $foremanRelation = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$foremanRelation) {
                    // 不是工头管理的工人的数据，没有权限修改
                    return ['success' => false, 'error' => '没有权限修改其他工人的数据'];
                }
            }
        } else {
            // 普通工人只能修改自己的数据
            $data['user_id'] = $processedUserId;
        }
        
        // 移除可能存在的userId字段，避免字段冲突
        if (isset($data['userId'])) {
            unset($data['userId']);
        }

        // 处理对象类型的字段，转换为JSON字符串
        if (isset($data['personalInfo']) && is_array($data['personalInfo'])) {
            $data['personalInfo'] = json_encode($data['personalInfo']);
        }
        if (isset($data['workHours']) && is_array($data['workHours'])) {
            $data['workHours'] = json_encode($data['workHours']);
        }

        // 处理布尔类型的字段，转换为整数
        if (isset($data['isEnded'])) {
            $data['isEnded'] = $data['isEnded'] ? 1 : 0;
        }

        // 对于不同表，只处理表中存在的字段
        if ($storeName === 'projects') {
            $allowedFields = [
                'id', 'user_id', 'name', 'address', 'description', 'order',
                'personalInfo', 'workHours', 'createdAt', 'updatedAt', 'isEnded'
            ];
        } elseif ($storeName === 'attendance') {
            $allowedFields = [
                'id', 'user_id', 'projectId', 'date', 'status', 'checkIn', 'checkOut', 'remark',
                'overtime', 'overtimeType', 'updatedAt'
            ];
        } elseif ($storeName === 'contacts') {
            $allowedFields = [
                'id', 'user_id', 'name', 'phone', 'job', 'note',
                'projectId', 'updatedAt', 'createdAt'
            ];
        } elseif ($storeName === 'personalInfo') {
            $allowedFields = [
                'id', 'user_id', 'name', 'job', 'employeeType', 'restSystem',
                'wage', 'monthlyWage', 'wageCalculationMethod', 'overtimeRate'
            ];
        } elseif ($storeName === 'wageHistory') {
            $allowedFields = [
                'id', 'user_id', 'month', 'year', 'workDays', 'totalWage',
                'overtime', 'createdAt', 'updatedAt'
            ];
        } elseif ($storeName === 'holidays') {
            $allowedFields = [
                'id', 'user_id', 'projectId', 'date', 'name', 'category', 'description'
            ];
        } elseif ($storeName === 'userSettings') {
            $allowedFields = [
                'id', 'user_id', 'key', 'value'
            ];
        }
        
        // 过滤掉不允许的字段
        if (isset($allowedFields)) {
            $filteredData = [];
            foreach ($data as $key => $value) {
                if (in_array($key, $allowedFields)) {
                    $filteredData[$key] = $value;
                }
            }
            
            $data = $filteredData;
        }

        // 准备字段和值
        $fields = array_keys($data);
        $placeholders = array_map(function($field) { return ':' . $field; }, $fields);
        
        // 处理SQL关键字，为order字段添加反引号
        $processedFields = array_map(function($field) {
            return $field === 'order' ? '`order`' : $field;
        }, $fields);
        
        $fieldList = implode(', ', $processedFields);
        $placeholderList = implode(', ', $placeholders);

        // 使用 INSERT OR REPLACE 语句，如果记录存在则更新，不存在则插入
        // 这样可以避免唯一约束冲突
        $stmt = $db->prepare("INSERT OR REPLACE INTO $storeName ($fieldList) VALUES ($placeholderList)");

        // 绑定参数
        foreach ($data as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }

        $success = $stmt->execute();
        error_log('Statement executed: ' . ($success ? 'true' : 'false'));
        if (!$success) {
            $errorInfo = $stmt->errorInfo();
            error_log('Statement error: ' . implode(', ', $errorInfo));
            // 记录更详细的错误信息，包括SQL语句和绑定的参数
            $sql = $stmt->queryString;
            error_log('SQL statement: ' . $sql);
            error_log('Bound parameters: ' . json_encode($data));
            // 返回错误信息
            return ['success' => false, 'error' => implode(', ', $errorInfo)];
        }
        return ['success' => true];
    } catch (PDOException $e) {
        // 记录错误信息
        error_log('PDOException in setToDatabase: ' . $e->getMessage());
        // 返回错误信息数组，而不是false
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// 删除数据
function removeFromDatabase($db, $storeName, $key, $userId) {
    try {
        // 记录删除操作
        error_log('Removing data: store=' . $storeName . ', key=' . $key . ', userId=' . $userId);
        
        // 首先获取数据的所有者
        $stmt = $db->prepare("SELECT user_id FROM $storeName WHERE id = ?");
        $stmt->execute([$key]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            // 数据不存在
            return false;
        }
        
        $dataOwnerId = $data['user_id'];
        $processedUserId = (string)$userId;
        
        // 检查是否是数据所有者
        if ($dataOwnerId === $processedUserId) {
            // 是所有者，可以删除
            $stmt = $db->prepare("DELETE FROM $storeName WHERE id = ?");
            $stmt->execute([$key]);
            $affectedRows = $stmt->rowCount();
            return $affectedRows > 0;
        }
        
        // 检查是否是工头，并且是数据所有者的工头
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$processedUserId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && $user['role'] === 'foreman') {
            // 检查是否是数据所有者的工头
            $stmt = $db->prepare("SELECT * FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
            $stmt->execute([$processedUserId, $dataOwnerId]);
            $foremanRelation = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($foremanRelation) {
                // 是工头，并且是数据所有者的工头，可以删除
                $stmt = $db->prepare("DELETE FROM $storeName WHERE id = ?");
                $stmt->execute([$key]);
                $affectedRows = $stmt->rowCount();
                return $affectedRows > 0;
            }
        }
        
        // 没有权限删除
        return false;
    } catch (PDOException $e) {
        error_log('PDOException in removeFromDatabase: ' . $e->getMessage());
        return false;
    }
}

// 清空数据
function clearFromDatabase($db, $storeName, $userId) {
    try {
        // 确保用户ID是字符串类型
        $processedUserId = (string)$userId;
        
        $stmt = $db->prepare("DELETE FROM $storeName WHERE user_id = ?");
        $stmt->execute([$processedUserId]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

// 清空所有数据
function clearAllFromDatabase($db, $userId) {
    try {
        // 确保用户ID是字符串类型
        $processedUserId = (string)$userId;
        
        // 清空所有表的数据，包括项目表
        $validStores = ['attendance', 'contacts', 'personalInfo', 'wageHistory', 'holidays', 'userSettings', 'projects'];
        
        // 使用事务提高性能
        $db->beginTransaction();
        
        foreach ($validStores as $storeName) {
            $stmt = $db->prepare("DELETE FROM $storeName WHERE user_id = ?");
            $stmt->execute([$processedUserId]);
        }
        
        $db->commit();
        return true;
    } catch (PDOException $e) {
        $db->rollBack();
        return false;
    }
}

// 主逻辑
try {
    $db = db_connect();
    initDatabase($db);

    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);

    // 清理输入数据
    $data = sanitizeInput($data);

    if (!$data || !isset($data['action']) || !isset($data['user_id'])) {
        sendResponse(false, null, '请求数据无效');
    }
    
    // 验证CSRF令牌
    if (!isset($data['csrf_token']) || !validate_csrf_token($data['csrf_token'])) {
        sendResponse(false, null, '无效的CSRF令牌');
    }

    $action = $data['action'];
    $userId = $data['user_id'];
    
    // 验证用户权限
    if (!validatePermission($userId, 'data', $action)) {
        sendResponse(false, null, '没有权限执行此操作');
    }

    // 处理特殊动作：getAttendance 和 getHolidays
    if ($action === 'getAttendance') {
        try {
            $projectId = isset($data['projectId']) ? $data['projectId'] : '';
            $processedUserId = (string)$userId;
            
            // 无论用户角色如何，主页只显示自己的考勤数据
            // 这样工头在主页上只能看到自己的考勤数据，而不是管理的工人的考勤数据
            $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? AND projectId = ? ORDER BY date DESC");
            $stmt->execute([$processedUserId, $projectId]);
            
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendResponse(true, $result);
        } catch (PDOException $e) {
            sendResponse(true, []);
        }
    } else if ($action === 'getHolidays') {
        try {
            $projectId = isset($data['projectId']) ? $data['projectId'] : '';
            $processedUserId = (string)$userId;
            $systemUserId = '__system_holidays__';
            
            // 查询系统节日（对所有项目可见）和用户节日（根据projectId过滤）
            if ($projectId) {
                $stmt = $db->prepare("SELECT *, 
                    CASE 
                        WHEN user_id = ? THEN 1 
                        ELSE 0 
                    END as isSystem 
                    FROM holidays 
                    WHERE (user_id = ?) OR (user_id = ? AND (projectId = ? OR projectId IS NULL OR projectId = '')) 
                    ORDER BY date DESC");
                $stmt->execute([$systemUserId, $systemUserId, $processedUserId, $projectId]);
            } else {
                $stmt = $db->prepare("SELECT *, 
                    CASE 
                        WHEN user_id = ? THEN 1 
                        ELSE 0 
                    END as isSystem 
                    FROM holidays 
                    WHERE (user_id = ?) OR (user_id = ? AND (projectId IS NULL OR projectId = '')) 
                    ORDER BY date DESC");
                $stmt->execute([$systemUserId, $systemUserId, $processedUserId]);
            }
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 确保所有节日都有分类
            foreach ($result as &$holiday) {
                if (!isset($holiday['category'])) {
                    $holiday['category'] = 'statutory';
                }
            }
            
            sendResponse(true, $result);
        } catch (PDOException $e) {
            sendResponse(true, []);
        }
    } else if ($action === 'getUserById') {
        try {
            $targetUserId = isset($data['userId']) ? $data['userId'] : (isset($_GET['userId']) ? $_GET['userId'] : '');
            if (!$targetUserId) {
                sendResponse(false, null, '缺少用户ID参数');
            }
            
            $processedUserId = (string)$userId;
            
            // 检查用户角色
            $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
            $stmt->execute([$processedUserId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $role = $user['role'] ?? 'worker';
            
            // 检查权限
            if ($role === 'foreman') {
                // 检查是否是工头管理的工人
                $stmt = $db->prepare("SELECT * FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                $stmt->execute([$processedUserId, $targetUserId]);
                $foremanRelation = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$foremanRelation) {
                    sendResponse(false, null, '没有权限查看该工人信息');
                }
            } else if ($processedUserId !== $targetUserId) {
                sendResponse(false, null, '没有权限查看其他用户信息');
            }
            
            // 获取用户基本信息
            $stmt = $db->prepare("SELECT id, phone, role FROM users WHERE id = ?");
            $stmt->execute([$targetUserId]);
            $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$userInfo) {
                sendResponse(false, null, '用户不存在');
            }
            
            // 获取用户个人信息
            $stmt = $db->prepare("SELECT * FROM personalInfo WHERE user_id = ? LIMIT 1");
            $stmt->execute([$targetUserId]);
            $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($personalInfo) {
                $userInfo['name'] = $personalInfo['name'] ?? '';
                $userInfo['position'] = $personalInfo['job'] ?? '';
                $userInfo['overtimeRate'] = $personalInfo['overtimeRate'] ?? 1;
            }
            
            sendResponse(true, $userInfo);
        } catch (PDOException $e) {
            sendResponse(false, null, $e->getMessage());
        }
    } else if ($action === 'getWageDetails') {
        try {
            $targetUserId = isset($data['userId']) ? $data['userId'] : (isset($_GET['userId']) ? $_GET['userId'] : '');
            if (!$targetUserId) {
                sendResponse(false, null, '缺少用户ID参数');
            }
            
            $processedUserId = (string)$userId;
            
            // 检查用户角色
            $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
            $stmt->execute([$processedUserId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $role = $user['role'] ?? 'worker';
            
            // 检查权限
            if ($role === 'foreman') {
                // 检查是否是工头管理的工人
                $stmt = $db->prepare("SELECT * FROM foreman_workers WHERE foreman_id = ? AND worker_id = ?");
                $stmt->execute([$processedUserId, $targetUserId]);
                $foremanRelation = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$foremanRelation) {
                    sendResponse(false, null, '没有权限查看该工人工资信息');
                }
            } else if ($processedUserId !== $targetUserId) {
                sendResponse(false, null, '没有权限查看其他用户工资信息');
            }
            
            // 获取用户个人信息（包含工资设置）
            $stmt = $db->prepare("SELECT * FROM personalInfo WHERE user_id = ? LIMIT 1");
            $stmt->execute([$targetUserId]);
            $personalInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $baseSalary = $personalInfo['wage'] ?? 0;
            $monthlyWage = $personalInfo['monthlyWage'] ?? 0;
            $overtimeRate = $personalInfo['overtimeRate'] ?? 1;
            
            // 计算本月出勤天数和缺勤天数
            $currentMonth = date('m');
            $currentYear = date('Y');
            $daysInMonth = date('t', strtotime("$currentYear-$currentMonth-01"));
            
            // 获取本月考勤记录
            $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? AND date LIKE ?");
            $stmt->execute([$targetUserId, "$currentYear-$currentMonth-%"]);
            $attendanceRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $attendanceDays = 0;
            $absentDays = 0;
            $overtimeHours = 0;
            $totalWorkHours = 0;
            
            foreach ($attendanceRecords as $record) {
                if ($record['status'] === 'normal' || $record['status'] === 'late') {
                    $attendanceDays++;
                    // 每天默认工作8小时
                    $totalWorkHours += 8;
                } else if ($record['status'] === 'absent') {
                    $absentDays++;
                }
                $overtimeHours += $record['overtime'] ?? 0;
            }
            
            // 计算工资
            // 基本工资 = 小时工资 * 总工作小时数
            $hourlyWage = $baseSalary / 8; // 假设baseSalary是每天8小时的工资
            $basePay = $hourlyWage * $totalWorkHours;
            $overtimePay = $overtimeHours * $hourlyWage * $overtimeRate;
            $totalSalary = $basePay + $overtimePay;
            
            $wageData = [
                'baseSalary' => $basePay,
                'attendanceDays' => $attendanceDays,
                'absentDays' => $absentDays,
                'overtimeHours' => $overtimeHours,
                'overtimePay' => $overtimePay,
                'totalSalary' => $totalSalary,
                'attendanceRecords' => $attendanceRecords
            ];
            
            sendResponse(true, $wageData);
        } catch (PDOException $e) {
            sendResponse(false, null, $e->getMessage());
        }
    }

    // 处理clearAll操作
    if ($action === 'clearAll') {
        $success = clearAllFromDatabase($db, $userId);
        sendResponse($success);
    }

    // 验证其他操作的store参数
    if (!isset($data['store'])) {
        sendResponse(false, null, '缺少store参数');
    }

    $store = $data['store'];

    // 验证表名
    $validStores = ['projects', 'attendance', 'contacts', 'personalInfo', 'wageHistory', 'holidays', 'userSettings'];
    if (!in_array($store, $validStores)) {
        sendResponse(false, null, '无效的store名称');
    }

    // 处理常规请求
    switch ($action) {
        case 'get':
            if (!isset($data['key'])) {
                sendResponse(false, null, '缺少key参数');
            }
            $key = $data['key'];
            $result = getFromDatabase($db, $store, $key, $userId);
            sendResponse(true, $result);
            break;

        case 'getAll':
            $result = getAllFromDatabase($db, $store, $userId);
            sendResponse(true, $result);
            break;

        case 'set':
            if (!isset($data['data'])) {
                sendResponse(false, null, '缺少data参数');
            }
            $dataToStore = $data['data'];
            $result = setToDatabase($db, $store, $dataToStore, $userId);
            if (is_array($result)) {
                // 如果返回的是数组，说明是错误信息
                sendResponse($result['success'], null, $result['error']);
            } else {
                // 兼容旧的返回值格式
                if (!$result) {
                    // 如果存储失败，返回错误信息
                    sendResponse(false, null, '存储数据失败');
                } else {
                    sendResponse(true);
                }
            }
            break;

        case 'remove':
            if (!isset($data['key'])) {
                sendResponse(false, null, '缺少key参数');
            }
            $key = $data['key'];
            $success = removeFromDatabase($db, $store, $key, $userId);
            sendResponse($success);
            break;

        case 'clear':
            $success = clearFromDatabase($db, $store, $userId);
            sendResponse($success);
            break;

        default:
            sendResponse(false, null, '无效的操作');
    }
} catch (Exception $e) {
    sendResponse(false, null, $e->getMessage());
}
?>