<?php
session_start();
require_once('../config.php');
require_once('../includes/db.php');

// 检查登录状态
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

// 处理添加/编辑网站
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? 0;
    $title = trim($_POST['title']);
    $url = trim($_POST['url']);
    $category = trim($_POST['category']);
    $icon = trim($_POST['icon']);
    $description = trim($_POST['description']);
    $sort_order = intval($_POST['sort_order']);
    $is_active = isset($_POST['is_active']) ? 1 : 0;
    
    if ($id > 0) {
        // 更新网站
        $result = db_update('websites', [
            'title' => $title,
            'url' => $url,
            'category' => $category,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sort_order,
            'is_active' => $is_active
        ], ['id' => $id]);
        
        $message = $result['error'] ?? '网站更新成功！';
    } else {
        // 添加新网站
        $result = db_insert('websites', [
            'title' => $title,
            'url' => $url,
            'category' => $category,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sort_order,
            'is_active' => $is_active
        ]);
        
        $message = isset($result['error']) ? $result['error'] : '网站添加成功！';
    }
    
    if (!isset($result['error'])) {
        $_SESSION['message'] = $message;
        header('Location: websites.php');
        exit;
    }
}

// 处理删除
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $conn = db_connect();
    $conn->query("DELETE FROM websites WHERE id = $id");
    $_SESSION['message'] = '网站删除成功！';
    header('Location: websites.php');
    exit;
}

// 处理状态切换
if (isset($_GET['toggle'])) {
    $id = intval($_GET['toggle']);
    $conn = db_connect();
    $conn->query("UPDATE websites SET is_active = NOT is_active WHERE id = $id");
    header('Location: websites.php');
    exit;
}

// 获取网站列表
$conn = db_connect();
$sites = $conn->query("SELECT * FROM websites ORDER BY category, sort_order")->fetch_all(MYSQLI_ASSOC);

// 获取分类列表
$categories = $conn->query("SELECT DISTINCT category FROM websites ORDER BY category")->fetch_all(MYSQLI_ASSOC);

// 处理编辑时获取网站信息
$edit_site = null;
if (isset($_GET['edit'])) {
    $id = intval($_GET['edit']);
    $edit_site = $conn->query("SELECT * FROM websites WHERE id = $id")->fetch_assoc();
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站管理 - 飞影主页</title>
    <link rel="stylesheet" href="../css/font-awesome.min.css">
    <style>
        /* 继承之前的样式，添加新的 */
        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        
        .content-title {
            font-size: 24px;
            color: #2c3e50;
        }
        
        .message {
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .message.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        
        .message.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        
        .filter-bar {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .filter-select {
            padding: 8px 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        }
        
        .table-container {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
        }
        
        th {
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }
        
        tbody tr {
            border-bottom: 1px solid #f1f1f1;
        }
        
        tbody tr:hover {
            background: #f8f9fa;
        }
        
        td {
            padding: 15px;
            color: #555;
        }
        
        .site-icon {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            object-fit: cover;
        }
        
        .actions {
            display: flex;
            gap: 8px;
        }
        
        .action-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        }
        
        .btn-edit {
            background: #3498db;
            color: white;
        }
        
        .btn-edit:hover {
            background: #2980b9;
        }
        
        .btn-delete {
            background: #e74c3c;
            color: white;
        }
        
        .btn-delete:hover {
            background: #c0392b;
        }
        
        .btn-toggle {
            background: #2ecc71;
            color: white;
        }
        
        .btn-toggle.inactive {
            background: #95a5a6;
        }
        
        .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.show {
            display: flex;
        }
        
        .modal-content {
            background: white;
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #f1f1f1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 20px;
            color: #2c3e50;
        }
        
        .close-modal {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #95a5a6;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        
        .form-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .form-input:focus {
            border-color: #3498db;
            outline: none;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #f1f1f1;
            display: flex;
            justify-content: flex-end;
            gap: 15px;
        }
        
        .btn-cancel {
            background: #95a5a6;
            color: white;
        }
        
        .btn-cancel:hover {
            background: #7f8c8d;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #95a5a6;
        }
        
        .empty-state i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #ddd;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="logo">
            <h1>飞影管理后台</h1>
            <div class="version">v1.0</div>
        </div>
        
        <div class="user-info">
            <div class="avatar">
                <?php echo strtoupper(substr($_SESSION['admin_username'], 0, 1)); ?>
            </div>
            <div class="username"><?php echo htmlspecialchars($_SESSION['admin_username']); ?></div>
        </div>
        
        <ul class="nav-menu">
            <li><a href="index.php"><i class="fa fa-dashboard"></i> 仪表盘</a></li>
            <li><a href="websites.php" class="active"><i class="fa fa-globe"></i> 网站管理</a></li>
            <li><a href="categories.php"><i class="fa fa-folder"></i> 分类管理</a></li>
            <li><a href="settings.php"><i class="fa fa-cog"></i> 系统设置</a></li>
            <li><a href="logout.php"><i class="fa fa-sign-out"></i> 退出登录</a></li>
        </ul>
    </div>
    
    <div class="main-content">
        <div class="header">
            <h2>网站管理</h2>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="openModal()">
                    <i class="fa fa-plus"></i> 添加网站
                </button>
                <a href="logout.php" class="btn btn-logout">
                    <i class="fa fa-sign-out"></i> 退出
                </a>
            </div>
        </div>
        
        <?php if (isset($_SESSION['message'])): ?>
        <div class="message success">
            <?php echo $_SESSION['message']; unset($_SESSION['message']); ?>
        </div>
        <?php endif; ?>
        
        <div class="filter-bar">
            <select class="filter-select" onchange="filterCategory(this.value)">
                <option value="">所有分类</option>
                <?php foreach ($categories as $cat): ?>
                <option value="<?php echo htmlspecialchars($cat['category']); ?>">
                    <?php echo htmlspecialchars($cat['category']); ?>
                </option>
                <?php endforeach; ?>
            </select>
            <input type="text" class="form-input" placeholder="搜索网站..." onkeyup="searchSites(this.value)" style="flex:1; max-width:300px;">
        </div>
        
        <div class="table-container">
            <?php if (empty($sites)): ?>
            <div class="empty-state">
                <i class="fa fa-globe"></i>
                <h3>暂无网站数据</h3>
                <p>点击"添加网站"按钮开始添加您的第一个网站</p>
            </div>
            <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th width="50">#</th>
                        <th width="60">图标</th>
                        <th>网站名称</th>
                        <th>分类</th>
                        <th>网址</th>
                        <th width="80">排序</th>
                        <th width="100">状态</th>
                        <th width="200">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($sites as $index => $site): ?>
                    <tr data-category="<?php echo htmlspecialchars($site['category']); ?>">
                        <td><?php echo $index + 1; ?></td>
                        <td>
                            <?php if ($site['icon']): ?>
                            <img src="<?php echo htmlspecialchars($site['icon']); ?>" class="site-icon" alt="图标">
                            <?php endif; ?>
                        </td>
                        <td><?php echo htmlspecialchars($site['title']); ?></td>
                        <td><?php echo htmlspecialchars($site['category']); ?></td>
                        <td>
                            <a href="<?php echo htmlspecialchars($site['url']); ?>" target="_blank">
                                <?php echo htmlspecialchars(substr($site['url'], 0, 50)) . (strlen($site['url']) > 50 ? '...' : ''); ?>
                            </a>
                        </td>
                        <td><?php echo $site['sort_order']; ?></td>
                        <td>
                            <span class="status-badge <?php echo $site['is_active'] ? 'status-active' : 'status-inactive'; ?>">
                                <?php echo $site['is_active'] ? '启用' : '禁用'; ?>
                            </span>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="action-btn btn-edit" onclick="editSite(<?php echo $site['id']; ?>)">
                                    <i class="fa fa-edit"></i> 编辑
                                </button>
                                <button class="action-btn btn-toggle <?php echo !$site['is_active'] ? 'inactive' : ''; ?>" 
                                        onclick="toggleSite(<?php echo $site['id']; ?>)">
                                    <i class="fa fa-power-off"></i> <?php echo $site['is_active'] ? '禁用' : '启用'; ?>
                                </button>
                                <button class="action-btn btn-delete" onclick="deleteSite(<?php echo $site['id']; ?>)">
                                    <i class="fa fa-trash"></i> 删除
                                </button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- 添加/编辑模态框 -->
    <div class="modal" id="siteModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">添加网站</h3>
                <button class="close-modal" onclick="closeModal()">&times;</button>
            </div>
            <form method="POST" id="siteForm">
                <input type="hidden" name="id" id="siteId" value="0">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">网站名称 *</label>
                        <input type="text" name="title" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">网站地址 *</label>
                        <input type="url" name="url" class="form-input" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">分类 *</label>
                            <input type="text" name="category" class="form-input" list="categories" required>
                            <datalist id="categories">
                                <?php foreach ($categories as $cat): ?>
                                <option value="<?php echo htmlspecialchars($cat['category']); ?>">
                                <?php endforeach; ?>
                            </datalist>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">排序</label>
                            <input type="number" name="sort_order" class="form-input" value="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">图标地址</label>
                        <input type="text" name="icon" class="form-input" placeholder="https://example.com/icon.png">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">描述</label>
                        <textarea name="description" class="form-input" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" name="is_active" id="is_active" checked>
                            <label for="is_active">启用该网站</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-cancel" onclick="closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        function openModal(site = null) {
            const modal = document.getElementById('siteModal');
            const form = document.getElementById('siteForm');
            
            if (site) {
                document.getElementById('modalTitle').textContent = '编辑网站';
                document.getElementById('siteId').value = site.id;
                form.querySelector('[name="title"]').value = site.title;
                form.querySelector('[name="url"]').value = site.url;
                form.querySelector('[name="category"]').value = site.category;
                form.querySelector('[name="icon"]').value = site.icon;
                form.querySelector('[name="description"]').value = site.description;
                form.querySelector('[name="sort_order"]').value = site.sort_order;
                form.querySelector('[name="is_active"]').checked = site.is_active == 1;
            } else {
                document.getElementById('modalTitle').textContent = '添加网站';
                form.reset();
                document.getElementById('siteId').value = '0';
            }
            
            modal.classList.add('show');
        }
        
        function closeModal() {
            document.getElementById('siteModal').classList.remove('show');
        }
        
        function editSite(id) {
            fetch('ajax.php?action=get_site&id=' + id)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        openModal(data.site);
                    }
                });
        }
        
        function toggleSite(id) {
            if (confirm('确定要切换这个网站的状态吗？')) {
                window.location.href = 'websites.php?toggle=' + id;
            }
        }
        
        function deleteSite(id) {
            if (confirm('确定要删除这个网站吗？此操作不可恢复！')) {
                window.location.href = 'websites.php?delete=' + id;
            }
        }
        
        function filterCategory(category) {
            const rows = document.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (!category || row.dataset.category === category) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        function searchSites(keyword) {
            const rows = document.querySelectorAll('tbody tr');
            keyword = keyword.toLowerCase();
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(keyword)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        // 点击模态框外部关闭
        document.getElementById('siteModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // 如果有编辑参数，打开编辑模态框
        <?php if ($edit_site): ?>
        openModal(<?php echo json_encode($edit_site); ?>);
        <?php endif; ?>
    </script>
</body>
</html>