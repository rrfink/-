<?php
// 更新节假日

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

include dirname(__DIR__) . '/includes/db.php';

// 系统节日的特殊用户ID
$systemUserId = '__system_holidays__';

// 获取请求数据
$data = json_decode(file_get_contents('php://input'), true);

session_start();
$user_id = null;
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
} elseif (isset($_COOKIE['user_id'])) {
    $user_id = $_COOKIE['user_id'];
} elseif (isset($data['user_id'])) {
    $user_id = $data['user_id'];
}

try {
    $db = db_connect();
    
    if (!isset($data['id']) || !isset($data['name']) || !isset($data['date'])) {
        echo json_encode([
            'success' => false,
            'error' => '缺少必要的参数'
        ]);
        exit;
    }
    
    $holidayId = $data['id'];
    $name = $data['name'];
    $date = $data['date'];
    $description = isset($data['description']) ? $data['description'] : '';
    $category = isset($data['category']) ? $data['category'] : 'statutory';
    
    // 检查是否是管理员
    $isAdmin = false;
    if ($user_id) {
        $isAdmin = false;
    } else {
        if (isset($_SESSION['admin_id']) || isset($_COOKIE['admin_id'])) {
            $isAdmin = true;
        }
    }
    
    // 检查节日是否存在
    $stmt = $db->prepare("SELECT user_id FROM holidays WHERE id = ?");
    $stmt->execute([$holidayId]);
    $holiday = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$holiday) {
        echo json_encode([
            'success' => false,
            'error' => '节日不存在'
        ]);
        exit;
    }
    
    // 管理员可以编辑任何节日
    if (!$isAdmin) {
        // 只有 ID 以 sys_holiday_ 开头的才是真正的法定节日
        if (strpos($holidayId, 'sys_holiday_') === 0) {
            echo json_encode([
                'success' => false,
                'error' => '法定节日不能编辑'
            ]);
            exit;
        }
        
        if (!$user_id) {
            echo json_encode([
                'success' => false,
                'error' => '请先登录'
            ]);
            exit;
        }
        
        if ($holiday['user_id'] !== $user_id) {
            echo json_encode([
                'success' => false,
                'error' => '无权编辑此节日'
            ]);
            exit;
        }
    }
    
    // 更新节日
    $stmt = $db->prepare("UPDATE holidays SET name = ?, date = ?, description = ?, category = ? WHERE id = ?");
    $stmt->execute([$name, $date, $description, $category, $holidayId]);
    
    echo json_encode([
        'success' => true,
        'message' => '节日更新成功'
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>
