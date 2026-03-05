<?php
// 更新系统节日的分类
// 运行此脚本将为现有系统节日添加分类

header('Content-Type: application/json; charset=utf-8');

include dirname(__DIR__) . '/includes/db.php';

// 系统节日的特殊用户ID
$systemUserId = '__system_holidays__';

// 节日分类映射
$holidayCategories = [
    '元旦' => 'statutory',
    '春节' => 'traditional',
    '清明节' => 'traditional',
    '劳动节' => 'statutory',
    '端午节' => 'traditional',
    '国庆节' => 'statutory',
];

try {
    $db = db_connect();

    // 获取所有系统节日
    $stmt = $db->prepare("SELECT id, name FROM holidays WHERE user_id = ?");
    $stmt->execute([$systemUserId]);
    $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($holidays) === 0) {
        echo json_encode([
            'success' => true,
            'message' => '没有找到系统节日',
            'updated' => 0
        ]);
        exit;
    }

    // 更新每个节日的分类
    $updateStmt = $db->prepare("UPDATE holidays SET category = ? WHERE id = ?");
    $updated = 0;

    foreach ($holidays as $holiday) {
        $category = 'statutory'; // 默认分类
        
        // 根据节日名称确定分类
        foreach ($holidayCategories as $name => $cat) {
            if (strpos($holiday['name'], $name) !== false) {
                $category = $cat;
                break;
            }
        }
        
        $updateStmt->execute([$category, $holiday['id']]);
        if ($updateStmt->rowCount() > 0) {
            $updated++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "成功更新 {$updated} 条系统节日的分类",
        'updated' => $updated,
        'total' => count($holidays)
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => '数据库错误: ' . $e->getMessage()
    ]);
}
?>
