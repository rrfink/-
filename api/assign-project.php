<?php
// 分配员工到项目API

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// 包含数据库连接文件
include dirname(__DIR__) . '/includes/db.php';

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
if (!$data || !isset($data['user_id']) || !isset($data['project_id'])) {
    echo json_encode([
        'success' => false,
        'error' => '缺少必要的参数' . print_r($data, true)
    ]);
    exit;
}

$user_id = trim($data['user_id']);
$project_id = trim($data['project_id']);

// 验证输入
if (empty($user_id)) {
    echo json_encode([
        'success' => false,
        'error' => '用户ID不能为空'
    ]);
    exit;
}

if (empty($project_id)) {
    echo json_encode([
        'success' => false,
        'error' => '项目ID不能为空'
    ]);
    exit;
}

// 连接数据库
try {
    $db = db_connect();
    
    // 检查 user_projects 表是否存在
    $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_projects'");
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        // 创建 user_projects 表
        $db->exec("CREATE TABLE IF NOT EXISTS user_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            UNIQUE(user_id, project_id)
        )");
        
        // 为 user_projects 表添加索引
        $db->exec("CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_user_projects_project_id ON user_projects(project_id)");
    }
    
    // 检查用户是否存在
    $stmt = $db->prepare("SELECT id FROM users WHERE id = :user_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '用户不存在: ' . $user_id
        ]);
        exit;
    }
    
    // 检查项目是否存在
    $stmt = $db->prepare("SELECT id FROM projects WHERE id = :project_id");
    $stmt->bindParam(':project_id', $project_id);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '项目不存在: ' . $project_id
        ]);
        exit;
    }
    
    // 检查用户是否已经分配到该项目
    $stmt = $db->prepare("SELECT id FROM user_projects WHERE user_id = :user_id AND project_id = :project_id");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':project_id', $project_id);
    $stmt->execute();
    
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'error' => '用户已经分配到该项目'
        ]);
        exit;
    }
    
    // 插入用户项目关联
    $stmt = $db->prepare("INSERT INTO user_projects (user_id, project_id) VALUES (:user_id, :project_id)");
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':project_id', $project_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => '员工分配成功'
        ]);
    } else {
        $errorInfo = $stmt->errorInfo();
        echo json_encode([
            'success' => false,
            'error' => '分配员工失败: ' . implode(', ', $errorInfo)
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>